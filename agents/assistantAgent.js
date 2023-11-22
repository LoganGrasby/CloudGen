import { ConversationAgent } from "../templates/conversationAgent";

export class AssistantAgent extends ConversationAgent {
  constructor(env, name, config = {}, groupChat = null,) {
    const defaultConfig = {
      state: {},
      systemMessage: `You are a friendly AI`,
      llmConfig: {
        provider: 'cloudflare',
        model: '@cf/mistral/mistral-7b-instruct-v0.1',
      },
      maxConsecutiveAutoReply: null,
    };

    const mergedConfig = { ...defaultConfig, ...config };

    super(env, name, mergedConfig, groupChat);
  }
}