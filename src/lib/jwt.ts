/**
 * 短期 access JWT（jose / HS256）。
 * 单独成文件的原因：src/proxy.ts 跑在 Edge Runtime，不能引入含 node:crypto 的模块，
 * 这里只依赖 jose，Edge 与 Node 都能用。
 */

import { SignJWT, jwtVerify } from 'jose'

export const ACCESS_TTL_SECONDS = 15 * 60

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET 未配置或太短（至少 16 位）')
  }
  return new TextEncoder().encode(secret)
}

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(secretKey())
}

export async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}
