-- 0032 GERİ ALMA — öğrencinin "ek çalışma" yazma politikaları geri gelir
-- (0028'deki tanımların aynısı).

drop policy if exists tasks_student_insert on public.tasks;
create policy tasks_student_insert on public.tasks
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and user_id = (select public.my_coach_id())
  );

drop policy if exists tasks_student_update on public.tasks;
create policy tasks_student_update on public.tasks
  for update to authenticated
  using (
    created_by = (select auth.uid())
    and user_id = (select public.my_coach_id())
  )
  with check (
    created_by = (select auth.uid())
    and user_id = (select public.my_coach_id())
  );

drop policy if exists tasks_student_delete on public.tasks;
create policy tasks_student_delete on public.tasks
  for delete to authenticated
  using (
    created_by = (select auth.uid())
    and user_id = (select public.my_coach_id())
  );
