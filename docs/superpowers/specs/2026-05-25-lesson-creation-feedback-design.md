# Thiet Ke Thong Bao Sau Khi Tao Bai Hoc

**Ngay:** 2026-05-25
**Trang thai:** Da duoc duyet

## Muc Tieu

Sau khi tao bai hoc tu Kho tu vung, nguoi dung khong can duoc dan truc tiep toi bai hoc dau tien cua lo. Trang `/app/vocabulary` can thong bao ket qua va cho hai lua chon ro rang:

- `Xem bo the` de chuyen sang danh sach deck tai `/app/decks`.
- `Dong` de an thong bao va tiep tuc lam viec trong Kho tu vung.

## Pham Vi

- Thay link `Mo Bai hoc NN` trong card ket qua bang link `Xem bo the` toi `/app/decks`.
- Them nut `Dong` tren card ket qua de xoa feedback khoi giao dien.
- Ap dung cho ca tao thanh cong toan bo va tao thanh cong mot phan.
- Neu khong tao duoc bai hoc nao, giu cach bao loi va tap chon hien tai; khong hien link chuyen sang deck.

Khong thay doi:

- Quy tac tron/chia tu va dat ten `Bai hoc NN`.
- Du lieu duoc ghi trong `decks` / `deck_terms`.
- Luong hoc va CTA `Kiem tra bai nay` sau khi hoan thanh mot deck.

## Giao Dien Va Luong Du Lieu

`VocabularyListPage` tiep tuc luu ket qua batch trong `lessonFeedback`. Khi co it nhat mot deck tao thanh cong, card feedback hien:

- Thong bao `Da tao {count} bai hoc.` neu batch thanh cong.
- Thong bao `Da tao {count} bai hoc, nhung lo tao chua hoan tat.` neu batch chi thanh cong mot phan.
- Nut chinh `Xem bo the`, dieu huong den `/app/decks`.
- Nut phu `Dong`, dat `lessonFeedback` ve `null` ma khong anh huong deck da tao hay selection con lai.

Card khong hien ten hoac link den deck dau tien nua. Batch result van co the giu `createdDecks` de xac dinh co ket qua thanh cong va bao so luong; khong can them service API.

## Loi Va Trang Thai Bien

- Tao thanh cong mot phan van hien card voi `Xem bo the`, vi nguoi dung can kiem tra cac deck da tao xong.
- Tao that bai hoan toan tiep tuc hien loi trong modal va giu selection de thu lai.
- Dong card chi an feedback tai client; khong xoa deck va khong reset query.
- Tao mot batch moi se thay feedback cu bang feedback moi.

## Kiem Thu

Cap nhat test cua `VocabularyListPage` de xac nhan:

- Tao thanh cong hien link `Xem bo the` co `href="/app/decks"`.
- Khong con link `Mo Bai hoc NN` trong feedback.
- Bam `Dong` lam card feedback bien mat.
- Tao thanh cong mot phan van co link den danh sach deck.
- Truong hop tao that bai hoan toan khong hien link danh sach deck.

## Tieu Chi Chap Nhan

- Sau khi xac nhan tao thanh cong, nguoi dung van o `/app/vocabulary` cho den khi tu bam `Xem bo the`.
- Link chuyen trang tren feedback luon dan den `/app/decks`, khong dan den deck dau tien.
- Nguoi dung co the dong thong bao thanh cong/partial ma khong thay doi cac bai hoc da tao.
- Cac test UI lien quan den tao bai hoc duoc cap nhat va dat.
