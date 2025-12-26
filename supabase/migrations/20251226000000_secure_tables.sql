-- 1. Ensure created_by column exists in documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Enable RLS on bills and documents
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 3. Policies for public.bills

-- Drop existing policies if they exist to prevent conflicts
DROP POLICY IF EXISTS "Bills are viewable by everyone" ON public.bills;
DROP POLICY IF EXISTS "Authenticated users can insert bills" ON public.bills;
DROP POLICY IF EXISTS "Users can update their own records or admins can update any" ON public.bills;
DROP POLICY IF EXISTS "Only admins can delete bills" ON public.bills;

-- Anyone can view bills (public data)
CREATE POLICY "Bills are viewable by everyone" 
ON public.bills FOR SELECT 
USING (true);

-- Only authenticated users can insert bills
CREATE POLICY "Authenticated users can insert bills" 
ON public.bills FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own bills, or admins can update any bill
CREATE POLICY "Users can update their own records or admins can update any" 
ON public.bills FOR UPDATE 
USING (
  auth.uid() = created_by OR 
  (SELECT (CASE WHEN role = 'admin' THEN true ELSE false END) FROM public.profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  auth.uid() = created_by OR 
  (SELECT (CASE WHEN role = 'admin' THEN true ELSE false END) FROM public.profiles WHERE id = auth.uid()) = true
);

-- Only admins can delete bills
CREATE POLICY "Only admins can delete bills" 
ON public.bills FOR DELETE 
USING (
  (SELECT (CASE WHEN role = 'admin' THEN true ELSE false END) FROM public.profiles WHERE id = auth.uid()) = true
);


-- 4. Policies for public.documents

-- Drop existing policies if they exist to prevent conflicts
DROP POLICY IF EXISTS "Documents are viewable by everyone" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents or admins can update any" ON public.documents;
DROP POLICY IF EXISTS "Only admins can delete documents" ON public.documents;

CREATE POLICY "Documents are viewable by everyone" 
ON public.documents FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert documents" 
ON public.documents FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own documents or admins can update any" 
ON public.documents FOR UPDATE 
USING (
  auth.uid() = created_by OR 
  created_by IS NULL OR -- Allow existing documents with null creator to be managed by admins (covered by next line)
  (SELECT (CASE WHEN role = 'admin' THEN true ELSE false END) FROM public.profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  auth.uid() = created_by OR 
  (SELECT (CASE WHEN role = 'admin' THEN true ELSE false END) FROM public.profiles WHERE id = auth.uid()) = true
);

CREATE POLICY "Only admins can delete documents" 
ON public.documents FOR DELETE 
USING (
  (SELECT (CASE WHEN role = 'admin' THEN true ELSE false END) FROM public.profiles WHERE id = auth.uid()) = true
);
