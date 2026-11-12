-- 01_ho_so.sql : hồ sơ lần đầu (mục 4, 6.2, 11.1-F, 11.1-J)
-- Chạy trong Supabase web: SQL Editor -> New query -> dán -> Run. Chạy lại nhiều lần vẫn an toàn.

-- 1. Bảng ---------------------------------------------------------------
create table if not exists public.profiles (
  user_id            uuid primary key references auth.users(id) on delete restrict,
  ho_ten             text not null check (char_length(ho_ten) between 2 and 100),
  don_vi             text not null check (char_length(don_vi) between 1 and 100),
  duoc_tao_cong_viec boolean not null default false,
  tao_luc            timestamptz not null default now()
);

-- Mã định danh nằm bảng riêng vì RLS không giấu được theo cột (mục 11.1-J)
create table if not exists public.profile_rieng (
  user_id       uuid primary key references public.profiles(user_id) on delete restrict,
  ma_dinh_danh  text not null check (ma_dinh_danh ~ '^[A-Z0-9]{3,30}$')
);

-- 2. RLS: bật, mặc định từ chối ------------------------------------------
alter table public.profiles      enable row level security;
alter table public.profile_rieng enable row level security;

drop policy if exists profiles_doc_cua_minh on public.profiles;
create policy profiles_doc_cua_minh on public.profiles
  for select to authenticated using (user_id = auth.uid());

drop policy if exists profile_rieng_doc_cua_minh on public.profile_rieng;
create policy profile_rieng_doc_cua_minh on public.profile_rieng
  for select to authenticated using (user_id = auth.uid());
-- Sau này (file 02/03) sẽ thêm policy cho nhóm trưởng/phó xem hồ sơ thành viên.
-- Không có policy insert/update/delete: client không ghi thẳng, chỉ qua hàm bên dưới.

-- 3. Quyền (đã tắt "tự hiển thị bảng mới" nên phải grant tay) -------------
revoke all on public.profiles, public.profile_rieng from anon, authenticated;
grant select on public.profiles, public.profile_rieng to authenticated;

-- 4. Hàm lưu hồ sơ -------------------------------------------------------
create or replace function public.luu_ho_so(p_ho_ten text, p_ma_dinh_danh text, p_don_vi text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ten text := btrim(coalesce(p_ho_ten, ''));
  v_don text := btrim(coalesce(p_don_vi, ''));
  v_ma  text := upper(regexp_replace(coalesce(p_ma_dinh_danh, ''), '\s', '', 'g'));
  v_old_ma text;
begin
  if v_uid is null then
    raise exception 'Bạn chưa đăng nhập';
  end if;
  if char_length(v_ten) not between 2 and 100 then
    raise exception 'Họ tên phải từ 2 đến 100 ký tự';
  end if;
  if char_length(v_don) not between 1 and 100 then
    raise exception 'Đơn vị phải từ 1 đến 100 ký tự';
  end if;
  if v_ma !~ '^[A-Z0-9]{3,30}$' then
    raise exception 'Mã định danh phải từ 3 đến 30 ký tự chữ hoặc số';
  end if;

  select ma_dinh_danh into v_old_ma from public.profile_rieng where user_id = v_uid for update;

  insert into public.profiles (user_id, ho_ten, don_vi)
  values (v_uid, v_ten, v_don)
  on conflict (user_id) do update
    set ho_ten = excluded.ho_ten, don_vi = excluded.don_vi;
  -- duoc_tao_cong_viec không bị đụng tới: client không tự bật được.

  -- TODO (file 04): nếu mã đổi so với cũ thì ghi activity_log (cũ -> mới), mục 11.1-F.
  insert into public.profile_rieng (user_id, ma_dinh_danh)
  values (v_uid, v_ma)
  on conflict (user_id) do update set ma_dinh_danh = excluded.ma_dinh_danh;
  -- Function is installed before activity_log (04), but it runs after all SQL files are installed.
  if v_old_ma is not null and v_old_ma is distinct from v_ma
     and to_regclass('public.activity_log') is not null then
    insert into public.activity_log(project_id, member_id, hanh_dong)
    select project_id, id, 'doi_ma_dinh_danh:' || v_old_ma || '->' || v_ma
    from public.members where user_id = v_uid;
  end if;
end;
$$;

revoke all on function public.luu_ho_so(text, text, text) from public, anon;
grant execute on function public.luu_ho_so(text, text, text) to authenticated;
