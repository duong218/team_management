-- 23_xoa_han_binh_luan.sql
-- Trưởng/phó xóa bình luận vật lý; các bình luận cũ trong task đã hủy vẫn có thể sửa/gỡ/xóa.
-- Chạy sau migration 22. Các bình luận từng bị xóa mềm được xóa hẳn ở đây.
begin;

-- Xóa các hàng cũ đã bị ẩn bằng cơ chế xóa mềm ở migration 22.
drop policy if exists task_comments_read on public.task_comments;
delete from public.task_comments where xoa_luc is not null;
alter table public.task_comments
  drop column if exists xoa_boi,
  drop column if exists xoa_luc;
create policy task_comments_read on public.task_comments for select to authenticated
  using (public.co_quyen_task(task_id));

-- Cho phép sửa bình luận cũ trong task đã hủy; công việc lưu trữ vẫn chỉ đọc.
create or replace function public.sua_binh_luan(p_comment uuid, p_noi_dung text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_row public.task_comments%rowtype;
  v_project uuid; v_project_state text; v_member uuid;
  v_text text := btrim(coalesce(p_noi_dung, ''));
begin
  select * into v_row from public.task_comments where id = p_comment for update;
  if not found then raise exception 'Không tìm thấy bình luận'; end if;
  select t.project_id, p.trang_thai into v_project, v_project_state
    from public.tasks t join public.projects p on p.id = t.project_id where t.id = v_row.task_id;
  if v_row.user_id is distinct from auth.uid() then raise exception 'Bạn chỉ được sửa bình luận của chính mình'; end if;
  if v_row.go_luc is not null then raise exception 'Bình luận đã được gỡ nên không sửa được'; end if;
  if not public.co_quyen_task(v_row.task_id) or v_project_state <> 'dang_hoat_dong'
     or char_length(v_text) not between 1 and 2000 then
    raise exception 'Không có quyền, nội dung không hợp lệ hoặc công việc đã kết thúc';
  end if;
  if v_text = v_row.noi_dung then return; end if;
  update public.task_comments set noi_dung = v_text, sua_luc = pg_catalog.now() where id = p_comment;
  select id into v_member from public.members
    where project_id = v_project and user_id = auth.uid() and trang_thai = 'dang_tham_gia';
  perform public.ghi_log(v_project, v_row.task_id, v_member, 'sua_binh_luan');
end; $$;

-- Cập nhật hàm gỡ để không còn phụ thuộc các cột xoa_luc đã bỏ.
create or replace function public.go_binh_luan(p_comment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_row public.task_comments%rowtype;
  v_project uuid; v_project_state text; v_member uuid;
begin
  select * into v_row from public.task_comments where id = p_comment for update;
  if not found then raise exception 'Không tìm thấy bình luận'; end if;
  select t.project_id, p.trang_thai into v_project, v_project_state
    from public.tasks t join public.projects p on p.id = t.project_id where t.id = v_row.task_id;
  if v_row.user_id is distinct from auth.uid() then raise exception 'Bạn chỉ được gỡ bình luận của chính mình'; end if;
  if not public.co_quyen_task(v_row.task_id) or v_project_state <> 'dang_hoat_dong' then
    raise exception 'Không có quyền hoặc công việc đã kết thúc';
  end if;
  if v_row.go_luc is not null then return; end if;
  update public.task_comments set go_boi = auth.uid(), go_luc = pg_catalog.now() where id = p_comment;
  select id into v_member from public.members
    where project_id = v_project and user_id = auth.uid() and trang_thai = 'dang_tham_gia';
  perform public.ghi_log(v_project, v_row.task_id, v_member, 'go_binh_luan');
end; $$;

-- Nhóm trưởng/phó xóa vĩnh viễn hàng bình luận; không để lại nội dung trong log.
create or replace function public.xoa_binh_luan(p_comment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_row public.task_comments%rowtype;
  v_project uuid; v_project_state text; v_member uuid;
begin
  select * into v_row from public.task_comments where id = p_comment for update;
  if not found then raise exception 'Không tìm thấy bình luận'; end if;
  select t.project_id, p.trang_thai into v_project, v_project_state
    from public.tasks t join public.projects p on p.id = t.project_id where t.id = v_row.task_id;
  if not public.la_quan_ly(v_project) then raise exception 'Chỉ nhóm trưởng/phó mới được xóa bình luận'; end if;
  if v_project_state <> 'dang_hoat_dong' then raise exception 'Công việc đã kết thúc'; end if;
  delete from public.task_comments where id = p_comment;
  select id into v_member from public.members
    where project_id = v_project and user_id = auth.uid() and trang_thai = 'dang_tham_gia';
  perform public.ghi_log(v_project, v_row.task_id, v_member, 'xoa_binh_luan');
end; $$;

revoke all on function public.sua_binh_luan(uuid, text), public.go_binh_luan(uuid), public.xoa_binh_luan(uuid) from public, anon;
grant execute on function public.sua_binh_luan(uuid, text), public.go_binh_luan(uuid), public.xoa_binh_luan(uuid) to authenticated;

commit;
