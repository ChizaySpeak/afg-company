const SUPABASE_URL = 'https://jarrnncwhrrydecdayde.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7I8l4WAzG2JhJBCtsQV0zg_YxUt6I0d';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

window.AFGSupabase = {
  client: supabaseClient,
  configured: true,
  url: SUPABASE_URL
};
