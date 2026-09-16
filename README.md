# 打卡么 · Dakame

打开即用、3 秒完成打卡的极简习惯打卡工具。

- **登录**：自研认证，GitHub OAuth2 + 邮箱验证码，**无 Clerk、无密码**
- **会话**：短期 JWT（15 分钟）+ Redis 可撤销 session（30 天滑动续期）
- **数据**：Upstash Redis（Bitmap 存打卡记录）
- **目标**：周 / 月 / 年三个周期目标 + 进度环
- **AI 英语补习**：默认 Cloudflare Workers AI，可切 OpenAI / Anthropic
- **PWA**：可安装到主屏幕，离线可打开
- 移动端优先，最大宽度 480px 居中

## 快速开始

```bash
pnpm install
cp .env.local.example .env.local   # 至少填 AUTH_SECRET + Upstash 两个变量
pnpm dev
```

打开 http://localhost:3000 ，未登录会自动跳转 `/sign-in`。

> 环境变量没配全时页面不会 500，而是渲染一份「还差哪几个变量、去哪里拿」的配置引导。
> 本地没配邮箱服务时，验证码会打印在 `pnpm dev` 的终端里；也可以直接用「本地开发快捷登录」（仅开发环境可见）。

## 认证方案

不用 Clerk，自己实现，因为需求就是"部署即可登录"：

| 方式 | 说明 |
| --- | --- |
| GitHub OAuth2 | 在 GitHub 建 OAuth App，填 `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` 即可，新增 provider 只需在 `src/lib/oauth.ts` 的 `PROVIDERS` 里加一条 |
| 邮箱验证码 | 6 位 OTP，10 分钟有效，最多试 5 次；走 Resend REST API，未配置时开发环境打印到终端 |
| 本地开发快捷登录 | `NODE_ENV !== production` 才显示，生产自动隐藏 |

会话是 **JWT + Redis 混合**：

- `dk_at`：15 分钟短期 JWT（jose HS256）。middleware 里纯签名校验就放行，不查 Redis，快。
- `dk_rt`：refresh token，随机 32 字节，Redis 里只存 sha256，30 天滑动续期。
- 撤销：删掉 Redis 里的 session 即可让该设备立即失效；也支持「退出所有设备」。

userId 一律来自服务端会话，绝不接受客户端传入。

## 环境变量

复制 `.env.local.example` 为 `.env.local`：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `AUTH_SECRET` | ✅ | `openssl rand -hex 32`，JWT 签名用 |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | ✅ | 数据 + 会话存储 |
| `NEXT_PUBLIC_APP_URL` | 生产建议 | OAuth 回调域名，Vercel 上可留空自动取 `VERCEL_URL` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | 选填 | 启用 GitHub 登录 |
| `RESEND_API_KEY` / `EMAIL_FROM` | 选填 | 启用邮箱验证码真实发信 |
| `AI_PROVIDER` | 选填 | `cloudflare`（默认）/ `openai` / `anthropic` |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_AI_API_TOKEN` | 选填 | Workers AI 凭证，不配则自动用内置题库 |
| `APP_TIMEZONE` | 选填 | 打卡日期时区，默认 `Asia/Shanghai` |
| `NEXT_PUBLIC_SPONSOR_URL` | 选填 | 捐助页外链 |

## 获取三方凭证

**Upstash Redis**：upstash.com 注册 → Create Database → 数据库详情 → REST API 面板复制 URL 与 Token。

**GitHub OAuth App**：github.com → Settings → Developer settings → OAuth Apps → New OAuth App

- Homepage URL：`http://localhost:3000`（生产换成你的域名）
- Authorization callback URL：`http://localhost:3000/api/auth/github/callback`

创建后复制 Client ID，再点 Generate a new client secret 复制 Secret。

**Resend**（可选）：resend.com → API Keys 创建一个，再到 Domains 添加发信域名，填 `EMAIL_FROM`。

**Cloudflare Workers AI**（可选）：Cloudflare 控制台 → 复制 Account ID；Workers & Pages → AI → 创建 API Token。

## Redis 数据模型

```
dakame:user:{userId}                     Hash    习惯设置 name/emoji/color/reminderTime/createdAt
dakame:checkin:{userId}:{yyyyMM}         Bitmap  打卡记录，offset = 日期 - 1
dakame:goals:{userId}                    Hash    周/月/年目标
dakame:learn:{userId}:{yyyyMM}           Bitmap  英语任务完成标记
dakame:learn:answers:{userId}            Hash    field = yyyy-MM-dd，value = 题目+答案+批改 JSON
dakame:learn:daily:{yyyy-MM-dd}          String  当天英语题目（全局共享，TTL 7 天）

dakame:auth:user:{userId}                Hash    账号资料
dakame:auth:github:{githubId}            String  → userId 索引
dakame:auth:email:{email}                String  → userId 索引
dakame:auth:session:{tokenHash}          String  会话记录（30 天）
dakame:auth:sessions:{userId}            Set     该用户全部会话，用于「退出所有设备」
dakame:auth:otp:{email}                  String  邮箱验证码（10 分钟）
```

## 目录结构

```
src/
  app/
    actions.ts              # 业务 Server Actions（打卡/目标/学习/导出）
    auth-actions.ts         # 登出
    email-actions.ts        # 邮箱验证码登录
    api/auth/github/        # OAuth2 起点 + 回调（Node Runtime）
    page.tsx                # 今日
    learn/ calendar/ goals/ settings/ sponsor/
    sign-in/ sign-up/
  components/               # CheckInButton / WeekDots / CalendarGrid / BottomNav / SettingsForm / GoalProgress / LessonCard / AnswerForm / LoginForm / UserMenu
  lib/
    redis.ts                # Redis 客户端 + key 定义
    auth.ts                 # 会话与用户（JWT + Redis）
    jwt.ts                  # access JWT（Edge 安全）
    cookies.ts mailer.ts oauth.ts
    checkin.ts              # Bitmap 打卡逻辑
    goals.ts habit.ts learn.ts ai.ts date.ts ratelimit.ts env.ts types.ts
  middleware.ts             # 路由保护
public/                     # manifest.webmanifest / sw.js / icons
```

## 部署（Vercel）

1. Push 到 GitHub → Vercel 导入项目
2. Environment Variables 里填入上表的变量（`NEXT_PUBLIC_APP_URL` 填你的 Vercel 域名）
3. GitHub OAuth App 的回调地址改成 `https://你的域名/api/auth/github/callback`

不需要 Edge Runtime，全部跑在 Node.js 运行时。

## 安装为 PWA

- **iPhone**：Safari 打开 → 分享 → 「添加到主屏幕」
- **Android**：Chrome → 菜单 → 「安装应用」

离线时展示缓存数据，联网后自动同步。

## 限流

- 写操作（打卡 / 改设置 / 改目标）：每个 userId 每分钟 10 次
- AI 调用：每个 userId 每天 30 次
- 邮箱验证码：每个邮箱每 10 分钟 5 次

## TODO

- 提醒时间目前只保存，实际推送待接入 Web Push（VAPID + 定时任务）
- 学习历史展示最近 7 天，暂不支持按月翻页
- 邮箱验证码依赖 Resend，后续可加 SMTP 适配

## 赞助

项目内置捐助页：`/sponsor`（首页底部、设置页、右上角 ♥ 均可进入），内含 AlipayHK 收款二维码。

想换成自己的捐助外链，在 `.env.local` 里设 `NEXT_PUBLIC_SPONSOR_URL=https://xxx.com/sponsor` 即可覆盖。

二维码图片放在 `public/sponsor-alipayhk.jpg`，换成你自己的收款码就行。

打卡么免费、无广告。作者是学生，赞助主要用于续费和买咖啡 ☕

## License

MIT
