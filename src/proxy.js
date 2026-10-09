import { NextResponse } from "next/server";

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Keep previously shared unlock links useful after removing the access gate.
  if (pathname === "/job-search/unlock" || pathname.startsWith("/job-search/unlock/")) {
    return NextResponse.redirect(new URL("/job-search", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/job-search/:path*"],
};
