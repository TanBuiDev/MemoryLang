-- Migration: Hệ thống thông báo (Notification System)
-- Cho phép admin gửi thông báo đến người dùng, hỗ trợ Realtime

-- 1. Bảng notifications: chứa thông báo từ hệ thống/admin
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'announcement'
    CHECK (type IN ('announcement', 'maintenance', 'update', 'alert')),
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target text NOT NULL DEFAULT 'all'
    CHECK (target IN ('all', 'admins')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Authenticated users đọc thông báo active, chưa hết hạn
CREATE POLICY "users read active notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Admin quản lý toàn bộ
CREATE POLICY "admins manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Bảng theo dõi user đã đọc thông báo nào
CREATE TABLE public.user_notification_reads (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_id)
);

ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;

-- User chỉ đọc/ghi record của chính mình
CREATE POLICY "users manage own reads" ON public.user_notification_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Bật Realtime cho bảng notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
