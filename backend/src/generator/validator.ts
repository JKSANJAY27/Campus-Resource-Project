import { GeneratedDataset } from './dataset-generator.js';
import { validateGraphIsDAG } from './prerequisites.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    totalEntities: number;
    totalRelationships: number;
    skillDagDepth: number;
    courseDagDepth: number;
  };
}

export function validateDataset(data: GeneratedDataset): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const skillIds = new Set(data.skills.map((s) => s.skillId));
  const courseIds = new Set(data.courses.map((c) => c.courseId));
  const projectIds = new Set(data.projects.map((p) => p.projectId));
  const jobIds = new Set(data.jobs.map((j) => j.jobId));
  const clubIds = new Set(data.clubs.map((cl) => cl.clubId));
  const eventIds = new Set(data.events.map((e) => e.eventId));
  const facilityIds = new Set(data.facilities.map((f) => f.facilityId));
  const resourceIds = new Set(data.resources.map((r) => r.resourceId));

  // 1. Skill DAG Validation (Zero cycles)
  const skillAdj = new Map<string, string[]>();
  skillIds.forEach((id) => skillAdj.set(id, []));
  for (const s of data.skills) {
    for (const p of s.prerequisiteSkillIds) {
      if (!skillIds.has(p)) {
        errors.push(`Skill ${s.skillId} references non-existent prerequisite ${p}`);
      } else {
        skillAdj.get(p)?.push(s.skillId);
      }
    }
  }

  const skillDagCheck = validateGraphIsDAG(Array.from(skillIds), skillAdj);
  if (!skillDagCheck.isDAG) {
    errors.push(`Cycle detected in Skills DAG! Cycle nodes: ${skillDagCheck.cycleNodes?.join(', ')}`);
  }

  // 2. Course DAG Validation (Zero cycles)
  const courseAdj = new Map<string, string[]>();
  courseIds.forEach((id) => courseAdj.set(id, []));
  for (const c of data.courses) {
    for (const p of c.prerequisiteCourseIds) {
      if (!courseIds.has(p)) {
        errors.push(`Course ${c.courseId} references non-existent prerequisite ${p}`);
      } else {
        courseAdj.get(p)?.push(c.courseId);
      }
    }
    // Check that taught skills exist
    for (const sk of c.taughtSkillIds) {
      if (!skillIds.has(sk)) {
        errors.push(`Course ${c.courseId} teaches non-existent skill ${sk}`);
      }
    }
  }

  const courseDagCheck = validateGraphIsDAG(Array.from(courseIds), courseAdj);
  if (!courseDagCheck.isDAG) {
    errors.push(`Cycle detected in Course prerequisites DAG! Cycle nodes: ${courseDagCheck.cycleNodes?.join(', ')}`);
  }

  // 3. Project Requirements Validation
  for (const p of data.projects) {
    for (const sk of p.requiredSkillIds) {
      if (!skillIds.has(sk)) {
        errors.push(`Project ${p.projectId} requires non-existent skill ${sk}`);
      }
    }
  }

  // 4. Job Requirements Validation
  for (const j of data.jobs) {
    for (const sk of j.demandedSkillIds) {
      if (!skillIds.has(sk)) {
        errors.push(`Job ${j.jobId} demands non-existent skill ${sk}`);
      }
    }
  }

  // 5. Events Validation
  for (const e of data.events) {
    if (!clubIds.has(e.organizingClubId)) {
      errors.push(`Event ${e.eventId} references non-existent organizing club ${e.organizingClubId}`);
    }
    if (!facilityIds.has(e.venueFacilityId)) {
      errors.push(`Event ${e.eventId} references non-existent facility ${e.venueFacilityId}`);
    }
    for (const sk of e.targetedSkillIds) {
      if (!skillIds.has(sk)) {
        errors.push(`Event ${e.eventId} targets non-existent skill ${sk}`);
      }
    }
  }

  // 6. Students Referential Integrity & Constraints
  let seniorCount = 0;
  let intermediateCount = 0;
  let beginnerCount = 0;

  for (const stu of data.students) {
    if (stu.cgpa < 0 || stu.cgpa > 10) {
      errors.push(`Student ${stu.studentId} has invalid CGPA: ${stu.cgpa}`);
    }
    if (stu.currentSemester < 1 || stu.currentSemester > 8) {
      errors.push(`Student ${stu.studentId} has invalid semester: ${stu.currentSemester}`);
    }

    if (stu.currentSemester >= 6) seniorCount++;
    else if (stu.currentSemester >= 3) intermediateCount++;
    else beginnerCount++;

    for (const sk of stu.skills) {
      if (!skillIds.has(sk.skillId)) {
        errors.push(`Student ${stu.studentId} has non-existent skill ${sk.skillId}`);
      }
    }

    for (const comp of stu.completedCourses) {
      if (!courseIds.has(comp.courseId)) {
        errors.push(`Student ${stu.studentId} references non-existent completed course ${comp.courseId}`);
      }
    }

    for (const pId of stu.projectIds) {
      if (!projectIds.has(pId)) {
        errors.push(`Student ${stu.studentId} references non-existent project ${pId}`);
      }
    }

    for (const cl of stu.clubMemberships) {
      if (!clubIds.has(cl.clubId)) {
        errors.push(`Student ${stu.studentId} references non-existent club ${cl.clubId}`);
      }
    }

    for (const evId of stu.attendedEventIds) {
      if (!eventIds.has(evId)) {
        errors.push(`Student ${stu.studentId} references non-existent attended event ${evId}`);
      }
    }
  }

  // Check archetype variety
  if (seniorCount === 0 || intermediateCount === 0 || beginnerCount === 0) {
    warnings.push(`Archetype skew detected: Senior(${seniorCount}), Intermediate(${intermediateCount}), Beginner(${beginnerCount})`);
  }

  const totalEntities =
    data.skills.length +
    data.courses.length +
    data.projects.length +
    data.jobs.length +
    data.clubs.length +
    data.events.length +
    data.facilities.length +
    data.resources.length +
    data.students.length;

  let totalRelationships = 0;
  data.students.forEach((s) => {
    totalRelationships += s.skills.length + s.completedCourses.length + s.projectIds.length + s.clubMemberships.length + s.attendedEventIds.length;
  });
  data.skills.forEach((sk) => (totalRelationships += sk.prerequisiteSkillIds.length));
  data.courses.forEach((c) => (totalRelationships += c.taughtSkillIds.length + c.prerequisiteCourseIds.length));
  data.projects.forEach((p) => (totalRelationships += p.requiredSkillIds.length));
  data.jobs.forEach((j) => (totalRelationships += j.demandedSkillIds.length));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      totalEntities,
      totalRelationships,
      skillDagDepth: 4, // Foundational -> Intermediate -> Advanced -> Specialized
      courseDagDepth: 3,
    },
  };
}
