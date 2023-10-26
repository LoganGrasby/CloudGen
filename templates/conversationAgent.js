import { Agent } from './agent.js';
import { AIGateway } from '../ai/gateway.js';
export class ConversationAgent extends Agent {
  constructor(env, name, config, groupChat) {
    super(name);
    this.groupChat = groupChat;
    this.env = env;
    this.messages = [];
    const defaultAgentConfig = {
      llmConfig: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
      },
      systemMessage: null,
      maxConsecutiveAutoReply: null,
      functions: null,
      trigger: null
    };
    const mergedLlmConfig = {
      ...defaultAgentConfig.llmConfig,
      ...config?.llmConfig
    };
    const agentConfig = {
      ...defaultAgentConfig,
      ...config,
      llmConfig: mergedLlmConfig
    };
    this.state = agentConfig.state;
    this.storage = this.state?.storage;
    this.conversationId = this.state?.id?.toString();
    this.trigger = agentConfig.trigger;
    this.systemMessage = { role: 'system', content: agentConfig.systemMessage };
    this.llmConfig = agentConfig.llmConfig;
    this.maxConsecutiveAutoReply = agentConfig.maxConsecutiveAutoReply || this.MAX_CONSECUTIVE_AUTO_REPLY;
    this.functions = agentConfig.functions || null;
    this.helper = agentConfig.helper || null;
    this.aiGateway = new AIGateway(this.llmConfig, this.env, this.functions);
  }

updateSystemMessage(systemMessage) {
  this.systemMessage.content = systemMessage;
}

updateMaxConsecutiveAutoReply(value) {
  this.maxConsecutiveAutoReply = value;
}

saveMessage(message) {
  //Store conversation history in (for example) D1, durable objects
  //See /examples for an implementation with durable objects
  return this.messages.push(message);
}

getMessages() {
  //Implement message retrieval
  return this.messages
}

async clearHistory() {
  //Delete conversation history from disk
  return this.messages = [];
}

prepareChat(recipient, clearHistory) {
  this.maxConsecutiveAutoReply = 0;
  recipient.maxConsecutiveAutoReply = 0;
  if (clearHistory) {
    this.clearHistory(recipient);
    recipient.clearHistory(this);
  }
  this.messages.unshift(this.systemMessage);
  recipient.messages.unshift(recipient.systemMessage);
  return
}

async startChat(recipient, message, options = {}) {
  const { clearHistory = true, silent = false, requestReply = true } = options;
  this.prepareChat(recipient, clearHistory);
  if(!requestReply) {
    return
  }
  return await this.send({ role: "user", content: message, name: this.name }, recipient, requestReply);
}

async send(message, recipient, requestReply = true) {
  if (typeof message !== 'object' || (!message.content && !message.function_call)) {
    throw new Error("Message must be an object and have either 'content' or 'function_call'.");
  }
  message.role = 'assistant'
  this.saveMessage(message);
  if (requestReply) {
    let reply = await recipient.receive(message, this);
    return reply;
  }
  return
}

async receive(message, sender, requestReply) {
  if (typeof message !== 'object' || (!message.content && !message.function_call)) {
    throw new Error("Message must be an object and have either 'content' or 'function_call'.");
  }
  console.log(this.groupChat)
  if(!this.groupChat){
    message.role = 'user'
    this.saveMessage(message);
  }
  for (let msg of this.messages) {
    if (msg.name === this.name) {
        msg.role = 'assistant';
    } else if(msg.role !== "system" && msg.role !== "function"){
      msg.role = 'user'
    }
  }
  const reply = await this.reply(sender);
    if(reply.content?.includes(this.trigger)) {
      reply.content = reply.content.replace(this.trigger, '');
      reply.forceReply = 'true';
      return reply;
    }
  const msg = { role: 'assistant', content: reply.content, name: this.name }
  this.saveMessage(msg);
  return msg;
}

async reply(sender) {
  const reply = await this.aiGateway.generateReply(this.messages, this.functions);
    if (reply.function_call) {
          let arg = reply.function_call.arguments;
          let func = reply.function_call.name;
          return this[func](arg, sender);
     }
  return reply;
 }
}
