# 不驚茶坊：长期个人网站升级设计

日期：2026-09-11
状态：待用户最终审阅

## 目标

将当前以软件工程作品集为主的站点升级为“不驚醴 / Jingtine”的长期个人网站。网站既能容纳技术文章，也能承载生活随笔、阅读记录、项目复盘和未完成的想法；继续提供 RSS 阅读、知识库、研究资料、问答助手和状态页，并新增友邻与来客留言。生产站继续保持 GitHub Pages 纯静态部署，不引入前端框架、数据库或常驻服务。

## 身份与命名

- 网站品牌：`不驚茶坊`
- 中文署名：`不驚醴`
- 英文署名与账号身份：`Jingtine`
- 侧栏品牌区：主标题“不驚茶坊”，副标题“不驚醴 · Jingtine”
- 首页主标题：“你好，我是不驚醴。”，保留 Jingtine 作为英文签名
- About 标题：“不驚醴 / Jingtine”
- 浏览器标题、RSS 作者信息、GitHub 和邮箱等英文场景继续使用 Jingtine

侧栏改为中文，并分成内容与工具两组：

1. 首页
2. 关于
3. 作品
4. 随笔
5. 研究
6. 知识库
7. 订阅阅读
8. 问答助手
9. 友邻
10. 来客簿

GitHub、Email、RSS 和 Status 继续以图标形式位于侧栏底部。移动端沿用可访问的折叠菜单。

## 写作体验与内容模型

每篇文章继续保存为 `articles/<slug>.md`。作者在本地编辑 Markdown 并通过 Git 提交。文章顶部使用 TOML front matter；Python 3.11+ 标准库 `tomllib` 负责解析，避免手写易错的 YAML 解析器和第三方依赖。项目文档与 GitHub Actions 固定使用 Python 3.11 或更高版本。

```toml
+++
title = "文章标题"
date = 2026-09-11
kind = "essay"
category = "life"
tags = ["校园", "随笔"]
summary = "列表页摘要。"
cover = "assets/images/covers/example.jpg"
cover_alt = "封面内容说明"
draft = false
+++
```

字段规则：

- `title`、`date`、`kind`、`category`、`summary` 和 `draft` 必填。
- `tags` 可为空数组；`cover` 与 `cover_alt` 可选，但配置封面时必须同时提供说明。
- `cover` 只允许指向 `assets/images/covers/` 下的仓库内图片，禁止远程热链。
- `draft = true` 的文章不进入公开索引、RSS 与相关文章。草稿状态只控制发布流程，不提供保密能力；私密草稿不得提交到公开仓库。
- `kind` 首版支持 `essay`、`note` 和 `technical`，用于区分随笔、短札和技术文章。
- `category` 采用稳定的英文 slug，不限制内容主题；展示名称由配置映射。

新增 `scripts/build_articles.py`：扫描文章、校验 front matter 与正文、计算中文字数/英文词数和预计阅读时间，并生成 `public/data/articles.json` 与 `feed.xml`。现有 `articles/index.json` 在迁移期由生成器同步输出，待所有页面切换后删除。最终来源以 Markdown front matter 为准，`scripts/check.py` 校验生成结果与源文章一致。

## 随笔列表与文章详情

`blog.html` 保留文件名以避免旧链接失效，导航名称和页面标题改为“随笔 / Writing”。

列表页结构：

- 顶部展示一篇最新或明确标记的主文章，使用大幅封面。
- 其余文章采用不完全等高的双栏纸片，避免规则卡片墙。
- 无封面的文章使用分类色、标题排版和轻量几何图形形成默认封面。
- 提供全文标题/摘要/标签搜索、kind 筛选、分类筛选和标签入口。
- 提供按年份与月份分组的归档视图。
- 每张卡片展示日期、摘要、分类、标签、字数与预计阅读时间。

文章详情：

- 标题区展示可选封面、标题、摘要、日期、分类、标签、字数和阅读时间。
- 正文继续使用当前无外框、920px 上限的阅读区域。
- 目录位于正文之前，并保留键盘操作与锚点导航。
- 正文末尾展示相关文章，优先按共同标签和分类选择。
- 再下方加载文章评论。
- URL 继续使用 `article.html?slug=<slug>`，保持现有外链兼容。

浏览器渲染远程或配置数据时只能使用 `textContent` 和 DOM 节点构造；仓库内 Markdown 延续现有受信任内容例外。
加载正文时先移除 TOML front matter，再交给现有 Markdown 渲染器。

## 评论与来客簿

评论使用 Giscus 和 GitHub Discussions。站点不保存访问令牌，也不增加后端。访客必须通过 GitHub OAuth 登录后才能发布；所有内容存放在目标仓库 Discussions 中，由站点所有者在 GitHub 中编辑、锁定或删除。

接入前置条件：

1. 仓库保持公开并启用 Discussions。
2. 为仓库安装 Giscus GitHub App。
3. 建立专用 Discussion 分类。
4. 将公开的 `repo`、`repoId`、`category`、`categoryId` 写入 `config/comments.json`。

映射规则：

- 文章评论使用 `specific` 映射，term 为 `article:<slug>`，避免所有文章共享 `article.html` pathname，也不受标题修改影响。
- `guestbook.html` 使用固定 term `guestbook`，所有来访留言进入同一个 Discussion。
- 首次评论时允许 Giscus 自动创建对应 Discussion。
- 默认开启 reactions，评论输入框位于评论上方，语言使用简体中文。

Giscus 脚本加载失败或配置尚未完成时，页面显示清晰的不可用说明与前往仓库 Discussions 的 HTTPS 链接；正文、导航和其他功能不受影响。评论 iframe 主题随站点浅色纸张风格同步，但不尝试重写 iframe 内部 DOM。

## 友邻

新增 `links.html`，导航名称为“友邻”。数据来源为 `config/links.json`：

```json
[
  {
    "name": "站点名称",
    "url": "https://example.com/",
    "owner": "作者名",
    "description": "一句简短介绍",
    "avatar": "assets/images/links/example.jpg",
    "tags": ["个人博客"],
    "feed": "https://example.com/feed.xml"
  }
]
```

- `name`、`url`、`owner` 与 `description` 必填。
- 所有外部 URL 必须使用 HTTPS。
- 头像优先使用仓库内文件；未提供时显示名称首字作为图形占位。
- `feed` 可选，只作为订阅入口，不自动加入 RSS Reader。
- 卡片使用朋友来信/明信片的视觉语言，保留足够文本对比度和键盘焦点。
- 页面包含一段本站友链信息，方便他人复制站名、网址、署名、简介与头像地址。

## RSS Reader

现有 `reader.html` 和夜间聚合流程继续使用。升级仅调整信息层级与视觉：

- 来源页显示站点名称、简介、分类、文章数量和最后刷新时间。
- 文章列表与 Writing 共用日期、摘要和标签式元信息，但清楚标记外部来源。
- 保留来源搜索、返回、OPML 导出与失败重试。
- 外部 RSS 内容继续视为不可信数据，只用 DOM 节点与 `textContent` 渲染。

友邻与订阅来源保持独立配置，避免添加友链时自动抓取未知 RSS。需要订阅某个朋友时，显式加入现有 `config/feeds.json` 和 allowlist。

## 背景与站点配置

新增 `config/site.json`，集中保存公开身份和背景参数：

```json
{
  "name": "不驚茶坊",
  "author": "不驚醴",
  "handle": "Jingtine",
  "background": {
    "image": "assets/images/backgrounds/default.jpg",
    "blur": 14,
    "saturation": 0.72,
    "overlay": "#f4f0e8",
    "overlayOpacity": 0.82,
    "position": "center"
  }
}
```

`js/site-theme.js` 在所有页面加载该配置，只接受仓库内 `assets/images/backgrounds/` 路径和限定范围内的数值。它通过 CSS 自定义属性控制固定背景层的模糊、饱和度、位置与遮罩。配置无效、文件缺失或脚本失败时回退到当前浅色点阵纸背景。

背景由站点所有者修改配置，不向访客提供上传或主题选择界面。内容面板继续使用高不透明度纸张色，保证不同背景上的可读性；减少动画偏好不影响静态背景。

## 错误处理与安全

- 文章、友邻、站点配置加载失败时显示页面内错误状态与重试入口。
- 所有外部链接验证为 HTTPS，并添加 `rel="noopener noreferrer"`。
- 评论仅以固定 HTTPS 地址加载 Giscus 官方 `client.js`，配置字段来自仓库内 JSON，并在赋值前校验。
- 不在浏览器端保存 GitHub token、管理凭据或访客个人资料。
- 封面、背景和友邻头像使用本地资源，避免第三方追踪与资源失效。
- 脚本失败时退出码为 1，并向 stderr 输出包含文件路径与字段名的错误。
- 旧文章 URL、`feed.xml`、`subscriptions.opml` 和 GitHub Pages 基础路径保持兼容。

## 实施顺序

### 第一阶段：身份、背景与 Writing

- 更新全站品牌和中文导航。
- 添加 `config/site.json`、背景层与安全回退。
- 迁移现有文章到 front matter。
- 添加文章生成器并更新 RSS 生成流程。
- 重做 Writing 列表与文章标题区、搜索、筛选、归档和相关文章。

### 第二阶段：社区

- 添加 `config/links.json` 与“友邻”页。
- 添加 Giscus 配置加载器、文章评论和“来客簿”。
- 完成仓库 Discussions/Giscus 的人工配置后验证真实登录留言与删除流程。

### 第三阶段：Reader 与全站收尾

- 统一 RSS Reader 视觉与元信息。
- 更新 README、AGENTS.md、内容模板和写作说明。
- 运行数据生成、完整质量检查与全量 Playwright 回归。
- 在桌面、平板和手机尺寸进行视觉检查。

## 验收标准

- 只编辑一篇带 front matter 的 Markdown 即可生成列表数据与 RSS。
- 技术之外的文章分类无需修改程序即可发布。
- 有封面和无封面的文章都具有清晰、稳定的列表布局。
- 搜索、筛选、归档、相关文章和旧文章链接均可用。
- 文章评论与来客簿需要 GitHub 登录，所有者可以在 Discussions 删除内容。
- 友邻外链、RSS 链接和图片路径通过安全校验。
- 更换 `site.json` 背景图片后所有页面统一生效，失败时安全回退。
- 无 JavaScript 时全站导航、页面说明与 RSS 链接仍可访问；文章或配置加载失败时显示明确错误状态。
- `python scripts/check.py` 通过；相关 Playwright 测试覆盖 360、390、768、1024 和 1440px，页面无非预期横向溢出。

## 明确不做

- 不建设网页内文章编辑器或 CMS。
- 不允许访客上传自定义背景。
- 不自建评论数据库、账号系统或管理后台。
- 不自动把所有友邻加入 RSS Reader。
- 不引入 React、Astro、构建器或生产 npm 依赖。
