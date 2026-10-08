# Quality Assurance & Testing Guide

> **Campus Resource Dependency and Personalized Recommendation Graph**  
> *Comprehensive Verification Across 10 Operational Dimensions and 9 Critical Edge Cases*

---

## 1. Testing Philosophy

The platform's testing strategy guarantees reliability across multi-model boundaries, asynchronous synchronization, fault scenarios, and edge cases. Tests are divided into:
1. **Zero-Dependency Hardening Suite (`scripts/verify-phase13-hardening.cjs`)**: Executes using Node.js built-in `node:test` and `node:assert`, validating core math, algorithms, and contracts without external dependencies.
2. **Backend Unit & Integration Suite (`backend/tests/`)**: Built on Vitest, testing service business logic with isolated repository mocks and live driver integration.
3. **API & Contract Verification (`backend/tests/api.hardening.test.ts`)**: Supertest-based end-to-end HTTP endpoint validation.

---

## 2. Test Execution Commands

### 1. Standalone Phase 13 Hardening Suite (Zero-Dependency)
```bash
node scripts/verify-phase13-hardening.cjs
```

#### Test Execution Output
```
TAP version 13
ok 1 - 1. Unit Testing: Core Algorithms & Partitioning Math
ok 2 - 2. Integration Testing: Polyglot Multi-Model Data Flow
ok 3 - 3. API Testing: Uniform Response & Error Envelope
ok 4 - 4. Database Connectivity: Health Reporting Contract
ok 5 - 5. Recommendation Correctness: Skill Gap & Ranking Formulas
ok 6 - 6. Cache Behavior: Cache-Aside & Expiration Mechanics
ok 7 - 7. Cassandra Query Testing: Primary Key & Clustering Orders
ok 8 - 8. Synchronization Testing: Idempotent Dual-Store Updates
ok 9 - 9. Error-Handling Testing: Graceful Degradation
ok 10 - 10. Input-Validation: Parameter Guardrails
ok 11 - 11. Critical Edge Cases Suite
ok 12 - 12. Security, Dependencies & Secrets Audit
1..12
# tests 25
# suites 12
# pass 25
# fail 0
```

### 2. Backend Vitest Suite
```bash
cd backend
npm test
```

### 3. Database Diagnostic Probe
```bash
cd backend
npm run check-db
```

---

## 3. Ten Operational Testing Dimensions

| # | Dimension | Verified In | Verification Description |
| :---: | :--- | :---: | :--- |
| **1** | **Unit Testing** | `verify-phase13-hardening.cjs` | Validates topological sort, Murmur3 BigInt tokens, and cache ratio math. |
| **2** | **Integration Testing** | `sync.unit.test.ts` | Traces Mongo $\to$ Neo4j $\to$ Redis $\to$ Cassandra synchronization lifecycle. |
| **3** | **API Testing** | `api.hardening.test.ts` | Tests uniform response envelope (`{ success: true, data }` / `{ success: false, error, message }`). |
| **4** | **Database Connectivity** | `health.test.ts` | Validates active pings and timeout guards across all 4 database engines. |
| **5** | **Recommendation Correctness** | `recommendation.unit.test.ts` | Asserts deterministic readiness percentages and explainability text. |
| **6** | **Cache Behavior** | `redis.unit.test.ts` | Validates cache hit, cache miss, TTL enforcement, and pattern invalidation. |
| **7** | **Cassandra Query Testing** | `cassandra.unit.test.ts` | Confirms partition key seeking and clustering column order enforcement. |
| **8** | **Synchronization Testing** | `sync.unit.test.ts` | Verifies idempotent writes and orphan node reconciliation. |
| **9** | **Error-Handling Testing** | `hardening.edge-cases.test.ts` | Asserts `safeExec` error catching and appropriate HTTP status mappings (400, 404, 500, 503). |
| **10** | **Input-Validation Testing** | `hardening.edge-cases.test.ts` | Tests parameter guardrails, invalid enum values, and rating bounds (1 to 5). |

---

## 4. Nine Critical Edge Cases Evaluated

1. **Student with No Skills**:
   - Evaluates a student with an empty skill portfolio.
   - Asserts 0% readiness, `'Low'` readiness tier, empty `matchedSkills: []`, without division-by-zero or `NaN` errors.
   - Generates a valid foundational learning path starting from introductory prerequisites.
2. **Student with All Required Skills**:
   - Evaluates a student possessing 100% of skills required for a job.
   - Asserts 100% readiness, `'High'` readiness tier, empty `missingSkills: []`, and `isQualified: true`.
3. **Unavailable / Broken Prerequisite**:
   - Evaluates a course or skill referencing a non-existent prerequisite ID (`sk_phantom_404`).
   - Verifies the topological sorter handles broken reference pointers gracefully without halting roadmap generation.
4. **Circular Prerequisite Attempt**:
   - Injects mutual cyclic dependencies (Skill A $\leftrightarrow$ Skill B).
   - Asserts the iterative sorter detects zero progress, avoids infinite loops or call-stack overflow, and appends remaining circular skills safely.
5. **Empty Recommendation Result**:
   - Simulates a student profile where no courses or projects match criteria.
   - Asserts the endpoint returns `{ success: true, count: 0, recommendations: [] }` rather than throwing or returning `undefined`.
6. **Deleted Resource**:
   - Attempts to retrieve, rate, or track a deleted resource.
   - Asserts the service throws an explicit HTTP 404 error with `{ success: false, error: 'Not Found', message: 'Resource not found' }`.
7. **Stale Redis Cache**:
   - Updates an entity in MongoDB while stale data exists in Redis.
   - Asserts cache invalidation flushes the key, triggering a cache miss that re-queries primary stores and resets the TTL.
8. **Cassandra Missing Partition**:
   - Queries telemetry for an unrecorded student or date partition.
   - Asserts Cassandra driver returns an empty row list `[]` cleanly without CQL errors or unhandled exceptions.
9. **Neo4j Missing Node**:
   - Queries relationships for a non-existent job or course ID.
   - Asserts Cypher returns an empty record set and service returns HTTP 404 cleanly.
