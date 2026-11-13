-- 14_anh_dai_dien_phong_cho.sql : hiện ảnh đại diện của người trong PHÒNG CHỜ (và thành viên đã rời) cho nhóm trưởng/phó.
--
-- Nguyên nhân lỗi: giao diện lấy ảnh bằng cách đọc bảng profiles, nhưng policy profiles_cung_cong_viec
-- chỉ cho xem hồ sơ của người ĐANG là thành viên cùng công việc. Người xin vào (phòng chờ) chưa là thành viên,
-- người đã rời thì không còn đang tham gia => bị chặn => luôn hiện chữ cái đầu.
--
-- Cách sửa: 2 hàm phong_cho_full và ds_thanh_vien_quan_ly (security definer, đã kiểm tra la_quan_ly) trả luôn
-- cột anh_dai_dien. KHÔNG đổi policy, KHÔNG đổi dữ liệu, KHÔNG mở thêm quyền đọc bảng profiles.
--
-- Có 2 điểm cần biết:
--  1) Đổi cột trả về của hàm thì phải drop rồi tạo lại (create or replace không đổi được), nên file có drop function.
--     Làm trong 1 giao dịch: lỗi giữa chừng thì tự hoàn tác, không mất hàm.
--  2) Trong ds_thanh_vien_quan_ly bản cũ (file 06), 2 cột don_vi và ma_dinh_danh bị đặt SAI THỨ TỰ trong select
--     (cột don_vi nhận mã định danh và ngược lại, vì hàm trả theo vị trí). Bản này đặt lại đúng thứ tự.
--     Hệ quả: dòng thành viên sẽ hiện đúng lớp/đơn vị thay vì mã định danh.
--
-- Cách chạy: Supabase -> SQL Editor -> dán toàn bộ -> Run. Chạy lại nhiều lần vẫn an toàn. Không cần sao lưu (không động dữ liệu).
begin;

drop function if exists public.ds_thanh_vien_quan_ly(uuid);
create function public.ds_thanh_vien_quan_ly(p_project uuid)
returns table(member_id uuid,user_id uuid,ho_ten text,don_vi text,ma_dinh_danh text,vai_tro text,trang_thai text,ly_do_roi text,task_dang_lam bigint,chua_nhan_viec boolean,so_lan_bi_loai bigint,task_do bigint,anh_dai_dien text)
language sql stable security definer set search_path='' as $$
 select m.id,m.user_id,p.ho_ten,p.don_vi,pr.ma_dinh_danh,m.vai_tro,m.trang_thai,m.ly_do_roi,
 (select count(*) from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=m.id and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam','cho_duyet')),
 not exists(select 1 from public.task_assignees a where a.member_id=m.id and a.trang_thai='dang_lam'),
 (select count(*) from public.loai_nguoi x where x.project_id=p_project and x.user_id=m.user_id),
 (select count(*) from public.task_assignees a join public.tasks t on t.id=a.task_id where a.member_id=m.id and a.trang_thai='dang_lam' and t.trang_thai in('can_lam','dang_lam')),
 p.anh_dai_dien
 from public.members m join public.profiles p on p.user_id=m.user_id join public.profile_rieng pr on pr.user_id=m.user_id
 where m.project_id=p_project and public.la_quan_ly(p_project) order by (m.trang_thai='dang_tham_gia') desc,p.ho_ten;
$$;

drop function if exists public.phong_cho_full(uuid);
create function public.phong_cho_full(p_project uuid)
returns table(request_id uuid,user_id uuid,ho_ten text,email text,ma_dinh_danh text,don_vi text,cho_tu timestamptz,trung_ma_voi text,so_lan_bi_tu_choi bigint,so_lan_bi_loai bigint,tung_o_nhom boolean,task_do bigint,anh_dai_dien text)
language sql stable security definer set search_path='' as $$
 select r.id,r.user_id,p.ho_ten,u.email::text,pr.ma_dinh_danh,p.don_vi,r.tao_luc,
 (select p2.ho_ten from public.profile_rieng pr2 join public.members m2 on m2.project_id=p_project and m2.user_id=pr2.user_id join public.profiles p2 on p2.user_id=m2.user_id where pr2.ma_dinh_danh=pr.ma_dinh_danh and m2.user_id<>r.user_id limit 1),
 (select count(*) from public.join_requests j where j.project_id=p_project and j.user_id=r.user_id and j.trang_thai='tu_choi'),
 (select count(*) from public.loai_nguoi l where l.project_id=p_project and l.user_id=r.user_id),
 exists(select 1 from public.members m where m.project_id=p_project and m.user_id=r.user_id),
 (select count(distinct t.id) from public.members old join public.task_assignees a on a.member_id=old.id join public.tasks t on t.id=a.task_id where old.project_id=p_project and old.user_id=r.user_id and t.trang_thai in('can_lam','dang_lam','cho_duyet')),
 p.anh_dai_dien
 from public.join_requests r join public.profiles p on p.user_id=r.user_id join public.profile_rieng pr on pr.user_id=r.user_id join auth.users u on u.id=r.user_id
 where r.project_id=p_project and r.trang_thai='cho_duyet' and public.la_quan_ly(p_project) order by r.tao_luc;
$$;

revoke all on function public.ds_thanh_vien_quan_ly(uuid),public.phong_cho_full(uuid) from public,anon;
grant execute on function public.ds_thanh_vien_quan_ly(uuid),public.phong_cho_full(uuid) to authenticated;

commit;
