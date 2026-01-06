import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Verify the user is authenticated and has admin/clan_master role
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user has admin or clan_master role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !['admin', 'clan_master'].includes(profile.role)) {
      throw new Error('Insufficient permissions')
    }

    const { userId } = await req.json()
    
    if (!userId) {
      throw new Error('User ID is required')
    }

    console.log(`Deleting user: ${userId}`)

    // Call the database function to delete all user data
    const { data: deleteResult, error: deleteError } = await supabaseAdmin
      .rpc('delete_user_completely', { user_id_to_delete: userId })

    if (deleteError) {
      console.error('Error deleting user data:', deleteError)
      throw deleteError
    }

    if (deleteResult === false) {
      throw new Error('Failed to delete user data')
    }

    console.log('User data deleted successfully')

    // Delete the auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      // Don't throw - user data is already deleted
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: 'User data deleted but auth user deletion failed' 
        }),
        { headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
      )
    }

    console.log('Auth user deleted successfully')

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } 
      }
    )
  }
})
