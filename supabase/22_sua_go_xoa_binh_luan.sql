-- 22_sua_go_xoa_binh_luan.sql : sửa / gỡ / xóa bình luận
--   Sửa: chỉ người viết, ghi vết "đã chỉnh sửa" (sua_luc).
--   Gỡ : chỉ người viết; tin nhắn bị làm mờ và ghi tên người gỡ (go_boi, go_luc). Không sửa được sau khi gỡ.
--   Xóa: chỉ nhóm trưởng/phó, xóa được mọi bình luận. Xóa mềm (xoa_boi, xoa_luc): ẩn khỏi mọi người nhưng còn trong bảng để đối chiếu.
-- Chạy trong Supabase SQL Editor sau 01..21. Chạy lại nhiều lần vẫn an toàn. Chỉ THÊM cột và hàm; dữ liệu cũ giữ nguyên.
-- Không cần service_role.
begin;

alter table public.task_comments
  add column if not exists sua_luc timestamptz,
  add column if not exists go_boi uuid,
  add column if not exists go_luc timestamptz,
  add column if not exists xoa_boi uuid,
  add column if not exists xoa_luc timestamptz;

-- Bình luận đã xóa không ai đọc được nữa (kể cả nhóm trưởng/phó)
drop policy if exists task_comments_read on public.task_comments;
create policy task_comments_read on public.task_comments for select to authenticated
  using (public.co_quyen_task(task_id) and xoa_luc is null);

create or replace function public.sua_binh_luan(p_comment uuid, p_noi_dung text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_row public.task_comments%rowtype;
  v_project uuid; v_task_state text; v_project_state text; v_member uuid;
  v_text text := btrim(coalesce(p_noi_dung, ''));
begin
  select * into v_row from public.task_comments where id = p_comment and xoa_luc is null;
  if not found then raise exception 'Không tìm thấy bình luận'; end if;
  select t.project_id, t.trang_thai, p.trang_thai into v_project, v_task_state, v_project_state
    from public.tasks t join public.projects p on p.id = t.project_id where t.id = v_row.task_id;
  if v_row.user_id is distinct from auth.uid() then raise exception 'Bạn chỉ được sửa bình luận của chính mình'; end if;
  if v_row.go_luc is not null then raise exception 'Bình luận đã được gỡ nên không sửa được'; end if;
  if not public.co_quyen_task(v_row.task_id) or v_task_state = 'da_huy' or v_project_state <> 'dang_hoat_dong'
     or char_length(v_text) not between 1 and 2000 then
    raise exception 'Không có quyền, nội dung không hợp lệ hoặc công việc đã kết thúc';
  end if;
  if v_text = v_row.noi_dung then return; end if;
  update public.task_comments set noi_dung = v_text, sua_luc = pg_catalog.now() where id = p_comment;
  select id into v_member from public.members
    where project_id = v_project and user_id = auth.uid() and trang_thai = 'dang_tham_gia';
  perform public.ghi_log(v_project, v_row.task_id, v_member, 'sua_binh_luan');
end; $$;

create or replace function public.go_binh_luan(p_comment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_row public.task_comments%rowtype;
  v_project uuid; v_project_state text; v_member uuid;
begin
  select * into v_row from public.task_comments where id = p_comment and xoa_luc is null;
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

create or replace function public.xoa_binh_luan(p_comment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_row public.task_comments%rowtype;
  v_project uuid; v_project_state text; v_member uuid;
begin
  select * into v_row from public.task_comments where id = p_comment and xoa_luc is null;
  if not found then raise exception 'Không tìm thấy bình luận'; end if;
  select t.project_id, p.trang_thai into v_project, v_project_state
    from public.tasks t join public.projects p on p.id = t.project_id where t.id = v_row.task_id;
  if not public.la_quan_ly(v_project) then raise exception 'Chỉ nhóm trưởng/phó mới được xóa bình luận'; end if;
  if v_project_state <> 'dang_hoat_dong' then raise exception 'Công việc đã kết thúc'; end if;
  update public.task_comments set xoa_boi = auth.uid(), xoa_luc = pg_catalog.now() where id = p_comment;
  select id into v_member from public.members
    where project_id = v_project and user_id = auth.uid() and trang_thai = 'dang_tham_gia';
  perform public.ghi_log(v_project, v_row.task_id, v_member, 'xoa_binh_luan');
end; $$;

revoke all on function public.sua_binh_luan(uuid, text), public.go_binh_luan(uuid), public.xoa_binh_luan(uuid) from public, anon;
grant execute on function public.sua_binh_luan(uuid, text), public.go_binh_luan(uuid), public.xoa_binh_luan(uuid) to authenticated;

commit;
