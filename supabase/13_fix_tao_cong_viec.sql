-- 13_fix_tao_cong_viec.sql
-- Sửa lỗi "Bạn không còn tham gia công việc này" khi bấm Tạo công việc.
--
-- Nguyên nhân: tao_cong_viec() chèn dòng members đầu tiên (người tạo = nhóm trưởng). Trigger
-- chan_sua_cong_viec_luu_tru() chạy trước lúc chèn và đòi người ghi phải ĐÃ là thành viên đang tham gia
-- của công việc, nên luôn báo lỗi và hủy cả thao tác tạo (công việc không được tạo, không để lại dữ liệu rác).
--
-- Cách sửa: trigger cho qua đúng một trường hợp — dòng members đầu tiên của công việc, do chính người
-- tạo (projects.tao_boi) tự chèn cho mình. Mọi trường hợp khác (thành viên bị loại/đã rời, ghi vào công việc
-- đã lưu trữ...) vẫn bị chặn như cũ.
--
-- Cách chạy: dán toàn bộ file vào Supabase -> SQL Editor -> Run. Chạy lại nhiều lần vẫn an toàn.
-- Không đổi dữ liệu, không đổi cấu trúc bảng.

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
  if tg_table_name='members' and tg_op='INSERT' and new.user_id=auth.uid()
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

-- Gắn lại trigger (idempotent) để file chạy độc lập, kể cả khi trigger chưa từng được gắn.
do $$
declare t text;
begin
 foreach t in array array['members','tasks','task_details','task_assignees','task_checklist','task_links','task_votes','task_chuyen_giao','task_yeu_cau','task_dong_gop_dieu_chinh'] loop
  execute format('drop trigger if exists block_archived_project_write on public.%I',t);
  execute format('create trigger block_archived_project_write before insert or update or delete on public.%I for each row execute function public.chan_sua_cong_viec_luu_tru()',t);
 end loop;
end $$;

commit;

-- Kiểm tra sau khi chạy: đăng nhập app bằng tài khoản có quyền tạo công việc, bấm "Tạo công việc".
-- Hoặc xem trigger đã gắn đủ 10 bảng:
--   select count(*) from pg_trigger where tgname='block_archived_project_write' and not tgisinternal;  -- kỳ vọng 10
