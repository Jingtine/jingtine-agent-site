---
title: Computer Networks
category: Study
tags: network, tcpip, osi
updated: 2026-07-13
summary: Study notes on computer networking fundamentals.
---

# Computer Networks

## Overview
Computer networks connect independent devices so they can exchange data and share resources. Understanding networking requires grasping layered models, protocols, and the trade-offs between reliability, speed, and scale. These notes cover the foundational concepts that underpin the internet and most distributed systems.

## Core Concepts
- **Layering** — functionality is divided into stacked layers, each serving the one above.
- **OSI model** — seven layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.
- **TCP/IP model** — four layers: Application, Transport, Internet, Network Access.
- **Addressing** — MAC addresses for link-level, IP addresses for network-level, ports for processes.
- **Protocols** — agreed rules like TCP, UDP, HTTP, and DNS that govern communication.

## How It Works
Data sent across a network is broken into segments and encapsulated with headers at each layer as it moves down the stack. At the network layer, IP routes packets between networks using destination addresses. The transport layer (TCP) provides reliable, ordered delivery through connections, acknowledgments, and retransmission; UDP offers a lighter, best-effort alternative. On arrival, each layer strips its header and passes the payload upward until the application receives the original data. This separation of concerns lets diverse physical media and applications interoperate transparently.

## Advantages
- Layered design isolates concerns, enabling independent evolution of each layer.
- Standardized protocols allow heterogeneous devices to interoperate.
- TCP provides reliable, ordered delivery suitable for most applications.
- Decentralized routing makes the internet resilient to partial failures.
- Shared infrastructure enables efficient resource use and global reach.

## Limitations
- Layering introduces overhead and abstraction that can hide inefficiencies.
- Reliability mechanisms like TCP retransmission add latency.
- Address exhaustion (e.g., IPv4) necessitates migration and workarounds like NAT.
- Security was not foundational in early designs, requiring bolt-on protections.
- Diagnosing faults across many layers can be difficult.

## Example
When you open a website, your browser uses DNS (application layer) to resolve the hostname to an IP address, then opens a TCP connection (transport layer) to port 443. Packets are routed across multiple networks (internet layer) over various physical links (network access layer) until they reach the server, which responds in reverse. Each layer performs its specific role, yet together they deliver a seamless web page.

## Related Blogs
- [Why Software Engineering Matters for AI](article.html?slug=why-se-matters) — how networking fundamentals underpin modern AI systems.

## Related Projects
- [My Personal Website](projects.html) — a project deployed over these very networking layers.

## Further Reading
- [[operating-systems]] — the OS abstractions that consume network services.
