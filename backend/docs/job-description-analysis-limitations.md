# Job Description Analysis Module: Architecture, Methodology & Technical Limitations

## 1. Executive Summary & Design Rationale

The Job Description Analysis module is an entirely local, free, and deterministic text analysis engine designed for the **Campus Career & Learning Intelligence Platform**. It parses real employer job descriptions to:
1. Extract in-demand technical skills, tools, frameworks, and methodologies.
2. Identify explicit experience and educational requirements.
3. Compare job requirements directly against a student's verified profile and portfolio.
4. Compile role-level market summaries across live and sampled listings.
5. Suggest targeted campus courses and projects to bridge missing skill gaps.

### Why Avoid Paid Third-Party AI APIs?
- **Zero Operating Cost**: Requires no OpenAI, Anthropic, or proprietary API subscriptions, ensuring long-term sustainability for academic institutions.
- **Data Privacy & Compliance**: Student profile data, academic grades, and proprietary portfolio project details never leave the university's infrastructure.
- **Deterministic & Auditable**: Produces reproducible, transparent scoring that can be explained to students and faculty mentors.
- **High Throughput & Low Latency**: Executes in sub-millisecond time without network round-trips, token limits, or LLM cold starts.

---

## 2. Extraction Pipeline & Architecture

```
Raw Job Posting (Jobicy / Remotive / Text)
                    │
                    ▼
       ┌─────────────────────────┐
       │   HTML Sanitization &   │  Strips HTML tags (<p>, <li>, <br>),
       │    Entity Unescaping    │  unescapes entities (&amp;, &nbsp;)
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │   Text Preprocessing    │  Tokenizes, computes term counts,
       │   & Negation Filtering  │  inspects 45-character lookback windows
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │   Multi-Word Greedy     │  Scans 60+ curated skills, tools,
       │   Dictionary Matcher    │  and frameworks; tests boundary regexes
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │  Experience & Education │  Extracts min/max years, seniority,
       │        Extractor        │  degrees (BS/MS), and certifications
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │ Student Evidence Match  │  STRICT: Projects = Proven Experience
       │   & Multi-Tier Scoring  │  Coursework = Academic Theory Only
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │ Redis Cache-Aside Layer │  TTL: 1hr (Job), 30min (Role Market)
       └─────────────────────────┘
```

---

## 3. Student Evidence Tiers (Strict Policy)

A core requirement of this platform is that **a skill mentioned in a completed course is never treated as equivalent to proven professional experience**.

| Evidence Tier | Criteria | Weight in Compatibility Score | Example |
| :--- | :--- | :--- | :--- |
| **Proven Experience** | Demonstrated in practical custom projects (`customProjects`), verified credentials, or student portfolio repositories. | **1.0 (Full Credit)** | Student built an e-commerce platform using React and PostgreSQL. |
| **Course Completed** | Covered in a completed course syllabus (`taughtSkillIds`), but student has no independent project proving execution. | **0.5 (Foundational Credit)** | Student passed `CS201: Relational Database Systems` (learned SQL syntax, but hasn't built a production schema). |
| **Self-Reported** | Claimed in profile skills without corresponding course or project backing. | **0.3 (Self-Claim Credit)** | Student checked "Docker" during onboarding without linked projects. |
| **Missing** | Requirement identified in job posting with zero evidence in student record. | **0.0 (Gap)** | Job requires Kubernetes; student has no records. Remediation recommended. |

---

## 4. Inherent Technical Limitations of Dictionary-Based Extraction

While dictionary-based extraction is fast, offline, and private, **it is fundamentally not equivalent to a large language model (LLM)**. Users and developers must be aware of the following technical trade-offs:

### 4.1. Synonyms, Abbreviations & Acronym Collisions (Polysemy)
- **Extremely Short Tokens**: Languages like **C**, **R**, and **Go** present significant ambiguity.
  - *Mitigation*: Our dictionary employs strict contextual regexes (e.g. `\bgolang\b`, `\bgo\s+language\b`, or `\bgo\s+(?:developer|backend)\b` instead of matching isolated `\bgo\b`). However, an unusual phrasing such as *"You will go backend systems"* might either trigger or be missed.
  - Similarly, `C` is restricted to `\bc\s+programming\b` or `\bc\s+language\b` to avoid matching grades, vitamin C, or single-letter bullet points.
- **Framework Ambiguity**:
  - `React`: Guarded by negative lookaheads `\breact(?:\.js|js)?\b(?!ive)` to avoid matching "reactive" or "reactor".
  - `Java` vs `JavaScript`: Guarded by negative lookahead `\bjava\b(?!script)`.
  - Terms like `Spring` (season vs Java framework), `Flask` (laboratory equipment vs Python micro-framework), and `Ember` can theoretically match if an employer uses metaphorical language (e.g., *"springing forward into innovation"*).

### 4.2. Negation and Complex Grammatical Syntax
- Employers occasionally specify negative or optional requirements:
  - *"No previous AWS or cloud experience required."*
  - *"We do not expect candidates to know Kubernetes."*
  - *"Knowledge of PHP is not needed; we are migrating to Go."*
- *Mitigation*: The service scans a 45-character lookback window preceding matches for negation triggers (`no `, `not `, `without `, `do not need `, `not required`).
- *Limitation*: Complex or inverted sentence structures (e.g., *"Kubernetes experience, although certainly not a prerequisite for this junior role, is appreciated"*) may evade proximity lookback heuristics and generate a false positive.

### 4.3. Nuanced Experience Quantification
- The engine identifies explicit numerical patterns (e.g. `3+ years`, `2-4 yrs of experience`, `entry-level`, `senior`).
- It cannot reliably quantify qualitative or non-standard experience statements, such as:
  - *"Demonstrated track record of shipping software at high velocity."*
  - *"Equivalent to several years of startup tinkering."*
  - *"Equivalent industry experience considered in lieu of a degree."*

### 4.4. Inability to Discriminate "Must-Have" vs "Nice-to-Have" in Free-Form Prose
- Job postings often mix mandatory requirements with optional wish lists under ambiguous headings (*"Bonus Points"*, *"Nice to have"*, *"Things that make you stand out"*).
- Without deep semantic discourse understanding, the engine relies on **term frequency (TF-IDF)** and title presence to weigh skill prominence. A skill mentioned 5 times across the text will receive higher weight than a skill mentioned once, but this is a heuristic rather than guaranteed semantic intent.

---

## 5. Summary & Recommendations

| Attribute | Local Dictionary Engine (Current) | Generative LLM (Paid APIs) |
| :--- | :--- | :--- |
| **Cost** | **$0.00 (Completely Free)** | High recurring API bill per query |
| **Latency** | **< 2ms per description** | 1,500ms – 5,000ms |
| **Privacy** | **100% Private (Zero data egress)** | Student profiles sent to 3rd party |
| **Offline Reliability** | **Works without internet** | Fails if API key expires or network down |
| **Nuance & Negation** | Heuristic (Good for standard specs) | High natural language comprehension |
| **Auditability** | Transparent token and dictionary match | Black-box probabilistic inference |

The dictionary engine provides an optimal, free, and robust foundation for students and campus recruiters. As the platform matures, faculty or administrators wishing to add generative AI can plug it in via an adapter without changing the student comparison contract.
