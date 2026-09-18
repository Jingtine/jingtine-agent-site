# Jingtine Agent Site

Jingtine 的个人作品集与写作站点，使用 Hexo 8 和 Reimu 生成，并通过 GitHub Pages 发布。

线上地址：<https://jingtine.github.io/jingtine-agent-site/>

## 保留路由

- 首页：`/jingtine-agent-site/`
- 归档：`/jingtine-agent-site/archives/`
- 分类与标签：`/jingtine-agent-site/categories/`、`/jingtine-agent-site/tags/`
- 项目：`/jingtine-agent-site/projects/`
- 关于：`/jingtine-agent-site/about/`
- 友链：`/jingtine-agent-site/friend/`
- Feed：`/jingtine-agent-site/atom.xml`

## 环境要求

- Node.js 22 或更高版本

## 安装

在仓库根目录安装锁定的依赖：

```powershell
npm ci
```

## 本地写作

用构建入口生成带 front matter 的文章文件，再启动本地服务器：

```powershell
npm run new -- my-new-post "我的新文章"
npm run server
```

`<slug>`（示例中的 `my-new-post`）决定文章 URL `/jingtine-agent-site/posts/<slug>/`，请使用小写英文、数字与连字符；中文标题作为第二个参数。生成的文件位于 `source/_posts/my-new-post.md`，按需补充 `description`、`categories` 与 `tags`。

文章配图放在 `source/images/` 下（例如 `source/images/my-new-post/diagram.webp`），正文用站点绝对路径引用：

```markdown
![示意图](/jingtine-agent-site/images/my-new-post/diagram.webp)
```

本地地址默认为 <http://localhost:8081/jingtine-agent-site/>。

## 发布文章

1. 在 `source/_posts/<slug>.md` 完成正文，配图放入 `source/images/`。
2. 同步更新文章清单常量（仓库用固定断言防止误发布）：
   - `scripts/check-site.mjs`：`approvedSlugs` 与两处 Atom 条目数校验
   - `tests/unit/content.test.mjs`：`expectedSlugs`
   - `tests/unit/generated-site.test.mjs`：`slugs`、`posts.length` 与 Feed `<entry>` 数
3. 运行 `npm test`。
4. 提交并推送 `main`；Actions 会自动构建并部署，无需手动打包或提交 `public/`。

## 添加友链

朋友的博客编辑 `source/friend/_data.yml`，常去与推荐的站点编辑 `source/friend/_sites.yml`，两者格式相同，追加条目：

```yaml
- name: 显示名
  url: https://example.com/
  desc: 一句话简介
  image: https://example.com/avatar.jpg
```

没有合适图标的条目使用默认图标 `/jingtine-agent-site/images/link-placeholder.png`。

`image` 可用外链（建议 https）；本地图片请放进 `source/images/`，并写完整站点路径 `/jingtine-agent-site/images/xxx.jpg`——友链数据原样嵌入 HTML，不会自动补前缀。改完运行 `npm test`，通过后提交推送即可。

## 验证

按变更范围运行以下命令：

```powershell
npm run check
npm run test:unit
npm run test:e2e
```

`npm run check` 会先执行 `npm run clean` 与 `npm run build`，再运行质量门禁；单元测试读取生成的 `public/`，因此必须在构建之后运行。完整门禁可用 `npm test` 依次运行以上三步。涉及行为、导航、可访问性或响应式布局时还必须运行 Playwright。

## 部署

推送到 `main` 后，GitHub Pages Actions 会安装锁定依赖、生成站点并部署。`public/` 是生成目录，不应手工编辑或提交。

## 媒体替换

- 默认文章封面：`source/images/default-campus-cover.webp`
- 站点横幅：`source/images/banner-illustration.webp`
- 站点图标（favicon）：`source/images/site-favicon.ico`

替换时保持文件路径稳定，或同步更新 `_config.reimu.yml` 中的 `banner`、`cover` 与 `favicon`。音乐播放器仍在 `_config.reimu.yml` 中保持禁用；没有明确需求时不要启用 APlayer 或 Meting。
