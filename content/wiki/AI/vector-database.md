---
title: Vector Database
category: AI
tags: vector, database, similarity, search
updated: 2026-07-13
summary: Databases optimized for storing and querying high-dimensional vectors.
---

# Vector Database

## Overview
A vector database is a storage engine purpose-built to ingest, index, and query high-dimensional vectors at scale. Unlike relational databases that filter rows by exact field values, vector databases find the items whose vectors are closest to a query vector, enabling semantic similarity search. They are the persistence layer behind RAG pipelines, recommendation systems, and image search.

## Core Concepts
- **Indexing**: Structures like HNSW, IVF, or PQ that organize vectors for fast approximate lookup.
- **Approximate Nearest Neighbor (ANN)**: Trading a small accuracy loss for orders-of-magnitude speed gains over brute-force search.
- **Metadata Filtering**: Combining vector similarity with scalar predicates (e.g., tags, dates) on attached payload fields.
- **Sharding & Replication**: Distributing vectors across nodes for scale and fault tolerance.
- **Distance Metric**: The function (cosine, L2, inner product) used to rank candidate vectors.

## How It Works
1. Documents or items are converted to vectors by an embedding model and inserted alongside metadata.
2. On insert, the database assigns each vector to one or more index buckets or graph nodes.
3. At query time, the query vector is embedded and the index is traversed to find a candidate set.
4. Candidates are re-ranked by exact distance to produce the top-k results.
5. Optional metadata filters are applied before or after retrieval to narrow the final set.

## Advantages
- Millisecond-level similarity search over millions or billions of vectors.
- Hybrid queries that blend semantic and structured filtering.
- Managed services handle scaling, backups, and replication automatically.
- Pluggable distance metrics support text, image, and audio use cases.

## Limitations
- ANN results are approximate; recall is tunable but never guaranteed to be exact.
- Index build time and memory footprint can be large for high-dimensional data.
- Schema for metadata is often less expressive than a full SQL engine.
- Operational cost and complexity rise with sharded or replicated clusters.

## Example
A note-taking app embeds every note into a 768-dim vector and stores it in a Qdrant collection with a `user_id` payload. A search for "meeting notes about budget" embeds the query, retrieves the top 20 nearest vectors, then filters to the current user's notes — returning semantically relevant results even when the exact word "budget" never appears.

## Related Blogs
- [Building NoteWhale: Why I Started](article.html?slug=notewhale-why-started) — The data layer behind NoteWhale's semantic search.

## Related Projects
- [NoteWhale](projects.html) — Uses a vector database to power note retrieval.

## Further Reading
- [[embedding]] — The vectors that populate a vector database.
- [[rag-pipeline]] — How vector databases fit into end-to-end RAG.
