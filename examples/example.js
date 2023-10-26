export function startChat(env, roomName, message) {
    const id = env.agent.idFromName(roomName);
    return env.agent.get(id).fetch("https://azule", { method: "POST", body: JSON.stringify({ message })});
}