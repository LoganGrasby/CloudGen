import { ConversationAgent } from "../templates/conversationAgent";

export class AssistantAgent extends ConversationAgent {
  constructor(env, name, config = {}, groupChat = null,) {
    const defaultConfig = {
      state: {},
      systemMessage: `You are a friendly AI`,
      llmConfig: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
      },
      maxConsecutiveAutoReply: null,
    };

    const mergedConfig = { ...defaultConfig, ...config };

    super(env, name, mergedConfig, groupChat);
  }
}