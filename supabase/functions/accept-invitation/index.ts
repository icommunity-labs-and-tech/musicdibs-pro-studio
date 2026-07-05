import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    // Require a valid user JWT and derive the identity from it — never trust the body.
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt)
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    const user_id = userData.user.id

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { token } = await req.json()
    if (!token) throw new Error('token required')

    const { data: inv, error: invErr } = await supabase
      .from('tenant_invitations').select('*, tenants(name, plan)')
      .eq('token', token).eq('status', 'pending').gt('expires_at', new Date().toISOString()).single()
    if (invErr || !inv) throw new Error('Invitación inválida, expirada o ya utilizada')

    const { error: profileErr } = await supabase.from('profiles').upsert({ id: user_id, tenant_id: inv.tenant_id, role: inv.role }, { onConflict: 'id' })
    if (profileErr) throw profileErr

    await supabase.from('tenant_invitations').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', inv.id)

    return new Response(JSON.stringify({ success: true, tenant_id: inv.tenant_id, role: inv.role }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
