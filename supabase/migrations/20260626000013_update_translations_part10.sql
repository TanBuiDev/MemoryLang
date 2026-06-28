UPDATE global_terms AS gt
SET translation = src.translation
FROM (VALUES
('become available', 'có sẵn, rảnh, trở nên có sẵn'),
('security', 'an ninh, bảo vệ, bảo mật, nơi an ninh, sự bảo toàn, tiền bảo chứng, trạng thái an toàn'),
('securely', '(một cách) đảm bảo, một cách an toàn, an toàn'),
('schedule', 'lập kế hoạch, (n) kế hoạch, lên kế hoạch, lịch trình, sắp xếp, kế hoạch, bản kê khai, danh biểu, phân hạng đánh thuế, điều lệ, phụ lục, thời khắc biểu, văn kiện, ghi vào danh biểu, ghi vào thời khắc biểu'),
('purchase', 'mua hàng, (n) việc mua hàng, mua, sự mua, kéo neo, tậu, sắm, chổ dựa vào, điểm tựa, sắm được, sức cơ khí, tậu được, tậu sắm, tiền mướn, tiền thuê, vật mua được'),
('purchases', 'hàng hóa (được mua), mua hàng, sự mua, mua, kéo neo, tậu, sắm, chổ dựa vào, điểm tựa, sắm được, sức cơ khí, tậu được, tậu sắm, tiền mướn, tiền thuê, vật mua được'),
('satisfaction', 'sự hài lòng, sự thỏa mãn, sự làm cho thỏa thích, sự làm tròn, sự tạ lổi, sự trả nợ, sự vui lòng'),
('due to + N', 'bởi vì (= owing to), bởi vì = owing to, do + N'),
('interest rate', 'lãi xuất, lãi suất'),
('apple', 'táo, quả táo, con ngươi, trái táo, mối bất hòa, mối phân tranh, trái bơm')
) AS src(source_text, translation)
WHERE gt.source_text = src.source_text
  AND (gt.translation IS NULL OR gt.translation != src.translation);