-- ═══════════════════════════════════════════════════════════════════
-- 0032 — Öğrenci görev yazamaz ("ek çalışma" kalktı)
--
-- YALNIZCA KISITLAMA: hiçbir sütun/satır silinmez. `tasks.created_by`
-- yerinde kalır (eski ek çalışmalar koçun listesinde normal görev
-- olarak görünür). Geri alma: 0032_student_readonly_tasks.down.sql
--
-- Öğrenci `tasks` tablosunda yalnızca SELECT yapar
-- (`tasks_student_select`, 0028). Tamamlama `task_results` üzerinden
-- yazılmaya devam eder; `tasks.done` trigger ile eşitlenir.
--
-- Not: 0002'deki koç politikaları `user_id = auth.uid()` ister;
-- öğrencinin INSERT'inde `stamp_task_owner` user_id'yi KOÇA çevirir,
-- yani öğrenci kendi adına da görev açamaz.
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists tasks_student_insert on public.tasks;
drop policy if exists tasks_student_update on public.tasks;
drop policy if exists tasks_student_delete on public.tasks;
