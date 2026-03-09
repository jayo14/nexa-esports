import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const buildUsernameFromFullName = (fullName: string) =>
  fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 24)

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

    // Check inviter permissions
    const { data: inviterProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
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

    // Invite user via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: { 
          full_name: normalizedFullName,
          username: usernameBase,
          ign: ignBase,
          role: 'player'
        },
        redirectTo: redirectTo || `${new URL(req.url).origin}/auth/reset-password`,
      }
    )

    if (inviteError) throw inviteError
    const invitedUserId = inviteData.user?.id

    if (!invitedUserId) {
      throw new Error('Failed to create or resolve invited user')
    }

    const usernameWithSuffix = `${usernameBase}_${invitedUserId.slice(0, 6)}`

    // Create or update profile
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

