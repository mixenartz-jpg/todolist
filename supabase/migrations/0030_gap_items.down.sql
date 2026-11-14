-- 0030 GERİ ALMA — eksik konu havuzu silinir (sonuçlardaki konular kalır).
drop trigger if exists tasks_close_gap_items on public.tasks;
drop function if exists public.close_gap_items_on_done();
drop trigger if exists task_results_collect_gaps on public.task_results;
drop function if exists public.collect_gap_items();
drop table if exists public.gap_items cascade;
drop function if exists public.topic_key(text);
