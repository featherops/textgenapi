// Service to proxy requests to chutes.ai
const axios = require('axios');

async function callChutesAI({ externalApiKey, model, messages, stream, max_tokens, temperature }) {
  try {
    const response = await axios.post(
      'https://llm.chutes.ai/v1/chat/completions',
      {
        model,
        messages,
        stream: !!stream,
        max_tokens: max_tokens || 10000, // Default to 10000 tokens as per project requirements
        temperature: temperature || 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${externalApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    return response.data;
  } catch (err) {
    throw err;
  }
}

module.exports = { callChutesAI };
