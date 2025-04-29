// Service for logging requests/responses and analytics to Supabase
async function logMessage(supabase, { user_id, api_key_id, external_api_key, model_id, request_content, response_content }) {
  await supabase.from('message_logs').insert([
    { user_id, api_key_id, external_api_key, model_id, request_content, response_content }
  ]);
}

async function incrementUsage(supabase, { user_id, model_id }) {
  const { data } = await supabase.from('usage_analytics').select('*').eq('user_id', user_id).eq('model_id', model_id);
  if (data && data.length > 0) {
    await supabase.from('usage_analytics').update({
      request_count: data[0].request_count + 1,
      last_used: new Date().toISOString()
    }).eq('id', data[0].id);
  } else {
    await supabase.from('usage_analytics').insert([
      { user_id, model_id, request_count: 1, last_used: new Date().toISOString() }
    ]);
  }
}

module.exports = { logMessage, incrementUsage };
