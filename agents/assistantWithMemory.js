import { ConversationAgent } from "../templates/conversationAgent";

export class AssistantWithMemory extends ConversationAgent {
  constructor(env, name, config = {}, groupChat = null,) {
    const defaultConfig = {
      state: {},
      systemMessage: `You are a friendly AI`,
      llmConfig: {
        provider: 'cloudflare',
        model: '@cf/meta/llama-2-7b-chat-int8',
      },
      maxConsecutiveAutoReply: null,
    };

    const mergedConfig = { ...defaultConfig, ...config };

    super(env, name, mergedConfig, groupChat);
  }

  async saveMessage(message) {
    this.messages.push(message)
    let dataStr = JSON.stringify(message);
    let key = new Date(Math.max(Date.now())).toISOString();
    return await this.storage.put(key, dataStr);
  }
  
  async getMessages() {
    let messages = [];
    let history = await this.storage.list({ reverse: true, limit: 10 });
    let userMessages = [...history.values()].reverse();
    userMessages.forEach((message) => {
        messages.push(JSON.parse(message));
    })
    this.messages = messages;
    return messages;
  }

}