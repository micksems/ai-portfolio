import { NextResponse } from "next/server";
import { ACCESS_COOKIE, getValidPinKey } from "./lib/job-search-auth";

export function proxy(request) {
  const { pathname } = request.nextUrl;
  if (pathname === "/job-search/unlock" || pathname.startsWith("/job-search/unlock/")) {
    return NextResponse.next();
  }

  const accessPin = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessPin && getValidPinKey(accessPin)) {
    return NextResponse.next();
  }

  const unlockUrl = new URL("/job-search/unlock", request.url);
  unlockUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: ["/job-search/:path*"],
};
