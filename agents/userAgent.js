import { ConversationAgent } from "../templates/conversationAgent";

export class UserAgent extends ConversationAgent {
    constructor(env, name, config = {}, groupChat = null) {
      const defaultConfig = {
        state: {},
        systemMessage: `The user who we want to reply to.`,
        llmConfig: {
          provider: 'cloudflare',
          model: '@cf/mistral/mistral-7b-instruct-v0.1',
        },
        maxConsecutiveAutoReply: null,
        trigger: null,
      };
  
      const mergedConfig = { ...defaultConfig, ...config };
      
      super(env, name, mergedConfig, groupChat);
      this.isUser = true;
    }
  }