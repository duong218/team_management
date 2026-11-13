-- 15_fix_trigger_user_id.sql
-- Sửa lỗi: record "new" has no field "user_id"  (hiện khi Hủy task, và có thể cả các thao tác ghi vào tasks/checklist/...).
--
-- Nguyên nhân: file 13 thêm điều kiện "tg_table_name='members' and ... and new.user_id=auth.uid()" vào trigger
-- chan_sua_cong_viec_luu_tru(). Trigger này gắn trên 10 bảng; PL/pgSQL không "cắt ngắn" việc tra cứu trường của NEW
-- nên với các bảng KHÔNG có cột user_id (tasks, task_details, task_checklist...) nó báo lỗi ngay, dù vế trước là sai.
--
-- Cách sửa: đọc user_id qua to_jsonb(new)->>'user_id' (cùng cách hàm này đang đọc project_id/task_id), trả NULL nếu bảng
-- không có cột đó. Logic giữ nguyên: vẫn chỉ cho qua đúng 1 trường hợp "người tạo tự vào làm nhóm trưởng", mọi trường
-- hợp khác (đã bị loại/đã rời, công việc đã lưu trữ) vẫn bị chặn như cũ.
--
-- Cách chạy: Supabase -> SQL Editor -> dán toàn bộ -> Run (chạy sau file 14). Chạy lại nhiều lần vẫn an toàn.
-- Chỉ thay nội dung 1 hàm; trigger đã gắn sẵn trỏ vào hàm theo tên nên KHÔNG cần gắn lại. Không đụng dữ liệu, không cần sao lưu.
begin;

create or replace function public.chan_sua_cong_viec_luu_tru()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_task uuid; v_project uuid; v_state text; v_actor uuid;
begin
 if tg_table_name in('members','tasks') then
  v_project:=coalesce((to_jsonb(new)->>'project_id')::uuid,(to_jsonb(old)->>'project_id')::uuid);
 else
  v_task:=coalesce((to_jsonb(new)->>'task_id')::uuid,(to_jsonb(old)->>'task_id')::uuid);
  if v_task is not null then select project_id into v_project from public.tasks where id=v_task; end if;
 end if;
 select trang_thai into v_state from public.projects where id=v_project for share;
 if v_state='luu_tru' then raise exception 'Công việc đã lưu trữ, không thể thay đổi dữ liệu'; end if;
 -- Serialize a write with kicking/leaving: once the membership update wins, the write must fail.
 if auth.uid() is not null then
  -- Thành viên đầu tiên: người tạo công việc tự vào làm nhóm trưởng (tao_cong_viec), lúc này chưa có dòng members nào để kiểm tra.
  if tg_table_name='members' and tg_op='INSERT' and (to_jsonb(new)->>'user_id')::uuid=auth.uid()
     and not exists(select 1 from public.members where project_id=v_project)
     and exists(select 1 from public.projects where id=v_project and tao_boi=auth.uid()) then
   return new;
  end if;
  perform 1 from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia' for share;
  if not found then raise exception 'Bạn không còn tham gia công việc này'; end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;
revoke all on function public.chan_sua_cong_viec_luu_tru() from public,anon,authenticated;

commit;
