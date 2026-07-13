---
title: Operating Systems
category: Study
tags: os, processes, memory
updated: 2026-07-13
summary: Study notes on operating system concepts and internals.
---

# Operating Systems

## Overview
An operating system manages a computer's hardware and software resources, providing the services on which all applications depend. It abstracts raw hardware into usable interfaces and arbitrates access among competing programs. These notes summarize the core concepts that every software engineer should understand.

## Core Concepts
- **Processes and threads** — units of execution that the OS schedules and isolates.
- **Memory management** — virtual memory, paging, and protection give each process its own address space.
- **File systems** — persistent storage abstractions for organizing and retrieving data.
- **Concurrency and synchronization** — mechanisms like locks and semaphores coordinate shared access.
- **I/O and drivers** — uniform interfaces that mediate diverse hardware devices.

## How It Works
The OS kernel runs in privileged mode, mediating all hardware access through system calls that user programs invoke. A scheduler multiplexes the CPU among processes and threads, switching context rapidly to create the illusion of parallel execution. Virtual memory maps each process's addresses to physical frames via page tables, enabling isolation and efficient use of RAM. File systems translate block-level storage into hierarchies of files and directories with metadata. Device drivers and interrupt handlers bridge the kernel to peripherals, presenting uniform I/O interfaces to applications.

## Advantages
- Abstracts hardware complexity, letting applications be portable.
- Enforces isolation and protection between processes.
- Multiplexes scarce resources (CPU, memory, devices) efficiently.
- Provides stable, well-documented APIs for application developers.
- Supports multitasking and concurrency for responsive systems.

## Limitations
- Abstractions leak, forcing engineers to understand underlying behavior.
- Context switching and indirection introduce performance overhead.
- Concurrency bugs (races, deadlocks) are notoriously hard to reproduce and fix.
- Security vulnerabilities in the kernel affect all users.
- Tuning for one workload can degrade another, creating difficult trade-offs.

## Example
When a program reads a file, it issues a `read` system call that traps into the kernel. The OS checks permissions, translates the request to disk blocks via the file system, and issues I/O through the device driver. While the disk responds, the scheduler may run another process, then resumes the original program with its data. A single call thus exercises scheduling, memory, file system, and driver subsystems in concert.

## Related Blogs
- [Why Software Engineering Matters for AI](article.html?slug=why-se-matters) — why OS fundamentals matter for building and deploying AI.

## Related Projects
- [My Personal Website](projects.html) — a project built atop OS-provided abstractions.

## Further Reading
- [[computer-networks]] — networking concepts that the OS exposes to applications.
