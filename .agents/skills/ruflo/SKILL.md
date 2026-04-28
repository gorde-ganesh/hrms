---
name: ruflo
description: Use when the user wants to orchestrate multi-agent AI swarms, coordinate parallel agents, use SPARC methodology, manage AgentDB memory, run security/performance audits, automate GitHub workflows, or leverage the Ruflo/Claude-Flow framework for complex multi-file tasks. Triggers on requests involving agent coordination, swarm initialization, neural training, MCP tool orchestration, or Claude-Flow CLI commands.
---

# Ruflo — Multi-Agent AI Orchestration Framework

Ruflo (v3.5) transforms Claude Code into a multi-agent platform with swarm intelligence, HNSW-indexed memory, neural learning, and 314 MCP tools.

Source: https://github.com/ruvnet/ruflo

## Installation

```bash
# Quickstart (recommended)
npx ruflo@latest init

# Or via npm global install
npm install -g ruflo
npx ruflo@latest init --wizard

# Start MCP server for Claude Code
npx ruflo@latest mcp start
```

**Requirements**: Node.js 20+, Claude Code ≥ 2.0.0

## Behavioral Rules (Always Enforced)

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files over creating new ones
- NEVER proactively create `*.md` or README files unless explicitly requested
- NEVER save working files, texts, or tests to the root folder
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or `.env` files

## File Organization

| Directory | Purpose |
|-----------|---------|
| `/src` | Source code |
| `/tests` | Test files |
| `/docs` | Documentation |
| `/config` | Configuration |
| `/scripts` | Utility scripts |
| `/examples` | Example code |

## Concurrency Requirement

**1 MESSAGE = ALL RELATED OPERATIONS (always parallel)**

- ALWAYS batch ALL todos in ONE `TodoWrite` call (5–10+ minimum)
- ALWAYS spawn ALL agents in ONE message via Task tool
- ALWAYS batch ALL file reads/writes in ONE message
- ALWAYS batch ALL terminal operations in ONE Bash message

## Swarm Orchestration

### Auto-Start Swarm Protocol

For complex tasks (multi-file, new features, refactoring, API changes), execute this pattern in a SINGLE message:

```javascript
// STEP 1: Initialize swarm via MCP
mcp__ruv-swarm__swarm_init({
  topology: "hierarchical",  // prevents drift
  maxAgents: 8,
  strategy: "specialized"
})

// STEP 2: Spawn agents concurrently via Task tool (ALL in same message)
Task("Coordinator", "Initialize session, coordinate via memory. Run: npx claude-flow@v3alpha hooks session-start", "hierarchical-coordinator")
Task("Researcher", "Analyze requirements and existing patterns. Store findings in memory.", "researcher")
Task("Architect", "Design implementation. Document decisions in memory.", "system-architect")
Task("Coder", "Implement following architect's design. Coordinate via hooks.", "coder")
Task("Tester", "Write tests for implementation. Report coverage.", "tester")
Task("Reviewer", "Review code quality and security.", "reviewer")
```

### Agent Routing by Task Code

| Code | Task Type | Agents |
|------|-----------|--------|
| 1 | Bug Fix | coordinator, researcher, coder, tester |
| 3 | Feature | coordinator, architect, coder, tester, reviewer |
| 5 | Refactor | coordinator, architect, coder, reviewer |
| 7 | Performance | coordinator, perf-engineer, coder |
| 9 | Security | coordinator, security-architect, auditor |
| 11 | Memory | coordinator, memory-specialist, perf-engineer |
| 13 | Docs | researcher, api-docs |

**Codes 1–11:** `hierarchical/specialized` topology. **Code 13:** `mesh/balanced`

### When to Skip Swarm

- Single file edits
- Simple bug fixes (1–2 lines)
- Documentation updates
- Configuration changes
- Quick exploration

### Task Complexity — Auto-Invoke Swarm When

- 3+ files involved
- New feature implementation
- Cross-module refactoring
- API changes with tests
- Security-related changes
- Performance optimization
- Database schema changes

## Swarm Configuration (Anti-Drift Defaults)

```javascript
mcp__ruv-swarm__swarm_init({
  topology: "hierarchical",  // central coordination prevents drift
  maxAgents: 8,              // smaller = less drift
  strategy: "specialized",  // clear roles, no overlap
  consensus: "raft",         // leader maintains authoritative state
  memoryBackend: "hybrid"   // SQLite + AgentDB
})
```

## 3-Tier Model Routing

| Tier | Handler | Latency | Cost | Use Cases |
|------|---------|---------|------|-----------|
| 1 | Agent Booster (WASM) | <1ms | $0 | Simple transforms — skip LLM entirely |
| 2 | Haiku | ~500ms | $0.0002 | Low-complexity tasks (<30%) |
| 3 | Sonnet/Opus | 2–5s | $0.003–0.015 | Complex reasoning, architecture, security (>30%) |

Check for `[AGENT_BOOSTER_AVAILABLE]` before spawning agents.

## V3 CLI Commands (26 Commands, 140+ Subcommands)

```bash
# Initialize project
npx claude-flow@v3alpha init --wizard

# Agent management
npx claude-flow@v3alpha agent spawn -t coder --name my-coder
npx claude-flow@v3alpha agent list
npx claude-flow@v3alpha agent status <id>

# Swarm
npx claude-flow@v3alpha swarm init --v3-mode

# Memory (HNSW-indexed, 150x–12,500x faster)
npx claude-flow@v3alpha memory search -q "authentication patterns"
npx claude-flow@v3alpha memory store --namespace swarm --key ctx --value '{"task":"..."}'

# System
npx claude-flow@v3alpha daemon start
npx claude-flow@v3alpha doctor --fix
npx claude-flow@v3alpha status

# Security
npx claude-flow@v3alpha security scan --depth full

# Performance
npx claude-flow@v3alpha performance benchmark --suite all

# Neural training
npx claude-flow@v3alpha neural train --pattern "feature-dev"
```

## Headless Background Instances (`claude -p`)

```bash
# Single headless task
claude -p "Analyze auth module for security issues"

# Parallel background execution
claude -p "Analyze src/auth/ for vulnerabilities" &
claude -p "Write tests for src/api/endpoints.ts" &
claude -p "Review src/models/ for performance" &
wait

# Session continuation
claude -p --session-id "abc-123" "Start analyzing the codebase"
claude -p --resume "abc-123" "Continue with test files"
```

| Flag | Purpose |
|------|---------|
| `-p` | Non-interactive, print and exit |
| `--model <model>` | haiku / sonnet / opus |
| `--output-format <fmt>` | text / json / stream-json |
| `--max-budget-usd <amt>` | Spending cap |
| `--allowedTools <tools>` | Restrict tools |
| `--resume <id>` | Continue previous session |
| `--fork-session` | Branch from resumed session |

## Available Agent Types (60+)

**Core**: `coder`, `reviewer`, `tester`, `planner`, `researcher`

**V3 Specialized**: `security-architect`, `security-auditor`, `memory-specialist`, `performance-engineer`

**Swarm Coordinators**: `hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `queen-coordinator`

**Consensus/Fault Tolerance**: `byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `quorum-manager`

**GitHub Automation**: `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

## Dual-Mode Collaboration (Claude + Codex)

```bash
# Feature development pipeline
npx claude-flow-codex dual run feature --task "Add user authentication with OAuth"

# Security audit workflow
npx claude-flow-codex dual run security --target "./src"

# Custom multi-platform swarm
npx claude-flow-codex dual run \
  --worker "claude:architect:Design the API structure" \
  --worker "codex:coder:Implement REST endpoints" \
  --worker "claude:tester:Write integration tests" \
  --namespace "api-feature"
```

## Memory Operations (Shared State)

```bash
# Store context for cross-agent sharing
npx claude-flow@v3alpha memory store --namespace collaboration --key "design" --value "..."

# Vector search
npx claude-flow@v3alpha memory search --namespace collaboration --query "authentication patterns"

# Retrieve
npx claude-flow@v3alpha memory retrieve --namespace collaboration --key "security-findings"
```

## MCP Server Integration

Add to `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "claude-flow": {
      "command": "npx",
      "args": ["claude-flow@alpha", "mcp", "start"],
      "description": "Core swarm coordination, agent management, task orchestration (40+ tools)"
    },
    "ruv-swarm": {
      "command": "npx",
      "args": ["ruv-swarm", "mcp", "start"],
      "description": "Enhanced swarm with WASM acceleration (2.8–4.4x speed)"
    }
  }
}
```

## Security Features

- CVE-hardened dependencies
- Zod-based input validation at all system boundaries
- Path traversal prevention
- Command injection blocking
- PII detection
- Report vulnerabilities: security@ruv.io

## Project Architecture

- Domain-Driven Design with bounded contexts
- Keep files under 500 lines
- Typed interfaces for all public APIs
- TDD London School (mock-first) for new code
- Event sourcing for state changes
- Input validation at system boundaries
