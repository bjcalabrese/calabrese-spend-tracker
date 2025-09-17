-- Clean up the manually inserted auth data that's causing the schema error
DELETE FROM auth.identities WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@calabrese.local');
DELETE FROM auth.users WHERE email = 'admin@calabrese.local';
DELETE FROM public.profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@calabrese.local');