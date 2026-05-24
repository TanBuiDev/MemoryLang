# Thiet Ke Kiem Tra Nhap Ban Dich

**Ngay:** 2026-05-24  
**Trang thai:** Thiet ke da duoc duyet

## Tong Quan

Thay trai nghiem kiem tra `Dung / Sai` dang hien thi tren giao dien bang mot che do kiem tra go ban dich. Nguoi hoc chon toan bo tu vung hoac mot bo the, chon so cau ngau nhien, sau do nhin tu/cum tu goc kem IPA va tu loai neu co de tu nhap ban dich.

Ban dau tap trung vao kha nang tu nho lai dap an va hoan thanh mot bai kiem tra gon nhe. Ket qua cuoi bai chi hien thi diem so `so cau dung / tong so cau`; chua them luu lich su moi, thong ke chi tiet, hoac tac dong den lich on SRS.

## Bo Canh Hien Tai

- Trang `/app/quiz` hien cho chon toan bo tu vung hoac mot bo the, cung so cau `5`, `10`, hoac `Tat ca`.
- Phien quiz hien tai chi tao cau hoi `true_false`, dua tren `meanings[0].text`, va luu vi tri/diem tam thoi bang `sessionStorage`.
- Kieu du lieu da du tru `fill_blank`, nhung chua co luong UI hoac generator cho viec go ban dich.
- Co `quizService.saveResult()` va hai bang `quiz_results`/`quiz_answers`, nhung trang phien hien tai chua goi luu ket qua khi hoan thanh.

## Muc Tieu

- Trang Kiem tra chi dua nguoi hoc vao luong nhap ban dich, khong con lua chon `Dung / Sai` tren giao dien.
- Tai su dung chon nguon tu vung hien co: tat ca tu hoac mot bo the.
- Tai su dung lua chon so cau hien co: `5`, `10`, hoac `Tat ca`, voi thu tu ngau nhien.
- Moi cau chi hien thi noi dung khong lo nghia: `source_text`, IPA va tu loai neu co.
- Cham dap an theo cach khop gan dung, de chap nhan sai khac trinh bay nho ma khong qua de dai.
- Khi tra loi sai, cho thu lai va chi hien dap an khi nguoi hoc chu dong bam xem.
- Neu da xem dap an, buoc nguoi hoc go lai dap an dung de tiep tuc, nhung cau do khong duoc cong diem.
- Phan biet ro truong hop khong co tu de kiem tra voi truong hop he thong khong tai duoc tu vung.
- Khi hoan thanh, hien diem toi gian va cho phep lam bai moi.

## Khong Thuoc Pham Vi Ban Dau

- Luu ket qua che do moi vao Supabase hoac dua vao dashboard statistics.
- Cap nhat trang thai tu vung, so lan dung/sai, hoac lich on SRS tu ket qua kiem tra.
- Luu danh sach tu lam sai de on lai sau.
- Cho phep mot tu co nhieu ban dich thay the duoc cau hinh rieng.
- Goi y tung ky tu, dien chu, noi dap an, hoac cac loai quiz khac.
- Xoa schema, du lieu, hoac ma nguon `true_false` cu o tang ky thuat.

## Quyet Dinh Kien Truc

### Phuong An Duoc Chon

Thay giao dien quiz hien tai bang che do nhap ban dich, nhung giu tuong thich ky thuat voi quiz `true_false` cu trong giai doan dau.

- Bo chon loai quiz tren trang setup vi nguoi dung chi nhin thay mot che do.
- Them gia tri quiz moi `translation_input`, thay vi dung ten `fill_blank`: bai nay yeu cau dich nghia, khong phai dien cho trong trong cau.
- Them kieu cau hoi, generator va trang thai phien phu hop voi input dang text.
- Giu code/type cu can thiet de khong ep migration du lieu lich su hoac xoa test khong lien quan trong cung lan thay doi.

### Ly Do

Lua chon nay dat dung trai nghiem mong muon tren UI trong khi giam rui ro cua mot dot xoa toan bo logic cu. Viec luu ket qua va nang cap schema co the duoc thiet ke rieng khi san pham quyet dinh quiz moi co tham gia vao statistics hay SRS khong.

## Trai Nghiem Nguoi Dung

### 1. Thiet Lap Bai Kiem Tra

Trang setup hien cac tuy chon:

| Tuy chon | Gia tri |
| --- | --- |
| Nguon tu | `Tat ca tu vung` hoac mot bo the cu the |
| So cau | `5`, `10`, `Tat ca` |

Thay doi giao dien:

- Bo truong `Loai kiem tra` vi khong con lua chon tren UI.
- Mo ta trang noi ro nguoi dung se nhap ban dich cua tu/cum tu.
- Nut bat dau chi khoi tao phien khi nguon du lieu da san sang nhu hien tai.

Nguon cau hoi hop le:

- Chi lay tu vung dang hoat dong theo bo loc hien hanh.
- Chi lay item co `translation` sau khi `trim()` khong rong.
- Neu bo the/toan bo tu khong co tu hop le, hien empty state giai thich can them ban dich truoc khi kiem tra.
- Neu so tu hop le it hon muc `5` hoac `10`, tao bai voi tat ca tu hop le thay vi chan nguoi dung.

### 1.1. Trang Thai Tai Du Lieu Va Loi

Trang setup nen tai danh sach tu dung duoc cua nguon dang chon truoc khi bat dau, de nguoi dung khong bi dua vao mot phien rong. Trang session van phai bao ve lai cung cac trang thai neu nguon thay doi hoac request that bai sau khi dieu huong.

| Trang thai | Khi nao xay ra | Hien thi | Hanh dong |
| --- | --- | --- | --- |
| Dang tai | Dang lay tu vung hoac cac tu trong bo the | `Dang tai tu vung...` | Vo hieu hoa `Bat dau kiem tra` |
| Khong co tu vung | Nguon khong co item dang hoat dong | `Chua co tu vung de kiem tra` | Link/nut sang trang them tu vung |
| Khong co ban dich hop le | Co item nhung khong item nao co `translation` khong rong | `Chua co tu vung co ban dich de kiem tra` | Link/nut sang trang tu vung de bo sung ban dich |
| Tai that bai | Query danh sach tu vung hoac deck terms tra loi loi | `Khong lay duoc tu vung. Vui long thu lai.` | Nut `Thu lai` goi lai query |
| San sang | Co it nhat mot item co ban dich | Hien so cau san sang | Cho phep bat dau |

Loi tai du lieu khong duoc hien bang empty state `Chua co tu vung`, vi hai truong hop dan toi hanh dong khac nhau: du lieu rong can them/sua tu, con request loi can thu lai.

### 2. The Cau Hoi

Moi the hien:

- So cau hien tai va tien do.
- `source_text` lam noi dung chinh.
- `ipa` neu ton tai.
- `part_of_speech` neu ton tai.
- O nhap ban dich va hanh dong `Kiem tra`.

Moi the khong hien:

- `translation` truoc khi nguoi hoc mo dap an.
- `meanings`, cau vi du, ghi chu, hinh anh, hoac cac tu lien quan.

Nguoi dung co the gui dap an bang nut `Kiem tra` hoac phim `Enter` khi focus nam trong o nhap mot dong.

### 3. Tra Loi Dung

Neu dap an khop gan dung va cau chua tung mo dap an:

- Danh dau cau dat diem.
- Tang diem hien tai.
- Chuyen sang the tiep theo ngay.

Neu dap an khop sau khi cau da mo dap an:

- Cho chuyen sang the tiep theo.
- Khong tang diem, vi nguoi hoc da dung goi y.

### 4. Tra Loi Sai Va Xem Dap An

Sau mot lan nhap sai:

- Giu nguyen the hien tai.
- Hien thong bao ngan rang dap an chua dung.
- Giu noi dung vua nhap va dua focus lai o nhap de nguoi hoc sua nhanh.
- Hien hanh dong `Xem dap an`.

Khi bam `Xem dap an`:

- Hien `translation` da luu.
- Danh dau cau la `revealed` va khong con co the dat diem.
- Van yeu cau nguoi hoc nhap mot dap an khop gan dung truoc khi sang cau moi.

Nguoi hoc co the sai nhieu lan ma khong xem dap an; neu tu nhap dung truoc khi bam `Xem dap an`, cau van dat diem.

### 5. Ket Qua

Sau khi dap an cuoi cung duoc hoan tat:

- Xoa snapshot phien dang lam nhu luong quiz hien tai.
- Dieu huong den trang ket qua.
- Hien `Diem: X/Y`.
- Hien nut `Lam bai moi` quay lai trang setup.

Ban dau trang ket qua chi hien tile diem `X/Y` va hanh dong `Lam bai moi`; khong hien ti le chinh xac, so cau sai, danh sach cau sai, hay luu DB.

### 6. Khoi Phuc Loi Trong Phien

Neu trang session khong tai duoc nguon tu vung truoc khi tao snapshot:

- Khong tao snapshot rong.
- Hien thong bao `Khong lay duoc tu vung. Vui long thu lai.` va nut `Thu lai`.
- Nut `Thu lai` refetch dung nguon hien tai: toan bo tu vung hoac bo the da chon.
- Neu retry thanh cong, tao de mot lan va bat dau tu cau dau.

Neu trang session tai thanh cong nhung nguon khong co cau hop le, hien empty state phu hop va nut quay ve setup/quan ly tu vung; khong hien thong bao loi mang.

## Cham Khop Gan Dung

### Muc Dich

Nguoi hoc khong nen bi tru diem vi khac chu hoa, thua khoang trang, hoac dau cau khong anh huong den nghia. Tuy nhien, he thong khong duoc xem mot dap an khac nghia la dung chi vi no gan giong ve ky tu.

### Chuan Hoa Co Ban

Truoc khi so sanh, dap an nhap va `translation` duoc chuan hoa theo cung quy tac:

1. `trim()` hai dau.
2. Chuyen ve chu thuong.
3. Chuan hoa Unicode bang `String.prototype.normalize('NFC')`.
4. Thay chuoi khoang trang lien tiep bang mot khoang trang.
5. Bo dau cau o ranh gio hoac dau cau trinh bay thong thuong nhu `.`, `,`, `!`, `?`, `;`, `:`.

Mac dinh nen **giu dau thanh tieng Viet**. Vi du `ma`, `má`, va `mà` co the khac nghia; bo toan bo dau se tao nhieu truong hop dung gia.

### Sai Khac Nho

Sau chuan hoa, chap nhan dap an neu:

- Hai chuoi bang nhau; hoac
- Chuoi dap an chuan co it nhat `8` ky tu va khoang cach Levenshtein giua hai chuoi khong qua `1`.

Dap an chuan co it hon `8` ky tu phai khop chinh xac sau chuan hoa. Nguong nay cho phep mot loi go don le trong cum dich dai, nhung tranh bien loi mot ky tu thanh dap an dung voi cac tu ngan.

Ranh gio cu the can duoc khoa bang test truoc khi code:

| Truong hop | Ket qua mong muon |
| --- | --- |
| `Qua chuoi` so voi `qua chuoi` | Dung |
| `  qua   chuoi ` so voi `qua chuoi` | Dung |
| `qua chuoi!` so voi `qua chuoi` | Dung |
| Loi danh may mot ky tu trong ban dich tu 8 ky tu tro len | Dung neu khoang cach Levenshtein la `1` |
| Loi danh may mot ky tu trong ban dich ngan hon 8 ky tu | Sai |
| Khac dau thanh tieng Viet lam doi tu | Sai |
| Mot tu ngan sai mot ky tu | Sai, tranh chap nhan qua rong |

### Gioi Han Ngon Ngu

Model du lieu hien chi co mot `translation` chinh cho moi tu. Do do, cau tra loi dong nghia nhung khong trung ban dich luu san co the bi danh dau sai. Day la gioi han duoc chap nhan trong ban dau; no can duoc truyen dat ro trong UI hoac duoc xu ly boi tinh nang nhieu dap an hop le o ban sau.

## Mo Hinh Du Lieu Va Trang Thai Phien

### Loai Cau Hoi Moi

Can co cau hoi nhap dich rieng biet, co cac du lieu toi thieu:

| Truong | Muc dich |
| --- | --- |
| `id` | Dinh danh cau trong phien |
| `userTermId` | Tham chieu tu vung nguon |
| `sourceText` | Noi dung hien tren the |
| `ipa` | Goi y phat am tuy chon |
| `partOfSpeech` | Goi y loai tu tuy chon |
| `expectedTranslation` | Dap an de cham va hien khi mo dap an |

### Snapshot Phien

Snapshot can dong bang danh sach cau ngau nhien ngay khi bat dau de reload khong lam thay doi de. Ngoai `questions`, `index`, va `score`, phien nhap dich can luu:

| Truong | Muc dich |
| --- | --- |
| `revealedQuestionIds` | Cau da xem dap an, khong con duoc diem |
| `completedQuestionIds` | Cau da nhap dung va da hoan tat |
| Khong luu `draftAnswer` | Reload xoa noi dung dang go, nhung van giu diem va co `revealed` |

Ban trien khai nen tang version payload hoac co reader tuong thich nguoc. Mot snapshot `true_false` cu khong duoc parse nhu phien nhap dich.

### Luong Trang Thai Mot Cau

| Trang thai | Dieu kien | Hanh dong tiep theo |
| --- | --- | --- |
| `unanswered` | Chua gui dap an | Cho nhap va kiem tra |
| `incorrect` | Da gui sai, chua mo dap an | Bao sai; cho nhap lai hoac xem dap an |
| `revealed` | Da bam xem dap an | Hien dap an; cho nhap lai; khong the cong diem |
| `completed-scored` | Nhap dung ma chua xem dap an | Tang diem va chuyen tiep |
| `completed-unscored` | Nhap dung sau khi xem dap an | Khong tang diem va chuyen tiep |

## Luong Du Lieu

1. Setup ghi lua chon bo the va so cau vao state hien co, dat loai phien la `translation_input`, va xoa snapshot cu cung khoa khi bat dau bai moi.
2. Trang session lay tu remote hoac demo theo co che dual-mode hien tai.
3. Generator loc cac tu co `translation`, tron thu tu, cat theo so cau, va tao danh sach cau hoi nhap dich.
4. Session ghi danh sach cau hoi cung index/score/trang thai goi y vao `sessionStorage`.
5. Khi nguoi dung gui dap an, ham cham so sanh dap an da chuan hoa voi `expectedTranslation`.
6. Neu dung, session cong diem chi khi cau chua `revealed`, cap nhat snapshot va chuyen cau.
7. Neu sai, session giu index; nguoi dung co the thu lai hoac mo dap an.
8. Khi cau cuoi hoan tat, session xoa snapshot va mo trang ket qua toi gian.

## Kho Khan Va Rui Ro Trien Khai

### 1. Do Chinh Xac Cua Khop Gan Dung

Kho nhat la can bang giua de chiu va dung nghia. Quy tac da chon chi cho phep Levenshtein `1` neu dap an chuan co it nhat `8` ky tu; cac dap an ngan phai khop chinh xac sau chuan hoa. Ham cham can la tien ich thuan (pure utility) va co tap test tieng Viet cu the truoc khi noi vao UI.

### 2. Nhieu Cach Dich Dung

Nguoi hoc co the nho dung nghia nhung dung tu dong nghia khac voi `translation` da luu. Vi data chua ho tro aliases/accepted answers, MVP chi cham theo mot dap an chinh. Ve sau co the mo rong du lieu bang danh sach dap an chap nhan duoc hoac cho tu cham sau khi xem ket qua.

### 3. Tu Vung Thieu Ban Dich

Quiz dung/sai cu dua vao `meanings`, con che do moi phu thuoc `translation`. Viec tai su dung bo the co the tao bai rong du da co tu. Empty state va so cau thuc te phai dua tren tap tu duoc phep thi, khong dua tren tong so tu trong bo.

### 4. Phan Biet Rong Va Loi Tai Du Lieu

UI hien tai co the roi vao thong bao chung `Chua co tu vung` khi khong sinh duoc cau hoi. Che do moi can kiem tra ket qua query truoc ket qua generator: request bi loi phai hien `Khong lay duoc tu vung` va cho retry, con request thanh cong nhung rong/khong co ban dich moi hien trang thai huong dan them du lieu.

### 5. Phuc Hoi Sau Reload

Trang thai `revealed` anh huong truc tiep den diem. Neu reload lam mat co nay, nguoi dung co the mo dap an roi nhan diem bang cach tai lai trang. Snapshot phien phai luu co goi y va diem sau moi bien doi quan trong.

### 6. Tuong Thich Voi Quiz Cu

UI se thay doi hoan toan, nhung types, test, noi dung landing page va persistence dang gan voi `true_false`. Xoa sach trong cung dot co the tang pham vi khong can thiet. Ban dau nen an luong cu tren UI, bo sung loai moi ro rang, va chi don dep cu khi co yeu cau san pham rieng.

### 7. Thong Ke Va Luu Ket Qua

Bang ket qua hien co ton tai, nhung UI hien tai chua luu phien quiz. Neu che do moi tu dong goi luu DB trong khi ket qua san pham van toi gian, dashboard se thay doi hanh vi ngoai pham vi. Ban dau khong ghi DB; viec tich hop statistics can mot spec rieng.

## Thay Doi Du Kien Khi Trien Khai

### UI Va Dieu Huong

- `src/pages/quiz/QuizSetupPage.tsx`: bo chon loai, doi noi dung gioi thieu, va kiem tra nguon dang chon de vo hieu hoa bat dau khi rong/loi.
- `src/pages/quiz/QuizSessionPage.tsx`: thay nut dung/sai bang o nhap, feedback, goi y, retry loi tai va luong cham.
- `src/pages/quiz/QuizResultPage.tsx`: thu gon cam ket thong tin ket qua.
- `src/i18n/index.ts`: cap nhat noi dung quiz va cac thong diep moi; cap nhat landing page khong con quang ba dung/sai.

### Domain Va Persistence

- `src/types/quiz.types.ts`: them `translation_input` va kieu cau hoi nhap dich.
- `src/stores/useQuizStore.ts`: dat loai phien mac dinh thanh `translation_input`; giu setter hien co de han che don dep ngoai pham vi.
- `src/features/quiz/`: them generator va tien ich cham dap an; mo rong persistence cho shape phien moi.
- Giu `trueFalseQuiz.ts` trong MVP dau neu van can tuong thich/test cu.

### Test

- Them unit test cho normalization va khop gan dung.
- Them unit test cho generator: loc thieu ban dich, ngau nhien/gioi han so cau.
- Cap nhat test setup va session cho luong nhap, thu lai, mo dap an, diem va restore snapshot.
- Them test UI phan biet nguon rong, nguon thieu ban dich va query tai that bai co nut retry.
- Kiem tra song ngu cho thong diep UI moi neu cac test hien co bao phu.

## Chien Luoc Kiem Thu

### Cham Dap An

- Chap nhan chu hoa/thuong, khoang trang va dau cau trinh bay.
- Khong bo dau thanh tieng Viet theo mac dinh.
- Chap nhan loi go mot ky tu chi voi dap an chuan tu `8` ky tu tro len; tu choi loi nay voi dap an ngan hon.
- Khong chap nhan dap an rong.

### Tao De

- Chi tao cau hoi tu item co ban dich khong rong.
- Chon dung deck hoac tat ca tu vung.
- Cat dung so cau khi du nguon; dung toan bo cau dung duoc khi nguon it hon gioi han.
- Danh sach cau khong doi sau reload.

### Loi Tai Va Empty State

- Setup vo hieu hoa bat dau trong khi dang tai hoac khi query that bai.
- Query that bai hien thong bao khong lay duoc tu vung va nut `Thu lai`, khong hien nhu du lieu rong.
- Nguon khong co item hien thong bao chua co tu vung de kiem tra.
- Nguon co item nhung khong co `translation` hien thong bao can bo sung ban dich.
- Retry thanh cong tu session tao de va hien cau hoi dau tien.

### Tuong Tac Phien

- Dung truoc khi xem dap an cong diem va chuyen cau.
- Sai khong chuyen cau va mo ra hanh dong xem dap an.
- Sai roi tu sua dung ma khong xem dap an van cong diem.
- Xem dap an lam mat diem cua cau, ke ca sau khi go lai dung.
- Reload sau khi xem dap an van giu trang thai khong dat diem.
- Hoan tat cau cuoi dieu huong den ket qua dung diem.

### Hoi Quy

- Chon bo the va so cau van hoat dong trong demo va remote mode.
- Empty state ro rang neu khong co ban dich hop le.
- Ma/du lieu `true_false` cu khong gay loi build trong luc no khong con xuat hien tren UI.

## Tieu Chi Chap Nhan

- Nguoi dung khong con thay lua chon hoac phien kiem tra `Dung / Sai` tren `/app/quiz`.
- Nguoi dung tao duoc bai nhap ban dich tu toan bo tu vung hoac mot bo the voi so cau ngau nhien.
- Trang setup va session phan biet `Chua co tu vung de kiem tra`, `Chua co tu vung co ban dich de kiem tra`, va `Khong lay duoc tu vung`.
- Khi tai tu vung that bai, nguoi dung co the bam `Thu lai` ma khong can roi khoi trang.
- Cau hoi chi lo tu goc, IPA va tu loai neu co.
- Dap an khop gan dung theo quy tac da test duoc chuyen sang cau tiep theo.
- Dap an sai cho phep thu lai va cho phep chu dong xem dap an.
- Cau da xem dap an khong cong diem nhung van can nhap dung de tiep tuc.
- Reload khong doi de, vi tri, diem hoac quyen cong diem cua cau da xem dap an.
- Ket qua ket thuc hien diem `X/Y` va khong phat sinh ghi thong ke moi.

## Phuong An Khac Da Can Nhac

### Xoa Hoan Toan Quiz Dung/Sai

Phuong an nay cho code cuoi cung gon hon, nhung phai don dep moi lien ket voi lich su du lieu, type, persistence, test va noi dung san pham trong cung dot. Khong chon cho MVP vi khong dem lai gia tri nguoi dung bo sung so voi viec an luong cu tren UI.

### Them Nhap Dich Ben Canh Dung/Sai

Phuong an nay bao ton day du chuc nang cu, nhung khong phu hop yeu cau rang trang Kiem tra chi con luong nhap ban dich.

### Tron Vao Phien Hoc Flashcard

Phuong an nay tan dung giao dien the hoc, nhung lam lan lanh gioi giua bai kiem tra tinh diem va phien hoc co SRS. Khong chon de giu logic phien hoc hien tai doc lap.

## Ghi Chu Cho Buoc Lap Ke Hoach

Ke hoach trien khai can viet test cho quy tac khop gan dung da chot truoc khi sua UI. Ke hoach cung can chi ro cach mo rong `sessionPersistence` ma khong lam snapshot quiz cu bi doc nham, va xac nhan rang khong goi `quizService.saveResult()` trong pham vi ban dau.
