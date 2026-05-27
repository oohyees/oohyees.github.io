---
author: oohyees
pubDatetime: 2026-05-27T16:00:00Z
title: 搭建个人博客的踩坑记录
slug: blog-setup-notes
featured: false
draft: false
tags:
  - 博客
  - Astro
  - Vercel
description: "用 AstroPaper + Vercel 搭建博客时遇到的一些问题和解决方案。"
---

折腾了一天终于把个人博客搭好了。记录一下过程中踩到的一些坑，以后说不定能帮到别人。

## 技术栈

- **框架**：[Astro](https://astro.build/) — 静态网站生成器，构建产物零 JS，速度极快
- **主题**：[AstroPaper](https://github.com/satnaing/astro-paper) — 极简风格，Lighthouse 满分，开箱自带搜索/暗色模式/OG 图片生成
- **部署**：[Vercel](https://vercel.com/) — 关联 GitHub 仓库后自动部署，完全免费
- **DNS**：暂用 Vercel 自带域名，后续考虑绑定自定义域名

## 遇到的坑

### 1. pnpm 审批构建脚本

新版本的 pnpm 会拦截依赖的构建脚本。esbuild 和 sharp 需要手动批准才能正常运行：

```bash
pnpm approve-builds --all
```

### 2. Astro i18n 配置

AstroPaper 默认只配置了英文 locale。改成中文需要在 `astro.config.ts` 中添加 `"zh"` 到 `i18n.locales`，否则构建会报 `MissingLocaleError`。

### 3. 中文翻译文件

主题没有自带中文翻译，需要手动创建 `src/i18n/lang/zh.ts`，不然界面会 fallback 到英文显示。

## 总结

从零到上线大概花了一个下午。核心体验：模板已经把 99% 的脏活干了，剩下就是改改配置、写写文章。推荐想搭博客但不想折腾的同学直接抄这套方案。
