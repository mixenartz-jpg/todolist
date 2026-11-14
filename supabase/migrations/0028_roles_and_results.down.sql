-- ═══════════════════════════════════════════════════════════════════
-- 0028 GERİ ALMA — yalnızca 0028'in eklediklerini kaldırır.
--
-- DİKKAT: öğrencinin girdiği sonuçlar, günlük formlar ve koç notları
-- SİLİNİR. Öğrencinin eklediği "ek çalışma" görevleri koçun hesabında
-- normal görev olarak KALIR. Çalıştırmadan önce yedek alın.
-- ═══════════════════════════════════════════════════════════════════

drop table if exists public.coach_notes cascade;
drop table if exists public.daily_logs cascade;
drop table if exists public.task_results cascade;

drop function if exists public.sync_task_done();
drop function if exists public.stamp_student_id();
drop function if exists public.stamp_coach_id();

drop policy if exists tasks_student_select on public.tasks;
drop policy if exists tasks_student_insert on public.tasks;
drop policy if exists tasks_student_update on public.tasks;
drop policy if exists tasks_student_delete on public.tasks;

-- Görev damgasını 0003'teki hâline döndür.
drop trigger if exists tasks_stamp_user_id on public.tasks;
create trigger tasks_stamp_user_id
  before insert on public.tasks
  for each row execute function public.stamp_user_id();
drop function if exists public.stamp_task_owner();

alter table public.tasks drop column if exists created_by;

drop trigger if exists auth_users_create_profile on auth.users;
drop function if exists public.create_profile_for_user();
drop function if exists public.link_student(text, text);

update auth.users set raw_app_meta_data = raw_app_meta_data - 'role'
 where raw_app_meta_data ? 'role';

drop table if exists public.profiles cascade;
drop function if exists public.sync_role_to_jwt();
drop function if exists public.is_my_student(uuid);
drop function if exists public.my_coach_id();
drop function if exists public.my_role();
