---
title: Tool Calling
category: AI
tags: tool, function, agent, api
updated: 2026-07-13
summary: Enabling LLMs to invoke external tools and APIs.
---

# Tool Calling

## Overview
Tool calling (also called function calling) lets a language model request the execution of external functions — calculators, web search, database queries — rather than answering purely from its weights. The model emits structured arguments describing which tool to run and with what inputs, and the host application executes the tool and returns the result. This bridges the gap between static text generation and real-world action.

## Core Concepts
- **Tool Schema**: A JSON description of each function's name, parameters, and return type that the model can see.
- **Function Selection**: The model decides which tool (if any) is relevant to the current request.
- **Argument Generation**: The model produces structured arguments conforming to the schema.
- **Execution Loop**: The host runs the tool, feeds the result back, and the model continues reasoning.
- **Parallel Calls**: Some models can request multiple independent tool calls in a single turn.

## How It Works
1. The developer registers one or more tools with their schemas alongside the system prompt.
2. The user asks a question that may require external data or action.
3. The model responds with a structured tool-call request instead of (or before) a final answer.
4. The host application validates the arguments, executes the function, and returns the output.
5. The model incorporates the returned result into its reasoning and produces the final response.

## Advantages
- Gives models access to live, proprietary, or computed data they were never trained on.
- Reduces hallucination by grounding answers in retrieved or computed facts.
- Enables agents to take real actions (send email, run code, update a record).
- Schemas enforce structured, parseable outputs for downstream automation.

## Limitations
- Models can select the wrong tool or generate malformed arguments.
- Each tool round-trip adds latency and cost.
- Security risk — tools with side effects must be sandboxed and authorized carefully.
- Complex tool inventories confuse models and degrade selection accuracy.

## Example
A weather agent exposes a `get_weather(city: str, unit: str)` tool. When asked "Is it warmer in Tokyo or London today?", the model issues two parallel `get_weather` calls, receives both temperatures, compares them, and answers "Tokyo is warmer." The model itself never knew the weather — it orchestrated the tools to find out.

## Related Blogs
- [Building My First AI Agent](article.html?slug=building-agent) — The moment my agent first called a real API.

## Related Projects
- [AI Agent Studio](projects.html) — A framework for wiring tools to agents.

## Further Reading
- [[agent-overview]] — How tool calling fits into the broader agent loop.
- [[planning]] — Planning decides which tools to call and in what order.
