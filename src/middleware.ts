import { NextResponse, type NextRequest } from "next/server";

/**
 * Filtre de confort : sans cookie de session, les pages d'administration
 * redirigent directement vers la connexion. La VRAIE vérification (validité de
 * la session en base, rôle) est faite côté serveur par chaque page et chaque
 * action — ce filtre n'est pas une mesure de sécurité à lui seul.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has("__Host-ad_session") || req.cookies.has("ad_session");
  if (!hasSession && pathname.startsWith("/admin") && !pathname.startsWith("/admin/connexion")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/connexion";
    url.search = pathname === "/admin" ? "" : `?suivant=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
