with review_content(source_key, translation, explanation) as (
  values
    ('grammar-101', 'Andrew đã xoay xở để được thăng chức.', 'Dùng cấu trúc manage + to + động từ để nói ai đó xoay xở hoặc thành công làm được việc khó. Vì vậy chọn “to get”.'),
    ('grammar-102', 'Tôi muốn ở lại với anh họ vào cuối tuần hơn.', 'Sau would rather dùng động từ nguyên mẫu không có to. “I’d rather stay” là cấu trúc đúng.'),
    ('grammar-103', 'Họ đề nghị đưa bọn trẻ đến bể cá mới.', 'Suggest theo sau bởi danh từ hoặc động từ thêm -ing; không dùng suggest + to-infinitive. Vì vậy chọn “taking”.'),
    ('grammar-104', 'Đừng quên tắt máy tính khi hoàn thành.', 'Forget + to-infinitive nghĩa là nhớ phải làm một việc. “to turn off” nói về hành động cần thực hiện sau khi xong việc.'),
    ('grammar-105', 'Tôi xin lỗi, nhưng tối nay tôi thực sự không muốn gặp họ.', 'Feel like luôn đi với danh từ hoặc động từ thêm -ing. Chọn “seeing”, không dùng động từ nguyên mẫu.'),
    ('grammar-106', 'Charles đã không đem xe đi rửa trong hai tháng.', 'Cấu trúc have something done diễn tả thuê/nhờ người khác làm. Hiện tại hoàn thành phủ định “hasn’t had” phù hợp với khoảng thời gian “for two months”.'),
    ('grammar-107', 'Tôi có thể nhờ gửi nó bằng fax được không?', 'Have something done có thể diễn tả nhờ người khác thực hiện. “have it sent” nghĩa là nhờ ai gửi nó.'),
    ('grammar-108', 'Lẽ ra bạn nên kiểm tra báo cáo hai lần.', 'Should have + quá khứ phân từ diễn tả một việc lẽ ra nên làm trong quá khứ nhưng đã không làm.'),
    ('grammar-109', 'Đến giờ này chắc hẳn họ đã trở về từ trung tâm mua sắm.', 'Must have + quá khứ phân từ dùng để suy đoán chắc chắn về quá khứ. Dấu hiệu “by now” cho thấy người nói suy luận ở thời điểm hiện tại.'),
    ('grammar-110', 'Tôi không chắc, nhưng tôi nghĩ có thể anh ấy đã dùng cốc cà phê của bạn.', 'May have + quá khứ phân từ diễn tả khả năng có thể đã xảy ra trong quá khứ, mức độ chắc chắn thấp hơn must have.'),
    ('grammar-111', 'Tôi đang nấu ăn và nói chuyện điện thoại cùng lúc.', 'Cụm cố định “at the same time” nghĩa là “cùng lúc”, phù hợp với hai hành động đang diễn ra đồng thời.'),
    ('grammar-112', 'Họ đang học vào lúc này.', 'Cụm “at the moment” nghĩa là “ngay lúc này”, thường đi với hiện tại tiếp diễn để chỉ hành động đang xảy ra.'),
    ('grammar-113', 'Năm sáu tuổi, anh ấy muốn trở thành phi hành gia.', 'Cụm cố định là “at the age of + số tuổi”. Câu đầy đủ: “At the age of six …”.'),
    ('grammar-114', 'Hiệu trưởng bảo họ vào lớp ngay lập tức.', 'Cụm “at once” nghĩa là “ngay lập tức”. Đây là trạng ngữ phù hợp để bổ nghĩa cho mệnh lệnh “go to their classroom”.'),
    ('grammar-115', 'Tôi thực sự xin lỗi, nhưng tôi hoàn toàn không biết mẹ bạn bị ốm nặng như vậy.', 'Cụm “not have the slightest idea” nghĩa là hoàn toàn không biết. Nó mạnh hơn “not have an idea”.'),
    ('grammar-116', 'Tổng biên tập đã xem qua toàn bộ tạp chí trước khi in.', 'Cụm “have a look at” nghĩa là xem/nhìn qua. Sau have cần một danh từ, nên “a look” là đáp án đúng.'),
    ('grammar-117', 'Tôi chắc rằng anh ấy không hề có ý định bỏ bạn lại đây một mình.', 'Cụm “have no intention of + V-ing” nghĩa là không có ý định làm việc gì. Vì vậy dùng “no intention of”.'),
    ('grammar-118', 'Thật không may, sáng hôm qua họ đã cãi vã to với người giám sát.', 'Cụm “have an argument with someone” nghĩa là cãi nhau với ai. Danh từ “argument” cần giới từ “with”.'),
    ('grammar-119', 'Gregory không bao giờ chú ý đến những điều mẹ cậu ấy nói.', 'Cụm “pay attention to” nghĩa là chú ý đến. Sau “never” dùng động từ nguyên mẫu “pays” theo chủ ngữ số ít Gregory.'),
    ('grammar-120', 'Giáo viên của Mona đã làm cô ấy nản lòng không tham gia kỳ thi.', 'Discourage someone from + V-ing nghĩa là làm ai nản lòng/ngăn ai làm việc gì. “from taking” hoàn chỉnh cấu trúc này.')
)
update public.practice_questions question
set translation = review_content.translation,
    explanation = review_content.explanation
from review_content
where question.source_key = review_content.source_key;
