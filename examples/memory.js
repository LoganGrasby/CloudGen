
//We import a custom assistant class with methods for saving and retrieving messages. These methods override the methods of the parent class.
import { UserAgent, AssistantWithMemory } from 'cloudgen';

export default {
  async fetch(request, env) {
    const { message, roomName } = await request.json();
    if (!message || !roomName) {
      throw new Error('roomName and message are required');
    }
    const response = await chatWithMemory(env, roomName, message)
    return response;
  },
};

async function chatWithMemory(env, roomName, message) {
  //Each unique roomName creates its own durable object.
  const id = env.MEMORY.idFromName(roomName);
  return env.MEMORY.get(id).fetch('https://azule', { method: 'POST', body: JSON.stringify({ message }) });
}

export class Memory {
    constructor(state, env) {
      this.state = state;
      this.env = env;
    }
  async fetch(request) {
      const { message } = await request.json();
      const user = new UserAgent(this.env, 'User', { state: this.state });
      //By default this agent uses Cloudflare's Llama-2
      const assistant = new AssistantWithMemory(this.env, 'Assistant', 
      { state: this.state,
        systemMessage: 'You are a friendly AI assistant.'
        });
      //We populate the recipient with message history
      await assistant.getMessages();
      //the message is sent from the user to the recipient
      let response = await user.startChat(assistant, message);
      return new Response (JSON.stringify(response), { status: 200 })
    }
  }
// wrangler.toml
// [[migrations]]
// tag = "v1" # Should be unique for each entry
// new_classes = ["Memory"] # Array of new classes

// [durable_objects]
// bindings = [
// {name = "MEMORY", class_name = "Memory"}
// ]