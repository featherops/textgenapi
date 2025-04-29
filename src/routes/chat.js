const express = require('express');
const router = express.Router();
const { callChutesAI } = require('../services/chutesProxy');
const { logMessage, incrementUsage } = require('../services/logger');
const { formatOpenAIResponse } = require('../utils/openaiFormat');

// Helper: get model mapping from Supabase
async function getModelIdAndName(supabase, requestedModel) {
  // Try to match model by display_name or external_model_name
  let { data, error } = await supabase.from('models').select('*').or(`display_name.eq.${requestedModel},external_model_name.eq.${requestedModel}`).single();
  if (error || !data) return null;
  return data;
}

router.post('/', async (req, res) => {
  const supabase = req.app.get('supabase');
  const apiKeyRecord = req.apiKeyRecord;
  const user_id = apiKeyRecord.user_id;
  const api_key_id = apiKeyRecord.id;
  const external_api_key = apiKeyRecord.external_api_key;

  // Validate request
  const { model, messages, max_tokens, temperature } = req.body;
  if (!model || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: 'Missing model or messages', type: 'invalid_request_error' } });
  }

  // Model mapping
  const modelRow = await getModelIdAndName(supabase, model);
  if (!modelRow) {
    return res.status(400).json({ error: { message: 'Unknown model', type: 'invalid_request_error' } });
  }

  try {
    // Always stream: ignore client 'stream' param
    const axios = require('axios');
    const response = await axios({
      method: 'post',
      url: 'https://llm.chutes.ai/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${external_api_key}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: modelRow.external_model_name,
        messages,
        stream: true, // Always stream
        max_tokens,
        temperature
      },
      responseType: 'stream',
      timeout: 60000
    });
    res.setHeader('Content-Type', 'text/event-stream');
    response.data.pipe(res);
  } catch (err) {
    let msg = err.response?.data?.error || err.message || 'Unknown error from chutes.ai';
    res.status(502).json({ error: { message: `chutes.ai error: ${msg}`, type: 'api_error' } });
  }
});

module.exports = router;
