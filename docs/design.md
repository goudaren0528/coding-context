# ctx — Claude Code / OpenCode 跨项目开发记忆运行层

> **Version:** 0.3.0
> **Status:** Design Locked
> **Core:** Project Memory + Developer Memory
> **Target:** Claude Code / OpenCode
> **Default:** Local-first, no cloud required

---

## 1. 产品定位

`ctx` 是面向 Claude Code 和 OpenCode 的**跨项目开发记忆运行层**。

它让 AI 编程工具在不同项目、新旧仓库、不同 session 之间保持开发上下文连续性。

**一句话：**

> ctx 记住每个 repo 当前做到哪，也把你的开发偏好带到新旧项目里。

具体来说：

- **旧项目**：帮助 AI 恢复项目上下文。
- **新项目**：用你的个人开发偏好冷启动。
- **多项目**：从多个 repo 中抽取共通模式，形成跨项目记忆。
- **Claude Code / OpenCode**：启动时自动注入相关上下文，让 agent 一开始就知道项目状态和你的偏好。

ctx 不是 AI 聊天工具，不是 second brain，不是"AI 理解你的人生"。

ctx 是：**"AI 不再从零开始理解你的项目和你的开发方式。"**

---

## 2. 核心价值

| 没有 ctx | 有 ctx |
|----------|--------|
| 每次重新解释项目是什么 | AI 知道项目状态，立即进入工作 |
| 忘记上次卡在哪 | 持久化的 workspace state |
| 跨项目零知识复用 | 开发偏好自动带到新项目 |
| AI 不知道你的风格 | 注入编码偏好但不做人格判断 |
| 上下文恢复 ~5 min | 上下文恢复 <1 min |

**北极星指标：** 用户不再需要反复向 AI 解释项目上下文和个人开发习惯。

**代理指标：** 上下文恢复时间 5 分钟 → 1 分钟以内。

---

## 3. 核心设计原则

1. **Project memory is local to each repo** — 项目记忆存在 `<repo>/.ctx/db.sqlite`
2. **Developer memory is global to the user** — 跨项目偏好存在 `~/.ctx/db.sqlite`
3. **Cross-project memory stores patterns, not full histories** — 只保存抽象后的模式、偏好和实体
4. **Local-first by default** — 不依赖云服务、不需要账号
5. **Do not commit private memory** — `.ctx/db.sqlite` 默认不在 git 中
6. **Explicit overrides inferred** — 用户明确表达的偏好优先于系统推断
7. **Inferred requires repeated evidence** — 推断型偏好需要跨项目或多次 session 证据
8. **No personality profiling** — 只记录开发偏好，不做人格分析、能力判断

---

## 4. 记忆分层

```
Workspace State      "我现在在这个项目做到哪？"
Project Brain        "这个项目是什么？"
Developer Memory     "这个用户通常怎么开发？"
```

### 4.1 Workspace State

- repo-scope，每次 session 结束后更新
- 是 Claude Code / OpenCode 启动时最重要的上下文
- 单行覆盖：最新状态总是当前状态

内容：

- currentFocus — 当前工作焦点
- activeProblems — 未解决问题
- nextActions — 下一步行动
- recentDecisions — 最近技术决策
- importantFiles — 重要文件
- gitBranch / gitCommit — Git 状态

```ts
interface WorkspaceState {
  projectId: string;
  currentFocus: string;
  activeProblems: string[];
  nextActions: string[];
  recentDecisions: string[];
  importantFiles: string[];
  gitBranch: string | null;
  gitCommit: string | null;
  updatedAt: string;
}
```

### 4.2 Project Brain

- repo-scope，更新较慢
- 从多次 workspace state、repo scan、决策中压缩而来
- 描述项目长期知识

内容：

- architecture — 项目架构
- techStack — 技术栈
- keyPatterns — 关键模式
- knownConstraints — 已知约束
- openQuestions — 开放问题
- importantEntities — 重要实体和模块
- importantCommands — 常用命令

```ts
interface ProjectBrain {
  projectId: string;
  architecture: string[];
  techStack: string[];
  keyPatterns: string[];
  knownConstraints: string[];
  openQuestions: string[];
  importantEntities: string[];
  importantCommands: string[];
  updatedAt: string;
}
```

### 4.3 Developer Memory

- user-scope，存在 `~/.ctx/`
- 跨项目共享，新项目冷启动尤其重要
- **不记录人格**，只记录开发偏好

分类：

| Category | 示例 |
|----------|------|
| coding_style | "Prefer async/await over promise chains" |
| architecture_preference | "Prefer handler → service → repository layering" |
| library_preference | "Prefer zod for runtime validation in TypeScript projects" |
| testing_preference | "Prefer test-first approach" |
| workflow_preference | "Prefer small commits with descriptive messages" |
| agent_interaction_preference | "Prefer implementation-focused patches over broad explanations" |
| naming_preference | "Prefer kebab-case for files" |
| avoidance | "Avoid large rewrites unless explicitly requested" |

```ts
interface DeveloperPreference {
  id: string;
  category: 'coding_style' | 'architecture_preference' | 'library_preference'
    | 'testing_preference' | 'workflow_preference' | 'agent_interaction_preference'
    | 'naming_preference' | 'avoidance';
  preference: string;
  appliesTo: {
    languages?: string[];
    projectTypes?: string[];
    tools?: ('claude-code' | 'opencode')[];
  };
  source: 'explicit' | 'inferred';
  confidence: number;
  evidenceProjectIds: string[];
  status: 'active' | 'candidate' | 'archived';
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. 存储模型

默认不依赖 Git 提交，不依赖云服务。

```
~/.ctx/
  db.sqlite           ← 用户级记忆
  projects.json       ← 项目注册表

<repo>/.ctx/
  db.sqlite           ← 项目级记忆
  config.json         ← 项目配置
```

两层完全隔离：`~/.ctx/` 从不提交到任何仓库。

---

## 6. 项目级存储

### 项目 DB (`<repo>/.ctx/db.sqlite`)

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  tool TEXT NOT NULL CHECK(tool IN ('claude','opencode')),
  start_time TEXT NOT NULL,
  end_time TEXT,
  cwd TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed')),
  git_branch TEXT,
  git_commit TEXT
);

CREATE TABLE session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  timestamp TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('stdin','stdout')),
  content TEXT NOT NULL
);

CREATE TABLE workspace_state (
  project_id TEXT PRIMARY KEY,
  current_focus TEXT,
  active_problems TEXT NOT NULL DEFAULT '[]',
  next_actions TEXT NOT NULL DEFAULT '[]',
  recent_decisions TEXT NOT NULL DEFAULT '[]',
  important_files TEXT NOT NULL DEFAULT '[]',
  git_branch TEXT,
  git_commit TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE project_brain (
  project_id TEXT PRIMARY KEY,
  architecture TEXT NOT NULL DEFAULT '[]',
  tech_stack TEXT NOT NULL DEFAULT '[]',
  key_patterns TEXT NOT NULL DEFAULT '[]',
  known_constraints TEXT NOT NULL DEFAULT '[]',
  open_questions TEXT NOT NULL DEFAULT '[]',
  important_entities TEXT NOT NULL DEFAULT '[]',
  important_commands TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL
);

CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  decision TEXT NOT NULL,
  reason TEXT,
  confidence REAL NOT NULL DEFAULT 0.5,
  importance_score REAL NOT NULL DEFAULT 0.5,
  last_referenced_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE project_entities (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('file','api','library','concept','command','module')),
  name TEXT NOT NULL,
  global_entity_id TEXT,
  confidence REAL NOT NULL DEFAULT 0.5,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_project ON sessions(project_id, start_time DESC);
CREATE INDEX idx_events_session ON session_events(session_id, timestamp);
CREATE INDEX idx_decisions_project ON decisions(project_id);
```

### 项目配置 (`<repo>/.ctx/config.json`)

```json
{
  "projectId": "proj_8f3a91",
  "projectName": "payment-service",
  "gitRemote": "git@github.com:company/payment-service.git",
  "llm": {
    "enabled": true,
    "model": null,
    "baseUrl": null
  }
}
```

---

## 7. 用户级存储

### 用户 DB (`~/.ctx/db.sqlite`)

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  git_remote TEXT,
  primary_language TEXT,
  project_type TEXT,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE global_entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('library','concept','pattern','tool','framework','language')),
  name TEXT NOT NULL,
  description TEXT,
  usage_count INTEGER NOT NULL DEFAULT 1,
  linked_project_ids TEXT NOT NULL DEFAULT '[]',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE cross_project_patterns (
  id TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,
  description TEXT,
  project_ids TEXT NOT NULL DEFAULT '[]',
  confidence REAL NOT NULL DEFAULT 0.5,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE developer_preferences (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  preference TEXT NOT NULL,
  applies_to TEXT NOT NULL DEFAULT '{}',
  confidence REAL NOT NULL DEFAULT 0.5,
  source TEXT NOT NULL CHECK(source IN ('explicit','inferred')),
  evidence_project_ids TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','candidate','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_developer_preferences_status ON developer_preferences(status);
CREATE INDEX idx_developer_preferences_category ON developer_preferences(category);
CREATE INDEX idx_global_entities_name ON global_entities(name);
```

### 项目注册表 (`~/.ctx/projects.json`)

```json
[
  { "id": "proj_8f3a91", "path": "/home/user/code/payment-service", "name": "payment-service" },
  { "id": "proj_a1b2c3", "path": "/home/user/code/admin-dashboard", "name": "admin-dashboard" }
]
```

---

## 8. Project Identity

projectId 优先级：

1. `<repo>/.ctx/config.json` 中已有 projectId
2. `git remote URL + repo root path` hash
3. `repo root absolute path` hash

首次使用 ctx 在项目中时自动创建 `.ctx/config.json` 并生成 projectId。

---

## 9. 多项目记忆流转

```
repo A .ctx/db.sqlite → ~/.ctx/db.sqlite → repo B 启动时读取
```

完整流程：

```
当前项目 session
  → 写入项目 .ctx/db.sqlite
  → session 结束、ctx update
  → 抽取可复用 entity / pattern / preference
  → 写入 ~/.ctx/db.sqlite
  → 切换到另一个项目
  → 读取当前项目 .ctx/db.sqlite
  → 读取 ~/.ctx/db.sqlite
  → 筛选与当前项目相关的 developer memory
  → 注入 Claude Code / OpenCode
```

示例：

- payment-service 多次出现：zod, repository pattern, handler → service → repo
- admin-dashboard 多次出现：zod, React, TanStack Query
- ctx update 后 → ~/.ctx/ 记录 zod 在 2 个项目中都被使用
- 用户进入新项目 → AI 注入 "You often use zod in TypeScript projects"

---

## 10. 新旧项目处理

### 新项目（无 `.ctx/`）

`ctx claude` 首次在项目中运行时自动检测并初始化：

```
$ ctx claude
  ctx · new project detected: new-cli
       initialized project memory · loaded developer memory from ~/.ctx
```

注入：

```
[ctx project] New project. No workspace state yet.

[ctx developer memory]
Relevant preferences:
- You often use TypeScript strict mode.
- For Node CLI projects, you often use commander.
- You prefer small implementation patches over broad explanations.
```

### 旧项目（有 repo 但无 `.ctx/`）

`ctx claude` 检测到 git repo 但无 `.ctx/`，自动运行轻量 repo scan：

- 解析 package.json / pyproject.toml / go.mod / Cargo.toml
- 读取 directory structure
- 识别测试目录和入口文件
- 生成 Project Brain Seed（`project_brain` 初始记录）

注入：

```
[ctx project] Existing repo newly attached. No prior workspace state.

[ctx repo scan]
Node.js CLI project.
Entrypoint: src/index.ts.
Uses commander, better-sqlite3.
Tests under tests/.

[ctx developer memory]
Relevant preferences: ...
```

> 对第一次接管的旧项目，不伪造 currentFocus。没有 session 历史时 workspace_state 为 unknown。

### 已有 ctx 的旧项目

直接读取记忆：

```
$ ctx claude
  ctx · payment-service — Stripe webhook retry · 3h ago
```

---

## 11. Git 集成

Git 是判断项目真实进度的重要信号。

```ts
interface GitContext {
  branch: string;
  headCommit: string;
  previousCtxCommit: string | null;
  committedChangedFiles: string[];
  uncommittedFiles: string[];
  recentCommitMessages: string[];
}
```

每次 session start 记录：
- 当前 branch / HEAD
- working tree dirty files
- 最近 3 条 commit messages
- 与上次 ctx session commit 比较的 changed files

用途：帮助确定 importantFiles、生成 workspace_state、repo scan、旧项目 attach。

---

## 12. Session → State Compression（核心算法）

session 结束后同步运行（~2s），用户看到 `ctx: compressing session...`。

**这不是摘要。这是状态更新。**

### 输入

```ts
{
  previousWorkspaceState: WorkspaceState | null,
  sessionEvents: SessionEvent[],
  gitContext: GitContext,
  projectBrain?: ProjectBrain,
}
```

### 压缩规则

- 这不是摘要，是更新当前项目状态
- 移除已解决的 activeProblems
- 保留未解决的 activeProblems
- 不要把讨论变成 decisions，只有明确承诺的才记录
- 不确定的事项放入 openQuestions 或 memory_candidates
- Git changed files 应影响 importantFiles
- 保持简洁

### 输出

```ts
{
  updatedWorkspaceState: WorkspaceState,
  newDecisions: DecisionItem[],
  newProjectEntities: ProjectEntity[],
}
```

---

## 13. Prompt 注入策略（分层）

### L1 — Terminal Header（展示给用户，不进 prompt）

```
  ctx · payment-service — Stripe webhook retry · 3h ago
       open: timeout edge case · next: implement retry queue
```

### L2 — Project State Block（启动时默认注入）

```
[ctx project state]
Current focus: Stripe webhook retry architecture

Open issues:
- Timeout edge case unresolved

Next actions:
- Implement retry queue
- Verify idempotency key for concurrent requests

Recent decisions:
- Use exponential backoff to avoid retry storms
- Use idempotency key on Stripe mutations to prevent double charges

Important files:
- retry.ts
- webhook-handler.ts
- stripe-client.ts
```

### L3 — Project Brain Block（项目长期知识，有则注入）

```
[ctx project brain]
Architecture: handler → service → repository
Tech stack: Node.js, TypeScript, PostgreSQL, Prisma
Known constraints: Stripe mutations must be idempotent
Key patterns: event-driven webhook processing, repository pattern
```

### L4 — Developer Memory Block（来自 ~/.ctx/，按当前项目过滤）

```
[ctx developer memory]
Relevant preferences:
- Prefer TypeScript strict mode.
- Prefer zod for runtime validation in TypeScript projects.
- Prefer small implementation patches over broad explanations.
- Avoid large rewrites unless explicitly requested.
```

---

## 14. Runtime Pipeline

```
ctx claude / ctx opencode
  ↓
[1]  Detect project root
  ↓
[2]  Auto-init if no .ctx/: create config.json + db.sqlite + register project
  ↓
[3]  Auto-attach if git repo but no brain: run light repo scan → project_brain seed
  ↓
[4]  Capture Git context (branch, commit, changed files)
  ↓
[5]  Load workspace_state from project DB
  ↓
[6]  Load project_brain from project DB
  ↓
[7]  Load developer_preferences from user DB, filter by current project
  ↓
[8]  Build L1–L4 injection blocks
  ↓
[9]  Print L1 terminal header
  ↓
[10] Spawn Claude Code / OpenCode via PTY, inject L2–L4 into prompt
  ↓
[11] Capture stdin / stdout → session_events
  ↓
[12] On exit: mark session completed
  ↓
[13] LLM titler: generate session title (synchronous, ~1s)
  ↓
[14] LLM compressor: update workspace_state (synchronous, ~2s)
  ↓
[15] Update project DB: workspace_state, decisions, project_entities
  ↓
[16] L1 cross-project: auto-link entities to global_entities (string match, no LLM)
  ↓
[17] Print "ctx update" hint if L2 threshold crossed
  ↓
[18] Event cleanup: purge session_events > CTX_EVENT_TTL_DAYS (14 default)
```

---

## 15. 命令设计

### 核心命令（Phase 1）

```
ctx claude       启动 Claude Code，注入项目+开发记忆
ctx opencode     启动 OpenCode，注入项目+开发记忆
ctx resume       查看当前项目工作状态
ctx memory       查看和管理个人开发偏好
ctx update       手动触发跨项目记忆更新
```

### ctx resume

```
$ ctx resume
payment-service
  focus   Stripe webhook retry architecture · 3h ago
  open    timeout edge case unresolved
  next    implement retry queue · verify idempotency key
  files   retry.ts, webhook-handler.ts, stripe-client.ts
  branch  feature/stripe-retry
```

### ctx memory

```
$ ctx memory

Developer Preferences (4)

  library_preference:
    Prefer zod for runtime validation in TypeScript projects. [explicit]

  architecture_preference:
    Prefer handler → service → repository layering for backend services. [inferred]

  agent_interaction_preference:
    Prefer implementation-focused patches over broad explanations. [explicit]

  avoidance:
    Avoid large rewrites unless explicitly requested. [inferred]
```

```
$ ctx memory add "Prefer better-sqlite3 for local CLI storage"
  ✓ Added: library_preference
```

### ctx update

```
$ ctx update
  Scanning 3 projects...
  ✓ 5 global entities updated
  ✓ 1 new cross-project pattern detected
  ✓ 2 new developer preference candidates
  Run `ctx memory` to review.
```

---

## 16. 文件结构

```
src/
├── index.ts                     # CLI entry, command dispatch
├── commands/
│   ├── claude.ts                # ctx claude
│   ├── opencode.ts              # ctx opencode
│   ├── resume.ts                # ctx resume
│   ├── memory.ts                # ctx memory
│   └── update.ts                # ctx update
├── project/
│   ├── detect.ts                # Project root detection
│   ├── init.ts                  # .ctx/ initialization
│   ├── attach.ts                # Repo scan → project brain seed
│   └── registry.ts              # ~/.ctx/projects.json management
├── git/
│   └── context.ts               # Git branch/commit/diff capture
├── storage/
│   ├── connection.ts            # better-sqlite3 singleton + WAL mode
│   ├── migrate-project.ts       # Project DB schema + migrations
│   ├── migrate-user.ts          # User DB schema + migrations
│   ├── session-store.ts         # Session + events CRUD
│   ├── state-store.ts           # Workspace state CRUD
│   ├── brain-store.ts           # Project brain CRUD
│   ├── entity-store.ts          # Project entities + global entities CRUD
│   └── memory-store.ts          # Developer preferences + patterns CRUD
├── runtime/
│   ├── session.ts               # Session lifecycle orchestration
│   └── pty.ts                   # node-pty spawn + stdio passthrough
├── memory/
│   ├── injector.ts              # L1–L4 prompt injection builder
│   ├── filter.ts                # Filter preferences by project context
│   └── compressor.ts            # Session → workspace state compression
├── llm/
│   ├── client.ts                # OpenAI-compatible client wrapper
│   ├── prompts.ts               # Compressor/titler prompt templates
│   ├── titler.ts                # Session title generation
│   ├── compress.ts              # LLM compressor call
│   └── scan.ts                  # LLM repo scan (attach)
├── config.ts                    # Config: env vars + .ctx/config
├── paths.ts                     # Path resolution: project root, ~/.ctx/
└── types.ts                     # Shared TypeScript types
```

---

## 17. 技术栈

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript | PTY ecosystem, CLI ecosystem, type safety |
| Runtime | Node.js 22+ | node-pty support |
| PTY | [node-pty](https://github.com/microsoft/node-pty) | Cross-platform pseudo-terminal |
| Database | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | Synchronous, zero config, WAL mode |
| CLI | [commander](https://github.com/tj/commander.js) | Lightweight, mature |
| LLM | OpenAI-compatible HTTP API | Supports self-hosted or third-party endpoints via base URL |
| ID | [nanoid](https://github.com/ai/nanoid) | URL-safe IDs |
| Config | [dotenv](https://github.com/motdotla/dotenv) | API key management |

MVP 不依赖 ink、chokidar 等——优先保持依赖最小化。

---

## 18. 配置

### 环境变量

```bash
CTX_API_KEY=...                       # Required for LLM-backed features
CTX_BASE_URL=https://endpoint/v1      # Required OpenAI-compatible base URL
CTX_MODEL=gpt-4.1-mini                # Required model name
CTX_EVENT_TTL_DAYS=14                 # Raw events retention
CTX_L2_SESSION_THRESHOLD=10           # Sessions before ctx update hint
CTX_L2_DAY_THRESHOLD=7                # Days before ctx update hint
```

### 项目配置 (`<project>/.ctx/config.json`)

```json
{
  "projectId": "proj_8f3a91",
  "projectName": "payment-service",
  "gitRemote": "git@github.com:company/payment-service.git",
  "llm": {
    "enabled": true,
    "model": null,
    "baseUrl": null
  }
}
```

---

## 19. MVP 范围

### 必须包含（Phase 1）

- `ctx claude` / `ctx opencode`（自动 init + 自动 attach）
- `ctx resume`
- `ctx memory`（展示 + `ctx memory add`，不做审批流）
- `ctx update`（跨项目实体同步）
- 项目 DB：sessions, session_events, workspace_state, project_brain, project_entities, decisions
- 用户 DB：projects, global_entities, developer_preferences
- Session capture（stdin/stdout → session_events）
- Session → state compression（LLM compressor，session 结束时同步运行）
- L1–L4 分层 prompt 注入
- Git context 捕获
- 新项目自动 init
- 旧项目轻量 repo scan（package.json + directory structure）

### MVP 暂缓

- memory_candidates 表 + approve/reject/forget 流程
- workspace_state_versions + 状态回滚
- ctx doctor / ctx restore / ctx redact
- AgentAdapter 抽象接口
- 重量 repo scan（README、全目录树、commit 历史分析）
- 记忆衰减模型
- 云同步 / ctx export / ctx import
- 跨设备同步
- Vector DB / 语义搜索

---

## 20. Phase Plan

### Phase 1（2–3 周）：Project + Developer Memory MVP

**Goal:** Claude Code / OpenCode 能在单机多项目之间共享项目状态和个人开发偏好。

| # | Deliverable |
|---|-------------|
| 1.1 | 项目脚手架：package.json, tsconfig, 依赖安装 |
| 1.2 | SQLite 连接层 + 项目 DB schema 迁移 |
| 1.3 | SQLite 用户 DB schema 迁移 + 项目注册表 |
| 1.4 | 项目检测 + 自动 init（`.ctx/config.json` + `.ctx/db.sqlite` 创建） |
| 1.5 | 项目注册：写入 `~/.ctx/projects.json` 和 `projects` 表 |
| 1.6 | Git context 捕获（branch, commit, files, messages） |
| 1.7 | PTY runtime：spawn Claude/OpenCode，透明 stdio 透传 |
| 1.8 | Session 生命周期：start → events capture → complete on exit |
| 1.9 | Session store：session + events CRUD |
| 1.10 | LLM client：OpenAI-compatible HTTP client 封装 |
| 1.11 | LLM titler：session 结束时生成标题 |
| 1.12 | LLM compressor：session → workspace_state 压缩更新 |
| 1.13 | State store：workspace_state 读写 |
| 1.14 | 轻量 repo scan（`ctx attach` 逻辑）：package.json + 目录结构 → project_brain seed |
| 1.15 | Brain store：project_brain 读写 |
| 1.16 | L2/L3 prompt 注入：workspace_state + project_brain → injection block |
| 1.17 | L4 developer memory 注入：从 ~/.ctx/ 筛选偏好 → injection block |
| 1.18 | L1 terminal header 输出 |
| 1.19 | `ctx claude` / `ctx opencode` 命令 |
| 1.20 | `ctx resume` 命令 |
| 1.21 | `ctx memory` 命令（展示 + `add` 子命令） |
| 1.22 | `ctx update` 命令：L1 跨项目实体同步 |
| 1.23 | session_events TTL 清理 |

**Acceptance:**
- 新项目能从 developer memory 冷启动
- 旧项目能通过 auto-attach 生成 project brain seed
- 已有 ctx 项目能恢复 workspace state
- Claude Code / OpenCode 启动时获得 4 层上下文
- workspace_state 在连续 session 中正确演化（不是独立记录）

### Phase 2（2–3 周）：Memory Candidates + Cross-Project Patterns

**Goal:** 多项目之间形成稳定的跨项目模式和可管理的偏好系统。

| # | Deliverable |
|---|-------------|
| 2.1 | memory_candidates 表 + 生成逻辑（阈值触发） |
| 2.2 | `ctx memory approve/reject/forget` 子命令 |
| 2.3 | 跨项目 pattern 检测（`ctx update` 增强） |
| 2.4 | cross_project_patterns 表读写 |
| 2.5 | 偏好筛选增强：按 language / projectType / tool 过滤 |
| 2.6 | 记忆衰减：importance_score + last_referenced_at |
| 2.7 | workspace_state_versions + 状态回滚 |

**Acceptance:**
- 多项目重复模式能生成 candidate
- 用户可以批准或拒绝推断型记忆
- 新项目只注入相关偏好

### Phase 3：Privacy + Reliability

| # | Deliverable |
|---|-------------|
| 3.1 | Secret redaction |
| 3.2 | `ctx doctor privacy` |
| 3.3 | `ctx state edit` |
| 3.4 | 排除模式：`.env`, `*.pem`, `node_modules/**` |

### Phase 4：Sync + Cross-Device

| # | Deliverable |
|---|-------------|
| 4.1 | `ctx export` / `ctx import` |
| 4.2 | 可选的云同步 |
| 4.3 | `ctx restore`：checkout branch + 列出关键文件 |

---

## 21. 非目标

所有阶段：

- GUI / web dashboard
- Multi-user / team support
- OS-level hooks / input method integration
- 多模态上下文（截图、图表）
- 泛化 AI 工具平台（仅聚焦 Claude Code / OpenCode）

MVP 特定：

- 云同步 / 账号系统
- Vector DB / 语义搜索
- 人格分析 / 强弱项判断
- `ctx ask` 自然语言检索
- 实时本地模型（Qwen）— 使用 Claude API

---

## 22. 变更记录

| 版本 | 核心变更 |
|------|---------|
| 0.1 → 0.2 | Session-centric → State-centric。新增 workspace_state、project_brain、Git 集成、分层注入、记忆衰减 |
| 0.2 → 0.3 | 聚焦 Claude Code / OpenCode。新增 Developer Memory（显式+推断）、新旧项目处理、auto-init/attach、local-first 隐私模型、MVP 范围大幅收窄 |
