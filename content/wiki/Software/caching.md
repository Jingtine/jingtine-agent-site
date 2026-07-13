---
title: Caching
category: Software
tags: caching, performance, optimization
updated: 2026-07-13
summary: Strategies for storing and reusing computed results to improve performance.
---

# Caching

## Overview
Caching is the practice of storing the result of an expensive computation so future requests for the same data can be served faster. A cache sits between a caller and a slower or costlier source, trading memory for speed. It is one of the most effective levers for improving latency, throughput, and cost in software systems.

## Core Concepts
- **Cache Hit / Miss**: A hit serves data from the cache; a miss falls through to the source and populates the cache.
- **Eviction Policy**: Rules like LRU, LFU, or TTL decide what to remove when the cache fills.
- **Cache Key**: A deterministic identifier (often a hash of inputs) used to look up stored entries.
- **Invalidation**: The process of marking or removing stale entries when the underlying data changes.
- **Cache Levels**: Caches exist at many layers—CPU, in-process, CDN, reverse proxy, and database.

## How It Works
1. A caller requests data, first checking the cache for a matching key.
2. On a hit, the cached value is returned immediately, skipping the expensive source.
3. On a miss, the source is queried, and the result is written back to the cache under the key.
4. An eviction policy removes entries when capacity is exceeded or entries expire.
5. Invalidation or explicit updates keep the cache consistent with the source of truth.

## Advantages
- Dramatically reduces latency for repeated reads.
- Lowers load and cost on databases and upstream APIs.
- Improves throughput by absorbing read traffic at the cache layer.
- Enables graceful degradation when the source is slow or unavailable.

## Limitations
- Introduces staleness and consistency challenges versus the source of truth.
- Adds memory and infrastructure complexity to the system.
- Cache stampede and thundering-herd effects can occur on cold or expired keys.
- Debugging cache-related bugs is notoriously difficult.

## Example
A blog renders pages from Markdown once, stores the HTML in a CDN cache keyed by URL, and serves subsequent visitors from the edge—reducing origin load and cutting page load from hundreds of milliseconds to tens.

## Related Blogs
- [GitHub Pages Development Notes](article.html?slug=github-pages-dev-notes) — Caching and static-asset strategies used on this site.

## Related Projects
- [My Personal Website](projects.html) — A static site that leans on CDN and browser caching.

## Further Reading
- [[rest-api]] — How caching powers REST performance and the `Cache-Control` headers.
- [[deployment]] — Where caches sit in a production deployment topology.
