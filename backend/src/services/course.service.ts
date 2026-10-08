import { courseRepository } from '../repositories/mongo/course.repository.js';
import { QueryOptions } from '../types/query.js';

export class CourseService {
  async createCourse(data: Record<string, any>) {
    const existing = await courseRepository.findByCode(data.code);
    if (existing) throw Object.assign(new Error(`Course code '${data.code}' already exists`), { status: 409 });
    return courseRepository.create(data);
  }

  async getCourse(courseId: string) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });
    return course;
  }

  async getCourseByCode(code: string) {
    const course = await courseRepository.findByCode(code);
    if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });
    return course;
  }

  async listCourses(options: QueryOptions & Record<string, any>) {
    return courseRepository.findCourses(options);
  }

  async updateCourse(courseId: string, data: Record<string, any>) {
    const course = await courseRepository.update(courseId, data);
    if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });
    return course;
  }

  async deleteCourse(courseId: string) {
    const deleted = await courseRepository.delete(courseId);
    if (!deleted) throw Object.assign(new Error('Course not found'), { status: 404 });
    return { deleted: true };
  }

  async getPrerequisites(courseId: string) {
    return courseRepository.getPrerequisiteChain(courseId);
  }

  async getCoursePopularity(limit = 10) {
    return courseRepository.getCoursePopularity(limit);
  }

  async getDepartmentDistribution() {
    return courseRepository.getDepartmentDistribution();
  }

  async getCourseSkillMatrix(limit = 20) {
    return courseRepository.getCourseSkillMatrix(limit);
  }

  async findBySkills(skillIds: string[]) {
    return courseRepository.findBySkills(skillIds);
  }
}

export const courseService = new CourseService();
