import { UserAgent, AssistantAgent, GroupChat, GroupChatManager } from 'cloudgen';

export default {
  async fetch(request, env, ctx) {
    const { message } = await request.json();
    //run wrangler dev --remote and open dev tools to visualize the conversation
    //Define the user. It does not respond in the conversation by default.
    const user = new UserAgent(env, 'User');

    //Let's debate about building AGI

    // Define the participants
    //By default AssistantAgent uses OpenAI
    const ethicsExpert = new AssistantAgent(env, 'Ethics', {
      systemMessage: `You are an expert in ethics. You are in a group chat with other experts. It is your turn to speak. Add a short reply`,
    });

    const techOptimist = new AssistantAgent(env, 'Tech Bro', {
      systemMessage: `You are a tech optimist and support developing AGI as fast as possible. Your are in a group chat with other experts. It is your turn to speak. Add a short reply`,
    });

    const economist = new AssistantAgent(env, 'Economist', {
      systemMessage: `You are an expert in economics and you are opinionated. You are in a group chat with other experts. It is your turn to speak. Add a short reply`,
    });

    const lawyer = new AssistantAgent(env, 'Lawyer', {
      systemMessage: `You are very concerned legal aspects of artificial intelligence. You are in a group chat with other experts. It is your turn to speak. Add a short reply`,
    });

    const groupChat = new GroupChat(
      [user, ethicsExpert, techOptimist, lawyer, economist], // Add all your agents here
      3, // Limit the maximum number of turns
      'Admin' // Admin name. Not currently used for anything.
    );

    //Without significant tuning of your prompt and parameters it's best to use GPT-4 here while testing.
    const manager = new GroupChatManager(
      env,
      'Manager',
      {
        systemMessage: 'Group chat manager.',
        //force a function call to select a speaker.
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
