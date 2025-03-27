import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  response.headers.set(
    'Content-Security-Policy',
    `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://udify.app https://dify.ai https://api.dify.ai;
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https: https://udify.app https://dify.ai https://api.dify.ai;
      font-src 'self' data:;
      connect-src 'self' https://udify.app https://dify.ai https://api.dify.ai;
      frame-src 'self' https://udify.app https://dify.ai https://api.dify.ai;
      frame-ancestors 'self' https://udify.app https://dify.ai https://api.dify.ai;
      form-action 'self';
      base-uri 'self';
      media-src 'self' blob:;
    `.replace(/\s+/g, ' ').trim()
  )

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 