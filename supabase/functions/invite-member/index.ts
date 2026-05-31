import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM          = Deno.env.get('RESEND_FROM_EMAIL') ?? 'MusicDibs Enterprise <invitaciones@musicdibs.com>'
const APP_URL              = Deno.env.get('APP_URL') ?? 'https://enterprise.musicdibs.com'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Email template ────────────────────────────────────────────────────────────

function buildInviteEmail(params: {
  inviterName: string
  tenantName:  string
  role:        string
  inviteUrl:   string
}) {
  const { inviterName, tenantName, role, inviteUrl } = params

  const roleLabel: Record<string, string> = {
    admin:  'Administrador',
    member: 'Miembro',
    viewer: 'Lector',
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitación a ${tenantName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f0eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1208 0%,#2d1f0a 100%);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:36px;height:36px;background:linear-gradient(135deg,#C9973A,#8C5E0A);border-radius:8px;text-align:center;vertical-align:middle;">
                          <span style="color:#ffffff;font-size:18px;line-height:36px;">♪</span>
                        </td>
                        <td style="padding-left:12px;vertical-align:middle;">
                          <div style="color:#f5f0eb;font-size:15px;font-weight:600;letter-spacing:-0.2px;">MusicDibs</div>
                          <div style="color:#C9973A;font-size:9px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin-top:1px;">Enterprise</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1208;letter-spacing:-0.5px;">
                Te han invitado a ${tenantName}
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#6b5a45;line-height:1.6;">
                <strong style="color:#1a1208;">${inviterName}</strong> te ha invitado a unirte a
                <strong style="color:#1a1208;">${tenantName}</strong> en MusicDibs Enterprise
                con el rol de <strong style="color:#C9973A;">${roleLabel[role] ?? role}</strong>.
              </p>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td>
                    <a href="${inviteUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#C9973A,#8C5E0A);color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;letter-spacing:0.2px;">
                      Aceptar invitación →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #f0ebe4;margin:0 0 24px;" />

              <!-- Link fallback -->
              <p style="margin:0 0 8px;font-size:12px;color:#9e8a74;font-weight:500;">
                O copia este enlace en tu navegador:
              </p>
              <p style="margin:0;font-size:11px;color:#C9973A;word-break:break-all;font-family:'Courier New',Courier,monospace;background:#fdf8f2;padding:10px 12px;border-radius:6px;border:1px solid #f0e8d8;">
                ${inviteUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;background:#faf8f5;border-top:1px solid #f0ebe4;">
              <p style="margin:0;font-size:11px;color:#b8a898;line-height:1.6;">
                Este enlace expira en <strong>7 días</strong>. Si no esperabas esta invitación,
                ignora este email — no se creará ninguna cuenta.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#b8a898;">
                © MusicDibs Enterprise · <a href="https://musicdibs.com" style="color:#C9973A;text-decoration:none;">musicdibs.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `Has sido invitado a ${tenantName}

${inviterName} te ha invitado a unirte a ${tenantName} en MusicDibs Enterprise como ${roleLabel[role] ?? role}.

Acepta la invitación aquí:
${inviteUrl}

Este enlace expira en 7 días.
Si no esperabas esta invitación, ignora este email.`

  return { html, text }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase   = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) throw new Error('Unauthorized')

    // Caller must be admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role, full_name')
      .eq('id', user.id)
      .single()
    if (!profile)                      throw new Error('Profile not found')
    if (profile.role !== 'admin')      throw new Error('Solo los administradores pueden invitar miembros')

    const { email, role = 'member' } = await req.json()
    if (!email || !email.includes('@'))             throw new Error('Email inválido')
    if (!['admin', 'member', 'viewer'].includes(role)) throw new Error('Rol inválido')

    // Check not already a member (via email in auth.users)
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const matchingUser = existingUsers?.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )
    if (matchingUser) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', matchingUser.id)
        .eq('tenant_id', profile.tenant_id)
        .maybeSingle()
      if (existingProfile) throw new Error('Este usuario ya es miembro del equipo')
    }

    // Revoke any existing pending invite for this email in this tenant
    await supabase
      .from('tenant_invitations')
      .update({ status: 'revoked' })
      .eq('tenant_id', profile.tenant_id)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')

    // Create invitation row
    const { data: inv, error: invErr } = await supabase
      .from('tenant_invitations')
      .insert({
        tenant_id:  profile.tenant_id,
        invited_by: user.id,
        email:      email.toLowerCase(),
        role,
      })
      .select()
      .single()
    if (invErr) throw invErr

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', profile.tenant_id)
      .single()

    const inviteUrl     = `${APP_URL}/signup?token=${inv.token}`
    const inviterName   = profile.full_name ?? user.email ?? 'Tu compañero'
    const tenantName    = tenant?.name ?? 'MusicDibs Enterprise'

    // ── Send via Resend ──────────────────────────────────────────────────────
    let emailSent = false

    if (RESEND_API_KEY) {
      try {
        const { html, text } = buildInviteEmail({ inviterName, tenantName, role, inviteUrl })

        const res = await fetch('https://api.resend.com/emails', {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            from:    RESEND_FROM,
            to:      [email.toLowerCase()],
            subject: `${inviterName} te ha invitado a ${tenantName}`,
            html,
            text,
            tags: [
              { name: 'type',      value: 'invitation' },
              { name: 'tenant_id', value: profile.tenant_id },
            ],
          }),
        })

        if (res.ok) {
          emailSent = true
          console.log(`[invite-member] Email sent to ${email} via Resend`)
        } else {
          const body = await res.text()
          console.warn(`[invite-member] Resend error ${res.status}:`, body)
        }
      } catch (e) {
        console.warn('[invite-member] Email send failed:', e)
      }
    } else {
      console.warn('[invite-member] RESEND_API_KEY not set — invitation created but no email sent')
    }

    return new Response(
      JSON.stringify({
        success:    true,
        invite_url: inviteUrl,
        token:      inv.token,
        email_sent: emailSent,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[invite-member] Error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
