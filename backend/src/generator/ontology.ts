export interface SkillDefinition {
  id: string;
  name: string;
  category: 'Programming' | 'Data Science & AI' | 'Web Development' | 'Cloud & DevOps' | 'Cybersecurity' | 'Systems & Hardware';
  tier: 'foundational' | 'intermediate' | 'advanced' | 'specialized';
  description: string;
  prerequisites: string[]; // parent skill IDs
}

export const CURATED_SKILLS: SkillDefinition[] = [
  // --- Programming (Foundational to Advanced) ---
  {
    id: 'sk_python',
    name: 'Python',
    category: 'Programming',
    tier: 'foundational',
    description: 'Core syntax, data structures, and object-oriented programming in Python.',
    prerequisites: [],
  },
  {
    id: 'sk_cpp',
    name: 'C++',
    category: 'Programming',
    tier: 'foundational',
    description: 'Memory management, pointers, and modern C++ object-oriented paradigms.',
    prerequisites: [],
  },
  {
    id: 'sk_javascript',
    name: 'JavaScript / TypeScript',
    category: 'Programming',
    tier: 'foundational',
    description: 'Event-driven programming, asynchronous execution, and TypeScript static typing.',
    prerequisites: [],
  },
  {
    id: 'sk_dsa',
    name: 'Data Structures & Algorithms',
    category: 'Programming',
    tier: 'intermediate',
    description: 'Trees, graphs, dynamic programming, sorting, and algorithmic complexity analysis.',
    prerequisites: ['sk_python', 'sk_cpp'],
  },

  // --- Web Development ---
  {
    id: 'sk_html_css',
    name: 'HTML5 & Modern CSS',
    category: 'Web Development',
    tier: 'foundational',
    description: 'Semantic markup, Flexbox, CSS Grid, and responsive UI layouts.',
    prerequisites: [],
  },
  {
    id: 'sk_react',
    name: 'React.js & Next.js',
    category: 'Web Development',
    tier: 'intermediate',
    description: 'Component lifecycles, React hooks, state management, and Server-Side Rendering.',
    prerequisites: ['sk_javascript', 'sk_html_css'],
  },
  {
    id: 'sk_nodejs',
    name: 'Node.js & Express API Design',
    category: 'Web Development',
    tier: 'intermediate',
    description: 'RESTful API construction, middleware, asynchronous I/O, and token authentication.',
    prerequisites: ['sk_javascript'],
  },
  {
    id: 'sk_graphql',
    name: 'GraphQL & Apollo',
    category: 'Web Development',
    tier: 'advanced',
    description: 'Declarative data fetching, schema definitions, resolvers, and subscriptions.',
    prerequisites: ['sk_nodejs'],
  },
  {
    id: 'sk_fullstack',
    name: 'Full-Stack Architecture',
    category: 'Web Development',
    tier: 'advanced',
    description: 'End-to-end web architecture, micro-frontends, caching strategies, and API gateways.',
    prerequisites: ['sk_react', 'sk_nodejs'],
  },

  // --- Data Science & AI ---
  {
    id: 'sk_math_stats',
    name: 'Linear Algebra & Statistics',
    category: 'Data Science & AI',
    tier: 'foundational',
    description: 'Probability distributions, matrix transformations, regression, and hypothesis testing.',
    prerequisites: [],
  },
  {
    id: 'sk_data_analysis',
    name: 'Data Analysis (Pandas/NumPy)',
    category: 'Data Science & AI',
    tier: 'intermediate',
    description: 'Data wrangling, matrix manipulation, aggregation, and visualization with Matplotlib/Seaborn.',
    prerequisites: ['sk_python', 'sk_math_stats'],
  },
  {
    id: 'sk_ml',
    name: 'Classical Machine Learning',
    category: 'Data Science & AI',
    tier: 'intermediate',
    description: 'Supervised/unsupervised algorithms: SVM, Random Forests, K-Means, and model evaluation.',
    prerequisites: ['sk_data_analysis', 'sk_math_stats'],
  },
  {
    id: 'sk_deep_learning',
    name: 'Deep Learning & Neural Networks',
    category: 'Data Science & AI',
    tier: 'advanced',
    description: 'Backpropagation, CNNs, RNNs, and framework implementations using PyTorch or TensorFlow.',
    prerequisites: ['sk_ml'],
  },
  {
    id: 'sk_nlp',
    name: 'Natural Language Processing',
    category: 'Data Science & AI',
    tier: 'advanced',
    description: 'Tokenization, embeddings (Word2Vec), Transformers, attention mechanisms, and BERT.',
    prerequisites: ['sk_deep_learning'],
  },
  {
    id: 'sk_genai',
    name: 'Generative AI & LLM Systems',
    category: 'Data Science & AI',
    tier: 'specialized',
    description: 'Retrieval-Augmented Generation (RAG), vector embeddings, fine-tuning, and prompt architectures.',
    prerequisites: ['sk_nlp'],
  },
  {
    id: 'sk_computer_vision',
    name: 'Computer Vision',
    category: 'Data Science & AI',
    tier: 'specialized',
    description: 'Object detection (YOLO), segmentation, image feature extraction, and OpenCV pipelines.',
    prerequisites: ['sk_deep_learning'],
  },

  // --- Cloud & DevOps ---
  {
    id: 'sk_linux',
    name: 'Linux Shell & Systems Administration',
    category: 'Cloud & DevOps',
    tier: 'foundational',
    description: 'Bash scripting, file permissions, process management, and networking essentials.',
    prerequisites: [],
  },
  {
    id: 'sk_docker',
    name: 'Docker & Containerization',
    category: 'Cloud & DevOps',
    tier: 'intermediate',
    description: 'Multi-stage Dockerfiles, image optimization, volumes, and Docker Compose networking.',
    prerequisites: ['sk_linux'],
  },
  {
    id: 'sk_kubernetes',
    name: 'Kubernetes Orchestration',
    category: 'Cloud & DevOps',
    tier: 'advanced',
    description: 'Pods, Deployments, Services, ConfigMaps, Ingress controllers, and Helm charts.',
    prerequisites: ['sk_docker'],
  },
  {
    id: 'sk_ci_cd',
    name: 'CI/CD Pipelines',
    category: 'Cloud & DevOps',
    tier: 'intermediate',
    description: 'GitHub Actions, automated test pipelines, artifact publishing, and blue-green deployments.',
    prerequisites: ['sk_linux', 'sk_docker'],
  },
  {
    id: 'sk_cloud_aws',
    name: 'Cloud Infrastructure (AWS/GCP)',
    category: 'Cloud & DevOps',
    tier: 'advanced',
    description: 'Compute (EC2/Lambda), storage (S3), VPC networks, IAM policies, and infrastructure-as-code.',
    prerequisites: ['sk_docker', 'sk_linux'],
  },

  // --- Databases & Distributed Systems ---
  {
    id: 'sk_sql',
    name: 'Relational Database Design (SQL)',
    category: 'Programming',
    tier: 'foundational',
    description: 'Schema normalization, ACID transactions, indexing, and complex SQL joins.',
    prerequisites: [],
  },
  {
    id: 'sk_nosql',
    name: 'NoSQL Multi-Model Persistence',
    category: 'Programming',
    tier: 'intermediate',
    description: 'Document, graph, key-value, and column-family models; CAP theorem, BASE, and replication.',
    prerequisites: ['sk_sql'],
  },
  {
    id: 'sk_dist_systems',
    name: 'Distributed Systems & Concurrency',
    category: 'Systems & Hardware',
    tier: 'advanced',
    description: 'Consensus algorithms (Raft), vector clocks, partitioning, RPCs, and event-driven messaging.',
    prerequisites: ['sk_nosql', 'sk_dsa'],
  },

  // --- Cybersecurity ---
  {
    id: 'sk_networks',
    name: 'Computer Networks & Protocols',
    category: 'Cybersecurity',
    tier: 'foundational',
    description: 'TCP/IP stack, DNS, HTTP/HTTPS, TLS handshake, socket programming, and routing.',
    prerequisites: [],
  },
  {
    id: 'sk_cyber_sec',
    name: 'Network Security & Cryptography',
    category: 'Cybersecurity',
    tier: 'intermediate',
    description: 'Symmetric/asymmetric encryption, PKI, firewall design, and vulnerability assessments.',
    prerequisites: ['sk_networks'],
  },
  {
    id: 'sk_web_sec',
    name: 'Web Application Security',
    category: 'Cybersecurity',
    tier: 'advanced',
    description: 'OWASP Top 10, XSS, CSRF, SQL Injection, penetration testing, and secure coding practices.',
    prerequisites: ['sk_cyber_sec', 'sk_nodejs'],
  },
];

export const DOMAINS = [
  'Artificial Intelligence',
  'Full-Stack Web Development',
  'Cloud & DevOps Engineering',
  'Cybersecurity & Network Defense',
  'Data Engineering & Big Data',
  'Distributed Systems',
  'Mobile Application Development',
  'Autonomous Systems & Robotics',
];

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Data Science & Analytics',
  'Artificial Intelligence & ML',
];

export const CLUBS_DATA = [
  { id: 'cl_acm', name: 'ACM Student Chapter', category: 'Technical', desc: 'Promoting computer science research, competitive programming, and technical hackathons.' },
  { id: 'cl_ieee', name: 'IEEE Computer Society', category: 'Technical', desc: 'Workshops, research paper presentations, and international robotics challenges.' },
  { id: 'cl_gdsc', name: 'Google Developer Student Club', category: 'Technical', desc: 'Hands-on tracks in Android, Cloud, Web, and machine learning.' },
  { id: 'cl_cyber', name: 'NullCampus Cybersecurity Club', category: 'Technical', desc: 'Capture The Flag (CTF) challenges, ethical hacking, and vulnerability hunting.' },
  { id: 'cl_ai_lab', name: 'Intelligence & Robotics Guild', category: 'Technical', desc: 'Building autonomous rovers, drone swarms, and neural agent models.' },
  { id: 'cl_open_source', name: 'FOSS Campus Collective', category: 'Technical', desc: 'Contributing to upstream Linux, open-source software, and public goods.' },
];

export const FACILITIES_DATA = [
  { id: 'fac_lab1', name: 'Turing Advanced Computing Lab', bldg: 'Alan Turing Block', room: '301', type: 'Computer Lab', cap: 60 },
  { id: 'fac_lab2', name: 'Distributed Systems & Cloud Lab', bldg: 'Grace Hopper Hall', room: '204', type: 'Computer Lab', cap: 50 },
  { id: 'fac_audi', name: 'Kalam Central Auditorium', bldg: 'Main Academic Wing', room: 'Audi-A', type: 'Auditorium', cap: 450 },
  { id: 'fac_innov', name: 'Campus Innovation Sandbox', bldg: 'Entrepreneurship Block', room: 'Innov-10', type: 'Innovation Hub', cap: 80 },
  { id: 'fac_seminar', name: 'Von Neumann Seminar Hall', bldg: 'Alan Turing Block', room: '105', type: 'Seminar Hall', cap: 120 },
];
