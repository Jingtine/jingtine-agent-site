---
title: Clean Architecture
category: Software
tags: architecture, design, solid
updated: 2026-07-13
summary: Principles of clean architecture for maintainable software systems.
---

# Clean Architecture

## Overview
Clean Architecture is an approach that organizes software into concentric layers with strict dependency rules, so business logic stays independent of frameworks, databases, and UI. Coined by Robert C. Martin, it extends earlier layered and hexagonal styles into a single guideline: dependencies point inward toward the domain. This separation makes systems easier to test, swap, and evolve over time.

## Core Concepts
- **Entities**: Core enterprise business rules that change least often.
- **Use Cases**: Application-specific business rules that orchestrate entities.
- **Interface Adapters**: Controllers, presenters, and gateways that translate data between layers.
- **Frameworks & Drivers**: The outermost layer—web, database, UI, and third-party libraries.
- **Dependency Rule**: Source dependencies must point inward toward the domain, never outward.

## How It Works
1. The outermost layer holds frameworks, databases, and delivery mechanisms.
2. Each inner layer depends only on more central layers, never outward.
3. Use cases define the application's intent through plain interfaces (ports).
4. Outer layers provide concrete implementations (adapters) for those interfaces.
5. Because the domain has no knowledge of the outside, it can be tested and swapped freely.

## Advantages
- Keeps business logic framework-agnostic and highly testable.
- Allows swapping databases, UIs, or libraries without touching the core.
- Makes the system's intent visible in the structure of the code itself.
- Supports parallel work once interfaces between layers are agreed.

## Limitations
- Introduces more files, interfaces, and indirection than a simple layered app.
- Over-application on small projects adds ceremony without payoff.
- Mapping data between layers can be verbose and repetitive.
- Discipline is required to prevent the domain from leaking outward over time.

## Example
A note-taking app keeps `Note` and `NoteRepository` interfaces in the domain layer, while a SQLite adapter and an HTTP controller live in the outer layers—so the core logic can be unit-tested without a database or web server.

## Related Blogs
- [Building My Digital Garden](article.html?slug=building-digital-garden) — How clean separation shaped this site's structure.

## Related Projects
- [My Personal Website](projects.html) — A small project structured with clear layer separation.

## Further Reading
- [[design-patterns]] — Patterns that implement clean architecture's adapters and ports.
- [[testing]] — Why clean architecture makes the domain easy to test in isolation.
