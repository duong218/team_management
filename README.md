# Ocean and Gem — Quản lý tiến độ công việc nhóm

Ứng dụng web giúp một nhóm tạo công việc, giao và theo dõi nhiệm vụ theo Kanban, phối hợp qua checklist và bình luận, xử lý chuyển giao, rồi tổng hợp báo cáo. Giao diện viết bằng React và Vite; dữ liệu, đăng nhập và phân quyền được xử lý bằng Supabase.

> **Tình trạng:** mã nguồn và các migration đã có trong repository. Để chạy được với dữ liệu thật, cần cấu hình Supabase, bật Google OAuth và áp dụng các migration theo đúng thứ tự bên dưới. README này không chứa URL hay khóa của dự án Supabase thật.

## Mục lục

- [Chức năng](#chức-năng)
- [Công nghệ](#công-nghệ)
- [Cấu trúc repository](#cấu-trúc-repository)
- [Yêu cầu](#yêu-cầu)
- [Chạy ở máy cá nhân](#chạy-ở-máy-cá-nhân)
- [Thiết lập Supabase](#thiết-lập-supabase)
- [Deploy lên Vercel](#deploy-lên-vercel)
- [GitHub Actions giữ kết nối Supabase](#github-actions-giữ-kết-nối-supabase)
- [Lệnh phát triển](#lệnh-phát-triển)
- [Bảo mật và dữ liệu](#bảo-mật-và-dữ-liệu)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)
- [Tài liệu liên quan](#tài-liệu-liên-quan)

## Chức năng

- Đăng nhập bằng Google OAuth; tạo hồ sơ với họ tên, mã định danh và đơn vị.
- Tạo công việc nhóm, tham gia bằng mã và chờ trưởng/phó nhóm duyệt.
- Theo dõi nhiệm vụ trên bảng Kanban; giao người chính/người hỗ trợ, đặt hạn chót theo ngày giờ và cập nhật tiến độ.
- Quản lý checklist có trọng số, đề xuất mục checklist, đính kèm liên kết minh chứng và bình luận theo từng tin nhắn.
- Gửi nhiệm vụ chờ duyệt, trả lại để làm tiếp, hoàn thành, hủy hoặc mở lại nhiệm vụ.
- Xin và xử lý chuyển giao; lưu lịch sử người phụ trách và tiến độ.
- Quản lý thành viên, vai trò, yêu cầu tham gia, biểu quyết và thông báo.
- Xem báo cáo, điều chỉnh điểm/đóng góp, kết thúc và lưu trữ công việc; tra cứu lịch sử và tải báo cáo CSV.
- Kiểm soát quyền truy cập ở cơ sở dữ liệu bằng Row Level Security (RLS) và các hàm RPC nghiệp vụ.

Tên trạng thái và quyền cụ thể được thực thi tại Supabase. Không nên dựa vào việc ẩn một nút trên giao diện như một cơ chế phân quyền.

## Công nghệ

- **Frontend:** React 19, Vite 8, JavaScript (ES modules), CSS.
- **Dữ liệu và xác thực:** Supabase Auth, Postgres, RLS, RPC; thư viện `@supabase/supabase-js`.
- **Giao diện:** `lucide-react`; kéo thả Kanban bằng `@dnd-kit`.
- **Báo cáo bảng tính:** `exceljs`.
- **Triển khai frontend:** Vercel (hoặc máy chủ static có hỗ trợ SPA fallback và header bảo mật).
- **Keepalive tùy chọn:** GitHub Actions gọi RPC kiểm tra kết nối mỗi ngày.

## Cấu trúc repository

```text
.
├── .github/workflows/supabase-keepalive.yml  # GitHub Actions giữ kết nối (tùy chọn)
├── client/                                   # Ứng dụng React/Vite
│   ├── public/                               # Tài nguyên tĩnh
│   ├── src/
│   │   ├── api/                              # Truy vấn Supabase và lời gọi RPC
│   │   ├── components/                       # Thành phần giao diện
│   │   ├── hooks/                            # Hooks xác thực, task, nhóm...
│   │   ├── lib/                              # Tiện ích, định dạng, kiểm tra dữ liệu
│   │   ├── pages/                            # Các màn hình
│   │   └── styles/                           # CSS theo màn hình/thành phần
│   ├── .env.example                          # Mẫu biến môi trường, không có thông tin thật
│   ├── vercel.json                           # Header bảo mật cho Vercel
│   └── package.json
├── scripts/supabase-keepalive.mjs            # Script ping Supabase
├── supabase/                                 # Các migration SQL (01–27)
├── HOP_DONG_API.md                           # Hợp đồng giữa frontend và RPC/bảng
└── he-thong-quan-ly-app.md                   # Đặc tả và ghi chú nghiệp vụ
```

## Yêu cầu

- Node.js **22** được khuyến nghị (workflow keepalive dùng Node 22); npm đi kèm Node.js.
- Tài khoản Supabase và một Supabase project.
- Tài khoản Google Cloud nếu bật đăng nhập Google OAuth.
- Tài khoản Vercel để deploy; GitHub nếu dùng workflow keepalive.

Chạy các lệnh npm trong thư mục `client/`.

## Chạy ở máy cá nhân

1. Clone repository và vào thư mục ứng dụng:

   ```bash
   git clone <URL-repository>
   cd <thu-muc-repository>/client
   ```

2. Cài dependencies:

   ```bash
   npm ci
   ```

3. Tạo file môi trường cục bộ từ mẫu:

   **PowerShell:**

   ```powershell
   Copy-Item .env.example .env.local
   ```

   **macOS/Linux:**

   ```bash
   cp .env.example .env.local
   ```

4. Mở `client/.env.local` và điền URL cùng publishable key của Supabase project:

   ```dotenv
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
   ```

   Có thể dùng khóa `anon` cũ nếu dự án Supabase vẫn cung cấp khóa đó. Không điền `service_role` hoặc secret key vào biến `VITE_*`: các biến này được đóng gói và gửi đến trình duyệt.

5. Đảm bảo đã hoàn tất [thiết lập Supabase](#thiết-lập-supabase), sau đó khởi chạy:

   ```bash
   npm run dev
   ```

   Mở URL mà Vite in ra, thường là `http://localhost:5173`.

6. Kiểm tra bản build production cục bộ nếu cần:

   ```bash
   npm run build
   npm run preview
   ```

## Thiết lập Supabase

### 1. Tạo project và cấu hình Google OAuth

1. Tạo project Supabase và đợi Postgres sẵn sàng.
2. Trong Supabase Dashboard, bật Google tại phần **Authentication → Sign In / Providers** và nhập OAuth Client ID/Secret được tạo trong Google Cloud Console.
3. Trong **Authentication → URL Configuration**, đặt Site URL là địa chỉ production của ứng dụng. Thêm các Redirect URL cần thiết, ví dụ:
   - `http://localhost:5173/**` cho phát triển cục bộ.
   - `https://<ten-mien-vercel>/**` cho production.
   - `https://<ten-mien-tuy-chinh>/**` nếu dùng tên miền riêng.
4. Trong Google Cloud Console, thêm callback URL do Supabase hiển thị cho Google provider vào **Authorized redirect URIs**. Callback URL này là địa chỉ Supabase, không phải URL frontend.

URL redirect phải khớp với môi trường đang đăng nhập; nếu thiếu, Google có thể báo lỗi redirect URI.

### 2. Áp dụng SQL migrations

Các file trong `supabase/` là các script SQL thủ công, không tự chạy khi deploy frontend. Mở **Supabase Dashboard → SQL Editor**, chạy mỗi file theo thứ tự tên từ `01` đến `27`, mỗi file một lần và chờ hoàn tất trước khi chạy file tiếp theo. Chạy migration nền tảng trước, sau đó chạy các bản sửa đổi tiếp nối; không bỏ qua số thứ tự.

```text
01_ho_so.sql
02_cong_viec.sql
03_tham_gia.sql
04_task_schema.sql
05_task_workflows.sql
06_member_transfer.sql
07_reports_archive.sql
08_business_logic.sql
09_anh_dai_dien.sql
10_han_chot_gio.sql
11_han_chot_theo_gio_gui_duyet.sql
12_binh_luan_theo_nguoi.sql
13_fix_tao_cong_viec.sql
14_anh_dai_dien_phong_cho.sql
15_fix_trigger_user_id.sql
16_backfill_binh_luan_cu.sql
17_xoa_thanh_vien_khoi_danh_sach.sql
18_lich_su_chi_doc.sql
19_gioi_han_thong_bao.sql
20_gioi_han_spam_va_ping.sql
21_sua_doi_vai_tro.sql
22_sua_go_xoa_binh_luan.sql
23_xoa_han_binh_luan.sql
24_xoa_cong_viec_vinh_vien.sql
25_don_du_lieu_cu_sau_6_thang.sql
26_fix_workflow_edge_cases.sql
27_diem_ho_tro_va_bao_cao_dong_gop.sql
```

Các migration sau sửa/hoàn thiện schema và hành vi từ các migration trước; một số thay đổi gồm đổi hạn chót sang ngày giờ, cập nhật báo cáo, sửa quyền bình luận và thiết lập dọn dữ liệu lưu trữ. Vì vậy cần giữ đúng thứ tự, kể cả khi chỉ vừa tạo project mới. Nếu migration báo lỗi, dừng tại đó, đọc thông báo và nội dung đầu file; không chạy tiếp các file sau hoặc tự chạy lặp lại một migration chưa rõ trạng thái. Trên project đang có dữ liệu, hãy xuất/sao lưu dữ liệu trước khi áp dụng thay đổi schema và thử trước trên môi trường staging nếu có.

`25_don_du_lieu_cu_sau_6_thang.sql` bật lịch dọn dữ liệu lưu trữ cũ (sử dụng `pg_cron`). Đọc kỹ nội dung file và chính sách lưu giữ của nhóm trước khi áp dụng migration này lên dữ liệu thật; công việc đang hoạt động không thuộc đối tượng dọn của job.

`26_fix_workflow_edge_cases.sql` chặn gửi duyệt khi còn đề xuất checklist chờ, khóa đồng bộ việc xin chuyển giao, giữ riêng danh tính cũ khi thay thành viên và không cho thành viên rời nhóm khi còn task đang giao. Dự án đã chạy migration 01–25 chỉ cần chạy file 26 một lần.

`27_diem_ho_tro_va_bao_cao_dong_gop.sql` cho điểm thành viên hỗ trợ dựa trên phần checklist/đóng góp đã ghi nhận, và dùng phần trăm đóng góp do SQL trả về ở cả báo cáo điện thoại lẫn máy tính. Dự án đã chạy migration 01–26 chỉ cần chạy file 27 một lần.

Chi tiết các hàm RPC, cột và quyền frontend gọi được ghi trong [HOP_DONG_API.md](HOP_DONG_API.md).

### 3. Điền biến môi trường frontend

Lấy Project URL và publishable key (hoặc `anon` key) từ Supabase Dashboard → **Project Settings → API** và đặt trong `client/.env.local` theo [mẫu](client/.env.example). Sau khi đổi biến môi trường, khởi động lại Vite để nhận cấu hình mới.

## Deploy lên Vercel

1. Đẩy repository lên GitHub/Git provider và import repository vào Vercel.
2. Chọn **Root Directory** là `client`.
3. Xác nhận cấu hình build:
   - Install command: `npm install` (Vercel tự nhận diện; lockfile hiện có).
   - Build command: `npm run build`.
   - Output directory: `dist`.
4. Thêm Environment Variables cho môi trường Production (và Preview nếu cần):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Deploy, sau đó thêm URL production vào Supabase Auth Site URL/Redirect URLs và vào danh sách redirect URI của Google nếu cấu hình OAuth yêu cầu.
6. Kiểm tra đăng nhập, tạo hồ sơ, vào nhóm, tải dữ liệu và các thao tác được phân quyền trên site vừa deploy.

`client/vercel.json` thiết lập một số HTTP security headers. Khi deploy trên host khác, cấu hình tương đương và hỗ trợ fallback SPA cho các route dạng hash (`#/...`) ở host đó.

## GitHub Actions giữ kết nối Supabase

Workflow `.github/workflows/supabase-keepalive.yml` chạy theo lịch cron `17 3 * * *` (03:17 UTC, tức 10:17 giờ Việt Nam) và có thể chạy thủ công bằng **Actions → Supabase keepalive → Run workflow**. Workflow gọi RPC `kiem_tra_ket_noi()` qua script `scripts/supabase-keepalive.mjs`.

Nếu muốn dùng workflow, vào **GitHub repository → Settings → Secrets and variables → Actions** và thêm:

- `SUPABASE_URL`: Project URL.
- `SUPABASE_PUBLISHABLE_KEY`: publishable key (hoặc anon key).

Đây là keepalive best-effort; không phải sao lưu, không đảm bảo dịch vụ luôn hoạt động và không thay thế chính sách vận hành của nhà cung cấp. Script chỉ cần khóa public/publishable; tuyệt đối không cung cấp `service_role`.

## Lệnh phát triển

Chạy trong `client/`:

| Lệnh | Tác dụng |
| --- | --- |
| `npm run dev` | Chạy Vite development server. |
| `npm run build` | Tạo bản production trong `client/dist/`. |
| `npm run preview` | Phục vụ thử bản build production cục bộ. |
| `npm run lint` | Kiểm tra quy tắc ESLint. |

## Bảo mật và dữ liệu

- `.env.local` và các file `.env*` được loại khỏi Git bởi `.gitignore`. Chỉ commit file mẫu, không commit credential thật.
- Frontend chỉ được dùng publishable/anon key. Đây là khóa public; bảo vệ dữ liệu bằng RLS, quyền execute RPC và kiểm tra xác thực ở database. Không đặt secret key hoặc `service_role` trong mã frontend, biến `VITE_*`, GitHub Actions workflow hay log công khai.
- Mọi thay đổi SQL phải được áp dụng trên đúng Supabase project. Repository không tự quản lý hay tự triển khai schema.
- Migration 25 lên lịch xóa dữ liệu lưu trữ đã quá 6 tháng. Hiểu chính sách lưu giữ và sao lưu dữ liệu trước khi bật trên project có dữ liệu thật.
- Keepalive không tạo bản sao dữ liệu. Hãy thiết lập và kiểm tra quy trình sao lưu riêng phù hợp với yêu cầu của dự án.
- Đăng nhập Google cần cấu hình đúng cả Supabase Auth lẫn Google Cloud OAuth và danh sách redirect URL.

## Xử lý lỗi thường gặp

| Triệu chứng | Việc cần kiểm tra |
| --- | --- |
| Vite báo thiếu cấu hình Supabase hoặc ứng dụng không kết nối được | `client/.env.local` có đúng hai biến `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY` không; URL có dạng `https://<project-ref>.supabase.co` không; đã khởi động lại Vite chưa. |
| Google báo `redirect_uri_mismatch` hoặc quay lại ứng dụng nhưng không đăng nhập | Google OAuth client có callback URL Supabase chính xác không; Supabase Auth provider đã bật chưa; Site URL và Redirect URLs đã gồm host hiện tại chưa. |
| API trả về lỗi thiếu function/table/column | Đã chạy đủ migrations từ 01 đến 27 đúng thứ tự trên Supabase project tương ứng chưa. Không bỏ qua migration được nhắc trong lỗi. |
| Người dùng đăng nhập được nhưng không thấy dữ liệu hoặc bị từ chối thao tác | Kiểm tra người dùng đã tạo hồ sơ/chờ được duyệt vào nhóm chưa; kiểm tra vai trò/trạng thái thành viên, RLS policy và migration tương ứng. |
| Workflow keepalive thất bại | Kiểm tra GitHub Actions secrets `SUPABASE_URL` và `SUPABASE_PUBLISHABLE_KEY`, trạng thái Supabase project, và đã áp dụng migration `20_gioi_han_spam_va_ping.sql` chưa. |
| Vercel deploy thành công nhưng không đăng nhập được | Kiểm tra Environment Variables cho đúng môi trường Vercel, sau đó tạo lại deployment; thêm domain deployment vào Supabase Auth Redirect URLs. |

## Tài liệu liên quan

- [Hợp đồng API và quyền truy cập](HOP_DONG_API.md)
- [Đặc tả hệ thống và nghiệp vụ](he-thong-quan-ly-app.md)
- [Mẫu biến môi trường](client/.env.example)
- [Migrations Supabase](supabase/)

