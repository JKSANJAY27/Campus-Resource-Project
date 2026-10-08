import { describe, it, expect } from 'vitest';
import { DatasetGenerator } from '../src/generator/dataset-generator.js';
import { validateDataset } from '../src/generator/validator.js';

describe('Synthetic Campus Dataset Generator & Validator', () => {
  it('should generate a 100% deterministic dataset when given identical seeds', () => {
    const gen1 = new DatasetGenerator({ scale: 'small', seed: 42 });
    const data1 = gen1.generate();

    const gen2 = new DatasetGenerator({ scale: 'small', seed: 42 });
    const data2 = gen2.generate();

    expect(data1.students.length).toBe(data2.students.length);
    expect(data1.students[0].name).toBe(data2.students[0].name);
    expect(data1.students[0].email).toBe(data2.students[0].email);
    expect(data1.students[0].skills).toEqual(data2.students[0].skills);
    expect(data1.cassandraEvents.studentActivity.length).toBe(data2.cassandraEvents.studentActivity.length);
  });

  it('should produce different datasets when given different seeds', () => {
    const genA = new DatasetGenerator({ scale: 'small', seed: 101 });
    const dataA = genA.generate();

    const genB = new DatasetGenerator({ scale: 'small', seed: 999 });
    const dataB = genB.generate();

    expect(dataA.students[0].name).not.toBe(dataB.students[0].name);
  });

  it('should validate DAG acyclicity, referential integrity, and constraints for small scale', () => {
    const gen = new DatasetGenerator({ scale: 'small', seed: 42 });
    const data = gen.generate();

    const validation = validateDataset(data);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(validation.metrics.totalEntities).toBeGreaterThan(150);
    expect(validation.metrics.totalRelationships).toBeGreaterThan(500);
  });

  it('should validate medium scale dataset generation without errors', () => {
    const gen = new DatasetGenerator({ scale: 'medium', seed: 42 });
    const data = gen.generate();

    expect(data.students.length).toBe(1000);
    const validation = validateDataset(data);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('should generate diverse student archetypes with full paths and skill gaps', () => {
    const gen = new DatasetGenerator({ scale: 'small', seed: 42 });
    const data = gen.generate();

    const seniors = data.students.filter((s) => s.currentSemester >= 6);
    const intermediates = data.students.filter((s) => s.currentSemester >= 3 && s.currentSemester <= 5);
    const beginners = data.students.filter((s) => s.currentSemester <= 2);

    expect(seniors.length).toBeGreaterThan(0);
    expect(intermediates.length).toBeGreaterThan(0);
    expect(beginners.length).toBeGreaterThan(0);

    // Seniors should have more skills than beginners on average
    const avgSeniorSkills = seniors.reduce((acc, s) => acc + s.skills.length, 0) / seniors.length;
    const avgBeginnerSkills = beginners.reduce((acc, s) => acc + s.skills.length, 0) / beginners.length;
    expect(avgSeniorSkills).toBeGreaterThan(avgBeginnerSkills);
  });

  it('should generate Cassandra time-series events with valid partition dates', () => {
    const gen = new DatasetGenerator({ scale: 'small', seed: 42 });
    const data = gen.generate();

    expect(data.cassandraEvents.studentActivity.length).toBeGreaterThan(500);
    expect(data.cassandraEvents.resourceAccess.length).toBeGreaterThan(50);
    expect(data.cassandraEvents.recommendationAudit.length).toBeGreaterThan(50);

    const firstActivity = data.cassandraEvents.studentActivity[0];
    expect(firstActivity).toHaveProperty('student_id');
    expect(firstActivity).toHaveProperty('activity_date');
    expect(firstActivity).toHaveProperty('event_timestamp');
    expect(firstActivity).toHaveProperty('action_type');
    expect(firstActivity.activity_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
