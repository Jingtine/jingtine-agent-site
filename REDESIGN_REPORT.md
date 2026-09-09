# 浅紫蓝手绘学术刊物改版交接

## 范围与审计

本次在原静态 HTML/CSS/JavaScript 站点上增量修改，统一全部 13 个入口。基线为 `main` 的 `1eaf84e`，开始时工作树干净。没有提交、推送或部署。

九个主导航入口：`index.html`、`about.html`、`projects.html`、`blog.html`、`papers.html`、`wiki.html`、`reader.html`、`assistant.html`、`status.html`。另保留 `article.html?slug=…`、`wiki.html#…` 与 `contact.html`、`knowledge.html`、`library.html` 三个旧入口。所有页面仍直接由静态 HTTP 服务提供，无构建步骤。

真实数据基线：9 篇博客、30 条 Wiki、37 篇论文、112 条 RSS。Projects 原来没有分类筛选，Research 原来没有搜索控件，Reader 没有本地阅读状态存储；未额外新增这些系统。原站没有深色模式。本次保留 About 全文、四个项目及首页能力内容（移入原生折叠区）。

## 修改文件及职责

| 文件 | 职责 |
| --- | --- |
| `styles.css` | 统一暖象牙、奶油白与紫蓝设计令牌，加入粉色便签、旧书黄胶带、错落分镜；提供桌面 208px 目录、平板/手机菜单外壳、共享列表及 760px 阅读区；清理旧粒子/玻璃/全屏动画规则 |
| `index.html`、`js/home.js` | 首页引言、名片、两个精选项目、最新三篇文章和 Research/Wiki/Reader/Assistant/Status 入口；复用文章索引及排序 |
| 其余 12 个根目录 HTML | 一致的九链接导航、当前页标记、跳转正文、main 地标、资源版本；About 双栏、Projects 详情锚点、工具表单标签 |
| `js/nav.js` | 非模态菜单、Escape 关闭与焦点返回、1200px 断点；无 JS 时静态链接可用 |
| `js/site-motion.js` | 保留原渲染器调用接口，内容默认可见，移除持续装饰动画 |
| `js/blog.js` | 原排序和 Markdown 入口保留；文章列表改为 DOM 安全构造 |
| `js/reading.js` | 博客/Wiki 共用折叠目录、单一主 H1、代码/表格滚动与键盘焦点；Wiki 目录滚动保留其路由 hash |
| `js/wiki.js` | 键盘打开条目、读取增强、空筛选清除与失败重试 |
| `js/assistant.js` | 知识库加载/失败/空输入反馈、重试、来源真实链接；保留 TOP_K=5 与评分/摘录算法 |
| `js/reader.js` | 来源键盘操作、无匹配反馈、清空筛选、加载失败重试 |
| `js/papers.js`、`js/status.js` | 请求失败反馈与重试；Status 空数据不显示健康，响应式记录网格 |
| `tests/e2e/redesign.spec.js` | 新增 16 个验收用例（部分按视口或数据状态参数化），含首页色纸层次与小字对比度回归测试 |
| `tests/redesign.config.js` | 复用原配置，连接已启动的本地 8082 HTTP 服务 |
| `tests/capture.cjs`、`tests/visual-audit.cjs` | 截图、页面异常记录、CSS 200% 重排、色彩对比度验证 |

## 预览和截图

本地预览：<http://127.0.0.1:8082/index.html>，需要本地 HTTP 服务运行。可用 Python 3 执行 `python -m http.server 8082 --bind 127.0.0.1`。

截图位于本地忽略目录 `artifacts/redesign/`，没有上传外部服务。

| 页面 | 桌面 | 手机 |
| --- | --- | --- |
| Home | [1440px](artifacts/redesign/after/home-1440.png) | [390px](artifacts/redesign/after/home-390.png) |
| Projects | [1440px](artifacts/redesign/after/projects-1440.png) | [390px](artifacts/redesign/after/projects-390.png) |
| Article | [1440px](artifacts/redesign/after/article-1440.png) | [390px](artifacts/redesign/after/article-390.png) |
| Assistant | [1440px](artifacts/redesign/after/assistant-1440.png) | [390px](artifacts/redesign/after/assistant-390.png) |

对应改造前截图在 `before/` 下使用相同文件名。额外提供 `after/home-1024.png`、各入口 `after/*-audit.png`、Reader/Status 的 `*-empty.png` 与 `*-failure.png`。

## 验证结果

环境：Windows、Node 24.15、本地已安装 Playwright/Chromium、环境提供的 Python 3。系统 PATH 原先没有 `python` 或 `py`，测试前将运行时 Python 所在目录加入当前进程 PATH；未修改机器全局配置。

| 命令 / 操作 | 结果 |
| --- | --- |
| `python scripts/check.py`，改造前 | 16/16，通过 |
| 原配置基线 Playwright | 已记录至少 69 项完整通过输出；服务/日志进程未正常结束，后续终止，因此不声称基线完整通过 |
| 新菜单、Assistant 三项测试，实施前 | 3 项预期失败，证明缺失行为 |
| Wiki 目录路由回归测试，修复前 | 1 项预期失败，hash 被目录锚点覆盖 |
| `node tests/node_modules/@playwright/test/cli.js test --config tests/redesign.config.js --workers=2` | 最终 90/90，通过，退出码 0（原有 74 项 + 新增 16 项） |
| `python scripts/check.py`，改造后 | 16/16，通过，退出码 0 |
| `git diff --check` | 通过，无空白错误 |
| `node tests/capture.cjs after` | 8 张桌面/手机截图，页面异常数组为空 |
| `node tests/visual-audit.cjs` | 12 个静态入口浏览及 CSS 200% 放大重排通过，无未捕获页面异常；图片失败时身份和主要入口可见 |

测试覆盖：13 个入口在 360、390、768、1024、1440px 下 main/H1 和无页面横向溢出；菜单初始收起、开关、Escape、焦点、九链接、当前页；无脚本导航；博客排序、列表/文章打开；Wiki 搜索/分类/路由/关联、键盘与目录；宽代码/表格/长 URL；Reader 过滤、原文 HTTPS 链接与空/错状态；Assistant 空输入、Agent 命中、无结果、空知识库、失败重试控件及来源；Status 正常/空/错数据。异常数据通过网络拦截模拟，正式 JSON 未改动。

曾有一次完整运行仅因测试子进程缺少 Python PATH 失败；修正运行环境后最终全部通过，不属于页面回归。

对比度按 WCAG 相对亮度公式计算，结果见 `artifacts/redesign/audit.json`。新版彩色小字使用独立深紫 `--accent-ink`，避免鸢尾紫落在浅紫纸上低于 4.5:1；所测普通文字组合均要求 ≥4.5，边界 ≥3。

## 保留契约及编辑位置

`articles/`、`content/`、`config/`、`public/data/`、`scripts/`、`feed.xml`、`subscriptions.opml`、部署工作流与依赖清单全部无 diff。未刷新远程数据，未改 JSON 字段，未新增或清除存储键。未引入前端框架、打包器、生产服务或第三方跟踪。

配色和字体在 `styles.css` 顶部 `:root`；首页精选项目与简介在 `index.html`；完整项目在 `projects.html`；最新文章来自 `articles/index.json`，由 `js/home.js` 限制为三条。中文衬线标题使用系统回退字体，不请求字体 CDN。

## 资源、限制与回退

参考 [Senthur Ayyappan 主页](https://senthurayyappan.com/) 与 [公开仓库](https://github.com/senthurayyappan/senthurayyappan.github.io) 的纸张与分镜方向，当前实现原创，未复制其源码、照片、文章或标识。使用仓库已有 `assets/images/figure.jpg`，未新增图片或字体；该图片的原始授权说明仍沿用仓库现状，未声称重新核验其版权。

未测试：Lighthouse 性能分与 CLS 指标、浏览器原生菜单 200% 缩放（已做 CSS 200% 重排）、其他浏览器/真实手机。原项目没有数学排版引擎，Markdown/LaTeX 源文本原样保留，未新增公式渲染依赖。所测颜色组合达标不等同全站自动无障碍认证。

原始问题中已修复：缺少 Status 主导航、Escape 在菜单关闭时抢焦点、Assistant 索引失败未捕获、引用不能键盘打开、Reader 来源不能键盘打开、动态状态网格固定双栏。原有项目文案中 “Wiki with 9 pages” 等历史描述没有擅自覆盖，仍需作者日后维护。

若需要回退，可对承载本次改版的单独 Git 提交执行 `revert`；不要重置整个仓库。截图和日志保留在本地忽略目录。部署与发布状态以提交后的会话交付记录为准。
