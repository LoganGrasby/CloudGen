import { Ai } from '@cloudflare/ai';

export class AIGateway {
  constructor(llmConfig, env, functions = null) {
    this.env = env;
    this.provider = llmConfig.provider;
    this.model = llmConfig.model;
    this.max_tokens = llmConfig.max_tokens || 300;
    this.functions = functions;
  }

  async generateCloudflareReply(messages) {
    //wrangler.toml
    //[ai]
    //binding = "AI"
    const ai = new Ai(this.env);
    const { response: reply } = await ai.run('@cf/meta/llama-2-7b-chat-int8', {
      messages: messages,
    });
    return { content: reply };
  }

  async generateOaiReply(messages) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const data = {
      model: this.model,
      messages: messages,
      max_tokens: this.max_tokens,
    };
    if (this.functions) {
      data['functions'] = this.functions;
    }
    const strData = JSON.stringify(data, null, 2);
    console.log(strData)
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
      },
      body: strData,
    };
    const response = await fetch(url, options);
    const resp = await response.json();
    console.log(resp)
    if (resp.choices[0].finish_reason === 'function_call') {
      let message = resp.choices[0].message;
      let arg = JSON.parse(message.function_call.arguments);
      let func = message.function_call.name;
      let functionSchema = this.functions.find((f) => f.name === func);
      let requiredParams = functionSchema.parameters?.required || null;
      if (!requiredParams) {
        for (const param of requiredParams) {
          if (!arg.hasOwnProperty(param)) {
            return {
              function_call: {
                role: 'function',
                name: func,
                content:
                  'Your function call could not be parsed. Please try again. Make sure to include all required parameters: ' +
                  requiredParams.join(', '),
              },
            };
          }
        }
      }
      return { function_call: { name: func, arguments: arg } };
    }
    return { content: resp.choices[0].message.content };
  }

  async generatePerplexityReply(messages, model = 'llama-2-70b-chat', max_tokens = 150, frequency_penalty = 1, temperature = 0.0) {
    if (!this.perplexity) {
      throw new Error('Perplexity is not configured');
    }

    const prepareMessages = messages.map(({ name, recipient, ...rest }) => rest);

    const data = {
      model,
      max_tokens,
      frequency_penalty,
      temperature,
      messages: prepareMessages,
    };

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify(data),
    };

    try {
      const res = await fetch('https://api.perplexity.ai/chat/completions', requestOptions);
      const result = await res.json();
      const message = { content: result.choices[0].message.content };
      return message;
    } catch (error) {
      throw new Error(error);
    }
  }

  async generateReply(messages, model = this.model) {
    if (!Array.isArray(messages) || !messages.every((msg) => typeof msg === 'object' && msg !== null && !Array.isArray(msg))) {
      throw new Error('Invalid input: Messages must be an array of objects');
    }
    switch (this.provider) {
      case 'openai':
        return this.generateOaiReply(messages, model);
      case 'cloudflare':
        return this.generateCloudflareReply(messages, model);
      case 'perplexity':
        return this.generatePerplexityReply(messages, model);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }
}
