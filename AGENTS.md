# AGENTS.md — Jingtine Agent Site 项目协作约定

## 项目边界

Jingtine Agent Site 是由 Hexo 8 和 Reimu 生成的个人作品集与写作站点，发布到 GitHub Pages。不要引入另一套前端框架、打包体系、服务端运行时、数据库或线上 API 服务。

Node.js 22+ 与 `npm ci` 是生产构建工具链。依赖版本必须精确锁定，`package-lock.json` 必须提交；不得使用浮动版本范围。

## 内容、主题与生成文件

- 所有页面和文章源内容放在 `source/`；文章位于 `source/_posts/`。
- `public/` 完全由 Hexo 生成，禁止手工编辑或提交。
- 主题配置放在 `_config.reimu.yml`，自定义样式放在 `source/css/custom.css`，本地媒体放在 `source/` 下的合适目录。
- 禁止编辑 `node_modules/` 或复制修改其中的主题源码；可维护的定制必须通过配置、覆盖样式和本地资源完成。
- `scripts/tags.js` 是本地 Hexo 扩展，应继续使用确定性、可审查的逻辑。
- 评论、留言簿、RSS 阅读器、论文库、Wiki、知识助手和状态页已明确退出范围，不得恢复其运行时、数据采集或自动化链路。
- 历史设计与实施记录保留在 `docs/superpowers/`，不得把这些历史文档当成当前架构说明，也不得在清理产品代码时删除。

## 路径与部署

GitHub Pages 根路径保持 `/jingtine-agent-site/`。新增或修改内部链接、静态资源地址、Feed 和分页时，必须同时验证该子路径部署和本地服务器行为。

推送到 `main` 后由 GitHub Pages Actions 构建和部署。不要提交 `public/`、部署缓存、测试报告或机器专用状态。

## 浏览器安全与可访问性

- 任何远程内容、第三方元数据和外部配置均视为不可信；使用安全的 DOM API 和 `textContent`，不得把不可信字符串传给 `innerHTML` 或 `insertAdjacentHTML`。
- 外部链接必须使用 `https://`，并设置 `rel="noopener noreferrer"`；赋值给 `href` 前验证协议。
- 禁止 `javascript:` URL、内联事件处理器以及不安全的动态脚本或样式注入。
- 交互组件必须支持键盘操作、清晰焦点、语义化 HTML 和正确的 ARIA 状态。
- 遵循渐进增强并尊重 `prefers-reduced-motion`；可选动画或远程资源失败时，核心内容和导航仍应可用。
- 延续浅紫、浅蓝和白色的设计语言，复用 Reimu 与现有自定义令牌，保持桌面和移动端响应式布局。

## 密钥与数据

仓库不得包含令牌、Cookie、邮箱凭据、私钥、会话值、编辑器状态、浏览器配置或机器路径。公开仓库中的草稿、源文件和静态资源都不具备保密性。

## 变更纪律

- 修改必须聚焦当前任务，并保留工作区中已有的无关改动。
- 优先调整现有 Hexo 配置、内容和样式，不为单一页面复制组件体系。
- 新增页面时统一检查菜单、内部链接、站点地图、Feed 和 GitHub Pages 子路径。
- 不得手工修改生成文件，也不得混入无关的内容刷新或锁文件变化。
- 提交前检查 `git diff` 与 `git status`，确认只包含预期的源文件、配置、测试和文档。

## 验证

每次变更至少运行单元检查和一次干净的 Hexo 构建：

```powershell
npm run test:unit
npm run clean
npm run build
```

涉及页面行为、导航、可访问性或响应式布局时还必须运行：

```powershell
npm run test:e2e
```

如果仓库提供额外的 `npm run check` 质量门禁，也必须在提交前运行。任何成功声明都应以本次工作中实际执行且退出码为 0 的命令为依据。
