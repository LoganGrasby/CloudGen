import { UserAgent, AssistantAgent } from '../src/index';

export default {
  async fetch(request, env) {
    const { message } = await request.json();
     //Define the user. It does not respond in the conversation by default.
    const user = new UserAgent(env, 'User');

    const researcher = new AssistantAgent(env, 'Researcher');

    const response = await user.startChat(researcher, message)
    return new Response(JSON.stringify(response), { status: 200 });
  },
};
