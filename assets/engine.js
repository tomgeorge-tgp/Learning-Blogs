/**
 * engine.js — Learning Engine for Tom George's learning system
 *
 * Pure client-side state engine. All state persists in localStorage under "lg_state".
 * Exposes window.LearningEngine.
 *
 * Responsibilities:
 *   - XP, levels, streaks
 *   - Lesson read tracking
 *   - Quiz results + SM-2 spaced repetition scheduling
 *   - Achievements
 *   - Today's mission / review queue
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'lg_state';
  var STATE_VERSION = 1;

  var LESSON_IDS = ['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009', '0010', '0011', '0012', '0013', '0014', '0015', '0016', '0017', '0018', '0019', '0020'];

  // Original 10-lesson Data & Storage Systems set — kept separate so achievements/copy
  // scoped to "the database curriculum" don't silently reinterpret as "everything."
  var DATABASE_LESSON_IDS = ['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009', '0010'];

  var LESSON_META = {
    '0001': { title: 'CAP Theorem & Consistency Models', file: 'lessons/0001-cap-theorem.html', subtitle: 'The trade-off that governs every database in your stack.' },
    '0002': { title: 'Database Indexing & Internals', file: 'lessons/0002-database-indexing.html', subtitle: 'Why queries are slow, how indexes fix it — B-trees, composite indexes, partial indexes.' },
    '0003': { title: 'Database Scaling', file: 'lessons/0003-database-scaling.html', subtitle: 'Replicas, caching, sharding, consensus — how Instagram, Discord and Google broke every ceiling.' },
    '0004': { title: 'SQL Fundamentals & Query Anatomy', file: 'lessons/0004-sql-fundamentals.html', subtitle: 'Execution order, JOINs, window functions, CTEs — the shape of every SQL query.' },
    '0005': { title: 'Query Execution & the Query Planner', file: 'lessons/0005-query-execution.html', subtitle: 'What happens between typing a query and getting a result — scan strategies, join strategies, EXPLAIN ANALYZE.' },
    '0006': { title: 'Query Optimization', file: 'lessons/0006-query-optimization.html', subtitle: 'N+1, bad pagination, function-on-column, covering indexes — the patterns that kill performance and the rewrites that fix them.' },
    '0007': { title: 'Database Normalization', file: 'lessons/0007-normalization.html', subtitle: 'Why bad table design causes data corruption by design — 1NF through BCNF, the three anomalies.' },
    '0008': { title: 'Database Internals', file: 'lessons/0008-database-internals.html', subtitle: 'MVCC, WAL, VACUUM, isolation levels — how PostgreSQL actually guarantees ACID.' },
    '0009': { title: 'NoSQL Databases', file: 'lessons/0009-nosql.html', subtitle: 'MongoDB, Redis, Cassandra — what each is for, how data is modeled, when to reach for each.' },
    '0010': { title: 'Vector Databases', file: 'lessons/0010-vector-databases.html', subtitle: 'Embeddings, ANN search, HNSW, IVF, pgvector vs Pinecone — the infrastructure behind every RAG pipeline.' },
    '0011': { title: 'Big-O & Algorithmic Complexity Analysis', file: 'lessons/0011-algorithmic-complexity.html', subtitle: 'The vocabulary for talking about performance — time/space complexity, amortized analysis, and "can you do better?"' },
    '0012': { title: 'Two Pointers', file: 'lessons/0012-two-pointers.html', subtitle: 'Two indices moving toward or away from each other — collapsing O(n²) pair-search into O(n).' },
    '0013': { title: 'Sliding Window', file: 'lessons/0013-sliding-window.html', subtitle: 'A window that grows and shrinks over a sequence — the pattern behind every "longest/shortest subarray satisfying X" question.' },
    '0014': { title: 'Binary Search Patterns', file: 'lessons/0014-binary-search-patterns.html', subtitle: 'Beyond sorted arrays — binary search on the answer, rotated arrays, and search spaces that aren\'t obviously sorted.' },
    '0015': { title: 'Backtracking & Combinatorial Search', file: 'lessons/0015-backtracking.html', subtitle: 'Exploring decision trees with pruning — permutations, subsets, constraint satisfaction.' },
    '0016': { title: 'Dynamic Programming Patterns', file: 'lessons/0016-dynamic-programming.html', subtitle: 'Turning exponential recursion into polynomial time by remembering what you\'ve already computed.' },
    '0017': { title: 'Python Execution Model: Bytecode & the CPython VM', file: 'lessons/0017-python-execution-model.html', subtitle: 'Tokenizer, AST, compiler, bytecode, frames, and the refcounted object model underneath every line you write.' },
    '0018': { title: 'Concurrency Models: Threads, Processes, the GIL & AsyncIO', file: 'lessons/0018-concurrency-models.html', subtitle: 'Why "just use threads" is wrong more often than not — matching the model to CPU-bound vs I/O-bound work.' },
    '0019': { title: 'Networking Fundamentals: Sockets, TCP/IP, DNS & HTTP', file: 'lessons/0019-networking-fundamentals.html', subtitle: 'Everything that happens between a browser and your FastAPI app before your route handler runs.' },
    '0020': { title: 'FastAPI Request Lifecycle: ASGI, Async Drivers & Connection Pooling', file: 'lessons/0020-fastapi-request-lifecycle.html', subtitle: 'From accepted socket to committed response — and the pool-sizing/worker-count questions that follow from it.' }
  };

  // Category → subcategory → lesson taxonomy. Lesson titles/files stay in LESSON_META;
  // this just groups lesson IDs into the curriculum tree the dashboard navigates.
  var CATEGORIES = [
    {
      id: 'data-storage',
      label: 'Data & Storage Systems',
      icon: '🗄️',
      description: 'Consistency, storage engines, query processing, and scale — the systems every backend stands on.',
      comingSoon: false,
      subcategories: [
        { id: 'distributed-foundations', label: 'Distributed Systems Foundations', description: 'The trade-offs that govern every distributed data store.', lessons: ['0001'] },
        { id: 'query-layer', label: 'Query Layer (SQL)', description: 'How a query is written, planned, and executed.', lessons: ['0004', '0005', '0006'] },
        { id: 'storage-engine', label: 'Storage Engine Internals', description: 'What happens on disk and in memory beneath every query.', lessons: ['0002', '0008'] },
        { id: 'scaling-architecture', label: 'Scaling & Architecture', description: 'Replicas, sharding, and the paths systems take under load.', lessons: ['0003'] },
        { id: 'schema-design', label: 'Schema Design', description: 'Table design and the anomalies bad design causes.', lessons: ['0007'] },
        { id: 'beyond-relational', label: 'Beyond Relational', description: 'NoSQL and vector stores — when and why to reach for each.', lessons: ['0009', '0010'] }
      ]
    },
    {
      id: 'dsa-algorithms',
      label: 'Data Structures & Algorithms',
      icon: '🧮',
      description: 'Complexity analysis and the canonical interview patterns — the prerequisite reasoning toolkit for system design and coding interviews.',
      comingSoon: false,
      subcategories: [
        { id: 'foundations', label: 'Algorithmic Complexity', description: 'The vocabulary for reasoning about performance before writing a line of code.', lessons: ['0011'] },
        { id: 'array-string-patterns', label: 'Array & String Patterns', description: 'The patterns that turn brute-force scans into linear or logarithmic passes.', lessons: ['0012', '0013', '0014'], comingSoonLessons: ['Prefix Sum', 'Merge Interval', 'Sorting-Based Pattern'] },
        { id: 'pointer-linked-list-patterns', label: 'Pointers & Linked Lists', description: 'Structural traversal without extra memory.', comingSoonLessons: ['Fast and Slow Pointer', 'Linked List', 'Stacks & Queues', 'Monotonic Stack and Queue'] },
        { id: 'recursive-search-patterns', label: 'Recursive & Search Patterns', description: 'Exploring and pruning decision spaces, and remembering what you\'ve already computed.', lessons: ['0015', '0016'], comingSoonLessons: ['Divide and Conquer', 'Greedy / Interval Partitioning'] },
        { id: 'string-parsing-patterns', label: 'String & Parsing Patterns', description: 'Tokenizing, counting, and evaluating structured text.', comingSoonLessons: ['Expression Evaluation', 'String Manipulation', 'Hashmaps / Frequency Counter'] },
        { id: 'trees-graphs-heaps', label: 'Trees, Graphs & Heaps', description: 'Non-linear structures — hierarchies, networks, and priority order.', comingSoonLessons: ['Binary Trees', 'Path Sum (Root to Leaf)', 'K Largest / Smallest (Heap)', 'Top-K Frequent', 'Merge K Sorted Lists', 'Graph Traversal (DFS/BFS)', 'Graph Algorithms (MST / Shortest Path)'] },
        { id: 'ds-design-problems', label: 'Data Structure Design Problems', description: 'Building a data structure to spec under constraints (e.g. LRU Cache, Trie, Min Stack) — distinct from System Design\'s high-level design problems.', comingSoonLessons: ['Design Problems'] }
      ]
    },
    {
      id: 'python-backend-systems',
      label: 'Python & Backend Systems',
      icon: '🐍',
      description: 'CPython internals, concurrency models, networking, and the ASGI stack — what actually happens underneath every FastAPI request.',
      comingSoon: false,
      subcategories: [
        { id: 'python-runtime', label: 'Python Runtime Internals', description: 'Tokenizer through bytecode to the object model — what "running Python" actually means.', lessons: ['0017'], comingSoonLessons: ['Memory Management Deep Dive (obmalloc, generational GC)', 'Decorators, Generators & Context Managers Internals', 'Import System & Packaging (pip, uv, virtual environments)'] },
        { id: 'concurrency-models', label: 'Concurrency Models', description: 'Threads, processes, the GIL, and asyncio — matching the model to the workload.', lessons: ['0018'], comingSoonLessons: ['Inter-Process Communication (pipes, queues, shared memory)', 'The AsyncIO Event Loop Internals & uvloop', 'Race Conditions, Deadlocks & Synchronization Primitives'] },
        { id: 'web-frameworks-asgi', label: 'Web Frameworks & ASGI', description: 'FastAPI/Starlette/Uvicorn end to end, and the production questions that follow.', lessons: ['0020'], comingSoonLessons: ['Middleware & Dependency Injection Deep Dive', 'WebSockets & Server-Sent Events', 'Background Tasks, Celery & Job Queues'] }
      ]
    },
    {
      id: 'system-design',
      label: 'System Design',
      icon: '🧩',
      description: 'Core distributed-systems patterns and end-to-end design problems.',
      comingSoon: true,
      subcategories: [
        { id: 'core-patterns', label: 'Core Patterns', description: '', comingSoonLessons: ['Rate Limiting, Load Balancing & API Gateway Patterns', 'Message Queues, Event Streaming & Kafka', 'Caching Strategies — CDN, Reverse Proxy, Application Cache', 'Consistent Hashing', 'CDN & Edge Architecture', 'Leader Election & Consensus'] },
        { id: 'api-design', label: 'API Design', description: '', comingSoonLessons: ['REST API Design & Resource Modeling', 'GraphQL vs gRPC vs REST', 'Pagination, Idempotency & Versioning'] },
        { id: 'design-problems', label: 'Design Problems', description: '', comingSoonLessons: ['Design a URL Shortener', 'Design a Notification System', 'Design a Feed / Timeline System'] }
      ]
    },
    {
      id: 'engineering-execution',
      label: 'Engineering Execution',
      icon: '⚙️',
      description: 'Running and operating systems in production — infra, reliability, networking, and the cloud.',
      comingSoon: false,
      subcategories: [
        { id: 'infra-reliability', label: 'Infrastructure & Reliability', description: '', comingSoonLessons: ['Docker, Kubernetes & Container Orchestration', 'Observability — Metrics, Logging, Tracing', 'CI/CD Pipelines'] },
        { id: 'networking-cloud', label: 'Networking & Cloud', description: 'Sockets, TCP/IP, DNS, and HTTP — the layers underneath every request.', lessons: ['0019'], comingSoonLessons: ['DNS & Service Discovery', 'AWS/GCP Core Services', 'Infrastructure as Code with Terraform'] }
      ]
    },
    {
      id: 'ai-llm-engineering',
      label: 'AI & LLM Engineering',
      icon: '🤖',
      description: 'RAG pipelines, agent architectures, and running LLMs in production — Tom\'s specialty, roadmapped next.',
      comingSoon: true,
      subcategories: [
        { id: 'rag-pipelines', label: 'RAG Pipelines', description: '', comingSoonLessons: ['Chunking, Embedding & Retrieval Strategy', 'Reranking & Hybrid Search'] },
        { id: 'agent-architectures', label: 'Agent Architectures', description: '', comingSoonLessons: ['LangGraph State Machines & Tool Use', 'Multi-Agent Orchestration & MCP'] },
        { id: 'llm-ops', label: 'LLM Ops', description: '', comingSoonLessons: ['Prompt Versioning & Evals', 'Cost, Latency & Caching for LLM APIs'] }
      ]
    },
    {
      id: 'frontend-react',
      label: 'Frontend Engineering & React',
      icon: '🎨',
      description: 'JavaScript internals through React\'s rendering model — taught as content; this site itself stays framework-free.',
      comingSoon: true,
      subcategories: [
        { id: 'js-deep-dive', label: 'JavaScript Deep Dive', description: '', comingSoonLessons: ['The Event Loop, Microtasks & Macrotasks', 'Closures & Scope', 'Prototypes & this', 'Promises & Async/Await Internals'] },
        { id: 'react-fundamentals', label: 'React Fundamentals', description: '', comingSoonLessons: ['Components, Props & Composition', 'Hooks — useState, useEffect, useRef', 'The Rendering Model & Virtual DOM'] },
        { id: 'react-advanced', label: 'React Advanced', description: '', comingSoonLessons: ['Reconciliation Internals & Fiber', 'State Management Patterns (Context, Redux, Zustand)', 'Performance — memoization, code-splitting, profiling'] },
        { id: 'frontend-architecture', label: 'Frontend Architecture', description: '', comingSoonLessons: ['Bundlers & Build Tooling (Webpack, Vite, esbuild)', 'Accessibility Fundamentals', 'Core Web Vitals & Performance Budgets'] }
      ]
    },
    {
      id: 'security-engineering',
      label: 'Security Engineering',
      icon: '🔐',
      description: 'Application security, identity, and applied cryptography at a practitioner level.',
      comingSoon: true,
      subcategories: [
        { id: 'appsec-fundamentals', label: 'AppSec Fundamentals', description: '', comingSoonLessons: ['The OWASP Top 10', 'Input Validation & Injection Attacks', 'CSRF, XSS & Content Security Policy'] },
        { id: 'authn-authz', label: 'AuthN & AuthZ', description: '', comingSoonLessons: ['Sessions vs. JWTs', 'OAuth2 & OIDC', 'Role-Based & Attribute-Based Access Control'] },
        { id: 'applied-crypto', label: 'Applied Cryptography', description: '', comingSoonLessons: ['Hashing vs. Encryption vs. Encoding', 'TLS — How HTTPS Actually Works', 'Signing & Verifying (JWT signatures, webhook verification)'] }
      ]
    }
  ];

  // XP thresholds: index = level - 1. Level 1 starts at 0 XP.
  var XP_THRESHOLDS = [0, 200, 500, 1000, 2000, 4000, 7000, 11000, 16000, 22000, 30000];

  var XP_PER_LESSON_READ = 50;
  var XP_PER_CORRECT_ANSWER = 10;

  var ACHIEVEMENTS = [
    {
      id: 'first_lesson',
      label: 'First Step',
      description: 'Completed your first lesson',
      icon: '🌱',
      condition: function (s) { return lessonsRead(s) >= 1; }
    },
    {
      id: 'quiz_perfect',
      label: 'Perfect Score',
      description: 'Got 100% on a quiz',
      icon: '🎯',
      condition: function (s) {
        return LESSON_IDS.some(function (id) {
          var l = s.lessons[id];
          return l && l.quizBest !== null && l.quizTotal && l.quizBest === l.quizTotal;
        });
      }
    },
    {
      id: 'three_day_streak',
      label: 'On a Roll',
      description: '3 day streak',
      icon: '🔥',
      condition: function (s) { return s.streak.count >= 3; }
    },
    {
      id: 'seven_day_streak',
      label: 'Committed',
      description: '7 day streak',
      icon: '🏅',
      condition: function (s) { return s.streak.count >= 7; }
    },
    {
      id: 'five_lessons',
      label: 'Momentum',
      description: '5 lessons completed',
      icon: '🚀',
      condition: function (s) { return lessonsRead(s) >= 5; }
    },
    {
      id: 'all_database',
      label: 'Database Master',
      description: 'Completed all Database lessons',
      icon: '🏆',
      condition: function (s) {
        return DATABASE_LESSON_IDS.every(function (id) { return s.lessons[id] && s.lessons[id].read; });
      }
    },
    {
      id: 'first_review',
      label: 'Spaced Out',
      description: 'Completed first spaced repetition review',
      icon: '🔁',
      condition: function (s) {
        return LESSON_IDS.some(function (id) {
          var l = s.lessons[id];
          return l && l.quizAttempts >= 2;
        });
      }
    }
  ];

  /* ---------- date helpers ---------- */

  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  function yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  function addDaysStr(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  /* ---------- state ---------- */

  function defaultLessonState() {
    return {
      read: false,
      readAt: null,
      quizBest: null,
      quizTotal: null,
      quizAttempts: 0,
      srNextReview: null,
      srInterval: 1,
      srEaseFactor: 2.5
    };
  }

  function defaultState() {
    var lessons = {};
    LESSON_IDS.forEach(function (id) { lessons[id] = defaultLessonState(); });
    return {
      version: STATE_VERSION,
      xp: 0,
      level: 1,
      streak: { count: 0, lastDate: null },
      lessons: lessons,
      achievements: [],
      totalTimeMinutes: 0
    };
  }

  function loadState() {
    var raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) { /* localStorage unavailable (file:// privacy modes) */ }

    if (!raw) return defaultState();

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return defaultState();
    }

    // Merge with defaults so new lessons / new fields are always present.
    var base = defaultState();
    var s = Object.assign(base, parsed);
    s.version = STATE_VERSION;
    s.streak = Object.assign({ count: 0, lastDate: null }, parsed.streak || {});
    s.lessons = s.lessons || {};
    LESSON_IDS.forEach(function (id) {
      s.lessons[id] = Object.assign(defaultLessonState(), (parsed.lessons || {})[id] || {});
    });
    s.achievements = Array.isArray(parsed.achievements) ? parsed.achievements : [];
    return s;
  }

  var state = loadState();

  function save() {
    state.level = computeLevel(state.xp);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* ignore quota / privacy errors */ }
  }

  /* ---------- core computations ---------- */

  function lessonsRead(s) {
    return LESSON_IDS.filter(function (id) { return s.lessons[id] && s.lessons[id].read; }).length;
  }

  function computeLevel(xp) {
    var level = 1;
    for (var i = 0; i < XP_THRESHOLDS.length; i++) {
      if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    }
    return level;
  }

  function touchStreak() {
    var today = todayStr();
    var last = state.streak.lastDate;
    if (last === today) return;              // already counted today
    if (last === yesterdayStr()) {
      state.streak.count += 1;
    } else {
      state.streak.count = 1;
    }
    state.streak.lastDate = today;
  }

  function unlockNewAchievements() {
    var newly = [];
    ACHIEVEMENTS.forEach(function (a) {
      if (state.achievements.indexOf(a.id) === -1 && a.condition(state)) {
        state.achievements.push(a.id);
        newly.push({ id: a.id, label: a.label, description: a.description, icon: a.icon });
      }
    });
    return newly;
  }

  /* ---------- public API ---------- */

  function getState() {
    return state;
  }

  function markLessonRead(lessonId) {
    var lesson = state.lessons[lessonId];
    if (!lesson) return { xpGained: 0, newAchievements: [] };

    if (lesson.read) {
      // Already read — no double XP, but still counts as showing up today.
      touchStreak();
      save();
      return { xpGained: 0, newAchievements: [] };
    }

    lesson.read = true;
    lesson.readAt = new Date().toISOString();
    state.xp += XP_PER_LESSON_READ;
    touchStreak();
    var newAchievements = unlockNewAchievements();
    save();

    return { xpGained: XP_PER_LESSON_READ, newAchievements: newAchievements };
  }

  /**
   * Record a quiz result and schedule the next spaced-repetition review (SM-2).
   * score: number correct. total: number of questions.
   */
  function recordQuizResult(lessonId, score, total) {
    var lesson = state.lessons[lessonId];
    if (!lesson || !total) return { xpGained: 0, nextReviewDays: 1, newAchievements: [] };

    lesson.quizAttempts += 1;
    if (lesson.quizBest === null || score > lesson.quizBest || lesson.quizTotal !== total) {
      if (lesson.quizBest === null || score > lesson.quizBest) lesson.quizBest = score;
      lesson.quizTotal = total;
    }

    // --- SM-2 ---
    var pct = (score / total) * 100;
    var q = pct >= 90 ? 5 : pct >= 75 ? 4 : pct >= 60 ? 3 : pct >= 40 ? 2 : 1;

    var interval;
    if (q < 3) {
      interval = 1; // failed recall — reset, ease unchanged
    } else {
      var newEase = Math.max(1.3, lesson.srEaseFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
      lesson.srEaseFactor = newEase;
      interval = Math.max(1, Math.round(lesson.srInterval * newEase));
    }
    lesson.srInterval = interval;
    lesson.srNextReview = addDaysStr(interval);

    var xpGained = score * XP_PER_CORRECT_ANSWER;
    state.xp += xpGained;
    touchStreak();
    var newAchievements = unlockNewAchievements();
    save();

    return { xpGained: xpGained, nextReviewDays: interval, newAchievements: newAchievements };
  }

  function getStreak() {
    return { count: state.streak.count, lastDate: state.streak.lastDate };
  }

  function getLevelInfo() {
    var xp = state.xp;
    var level = computeLevel(xp);
    var currentThreshold = XP_THRESHOLDS[level - 1];
    var atCap = level >= XP_THRESHOLDS.length;
    var nextThreshold = atCap ? XP_THRESHOLDS[XP_THRESHOLDS.length - 1] : XP_THRESHOLDS[level];
    var progress = atCap ? 1 : (xp - currentThreshold) / (nextThreshold - currentThreshold);
    return {
      level: level,
      xp: xp,
      xpForNext: nextThreshold,
      xpProgress: Math.min(1, Math.max(0, progress))
    };
  }

  function getDueForReview() {
    var today = todayStr();
    return LESSON_IDS.filter(function (id) {
      var l = state.lessons[id];
      return l && l.srNextReview !== null && l.srNextReview <= today;
    });
  }

  function checkAndUnlockAchievements() {
    var newly = unlockNewAchievements();
    save();
    return newly.map(function (a) { return a.id; });
  }

  function getAchievementDefs() {
    return ACHIEVEMENTS.map(function (a) {
      return {
        id: a.id,
        label: a.label,
        description: a.description,
        icon: a.icon,
        earned: state.achievements.indexOf(a.id) !== -1
      };
    });
  }

  function getTodaysMission() {
    var due = getDueForReview();
    if (due.length > 0) {
      var id = due[0];
      return {
        type: 'review',
        lessonId: id,
        title: 'Review: ' + LESSON_META[id].title,
        description: 'This lesson is due for spaced repetition. Retake the quiz from memory to lock it in.',
        xpReward: 50
      };
    }
    var unread = null;
    for (var i = 0; i < LESSON_IDS.length; i++) {
      if (!state.lessons[LESSON_IDS[i]].read) { unread = LESSON_IDS[i]; break; }
    }
    if (unread) {
      return {
        type: 'lesson',
        lessonId: unread,
        title: 'Read: ' + LESSON_META[unread].title,
        description: 'Next lesson in your curriculum. Read it, then take the quiz.',
        xpReward: XP_PER_LESSON_READ + 50
      };
    }
    return {
      type: 'done',
      lessonId: null,
      title: 'All caught up',
      description: 'No reviews due and every lesson is read. Come back tomorrow — reviews will be waiting.',
      xpReward: 0
    };
  }

  function getLessonMeta(lessonId) {
    return LESSON_META[lessonId] || null;
  }

  /**
   * Returns the category → subcategory → lesson tree, with each active lesson
   * resolved to its full meta (title/file) and read/review state joined in.
   */
  function getCurriculum() {
    var today = todayStr();
    return CATEGORIES.map(function (cat) {
      return {
        id: cat.id,
        label: cat.label,
        icon: cat.icon,
        description: cat.description,
        comingSoon: !!cat.comingSoon,
        subcategories: cat.subcategories.map(function (sub) {
          var lessons = (sub.lessons || []).map(function (id) {
            var meta = LESSON_META[id] || {};
            var lessonState = state.lessons[id];
            return {
              id: id,
              num: id.slice(-2),
              title: meta.title,
              subtitle: meta.subtitle,
              file: meta.file,
              read: !!(lessonState && lessonState.read),
              reviewDue: !!(lessonState && lessonState.srNextReview && lessonState.srNextReview <= today)
            };
          });
          return {
            id: sub.id,
            label: sub.label,
            description: sub.description,
            lessons: lessons,
            comingSoonLessons: sub.comingSoonLessons || []
          };
        })
      };
    });
  }

  window.LearningEngine = {
    getState: getState,
    markLessonRead: markLessonRead,
    recordQuizResult: recordQuizResult,
    getStreak: getStreak,
    getLevelInfo: getLevelInfo,
    getDueForReview: getDueForReview,
    checkAndUnlockAchievements: checkAndUnlockAchievements,
    getAchievementDefs: getAchievementDefs,
    getTodaysMission: getTodaysMission,
    getLessonMeta: getLessonMeta,
    getCurriculum: getCurriculum
  };
})();
