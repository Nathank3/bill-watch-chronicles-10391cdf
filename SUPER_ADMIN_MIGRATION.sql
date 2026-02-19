-- ==============================================================================
-- SUPER ADMIN MIGRATION SCRIPT
-- ==============================================================================
-- Run this script in your Supabase SQL Editor to enable the 'super_admin' role permissions.

-- 1. UPDATE BILLS POLICIES
DROP POLICY IF EXISTS "Admins and Clerks can insert bills" ON bills;
CREATE POLICY "Admins and Clerks can insert bills"
ON bills FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'clerk', 'super_admin'))
);

DROP POLICY IF EXISTS "Admins and Clerks can update bills" ON bills;
CREATE POLICY "Admins and Clerks can update bills"
ON bills FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'clerk', 'super_admin'))
);

DROP POLICY IF EXISTS "Only Admins can delete bills" ON bills;
CREATE POLICY "Only Admins can delete bills"
ON bills FOR DELETE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
);

-- 2. UPDATE DOCUMENTS POLICIES
DROP POLICY IF EXISTS "Admins and Clerks can manage documents" ON documents;
CREATE POLICY "Admins and Clerks can manage documents"
ON documents FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'clerk', 'super_admin'))
);

-- 3. UPDATE COMMITTEES POLICIES
DROP POLICY IF EXISTS "Only Admins can manage committees" ON committees;
CREATE POLICY "Only Admins can manage committees"
ON committees FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
);

-- 4. OPTIONAL: ENSURE PROFILES TABLE CAN BE MANAGED BY SUPER ADMIN
-- (Usually managed via Edge Function, but good for direct DB access if needed)
DROP POLICY IF EXISTS "Super Admins can update all profiles" ON profiles;
CREATE POLICY "Super Admins can update all profiles"
ON profiles FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
);
