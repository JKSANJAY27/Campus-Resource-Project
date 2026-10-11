# Campus Career & Learning Intelligence - Mobile Application

A cross-platform mobile application built with **React Native**, **Expo (v57)**, and **TypeScript** designed to guide undergraduate students along career exploration, skill-gap analysis, topological learning pathways, and live job opportunities.

---

## 🏛️ Architectural Principles

1. **Exclusively Backend-Mediated**:
   - The mobile client **never** connects directly to raw databases (**MongoDB**, **Neo4j**, **Redis**, **Cassandra**) or external job APIs.
   - All data transactions, graph traversals, and job queries flow securely through the existing Node.js/Express REST API (`/api/v1`).
2. **Local & Free Tooling**:
   - Built on standard Expo development tooling.
   - Requires **no paid build services**, cloud subscriptions, or proprietary accounts to run, develop, and test locally.
3. **Strict Competence & Evidence Model**:
   - Student skills are tiered transparently:
     - 🟢 **Proven**: Validated through completed academic courses AND verified practical projects.
     - 🔵 **Course Only**: Completed course coursework; awaiting practical project demonstration.
     - 🟡 **Self Reported**: Self-selected during onboarding; awaiting formal coursework or project proof.
     - ⚪ **Missing**: Skill gap required by the target role.
4. **Resilient Offline Fallbacks & Settings**:
   - API endpoints are dynamically configurable in-app with built-in health-check diagnostics.

---

## 🧭 Navigation Structure

The application features a clean bottom-tab navigation combined with a global 1-tap quick navigation drawer accessible from every screen.

| Section | Route | Description |
|---|---|---|
| **1. Home Dashboard** | `/(tabs)` | Student competency snapshot, top role recommendation spotlight, active goal tracker, quick action matrix, and live job highlights. |
| **2. My Profile** | `/(tabs)/profile` | Student academic information, proven vs self-reported skills, completed courses, projects, and career preferences. |
| **3. Career Discovery** | `/(tabs)/discovery` | Multi-role career exploration, fit compatibility scores, matching/missing skill counts, bookmarking, and multi-role comparison selector. |
| **4. Explore a Specific Role** | `/role/[roleId]` | In-depth role dossier: role requirements, personalized skill gaps, Neo4j topological learning roadmap, recommended courses & projects, and matching live jobs. |
| **5. Learning Paths** | `/(tabs)/learning` | Role-specific prerequisite-sequenced learning path, interactive checklist for prerequisite satisfaction, course and project suggestions, and effort estimates. |
| **6. Live Jobs** | `/(tabs)/jobs` | Real-time job search with filters (location, work arrangement, experience level), source attribution, external application links, and direct profile matching. |
| **7. Job Skill Analysis** | `/job-analysis` | Free offline NLP JD analyzer: paste any raw job posting text to extract technical skills, tools, qualifications, and benchmark against the active student profile. |
| **8. Saved Roles and Jobs** | `/saved` | Central hub for bookmarked career pathways (synced with backend) and saved live job postings (stored locally). |
| **9. Learning Progress** | `/progress` | Tracks progress toward active career goals, competency distribution by evidence tier, and completed academic milestones. |
| **10. Settings** | `/settings` | Dynamic backend API configuration (localhost, Android emulator `10.0.2.2`, LAN IP), `/health` connection test, and student profile switcher. |
| **Multi-Role Comparison** | `/compare` | Side-by-side comparative matrix of 2–3 roles displaying compatibility score, estimated learning hours, matching skills, and common gaps. |
| **Job Detail & Match** | `/job/[jobId]` | Detailed job view with requirements breakdown, employer attribution, and profile evidence tier comparison. |

---

## 🚀 Recommended User Journeys

### 1. First-Time Launch (Onboarding Flow)
1. **Welcome Screen** (`/`): Introduces the platform and offers quick exploration or profile creation.
2. **Onboarding Steps** (`/onboarding/*`):
   - Step 1: Basic profile (Name, email, student ID).
   - Step 2: Academic background (Major, semester, GPA).
   - Step 3: Completed courses selection.
   - Step 4: Technical skills selection with proficiency ratings.
   - Step 5: Practical projects entry with tech stacks.
   - Step 6: Certifications entry.
   - Step 7: Career preferences (target roles, work style, preferred locations).
3. **Summary & Activation**: Submits the verified profile to the backend, caches the student ID locally in `AsyncStorage`, and auto-routes to the Home Dashboard.

### 2. Returning User Flow
- On app launch, `AsyncStorage` detects an existing active student profile.
- Instantly auto-routes to the **Home Dashboard**, presenting:
  - Personalized competence readiness.
  - Recommended career pathways tailored to verified skills.
  - Active goal progress and next learning milestones.
  - Curated live jobs matching target roles.

### 3. Career Discovery & Exploration
- Browse role recommendations with compatibility percentages.
- Filter by fit tier (*High Fit ≥70%*, *Moderate Fit 40–69%*, *Emerging Fit <40%*).
- Select multiple roles to launch the **Side-by-Side Comparison** (`/compare`).
- Tap any role to open its comprehensive **Explore Role Dossier** (`/role/[roleId]`).

### 4. Job Search & Description Analysis
- Search live listings by title, company, or keyword.
- Filter by remote/hybrid/on-site work arrangements.
- Inspect detailed job listings and verify candidate compatibility with evidence tiers.
- Paste any external job description into the **Job Skill Analysis** screen (`/job-analysis`) for instant local NLP requirement extraction and gap analysis.

---

## 💻 Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later.
- [Expo Go](https://expo.dev/go) app installed on your physical Android/iOS device **OR** Android Studio with an Android Emulator configured.

### Step 1: Start the Backend Server
In the root directory, ensure the backend services are running:
```bash
cd backend
npm run dev
```
The backend starts at `http://localhost:5000` (API endpoint: `http://localhost:5000/api/v1`).

### Step 2: Install Mobile Dependencies
```bash
cd mobile
npm install
```

### Step 3: Run the Development Server
```bash
npm start
# or: npx expo start
```

### Step 4: Run on Android Emulator or Physical Device

#### A. Running on Android Emulator
1. Launch your Android Emulator from Android Studio.
2. In the terminal running Expo, press `a` (or run `npx expo start --android`).
3. **Network Configuration**:
   - Android Emulators access the host machine via `http://10.0.2.2:5000/api/v1`.
   - Open the **Settings** tab in the app (`⚙️ Settings`), tap the **Android Emulator (10.0.2.2:5000)** preset button, and tap **Save Endpoint**.
   - Tap **Test Backend Connection** to verify a successful ping to the `/health` endpoint.

#### B. Running on a Physical Device (via Expo Go)
1. Ensure your computer and mobile phone are connected to the **same Wi-Fi network**.
2. Open the **Expo Go** app on your phone and scan the QR code displayed in the terminal.
3. **Network Configuration**:
   - Find your computer's local IP address (e.g. `192.168.1.50`).
   - In the app's **Settings** screen, enter `http://<YOUR_COMPUTER_IP>:5000/api/v1` and tap **Save Endpoint**.
   - Tap **Test Backend Connection** to confirm connectivity.

---

## 🧪 Testing

The mobile application includes unit and integration tests using **Vitest**:

```bash
cd mobile
npm test
```

### Test Coverage Areas:
1. `tests/api-client.test.ts`:
   - Dynamic API base URL switching and fallback resolution.
   - Student session persistence and switching in `AsyncStorage`.
   - Bookmarked job management (add, deduplicate, remove).
   - Active career goal tracking.
2. `tests/navigation-routes.test.ts`:
   - Validates existence and metadata for all 10 core application sections.
   - Validates route param contracts for dynamic routes (`/role/[roleId]`, `/job/[jobId]`).
3. `tests/user-flows.test.ts`:
   - Onboarding profile serialization and persistence.
   - Returning user auto-routing logic.
   - Multi-role comparison calculation (highest fit, lowest effort).
   - Strict evidence tier assignment (Proven, Course Only, Self Reported, Missing).

### TypeScript Static Verification
To verify clean compilation and zero type errors:
```bash
cd mobile
npx tsc --noEmit
```

---

## 📁 Project Structure

```
mobile/
├── package.json
├── tsconfig.json
├── app.json
├── tests/
│   ├── api-client.test.ts         # API client & local cache tests
│   ├── navigation-routes.test.ts  # Route registry & navigation contracts
│   └── user-flows.test.ts         # User journey and competence logic
└── src/
    ├── api/
    │   └── client.ts              # HTTP client, storage helpers & endpoints
    ├── constants/
    │   ├── design.ts              # Design system tokens (colors, spacing, radius)
    │   └── routes.ts              # 10 core platform sections registry
    ├── components/
    │   ├── Header.tsx             # Standard screen header with quick nav
    │   ├── Card.tsx               # Reusable card surface
    │   ├── MetricBadge.tsx        # Fit, score, and status badges
    │   ├── SkillPill.tsx          # Evidence-tiered skill tags
    │   ├── StateFeedback.tsx      # Loading, error, empty state components
    │   └── QuickNavModal.tsx      # Global 1-tap quick navigation drawer
    ├── types/
    │   └── index.ts               # Core TypeScript domain models
    └── app/
        ├── _layout.tsx            # Root layout with stack routing
        ├── index.tsx              # Welcome screen & returning user router
        ├── compare.tsx            # Multi-role comparative analysis
        ├── job-analysis.tsx       # Offline NLP Job Description analyzer
        ├── progress.tsx           # Learning milestones & competency tracker
        ├── saved.tsx              # Saved roles & jobs
        ├── settings.tsx           # Backend URL config & health diagnostics
        ├── (tabs)/
        │   ├── _layout.tsx        # Bottom tab navigation
        │   ├── index.tsx          # 1. Home Dashboard
        │   ├── discovery.tsx      # 3. Career Discovery
        │   ├── learning.tsx       # 5. Learning Paths
        │   ├── jobs.tsx           # 6. Live Jobs
        │   └── profile.tsx        # 2. My Profile
        ├── role/
        │   └── [roleId].tsx       # 4. Explore Specific Role
        ├── job/
        │   └── [jobId].tsx        # Job detail & student match
        └── onboarding/
            ├── index.tsx          # Step 1: Basic info
            ├── academic.tsx       # Step 2: Degree & semester
            ├── courses.tsx        # Step 3: Courses completed
            ├── skills.tsx         # Step 4: Technical skills
            ├── projects.tsx       # Step 5: Practical projects
            ├── certifications.tsx # Step 6: Certifications
            ├── career-prefs.tsx   # Step 7: Career preferences
            └── submitting.tsx     # Profile submission & activation
```
