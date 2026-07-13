---
title: REST API
category: Software
tags: api, rest, http, interface
updated: 2026-07-13
summary: Principles and practices for designing RESTful APIs.
---

# REST API

## Overview
REST (Representational State Transfer) is an architectural style for distributed hypermedia systems, most commonly applied to HTTP APIs. A RESTful API exposes resources as URLs and manipulates them with standard verbs, emphasizing statelessness and uniform interfaces. It is the dominant pattern for public web services because it maps cleanly onto HTTP and scales well.

## Core Concepts
- **Resource**: Anything addressable by a URL, such as `/users/42` or `/orders`.
- **HTTP Verbs**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` map to read, create, replace, update, and remove.
- **Statelessness**: Each request contains all information needed to process it; the server holds no client session.
- **Representations**: A resource can be returned in JSON, XML, or other formats via content negotiation.
- **Status Codes**: Standard HTTP codes (`200`, `201`, `404`, `422`) communicate outcomes uniformly.

## How It Works
1. A client sends an HTTP request to a resource URL with a verb and optional body.
2. The server routes the request to the appropriate handler based on method and path.
3. The handler validates input, applies business logic, and reads or mutates state.
4. The server returns a representation of the resulting resource plus a status code.
5. Clients use hypermedia links or known conventions to discover the next valid operations.

## Advantages
- Uses the mature, ubiquitous HTTP infrastructure and tooling.
- Stateless servers scale horizontally and cache aggressively.
- Uniform interface lowers the learning curve for new consumers.
- Decouples client and server, allowing independent evolution.

## Limitations
- Multiple round-trips may be needed to assemble related resources (the "N+1" problem).
- HTTP semantics are often bent in practice, leading to inconsistent APIs.
- Statelessness pushes session and pagination concerns onto the client.
- Versioning and breaking changes require careful strategy to avoid consumer breakage.

## Example
A task service exposes `GET /tasks` to list items, `POST /tasks` to create one, and `DELETE /tasks/7` to remove it, returning JSON bodies and standard status codes so any HTTP client can integrate.

## Related Blogs
- [Why Software Engineering Matters for AI](article.html?slug=why-se-matters) — Why disciplined API design underpins reliable AI systems.

## Related Projects
- [NoteWhale](projects.html) — A service exposing a RESTful interface for note management.

## Further Reading
- [[caching]] — Caching strategies that make REST APIs fast and cheap.
- [[deployment]] — How APIs are shipped and scaled in production.
