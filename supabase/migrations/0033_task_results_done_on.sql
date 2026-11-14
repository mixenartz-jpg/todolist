-- ═══════════════════════════════════════════════════════════════════
-- 0033 — Görevin gerçekten yapıldığı gün (`task_results.done_on`)
--
-- YALNIZCA EKLEME. Geri alma: 0033_task_results_done_on.down.sql
--
-- `date` PLANLANAN gün olarak kalır (PK'nin parçası; günlük yüzde ona
-- göre). Öğrenci yarının görevini bugün yaparsa `date` = yarın,
-- `done_on` = bugün → koç "erken yapıldı" rozeti görür.
--
-- Varsayılan `current_date` DEĞİL: Supabase UTC çalışır, gece
-- 00:00–03:00 arasında yapılan iş bir önceki güne yazılırdı. Gün
-- İstanbul saatine göre alınır (routines.start_date ile aynı).
--
-- Trigger: satır daha önce yalnızca notla açılmış olabilir; durum
-- done/partial'a GEÇTİĞİ an gün yeniden damgalanır (yarım → tamam
-- da yeni gün sayılır). Durum aynı kaldıkça (ör. sayı düzeltme)
-- damga değişmez.
-- ═══════════════════════════════════════════════════════════════════

alter table public.task_results
  add column if not exists done_on date
    default ((now() at time zone 'Europe/Istanbul')::date);

-- Eski satırlar: en iyi tahmin son güncelleme günü.
update public.task_results
   set done_on = (updated_at at time zone 'Europe/Istanbul')::date
 where done_on is null;

create or replace function public.stamp_done_on()
returns trigger
language plpgsql security invoker
set search_path = ''
as $$
begin
  if new.status in ('done', 'partial')
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.done_on := (now() at time zone 'Europe/Istanbul')::date;
  end if;
  return new;
end;
$$;

drop trigger if exists task_results_done_on on public.task_results;
create trigger task_results_done_on
  before insert or update of status on public.task_results
  for each row execute function public.stamp_done_on();

create index if not exists task_results_student_done_on_idx
  on public.task_results (student_id, done_on);
