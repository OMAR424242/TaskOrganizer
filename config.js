/* ═══════════════════════════════════════════════════════════════
   One Thing — backend configuration

   Leave this exactly as it is and the app runs the way it always has:
   everything on the device, no account, no network, works on a plane.

   Fill in the two values below and the app grows accounts and sync —
   anyone you send the link to can make their own account, and their
   tasks follow them to any device they sign in on.

   Where the values come from:
     Supabase dashboard → your project → Settings → API
       Project URL   →  SUPABASE_URL
       anon / public →  SUPABASE_ANON_KEY

   The anon key is *meant* to be public. It sits in every visitor's
   browser and it can only do what your row-level-security policies
   allow — which, per supabase/schema.sql, is "read and write your own
   row and nobody else's".

   The service_role key is the opposite. It bypasses every policy.
   It must never appear in this file or anywhere else in this repo.
   ═══════════════════════════════════════════════════════════════ */
window.OT_CONFIG = {
  SUPABASE_URL: 'https://eaqeplnrelzshmdbkdjf.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_-BF5MXJR-Opwoq8Yzql7lg_E50gHlte'
};
