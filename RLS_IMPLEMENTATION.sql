-- ==============================================================================
-- DATABASE ROW LEVEL SECURITY (RLS) policies
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard -> SQL Editor.
-- 2. Paste this entire script and run it.
-- 3. This will secure your database so only authorized users can modify data.
-- ==============================================================================

-- 1. Enable RLS on all critical tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLICY DEFINITIONS
-- ==============================================================================

-- ==============================================================================
-- 1. PROFILES TABLE
-- ==============================================================================
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE USING (auth.uid() = id);

-- ==============================================================================
-- 2. BILLS TABLE
-- ==============================================================================
DROP POLICY IF EXISTS "Bills are viewable by everyone" ON bills;
CREATE POLICY "Bills are viewable by everyone"
ON bills FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and Clerks can insert bills" ON bills;
CREATE POLICY "Admins and Clerks can insert bills"
ON bills FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'clerk'))
);

DROP POLICY IF EXISTS "Admins and Clerks can update bills" ON bills;
CREATE POLICY "Admins and Clerks can update bills"
ON bills FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'clerk'))
);

DROP POLICY IF EXISTS "Only Admins can delete bills" ON bills;
CREATE POLICY "Only Admins can delete bills"
ON bills FOR DELETE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin'))
);

-- ==============================================================================
-- 3. DOCUMENTS TABLE
-- ==============================================================================
DROP POLICY IF EXISTS "Documents are viewable by everyone" ON documents;
CREATE POLICY "Documents are viewable by everyone" 
ON documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and Clerks can manage documents" ON documents;
CREATE POLICY "Admins and Clerks can manage documents"
ON documents FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'clerk'))
);

-- ==============================================================================
-- 4. COMMITTEES TABLE
-- ==============================================================================
DROP POLICY IF EXISTS "Committees are viewable by everyone" ON committees;
CREATE POLICY "Committees are viewable by everyone" 
ON committees FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only Admins can manage committees" ON committees;
CREATE POLICY "Only Admins can manage committees"
ON committees FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin'))
);
