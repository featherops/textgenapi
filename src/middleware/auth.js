// Middleware to authenticate requests using our API keys (stored in Supabase)
const { createClient } = require('@supabase/supabase-js');

module.exports = function(supabase) {
  return async function(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const apiKey = authHeader.replace('Bearer ', '').trim();
    if (!apiKey) {
      return res.status(401).json({ error: { message: 'Missing API key', type: 'invalid_request_error' } });
    }
    // Check api_keys table
    const { data, error } = await supabase.from('api_keys').select('*').eq('key', apiKey).eq('active', true).single();
    if (error || !data) {
      return res.status(401).json({ error: { message: 'Invalid or inactive API key', type: 'invalid_request_error' } });
    }
    req.apiKeyRecord = data;
    next();
  };
};
