import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/site-url";

/** E-posta doğrulama bağlantısının döndüğü yer. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  // Açık yönlendirme olmaması için yalnızca site içi göreli yollara izin ver.
  const requestedNext = searchParams.get("next") ?? "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/";

  /*
   * Kök, isteğin GELDİĞİ adresten alınır. `getSiteUrl()` sunucuda
   * NEXT_PUBLIC_SITE_URL yoksa VERCEL_URL'e düşer: bu, yayına özel
   * (todolist-xxxx.vercel.app) ve Vercel Deployment Protection ile
   * korunan adrestir — kullanıcı oturum açılmış haldeyken Vercel giriş
   * sayfasına atılıyordu. Çerez de isteğin geldiği alana yazıldığı
   * için doğru kök zaten bu.
   *
   * nextUrl.origin proxy arkasında dahili adres verebileceğinden önce
   * x-forwarded-host bakılır.
   */
  const origin = requestOrigin(request) ?? getSiteUrl();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/giris?error=auth`);
}

function requestOrigin(request: NextRequest): string | null {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return null;
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
