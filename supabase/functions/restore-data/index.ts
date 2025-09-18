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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
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

    const backupData: BackupData = await req.json()

    console.log(`Starting restore for user: ${user.id}`)
    console.log(`Backup date: ${backupData.backup_date}`)

    // Validate backup data structure
    if (!backupData.backup_date || !backupData.app_version) {
      return new Response(
        JSON.stringify({ error: 'Invalid backup file format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = {
      profiles: 0,
      income: 0,
      expenses: 0,
      expense_categories: 0,
      monthly_budgets: 0,
      accounts: 0,
      errors: [] as string[]
    }

    // Restore profiles (update existing)
    if (backupData.profiles && backupData.profiles.length > 0) {
      try {
        for (const profile of backupData.profiles) {
          const { error } = await supabaseClient
            .from('profiles')
            .upsert({ ...profile, id: user.id }, { onConflict: 'id' })
          
          if (error) {
            results.errors.push(`Profile restore error: ${error.message}`)
          } else {
            results.profiles++
          }
        }
      } catch (error: any) {
        results.errors.push(`Profiles restore failed: ${error.message}`)
      }
    }

    // Restore expense categories (user-created ones)
    if (backupData.expense_categories && backupData.expense_categories.length > 0) {
      try {
        const categoriesToInsert = backupData.expense_categories.map(cat => ({
          ...cat,
          user_id: user.id, // Ensure user ownership
          id: undefined // Let DB generate new IDs
        }))

        const { data, error } = await supabaseClient
          .from('expense_categories')
          .insert(categoriesToInsert)
          .select()

        if (error) {
          results.errors.push(`Categories restore error: ${error.message}`)
        } else {
          results.expense_categories = data?.length || 0
        }
      } catch (error: any) {
        results.errors.push(`Categories restore failed: ${error.message}`)
      }
    }

    // Restore accounts
    if (backupData.accounts && backupData.accounts.length > 0) {
      try {
        const accountsToInsert = backupData.accounts.map(acc => ({
          ...acc,
          user_id: user.id,
          id: undefined // Let DB generate new IDs
        }))

        const { data, error } = await supabaseClient
          .from('accounts')
          .insert(accountsToInsert)
          .select()

        if (error) {
          results.errors.push(`Accounts restore error: ${error.message}`)
        } else {
          results.accounts = data?.length || 0
        }
      } catch (error: any) {
        results.errors.push(`Accounts restore failed: ${error.message}`)
      }
    }

    // Restore income
    if (backupData.income && backupData.income.length > 0) {
      try {
        const incomeToInsert = backupData.income.map(inc => ({
          ...inc,
          user_id: user.id,
          id: undefined // Let DB generate new IDs
        }))

        const { data, error } = await supabaseClient
          .from('income')
          .insert(incomeToInsert)
          .select()

        if (error) {
          results.errors.push(`Income restore error: ${error.message}`)
        } else {
          results.income = data?.length || 0
        }
      } catch (error: any) {
        results.errors.push(`Income restore failed: ${error.message}`)
      }
    }

    // Restore monthly budgets
    if (backupData.monthly_budgets && backupData.monthly_budgets.length > 0) {
      try {
        const budgetsToInsert = backupData.monthly_budgets.map(budget => ({
          ...budget,
          user_id: user.id,
          id: undefined // Let DB generate new IDs
        }))

        const { data, error } = await supabaseClient
          .from('monthly_budgets')
          .insert(budgetsToInsert)
          .select()

        if (error) {
          results.errors.push(`Budgets restore error: ${error.message}`)
        } else {
          results.monthly_budgets = data?.length || 0
        }
      } catch (error: any) {
        results.errors.push(`Budgets restore failed: ${error.message}`)
      }
    }

    // Restore expenses
    if (backupData.expenses && backupData.expenses.length > 0) {
      try {
        const expensesToInsert = backupData.expenses.map(exp => ({
          ...exp,
          user_id: user.id,
          id: undefined, // Let DB generate new IDs
          category_id: null, // Categories will have new IDs, need to map them
          budget_id: null // Budgets will have new IDs, need to map them
        }))

        const { data, error } = await supabaseClient
          .from('expenses')
          .insert(expensesToInsert)
          .select()

        if (error) {
          results.errors.push(`Expenses restore error: ${error.message}`)
        } else {
          results.expenses = data?.length || 0
        }
      } catch (error: any) {
        results.errors.push(`Expenses restore failed: ${error.message}`)
      }
    }

    console.log(`Restore completed for user: ${user.id}`)
    console.log(`Results:`, results)

    return new Response(
      JSON.stringify({
        success: true,
        results,
        backup_date: backupData.backup_date
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Restore error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})