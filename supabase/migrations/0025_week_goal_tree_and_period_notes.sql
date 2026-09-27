-- ═══════════════════════════════════════════════════════════════════
-- 0025 — Haftalık hedef ağacı + dönem amacı (ay / hafta özeti)
--
-- BİR KEZ ÇALIŞTIRIN. `if not exists` / `drop ... if exists` her
-- yerde kullanıldı; yine de 0022 gibi elle, sırayla çalıştırılmalı.
--
-- İki bağımsız ekleme:
--
--   1. goal_nodes artık HAFTALIK hedefe de bağlanabiliyor. Kullanıcı
--      için asıl planlama birimi hafta: "bu hafta Kimya'da şunlar"
--      diye bölüp günlere dağıtmak istiyor. Aylık ağaç YERİNDE KALIYOR.
--
--   2. period_notes: ayın / haftanın serbest "amaç" metni. Hedef
--      kalemi değil — "bu hafta organik kimya bitecek, deneme
--      analizlerine ağırlık" gibi bir özet paragrafı.
-- ═══════════════════════════════════════════════════════════════════


-- ───────────────────── 1. goal_nodes.week_goal_id ───────────────────
--
-- ── Neden ayrı tablo (week_goal_nodes) değil? ──
-- Düğümün şekli, derinlik kuralları, taşıma trigger'ları, tasks.node_id
-- bağı ve istemcideki bütün ağaç kodu (tree.ts, nodeprogress.ts,
-- GoalTreeView) AYNI. İkinci bir tablo bunların hepsini ikiye
-- katlardı. Fark yalnızca ağacın SAHİBİ: aylık ya da haftalık hedef.
--
-- Her düğümün TAM OLARAK BİR sahibi var (aşağıdaki check). Sahip yine
-- her satırda dolu — 0022'nin "tek sorguda tüm ağaç" denormalizasyonu
-- iki sütun için de geçerli.
alter table public.goal_nodes
  add column if not exists week_goal_id uuid
    references public.week_goals (id) on delete cascade;

alter table public.goal_nodes
  alter column plan_goal_id drop not null;

alter table public.goal_nodes
  drop constraint if exists goal_nodes_one_owner;
alter table public.goal_nodes
  add constraint goal_nodes_one_owner
    check (num_nonnulls(plan_goal_id, week_goal_id) = 1);

comment on column public.goal_nodes.week_goal_id is
  'Ağacın ait olduğu HAFTALIK hedef. plan_goal_id ile tam olarak biri dolu (goal_nodes_one_owner).';

create index if not exists goal_nodes_user_week_goal_idx
  on public.goal_nodes (user_id, week_goal_id, parent_id nulls first, sort_order)
  where week_goal_id is not null;

-- Ebeveyn-çocuk aynı sahipte kalmalı — 0022'deki kontrol yalnızca
-- plan_goal_id'ye bakıyordu ve `<>` null'da hiçbir şey yakalamazdı.
-- `is distinct from` iki sütunu da null-güvenli karşılaştırır.
create or replace function public.stamp_goal_node_depth()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  parent_depth smallint;
  parent_goal  uuid;
  parent_week  uuid;
begin
  if new.parent_id is null then
    new.depth := 1;
    return new;
  end if;

  select n.depth, n.plan_goal_id, n.week_goal_id
    into parent_depth, parent_goal, parent_week
  from public.goal_nodes n
  where n.id = new.parent_id;

  if parent_depth is null then
    raise exception 'Üst düğüm bulunamadı: %', new.parent_id;
  end if;

  if parent_goal is distinct from new.plan_goal_id
     or parent_week is distinct from new.week_goal_id then
    raise exception 'Üst düğüm başka bir hedefe ait';
  end if;

  new.depth := (parent_depth + 1)::smallint;
  return new;
end;
$$;


-- ───────────────────────── 2. period_notes ──────────────────────────
--
-- ── Neden week_goals / plan_goals'a bir sütun değil? ──
-- Amaç metni bir HEDEFE değil DÖNEME ait: haftanın hiç hedefi yokken
-- de yazılabilmeli ("bu hafta dinlenme haftası"). Hedef satırına
-- koymak, "hangi hedefin notu haftanın amacı?" sorusunu doğururdu.
--
-- ── Neden day_notes değil? ──
-- day_notes gün başına bir satır (PK user_id + date). Ayın amacını
-- ayın 1'ine yazmak, o günün planıyla aynı satırı paylaşmak olurdu.
--
-- Satır başına (kullanıcı, ölçek, dönem başı) tek kayıt. Dönem başı
-- 0008/0011'in kanonik çapalarıyla aynı kurala uyar: ay → ayın 1'i,
-- hafta → ISO pazartesisi.
create table if not exists public.period_notes (
  user_id      uuid not null references auth.users (id) on delete cascade,
  scale        text not null check (scale in ('month', 'week')),
  period_start date not null,
  -- Boş metin geçerli: kullanıcı yazdığını silebilmeli. Satırı silmek
  -- yerine boş yazmak, autosave'i tek bir upsert'e indiriyor.
  body         text not null default '' check (length(body) <= 4000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  primary key (user_id, scale, period_start),

  constraint period_notes_canonical_start check (
    (scale = 'month' and extract(day from period_start) = 1)
    or (scale = 'week' and extract(isodow from period_start) = 1)
  )
);

comment on table public.period_notes is
  'Ayın / haftanın serbest amaç metni. Hedef kalemlerinden bağımsız; dönem başına tek satır.';

alter table public.period_notes enable row level security;

drop policy if exists period_notes_select on public.period_notes;
create policy period_notes_select on public.period_notes
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists period_notes_insert on public.period_notes;
create policy period_notes_insert on public.period_notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists period_notes_update on public.period_notes;
create policy period_notes_update on public.period_notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists period_notes_delete on public.period_notes;
create policy period_notes_delete on public.period_notes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists period_notes_stamp_user_id on public.period_notes;
create trigger period_notes_stamp_user_id
  before insert on public.period_notes
  for each row execute function public.stamp_user_id();

drop trigger if exists period_notes_touch_updated_at on public.period_notes;
create trigger period_notes_touch_updated_at
  before update on public.period_notes
  for each row execute function public.touch_updated_at();
