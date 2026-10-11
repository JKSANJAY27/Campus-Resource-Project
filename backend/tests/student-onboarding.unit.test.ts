import { describe, it, expect, vi, beforeEach } from 'vitest';
import { studentService } from '../src/services/student.service.js';
import { studentRepository } from '../src/repositories/mongo/student.repository.js';
import { courseRepository } from '../src/repositories/mongo/course.repository.js';
import { skillRepository } from '../src/repositories/mongo/skill.repository.js';
import { syncService } from '../src/services/sync.service.js';
import { cacheService } from '../src/services/cache.service.js';

describe('Student Onboarding & Profile Intelligence Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should map course completion to taught skills as course_exposure without claiming mastery', async () => {
    const mockStudent: any = {
      studentId: 'STU_TEST_01',
      name: 'Aarav Patel',
      skills: [
        {
          skillId: 'sk_python',
          level: 'intermediate',
          competenceType: 'self_reported',
        },
      ],
      completedCourses: [],
    };

    const mockCourse: any = {
      courseId: 'CS301',
      code: 'CS301',
      title: 'Database Engineering',
      taughtSkillIds: ['sk_sql', 'sk_nosql', 'sk_python'],
    };

    vi.spyOn(courseRepository, 'findById').mockResolvedValue(mockCourse);
    vi.spyOn(studentRepository, 'findById').mockResolvedValue(mockStudent);
    vi.spyOn(studentRepository, 'addCompletedCourse').mockResolvedValue({
      ...mockStudent,
      completedCourses: [{ courseId: 'CS301', grade: 'A', completedSemester: 4 }],
    });

    const addSkillSpy = vi.spyOn(studentRepository, 'addOrUpdateSkill').mockResolvedValue(mockStudent);
    vi.spyOn(syncService, 'propagateStudentCourseCompleted').mockResolvedValue({} as any);
    vi.spyOn(syncService, 'propagateStudentSkillAcquired').mockResolvedValue({} as any);
    vi.spyOn(cacheService, 'invalidateStudentCache').mockResolvedValue(1);

    await studentService.addCompletedCourse('STU_TEST_01', 'CS301', 'A', 4, 'completed');

    expect(studentRepository.addCompletedCourse).toHaveBeenCalledWith(
      'STU_TEST_01',
      'CS301',
      'A',
      4,
      'completed'
    );

    // sk_sql and sk_nosql should be added as course_exposure
    expect(addSkillSpy).toHaveBeenCalledWith(
      'STU_TEST_01',
      'sk_sql',
      'beginner',
      'course_exposure',
      expect.stringContaining('CS301')
    );
    expect(addSkillSpy).toHaveBeenCalledWith(
      'STU_TEST_01',
      'sk_nosql',
      'beginner',
      'course_exposure',
      expect.stringContaining('CS301')
    );

    // sk_python was already intermediate self_reported, so it should NOT be overwritten with beginner course_exposure
    const callsWithPython = addSkillSpy.mock.calls.filter((call) => call[1] === 'sk_python');
    expect(callsWithPython.length).toBe(0);
  });

  it('should support adding, removing courses and skills', async () => {
    const mockStudent: any = {
      studentId: 'STU_TEST_02',
      name: 'Diya Sharma',
      skills: [{ skillId: 'sk_docker', level: 'intermediate' }],
      completedCourses: [{ courseId: 'CS201', grade: 'A' }],
    };

    vi.spyOn(studentRepository, 'findById').mockResolvedValue(mockStudent);
    vi.spyOn(studentRepository, 'removeCompletedCourse').mockResolvedValue({
      ...mockStudent,
      completedCourses: [],
    });
    vi.spyOn(studentRepository, 'removeSkill').mockResolvedValue({
      ...mockStudent,
      skills: [],
    });
    vi.spyOn(cacheService, 'invalidateStudentCache').mockResolvedValue(1);

    await studentService.removeCompletedCourse('STU_TEST_02', 'CS201');
    expect(studentRepository.removeCompletedCourse).toHaveBeenCalledWith('STU_TEST_02', 'CS201');

    await studentService.removeSkill('STU_TEST_02', 'sk_docker');
    expect(studentRepository.removeSkill).toHaveBeenCalledWith('STU_TEST_02', 'sk_docker');
  });

  it('should record custom projects and tag skills as project_demonstrated', async () => {
    const mockStudent: any = {
      studentId: 'STU_TEST_03',
      name: 'Rohan Verma',
      skills: [],
      customProjects: [],
    };

    vi.spyOn(studentRepository, 'findById').mockResolvedValue(mockStudent);
    vi.spyOn(studentRepository, 'addOrUpdateCustomProject').mockResolvedValue(mockStudent);
    const addSkillSpy = vi.spyOn(studentRepository, 'addOrUpdateSkill').mockResolvedValue(mockStudent);
    vi.spyOn(syncService, 'propagateStudentSkillAcquired').mockResolvedValue({} as any);
    vi.spyOn(cacheService, 'invalidateStudentCache').mockResolvedValue(1);

    await studentService.addOrUpdateCustomProject('STU_TEST_03', {
      title: 'High-Throughput Distributed Cache',
      description: 'Built a Redis-compatible memory cache in Go and TypeScript',
      technologiesUsed: ['TypeScript', 'Redis', 'Docker'],
      skillsDemonstrated: ['sk_redis', 'sk_docker'],
      role: 'Lead Developer',
      link: 'https://github.com/example/cache',
    });

    expect(studentRepository.addOrUpdateCustomProject).toHaveBeenCalled();
    expect(addSkillSpy).toHaveBeenCalledWith(
      'STU_TEST_03',
      'sk_redis',
      'intermediate',
      'project_demonstrated',
      expect.stringContaining('High-Throughput Distributed Cache')
    );
    expect(addSkillSpy).toHaveBeenCalledWith(
      'STU_TEST_03',
      'sk_docker',
      'intermediate',
      'project_demonstrated',
      expect.stringContaining('High-Throughput Distributed Cache')
    );
  });

  it('should onboard or update student profile without losing previously saved data', async () => {
    const existingStudent: any = {
      studentId: 'STU_TEST_04',
      name: 'Existing Student',
      email: 'existing@campus.edu',
      department: 'Computer Science',
      currentSemester: 3,
      cgpa: 8.2,
      interests: ['AI'],
      careerInterests: ['AI/ML Engineer'],
      skills: [{ skillId: 'sk_python', level: 'intermediate', competenceType: 'self_reported' }],
      completedCourses: [{ courseId: 'CS101', grade: 'A', completedSemester: 1 }],
      customProjects: [],
    };

    vi.spyOn(studentRepository, 'findById').mockResolvedValue(existingStudent);
    vi.spyOn(studentRepository, 'update').mockResolvedValue({
      ...existingStudent,
      degree: 'B.Tech Honours',
      graduationYear: 2027,
      workArrangement: 'hybrid',
      roleLevelPreference: 'internship',
    });
    vi.spyOn(syncService, 'propagateStudentUpdate').mockResolvedValue({} as any);
    vi.spyOn(cacheService, 'invalidateStudentCache').mockResolvedValue(1);

    const updated = await studentService.onboardOrUpdateStudent('STU_TEST_04', {
      degree: 'B.Tech Honours',
      graduationYear: 2027,
      workArrangement: 'hybrid',
      roleLevelPreference: 'internship',
      preferredLocations: ['Bengaluru', 'Remote'],
    });

    expect(studentRepository.update).toHaveBeenCalledWith('STU_TEST_04', expect.objectContaining({
      degree: 'B.Tech Honours',
      graduationYear: 2027,
      workArrangement: 'hybrid',
      roleLevelPreference: 'internship',
    }));
  });

  it('should generate profile summary with competence tier breakdown', async () => {
    const fullStudent: any = {
      studentId: 'STU_TEST_05',
      name: 'Neha Kapoor',
      rollNumber: 'CS26-055',
      email: 'neha@campus.edu',
      department: 'Computer Science & Engineering',
      degree: 'B.Tech',
      branch: 'Artificial Intelligence',
      institution: 'NIT Campus',
      graduationYear: 2026,
      currentSemester: 6,
      cgpa: 9.1,
      interests: ['Machine Learning', 'Cloud Architecture'],
      careerInterests: ['AI Engineer', 'Data Engineer'],
      preferredLocations: ['Remote', 'Hyderabad'],
      workArrangement: 'remote',
      roleLevelPreference: 'entry_level',
      completedCourses: [
        { courseId: 'CS101', grade: 'A+', completedSemester: 1 },
        { courseId: 'CS201', grade: 'A', completedSemester: 3 },
      ],
      skills: [
        { skillId: 'sk_python', level: 'advanced', competenceType: 'project_demonstrated' },
        { skillId: 'sk_sql', level: 'intermediate', competenceType: 'course_exposure' },
        { skillId: 'sk_docker', level: 'intermediate', competenceType: 'self_reported' },
        { skillId: 'sk_aws', level: 'advanced', competenceType: 'verified' },
      ],
      customProjects: [
        {
          projectId: 'p_1',
          title: 'Campus Recommendation Graph',
          technologiesUsed: ['Neo4j', 'MongoDB'],
          skillsDemonstrated: ['sk_neo4j'],
        },
      ],
      certifications: [
        { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services' },
      ],
      updatedAt: new Date(),
    };

    vi.spyOn(studentRepository, 'findById').mockResolvedValue(fullStudent);

    const summary = await studentService.getProfileSummary('STU_TEST_05');

    expect(summary.studentId).toBe('STU_TEST_05');
    expect(summary.totalSkillsCount).toBe(4);
    expect(summary.competenceBreakdown.projectDemonstrated.count).toBe(1);
    expect(summary.competenceBreakdown.courseExposure.count).toBe(1);
    expect(summary.competenceBreakdown.selfReported.count).toBe(1);
    expect(summary.competenceBreakdown.verified.count).toBe(1);
    expect(summary.completedCoursesCount).toBe(2);
    expect(summary.customProjects.length).toBe(1);
    expect(summary.certifications.length).toBe(1);
  });
});
