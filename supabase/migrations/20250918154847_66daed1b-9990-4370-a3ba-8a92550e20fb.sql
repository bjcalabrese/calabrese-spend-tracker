-- First, let's clean up duplicate categories by keeping the most recent ones and updating references

-- Update expenses that reference old category IDs to use the new ones
UPDATE expenses SET category_id = '3dac5f7f-7bad-4a38-ad15-4358f0ca23c7' WHERE category_id = '6132eed4-62ae-4213-8c41-b52d0984d4d4'; -- Entertainment
UPDATE expenses SET category_id = '9d4e8397-3f34-4e4c-8e4f-f6da924a7562' WHERE category_id = '13ec1f0f-99b8-448d-a3dc-22661d802a8f'; -- Food & Dining  
UPDATE expenses SET category_id = '12a36a83-3dc3-47c6-b6ec-c239f1c87606' WHERE category_id = 'f35d3ed8-e32c-40d4-bba0-ec35e2a77e8d'; -- Healthcare
UPDATE expenses SET category_id = 'ab37e930-801d-4957-baba-ba7ed5a3fe3f' WHERE category_id = '0ca25543-9869-40e3-ad8b-e9a14db99736'; -- Shopping
UPDATE expenses SET category_id = 'ee26e439-2d41-41e8-8cbf-9eae65c510d3' WHERE category_id = '2e1b0036-abb7-433f-a950-1ab1ce71f1c9'; -- Transportation

-- Update monthly_budgets that reference old category IDs
UPDATE monthly_budgets SET category_id = '3dac5f7f-7bad-4a38-ad15-4358f0ca23c7' WHERE category_id = '6132eed4-62ae-4213-8c41-b52d0984d4d4'; -- Entertainment
UPDATE monthly_budgets SET category_id = '9d4e8397-3f34-4e4c-8e4f-f6da924a7562' WHERE category_id = '13ec1f0f-99b8-448d-a3dc-22661d802a8f'; -- Food & Dining
UPDATE monthly_budgets SET category_id = '12a36a83-3dc3-47c6-b6ec-c239f1c87606' WHERE category_id = 'f35d3ed8-e32c-40d4-bba0-ec35e2a77e8d'; -- Healthcare
UPDATE monthly_budgets SET category_id = 'ab37e930-801d-4957-baba-ba7ed5a3fe3f' WHERE category_id = '0ca25543-9869-40e3-ad8b-e9a14db99736'; -- Shopping
UPDATE monthly_budgets SET category_id = 'ee26e439-2d41-41e8-8cbf-9eae65c510d3' WHERE category_id = '2e1b0036-abb7-433f-a950-1ab1ce71f1c9'; -- Transportation

-- Merge Bills & Utilities and Utilities - update to Bills & Utilities
UPDATE expenses SET category_id = '3332f6ba-f6e3-4dac-a8b4-6a68743ca315' WHERE category_id = '215b2f21-0ab8-45c0-895a-009e2388b73a'; -- Utilities -> Bills & Utilities
UPDATE monthly_budgets SET category_id = '3332f6ba-f6e3-4dac-a8b4-6a68743ca315' WHERE category_id = '215b2f21-0ab8-45c0-895a-009e2388b73a'; -- Utilities -> Bills & Utilities

-- Delete duplicate categories
DELETE FROM expense_categories WHERE id IN (
  '6132eed4-62ae-4213-8c41-b52d0984d4d4', -- Entertainment duplicate
  '13ec1f0f-99b8-448d-a3dc-22661d802a8f', -- Food & Dining duplicate
  'f35d3ed8-e32c-40d4-bba0-ec35e2a77e8d', -- Healthcare duplicate  
  '0ca25543-9869-40e3-ad8b-e9a14db99736', -- Shopping duplicate
  '2e1b0036-abb7-433f-a950-1ab1ce71f1c9', -- Transportation duplicate
  '215b2f21-0ab8-45c0-895a-009e2388b73a'  -- Utilities (merged with Bills & Utilities)
);

-- Move income entries from budgets to income table (these look like income, not budgets)
INSERT INTO income (user_id, name, amount, frequency, income_date)
SELECT 
  user_id,
  name,
  budgeted_amount,
  'monthly',
  DATE(CONCAT(year, '-', LPAD(month::text, 2, '0'), '-01'))
FROM monthly_budgets 
WHERE name LIKE '%income%' OR name LIKE '%Brian income%';

-- Delete the income entries from budgets table
DELETE FROM monthly_budgets WHERE name LIKE '%income%' OR name LIKE '%Brian income%';