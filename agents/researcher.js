import { ConversationAgent } from "../templates/conversationAgent";
import { ResearchHelper } from "./helpers";

export class Researcher extends ConversationAgent {
    constructor(env, name, config = {}, groupChat = null) {
      const thisAgentConfig = {
        state: {},
        systemMessage: `default system message`,
        llmConfig: {
          provider: 'cloudflare',
          model: '@cf/meta/llama-2-7b-chat-int8',
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
        console.log('in search', query, resource)
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