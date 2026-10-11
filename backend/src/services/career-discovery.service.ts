import mongoose from 'mongoose';
import { careerRoleRepository } from '../repositories/mongo/career-role.repository.js';
import { careerRoleNeo4jRepository } from '../repositories/neo4j/career-role.neo4j.repository.js';
import { studentRepository } from '../repositories/mongo/student.repository.js';
import { courseRepository } from '../repositories/mongo/course.repository.js';
import { skillRepository } from '../repositories/mongo/skill.repository.js';
import { projectRepository } from '../repositories/mongo/project.repository.js';
import { jobRepository } from '../repositories/mongo/job.repository.js';
import { CURATED_CAREER_ROLES, CareerRoleData } from '../constants/career-roles.data.js';
import { CURATED_SKILLS, SkillDefinition } from '../generator/ontology.js';

export interface StudentProfileInput {
  studentId?: string;
  name?: string;
  department?: string;
  currentSemester?: number;
  cgpa?: number;
  interests?: string[];
  careerInterests?: string[];
  skills?: Array<{
    skillId: string;
    name?: string;
    level?: 'beginner' | 'intermediate' | 'advanced';
    competenceType?: 'self_reported' | 'course_exposure' | 'project_demonstrated' | 'verified';
    evidenceDescription?: string;
  }>;
  completedCourses?: Array<{
    courseId: string;
    code?: string;
    title?: string;
    grade?: string;
    status?: 'completed' | 'in_progress' | 'planned';
    taughtSkillIds?: string[];
  }>;
  customProjects?: Array<{
    projectId?: string;
    title: string;
    technologiesUsed?: string[];
    skillsDemonstrated?: string[];
  }>;
  projectIds?: string[];
  certifications?: Array<{
    name: string;
    associatedSkillIds?: string[];
  }>;
}

export interface MatchingSkillDetail {
  skillId: string;
  name: string;
  category: string;
  tier: string;
  competenceType: 'course_exposure' | 'self_reported' | 'project_demonstrated' | 'verified';
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
  isCore: boolean;
  evidenceDescription?: string;
}

export interface MissingSkillDetail {
  skillId: string;
  name: string;
  category: string;
  tier: string;
  isCore: boolean;
  prerequisites: string[];
  isBottleneckPrerequisite: boolean;
}

export interface LearningPathStep {
  step: number;
  skillId: string;
  skillName: string;
  category: string;
  tier: string;
  isCore: boolean;
  isPrerequisiteBottleneck: boolean;
  reason: string;
  prerequisites: string[];
  suggestedCourses: Array<{
    id: string;
    code: string;
    title: string;
    credits: number;
    difficulty: string;
  }>;
  suggestedProjects: Array<{
    id: string;
    title: string;
    domain: string;
    difficulty: string;
  }>;
  suggestedResources: Array<{
    id: string;
    title: string;
    type: string;
  }>;
}

export interface RoleCompatibilityScoreBreakdown {
  coreSkillsPoints: number;        // max 60
  preferredSkillsPoints: number;   // max 20
  evidenceDepthPoints: number;     // max 10
  courseworkPoints: number;        // max 10
  interestBonusPoints: number;     // bonus up to 5
  totalRawScore: number;
  finalScore: number;              // 0 to 100
}

export interface RoleRecommendation {
  roleId: string;
  title: string;
  slug: string;
  category: string;
  demandLevel: 'High' | 'Very High' | 'Moderate';
  averageSalaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  growthRate: string;
  summary: string;
  compatibilityScore: number;      // STRICTLY labeled "Role-Compatibility Score"
  fitLevel: 'High Fit' | 'Moderate Fit' | 'Emerging Fit';
  scoreBreakdown: RoleCompatibilityScoreBreakdown;
  matchingSkills: MatchingSkillDetail[];
  missingSkills: MissingSkillDetail[];
  missingRequiredSkills: MissingSkillDetail[];
  missingPreferredSkills: MissingSkillDetail[];
  skillGapsCount: number;
  prerequisiteBottlenecks: Array<{
    skillId: string;
    skillName: string;
    blocksSkillId: string;
    blocksSkillName: string;
  }>;
  recommendedNextCourse: {
    courseId: string;
    code: string;
    title: string;
    credits: number;
    difficulty: string;
    reason: string;
    taughtSkillIds: string[];
  } | null;
  recommendedCourses: Array<{
    courseId: string;
    code: string;
    title: string;
    credits: number;
    difficulty: string;
    taughtSkillIds: string[];
  }>;
  recommendedProjects: Array<{
    projectId: string;
    title: string;
    domain: string;
    difficulty: string;
    requiredSkillIds: string[];
  }>;
  explanation: string;
  learningPath: LearningPathStep[];
  alignedJobsCount: number;
}

export interface DiscoveryEvaluationResult {
  studentId?: string;
  studentName?: string;
  evaluatedRolesCount: number;
  highFitCount: number;
  moderateFitCount: number;
  emergingFitCount: number;
  topRecommendedRole: string | null;
  recommendations: RoleRecommendation[];
}

export class CareerDiscoveryService {
  private skillMap: Map<string, SkillDefinition> = new Map();

  constructor() {
    for (const sk of CURATED_SKILLS) {
      this.skillMap.set(sk.id, sk);
    }
  }

  /**
   * Evaluates and ranks all potential career roles for a student profile.
   */
  public async discoverRolesForStudent(
    input: string | StudentProfileInput
  ): Promise<DiscoveryEvaluationResult> {
    const profile = await this.resolveStudentProfile(input);
    const roles = await this.loadAllRoles();

    // Fetch catalogue courses and projects for recommendations if MongoDB is connected
    let allCourses: any[] = [];
    let allProjects: any[] = [];
    let allJobs: any[] = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const [cRes, pRes, jRes] = await Promise.all([
          courseRepository.findAll({ limit: 100 }),
          projectRepository.findAll({ limit: 100 }),
          jobRepository.findAll({ limit: 100 }),
        ]);
        allCourses = cRes.data;
        allProjects = pRes.data;
        allJobs = jRes.data;
      } catch {
        // Fallback to empty context
      }
    }

    const evaluatedRecommendations: RoleRecommendation[] = [];

    for (const role of roles) {
      const rec = await this.evaluateSingleRole(role, profile, {
        courses: allCourses || [],
        projects: allProjects || [],
        jobs: allJobs || [],
      });
      evaluatedRecommendations.push(rec);
    }

    // Rank roles deterministically:
    // 1. Highest Role-Compatibility Score
    // 2. Fewest skill gaps
    // 3. Highest Core points
    evaluatedRecommendations.sort((a, b) => {
      if (b.compatibilityScore !== a.compatibilityScore) {
        return b.compatibilityScore - a.compatibilityScore;
      }
      if (a.skillGapsCount !== b.skillGapsCount) {
        return a.skillGapsCount - b.skillGapsCount;
      }
      return b.scoreBreakdown.coreSkillsPoints - a.scoreBreakdown.coreSkillsPoints;
    });

    const highFitCount = evaluatedRecommendations.filter((r) => r.fitLevel === 'High Fit').length;
    const moderateFitCount = evaluatedRecommendations.filter((r) => r.fitLevel === 'Moderate Fit').length;
    const emergingFitCount = evaluatedRecommendations.filter((r) => r.fitLevel === 'Emerging Fit').length;

    return {
      studentId: profile.studentId,
      studentName: profile.name,
      evaluatedRolesCount: evaluatedRecommendations.length,
      highFitCount,
      moderateFitCount,
      emergingFitCount,
      topRecommendedRole: evaluatedRecommendations[0]?.title ?? null,
      recommendations: evaluatedRecommendations,
    };
  }

  /**
   * Evaluates a single career role against a student profile.
   */
  public async evaluateSingleRole(
    role: CareerRoleData,
    profile: StudentProfileInput,
    catalogueContext: { courses: any[]; projects: any[]; jobs: any[] }
  ): Promise<RoleRecommendation> {
    const requiredSet = new Set(role.requiredSkillIds);
    const preferredSet = new Set(role.preferredSkillIds);
    const roleSkillsSet = new Set([...role.requiredSkillIds, ...role.preferredSkillIds]);

    // 1. Identify skills held by the student
    const studentSkillMap = new Map<string, {
      level: 'beginner' | 'intermediate' | 'advanced';
      competenceType: 'course_exposure' | 'self_reported' | 'project_demonstrated' | 'verified';
      evidenceDescription?: string;
    }>();

    for (const sk of profile.skills || []) {
      studentSkillMap.set(sk.skillId, {
        level: sk.level || 'intermediate',
        competenceType: sk.competenceType || 'self_reported',
        evidenceDescription: sk.evidenceDescription,
      });
    }

    // 2. Identify skills associated with completed courses
    const courseDerivedSkillIds = new Set<string>();
    for (const c of profile.completedCourses || []) {
      if (c.status === 'completed' || !c.status) {
        // Find course definition in catalogue or completed record
        const matchingCatCourse = catalogueContext.courses.find((cat) => cat.courseId === c.courseId || cat.code === c.code);
        const taught = matchingCatCourse?.taughtSkillIds || c.taughtSkillIds || [];
        for (const tSk of taught) {
          courseDerivedSkillIds.add(tSk);
          if (!studentSkillMap.has(tSk)) {
            studentSkillMap.set(tSk, {
              level: 'beginner',
              competenceType: 'course_exposure',
              evidenceDescription: `Acquired foundational concepts through coursework (${matchingCatCourse?.code || c.code || c.courseId})`,
            });
          }
        }
      }
    }

    // 3. Identify skills supported by projects or certifications
    const projectDemonstratedSkillIds = new Set<string>();
    for (const p of profile.customProjects || []) {
      for (const s of p.skillsDemonstrated || []) {
        projectDemonstratedSkillIds.add(s);
        const existing = studentSkillMap.get(s);
        if (existing) {
          existing.competenceType = 'project_demonstrated';
          existing.evidenceDescription = existing.evidenceDescription || `Demonstrated in project '${p.title}'`;
        } else {
          studentSkillMap.set(s, {
            level: 'intermediate',
            competenceType: 'project_demonstrated',
            evidenceDescription: `Applied in practical custom project: ${p.title}`,
          });
        }
      }
    }

    for (const cert of profile.certifications || []) {
      for (const s of cert.associatedSkillIds || []) {
        const existing = studentSkillMap.get(s);
        if (existing) {
          existing.competenceType = 'verified';
          existing.evidenceDescription = existing.evidenceDescription || `Credential verified: ${cert.name}`;
        }
      }
    }

    // 4. Calculate matching skills and missing skills
    const matchingSkills: MatchingSkillDetail[] = [];
    const missingRequiredSkills: MissingSkillDetail[] = [];
    const missingPreferredSkills: MissingSkillDetail[] = [];

    for (const skId of role.requiredSkillIds) {
      const def = this.resolveSkillDefinition(skId);
      const studentSkill = studentSkillMap.get(skId);
      if (studentSkill) {
        matchingSkills.push({
          skillId: skId,
          name: def.name,
          category: def.category,
          tier: def.tier,
          competenceType: studentSkill.competenceType,
          proficiencyLevel: studentSkill.level,
          isCore: true,
          evidenceDescription: studentSkill.evidenceDescription,
        });
      } else {
        missingRequiredSkills.push({
          skillId: skId,
          name: def.name,
          category: def.category,
          tier: def.tier,
          isCore: true,
          prerequisites: def.prerequisites,
          isBottleneckPrerequisite: false,
        });
      }
    }

    for (const skId of role.preferredSkillIds) {
      const def = this.resolveSkillDefinition(skId);
      const studentSkill = studentSkillMap.get(skId);
      if (studentSkill) {
        matchingSkills.push({
          skillId: skId,
          name: def.name,
          category: def.category,
          tier: def.tier,
          competenceType: studentSkill.competenceType,
          proficiencyLevel: studentSkill.level,
          isCore: false,
          evidenceDescription: studentSkill.evidenceDescription,
        });
      } else {
        missingPreferredSkills.push({
          skillId: skId,
          name: def.name,
          category: def.category,
          tier: def.tier,
          isCore: false,
          prerequisites: def.prerequisites,
          isBottleneckPrerequisite: false,
        });
      }
    }

    const allMissingSkills = [...missingRequiredSkills, ...missingPreferredSkills];

    // 5. Prerequisite bottleneck detection (Neo4j / DAG Traversal)
    const acquiredSkillIds = Array.from(studentSkillMap.keys());
    const missingSkillIds = allMissingSkills.map((m) => m.skillId);

    const bottleneckPrereqs: Array<{
      skillId: string;
      skillName: string;
      blocksSkillId: string;
      blocksSkillName: string;
    }> = [];

    // Check missing prerequisites for each missing skill
    for (const m of allMissingSkills) {
      for (const pId of m.prerequisites) {
        if (!studentSkillMap.has(pId)) {
          const pDef = this.resolveSkillDefinition(pId);
          bottleneckPrereqs.push({
            skillId: pId,
            skillName: pDef.name,
            blocksSkillId: m.skillId,
            blocksSkillName: m.name,
          });
          m.isBottleneckPrerequisite = true;
        }
      }
    }

    // 6. Calculate transparent compatibility score
    // - Core requirement match: 60 pts
    const totalRequired = Math.max(1, role.requiredSkillIds.length);
    const matchedRequiredCount = matchingSkills.filter((s) => s.isCore).length;
    const corePoints = Number(((matchedRequiredCount / totalRequired) * 60).toFixed(1));

    // - Preferred requirement match: 20 pts
    const totalPreferred = Math.max(1, role.preferredSkillIds.length);
    const matchedPreferredCount = matchingSkills.filter((s) => !s.isCore).length;
    const preferredPoints = Number(((matchedPreferredCount / totalPreferred) * 20).toFixed(1));

    // - Evidence depth points: 10 pts (ratio of matched skills backed by project or verified)
    const totalMatched = matchingSkills.length;
    let evidencePoints = 0;
    if (totalMatched > 0) {
      const strongEvidenceMatches = matchingSkills.filter(
        (s) => s.competenceType === 'project_demonstrated' || s.competenceType === 'verified'
      ).length;
      evidencePoints = Number(((strongEvidenceMatches / totalMatched) * 10).toFixed(1));
    }

    // - Coursework alignment: 10 pts (ratio of role skills reinforced by courses)
    let courseworkPoints = 0;
    const courseAlignedCount = matchingSkills.filter(
      (s) => s.competenceType === 'course_exposure' || courseDerivedSkillIds.has(s.skillId)
    ).length;
    courseworkPoints = Number(((courseAlignedCount / totalRequired) * 10).toFixed(1));
    courseworkPoints = Math.min(10, courseworkPoints);

    // - Interest alignment bonus: 5 pts
    let interestBonusPoints = 0;
    const combinedInterests = [...(profile.interests || []), ...(profile.careerInterests || [])].map((i) => i.toLowerCase());
    const roleCatLower = role.category.toLowerCase();
    const roleTitleLower = role.title.toLowerCase();
    const hasInterestMatch = combinedInterests.some(
      (interest) =>
        roleCatLower.includes(interest) ||
        interest.includes(roleCatLower) ||
        roleTitleLower.includes(interest) ||
        interest.includes(roleTitleLower)
    );
    if (hasInterestMatch) {
      interestBonusPoints = 5;
    }

    const totalRaw = corePoints + preferredPoints + evidencePoints + courseworkPoints + interestBonusPoints;
    const finalScore = Math.min(100, Math.max(0, Math.round(totalRaw * 10) / 10));

    // Threshold categorisation
    let fitLevel: 'High Fit' | 'Moderate Fit' | 'Emerging Fit' = 'Emerging Fit';
    if (finalScore >= 70) {
      fitLevel = 'High Fit';
    } else if (finalScore >= 40) {
      fitLevel = 'Moderate Fit';
    }

    const scoreBreakdown: RoleCompatibilityScoreBreakdown = {
      coreSkillsPoints: corePoints,
      preferredSkillsPoints: preferredPoints,
      evidenceDepthPoints: evidencePoints,
      courseworkPoints: courseworkPoints,
      interestBonusPoints: interestBonusPoints,
      totalRawScore: totalRaw,
      finalScore: finalScore,
    };

    // 7. Recommend Courses and Next Course
    const missingSkillIdsSet = new Set(allMissingSkills.map((m) => m.skillId));
    const candidateCourses = catalogueContext.courses.filter((c: any) =>
      (c.taughtSkillIds || []).some((sId: string) => missingSkillIdsSet.has(sId))
    );

    // Score courses by: number of missing skills taught + taught core skills
    candidateCourses.sort((a: any, b: any) => {
      const aMissingCore = (a.taughtSkillIds || []).filter((sId: string) => requiredSet.has(sId)).length;
      const bMissingCore = (b.taughtSkillIds || []).filter((sId: string) => requiredSet.has(sId)).length;
      if (bMissingCore !== aMissingCore) return bMissingCore - aMissingCore;
      return (a.credits || 3) - (b.credits || 3);
    });

    const recommendedCourses = candidateCourses.slice(0, 5).map((c: any) => ({
      courseId: c.courseId,
      code: c.code,
      title: c.title,
      credits: c.credits || 3,
      difficulty: c.difficulty || 'intermediate',
      taughtSkillIds: (c.taughtSkillIds || []).filter((sId: string) => missingSkillIdsSet.has(sId)),
    }));

    const topCourse = candidateCourses[0];
    const recommendedNextCourse = topCourse
      ? {
          courseId: topCourse.courseId,
          code: topCourse.code,
          title: topCourse.title,
          credits: topCourse.credits || 3,
          difficulty: topCourse.difficulty || 'intermediate',
          reason: `Teaches ${topCourse.taughtSkillIds?.filter((sId: string) => requiredSet.has(sId)).length || 1} required core skills for ${role.title}`,
          taughtSkillIds: topCourse.taughtSkillIds || [],
        }
      : null;

    // 8. Recommend Projects
    const candidateProjects = catalogueContext.projects.filter((p: any) =>
      (p.requiredSkillIds || []).some((sId: string) => roleSkillsSet.has(sId))
    );
    const recommendedProjects = candidateProjects.slice(0, 4).map((p: any) => ({
      projectId: p.projectId,
      title: p.title,
      domain: p.domain,
      difficulty: p.difficulty,
      requiredSkillIds: p.requiredSkillIds || [],
    }));

    // 9. Generate Topological Learning Path
    const learningPath = this.buildLearningPath(
      allMissingSkills,
      bottleneckPrereqs,
      candidateCourses,
      candidateProjects,
      role.title
    );

    // 10. Generate Deterministic Explanation
    const explanation = this.buildExplanation(
      role,
      finalScore,
      fitLevel,
      matchingSkills,
      missingRequiredSkills,
      missingPreferredSkills,
      bottleneckPrereqs,
      recommendedNextCourse
    );

    // Aligned campus jobs count
    const alignedJobs = catalogueContext.jobs.filter((j: any) => {
      const jTitle = (j.title || '').toLowerCase();
      const rTitle = role.title.toLowerCase();
      return jTitle.includes(rTitle) || (j.preferredDomain && j.preferredDomain === role.category);
    });

    return {
      roleId: role.roleId,
      title: role.title,
      slug: role.slug,
      category: role.category,
      demandLevel: role.demandLevel,
      averageSalaryRange: role.averageSalaryRange,
      growthRate: role.growthRate,
      summary: role.summary,
      compatibilityScore: finalScore,
      fitLevel,
      scoreBreakdown,
      matchingSkills,
      missingSkills: allMissingSkills,
      missingRequiredSkills,
      missingPreferredSkills,
      skillGapsCount: allMissingSkills.length,
      prerequisiteBottlenecks: bottleneckPrereqs,
      recommendedNextCourse,
      recommendedCourses,
      recommendedProjects,
      explanation,
      learningPath,
      alignedJobsCount: alignedJobs.length,
    };
  }

  /**
   * Generates a step-by-step ordered learning path for the role.
   */
  private buildLearningPath(
    missingSkills: MissingSkillDetail[],
    bottlenecks: Array<{ skillId: string; skillName: string; blocksSkillId: string }>,
    courses: any[],
    projects: any[],
    roleTitle: string
  ): LearningPathStep[] {
    // Sort missing skills:
    // 1. Unacquired bottleneck prerequisites first
    // 2. Foundational tier -> Intermediate -> Advanced -> Specialized
    // 3. Core required skills before preferred skills
    const tierOrder: Record<string, number> = {
      foundational: 1,
      intermediate: 2,
      advanced: 3,
      specialized: 4,
    };

    const sortedMissing = [...missingSkills].sort((a, b) => {
      if (a.isBottleneckPrerequisite !== b.isBottleneckPrerequisite) {
        return a.isBottleneckPrerequisite ? -1 : 1;
      }
      if (a.isCore !== b.isCore) {
        return a.isCore ? -1 : 1;
      }
      const aTier = tierOrder[a.tier] || 2;
      const bTier = tierOrder[b.tier] || 2;
      return aTier - bTier;
    });

    return sortedMissing.map((m, idx) => {
      const suggestedCourses = courses
        .filter((c) => (c.taughtSkillIds || []).includes(m.skillId))
        .map((c) => ({
          id: c.courseId,
          code: c.code,
          title: c.title,
          credits: c.credits || 3,
          difficulty: c.difficulty || 'intermediate',
        }))
        .slice(0, 2);

      const suggestedProjects = projects
        .filter((p) => (p.requiredSkillIds || []).includes(m.skillId))
        .map((p) => ({
          id: p.projectId,
          title: p.title,
          domain: p.domain,
          difficulty: p.difficulty,
        }))
        .slice(0, 2);

      let reason = m.isCore
        ? `Mandatory core skill required for ${roleTitle}`
        : `High-value preferred skill that enhances candidate competitiveness for ${roleTitle}`;

      if (m.isBottleneckPrerequisite) {
        const blocks = bottlenecks.find((b) => b.skillId === m.skillId);
        if (blocks) {
          reason = `Critical prerequisite bottleneck: must be mastered before progressing to ${m.name}`;
        }
      }

      return {
        step: idx + 1,
        skillId: m.skillId,
        skillName: m.name,
        category: m.category,
        tier: m.tier,
        isCore: m.isCore,
        isPrerequisiteBottleneck: m.isBottleneckPrerequisite,
        reason,
        prerequisites: m.prerequisites,
        suggestedCourses,
        suggestedProjects,
        suggestedResources: [],
      };
    });
  }

  /**
   * Deterministic explanation builder explaining why a role received its compatibility score.
   */
  private buildExplanation(
    role: CareerRoleData,
    score: number,
    fitLevel: 'High Fit' | 'Moderate Fit' | 'Emerging Fit',
    matchingSkills: MatchingSkillDetail[],
    missingRequired: MissingSkillDetail[],
    missingPreferred: MissingSkillDetail[],
    bottlenecks: Array<{ skillId: string; skillName: string; blocksSkillName: string }>,
    nextCourse: { code: string; title: string } | null
  ): string {
    const coreMatches = matchingSkills.filter((s) => s.isCore);
    const prefMatches = matchingSkills.filter((s) => !s.isCore);
    const projectBacked = matchingSkills.filter(
      (s) => s.competenceType === 'project_demonstrated' || s.competenceType === 'verified'
    );

    let summary = '';

    if (fitLevel === 'High Fit') {
      summary = `High compatibility (${score}/100 role-compatibility score). Student satisfies ${coreMatches.length} of ${role.requiredSkillIds.length} mandatory core skills.`;
    } else if (fitLevel === 'Moderate Fit') {
      summary = `Moderate compatibility (${score}/100 role-compatibility score). Student demonstrates foundational readiness with ${coreMatches.length} of ${role.requiredSkillIds.length} core skills acquired.`;
    } else {
      summary = `Emerging compatibility (${score}/100 role-compatibility score). Student currently possesses ${coreMatches.length} of ${role.requiredSkillIds.length} core skills, indicating substantial upskilling is needed.`;
    }

    // Evidence commentary
    let evidenceText = '';
    if (projectBacked.length > 0) {
      const sampleTitles = projectBacked.slice(0, 2).map((s) => s.name).join(', ');
      evidenceText = ` Key strengths in ${sampleTitles} are backed by demonstrated project evidence.`;
    } else if (coreMatches.length > 0) {
      evidenceText = ` Core skills are currently self-reported or course-derived; reinforcing them with practical projects will elevate role readiness.`;
    }

    // Bottlenecks & Gaps commentary
    let gapsText = '';
    if (bottlenecks.length > 0) {
      const bSample = bottlenecks[0];
      gapsText = ` Foundational bottleneck identified: ${bSample.skillName} must be completed before acquiring ${bSample.blocksSkillName}.`;
      if (missingRequired.length === 0 && missingPreferred.length > 0) {
        gapsText += ` All mandatory core requirements are satisfied; focus on preferred electives: [${missingPreferred.map((m) => m.name).slice(0, 2).join(', ')}].`;
      }
    } else if (missingRequired.length > 0) {
      const gapNames = missingRequired.map((m) => m.name).slice(0, 3).join(', ');
      gapsText = ` Missing primary requirements: [${gapNames}].`;
    } else {
      gapsText = ` All mandatory core requirements are satisfied! Focus on preferred electives: [${missingPreferred.map((m) => m.name).slice(0, 2).join(', ')}].`;
    }

    // Next step commentary
    let nextStepText = '';
    if (nextCourse) {
      nextStepText = ` Recommended immediate milestone: enroll in ${nextCourse.code} (${nextCourse.title}) to close key role gaps.`;
    }

    return `${summary}${evidenceText}${gapsText}${nextStepText}`.trim();
  }

  /**
   * Helper to resolve full skill definition from ontology or defaults.
   */
  private resolveSkillDefinition(skillId: string): SkillDefinition {
    const existing = this.skillMap.get(skillId);
    if (existing) return existing;

    return {
      id: skillId,
      name: skillId.replace(/^sk_/, '').replace(/_/g, ' ').toUpperCase(),
      category: 'Software Engineering' as any,
      tier: 'intermediate',
      description: 'Skill required for technical career role.',
      prerequisites: [],
    };
  }

  /**
   * Loads all curated roles from Mongo or in-memory fallback.
   */
  public async loadAllRoles(): Promise<CareerRoleData[]> {
    if (mongoose.connection.readyState === 1) {
      try {
        await careerRoleRepository.ensureCuratedRolesSeeded();
        const mongoRoles = await careerRoleRepository.findAll({ limit: 50 });
        if (mongoRoles.data && mongoRoles.data.length >= 10) {
          return mongoRoles.data.map((r: any) => ({
            roleId: r.roleId,
            title: r.title,
            slug: r.slug,
            category: r.category,
            description: r.description,
            summary: r.summary,
            requiredSkillIds: r.requiredSkillIds,
            preferredSkillIds: r.preferredSkillIds,
            typicalJobTitles: r.typicalJobTitles,
            averageSalaryRange: r.averageSalaryRange,
            demandLevel: r.demandLevel,
            growthRate: r.growthRate,
            keyResponsibilities: r.keyResponsibilities,
          }));
        }
      } catch {
        // Fallback to in-memory curated roles
      }
    }
    return CURATED_CAREER_ROLES;
  }

  /**
   * Resolves full student profile either from ID lookup in MongoDB or raw input object.
   */
  public async resolveStudentProfile(input: string | StudentProfileInput): Promise<StudentProfileInput> {
    if (typeof input === 'string') {
      const student = await studentRepository.findById(input);
      if (!student) {
        throw Object.assign(new Error(`Student profile not found: ${input}`), { status: 404 });
      }

      return {
        studentId: student.studentId,
        name: student.name,
        department: student.department,
        currentSemester: student.currentSemester,
        cgpa: student.cgpa,
        interests: student.interests || [],
        careerInterests: student.careerInterests || [],
        skills: (student.skills || []).map((s) => ({
          skillId: s.skillId,
          level: s.level,
          competenceType: s.competenceType || 'self_reported',
          evidenceDescription: s.evidenceDescription,
        })),
        completedCourses: (student.completedCourses || []).map((c) => ({
          courseId: c.courseId,
          grade: c.grade,
          status: c.status || 'completed',
        })),
        customProjects: (student.customProjects || []).map((p) => ({
          projectId: p.projectId,
          title: p.title,
          technologiesUsed: p.technologiesUsed || [],
          skillsDemonstrated: p.skillsDemonstrated || [],
        })),
        projectIds: student.projectIds || [],
        certifications: (student.certifications || []).map((c) => ({
          name: c.name,
          associatedSkillIds: c.associatedSkillIds || [],
        })),
      };
    }

    return input;
  }
  // ──────────────────────────────────────────────────────────────────────
  // A. Career-to-Learning: Student specifies a target role
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Generates a personalised learning path for a single target role.
   * Supports both a student ID lookup and a raw profile payload.
   */
  public async getCareerToLearningPath(
    input: string | StudentProfileInput,
    targetRoleId: string
  ): Promise<RoleRecommendation> {
    const profile = await this.resolveStudentProfile(input);
    const roles = await this.loadAllRoles();
    const role = roles.find((r) => r.roleId === targetRoleId || r.slug === targetRoleId);

    if (!role) {
      throw Object.assign(
        new Error(`Career role not found: ${targetRoleId}`),
        { status: 404 }
      );
    }

    let allCourses: any[] = [];
    let allProjects: any[] = [];
    let allJobs: any[] = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const [cRes, pRes, jRes] = await Promise.all([
          courseRepository.findAll({ limit: 100 }),
          projectRepository.findAll({ limit: 100 }),
          jobRepository.findAll({ limit: 100 }),
        ]);
        allCourses = cRes.data;
        allProjects = pRes.data;
        allJobs = jRes.data;
      } catch {
        // Fallback to empty context
      }
    }

    return this.evaluateSingleRole(role, profile, {
      courses: allCourses || [],
      projects: allProjects || [],
      jobs: allJobs || [],
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Side-by-side pathway comparison
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Compares multiple target roles side by side for a given student profile.
   * At most 5 role IDs are accepted to keep responses manageable.
   */
  public async comparePathways(
    input: string | StudentProfileInput,
    roleIds: string[]
  ): Promise<{
    studentId?: string;
    studentName?: string;
    comparedRolesCount: number;
    pathways: RoleRecommendation[];
  }> {
    if (!roleIds || roleIds.length === 0) {
      throw Object.assign(new Error('At least one roleId is required for comparison.'), { status: 400 });
    }
    if (roleIds.length > 5) {
      throw Object.assign(new Error('At most 5 roles can be compared simultaneously.'), { status: 400 });
    }

    const profile = await this.resolveStudentProfile(input);

    let allCourses: any[] = [];
    let allProjects: any[] = [];
    let allJobs: any[] = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const [cRes, pRes, jRes] = await Promise.all([
          courseRepository.findAll({ limit: 100 }),
          projectRepository.findAll({ limit: 100 }),
          jobRepository.findAll({ limit: 100 }),
        ]);
        allCourses = cRes.data;
        allProjects = pRes.data;
        allJobs = jRes.data;
      } catch {
        // Fallback to empty context
      }
    }

    const allRoles = await this.loadAllRoles();

    const pathways: RoleRecommendation[] = [];

    for (const rid of roleIds) {
      const role = allRoles.find((r) => r.roleId === rid || r.slug === rid);
      if (!role) {
        throw Object.assign(new Error(`Career role not found: ${rid}`), { status: 404 });
      }
      const rec = await this.evaluateSingleRole(role, profile, {
        courses: allCourses || [],
        projects: allProjects || [],
        jobs: allJobs || [],
      });
      pathways.push(rec);
    }

    // Order by descending compatibility score so the best match leads
    pathways.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    return {
      studentId: profile.studentId,
      studentName: profile.name,
      comparedRolesCount: pathways.length,
      pathways,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Pathway persistence helpers (delegate to StudentRepository)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Persists a chosen pathway to the student's profile in MongoDB.
   * Does nothing (no error) when MongoDB is unavailable.
   */
  public async savePathway(
    studentId: string,
    roleId: string,
    roleTitle: string,
    notes?: string
  ): Promise<{ saved: boolean; message: string }> {
    if (mongoose.connection.readyState !== 1) {
      return { saved: false, message: 'MongoDB is not connected; pathway cannot be persisted.' };
    }

    const updated = await studentRepository.savePathway(studentId, roleId, roleTitle, notes);
    if (!updated) {
      throw Object.assign(new Error(`Student profile not found: ${studentId}`), { status: 404 });
    }

    return { saved: true, message: `Pathway for '${roleTitle}' saved to student profile.` };
  }

  /**
   * Removes a previously saved pathway from the student's profile.
   */
  public async removeSavedPathway(
    studentId: string,
    roleId: string
  ): Promise<{ removed: boolean; message: string }> {
    if (mongoose.connection.readyState !== 1) {
      return { removed: false, message: 'MongoDB is not connected; pathway cannot be removed.' };
    }

    const updated = await studentRepository.removeSavedPathway(studentId, roleId);
    if (!updated) {
      throw Object.assign(new Error(`Student profile not found: ${studentId}`), { status: 404 });
    }

    return { removed: true, message: 'Pathway removed from student profile.' };
  }

  /**
   * Returns the list of pathways the student has previously saved.
   */
  public async getSavedPathways(
    studentId: string
  ): Promise<Array<{ roleId: string; roleTitle: string; savedAt: Date; notes?: string }>> {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }
    const pathways = await studentRepository.getSavedPathways(studentId);
    return (pathways ?? []) as Array<{ roleId: string; roleTitle: string; savedAt: Date; notes?: string }>;
  }
}

export const careerDiscoveryService = new CareerDiscoveryService();
