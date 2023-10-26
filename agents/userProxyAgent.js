import { ConversationAgent } from "../templates/conversationAgent";

export class UserProxyAgent extends ConversationAgent {
    constructor(env, name, config = {}, groupChat = null) {
      const defaultConfig = {
        state: {},
        systemMessage: `You are helpful`,
        llmConfig: {
          provider: 'cloudflare',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
        maxConsecutiveAutoReply: null,
        trigger: null,
      };
  
      const mergedConfig = { ...defaultConfig, ...config };
  
      super(env, name, mergedConfig, groupChat);
    }
  }