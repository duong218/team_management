# Hợp đồng API giao diện

Phạm vi: `client/src/api/`. Mọi lỗi Supabase được ném thành `Error`; giao diện giữ nguyên nội dung nhập khi lỗi và cho tải lại. Các RPC được triển khai/cập nhật trong `supabase/08_business_logic.sql`; các sửa đổi bảng nền có trong `01–03`. Truy vấn bảng chỉ định danh cột tường minh, không đọc `join_code` trực tiếp.

## auth.js
- `getSession()` → `User|null`; Supabase Auth session. Lỗi: không đọc được phiên. Mọi người dùng; AuthGate.
- `watchAuth(callback)` → subscription; Supabase Auth state. Mọi người dùng; AuthGate.
- `signIn()` → void; Google OAuth redirect về origin. Khách; LoginPage.
- `signOut()` → void; Auth signOut. Người đã đăng nhập; thanh điều hướng.

## profile.js
- `getProfile(userId:string)` → `profiles(user_id,ho_ten,don_vi,duoc_tao_cong_viec)|null`, lọc `user_id=userId`; chính chủ. AuthGate/ProfilePage.
- `saveProfile(hoTen:string,ma:string,donVi:string)` → kết quả RPC `luu_ho_so`; args `p_ho_ten,p_ma_dinh_danh,p_don_vi`. Người đăng nhập chưa có hồ sơ; ProfilePage. Lỗi RPC dự kiến: hồ sơ không hợp lệ/trùng mã/SQL chưa triển khai.

## projects.js
- `listProjects(userId:string)` → dự án có vai trò, danh sách cột projects `id,ten,max_members,trang_thai,tao_boi,bat_binh_chon,trong_so_diem` và members `project_id,vai_tro`; lọc member `user_id=userId,trang_thai=dang_tham_gia`. Thành viên đang tham gia; ProjectListPage.
- `getProject(id:string)` → `{project,vaiTro}`; projects `id,ten,max_members,trang_thai,tao_boi,bat_binh_chon,trong_so_diem` lọc id; members `vai_tro` lọc project_id, auth user_id và `trang_thai=dang_tham_gia`; thành viên hiện tại; hook useProject.
- `createProject(ten:string,max:number)` → RPC `tao_cong_viec(p_ten,p_max_members)`; người có `duoc_tao_cong_viec`; ProjectListPage. Lỗi: quyền/giới hạn 10/SQL thiếu.
- Lấy/đổi/tắt mã tham gia: RPC `lay_ma(p_project)`, `doi_ma(p_project)`, `tat_ma(p_project)` theo code cũ; trưởng/phó; ProjectListPage. Kết quả mã chỉ qua RPC.

## tasks.js
- `listTasks(projectId:string)` → `tasks(id,project_id,trang_thai,trang_thai_truoc_huy,tien_do,han_chot,ly_do_huy,cap_nhat_luc)`, lọc project_id và bỏ `da_huy`; thành viên dự án theo RLS; Kanban.
- `getTaskDetails(taskId:string)` → `task_details(task_id,tieu_de,mo_ta,tep_dinh_kem,binh_luan)`, lọc task_id; người được giao hoặc trưởng/phó; TaskDetail.
- `getTask(id:string)` → ghép hai kết quả trên; cùng quyền; TaskDetail.
- `listCancelledTasks(projectId:string)` → cột tasks như trên, lọc project_id và `trang_thai=da_huy`; thành viên dự án theo RLS; CancelledTasksPage.

## members.js
- `listMembers(projectId:string)` → `members(id,project_id,user_id,vai_tro,trang_thai,ly_do_roi)`, lọc project_id; trưởng/phó theo thiết kế; ManagePage. Lưu ý cần view/hàm đã kiểm soát quyền để ghép tên/đơn vị/mã định danh; chưa có trong schema.

## checklist.js
- `listChecklist(taskId:string)` → `task_checklist(id,task_id,noi_dung,trong_so,da_xong,trang_thai_muc,de_xuat_boi,nguoi_hoan_thanh,thoi_gian_hoan_thanh)`, lọc task_id; người được giao hoặc trưởng/phó theo RLS; TaskDetail.

## notifications.js
- `listNotificationsForUser(userId:string)` → đọc `members(id)` theo user_id, sau đó `thong_bao(id,member_id,loai,task_id,noi_dung,da_doc,thoi_gian)` lọc các member_id tương ứng, mới nhất trước, tối đa 50; tài khoản hiện tại; NotificationsPage. `listNotifications(memberId:string)` là truy vấn cùng danh sách cột, lọc member_id và giới hạn 50; quyền của member đó.

## joinRequests.js
- `listMine()` → RPC `yeu_cau_cua_toi()`, danh sách yêu cầu hiện tại; người đăng nhập, ProjectListPage.
- `submitCode(code:string)` → RPC `nhap_ma(p_ma:text)`; người có hồ sơ; ProjectListPage. Lỗi: mã sai/hết hạn, đã tham gia, giới hạn từ chối/loại.
- `approveNew(request:uuid)` → `duyet_moi(p_request)`; trưởng/phó; ManagePage.
- `approveReplacement(request:uuid,member:uuid)` → `duyet_thay_the(p_request,p_member)`; trưởng/phó; ManagePage.
- `reject(request:uuid)` → `tu_choi_yeu_cau(p_request)`; trưởng/phó; ManagePage.
- Danh sách phòng chờ thực tế gọi `phong_cho_full(p_project:uuid)` trả request_id,user_id,ho_ten,email,ma_dinh_danh,don_vi,cho_tu,trung_ma_voi,so_lan_bi_tu_choi,so_lan_bi_loai,tung_o_nhom,task_do; chỉ trưởng/phó của project.

## tasks.js
- Ghi qua RPC: `tao_task(p_project:uuid,p_tieu_de:text,p_mo_ta:text,p_han_chot:date|null,p_checklist:jsonb)`, `cap_nhat_task(p_task,p_tieu_de,p_mo_ta,p_han_chot,p_ly_do_han,p_cap_nhat_luc)`; đổi hạn cần lý do, thời điểm cập nhật phát hiện ghi đè hai tab; `gan_task(p_task,p_member,p_vai_tro)`, `bat_dau_task(p_task)`, `gui_duyet_task(p_task)`, `duyet_task(p_task)`, `tra_lai_task(p_task,p_ly_do,p_bo_tick:uuid[])`, `huy_task(p_task,p_ly_do)`, `khoi_phuc_task(p_task,p_ly_do)`, `xoa_task_trong(p_task)`, `them_binh_luan(p_task,p_binh_luan)`. Kết quả theo SQL: uuid/void; quyền kiểm tra ở từng hàm; KanbanPage, TaskDetailPage, CancelledTasksPage.
- `createAssignedTask(project,title,description,dueDate,checklist,member)` → RPC `tao_task_giao(p_project:uuid,p_tieu_de:text,p_mo_ta:text,p_han_chot:date|null,p_checklist:jsonb,p_member:uuid)`; tạo task và giao người chính trong một giao dịch; trưởng/phó; KanbanPage.
- `reopenTask(task,reason)` → RPC `mo_lai_task(p_task:uuid,p_ly_do:text)`; trưởng/phó, TaskDetailPage.
- `updateProjectSettings(project,name,maxMembers)` → RPC `cap_nhat_cong_viec(p_project:uuid,p_ten:text,p_max_members:integer)`; trưởng/phó, ManagePage.
- `listTasks(project)` đọc `tasks(id,project_id,trang_thai,trang_thai_truoc_huy,tien_do,han_chot,ly_do_huy,cap_nhat_luc,tao_luc)`, `task_details(task_id,tieu_de,mo_ta,tep_dinh_kem,binh_luan)`, `task_assignees(task_id,member_id,vai_tro_trong_task,trang_thai)`, `members(id,user_id,vai_tro,trang_thai)`, `profiles(user_id,ho_ten)`; theo project và task_id; thành viên dự án qua RLS; Kanban.
- `getTask(task)` đọc tasks/detail, assignments, thành viên/hồ sơ, checklist/link, activity_log với danh sách cột tường minh; lọc task/project; RLS chỉ thành viên được giao hoặc quản lý (task chưa giao cho phép thành viên xem tóm tắt); TaskDetail.

## checklist.js và links.js
- `listChecklist(task)` đọc `task_checklist(id,task_id,noi_dung,trong_so,da_xong,trang_thai_muc,de_xuat_boi,nguoi_hoan_thanh,thoi_gian_hoan_thanh)`, lọc task_id; người được giao/quản lý; TaskDetail.
- `toggleChecklistItem(item:uuid,checked:boolean)` → `tick_muc(p_muc,p_da_xong)`; người được giao hợp lệ; TaskDetail.
- `addChecklistItem(task:uuid,content:text)` → `them_muc_task(p_task,p_noi_dung,p_trong_so=1)`; trưởng/phó; TaskDetail.
- `addLink(item:uuid,url:string,note:string)` → `them_link(p_muc,p_url,p_ghi_chu)`; người được giao; TaskDetail. `rejectLink(link:uuid,reason:text)` → `tu_choi_link(p_link,p_ly_do)`; trưởng/phó; TaskDetail.
- `listLinks(task)` đọc `task_links(id,task_id,muc_id,url,ghi_chu,nguoi_them,thoi_gian,trang_thai_link,ly_do_tu_choi)` lọc task_id; người được giao/quản lý theo RLS.

## members.js
- `listMembers(project)` → `ds_thanh_vien_quan_ly(p_project)` trả member_id,user_id,ho_ten,don_vi,ma_dinh_danh,vai_tro,trang_thai,ly_do_roi,task_dang_lam,chua_nhan_viec,so_lan_bi_loai,task_do; trưởng/phó; ManagePage.
- Ghi RPC: `duyet_moi(p_request)`, `duyet_thay_the(p_request,p_member)`, `tu_choi_yeu_cau(p_request)`, `loai_thanh_vien(p_member,p_ly_do,p_xu_ly_tien_do)`, `moi_lai(p_member)`, `doi_vai_tro(p_member,p_vai_tro)`, `roi_nhom(p_project)`; tất cả quyền/validation do SQL; ManagePage/project menu.
- `getMyMember(project)` đọc `members(id,project_id,user_id,vai_tro,trang_thai)` theo project_id/user_id/trạng thái; chính chủ; TaskDetail.

## transfers.js và votes.js
- `requestTransfer(task,reason)` → `xin_chuyen_giao(p_task,p_ly_do)`; người đang được giao; TaskDetail.
- `transferQueue(project)` → `ds_yeu_cau_chuyen_giao(p_project)` trả id,task_id,member_id,ho_ten,ly_do,trang_thai,thoi_gian,tien_do,vai_tro_trong_task; trưởng/phó; ManagePage.
- `resolveTransfer(request,decision,member,type,reason,dueDate?)` → `xu_ly_yeu_cau_chuyen_giao(p_yeu_cau,p_quyet_dinh,p_den_member,p_loai,p_ly_do_xu_ly,p_han_moi)`; trưởng/phó; ManagePage.
- `transferTask(task,fromMember,toMember,type,reason,dueDate?)` → `chuyen_giao_task(p_task,p_tu_member,p_den_member,p_loai,p_ly_do,p_han_moi)`; trưởng/phó; TaskDetail; lưu hạn cũ nếu không truyền hạn mới.
- `history(task)` → `lich_su_nguoi_chinh(p_task)` trả timeline; người được giao hoặc quản lý; TaskDetail.
- `reviseTransferType(transfer,type,reason)` → `sua_loai_chuyen(p_id,p_loai,p_ly_do)`; trưởng/phó, chỉ khi project hoạt động; TaskDetail/ManagePage.
- `castVote(task)` / `removeVote(task)` → `binh_chon_task(p_task)` / `bo_binh_chon_task(p_task)`; thành viên dự án; TaskDetail.
- `setVoting(project,enabled)` → `bat_binh_chon(p_project,p_bat)`; trưởng/phó; ManagePage. `listVotes(project)` → `ds_binh_chon(p_project)`; trưởng/phó.

## notifications.js và reports.js
- `listNotificationsForUser(user)` đọc `members(id)` lọc user_id, sau đó `thong_bao(id,member_id,loai,task_id,noi_dung,da_doc,thoi_gian)` lọc member_id, mới nhất trước, tối đa 50; chủ tài khoản; NotificationsPage.
- `markRead(id)` → `doc_thong_bao(p_thong_bao)`; chủ thông báo; NotificationsPage.
- `getReport(project)` → `bao_cao_cong_viec(p_project)` JSON project/members/tasks/activity, trưởng/phó; ReportPage.
- `closeProject(project,confirm)` → `ket_thuc_cong_viec(p_project,p_xac_nhan)` trả cảnh báo hoặc snapshot; trưởng/phó; ManagePage.
- `reopenProject(project)` → `mo_lai_cong_viec(p_project)`; chỉ trưởng; ManagePage.
- `adjustScore(project,member,score,reason)` → `dieu_chinh_diem(p_project,p_member,p_diem,p_ly_do)`; trưởng/phó theo ràng buộc vai trò; ReportPage.
- `listTaskContributions(task)` → `dong_gop_task(p_task)` trả `member_id,phan_tram`; người được giao/quản lý; TaskDetail.
- `adjustContribution(task,allocations,reason)` → `xin_muc_dong_gop(p_task,p_phan_bo,p_ly_do)`; trưởng/phó, task đang mở có mục đã duyệt; tỷ lệ phải đủ toàn bộ người đóng góp, tổng 100.00 và mỗi giá trị tối đa hai chữ số thập phân; TaskDetail.

RPC gọi qua `supabase.rpc`; lỗi được ném thành Error với message từ Supabase. Những chữ ký trên phải triển khai ở migrations 04–08; nếu SQL chưa chạy thì giao diện sẽ hiển thị lỗi tương ứng.

## Bổ sung nghiệp vụ (migration 08)
- `updateScoreWeights(project:uuid,weights:jsonb)` → `cap_nhat_trong_so_diem(p_project,p_trong_so)`; JSON có đúng các khóa `a,b,c`, số không âm, tổng bằng 1; trưởng/phó, màn cài đặt; lỗi quyền, trạng thái lưu trữ, dữ liệu trọng số không hợp lệ.
- `proposeChecklistItem(task:uuid,content:text)` → `de_xuat_muc(p_task,p_noi_dung)`; thành viên được giao, TaskDetail.
- `reviewChecklistItem(item:uuid,approve:boolean,reason:text|null)` → `xu_ly_de_xuat_muc(p_muc,p_duyet,p_ly_do)`; trưởng/phó, TaskDetail.
- `updateChecklistItem(item:uuid,content:text,weight:number)` / `deleteChecklistItem(item:uuid)` → `cap_nhat_muc_task(p_muc,p_noi_dung,p_trong_so)` / `xoa_muc_task(p_muc)`; trưởng/phó, TaskDetail.
- `deleteLink(link:uuid)` → `xoa_link(p_link)`; quyền do RPC kiểm tra; TaskDetail.
- `reviseTransferType(transfer:uuid,type:text,reason:text)` → `sua_loai_chuyen(p_id,p_loai,p_ly_do)`; trưởng/phó khi công việc còn hoạt động; ManagePage/TaskDetail.
- `xu_ly_yeu_cau_chuyen_giao` với vai trò hỗ trợ chỉ gỡ người yêu cầu khỏi task; không nhận `p_den_member`. Với người chính, vẫn cần người nhận và loại chuyển.
- Mọi RPC ghi công việc bị từ chối nếu project đã lưu trữ; `log_join_request_event`, `log_member_account_replacement`, `rls_auto_enable` chỉ được database gọi như trigger/event trigger, không cấp quyền execute cho client.
- Cài đặt SQL thủ công: chạy `supabase/08_business_logic.sql` sau 01–07. Không áp dụng tự động bởi client.
