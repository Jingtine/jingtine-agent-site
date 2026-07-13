---
title: Deployment
category: Software
tags: deployment, hosting, release
updated: 2026-07-13
summary: Strategies and practices for deploying software to production.
---

# Deployment

## Overview
Deployment is the process of releasing software from a built artifact into a live environment where users can access it. It encompasses hosting, configuration, rollout strategy, and rollback. A good deployment process is automated, reproducible, and designed to minimize downtime and risk.

## Core Concepts
- **Environment**: A target runtime—development, staging, production—with its own config and data.
- **Artifact**: The immutable build output that is promoted across environments.
- **Rollout Strategy**: How new versions are exposed—blue-green, canary, rolling, or all-at-once.
- **Rollback**: The ability to revert to a previous known-good version when a release fails.
- **Infrastructure as Code**: Declarative definitions of servers and services that are versioned like code.

## How It Works
1. A CI pipeline produces a versioned, tested artifact.
2. The artifact is deployed to a staging environment for final verification.
3. A rollout strategy progressively routes traffic to the new version.
4. Health checks and metrics confirm the new version is behaving correctly.
5. If problems appear, an automated or manual rollback restores the previous version.

## Advantages
- Automated deployments reduce human error and release toil.
- Progressive rollouts limit the blast radius of bad changes.
- Immutable artifacts make releases reproducible and auditable.
- Fast rollbacks shorten recovery time when incidents occur.

## Limitations
- Stateful services and database migrations complicate zero-downtime rollouts.
- Rollbacks can be unsafe when schema changes are involved.
- Multi-environment parity is hard to maintain in practice.
- Vendor lock-in and platform limits can constrain deployment options.

## Example
A static site is built by CI, the resulting files are pushed to a `gh-pages` branch, and GitHub Pages serves them globally within minutes—no servers to manage and no downtime during updates.

## Related Blogs
- [GitHub Pages Development Notes](article.html?slug=github-pages-dev-notes) — Practical notes on deploying a static site to GitHub Pages.

## Related Projects
- [My Personal Website](projects.html) — A static site deployed to GitHub Pages.

## Further Reading
- [[ci-cd]] — The pipelines that produce deployable artifacts.
- [[caching]] — Edge and CDN caching layered in front of a deployment.
