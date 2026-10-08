import { SeededRandom } from './random.js';
import {
  CURATED_SKILLS,
  DOMAINS,
  DEPARTMENTS,
  CLUBS_DATA,
  FACILITIES_DATA,
  SkillDefinition,
} from './ontology.js';
import { buildSkillPrerequisiteMap, getTransitivePrerequisites, validateGraphIsDAG } from './prerequisites.js';

export interface DatasetGeneratorOptions {
  scale: 'small' | 'medium' | 'large';
  seed?: number;
}

export interface GeneratedDataset {
  scale: 'small' | 'medium' | 'large';
  seed: number;
  skills: any[];
  courses: any[];
  projects: any[];
  jobs: any[];
  clubs: any[];
  events: any[];
  facilities: any[];
  resources: any[];
  students: any[];
  cassandraEvents: {
    studentActivity: any[];
    resourceAccess: any[];
    recommendationAudit: any[];
  };
  summary: {
    studentCount: number;
    courseCount: number;
    skillCount: number;
    projectCount: number;
    jobCount: number;
    clubCount: number;
    eventCount: number;
    facilityCount: number;
    resourceCount: number;
    cassandraEventCount: number;
  };
}

export class DatasetGenerator {
  private rng: SeededRandom;
  private scale: 'small' | 'medium' | 'large';
  private seed: number;
  private readonly baseEpoch: number = new Date('2024-03-01T00:00:00.000Z').getTime();

  constructor(options: DatasetGeneratorOptions) {
    this.scale = options.scale;
    this.seed = options.seed ?? 42;
    this.rng = new SeededRandom(this.seed);
  }

  public generate(): GeneratedDataset {
    // 1. Generate Skills with strictly acyclic DAG dependencies
    const skills = this.generateSkills();
    const skillPrereqMap = buildSkillPrerequisiteMap(CURATED_SKILLS);

    // 2. Generate Facilities & Clubs
    const facilities = this.generateFacilities();
    const clubs = this.generateClubs();

    // 3. Generate Courses with course prerequisite DAG
    const courses = this.generateCourses(skills);

    // 4. Generate Resources
    const resources = this.generateResources(skills);

    // 5. Generate Events
    const events = this.generateEvents(clubs, facilities, skills);

    // 6. Generate Projects
    const projects = this.generateProjects(skills);

    // 7. Generate Placement & Internship Jobs
    const jobs = this.generateJobs(skills);

    // 8. Generate Students with archetype distribution (Archetypes: Senior, Intermediate, Beginner)
    const students = this.generateStudents(skills, courses, projects, clubs, events, skillPrereqMap);

    // 9. Generate Cassandra Telemetry Events (Time-Series Activity & Audits)
    const cassandraEvents = this.generateCassandraTelemetry(students, courses, projects, resources, events);

    const summary = {
      studentCount: students.length,
      courseCount: courses.length,
      skillCount: skills.length,
      projectCount: projects.length,
      jobCount: jobs.length,
      clubCount: clubs.length,
      eventCount: events.length,
      facilityCount: facilities.length,
      resourceCount: resources.length,
      cassandraEventCount:
        cassandraEvents.studentActivity.length +
        cassandraEvents.resourceAccess.length +
        cassandraEvents.recommendationAudit.length,
    };

    return {
      scale: this.scale,
      seed: this.seed,
      skills,
      courses,
      projects,
      jobs,
      clubs,
      events,
      facilities,
      resources,
      students,
      cassandraEvents,
      summary,
    };
  }

  private generateSkills(): any[] {
    return CURATED_SKILLS.map((sk) => ({
      skillId: sk.id,
      name: sk.name,
      category: sk.category,
      tier: sk.tier,
      description: sk.description,
      prerequisiteSkillIds: [...sk.prerequisites],
      createdAt: new Date('2024-01-15T00:00:00Z'),
    }));
  }

  private generateFacilities(): any[] {
    return FACILITIES_DATA.map((f) => ({
      facilityId: f.id,
      name: f.name,
      building: f.bldg,
      roomNumber: f.room,
      facilityType: f.type,
      capacity: f.cap,
      equipmentSummary: ['High-speed Gigabit Ethernet', 'High-end Workstations', 'Smart Projector', 'UPS Backup'],
      createdAt: new Date('2024-01-01T00:00:00Z'),
    }));
  }

  private generateClubs(): any[] {
    return CLUBS_DATA.map((c) => ({
      clubId: c.id,
      name: c.name,
      category: c.category,
      description: c.desc,
      facultyCoordinator: 'Dr. Faculty Coordinator',
      foundedYear: 2018,
      activeMemberCount: this.rng.nextInt(40, 150),
      createdAt: new Date('2024-01-01T00:00:00Z'),
    }));
  }

  private generateCourses(skills: any[]): any[] {
    const courseTemplates = [
      {
        id: 'crs_cs101',
        code: 'CS101',
        title: 'Introduction to Programming & Problem Solving',
        dept: 'Computer Science & Engineering',
        credits: 4,
        diff: 'introductory',
        sem: [1, 2],
        skills: ['sk_python', 'sk_cpp'],
        prereqs: [],
        topics: ['Control structures', 'Functions & Recursion', 'Basic I/O', 'OOP Fundamentals'],
      },
      {
        id: 'crs_cs102',
        code: 'CS102',
        title: 'Discrete Mathematics & Statistical Foundations',
        dept: 'Computer Science & Engineering',
        credits: 4,
        diff: 'introductory',
        sem: [1, 2],
        skills: ['sk_math_stats'],
        prereqs: [],
        topics: ['Propositional Logic', 'Probability Distributions', 'Matrix Algebra', 'Combinatorics'],
      },
      {
        id: 'crs_cs201',
        code: 'CS201',
        title: 'Data Structures and Algorithms',
        dept: 'Computer Science & Engineering',
        credits: 4,
        diff: 'intermediate',
        sem: [3, 4],
        skills: ['sk_dsa'],
        prereqs: ['crs_cs101'],
        topics: ['Balanced Trees', 'Graph Traversals', 'Greedy & Dynamic Programming', 'Time Complexity'],
      },
      {
        id: 'crs_cs202',
        code: 'CS202',
        title: 'Database Management Systems & SQL',
        dept: 'Computer Science & Engineering',
        credits: 3,
        diff: 'intermediate',
        sem: [3, 4],
        skills: ['sk_sql'],
        prereqs: ['crs_cs101'],
        topics: ['Relational Algebra', 'Normalization BCNF', 'Indexing', 'ACID Transactions'],
      },
      {
        id: 'crs_cs203',
        code: 'CS203',
        title: 'Operating Systems & Linux Shell Administration',
        dept: 'Computer Science & Engineering',
        credits: 4,
        diff: 'intermediate',
        sem: [3, 4],
        skills: ['sk_linux'],
        prereqs: ['crs_cs101'],
        topics: ['Process Scheduling', 'Virtual Memory', 'Concurrency & Mutexes', 'Bash Automation'],
      },
      {
        id: 'crs_cs204',
        code: 'CS204',
        title: 'Computer Networks & Internet Protocols',
        dept: 'Computer Science & Engineering',
        credits: 3,
        diff: 'intermediate',
        sem: [4, 5],
        skills: ['sk_networks'],
        prereqs: ['crs_cs203'],
        topics: ['TCP/IP Suite', 'Socket Programming', 'DNS & Routing', 'Transport Layer Flow Control'],
      },
      {
        id: 'crs_cs301',
        code: 'CS301',
        title: 'Modern Web Engineering & Full-Stack Systems',
        dept: 'Information Technology',
        credits: 4,
        diff: 'intermediate',
        sem: [4, 5],
        skills: ['sk_javascript', 'sk_html_css', 'sk_react', 'sk_nodejs'],
        prereqs: ['crs_cs101', 'crs_cs202'],
        topics: ['REST APIs', 'React Virtual DOM', 'Asynchronous Node.js', 'State Architectures'],
      },
      {
        id: 'crs_cs302',
        code: 'CS302',
        title: 'Multi-Model NoSQL Databases & Polyglot Persistence',
        dept: 'Computer Science & Engineering',
        credits: 4,
        diff: 'advanced',
        sem: [5, 6],
        skills: ['sk_nosql'],
        prereqs: ['crs_cs202'],
        topics: ['CAP Theorem', 'Document Stores', 'Graph Traversals', 'Wide-Column Cassandra & Redis'],
      },
      {
        id: 'crs_ai301',
        code: 'AI301',
        title: 'Applied Machine Learning & Statistical Learning',
        dept: 'Artificial Intelligence & ML',
        credits: 4,
        diff: 'intermediate',
        sem: [5, 6],
        skills: ['sk_data_analysis', 'sk_ml'],
        prereqs: ['crs_cs101', 'crs_cs102'],
        topics: ['Regression & Classification', 'Cross Validation', 'SVMs & Random Forests', 'Feature Engineering'],
      },
      {
        id: 'crs_ai401',
        code: 'AI401',
        title: 'Deep Learning & Neural Network Architectures',
        dept: 'Artificial Intelligence & ML',
        credits: 4,
        diff: 'advanced',
        sem: [6, 7],
        skills: ['sk_deep_learning', 'sk_computer_vision'],
        prereqs: ['crs_ai301'],
        topics: ['Convolutional Networks', 'Residual Architectures', 'Optimization & Backprop', 'PyTorch Lab'],
      },
      {
        id: 'crs_ai402',
        code: 'AI402',
        title: 'Natural Language Processing & Generative AI',
        dept: 'Artificial Intelligence & ML',
        credits: 4,
        diff: 'advanced',
        sem: [7, 8],
        skills: ['sk_nlp', 'sk_genai'],
        prereqs: ['crs_ai401'],
        topics: ['Self-Attention & Transformers', 'BERT & GPT Fine-Tuning', 'RAG Vector Pipelines', 'Tokenization'],
      },
      {
        id: 'crs_cs401',
        code: 'CS401',
        title: 'Distributed Systems & Cloud Computing',
        dept: 'Computer Science & Engineering',
        credits: 4,
        diff: 'advanced',
        sem: [6, 7],
        skills: ['sk_docker', 'sk_kubernetes', 'sk_dist_systems', 'sk_cloud_aws'],
        prereqs: ['crs_cs201', 'crs_cs203', 'crs_cs204'],
        topics: ['Container Orchestration', 'Raft Consensus', 'Partitioning Strategies', 'Microservices'],
      },
      {
        id: 'crs_sec401',
        code: 'SEC401',
        title: 'Network Security & Applied Cryptography',
        dept: 'Information Technology',
        credits: 3,
        diff: 'advanced',
        sem: [6, 7],
        skills: ['sk_cyber_sec', 'sk_web_sec'],
        prereqs: ['crs_cs204'],
        topics: ['RSA & Elliptic Curves', 'OWASP Top 10 Exploits', 'Penetration Testing', 'Zero Trust Design'],
      },
    ];

    return courseTemplates.map((c) => ({
      courseId: c.id,
      code: c.code,
      title: c.title,
      department: c.dept,
      credits: c.credits,
      difficulty: c.diff,
      description: `Comprehensive academic course covering ${c.title}. Focuses on theoretical rigor and practical laboratory implementation.`,
      syllabusTopics: c.topics,
      taughtSkillIds: c.skills,
      prerequisiteCourseIds: c.prereqs,
      instructor: {
        name: `Prof. ${this.rng.pick(['Alan Mitchell', 'Elena Rostova', 'Karthik Raman', 'Sarah Jenkins', 'David Chen'])}`,
        email: `instructor.${c.code.toLowerCase()}@campus.edu`,
        office: `Room ${this.rng.nextInt(201, 415)}, Computing Block`,
      },
      semesterOffered: c.sem,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    }));
  }

  private generateResources(skills: any[]): any[] {
    const resourceTypes = ['Video Series', 'Interactive Lab', 'Textbook', 'Research Paper', 'Cheatsheet'] as const;

    return skills.map((sk, idx) => ({
      resourceId: `res_${sk.skillId.replace('sk_', '')}`,
      title: `Mastering ${sk.name}: Complete Practice Guide`,
      resourceType: resourceTypes[idx % resourceTypes.length],
      url: `https://resources.campus.edu/tutorials/${sk.skillId}`,
      taughtSkillIds: [sk.skillId],
      durationMinutes: this.rng.nextInt(45, 300),
      difficulty: sk.tier === 'foundational' ? 'beginner' : sk.tier === 'intermediate' ? 'intermediate' : 'advanced',
      rating: Number(this.rng.nextFloat(4.2, 4.95).toFixed(1)),
      accessCount: this.rng.nextInt(120, 2400),
      createdAt: new Date('2024-02-01T00:00:00Z'),
    }));
  }

  private generateEvents(clubs: any[], facilities: any[], skills: any[]): any[] {
    const eventTypes = ['Workshop', 'Hackathon', 'Guest Lecture', 'Competition', 'Seminar'] as const;
    const titles = [
      { name: 'National 36-Hour HackSprint', type: 'Hackathon' as const, sk: ['sk_react', 'sk_nodejs', 'sk_python'] },
      { name: 'Hands-on Deep Learning & PyTorch Bootcamp', type: 'Workshop' as const, sk: ['sk_deep_learning', 'sk_ml'] },
      { name: 'Kubernetes in Production: Guest Seminar', type: 'Guest Lecture' as const, sk: ['sk_kubernetes', 'sk_docker'] },
      { name: 'Campus Ethical Hacking CTF Challenge', type: 'Competition' as const, sk: ['sk_cyber_sec', 'sk_web_sec'] },
      { name: 'Generative AI & LLM Architecture Summit', type: 'Seminar' as const, sk: ['sk_genai', 'sk_nlp'] },
      { name: 'Competitive Programming Marathon', type: 'Competition' as const, sk: ['sk_dsa', 'sk_cpp'] },
      { name: 'Cloud Native Microservices Workshop', type: 'Workshop' as const, sk: ['sk_cloud_aws', 'sk_docker'] },
      { name: 'Data Wrangling with Pandas & NumPy', type: 'Workshop' as const, sk: ['sk_data_analysis', 'sk_python'] },
    ];

    return titles.map((item, idx) => {
      const club = clubs[idx % clubs.length];
      const fac = facilities[idx % facilities.length];
      const eventDate = new Date(this.baseEpoch - (idx * 5 - 10) * 86400000); // dates spread around base epoch

      return {
        eventId: `evt_${idx + 1}`,
        title: item.name,
        eventType: item.type,
        organizingClubId: club.clubId,
        eventDate,
        venueFacilityId: fac.facilityId,
        description: `Join us for ${item.name} organized by ${club.name} at ${fac.name}.`,
        targetedSkillIds: item.sk,
        capacity: fac.capacity,
        registeredCount: Math.min(fac.capacity, this.rng.nextInt(35, fac.capacity)),
        createdAt: new Date('2024-01-10T00:00:00Z'),
      };
    });
  }

  private generateProjects(skills: any[]): any[] {
    const projectTemplates = [
      {
        id: 'proj_01',
        title: 'Distributed In-Memory Key-Value Cache Engine',
        domain: 'Distributed Systems',
        diff: 'advanced' as const,
        reqSkills: ['sk_cpp', 'sk_dsa', 'sk_dist_systems'],
        tech: ['C++20', 'Sockets', 'Raft Algorithm', 'Linux'],
      },
      {
        id: 'proj_02',
        title: 'Real-Time Collaborative Code Editor & Canvas',
        domain: 'Full-Stack Web Development',
        diff: 'intermediate' as const,
        reqSkills: ['sk_javascript', 'sk_react', 'sk_nodejs'],
        tech: ['Next.js', 'WebSockets', 'Tailwind CSS', 'Redis Pub/Sub'],
      },
      {
        id: 'proj_03',
        title: 'Autonomous Drone Navigation using Computer Vision',
        domain: 'Autonomous Systems & Robotics',
        diff: 'advanced' as const,
        reqSkills: ['sk_python', 'sk_deep_learning', 'sk_computer_vision'],
        tech: ['PyTorch', 'OpenCV', 'ROS2', 'YOLOv8'],
      },
      {
        id: 'proj_04',
        title: 'Campus Course & Placement Recommendation Engine',
        domain: 'Artificial Intelligence',
        diff: 'intermediate' as const,
        reqSkills: ['sk_python', 'sk_ml', 'sk_nosql'],
        tech: ['Neo4j Cypher', 'MongoDB', 'FastAPI', 'Scikit-Learn'],
      },
      {
        id: 'proj_05',
        title: 'Cloud-Native Microservices CI/CD Pipeline & Ingress',
        domain: 'Cloud & DevOps Engineering',
        diff: 'intermediate' as const,
        reqSkills: ['sk_linux', 'sk_docker', 'sk_ci_cd'],
        tech: ['Docker Compose', 'GitHub Actions', 'Nginx Ingress', 'Prometheus'],
      },
      {
        id: 'proj_06',
        title: 'Retrieval-Augmented Generation (RAG) Campus Assistant',
        domain: 'Artificial Intelligence',
        diff: 'advanced' as const,
        reqSkills: ['sk_python', 'sk_nlp', 'sk_genai'],
        tech: ['LangChain', 'ChromaDB', 'HuggingFace', 'FastAPI'],
      },
      {
        id: 'proj_07',
        title: 'Zero-Trust Network Access & Vulnerability Scanner',
        domain: 'Cybersecurity & Network Defense',
        diff: 'advanced' as const,
        reqSkills: ['sk_networks', 'sk_cyber_sec', 'sk_web_sec'],
        tech: ['Wireshark', 'Python Scapy', 'TLS 1.3', 'Linux Iptables'],
      },
      {
        id: 'proj_08',
        title: 'Student Academic Progress & CGPA Analytics Dashboard',
        domain: 'Full-Stack Web Development',
        diff: 'beginner' as const,
        reqSkills: ['sk_html_css', 'sk_javascript', 'sk_sql'],
        tech: ['React', 'PostgreSQL', 'Chart.js', 'Express.js'],
      },
      {
        id: 'proj_09',
        title: 'High-Throughput Financial Stock Screener & Visualizer',
        domain: 'Data Engineering & Big Data',
        diff: 'intermediate' as const,
        reqSkills: ['sk_python', 'sk_data_analysis', 'sk_sql'],
        tech: ['Pandas', 'NumPy', 'Dash / Plotly', 'PostgreSQL'],
      },
      {
        id: 'proj_10',
        title: 'Multi-Tenant Kubernetes Observability & Tracing Agent',
        domain: 'Cloud & DevOps Engineering',
        diff: 'advanced' as const,
        reqSkills: ['sk_docker', 'sk_kubernetes', 'sk_cloud_aws'],
        tech: ['Kubernetes', 'Helm', 'Grafana', 'OpenTelemetry'],
      },
    ];

    return projectTemplates.map((p) => ({
      projectId: p.id,
      title: p.title,
      abstract: `An engineering capstone project in ${p.domain} designed to build and evaluate ${p.title}.`,
      domain: p.domain,
      difficulty: p.diff,
      requiredSkillIds: p.reqSkills,
      technologiesUsed: p.tech,
      facultyMentor: 'Prof. Faculty Advisor',
      maxTeamSize: 4,
      createdAt: new Date('2024-02-01T00:00:00Z'),
    }));
  }

  private generateJobs(skills: any[]): any[] {
    const jobTemplates = [
      {
        id: 'job_01',
        title: 'Junior Software Engineer (Backend Systems)',
        company: 'Stripe',
        type: 'full_time' as const,
        domain: 'Distributed Systems',
        skills: ['sk_cpp', 'sk_dsa', 'sk_sql', 'sk_linux'],
        cgpa: 7.5,
      },
      {
        id: 'job_02',
        title: 'Full-Stack Web Developer Intern',
        company: 'Vercel',
        type: 'internship' as const,
        domain: 'Full-Stack Web Development',
        skills: ['sk_javascript', 'sk_react', 'sk_nodejs', 'sk_html_css'],
        cgpa: 7.0,
      },
      {
        id: 'job_03',
        title: 'Machine Learning Research Engineer',
        company: 'DeepMind',
        type: 'full_time' as const,
        domain: 'Artificial Intelligence',
        skills: ['sk_python', 'sk_math_stats', 'sk_ml', 'sk_deep_learning'],
        cgpa: 8.5,
      },
      {
        id: 'job_04',
        title: 'Cloud Infrastructure & DevOps Engineer',
        company: 'Amazon Web Services',
        type: 'full_time' as const,
        domain: 'Cloud & DevOps Engineering',
        skills: ['sk_linux', 'sk_docker', 'sk_kubernetes', 'sk_ci_cd'],
        cgpa: 7.5,
      },
      {
        id: 'job_05',
        title: 'Security Operations & Penetration Testing Intern',
        company: 'CrowdStrike',
        type: 'internship' as const,
        domain: 'Cybersecurity & Network Defense',
        skills: ['sk_networks', 'sk_cyber_sec', 'sk_web_sec'],
        cgpa: 7.2,
      },
      {
        id: 'job_06',
        title: 'Generative AI & LLM Systems Engineer',
        company: 'Anthropic Labs Partner',
        type: 'full_time' as const,
        domain: 'Artificial Intelligence',
        skills: ['sk_python', 'sk_nlp', 'sk_genai', 'sk_docker'],
        cgpa: 8.0,
      },
      {
        id: 'job_07',
        title: 'Data Platform Engineer',
        company: 'Snowflake',
        type: 'full_time' as const,
        domain: 'Data Engineering & Big Data',
        skills: ['sk_python', 'sk_sql', 'sk_nosql', 'sk_data_analysis'],
        cgpa: 7.5,
      },
    ];

    return jobTemplates.map((j) => ({
      jobId: j.id,
      title: j.title,
      company: j.company,
      jobType: j.type,
      location: 'Bengaluru, India / Hybrid',
      description: `Exciting opening for ${j.title} at ${j.company}. Looking for candidates proficient in core systems and domain skills.`,
      demandedSkillIds: j.skills,
      preferredDomain: j.domain,
      minimumCgpa: j.cgpa,
      openPositions: this.rng.nextInt(2, 6),
      deadline: new Date(this.baseEpoch + 60 * 86400000), // 60 days in future
      createdAt: new Date('2024-02-15T00:00:00Z'),
    }));
  }

  private generateStudents(
    skills: any[],
    courses: any[],
    projects: any[],
    clubs: any[],
    events: any[],
    skillPrereqMap: Map<string, string[]>
  ): any[] {
    const studentCount = this.scale === 'small' ? 100 : this.scale === 'medium' ? 1000 : 5000;
    const firstNames = ['Aarav', 'Ananya', 'Rohan', 'Sneha', 'Vikram', 'Pooja', 'Rahul', 'Divya', 'Sanjay', 'Meera', 'Aditya', 'Ishita', 'Kiran', 'Nisha'];
    const lastNames = ['Sharma', 'Verma', 'Patel', 'Iyer', 'Reddy', 'Nair', 'Gupta', 'Singh', 'Chopra', 'Mukherjee', 'Kumar', 'Joshi'];

    const students: any[] = [];

    for (let i = 1; i <= studentCount; i++) {
      const studentId = `stu_${String(i).padStart(4, '0')}`;
      const rollNumber = `21BCSE${String(i).padStart(4, '0')}`;
      const firstName = this.rng.pick(firstNames);
      const lastName = this.rng.pick(lastNames);
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@campus.edu`;
      const dept = this.rng.pick(DEPARTMENTS);

      // Distribute student archetypes:
      // ~25% Senior / Advanced (Sem 6-8, high skill coverage, full prerequisite chains)
      // ~45% Intermediate (Sem 3-5, partial skill coverage, some skill gaps)
      // ~30% Beginner (Sem 1-2, early foundational skills, large skill gaps)
      const rollType = this.rng.next();
      let semester: number;
      let archetype: 'senior' | 'intermediate' | 'beginner';

      if (rollType < 0.25) {
        archetype = 'senior';
        semester = this.rng.nextInt(6, 8);
      } else if (rollType < 0.70) {
        archetype = 'intermediate';
        semester = this.rng.nextInt(3, 5);
      } else {
        archetype = 'beginner';
        semester = this.rng.nextInt(1, 2);
      }

      const cgpa =
        archetype === 'senior'
          ? Number(this.rng.nextFloat(7.8, 9.8).toFixed(2))
          : archetype === 'intermediate'
          ? Number(this.rng.nextFloat(6.8, 9.2).toFixed(2))
          : Number(this.rng.nextFloat(6.0, 9.0).toFixed(2));

      const interests = this.rng.sample(DOMAINS, this.rng.nextInt(2, 3));

      // Determine Student Skills according to archetype
      const studentSkills: any[] = [];
      const assignedSkillIds = new Set<string>();

      // Foundational skills (all students get at least 1-2 foundational skills)
      const foundationalSkills = skills.filter((s) => s.tier === 'foundational');
      const intermediateSkills = skills.filter((s) => s.tier === 'intermediate');
      const advancedSkills = skills.filter((s) => s.tier === 'advanced' || s.tier === 'specialized');

      const numFoundational = archetype === 'beginner' ? this.rng.nextInt(1, 2) : this.rng.nextInt(3, foundationalSkills.length);
      const chosenFoundational = this.rng.sample(foundationalSkills, numFoundational);
      for (const f of chosenFoundational) {
        assignedSkillIds.add(f.skillId);
        studentSkills.push({
          skillId: f.skillId,
          level: archetype === 'beginner' ? 'beginner' : this.rng.pick(['intermediate', 'advanced']),
          acquiredAt: new Date(this.baseEpoch - 300 * 86400000),
        });
      }

      // If Intermediate or Senior, grant intermediate skills if prerequisites are met
      if (archetype === 'intermediate' || archetype === 'senior') {
        const numIntermediate = archetype === 'intermediate' ? this.rng.nextInt(2, 4) : this.rng.nextInt(4, intermediateSkills.length);
        const candidateIntermediates = this.rng.sample(intermediateSkills, numIntermediate);

        for (const inter of candidateIntermediates) {
          // In senior archetype, guarantee prerequisite satisfaction
          // In intermediate archetype, allow some to have missing prerequisites to create realistic skill gaps!
          const directPrereqs = skillPrereqMap.get(inter.skillId) || [];
          const hasPrereqs = directPrereqs.every((p) => assignedSkillIds.has(p));

          if (archetype === 'senior' || hasPrereqs || this.rng.boolean(0.5)) {
            // For seniors, backfill any missing prerequisites so their learning path is complete!
            if (archetype === 'senior') {
              const allUpstream = getTransitivePrerequisites(inter.skillId, skillPrereqMap);
              for (const u of allUpstream) {
                if (!assignedSkillIds.has(u)) {
                  assignedSkillIds.add(u);
                  studentSkills.push({
                    skillId: u,
                    level: 'intermediate',
                    acquiredAt: new Date(this.baseEpoch - 200 * 86400000),
                  });
                }
              }
            }
            if (!assignedSkillIds.has(inter.skillId)) {
              assignedSkillIds.add(inter.skillId);
              studentSkills.push({
                skillId: inter.skillId,
                level: archetype === 'senior' ? 'advanced' : 'intermediate',
                acquiredAt: new Date(this.baseEpoch - 150 * 86400000),
              });
            }
          }
        }
      }

      // If Senior, grant advanced skills
      if (archetype === 'senior') {
        const numAdv = this.rng.nextInt(2, 4);
        const candidateAdv = this.rng.sample(advancedSkills, numAdv);
        for (const adv of candidateAdv) {
          // Backfill prerequisites for senior
          const allUpstream = getTransitivePrerequisites(adv.skillId, skillPrereqMap);
          for (const u of allUpstream) {
            if (!assignedSkillIds.has(u)) {
              assignedSkillIds.add(u);
              studentSkills.push({
                skillId: u,
                level: 'intermediate',
                acquiredAt: new Date(this.baseEpoch - 250 * 86400000),
              });
            }
          }
          if (!assignedSkillIds.has(adv.skillId)) {
            assignedSkillIds.add(adv.skillId);
            studentSkills.push({
              skillId: adv.skillId,
              level: 'advanced',
              acquiredAt: new Date(this.baseEpoch - 80 * 86400000),
            });
          }
        }
      }

      // Determine Completed Courses strictly consistent with semester
      const eligibleCourses = courses.filter((c) => Math.min(...c.semesterOffered) < semester);
      const numCourses = Math.min(eligibleCourses.length, Math.max(1, (semester - 1) * 2));
      const completedCourseList = this.rng.sample(eligibleCourses, numCourses).map((c) => ({
        courseId: c.courseId,
        grade: this.rng.pick(['A+', 'A', 'B+', 'B']),
        completedSemester: Math.min(...c.semesterOffered),
        completedAt: new Date(this.baseEpoch - (semester - Math.min(...c.semesterOffered)) * 120 * 86400000),
      }));

      // Project memberships
      const studentProjects = archetype === 'beginner' ? [] : this.rng.sample(projects, this.rng.nextInt(1, 2)).map((p) => p.projectId);

      // Club memberships
      const studentClubs = this.rng.sample(clubs, this.rng.nextInt(0, 2)).map((cl) => ({
        clubId: cl.clubId,
        role: archetype === 'senior' && this.rng.boolean(0.3) ? 'Lead' : 'Member',
        joinedAt: new Date(this.baseEpoch - 200 * 86400000),
      }));

      // Attended events
      const attendedEvents = this.rng.sample(events, this.rng.nextInt(1, 4)).map((e) => e.eventId);

      students.push({
        studentId,
        rollNumber,
        name,
        email,
        department: dept,
        currentSemester: semester,
        cgpa,
        interests,
        skills: studentSkills,
        completedCourses: completedCourseList,
        projectIds: studentProjects,
        clubMemberships: studentClubs,
        attendedEventIds: attendedEvents,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-03-01T00:00:00Z'),
      });
    }

    return students;
  }

  private generateCassandraTelemetry(
    students: any[],
    courses: any[],
    projects: any[],
    resources: any[],
    events: any[]
  ): { studentActivity: any[]; resourceAccess: any[]; recommendationAudit: any[] } {
    const studentActivity: any[] = [];
    const resourceAccess: any[] = [];
    const recommendationAudit: any[] = [];

    const actionTypes = ['VIEW_COURSE', 'EXPLORE_PROJECT', 'RUN_RECOMMENDATION', 'ACCESS_RESOURCE', 'ATTEND_EVENT'];

    const BASE_TIMESTAMP = new Date('2024-03-01T00:00:00.000Z').getTime();

    // Generate telemetry for each student across the past 30 days
    for (const student of students) {
      // Small: 10-15 events per student, Medium: 12-18, Large: 15-20
      const eventsCount = this.scale === 'small' ? this.rng.nextInt(10, 15) : this.rng.nextInt(12, 18);

      for (let j = 0; j < eventsCount; j++) {
        const daysAgo = this.rng.nextInt(0, 30);
        const eventTimestamp = new Date(BASE_TIMESTAMP - daysAgo * 86400000 - this.rng.nextInt(0, 86400) * 1000);
        const activityDate = eventTimestamp.toISOString().split('T')[0];
        const eventId = `00000000-0000-4000-8000-${String(studentActivity.length + 1).padStart(12, '0')}`;

        const action = this.rng.pick(actionTypes);
        let targetType = 'COURSE';
        let targetId = this.rng.pick(courses).courseId;
        let metadata: Record<string, any> = { source: 'web_dashboard' };

        if (action === 'EXPLORE_PROJECT') {
          targetType = 'PROJECT';
          targetId = this.rng.pick(projects).projectId;
          metadata = { domain: this.rng.pick(DOMAINS) };
        } else if (action === 'ACCESS_RESOURCE') {
          targetType = 'RESOURCE';
          const res = this.rng.pick(resources);
          targetId = res.resourceId;
          const duration = this.rng.nextInt(120, 3600);
          metadata = { durationSeconds: duration };

          // Also record in resource_access_history
          const yearMonth = activityDate.slice(0, 7);
          resourceAccess.push({
            resource_id: targetId,
            year_month: yearMonth,
            event_timestamp: eventTimestamp,
            event_id: eventId,
            student_id: student.studentId,
            duration_seconds: duration,
          });
        } else if (action === 'RUN_RECOMMENDATION') {
          targetType = 'RECOMMENDATION';
          const recType = this.rng.pick(['PROJECT', 'LEARNING_PATH', 'JOB']);
          targetId = recType;
          metadata = { executionTimeMs: Number(this.rng.nextFloat(15, 65).toFixed(2)) };

          // Also record in recommendation_audit_log
          recommendationAudit.push({
            student_id: student.studentId,
            rec_type: recType,
            generated_at: eventTimestamp,
            rec_id: eventId,
            target_item_id: recType === 'PROJECT' ? this.rng.pick(projects).projectId : 'sk_genai',
            final_score: Number(this.rng.nextFloat(0.65, 0.96).toFixed(3)),
            score_breakdown_json: JSON.stringify({
              skill_match: Number(this.rng.nextFloat(0.6, 1.0).toFixed(2)),
              prereq_match: Number(this.rng.nextFloat(0.5, 1.0).toFixed(2)),
              interest_match: Number(this.rng.nextFloat(0.7, 1.0).toFixed(2)),
            }),
          });
        } else if (action === 'ATTEND_EVENT') {
          targetType = 'EVENT';
          targetId = this.rng.pick(events).eventId;
          metadata = { attended: true };
        }

        studentActivity.push({
          student_id: student.studentId,
          activity_date: activityDate,
          event_timestamp: eventTimestamp,
          event_id: eventId,
          action_type: action,
          target_entity_type: targetType,
          target_entity_id: targetId,
          metadata_json: JSON.stringify(metadata),
        });
      }
    }

    return {
      studentActivity,
      resourceAccess,
      recommendationAudit,
    };
  }
}
