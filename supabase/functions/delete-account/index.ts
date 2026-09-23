// ════════════════════════════════════════════════════════════════
// One Thing — delete an account, for good
//
// Both stores require this and neither will take the app without it.
// Apple's Guideline 5.1.1(v) says an app that lets you make an account
// has to let you delete it from inside the app — not by email, not by
// filling in a form on a website. Google asks for the same thing plus a
// public page for people who have already uninstalled, which is what
// delete-account.html in the repo root is for. It calls this.
//
// Why this is a server function at all: deleting an auth user needs the
// service_role key, and that key bypasses every row-level-security
// policy in the database. It must never be in the app, on a phone, or
// in the repo. Here it is an environment variable that Supabase sets
// for you and never leaves the server.
//
// What it does, in order:
//   1. Reads the caller's own access token out of the Authorization
//      header and asks Supabase who it belongs to. If that fails there
//      is no deletion — you can only ever delete yourself, and the id
//      is taken from the verified token rather than from anything the
//      caller sent.
//   2. Deletes their row in app_state.
//   3. Deletes the auth user, which is what actually ends the account.
//
// Step 2 is technically redundant — app_state.user_id is declared
// `on delete cascade`, so the row goes when the user does. It is done
// explicitly anyway so that a half-failure leaves the data gone rather
// than the account gone, which is the safer way round for the person.
//
// Deploy:  supabase functions deploy delete-account
// ════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  // The browser asks first, before it will let the real request out.
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) {
    return reply(500, { error: 'This function is not configured.' });
  }

  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return reply(401, { error: 'Sign in first.' });

  // Deliberately the anon key here, with the caller's own token. This
  // client can do nothing the caller could not already do, and its only
  // job is to turn a token into a verified user id.
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: who, error: whoErr } = await asCaller.auth.getUser();
  if (whoErr || !who?.user) {
    return reply(401, { error: 'That session is no longer valid. Sign in again.' });
  }
  const uid = who.user.id;

  // And only now the powerful one, on an id that came from a verified
  // token rather than from the request body.
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: rowErr } = await admin.from('app_state').delete().eq('user_id', uid);
  if (rowErr) {
    return reply(500, { error: 'Could not delete your data. Nothing was changed.' });
  }

  const { error: userErr } = await admin.auth.admin.deleteUser(uid);
  if (userErr) {
    // The data is already gone, which is the half worth having. Say so
    // plainly rather than reporting a clean success.
    return reply(500, {
      error: 'Your data was deleted but the account itself could not be removed. ' +
             'Please contact support so it can be finished off.',
    });
  }

  return reply(200, { deleted: true });
});
