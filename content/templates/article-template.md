+++
title = "文章标题"
date = 2026-09-14
kind = "essay"
category = "life"
summary = "用一两句话概括这篇文章。"
draft = true
tags = ["写作"]
+++

<!--
复制到 articles/<唯一且稳定的-slug>.md；slug 来自文件名，不要放在子目录中。
标题、日期、kind、category、summary、draft 为必填字段。
日期必须是未加引号的 TOML 日期；kind 可选 essay（随笔）、note（短札）、technical（技术）。
category 使用分类 slug；显示名称可在 config/writing.json 中维护，未知分类显示原 slug。
tags 可省略，也可用 []；字符串中的双引号和反斜杠需按 TOML 规则转义。

可选封面：先把图片放到 assets/images/covers/，然后将以下两行一起加入上方 TOML 块：
cover = "assets/images/covers/my-article.jpg"
cover_alt = "准确描述封面的内容"
没有封面时省略两个字段；不得使用远程 URL、父目录跳转或空字符串。

draft 是发布控制，不是保密机制。draft=true 的 Markdown 仍可能被公开仓库或静态服务器访问。
准备发布时设置 draft=false，再运行 python scripts/build_articles.py 和 python scripts/check.py。
预览后一起提交源文件、封面、public/data/articles.json 与 feed.xml。
请在发布前删除这段作者说明并替换示例正文。
-->

## 开头

写下这篇文章的出发点。

## 正文

展开一个具体的观点、观察或实践。

## 后续思考

记录待验证的想法，必要时通过 `[[Wiki 页面标题或 ID]]` 关联已有知识。
