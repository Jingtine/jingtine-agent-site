# 白盒测试 — 功能点 / 可测试点清单

> 基于代码阅读分析生成，风险从高到低排序。

---

## F1 · 导航栏与多页面跳转

**实现依据**：所有 HTML 页面的 `<nav class="nav">`（`index.html:30`），`styles.css` 中的 `.nav-links a.active`（`color: var(--accent-purple)`），`aria-current` 属性。

**可测试点**：
1. 8 个导航入口（Home/About/Projects/Blog/Research/Wiki/Reader/Assistant）均存在且可点击
2. 点击任意链接可跳转到对应页面，URL 正确
3. 当前页面导航项高亮（`.nav-links a.active` 颜色为 `#7c6ff7`）
4. 当前页面导航项包含 `aria-current="page"`

**风险说明**：导航是站内索引入口，链接断裂会导致用户无法到达目标页面，影响面最大。缺少 `aria-current` 则无障碍访问受损。

**适合自动化测试**：是

---

## F2 · 首页个人信息展示

**实现依据**：`index.html` 中的 `.hero` 区域，包含头像 `<img>`、`.hero-greeting`（"Hi, I'm"）、`.hero-name`（"Jingtine"）、`.hero-identity`（"Software Engineering Student · Business Innovation Explorer"）、`.hero-tags`（3 个标签）、`.hero-desc`（介绍文本）、footer 中的邮箱链接。`styles.css` 中 `.hero-*` 系列样式。

**可测试点**：
1. 首页能正常打开（HTTP 200，非重定向）
2. 浏览器标题（`<title>`）正确
3. 头像图片 `<img src="assets/images/figure.jpg">` 可加载
4. 页面包含姓名 "Jingtine"
5. 页面包含学校/专业信息
6. 页面包含三个兴趣标签（Software Engineering / AI Agent / Product Innovation）
7. Footer 中存在邮箱链接 `251250208@smail.nju.edu.cn`

**风险说明**：首页是最常被访问的入口，关键信息缺失直接影响第一印象。

**适合自动化测试**：是

---

## F3 · 首页入场动画系统

**实现依据**：`js/site-motion.js`（451 行）中的 Hero Parallax（sticky-stage 滚动驱动动画），`styles.css` 中的 `html.hero-intro-active` 样式、`@keyframes glow-breathe`、`@keyframes ring-rotate`、`@keyframes bar-pulse` 等。`index.html` 中的 `.hero-intro-deco`、`.meteor-layer`、`.silver-particle-layer`。

**可测试点**：
1. 页面加载后 `html` 元素包含 `hero-intro-active` 类
2. `.hero-intro-deco` 元素存在且包含光环、轨道环、波形柱、粒子等子元素
3. 流星层（`.meteor-layer`）包含至少 1 个 `.meteor` 元素
4. 滚动到 `intro-distance`（360px）后 `hero-intro-active` 类被移除
5. `prefers-reduced-motion: reduce` 时动画被禁用

**风险说明**：动画依赖 IntersectionObserver 和滚动事件，性能问题或 JS 异常可能导致动画不播放或页面卡死。

**适合自动化测试**：部分（静态结构可测，滚动行为需 Playwright 模拟）

---

## F4 · Markdown 博客系统

**实现依据**：`js/blog.js`（245 行）中的 `loadArticleIndex()`、`renderArticleList()`、`loadArticleDetail()`。`articles/index.json`（9 篇文章元数据）。`blog.html`（博客列表页）、`article.html`（文章详情页，通过 `?slug=` 参数路由）。`marked.min.js` 渲染 Markdown。

**可测试点**：
1. `blog.html` 加载后展示至少 9 篇文章卡片
2. 每张卡片包含分类标签（`.article-category`）、日期、标题、摘要
3. 点击文章卡片跳转到 `article.html?slug=<slug>`，页面展示文章正文
4. 文章正文中的 `[[Wiki Link]]` 语法被解析为可点击链接（指向 `wiki.html#...`）
5. `articles/index.json` 中每个 slug 的 `.md` 文件都存在

**风险说明**：博客是内容展示核心模块，构建失败或 `index.json` 与实际文件不一致会导致内容缺失。构建脚本重复运行可能导致内容重复追加。

**适合自动化测试**：是

---

## F5 · RSS Feed 生成

**实现依据**：`scripts/generate_feed.py` 读取 `articles/index.json`，生成 RSS 2.0 格式的 `feed.xml`。每个 `<item>` 包含 `title`、`link`、`guid`、`pubDate`（RFC 822 格式）、`description`、`category`。

**可测试点**：
1. `feed.xml` 是合法的 XML（可被 `DOMParser` 解析）
2. `<item>` 数量与 `articles/index.json` 中文章数量一致（9 篇）
3. 每个 `<item>` 包含 `title`、`link`、`guid`、`pubDate`、`description` 字段
4. 文章按 `pubDate` 降序排列（最新在前）
5. 中文和特殊字符（&、<、>）在 XML 中被正确转义

**风险说明**：RSS 如果包含非法 XML 会导致阅读器解析失败。日期顺序错误会误导订阅者。

**适合自动化测试**：是

---

## F6 · RSS 阅读器 / 外部订阅聚合

**实现依据**：`scripts/aggregate-feeds.py` 读取 `config/feeds.json` 和 `config/allowlist.json`，获取外部 RSS/Atom feed，输出 `public/data/rss-items.json` 和 `subscriptions.opml`。`js/reader.js`（226 行）读取 `rss-items.json` 渲染阅读器页面。所有外部内容通过 `textContent` 渲染，`https://` 链接带 `rel="noopener noreferrer"`。

**可测试点**：
1. `rss-items.json` 存在且为合法 JSON
2. 每个 item 包含 `id`、`title`、`link`（https://）、`description`、`pubDate`、`source`（含 `id`+`name`）、`category`
3. `reader.html` 能加载数据并展示来源列表（source cards）
4. 点击来源可查看该来源的文章列表
5. 所有外部链接使用 `https://` 且标签不包含 `onclick` 等内联事件
6. `subscriptions.opml` 为合法 XML

**风险说明**：外部数据不可信，XSS 风险。feed 获取失败时数据可能为空，但页面不应崩溃。

**适合自动化测试**：是

---

## F7 · Wiki 知识库

**实现依据**：`js/wiki.js`（481 行），`scripts/build_wiki.py` 生成 `public/data/wiki.json`，`content/wiki/` 下的 30 个 Markdown 文件，4 个分类（AI/Product/Software/Study）。`wiki.html` 支持 list 视图和 detail 视图（hash 路由）。`marked.min.js` 渲染 Markdown。

**可测试点**：
1. `wiki.json` 存在且为合法 JSON，包含 30 个页面
2. `wiki.html` 加载后展示分类筛选按钮和页面卡片列表
3. 点击分类按钮可过滤页面列表
4. 搜索框可过滤页面（按标题匹配）
5. 点击页面卡片进入 detail 视图（URL 变为 `wiki.html#category/slug`）
6. Detail 视图渲染 Markdown 正文和关联博客文章
7. 每个 wiki 页面的 `.md` 文件都存在
8. `[[Wiki Link]]` 在 detail 中可点击跳转
9. Hash 路由使用 `encodeURIComponent` 编码

**风险说明**：Wiki 页面量大（30 页），hash 路由编码错误会导致链接无法分享。关联博客查询（扫描所有文章 .md 文件）可能影响性能。

**适合自动化测试**：部分（静态数据、hash 路由可测；性能需人工评估）

---

## F8 · Research Papers 页面

**实现依据**：`scripts/collect_papers.py` 从 arXiv API 获取数据，输出 `public/data/papers.json`。`js/papers.js`（114 行）读取 JSON 渲染论文卡片。`papers.html` 展示列表。

**可测试点**：
1. `papers.json` 存在且为合法 JSON
2. 每篇论文包含 `id`、`title`、`authors`（数组）、`published`、`summary`、`url`（https://）、`source`
3. 无重复 `id`
4. `papers.html` 能加载数据并展示论文卡片（含作者、摘要、arXiv ID）
5. "Read Paper" 按钮链接到 `https://` 的 arXiv 地址

**风险说明**：arXiv API 依赖外部网络，数据生成失败时需保留旧数据。论文数量为 0 时页面不应崩溃。

**适合自动化测试**：是（基于已有 `papers.json` 数据）

---

## F9 · AI Assistant

**实现依据**：`js/assistant.js`（263 行）实现 3-step pipeline（Search Wiki → Retrieve → Generate）。`assistant.html` 提供输入框和展示面板。

**可测试点**：
1. `assistant.html` 能正常加载
2. 输入问题后触发 Search → Retrieve → Generate 三步
3. 搜索结果返回包含相关 wiki 页面链接
4. 生成结果包含文本答案和来源引用
5. `assistant.js` 脚本存在且不报未捕获异常
6. `wiki.json` 在 assistant 上下文中可读取

**风险说明**：纯前端关键词搜索，不依赖外部 API。但大 Wiki 数据库可能导致检索性能下降。`cleanMarkdown()` 的正则处理可能对特殊格式不完善。

**适合自动化测试**：部分（页面存在性、静态行为可测；答案质量需人工评估）

---

## F10 · 状态面板

**实现依据**：`scripts/generate_status.py` 生成 `public/data/status.json`。`js/status.js`（113 行）读取 JSON 渲染 `status.html`。展示 system status、version、quality check 结果、各项计数。

**可测试点**：
1. `status.json` 存在且为合法 JSON
2. 包含 `system.status`、`system.version`、`build`、`content`、`quality`、`services` 字段
3. `status.html` 能加载数据并展示概览栏和 4 个卡片
4. `quality.result` 字段反映最近一次 `check.py` 运行结果

**风险说明**：数据聚合依赖多个数据源，任一源缺失可能导致字段为空。

**适合自动化测试**：是

---

## F11 · 质量检查管道（check.py）

**实现依据**：`scripts/check.py`（853 行）执行 16 项检查，exit code 0 表示全通过。检查项包括：页面存在、链接有效性、RSS 合法性、JSON 数据完整性等。

**可测试点**：
1. `check.py` 可执行，exit code 为 0 或 1
2. 所有 13 个 HTML 页面文件存在
3. 页面间内部链接不指向 404
4. `feed.xml` 可被 XML 解析器正确解析
5. `feed.xml` item 数与 `articles/index.json` 条目数一致
6. `rss-items.json` 所有字段完整
7. `subscriptions.opml` 为合法 XML

**风险说明**：check.py 是提交前最后一道防线。检查逻辑有 bug 会导致问题漏过或假警报。

**适合自动化测试**：是

---

## F12 · 跨页面共享组件一致性

**实现依据**：所有页面共用 `styles.css` 中的 CSS 变量（`:root` 中 14 个自定义属性）。导航栏、footer 结构在各页面中硬编码为相同 HTML。

**可测试点**：
1. 所有页面引用相同的 `styles.css`
2. 所有页面的导航栏包含相同的 8 个链接
3. 所有页面的 footer 结构一致
4. CSS 变量（`--accent-purple`、`--color-text` 等）在所有页面中生效

**风险说明**：页面独立维护，导航栏或 footer 更新时可能遗漏某些页面，导致不一致。

**适合自动化测试**：是

---

## F13 · 响应式与无障碍

**实现依据**：`styles.css` 中的媒体查询（`@media (max-width: 768px)` 和 `(max-width: 480px)`），`prefers-reduced-motion: reduce` 支持。`aria-current` 属性在导航栏中。滚动条隐藏（`scrollbar-width: none`）但保留滚动能力。

**可测试点**：
1. 移动端窄屏（375px/768px）下页面不溢出、不出现横向滚动条
2. 导航栏在当前页包含 `aria-current="page"`
3. 减少动画模式下 hero 动画被禁用
4. 页面可以正常滚动（虽然滚动条隐藏）

**风险说明**：滚动条隐藏在某些浏览器可能与无障碍要求冲突。响应式断点之外的分辨率可能出现布局问题。

**适合自动化测试**：是（Playwright 可设置 viewport 和 reduced-motion）

---

## F14 · 安全性

**实现依据**：`js/reader.js` 中所有外部内容使用 `textContent`、外部链接检查 `https://` 并加 `rel="noopener noreferrer"`。`js/papers.js`、`js/assistant.js` 同样处理。页面无内联事件处理器。

**可测试点**：
1. `reader.html` 中的来源名称和描述由 `textContent` 注入（非 `innerHTML`）
2. 所有外部链接 href 以 `https://` 开头
3. 外部链接包含 `rel="noopener noreferrer"`
4. HTML 中不存在 `onclick`、`onload` 等内联事件属性
5. `.env` 文件不在仓库中（不应存在）

**风险说明**：外部 RSS 内容可能包含恶意脚本，若使用 `innerHTML` 则存在 XSS 风险。

**适合自动化测试**：是

---

## 风险评估汇总

| 优先级 | 功能点 | 风险原因 |
|--------|--------|----------|
| 🔴 高 | F1 导航栏 | 站内索引断裂波及所有页面 |
| 🔴 高 | F5 RSS Feed | XML 非法导致订阅端解析失败 |
| 🔴 高 | F6 外部 RSS | 外部不可信数据，XSS 风险 |
| 🟡 中 | F2 首页信息 | 最高访问量页面 |
| 🟡 中 | F4 博客系统 | 内容核心，生成逻辑复杂 |
| 🟡 中 | F7 Wiki | 数据量大(30页)，hash路由易错 |
| 🟡 中 | F11 check.py | 质量最后防线 |
| 🟢 低 | F3 入场动画 | 仅视觉效果 |
| 🟢 低 | F8 Papers | 依赖外部arXiv API |
| 🟢 低 | F9 Assistant | 辅助功能 |
| 🟢 低 | F10 状态面板 | 汇总展示 |
| 🟢 低 | F12 组件一致性 | 维护期风险 |
| 🟢 低 | F13 响应式 | 渐进增强 |
| 🟢 低 | F14 安全性 | 已有多层防护 |

---

## 自动化适用性

| 适合自动化 | 功能点 |
|-----------|--------|
| ✅ 完全可测 | F1, F2, F4, F5, F6, F8, F10, F11, F12, F13, F14 |
| ⚠️ 部分可测 | F3（动效视觉需人工）、F7（关联博客性能需人工）、F9（答案质量需人工） |

---

# 白盒测试用例表

> 字段：用例编号 / 对应功能点 / 前置条件 / 操作步骤 / 预期结果 / 用例类型

---

## TC01 · 所有页面可正常访问

- **对应功能点**：F1（导航栏）
- **前置条件**：本地服务器运行（`npx playwright test` 使用 baseURL）
- **操作步骤**：
  1. 依次访问 index, about, projects, blog, article, papers, wiki, reader, assistant, status 页面
  2. 检查每个页面的 HTTP 状态码
- **预期结果**：所有页面返回 HTTP 200，页面 `<title>` 标签非空
- **用例类型**：正常

---

## TC02 · 导航栏链接可跳转

- **对应功能点**：F1（导航栏）
- **前置条件**：首页已加载
- **操作步骤**：
  1. 在首页点击导航栏中的 "About" 链接
  2. 检查 URL 是否变为 `/about.html`
  3. 重复验证 "Projects"→`/projects.html`、"Blog"→`/blog.html`
- **预期结果**：所有导航链接可正确跳转，目标页面加载成功（HTTP 200）
- **用例类型**：正常

---

## TC03 · 当前页面导航高亮与 aria-current

- **对应功能点**：F1（导航栏）、F13（无障碍）
- **前置条件**：导航栏在所有页面中结构一致
- **操作步骤**：
  1. 访问 `index.html`，检查包含 "Home" 文本的导航链接是否有 `aria-current="page"` 且颜色为 `#7c6ff7`
  2. 访问 `about.html`，检查 "About" 导航链接
  3. 访问 `blog.html`，检查 "Blog" 导航链接
- **预期结果**：每个页面对应的导航项包含 `aria-current="page"` 且应用 `.active` 样式
- **用例类型**：正常

---

## TC04 · 首页个人信息完整性

- **对应功能点**：F2（首页信息）
- **前置条件**：首页可正常访问
- **操作步骤**：
  1. 访问首页，检查 `<title>` 是否包含 "Jingtine"
  2. 检查页面文本是否包含 "Jingtine"
  3. 检查头像图片 `<img src="assets/images/figure.jpg">` 是否可加载（`naturalWidth > 0`）
  4. 检查文本是否包含 "Software Engineering"、"AI Agent"、"Product Innovation"
  5. 检查 footer 中是否存在邮箱链接 "251250208@smail.nju.edu.cn"
- **预期结果**：以上所有检查项通过
- **用例类型**：正常

---

## TC05 · 博客文章列表渲染

- **对应功能点**：F4（博客系统）
- **前置条件**：`articles/index.json` 存在且包含 9 篇以上文章
- **操作步骤**：
  1. 访问 `blog.html`
  2. 等待 `.article-card` 元素渲染
  3. 检查卡片数量 ≥ 9
  4. 检查每张卡片包含 `.article-category`（分类标签）、`.article-date`（日期）、`h3`（标题）
- **预期结果**：博客列表页面展示 9 篇以上文章卡片，每张卡片信息完整
- **用例类型**：正常

---

## TC06 · 博客文章详情页

- **对应功能点**：F4（博客系统）
- **前置条件**：`articles/index.json` 中存在 slug 为 `hello-world` 的文章
- **操作步骤**：
  1. 访问 `article.html?slug=hello-world`
  2. 等待文章内容渲染
  3. 检查页面标题包含 "Hello World"
  4. 检查文章正文非空
  5. 检查 `.article-detail` 容器存在
- **预期结果**：文章详情页正常渲染，正文包含文本内容
- **用例类型**：正常

---

## TC07 · 博客文章 [[Wiki Link]] 解析

- **对应功能点**：F4（博客系统）
- **前置条件**：存在包含 `[[...]]` 语法的文章（如 `building-digital-garden`）
- **操作步骤**：
  1. 访问 `article.html?slug=building-digital-garden`
  2. 等待内容渲染
  3. 检查页面中是否存在 `href` 包含 `wiki.html#` 的链接
- **预期结果**：文章中的 `[[Wiki Link]]` 被解析为 `<a href="wiki.html#...">` 链接
- **用例类型**：正常

---

## TC08 · RSS feed.xml 合法性

- **对应功能点**：F5（RSS）
- **前置条件**：`feed.xml` 已由 `generate_feed.py` 生成
- **操作步骤**：
  1. 用浏览器 `DOMParser` 解析 `/feed.xml`
  2. 检查解析不报错（`querySelector('parsererror')` 为 null）
  3. 检查 `<rss version="2.0">` 根元素存在
  4. 检查 `<channel>` 内的 `<item>` 数量 ≥ 9
- **预期结果**：`feed.xml` 被成功解析为合法 XML，item 数量与文章数一致
- **用例类型**：正常

---

## TC09 · RSS item 字段完整性

- **对应功能点**：F5（RSS）
- **前置条件**：`feed.xml` 可被正常解析
- **操作步骤**：
  1. 解析 `feed.xml`，获取所有 `<item>` 元素
  2. 检查每个 `<item>` 包含 `title`、`link`、`guid`、`pubDate`、`description`
  3. 检查 `link` 为 `https://` 开头的绝对 URL
  4. 检查 `pubDate` 符合 RFC 822 格式
- **预期结果**：所有 item 字段完整，link 为合法 HTTPS 链接
- **用例类型**：正常

---

## TC10 · RSS 日期倒序

- **对应功能点**：F5（RSS）
- **前置条件**：`feed.xml` 可解析，至少包含 2 篇日期不同的文章
- **操作步骤**：
  1. 解析 `feed.xml`，提取所有 `<pubDate>`
  2. 将日期字符串转为 `Date` 对象
  3. 验证 `date[0] >= date[1] >= ... >= date[n]`
- **预期结果**：文章按日期降序排列，最新文章在最前
- **用例类型**：边界

---

## TC11 · RSS 特殊字符转义

- **对应功能点**：F5（RSS）
- **前置条件**：`feed.xml` 中包含含中文或特殊字符的文章
- **操作步骤**：
  1. 解析 `feed.xml`
  2. 获取所有 `<title>` 和 `<description>` 的文本内容
  3. 检查不含 `&`（孤立的 & 符号）——只有 `&amp;`、`&lt;`、`&gt;` 是合法的
- **预期结果**：特殊字符被正确转义为 XML 实体，XML 解析不报错
投- **用例类型**：边界

---

## TC12 · rss-items.json 数据完整性

- **对应功能点**：F6（RSS 阅读器）
- **前置条件**：`public/data/rss-items.json` 已由 `aggregate-feeds.py` 生成
- **操作步骤**：
  1. 读取 `rss-items.json`，解析 JSON
  2. 检查每个 item 包含 `id`、`title`、`link`、`description`、`pubDate`、`source`、`category`
  3. 检查 `source` 包含 `id` 和 `name`
  4. 检查 `link` 为 `https://` 开头
- **预期结果**：所有 item 字段完整，格式正确
- **用例类型**：正常

---

## TC13 · 外部链接安全性

- **对应功能点**：F6（RSS 阅读器）、F14（安全性）
- **前置条件**：`reader.html` 已加载数据
- **操作步骤**：
  1. 访问 `reader.html`，等待数据渲染
  2. 检查页面中所有外部链接的 `href` 以 `https://` 开头
  3. 检查外部链接是否包含 `rel="noopener"` 或 `rel="noreferrer"`
  4. 检查页面 HTML 源码中不存在 `onclick=`、`onload=` 等内联事件属性
- **预期结果**：所有外部链接安全属性正确，无内联事件
- **用例类型**：正常

---

## TC14 · Wiki 页面数据完整性

- **对应功能点**：F7（Wiki）
- **前置条件**：`public/data/wiki.json` 已由 `build_wiki.py` 生成
- **操作步骤**：
  1. 读取 `wiki.json`，解析 JSON
  2. 检查 `total` 字段 ≥ 30
  3. 检查每个 page 包含 `id`、`title`、`category`、`tags`、`path`
  4. 检查 `id` 无重复
  5. 验证每个 `path` 指向的 `.md` 文件存在
- **预期结果**：wiki 数据完整，30+ 页，所有引用文件存在
- **用例类型**：正常

---

## TC15 · Wiki 页面 hash 路由

- **对应功能点**：F7（Wiki）
- **前置条件**：`wiki.html` 可正常访问
- **操作步骤**：
  1. 访问 `wiki.html#AI/agent-overview`
  2. 等待 detail 视图加载
  3. 检查页面标题包含 "Agent Overview"
  4. 检查渲染的 Markdown 正文非空
  5. 检查页面中存在 `href` 指向 `wiki.html#` 的内部链接（`[[Wiki Link]]` 解析结果）
- **预期结果**：hash 路由正确展示对应页面，[[Wiki Link]] 被解析
- **用例类型**：正常

---

## TC16 · 移动端窄屏页面不溢出

- **对应功能点**：F13（响应式）
- **前置条件**：无
- **操作步骤**：
  1. 设置 viewport 为 375x812（iPhone 尺寸）
  2. 依次访问 index, blog, wiki, reader 页面
  3. 检查每个页面不出现横向滚动条（`document.documentElement.scrollWidth <= viewportWidth`）
- **预期结果**：窄屏下所有页面无横向溢出
- **用例类型**：边界

---

## TC17 · check.py 质量检查可执行

- **对应功能点**：F11（质量检查）
- **前置条件**：Python 3 环境可用
- **操作步骤**：
  1. 执行 `python scripts/check.py`
  2. 捕获 exit code 和 stdout 输出
- **预期结果**：exit code 为 0，输出包含检查结果汇总
- **用例类型**：正常

---

## TC18 · 导航栏在所有页面中结构一致

- **对应功能点**：F12（组件一致性）
- **前置条件**：无
- **操作步骤**：
  1. 依次访问所有 9 个主页面
  2. 在每个页面中提取导航栏的链接文本列表
  3. 比较所有页面的导航栏链接是否完全相同
- **预期结果**：所有页面的导航栏包含相同的 8 个入口（Home/About/Projects/Blog/Research/Wiki/Reader/Assistant）
- **用例类型**：正常

---

## TC19 · 空文章列表边界

- **对应功能点**：F4（博客）
- **前置条件**：`articles/index.json` 存在但 `articles` 数组可能为空（模拟边界情况）
- **操作步骤**：
  1. 检查 `index.json` 中 `articles` 数组长度
  2. 若长度 > 0，验证页面渲染的卡片数量与数据一致
  3. 若长度 = 0，验证页面不崩溃且显示空状态
- **预期结果**：数据与渲染一致，空数据不导致页面异常
- **用例类型**：边界

---

## TC20 · 页面脚本无未捕获异常

- **对应功能点**：F3/F4/F6/F7/F8/F9/F10（所有 JS 模块）
- **前置条件**：无
- **操作步骤**：
  1. 访问每个页面前通过 `page.on('pageerror')` 注册错误监听
  2. 依次访问所有页面
  3. 检查每个页面加载过程中是否抛出未捕获的 JS 异常
- **预期结果**：所有页面加载过程中无未捕获异常
- **用例类型**：异常/高风险

