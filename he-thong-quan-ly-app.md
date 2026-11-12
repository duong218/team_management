# HỆ THỐNG QUẢN LÝ APP: Quản lý tiến độ công việc nhóm

> **Dành cho mọi AI đọc file này (Claude, Codex, Gemini, Antigravity...):**
> File này là nguồn sự thật duy nhất của dự án. Đọc hết trước khi làm bất cứ việc gì.
> Xem phần **0. Giao thức bàn giao** ngay bên dưới.

---

## 0. Giao thức bàn giao giữa các AI (BẮT BUỘC)

Người dùng dùng nhiều AI với tài khoản free, nên hạn mức (quota) có thể hết bất cứ lúc nào. Quy tắc:

1. **Đầu phiên**: đọc toàn bộ file này, rồi đọc mục **"Trạng thái hiện tại"** (mục 15) để biết đang làm đến đâu.
2. **Sau mỗi bước hoàn thành**: cập nhật mục 15 (việc đã xong, việc đang dở, file liên quan).
3. **Khi sắp hết hạn mức** (hoặc khi người dùng nói "sắp limit", "đổi AI"): AI **phải chủ động nhắc người dùng** và **xuất lại toàn bộ file này** đã cập nhật mục 15 và mục 14 (nhật ký quyết định), để người dùng dán sang AI khác.
4. **Khi người dùng gõ `continue`**: đọc mục 15 và làm tiếp đúng việc đang dở, không hỏi lại những điều đã chốt.
5. **Không bịa đặt**: mọi con số về giới hạn gói free (Vercel, Supabase...) phải được kiểm tra lại trên trang chính thức vì chúng thay đổi theo thời gian. Điều gì chưa chốt thì ghi ở mục 13, đừng tự quyết.
6. Người dùng có ít kinh nghiệm lập trình: giải thích ngắn gọn, ưu tiên giải pháp đơn giản nhất (triết lý "ponytail": ít thứ nhất mà vẫn đúng).

---

## 1. Mục đích

Web app để **nhóm trưởng giao việc và theo dõi tiến độ** của các thành viên trong một nhóm học tập (sau này có thể dùng cho nhóm đi làm).

- Một **công việc** (project) chia thành nhiều **task**. Mỗi task mặc định giao cho **một người**; nhóm trưởng/phó có thể **thêm người hỗ trợ** (2-3 người).
- Người được giao thấy **chi tiết task của mình**. Task của người khác chỉ hiện dạng: *"Task giao cho A, tiến độ 40%, trạng thái X"*.
- Khi công việc xong thì **lưu lại lịch sử** để thống kê *ai đã làm, ai chưa làm, làm những gì* và gửi cho giáo viên.
- Dùng riêng cho nhóm của chủ dự án, **không phải sản phẩm đại chúng**.

Lý do làm riêng: các web quản lý hiện có bị đánh giá là xấu và thiếu trực quan. Giao diện trực quan là một mục tiêu chính.

## 2. Quy mô và giới hạn thiết kế

| Hạng mục | Giá trị |
|---|---|
| Số người dùng | ~10 đến 20 người |
| Số công việc tối đa | **10 công việc đang hoạt động cho mỗi nhóm trưởng** (giả định xấu nhất: 10 môn học cùng làm bài nhóm trong một kỳ) |
| Chi phí | **0 đồng** (toàn bộ dùng gói free) |
| Chạy | 24/7, không được "ngủ" lâu như Render free (~1 phút khởi động) |
| Máy phát triển | Laptop thường, **không chạy được model AI local** |

Quy mô này rất nhỏ so với gói free của các dịch vụ bên dưới, nên không cần tối ưu phức tạp.

## 3. Công nghệ đã chọn

| Phần | Công cụ | Ghi chú |
|---|---|---|
| Giao diện | **React (Vite), JavaScript** | **Đã chốt** (người dùng quen React, Node.js, JavaScript) |
| Hosting giao diện | **Vercel** (gói Hobby) | File tĩnh trên CDN nên không bị "ngủ" |
| Backend, database, đăng nhập | **Supabase** (Postgres + Auth + RLS) | **Đã chốt** (người dùng thử Supabase lần đầu; đã cân nhắc MongoDB Atlas, xem mục 3.1). Không cần tự viết server Node |
| Kéo thả thẻ Kanban | `dnd-kit` | |
| Giữ Supabase không ngủ | Cron nhỏ (GitHub Actions hoặc cron-job.org) | Xem mục 11 |

**Nguyên tắc:** quyền hạn do **database (RLS)** kiểm soát, không dựa vào việc ẩn nút trên giao diện.

### 3.1 Chọn database: Supabase hay MongoDB Atlas (ĐÃ CHỐT: Supabase)

Người dùng quen MongoDB, chưa dùng Supabase. Người dùng ủy quyền AI đề xuất theo hướng tối ưu và miễn phí.

| Tiêu chí | Supabase (Postgres) | MongoDB Atlas + Node.js |
|---|---|---|
| Đăng nhập Google | Có sẵn | Tự viết (Google OAuth + session/JWT) |
| Giấu dữ liệu theo người (`task_details`, mã định danh) | Quy tắc **trong database** (RLS) | Tự viết trong code Node; sai một chỗ là lộ |
| Nhật ký chỉ ghi thêm, không sửa được | Chặn được ở database | Chỉ chặn được bằng code |
| Nhập mã tham gia không vượt giới hạn khi nhiều người cùng lúc | Hàm/transaction trong database | Làm được nhưng phải tự viết kỹ |
| Thống kê (đếm, nhóm, % theo người) | SQL rất hợp | Aggregation làm được, dài hơn |
| Phải có server Node riêng | **Không** (React gọi thẳng Supabase) | **Có** (Vercel serverless hoặc nơi khác; Render free thì bị ngủ ~1 phút) |
| Độ quen thuộc với người dùng | Phải học SQL cơ bản + RLS (AI viết hộ được) | Quen sẵn |
| Gói free (cần kiểm tra lại) | ~500 MB, **tạm dừng sau ~7 ngày không hoạt động** | 512 MB, 100 thao tác/giây, **tạm dừng sau 30 ngày** không có kết nối (tài liệu cũ ghi 60) |
| Sao lưu gói free | Không đảm bảo | Nguồn không thống nhất, coi như **không có** |

**Đã chốt: Supabase.** Người dùng **chưa từng dùng Supabase**, nên AI phải hướng dẫn từng bước và giải thích SQL/RLS ngắn gọn, dễ hiểu. Lý do: yêu cầu cốt lõi của app là *giấu dữ liệu theo người* và *nhật ký không sửa được*. Supabase giải quyết ở tầng database nên ít code hơn và ít chỗ sai hơn, với người ít kinh nghiệm thì đây là điểm quan trọng. Đổi lại phải học SQL cơ bản.

**Chọn MongoDB cũng hợp lý nếu** ưu tiên dùng công nghệ đã quen. Khi đó toàn bộ phân quyền nằm trong code Node, phải test kỹ từng đường API, và cần chỗ chạy server (Vercel serverless là lựa chọn không bị "ngủ" lâu).

Số liệu gói free lấy từ tìm kiếm ngày 12/11/2026, một phần từ nguồn thứ cấp. **Phải kiểm tra lại trang chính thức** của Supabase và MongoDB trước khi triển khai.

## 4. Đăng nhập và hồ sơ người dùng

### 4.1 Luồng khách (thành viên)
1. Đăng nhập bằng **Google** (để hạn chế bot và tài khoản ảo hàng loạt).
2. **Lần đầu vào**: điền form gồm
   - **Họ tên** (điền sẵn từ Google, cho sửa vì tên Google nhiều khi là biệt danh)
   - **Mã định danh** (mã sinh viên; sau này là mã nhân viên)
   - **Đơn vị** (lớp; sau này là phòng ban)
3. Nhập **mã công việc** để xin tham gia, rồi vào **phòng chờ** cho nhóm trưởng/phó duyệt (mục 7.1).
4. Từ lần sau: đăng nhập là vào thẳng.

### 4.2 Lý do dùng mã định danh
Email không phải mỗi sinh viên một cái, chỉ **mã sinh viên là duy nhất cho mỗi người**. Thống kê gộp theo mã này để biết đúng một người.

- Tên cột đặt chung chung: `ma_dinh_danh`, `don_vi`. Đổi sang nhóm đi làm chỉ đổi nhãn trên giao diện, không sửa database.
- **Không đặt ràng buộc trùng cứng** ở bản đầu. Nếu trùng thì **hiện cảnh báo cho nhóm trưởng** (ví dụ "mã này trùng tài khoản cũ của A, đang giữ 3 task"), để không chặn người dùng chính đáng.
- Mã định danh là thông tin cá nhân: **chỉ nhóm trưởng (và phó nhóm) và chính người đó xem được**. Thành viên khác chỉ thấy tên. Chỉ lưu những gì cần thiết.

### 4.3 Giới hạn bảo mật cần hiểu đúng
- Đăng nhập Google **không** chặn được hoàn toàn người lạ (ai có Gmail cũng đăng nhập được).
- Lớp bảo vệ thật sự là **mã công việc + nhóm trưởng duyệt tay**. Người lạ đăng nhập được nhưng không thấy gì.
- **Việc xác minh "có đúng là người trong nhóm không" do con người tự đối chiếu ngoài đời**, hệ thống chỉ cung cấp tên, email Google, mã định danh để đối chiếu.

## 5. Vai trò và quyền

Quyền admin **không phải tài khoản đặc biệt**, chỉ là vai trò gắn trong dữ liệu theo từng công việc. Không cần trang đăng nhập admin riêng, và không cần giấu đường dẫn `/admin` vì giấu không tăng bảo mật.

| Vai trò | Phạm vi | Quyền |
|---|---|---|
| **Nhóm trưởng** (leader) | Từng công việc | Tạo/đổi/tắt mã, duyệt thành viên ở phòng chờ (7.1), loại thành viên (7.2), thay thế tài khoản, giao việc, duyệt hoàn thành, chuyển quyền, lưu trữ công việc, xuất báo cáo |
| **Phó nhóm** | Từng công việc | **Cùng quyền với nhóm trưởng, trừ mở lại công việc đã lưu trữ** (lưới an toàn nếu nhóm trưởng mất tài khoản) |
| **Thành viên** (member) | Từng công việc | Xem task của mình, sửa tiến độ/checklist của mình, kéo task của mình tới *Chờ duyệt* (khi đã tích hết), **xin chuyển giao** khi làm dở (mục 8.8) |
| **Giáo viên** | Ngoài hệ thống | Nhận file CSV/PDF do nhóm trưởng xuất. **Chưa có tài khoản riêng** (làm sau) |

- Một người có thể là nhóm trưởng ở công việc này và thành viên ở công việc khác.
- **Ai được tạo công việc?** Cờ `duoc_tao_cong_viec` trong `profiles`, **mặc định tắt** cho tài khoản mới. Người dùng chính tự bật cho mình lần đầu bằng cách sửa tay một ô trong bảng dữ liệu Supabase (đây là cách duy nhất có admin đầu tiên, chỉ làm một lần). Muốn thêm nhóm trưởng khác thì bật cờ cho họ.
- **Chuyển quyền nhóm trưởng** có hỗ trợ (đổi vai trò trong `members`). Mỗi công việc phải luôn có **ít nhất một** người có quyền nhóm trưởng.
- Cần bật **xác minh 2 bước** cho tài khoản Google của nhóm trưởng. Dự phòng cuối cùng là tài khoản Supabase (phải giữ chắc, không chia sẻ).

## 6. Mô hình dữ liệu

### 6.1 Nguyên tắc cốt lõi: task gắn vào "chỗ ngồi" (member), không gắn vào tài khoản (user)
Người phụ trách task nằm ở bảng `task_assignees`, trỏ tới `members.id`, không trỏ tới `user_id`. Nhờ vậy tài khoản mất hay đổi thì task và phần trăm vẫn nằm nguyên trong dòng thành viên.

### 6.2 Các bảng (tên cột không dấu)

```
profiles       (user_id, ho_ten, don_vi, duoc_tao_cong_viec)                  <- theo tài khoản Google
profile_rieng  (user_id, ma_dinh_danh)                                       <- BẢNG RIÊNG vì RLS không giấu được theo cột (mục 11.1-J)
projects       (id, ten, join_code, max_members, trang_thai, tao_boi, bat_binh_chon, trong_so_diem)        <- trang_thai: dang_hoat_dong | luu_tru
members        (id, project_id, user_id, vai_tro, trang_thai)                <- vai_tro: truong_nhom | pho_nhom | thanh_vien
                                                                                trang_thai: dang_tham_gia | da_roi
                                                                                ly_do_roi (chỉ khi da_roi): tu_roi | bi_loai   <- mục 7.2
join_requests  (id, project_id, user_id, trang_thai)                         <- cho_duyet | da_duyet | tu_choi | da_thay_the | het_han
loai_nguoi     (id, project_id, member_id, user_id, xu_ly_tien_do, ly_do, nguoi_loai, thoi_gian)   <- GHI VẾT mỗi lần loại thành viên, CHỈ GHI THÊM (mục 7.2); xu_ly_tien_do: giu | xoa | khong_co; thời gian do SERVER ghi
tasks          (id, project_id, trang_thai, trang_thai_truoc_huy, tien_do, han_chot, ly_do_huy, cap_nhat_luc)   <- trang_thai gồm cả da_huy (hủy mềm)               <- cả nhóm xem được (phần "vỏ")
task_assignees (task_id, member_id, vai_tro_trong_task, trang_thai)          <- vai_tro_trong_task: chinh | ho_tro (nhóm trưởng/phó đặt)
                                                                                trang_thai: dang_lam | da_go | da_chuyen (gỡ/chuyển đi nhưng vẫn giữ lịch sử)
                + (giao_boi, thoi_gian_giao)                                      <- ai giao lần đầu, lúc nào (giờ server)
task_chuyen_giao (id, task_id, tu_member, den_member, nguoi_chuyen,          <- GHI VẾT mỗi lần chuyển người chính A→B, CHỈ GHI THÊM (mục 8.9)
                tien_do_luc_chuyen, loai_chuyen, ly_do, da_sua_loai, thoi_gian)   <- thời gian do SERVER ghi
task_details   (task_id, tieu_de, mo_ta, tep_dinh_kem, binh_luan)            <- CHỈ người được giao + nhóm trưởng/phó xem
task_checklist (id, task_id, noi_dung, trong_so, da_xong, trang_thai_muc, de_xuat_boi,                    <- tiến độ và % đóng góp tính từ đây
                nguoi_hoan_thanh, thoi_gian_hoan_thanh)                      <- trong_so mặc định 1; thời gian do SERVER ghi
task_votes     (task_id, member_id, thoi_gian)                               <- bình chọn task chưa giao (chỉ khi projects.bat_binh_chon bật)
task_links     (id, task_id, muc_id NOT NULL, url, url_chuan_hoa, ghi_chu, nguoi_them (member_id, KHÔNG phải user_id), thoi_gian,
                trang_thai_link, ly_do_tu_choi)                              <- minh chứng chỉ bằng link; trang_thai_link: hop_le | bi_tu_choi; mục checklist chỉ tích được khi có link (mục 11.1-C)
task_yeu_cau   (id, task_id, member_id, ly_do, trang_thai, thoi_gian,         <- thành viên XIN chuyển giao khi làm dở (mục 8.8); trang_thai: dang_cho | da_chuyen | bi_tu_choi | da_rut
                xu_ly_boi, ly_do_xu_ly, thoi_gian_xu_ly)                      <- BẢNG RIÊNG vì lý do có thể là chuyện riêng (ốm...), xem 11.1-J
thong_bao      (id, member_id, loai, task_id, noi_dung, da_doc, thoi_gian)   <- thông báo trong app, gửi tới member (không phải user)
chot_so        (id, project_id, lan_chot, thoi_gian, nguoi_chot)             <- "chụp" kết quả khi kết thúc công việc; lần chốt 1, 2... nếu mở lại
chot_so_chi_tiet (chot_so_id, member_id, task_id, phan_tram_dong_gop, ...)   <- % đóng góp đóng băng
diem_thanh_vien (chot_so_id, member_id, diem_cong_thuc, diem_chot,           <- điểm thang 10.00; diem_chot = sau khi nhóm trưởng/phó điều chỉnh
                 ly_do_dieu_chinh, nguoi_dieu_chinh)
activity_log   (id, project_id, task_id, member_id, hanh_dong,
                tien_do_truoc, tien_do_sau, thoi_gian)                       <- nhật ký tự động, CHỈ GHI THÊM (cấm sửa/xóa), thời gian do server ghi
```

### 6.3 Quy tắc RLS chính
- `tasks` (vỏ): mọi thành viên đang tham gia công việc đó đều đọc được.
- `task_details`: mọi người được giao task (trong `task_assignees`, kể cả người hỗ trợ) và nhóm trưởng/phó đọc được. Người khác dù gọi thẳng API cũng bị chặn.
- `profile_rieng.ma_dinh_danh`: chỉ chính chủ và nhóm trưởng/phó của công việc liên quan đọc được (tách bảng riêng, xem 11.1-J).
- Mọi thao tác ghi quan trọng đi qua hàm database, xem 11.1-A.
- Duyệt, thay thế, giao việc, đổi mã, chuyển quyền: chỉ nhóm trưởng/phó.
- Nhập mã tham gia là một **hàm trong database** làm cùng lúc: kiểm tra mã, kiểm tra chưa đủ `max_members`, ghi `join_requests`. Nhờ vậy hai người nhập cùng lúc không vượt giới hạn.

## 7. Luồng tham gia và xử lý "A đổi tài khoản"

**Tham gia bình thường (qua phòng chờ, mục 7.1)**
1. Khách nhập mã, hệ thống ghi `join_requests` (đang chờ). Khách chỉ thấy màn hình "Đang chờ nhóm trưởng duyệt".
2. Nhóm trưởng thấy danh sách chờ (hiện tên, email Google, mã định danh, đơn vị, cảnh báo trùng mã nếu có).
3. Hai nút: **Duyệt là thành viên mới** hoặc **Đây là người cũ, thay thế** (chọn dòng thành viên cũ, **kể cả dòng đã `da_roi` do bị loại**: khi đó dòng được đặt lại `dang_tham_gia` và đổi `user_id`; mục 7.2).

**Thay thế tài khoản** (người dùng mất tài khoản cũ hoặc lỡ thoát nhóm, tạo tài khoản mới)
- Chỉ đổi `members.user_id` của dòng cũ sang tài khoản mới. **Không xóa gì cả.**
- Người đó đăng nhập lại là thấy đúng task dở dang và phần trăm cũ.
- Tài khoản cũ không còn dòng nào trỏ tới nên thành tài khoản trống vô hại.
- Nếu người đó đăng nhập lại bằng **đúng email Google cũ** thì hệ thống nhận ra ngay, không cần xin duyệt. Luồng chờ duyệt chỉ là lưới an toàn.

**Rời nhóm**: chỉ **đánh dấu** `trang_thai = da_roi`, **không xóa** task. Lịch sử thống kê vẫn đủ ("A đã làm 60% rồi rời"). Nhóm trưởng có thể mời quay lại bằng đúng dòng đó.

### 7.1 Phòng chờ (hướng ĐÃ CHỐT theo yêu cầu; chi tiết là đề xuất, xem mục 13-21)

Phòng chờ **chính là** trạng thái `join_requests.cho_duyet` ở trên, **không thêm bảng mới**; chỉ làm rõ cách dùng:
- Khách đăng nhập, điền hồ sơ, nhập mã xong là vào phòng chờ: chỉ thấy "Đang chờ nhóm trưởng/phó cho vào". Người đã có dòng `members` đang tham gia thì vào thẳng, không qua phòng chờ.
- Nhóm trưởng/phó thấy danh sách phòng chờ: tên, email Google, mã định danh, đơn vị, thời gian đã chờ, cảnh báo trùng mã (mục 4.2) và cảnh báo "từng bị loại N lần" (mục 7.2).
- **Hỏi miệng ngoài đời** để xác định có đúng người trong nhóm không (hệ thống không kiểm tra được, mục 4.3). Xác định xong mới bấm: **Cho vào là thành viên mới**, **Đây là người cũ, thay thế**, hoặc **Từ chối**.
- **Cho vào không có nghĩa là được giao việc.** Người mới ở trạng thái "chưa nhận nhiệm vụ", **không thêm cột**: suy ra từ việc chưa có dòng nào trong `task_assignees`. Hệ thống: (a) lúc bấm "Cho vào" hiện nhắc *"Người này vào nhóm rồi nhưng chưa có việc nào"*; (b) nhãn **"Chưa nhận việc"** cạnh tên trong danh sách thành viên; (c) dải cảnh báo trên màn nhóm trưởng/phó **"N thành viên chưa nhận việc"** cho đến khi người đó có task đầu tiên.
- Bấm "Cho vào" chạy nguyên tử: trưởng và phó cùng bấm thì chỉ một lần thành công (`where trang_thai = cho_duyet`).

### 7.2 Loại thành viên khỏi nhóm (kick) (hướng ĐÃ CHỐT theo yêu cầu, chỉnh lần 2)

Chỉ nhóm trưởng/phó. "Loại" = `members.trang_thai = da_roi`, `ly_do_roi = bi_loai`, **không xóa gì**. Người bị loại **mất quyền ngay** (RLS, mục 11.1-J). Một hàm database làm hết trong một transaction, ghi `loai_nguoi` và `activity_log`. **Bắt buộc lý do** (≥ 10 ký tự, chỉ nhóm trưởng/phó thấy).

**Người bị loại không có task nào đang làm:** hộp xác nhận đơn giản, hai nút *Hủy bỏ* / *Loại*.

**Người bị loại đang xử lý task:** hiện hộp thoại cảnh báo *"Người này đang xử lý task <tên> (<N>%, đã tích <M> mục). Bạn có chắc chắn muốn loại?"*, liệt kê các task đó, **ba nút, không nút nào chọn sẵn**:

| Nút | Kết quả |
|---|---|
| **Hủy bỏ** | Chỉ đóng hộp thoại, không đổi gì |
| **Vẫn loại bỏ** | Loại **và xóa tiến độ**: bỏ tick các mục do người đó làm, dòng người làm thành `da_go`, task về **Cần làm** với nhãn "chưa có người" và **cảnh báo nhóm trưởng/phó "task này đang không có ai làm"**. Nhóm trưởng giao cho người khác làm lại từ đầu |
| **Chỉ kick** | Loại, **giữ nguyên tiến độ**: các mục đã tích và % không đổi, task vẫn *Đang làm* nhưng gắn nhãn "chưa có người làm tiếp" kèm cảnh báo. Nhóm trưởng phải giao người khác vào làm tiếp (xử lý như "người làm đã rời", 11.1-E: dòng người làm giữ nguyên, nhóm trưởng chuyển giao tiếp theo 8.7-B) |

**Quy tắc**
- Nút áp dụng cho **tất cả** task đang làm của người đó (đơn giản). Muốn xử lý từng task khác nhau thì chuyển giao hoặc gỡ từng task trước rồi mới loại.
- **"Xóa tiến độ" chỉ là bỏ tick, không xóa dữ liệu**: nhật ký và link vẫn còn (đúng nguyên tắc 8.7-A). Người nhận task sau phải **tự gắn link của mình** mới tích được (11.1-C), không dùng được link của người bị loại.
- Task về Cần làm chỉ khi người bị loại là **người chính** (hoặc người duy nhất); nếu là người hỗ trợ thì chỉ bỏ tick phần của họ, task giữ trạng thái.
- Task `cho_duyet`: **chặn**, phải *Trả lại* trước. Task `hoan_thanh`: giữ nguyên (đã được duyệt).
- Người bị loại: yêu cầu xin chuyển giao đang chờ tự đóng; không nhận thông báo; mở app thấy màn "Bạn không còn ở công việc này" (không hiện lý do).
- **Cấm vào sau 3 lần**: mỗi lần bị loại tính 1, cộng với số lần bị từ chối (mục 11.1-F), theo từng công việc và từng tài khoản; từ 3 trở lên thì hàm nhập mã chặn. Chỉ nhóm trưởng/phó mời lại trực tiếp mới vào được. Hạn chế: người bị cấm dùng tài khoản Google khác vẫn nhập được mã; lớp chặn thật là hỏi miệng ở phòng chờ.
- **Mất nick, có nick mới:** nếu nhóm trưởng chưa loại nick cũ thì dùng **"Đây là người cũ, thay thế"** ở phòng chờ (mục 7): giữ nguyên tiến độ, không cần kick, không tính lần cấm.
- **Không loại được**: chính mình, nhóm trưởng cuối cùng. Phó **không loại** nhóm trưởng và **không loại phó khác**; chỉ nhóm trưởng loại được phó (đã chốt).

### 7.3 Màn quản lý thành viên (hướng ĐÃ CHỐT theo yêu cầu; chi tiết là đề xuất)

Một màn **"Thành viên"** cho nhóm trưởng/phó (thuộc màn 6) để xem và xử lý người trong nhóm ở một chỗ. **Không thêm bảng mới**, chỉ đọc `members`, `task_assignees`, `join_requests`, `loai_nguoi` và gọi lại các hàm đã có.
- **Trên cùng: Phòng chờ** (mục 7.1), kèm số người đang chờ.
- **Danh sách đang tham gia:** tên, vai trò, đơn vị, mã định danh (chỉ nhóm trưởng/phó thấy), số task đang làm, nhãn "Chưa nhận việc" và "Từng bị loại N lần". Có ô tìm theo tên/mã và lọc nhanh: *Tất cả* / *Chưa nhận việc* / *Đang có task dở*.
- **Menu "..." mỗi dòng:** *Loại khỏi nhóm* (hộp thoại ba nút, mục 7.2), *Đổi vai trò* (phó/thành viên; chuyển quyền nhóm trưởng theo mục 5 và 11.1-F), *Xem task của người này* (lọc Kanban theo người).
- **Cuối: "Đã rời / bị loại"** (thu gọn): lý do rời (tự rời hay bị loại; lý do chi tiết chỉ nhóm trưởng/phó thấy), số task dở còn lại, nút **Mời lại** (khôi phục dòng cũ, mục 7). Người đã bị cấm (đủ 3 lần) hiện nhãn "Đã bị cấm"; **Mời lại** là cách duy nhất để họ vào, ghi `activity_log`, không xóa số lần bị loại.
- **Nút theo vai trò:** không có nút Loại ở dòng của chính mình và của nhóm trưởng; phó không thấy nút Loại ở dòng phó khác. Ẩn nút chỉ để tiện, database mới là chốt chặn (mục 11.1-A.2).
- Điện thoại: dùng được nhưng không tối ưu (như màn 6).

## 8. Công việc và task

### 8.1 Bảng Kanban (tham khảo từ ảnh nhóm trưởng cung cấp)
Bốn cột: **Cần làm → Đang làm → Chờ duyệt → Hoàn thành**.
- Thành viên chỉ kéo **task của mình** tới *Chờ duyệt*, và **chỉ khi đã tích hết mục** (làm dở thì dùng "Xin chuyển giao", mục 8.8).
- Chỉ nhóm trưởng/phó kéo sang *Hoàn thành*, hoặc trả về *Đang làm* kèm lý do. "Xong" luôn có người xác nhận.

### 8.2 Quy tắc task
- **Mặc định mỗi task một người** (vai trò *chính*). **Chỉ nhóm trưởng/phó** được thêm người *hỗ trợ* (thường 2-3 người) hoặc gỡ người khỏi task. Gỡ chỉ là đánh dấu, đóng góp cũ vẫn được giữ.
- **Người chính** (chịu trách nhiệm) là do nhóm trưởng/phó đặt, **khác** với **người làm nhiều nhất** (tính từ dữ liệu). Hai thông tin này hiện cạnh nhau, vì có thể không trùng.
- Task một người là trường hợp riêng của mô hình trên (một người, 100%), không cần xử lý riêng.
- **Tiến độ tính từ checklist**, không nhập tay: phần trăm task = **tổng trọng số** mục đã tích / tổng trọng số các mục (đã chốt, thống nhất với % đóng góp ở 8.4). Phần trăm công việc = trung bình các task. Lý do: nhập tay thì người ta nhập đại, thống kê mất giá trị.
- **Hạn chót** cho từng task, tự hiện nhãn "quá hạn". Chưa làm nhắc việc tự động ở bản đầu.
- **Task chưa giao** nằm ở cột *Cần làm* với nhãn "chưa có người". Nhóm trưởng giao sau, hoặc dùng bình chọn (mục 8.5).
- **Người ngoài xem task của bạn**: chỉ thấy "Task giao cho A (chính), B, C; tiến độ 40%; trạng thái X". **Tiêu đề và chi tiết task chỉ hiện với những người được giao (kể cả người hỗ trợ do nhóm trưởng/phó gắn) và nhóm trưởng/phó** (đã chốt). Ngoại lệ: task **chưa giao** thì cả nhóm xem được tiêu đề và chi tiết để còn bình chọn (mục 8.5).

### 8.3 Nhật ký hoạt động (làm ngay từ đầu)
Mỗi lần đổi trạng thái, tích mục checklist, được giao task, rời hoặc vào nhóm thì tự ghi một dòng vào `activity_log` (ai, làm gì, lúc nào). Đây là dữ liệu để thống kê và làm bằng chứng với giáo viên. **Thêm sau thì mất dữ liệu quá khứ**, nên bắt buộc có từ bản đầu.

### 8.4 Đóng góp của từng người trong task nhiều người (ĐÃ CHỐT)

Mục tiêu: nhìn vào task biết **ai chính, ai làm nhiều, ai làm ít**, và biết mỗi người làm lúc nào, được bao nhiêu %.

- **Cách tính % đóng góp:** mỗi mục checklist ghi lại **ai hoàn thành** và **lúc nào** (giờ server). % đóng góp của một người = tổng `trong_so` các mục họ hoàn thành / tổng `trong_so` các mục đã hoàn thành của task.
- `trong_so` mặc định bằng 1. Nhóm trưởng/phó có thể tăng cho mục khó, vì đếm số mục không phản ánh độ khó.
- **Nhóm trưởng/phó được chỉnh tay % cuối cùng kèm ghi chú lý do**, và việc chỉnh cũng ghi vào nhật ký. Lý do: có việc không tick được (tìm tài liệu, họp, sửa giúp).
- **Mỗi lần tick** ghi vào `activity_log`: ai, mục nào, lúc nào, tiến độ task trước và sau. Nhật ký chỉ ghi thêm, không ai sửa hoặc xóa được (kể cả thành viên).
- **Bỏ tick** cũng ghi nhật ký; % tính theo trạng thái hiện tại của checklist, nên tick rồi bỏ không làm tăng điểm.
- **Ai xem được % đóng góp (đã chốt):** nhóm trưởng/phó thấy tất cả; mỗi người thấy % của mình; người ngoài task chỉ thấy tên và tổng tiến độ.
- **Trọng số (đã chốt):** có dùng, mặc định 1, nhóm trưởng/phó chỉnh được.
- **Định dạng số (đã chốt):** tổng đóng góp của một task luôn là **100%**, hiển thị **2 chữ số thập phân** (ví dụ 33.34%).
  - Database lưu giá trị gốc chính xác; chỉ làm tròn khi hiển thị.
  - Làm tròn bằng phương pháp **phần dư lớn nhất** để tổng luôn đúng **100.00%** (nếu làm tròn thường, 3 người chia đều sẽ ra 33.33 × 3 = 99.99).
  - Task chưa có mục nào hoàn thành thì hiện "chưa có đóng góp", không hiện 0% hay chia cho 0.
  - Khi nhóm trưởng chỉnh tay, các % phải cộng lại đúng 100.00%, nếu không thì không cho lưu.
  - Lưu ý: 2 chữ số thập phân chỉ làm số **hiển thị** chi tiết hơn, không làm nó **chính xác hơn**. Độ chính xác thật vẫn phụ thuộc vào việc chia checklist đủ nhỏ.

Hạn chế cần nhớ: % đóng góp chỉ chính xác bằng độ chia nhỏ của checklist. Task chỉ có 2-3 mục thì số rất thô, nên cần chia checklist đủ nhỏ.

### 8.5 Bình chọn nhận task (ĐÃ CHỐT)

- Nhóm trưởng/phó có **công tắc bật/tắt** `bat_binh_chon` cho từng công việc.
- Khi bật: hiện **danh sách toàn bộ task chưa giao**; thành viên **bình chọn** task mình muốn nhận.
- **Quyết định cuối luôn do nhóm trưởng/phó**: bình chọn chỉ là tham khảo, không tự động giao việc. Nhóm trưởng/phó **kéo thả** task vào người được chọn.
- Hệ quả quyền xem: task chưa giao thì mọi thành viên đang tham gia xem được tiêu đề và chi tiết. Khi đã giao thì chỉ người được giao và nhóm trưởng/phó xem được (mục 8.2).
- **Ai thấy gì (đã chốt):** nhóm trưởng/phó thấy **ai bình chọn gì**; thành viên thường chỉ thấy **số phiếu** của mỗi task.

### 8.6 Thành viên hoàn thành task bằng cách nào (luồng làm việc)

1. **Nhóm trưởng/phó giao task** kèm: mô tả, hạn chót, và **checklist** (các mục nhỏ, mỗi mục có trọng số, mặc định 1). Task **phải có ít nhất một mục checklist** mới được giao; task nhiều người nên chia khoảng 8-10 mục trở lên để % đóng góp có ý nghĩa.
2. **Người được giao** thấy task ở cột *Cần làm* và bấm **"Bắt đầu"** (task chuyển sang *Đang làm*).
3. **Làm việc**: tích từng mục checklist khi xong. **Chỉ tích được khi mục đó đã có minh chứng (link) gắn đúng mục** (ĐÃ CHỐT, chi tiết ở 11.1-C). Hệ thống tự ghi ai tích, mục nào, lúc nào (giờ server) và tiến độ trước/sau vào nhật ký. Người hỗ trợ cũng tích được các mục trong task mình được gắn.
4. **Minh chứng và trao đổi**: gắn **link** (bắt buộc cho mỗi mục trước khi tích) (Google Drive, tài liệu...) vào mục hoặc task, và **bình luận** trong task để báo vướng mắc hoặc hỏi nhóm trưởng. **Chỉ dùng link, không tải file/ảnh lên** (đã chốt, để dữ liệu nhẹ).
   - Chỉ chấp nhận link bắt đầu bằng `https://`; hiển thị dạng link bấm được, **không tự động tải nội dung** link.
   - Hệ thống **không kiểm tra được** link có mở được hay không. Người gắn link phải đặt quyền "ai có link đều xem được" (hoặc chia sẻ cho nhóm trưởng), và giao diện nên nhắc điều này.
5. **Gửi duyệt** (chỉ để báo *"đã xong"*): khi **mọi** mục đã tích, người *chính* (hoặc nhóm trưởng/phó) bấm **"Gửi duyệt"** để chuyển sang *Chờ duyệt*. Hệ thống **không tự chuyển**. **Chưa tích hết thì không gửi duyệt được.** Làm dở mà không làm tiếp được (ốm, bận...) thì bấm **"Xin chuyển giao"** (mục 8.8), không cần đủ minh chứng.
6. **Nhóm trưởng/phó duyệt**: hoặc **Duyệt** (sang *Hoàn thành*), hoặc **Trả lại kèm lý do** (về *Đang làm*, có thể bỏ tích các mục cụ thể). Mọi thao tác đều ghi nhật ký kèm tên người làm.
7. Task *Hoàn thành* bị **khóa**; chỉ nhóm trưởng/phó sửa được, và có ghi nhật ký.

- **Đã chốt:** **chỉ nhóm trưởng/phó** được thêm, sửa, xóa mục checklist và đổi trọng số. Thành viên chỉ **đề xuất thêm mục** (chờ duyệt). Lý do: nếu ai cũng tự thêm mục, họ có thể tạo nhiều mục nhỏ rồi tích để đẩy % đóng góp và điểm của mình lên. Mục đề xuất chưa được duyệt thì **chưa tính** vào tiến độ.

### 8.7 Hủy task, chuyển giao task, thông báo (luồng đã chốt theo yêu cầu; cách tính điểm là đề xuất)

**Nguyên tắc:** task đã có hoạt động thì **không xóa cứng**, chỉ **hủy mềm** (ẩn khỏi bảng, giữ trong dữ liệu). Nếu xóa cứng, công sức người đã làm sẽ biến mất khỏi báo cáo và điểm, trái mục tiêu công bằng.

**A. Hủy task**
- Nút "Xóa" của nhóm trưởng/phó thực chất là **"Hủy task"**. Chỉ task **chưa có hoạt động nào** (chưa ai bắt đầu, chưa tích mục) mới được **xóa hẳn**, vẫn hỏi xác nhận.
- Task đã có hoạt động: hiện **cảnh báo** nêu rõ **ai đang làm, tiến độ bao nhiêu %, các mục đã tích**; **bắt buộc nhập lý do**; xác nhận mới hủy. Task đã *Hoàn thành* mà bị hủy thì cảnh báo mạnh hơn.
- Hệ quả: task thành `da_huy`, **ẩn khỏi Kanban**, người được giao vẫn xem được trong mục **"Task đã hủy"** kèm lý do. **Thông báo** gửi cho mọi người được giao (chính + hỗ trợ). Ghi nhật ký (ai hủy, lý do).
- *Cách tính điểm (ĐÃ CHỐT):* các mục đã tích **vẫn tính** cho người làm (thành phần A và báo cáo); phần chưa làm của task bị hủy **loại khỏi kế hoạch** (không tính vào `F`); task hủy **loại khỏi mẫu số** của B và C, tức người làm không bị phạt.

**B. Chuyển giao task từ A sang B**
- Nút "Chuyển giao" (chỉ nhóm trưởng/phó): hiện **cảnh báo** kèm tiến độ hiện tại và phần A đã làm; **bắt buộc lý do**; cho phép **đặt lại hạn chót** (ghi nhật ký) để B không bị tính trễ vì thời gian của A.
- Hệ quả: dòng của A trong `task_assignees` thành `da_chuyen`; B được thêm vào với vai trò A đang giữ (chính hoặc hỗ trợ), ghi **một dòng** vào `task_chuyen_giao` (mục 8.9): ai chuyển, từ A sang B, tiến độ lúc chuyển (ví dụ 40%), loại, lý do, giờ server.
- **% của hai người tự đúng, không cần tính tay**: các mục A đã tích vẫn thuộc A (nhờ lưu `nguoi_hoan_thanh`), B tích nốt phần còn lại nên được tính phần đó.
- B thấy dòng "Tiếp nhận từ A lúc 40%". Báo cáo hiện "A làm đến 40%, chuyển cho B vì <lý do>, B hoàn thành phần còn lại".
- Sau khi bị chuyển, A xem task ở chế độ **chỉ đọc** (giữ bằng chứng phần mình làm), không tích thêm được.
- Muốn A giữ một số mục, B nhận số còn lại: dùng **thêm người hỗ trợ**, không phải chuyển giao.
- *Cách tính điểm (ĐÃ CHỐT, người dùng đồng ý vì hệ thống cần công bằng nên phải giữ đúng sự thật; **không có chế độ "chuyển nào cũng không phạt"**):* khi chuyển, nhóm trưởng/phó chọn **loại chuyển**: (1) **lý do khách quan** (bận, ốm...) thì task **loại khỏi mẫu số B của A**; (2) **chưa kịp tiến độ/hạn** thì task **tính là chưa hoàn thành của A** (có ở mẫu số B, không có ở tử số). Phần A đã làm luôn được tính ở thành phần A.

**C. Thông báo trong app (bản đầu)**
- Bảng `thong_bao` gửi tới `member_id` (không phải `user_id`, để khi đổi tài khoản vẫn giữ thông báo). Có biểu tượng chuông với số chưa đọc.
- Sự kiện có thông báo: được giao task, bị gỡ khỏi task, **task bị hủy (kèm lý do)**, **task chuyển giao (kèm lý do)**, task bị trả lại (kèm lý do), task được duyệt hoàn thành, có **yêu cầu tham gia mới** và **yêu cầu chuyển giao mới** (gửi nhóm trưởng/phó), và **yêu cầu chuyển giao bị từ chối (kèm lý do)** (gửi người xin).
- **Hạn chế:** chỉ thấy khi **mở app**; chưa có email hay thông báo đẩy (mục 12). Vì vậy lý do hủy/chuyển còn được lưu **ngay trên task** và trong nhật ký, không chỉ nằm trong thông báo.
- Mặc định tải thông báo khi mở/làm mới trang; realtime (Supabase Realtime) để làm sau.

### 8.8 Làm dở không làm tiếp được: Xin chuyển giao (hướng ĐÃ CHỐT; chi tiết là đề xuất, xem mục 13-19)

**Vấn đề cũ:** "Gửi duyệt" từng cho gửi khi chưa tích hết (ghi lý do), nhưng task ở *Chờ duyệt* chỉ có hai lối ra là *Duyệt hoàn thành* hoặc *Trả lại*, và bị khóa nên không chuyển giao được. Người làm dở (vd ốm, mới 60%) không có đường đi đúng. Tách làm hai việc:

- **Gửi duyệt = "tôi xong rồi"**: bắt buộc tích hết mục (8.6-5).
- **Xin chuyển giao = "tôi làm đến đây, nhờ người khác làm tiếp"**: không cần tích hết, không cần minh chứng cho phần chưa làm.

**Luồng**
1. Người được giao (chính hoặc hỗ trợ) task đang `dang_lam` bấm **"Xin chuyển giao"**, bắt buộc lý do (≥ 10 ký tự). Task **không đổi trạng thái, không bị khóa**; mỗi người chỉ có một yêu cầu đang chờ cho mỗi task.
2. Nhóm trưởng/phó nhận thông báo. Màn nhóm trưởng có hàng đợi **"Yêu cầu chuyển giao"**: lý do, % hiện tại, các mục đã tích kèm link.
3. Nhóm trưởng/phó **kiểm tra phần đã làm** như khi duyệt (11.1-C): link sai thì đánh dấu `bi_tu_choi`, mục tự bỏ tích, % tụt theo. Nhờ vậy "A làm đến 60%" là phần **đã được xác nhận thật** trước khi chuyển.
4. Hai lối ra: **(a) Chuyển giao** theo 8.7-B (chọn B, chọn loại chuyển, đặt lại hạn nếu cần), yêu cầu thành `da_chuyen`, B làm nốt phần còn lại; **(b) Từ chối** kèm lý do, yêu cầu thành `bi_tu_choi`, A làm tiếp và được thông báo.
5. Người xin có thể **rút** yêu cầu (`da_rut`) khi chưa được xử lý.

**Quy tắc giữ công bằng (không đổi nguyên tắc "đúng sự thật")**
- **Người xin không tự chọn loại chuyển.** Chỉ nhóm trưởng/phó chọn `khach_quan` hay `chua_kip` (8.7-B); lý do của người xin là căn cứ để chọn. Phần A đã làm vẫn luôn tính ở thành phần A.
- Phần chưa tích **không tính cho ai** cho đến khi có người tích kèm link; xin chuyển giao không tạo điểm.
- Nếu người xin là người **hỗ trợ**: lối ra (a) là **gỡ** khỏi task (8.2), đóng góp cũ giữ nguyên, không có loại chuyển.
- Không xin được khi task `cho_duyet`/`hoan_thanh`/`da_huy` hoặc công việc `luu_tru`. Task `cho_duyet` mà phát hiện chưa xong thì nhóm trưởng *Trả lại* như cũ.
- Nhóm trưởng/phó vẫn **chủ động chuyển giao** không cần ai xin (8.7-B); yêu cầu chỉ là cửa để thành viên "gõ cửa".

### 8.9 Ghi vết chuyển người chính (hướng ĐÃ CHỐT theo yêu cầu; chi tiết là đề xuất, xem mục 13-20)

Mục tiêu: nhìn vào task biết **ai là người chính, đã được chuyển cho ai, lúc nào, ai quyết định, lúc đó làm được bao nhiêu %**.

- Mỗi lần chuyển giao (8.7-B), hàm database ghi **một dòng** vào bảng riêng `task_chuyen_giao`, trong cùng transaction với `activity_log` và `thong_bao`: `tu_member` (A), `den_member` (B), `nguoi_chuyen` (nhóm trưởng/phó), `tien_do_luc_chuyen`, `loai_chuyen`, `ly_do`, `thoi_gian` (giờ server), `da_sua_loai`.
- Lần **giao đầu tiên** nằm ở `task_assignees` (`giao_boi`, `thoi_gian_giao`), nên dòng thời gian đủ từ đầu: "Giao cho A, rồi A→B, rồi B→C".
- Dùng **bảng riêng** thay vì các cột trên dòng người làm, vì cột trên dòng người làm sẽ bị ghi đè khi chuyển chuỗi (A→B→A) hoặc khi B đã là người hỗ trợ.
- **Hiển thị** trong chi tiết task (màn 5), mục **"Lịch sử người chính"**, ví dụ:
  - `10/11 08:30` · Giao cho A (chính) · bởi Văn An
  - `12/11 14:05` · A → B · A đã làm 40% · lý do khách quan · bởi Văn An
- **Ai xem:** người được giao (kể cả người đã bị chuyển đi, xem ở chế độ chỉ đọc) và nhóm trưởng/phó. **Lý do chỉ nhóm trưởng/phó thấy** (và có trong báo cáo giáo viên). Người ngoài task **không thấy** lịch sử, đúng mục 8.2 (họ chỉ thấy người đang được giao). Trên thẻ Kanban, nhóm trưởng/phó thấy nhãn nhỏ "Đã chuyển N lần".
- **Không sửa, không xóa** (kể cả nhóm trưởng): không ai có quyền update/delete, client không ghi trực tiếp. Ngoại lệ duy nhất là sửa **loại chuyển** trước khi chốt sổ (11.1-E): hàm ghi cũ→mới vào `activity_log`, dòng chuyển hiện cờ "đã sửa loại".
- Chuyển chuỗi A→B→A vẫn ra hai dòng đúng thứ tự. Hủy rồi khôi phục task, lưu trữ, mở lại công việc: lịch sử giữ nguyên. Báo cáo giáo viên lấy từ bảng này (mục 10.1).

## 9. Giới hạn số công việc và dữ liệu

- Tối đa **10 công việc đang hoạt động cho mỗi nhóm trưởng** (đếm theo `tao_boi`). Giới hạn kiểm tra bằng hàm trong database khi tạo công việc, đặt ở hằng số dễ sửa.
- Công việc xong thì đổi `trang_thai = luu_tru`, chuyển sang **chỉ đọc**, **không xóa**. Dữ liệu text rất nhỏ nên 10 công việc × ~20 người × vài chục task vẫn rất nhẹ so với giới hạn free.
- Nếu **dung lượng gần chạm giới hạn**: xuất CSV công việc cũ ra máy rồi mới xóa khỏi database.
- **Tệp đính kèm** là thứ có thể ăn dung lượng nhanh nhất. Ở bản đầu nên **không cho tải file lên**, hoặc chỉ cho dán link (Google Drive...).

### 9.1 Lưu trữ, chốt sổ, mở lại (ĐÃ CHỐT phần mở lại; phần còn lại là thiết kế thống nhất)

- Nhóm trưởng/phó bấm **"Kết thúc công việc"**: hệ thống cảnh báo nếu còn task chưa xong, hỏi xác nhận.
- Khi kết thúc, hệ thống **chụp lại** % đóng góp, tiến độ và điểm của từng người vào `chot_so*` (đóng băng). Sau này đổi trọng số hay chỉnh tay cũng không làm đổi báo cáo đã nộp.
- Công việc đã lưu trữ **chỉ đọc** (database chặn ghi) và **mã tham gia bị vô hiệu**. Không tính vào giới hạn 10 công việc đang hoạt động.
- **Mở lại: CHỈ nhóm trưởng** được bấm (phó nhóm **không**), **mỗi lần mở lại ghi vào nhật ký**. Kết thúc lần nữa thì tạo **lần chốt mới**, các lần chốt cũ vẫn giữ.
- Hệ quả: nếu nhóm trưởng mất tài khoản thì phó không mở lại được; đường lui là chuyển quyền nhóm trưởng (mục 5) hoặc sửa trực tiếp trong Supabase.

## 10. Thống kê và báo cáo

- Thống kê theo task nhiều người: người chính, người làm nhiều nhất, % đóng góp từng người, dòng thời gian thao tác (mục 8.4).
- Thống kê theo người: số task được giao, đã hoàn thành, đang làm, quá hạn, tỉ lệ đóng góp. Dùng câu truy vấn đếm trên `tasks` và `activity_log`.
- Gộp theo `ma_dinh_danh` để ra đúng một người dù có nhiều tài khoản.
- **Xuất báo cáo bằng file CSV/PDF** gửi giáo viên (**Cách 1, đã chốt**). Cách 2 (vai trò "chỉ xem" cho giáo viên) để **làm sau khi hệ thống ổn định**.
- Nút xuất CSV cũng đóng vai trò **sao lưu thủ công** (xem mục 11).

### 10.1 Báo cáo chi tiết cho giáo viên và thang điểm 10.00 (ĐÃ CHỐT)

**Nội dung báo cáo (CSV/PDF):**
1. **Tổng quan công việc**: tên, thời gian, số thành viên, tổng % hoàn thành (trung bình tiến độ các task).
2. **Bảng thành viên**: họ tên, mã định danh, đơn vị, số task được giao, % hoàn thành, các thành phần điểm, điểm công thức, điểm chốt.
3. **Chi tiết theo task**: người chính, người hỗ trợ, trạng thái, hạn chót, % hoàn thành, **% đóng góp từng người**, và **lịch sử người chính** (ai giao, A chuyển cho B lúc nào, bởi ai, tiến độ lúc chuyển, loại chuyển, lý do).
4. **Chi tiết theo người**: được giao task nào, vai trò, các mục checklist đã làm kèm thời gian.
5. **Các thay đổi quan trọng**: đổi người, chỉnh tay %, điều chỉnh điểm, mở lại công việc (lấy từ nhật ký).

**Thang điểm đề xuất (mỗi người, thang 10.00, 2 số thập phân):**

`Điểm = 10 × (0.50 × A + 0.30 × B + 0.20 × C)`

| Thành phần | Trọng số | Cách tính (giá trị từ 0 đến 1) |
|---|---|---|
| **A. Đóng góp** | 50% | `min(1, P / F)`. `P` = tổng trọng số các mục checklist mình hoàn thành (kể cả task hỗ trợ). `F` = phần công bằng = tổng trọng số **toàn bộ mục kế hoạch** của công việc / số thành viên đang tham gia |
| **B. Hoàn thành việc được giao** | 30% | Số task được giao đã được duyệt *Hoàn thành* / tổng số task được giao |
| **C. Đúng hạn** | 20% | Trong các task đã hoàn thành có hạn chót, tỉ lệ hoàn thành đúng hoặc trước hạn |

- Trọng số 50/30/20 là **mặc định, chỉnh được theo từng công việc** (`projects.trong_so_diem`).
- Thành phần nào không áp dụng được (ví dụ không task nào có hạn chót) thì **chia lại trọng số** cho các thành phần còn lại.
- Người **chưa được giao task nào** hiện **"chưa được giao việc"** (không chấm điểm), **khác** với "được giao nhưng không làm" (điểm thấp). Báo cáo phải phân biệt rõ hai trường hợp này.
- **Task bị hủy hoặc chuyển giao**: cách tính ở mục 8.7.
- **Điều chỉnh điểm**: nhóm trưởng/phó được chỉnh điểm của người khác, **bắt buộc ghi lý do**, ghi vào nhật ký. **Không ai được tự chỉnh điểm của chính mình** (kể cả nhóm trưởng). Báo cáo hiện cả *điểm công thức* và *điểm sau điều chỉnh*.
- Đây là **điểm tham khảo**; **giáo viên mới là người quyết định** điểm cuối cùng.
- **Ai thấy điểm (đã chốt):** nhóm trưởng/phó và giáo viên (qua báo cáo) thấy điểm tất cả; mỗi thành viên chỉ thấy điểm của mình **sau khi** nhóm trưởng chốt.

**Hạn chế phải nói rõ:** điểm chỉ phản ánh những gì được ghi lại trong hệ thống (tick checklist, hạn chót), không đo được công sức thật như họp, tìm tài liệu hay hỗ trợ người khác. Công thức cũng phụ thuộc vào việc checklist được chia đủ nhỏ và trọng số đặt hợp lý; nếu nhóm trưởng giao việc không đều thì người được giao ít sẽ bị thiệt ở thành phần A. Vì vậy mới có bước điều chỉnh kèm lý do.

### 10.2 Sao lưu tự động (ĐÃ CHỐT)

**Điều KHÔNG làm được:** web app **không thể tự ghi file xuống thư mục trên máy** của nhóm trưởng khi trình duyệt đang đóng. API ghi vào thư mục máy (File System Access) chỉ chạy trên Chrome/Edge, và phải cấp quyền lại theo phiên, nên không đáng tin cho sao lưu tự động.

**Cách làm được:**
1. **Khi bấm "Kết thúc công việc"**: trình duyệt **tự tải ngay** một file zip (CSV + JSON) tên `Sao-luu-<ngày>-<tên công việc>.zip` về thư mục Downloads (có thao tác bấm của người dùng nên được phép). Trình duyệt không tự tạo thư mục, nên thông tin ngày và tên công việc nằm trong **tên file**.
2. **Hằng ngày, trên máy chủ**: một workflow **GitHub Actions** chạy theo lịch. Nếu có công việc đang hoạt động thì xuất dữ liệu vào **repo riêng tư** theo cấu trúc `<ngày>/<tên công việc>/...`. Nếu không có công việc nào đang chạy thì bỏ qua (bản cuối đã có từ lúc kết thúc). Cùng workflow này **ping Supabase để giữ không bị tạm dừng**.
3. **Về máy**: `git pull` hoặc nút Fetch/Pull của GitHub Desktop. Muốn tự động hoàn toàn trên máy thì đặt lịch (Task Scheduler/cron) chạy `git pull`, tuỳ chọn.
4. **Bảo mật bắt buộc**: khoá `service_role` của Supabase (quyền cao, bỏ qua RLS) chỉ lưu trong **GitHub Secrets**, tuyệt đối không đưa vào code giao diện. Repo phải **riêng tư** và bật **xác minh 2 bước**, vì dữ liệu có mã sinh viên.
5. Cần **kiểm tra lại** giới hạn miễn phí và quy tắc lịch chạy của GitHub Actions trước khi dựa vào.
6. Nút **"Xuất toàn bộ dữ liệu"** thủ công vẫn có (đã chốt).

## 11. Rủi ro và trường hợp xấu cần nhớ

| Rủi ro | Hậu quả | Cách xử lý |
|---|---|---|
| Supabase free **tạm dừng** project khi ~1 tuần không hoạt động | App chết cho đến khi bật lại thủ công (dữ liệu không mất) | Cron gọi vào database mỗi vài ngày; nhất là dịp nghỉ lễ |
| Gói free Supabase **không đảm bảo sao lưu** | Mất dữ liệu thống kê (vốn dùng làm bằng chứng) | Nút xuất CSV, backup định kỳ |
| Vercel Hobby **chỉ cho dự án phi thương mại** | Vi phạm điều khoản nếu kiếm tiền | Dùng học tập thì ổn; nếu thương mại hoá phải đổi gói |
| Mất tài khoản Google của nhóm trưởng | Mất quyền quản lý | Xác minh 2 bước + phó nhóm + tài khoản Supabase làm đường lui |
| Hàm cold start của Vercel | Chậm vài giây ở lần gọi đầu | Chấp nhận được; không phải kiểu "ngủ 1 phút" như Render free |
| Giới hạn gói free thay đổi | Số liệu trong file này lỗi thời | **Luôn kiểm tra lại** trang giá Vercel, Supabase trước khi triển khai |
| Người dùng điền sai mã định danh | Thống kê lệch | Nhóm trưởng đối chiếu ngoài đời; cảnh báo trùng mã |
| Nhóm trưởng và phó đều mất tài khoản | Công việc đứng yên | Đường lui: sửa trực tiếp trong Supabase |
| Hai người nhập mã cùng lúc vượt `max_members` | Vượt giới hạn nhóm | Dùng hàm database xử lý nguyên tử (mục 6.3) |

### 11.1 Quy tắc chống lỗi và trường hợp hiếm (CHI TIẾT, ĐỌC KỸ TRƯỚC KHI VIẾT SQL/CODE)

Mục đích: mọi chỗ dễ sai đều có quy tắc rõ để AI viết SQL/code không phải đoán. Điều gì ghi "[đề xuất]" là chưa được người dùng xác nhận (xem mục 13); hiện chỉ còn chi tiết ở mục 8.8 và 8.9 (câu mở 19, 20).

#### A. Nguyên tắc chung
1. **Mọi thao tác ghi quan trọng đi qua hàm database (RPC), client không ghi thẳng vào bảng**: giao việc, tích/bỏ tích, gắn link, gửi duyệt, duyệt, trả lại, hủy, khôi phục, chuyển giao, xin/rút/từ chối yêu cầu chuyển giao, duyệt/từ chối ở phòng chờ, thay thế, loại thành viên, mời lại, đổi vai trò, chuyển quyền, chốt sổ, mở lại. Mỗi hàm tự kiểm tra quyền + trạng thái, rồi ghi `activity_log` và `thong_bao` **trong cùng một transaction** (hoặc cùng thành công, hoặc cùng không).
2. **RLS bật trên mọi bảng, mặc định từ chối**; chỉ mở đúng quyền cần. Ẩn nút trên giao diện chỉ để tiện, database mới là chốt chặn.
3. **Thời gian do server ghi** (UTC), giao diện hiển thị giờ Việt Nam (Asia/Ho_Chi_Minh). Hạn chót hết vào **23:59:59 giờ Việt Nam** của ngày đó. Không tin giờ do trình duyệt gửi lên.
4. **Không cascade delete**: khóa ngoại để `RESTRICT`. Không có đường nào xóa cứng dữ liệu đã có hoạt động.
5. **Thao tác đồng thời**: kiểm tra trạng thái ngay trong câu lệnh ghi (ví dụ `update ... where da_xong = false`). Ai đến trước thắng; người sau nhận thông báo "đã có người thay đổi, hãy tải lại". Dùng ràng buộc `unique` để bấm đúp không tạo hai bản ghi.
6. **Sửa cùng lúc (hai tab, hai người)**: task/checklist có cột `cap_nhat_luc`; ghi kèm giá trị đã đọc, lệch thì báo "đã có người sửa, tải lại" thay vì ghi đè.
7. **Giới hạn độ dài và số lượng** (hằng số dễ sửa): tiêu đề task 200 ký tự, mô tả 5000, lý do 1000, bình luận 2000, tên 100; tối đa 30 mục checklist/task; tối đa 10 link/mục; tối đa 5 mục đề xuất đang chờ/người/task.
8. **Văn bản người dùng nhập luôn hiển thị dạng chữ thường** (React tự escape); **cấm** `dangerouslySetInnerHTML`.

#### B. Máy trạng thái của task (chỉ các chuyển này hợp lệ, hàm database từ chối cái khác)

| Từ | Sang | Ai | Điều kiện |
|---|---|---|---|
| (chưa giao) | `can_lam` | Nhóm trưởng/phó | Có ≥ 1 mục checklist; người được giao là `dang_tham_gia` |
| `can_lam` | `dang_lam` | Người được giao | Bấm "Bắt đầu". **Chưa bắt đầu thì chưa tích được mục nào** |
| `dang_lam` | `cho_duyet` | Người chính hoặc nhóm trưởng/phó | **Mọi** mục đã tích (mỗi mục đã có link, theo 11.1-C). Chưa tích hết thì **chặn**: dùng "Xin chuyển giao" (8.8) |
| `cho_duyet` | `hoan_thanh` | Nhóm trưởng/phó | Kiểm tra lại ngay lúc duyệt: mọi mục đã tích đều còn ≥ 1 link; không tự duyệt task của mình (mục F) |
| `cho_duyet` | `dang_lam` | Nhóm trưởng/phó | Trả lại, bắt buộc lý do, có thể bỏ tích mục cụ thể |
| `hoan_thanh` | `dang_lam` | Nhóm trưởng/phó | Mở lại, bắt buộc lý do |
| `can_lam`, `dang_lam`, `cho_duyet`, `hoan_thanh` | `da_huy` | Nhóm trưởng/phó | Theo 8.7-A; lưu `trang_thai_truoc_huy` |
| `da_huy` | `trang_thai_truoc_huy` | Nhóm trưởng/phó | **Khôi phục** khi hủy nhầm, bắt buộc lý do, thông báo người được giao |
| `dang_lam` | `can_lam` | **Chỉ** hàm loại thành viên (7.2) | Người chính bị loại và nhóm trưởng chọn "Vẫn loại bỏ" (xóa tiến độ); bỏ tick các mục do người đó làm |

- Task ở `cho_duyet` hoặc `hoan_thanh` bị **khóa**: không tích/bỏ tích, không gắn/xóa link, không thêm/sửa/xóa mục checklist, không chuyển giao. Muốn sửa phải trả lại/mở lại trước.
- Task `da_huy` hoặc công việc `luu_tru`: mọi thao tác ghi bị chặn (trừ khôi phục task, hoặc mở lại công việc).
- "Xin chuyển giao" (8.8) **không đổi trạng thái** task: chỉ tạo bản ghi `task_yeu_cau`; task vẫn `dang_lam` và không bị khóa.

#### C. Minh chứng bắt buộc để tích hoàn thành (ĐÃ CHỐT: có minh chứng mới được tích)

**Quy tắc lõi:** một mục checklist chỉ tích được khi mục đó đã có **ít nhất một link minh chứng hợp lệ gắn đúng mục đó**. Link gắn ở cấp task không đủ. Hàm `tick_muc` kiểm tra ở database nên gọi API trực tiếp cũng không lách được.

| Tình huống | Quy tắc |
|---|---|
| Ai gắn link | Người được giao (chính + hỗ trợ) và nhóm trưởng/phó |
| Ai tích | Người được giao hoặc nhóm trưởng/phó, và **người tích phải là người đã gắn ít nhất một link của mục đó** (đã chốt: để không ai tích "ăn theo" link của người khác). Người khác muốn tích thì tự gắn link của mình |
| Link hợp lệ | Bắt đầu `https://`; ≤ 2000 ký tự; không khoảng trắng; có tên miền (có dấu chấm); không chứa `user:pass@`; chặn `javascript:`, `data:`, `http://`, `file:` |
| Chuẩn hóa | Cắt khoảng trắng, bỏ `/` cuối, tên miền viết thường; lưu thêm `url_chuan_hoa` |
| Trùng trong cùng mục | Không cho gắn hai link giống nhau vào cùng một mục |
| Một link dùng cho nhiều mục | Cho phép (một tài liệu có thể chứng minh nhiều mục), nhưng **hiện cảnh báo cho nhóm trưởng khi duyệt** ("link này dùng cho N mục") |
| Bỏ tích | Link **giữ nguyên**. Tích lại cần link của chính người tích (link cũ của họ vẫn dùng được) |
| Xóa link của mục đã tích | **Không cho**. Muốn xóa phải bỏ tích mục trước (có ghi nhật ký) |
| Link không mở được / sai nội dung | Hệ thống **không kiểm tra được**. Chốt chặn là nhóm trưởng/phó khi duyệt: bấm xem link, sai thì đánh dấu link `bi_tu_choi` kèm lý do, mục tự bỏ tích, task trả lại |
| Mục không có tài liệu (họp, trao đổi miệng) | **Không có ngoại lệ**: gắn link biên bản/ảnh chụp/ghi chú (Drive...). Thật sự không có thì nhóm trưởng dùng chỉnh tay % kèm lý do (8.4). Lý do: giữ đúng sự thật |
| Giao diện | Ô tích bị làm mờ kèm chú thích "Cần gắn minh chứng trước"; mục đã tích hiện biểu tượng link; mỗi link hiển thị tên miền; nhắc "đặt quyền ai có link đều xem được"; mở link bằng `target="_blank"` + `rel="noopener noreferrer"` |
| Giới hạn thật | Hệ thống chỉ bảo đảm **có link**, không bảo đảm link **thật/đúng**. Phải ghi rõ điều này trong giao diện nhóm trưởng và trong báo cáo |

#### D. Checklist
- `trong_so`: số > 0, ≤ 10, tối đa 2 số lẻ.
- **Mục đã tích không xóa được**: nhóm trưởng/phó phải bỏ tích (ghi lý do, nhật ký) rồi mới xóa. Đổi `trong_so` của mục đã tích thì được nhưng hiện cảnh báo "sẽ đổi % của mọi người" và ghi nhật ký.
- Không xóa được mục cuối cùng của task đã giao (task phải luôn có ≥ 1 mục).
- Mục đề xuất bị từ chối: ghi lý do, người đề xuất xem được; mục chờ duyệt không tính vào tiến độ.
- Thêm mục vào task đang `cho_duyet`/`hoan_thanh`: chặn, phải trả lại/mở lại trước (tránh duyệt xong tiến độ lại tụt).
- Tiến độ lưu sẵn ở `tasks.tien_do` do hàm cập nhật mỗi lần tích/bỏ tích, vì người ngoài task không đọc được checklist (mục J).

#### E. Chuyển giao và hủy: trường hợp hiếm
| Trường hợp | Quy tắc |
|---|---|
| Chuyển khi task `cho_duyet`/`hoan_thanh` | Chặn; phải trả lại/mở lại trước |
| Xin chuyển giao | Chỉ người được giao (chính/hỗ trợ) khi task `dang_lam`; lý do ≥ 10 ký tự; một yêu cầu đang chờ mỗi người mỗi task (`unique` chống bấm đúp); chặn khi `cho_duyet`/`hoan_thanh`/`da_huy` hoặc công việc `luu_tru` (8.8) |
| Có yêu cầu chờ mà nhóm trưởng chuyển giao/gỡ/hủy task | Yêu cầu tự đóng (`da_chuyen`, hoặc đóng theo task); người xin được thông báo |
| Người xin rời nhóm khi yêu cầu còn chờ | Giữ nguyên yêu cầu; nhóm trưởng xử lý như "người làm đã rời" (phải chuyển) |
| Chuyển cho chính mình, cho người `da_roi`, hoặc người ngoài công việc | Chặn |
| B đã là người hỗ trợ của task | **Nâng vai trò** (không tạo dòng trùng), vẫn ghi một dòng `task_chuyen_giao` |
| Chuyển chuỗi A→B→C | Cho phép. Mỗi lần chuyển có **loại chuyển riêng** và tính điểm riêng cho người bị chuyển đi; mỗi lần là một dòng riêng trong `task_chuyen_giao` (A→B→A ra hai dòng đúng thứ tự) |
| Loại chuyển | **Bắt buộc chọn** (`khach_quan` hoặc `chua_kip`), không có mặc định. Chọn nhầm thì nhóm trưởng/phó được **sửa loại** trước khi chốt sổ, có lý do và ghi nhật ký; dòng chuyển hiện cờ "đã sửa loại" |
| Chuyển người hỗ trợ | Không dùng chuyển giao: dùng **gỡ** người hỗ trợ (đóng góp cũ vẫn giữ) |
| Người làm đã rời nhóm khi task dở | Task hiện nhãn "người làm đã rời"; **không tự chuyển**; nhóm trưởng phải chuyển. Người rời khi còn task dở được cảnh báo, nhóm trưởng được thông báo |
| Hạn chót khi chuyển | Có thể đặt lại, bắt buộc ghi lý do. Điểm "đúng hạn" của B tính theo **hạn đang có hiệu lực lúc duyệt hoàn thành**. Mọi lần đổi hạn đều ghi nhật ký (chống chỉnh hạn để né trễ) |
| Hủy rồi hóa ra hủy nhầm | **Khôi phục** về trạng thái trước hủy (mục B) |
| Hủy/chuyển sau khi đã chốt sổ | Không làm được (công việc chỉ đọc); phải mở lại công việc |

#### F. Tài khoản, thành viên, quyền
- Một tài khoản Google ↔ một `profiles`. Nhận người dùng theo **`user_id`**, không theo email (đổi email Google không mất tài khoản).
- Mỗi công việc: một `user_id` chỉ có **một dòng `members`** (`unique(project_id, user_id)`). Thay thế tài khoản sang tài khoản **đã là thành viên khác** của cùng công việc: chặn.
- Hồ sơ phải điền đủ 3 ô mới vào được công việc. Họ tên 2-100 ký tự; `ma_dinh_danh` 3-30 ký tự chữ/số, tự cắt khoảng trắng và viết hoa khi lưu/so trùng.
- Người dùng tự sửa `ma_dinh_danh`: được, nhưng **mọi lần sửa ghi nhật ký (cũ → mới)** và nhóm trưởng/phó thấy cảnh báo (chống đổi mã để né gộp thống kê).
- Yêu cầu tham gia: một người chỉ có **một yêu cầu đang chờ** mỗi công việc; người đang `dang_tham_gia` không gửi được; người `da_roi` gửi thì nhóm trưởng thấy "từng ở nhóm, còn N task dở" kèm nút khôi phục dòng cũ (người `bi_loai` thì hiện thêm "từng bị loại N lần"); bị từ chối **3 lần** thì bị chặn: nhập đúng mã cũng không gửi được yêu cầu (đã chốt; **đề xuất: tính chung với số lần bị loại**, mục 7.2); chỉ nhóm trưởng/phó mời lại trực tiếp mới vào được.
- **Mã tham gia**: ngẫu nhiên ≥ 8 ký tự, bỏ ký tự dễ nhầm (0/O, 1/l/I), không phân biệt hoa thường, duy nhất toàn hệ thống. Nhập sai quá 5 lần/10 phút/tài khoản thì tạm khóa. Báo lỗi chung "mã không đúng hoặc đã tắt", không tiết lộ mã có tồn tại hay không. Đổi/tắt mã không ảnh hưởng người đã vào.
- `max_members` tính theo `dang_tham_gia`; **kiểm tra lại lúc duyệt** (không chỉ lúc nhập mã). Hạ `max_members` xuống thấp hơn số đang có: chặn.
- **Nhóm trưởng cuối cùng**: không rời, không bị hạ vai trò, không bị gỡ. Chuyển quyền chỉ cho người `dang_tham_gia`.
- Phó nhóm **không** đổi/gỡ vai trò của nhóm trưởng và không chuyển quyền nhóm trưởng (tránh phó chiếm quyền). Phó cũng **không loại** nhóm trưởng hay phó khác; chỉ nhóm trưởng loại được phó (mục 7.2).
- **Không tự duyệt**: nhóm trưởng/phó không duyệt hoàn thành hay duyệt minh chứng của task mà **chính mình là người được giao**; phải do người có quyền khác duyệt. Nếu công việc chỉ có một người có quyền thì được tự duyệt nhưng **gắn nhãn "tự duyệt"** trong báo cáo.
- Công việc chỉ có 1 người (chỉ nhóm trưởng): hệ thống vẫn chạy bình thường; chia cho 0 được xử lý ở mục G.

#### G. Điểm và thống kê
- **Chia cho 0**: không có mục kế hoạch hoặc 0 thành viên → thành phần A "không áp dụng"; không có task `chinh` được giao → "chưa được giao việc"; không task nào có hạn chót → bỏ thành phần C; chia lại trọng số theo 10.1.
- Làm tròn **chỉ ở bước cuối** (điểm 2 số thập phân), không làm tròn từng thành phần.
- Phân biệt rõ 3 trạng thái trong báo cáo: **chưa được giao việc** / **được giao nhưng chưa làm** / **đã làm**.
- Điều chỉnh điểm: trong khoảng 0.00-10.00, lý do ≥ 10 ký tự, không tự chỉnh mình. Người ngang quyền chỉnh được cho nhau; nhóm trưởng được chỉnh bởi **phó**; nếu không có phó thì điểm nhóm trưởng **không ai chỉnh được** và ghi chú để giáo viên quyết.
- Chỉnh tay % task chỉ làm được khi task đã có ≥ 1 mục tích; tổng luôn 100.00 (8.4).
- **B và C chỉ tính task mà người đó là `chinh`**; task `ho_tro` chỉ đóng góp vào A (vì người hỗ trợ không chịu trách nhiệm hoàn thành).
- **Số thành viên để tính `F`** = thành viên đang tham gia lúc chốt + người đã rời nhưng có đóng góp/có task. Người bị loại đã bị xóa tiến độ thì không còn đóng góp nên không đếm; cùng một `ma_dinh_danh` chỉ đếm **một lần** (tránh một người bị đếm hai chỗ khi có tài khoản mới). Người vào muộn không được điều chỉnh tự động: nhóm trưởng chỉnh điểm kèm lý do. Ghi rõ hạn chế này trong báo cáo.
- Khi **chốt sổ**: số liệu đóng băng; đổi tài khoản/trọng số sau đó không làm đổi báo cáo cũ.

#### H. Lưu trữ, chốt sổ, mở lại
- "Kết thúc công việc": cảnh báo mọi task chưa xong, task `cho_duyet` chưa xử lý, task của người đã rời chưa chuyển, link bị từ chối. Mọi cảnh báo được **ghi vào báo cáo**.
- Chốt sổ chạy trong **một transaction**; lỗi thì công việc vẫn `dang_hoat_dong`. `unique(project_id, lan_chot)` chống bấm đúp tạo hai lần chốt.
- Khi lưu trữ: yêu cầu tham gia đang chờ tự thành `het_han` (**không** tính vào 3 lần cấm), mã vô hiệu, thông báo cho mọi người; chỉ còn cho **đọc** và **đánh dấu thông báo đã đọc**.
- Mở lại: chỉ nhóm trưởng; **chặn nếu đang đủ 10 công việc hoạt động** (báo "hãy lưu trữ công việc khác"); mã tham gia **không tự bật lại**; lần kết thúc sau tạo lần chốt mới.
- Giới hạn 10 công việc kiểm tra bằng hàm có khóa, hai người tạo cùng lúc không vượt giới hạn.

#### I. Thông báo
- Ghi cùng transaction với hành động (không có chuyện hành động xong mà thiếu thông báo).
- Gửi tới `member_id` nên đổi tài khoản vẫn giữ. Người `da_roi` không nhận thông báo mới (trừ lời mời quay lại), vẫn đọc được thông báo cũ.
- Giữ lại hết (dữ liệu rất nhẹ); giao diện chỉ hiện 50 cái gần nhất kèm "xem thêm".

#### J. Bảo mật dữ liệu
- **RLS giấu theo hàng, không giấu được theo cột.** Vì vậy `ma_dinh_danh` phải nằm **bảng riêng** `profile_rieng` (chỉ chính chủ + nhóm trưởng/phó công việc liên quan đọc), còn `profiles` chỉ chứa họ tên, đơn vị. Không để chung một bảng rồi hy vọng giao diện ẩn cột.
- `task_details`, `task_checklist`, `task_links`, `task_votes` cùng quy tắc: **chỉ người được giao + nhóm trưởng/phó đọc** (task chưa giao: cả nhóm đọc để bình chọn; `task_votes` thì thành viên thường chỉ thấy số phiếu). Người ngoài chỉ thấy "vỏ" ở `tasks`.
- `activity_log` **không chứa tiêu đề hay nội dung chi tiết** task, chỉ id và hành động. Nhóm trưởng/phó xem tất cả; thành viên xem log task của mình.
- `task_yeu_cau`: **chỉ người xin + nhóm trưởng/phó đọc** (lý do có thể là chuyện riêng như ốm). Thành viên khác, kể cả người cùng task, không thấy; `activity_log` chỉ ghi id và hành động, không chép nội dung lý do.
- `task_chuyen_giao`: đọc theo quy tắc của `task_details` (người được giao kể cả người đã bị chuyển đi + nhóm trưởng/phó), riêng cột `ly_do` **chỉ nhóm trưởng/phó** đọc. **Không có quyền update/delete cho ai**, client không insert trực tiếp, chỉ hàm chuyển giao ghi (ngoại lệ duy nhất: hàm sửa loại, 8.9).
- `activity_log`: không có quyền `update/delete` (kể cả cho nhóm trưởng); client **không được insert trực tiếp**, chỉ hàm database ghi (chống làm giả nhật ký).
- Người bị gỡ/rời nhóm **mất quyền ngay** vì RLS kiểm tra `members.trang_thai` ở mỗi truy vấn, không chờ token hết hạn.
- Khóa `anon` công khai là bình thường vì an toàn nhờ RLS; khóa `service_role` chỉ ở GitHub Secrets (mục 10.2). **Chưa bật Realtime** ở bản đầu (tránh lộ kênh dữ liệu). **Khi tạo project Supabase (đã chọn):** giữ bật *API dữ liệu*; **tắt** *Tự động hiển thị các bảng mới* (mỗi bảng và hàm phải `grant` thủ công đúng vai trò, nên SQL phải có sẵn các câu `grant`); **bật** *RLS tự động* (lưới an toàn nếu quên bật RLS ở bảng mới).

#### K. Vận hành và lỗi mạng
- Supabase tạm dừng hoặc mất mạng: giao diện hiện thông báo lỗi dễ hiểu và nút thử lại, **không trắng trang**.
- Nút bấm khóa trong lúc đang gửi; vì mọi thao tác là hàm database nên không bao giờ ở trạng thái nửa vời.
- Cron giữ không ngủ (mục 11) cần kiểm tra thỉnh thoảng; dịp nghỉ lễ dài phải xem lại.

#### L. Kịch bản kiểm thử bắt buộc (làm trước khi dùng thật, dùng 1 nhóm trưởng + 2 thành viên thường + 1 người lạ)
1. Người lạ (đã đăng nhập, chưa có mã) gọi thẳng API: không thấy gì.
2. Thành viên B gọi thẳng API đọc `task_details`, `task_checklist`, `task_links` của task giao cho A: bị chặn. B đọc `ma_dinh_danh` của A: bị chặn.
3. Tích mục chưa có link (cả qua giao diện lẫn gọi thẳng): bị chặn. Tích bằng link của người khác: bị chặn.
4. Link `http://`, `javascript:`, có khoảng trắng, dài > 2000: bị từ chối.
5. Hai tab cùng tích một mục cùng lúc: chỉ một bên thành công, bên kia nhận báo "tải lại".
6. Sửa/xóa/chèn vào `activity_log` bằng tài khoản nhóm trưởng: bị chặn.
7. Thao tác trên task `da_huy`, task `hoan_thanh`, công việc `luu_tru`: bị chặn đúng như mục B.
8. Chuyển task A→B loại 1 và loại 2: điểm A đúng như 8.7-B; `nguoi_hoan_thanh` các mục cũ vẫn là A.
9. Hai người nhập mã cùng lúc khi còn 1 chỗ: chỉ một người vào danh sách chờ được duyệt (kiểm tra lại lúc duyệt).
10. Nhóm trưởng cuối cùng thử rời nhóm/tự hạ vai trò: bị chặn.
11. Tạo công việc thứ 11: bị chặn; hai người tạo cùng lúc công việc thứ 10: chỉ một thành công.
12. Chốt sổ rồi đổi tài khoản/trọng số: báo cáo cũ không đổi. Bấm chốt hai lần liên tiếp: chỉ có một lần chốt.
13. A làm dở 60% bấm "Xin chuyển giao" (không tích đủ): thành công, task vẫn `dang_lam`. Gọi thẳng API "Gửi duyệt" khi chưa tích hết: bị chặn. Thành viên khác đọc `task_yeu_cau` của A: bị chặn. Xin khi task `cho_duyet`: bị chặn; bấm đúp: chỉ một yêu cầu. Nhóm trưởng chuyển giao: yêu cầu thành `da_chuyen`, % của A và B đúng như 8.7-B.
14. Chuyển A→B rồi B→A: `task_chuyen_giao` có đúng 2 dòng, đúng người, đúng thứ tự, giờ server. Nhóm trưởng sửa/xóa một dòng: bị chặn. Người ngoài task đọc bảng: bị chặn. Thành viên (không phải nhóm trưởng/phó) đọc `ly_do`: bị chặn. Sửa loại chuyển: dòng hiện cờ "đã sửa loại" và `activity_log` có cũ→mới.
15. Người lạ trong phòng chờ không thấy gì. Trưởng và phó cùng bấm "Cho vào": chỉ một lần thành công. Người mới chưa có task: hiện nhãn "Chưa nhận việc" và dải cảnh báo, mất khi được giao task. Loại người đang làm dở 60%: *Hủy bỏ* thì không đổi gì; *Vẫn loại bỏ* thì bỏ tick phần người đó, task về `can_lam` kèm cảnh báo, nhật ký và link còn nguyên; *Chỉ kick* thì % giữ nguyên, task `dang_lam` có nhãn "chưa có người làm tiếp". Người mới tích bằng link của người bị loại: bị chặn. Loại 3 lần: nhập đúng mã vẫn bị chặn. Người bị loại gọi thẳng API đọc task: bị chặn ngay. Loại khi task `cho_duyet`: bị chặn. Phó loại nhóm trưởng, hoặc loại nhóm trưởng cuối: bị chặn. Sửa/xóa `loai_nguoi`: bị chặn.

## 12. Những thứ cố ý BỎ hoặc HOÃN (để giữ đơn giản)

- **Tự động xóa tài khoản không hoạt động sau 30 ngày**: bỏ. Với 10-20 người thì không cần, tài khoản trống không tốn gì, và chặn người lạ đã có mã công việc lo. Nếu sau này cần thì dùng `pg_cron` của Supabase.
- Vai trò "chỉ xem" cho giáo viên: **hoãn** đến khi hệ thống ổn.
- Thông báo đẩy/email, app điện thoại, chat trong app, bình luận realtime: **hoãn** (thông báo **trong app** thì có, mục 8.7).
- Nhắc việc tự động theo hạn chót: **hoãn**.
- Cho tải file lên: **hoãn** (dùng link tạm).
- Chạy model AI local: **không áp dụng** (máy yếu).

## 13. Câu hỏi còn mở và giả định chưa xác nhận

Đây là những điểm AI **đề xuất** nhưng người dùng **chưa chốt rõ**. Đừng coi là đã quyết, hãy hỏi lại khi liên quan.

1. ~~Cách tính % đóng góp~~ **Đã chốt** ở mục 8.4.
2. ~~Tiêu đề task ẩn hay hiện~~ **Đã chốt**: chỉ người được giao + nhóm trưởng/phó (mục 8.2).
3. ~~Ai tạo công việc~~ **Đã chốt**: chỉ nhóm trưởng (người có cờ `duoc_tao_cong_viec`) tạo công việc.
4. ~~Giới hạn 10 công việc~~ **Đã chốt**: tính **theo từng nhóm trưởng**, mỗi nhóm trưởng tối đa **10 công việc đang hoạt động** cùng lúc. Số task trong mỗi công việc không giới hạn cứng (chỉ giới hạn 30 mục checklist/task). Lưu trữ thì không tính vào 10.
5. ~~Framework giao diện~~ **Đã chốt**: React (Vite), JavaScript.
6. ~~Thành viên tự nhận task~~ **Đã chốt**: dùng công tắc bình chọn, nhóm trưởng/phó quyết định cuối (mục 8.5).
7. ~~Database~~ **Đã chốt**: Supabase (mục 3.1).
8. ~~Ai thấy bình chọn~~ **Đã chốt** (mục 8.5).
9. ~~Công thức điểm 10.00~~ **Đã chốt** (mục 10.1).
10. ~~Cách sao lưu tự động~~ **Đã chốt** (mục 10.2).
11. ~~Ai được thêm/sửa mục checklist~~ **Đã chốt** (mục 8.6).
12. ~~Hủy task và chuyển giao task~~ **Đã chốt** (mục 8.7), gồm hai loại chuyển (khách quan / chưa kịp) và cách tính điểm.
13. ~~Minh chứng bắt buộc để tích mục~~ **Đã chốt** (mục 11.1-C), gồm cả quy tắc: người tích phải là người đã tự gắn ít nhất một link của mục đó.
14. ~~Tiến độ theo số mục hay trọng số~~ **Đã chốt**: theo trọng số (mục 8.2).
15. ~~B và C chỉ tính task `chinh`~~ **Đã chốt** (mục 11.1-G): task `ho_tro` chỉ đóng góp vào A.
16. ~~Quy tắc vai trò bổ sung~~ **Đã chốt** (mục 11.1-F): phó không đổi/gỡ nhóm trưởng; không tự duyệt task của chính mình.
17. ~~Số thành viên tính `F`~~ **Đã chốt** (mục 11.1-G): người rời có đóng góp vẫn được đếm; người vào muộn thì nhóm trưởng chỉnh điểm tay kèm lý do.
18. ~~Bị từ chối quá 3 lần~~ **Đã chốt** (mục 11.1-F): người bị từ chối **3 lần** (cộng cả số lần bị loại, mục 7.2) trong một công việc thì dù công việc đang diễn ra và nhập đúng mã vẫn **không vào được** (hàm nhập mã chặn). Chỉ nhóm trưởng/phó mời lại trực tiếp mới vào được.
19. **Chi tiết "Xin chuyển giao" (mục 8.8) chưa xác nhận:** (a) người hỗ trợ cũng được xin, lối ra là gỡ (mặc định: có); (b) người xin không tự chọn loại chuyển (mặc định: không được); (c) lý do tối thiểu 10 ký tự. Hướng chính (gửi duyệt chỉ khi xong, làm dở thì xin chuyển giao) đã chốt.
20. **Chi tiết ghi vết chuyển người chính (mục 8.9) chưa xác nhận:** (a) lịch sử chỉ người được giao + nhóm trưởng/phó xem, người ngoài task không thấy (mặc định: đúng như vậy); (b) lý do chuyển chỉ nhóm trưởng/phó thấy (mặc định: đúng); (c) ghi vết chỉ cho việc chuyển người chính, không gồm gỡ người hỗ trợ (mặc định: đúng). Hướng chính (ghi ai chuyển cho ai, lúc nào) đã chốt.
21. ~~Chi tiết phòng chờ và loại thành viên~~ **Đã chốt** (mục 7.1, 7.2): mỗi lần bị loại tính 1 trong 3 lần cấm (cộng số lần bị từ chối, theo từng công việc); ba nút Hủy bỏ / Vẫn loại bỏ / Chỉ kick áp cho tất cả task đang làm của người đó; người chính bị loại thì task về Cần làm chỉ khi chọn Vẫn loại bỏ; phó không loại phó khác, chỉ nhóm trưởng loại được phó.

22. Hợp đồng API giao diện: phần schema và RPC ngoài các tên đã có trong code cũ chưa được đặc tả; không tự đặt tên. Cần người viết SQL cung cấp chữ ký hàm, kiểu tham số và kết quả để hoàn thiện các luồng thành viên/task/checklist/link/chuyển giao/bình chọn/báo cáo.

## 14. Nhật ký quyết định (đã chốt)

- **% đóng góp** (đã chốt): tính từ checklist có trọng số, tổng 100.00%, hiển thị 2 số thập phân, làm tròn phần dư lớn nhất; nhóm trưởng/phó thấy tất cả, mỗi người thấy của mình, người ngoài task chỉ thấy tên và tổng tiến độ; nhóm trưởng được chỉnh tay kèm lý do.
- **Task có thể 1 hoặc nhiều người** (đã chốt): mặc định 1 người, nhóm trưởng/phó tự thêm người hỗ trợ; có vai trò *chính* và *hỗ trợ*; ghi lại ai làm bao nhiêu % và thao tác lúc nào.
- **Minh chứng chỉ bằng link** (Google Drive...), không tải file/ảnh lên.
- **Checklist:** chỉ nhóm trưởng/phó thêm/sửa/xóa mục; thành viên chỉ đề xuất, chờ duyệt.
- **Chuyển giao: hai loại, đúng sự thật, không có chế độ không phạt** (đã chốt): (1) lý do khách quan → task loại khỏi mẫu số B của A; (2) chưa kịp tiến độ/hạn → tính là chưa hoàn thành của A. Cả hai giữ nguyên phần A đã làm ở thành phần đóng góp. Cách tính khi hủy task cũng đã chốt.
- **B và C chỉ tính task `chinh`; người tích mục phải tự gắn link của mình** (đã chốt).
- **Minh chứng bắt buộc để tích** (đã chốt): mỗi mục checklist phải có ≥ 1 link minh chứng gắn đúng mục mới tích được, database kiểm tra; chỉ bảo đảm *có link*, nhóm trưởng/phó kiểm tra *link đúng* khi duyệt.
- **Mọi thao tác ghi quan trọng qua hàm database; `ma_dinh_danh` tách bảng riêng; có kịch bản kiểm thử bắt buộc** (mục 11.1).
- **Ghi vết chuyển người chính** (người dùng yêu cầu, đã chốt hướng): mỗi lần chuyển giao ghi một dòng bất biến vào `task_chuyen_giao` (ai chuyển, A→B, lúc nào, tiến độ lúc chuyển, loại, lý do); hiện ở "Lịch sử người chính" trong chi tiết task; lý do chỉ nhóm trưởng/phó thấy; người ngoài task không thấy (mục 8.9).
- **Gửi duyệt chỉ để báo đã xong; làm dở thì "Xin chuyển giao"** (người dùng nêu, đã chốt hướng): gửi duyệt bắt buộc tích hết mục; người làm dở (vd ốm, mới 60%) xin chuyển giao kèm lý do, không cần đủ minh chứng cho phần chưa làm; nhóm trưởng/phó kiểm link phần đã làm rồi chuyển giao (8.7-B) hoặc từ chối; người xin không tự chọn loại chuyển; lý do để riêng tư (mục 8.8).
- **Phòng chờ và loại thành viên** (người dùng yêu cầu, đã chốt hướng): phòng chờ là `join_requests.cho_duyet`, nhóm trưởng/phó hỏi miệng rồi mới cho vào; vào xong "chưa nhận việc" kèm cảnh báo (suy ra, không thêm cột); loại 3 lần thì cấm; khi loại người đang làm task hiện hộp thoại ba nút *Hủy bỏ* / *Vẫn loại bỏ* (xóa tiến độ, task về Cần làm, cảnh báo không có ai làm) / *Chỉ kick* (giữ tiến độ, phải giao người khác làm tiếp); mỗi lần loại ghi bất biến vào `loai_nguoi`; ba nút áp cho mọi task đang làm của người đó; phó không loại phó khác, chỉ nhóm trưởng loại được phó (mục 7.1, 7.2).
- **Màn quản lý thành viên** (người dùng yêu cầu, đã chốt hướng): một màn trong màn 6 gồm phòng chờ, danh sách thành viên (tìm, lọc, menu Loại / Đổi vai trò), danh sách đã rời/bị loại với nút Mời lại; không thêm bảng mới (mục 7.3).
- **Hủy task** có hoạt động: hủy mềm + cảnh báo + bắt buộc lý do + thông báo người được giao. **Chuyển giao A→B**: cảnh báo + bắt buộc lý do + ghi vết; phần A đã làm vẫn tính cho A, B làm nốt phần còn lại.
- **Công thức điểm 10.00 và quyền xem điểm đã chốt** (mục 10.1); **sao lưu tự động theo mục 10.2 đã chốt**.
- **Mở lại công việc đã lưu trữ: chỉ nhóm trưởng**, có ghi nhật ký; mỗi lần kết thúc tạo lần chốt mới.
- **Báo cáo giáo viên: chi tiết** (ai được giao gì, làm gì, % tham gia, tổng % hoàn thành) kèm thang điểm 10.00 (công thức ở 10.1, chờ xác nhận).
- **Sao lưu:** nút xuất toàn bộ dữ liệu (đã chốt); sao lưu tự động theo mục 10.2 (đề xuất).
- **Database: Supabase** (người dùng thử lần đầu, AI hướng dẫn từng bước).
- **Hiển thị task:** tiêu đề và chi tiết chỉ người được giao (chính + hỗ trợ) và nhóm trưởng/phó xem; task chưa giao thì cả nhóm xem để bình chọn.
- **Bình chọn nhận task:** có công tắc bật/tắt; thành viên bình chọn, nhóm trưởng/phó quyết định cuối.
- **Giao diện:** React (Vite) + JavaScript.
- Đăng nhập **chỉ bằng Google**.
- Hồ sơ gồm **họ tên, mã định danh, đơn vị**; mã định danh dùng để đối chiếu và gộp thống kê; **không chặn trùng cứng**, chỉ cảnh báo.
- **Task gắn vào `members`** (chỗ ngồi), không gắn vào tài khoản; thay thế tài khoản bằng cách đổi `user_id`.
- Rời nhóm chỉ **đánh dấu**, không xóa.
- Quyền admin là **vai trò theo từng công việc**, kiểm soát bằng RLS; không có cổng admin riêng.
- Có **chuyển quyền nhóm trưởng** và **phó nhóm** cùng quyền.
- **Cờ `duoc_tao_cong_viec`** mặc định tắt.
- Thống kê cho giáo viên: **xuất CSV/PDF** (cách 1). Vai trò "chỉ xem" làm sau.
- **Tối đa 10 công việc đang hoạt động cho mỗi nhóm trưởng**, lưu trữ chứ không xóa. Chỉ nhóm trưởng tạo công việc. Tiến độ task tính theo trọng số. Phó không đổi/gỡ nhóm trưởng; không tự duyệt task của mình. Số thành viên tính `F`: người rời có đóng góp vẫn đếm, người vào muộn chỉnh điểm tay.
- Toàn bộ dùng **gói free**: Vercel + Supabase.
- **Chưa viết code hay SQL**; hai bên đang bàn kỹ thiết kế trước.

## 15. Trạng thái hiện tại (cập nhật 12/11/2026)

- [x] Đã sửa 4 mục client: import App.css đúng hoa/thường và rà soát import; giữ thông báo lỗi Supabase; giới hạn tên công việc 100 ký tự và số thành viên 1–100; định dạng mã bằng Prettier.

- [x] Khung React/Vite được tổ chức theo client/src: api, hooks, pages, components, lib và styles.
- [x] Hoàn thiện giao diện Google OAuth, hồ sơ, dự án, tạo/giao task, Kanban, chi tiết task, checklist/minh chứng, chuyển giao, quản lý thành viên/phòng chờ, thông báo, task đã hủy, báo cáo và CSV.
- [x] Nối các API với RPC/bảng đã khai báo trong migrations 04–07; mọi truy vấn đọc chỉ định cột và ghi nghiệp vụ qua RPC. Hợp đồng API tại HOP_DONG_API.md.
- [x] Đã viết migrations `supabase/04_task_schema.sql` đến `supabase/07_reports_archive.sql`; giữ nguyên 01–03. `clay.css` vẫn để trống theo yêu cầu.
- [x] Bổ sung bản vá nghiệp vụ `supabase/08_business_logic.sql`: đổi trọng số A/B/C qua RPC; xử lý yêu cầu rời của người hỗ trợ bằng cách gỡ đúng người; chuyển quyền nhóm trưởng nguyên tử; khóa ghi dữ liệu khi đã lưu trữ; thu hồi quyền gọi trực tiếp các hàm trigger nội bộ. Bổ sung API cho chỉnh checklist/link/chuyển giao và cập nhật màn quản lý tương ứng.
- [x] Rà soát và vá luồng checklist (tính lại tiến độ, không gỡ tick của người khác), phân quyền danh tính/đóng góp, tạo task kèm giao người chính nguyên tử, mở lại task, cài đặt công việc, hạn chót khi chuyển giao và snapshot báo cáo có cảnh báo/điểm chốt. Cập nhật SQL 01–03 và migration 08 tương thích với DB đã chạy 01–07.
- [x] Rà soát bổ sung: giữ được người chính đã rời nhóm để quản lý chuyển tiếp task; khóa link ở task đã khóa; giới hạn nhóm theo trưởng nhóm hiện tại; chặn quá chỗ khi duyệt/mời lại; ghi lịch sử đổi hạn; điều chỉnh tỷ lệ đóng góp qua màn task với kiểm tra đủ người và tổng 100%. Các bản vá SQL đang ở migration 08 và cần chạy lại trên Supabase.
- [x] Cài đặt lucide-react và @dnd-kit/* theo yêu cầu. src/styles/clay.css còn trống.
- [ ] Google OAuth triển khai, deploy, cron và sao lưu thủ công chưa hoàn tất.

**Kiểm tra:** `npm run build`, `npm run lint` và `git diff --check` tại `client/` chạy thành công. Build có cảnh báo bundle JS khoảng 517 kB (>500 kB); lint không báo lỗi. Đã xác nhận read-only trên Supabase: RPC/cột của migration 08 hiện diện, hạn cũ được giữ khi chuyển giao, snapshot lưu cảnh báo. DB có 1 project, 1 thành viên, 0 task nên chưa kiểm thử luồng task đầu-cuối trên dữ liệu thật. Không chạy lại migration.

**Trạng thái chạy:** app chưa thể xác nhận đầy đủ vì migration 08 chưa được người dùng chạy trên Supabase; chạy lần lượt `supabase/01_ho_so.sql` đến `supabase/08_business_logic.sql` khi sẵn sàng. Snapshot chốt sổ lưu JSONB trong `chot_so.du_lieu` (migrations 04/07). Đây chưa phải xác nhận toàn bộ yêu cầu nghiệp vụ đã được kiểm thử end-to-end; cần rà soát/kiểm tra các luồng trên môi trường sau khi áp SQL.

**Lưu ý bàn giao:** repository Git chưa được khởi tạo ở thư mục này; không có commit. .gitignore đã chứa .env.local và node_modules.
---

## 16. Thiết kế giao diện (phong cách Claymorphism)

**Đã chốt (người dùng): tươi sáng nhiều màu, icon Lucide, font do AI chọn (Nunito).**

**Design Read:** công cụ làm việc nhóm, người dùng 18-55 tuổi, **máy tính là chính** (nhóm trưởng/phó gần như chỉ dùng máy tính, thành viên chạy deadline trên máy tính), **điện thoại chủ yếu để xem** (task được giao, tiến độ, bình luận, thông báo). Phong cách: **Claymorphism** (khối mềm như đất sét, theo bài của hype4.academy), tiết chế để vẫn nghiêm túc và dễ đọc. Giao diện luôn sáng, không làm chế độ tối.

### 16.1 Tám màn hình (người dùng đã đồng ý khung, bổ sung sau)
1. Đăng nhập + hồ sơ lần đầu. 2. Nhập mã / chờ duyệt. 3. Danh sách công việc. 4. Bảng Kanban. 5. Chi tiết task (màn quan trọng nhất). 6. Màn nhóm trưởng/phó (phòng chờ, quản lý thành viên, duyệt, giao việc, bình chọn, hủy, chuyển giao). 7. Thống kê và báo cáo. 8. Chuông thông báo + "Task đã hủy".

| Thiết bị | Ưu tiên |
|---|---|
| **Máy tính (≥ 1024px)** | Tối ưu đầy đủ mọi màn. Kanban 4 cột, thanh bên trái, bảng thống kê |
| **Điện thoại (< 768px)** | Tối ưu **màn 3, 4, 5, 8** cho thành viên: mở là thấy "Việc của tôi" trước. Menu dưới đáy 3 mục: *Việc của tôi / Công việc / Thông báo*. Kanban đổi thành **chuyển tab theo cột**, không kéo thả |
| Màn 6, 7 trên điện thoại | Vẫn dùng được nhưng không tối ưu; hiện dòng nhắc "nên dùng máy tính" |

- **Kéo thả chỉ dành cho máy tính**; mọi thẻ có thêm nút/menu "Chuyển sang..." để dùng bằng bàn phím và điện thoại (`dnd-kit` có bộ cảm biến bàn phím).
- Vùng bấm trên điện thoại ≥ 44px, khoảng cách giữa các nút ≥ 8px.

### 16.2 Quy tắc phong cách (để mọi AI làm giống nhau)
1. **"Đất sét cho khung, phẳng cho nội dung".** Chỉ khối ngoài (thẻ, nút, tab, hộp thoại, ô nhập, chip) có hiệu ứng clay. Bên trong chỗ dày chữ (hàng checklist, bảng, bình luận) để **phẳng**, ngăn cách bằng đường mảnh. Không lồng clay trong clay quá 1 tầng (nếu không sẽ rối và chậm).
2. **Công thức clay** = một bóng ngoài lớn lệch nhẹ + hai bóng trong (sáng góc trên-trái, tối góc dưới-phải). Bo góc lớn (thẻ 24px, nút 16px, chip tròn hoàn toàn). Không viền dày.
3. **Tươi sáng, nhiều màu (người dùng chọn), nhưng mỗi màu có nghĩa**: **một màu chính tím** cho nút chính và mục đang chọn (mỗi màn tối đa 2 chỗ); các màu pastel tươi còn lại **chỉ dùng cho trạng thái** (chip, và nền nhạt của thẻ). Màu không dùng để trang trí.
4. **Không chỉ dùng màu để báo trạng thái**: chip luôn có **chữ + biểu tượng** (ví dụ "Quá hạn" + biểu tượng đồng hồ).
5. **Biểu tượng: Lucide** (đã chốt; trong React dùng `lucide-react`), kích thước 16-20px, **không dùng emoji** làm biểu tượng.
6. **Chuyển động**: chỉ có hiệu ứng nhấn nút lún xuống (150ms) và nảy nhẹ khi tích hoàn thành (200ms). Chỉ animate `transform`/`opacity` và chỉ trên phần tử đang thao tác. Tôn trọng `prefers-reduced-motion`.
7. Mọi bề mặt có đủ **5 trạng thái**: đang tải (khung xương), rỗng (câu giải thích + nút hành động), lỗi (nói rõ chuyện gì + nút thử lại, giữ nội dung đã nhập), có dữ liệu, trường hợp cực đoan (tiêu đề rất dài, không có ảnh đại diện, 100+ thẻ).
8. Bài viết gốc cảnh báo clay dễ **trông trẻ con**; cách chữa là chữ tối giản, màu nhấn mạnh, tương phản tốt. Làm đúng như vậy.

### 16.3 Chữ
- **Nunito** (một họ chữ, tròn trịa hợp clay, có bộ ký tự tiếng Việt), nạp từ Google Fonts với `display=swap`, fallback `"Be Vietnam Pro", system-ui, sans-serif`. Tiêu đề đậm 800, nội dung 400-600. **Phải thử hiển thị dấu tiếng Việt** (ặ, ữ, ợ...) khi làm, nếu lỗi thì đổi sang Be Vietnam Pro.
- Cỡ: H1 28 / H2 22 / H3 18 / nội dung 16 / chú thích 14 (không nhỏ hơn 14). Dòng cao 1.5 (tiêu đề 1.3) để dấu không bị cắt. Số %, điểm dùng `font-variant-numeric: tabular-nums`.

### 16.4 Màu và bóng (token CSS, đặt tên theo mục đích; tương phản đã kiểm tra bằng tính toán)

```css
:root{
  --bg:#FAFAFF;  --surface:#FFFFFF;  --fg:#2E1065;  --muted:#5B4B7A;      /* nền trắng sáng; chữ ≥ 13:1, chữ phụ ≥ 7:1 */
  --primary:#7C3AED; --on-primary:#FFFFFF;                                /* 5.7:1 */
  --edge:#7A5FB0;  --rule:#DDD0F5;                                        /* viền ô nhập/checkbox ≥ 4.5:1 */
  --radius-card:24px; --radius-btn:16px;
  --clay: 8px 10px 22px rgba(76,29,149,.12),
          inset 4px 4px 8px #fff,
          inset -4px -4px 10px rgba(76,29,149,.07);
  --clay-pressed: 3px 4px 8px rgba(76,29,149,.18),
          inset 3px 3px 8px rgba(76,29,149,.14);
  --focus: 0 0 0 3px var(--bg), 0 0 0 6px var(--primary);                  /* vòng focus luôn thấy được */
}
```
| Trạng thái | Màu chip (nền / chữ) | Tương phản | Biểu tượng Lucide | Nền thẻ (nhạt) |
|---|---|---|---|---|
| Cần làm | xanh da trời #BAE6FD / #0C4A6E | 7.1 | `circle` | mặc định |
| Đang làm | vàng #FEF08A / #713F12 | 7.5 | `loader` | #FEFCE8 |
| Chờ duyệt | cam đào #FED7AA / #7C2D12 | 6.9 | `eye` | #FFF7ED |
| Hoàn thành | xanh bạc hà #BBF7D0 / #14532D | 7.5 | `circle-check` | #F0FDF4 |
| Quá hạn | hồng #FECDD3 / #881337 | 6.8 | `alarm-clock` | #FFF1F2 |
| Đã hủy | tím nhạt #E9D5FF / #581C87 | 8.0 | `circle-x` | mặc định |

- **Luôn nền trắng sáng, không có chế độ tối** (người dùng chọn). Phải đặt `color-scheme: light` và **không** dùng `prefers-color-scheme: dark`, để máy đang bật chế độ tối cũng không bị đổi màu.
- Bản xem trước bấm thử được: tệp `clay-preview.html` (cùng thư mục với file này).

### 16.5 Các thành phần chính
- **Thẻ task (Kanban):** clay; tên người được giao + thanh tiến độ + chip trạng thái + nhãn hạn. Task của người khác **không hiện tiêu đề** (đúng luật mục 8.2), chỉ "Giao cho A, 40%".
- **Thanh tiến độ:** rãnh lõm (bóng trong), phần đã đầy nổi lên màu nhấn; luôn kèm số % bằng chữ.
- **Hàng checklist** (phẳng): ô tích bên trái. **Chưa có link minh chứng thì ô tích bị mờ**, kèm dòng nhỏ "Cần gắn minh chứng trước"; bấm vào dòng đó mở ô dán link. Có link rồi thì ô tích sáng lên, bên phải hiện chip tên miền của link.
- **Hộp thoại hủy/chuyển giao:** cảnh báo nêu rõ ai đang làm, % bao nhiêu, mục nào đã tích; ô lý do bắt buộc; nút xác nhận chỉ bật khi đã nhập lý do; với chuyển giao có hai lựa chọn loại chuyển, **không chọn sẵn**.
- **Màn duyệt của nhóm trưởng:** mỗi mục đã tích hiện link kèm tên miền và nút "Mở link"; cảnh báo nếu một link dùng cho nhiều mục (mục 11.1-C).
- **Nút "Xin chuyển giao"** (thành viên, trong chi tiết task đang làm): ô lý do bắt buộc, dòng nhắc "Phần chưa làm sẽ giao cho người khác; phần đã tích kèm link vẫn tính cho bạn". **Nút "Gửi duyệt"** bị mờ cho đến khi tích hết mục. Màn nhóm trưởng/phó có hàng đợi **"Yêu cầu chuyển giao"**: lý do, %, các link đã tích, nút *Chuyển giao* / *Từ chối*.
- **"Lịch sử người chính"** trong chi tiết task: dòng thời gian dọc, mỗi dòng có giờ, "A → B", tiến độ lúc chuyển, loại chuyển, tên người quyết định. Chỉ hiện với người được giao và nhóm trưởng/phó; lý do chỉ nhóm trưởng/phó thấy. Thẻ Kanban của nhóm trưởng/phó có nhãn nhỏ "Đã chuyển N lần".
- **Phòng chờ** (màn 6): danh sách người chờ với tên, email, mã định danh, đơn vị, cảnh báo trùng mã / "từng bị loại N lần"; ba nút *Cho vào* / *Thay thế người cũ* / *Từ chối*. Dải cảnh báo "N thành viên chưa nhận việc". **Hộp thoại loại thành viên**: nêu rõ task đang làm và %, lý do bắt buộc, ba nút *Hủy bỏ* / *Vẫn loại bỏ* / *Chỉ kick* (không nút nào chọn sẵn); sau khi loại hiện nhãn "chưa có người" hoặc "chưa có người làm tiếp" trên thẻ task.
- **Chuông thông báo:** chấm số chưa đọc (chữ số, không chỉ chấm màu); danh sách 50 cái gần nhất.

### 16.6 Cách làm cho gọn (ponytail)
- Một file `clay.css` với các biến trên, **CSS thuần**, không thêm thư viện giao diện. Chỉ dùng thêm `lucide-react` (biểu tượng) và `dnd-kit` (đã chọn).
- Chỉ làm chế độ sáng; **không làm chế độ tối**.
- Kiểm tra trước khi coi là xong: tương phản chữ ≥ 4.5:1, vòng focus thấy rõ khi bấm Tab, thử ở 375 / 768 / 1024 / 1440px, thử `prefers-reduced-motion`, thử task tiêu đề 200 ký tự và cột 100 thẻ.
