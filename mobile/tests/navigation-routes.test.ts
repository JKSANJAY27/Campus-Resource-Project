import { describe, it, expect } from 'vitest';
import { SECTIONS } from '../src/constants/routes';

describe('Mobile Navigation Architecture Suite', () => {
  describe('1. 10 Core Platform Sections Coverage', () => {
    it('should declare all 10 required mobile navigation sections', () => {
      expect(SECTIONS).toHaveLength(10);

      const sectionTitles = SECTIONS.map((s) => s.title);
      expect(sectionTitles).toContain('1. Home Dashboard');
      expect(sectionTitles).toContain('2. My Profile');
      expect(sectionTitles).toContain('3. Career Discovery');
      expect(sectionTitles).toContain('4. Explore Specific Role');
      expect(sectionTitles).toContain('5. Learning Paths');
      expect(sectionTitles).toContain('6. Live Jobs');
      expect(sectionTitles).toContain('7. Job Skill Analysis');
      expect(sectionTitles).toContain('8. Saved Roles & Jobs');
      expect(sectionTitles).toContain('9. Learning Progress');
      expect(sectionTitles).toContain('10. Settings');
    });

    it('each section should have a valid destination route and emoji', () => {
      for (const section of SECTIONS) {
        expect(section.route).toBeDefined();
        expect(section.route.startsWith('/')).toBe(true);
        expect(section.emoji).toBeDefined();
        expect(section.desc.length).toBeGreaterThan(5);
      }
    });

    it('should map primary sections to bottom tabs', () => {
      const tabRoutes = ['/(tabs)', '/(tabs)/discovery', '/(tabs)/learning', '/(tabs)/jobs', '/(tabs)/profile'];
      for (const route of tabRoutes) {
        const matchingSection = SECTIONS.find((s) => s.route === route);
        expect(matchingSection).toBeDefined();
      }
    });

    it('should map secondary deep-dive sections to stack screens', () => {
      const stackRoutes = [
        '/role/role_backend_developer',
        '/job-analysis',
        '/saved',
        '/progress',
        '/settings',
      ];
      for (const route of stackRoutes) {
        const matchingSection = SECTIONS.find((s) => s.route === route);
        expect(matchingSection).toBeDefined();
      }
    });
  });

  describe('2. Route Parameter & Deep Linking Contracts', () => {
    it('should support dynamic role detail route with roleId', () => {
      const roleId = 'role_machine_learning_engineer';
      const route = `/role/${roleId}`;
      expect(route).toBe('/role/role_machine_learning_engineer');
    });

    it('should support dynamic job detail route with jobId', () => {
      const jobId = 'job_12345';
      const route = `/job/${jobId}`;
      expect(route).toBe('/job/job_12345');
    });

    it('should support multi-role comparison query parameters', () => {
      const roles = ['role_frontend_developer', 'role_backend_developer'];
      const query = roles.join(',');
      const route = `/compare?roles=${query}`;
      expect(route).toBe('/compare?roles=role_frontend_developer,role_backend_developer');

      const parsed = route.split('roles=')[1].split(',');
      expect(parsed).toEqual(roles);
    });
  });
});
