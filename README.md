## oohyees 的博客

基于 [Axi 的博客](https://axi404.top/) 的公开页面结构重建，用作个人站点基础。

主要使用 [Astro](https://astro.build/) 构建，使用 [Pure 主题](https://github.com/cworld1/astro-theme-pure)。

## Vercel 部署

主站部署到 Vercel。项目已使用 `@astrojs/vercel` adapter 和 `output: 'server'`。

Vercel 项目建议配置：

- Framework Preset: `Astro`
- Build Command: `pnpm run build`
- Install Command: `pnpm install`
- Output Directory: 留空，交给 Astro Vercel adapter 生成 `.vercel/output`
- Node.js Version: `22.x`

主站环境变量建议设置：

```env
SITE_URL=https://你的主站域名
PUBLIC_WALINE_SERVER_URL=https://waline-comments-umber.vercel.app
```

如果暂时没有自定义域名，可以先不设置 `SITE_URL`；Vercel 会通过 `VERCEL_PROJECT_PRODUCTION_URL` 推导生产域名。确定最终域名后再补 `SITE_URL`，并重新部署。

## 评论系统

评论、浏览量和 Reaction 使用自托管 Waline 服务：

- Waline 服务端：`https://waline-comments-umber.vercel.app`
- 数据库：Neon PostgreSQL
- 前端默认服务地址：`src/site.config.ts` 中的 `config.integ.waline.server`
- 可通过 `PUBLIC_WALINE_SERVER_URL` 覆盖前端服务地址

Waline 服务端在 Vercel 中需要保留 Neon 自动生成的 PostgreSQL 环境变量，并建议补充：

```env
SITE_NAME=oohyees 的 Blog
SITE_URL=https://你的主站域名
SERVER_URL=https://waline-comments-umber.vercel.app
SECURE_DOMAINS=你的主站域名,waline-comments-umber.vercel.app,localhost:4321,127.0.0.1:4321
DISABLE_USERAGENT=true
DISABLE_REGION=true
```

修改 Vercel 环境变量后需要重新部署 Waline 服务端。
