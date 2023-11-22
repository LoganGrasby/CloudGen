//src/index.js
import { UserAgent, AssistantWithMemory } from 'cloudgen';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Unauthorized', { status: 401 });
    }

    const { message, roomName } = await request.json();
    if (!message || !roomName) {
      throw new Error('roomName and message are required');
    }
    const response = await postMessage(env, roomName, message)
    return response;
  },
};

async function postMessage(env, roomName, message) {
  // Each unique roomName creates its own durable object.
  const id = env.MEMORY.idFromName(roomName);
  return env.MEMORY.get(id).fetch('https://azule', { 
    method: 'POST', 
    body: JSON.stringify({ message }) 
 });
}

// Here we define our Durable Object class.
export class Memory {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    try {
      const { message } = await request.json();
      const response = await this.startChat(message);
      return new Response(JSON.stringify(response), { status: 200 });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async startChat(message) {
    // The user agent (in this configuration) does not do much.
    const user = new UserAgent(this.env, 'User', { state: this.state });

    // By default this agent uses Cloudflare's Llama-2. 
    //Currently OpenAI and Perplexity are also supported.
    const assistant = new AssistantWithMemory(this.env, 'Assistant', 
    { 
      state: this.state,
      systemMessage: 'You are a friendly AI assistant.'
    });

    // We populate the recipient with message history.
    const messages = await assistant.getMessages();
    // The message is sent from the user to the recipient.
    let response = await user.startChat(assistant, message);
    return response;
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