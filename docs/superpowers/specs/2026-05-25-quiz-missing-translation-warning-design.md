# Thiet Ke Canh Bao Tu Chua Co Ban Dich Khi Kiem Tra

**Ngay:** 2026-05-25
**Trang thai:** Da duoc duyet

## Van De

Mot deck co the hien `20 tu` trong danh sach bo the nhung trang `/app/quiz`
chi bao `19 tu san sang kiem tra`. Hai con so dang do hai dieu khac nhau:

- Danh sach deck dem moi lien ket `deck_terms`.
- Quiz chi cho phep cac tu dang hoat dong co `translation` khong rong.

Du lieu hien tai xac nhan bon bai hoc co dung mot tu chua co ban dich:

| Bai hoc | Tu chua co ban dich | Ban dich da xac nhan |
| --- | --- | --- |
| `Bai hoc 01` | `be known for` | `nổi tiếng vì` |
| `Bai hoc 02` | `be related to` | `liên quan đến` |
| `Bai hoc 03` | `adv` | `trạng từ` |
| `Bai hoc 05` | `prep` | `giới từ` |

## Muc Tieu

- Sua bon muc du lieu dang thieu ban dich de cac bai hoc hien tai co the kiem
  tra du so tu, neu cac muc van con trong tai thoi diem cap nhat.
- Khi mot nguon quiz co mot so tu khong co ban dich, giai thich ro vi sao so
  tu san sang thap hon tong so tu trong deck.
- Cho nguoi hoc mo trang sua cua tung tu thieu ban dich ngay tu trang setup
  quiz.

## Khong Thuoc Pham Vi

- Khong thay doi cach deck dem so tu.
- Khong cho phep tu chua co ban dich di vao phien quiz.
- Khong chan nguoi dung tao deck hoac hoc flashcard tu mot deck con thieu ban
  dich.
- Khong them canh bao vao trang chi tiet deck trong thay doi nay.
- Khong tu dong suy dien hoac cap nhat ban dich nao khac ngoai bon muc da duoc
  nguoi dung xac nhan.

## Sua Du Lieu Mot Lan

Cap nhat `public.user_terms.translation` cho bon ID da xac dinh trong qua
trinh dieu tra. Moi ban ghi chi duoc cap nhat neu `translation` tai thoi diem
chay van la `null` hoac chuoi trong sau khi `trim()`.

Dieu kien nay tranh ghi de ban dich ma nguoi dung co the vua nhap trong luc
trien khai. Sau cap nhat, truy van lai cac deck `Bai hoc 01` den `Bai hoc 05`
de xac nhan:

- So lien ket deck khong thay doi.
- `Bai hoc 01`, `02`, `03` va `05` co `quiz_ready_terms = 20`.
- Khong con muc chua co ban dich trong nam bai hoc.

`Bai hoc 04` khong can cap nhat vi da co `20/20` tu dung duoc cho quiz.

## Trai Nghiem Trang Thiet Lap Quiz

`QuizSetupPage` tiep tuc tao `sourceVocabulary` tu nguon dang chon va
`availableVocabulary` tu cac muc co ban dich hop le. Trang bo sung danh sach:

- `missingTranslationVocabulary`: cac muc dang hoat dong nam trong
  `sourceVocabulary` nhung khong dat `hasTranslation()`.

Khi co it nhat mot tu dung duoc va khong co tu bi loai, giao dien giu thong
bao san sang hien tai.

Khi co it nhat mot tu dung duoc nhung van co tu thieu ban dich, khu vuc trang
thai hien:

- So luong theo dinh dang `19/20 tu san sang kiem tra`.
- Loi giai thich `1 tu chua co ban dich se khong xuat hien trong bai kiem tra.`
- Danh sach cac `source_text` dang thieu ban dich.
- Moi muc co hanh dong `Bo sung ban dich` mo
  `/app/vocabulary/:id/edit`.

Nguoi hoc van co the bat dau quiz voi cac tu hop le. Link sua dung route sua
tu hien co; khong can service API moi va khong can modal moi.

Khi moi tu trong nguon deu thieu ban dich, trang giu empty/error state dang
co de chan bat dau quiz. Khong can hien danh sach sua trong trang thai nay,
vi thay doi nay tap trung vao viec giai thich chenh lech mot phan ma nguoi
dung vua gap.

## Luong Du Lieu Va Trang Thai

1. Nguoi dung chon deck o `/app/quiz`.
2. Query hien co tai cac tu thuoc deck va loai cac tu da xoa.
3. Trang tach cac tu co ban dich khoi cac tu thieu ban dich.
4. Neu danh sach thieu khong rong nhung quiz van co the bat dau, trang hien
   canh bao kem link sua.
5. Sau khi nguoi dung sua ban dich va quay lai/tai lai setup quiz, query hien
   co tinh lai so tu dung duoc; canh bao bien mat khi khong con tu thieu.

## I18n Va Giao Dien

Them chuoi tieng Viet va tieng Anh cho:

- Mau dem san sang mot phan (`{available}/{total}`).
- Thong bao bo qua tu chua co ban dich.
- Hanh dong mo trang bo sung ban dich.

Canh bao dung kieu card/status phu hop giao dien neobrutalist hien co va
khong thay doi CTA `Bat dau kiem tra`.

## Loi Va Truong Hop Bien

- Tu bi xoa van tiep tuc bi loai truoc khi xet ban dich va khong duoc bao nhu
  mot muc can sua.
- Mot ban dich chi gom khoang trang duoc xem nhu chua co ban dich, dong nhat
  voi quy tac quiz hien tai.
- Neu cap nhat du lieu mot lan khong cap nhat ban ghi nao vi nguoi dung da
  sua truoc, viec nay duoc coi la an toan; truy van xac minh moi la ket qua
  quyet dinh.
- Loi tai danh sach tu giu trang thai loi hien tai va khong hien canh bao
  khong day du.

## Kiem Thu Va Xac Minh

### Tu Dong

- Test `QuizSetupPage` voi mot deck co mot tu co ban dich va mot tu trong:
  hien `1/2`, thong bao bo qua, tu bi thieu va link sua dung ID.
- Test khi tat ca tu co ban dich: hien thong bao san sang binh thuong va
  khong hien canh bao.
- Giu test hien co rang mot nguon khong co tu nao co ban dich thi khong the
  bat dau quiz.

### Du Lieu

- Chay cap nhat co dieu kien cho bon ID da xac nhan.
- Chay lai truy van dem `linked_terms`, `quiz_ready_terms` va
  `untranslated_terms` cho nam bai hoc.

### Giao Dien

- Mo `/app/quiz`, chon mot deck con thieu ban dich trong du lieu thu nghiem
  va xac nhan canh bao/link sua hien dung.
- Sau khi bo sung ban dich, quay lai setup va xac nhan deck hien du so tu
  san sang.

## Tieu Chi Chap Nhan

- Du lieu bon muc da xac nhan duoc bo sung ban dich ma khong ghi de ban dich
  da ton tai.
- Trang setup quiz giai thich ro khi mot deck chi dung duoc mot phan so tu.
- Tu thieu ban dich co link truc tiep den trang sua tu.
- Quiz van bat dau voi cac tu hop le va van chan nguon khong co tu hop le.
- Test UI lien quan dat va truy van xac minh du lieu tra ve ket qua mong doi.
