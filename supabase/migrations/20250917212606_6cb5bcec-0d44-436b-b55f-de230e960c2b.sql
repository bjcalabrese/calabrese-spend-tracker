-- Create an admin user account
-- Note: This user will need to set their password through Supabase Auth
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@calabrese.local',
  crypt('calabrese123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Admin"}',
  false
);

-- Create corresponding profile
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'admin@calabrese.local',
  (SELECT id FROM auth.users WHERE email = 'admin@calabrese.local'),
  '{"sub":"admin@calabrese.local","email":"admin@calabrese.local"}',
  'email',
  now(),
  now(),
  now()
);