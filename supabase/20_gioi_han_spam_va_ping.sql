-- 20_gioi_han_spam_va_ping.sql
-- Giới hạn các thao tác ghi dễ bị spam; thêm RPC ping không trả dữ liệu cho lịch chạy ngoài Supabase.
-- Chạy sau các file 01-19. Không cần service_role.
begin;

create index if not exists task_comments_user_time_idx
  on public.task_comments(user_id, tao_luc desc);
create index if not exists activity_log_member_time_idx
  on public.activity_log(member_id, thoi_gian desc);
create index if not exists task_yeu_cau_member_time_idx
  on public.task_yeu_cau(member_id, thoi_gian desc);

create or replace function public.gioi_han_tan_suat_ghi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_member uuid;
  v_count bigint;
begin
  -- SQL Editor/migration jobs have no end-user identity and bypass app limits.
  if v_uid is null then return new; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_uid::text || ':' || tg_table_name, 0)
  );

  if tg_table_name = 'task_comments' then
    if new.user_id is distinct from v_uid then
      raise exception 'Tài khoản không khớp với người gửi bình luận';
    end if;
    select count(*) into v_count from public.task_comments
    where user_id = v_uid and tao_luc > pg_catalog.now() - interval '1 minute';
    if v_count >= 10 then raise exception 'Bạn gửi bình luận quá nhanh. Hãy thử lại sau một phút'; end if;

  elsif tg_table_name = 'tasks' then
    select id into v_member from public.members
    where project_id = new.project_id and user_id = v_uid and trang_thai = 'dang_tham_gia';
    if v_member is null then return new; end if;
    select count(*) into v_count from public.activity_log
    where member_id = v_member and hanh_dong like 'tao_task:%'
      and thoi_gian > pg_catalog.now() - interval '10 minutes';
    if v_count >= 10 then raise exception 'Bạn tạo task quá nhanh. Hãy thử lại sau vài phút'; end if;

  elsif tg_table_name = 'task_yeu_cau' then
    if not exists (
      select 1 from public.members
      where id = new.member_id and user_id = v_uid and trang_thai = 'dang_tham_gia'
    ) then
      raise exception 'Bạn không thể gửi yêu cầu cho thành viên khác';
    end if;
    select count(*) into v_count from public.task_yeu_cau r
    join public.members m on m.id = r.member_id
    where m.user_id = v_uid and r.thoi_gian > pg_catalog.now() - interval '10 minutes';
    if v_count >= 5 then raise exception 'Bạn gửi yêu cầu chuyển giao quá nhanh. Hãy thử lại sau vài phút'; end if;
  end if;

  return new;
end;
$$;

revoke all on function public.gioi_han_tan_suat_ghi() from public, anon, authenticated;

drop trigger if exists rate_limit_task_comments on public.task_comments;
create trigger rate_limit_task_comments before insert on public.task_comments
for each row execute function public.gioi_han_tan_suat_ghi();

drop trigger if exists rate_limit_task_creation on public.tasks;
create trigger rate_limit_task_creation before insert on public.tasks
for each row execute function public.gioi_han_tan_suat_ghi();

drop trigger if exists rate_limit_transfer_requests on public.task_yeu_cau;
create trigger rate_limit_transfer_requests before insert on public.task_yeu_cau
for each row execute function public.gioi_han_tan_suat_ghi();

-- Chỉ trả true, không đọc bảng hoặc tiết lộ dữ liệu; dùng để tạo hoạt động DB hằng ngày.
create or replace function public.kiem_tra_ket_noi()
returns boolean
language sql
volatile
set search_path = ''
as $$ select true $$;

revoke all on function public.kiem_tra_ket_noi() from public, authenticated, anon;
grant execute on function public.kiem_tra_ket_noi() to anon;

commit;
