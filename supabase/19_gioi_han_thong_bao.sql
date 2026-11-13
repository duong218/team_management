-- Giữ tối đa 90 thông báo mới nhất cho mỗi tài khoản và xóa hẳn phần cũ hơn.
begin;

create or replace function public.gui_thong_bao(p_member uuid,p_loai text,p_task uuid,p_noi_dung text)
returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid;
begin
 select user_id into v_user from public.members
 where id=p_member and trang_thai='dang_tham_gia';
 if v_user is null then return; end if;

 -- ponytail: khóa chung tránh vượt giới hạn khi ghi đồng thời; chuyển sang khóa từng user theo thứ tự nếu lưu lượng thông báo tăng cao.
 perform pg_catalog.pg_advisory_xact_lock(7241901::bigint);
 insert into public.thong_bao(member_id,loai,task_id,noi_dung)
 values(p_member,p_loai,p_task,p_noi_dung);

 delete from public.thong_bao n
 where n.id in (
   select old.id from public.thong_bao old
   join public.members m on m.id=old.member_id
   where m.user_id=v_user
   order by old.thoi_gian desc,old.id desc
   offset 90
 );
end;
$$;

-- Dọn một lần các thông báo cũ đã tồn tại trước khi áp dụng giới hạn.
lock table public.thong_bao in share row exclusive mode;
with ranked as (
 select n.id,row_number() over(partition by m.user_id order by n.thoi_gian desc,n.id desc) as vi_tri
 from public.thong_bao n join public.members m on m.id=n.member_id
)
delete from public.thong_bao n using ranked r where n.id=r.id and r.vi_tri>90;

commit;
