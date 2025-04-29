// Script to initialize initial API keys and users in Supabase
require('dotenv').config({ path: require('path').resolve(__dirname, '../refrence/.env.example') });
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // Users
  const users = [
    { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, role: 'admin' },
    { email: process.env.TEST_USER1_EMAIL, password: process.env.TEST_USER1_PASSWORD, role: 'user' },
    { email: process.env.TEST_USER2_EMAIL, password: process.env.TEST_USER2_PASSWORD, role: 'user' },
  ];

  // Insert users
  const userIds = [];
  for (const user of users) {
    const { data, error } = await supabase.from('users').insert([user]).select('id');
    if (error) throw error;
    userIds.push(data[0].id);
  }

  // Our API keys (featherops-apikey-xxxxxx)
  const ourKeys = [
    'featherops-apikey-' + uuidv4().slice(0, 8),
    'featherops-apikey-' + uuidv4().slice(0, 8),
    'featherops-apikey-' + uuidv4().slice(0, 8),
  ];
  // External keys from env
  const externalKeys = process.env.CHUTES_API_KEYS.split(',');

  // Link each ourKey to an externalKey and a user
  for (let i = 0; i < ourKeys.length; i++) {
    const key = ourKeys[i];
    const user_id = userIds[i % userIds.length];
    const external_api_key = externalKeys[i % externalKeys.length];
    const { error } = await supabase.from('api_keys').insert([
      { key, user_id, external_api_key, active: true }
    ]);
    if (error) throw error;
    console.log(`Created API key: ${key} (user ${user_id}) linked to external key.`);
  }

  console.log('Initialization complete.');
}

main().catch(err => {
  console.error('Error initializing database:', err);
  process.exit(1);
});
