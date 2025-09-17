-- Phase 1: Add User Authentication Infrastructure and Fix Critical Security Issues

-- Add user_id columns to existing tables
ALTER TABLE public.expenses 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.monthly_budgets 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.expense_categories 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_monthly_budgets_user_id ON public.monthly_budgets(user_id);
CREATE INDEX idx_expense_categories_user_id ON public.expense_categories(user_id);

-- Create profiles table for additional user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create secure RLS policies to replace the dangerous "true" policies

-- Drop existing dangerous policies
DROP POLICY IF EXISTS "Allow all operations on expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Allow all operations on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow all operations on monthly_budgets" ON public.monthly_budgets;

-- Expense Categories Policies
CREATE POLICY "Users can view their own categories and shared ones" 
ON public.expense_categories FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create their own categories" 
ON public.expense_categories FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own categories" 
ON public.expense_categories FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own categories" 
ON public.expense_categories FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Expenses Policies
CREATE POLICY "Users can view their own expenses" 
ON public.expenses FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own expenses" 
ON public.expenses FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own expenses" 
ON public.expenses FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own expenses" 
ON public.expenses FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Monthly Budgets Policies
CREATE POLICY "Users can view their own budgets" 
ON public.monthly_budgets FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own budgets" 
ON public.monthly_budgets FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own budgets" 
ON public.monthly_budgets FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own budgets" 
ON public.monthly_budgets FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Profiles Policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can create their own profile" 
ON public.profiles FOR INSERT 
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (id = auth.uid());

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add some default shared expense categories (with NULL user_id)
INSERT INTO public.expense_categories (name, color, icon, user_id) VALUES
('Food & Dining', '#FF6B6B', '🍽️', NULL),
('Transportation', '#4ECDC4', '🚗', NULL),
('Shopping', '#45B7D1', '🛍️', NULL),
('Entertainment', '#96CEB4', '🎬', NULL),
('Bills & Utilities', '#FFEAA7', '💡', NULL),
('Healthcare', '#DDA0DD', '🏥', NULL),
('Education', '#98D8C8', '📚', NULL),
('Travel', '#F7DC6F', '✈️', NULL)
ON CONFLICT DO NOTHING;