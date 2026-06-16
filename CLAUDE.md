# Oohyees' Blog — 项目指南

基于 **AstroPaper** 主题的个人博客，部署于 **GitHub Pages**（`oohyees.github.io`）。

## 项目结构

```
src/content/posts/     ← 博客文章 (.mdx)
src/content/pages/     ← 独立页面 (.mdx): about, academic, projects, links, terms
src/components/        ← Astro 组件 (Header, Card, Footer, MDX 组件等)
src/utils/             ← 工具函数 (categories, postFilter, getSortedPosts)
src/pages/             ← 路由页面 (posts/[...page], blog/[category]/[...page], tags/[...])
src/i18n/              ← 多语言文件 (zh, en)
astro-paper.config.ts  ← 网站配置 (标题、每页条数、社交链接等)
astro.config.ts        ← Astro 构建配置 (i18n、Markdown 插件、字体等)
```

---

## 创建一篇新文章

### 1. 在正确的位置创建文件

文章放在 `src/content/posts/`，文件名将成为 URL slug（如 `my-post-slug.mdx` → `/posts/my-post-slug/`）。

### 2. Frontmatter 模板

```yaml
---
author: oohyees
pubDatetime: 2026-06-16T10:00:00Z   # ⚠️ 必须是已过去的时间（见下方注意事项）
modDatetime:                          # 可选，修改时更新
title: 文章标题
slug: my-post-slug                    # URL 标识，建议英文小写 + 连字符
featured: false                       # 是否在首页置顶展示
draft: false                          # true = 不在任何页面显示
tags:
  - research                          # ⚠️ 必须包含一个分类标签（见下方说明）
  - AI
  - 思考
description: "文章摘要，用于列表展示和 SEO。"
---
```

### 3. ⚠️ pubDatetime 和计划发布机制

这个博客有 **计划发布（scheduled post）机制**，在 `src/utils/postFilter.ts` 中实现：

- 文章只有在 `pubDatetime - 15分钟` 已过去后，才会在页面中显示
- 如果 `pubDatetime` 设为一个未来的时间，文章会被当作「待发布」过滤掉——即使 `draft: false`
- **CI 构建时间通常是 UTC 凌晨**，所以 `pubDatetime` 必须设置在构建时间之前

**正确做法**：`pubDatetime` 设为构建前的任意时间（建议用文章实际完成时间的前一天凌晨），不要设成当天的未来时间。

### 4. ⚠️ tags 和分类栏目的映射

博客顶部导航栏的 **Blog** 指向按标签分类的四个栏目，定义在 `src/utils/categories.ts`：

| 栏目 | Category Key | 标签名 | 说明 |
|------|-------------|--------|------|
| Research (学术研究) | `research` | 论文阅读与科研笔记 | 深度思考、学术讨论 |
| Technical (技术文章) | `tech` | 教程、踩坑与工具分享 | 编程、工具、技术 |
| Daily Life (日常随笔) | `daily` | 思考、经验与个人成长 | 生活、随笔 |
| Month Journal (月度归档) | `journal` | 每月回顾与记录 | 月度总结 |

**关键规则**：一篇文章要出现在某个分类下，其 `tags` 数组必须包含该分类的 Category Key（如 `research`）。

例如这篇文章会同时出现在 Research 栏目和所有标签页：
```yaml
tags:
  - research    # ← 匹配 Research 栏目
  - AI          # ← 出现在 /tags/ai/ 页面
  - 思考        # ← 出现在 /tags/思考/ 页面
```

如果一个分类标签都不加，文章仍存在于 `/posts/` 路由下，但不会出现在导航栏的任何栏目中。

---

## 本地开发

```bash
pnpm install        # 安装依赖
pnpm dev            # 启动开发服务器 → http://localhost:4321
pnpm build          # 完整构建（类型检查 + 构建 + Pagefind 索引）
pnpm preview        # 预览生产构建
```

---

## 部署

推送到 `main` 分支即自动触发 **GitHub Actions → Deploy to GitHub Pages**（见 `.github/workflows/deploy.yml`）。

- 构建命令：`pnpm run build`
- 产物目录：`dist/`
- 目标环境：`github-pages`
- 部署完成后访问：`https://oohyees.github.io`

如需手动触发部署：在 GitHub Actions 页面点击 `Deploy to GitHub Pages` → `Run workflow`。

---

## 常见问题排查

| 问题 | 可能原因 | 检查方法 |
|------|---------|---------|
| 文章在网站上找不到 | `draft: true` | 检查 frontmatter |
| 文章在 /posts/ 有但栏目里没有 | tags 缺少分类标签（research/tech/daily/journal） | 对照 `src/utils/categories.ts` |
| 文章构建了但不显示 | `pubDatetime` 是未来时间 | 检查 `Date.now() > pubDatetime - 15min` |
| 页面 404 | 构建失败或部署未完成 | 查看 GitHub Actions 日志 |
