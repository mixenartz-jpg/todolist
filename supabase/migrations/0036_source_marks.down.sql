-- 0036 GERİ ALMA — elle işaretler SİLİNİR (görevler ve sonuçlar kalır).
drop table if exists public.source_range_marks cascade;
drop table if exists public.source_item_marks cascade;
drop function if exists public.item_coach(uuid);
