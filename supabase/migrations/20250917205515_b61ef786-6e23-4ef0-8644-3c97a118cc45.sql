-- Create admin user and expense tracking tables for Calabrese family budget app

-- Create expense categories
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create monthly budgets/bills
CREATE TABLE public.monthly_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budgeted_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, month, year)
);

-- Create actual expenses/payments
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES public.monthly_budgets(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (but allow all access for single admin user)
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations (since it's single admin user)
CREATE POLICY "Allow all operations on expense_categories" ON public.expense_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on monthly_budgets" ON public.monthly_budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_monthly_budgets_updated_at
  BEFORE UPDATE ON public.monthly_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default expense categories
INSERT INTO public.expense_categories (name, color, icon) VALUES
  ('Housing', '#0F172A', '🏠'),
  ('Food & Dining', '#DC2626', '🍽️'),
  ('Transportation', '#2563EB', '🚗'),
  ('Utilities', '#F59E0B', '⚡'),
  ('Healthcare', '#10B981', '🏥'),
  ('Entertainment', '#8B5CF6', '🎬'),
  ('Shopping', '#EC4899', '🛍️'),
  ('Insurance', '#6B7280', '🛡️'),
  ('Savings', '#059669', '💰'),
  ('Miscellaneous', '#64748B', '📦');