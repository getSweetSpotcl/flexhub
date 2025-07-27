import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/search(.*)',
  '/spaces/(.*)',
  '/how-it-works',
  '/become-host',
  '/about',
  '/contact',
  '/help',
  '/terms',
  '/privacy',
  '/api/webhooks/(.*)',
  '/onboarding',
  '/login',
  '/register',
  '/api/uploadthing/(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // Allow public routes to pass through
  if (isPublicRoute(request)) {
    return
  }

  // Protect all other routes
  await auth.protect()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
