import { Ai } from '@cloudflare/ai'
import cheerio from 'cheerio'

export class ResearchHelper { 
    constructor(env) {
      this.env = env;
      this.ai = new Ai(env.AI);
      this.systemPromptForQuery = `Prepare short search queries based on the topic that the customer is interested in. Format each query as QUERY:`;
    }
  
    async generateAndSearch(topic, resource) {
        const preparedQueries = await this.generateQueries(topic);
        const maxQueries = 2;
        const queriesToProcess = preparedQueries.slice(0, maxQueries);
    
        let searchResults = [];
        for (const query of queriesToProcess) {
          let result;
          if (resource === 'Research Papers') {
            result = await this.arxivSearch(query);
          } else if (resource === 'Google Search') {
            result = await this.googleSearch(query);
          }
          searchResults.push(...result);
        }
        console.log(JSON.stringify(searchResults, null, 2))
        return searchResults;
      }
    
      async generateQueries(message) {
        try {
        const { response: queries } = await this.ai.run(
          '@cf/meta/llama-2-7b-chat-int8',
          {
            messages: [
              { role: 'system', content: this.systemPromptForQuery },
              { role: 'user', content: message }
            ]
          }
        );
        return queries
          .split('QUERY:')
          .slice(1)
          .map(queryPart => queryPart.split('\n')[0]?.trim());
        } catch (error) {
            throw new Error(error)
        }
      }
    
      async googleSearch(query) {
        const url = `https://customsearch.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${this.env.cx}&key=${this.env.googleCustomSearchAPI}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
    
        const data = await response.json();
        return data.items.map((item) => ({
          title: item.title,
          description: item.snippet,
          displayLink: item.displayLink,
          formattedUrl: item.formattedUrl,
        })).slice(0, 5);
      }

    async arxivSearch(query) {
        const response = await fetch(`http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=1`);
        
        if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const xmlData = await response.text(); 
        const $ = cheerio.load(xmlData, { xmlMode: true });
    
        const papers = [];
    
        $('entry').each(function() {
        const id = $(this).find('id').text().replace('http://arxiv.org/abs/', '');
        const title = $(this).find('title').text().trim();
        const summary = $(this).find('summary').text().trim();
    
        papers.push({
            id: id,
            title: title,
            summary: summary
        });
        });
        return papers;
    }
}