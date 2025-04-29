const express = require('express');
const router = express.Router();

// Helper to assign a friendly server name from a fixed pool
const SERVER_NAMES = [
  "FeatherOps-Atlas",
  "FeatherOps-Phoenix",
  "FeatherOps-Titan",
  "FeatherOps-Lumina",
  "FeatherOps-Draco",
  "FeatherOps-Aurora",
  "FeatherOps-Nova"
];
function getServerNameForModel(modelName) {
  // Consistent assignment based on model name hash
  let hash = 0;
  for (let i = 0; i < modelName.length; i++) {
    hash = ((hash << 5) - hash) + modelName.charCodeAt(i);
    hash |= 0;
  }
  return SERVER_NAMES[Math.abs(hash) % SERVER_NAMES.length];
}

// GET /v1/models - Public, returns all models (OpenAI compatible, but NO external info)
router.get('/', async (req, res) => {
  const supabase = req.app.get('supabase');
  const { data, error } = await supabase.from('models').select('id, display_name');
  if (error) return res.status(500).json({ error: { message: 'Failed to fetch models', type: 'server_error' } });
  res.json({
    object: 'list',
    data: data.map(m => ({
      id: m.id,
      object: 'model',
      model: m.display_name,
      hosted_on: getServerNameForModel(m.display_name),
      hosted_by: 'FeatherOps'
    }))
  });
});

module.exports = router;
