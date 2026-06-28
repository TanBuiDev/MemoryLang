-- Migration: Buộc tài khoản admin đăng nhập bằng Google OAuth
-- Ngày tạo: 2026-06-26
-- Mô tả: Tạo RPC is_admin_email() để kiểm tra email có thuộc admin không.
--        Hàm này được gọi từ LoginPage để chặn đăng nhập bằng username/password với tài khoản admin.

-- 1. Tạo hàm is_admin_email() - SECURITY DEFINER để bypass RLS
CREATE OR REPLACE FUNCTION public.is_admin_email(check_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = check_email AND is_admin = true
  );
END;
$$;

-- 2. Cho phép anon và authenticated gọi hàm này
GRANT EXECUTE ON FUNCTION public.is_admin_email(text) TO anon, authenticated;
