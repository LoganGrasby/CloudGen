

export default {
 async fetch(request, env) {

  const { message, roomName } = await request.json();

  const user = new UserProxyAgent({}, env, "UserProxy", {});
  const planner = new AssistantAgent({}, env, "Instructor", null, { 
    trigger: "REPLY:", 
    systemMessage: ` You're in a conversation with a researcher. 
    Together your goal is to search the internet to find an adecuate answer to questions.
    Instruct the researcher on what to search to answer the question. 
    If the research needs to continue simply provide feedback to the researcher. 
    If the research is complete respond with 'REPLY:'
    . REPLY: is the trigger phrase to respond to the user. 
    You must respond with details and citations when speaking to the user.`,
    llmConfig: { max_tokens: 150 }
  });
  const researcher = new Researcher({}, env, "Researcher", null, { 
    systemMessage: `You are in a conversation with the Instructor. 
    The instructor will explain the topic to be researched and provide feedback.
    Search the resource which is most appropriate for the instruction`,
    llmConfig: { function_call: { 'name': 'search' }}
  });
  const groupChat = new GroupChat(
        [user, planner, researcher],  // Add all your agents here
        6, // Max round
        "Admin" // Admin name
    );
  const manager = new GroupChatManager({}, env, "User", groupChat, { systemMessage: "Manager. Group chat manager." });
  return new Response(JSON.stringify(await manager.runChat(message, user)), { status: 200 });
 }
}