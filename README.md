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

创建文章后编辑 `source/_posts/` 中生成的 Markdown 文件，再启动本地服务器：

```powershell
npx hexo new post "title"
npm run server
```

本地地址默认为 <http://localhost:8081/jingtine-agent-site/>。

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
- 默认横幅：`source/images/banner-placeholder.svg`

替换时保持文件路径稳定，或同步更新 `_config.reimu.yml`。音乐播放器仍在 `_config.reimu.yml` 中保持禁用；没有明确需求时不要启用 APlayer 或 Meting。
