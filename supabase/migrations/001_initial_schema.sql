-- Allowlist: checked after Google OAuth
CREATE TABLE allowlist (
  email TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'inspector',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inspector assignments
CREATE TABLE project_assignments (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

-- Visits: one per project per day
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  summary_note TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, date)
);

-- Observations
CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('progress', 'issue')),
  text TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Files attached to observations
CREATE TABLE observation_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'audio')),
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Issues
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID REFERENCES observations(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'fixed', 'recheck', 'closed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activity log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed allowlist
INSERT INTO allowlist (email) VALUES ('liranhster@gmail.com');

-- RLS: enable on all tables
ALTER TABLE allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE observation_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Helper: is current user owner?
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: can user access project?
CREATE OR REPLACE FUNCTION can_access_project(project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT is_owner() OR EXISTS (
    SELECT 1 FROM project_assignments
    WHERE project_assignments.project_id = $1
    AND project_assignments.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = $1
    AND projects.created_by = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY "profiles_self" ON profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "profiles_owner_read" ON profiles FOR SELECT USING (is_owner());

CREATE POLICY "projects_owner_all" ON projects FOR ALL USING (is_owner());
CREATE POLICY "projects_assigned_read" ON projects FOR SELECT USING (can_access_project(id));
CREATE POLICY "projects_assigned_insert" ON projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "assignments_owner" ON project_assignments FOR ALL USING (is_owner());
CREATE POLICY "assignments_self_read" ON project_assignments FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "visits_access" ON visits FOR ALL USING (can_access_project(project_id));
CREATE POLICY "observations_access" ON observations FOR ALL USING (can_access_project(project_id));
CREATE POLICY "files_access" ON observation_files FOR ALL USING (
  EXISTS (SELECT 1 FROM observations WHERE observations.id = observation_id AND can_access_project(observations.project_id))
);
CREATE POLICY "issues_access" ON issues FOR ALL USING (can_access_project(project_id));
CREATE POLICY "reports_access" ON reports FOR ALL USING (can_access_project(project_id));
CREATE POLICY "activity_owner" ON activity_log FOR ALL USING (is_owner());
CREATE POLICY "allowlist_owner" ON allowlist FOR ALL USING (is_owner());
