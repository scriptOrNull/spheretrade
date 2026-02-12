import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify the user
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check if deletion request exists and 7 days have passed
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: deletion } = await adminClient
      .from('account_deletions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (!deletion) {
      return new Response(JSON.stringify({ error: 'No deletion request found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const deleteAfter = new Date(deletion.delete_after)
    if (new Date() < deleteAfter) {
      return new Response(JSON.stringify({ error: 'Deletion period has not passed yet' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Clean up user data
    await adminClient.from('transactions').delete().eq('user_id', user.id)
    await adminClient.from('portfolio').delete().eq('user_id', user.id)
    await adminClient.from('deposits').delete().eq('user_id', user.id)
    await adminClient.from('withdrawals').delete().eq('user_id', user.id)
    await adminClient.from('account_deletions').delete().eq('user_id', user.id)
    await adminClient.from('user_roles').delete().eq('user_id', user.id)
    await adminClient.from('profiles').delete().eq('id', user.id)

    // Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
