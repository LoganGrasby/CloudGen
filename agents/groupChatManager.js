import { ConversationAgent } from '../templates/conversationAgent';
export class GroupChatManager extends ConversationAgent {
  constructor(env, name, config = {}, groupChat) {
    const defaultConfig = {
      state: {},
      systemMessage: `You are the group chat manager.`,
      groupChat: groupChat,
      llmConfig: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
      },
      functions: [
        {
          name: 'selectSpeaker',
          description: 'Which speaker should reply?',
          parameters: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Select an option',
                enum: [],
              },
            },
            required: ['name'],
          },
        },
      ],
      maxConsecutiveAutoReply: null,
      trigger: null,
    };
    const mergedConfig = { ...defaultConfig, ...config };
    super(env, name, mergedConfig, groupChat);
    this.speakerColors = {};
    this.colorIndex = 0;
    this.previousSpeaker = null;
  }

  populateFunctionSchemaWithAgentNames() {
    const agentNames = this.groupChat.agents.filter((agent) => !agent.isUser).map((agent) => agent.name);
    console.log('agent names', agentNames);
    this.functions.find((func) => func.name === 'selectSpeaker').parameters.properties.name.enum = agentNames;
  }

  logMessage(speakerName, message) {
    if (!this.speakerColors[speakerName]) {
      this.speakerColors[speakerName] = this.generateColor();
    }
    console.log(`%c${speakerName}: ${JSON.stringify(message)}`, `color: ${this.speakerColors[speakerName]};`);
  }
  
  generateColor() {
    const colors = ['red', 'blue', 'green', 'purple', 'orange', 'pink', 'cyan'];
    return colors[this.colorIndex++ % colors.length];
  }

  async runChat(message, sender) {
    this.isGroupChat = true;
    message = { role: 'user', content: message, name: this.name };
    this.logMessage(sender, message);
    let speaker = sender;
    let previousSpeaker = null;
    const groupChat = this.groupChat;
    this.messages = [];
    groupChat.messages = [];
    if (this.functions) {
      this.populateFunctionSchemaWithAgentNames();
    }
    for (let i = 0; i < groupChat.maxRound; i++) {
      if (i > 0) {
        groupChat.messages = [];
        groupChat.messages.push(message);

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
        return message.content;
      }
    }
    return;
  }
}
