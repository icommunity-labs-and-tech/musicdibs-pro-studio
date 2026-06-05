import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { token, user_id } = await req.json()
    if (!token || !user_id) throw new Error('token and user_id required')

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
