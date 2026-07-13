-- Migration: Handle Notification Reactivation
-- Khi kích hoạt lại thông báo, làm mới trạng thái đã đọc và cập nhật thời gian để thông báo hiển thị lên đầu.

CREATE OR REPLACE FUNCTION public.handle_notification_reactivation()
RETURNS TRIGGER AS $$
BEGIN
  -- Kiểm tra nếu trạng thái chuyển từ inactive sang active
  IF NEW.is_active = true AND (OLD.is_active = false OR OLD.is_active IS NULL) THEN
    -- 1. Xóa lịch sử đã đọc của tất cả người dùng đối với thông báo này
    DELETE FROM public.user_notification_reads
    WHERE notification_id = NEW.id;

    -- 2. Cập nhật thời gian tạo để đẩy thông báo lên đầu danh sách
    NEW.created_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger chạy trước khi UPDATE bảng notifications
DROP TRIGGER IF EXISTS tr_notification_reactivation ON public.notifications;
CREATE TRIGGER tr_notification_reactivation
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_notification_reactivation();
