# CloudGen
**Status: Experimental 🧪** - This project is in early stages of development. Some features may not work as expected.

An AI agent framework built for the Cloudflare Developer Platform. This project is early and will include more examples shortly.

## Why do I need this?

AI agent systems work best when they are "multi-agent". This is because different tasks benefit from access to different models and/or different parameter configurations.
CloudGen implements an opinionated approach purposefully similar to [AutoGen](https://microsoft.github.io/autogen/) but with the intention of being optimized for the Cloudflare developer platform.
CloudGen supports agent "group chats" to improve problem solving. It isolates conversation history and agent state within a single Durable Object. Future examples will demonstrate why this is important.

## Getting started

Install wrangler:

```bash
npm i wrangler -g
```

Create a new project:
```bash
wrangler init
```

## Quick start

```bash
npm i cloudgen@latest
```

The following is a simple single agent example. It requires that the Memory class be deployed as a durable object.
See /examples for an example wrangler.toml configuration. This example defaults to Cloudflare's Llama-2.

```javascript
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

// Your wrangler.toml will need to include the durable object binding
// [[migrations]]
// tag = "v1" # Should be unique for each entry
// new_classes = ["Memory"] # Array of new classes

// [durable_objects]
// bindings = [
// {name = "MEMORY", class_name = "Memory"}
// ]
```

See /examples for more. More examples coming soon.
