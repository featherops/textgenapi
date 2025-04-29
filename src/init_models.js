// Script to populate Supabase models table from modelnames.md and apiexample.md
require('dotenv').config({ path: require('path').resolve(__dirname, '../refrence/.env.example') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function parseModelsFromModelnames(md) {
  const lines = md.split(/\r?\n/);
  const models = [];
  for (const line of lines) {
    const match = line.match(/"model":\s*"([^"]+)".*display (.+)/i);
    if (match) {
      models.push({ external_model_name: match[1].trim(), display_name: match[2].trim() });
    }
  }
  return models;
}

function parseModelsFromApiexample(md) {
  const lines = md.split(/\r?\n/);
  const models = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\w[\w\-\/\.]+) we want name on our api to be displayed as ([\w\-\.]+)/);
    if (match) {
      models.push({ external_model_name: match[1].trim(), display_name: match[2].trim() });
    }
  }
  return models;
}

async function main() {
  const modelnamesMd = fs.readFileSync(path.resolve(__dirname, '../refrence/modelnames.md'), 'utf-8');
  const apiexampleMd = fs.readFileSync(path.resolve(__dirname, '../refrence/apiexample.md'), 'utf-8');
  const models = [
    ...parseModelsFromModelnames(modelnamesMd),
    ...parseModelsFromApiexample(apiexampleMd)
  ];
  // Remove duplicates by external_model_name
  const uniqueModels = Object.values(models.reduce((acc, m) => {
    acc[m.external_model_name] = m;
    return acc;
  }, {}));

  for (const model of uniqueModels) {
    const { error } = await supabase.from('models').upsert([model], { onConflict: ['external_model_name'] });
    if (error) {
      console.error('Error inserting model:', model, error);
    } else {
      console.log('Inserted/updated model:', model);
    }
  }
  console.log('Model table population complete.');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
