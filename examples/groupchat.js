import { UserAgent, AssistantAgent, GroupChat, GroupChatManager } from 'cloudgen';

export default {
  async fetch(request, env, ctx) {
    const { message } = await request.json();

    //Define the user. It does not respond in the conversation by default.
    const user = new UserAgent(env, 'User');

    //Let's debate about building AGI

    // Define the participants
    const ethicsExpert = new AssistantAgent(env, 'Ethics', {
      systemMessage: `You are an expert in ethics. You are in a group chat with other experts. It is your turn to speak. Add a short reply`,
    });

    const techOptimist = new AssistantAgent(env, 'Technology', {
      systemMessage: `You are a tech optimist and support developing AGI as fast as possible. Your are in a group chat with other experts. It is your turn to speak. Add a short reply`,
    });

    const applicationsExpert = new AssistantAgent(env, 'Applications', {
      systemMessage: `You are an expert in economics and you are opinionated. You are in a group chat with other experts. It is your turn to speak. Add a short reply`,
    });

    const lawExpert = new AssistantAgent(env, 'Law', {
      systemMessage: `You are very concerned legal aspects of artificial intelligence. You are in a group chat with other experts. It is your turn to speak. Add a short reply`,
    });

    const groupChat = new GroupChat(
      [user, ethicsExpert, techOptimist, applicationsExpert, lawExpert], // Add all your agents here
      3, // Limit the maximum number of turns
      'Admin' // Admin name. Not currently used for anything.
    );

    //Without significant tuning of your prompt and parameters it's best to use GPT-4 here.
    const manager = new GroupChatManager(
      env,
      'Manager',
      {
        systemMessage: 'Group chat manager.',
        function_call: { name: 'selectSpeaker' },
        llmConfig: {
          model: 'gpt-4'
        }
      },
      groupChat
    );

    const response = await manager.runChat(message, user);
    return new Response(response);
  },
};
