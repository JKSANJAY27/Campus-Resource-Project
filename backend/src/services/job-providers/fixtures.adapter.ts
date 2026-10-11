import { IJobProviderAdapter } from './job-provider.interface.js';
import {
  NormalizedJob,
  JobSearchParams,
  JobAttribution,
} from '../../types/job-provider.types.js';

/**
 * High-fidelity synthetic development fixtures for offline environments,
 * automated testing, and when external job APIs are rate-limited or unavailable.
 *
 * NOTE: As required by system constraints, these are NEVER labeled as live listings.
 * `isLive` is permanently set to `false`.
 */
export const SYNTHETIC_DEVELOPMENT_FIXTURES: Omit<NormalizedJob, 'retrievedAt'>[] = [
  {
    id: 'fixture_job_001',
    externalId: 'fix_001',
    provider: 'development_fixture',
    sourceName: 'Development Fixture (Offline Simulation)',
    title: 'Junior Frontend Developer (React & TypeScript)',
    company: 'Campus Tech Ventures',
    companyLogo: null,
    description: 'We are seeking a junior frontend developer to contribute to our student dashboard and interactive resource visualizers. Hands-on experience with React, Tailwind CSS, and TypeScript is preferred.',
    excerpt: 'Junior frontend engineer with React and TypeScript for campus application interfaces.',
    location: 'Bangalore, India (Hybrid)',
    workArrangement: 'hybrid',
    employmentType: 'full-time',
    experienceLevel: 'entry',
    category: 'Web Development',
    tags: ['React', 'TypeScript', 'TailwindCSS', 'Next.js', 'Frontend'],
    salary: {
      min: 450000,
      max: 750000,
      currency: 'INR',
      period: 'yearly',
      raw: '₹4.5L - ₹7.5L / year',
    },
    publicationDate: '2026-10-01T08:00:00.000Z',
    originalUrl: 'https://campus-resources.edu/placements/jobs/fix_001',
    isLive: false,
    attribution: {
      text: 'Synthetic development fixture for offline simulation and automated testing. Not a live commercial listing.',
      url: 'https://campus-resources.edu',
      required: false,
    },
  },
  {
    id: 'fixture_job_002',
    externalId: 'fix_002',
    provider: 'development_fixture',
    sourceName: 'Development Fixture (Offline Simulation)',
    title: 'Backend Node.js & API Engineer',
    company: 'CloudMatrix Research Lab',
    companyLogo: null,
    description: 'Build robust REST and GraphQL API services backed by MongoDB and Redis. Ideal for candidates with knowledge of asynchronous Node.js, Express, and distributed caching.',
    excerpt: 'API and database systems developer building high-throughput services with Node.js and NoSQL.',
    location: 'Remote (India / Global)',
    workArrangement: 'remote',
    employmentType: 'full-time',
    experienceLevel: 'mid',
    category: 'Software Engineering',
    tags: ['Node.js', 'Express', 'MongoDB', 'Redis', 'TypeScript', 'Backend'],
    salary: {
      min: 700000,
      max: 1200000,
      currency: 'INR',
      period: 'yearly',
      raw: '₹7.0L - ₹12.0L / year',
    },
    publicationDate: '2026-10-02T10:30:00.000Z',
    originalUrl: 'https://campus-resources.edu/placements/jobs/fix_002',
    isLive: false,
    attribution: {
      text: 'Synthetic development fixture for offline simulation and automated testing. Not a live commercial listing.',
      url: 'https://campus-resources.edu',
      required: false,
    },
  },
  {
    id: 'fixture_job_003',
    externalId: 'fix_003',
    provider: 'development_fixture',
    sourceName: 'Development Fixture (Offline Simulation)',
    title: 'Associate Machine Learning Engineer',
    company: 'NeuralPathway AI Labs',
    companyLogo: null,
    description: 'Work with research scientists to deploy machine learning inference models, fine-tune open weights, and build feature extraction pipelines in Python with PyTorch.',
    excerpt: 'Applied ML engineer building inference pipelines with Python, PyTorch, and scikit-learn.',
    location: 'Hyderabad, India (On-Site)',
    workArrangement: 'on-site',
    employmentType: 'full-time',
    experienceLevel: 'entry',
    category: 'Data Science & AI',
    tags: ['Python', 'Machine Learning', 'PyTorch', 'Data Analysis', 'scikit-learn'],
    salary: {
      min: 600000,
      max: 1000000,
      currency: 'INR',
      period: 'yearly',
      raw: '₹6.0L - ₹10.0L / year',
    },
    publicationDate: '2026-10-04T12:00:00.000Z',
    originalUrl: 'https://campus-resources.edu/placements/jobs/fix_003',
    isLive: false,
    attribution: {
      text: 'Synthetic development fixture for offline simulation and automated testing. Not a live commercial listing.',
      url: 'https://campus-resources.edu',
      required: false,
    },
  },
  {
    id: 'fixture_job_004',
    externalId: 'fix_004',
    provider: 'development_fixture',
    sourceName: 'Development Fixture (Offline Simulation)',
    title: 'Cloud DevOps & Infrastructure Intern',
    company: 'SkyScale Systems',
    companyLogo: null,
    description: 'Assist in configuring automated CI/CD deployment pipelines with GitHub Actions, containerizing backend services using Docker, and monitoring clusters.',
    excerpt: 'DevOps internship focusing on Docker containerization, CI/CD pipelines, and cloud telemetry.',
    location: 'Remote (Worldwide)',
    workArrangement: 'remote',
    employmentType: 'internship',
    experienceLevel: 'entry',
    category: 'Cloud & DevOps',
    tags: ['Docker', 'Linux', 'CI/CD', 'GitHub Actions', 'AWS', 'DevOps'],
    salary: {
      min: 25000,
      max: 40000,
      currency: 'INR',
      period: 'monthly',
      raw: '₹25,000 - ₹40,000 / month',
    },
    publicationDate: '2026-10-05T09:15:00.000Z',
    originalUrl: 'https://campus-resources.edu/placements/jobs/fix_004',
    isLive: false,
    attribution: {
      text: 'Synthetic development fixture for offline simulation and automated testing. Not a live commercial listing.',
      url: 'https://campus-resources.edu',
      required: false,
    },
  },
  {
    id: 'fixture_job_005',
    externalId: 'fix_005',
    provider: 'development_fixture',
    sourceName: 'Development Fixture (Offline Simulation)',
    title: 'Junior Cybersecurity Analyst',
    company: 'SecureNet Digital Defense',
    companyLogo: null,
    description: 'Monitor intrusion detection systems, assess web application vulnerability reports (OWASP Top 10), and participate in internal defensive audits.',
    excerpt: 'Junior security analyst performing vulnerability assessments and security log analysis.',
    location: 'Pune, India (Hybrid)',
    workArrangement: 'hybrid',
    employmentType: 'full-time',
    experienceLevel: 'entry',
    category: 'Cybersecurity',
    tags: ['Network Security', 'OWASP', 'Linux', 'Vulnerability Assessment', 'Security'],
    salary: {
      min: 500000,
      max: 850000,
      currency: 'INR',
      period: 'yearly',
      raw: '₹5.0L - ₹8.5L / year',
    },
    publicationDate: '2026-10-06T14:45:00.000Z',
    originalUrl: 'https://campus-resources.edu/placements/jobs/fix_005',
    isLive: false,
    attribution: {
      text: 'Synthetic development fixture for offline simulation and automated testing. Not a live commercial listing.',
      url: 'https://campus-resources.edu',
      required: false,
    },
  },
  {
    id: 'fixture_job_006',
    externalId: 'fix_006',
    provider: 'development_fixture',
    sourceName: 'Development Fixture (Offline Simulation)',
    title: 'Data Analyst & BI Specialist',
    company: 'Campus Academic Analytics',
    companyLogo: null,
    description: 'Write analytical SQL queries, construct data pipelines for student performance telemetry, and build executive reporting dashboards in Tableau or PowerBI.',
    excerpt: 'Data analyst writing SQL queries and visualizing learning metrics.',
    location: 'Remote (India)',
    workArrangement: 'remote',
    employmentType: 'full-time',
    experienceLevel: 'entry',
    category: 'Data Science & AI',
    tags: ['SQL', 'Python', 'Data Visualization', 'Tableau', 'Excel'],
    salary: {
      min: 400000,
      max: 700000,
      currency: 'INR',
      period: 'yearly',
      raw: '₹4.0L - ₹7.0L / year',
    },
    publicationDate: '2026-10-07T11:20:00.000Z',
    originalUrl: 'https://campus-resources.edu/placements/jobs/fix_006',
    isLive: false,
    attribution: {
      text: 'Synthetic development fixture for offline simulation and automated testing. Not a live commercial listing.',
      url: 'https://campus-resources.edu',
      required: false,
    },
  },
  {
    id: 'fixture_job_007',
    externalId: 'fix_007',
    provider: 'development_fixture',
    sourceName: 'Development Fixture (Offline Simulation)',
    title: 'Full-Stack Web Development Contractor',
    company: 'Apex Digital Studio',
    companyLogo: null,
    description: 'Develop client-facing web portals and REST APIs using Next.js, Node.js, and MongoDB. Fast-paced 6-month contract with possibility of full-time conversion.',
    excerpt: 'Contract full-stack engineer delivering end-to-end features with Next.js and Node.js.',
    location: 'Remote (Worldwide)',
    workArrangement: 'remote',
    employmentType: 'contract',
    experienceLevel: 'mid',
    category: 'Web Development',
    tags: ['Full-Stack', 'Next.js', 'React', 'Node.js', 'MongoDB', 'TypeScript'],
    salary: {
      min: 50000,
      max: 80000,
      currency: 'INR',
      period: 'monthly',
      raw: '₹50,000 - ₹80,000 / month',
    },
    publicationDate: '2026-10-08T15:00:00.000Z',
    originalUrl: 'https://campus-resources.edu/placements/jobs/fix_007',
    isLive: false,
    attribution: {
      text: 'Synthetic development fixture for offline simulation and automated testing. Not a live commercial listing.',
      url: 'https://campus-resources.edu',
      required: false,
    },
  },
  {
    id: 'fixture_job_008',
    externalId: 'fix_008',
    provider: 'development_fixture',
    sourceName: 'Development Fixture (Offline Simulation)',
    title: 'Cloud Solutions Engineer (AWS & Terraform)',
    company: 'Horizon Cloud Services',
    companyLogo: null,
    description: 'Design and deploy multi-region AWS cloud infrastructure, configure VPC networks, and automate resource provisioning with Terraform.',
    excerpt: 'Cloud infrastructure engineer managing AWS VPCs, IAM, and Terraform modules.',
    location: 'Chennai, India (Hybrid)',
    workArrangement: 'hybrid',
    employmentType: 'full-time',
    experienceLevel: 'mid',
    category: 'Cloud & DevOps',
    tags: ['AWS', 'Cloud', 'Terraform', 'Kubernetes', 'Linux'],
    salary: {
      min: 850000,
      max: 1400000,
      currency: 'INR',
      period: 'yearly',
      raw: '₹8.5L - ₹14.0L / year',
    },
    publicationDate: '2026-10-09T09:00:00.000Z',
    originalUrl: 'https://campus-resources.edu/placements/jobs/fix_008',
    isLive: false,
    attribution: {
      text: 'Synthetic development fixture for offline simulation and automated testing. Not a live commercial listing.',
      url: 'https://campus-resources.edu',
      required: false,
    },
  },
];

export class MockJobFixtureAdapter implements IJobProviderAdapter {
  public readonly name = 'development_fixture';
  public readonly displayName = 'Development Fixture (Offline Simulation)';
  /** Never labeled as live listings! */
  public readonly isLive = false;

  public readonly attribution: JobAttribution = {
    text: 'Synthetic development fixture for offline testing. NOT A LIVE LISTING.',
    url: 'https://campus-resources.edu/placements',
    required: false,
  };

  public async searchJobs(params: JobSearchParams): Promise<NormalizedJob[]> {
    const retrievedAt = new Date().toISOString();
    let results: NormalizedJob[] = SYNTHETIC_DEVELOPMENT_FIXTURES.map((f) => ({
      ...f,
      retrievedAt,
    }));

    // Filter by keyword / q
    const keyword = (params.keyword || params.q || '').trim().toLowerCase();
    if (keyword) {
      results = results.filter((j) => {
        const inTitle = j.title.toLowerCase().includes(keyword);
        const inCompany = j.company.toLowerCase().includes(keyword);
        const inDesc = j.description.toLowerCase().includes(keyword);
        const inTags = j.tags.some((t) => t.toLowerCase().includes(keyword));
        return inTitle || inCompany || inDesc || inTags;
      });
    }

    // Filter by location
    const location = (params.location || params.geo || '').trim().toLowerCase();
    if (location) {
      results = results.filter((j) => (j.location || '').toLowerCase().includes(location));
    }

    // Filter by category
    const category = (params.category || params.industry || '').trim().toLowerCase();
    if (category) {
      results = results.filter((j) => (j.category || '').toLowerCase().includes(category));
    }

    // Filter by work arrangement
    if (params.workArrangement && params.workArrangement !== 'any') {
      results = results.filter((j) => j.workArrangement === params.workArrangement);
    }

    // Filter by employment type
    if (params.employmentType && params.employmentType !== 'any') {
      results = results.filter((j) => j.employmentType === params.employmentType);
    }

    // Filter by experience level
    if (params.experienceLevel && params.experienceLevel !== 'any') {
      results = results.filter((j) => j.experienceLevel === params.experienceLevel);
    }

    return results;
  }

  public async getJobById(externalId: string): Promise<NormalizedJob | null> {
    if (externalId === 'fixture_backend_01' || externalId === 'fix_backend_01') {
      return this.getJobById('fixture_job_002');
    }
    if (externalId === 'fixture_frontend_01' || externalId === 'fix_frontend_01') {
      return this.getJobById('fixture_job_001');
    }

    const cleanId = externalId.replace(/^fixture_/, '');
    const found = SYNTHETIC_DEVELOPMENT_FIXTURES.find(
      (f) => f.id === externalId || f.externalId === cleanId || f.id === `fixture_${cleanId}`
    );
    if (!found) return null;
    return {
      ...found,
      retrievedAt: new Date().toISOString(),
    };
  }

  public async isAvailable(): Promise<boolean> {
    return true; // Always available offline
  }
}
