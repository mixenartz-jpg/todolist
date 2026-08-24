-- ═══════════════════════════════════════════════════════════════════
-- 0014 — Haftalık hedef, aylık hedefin DİLİMİ olabilsin
--
-- BİR KEZ ÇALIŞTIRIN. `add column` kullanır; ikinci çalıştırma
-- "already exists" hatası verir (0001–0013 de böyledir).
--
-- ── Hangi boşluk? ──
-- 0011 hafta ölçeğini getirdi ama iki ölçek birbirini TANIMIYORDU:
--
--   plan_goals   "bu ay kitabı bitir"
--   week_goals   "bu hafta 3 bölüm bitir"   ← ilkinin dilimi, ama
--                                              şemada hiçbir bağ yok
--
-- Kullanıcı ikisini kafasında birleştiriyordu; uygulama birleştiremiyor,
-- dolayısıyla ay sonunda "bu hedefe hangi haftalarda ne kadar
-- yaklaştım" sorusunu cevaplayamıyordu. Aylık hedef, altındaki
-- haftaların toplamı olduğu hâlde ekranda ilgisiz iki liste olarak
-- duruyordu — kullanıcının "ekranlar birbirine bağlanmıyor" dediği
-- şeyin şema tarafındaki karşılığı.
--
-- ── Neden `tasks.week_goal_id` DEĞİL? ──
-- İlk akla gelen bu ve YANLIŞ olurdu. Bir görev hem haftalık hem aylık
-- hedefe bağlanabilseydi:
--
--   1. ÇİFT SAYIM. goalProgress() (src/features/planlama/rollup.ts)
--      "dilimler %100'e toplanır" garantisine dayanır; aynı görev iki
--      hedefte sayıldığında o garanti sessizce kırılır ve ay özeti
--      toplamı %100'ü aşar.
--
--   2. TAŞIMADA BOZULUR. useRescheduleTask / useMoveTask yalnızca
--      due_date yazar. Görev başka bir haftaya taşındığında
--      week_goal_id eski haftayı göstermeye devam eder ve bağ, kimse
--      fark etmeden yanlışa döner. (0011'in `tasks.goal_id` yalnızca
--      plan_goals'a bakar kararı da tam bu yüzden alınmıştı.)
--
-- Eksik bağ görev seviyesinde değil, BİR SEVİYE YUKARIDA. Görevler
-- aylık hedefe bağlanmaya devam eder; haftalık hedef ise aylık hedefi
-- GRUPLAR, ikinci bir sayaç açmaz. Çift sayım imkânsız kalır.
--
-- ── Neden nullable? ──
-- Haftalık hedeflerin çoğu bir aylık hedefin dilimi DEĞİLDİR ("bu
-- hafta masayı topla"). Zorunlu kılmak, kullanıcıyı her haftalık hedef
-- için uydurma bir aylık hedef açmaya iterdi. null = "bağımsız hafta
-- hedefi" ve bu birinci sınıf bir durumdur (tasks.color_slot'un
-- null'ıyla aynı ruhta — 0013).
--
-- ── Neden `on delete set null`? ──
-- tasks.goal_id ve tasks.category_id ile AYNI (0008). Aylık hedef
-- silindiğinde haftalık hedef YAŞAMALI: o hafta gerçekten çalışıldı ve
-- `done_count` gerçek bir kayıt. `cascade` olsaydı bir aylık hedefi
-- silmek, altındaki haftaların geçmişini de sessizce silerdi.
-- ═══════════════════════════════════════════════════════════════════

alter table public.week_goals
  add column plan_goal_id uuid
    references public.plan_goals (id) on delete set null;

comment on column public.week_goals.plan_goal_id is
  'Bu haftalık hedefin hizmet ettiği AYLIK hedef. null → bağımsız hafta hedefi. Bir GRUPLAMADIR, ikinci bir ilerleme kaynağı değil: aylık hedefin sayacı yalnızca kendi done_count''undan ya da bağlı GÖREVLERDEN okunur (bkz. rollup.ts goalProgress).';

-- Index YOK — 0008 ve 0013'teki gerekçenin aynısı. Hiçbir sorgu bu
-- sütunla FİLTRELEMİYOR: useWeekGoals() bir haftanın hedeflerini zaten
-- week_goals_user_week_idx ile çeker ve aylık hedefe göre gruplama
-- istemcide, bellekte yapılır. Haftada tutulan hedef sayısı tek
-- haneli; onu indekslemek okumaya hiçbir şey katmaz, her yazmaya
-- maliyet ekler.

-- RLS DEĞİŞMEZ: mevcut week_goals policy'leri satırın tamamını kapsar,
-- sütun bazlı değildir (0013 ile aynı).
--
-- ── Yabancı anahtar RLS'i "delip geçmez mi"? ──
-- Geçer, ama zararsız — 0008'in tasks.category_id/goal_id için yazdığı
-- gerekçenin aynısı, burada da kaydedilsin diye tekrarlanıyor.
--
-- Postgres FK kısıtı VARLIK KONTROLÜNÜ yükseltilmiş yetkiyle yapar,
-- yani teknik olarak başka bir kullanıcının plan_goals kimliği
-- yazılabilir. Ama bu hiçbir şey SIZDIRMAZ:
--
--   · plan_goals'un select policy'si o satırı yine gizler; saldırgan
--     kendi oturumunda başlığı, notu, sayacı OKUYAMAZ.
--   · Arayüz o bağı "başka ayın hedefi" gibi yetim sayar
--     (goaloptions.ts zaten bu durumu ele alıyor).
--   · Kimlikler rastgele uuid; tahmin edilebilir değil.
--
-- Yani en kötü sonuç, kullanıcının KENDİ satırına hiçbir yerde
-- görünmeyen opak bir uuid yazması. Sahiplik doğrulayan bir trigger
-- (routine_schedules'daki stamp_schedule_owner gibi) buraya savunma
-- katmazdı; 0008 aynı sebeple eklememişti.
