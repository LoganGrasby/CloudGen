import { UserProxyAgent, AssistantAgent, Researcher, GroupChatManager } from "cloudgen";

export default {
 async fetch(request, env) {

  const { message, roomName } = await request.json();

  const user = new UserProxyAgent(env, "User");
  const planner = new AssistantAgent(env, "Instructor", {
    trigger: "REPLY:", 
    systemMessage: ` planner...`,
    llmConfig: { max_tokens: 150 }
  });
  const researcher = new Researcher(env, "Researcher", { 
    systemMessage: `researcher`,
    llmConfig: { function_call: { 'name': 'search' }}
  });
  const groupChat = new GroupChat(
        [user, planner, researcher],  // Add all your agents here
        6, // Max round
        "Admin" // Admin name
    );
  const manager = new GroupChatManager(env, "User", groupChat, { systemMessage: "Manager. Group chat manager." });
  return new Response(JSON.stringify(await manager.runChat(message, user)), { status: 200 });
 }
}