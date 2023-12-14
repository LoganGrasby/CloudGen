import { UserAgent, AssistantAgent } from 'cloudgen';

export default {
  async fetch(request, env) {
    const message = "How are you?"
     //Define the user. It does not respond in the conversation by default.
    const user = new UserAgent(env, 'User');

    const researcher = new AssistantAgent(env, 'Researcher', { 
      provider: 'google'
     });

    const response = await user.startChat(researcher, message)
    return new Response(JSON.stringify(response), { status: 200 });
  },
};
