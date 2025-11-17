import { adminAuth } from "@/lib/server/firebase-admin"

function parseAuthorizationHeader(header: string | null): string | null {
  if (!header) return null
  const [scheme, token] = header.split(" ")
  if (scheme?.toLowerCase() !== "bearer" || !token) return null
  return token.trim()
}

export async function requireAdmin(request: Request) {
  const token = parseAuthorizationHeader(request.headers.get("authorization"))
  if (!token) {
    throw new Response(JSON.stringify({ error: "Missing admin authentication." }), { status: 401 })
  }

  try {
    await adminAuth.verifyIdToken(token)
  } catch (error) {
    console.error("[requireAdmin] invalid token", error)
    throw new Response(JSON.stringify({ error: "Invalid or expired session." }), { status: 401 })
  }
}
