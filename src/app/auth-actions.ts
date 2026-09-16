'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { destroyAllSessions, destroyCurrentSession, requireUser } from '@/lib/auth'

/** 登出当前设备 */
export async function signOutAction(): Promise<void> {
  await destroyCurrentSession()
  redirect('/sign-in')
}

/** 登出所有设备 */
export async function signOutAllAction(): Promise<void> {
  const user = await requireUser()
  await destroyAllSessions(user.id)
  await destroyCurrentSession()
  redirect('/sign-in')
}

/** 供客户端读取 OAuth state 用（占位，保持 API 对称） */
export async function clearOAuthCookies(): Promise<void> {
  const jar = await cookies()
  jar.delete('dk_oauth_state')
  jar.delete('dk_oauth_next')
}
