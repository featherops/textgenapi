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
    // Log the request to message_logs before streaming
    let logEntryId = null;
    try {
      const { data, error } = await supabase.from('message_logs').insert([
        {
          user_id,
          api_key_id,
          external_api_key,
          model_id: modelRow.id,
          request_content: JSON.stringify(req.body),
          response_content: null // Will update after streaming
        }
      ]).select('id');
      if (error) {
        console.error('Failed to log message:', error);
      } else if (data && data[0] && data[0].id) {
        logEntryId = data[0].id;
      }
    } catch (logErr) {
      console.error('Failed to log message:', logErr);
    }

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

    let fullResponse = '';
    let cleanContent = '';
    response.data.on('data', (chunk) => {
      res.write(chunk);
      fullResponse += chunk.toString();
      // Extract readable content from streamed chunks (OpenAI-compatible SSE)
      try {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const trimmed = line.replace('data:', '').trim();
            if (trimmed && trimmed !== '[DONE]') {
              const data = JSON.parse(trimmed);
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                cleanContent += data.choices[0].delta.content;
              }
            }
          }
        }
      } catch (e) {
        // Ignore parse errors for non-data lines
      }
    });
    response.data.on('end', async () => {
      res.end();
      if (logEntryId) {
        try {
          await supabase.from('message_logs').update({
            response_content: cleanContent // Save only the readable content
          }).eq('id', logEntryId);
        } catch (updateErr) {
          console.error('Failed to update message log with response:', updateErr);
        }
      }
    });
    response.data.on('error', (err) => {
      console.error('Streaming error:', err);
      res.end();
    });
  } catch (err) {
    let msg = err.response?.data?.error || err.message || 'Unknown error from chutes.ai';
    res.status(502).json({ error: { message: `chutes.ai error: ${msg}`, type: 'api_error' } });
  }
});

module.exports = router;
