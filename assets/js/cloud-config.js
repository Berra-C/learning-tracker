/* Public configuration only. Supply the actual values from Productivity App/cloud-config.js.
   Do NOT put Supabase service_role, database passwords or private secrets here. */
window.LT_CLOUD_CONFIG = {
  apiUrl: '', // e.g. https://<project-ref>.supabase.co/functions/v1/app-api
  anonKey: '', // Supabase public publishable/anon key, if required by the existing API
  sessionField: 'sessionToken' // verify exact field used by existing backend
};
