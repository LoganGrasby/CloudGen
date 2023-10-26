
export class UserProxyAgent extends ConversationAgent {
  constructor(state, env, name, groupChat = null, config = {}) {
    const defaultConfig = {
      systemMessage: `You are helpful`,
      llmConfig: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
      },
      maxConsecutiveAutoReply: null,
      trigger: null,
    };

    const mergedConfig = { ...defaultConfig, ...config };

    super(state, env, name, null, mergedConfig);
  }
}
export class AssistantAgent extends ConversationAgent {
  constructor(state, env, name, groupChat = null, config = {}) {
    const defaultConfig = {
      systemMessage: `default system message`,
      llmConfig: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
      },
      maxConsecutiveAutoReply: null,
      trigger: 'REPLY:',
    };

    const mergedConfig = { ...defaultConfig, ...config };

    super(state, env, name, null, mergedConfig);
  }
}

export class Researcher extends ConversationAgent {
  constructor(state, env, name, groupChat = null, config = {}) {
    const thisAgentConfig = {
      systemMessage: `default system message`,
      llmConfig: {
        provider: 'openai',
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

    super(state, env, name, null, agentConfig);
  }
  async search({ query, resource }, sender) {
    try {
      console.log('in search', query, resource)
      const searchResults = await this.helper.generateAndSearch(query, resource);
      console.log(searchResults)
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

export class GroupChatManager extends ConversationAgent {
  constructor(state, env, name, groupChat, config = {}) {
    const defaultConfig = {
      systemMessage: `You are the group chat manager.`,
      groupChat: groupChat,
      llmConfig: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
      },
      maxConsecutiveAutoReply: null,
      trigger: null,
    };
    const mergedConfig = { ...defaultConfig, ...config };
    super(state, env, name, groupChat, mergedConfig);
    this.speakerColors = {};
    this.colorIndex = 0;
    this.previousSpeaker = null;
  }

  generateColor() {
    const colors = [
      'red', 'blue', 'green', 'purple', 
      'orange', 'pink', 'cyan'
    ];
    return colors[this.colorIndex++ % colors.length];
  }

  logMessage(speakerName, message) {
    if (!this.speakerColors[speakerName]) {
      this.speakerColors[speakerName] = this.generateColor();
    }
    console.log(
      `%c${speakerName}: ${message}`,
      `color: ${this.speakerColors[speakerName]};`
    );
  }

  async runChat(message, sender) {
    message = { role: 'user', content: message, name: this.name };
    let speaker = sender;
    let previousSpeaker = null;
    const groupChat = this.groupChat;
    this.messages = [];
    groupChat.messages = [];
  
    for (let i = 0; i < groupChat.maxRound; i++) {
      this.messages.push(this.systemMessage);
      this.logMessage(this.name, this.systemMessage);
  
      if (i > 0) {
        groupChat.messages = [];
        groupChat.messages.push(message);
        this.messages.push(message);
        this.logMessage(speaker.name, message.content);
  
        for (const agent of groupChat.agents) {
          if (agent !== speaker) {
            await agent.send(message, speaker, false);
          }
        }
  
        previousSpeaker = speaker;
        speaker = await groupChat.selectSpeaker(speaker, this);
        
        const reply = await speaker.receive(message, previousSpeaker, true); 
        
        if (reply.forceReply) {
          this.logMessage(speaker.name, reply.content);
          return reply.content;
        }
  
        groupChat.messages.push(reply);
        message = reply;
        this.logMessage(speaker.name, reply.content);
      } else {
        for (const agent of groupChat.agents) {
          if (agent !== speaker) {
            agent.messages.push(agent.systemMessage);
            this.logMessage(agent.name, agent.systemMessage);
          }
        }
      }
  
      if (i === groupChat.maxRound - 1) {
        break;
      }
    }
    return;
  }  
}

