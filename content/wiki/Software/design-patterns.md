---
title: Design Patterns
category: Software
tags: patterns, oop, engineering
updated: 2026-07-13
summary: Common software design patterns and their practical applications.
---

# Design Patterns

## Overview
Design patterns are reusable, named solutions to recurring problems in software design. They capture distilled experience from many projects, giving teams a shared vocabulary for structure and intent. Popularized by the "Gang of Four" book, patterns are not copy-paste code but templates that are adapted to each context.

## Core Concepts
- **Creational Patterns**: Concern object creation—Factory, Builder, Singleton, Prototype.
- **Structural Patterns**: Compose objects into larger structures—Adapter, Decorator, Facade, Composite.
- **Behavioral Patterns**: Define how objects communicate—Observer, Strategy, Command, Iterator.
- **Intent**: The specific problem a pattern addresses, independent of implementation language.
- **Trade-offs**: Every pattern adds indirection; the cost must be justified by the problem's frequency.

## How It Works
1. A designer recognizes a recurring problem in the codebase.
2. They select a pattern whose intent matches that problem.
3. The pattern's participants (classes and roles) are mapped onto the concrete code.
4. The structure is adapted to the language and project's conventions.
5. The shared name lets other developers understand the design at a glance.

## Advantages
- Provides a common vocabulary that speeds design discussion.
- Encodes proven solutions, avoiding reinvention of common structures.
- Makes code more flexible to future variation points.
- Lowers onboarding cost for developers familiar with the patterns.

## Limitations
- Overuse adds unnecessary indirection and complexity.
- Patterns implemented in the wrong language idiom feel forced.
- Singleton, in particular, introduces global state and testing difficulties.
- Patterns can become cargo-culted, applied without understanding the problem.

## Example
A logging component uses the Singleton pattern so every module shares one instance, while a notification system uses Observer so multiple listeners react to events without the sender knowing about them.

## Related Blogs
- [My OpenCode + Superpowers Workflow](article.html?slug=opencode-superpowers-workflow) — How patterns inform the structure of agent-assisted workflows.

## Related Projects
- [My Personal Website](projects.html) — A small codebase that applies a few lightweight patterns.

## Further Reading
- [[clean-architecture]] — How patterns realize the adapter and port abstractions in clean architecture.
- [[git-workflow]] — Workflow conventions that complement code-level patterns.
