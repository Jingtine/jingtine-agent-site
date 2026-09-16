---
title: "My OpenCode + Superpowers Workflow"
date: 2026-07-12 12:00:00
slug: opencode-superpowers-workflow
description: "使用 OpenCode 和 Superpowers 技能系统规划后再编码的工作流。"
categories:
  - software-engineering
tags:
  - OpenCode
  - Superpowers
  - 工作流
comments: false
toc: true
---

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

## AGENTS.md 作为项目约束

`AGENTS.md` 文件定义了项目的全局约束：

- 技术栈：纯 HTML + CSS + vanilla JS，Python 3 标准库
- 安全规则：外部 RSS 数据用 `textContent` 渲染，不用 `innerHTML`
- 目录结构：`scripts/`、`articles/`、`content/wiki/`、`public/data/`
- 脚本约定：Python 3 标准库，零依赖，退出码 0=成功

每次开始工作前，技能系统会读取 `AGENTS.md`，确保不违反约束。约束定义了边界，边界内自由发挥。

## 为什么不直接用 IDE

IDE 帮你写代码，但不帮你想清楚要写什么。Superpowers 的价值不在于代码生成，而在于：

- **强制思考**：brainstorming 技能要求你在写代码前回答"用户意图是什么"
- **强制计划**：writing-plans 技能要求你把任务拆成小步骤
- **强制验证**：verification-before-completion 技能要求你运行验证命令并检查输出

这三件事，IDE 不会帮你做。但它们恰恰是减少返工、提高质量的关键。

## 总结

工具不是重点，流程才是。OpenCode + Superpowers 给了我一套结构化的流程：想清楚再动手，做完后验证。它不替我写代码，但它确保我在写代码之前已经想清楚了要写什么、怎么写、怎么验证。

好的模式不是增加复杂度，而是减少犯错的可能性。

## Further Reading

- [Why Software Engineering Matters for AI](/jingtine-agent-site/posts/why-se-matters/)
