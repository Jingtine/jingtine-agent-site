---
title: "GitHub Pages Development Notes"
date: 2026-07-12 12:00:00
slug: github-pages-dev-notes
description: "在 GitHub Pages 上部署静态站点的技术笔记：缓存、资源路径与页面样式。"
categories:
  - software-engineering
tags:
  - GitHub Pages
  - 静态网站
comments: false
toc: true
---

> Cache and Background Layering

## 为什么选 GitHub Pages

免费、支持自定义域名、和 Git 仓库直接集成、不需要服务器。对于一个纯静态的个人网站，GitHub Pages 是最简单的选择。

但它有一些坑。这篇文章记录我在部署过程中遇到的真实问题和解决方案。

## 坑一：CDN 缓存

**现象**：推送了新代码到 GitHub Pages，但浏览器加载的还是旧版本。

**根因**：GitHub Pages CDN 的 `Cache-Control: max-age=600`，缓存 10 分钟。如果只改了文件内容但文件名没变，CDN 不会立即刷新。

**方案**：用版本号查询参数做 cache-busting。所有 CSS 和 JS 引用加 `?v=YYYYMMDD-N`：

```html
<link rel="stylesheet" href="styles.css?v=20260713-1">
<script src="js/wiki.js?v=20260713-2"></script>
```

每次修改文件后，递增版本号。这样浏览器和 CDN 会把带新版本号的文件当作新资源，不会用旧缓存。

当前版本号：
- `styles.css?v=20260713-1`
- `js/wiki.js?v=20260713-2`
- `js/site-motion.js?v=20260713-1`

## 坑二：背景层叠

**现象**：全局背景的光晕效果（`body::before` 和 `body::after`）在某些页面上被内容遮挡，或遮挡了内容。

**根因**：`z-index` 层叠上下文混乱。`body::before/after` 用了 `z-index: -1`，但 `body` 没有创建独立的层叠上下文，导致伪元素的 z-index 和页面内容的 z-index 在同一个上下文中比较。

**修复**：
1. 给 `body` 添加 `position: relative; isolation: isolate;`，创建独立的层叠上下文
2. 把 `body::before/after` 和 `.meteor-layer` 的 `z-index` 从 `-1` 改为 `0`
3. 给内容层（`nav, .page-header, .hero, .section, footer`）添加 `position: relative; z-index: 1;`

这样背景装饰在 `z-index: 0`，内容在 `z-index: 1`，层次清晰。

## 总结

GitHub Pages 是一个简单可靠的静态站点托管方案，但需要注意：

1. **Cache-busting**：用 `?v=` 参数强制 CDN 刷新
2. **层叠上下文**：用 `isolation: isolate` 隔离背景和内容的 z-index

这些都是实际部署中遇到的问题，不是理论推测。每个问题都有对应的 git commit 记录排查和修复过程。
