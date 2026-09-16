---
title: "From UI to Product"
date: 2026-07-13 12:00:00
slug: from-ui-to-product
description: "从 UI 打磨到产品思维，设计个人网站过程中的反思。"
categories:
  - product-thinking
tags:
  - 产品思维
  - 设计
comments: false
toc: true
---

> What I Learned While Designing My Personal Website

## 第一阶段：让它好看

网站最初的几个 commit 几乎全是 UI：

- `style: refine hero description wrapping`
- `feat: add homepage avatar`
- `feat: add subtle homepage scroll motion`
- `style: refine global scrollbar appearance`
- `style: hide browser scrollbar site-wide`

那时候我关注的是：字体大小对不对、间距匀不匀、动画顺不顺滑、头像好不好看。这些很重要，但它们不是产品的核心。

一个好看的网站不等于一个好用的网站。好看是必要条件，不是充分条件。

## 第二阶段：让它能用

UI 基本定下来后，开始做功能。当时陆续做了：

- Wiki 卡片列表、搜索过滤、分类标签
- Wiki 详情视图、Markdown 渲染
- RSS feed 生成、OPML 导出
- Reader 聚合阅读器
- Assistant 问答助手
- Status 状态页

这个阶段关注的是：功能能不能跑、数据对不对、边界情况处理了没有。代码从"展示型"变成了"功能型"。

但功能堆砌也不等于产品。十个功能不等于一个好产品。

<!-- Image Placeholder -->

## 转变的核心

回头看，这几个阶段的关注点各不相同：

| 阶段 | 问的问题 | 衡量标准 |
|------|---------|---------|
| UI | 好看吗？ | 视觉效果 |
| 功能 | 能用吗？ | 功能数量 |

产品思维不是放弃技术，而是在技术之上增加一层价值判断：这个功能解决了什么问题？用户真的需要它吗？

## 具体例子

**UI 思维**：Blog 文章需要好看的排版 → 调字体、行高、段间距

不是说 UI 不重要。UI 是基础，没有好的 UI 连用户都留不住。但如果止步于 UI，就只是做了一个好看的壳。

## MVP 的教训

网站不是一开始就规划好所有功能的。最初只有首页和关于页，后来陆续加了项目页、博客，也做过 Wiki、Reader 和 Assistant，最后才加上 Blog ↔ Wiki 的双向链接。

每一步都是在前一步的基础上，因为发现了真实的需求才加的。不是因为"一个完整的个人网站应该有这些功能"。

核心是先做最小可用版本，用真实使用反馈驱动迭代。不是规划一切，而是持续生长。

## 总结

从 UI 到产品，不是技术的升级，是思维的转变。从"好看"到"能用"，每一步都在问更深层的问题：这个东西到底为用户创造了什么价值？

网站还会继续生长。但方向已经清晰了：不是加更多页面，而是加更多连接。
