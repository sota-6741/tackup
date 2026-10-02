import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (requiresSignIn(request) && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

function requiresSignIn(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  return pathname === "/boards" || pathname.startsWith("/boards/");
}

/** 署名付きの URL のオリジン。ローカルではエミュレーター、本番では Cloud Storage。 */
const STORAGE_ORIGIN = new URL(
  process.env.STORAGE_API_ENDPOINT || "https://storage.googleapis.com",
).origin;

/**
 * style-src の 'unsafe-inline' は、サーバーで描画する style 属性（サイドバーの幅など）に必要。style-src に nonce を入れると 'unsafe-inline' が無視されるので入れない。
 * 'wasm-unsafe-eval' は、pdf.js が PDF の中の画像（JPEG 2000 など）を WASM で展開するのに必要。WASM のコンパイルだけを許し、eval は許さない。
 * worker-src を書かないと script-src の 'strict-dynamic' を受け継ぎ、nonce を付けられない pdf.js の worker が動かない。
 * connect-src のストレージのオリジンは、ブラウザが原本とサムネイルを署名付きの URL へ直接 PUT するのに必要。
 */
function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
    "worker-src 'self'",
    `connect-src 'self' ${STORAGE_ORIGIN}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://lh3.googleusercontent.com",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
