import { graphRepository } from '../repositories/neo4j/graph.repository.js';
import {
  recommendationRepository,
  JobWithSkillsResult,
  ProjectWithSkillsResult,
  CourseWithDetailsResult,
  ResourceWithSkillsResult,
} from '../repositories/neo4j/recommendation.repository.js';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SkillGapAnalysis {
  studentId: string;
  target: {
    type: 'job' | 'project' | 'skill';
    id: string;
    name: string;
  };
  currentSkills: Array<{
    id: string;
    name: string;
    category: string;
    tier?: string;
  }>;
  requiredSkills: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  matchedSkills: Array<{
    id: string;
    name: string;
    category?: string;
  }>;
  missingSkills: Array<{
    id: string;
    name: string;
    category: string;
    prerequisites: Array<{
      id: string;
      name: string;
      category?: string;
    }>;
  }>;
  readinessPercentage: number;
  readinessLevel: 'High' | 'Moderate' | 'Low';
  summary: string;
}

export interface LearningPathStep {
  step: number;
  skillId: string;
  skillName: string;
  category: string;
  tier: string;
  reason: string;
  prerequisites: string[];
  suggestedCourses: Array<{
    id: string;
    code: string;
    title: string;
    difficulty: string;
  }>;
  suggestedResources: Array<{
    id: string;
    title: string;
    type: string;
    difficulty: string;
  }>;
}

export interface LearningPathRecommendation {
  studentId: string;
  targetRole: string;
  currentSkills: Array<{ id: string; name: string }>;
  targetSkills: Array<{ id: string; name: string }>;
  alreadyAcquiredSkills: Array<{ id: string; name: string }>;
  missingSkills: Array<{ id: string; name: string }>;
  orderedLearningPath: LearningPathStep[];
  estimatedSteps: number;
  explanation: string;
}

export interface CourseRecommendation {
  courseId: string;
  code: string;
  title: string;
  department: string;
  credits: number;
  difficulty: string;
  score: number;
  taughtSkills: Array<{ id: string; name: string }>;
  newSkillsForStudent: Array<{ id: string; name: string }>;
  prerequisitesMet: boolean;
  scoreBreakdown: {
    newSkillScore: number;
    prerequisiteScore: number;
    interestScore: number;
    difficultyScore: number;
    demandBonus: number;
  };
  explanation: string;
}

export interface ProjectRecommendation {
  projectId: string;
  title: string;
  domain: string;
  difficulty: string;
  score: number;
  requiredSkills: Array<{ id: string; name: string }>;
  matchedSkills: Array<{ id: string; name: string }>;
  skillsToAcquire: Array<{ id: string; name: string }>;
  scoreBreakdown: {
    skillCompatibility: number;
    skillGrowth: number;
    interestMatch: number;
    difficultyFit: number;
    popularity: number;
  };
  explanation: string;
}

export interface JobRecommendation {
  jobId: string;
  title: string;
  company: string;
  type: string;
  preferredDomain: string;
  score: number;
  readinessPercentage: number;
  matchedSkills: Array<{ id: string; name: string }>;
  missingSkills: Array<{ id: string; name: string }>;
  scoreBreakdown: {
    skillMatch: number;
    domainMatch: number;
    readinessRatio: number;
    feasibility: number;
    popularity: number;
  };
  explanation: string;
}

export interface JobReadinessAnalysis {
  studentId: string;
  job: {
    id: string;
    title: string;
    company: string;
    type: string;
    preferredDomain: string;
  };
  readinessPercentage: number;
  readinessVerdict: 'Ready to Apply' | 'Preparation Required' | 'Substantial Upskilling Needed';
  matchedSkills: Array<{ id: string; name: string; category?: string }>;
  missingSkills: Array<{
    id: string;
    name: string;
    category?: string;
    prerequisites: Array<{ id: string; name: string }>;
  }>;
  recommendedLearningPath: LearningPathStep[];
  estimatedPreparationSteps: number;
  explanation: string;
}

export interface ResourceRecommendation {
  resourceId: string;
  title: string;
  type: string;
  difficulty: string;
  score: number;
  taughtSkills: Array<{ id: string; name: string }>;
  relevantMissingSkills: Array<{ id: string; name: string }>;
  explanation: string;
}

// ============================================================================
// Configurable Scoring Weights (Strictly deterministic & sum to 1.0)
// ============================================================================

export const RECOMMENDATION_WEIGHTS = {
  course: {
    newSkillRatio: 0.35,
    prerequisiteMatch: 0.25,
    interestMatch: 0.20,
    difficultyFit: 0.10,
    demandBonus: 0.10,
  },
  project: {
    skillCompatibility: 0.35,
    skillGrowth: 0.25,
    interestMatch: 0.20,
    difficultyFit: 0.10,
    popularity: 0.10,
  },
  job: {
    skillMatch: 0.40,
    domainMatch: 0.25,
    readinessRatio: 0.15,
    feasibility: 0.10,
    popularity: 0.10,
  },
};

// Curated ontology career role mappings
export const ROLE_SKILL_MAP: Record<string, { title: string; skillIds: string[] }> = {
  'ai-ml-engineer': {
    title: 'AI/ML Engineer',
    skillIds: ['sk_python', 'sk_math_stats', 'sk_data_analysis', 'sk_ml', 'sk_deep_learning', 'sk_nlp', 'sk_genai'],
  },
  'full-stack-developer': {
    title: 'Full-Stack Developer',
    skillIds: ['sk_javascript', 'sk_html_css', 'sk_react', 'sk_nodejs', 'sk_sql', 'sk_nosql', 'sk_docker'],
  },
  'backend-engineer': {
    title: 'Backend Engineer',
    skillIds: ['sk_python', 'sk_javascript', 'sk_nodejs', 'sk_sql', 'sk_nosql', 'sk_docker', 'sk_ci_cd', 'sk_linux'],
  },
  'data-scientist': {
    title: 'Data Scientist',
    skillIds: ['sk_python', 'sk_math_stats', 'sk_data_analysis', 'sk_ml', 'sk_deep_learning'],
  },
  'cloud-devops-engineer': {
    title: 'Cloud & DevOps Engineer',
    skillIds: ['sk_linux', 'sk_docker', 'sk_kubernetes', 'sk_ci_cd', 'sk_cloud_aws'],
  },
  'cybersecurity-analyst': {
    title: 'Cybersecurity Analyst',
    skillIds: ['sk_networks', 'sk_cyber_sec', 'sk_web_sec', 'sk_linux'],
  },
  'frontend-developer': {
    title: 'Frontend Developer',
    skillIds: ['sk_javascript', 'sk_html_css', 'sk_react', 'sk_nodejs'],
  },
  'distributed-systems-engineer': {
    title: 'Distributed Systems Engineer',
    skillIds: ['sk_cpp', 'sk_dsa', 'sk_linux', 'sk_nosql', 'sk_dist_systems'],
  },
};

// Skill tier hierarchy for topological sorting
const TIER_ORDER: Record<string, number> = {
  foundational: 1,
  intermediate: 2,
  advanced: 3,
  specialized: 4,
};

function difficultyToNumber(diff: string): number {
  const norm = (diff || '').toLowerCase();
  if (norm === 'beginner' || norm === 'introductory') return 1;
  if (norm === 'intermediate') return 2;
  if (norm === 'advanced') return 3;
  return 2;
}

// ============================================================================
// Recommendation Service Class
// ============================================================================

export class RecommendationService {
  /**
   * Return all supported career target roles
   */
  public getAvailableRoles(): Array<{ id: string; title: string; skillCount: number }> {
    return Object.entries(ROLE_SKILL_MAP).map(([id, item]) => ({
      id,
      title: item.title,
      skillCount: item.skillIds.length,
    }));
  }

  /**
   * 1. Deterministic Skill Gap Analysis
   */
  public async getSkillGapAnalysis(
    studentId: string,
    targetType: 'job' | 'project' | 'skill',
    targetId: string
  ): Promise<SkillGapAnalysis> {
    if (!studentId || !targetType || !targetId) {
      throw Object.assign(new Error('studentId, targetType, and targetId are required'), { status: 400 });
    }
    if (!['job', 'project', 'skill'].includes(targetType)) {
      throw Object.assign(new Error('targetType must be one of: job, project, skill'), { status: 400 });
    }

    // 1. Current student skills
    const studentSkills = await graphRepository.findStudentCurrentSkills(studentId);
    const studentSkillIds = new Set(studentSkills.map((s) => s.skillId));

    // 2. Missing skills for target
    const missingRaw = await graphRepository.findMissingSkills(studentId, targetType, targetId);
    const missingSkillIds = new Set(missingRaw.map((s) => s.skillId));

    // 3. Target entity name & required skills determination
    let targetName = targetId;
    let requiredSkills: Array<{ id: string; name: string; category: string; tier?: string }> = [];

    if (targetType === 'job') {
      const jobData = await graphRepository.findJobRequiredSkills(targetId);
      if (jobData) {
        targetName = `${jobData.title} at ${jobData.company}`;
        requiredSkills = jobData.requiredSkills.map((s) => ({
          id: s.skillId,
          name: s.name,
          category: s.category,
          tier: s.tier,
        }));
      }
    } else if (targetType === 'project') {
      const allProjects = await recommendationRepository.findAllProjectsWithSkills();
      const proj = allProjects.find((p) => p.projectId === targetId);
      if (proj) {
        targetName = proj.title;
        requiredSkills = proj.requiredSkills;
      }
    } else if (targetType === 'skill') {
      // Direct skill target
      const prereqs = await graphRepository.findSkillPrerequisites(targetId, 5);
      targetName = targetId;
      requiredSkills = [
        { id: targetId, name: targetId, category: 'Target Skill' },
        ...prereqs.map((p) => ({ id: p.prerequisiteId, name: p.name, category: p.category, tier: p.tier })),
      ];
    }

    // Fallback if target entity query didn't return (e.g. In mocks)
    if (requiredSkills.length === 0 && (missingRaw.length > 0 || studentSkills.length > 0)) {
      // Reconstruct required skills = matched + missing
      const missingMapped = missingRaw.map((m) => ({ id: m.skillId, name: m.name, category: m.category }));
      requiredSkills = [...missingMapped];
    }

    // 4. Compute matched skills
    const matchedSkills = requiredSkills.filter((r) => studentSkillIds.has(r.id));

    // 5. Expand missing skills with prerequisite dependencies
    const missingWithPrereqs = await Promise.all(
      missingRaw.map(async (m) => {
        let prereqs: Array<{ id: string; name: string; category?: string }> = [];
        try {
          const prereqResults = await graphRepository.findSkillPrerequisites(m.skillId, 2);
          prereqs = prereqResults.map((p) => ({
            id: p.prerequisiteId,
            name: p.name,
            category: p.category,
          }));
        } catch {
          prereqs = [];
        }
        return {
          id: m.skillId,
          name: m.name,
          category: m.category,
          prerequisites: prereqs,
        };
      })
    );

    // 6. Readiness calculations
    const totalRequired = Math.max(requiredSkills.length, matchedSkills.length + missingWithPrereqs.length);
    const readinessPercentage = totalRequired > 0 ? Number(((matchedSkills.length / totalRequired) * 100).toFixed(1)) : 0;

    let readinessLevel: 'High' | 'Moderate' | 'Low' = 'Low';
    if (readinessPercentage >= 70) readinessLevel = 'High';
    else if (readinessPercentage >= 40) readinessLevel = 'Moderate';

    // 7. Human-readable explainable summary
    const matchedNames = matchedSkills.map((s) => s.name).join(', ') || 'none';
    const missingNames = missingWithPrereqs.map((s) => s.name).join(', ') || 'none';
    const summary =
      `Student has acquired ${matchedSkills.length} of ${totalRequired} required skills (${readinessPercentage}% readiness). ` +
      `Matched skills: [${matchedNames}]. ` +
      (missingWithPrereqs.length > 0
        ? `Skill gaps detected in: [${missingNames}]. Bridge these gaps via recommended courses and resources.`
        : `All required skills are satisfied!`);

    return {
      studentId,
      target: {
        type: targetType,
        id: targetId,
        name: targetName,
      },
      currentSkills: studentSkills.map((s) => ({
        id: s.skillId,
        name: s.name,
        category: s.category,
        tier: s.tier,
      })),
      requiredSkills,
      matchedSkills,
      missingSkills: missingWithPrereqs,
      readinessPercentage,
      readinessLevel,
      summary,
    };
  }

  /**
   * 2. Deterministic Graph-based Learning Path Recommendation
   * Orders required skills via topological prerequisite traversal
   */
  public async getLearningPathRecommendation(
    studentId: string,
    targetRoleOrKey: string
  ): Promise<LearningPathRecommendation> {
    if (!studentId) {
      throw Object.assign(new Error('studentId is required'), { status: 400 });
    }

    // Resolve target role definition
    const roleKey = Object.keys(ROLE_SKILL_MAP).find(
      (k) => k === targetRoleOrKey.toLowerCase() || ROLE_SKILL_MAP[k].title.toLowerCase() === targetRoleOrKey.toLowerCase()
    ) || 'full-stack-developer';

    const roleDef = ROLE_SKILL_MAP[roleKey];
    const targetSkillIds = roleDef.skillIds;

    // Current student skills
    const currentSkillsRaw = await graphRepository.findStudentCurrentSkills(studentId);
    const studentSkillMap = new Map(currentSkillsRaw.map((s) => [s.skillId, s.name]));

    const alreadyAcquired: Array<{ id: string; name: string }> = [];
    const missingSkillIds: string[] = [];

    for (const skId of targetSkillIds) {
      if (studentSkillMap.has(skId)) {
        alreadyAcquired.push({ id: skId, name: studentSkillMap.get(skId)! });
      } else {
        missingSkillIds.push(skId);
      }
    }

    // Fetch prerequisite metadata for missing skills to build dependency graph
    const skillPrereqMap = new Map<string, string[]>();
    const skillMetadataMap = new Map<string, { name: string; tier: string; category: string }>();

    for (const skId of missingSkillIds) {
      try {
        const prereqs = await graphRepository.findSkillPrerequisites(skId, 5);
        const directPrereqs = prereqs.filter((p) => p.depth === 1).map((p) => p.prerequisiteId);
        skillPrereqMap.set(skId, directPrereqs);

        if (prereqs.length > 0) {
          const selfMeta = prereqs[0];
          skillMetadataMap.set(skId, {
            name: selfMeta.name || skId,
            tier: selfMeta.tier || 'intermediate',
            category: selfMeta.category || 'Technical',
          });
        }
      } catch {
        skillPrereqMap.set(skId, []);
      }
    }

    // Fetch courses and resources that teach these missing skills
    let coursesForMissing: any[] = [];
    let resourcesForMissing: ResourceWithSkillsResult[] = [];
    try {
      coursesForMissing = await graphRepository.findCoursesTeachingMissingSkills(missingSkillIds);
    } catch {
      coursesForMissing = [];
    }
    try {
      resourcesForMissing = await recommendationRepository.findResourcesForSkills(missingSkillIds);
    } catch {
      resourcesForMissing = [];
    }

    // Topological Sort / Prerequisite BFS ordering
    // Skills with no missing prerequisites come first, then intermediate, then advanced
    const orderedMissingSkills = this.topologicalSortSkills(missingSkillIds, skillPrereqMap, studentSkillMap);

    // Build step-by-step learning path
    const orderedLearningPath: LearningPathStep[] = [];
    let stepNum = 1;

    for (const skId of orderedMissingSkills) {
      const meta = skillMetadataMap.get(skId) || {
        name: skId.replace('sk_', '').replace(/_/g, ' ').toUpperCase(),
        tier: 'intermediate',
        category: 'Core',
      };

      const prereqIds = skillPrereqMap.get(skId) || [];
      const prereqsStillNeeded = prereqIds.filter((p) => !studentSkillMap.has(p));

      let reason = `Foundational prerequisite for ${roleDef.title}.`;
      if (prereqsStillNeeded.length > 0) {
        reason = `Advanced step requiring prior completion of [${prereqsStillNeeded.join(', ')}].`;
      } else if (prereqIds.length > 0) {
        reason = `Directly builds upon your existing knowledge of [${prereqIds.join(', ')}].`;
      }

      // Relevant courses
      const relevantCourses = coursesForMissing
        .filter((c) => (c.taughtSkillIds || []).includes(skId))
        .map((c) => ({
          id: c.courseId,
          code: c.code,
          title: c.title,
          difficulty: c.difficulty,
        }))
        .slice(0, 2);

      // Relevant resources
      const relevantResources = resourcesForMissing
        .filter((r) => r.taughtSkills.some((s) => s.id === skId))
        .map((r) => ({
          id: r.resourceId,
          title: r.title,
          type: r.type,
          difficulty: r.difficulty,
        }))
        .slice(0, 2);

      orderedLearningPath.push({
        step: stepNum++,
        skillId: skId,
        skillName: meta.name,
        category: meta.category,
        tier: meta.tier,
        reason,
        prerequisites: prereqIds,
        suggestedCourses: relevantCourses,
        suggestedResources: relevantResources,
      });
    }

    const explanation =
      `Personalized graph learning path for '${roleDef.title}'. ` +
      `You already possess ${alreadyAcquired.length} skills (${alreadyAcquired.map((s) => s.name).join(', ') || 'none'}). ` +
      `Sequence of ${orderedLearningPath.length} steps ordered by dependency graph prerequisites so foundational requirements are met before advanced topics.`;

    return {
      studentId,
      targetRole: roleDef.title,
      currentSkills: currentSkillsRaw.map((s) => ({ id: s.skillId, name: s.name })),
      targetSkills: targetSkillIds.map((id) => ({
        id,
        name: id.replace('sk_', '').replace(/_/g, ' ').toUpperCase(),
      })),
      alreadyAcquiredSkills: alreadyAcquired,
      missingSkills: orderedMissingSkills.map((id) => ({
        id,
        name: (skillMetadataMap.get(id)?.name || id).replace('sk_', ''),
      })),
      orderedLearningPath,
      estimatedSteps: orderedLearningPath.length,
      explanation,
    };
  }

  /**
   * Helper: Topologically sort skills based on prerequisite dependencies
   */
  private topologicalSortSkills(
    skillIds: string[],
    prereqMap: Map<string, string[]>,
    knownSkills: Map<string, string>
  ): string[] {
    const remaining = new Set(skillIds);
    const sorted: string[] = [];
    const satisfied = new Set(knownSkills.keys());

    let progress = true;
    while (remaining.size > 0 && progress) {
      progress = false;
      for (const skill of Array.from(remaining)) {
        const prereqs = prereqMap.get(skill) || [];
        // Can be taken if all prerequisites are either already known or already ordered in sorted list
        const canTake = prereqs.every((p) => satisfied.has(p) || !skillIds.includes(p));
        if (canTake) {
          sorted.push(skill);
          satisfied.add(skill);
          remaining.delete(skill);
          progress = true;
        }
      }
    }

    // Append any circular or remaining skills
    for (const skill of remaining) {
      sorted.push(skill);
    }

    return sorted;
  }

  /**
   * 3. Deterministic Course Recommendations with Explainability & Multi-Criteria Scoring
   */
  public async getRecommendedCourses(studentId: string, limit: number = 10): Promise<CourseRecommendation[]> {
    if (!studentId) {
      throw Object.assign(new Error('studentId is required'), { status: 400 });
    }

    // 1. Student metadata
    const [studentSkills, studentInterests, completedCourses, allCourses, popularityMap] = await Promise.all([
      graphRepository.findStudentCurrentSkills(studentId),
      recommendationRepository.findStudentInterests(studentId),
      recommendationRepository.findStudentCompletedCourses(studentId),
      recommendationRepository.findAllCoursesWithSkills(),
      recommendationRepository.findSkillPopularity().catch(() => new Map<string, number>()),
    ]);

    const studentSkillIds = new Set(studentSkills.map((s) => s.skillId));
    const completedCourseIds = new Set(completedCourses.map((c) => c.courseId));
    const interestCategories = new Set(studentInterests.map((i) => i.category.toLowerCase()));
    const interestSkillIds = new Set(studentInterests.map((i) => i.skillId));

    const weights = RECOMMENDATION_WEIGHTS.course;
    const recommendations: CourseRecommendation[] = [];

    for (const course of allCourses) {
      // Filter out completed courses
      if (completedCourseIds.has(course.courseId)) continue;

      const taughtSkills = course.taughtSkills || [];
      if (taughtSkills.length === 0) continue;

      // a. New Skill Ratio
      const newSkills = taughtSkills.filter((sk) => !studentSkillIds.has(sk.id));
      const newSkillScore = newSkills.length / taughtSkills.length;

      // b. Prerequisite Satisfaction
      const prereqs = course.prerequisiteCourseIds || [];
      let prerequisiteScore = 1.0;
      let prerequisitesMet = true;
      if (prereqs.length > 0) {
        const completedPrereqs = prereqs.filter((p) => completedCourseIds.has(p));
        prerequisiteScore = completedPrereqs.length / prereqs.length;
        prerequisitesMet = completedPrereqs.length === prereqs.length;
      }

      // c. Interest Match
      let interestScore = 0.0;
      const matchesCategory = interestCategories.has((course.department || '').toLowerCase());
      const teachesInterestedSkill = taughtSkills.some((sk) => interestSkillIds.has(sk.id));
      if (matchesCategory && teachesInterestedSkill) interestScore = 1.0;
      else if (matchesCategory || teachesInterestedSkill) interestScore = 0.7;

      // d. Difficulty Fit (introductory for 0-2 skills, intermediate for 3-6, advanced for 7+)
      const studentSkillCount = studentSkillIds.size;
      const courseDiff = difficultyToNumber(course.difficulty);
      let difficultyScore = 0.5;
      if (studentSkillCount <= 2 && courseDiff === 1) difficultyScore = 1.0;
      else if (studentSkillCount >= 3 && studentSkillCount <= 6 && courseDiff === 2) difficultyScore = 1.0;
      else if (studentSkillCount >= 7 && courseDiff === 3) difficultyScore = 1.0;
      else if (Math.abs((studentSkillCount <= 2 ? 1 : studentSkillCount <= 6 ? 2 : 3) - courseDiff) === 1) {
        difficultyScore = 0.7;
      }

      // e. Demand Bonus
      let maxPop = 0;
      for (const sk of taughtSkills) {
        const pop = popularityMap.get(sk.id) || 0;
        if (pop > maxPop) maxPop = pop;
      }
      const demandBonus = Math.min(1.0, maxPop / 50);

      // Total weighted score
      const finalScore = Number(
        (
          weights.newSkillRatio * newSkillScore +
          weights.prerequisiteMatch * prerequisiteScore +
          weights.interestMatch * interestScore +
          weights.difficultyFit * difficultyScore +
          weights.demandBonus * demandBonus
        ).toFixed(3)
      );

      // Explainable reason generation
      const reasons: string[] = [];
      if (newSkills.length > 0) {
        reasons.push(`teaches ${newSkills.length} new skill(s): [${newSkills.map((s) => s.name).join(', ')}]`);
      } else {
        reasons.push('reinforces already acquired skills');
      }
      if (prerequisitesMet && prereqs.length > 0) {
        reasons.push('all prerequisite courses completed');
      } else if (!prerequisitesMet) {
        reasons.push('has unmet prerequisite courses');
      }
      if (interestScore > 0) {
        reasons.push(`aligns with your campus interests in ${course.department}`);
      }
      reasons.push(`${course.difficulty} level fits your current learning progression`);

      const explanation = `Recommended (score: ${finalScore}) because: ${reasons.join('; ')}.`;

      recommendations.push({
        courseId: course.courseId,
        code: course.code,
        title: course.title,
        department: course.department,
        credits: course.credits,
        difficulty: course.difficulty,
        score: finalScore,
        taughtSkills: taughtSkills.map((s) => ({ id: s.id, name: s.name })),
        newSkillsForStudent: newSkills.map((s) => ({ id: s.id, name: s.name })),
        prerequisitesMet,
        scoreBreakdown: {
          newSkillScore: Number((weights.newSkillRatio * newSkillScore).toFixed(3)),
          prerequisiteScore: Number((weights.prerequisiteMatch * prerequisiteScore).toFixed(3)),
          interestScore: Number((weights.interestMatch * interestScore).toFixed(3)),
          difficultyScore: Number((weights.difficultyFit * difficultyScore).toFixed(3)),
          demandBonus: Number((weights.demandBonus * demandBonus).toFixed(3)),
        },
        explanation,
      });
    }

    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, Math.max(1, limit));
  }

  /**
   * 4. Deterministic Project Recommendations with Multi-Factor Scoring
   */
  public async getRecommendedProjects(studentId: string, limit: number = 10): Promise<ProjectRecommendation[]> {
    if (!studentId) {
      throw Object.assign(new Error('studentId is required'), { status: 400 });
    }

    const [studentSkills, studentInterests, allProjects, popularityMap] = await Promise.all([
      graphRepository.findStudentCurrentSkills(studentId),
      recommendationRepository.findStudentInterests(studentId),
      recommendationRepository.findAllProjectsWithSkills(),
      recommendationRepository.findSkillPopularity().catch(() => new Map<string, number>()),
    ]);

    const studentSkillIds = new Set(studentSkills.map((s) => s.skillId));
    const interestDomains = new Set(studentInterests.map((i) => i.category.toLowerCase()));
    const weights = RECOMMENDATION_WEIGHTS.project;

    const recommendations: ProjectRecommendation[] = [];

    for (const proj of allProjects) {
      const requiredSkills = proj.requiredSkills || [];
      if (requiredSkills.length === 0) continue;

      const matchedSkills = requiredSkills.filter((s) => studentSkillIds.has(s.id));
      const skillsToAcquire = requiredSkills.filter((s) => !studentSkillIds.has(s.id));

      // a. Skill Compatibility (% of required skills student currently has)
      const skillCompatibility = matchedSkills.length / requiredSkills.length;

      // b. Skill Growth (balance between already knowing enough to start and learning 1-2 new skills)
      let skillGrowth = 0.5;
      if (skillsToAcquire.length >= 1 && skillsToAcquire.length <= 3) skillGrowth = 1.0;
      else if (skillsToAcquire.length === 0) skillGrowth = 0.3; // No new skills to learn
      else skillGrowth = 0.2; // Too many missing skills

      // c. Interest Match
      let interestMatch = 0.2;
      if (interestDomains.has((proj.domain || '').toLowerCase())) {
        interestMatch = 1.0;
      }

      // d. Difficulty Fit
      const projDiff = difficultyToNumber(proj.difficulty);
      const studentSkillCount = studentSkillIds.size;
      let difficultyFit = 0.6;
      if (studentSkillCount <= 2 && projDiff === 1) difficultyFit = 1.0;
      else if (studentSkillCount >= 3 && studentSkillCount <= 6 && projDiff === 2) difficultyFit = 1.0;
      else if (studentSkillCount >= 7 && projDiff === 3) difficultyFit = 1.0;

      // e. Popularity / community relevance
      let maxPop = 0;
      for (const sk of requiredSkills) {
        const pop = popularityMap.get(sk.id) || 0;
        if (pop > maxPop) maxPop = pop;
      }
      const popularity = Math.min(1.0, maxPop / 50);

      const finalScore = Number(
        (
          weights.skillCompatibility * skillCompatibility +
          weights.skillGrowth * skillGrowth +
          weights.interestMatch * interestMatch +
          weights.difficultyFit * difficultyFit +
          weights.popularity * popularity
        ).toFixed(3)
      );

      // Explainable reason
      const reasons: string[] = [];
      reasons.push(
        `you have ${matchedSkills.length} of ${requiredSkills.length} required skills (${(skillCompatibility * 100).toFixed(0)}% match: [${matchedSkills.map((s) => s.name).join(', ') || 'none'}])`
      );
      if (skillsToAcquire.length > 0) {
        reasons.push(`offers skill growth in [${skillsToAcquire.map((s) => s.name).join(', ')}]`);
      }
      if (interestMatch > 0.5) {
        reasons.push(`matches your interest domain in ${proj.domain}`);
      }
      reasons.push(`${proj.difficulty} difficulty aligns with your current skill maturity`);

      const explanation = `Recommended project (score: ${finalScore}) because: ${reasons.join('; ')}.`;

      recommendations.push({
        projectId: proj.projectId,
        title: proj.title,
        domain: proj.domain,
        difficulty: proj.difficulty,
        score: finalScore,
        requiredSkills: requiredSkills.map((s) => ({ id: s.id, name: s.name })),
        matchedSkills: matchedSkills.map((s) => ({ id: s.id, name: s.name })),
        skillsToAcquire: skillsToAcquire.map((s) => ({ id: s.id, name: s.name })),
        scoreBreakdown: {
          skillCompatibility: Number((weights.skillCompatibility * skillCompatibility).toFixed(3)),
          skillGrowth: Number((weights.skillGrowth * skillGrowth).toFixed(3)),
          interestMatch: Number((weights.interestMatch * interestMatch).toFixed(3)),
          difficultyFit: Number((weights.difficultyFit * difficultyFit).toFixed(3)),
          popularity: Number((weights.popularity * popularity).toFixed(3)),
        },
        explanation,
      });
    }

    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, Math.max(1, limit));
  }

  /**
   * 5. Deterministic Job Recommendations with Transparent Readiness Scoring
   */
  public async getRecommendedJobs(studentId: string, limit: number = 10): Promise<JobRecommendation[]> {
    if (!studentId) {
      throw Object.assign(new Error('studentId is required'), { status: 400 });
    }

    const [studentSkills, studentInterests, allJobs, popularityMap] = await Promise.all([
      graphRepository.findStudentCurrentSkills(studentId),
      recommendationRepository.findStudentInterests(studentId),
      recommendationRepository.findAllJobsWithSkills(),
      recommendationRepository.findSkillPopularity().catch(() => new Map<string, number>()),
    ]);

    const studentSkillIds = new Set(studentSkills.map((s) => s.skillId));
    const interestDomains = new Set(studentInterests.map((i) => i.category.toLowerCase()));
    const weights = RECOMMENDATION_WEIGHTS.job;

    const recommendations: JobRecommendation[] = [];

    for (const job of allJobs) {
      const requiredSkills = job.requiredSkills || [];
      if (requiredSkills.length === 0) continue;

      const matchedSkills = requiredSkills.filter((s) => studentSkillIds.has(s.id));
      const missingSkills = requiredSkills.filter((s) => !studentSkillIds.has(s.id));

      const readinessPercentage = Number(((matchedSkills.length / requiredSkills.length) * 100).toFixed(1));

      // a. Skill Match
      const skillMatch = matchedSkills.length / requiredSkills.length;

      // b. Domain Match
      let domainMatch = 0.2;
      if (interestDomains.has((job.preferredDomain || '').toLowerCase())) {
        domainMatch = 1.0;
      }

      // c. Readiness Ratio
      const readinessRatio = skillMatch;

      // d. Feasibility of learning missing skills (shorter gap = more feasible)
      let feasibility = 1.0;
      if (missingSkills.length > 4) feasibility = 0.3;
      else if (missingSkills.length > 2) feasibility = 0.6;
      else if (missingSkills.length > 0) feasibility = 0.85;

      // e. Popularity / role demand
      let maxPop = 0;
      for (const sk of requiredSkills) {
        const pop = popularityMap.get(sk.id) || 0;
        if (pop > maxPop) maxPop = pop;
      }
      const popularity = Math.min(1.0, maxPop / 50);

      const finalScore = Number(
        (
          weights.skillMatch * skillMatch +
          weights.domainMatch * domainMatch +
          weights.readinessRatio * readinessRatio +
          weights.feasibility * feasibility +
          weights.popularity * popularity
        ).toFixed(3)
      );

      const reasons: string[] = [];
      reasons.push(
        `${readinessPercentage}% skill match with [${matchedSkills.map((s) => s.name).join(', ') || 'no matched skills yet'}]`
      );
      if (missingSkills.length === 0) {
        reasons.push('full candidate readiness; all required skills met');
      } else {
        reasons.push(`bridgeable skill gap in [${missingSkills.map((s) => s.name).join(', ')}]`);
      }
      if (domainMatch > 0.5) {
        reasons.push(`target domain '${job.preferredDomain}' aligns with student campus interests`);
      }

      const explanation = `Recommended career opportunity (score: ${finalScore}) because: ${reasons.join('; ')}.`;

      recommendations.push({
        jobId: job.jobId,
        title: job.title,
        company: job.company,
        type: job.type,
        preferredDomain: job.preferredDomain,
        score: finalScore,
        readinessPercentage,
        matchedSkills: matchedSkills.map((s) => ({ id: s.id, name: s.name })),
        missingSkills: missingSkills.map((s) => ({ id: s.id, name: s.name })),
        scoreBreakdown: {
          skillMatch: Number((weights.skillMatch * skillMatch).toFixed(3)),
          domainMatch: Number((weights.domainMatch * domainMatch).toFixed(3)),
          readinessRatio: Number((weights.readinessRatio * readinessRatio).toFixed(3)),
          feasibility: Number((weights.feasibility * feasibility).toFixed(3)),
          popularity: Number((weights.popularity * popularity).toFixed(3)),
        },
        explanation,
      });
    }

    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, Math.max(1, limit));
  }

  /**
   * 6. Detailed Job Readiness Analysis for a Specific Job
   */
  public async getJobReadinessAnalysis(studentId: string, jobId: string): Promise<JobReadinessAnalysis> {
    if (!studentId || !jobId) {
      throw Object.assign(new Error('studentId and jobId are required'), { status: 400 });
    }

    const jobData = await graphRepository.findJobRequiredSkills(jobId);
    if (!jobData) {
      throw Object.assign(new Error(`Job not found with ID: ${jobId}`), { status: 404 });
    }

    const studentSkills = await graphRepository.findStudentCurrentSkills(studentId);
    const studentSkillIds = new Set(studentSkills.map((s) => s.skillId));

    const matchedSkills = jobData.requiredSkills.filter((s) => studentSkillIds.has(s.skillId));
    const missingSkillsRaw = jobData.requiredSkills.filter((s) => !studentSkillIds.has(s.skillId));

    const totalRequired = jobData.requiredSkills.length;
    const readinessPercentage = totalRequired > 0 ? Number(((matchedSkills.length / totalRequired) * 100).toFixed(1)) : 0;

    let readinessVerdict: 'Ready to Apply' | 'Preparation Required' | 'Substantial Upskilling Needed' =
      'Substantial Upskilling Needed';
    if (readinessPercentage >= 75) readinessVerdict = 'Ready to Apply';
    else if (readinessPercentage >= 40) readinessVerdict = 'Preparation Required';

    // Enrich missing skills with prerequisite graph traversal
    const missingWithPrereqs = await Promise.all(
      missingSkillsRaw.map(async (m) => {
        let prereqs: Array<{ id: string; name: string }> = [];
        try {
          const res = await graphRepository.findSkillPrerequisites(m.skillId, 2);
          prereqs = res.map((p) => ({ id: p.prerequisiteId, name: p.name }));
        } catch {
          prereqs = [];
        }
        return {
          id: m.skillId,
          name: m.name,
          category: m.category,
          prerequisites: prereqs,
        };
      })
    );

    // Build targeted learning path to prepare for this specific job
    const missingSkillIds = missingSkillsRaw.map((s) => s.skillId);
    let coursesForMissing: any[] = [];
    let resourcesForMissing: ResourceWithSkillsResult[] = [];
    try {
      coursesForMissing = await graphRepository.findCoursesTeachingMissingSkills(missingSkillIds);
    } catch {
      coursesForMissing = [];
    }
    try {
      resourcesForMissing = await recommendationRepository.findResourcesForSkills(missingSkillIds);
    } catch {
      resourcesForMissing = [];
    }

    const recommendedLearningPath: LearningPathStep[] = missingWithPrereqs.map((m, idx) => ({
      step: idx + 1,
      skillId: m.id,
      skillName: m.name,
      category: m.category,
      tier: 'intermediate',
      reason: `Required core skill for ${jobData.title} at ${jobData.company}`,
      prerequisites: m.prerequisites.map((p) => p.id),
      suggestedCourses: coursesForMissing
        .filter((c) => (c.taughtSkillIds || []).includes(m.id))
        .map((c) => ({
          id: c.courseId,
          code: c.code,
          title: c.title,
          difficulty: c.difficulty,
        }))
        .slice(0, 2),
      suggestedResources: resourcesForMissing
        .filter((r) => r.taughtSkills.some((s) => s.id === m.id))
        .map((r) => ({
          id: r.resourceId,
          title: r.title,
          type: r.type,
          difficulty: r.difficulty,
        }))
        .slice(0, 2),
    }));

    const explanation =
      `Readiness analysis for '${jobData.title}' at ${jobData.company}. ` +
      `Student satisfies ${matchedSkills.length} of ${totalRequired} mandatory skills (${readinessPercentage}% readiness - ${readinessVerdict}). ` +
      (missingSkillsRaw.length === 0
        ? 'Profile meets all stated requirements!'
        : `Complete ${recommendedLearningPath.length} targeted learning steps to reach 100% role readiness.`);

    return {
      studentId,
      job: {
        id: jobData.jobId,
        title: jobData.title,
        company: jobData.company,
        type: 'full_time',
        preferredDomain: 'Software Engineering',
      },
      readinessPercentage,
      readinessVerdict,
      matchedSkills: matchedSkills.map((s) => ({ id: s.skillId, name: s.name, category: s.category })),
      missingSkills: missingWithPrereqs,
      recommendedLearningPath,
      estimatedPreparationSteps: recommendedLearningPath.length,
      explanation,
    };
  }

  /**
   * 7. Deterministic Learning Resource Recommendations
   */
  public async getRecommendedResources(studentId: string, limit: number = 10): Promise<ResourceRecommendation[]> {
    if (!studentId) {
      throw Object.assign(new Error('studentId is required'), { status: 400 });
    }

    const [studentSkills, studentInterests] = await Promise.all([
      graphRepository.findStudentCurrentSkills(studentId),
      recommendationRepository.findStudentInterests(studentId),
    ]);

    const studentSkillIds = new Set(studentSkills.map((s) => s.skillId));
    const interestSkillIds = studentInterests.map((i) => i.skillId);

    // Target missing skills that align with student interests
    const targetMissingSkillIds = interestSkillIds.filter((id) => !studentSkillIds.has(id));
    const skillIdsToSearch = targetMissingSkillIds.length > 0 ? targetMissingSkillIds : Array.from(studentSkillIds);

    const resources = await recommendationRepository.findResourcesForSkills(skillIdsToSearch);
    const recommendations: ResourceRecommendation[] = [];

    for (const res of resources) {
      const taught = res.taughtSkills || [];
      const relevantMissing = taught.filter((s) => !studentSkillIds.has(s.id));
      const relevantKnown = taught.filter((s) => studentSkillIds.has(s.id));

      let score = 0.4;
      if (relevantMissing.length > 0) score += 0.5;
      if (res.difficulty === 'intermediate') score += 0.1;

      score = Number(Math.min(1.0, score).toFixed(2));

      const reasons: string[] = [];
      if (relevantMissing.length > 0) {
        reasons.push(`teaches unacquired skill(s): [${relevantMissing.map((s) => s.name).join(', ')}]`);
      }
      if (relevantKnown.length > 0) {
        reasons.push(`deepens expertise in [${relevantKnown.map((s) => s.name).join(', ')}]`);
      }
      reasons.push(`${res.type} format suits self-paced learning`);

      recommendations.push({
        resourceId: res.resourceId,
        title: res.title,
        type: res.type,
        difficulty: res.difficulty,
        score,
        taughtSkills: taught,
        relevantMissingSkills: relevantMissing,
        explanation: `Recommended resource (score: ${score}) because: ${reasons.join('; ')}.`,
      });
    }

    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, Math.max(1, limit));
  }
}

export const recommendationService = new RecommendationService();
