import { ConversationAgent } from "../templates/conversationAgent";
import { ResearchHelper } from "./helpers";

export class Researcher extends ConversationAgent {
    constructor(env, name, config = {}, groupChat = null) {
      const thisAgentConfig = {
        state: {},
        systemMessage: `You are a researcher. Search for information. If at first you don't succeed, try try again`,
        llmConfig: {
          provider: 'cloudflare',
          model: 'gpt-3.5-turbo',
        },
        maxConsecutiveAutoReply: null,
        functions: [
          {
            name: 'search',
            description: 'Decide which resource to search',
            parameters: {
              type: 'object',
              properties: {
                resource: {
                  type: 'string',
                  description: 'The resource to search',
                  enum: ['Research Papers', 'Google Search']
                },
                query: {
                  type: 'string',
                  description: 'A search query',
                },
              },
              required: ['resource', 'query'],
            },
          },
        ],
        trigger: null,
        helper: new ResearchHelper(env)
      };
      const agentConfig = { ...thisAgentConfig, ...config };
  
      super(env, name, agentConfig, groupChat);
    }
    async search({ query, resource }, sender) {
      try {
        const searchResults = await this.helper.generateAndSearch(query, resource);
        this.messages.push({
          role: 'function',
          content: JSON.stringify(searchResults),
          name: 'search'
        });
  
        let forceReply = true;
        return this.reply(this.messages, sender, forceReply);
  
      } catch (error) {
        return new Response(`Fetch failed: ${error.message}`, {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }
  }