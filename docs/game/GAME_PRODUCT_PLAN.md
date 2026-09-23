# MemoryLang Game Product Plan

## Mục tiêu

Biến Game Hub thành một phương thức học từ vựng chuẩn hóa cho toàn bộ người dùng MemoryLang, không tạo curriculum riêng cho từng cá nhân.

## Nguyên tắc sản phẩm

- Curriculum, deck, mission và thứ tự học là nội dung dùng chung.
- Tiến trình, điểm số và lịch ôn được lưu theo từng user.
- Game là phương thức delivery của bài học, không chỉ là tính năng phụ.
- Tái sử dụng dữ liệu hiện có: deck, global_terms, audio, translation, examples.
- Không hardcode nội dung từ vựng vào React component.

## Phạm vi MVP

- Chọn deck.
- Chia deck thành các mission cố định.
- Mỗi mission dùng một game flow chuẩn:
  1. Learn
  2. Matching
  3. Listening
  4. Context
  5. Recall
  6. Boss
  7. Result
- Lưu kết quả và tiến trình.
- Kết quả gameplay có thể cập nhật user_terms để phục vụ review.

## Ngoài phạm vi MVP

- Open world.
- Character equipment.
- Inventory.
- Story branching phức tạp.
- AI tự tạo curriculum cho từng user.
- Achievement system lớn.

## Định nghĩa thành công

MVP được xem là thành công khi:
- Người dùng có thể chọn một deck và hoàn thành mission.
- Các mission dùng chung nội dung cho mọi user.
- Audio, translation và examples hiện có được tái sử dụng.
- Tiến trình học được lưu bền vững.
- Có thể thêm deck mới mà không phải viết lại game engine.
