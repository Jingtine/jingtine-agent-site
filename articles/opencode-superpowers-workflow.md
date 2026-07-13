# My OpenCode + Superpowers Workflow

> Planning Before Coding

## 问题

我以前写代码的方式是这样的：想到一个功能，直接开始写，写到一半发现问题，回头改，改完继续写，最后发现遗漏了边界情况，再补。

这种方式的问题不是写不出代码，而是：

- 容易遗漏需求（没想清楚就动手）
- 容易过度设计（不知道边界在哪）
- 容易虚假完成（"我觉得写完了"但没验证）
- 容易重复犯错（同样的 bug 反复出现）

## OpenCode + Superpowers

OpenCode 是一个 CLI 工具，Superpowers 是它的技能系统。每个技能是一套结构化的工作流程，强制你在动手之前想清楚。

我的工作流现在是这样的：

1. **Brainstorming** — 理清意图和需求
2. **Writing Plans** — 写成可执行的步骤
3. **Executing Plans** — 按步骤执行
4. **Verification Before Completion** — 验证后再声称完成

这不是什么高深的方法论。它就是"想清楚再动手，做完后验证"。但关键是：有结构化的流程强制你这么做，而不是靠自律。

<!-- Image Placeholder -->

## 真实案例：Wiki Hash 路由

拿 Wiki hash 路由这个功能举例。

**Brainstorming 阶段**：我需要 Wiki 页面有可分享的 URL。用 hash routing（`wiki.html#AI%2Frag-pipeline`），不用服务端路由。页面 ID 用 `Category/slug` 格式，URL 里用 `encodeURIComponent` 编码。

**Writing Plans 阶段**：写成具体步骤——添加 `hashchange` 监听器、实现 `syncViewFromHash()`、`getPageIdFromHash()`、`openPageById()`，处理页面不存在的情况，添加 `listInitialized` 标志防止返回时重建 DOM。

**Executing Plans 阶段**：按步骤写代码，每步后 `node --check` 验证语法。

**Verification 阶段**：`node --check js/wiki.js` 通过，`python scripts/check.py` 通过，本地浏览器测试通过。

不过上线后发现两个问题：返回列表时 DOM 被重复重建，以及 GitHub Pages 上导航状态丢失。分别用 `7514d77` 和 `aba97dc` 两个 commit 修复。计划不能覆盖所有边界——但结构化流程让修复也很有条理。

## 真实案例：.nojekyll 修复

另一个例子是 GitHub Pages 上 Wiki 详情页背景变灰的 bug。

用 **Systematic Debugging** 技能：不猜原因，先收集证据。在浏览器 DevTools 网络面板中发现 `content/wiki/AI/rag-pipeline.md` 返回 404。根因是 GitHub Pages 用 Jekyll 处理 `.md` 文件，不直接提供原始 Markdown。404 页面的 HTML（包含 `<style>body { background-color: #f1f1f1; }</style>`）被注入到 Wiki 详情页，覆盖了全局背景。

修复：添加 `.nojekyll` 空文件，禁用 Jekyll 处理。同时在 `wiki.js` 和 `assistant.js` 的 fetch 链中添加 `res.ok` 检查，防止 404 HTML 进入 `marked.parse()`。

如果没有 systematic debugging 的流程，我可能会猜"是不是 CSS 的问题"，然后花时间改 CSS，而 CSS 根本不是问题所在。

## AGENTS.md 作为项目约束

`AGENTS.md` 文件定义了项目的全局约束：

- 技术栈：纯 HTML + CSS + vanilla JS，Python 3 标准库
- 安全规则：外部 RSS 数据用 `textContent` 渲染，不用 `innerHTML`
- 目录结构：`scripts/`、`articles/`、`content/wiki/`、`public/data/`
- 脚本约定：Python 3 标准库，零依赖，退出码 0=成功

每次开始工作前，技能系统会读取 `AGENTS.md`，确保不违反约束。这和 [[clean-architecture]] 的理念一致：约束定义了边界，边界内自由发挥。

## 为什么不直接用 IDE

IDE 帮你写代码，但不帮你想清楚要写什么。Superpowers 的价值不在于代码生成，而在于：

- **强制思考**：brainstorming 技能要求你在写代码前回答"用户意图是什么"
- **强制计划**：writing-plans 技能要求你把任务拆成小步骤
- **强制验证**：verification-before-completion 技能要求你运行验证命令并检查输出

这三件事，IDE 不会帮你做。但它们恰恰是减少返工、提高质量的关键。

## 总结

工具不是重点，流程才是。OpenCode + Superpowers 给了我一套结构化的流程：想清楚再动手，做完后验证。它不替我写代码，但它确保我在写代码之前已经想清楚了要写什么、怎么写、怎么验证。

这和 [[design-patterns]] 里的原则一样：好的模式不是增加复杂度，而是减少犯错的可能性。

## Related Wiki

- [[clean-architecture]] — 项目约束与分层设计
- [[design-patterns]] — 结构化流程作为一种工程模式

## Further Reading

- [Why Software Engineering Matters for AI](article.html?slug=why-se-matters)
