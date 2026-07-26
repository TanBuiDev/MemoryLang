# B1 Exam Practice Suite Design

## 1. Mục tiêu

Xây dựng một bộ đề B1 liên kết nhiều bài luyện độc lập theo kỹ năng. Người học có thể:

- Luyện riêng từng phần.
- Bắt đầu một phiên thi thử trọn bộ với một đồng hồ chung.
- Tùy chỉnh thời lượng trước khi bắt đầu.
- Tiếp tục làm khi hết giờ; hệ thống chỉ cảnh báo và ghi nhận thời gian vượt mức.
- Lưu tiến độ, khôi phục phiên dang dở và xem kết quả.
- Soạn Writing và kịch bản Speaking theo lịch sử tối đa năm phiên bản.
- So sánh hai phiên bản Writing/Speaking bất kỳ theo dạng diff.

Nội dung ban đầu được trích xuất trực tiếp từ `E:\b1\DeFull Copy.pdf`, chuẩn hóa, tạo migration/seed và áp dụng lên Supabase remote. Admin không phải nhập lại nội dung bằng tay. Riêng ảnh Signs và các file audio được admin bổ sung sau.

## 2. Phạm vi phase đầu

### Bao gồm

- Bộ đề B1 đóng vai trò lớp điều phối các bài luyện.
- Các bài luyện Grammar/Use of English, Signs, Reading, Cloze, Sentence Transformation, Writing, Listening và Speaking.
- Luyện riêng hoặc chạy liên tục dưới một phiên thi thử.
- Một đồng hồ chung, thời lượng mặc định và thời lượng tùy chỉnh.
- Tự lưu, khôi phục và lưu lịch sử kết quả.
- Chấm tự động các câu khách quan.
- Writing/Speaking lưu văn bản, lịch sử phiên bản và so sánh phiên bản.
- Audio Listening do admin tải lên.
- Audio TTS của Writing/Speaking do admin tạo trước và lưu lại để học viên phát.
- Pipeline trích xuất PDF, kiểm tra dữ liệu và migration lên Supabase remote.

### Chưa bao gồm

- AI chấm Writing hoặc Speaking.
- Ghi âm câu trả lời Speaking.
- Tự động tạo audio ở màn hình học viên.
- Bắt buộc nộp bài khi hết giờ.
- Tự động cắt và gắn từng ảnh Signs; admin thực hiện bước này.

## 3. Phân tích nguồn PDF

PDF có 18 trang, có text layer, hình ảnh và 99 annotation. Phần lớn annotation là đáp án tô vàng hoặc lời giải được chèn vào tài liệu. Pipeline nhập liệu phải kết hợp:

1. Text layer để lấy đoạn văn và câu hỏi.
2. Render thị giác để kiểm tra bố cục, nội dung hai cột và Signs.
3. Annotation để xác định đáp án hoặc bài mẫu.
4. Kiểm tra thủ công đối với các trường hợp không chắc chắn.

Nội dung được ánh xạ thành:

- Grammar/Use of English: câu 101-120.
- Signs: 15 câu trắc nghiệm; nhập text và đáp án, để trống ảnh.
- Reading: hai bài đọc, tổng cộng 10 câu.
- Cloze: 10 câu điền từ có lựa chọn.
- Sentence Transformation: 10 câu tự nhập.
- Writing: đề email xin việc bán thời gian, hướng dẫn và bài tham khảo.
- Listening: một bài điền từ, hai bài multiple choice và hai bài True/False.
- Speaking: hướng dẫn, câu hỏi khởi động và các chủ đề nói xuất hiện trong PDF.

Số thứ tự trong tài liệu đến từ nhiều nguồn khác nhau như 101, 61 và `Text 15/31/34/52/56`. Dữ liệu ứng dụng dùng thứ tự nội bộ nhất quán nhưng vẫn giữ số gốc trong metadata để đối chiếu.

PDF không chứa audio nhúng. Các bài Listening, Writing và Speaking được nhập với trạng thái thiếu audio để admin hoàn thiện sau.

## 4. Kiến trúc nội dung

### 4.1 Bộ đề làm lớp điều phối

`exams` đại diện cho một bộ đề. `exam_sections` sắp xếp và liên kết các bài luyện gốc:

```text
Bộ đề B1
├── Grammar / Use of English
├── Signs
├── Reading
├── Cloze
├── Sentence Transformation
├── Writing
├── Listening
└── Speaking
```

Mỗi section chứa:

- Kỹ năng và loại bài.
- Tiêu đề, hướng dẫn và thứ tự.
- `resource_type` và `resource_id` để tham chiếu nội dung gốc.
- Trạng thái bắt buộc.
- Thời lượng gợi ý, chỉ dùng để hướng dẫn.

Không sao chép nội dung bài luyện vào bộ đề khi xuất bản. Khi bắt đầu thi, hệ thống tạo snapshot để phiên đang chạy không bị ảnh hưởng bởi thay đổi sau đó của admin.

### 4.2 Nội dung khách quan

Reading và Listening tiếp tục tái sử dụng các renderer/player hiện có. Grammar, Cloze, Sentence Transformation và Signs dùng mô hình bài luyện/câu hỏi có khả năng biểu diễn:

- Multiple choice.
- True/False.
- Fill blank.
- Short text transformation.
- Prompt có ảnh tùy chọn.

Ảnh Signs là nullable. Bài Signs chưa có ảnh không được xuất bản, nhưng dữ liệu text và đáp án vẫn được migration trước.

### 4.3 Writing và Speaking

`practice_prompts` lưu:

- `skill`: `writing` hoặc `speaking`.
- Nội dung đề và bullet points.
- Hướng dẫn/rubric tham khảo.
- Bài mẫu tùy chọn.
- `audio_url` TTS do admin tạo.
- Metadata B1 và trạng thái xuất bản.

Speaking trong phase đầu là bài soạn kịch bản nói bằng văn bản. Hai kỹ năng dùng chung cơ chế phiên bản.

## 5. Kiến trúc lịch sử phiên bản

`practice_draft_versions` lưu snapshot bất biến:

- `user_id`.
- `prompt_id`.
- Số phiên bản.
- Nội dung thuần văn bản.
- Word count.
- Thời điểm tạo.

Quy tắc:

- Tối đa năm phiên bản cho mỗi cặp `user_id + prompt_id`.
- Không cập nhật nội dung phiên bản cũ.
- Khi đã đủ năm phiên bản, người học phải chọn và xác nhận xóa một bản trước khi lưu bản mới.
- Tạo bản mới có thể bắt đầu từ nội dung trống hoặc sao chép một bản cũ.
- Diff được tính ở client theo từ; database chỉ lưu snapshot.
- Người học có thể chọn hai phiên bản bất kỳ để so sánh.
- Phiên thi trọn bộ tham chiếu chính xác `practice_draft_version_id` được dùng khi nộp.

## 6. Phiên thi và kết quả

`exam_attempts` lưu:

- Người làm bài và bộ đề.
- Snapshot cấu trúc/nội dung cần thiết.
- Thời lượng mục tiêu.
- Thời điểm bắt đầu, hoàn thành và lần hoạt động cuối.
- Tổng thời gian thực tế và số giây vượt giờ.
- Section hiện tại.
- Trạng thái `in_progress`, `submitted` hoặc `abandoned`.

`exam_section_attempts` lưu:

- Section thuộc phiên thi.
- Trạng thái và tiến độ.
- Câu trả lời hoặc tham chiếu tới attempt của module chuyên biệt.
- Điểm phần khách quan.
- Draft version của Writing/Speaking.
- Thời điểm cập nhật và hoàn thành.

Luồng:

```text
Chọn bộ đề
→ chọn thời lượng
→ tạo attempt và snapshot
→ làm/chuyển giữa các phần
→ tự lưu từng section
→ cảnh báo và đếm quá giờ
→ xác nhận nộp
→ chấm phần khách quan
→ lưu kết quả tổng hợp
```

Hết giờ không tự nộp. Đồng hồ chuyển sang trạng thái quá giờ và tiếp tục đếm `+HH:MM:SS`.

## 7. Adapter giữa trình thi và module kỹ năng

Trình thi sử dụng contract chung thay vì phụ thuộc trực tiếp vào implementation của từng module:

```ts
interface ExamSectionAdapter {
  loadSection(): Promise<SectionPayload>
  restoreProgress(): Promise<SectionProgress>
  saveProgress(): Promise<void>
  finalize(): Promise<SectionResult>
}
```

Các adapter chịu trách nhiệm chuyển đổi Reading, Listening, câu hỏi khách quan và Writing/Speaking sang payload thống nhất. Điều này giữ bài luyện độc lập nhưng vẫn chạy được trong một phiên thi liên tục.

## 8. UI/UX người học

### Trang bộ đề

- Thông tin B1, thời lượng mặc định và mô tả.
- Danh sách phần thi theo thứ tự.
- Tiến độ luyện riêng của từng phần.
- Nút `Luyện riêng` trên mỗi phần.
- Nút chính `Thi thử trọn bộ`.
- Lịch sử phiên thi và kết quả.

### Thiết lập trước khi thi

- Dùng thời lượng đề xuất.
- Chọn mốc nhanh.
- Nhập thời lượng tùy chỉnh bằng form control trực quan.
- Xem cấu trúc đề.
- Tiếp tục phiên chưa hoàn thành nếu có.

### Trong phiên thi

- Header cố định hiển thị đồng hồ chung và tiến độ.
- Drawer/sidebar hiển thị trạng thái từng phần.
- Cho phép chuyển tự do giữa các phần.
- Tự lưu câu trả lời.
- Cảnh báo khi hết giờ nhưng không khóa thao tác.
- `ConfirmModal` khi nộp, kèm danh sách phần chưa hoàn thành.

### Kết quả

- Điểm và đáp án cho phần khách quan.
- Writing/Speaking hiển thị trạng thái đã lưu, không tính điểm.
- Tách `Điểm tự động` khỏi `Phần tự luyện chưa chấm`.
- Liên kết quay lại từng bài để sửa hoặc tạo phiên bản mới.

### Writing/Speaking

- Đề bài, bullet points và audio TTS.
- Editor văn bản, word count và trạng thái lưu.
- Danh sách tối đa năm phiên bản.
- Chọn hai bản để so sánh.
- Diff song song trên desktop và chuyển đổi từng bản trên mobile.
- Speaking dùng nhãn sản phẩm như `Kịch bản nói`, `Nghe đề`, `Luyện trình bày`.

## 9. UI/UX admin

- Bộ dựng đề hiển thị cây section.
- Chọn bài luyện đã có hoặc tạo bài mới.
- Tải audio Listening lên Storage, nghe thử và gắn vào bài/nhóm câu.
- Tạo hoặc upload audio TTS cho Writing/Speaking.
- Gắn ảnh thủ công cho từng câu Signs.
- Hiển thị trạng thái thiếu ảnh/audio/đáp án.
- Chặn xuất bản khi thiếu tài nguyên bắt buộc.
- Không yêu cầu admin nhập JSON hoặc code thô.

## 10. Pipeline nhập dữ liệu và migration remote

Pipeline phải tạo dữ liệu có định danh ổn định và chạy lặp an toàn:

1. Trích xuất text, annotation và cấu trúc từ PDF.
2. Chuẩn hóa thành artifact JSON trung gian để review và kiểm thử.
3. Gắn `source_document`, trang nguồn và số câu gốc vào metadata.
4. Chạy validator:
   - Trùng/mất số câu.
   - Thiếu lựa chọn hoặc đáp án.
   - Nhiều hơn một đáp án đúng ngoài trường hợp được phép.
   - Thiếu nội dung prompt.
   - Trạng thái thiếu ảnh/audio.
5. Tạo migration Supabase bằng CLI, không tự đặt tên file migration.
6. Seed/upsert nội dung bằng khóa nguồn ổn định.
7. Áp dụng migration lên remote sau khi type-check/build và review SQL.
8. Chạy truy vấn xác minh số lượng, liên kết, RLS và trạng thái nháp.

Dữ liệu nhập ban đầu không được xuất bản tự động. Admin bổ sung ảnh Signs và audio trước khi xuất bản.

## 11. Bảo mật và toàn vẹn

- Mọi bảng exposed đều bật RLS.
- Attempt và draft chỉ cho phép `auth.uid()` truy cập dữ liệu của chính họ.
- Policy admin dùng `profiles.is_admin` hoặc `app_metadata`, không dùng `user_metadata`.
- `UPDATE` policy có cả `USING` và `WITH CHECK`.
- Không xóa rồi chèn lại toàn bộ câu hỏi khi lưu; định danh câu hỏi phải ổn định để lịch sử không mất tham chiếu.
- Các RPC ghi kết quả phải idempotent.
- Migration remote được kiểm tra advisors và quyền Data API trước khi hoàn tất.
- Không đưa service-role key hoặc secret vào frontend/artifact seed.

## 12. Khôi phục và xử lý lỗi

- Mất mạng: giữ tiến độ trong IndexedDB và đồng bộ lại.
- Reload/đóng tab: khôi phục section, câu trả lời và thời gian từ timestamp.
- Audio lỗi: cho retry mà không mất câu trả lời.
- Admin sửa đề: attempt đang làm tiếp tục dùng snapshot.
- Phiên bản thứ sáu: chặn lưu và yêu cầu xóa một bản cũ bằng `ConfirmModal`.
- Nhiều tab: khóa mềm theo attempt và cảnh báo trước khi tiếp quản.
- Nộp lỗi: giữ trạng thái chờ và retry idempotent.
- Import lỗi một phần: rollback transaction hoặc giữ toàn bộ bộ đề ở trạng thái nháp không hợp lệ; không xuất bản dữ liệu dở dang.

## 13. Kiểm thử và tiêu chí hoàn thành

### Unit

- Timer và thời gian vượt mức.
- Giới hạn năm phiên bản.
- Word-level diff.
- Parser/validator dữ liệu PDF.
- Adapter của từng loại section.

### Database

- RLS ownership/admin.
- Snapshot và liên kết section.
- Upsert seed chạy lặp không nhân đôi.
- Draft version limit.
- Kết quả nộp idempotent.

### Integration/E2E

- Luyện riêng từng phần.
- Thi trọn bộ và chuyển section.
- Reload, mất mạng và khôi phục.
- Hết giờ nhưng vẫn tiếp tục.
- Nộp bài với phần chưa hoàn thành.
- Lưu và so sánh Writing/Speaking.
- Admin bổ sung ảnh/audio và xuất bản.

### Xác minh dữ liệu nhập

- Tất cả nội dung PDF thuộc phạm vi được tạo trên remote.
- Số câu, lựa chọn và đáp án khớp artifact đã review.
- Signs tồn tại với placeholder ảnh rõ ràng.
- Listening/Writing/Speaking thể hiện trạng thái thiếu audio.
- Bộ đề và bài luyện ở trạng thái nháp.
- Không có dữ liệu trùng sau khi chạy lại migration/seed.

