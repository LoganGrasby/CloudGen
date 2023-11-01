import { Ai } from '@cloudflare/ai';
import { ConversationAgent } from '../templates/conversationAgent';

export class LongTermMemory extends ConversationAgent {
    constructor(env, name, config = {}, groupChat = null,) {
      const defaultConfig = {
        state: {},
        systemMessage: `You are a friendly AI`,
        llmConfig: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
        },
        functions: [
            {
              name: 'memory',
              description: 'Decide which action to take',
              parameters: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    description: 'The available actions',
                    enum: ['Save Memory', 'Retrieve Memories']
                  },
                },
                required: ['action'],
              },
            },
          ],
        maxConsecutiveAutoReply: null,
        ai: new Ai(env.AI)
      };
  
      const mergedConfig = { ...defaultConfig, ...config };
  
      super(env, name, mergedConfig, groupChat);
    }

    async memory({ action }, sender) {
        switch (action) {
          case 'Save Memory':
            return this.remember(this.messages, sender);
          case 'Retrieve Memories':
            return this.storeMemory(this.messages, sender);
          default:
            return new Response("Invalid action", { status: 400 });
        }
      }

    async storeMemory(messages, sender) {
      const lastMessage = messages[messages.length - 1];
      const message = lastMessage.content;

      const { results } = await c.env.DB.prepare("INSERT INTO notes (message) VALUES (?) RETURNING *")
        .bind(message)
        .run()

      const record = results.length ? results[0] : null
    
      const { data } = await ai.run('@cf/baai/bge-base-en-v1.5', { text: [message] })
      const values = data[0]
      
      const { id } = record
      const inserted = await this.env.VECTOR_DB.upsert([
        {
          id: id.toString(),
          values,
        }
      ])
      const forceReply = true;
      return this.reply(this.messages, sender, forceReply);
    }

    async remember(messages, sender) {
        const lastMessage = messages[messages.length - 1];
        const message = lastMessage.content;
            
        const embeddings = await this.ai.run('@cf/baai/bge-base-en-v1.5', { text: message });
        const vectors = embeddings.data[0];
        
        const SIMILARITY_CUTOFF = 0.75
        const vectorQuery = await this.env.VECTOR_DB.query(vectors, { topK: 1 });
        const vecIds = vectorQuery.matches
          .filter(vec => vec.score > SIMILARITY_CUTOFF)
          .map(vec => vec.vectorId);
        
        let notes = []
        if (vecIds.length) {
          const query = `SELECT * FROM memories WHERE id IN (${vecIds.join(", ")})`
          const { results } = await this.env.DB.prepare(query).bind().all()
          if (results) notes = results.map(vec => vec.text)
        }
        
        const allMemories = notes.length
          ? `Memories:\n${notes.map(note => `- ${note}`).join("\n")}`
          : "";
      
        this.messages.push({
            role: 'function',
            content: allMemories,
            name: 'memory'
          });
        
        // Return response
        return this.reply(allMemories, { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }
  }