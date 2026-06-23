// middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes accessible only when NOT logged in
const PUBLIC_ROUTES  = ["/login", "/register"];

// Routes only for admins
const ADMIN_ROUTES   = ["/admin"];

// Routes only for students
const STUDENT_ROUTES = [
  "/dashboard",
  "/practice",
  "/mock-test",
  "/exam",
  "/results",
  "/analytics",
  "/bookmarks",
];

export default auth((req) => {
  const { nextUrl, auth: session } = req as NextRequest & { auth: any };
  const pathname = nextUrl.pathname;
  const isLoggedIn = !!session?.user;
  const role       = session?.user?.role;

  // ── Redirect logged-in users away from auth pages ─────────────────────────
  if (isLoggedIn && PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    const dest = role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(dest, nextUrl));
  }

  // ── Protect all non-public routes ─────────────────────────────────────────
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Admin-only routes ─────────────────────────────────────────────────────
  if (
    isLoggedIn &&
    ADMIN_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // ── Student-only routes ───────────────────────────────────────────────────
  if (
    isLoggedIn &&
    STUDENT_ROUTES.some((r) => pathname.startsWith(r)) &&
    role !== "STUDENT"
  ) {
    return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    // Match all request paths except static assets and NextAuth API routes
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
