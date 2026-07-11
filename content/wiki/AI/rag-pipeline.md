---
title: RAG Pipeline
category: AI
tags: rag, retrieval, embedding
updated: 2026-07-05
summary: Retrieval-Augmented Generation pipeline design and implementation.
---

# RAG Pipeline

RAG combines retrieval from a knowledge base with LLM generation
to produce grounded, factual responses.

## Pipeline Steps

1. **Indexing**: Convert documents to embeddings
2. **Retrieval**: Find relevant chunks via similarity search
3. **Augmentation**: Inject context into the prompt
4. **Generation**: LLM produces the final answer

## Related

- [[agent-overview]]
- [[llm-basics]]
