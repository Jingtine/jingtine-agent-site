# Jingtine Agent Site

> 结合软件工程、AI Agent 与产品创新，探索技术如何创造真实价值。

这是我的个人网站，用来展示项目、记录思考，并沉淀持续生长的知识。

[访问网站](https://jingtine.github.io/jingtine-agent-site/)

## 探索

- [Projects](https://jingtine.github.io/jingtine-agent-site/projects.html) — 项目与实践
- [Writing](https://jingtine.github.io/jingtine-agent-site/blog.html) — 随笔、短札与技术文章
- [Wiki](https://jingtine.github.io/jingtine-agent-site/wiki.html) — 数字花园与知识笔记
- [Research](https://jingtine.github.io/jingtine-agent-site/papers.html) — AI 相关论文收藏

## 关于我

南京大学商学院软件工程（软工商业创新班）学生，该班为软件工程与工商管理双学位班。
关注 AI Agent、软件架构与产品创新。

本站使用 HTML、CSS 和原生 JavaScript 构建，部署于 GitHub Pages。

[GitHub](https://github.com/jingtine) ·
[Email](mailto:jingtineli@smail.nju.edu.cn)


## 写作与发布

文章以 `articles/*.md` 为唯一内容源，文件开头使用 `+++` 包围 TOML 元数据。
`public/data/articles.json` 和 `feed.xml` 是脚本生成文件，不要手工修改。
生成脚本仅使用 Python 3.11+ 标准库；网站仍直接提供静态文件，无需 npm 或前端构建。

1. 复制 `content/templates/article-template.md` 到 `articles/<slug>.md`。使用唯一、稳定的文件名 slug（建议小写英文与连字符）；不要放入子目录或修改已发布文章的 slug，否则旧链接会失效。
2. 填写标题、日期、类型、分类、摘要和 `draft`，可选填写标签，再撰写 Markdown 正文。`kind` 为 `essay`、`note` 或 `technical`。日期是未加引号的 TOML 日期，例如 `2026-09-14`。
3. 如需封面，把图片放到 `assets/images/covers/`，同时填写 `cover` 和描述图片内容的 `cover_alt`。使用仓库相对路径与正斜杠；不填写时删除整个字段，不要留空字符串。
4. 完成后设置 `draft = false`。`draft = true` 只将文章排除在公开列表和 RSS 之外；公开仓库和静态服务器仍能访问 Markdown，草稿不能用来保密。
5. 从仓库根目录依次运行：

   ```powershell
   python scripts/build_articles.py
   python scripts/check.py
   python -m http.server 8000
   ```

   如果没有 `python` 命令，使用已安装的 Python 3.11+ 可执行文件或 `py -3.11`。
6. 在浏览器打开 `http://localhost:8000/blog.html` 和 `http://localhost:8000/article.html?slug=<slug>`，检查正文、封面、Wiki 引用、手机布局和 RSS。涉及页面行为的修改还应运行 `npx playwright test --config tests/playwright.config.js`（仅开发测试需要已有 Node/Playwright 依赖）。
7. 一起提交文章源文件、可选本地封面、配置，以及生成的 `public/data/articles.json` 和 `feed.xml`；检查 diff，避免混入无关的数据刷新。

`config/writing.json` 管理分类与文章类型的显示名称，以及可选的 `featuredSlug`。
新增分类可直接写入文章；没有配置名称时显示原 slug。精选 slug 为空、失效或被筛选隐藏时，列表使用当前可见的最新文章。
公开记录按日期倒序、同日按 slug 升序排列；日期不是定时发布开关，发布由 `draft` 控制。
夜间工作流会重新生成索引和 RSS，再运行质量检查并提交生成结果。

## 友链目录维护

`config/links.json` 是人工维护的友链源。按页面显示顺序填写 `groups`，每个分组依次包含稳定的 `id`、显示名称 `name` 和 `links`；分组及其中链接的数组顺序就是目录中的显示顺序。新增条目时填写非空的 `name`、`description` 和 HTTPS `url`，可选的 `tags` 也必须是非空文本。

头像只能使用仓库内 `assets/images/` 下已有的本地文件，例如 `assets/images/avatars/example.svg`。不要使用远程 URL、查询参数、片段或会离开该目录的路径。完成后运行 `python scripts/check.py` 验证配置。

## 茶客留言簿与文章评论

留言功能由 GitHub Discussions 与 Giscus 提供。读者需要登录 GitHub 才能发表留言或反应；发布后的讨论和留言默认公开可见。站内“茶客留言簿”使用 `guestbook` 作为固定讨论映射词，每篇文章使用稳定的 `article:<slug>` 映射词，因此已发布文章的 slug 不应随意修改。

GitHub 中实际使用的 Discussion 分类是 `General`，站内仍将它称为“茶客留言簿”。站点维护者应在仓库的 [Discussions](https://github.com/Jingtine/jingtine-agent-site/discussions) 中删除不当留言或锁定讨论；这些操作会同步反映在站内嵌入组件。`config/comments.json` 只保存公开的仓库与分类 ID，不得写入令牌、Cookie、邮箱或机器路径。本站不会收集或保存凭据、邮箱、IP 地址或本站自有的会话；Giscus 的 GitHub OAuth 流程可能在浏览器中自行管理 `giscus-session` 值。
