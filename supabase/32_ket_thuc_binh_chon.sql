-- 32_ket_thuc_binh_chon.sql — nhóm trưởng/phó bấm "Kết thúc lựa chọn": từ đó không ai bình chọn/bỏ phiếu thêm được.
-- Chạy file này TRƯỚC khi đưa giao diện mới lên (trang Bình chọn task đọc cột binh_chon_ket_thuc).
alter table public.projects add column if not exists binh_chon_ket_thuc boolean not null default false;
grant select (binh_chon_ket_thuc) on public.projects to authenticated;

-- Bật bình chọn = mở vòng mới: xóa phiếu cũ và mở lại. Tắt thì chỉ tắt (menu Bình chọn task ẩn đi).
create or replace function public.bat_binh_chon(p_project uuid,p_bat boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.la_quan_ly(p_project) or not exists(select 1 from public.projects where id=p_project and trang_thai='dang_hoat_dong') then raise exception 'Bạn không có quyền hoặc công việc đã đóng'; end if;
 if p_bat then delete from public.task_votes where task_id in(select id from public.tasks where project_id=p_project); end if;
 update public.projects set bat_binh_chon=p_bat,binh_chon_ket_thuc=false where id=p_project;
end; $$;

create or replace function public.ket_thuc_binh_chon(p_project uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.la_quan_ly(p_project) or not exists(select 1 from public.projects where id=p_project and trang_thai='dang_hoat_dong' and bat_binh_chon) then raise exception 'Bạn không có quyền hoặc bình chọn đang tắt'; end if;
 update public.projects set binh_chon_ket_thuc=true where id=p_project;
end; $$;

-- Bình chọn / bỏ phiếu: chặn khi đã kết thúc.
create or replace function public.binh_chon_task(p_task uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_state text; v_member uuid;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task for update;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if v_project is null or v_member is null or v_state<>'can_lam' or not exists(select 1 from public.projects where id=v_project and trang_thai='dang_hoat_dong' and bat_binh_chon and not binh_chon_ket_thuc) then raise exception 'Bình chọn đang tắt, đã kết thúc hoặc task không sẵn sàng'; end if;
 if exists(select 1 from public.task_assignees where task_id=p_task and trang_thai='dang_lam') then raise exception 'Task đã được giao'; end if;
 insert into public.task_votes(task_id,member_id) values(p_task,v_member) on conflict do nothing;
end; $$;

create or replace function public.bo_binh_chon_task(p_task uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_member uuid;
begin
 select project_id into v_project from public.tasks where id=p_task;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if not exists(select 1 from public.projects where id=v_project and bat_binh_chon and not binh_chon_ket_thuc) then raise exception 'Bình chọn đã kết thúc'; end if;
 delete from public.task_votes where task_id=p_task and member_id=v_member and not exists(select 1 from public.task_assignees where task_id=p_task and trang_thai='dang_lam');
end; $$;

-- Phiếu của chính mình (thành viên thường không đọc được bảng phiếu, chỉ đọc qua hàm này).
create or replace function public.phieu_cua_toi(p_project uuid)
returns table(task_id uuid)
language sql stable security definer set search_path='' as $$
 select v.task_id from public.task_votes v join public.tasks t on t.id=v.task_id join public.members m on m.id=v.member_id
 where t.project_id=p_project and m.user_id=auth.uid() and public.la_thanh_vien(p_project);
$$;

revoke all on function public.ket_thuc_binh_chon(uuid),public.phieu_cua_toi(uuid) from public,anon;
grant execute on function public.ket_thuc_binh_chon(uuid),public.phieu_cua_toi(uuid) to authenticated;