export interface CareerRoleData {
  roleId: string;
  title: string;
  slug: string;
  category: 'Software Engineering' | 'Web Development' | 'Data Science & AI' | 'Cloud & DevOps' | 'Cybersecurity' | 'Systems & Hardware';
  description: string;
  summary: string;
  requiredSkillIds: string[];
  preferredSkillIds: string[];
  typicalJobTitles: string[];
  averageSalaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  demandLevel: 'High' | 'Very High' | 'Moderate';
  growthRate: string;
  keyResponsibilities: string[];
}

export const CURATED_CAREER_ROLES: CareerRoleData[] = [
  {
    roleId: 'role_frontend_developer',
    title: 'Frontend Developer',
    slug: 'frontend-developer',
    category: 'Web Development',
    description: 'Specializes in creating accessible, responsive, and performant user interfaces for web and mobile web applications.',
    summary: 'Focuses on client-side state management, modern component design systems with React and TypeScript, and cross-browser rendering optimization.',
    requiredSkillIds: ['sk_html_css', 'sk_javascript', 'sk_react'],
    preferredSkillIds: ['sk_graphql', 'sk_web_sec', 'sk_dsa'],
    typicalJobTitles: ['Junior Frontend Developer', 'React Frontend Engineer', 'UI/UX Web Engineer'],
    averageSalaryRange: { min: 75000, max: 115000, currency: 'USD' },
    demandLevel: 'Very High',
    growthRate: '+16% through 2030',
    keyResponsibilities: [
      'Translate design wireframes into responsive, high-performance web components.',
      'Manage client-side application state and optimize rendering performance.',
      'Integrate RESTful and GraphQL backend endpoints safely with client-side caching.',
    ],
  },
  {
    roleId: 'role_backend_developer',
    title: 'Backend Developer',
    slug: 'backend-developer',
    category: 'Software Engineering',
    description: 'Designs, implements, and maintains scalable server architectures, resilient APIs, and transactional database persistence layers.',
    summary: 'Specializes in asynchronous execution, secure authentication, API contracts, and database query optimization.',
    requiredSkillIds: ['sk_javascript', 'sk_nodejs', 'sk_sql'],
    preferredSkillIds: ['sk_nosql', 'sk_docker', 'sk_dist_systems', 'sk_graphql'],
    typicalJobTitles: ['Junior Backend Engineer', 'Node.js Developer', 'API Platform Engineer'],
    averageSalaryRange: { min: 82000, max: 125000, currency: 'USD' },
    demandLevel: 'Very High',
    growthRate: '+18% through 2030',
    keyResponsibilities: [
      'Architect robust REST and GraphQL APIs with middleware pipelines and validation.',
      'Design relational and multi-model database schemas with proper index structures.',
      'Ensure secure data storage, authentication, and horizontal scalability.',
    ],
  },
  {
    roleId: 'role_fullstack_developer',
    title: 'Full-Stack Developer',
    slug: 'fullstack-developer',
    category: 'Web Development',
    description: 'Bridges frontend customer experiences with backend microservices and database tiers for complete application delivery.',
    summary: 'Delivers full end-to-end features spanning client interfaces, middle-tier API services, relational and NoSQL data stores, and CI deployment.',
    requiredSkillIds: ['sk_html_css', 'sk_javascript', 'sk_react', 'sk_nodejs', 'sk_sql'],
    preferredSkillIds: ['sk_nosql', 'sk_fullstack', 'sk_docker', 'sk_graphql', 'sk_ci_cd'],
    typicalJobTitles: ['Full-Stack Software Engineer', 'Full-Stack Web Developer', 'Product Engineer'],
    averageSalaryRange: { min: 88000, max: 132000, currency: 'USD' },
    demandLevel: 'Very High',
    growthRate: '+20% through 2030',
    keyResponsibilities: [
      'Develop end-to-end user workflows from interactive browser UI to backend persistence.',
      'Coordinate API contracts between frontend state stores and backend controllers.',
      'Implement full-stack testing, containerization, and automated deployment pipelines.',
    ],
  },
  {
    roleId: 'role_data_analyst',
    title: 'Data Analyst',
    slug: 'data-analyst',
    category: 'Data Science & AI',
    description: 'Transforms complex raw datasets into actionable commercial and academic insights, reports, and interactive dashboards.',
    summary: 'Specializes in exploratory data analysis, statistical tests, data wrangling with Pandas/NumPy, and relational data querying with SQL.',
    requiredSkillIds: ['sk_python', 'sk_sql', 'sk_math_stats', 'sk_data_analysis'],
    preferredSkillIds: ['sk_ml', 'sk_nosql'],
    typicalJobTitles: ['Junior Data Analyst', 'Business Intelligence Analyst', 'Quantitative Product Analyst'],
    averageSalaryRange: { min: 70000, max: 105000, currency: 'USD' },
    demandLevel: 'High',
    growthRate: '+14% through 2030',
    keyResponsibilities: [
      'Execute multi-table SQL queries and data transformations on operational databases.',
      'Conduct hypothesis tests, regression analysis, and variance assessments.',
      'Synthesize tabular insights into executive dashboards and narrative summaries.',
    ],
  },
  {
    roleId: 'role_data_engineer',
    title: 'Data Engineer',
    slug: 'data-engineer',
    category: 'Data Science & AI',
    description: 'Builds scalable data aggregation pipelines, ETL/ELT workflows, distributed storage, and streaming infrastructure.',
    summary: 'Combines systems engineering with database optimization across relational, column-family, and document stores in Linux environments.',
    requiredSkillIds: ['sk_python', 'sk_sql', 'sk_nosql', 'sk_linux'],
    preferredSkillIds: ['sk_dist_systems', 'sk_docker', 'sk_cloud_aws', 'sk_dsa'],
    typicalJobTitles: ['Data Pipeline Engineer', 'Analytics Engineer', 'Big Data Developer'],
    averageSalaryRange: { min: 92000, max: 138000, currency: 'USD' },
    demandLevel: 'Very High',
    growthRate: '+22% through 2030',
    keyResponsibilities: [
      'Construct high-throughput ingestion pipelines across polyglot database systems.',
      'Maintain warehouse partitioning, indexing strategies, and automated data validation.',
      'Optimize distributed queries and batch processing jobs for low latency.',
    ],
  },
  {
    roleId: 'role_ml_engineer',
    title: 'Machine Learning Engineer',
    slug: 'machine-learning-engineer',
    category: 'Data Science & AI',
    description: 'Develops, validates, benchmarks, and deploys predictive statistical models and machine learning pipelines into production.',
    summary: 'Merges mathematical modeling, feature engineering, loss evaluation, and production software engineering.',
    requiredSkillIds: ['sk_python', 'sk_math_stats', 'sk_data_analysis', 'sk_ml'],
    preferredSkillIds: ['sk_deep_learning', 'sk_docker', 'sk_dsa', 'sk_sql'],
    typicalJobTitles: ['Machine Learning Engineer', 'Applied ML Scientist', 'Model Deployment Specialist'],
    averageSalaryRange: { min: 96000, max: 146000, currency: 'USD' },
    demandLevel: 'Very High',
    growthRate: '+24% through 2030',
    keyResponsibilities: [
      'Design feature engineering pipelines and evaluate supervised/unsupervised model metrics.',
      'Mitigate model drift, overfitting, and bias using statistical cross-validation.',
      'Containerize and deploy inference services with latency and throughput SLAs.',
    ],
  },
  {
    roleId: 'role_ai_engineer',
    title: 'AI Engineer',
    slug: 'ai-engineer',
    category: 'Data Science & AI',
    description: 'Builds state-of-the-art intelligent systems utilizing deep neural networks, transformer architectures, and modern LLM pipelines.',
    summary: 'Focuses on deep learning architectures, transfer learning, vector embeddings, fine-tuning, and Retrieval-Augmented Generation (RAG).',
    requiredSkillIds: ['sk_python', 'sk_ml', 'sk_deep_learning', 'sk_nlp'],
    preferredSkillIds: ['sk_genai', 'sk_computer_vision', 'sk_docker', 'sk_cloud_aws'],
    typicalJobTitles: ['AI Solutions Engineer', 'GenAI Application Developer', 'Deep Learning Engineer'],
    averageSalaryRange: { min: 105000, max: 158000, currency: 'USD' },
    demandLevel: 'Very High',
    growthRate: '+28% through 2030',
    keyResponsibilities: [
      'Construct neural network training and evaluation pipelines with PyTorch/TensorFlow.',
      'Implement RAG pipelines with vector databases, semantic re-ranking, and prompt chains.',
      'Fine-tune foundation models for specialized domain tasks with guardrail evaluations.',
    ],
  },
  {
    roleId: 'role_cloud_engineer',
    title: 'Cloud Engineer',
    slug: 'cloud-engineer',
    category: 'Cloud & DevOps',
    description: 'Provisions, configures, and secures multi-region cloud infrastructures, virtual networks, and serverless compute platforms.',
    summary: 'Specializes in AWS/GCP architecture, VPC networking, Linux administration, and containerized deployment topologies.',
    requiredSkillIds: ['sk_linux', 'sk_docker', 'sk_cloud_aws', 'sk_networks'],
    preferredSkillIds: ['sk_kubernetes', 'sk_ci_cd', 'sk_nosql', 'sk_cyber_sec'],
    typicalJobTitles: ['Cloud Systems Engineer', 'AWS Cloud Architect', 'Infrastructure Engineer'],
    averageSalaryRange: { min: 88000, max: 135000, currency: 'USD' },
    demandLevel: 'High',
    growthRate: '+19% through 2030',
    keyResponsibilities: [
      'Architect and provision fault-tolerant cloud resources using Infrastructure as Code.',
      'Configure secure subnets, security groups, gateways, and IAM policy boundaries.',
      'Monitor cloud resource utilization, disaster recovery, and cost efficiency.',
    ],
  },
  {
    roleId: 'role_devops_engineer',
    title: 'DevOps Engineer',
    slug: 'devops-engineer',
    category: 'Cloud & DevOps',
    description: 'Automates delivery workflows, manages Kubernetes clusters, and establishes site reliability and observability standards.',
    summary: 'Connects development and operations through automated CI/CD pipelines, container orchestration, and continuous monitoring.',
    requiredSkillIds: ['sk_linux', 'sk_docker', 'sk_kubernetes', 'sk_ci_cd'],
    preferredSkillIds: ['sk_cloud_aws', 'sk_python', 'sk_web_sec', 'sk_dist_systems'],
    typicalJobTitles: ['DevOps Engineer', 'Site Reliability Engineer (SRE)', 'Platform Engineer'],
    averageSalaryRange: { min: 94000, max: 142000, currency: 'USD' },
    demandLevel: 'Very High',
    growthRate: '+21% through 2030',
    keyResponsibilities: [
      'Construct automated CI/CD pipelines with rigorous automated testing and gate checks.',
      'Manage multi-node Kubernetes clusters, ingress controllers, and Helm deployments.',
      'Implement telemetry, alerts, and incident response playbooks for 99.9% uptime.',
    ],
  },
  {
    roleId: 'role_cybersecurity_analyst',
    title: 'Cybersecurity Analyst',
    slug: 'cybersecurity-analyst',
    category: 'Cybersecurity',
    description: 'Defends digital infrastructure against unauthorized intrusions, analyzes network anomalies, and performs security assessments.',
    summary: 'Specializes in TCP/IP packet inspection, cryptographic key management, penetration testing, and web application attack mitigation.',
    requiredSkillIds: ['sk_networks', 'sk_cyber_sec', 'sk_web_sec', 'sk_linux'],
    preferredSkillIds: ['sk_python', 'sk_cloud_aws', 'sk_sql'],
    typicalJobTitles: ['Information Security Analyst', 'SOC Analyst', 'Application Security Specialist'],
    averageSalaryRange: { min: 86000, max: 130000, currency: 'USD' },
    demandLevel: 'Very High',
    growthRate: '+25% through 2030',
    keyResponsibilities: [
      'Monitor and audit network firewalls, DNS traffic, and cryptographic configurations.',
      'Perform vulnerability scans, penetration tests, and OWASP Top 10 remediation.',
      'Conduct incident triage and formulate post-mortem security posture enhancements.',
    ],
  },
];
