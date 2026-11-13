-- 12_binh_luan_theo_nguoi.sql : bình luận lưu theo TỪNG TIN (ai viết, lúc nào) thay vì một cột văn bản nối dòng.
-- Chạy trong Supabase SQL Editor sau 01..11. Chạy lại nhiều lần vẫn an toàn.
-- Bình luận cũ (cột task_details.binh_luan) được giữ nguyên, giao diện hiện thành ghi chú "Bình luận cũ".
begin;

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null,
  noi_dung text not null check (char_length(noi_dung) between 1 and 2000),
  tao_luc timestamptz not null default now()
);
create index if not exists task_comments_task_time_idx on public.task_comments(task_id, tao_luc);

alter table public.task_comments enable row level security;
drop policy if exists task_comments_read on public.task_comments;
create policy task_comments_read on public.task_comments for select to authenticated using (public.co_quyen_task(task_id));
revoke all on public.task_comments from anon, authenticated;
grant select on public.task_comments to authenticated;

-- Giữ nguyên chữ ký hàm nên client gọi như cũ và quyền execute không đổi.
create or replace function public.them_binh_luan(p_task uuid, p_binh_luan text)
returns void language plpgsql security definer set search_path='' as $$
declare v_project uuid; v_member uuid; v_state text;
begin
 select project_id,trang_thai into v_project,v_state from public.tasks where id=p_task;
 select id into v_member from public.members where project_id=v_project and user_id=auth.uid() and trang_thai='dang_tham_gia';
 if not public.co_quyen_task(p_task) or char_length(btrim(coalesce(p_binh_luan,''))) not between 1 and 2000 or v_state='da_huy' then raise exception 'Không có quyền hoặc bình luận không hợp lệ'; end if;
 insert into public.task_comments(task_id,user_id,noi_dung) values(p_task,auth.uid(),btrim(p_binh_luan));
 perform public.ghi_log(v_project,p_task,v_member,'them_binh_luan');
end; $$;

commit;
