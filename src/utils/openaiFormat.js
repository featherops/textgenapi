// Utility to format chutes.ai responses to OpenAI-compatible format
function formatOpenAIResponse(chutesResponse, reqId = null) {
  // This is a basic passthrough, but can be extended for full compatibility
  return {
    id: reqId || `chatcmpl-${Math.random().toString(36).slice(2, 10)}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: chutesResponse.model || '',
    choices: chutesResponse.choices || [],
    usage: chutesResponse.usage || {}
  };
}

module.exports = { formatOpenAIResponse };
