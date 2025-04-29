require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const chatRoutes = require('./routes/chat');
const modelsRoutes = require('./routes/models');
const logsRoutes = require('./routes/logs');
const authMiddleware = require('./middleware/auth');

const app = express();
app.use(express.json());
app.use(cors());

// Supabase client setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
app.set('supabase', supabase);

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', message: 'Textgen LLM API running' }));

// Main OpenAI-compatible route with authentication
app.use('/v1/chat/completions', authMiddleware(supabase), chatRoutes);
// Models endpoint, now public (no API key required)
app.use('/v1/models', modelsRoutes);
// Logs endpoint, admin only
app.use('/v1/logs', authMiddleware(supabase), logsRoutes);

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
