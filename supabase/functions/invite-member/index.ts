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
  const reqOrigin = req.headers.get('Origin') || ''

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(reqOrigin) })
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
      .select('id, role, username')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !inviterProfile || !['admin', 'clan_master'].includes(inviterProfile.role)) {
      console.error('Permission check failed:', { profileError, inviterProfile })
      throw new Error('Insufficient permissions: Only admins and clan masters can invite members')
    }

    const { email, fullName, redirectTo, role = 'player' } = await req.json()

    if (!email || !fullName) {
      throw new Error('Email and full name are required')
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const normalizedFullName = String(fullName).trim()
    
    // Determine the actual origin for redirects - priority: header > req.url
    const appOrigin = req.headers.get('origin') || new URL(req.url).origin

    // Generate base username and IGN
    const usernameBase = buildUsernameFromFullName(normalizedFullName)
    const ignBase = normalizedFullName

    console.log(`Sending invite to ${normalizedEmail} (Invited by: ${inviterProfile.username})`)

    // Invite user via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: { 
          full_name: normalizedFullName,
          username: usernameBase,
          ign: ignBase,
          role: role
        },
        redirectTo: redirectTo || `${appOrigin}/auth/reset-password`,
      }
    )

    if (inviteError) {
      console.error('Supabase Auth invite error:', inviteError)
      if (inviteError.message.includes('already been registered')) {
        throw new Error(`The email ${normalizedEmail} is already registered.`)
      }
      // Check for common internal errors
      if (inviteError.message.includes('Database error saving new user')) {
        console.error('Database error details:', inviteError)
        throw new Error(`Internal system error during user registration: ${inviteError.message}. This usually means a database trigger or constraint failed.`)
      }
      throw new Error(`Failed to send invite email: ${inviteError.message}`)
    }
    
    const invitedUserId = inviteData.user?.id

    if (!invitedUserId) {
      throw new Error('Failed to create or resolve invited user')
    }

    // Small delay to allow any DB triggers on auth.users to finish
    await new Promise(resolve => setTimeout(resolve, 1000))

    const usernameWithSuffix = `${usernameBase}_${invitedUserId.slice(0, 6)}`

    // Create or update profile
    const { error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: invitedUserId,
          username: usernameWithSuffix,
          ign: ignBase,
          role: role,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (profileUpsertError) {
      console.error('Profile creation error:', profileUpsertError)
      let detailedError = profileUpsertError.message
      if (profileUpsertError.code === '23505') {
        detailedError = 'Username or email conflict in profile'
      }
      throw new Error(`Database error adding new user: ${detailedError}`)
    }

    console.log(`Successfully invited user ${invitedUserId} with username ${usernameWithSuffix}`)

    return new Response(
      JSON.stringify({ success: true, userId: invitedUserId }),
      { headers: { ...corsHeaders(reqOrigin), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('invite-member function error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    
    let status = 400
    if (message.includes('Insufficient permissions')) status = 403
    if (message.includes('Unauthorized')) status = 401
    if (message.includes('Database error')) status = 500
    
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders(reqOrigin), 'Content-Type': 'application/json' } }
    )
  }
})
