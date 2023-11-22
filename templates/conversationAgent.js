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
      trigger: null,
      helper: null,
    };
    const mergedLlmConfig = {
      ...defaultAgentConfig.llmConfig,
      ...config?.llmConfig,
    };
    const agentConfig = {
      ...defaultAgentConfig,
      ...config,
      llmConfig: mergedLlmConfig,
    };
    this.state = agentConfig.state;
    this.storage = this.state?.storage;
    this.conversationId = this.state?.id?.toString();
    this.trigger = agentConfig.trigger;
    this.systemMessage = { role: 'system', content: agentConfig.systemMessage };
    this.llmConfig = agentConfig.llmConfig;
    this.maxConsecutiveAutoReply = agentConfig.maxConsecutiveAutoReply;
    this.functions = agentConfig.functions;
    this.helper = agentConfig.helper;
    this.aiGateway = new AIGateway(this.llmConfig, this.env, this.functions);
    this.isGroupChat = true;
  }

  updateSystemMessage(systemMessage) {
    this.systemMessage.content = systemMessage;
  }

  updateMaxConsecutiveAutoReply(value) {
    this.maxConsecutiveAutoReply = value;
  }

  saveMessage(message) {
    this.messages.push(message);
  }

  getMessages() {
    return this.messages;
  }

  clearHistory() {
    this.messages = [];
  }

  prepareChat(recipient, clearHistory) {
    recipient.isGroupChat = false;
    this.maxConsecutiveAutoReply = 0;
    recipient.maxConsecutiveAutoReply = 0;
    if (clearHistory) {
      this.clearHistory(recipient);
      recipient.clearHistory(this);
    }
    this.messages.unshift(this.systemMessage);
    recipient.messages.unshift(recipient.systemMessage);
  }

  async startChat(recipient, message, options = {}) {
    const { clearHistory = false, silent = false, requestReply = true } = options;
    this.prepareChat(recipient, clearHistory);
    if (!requestReply) {
      return;
    }
    let reply = await this.send({ role: 'user', content: message, name: this.name }, recipient, requestReply);
    console.log(`%c${recipient.name}: ${reply.content}`, `color: red;`);
    return reply;
  }

  async send(message, recipient, requestReply = true) {
    if (typeof message !== 'object' || (!message.content && !message.function_call)) {
      throw new Error("Message must be an object and have either 'content' or 'function_call'.");
    }
    message.role = 'assistant';
    this.saveMessage(message);
    if (requestReply) {
      let reply = await recipient.receive(message, this);
      return reply;
    }
  }

  async receive(message, sender, requestReply) {
    if (typeof message !== 'object' || (!message.content && !message.function_call)) {
      throw new Error("Message must be an object and have either 'content' or 'function_call'.");
    }
    if (!this.isGroupChat) {
      message.role = 'user';
      this.saveMessage(message);
    }
    for (let msg of this.messages) {
      if (msg.name === this.name) {
        msg.role = 'assistant';
      } else if (msg.role !== 'system' && msg.role !== 'function') {
        msg.role = 'user';
      }
    }
    const reply = await this.reply(sender);
    if (reply.content?.includes(this.trigger)) {
      reply.content = reply.content.replace(this.trigger, '');
      reply.forceReply = 'true';
      return reply;
    }
    const msg = { role: 'assistant', content: reply.content, name: this.name };
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
