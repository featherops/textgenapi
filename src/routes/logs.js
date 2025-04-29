const express = require('express');
const router = express.Router();

// GET /v1/logs - Admin only, returns chat logs with user, model, prompt, response, timestamp
router.get('/', async (req, res) => {
  const supabase = req.app.get('supabase');
  // Only allow if authenticated as admin (middleware should enforce this)
  // Fetch logs with user/model info if possible
  const { data, error } = await supabase
    .from('logs')
    .select('id, user_id, model_id, request_content, response_content, created_at');
  if (error) return res.status(500).json({ error: { message: 'Failed to fetch logs', type: 'server_error' } });
  res.json(data);
});

module.exports = router;
