import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

const buildUsernameFromFullName = (fullName: string) =>
  fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 24)

const generateFallbackPassword = () => crypto.randomUUID()

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') || ''

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authData.user) {
      throw new Error('Unauthorized')
    }

    const { data: inviterProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, ign, username')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !inviterProfile || !['admin', 'clan_master'].includes(inviterProfile.role)) {
      throw new Error('Insufficient permissions')
    }

    const { email, fullName, redirectTo } = await req.json()

    if (!email || !fullName) {
      throw new Error('Email and full name are required')
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const normalizedFullName = String(fullName).trim()

    if (!normalizedEmail.includes('@')) {
      throw new Error('Invalid email address')
    }

    const usernameBase = buildUsernameFromFullName(normalizedFullName)
    const ignBase = normalizedFullName

    const { data: usersList, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    if (usersError) throw usersError

    const existingUser = usersList.users.find((user) => user.email?.toLowerCase() === normalizedEmail)

    let invitedUserId = existingUser?.id

    if (!invitedUserId) {
      const { data: createdUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: generateFallbackPassword(),
        email_confirm: true,
        user_metadata: {
          username: usernameBase,
          ign: ignBase,
          role: 'player',
          invited_by: authData.user.id,
          full_name: normalizedFullName,
        },
      })

      if (createUserError) throw createUserError
      invitedUserId = createdUserData.user?.id
    }

    if (!invitedUserId) {
      throw new Error('Failed to create or resolve invited user')
    }

    const usernameWithSuffix = `${usernameBase}_${invitedUserId.slice(0, 6)}`

    const { error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: invitedUserId,
          username: usernameWithSuffix,
          ign: ignBase,
          role: 'player',
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (profileUpsertError) throw profileUpsertError

    const { data: linkData, error: generateLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: {
        redirectTo: redirectTo || `${new URL(req.url).origin}/auth/reset-password`,
      },
    })

    if (generateLinkError) throw generateLinkError

    const recoveryUrl = linkData.properties?.action_link
    if (!recoveryUrl) {
      throw new Error('Unable to generate invite recovery link')
    }

    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    if (!brevoApiKey) {
      throw new Error('BREVO_API_KEY is not configured')
    }

    const emailPayload = {
      sender: {
        name: 'NeXa Esports',
        email: 'noreply@nexaesports.com',
      },
      to: [{ email: normalizedEmail, name: normalizedFullName }],
      subject: 'You have been invited to NeXa Esports',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ec131e, #8f0b11); padding: 20px; text-align: center; color: white;">
            <h2 style="margin: 0;">NeXa Esports Invite</h2>
          </div>
          <div style="padding: 24px; background: #101014; color: #e2e8f0;">
            <p>Hello ${normalizedFullName},</p>
            <p>You were invited to join <strong>NeXa Esports</strong>.</p>
            <p>Click the button below to set your password and activate your account:</p>
            <p style="margin: 24px 0;">
              <a href="${recoveryUrl}" style="background: #ec131e; color: white; text-decoration: none; padding: 12px 20px; border-radius: 8px; display: inline-block; font-weight: 700;">
                Set Password
              </a>
            </p>
            <p style="font-size: 12px; color: #94a3b8;">If the button does not work, copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">${recoveryUrl}</p>
          </div>
        </div>
      `,
    }

    const emailResponse = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify(emailPayload),
    })

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.text()
      console.error('Brevo send error:', errorBody)
      throw new Error('Failed to send invite email')
    }

    return new Response(
      JSON.stringify({ success: true, userId: invitedUserId }),
      { headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('invite-member function error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
    )
  }
})
