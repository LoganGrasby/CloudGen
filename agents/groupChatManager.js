import { ConversationAgent } from "../templates/conversationAgent";

export class GroupChatManager extends ConversationAgent {
    constructor(env, name, config = {}, groupChat) {
      const defaultConfig = {
        state: {},
        systemMessage: `You are the group chat manager.`,
        groupChat: groupChat,
        llmConfig: {
          provider: 'cloudflare',
          model: '@cf/meta/llama-2-7b-chat-int8',
        },
        maxConsecutiveAutoReply: null,
        trigger: null,
      };
      const mergedConfig = { ...defaultConfig, ...config };
      super(env, name, mergedConfig, groupChat);
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