-- Move "Jeanette - week 2 Income" from monthly_budgets to income table
INSERT INTO public.income (user_id, name, amount, income_date, is_recurring, frequency)
SELECT 
  user_id, 
  name, 
  budgeted_amount,
  DATE(CONCAT(year, '-', LPAD(month::text, 2, '0'), '-01')) as income_date,
  true as is_recurring,
  'weekly' as frequency
FROM public.monthly_budgets 
WHERE name = 'Jeanette - week 2 Income';

-- Delete the income entry from monthly_budgets
DELETE FROM public.monthly_budgets 
WHERE name = 'Jeanette - week 2 Income';