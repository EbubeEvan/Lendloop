import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin-access";
import { hasClerkServerKeys } from "@/lib/env.server";

const isProtectedRoute = createRouteMatcher([
  "/browse(.*)",
  "/listings(.*)",
  "/requests(.*)",
  "/incoming(.*)",
  "/loans(.*)",
  "/admin(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

const withClerk = hasClerkServerKeys
  ? clerkMiddleware(async (auth, request) => {
      if (isProtectedRoute(request)) {
        await auth.protect();
      }

      // Non-admins get the ordinary 404 page with a real 404 status, so admin
      // screens are indistinguishable from routes that do not exist. This runs
      // for typed URLs and client-side navigations alike, before rendering.
      if (isAdminRoute(request) && !(await isAdminRequest(await auth()))) {
        return NextResponse.rewrite(new URL("/not-found", request.url), { status: 404 });
      }
    })
  : null;

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!withClerk) {
    // Local preview without Clerk keys: protected pages render a setup notice.
    return NextResponse.next();
  }
  return withClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
