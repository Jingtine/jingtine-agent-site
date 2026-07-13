# GitHub Pages Development Notes

> Hash Routing, Markdown, Cache and NoJekyll

## 为什么选 GitHub Pages

免费、支持自定义域名、和 Git 仓库直接集成、不需要服务器。对于一个纯静态的个人网站，GitHub Pages 是最简单的选择。

但它有一些坑。这篇文章记录我在部署过程中遇到的真实问题和解决方案。

## 坑一：Jekyll 处理 Markdown 文件

**现象**：Wiki 详情页在本地正常显示，但在 GitHub Pages 上背景变灰、字体改变、标题左移。

**排查过程**：在浏览器 DevTools 网络面板中发现 `content/wiki/AI/rag-pipeline.md` 返回 HTTP 404。GitHub Pages 返回的不是普通的 404 文本，而是一个完整的 HTML 错误页面，包含 `<style>body { background-color: #f1f1f1; ... }</style>`。

**根因**：GitHub Pages 默认使用 Jekyll 处理文件。Jekyll 会把 `.md` 文件当作需要转换的模板，而不是直接提供原始文件。所以 `fetch('content/wiki/AI/rag-pipeline.md')` 在 GitHub Pages 上得到的是 404，而不是 Markdown 内容。

**修复**：在仓库根目录添加 `.nojekyll` 空文件。这会告诉 GitHub Pages 跳过 Jekyll 处理，直接提供所有文件。添加后，`.md` 文件可以被 `fetch` 正常获取。

同时在 `wiki.js` 和 `assistant.js` 的 fetch 链中添加 `res.ok` 检查：

```javascript
if (!res.ok) throw new Error('HTTP ' + res.status);
```

这样即使将来再出现 404，错误页面也不会进入 `marked.parse()`。

<!-- Image Placeholder -->

## 坑二：Hash 路由与可分享 URL

**问题**：Wiki 页面需要可分享的 URL。但纯静态站点没有服务端路由。

**方案**：用 URL hash 实现。Wiki 页面 ID 格式是 `Category/slug`（如 `AI/rag-pipeline`），编码后变成 `wiki.html#AI%2Frag-pipeline`。

关键点：
- 用 `encodeURIComponent(page.id)` 生成 hash，`decodeURIComponent` 解析
- 监听 `hashchange` 事件，在 URL 变化时切换视图
- 用 `listInitialized` 标志防止从详情页返回列表时重建 DOM
- 页面不存在时显示提示信息，不破坏列表状态

这个方案的局限是 hash 不被服务端识别，但对于纯静态站点已经够用。

## 坑三：CDN 缓存

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

## 坑四：背景层叠

**现象**：全局背景的光晕效果（`body::before` 和 `body::after`）在某些页面上被内容遮挡，或遮挡了内容。

**根因**：`z-index` 层叠上下文混乱。`body::before/after` 用了 `z-index: -1`，但 `body` 没有创建独立的层叠上下文，导致伪元素的 z-index 和页面内容的 z-index 在同一个上下文中比较。

**修复**：
1. 给 `body` 添加 `position: relative; isolation: isolate;`，创建独立的层叠上下文
2. 把 `body::before/after` 和 `.meteor-layer` 的 `z-index` 从 `-1` 改为 `0`
3. 给内容层（`nav, .page-header, .hero, .section, footer`）添加 `position: relative; z-index: 1;`

这样背景装饰在 `z-index: 0`，内容在 `z-index: 1`，层次清晰。

## 总结

GitHub Pages 是一个简单可靠的静态站点托管方案，但需要注意：

1. **`.nojekyll`**：如果需要直接提供 `.md` 文件，必须禁用 Jekyll
2. **Hash 路由**：纯静态站点的可分享 URL 方案
3. **Cache-busting**：用 `?v=` 参数强制 CDN 刷新
4. **层叠上下文**：用 `isolation: isolate` 隔离背景和内容的 z-index

这些都是实际部署中遇到的问题，不是理论推测。每个问题都有对应的 git commit 记录排查和修复过程。

## Related Wiki

- [[clean-architecture]] — 静态站点的分层设计

## Further Reading

- [Building My Digital Garden](article.html?slug=building-digital-garden)
