import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackupData {
  profiles: any[]
  income: any[]
  expenses: any[]
  expense_categories: any[]
  monthly_budgets: any[]
  accounts: any[]
  backup_date: string
  app_version: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating backup for user: ${user.id}`)

    // Fetch all user data
    const backupData: BackupData = {
      profiles: [],
      income: [],
      expenses: [],
      expense_categories: [],
      monthly_budgets: [],
      accounts: [],
      backup_date: new Date().toISOString(),
      app_version: '1.0.0'
    }

    // Fetch user profile
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
    backupData.profiles = profiles || []

    // Fetch income data
    const { data: income } = await supabaseClient
      .from('income')
      .select('*')
      .eq('user_id', user.id)
    backupData.income = income || []

    // Fetch expense data
    const { data: expenses } = await supabaseClient
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
    backupData.expenses = expenses || []

    // Fetch user's custom expense categories
    const { data: categories } = await supabaseClient
      .from('expense_categories')
      .select('*')
      .eq('user_id', user.id)
    backupData.expense_categories = categories || []

    // Fetch monthly budgets
    const { data: budgets } = await supabaseClient
      .from('monthly_budgets')
      .select('*')
      .eq('user_id', user.id)
    backupData.monthly_budgets = budgets || []

    // Fetch accounts
    const { data: accounts } = await supabaseClient
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
    backupData.accounts = accounts || []

    console.log(`Backup created successfully for user: ${user.id}`)
    console.log(`Backup contains: ${backupData.income.length} income entries, ${backupData.expenses.length} expenses, ${backupData.monthly_budgets.length} budgets`)

    return new Response(
      JSON.stringify(backupData),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="financial-backup-${new Date().toISOString().split('T')[0]}.json"`
        } 
      }
    )

  } catch (error) {
    console.error('Backup error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})