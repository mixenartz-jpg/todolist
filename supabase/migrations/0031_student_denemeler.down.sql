-- 0031 GERİ ALMA — koçun okuma yetkisi kalkar. Taşınan denemeler
-- öncesinde move_denemeler_to_student ile geri taşınmalıdır.
drop function if exists public.move_denemeler_to_student(text, text);
drop policy if exists deneme_gorsel_coach_select on storage.objects;
drop policy if exists deneme_yanlislari_coach_select on public.deneme_yanlislari;
drop policy if exists deneme_dersleri_coach_select on public.deneme_dersleri;
drop policy if exists denemeler_coach_select on public.denemeler;
