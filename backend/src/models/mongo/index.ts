import mongoose, { Schema, Document } from 'mongoose';

// ==========================================
// 1. Skill Model
// ==========================================
export interface ISkill extends Document {
  skillId: string;
  name: string;
  category: 'Programming' | 'Data Science & AI' | 'Web Development' | 'Cloud & DevOps' | 'Cybersecurity' | 'Systems & Hardware';
  tier: 'foundational' | 'intermediate' | 'advanced' | 'specialized';
  description: string;
  prerequisiteSkillIds: string[];
  createdAt: Date;
}

export const SkillSchema = new Schema<ISkill>(
  {
    skillId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['Programming', 'Data Science & AI', 'Web Development', 'Cloud & DevOps', 'Cybersecurity', 'Systems & Hardware'],
      index: true,
    },
    tier: {
      type: String,
      required: true,
      enum: ['foundational', 'intermediate', 'advanced', 'specialized'],
    },
    description: { type: String, required: true },
    prerequisiteSkillIds: [{ type: String, ref: 'Skill' }],
  },
  { timestamps: true }
);

export const SkillModel = mongoose.models.Skill || mongoose.model<ISkill>('Skill', SkillSchema);

// ==========================================
// 2. Course Model
// ==========================================
export interface ICourse extends Document {
  courseId: string;
  code: string;
  title: string;
  department: string;
  credits: number;
  difficulty: 'introductory' | 'intermediate' | 'advanced';
  description: string;
  syllabusTopics: string[];
  taughtSkillIds: string[];
  prerequisiteCourseIds: string[];
  instructor: {
    name: string;
    email: string;
    office: string;
  };
  semesterOffered: number[];
  createdAt: Date;
}

export const CourseSchema = new Schema<ICourse>(
  {
    courseId: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    department: { type: String, required: true, index: true },
    credits: { type: Number, required: true, min: 1, max: 6 },
    difficulty: {
      type: String,
      required: true,
      enum: ['introductory', 'intermediate', 'advanced'],
    },
    description: { type: String, required: true },
    syllabusTopics: [{ type: String }],
    taughtSkillIds: [{ type: String }],
    prerequisiteCourseIds: [{ type: String }],
    instructor: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      office: { type: String, required: true },
    },
    semesterOffered: [{ type: Number }],
  },
  { timestamps: true }
);

export const CourseModel = mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);

// ==========================================
// 3. Project Model
// ==========================================
export interface IProject extends Document {
  projectId: string;
  title: string;
  abstract: string;
  domain: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  requiredSkillIds: string[];
  technologiesUsed: string[];
  facultyMentor: string;
  maxTeamSize: number;
  createdAt: Date;
}

export const ProjectSchema = new Schema<IProject>(
  {
    projectId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    abstract: { type: String, required: true },
    domain: { type: String, required: true, index: true },
    difficulty: {
      type: String,
      required: true,
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    requiredSkillIds: [{ type: String }],
    technologiesUsed: [{ type: String }],
    facultyMentor: { type: String, required: true },
    maxTeamSize: { type: Number, default: 4 },
  },
  { timestamps: true }
);

export const ProjectModel = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

// ==========================================
// 4. Job Model
// ==========================================
export interface IJob extends Document {
  jobId: string;
  title: string;
  company: string;
  jobType: 'internship' | 'full_time';
  location: string;
  description: string;
  demandedSkillIds: string[];
  preferredDomain: string;
  minimumCgpa: number;
  openPositions: number;
  deadline: Date;
  createdAt: Date;
}

export const JobSchema = new Schema<IJob>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    company: { type: String, required: true, index: true },
    jobType: {
      type: String,
      required: true,
      enum: ['internship', 'full_time'],
    },
    location: { type: String, required: true },
    description: { type: String, required: true },
    demandedSkillIds: [{ type: String }],
    preferredDomain: { type: String, required: true },
    minimumCgpa: { type: Number, default: 6.0 },
    openPositions: { type: Number, default: 1 },
    deadline: { type: Date, required: true },
  },
  { timestamps: true }
);

export const JobModel = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);

// ==========================================
// 5. Club Model
// ==========================================
export interface IClub extends Document {
  clubId: string;
  name: string;
  category: 'Technical' | 'Cultural' | 'Sports' | 'Social' | 'Entrepreneurship';
  description: string;
  facultyCoordinator: string;
  foundedYear: number;
  activeMemberCount: number;
  createdAt: Date;
}

export const ClubSchema = new Schema<IClub>(
  {
    clubId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, unique: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['Technical', 'Cultural', 'Sports', 'Social', 'Entrepreneurship'],
    },
    description: { type: String, required: true },
    facultyCoordinator: { type: String, required: true },
    foundedYear: { type: Number, required: true },
    activeMemberCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ClubModel = mongoose.models.Club || mongoose.model<IClub>('Club', ClubSchema);

// ==========================================
// 6. Event Model
// ==========================================
export interface IEvent extends Document {
  eventId: string;
  title: string;
  eventType: 'Workshop' | 'Hackathon' | 'Guest Lecture' | 'Competition' | 'Seminar';
  organizingClubId: string;
  eventDate: Date;
  venueFacilityId: string;
  description: string;
  targetedSkillIds: string[];
  capacity: number;
  registeredCount: number;
  createdAt: Date;
}

export const EventSchema = new Schema<IEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    eventType: {
      type: String,
      required: true,
      enum: ['Workshop', 'Hackathon', 'Guest Lecture', 'Competition', 'Seminar'],
    },
    organizingClubId: { type: String, required: true },
    eventDate: { type: Date, required: true, index: true },
    venueFacilityId: { type: String, required: true },
    description: { type: String, required: true },
    targetedSkillIds: [{ type: String }],
    capacity: { type: Number, required: true },
    registeredCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const EventModel = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);

// ==========================================
// 7. Resource Model
// ==========================================
export interface IResource extends Document {
  resourceId: string;
  title: string;
  resourceType: 'Video Series' | 'Interactive Lab' | 'Textbook' | 'Research Paper' | 'Cheatsheet';
  url: string;
  taughtSkillIds: string[];
  durationMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rating: number;
  accessCount: number;
  createdAt: Date;
}

export const ResourceSchema = new Schema<IResource>(
  {
    resourceId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    resourceType: {
      type: String,
      required: true,
      enum: ['Video Series', 'Interactive Lab', 'Textbook', 'Research Paper', 'Cheatsheet'],
    },
    url: { type: String, required: true },
    taughtSkillIds: [{ type: String }],
    durationMinutes: { type: Number, default: 60 },
    difficulty: {
      type: String,
      required: true,
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    rating: { type: Number, default: 4.5, min: 1, max: 5 },
    accessCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ResourceModel = mongoose.models.Resource || mongoose.model<IResource>('Resource', ResourceSchema);

// ==========================================
// 8. Facility Model
// ==========================================
export interface IFacility extends Document {
  facilityId: string;
  name: string;
  building: string;
  roomNumber: string;
  facilityType: 'Computer Lab' | 'Auditorium' | 'Library' | 'Innovation Hub' | 'Seminar Hall';
  capacity: number;
  equipmentSummary: string[];
  createdAt: Date;
}

export const FacilitySchema = new Schema<IFacility>(
  {
    facilityId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    building: { type: String, required: true },
    roomNumber: { type: String, required: true },
    facilityType: {
      type: String,
      required: true,
      enum: ['Computer Lab', 'Auditorium', 'Library', 'Innovation Hub', 'Seminar Hall'],
    },
    capacity: { type: Number, required: true },
    equipmentSummary: [{ type: String }],
  },
  { timestamps: true }
);

export const FacilityModel = mongoose.models.Facility || mongoose.model<IFacility>('Facility', FacilitySchema);

// ==========================================
// 9. Student Model (Rich Polymorphic Aggregate)
// ==========================================
export interface IStudentSkill {
  skillId: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  acquiredAt: Date;
  competenceType?: 'self_reported' | 'course_exposure' | 'project_demonstrated' | 'verified';
  evidenceDescription?: string;
}

export interface IStudentCompletedCourse {
  courseId: string;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'In Progress' | string;
  completedSemester: number;
  completedAt: Date;
  status?: 'completed' | 'in_progress' | 'planned';
}

export interface IStudentCertification {
  name: string;
  issuer: string;
  issueDate?: Date;
  credentialUrl?: string;
  associatedSkillIds?: string[];
}

export interface IStudentCustomProject {
  projectId: string;
  title: string;
  description?: string;
  technologiesUsed: string[];
  skillsDemonstrated: string[];
  role?: string;
  link?: string;
  createdAt?: Date;
}

export interface IStudent extends Document {
  studentId: string;
  rollNumber: string;
  name: string;
  email: string;
  department: string;
  degree?: string;
  branch?: string;
  institution?: string;
  graduationYear?: number;
  currentSemester: number;
  cgpa: number;
  interests: string[];
  careerInterests?: string[];
  preferredLocations?: string[];
  workArrangement?: 'remote' | 'hybrid' | 'onsite' | 'any';
  roleLevelPreference?: 'internship' | 'entry_level' | 'experienced' | 'any';
  skills: IStudentSkill[];
  completedCourses: IStudentCompletedCourse[];
  projectIds: string[];
  customProjects?: IStudentCustomProject[];
  certifications?: IStudentCertification[];
  savedRoleIds?: string[];
  savedPathways?: Array<{
    roleId: string;
    roleTitle: string;
    savedAt: Date;
    notes?: string;
  }>;
  savedJobIds?: string[];
  clubMemberships: {
    clubId: string;
    role: 'Member' | 'Lead' | 'Coordinator';
    joinedAt: Date;
  }[];
  attendedEventIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const StudentSchema = new Schema<IStudent>(
  {
    studentId: { type: String, required: true, unique: true, index: true },
    rollNumber: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    department: { type: String, required: true, index: true },
    degree: { type: String, default: 'B.Tech' },
    branch: { type: String },
    institution: { type: String, default: 'Campus Institute of Technology' },
    graduationYear: { type: Number, default: 2026 },
    currentSemester: { type: Number, required: true, min: 1, max: 8 },
    cgpa: { type: Number, required: true, min: 0.0, max: 10.0 },
    interests: [{ type: String }],
    careerInterests: [{ type: String }],
    preferredLocations: [{ type: String }],
    workArrangement: {
      type: String,
      enum: ['remote', 'hybrid', 'onsite', 'any'],
      default: 'any',
    },
    roleLevelPreference: {
      type: String,
      enum: ['internship', 'entry_level', 'experienced', 'any'],
      default: 'any',
    },
    skills: [
      {
        skillId: { type: String, required: true },
        level: {
          type: String,
          required: true,
          enum: ['beginner', 'intermediate', 'advanced'],
        },
        acquiredAt: { type: Date, default: Date.now },
        competenceType: {
          type: String,
          enum: ['self_reported', 'course_exposure', 'project_demonstrated', 'verified'],
          default: 'self_reported',
        },
        evidenceDescription: { type: String },
      },
    ],
    completedCourses: [
      {
        courseId: { type: String, required: true },
        grade: {
          type: String,
          default: 'A',
        },
        completedSemester: { type: Number, default: 1 },
        completedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['completed', 'in_progress', 'planned'],
          default: 'completed',
        },
      },
    ],
    projectIds: [{ type: String }],
    customProjects: [
      {
        projectId: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String },
        technologiesUsed: [{ type: String }],
        skillsDemonstrated: [{ type: String }],
        role: { type: String },
        link: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    certifications: [
      {
        name: { type: String, required: true },
        issuer: { type: String, required: true },
        issueDate: { type: Date },
        credentialUrl: { type: String },
        associatedSkillIds: [{ type: String }],
      },
    ],
    savedRoleIds: [{ type: String }],
    savedPathways: [
      {
        roleId: { type: String, required: true },
        roleTitle: { type: String, required: true },
        savedAt: { type: Date, default: Date.now },
        notes: { type: String },
      },
    ],
    savedJobIds: [{ type: String }],
    clubMemberships: [
      {
        clubId: { type: String, required: true },
        role: {
          type: String,
          required: true,
          enum: ['Member', 'Lead', 'Coordinator'],
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    attendedEventIds: [{ type: String }],
  },
  { timestamps: true }
);

// Indexes
SkillSchema.index({ name: 'text', description: 'text' });
CourseSchema.index({ department: 1, difficulty: 1 });
CourseSchema.index({ title: 'text', description: 'text', syllabusTopics: 'text' });
ProjectSchema.index({ domain: 1, difficulty: 1 });
ProjectSchema.index({ title: 'text', abstract: 'text', technologiesUsed: 'text' });
JobSchema.index({ preferredDomain: 1, jobType: 1 });
JobSchema.index({ title: 'text', description: 'text', company: 'text' });
ClubSchema.index({ category: 1 });
EventSchema.index({ eventDate: -1, eventType: 1 });
ResourceSchema.index({ taughtSkillIds: 1, difficulty: 1 });
ResourceSchema.index({ accessCount: -1, rating: -1 });
FacilitySchema.index({ facilityType: 1, capacity: -1 });
StudentSchema.index({ department: 1, currentSemester: 1 });
StudentSchema.index({ 'skills.skillId': 1 });
StudentSchema.index({ name: 'text', rollNumber: 'text', email: 'text' });
StudentSchema.index({ cgpa: -1, currentSemester: 1 });

export const StudentModel = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);

// ==========================================
// 10. Career Role Model (Role Catalogue)
// ==========================================
export interface ICareerRole extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

export const CareerRoleSchema = new Schema<ICareerRole>(
  {
    roleId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['Software Engineering', 'Web Development', 'Data Science & AI', 'Cloud & DevOps', 'Cybersecurity', 'Systems & Hardware'],
      index: true,
    },
    description: { type: String, required: true },
    summary: { type: String, required: true },
    requiredSkillIds: [{ type: String, required: true }],
    preferredSkillIds: [{ type: String, default: [] }],
    typicalJobTitles: [{ type: String, default: [] }],
    averageSalaryRange: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
      currency: { type: String, default: 'USD' },
    },
    demandLevel: {
      type: String,
      required: true,
      enum: ['High', 'Very High', 'Moderate'],
      default: 'High',
    },
    growthRate: { type: String, default: '+15% through 2030' },
    keyResponsibilities: [{ type: String, default: [] }],
  },
  { timestamps: true }
);

CareerRoleSchema.index({ title: 'text', description: 'text', summary: 'text' });
CareerRoleSchema.index({ category: 1, demandLevel: 1 });

export const CareerRoleModel = mongoose.models.CareerRole || mongoose.model<ICareerRole>('CareerRole', CareerRoleSchema);

