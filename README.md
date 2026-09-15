# 打卡么 · Dakame

打开即用、3 秒完成打卡的极简习惯打卡工具。

- **登录**：Clerk（注册/登录/登出，数据按 `userId` 完全隔离）
- **数据**：Upstash Redis（Bitmap 存打卡记录）
- **目标**：周 / 月 / 年三个周期目标 + 进度环
- **AI 英语补习**：默认 Cloudflare Workers AI，可切 OpenAI / Anthropic
- **PWA**：可安装到主屏幕，离线可打开
- 移动端优先，最大宽度 480px 居中

## 快速开始

```bash
pnpm install
cp .env.local.example .env.local   # 填入 Clerk + Upstash
pnpm dev
```

打开 http://localhost:3000 ，未登录会自动跳转 `/sign-in`。

> 环境变量没配全时，页面不会 500，而是渲染一份「还差哪几个变量、去哪里拿」的配置引导。

## 环境变量

复制 `.env.local.example` 为 `.env.local`：

| 变量 | 说明 |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API Keys → Publishable key |
| `CLERK_SECRET_KEY` | Clerk → API Keys → Secret key |
| `UPSTASH_REDIS_REST_URL` | Upstash 数据库详情 → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | 同上 |
| `AI_PROVIDER` | `cloudflare`（默认）/ `openai` / `anthropic` |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_AI_API_TOKEN` | Workers AI 调用凭证 |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | 可选，切换提供商时使用 |
| `APP_TIMEZONE` | 打卡日期所用时区，默认 `Asia/Shanghai` |
| `NEXT_PUBLIC_SPONSOR_URL` | 捐助页外链 |

## 获取三方凭证

**Upstash Redis**：upstash.com 注册 → Create Database → 进入数据库 → REST API 面板复制 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`。

**Clerk**：clerk.com 新建 Application → Configure → API Keys，复制 Publishable key 与 Secret key。Development 实例可直接用测试 key。

**Cloudflare Workers AI**：Cloudflare 控制台 → Workers & Pages → 复制 Account ID；右侧菜单 AI → 创建 API Token（`Workers AI:Edit` 权限）。免费额度内可跑。

## Redis 数据模型

```
dakame:user:{userId}                     Hash    习惯设置 name/emoji/color/reminderTime/createdAt
dakame:checkin:{userId}:{yyyyMM}         Bitmap  打卡记录，offset = 日期 - 1
dakame:goals:{userId}                    Hash    周/月/年目标
dakame:learn:{userId}:{yyyyMM}           Bitmap  英语任务完成标记
dakame:learn:answers:{userId}            Hash    field = yyyy-MM-dd，value = 题目+答案+批改 JSON
dakame:learn:daily:{yyyy-MM-dd}          String  当天英语题目（全局共享，TTL 7 天）
```

`userId` 一律来自 Clerk `auth()`，绝不接受客户端传入。

## 目录结构

```
src/
  app/
    actions.ts              # 全部 Server Actions（含限流、校验）
    page.tsx                # 今日
    learn/page.tsx          # AI 英语补习
    calendar/page.tsx       # 月视图日历（支持补卡）
    goals/page.tsx          # 周期目标
    settings/page.tsx       # 设置 / 导出 / 清除
    sponsor/page.tsx        # 捐助页（公开）
    sign-in / sign-up       # Clerk
  components/               # CheckInButton / WeekDots / CalendarGrid / BottomNav / SettingsForm / GoalProgress / LessonCard / AnswerForm
  lib/
    redis.ts                # Redis 客户端 + key 定义
    checkin.ts              # Bitmap 打卡逻辑（连续天数用逐位回溯）
    goals.ts habit.ts learn.ts ai.ts date.ts ratelimit.ts env.ts types.ts
  middleware.ts             # clerkMiddleware 路由保护
public/                     # manifest.webmanifest / sw.js / icons
```

## 安装为 PWA

- **iPhone**：Safari 打开 → 分享 → 「添加到主屏幕」
- **Android**：Chrome → 右上角菜单 → 「安装应用」
- **桌面**：Chrome 地址栏右侧安装图标

离线时会展示缓存的首页数据，联网后自动同步。

## 限流

- 写操作（打卡 / 改设置 / 改目标）：每个 userId 每分钟 10 次
- AI 调用：每个 userId 每天 30 次

## TODO

- 提醒时间目前只保存设置，实际推送待接入 Web Push（需要 VAPID + 定时任务）
- 英语学习历史页目前展示最近 7 天，暂不支持按月翻页

## 赞助

打卡么免费、无广告。若觉得有用，可以请作者（学生）喝杯奶茶：https://xxx.com/sponsor

## License

MIT
