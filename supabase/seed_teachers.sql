-- ==============================================================================
-- HAPPYLEARNING: SEED TEACHER & ADMIN ACCOUNTS (DATABASE-DRIVEN AUTH)
-- ==============================================================================
-- This script safely and idempotently seeds the 2 default teacher accounts
-- into Supabase Auth with bcrypt-hashed passwords.
--
-- Accounts Created:
-- 1. Admin:   admin@happylearning.vn   / 123456 (Role: admin)
-- 2. Teacher: traceyle@happylearning.vn / 123456 (Role: teacher)
--
-- Instructions: Run this script directly in the Supabase Dashboard SQL Editor.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  admin_uid UUID := 'aa272754-3f16-4e9f-838f-8f9e5fffd508';
  teacher_uid UUID := '7f1babce-6f3e-4b35-adc3-a90fe503f41a';
BEGIN
  -- 1. Seed System Admin (admin@happylearning.vn)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@happylearning.vn') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@happylearning.vn',
      crypt('123456', gen_salt('bf', 10)),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"username": "admin", "full_name": "System Admin", "role": "admin"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      admin_uid::text,
      admin_uid,
      jsonb_build_object('sub', admin_uid::text, 'email', 'admin@happylearning.vn'),
      'email',
      'admin@happylearning.vn',
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  ELSE
    -- If user already exists, update password hash and metadata
    UPDATE auth.users
    SET 
      encrypted_password = crypt('123456', gen_salt('bf', 10)),
      raw_user_meta_data = '{"username": "admin", "full_name": "System Admin", "role": "admin"}'::jsonb,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE email = 'admin@happylearning.vn';
  END IF;

  -- 2. Seed Teacher Tracey Le (traceyle@happylearning.vn)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'traceyle@happylearning.vn') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      teacher_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'traceyle@happylearning.vn',
      crypt('123456', gen_salt('bf', 10)),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"username": "traceyle", "full_name": "Tracey Le", "role": "teacher"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      teacher_uid::text,
      teacher_uid,
      jsonb_build_object('sub', teacher_uid::text, 'email', 'traceyle@happylearning.vn'),
      'email',
      'traceyle@happylearning.vn',
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  ELSE
    -- If user already exists, update password hash and metadata
    UPDATE auth.users
    SET 
      encrypted_password = crypt('123456', gen_salt('bf', 10)),
      raw_user_meta_data = '{"username": "traceyle", "full_name": "Tracey Le", "role": "teacher"}'::jsonb,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE email = 'traceyle@happylearning.vn';
  END IF;

END $$;
