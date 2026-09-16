# AGENTS.md — Jingtine Agent Site 项目协作约定

## 项目定位

Jingtine Agent Site 是 Jingtine 的个人作品集与技术平台，包含个人主页、
Markdown 博客、数字花园 Wiki、arXiv 论文库、RSS 阅读器、站内知识助手和
数据源状态页。

线上产品是部署在 GitHub Pages 的静态网站。项目应始终保持结构清晰，
无需前端框架或生产构建流程即可维护和部署。

## 架构与技术边界

### 生产站点

- 浏览器端仅使用 HTML、CSS 和原生 JavaScript。
- 不得引入 React、Vue、Astro 或其他前端框架。
- 不得增加打包器、转译器、生产运行时包依赖、服务端代码、数据库，或任何
  必须随线上站点运行的 API 服务。
- GitHub Pages 直接提供仓库中的静态 HTML、CSS、JavaScript、Markdown、
  XML、图片及生成的 JSON 文件。

“无构建工具”特指生产站点：网站必须在不运行 npm、不编译资源的情况下正常
使用。

### 内容与数据脚本

- 仓库自动化及数据生成脚本统一放在 `scripts/`。
- 脚本必须使用 Python 3.11 或更新版本，并且只能依赖标准库。
- 不得添加第三方 pip 依赖。
- 脚本成功时退出码为 0，失败时退出码为 1。
- 简洁的执行摘要输出到 stdout，可操作的错误信息输出到 stderr。

### 开发测试

- Node.js 和 Playwright 仅允许用于 `tests/` 下的本地端到端测试；它们不是
  生产依赖，也不是网站构建步骤。
- 测试依赖不得进入浏览器业务代码或部署工作流。
- 不得增加基于 npm 的格式化、打包或应用运行步骤。
- `scripts/check.py` 是仓库的基础质量门禁。涉及页面行为、导航、可访问性或
  响应式布局的修改，应额外运行 Playwright 测试。

## 目录结构

```text
my-agent-site/
├── *.html               静态页面与应用入口
├── styles.css           全站共享样式表
├── js/                  浏览器逻辑及 vendored marked.min.js
├── articles/            博客 Markdown（含 TOML front matter）
├── content/wiki/        按主题组织的 Wiki Markdown
├── content/templates/   内容写作模板
├── config/              RSS 白名单、订阅源及论文主题配置
├── public/data/         生成的 RSS、论文、Wiki 与状态 JSON
├── scripts/             仅使用 Python 标准库的生成与检查脚本
├── tests/e2e/           Playwright 端到端测试
├── assets/images/       静态图片资源
├── .github/workflows/   定时数据刷新自动化
├── feed.xml             由站内博客生成的 RSS
└── subscriptions.opml   已公开且已启用订阅源的导出文件
```

## 源内容与生成数据

必须明确区分人工维护的源内容和脚本生成的输出：

- 博客源内容：`articles/*.md`（文件开头的 TOML front matter 与正文）。
- 写作配置：`config/writing.json`（精选文章、分类和文章类型的显示名称）。
- Wiki 源内容：`content/wiki/**/*.md`。
- RSS 配置：`config/feeds.json` 和 `config/allowlist.json`。
- 论文配置：`config/papers.json`。
- 友链配置：`config/links.json`。
- 评论配置：`config/comments.json`（人工维护的 GitHub Discussions/Giscus 公开集成配置）。
- 文章生成输出：`public/data/articles.json` 和 `feed.xml`，由 `python scripts/build_articles.py` 生成；禁止手工编辑文章索引。
- 其他生成输出：`subscriptions.opml` 以及 `public/data/` 下的文件。

修改时应先更新源内容或配置，再运行对应生成脚本。除非任务明确涉及生成器的
预期输出或测试固件，否则不要手工编辑生成文件。

GitHub Actions 使用 Python 3.11，每晚构建文章索引与 Feed，并刷新 RSS、arXiv 论文、状态数据和 OPML 导出。工作流提交的
生成数据必须具有足够的确定性，确保可以通过普通 Git diff 审查。

## 浏览器安全规则

1. RSS 条目、论文元数据、来源名称、状态数据以及其他远程采集内容一律视为
   不可信数据。
2. 不可信字符串必须使用 `textContent`、DOM 节点构造和显式属性赋值进行渲染；
   不得插入 `innerHTML` 或 `insertAdjacentHTML`。
3. `innerHTML` 只允许用于渲染仓库内受信任的 Markdown。若未来支持远程或用户
   提交的 Markdown，必须先引入适当的 HTML 清洗机制，不能沿用此例外。
4. 外部链接必须使用 `https://`，并包含 `rel="noopener noreferrer"`。将外部
   URL 赋值给 `href` 前必须验证协议。
5. HTML 中不得添加 `onclick`、`onload` 等内联事件处理器；应在 JavaScript 中
   使用 `addEventListener` 注册事件。
6. 禁止使用 `javascript:` URL，以及不安全的动态脚本或样式注入。
7. `config/links.json` 是人工维护的源；其中的外部 URL 必须使用 HTTPS，配置文本按不可信数据用 `textContent` 渲染，头像只能引用 `assets/images/` 下不可逃逸的本地文件。

## GitHub Pages 路径规则

- 生产环境基础路径为 `/jingtine-agent-site/`。
- 所有以根目录开头的站内绝对 URL 都必须以 `/jingtine-agent-site/` 为前缀。
- 在本地开发和 GitHub Pages 均可正确解析时，优先使用相对链接。
- `feed.xml` 和 `subscriptions.opml` 从项目根目录提供。
- 修改目录层级或新增页面时，必须同时检查链接解析和静态资源加载。

## HTML 与 JavaScript 约定

- 复用根目录 HTML 文件中已有的页面框架和导航模式。
- 页面行为应放在 `js/` 下的独立文件中。只有确实不适合共享的少量页面初始化
  逻辑可以使用内联脚本。
- 修改交互组件时，必须保留键盘导航、焦点行为、语义化 HTML 和 ARIA 状态。
- 遵循渐进增强原则：即使可选动画或远程数据加载失败，核心内容与导航仍应可用。
- `fetch` 失败时应显示有意义的空状态或错误状态，不得直接产生未捕获异常。

## CSS 约定

- 颜色、字体、阴影、圆角等设计令牌统一定义为 `:root` 中的 CSS 自定义属性。
- 复用 `article-card`、`blog-tag`、`btn` 等共享类，不得仅为单一页面复制一套
  视觉组件。
- 延续浅紫、浅蓝和白色的设计语言，整体风格参考 Apple、Linear 和 Notion。
- 保持响应式行为，并尊重用户的减少动画偏好。
- 仅当共享组件体系无法清晰表达需求时，才添加页面专用布局规则。

## 配置约定

- `config/feeds.json` 中的订阅源包含 `id`、`name`、`url`、`category`、
  `enabled` 和 `public` 字段。
- `config/allowlist.json` 定义允许聚合的订阅源 ID。
- 只有同时满足 `enabled=true` 和 `public=true` 的订阅源才能出现在
  `subscriptions.opml` 中。
- 订阅源 ID 必须保持稳定，因为生成数据和界面筛选可能引用这些 ID。
- 所有远程订阅源 URL 必须使用 HTTPS。
- `config/comments.json` 是人工维护的公开源，只能保存启用状态、仓库、Discussion 分类及其公开 ID、主题和语言；不得写入令牌、Cookie、邮箱或机器路径。Giscus 客户端地址固定为 `https://giscus.app/client.js`，不得由配置覆盖。

## 本地验证

文章修改后先运行 `python scripts/build_articles.py`，提交 Markdown 源文件与两个生成输出。
作者模板为 `content/templates/article-template.md`。`draft=true` 仅控制公开索引与 Feed，
不能隐藏公开仓库或静态服务器上的 Markdown；不要写入秘密。

每次提交前都必须运行基于 Python 3.11+ 标准库的质量检查：

```powershell
python scripts/check.py
```

如果 Windows 环境中没有 `python` 命令，请使用已安装的 Python 启动器或明确的
Python 3 可执行文件，例如：

```powershell
py -3.11 scripts/check.py
```

检查范围包括：必要页面、内部链接、RSS 与 OPML 解析、文章源文件与生成索引精确一致性、写作配置、封面与 Feed 数量一致性、
生成 JSON 的结构、RSS HTTPS 链接、论文评分、Wiki 元数据与路由、博客和 Wiki
关联关系、知识助手数据及状态数据。合并前要求退出码为 0。

修改浏览器端行为后，如果本地已经安装 Node 依赖，还应从仓库根目录运行相关
Playwright 测试：

```powershell
npx playwright test --config tests/playwright.config.js
```

不要为了验证无关的界面或内容修改而重新抓取远程数据。提交中不得混入无关的
生成数据变化。

## 变更纪律

- 修改必须聚焦当前任务，并保留工作区中已有的无关改动。
- 不得提交密钥、本地凭据、编辑器状态、浏览器配置或机器专用路径。
- 新增页面时，应统一更新导航；必要时还要将新页面加入 `scripts/check.py` 的
  必要页面检查。
- 修改生成脚本后，必须检查生成文件的 diff，并运行完整质量检查。
- 提交前确认工作树中仅包含预期的源文件、配置、测试和生成输出变更。
