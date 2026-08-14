// Ensures the admin account exists by calling the setup-admin edge function.
// Safe to call repeatedly; returns once the account is confirmed ready.
export async function ensureAdminAccount() {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-admin`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: '{}',
    })
    if (!res.ok) return { ok: false }
    const data = await res.json()
    return data
  } catch {
    return { ok: false }
  }
}
