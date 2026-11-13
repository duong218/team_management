-- 16_backfill_binh_luan_cu.sql
-- Gắn lại TÊN NGƯỜI GỬI và GIỜ cho các bình luận cũ (đang hiện "Bình luận cũ (không rõ người gửi)").
--
-- Vì sao cũ: trước file 12, mỗi bình luận bị nối vào một cột văn bản (task_details.binh_luan) nên không lưu tên/giờ.
-- Nhưng lúc đó hệ thống vẫn ghi activity_log (hanh_dong='them_binh_luan') kèm thành viên và thời gian cho từng lần bình luận.
-- File này ghép từng dòng bình luận cũ với từng dòng nhật ký theo thứ tự thời gian, rồi chuyển vào bảng task_comments.
--
-- An toàn: chỉ ghép khi SỐ DÒNG bình luận cũ == SỐ lần nhật ký của task đó (ghép chắc chắn). Không khớp (ví dụ có
-- bình luận nhiều dòng) thì để nguyên, vẫn hiện là "Bình luận cũ". Task nào ghép xong thì cột cũ được làm rỗng,
-- nên chạy lại nhiều lần vẫn an toàn. Chạy trong Supabase SQL Editor, sau file 12 (và sau 15 cho đúng thứ tự).
begin;

do $$
declare t record; v_lines text[]; v_users uuid[]; v_times timestamptz[]; i int; v_ok int := 0; v_skip int := 0;
begin
 for t in select task_id, binh_luan from public.task_details where btrim(binh_luan) <> '' loop
  v_lines := array(select btrim(l) from unnest(string_to_array(t.binh_luan, E'\n')) l where btrim(l) <> '');
  select array_agg(m.user_id order by a.thoi_gian), array_agg(a.thoi_gian order by a.thoi_gian)
    into v_users, v_times
    from public.activity_log a join public.members m on m.id = a.member_id
   where a.task_id = t.task_id and a.hanh_dong = 'them_binh_luan'
     and not exists (select 1 from public.task_comments c
                      where c.task_id = a.task_id and c.user_id = m.user_id
                        and abs(extract(epoch from c.tao_luc - a.thoi_gian)) < 2);
  if coalesce(array_length(v_lines, 1), 0) > 0 and coalesce(array_length(v_users, 1), 0) = array_length(v_lines, 1) then
   for i in 1..array_length(v_lines, 1) loop
    insert into public.task_comments(task_id, user_id, noi_dung, tao_luc) values (t.task_id, v_users[i], left(v_lines[i], 2000), v_times[i]);
   end loop;
   update public.task_details set binh_luan = '' where task_id = t.task_id;
   v_ok := v_ok + 1;
  else
   v_skip := v_skip + 1;
  end if;
 end loop;
 raise notice 'Đã gắn tên/giờ cho % task; bỏ qua % task (số dòng không khớp nhật ký).', v_ok, v_skip;
end $$;

commit;

-- Xem kết quả: select task_id, user_id, noi_dung, tao_luc from public.task_comments order by tao_luc desc;
