import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify the caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const callerId = claimsData.claims.sub as string

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Check if caller is admin
    const { data: roles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
    const isAdmin = roles?.some((r: any) => r.role === 'admin') ?? false

    // Get userId from body (admin deleting another user) or use caller's own id
    const body = await req.json().catch(() => ({}))
    const targetUserId = isAdmin && body.userId ? body.userId : callerId

    if (!isAdmin) {
      // Non-admin: check deletion request exists and 7 days passed
      const { data: deletion } = await adminClient
        .from('account_deletions')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('status', 'pending')
        .single()

      if (!deletion) {
        return new Response(JSON.stringify({ error: 'No deletion request found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const deleteAfter = new Date(deletion.delete_after)
      if (new Date() < deleteAfter) {
        return new Response(JSON.stringify({ error: 'Deletion period has not passed yet' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Clean up user data
    await adminClient.from('transactions').delete().eq('user_id', targetUserId)
    await adminClient.from('portfolio').delete().eq('user_id', targetUserId)
    await adminClient.from('deposits').delete().eq('user_id', targetUserId)
    await adminClient.from('withdrawals').delete().eq('user_id', targetUserId)
    await adminClient.from('account_deletions').delete().eq('user_id', targetUserId)
    await adminClient.from('user_roles').delete().eq('user_id', targetUserId)
    await adminClient.from('profiles').delete().eq('id', targetUserId)

    // Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId)
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})