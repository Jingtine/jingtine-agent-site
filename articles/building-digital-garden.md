# Building My Digital Garden

> Why I Chose a Knowledge Network Instead of a Portfolio

## 传统作品集的问题

大多数个人网站是这样的：一个首页，一个关于页面，一个项目列表，一个联系方式。本质上是一份在线简历。

我一开始也是这么想的。但做着做着发现一个问题：这种结构是静态的。项目列在那里，彼此没有关联。博客文章写完就结束了，不会和项目产生联系。知识沉淀在脑子里，但不在网站上。

我想要的不只是一份简历。我想要一个能生长的知识系统——写下的东西可以被引用、被关联、被持续发现。

## 数字花园的概念

数字花园（Digital Garden）不是新概念。它和传统博客的区别在于：

- **博客**：时间线驱动，写完就结束
- **数字花园**：网络驱动，内容之间有双向链接，持续生长

我的网站现在有这些部分：

- **Wiki**（9 个页面）：AI、Software、Product、Study 四个分类，页面之间有 `[[Wiki Link]]` 交叉引用
- **Blog**（9 篇文章）：文章中可以用 `[[Wiki Link]]` 引用 Wiki 页面
- **Projects**（4 个项目）：NoteWhale、街像、AI Agent Studio、My Personal Website
- **Reader**：RSS 聚合阅读器
- **Assistant**：基于 Wiki 内容的问答助手

关键不是这些页面本身，而是它们之间的连接。

<!-- Image Placeholder -->

## 双向链接的实现

Blog → Wiki 的链接是通过 Markdown 中的 `[[Wiki Name]]` 语法实现的。`blog.js` 在 `marked.parse()` 渲染完 HTML 后，用 TreeWalker 扫描文本节点，找到 `[[...]]` 模式，解析到对应的 Wiki 页面，替换成 `<a>` 标签。

Wiki → Blog 的反向关联也实现了。`wiki.js` 在 Wiki 详情页加载时，扫描所有 Blog 文章的 Markdown，找到引用了当前 Wiki 页面的文章，在页面底部展示 "Related Blog Articles"。

这样，从 Wiki 页面可以看到哪些 Blog 文章引用了它，从 Blog 文章可以点击跳转到 Wiki 详情。知识在网络中流动，而不是孤立存在。

## 技术架构

整个网站的架构遵循 [[clean-architecture]] 的思路：

- **页面层**：13 个 HTML 页面，纯 HTML + CSS，无框架
- **脚本层**：`blog.js`（全局函数）、`wiki.js`（IIFE 模块）、`site-motion.js`（动画）、`marked.min.js`（Markdown 渲染）
- **数据层**：`articles/index.json`、`public/data/wiki.json`、`public/data/papers.json`、`public/data/rss-items.json`
- **内容层**：`articles/*.md`（博客）、`content/wiki/**/*.md`（Wiki）
- **脚本层**：Python 3 标准库，零依赖

没有 npm，没有 bundler，没有 transpiler。`scripts/` 里的 Python 脚本用标准库生成 RSS feed、构建 Wiki 索引、聚合 RSS 源、收集论文数据。

这个架构的选择和 [[design-patterns]] 里的原则一致：每个模块有清晰的职责，数据流单向，依赖方向从外向内。

## Git 历史中的生长轨迹

51 个 commit 记录了这个花园的生长过程：

1. **UI 阶段**：首页 hero、头像、滚动动画、滚动条样式
2. **功能阶段**：Wiki 卡片列表、搜索过滤、分类标签、详情视图
3. **路由阶段**：Wiki hash 路由、可分享 URL、`encodeURIComponent`
4. **修复阶段**：`.nojekyll`、背景层叠、缓存刷新
5. **连接阶段**：Blog → Wiki 链接、Wiki → Blog 关联文章

每个阶段都是在前一阶段的基础上叠加，而不是推翻重来。这正是数字花园的理念：持续生长，不追求一步到位。

## 总结

传统作品集是静态的展示，数字花园是动态的网络。选择后者意味着：内容不是写完就结束，而是可以被引用、被关联、被持续发现。技术实现不复杂——TreeWalker 扫描文本节点、`[[Wiki Link]]` 语法、Python 脚本生成索引——但效果是让知识在网络中流动。

这个网站本身就是一个 [[product-thinking]] 的实践：从"我想要什么"出发，而不是从"技术能做什么"出发。

## Related Wiki

- [[clean-architecture]] — 网站的分层架构设计
- [[design-patterns]] — 模块职责与依赖方向

## Related Projects

- [My Personal Website](projects.html) — 这个数字花园本身

## Further Reading

- [Hello World](article.html?slug=hello-world)
