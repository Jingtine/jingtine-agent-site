---
title: Embedding
category: AI
tags: embedding, vector, representation
updated: 2026-07-13
summary: Vector representations of text for semantic similarity.
---

# Embedding

## Overview
An embedding is a mapping from discrete objects — words, sentences, images — into dense vectors of real numbers in a high-dimensional space. The key property is that semantically similar items land close together in this space, so distance metrics become a proxy for meaning. Embeddings are the foundation of semantic search, clustering, and retrieval-augmented generation.

## Core Concepts
- **Vector Space**: A high-dimensional (often 384–1536 dim) space where each axis captures some latent feature.
- **Similarity Metrics**: Cosine similarity, dot product, and Euclidean distance quantify how close two vectors are.
- **Embedding Model**: A neural network (e.g., text-embedding-3, BGE, E5) trained to produce these vectors.
- **Sequence Pooling**: Converting token-level embeddings into a single sentence or passage vector via mean pooling or attention.
- **Normalization**: Scaling vectors to unit length so cosine similarity reduces to a simple dot product.

## How It Works
1. Text is tokenized into subword units using the embedding model's tokenizer.
2. Each token is mapped to an initial vector via a learned embedding lookup table.
3. A transformer encoder processes the sequence, allowing tokens to attend to each other and build contextualized representations.
4. A pooling step combines token vectors into one fixed-size vector representing the whole input.
5. The resulting vector is stored or compared against others using a similarity metric to rank relevance.

## Advantages
- Captures semantic meaning beyond exact keyword matching.
- Enables fast approximate nearest-neighbor search over millions of items.
- Language-agnostic when trained on multilingual corpora.
- Compact storage — a single vector is far smaller than the original document.

## Limitations
- Quality depends entirely on the training data and model used.
- Loses fine-grained structure; nuance within a long document is flattened into one vector.
- Dimensionality and index tuning are needed to balance recall, latency, and memory.
- Embeddings can encode biases present in the training corpus.

## Example
Given the queries "how to train a dog" and "puppy obedience tips", a keyword matcher sees no overlap, but an embedding model places their vectors very close together. A retrieval system can therefore surface the second document when asked the first question, which is the core mechanism behind semantic search and RAG.

## Related Blogs
- [Building NoteWhale: Why I Started](article.html?slug=notewhale-why-started) — Why semantic embeddings are central to NoteWhale's note search.

## Related Projects
- [NoteWhale](projects.html) — A knowledge tool built on embedding-based retrieval.

## Further Reading
- [[rag-pipeline]] — How embeddings feed the retrieval stage of RAG.
- [[vector-database]] — Where the resulting vectors are stored and queried.
