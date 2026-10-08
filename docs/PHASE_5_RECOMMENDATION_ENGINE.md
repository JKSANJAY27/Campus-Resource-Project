# Phase 5: Explainable Graph-Based Recommendation Engine & Learning Paths

## 1. Overview & Academic Rationale

In modern polyglot persistence architectures, graph databases (Neo4j) excel at modeling complex, multi-hop relationship topologies that traditional relational or document databases struggle to evaluate efficiently. 

This engine implements **Phase 5: Explainable Graph-Based Recommendations & Personalized Learning Paths** for the Campus Resource Intelligence Platform. In strict adherence to academic principles and the NoSQL course guidelines, the engine is **100% deterministic, transparent, and explainable**:
- **Zero Black-Box AI / Paid APIs**: Requires no external embeddings or proprietary LLMs; operates purely on graph traversal and mathematical scoring.
- **Topological Prerequisite Ordering**: Employs graph traversal (BFS / topological dependency resolution) to guarantee that students are never advised to take advanced skills before satisfying their prerequisites.
- **Multi-Criteria Scoring Formula**: Computes transparent compatibility scores by weighting skill match, prerequisite satisfaction, campus interest alignment, difficulty fit, and ecosystem popularity.
- **Explainability by Design**: Every recommendation returns an explicit, human-readable justification (e.g., *"Recommended because: teaches 2 new core skills; all prerequisite courses completed; aligns with your AI interest domain"*).

---

## 2. Multi-Criteria Scoring Formulations

All scores are normalized strictly within the interval `[0.0, 1.0]`, with weights strictly summing to `1.0`:

### A. Course Recommendation Scoring
$$\text{Score}_{\text{course}} = 0.35 \cdot S_{\text{new}} + 0.25 \cdot S_{\text{prereq}} + 0.20 \cdot S_{\text{interest}} + 0.10 \cdot S_{\text{diff}} + 0.10 \cdot S_{\text{demand}}$$

- $S_{\text{new}}$: Ratio of skills taught by the course that the student has not yet acquired ($\frac{|\text{New Skills}|}{|\text{Taught Skills}|}$).
- $S_{\text{prereq}}$: Prerequisite fulfillment factor ($1.0$ if all prerequisite courses are completed; $\frac{|\text{Completed}|}{|\text{Required}|}$ otherwise).
- $S_{\text{interest}}$: Alignment with the student's department and declared interest categories ($1.0$ for exact match, $0.7$ for partial, $0.0$ for none).
- $S_{\text{diff}}$: Difficulty compatibility based on student's current skill maturity.
- $S_{\text{demand}}$: Popularity bonus derived from real-time student acquisition frequency in Neo4j.

### B. Project Recommendation Scoring
$$\text{Score}_{\text{project}} = 0.35 \cdot S_{\text{compat}} + 0.25 \cdot S_{\text{growth}} + 0.20 \cdot S_{\text{interest}} + 0.10 \cdot S_{\text{diff}} + 0.10 \cdot S_{\text{pop}}$$

- $S_{\text{compat}}$: Ratio of project required skills already in the student's inventory ($\frac{|\text{Known} \cap \text{Required}|}{|\text{Required}|}$).
- $S_{\text{growth}}$: Sweet spot bonus for projects introducing $1$ to $3$ new skills ($1.0$ for optimal growth, $0.3$ if student knows everything, $0.2$ if project is out of reach).
- $S_{\text{interest}}$: Match between project domain and student interests.

### C. Job Recommendation Scoring & Readiness Verdict
$$\text{Score}_{\text{job}} = 0.40 \cdot S_{\text{match}} + 0.25 \cdot S_{\text{domain}} + 0.15 \cdot S_{\text{readiness}} + 0.10 \cdot S_{\text{feasibility}} + 0.10 \cdot S_{\text{pop}}$$

- **Readiness Verdict Thresholds**:
  - $\ge 75\%$: **Ready to Apply**
  - $40\% - 74\%$: **Preparation Required**
  - $< 40\%$: **Substantial Upskilling Needed**

---

## 3. Graph Dependency Resolution & Topological Ordering

For personalized learning paths, the engine extracts the target role's skill set, computes missing skills, and queries transitive `(:Skill)-[:SKILL_PREREQUISITE_OF]->(:Skill)` relationships.

```
(Linear Algebra & Statistics) ──────> (Data Analysis) ──────> (Classical ML) ──────> (Deep Learning)
         │                                   ▲
         └───────────────────────────────────┘
```

The algorithm evaluates dependencies using directed acyclic graph (DAG) topological sorting:
1. Skills whose prerequisites are already satisfied by the student or earlier steps are scheduled first.
2. Each step in the roadmap is enriched with:
   - Target tier (`foundational`, `intermediate`, `advanced`)
   - Human-readable pedagogical reason
   - Linked campus courses from Neo4j (`COURSE_TEACHES`)
   - Curated open learning resources (`RESOURCE_TEACHES`)

---

## 4. API Endpoints Specification

All endpoints are mounted under `/api/v1/recommendations`:

| Method | Endpoint | Query / Path Params | Description |
|---|---|---|---|
| `GET` | `/roles` | - | Lists predefined ontology career target roles |
| `GET` | `/students/:id/skill-gap` | `targetType`, `targetId` | Deterministic skill gap analysis with readiness % |
| `GET` | `/students/:id/learning-path` | `targetRole` | Ordered roadmap with suggested courses & resources |
| `GET` | `/students/:id/courses` | `limit` (default: 10) | Multi-criteria recommended courses with explanations |
| `GET` | `/students/:id/projects` | `limit` (default: 10) | Recommended projects balanced for compatibility & growth |
| `GET` | `/students/:id/jobs` | `limit` (default: 10) | Ranked jobs with readiness percentage and explanations |
| `GET` | `/students/:id/job-readiness/:jobId` | `jobId` | Detailed candidate audit and preparation roadmap |
| `GET` | `/students/:id/resources` | `limit` (default: 10) | Tailored textbooks, labs, and videos for missing skills |

---

## 5. Architectural File Structure

```
backend/
├── src/
│   ├── repositories/neo4j/
│   │   ├── base.neo4j.repository.ts
│   │   ├── graph.repository.ts
│   │   ├── recommendation.repository.ts    <-- [Phase 5 Neo4j Queries]
│   │   └── index.ts
│   ├── services/
│   │   ├── graph.service.ts
│   │   ├── recommendation.service.ts      <-- [Phase 5 Core Scoring & Topological Logic]
│   │   └── index.ts
│   ├── controllers/
│   │   └── recommendation.controller.ts   <-- [Phase 5 REST Handlers]
│   ├── routes/
│   │   └── recommendation.routes.ts       <-- [Phase 5 Express Router]
│   └── app.ts                             <-- [Mounted at /api/v1/recommendations]
└── tests/
    └── recommendation.unit.test.ts        <-- [Comprehensive Vitest Unit Test Suite]

frontend/
├── src/
│   ├── components/
│   │   └── RecommendationDashboard.tsx    <-- [Phase 5 Interactive Next.js Dashboard]
│   └── app/
│       └── page.tsx                       <-- [Integrated view switcher]
```

---

## 6. How to Run & Verify

1. **Start the Infrastructure (Docker Compose)**:
   ```bash
   docker compose up -d
   ```
2. **Seed the Databases**:
   ```bash
   cd backend
   npm run seed
   ```
3. **Execute the Unit Test Suite**:
   ```bash
   cd backend
   npm test -- tests/recommendation.unit.test.ts
   ```
4. **Launch Backend**:
   ```bash
   npm run dev
   ```
5. **Launch Frontend**:
   ```bash
   cd ../frontend
   npm run dev
   ```
   Visit `http://localhost:3000` to interact with the Recommendation & Learning Path Explorer!
