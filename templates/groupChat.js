import { UserAgent } from '../agents/userAgent';

export class GroupChat {
    constructor(agents, maxRound = 10, adminName = 'Admin') {
        this.agents = agents;
        this.messages = [];
        this.maxRound = maxRound;
        this.adminName = adminName;
        this.systemMessage = null;
    }

    get agentNames() {
        return this.agents.map(agent => agent.name);
    }

    reset() {
        this.messages = [];
    }

    agentByName(name) {
      const index = this.agentNames.indexOf(name);
      if (index !== -1) {
          return this.agents[index];
      }
      return null;
  }

  nextAgent(lastSpeaker) {
    let index = this.agents.indexOf(lastSpeaker);
    while (true) {
      index = (index + 1) % this.agents.length;
      if (this.agents[index] instanceof UserAgent || index === this.lastSpeakerIndex) {
        continue;
      }
      this.lastSpeakerIndex = index;
      if (this.agents[index].name === lastSpeaker.name) {
        throw new Error("That's not supposed to happen.")
        }
      return this.agents[index];
      }
    }

    selectSpeakerMsg() {
        return `You are in a role play game. The following roles are available:\n
        ${this.participantRoles()}.\n\n
        Read the following conversation.\n
        Then select the next role from ${this.agentNames} to play. 
        Only return the role.`;
    }

    async selectSpeaker(lastSpeaker, selector) {
      this.systemMessage = { role: "system", content: this.selectSpeakerMsg() };
      this.messages.unshift(this.systemMessage);
      const nAgents = this.agentNames.length;
      if (nAgents < 4) {
          console.warn(`GroupChat has less than 4 agents. Using nextAgent for selection.`);
          return this.nextAgent(selector);
      }
  
      const messagesToSend = [...this.messages];
      const name = await selector.aiGateway.generateReply(messagesToSend);

      if (!name.function_call) {
          return this.nextAgent(selector);
      }

          let nextAgent = this.agentByName(name.function_call.arguments.name);
          if(!nextAgent) {return this.nextAgent(lastSpeaker)}
          return nextAgent;
  }

    participantRoles() {
        return this.agents.map(agent => `${agent.name}: ${agent.systemMessage.content}`).join('\n');
    }
}