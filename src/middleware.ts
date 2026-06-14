import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Protect /admin (pages) and admin-only API routes. Customers and anonymous
// users are redirected to the admin login. Authorization (role check) is done
// in the `authorized` callback below using the JWT, so unauthorized users never
// reach the protected handlers.
export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Only gate admin areas here; everything else is public.
        if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
          return token?.role === "ADMIN" || token?.role === "STAFF";
        }
        return true;
      },
    },
    pages: { signIn: "/login" },
  },
);

export const config = {
  // Run the middleware on admin pages and admin APIs only.
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
