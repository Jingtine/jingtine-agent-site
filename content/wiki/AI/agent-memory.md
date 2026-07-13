---
title: Agent Memory
category: AI
tags: memory, context, agent, persistence
updated: 2026-07-13
summary: How AI agents store and retrieve information across interactions.
---

# Agent Memory

## Overview
Agent memory is the mechanism by which an AI agent preserves and recalls information beyond a single model call. Without memory, every interaction starts from a blank slate; with it, an agent can remember user preferences, past conclusions, and intermediate reasoning. Memory is what separates a stateless chatbot from a persistent, personalized assistant.

## Core Concepts
- **Working Memory**: The current context window — everything the model can attend to right now.
- **Short-term Memory**: Conversation history from the current session, often summarized to fit the window.
- **Long-term Memory**: Persisted facts, preferences, and past events stored in an external database.
- **Episodic Memory**: Records of specific past interactions or runs.
- **Semantic Memory**: General knowledge and facts distilled from many interactions.

## How It Works
1. As a conversation unfolds, new messages are appended to working memory.
2. When the context window nears capacity, older messages are summarized or archived to long-term storage.
3. Before each new turn, relevant memories are retrieved (often via embeddings) and injected into the prompt.
4. The model reasons over both the current input and the recalled memories to produce a response.
5. Important facts extracted during the turn are written back to long-term memory for future use.

## Advantages
- Enables personalization by recalling user-specific preferences and history.
- Allows agents to build on past work instead of restarting each session.
- Supports continuity across long-running, multi-step tasks.
- Decouples knowledge size from the fixed context window.

## Limitations
- Retrieval quality determines usefulness — irrelevant memories add noise.
- Stale or contradictory memories can confuse the model.
- Privacy and data-retention concerns require careful scoping and deletion.
- Summarization can lose detail that later turns turn out to need.

## Example
A coding assistant remembers that a user prefers functional-style Python and that their project uses pytest. On a new session, the agent retrieves these facts from long-term memory, so when asked to "write a test for the parser," it immediately produces a pytest-style functional test without needing to re-ask about preferences.

## Related Blogs
- [Building My First AI Agent](article.html?slug=building-agent) — Why my agent kept forgetting, and how I fixed it.

## Related Projects
- [AI Agent Studio](projects.html) — Includes a pluggable memory store for agents.

## Further Reading
- [[agent-overview]] — Memory as one of the core agent components.
- [[rag-pipeline]] — Retrieval over stored memories uses the same techniques.
