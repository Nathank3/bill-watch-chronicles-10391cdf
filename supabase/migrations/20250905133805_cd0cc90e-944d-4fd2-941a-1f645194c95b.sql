-- Create committees table for dropdown management
CREATE TABLE public.committees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;

-- Create policies for committees
CREATE POLICY "Committees are viewable by everyone" 
ON public.committees 
FOR SELECT 
USING (true);

CREATE POLICY "Only admin can insert committees" 
ON public.committees 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin'::text);

CREATE POLICY "Only admin can update committees" 
ON public.committees 
FOR UPDATE 
USING (get_current_user_role() = 'admin'::text);

CREATE POLICY "Only admin can delete committees" 
ON public.committees 
FOR DELETE 
USING (get_current_user_role() = 'admin'::text);

-- Insert default committees
INSERT INTO public.committees (name) VALUES 
('Agriculture and Livestock'),
('Education'),
('Finance and Revenue'),
('Health'),
('Transportation and Infrastructure'),
('Water and Sanitation'),
('Environment and Natural Resources'),
('Trade and Industry'),
('Gender and Social Services'),
('ICT and Innovation');

-- Add new columns to bills table
ALTER TABLE public.bills ADD COLUMN days_allocated integer;
ALTER TABLE public.bills ADD COLUMN overdue_days integer DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN date_laid timestamp with time zone;

-- Update status enum to include new states
-- First, update existing records to match new status requirements
UPDATE public.bills SET status = 'pending' WHERE status = 'pending';

-- Add new columns to documents table  
ALTER TABLE public.documents ADD COLUMN days_allocated integer;
ALTER TABLE public.documents ADD COLUMN overdue_days integer DEFAULT 0;
ALTER TABLE public.documents ADD COLUMN date_laid timestamp with time zone;

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for committees table
CREATE TRIGGER update_committees_updated_at
BEFORE UPDATE ON public.committees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();