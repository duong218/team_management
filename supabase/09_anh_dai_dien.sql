-- 09_anh_dai_dien.sql : lưu ảnh đại diện (ảnh Google) để người cùng công việc nhìn thấy nhau
-- Chạy trong Supabase web: SQL Editor -> New query -> dán -> Run. Chạy lại nhiều lần vẫn an toàn.
-- Chỉ THÊM 1 cột và 1 hàm; không đụng dữ liệu cũ. Ai xem được hồ sơ ai vẫn theo policy cũ (cung_cong_viec).

alter table public.profiles add column if not exists anh_dai_dien text;
alter table public.profiles drop constraint if exists profiles_anh_dai_dien_check;
alter table public.profiles add constraint profiles_anh_dai_dien_check
  check (anh_dai_dien is null or (anh_dai_dien ~ '^https://' and char_length(anh_dai_dien) <= 500));

create or replace function public.cap_nhat_anh_dai_dien(p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
begin
  if v_uid is null then
    raise exception 'Bạn chưa đăng nhập';
  end if;
  if v_url is not null and (v_url !~ '^https://' or char_length(v_url) > 500) then
    v_url := null;
  end if;
  update public.profiles set anh_dai_dien = v_url where user_id = v_uid;
end;
$$;

revoke all on function public.cap_nhat_anh_dai_dien(text) from public, anon;
grant execute on function public.cap_nhat_anh_dai_dien(text) to authenticated;
