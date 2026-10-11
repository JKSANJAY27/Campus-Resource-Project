import { createHash } from 'crypto';
import mongoose from 'mongoose';
import { SKILLS_DICTIONARY } from '../constants/skills-dictionary.data.js';
import {
  ExtractedSkill,
  ExtractedExperience,
  ExtractedQualifications,
  JobDescriptionAnalysis,
  StudentJobComparison,
  StudentSkillMatch,
  StudentEvidenceTier,
  RoleJobMarketSummary,
  MarketSkillDemand,
  SkillDictionaryItem,
  ExperienceLevel,
} from '../types/job-analysis.types.js';
import { NormalizedJob } from '../types/job-provider.types.js';
import { externalJobService } from './external-job.service.js';
import { jobService } from './job.service.js';
import { careerDiscoveryService, StudentProfileInput } from './career-discovery.service.js';
import { cacheRepository } from '../repositories/redis/cache.repository.js';
import { CURATED_CAREER_ROLES } from '../constants/career-roles.data.js';
import { CURATED_SKILLS, SkillDefinition } from '../generator/ontology.js';
import { courseRepository } from '../repositories/mongo/course.repository.js';
import { projectRepository } from '../repositories/mongo/project.repository.js';

export class JobAnalyzerService {
  // Cache TTLs in seconds
  private readonly JOB_ANALYSIS_CACHE_TTL = 3600; // 1 hour
  private readonly ROLE_MARKET_CACHE_TTL = 1800; // 30 minutes

  // Common English stop words to filter out during tokenization
  private readonly STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
    'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
    'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
    'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
    'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
    'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
    'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
    'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'you', 'your', 'yours', 'yourself',
  ]);

  /**
   * Sanitizes raw job description text:
   * Strips HTML markup, unescapes entities, and standardizes spacing.
   */
  public sanitizeText(rawHtmlOrText: string): string {
    if (!rawHtmlOrText) return '';

    return rawHtmlOrText
      // Replace block tags with newlines
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
      .replace(/<br\s*[\/]?>/gi, '\n')
      // Strip remaining HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Unescape HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Normalize whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Checks if a match index is preceded by a negative phrase (e.g. "no ... required").
   */
  private isNegatedContext(text: string, matchIndex: number): boolean {
    const lookbackDistance = 45;
    const startIndex = Math.max(0, matchIndex - lookbackDistance);
    const window = text.substring(startIndex, matchIndex).toLowerCase();

    const negationPhrases = [
      'no ',
      'not ',
      'without ',
      "don't need ",
      'do not need ',
      'no prior ',
      'not required',
      'never ',
      'instead of ',
    ];

    return negationPhrases.some((phrase) => window.includes(phrase));
  }

  /**
   * Extracts technical skills, tools, frameworks, and methodologies from text.
   */
  public extractSkills(cleanText: string, jobTitle: string = ''): {
    technicalSkills: ExtractedSkill[];
    toolsAndFrameworks: ExtractedSkill[];
    methodologies: ExtractedSkill[];
  } {
    const combinedText = `${jobTitle}\n\n${cleanText}`;
    const lowerCombined = combinedText.toLowerCase();

    // Word count for TF calculation
    const words = lowerCombined
      .replace(/[^\w\s\+\#\.]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !this.STOP_WORDS.has(w));
    const totalWords = Math.max(words.length, 50);

    const matchesMap = new Map<string, ExtractedSkill>();

    // Sort dictionary items so multi-word phrases are checked before single words
    const sortedDict = [...SKILLS_DICTIONARY].sort((a, b) => {
      const aMaxLen = Math.max(...a.synonyms.map((s) => s.length));
      const bMaxLen = Math.max(...b.synonyms.map((s) => s.length));
      return bMaxLen - aMaxLen;
    });

    for (const item of sortedDict) {
      if (item.category === 'qualification' || item.category === 'certification') {
        continue;
      }

      let termCount = 0;
      let matchedSnippet = '';

      if (item.customRegex) {
        const flags = item.customRegex.flags.includes('g')
          ? item.customRegex.flags
          : item.customRegex.flags + 'g';
        const regex = new RegExp(item.customRegex.source, flags);
        let match: RegExpExecArray | null;
        while ((match = regex.exec(combinedText)) !== null) {
          if (!this.isNegatedContext(combinedText, match.index)) {
            termCount++;
            if (!matchedSnippet) matchedSnippet = match[0];
          }
        }
      } else {
        // Test each synonym
        for (const synonym of item.synonyms) {
          const escaped = synonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const pattern = item.requiresWordBoundary
            ? new RegExp(`\\b${escaped}\\b`, 'gi')
            : new RegExp(escaped, 'gi');

          let match: RegExpExecArray | null;
          while ((match = pattern.exec(combinedText)) !== null) {
            if (!this.isNegatedContext(combinedText, match.index)) {
              termCount++;
              if (!matchedSnippet) matchedSnippet = match[0];
            }
          }
        }
      }

      if (termCount > 0) {
        // Boost if present in job title
        const escapedCanonical = item.canonicalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const inTitle = jobTitle ? new RegExp(escapedCanonical, 'i').test(jobTitle) : false;
        const effectiveCount = inTitle ? termCount + 2 : termCount;

        // TF = count / totalWords; TF-IDF with dictionary weight
        const tf = effectiveCount / totalWords;
        const weight = item.weight || 1.0;
        const tfIdfScore = Number((tf * 100 * weight).toFixed(3));

        matchesMap.set(item.id, {
          id: item.id,
          canonicalName: item.canonicalName,
          category: item.category,
          rawMatchedTerm: matchedSnippet || item.canonicalName,
          termFrequency: termCount,
          tfIdfScore,
          ontologySkillId: item.ontologySkillId,
          confidence: inTitle ? 0.98 : 0.88,
        });
      }
    }

    const technicalSkills: ExtractedSkill[] = [];
    const toolsAndFrameworks: ExtractedSkill[] = [];
    const methodologies: ExtractedSkill[] = [];

    for (const skill of matchesMap.values()) {
      if (skill.category === 'technical_skill') {
        technicalSkills.push(skill);
      } else if (skill.category === 'tool_framework') {
        toolsAndFrameworks.push(skill);
      } else if (skill.category === 'methodology') {
        methodologies.push(skill);
      }
    }

    // Sort by prominence (TF-IDF score descending)
    const sorter = (a: ExtractedSkill, b: ExtractedSkill) => b.tfIdfScore - a.tfIdfScore;
    technicalSkills.sort(sorter);
    toolsAndFrameworks.sort(sorter);
    methodologies.sort(sorter);

    return { technicalSkills, toolsAndFrameworks, methodologies };
  }

  /**
   * Extracts explicit experience requirements (years, range, and seniority level).
   */
  public extractExperience(cleanText: string, jobTitle: string = ''): ExtractedExperience {
    const rawMentions: string[] = [];
    let minYears: number | null = null;
    let maxYears: number | null = null;
    let inferredLevel: ExperienceLevel = 'unspecified';

    const textToScan = `${jobTitle}\n\n${cleanText}`;

    // 1. Check title seniority cues
    const lowerTitle = jobTitle.toLowerCase();
    if (/\b(?:senior|sr\.?|lead|principal|staff|architect)\b/i.test(lowerTitle)) {
      if (/\b(?:lead|principal|staff|architect)\b/i.test(lowerTitle)) {
        inferredLevel = 'lead';
      } else {
        inferredLevel = 'senior';
      }
      rawMentions.push(`Job title specifies: "${jobTitle}"`);
    } else if (/\b(?:junior|jr\.?|intern|internship|entry[- ]level|fresher|graduate)\b/i.test(lowerTitle)) {
      inferredLevel = 'entry';
      rawMentions.push(`Job title specifies: "${jobTitle}"`);
    }

    // 2. Pattern A: Numeric ranges, e.g. "3-5 years of experience", "2 to 4 yrs"
    const rangeRegex = /\b(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\s*(?:\+)?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?(?:proven\s+|relevant\s+|industry\s+|software\s+)?experience)?\b/gi;
    let rangeMatch: RegExpExecArray | null;
    const matchedRangeSpans: Array<[number, number]> = [];
    while ((rangeMatch = rangeRegex.exec(textToScan)) !== null) {
      const low = parseInt(rangeMatch[1], 10);
      const high = parseInt(rangeMatch[2], 10);
      if (low < 25 && high < 30) {
        rawMentions.push(rangeMatch[0].trim());
        matchedRangeSpans.push([rangeMatch.index, rangeMatch.index + rangeMatch[0].length]);
        if (minYears === null || low < minYears) minYears = low;
        if (maxYears === null || high > maxYears) maxYears = high;
      }
    }

    // 3. Pattern B: Minimum years, e.g. "3+ years", "minimum 5 years of experience", "at least 2 yrs"
    const minRegex = /(?:minimum|min|at least|\+)?\s*(\d{1,2})\+?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?(?:proven\s+|relevant\s+|industry\s+|software\s+)?experience)?\b/gi;
    let minMatch: RegExpExecArray | null;
    while ((minMatch = minRegex.exec(textToScan)) !== null) {
      const matchStart = minMatch.index;
      const matchEnd = matchStart + minMatch[0].length;
      const isInsideRange = matchedRangeSpans.some(([start, end]) => matchStart >= start && matchEnd <= end);
      if (isInsideRange) continue;

      const yrs = parseInt(minMatch[1], 10);
      // Filter out unrealistic years (e.g. 50+ years of company history or 2024 year dates)
      if (yrs > 0 && yrs <= 20) {
        rawMentions.push(minMatch[0].trim());
        if (minYears === null) {
          minYears = yrs;
        } else if (matchedRangeSpans.length === 0 && yrs < minYears) {
          minYears = yrs;
        }
      }
    }

    // 4. Pattern C: Entry level cues
    if (/\b(?:entry[- ]level|junior|new grad(?:uate)?|recent graduate|0[- ]1\s*(?:years?|yrs?))\b/i.test(textToScan)) {
      if (inferredLevel === 'unspecified') inferredLevel = 'entry';
      if (minYears === null) minYears = 0;
      if (maxYears === null) maxYears = 1;
    }

    // Determine seniority level from minYears if still unspecified
    if (inferredLevel === 'unspecified' && minYears !== null) {
      if (minYears === 0 || minYears <= 1) {
        inferredLevel = 'entry';
      } else if (minYears <= 4) {
        inferredLevel = 'mid';
      } else if (minYears <= 7) {
        inferredLevel = 'senior';
      } else {
        inferredLevel = 'lead';
      }
    }

    const uniqueMentions = Array.from(new Set(rawMentions)).slice(0, 5);

    return {
      minYears,
      maxYears,
      level: inferredLevel,
      isIdentifiable: minYears !== null || inferredLevel !== 'unspecified',
      rawMentions: uniqueMentions,
    };
  }

  /**
   * Extracts qualifications, educational degrees, and certifications.
   */
  public extractQualifications(cleanText: string): ExtractedQualifications {
    const degrees: ExtractedQualifications['degrees'] = [];
    const certifications: ExtractedQualifications['certifications'] = [];

    // Degree matching
    const bachelorsRegex = /\b(?:bachelor'?s(?:\s+degree)?|b\.?tech|b\.?e\.?|b\.?s\.?|undergraduate\s+degree)\b(?:\s+(?:in|of)\s+([a-zA-Z\s]{4,30}))?/gi;
    let bMatch: RegExpExecArray | null;
    while ((bMatch = bachelorsRegex.exec(cleanText)) !== null) {
      degrees.push({
        level: 'bachelors',
        rawMention: bMatch[0].trim(),
        field: bMatch[1]?.trim() || 'Computer Science / Engineering',
      });
      break; // Single recording of highest/entry degree
    }

    const mastersRegex = /\b(?:master'?s(?:\s+degree)?|m\.?tech|m\.?s\.?|graduate\s+degree)\b(?:\s+(?:in|of)\s+([a-zA-Z\s]{4,30}))?/gi;
    let mMatch: RegExpExecArray | null;
    while ((mMatch = mastersRegex.exec(cleanText)) !== null) {
      degrees.push({
        level: 'masters',
        rawMention: mMatch[0].trim(),
        field: mMatch[1]?.trim() || 'Computer Science / Related Field',
      });
      break;
    }

    const phdRegex = /\b(?:ph\.?d\.?|doctorate|doctoral\s+degree)\b/gi;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = phdRegex.exec(cleanText)) !== null) {
      degrees.push({
        level: 'doctorate',
        rawMention: pMatch[0].trim(),
      });
      break;
    }

    // Certifications matching
    const certItems = SKILLS_DICTIONARY.filter((i) => i.category === 'certification');
    for (const cert of certItems) {
      for (const syn of cert.synonyms) {
        const pattern = new RegExp(`\\b${syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        const match = pattern.exec(cleanText);
        if (match) {
          certifications.push({
            name: cert.canonicalName,
            rawMention: match[0].trim(),
          });
          break;
        }
      }
    }

    return { degrees, certifications };
  }

  /**
   * Compares extracted requirements with student evidence.
   *
   * STRICT GOAL: Do not treat a skill mentioned in a completed course
   * as equivalent to proven professional experience.
   */
  public async compareWithStudentProfile(
    analysis: {
      technicalSkills: ExtractedSkill[];
      toolsAndFrameworks: ExtractedSkill[];
      experience: ExtractedExperience;
    },
    studentInput: string | StudentProfileInput
  ): Promise<StudentJobComparison> {
    const profile = await careerDiscoveryService.resolveStudentProfile(studentInput);

    // 1. Build map of student evidence tiers
    // Mapping: skill identifier or canonical name -> { tier, description }
    const studentEvidenceMap = new Map<string, {
      tier: StudentEvidenceTier;
      description: string;
      level?: string;
    }>();

    // A. Practical custom projects -> 'proven_experience'
    for (const p of profile.customProjects || []) {
      for (const s of p.skillsDemonstrated || []) {
        studentEvidenceMap.set(s.toLowerCase(), {
          tier: 'proven_experience',
          description: `Demonstrated in practical project: "${p.title}"`,
        });
      }
      for (const t of p.technologiesUsed || []) {
        studentEvidenceMap.set(t.toLowerCase(), {
          tier: 'proven_experience',
          description: `Used as core technology in project: "${p.title}"`,
        });
      }
    }

    // B. Verified certifications -> 'proven_experience'
    for (const cert of profile.certifications || []) {
      for (const s of cert.associatedSkillIds || []) {
        studentEvidenceMap.set(s.toLowerCase(), {
          tier: 'proven_experience',
          description: `Formally certified via ${cert.name}`,
        });
      }
    }

    // C. Explicit verified/project skills in skills list -> 'proven_experience'
    for (const sk of profile.skills || []) {
      const skIdLower = sk.skillId.toLowerCase();
      if (sk.competenceType === 'project_demonstrated' || sk.competenceType === 'verified') {
        studentEvidenceMap.set(skIdLower, {
          tier: 'proven_experience',
          description: sk.evidenceDescription || 'Practical project demonstration',
          level: sk.level,
        });
      }
    }

    // D. Completed courses -> 'course_completed' (Academic/theoretical only)
    // NEVER overwrite an existing 'proven_experience' tier with 'course_completed'
    let catalogueCourses: any[] = [];
    if (mongoose.connection.readyState === 1) {
      try {
        const cRes = await courseRepository.findAll({ limit: 100 });
        catalogueCourses = cRes.data;
      } catch {}
    }

    for (const c of profile.completedCourses || []) {
      if (c.status === 'completed' || !c.status) {
        const catCourse = catalogueCourses.find(
          (cat) => cat.courseId === c.courseId || cat.code === (c as any).code
        );
        const taught = catCourse?.taughtSkillIds || (c as any).taughtSkillIds || [];
        for (const tSk of taught) {
          const tSkLower = tSk.toLowerCase();
          if (!studentEvidenceMap.has(tSkLower)) {
            studentEvidenceMap.set(tSkLower, {
              tier: 'course_completed',
              description: `Covered theoretically in course ${catCourse?.code || c.courseId} (Academic exposure; no production project evidence)`,
            });
          }
        }
      }
    }

    // E. Skills marked as course_exposure in student's skills
    for (const sk of profile.skills || []) {
      const skIdLower = sk.skillId.toLowerCase();
      if (sk.competenceType === 'course_exposure' && !studentEvidenceMap.has(skIdLower)) {
        studentEvidenceMap.set(skIdLower, {
          tier: 'course_completed',
          description: sk.evidenceDescription || 'Academic coursework exposure only',
          level: sk.level,
        });
      }
    }

    // F. Self-reported skills without evidence -> 'self_reported'
    for (const sk of profile.skills || []) {
      const skIdLower = sk.skillId.toLowerCase();
      if (!studentEvidenceMap.has(skIdLower)) {
        studentEvidenceMap.set(skIdLower, {
          tier: 'self_reported',
          description: 'Self-reported in student profile (Unverified claim)',
          level: sk.level,
        });
      }
    }

    // 2. Evaluate all extracted requirements against student evidence
    const allExtracted = [...analysis.technicalSkills, ...analysis.toolsAndFrameworks];
    const matchedSkills: StudentSkillMatch[] = [];
    const missingSkills: StudentSkillMatch[] = [];

    // Load available campus courses & projects for remediation suggestions
    let allCatalogueProjects: any[] = [];
    if (mongoose.connection.readyState === 1) {
      try {
        const pRes = await projectRepository.findAll({ limit: 100 });
        allCatalogueProjects = pRes.data;
      } catch {}
    }

    for (const req of allExtracted) {
      // Check for match by: ontologySkillId, dict item id, or canonical name
      const possibleKeys = [
        req.ontologySkillId?.toLowerCase(),
        req.id.toLowerCase(),
        req.canonicalName.toLowerCase(),
        req.rawMatchedTerm.toLowerCase(),
      ].filter(Boolean) as string[];

      let evidence = possibleKeys.map((k) => studentEvidenceMap.get(k)).find(Boolean);

      const importanceInJob =
        req.tfIdfScore > 1.5 || req.termFrequency >= 3
          ? 'critical'
          : req.tfIdfScore > 0.8
          ? 'important'
          : 'nice_to_have';

      if (evidence) {
        matchedSkills.push({
          skillId: req.id,
          name: req.canonicalName,
          category: req.category,
          ontologySkillId: req.ontologySkillId,
          status: 'matched',
          evidenceTier: evidence.tier,
          evidenceDescription: evidence.description,
          termFrequencyInJob: req.termFrequency,
          importanceInJob,
        });
      } else {
        // Resolve suggested campus courses and projects
        const suggestedCourses = catalogueCourses
          .filter((c) => (c.taughtSkillIds || []).includes(req.ontologySkillId || ''))
          .map((c) => ({
            id: c.courseId,
            code: c.code,
            title: c.title,
            credits: c.credits,
          }))
          .slice(0, 2);

        const suggestedProjects = allCatalogueProjects
          .filter((p) => (p.requiredSkillIds || []).includes(req.ontologySkillId || ''))
          .map((p) => ({
            id: p.projectId,
            title: p.title,
            domain: p.domain,
            difficulty: p.difficulty,
          }))
          .slice(0, 2);

        missingSkills.push({
          skillId: req.id,
          name: req.canonicalName,
          category: req.category,
          ontologySkillId: req.ontologySkillId,
          status: 'missing',
          evidenceTier: 'none',
          evidenceDescription: 'No evidence found in student coursework, projects, or self-reported claims',
          termFrequencyInJob: req.termFrequency,
          importanceInJob,
          suggestedCourses,
          suggestedProjects,
        });
      }
    }

    // 3. Calculate weighted compatibility score
    // Weightings:
    // - Proven practical experience: 1.0
    // - Completed academic coursework: 0.5 (Foundational understanding, but not proven)
    // - Self-reported claim: 0.3
    // - Missing: 0.0
    const totalRequirements = allExtracted.length;
    let earnedPoints = 0;
    let maxPossiblePoints = totalRequirements * 1.0;

    let provenCount = 0;
    let courseCount = 0;
    let selfReportedCount = 0;

    for (const m of matchedSkills) {
      if (m.evidenceTier === 'proven_experience') {
        earnedPoints += 1.0;
        provenCount++;
      } else if (m.evidenceTier === 'course_completed') {
        earnedPoints += 0.5;
        courseCount++;
      } else if (m.evidenceTier === 'self_reported') {
        earnedPoints += 0.3;
        selfReportedCount++;
      }
    }

    const overallCompatibilityScore = totalRequirements > 0
      ? Math.min(100, Math.round((earnedPoints / maxPossiblePoints) * 100))
      : 80;

    // 4. Experience fit evaluation
    const jobLevel = analysis.experience.level;
    const isUndergrad = (profile.currentSemester && profile.currentSemester <= 8) || true;
    let isAligned = true;
    let experienceNote = 'Experience requirements appear well aligned with student profile.';

    if (jobLevel === 'senior' || jobLevel === 'lead' || (analysis.experience.minYears && analysis.experience.minYears >= 4)) {
      isAligned = false;
      experienceNote = `Experience Mismatch: Employer requests ${analysis.experience.minYears || '4+'}+ years of experience (${jobLevel} level). Student is currently an undergraduate/entry candidate.`;
    } else if (jobLevel === 'mid' && isUndergrad) {
      experienceNote = 'Moderate Experience Stretch: Employer prefers mid-level experience; student should emphasize strong portfolio projects.';
    }

    // 5. Generate human-readable readiness assessment
    let readinessAssessment = '';
    if (overallCompatibilityScore >= 75 && isAligned) {
      readinessAssessment = `Strong match (${overallCompatibilityScore}%). Student demonstrates project-proven proficiency in ${provenCount} required skills.`;
    } else if (overallCompatibilityScore >= 50) {
      readinessAssessment = `Competitive match (${overallCompatibilityScore}%). Student satisfies key requirements, with ${courseCount} skills acquired through coursework that would benefit from a portfolio project to demonstrate practical competency.`;
    } else {
      readinessAssessment = `Developing candidate (${overallCompatibilityScore}%). Foundational upskilling recommended across ${missingSkills.length} missing skill areas.`;
    }

    if (courseCount > 0) {
      readinessAssessment += ` Note: ${courseCount} matched skills reflect academic coursework completion rather than demonstrated commercial or portfolio experience.`;
    }

    return {
      studentId: profile.studentId || 'unknown',
      studentName: profile.name || 'Unknown Student',
      overallCompatibilityScore,
      evidenceDistribution: {
        totalRequiredSkills: totalRequirements,
        provenCount,
        courseCount,
        selfReportedCount,
        missingCount: missingSkills.length,
      },
      matchedSkills,
      missingSkills,
      readinessAssessment,
      experienceFit: {
        jobLevel,
        studentStatus: isUndergrad ? `Enrolled Undergraduate (Semester ${profile.currentSemester || 6})` : 'Recent Graduate',
        isAligned,
        note: experienceNote,
      },
    };
  }

  /**
   * Main entry point to analyze raw text or a job object.
   * Utilizes Redis cache-aside with a 1-hour TTL.
   */
  public async analyzeJob(params: {
    jobId?: string;
    title?: string;
    company?: string;
    rawText: string;
    studentId?: string;
    forceFresh?: boolean;
  }): Promise<JobDescriptionAnalysis> {
    const cleanText = this.sanitizeText(params.rawText);
    const title = params.title || '';
    const company = params.company || null;
    const jobId = params.jobId || null;

    // Build deterministic cache key based on content hash and optional studentId
    const contentHash = createHash('sha256')
      .update(`${title}|${cleanText}|${params.studentId || 'anon'}`)
      .digest('hex')
      .substring(0, 16);

    const cacheKey = `cache:job:analysis:${jobId || contentHash}:${params.studentId || 'anon'}`;

    // 1. Check Redis cache
    if (!params.forceFresh) {
      try {
        const cachedRaw = await cacheRepository.get(cacheKey);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw) as JobDescriptionAnalysis;
          return {
            ...parsed,
            isFromCache: true,
          };
        }
      } catch {}
    }

    const analyzedAt = new Date().toISOString();
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

    // 2. Extract technical skills, tools & frameworks, methodologies
    const { technicalSkills, toolsAndFrameworks, methodologies } = this.extractSkills(cleanText, title);

    // 3. Extract experience requirements
    const experience = this.extractExperience(cleanText, title);

    // 4. Extract qualifications & certifications
    const qualifications = this.extractQualifications(cleanText);

    // 5. Compare with student profile if studentId provided
    let comparison: StudentJobComparison | null = null;
    if (params.studentId) {
      try {
        comparison = await this.compareWithStudentProfile(
          { technicalSkills, toolsAndFrameworks, experience },
          params.studentId
        );
      } catch (err: any) {
        console.warn(`[JobAnalyzer] Failed to compare with student profile: ${err.message}`);
      }
    }

    const analysisResult: JobDescriptionAnalysis = {
      jobId,
      title: title || null,
      company,
      analyzedAt,
      cachedAt: analyzedAt,
      isFromCache: false,
      wordCount,
      technicalSkills,
      toolsAndFrameworks,
      methodologies,
      experience,
      qualifications,
      comparison,
      totalSkillsDetected: technicalSkills.length + toolsAndFrameworks.length + methodologies.length,
    };

    // 6. Save in Redis with TTL
    try {
      await cacheRepository.set(
        cacheKey,
        JSON.stringify(analysisResult),
        this.JOB_ANALYSIS_CACHE_TTL
      );
    } catch {}

    return analysisResult;
  }

  /**
   * Analyzes an existing job listing by its ID (resolving external or MongoDB listing).
   */
  public async analyzeJobById(
    jobId: string,
    studentId?: string,
    forceFresh?: boolean
  ): Promise<JobDescriptionAnalysis> {
    const job = await jobService.getJob(jobId);
    if (!job) {
      throw Object.assign(new Error(`Job listing "${jobId}" not found`), { status: 404 });
    }

    const rawText = (job as NormalizedJob).description || (job as any).description || '';
    const title = job.title || '';
    const company = job.company || '';

    return this.analyzeJob({
      jobId,
      title,
      company,
      rawText,
      studentId,
      forceFresh,
    });
  }

  /**
   * Generates a role-level job-market summary by sampling current live/fixture listings.
   */
  public async getRoleMarketSummary(
    roleId: string,
    studentId?: string,
    sampleSize: number = 10,
    forceFresh?: boolean
  ): Promise<RoleJobMarketSummary> {
    const targetRole = CURATED_CAREER_ROLES.find(
      (r) => r.roleId.toLowerCase() === roleId.toLowerCase() || r.slug.toLowerCase() === roleId.toLowerCase()
    );

    if (!targetRole) {
      throw Object.assign(new Error(`Role "${roleId}" not found in curated catalogue.`), { status: 404 });
    }

    const safeSampleSize = Math.min(Math.max(sampleSize, 3), 30);
    const cacheKey = `cache:role:market:${targetRole.roleId}:${safeSampleSize}:${studentId || 'anon'}`;

    // 1. Check Redis cache
    if (!forceFresh) {
      try {
        const cachedRaw = await cacheRepository.get(cacheKey);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw) as RoleJobMarketSummary;
          return {
            ...parsed,
            isFromCache: true,
          };
        }
      } catch {}
    }

    // 2. Fetch current listings for this role
    const searchRes = await externalJobService.getJobsForRole(targetRole.roleId, { limit: safeSampleSize });
    const sampledJobs = (searchRes.data || []).slice(0, safeSampleSize);

    if (sampledJobs.length === 0) {
      throw Object.assign(
        new Error(`No job listings could be retrieved for role "${targetRole.title}".`),
        { status: 503 }
      );
    }

    const analyzedAt = new Date().toISOString();

    // 3. Analyze all listings in the sample
    const skillFrequencyMap = new Map<string, {
      name: string;
      category: 'technical_skill' | 'tool_framework';
      ontologySkillId?: string;
      frequency: number;
    }>();

    const experienceDistribution = {
      entry: 0,
      mid: 0,
      senior: 0,
      lead: 0,
      unspecified: 0,
    };

    const sampledAnalyses: JobDescriptionAnalysis[] = [];

    for (const job of sampledJobs) {
      const cleanDesc = this.sanitizeText(job.description);
      const { technicalSkills, toolsAndFrameworks } = this.extractSkills(cleanDesc, job.title);
      const experience = this.extractExperience(cleanDesc, job.title);

      experienceDistribution[experience.level]++;

      const combinedSkills = [...technicalSkills, ...toolsAndFrameworks];
      for (const s of combinedSkills) {
        const existing = skillFrequencyMap.get(s.id);
        if (existing) {
          existing.frequency++;
        } else {
          skillFrequencyMap.set(s.id, {
            name: s.canonicalName,
            category: s.category as any,
            ontologySkillId: s.ontologySkillId,
            frequency: 1,
          });
        }
      }

      sampledAnalyses.push({
        jobId: job.id,
        title: job.title,
        company: job.company,
        analyzedAt,
        cachedAt: null,
        isFromCache: false,
        wordCount: cleanDesc.split(/\s+/).length,
        technicalSkills,
        toolsAndFrameworks,
        methodologies: [],
        experience,
        qualifications: { degrees: [], certifications: [] },
        comparison: null,
        totalSkillsDetected: combinedSkills.length,
      });
    }

    const sampleCount = sampledJobs.length;

    // 4. Format top technical skills and tools
    const topSkillsInDemand: MarketSkillDemand[] = [];
    const topToolsInDemand: MarketSkillDemand[] = [];

    for (const [id, item] of skillFrequencyMap.entries()) {
      const percentage = Math.round((item.frequency / sampleCount) * 100);
      const isCoreInPlatform = item.ontologySkillId
        ? targetRole.requiredSkillIds.includes(item.ontologySkillId)
        : false;

      const demandItem: MarketSkillDemand = {
        skillId: id,
        name: item.name,
        category: item.category,
        ontologySkillId: item.ontologySkillId,
        frequency: item.frequency,
        percentage,
        isCoreInPlatform,
      };

      if (item.category === 'technical_skill') {
        topSkillsInDemand.push(demandItem);
      } else {
        topToolsInDemand.push(demandItem);
      }
    }

    topSkillsInDemand.sort((a, b) => b.frequency - a.frequency || b.percentage - a.percentage);
    topToolsInDemand.sort((a, b) => b.frequency - a.frequency || b.percentage - a.percentage);

    // 5. Detect market variations across listings
    const marketVariations: Array<{ aspect: string; observation: string }> = [];

    // Language / Ecosystem diversity
    const topLanguages = topSkillsInDemand.slice(0, 3).map((s) => `${s.name} (${s.percentage}%)`);
    if (topLanguages.length > 0) {
      marketVariations.push({
        aspect: 'Core Technical Languages & Paradigms',
        observation: `Most frequent requirements across current postings: ${topLanguages.join(', ')}.`,
      });
    }

    // Cloud & Infrastructure variance
    const cloudTools = topToolsInDemand.filter((t) =>
      ['Amazon Web Services (AWS)', 'Google Cloud Platform (GCP)', 'Microsoft Azure', 'Docker & Containerization', 'Kubernetes (K8s)'].includes(t.name)
    );
    if (cloudTools.length > 0) {
      const cloudDesc = cloudTools.map((c) => `${c.name}: ${c.percentage}%`).join('; ');
      marketVariations.push({
        aspect: 'Cloud & Infrastructure Stack',
        observation: `Varied deployment requirements observed across employers: ${cloudDesc}.`,
      });
    }

    // Seniority spread
    const expParts: string[] = [];
    if (experienceDistribution.entry > 0) expParts.push(`${experienceDistribution.entry} Entry/Junior`);
    if (experienceDistribution.mid > 0) expParts.push(`${experienceDistribution.mid} Mid-level`);
    if (experienceDistribution.senior > 0) expParts.push(`${experienceDistribution.senior} Senior`);
    if (experienceDistribution.lead > 0) expParts.push(`${experienceDistribution.lead} Lead/Principal`);
    marketVariations.push({
      aspect: 'Seniority Distribution',
      observation: `Sample composition: ${expParts.join(', ')} out of ${sampleCount} analyzed listings.`,
    });

    // 6. Student Gap Analysis if studentId was supplied
    let studentGapAnalysis: RoleJobMarketSummary['studentGapAnalysis'] = null;

    if (studentId) {
      try {
        const profile = await careerDiscoveryService.resolveStudentProfile(studentId);

        // Map student skills with distinction between proven and academic
        const provenHeld = new Set<string>();
        const academicHeld = new Set<string>();

        // Custom projects
        for (const p of profile.customProjects || []) {
          for (const s of p.skillsDemonstrated || []) provenHeld.add(s.toLowerCase());
          for (const t of p.technologiesUsed || []) provenHeld.add(t.toLowerCase());
        }

        // Skills array
        for (const sk of profile.skills || []) {
          const idLower = sk.skillId.toLowerCase();
          if (sk.competenceType === 'project_demonstrated' || sk.competenceType === 'verified') {
            provenHeld.add(idLower);
          } else if (sk.competenceType === 'course_exposure') {
            academicHeld.add(idLower);
          } else {
            academicHeld.add(idLower);
          }
        }

        // Identify high demand skills (in >= 40% of postings) that student lacks or only has academic exposure to
        const highDemand = [...topSkillsInDemand, ...topToolsInDemand].filter((s) => s.percentage >= 40);
        const missingHighDemandSkills: Array<{
          skillId: string;
          name: string;
          marketPercentage: number;
          suggestedCourses: any[];
          suggestedProjects: any[];
        }> = [];

        let coveredCount = 0;

        for (const hd of highDemand) {
          const keys = [hd.ontologySkillId?.toLowerCase(), hd.skillId.toLowerCase(), hd.name.toLowerCase()].filter(Boolean) as string[];
          const hasProven = keys.some((k) => provenHeld.has(k));
          const hasAcademic = keys.some((k) => academicHeld.has(k));

          if (hasProven) {
            coveredCount += 1.0;
          } else if (hasAcademic) {
            coveredCount += 0.5;
            // Academic only: still recommend a project to build proven experience!
            missingHighDemandSkills.push({
              skillId: hd.skillId,
              name: `${hd.name} (Academic only - Needs project proof)`,
              marketPercentage: hd.percentage,
              suggestedCourses: [],
              suggestedProjects: [
                {
                  id: 'proj_rec_portfolio',
                  title: `Hands-on Portfolio Project in ${hd.name}`,
                  domain: targetRole.category,
                  difficulty: 'intermediate',
                },
              ],
            });
          } else {
            // Completely missing
            missingHighDemandSkills.push({
              skillId: hd.skillId,
              name: hd.name,
              marketPercentage: hd.percentage,
              suggestedCourses: hd.ontologySkillId ? [
                {
                  id: `crs_${hd.ontologySkillId}`,
                  code: 'CS-ELECTIVE',
                  title: `Foundations of ${hd.name}`,
                },
              ] : [],
              suggestedProjects: [
                {
                  id: 'proj_rec_demo',
                  title: `End-to-End ${hd.name} Application`,
                  domain: targetRole.category,
                  difficulty: 'intermediate',
                },
              ],
            });
          }
        }

        const coverageScore = highDemand.length > 0
          ? Math.round((coveredCount / highDemand.length) * 100)
          : 80;

        studentGapAnalysis = {
          coverageScore,
          missingHighDemandSkills: missingHighDemandSkills.slice(0, 6),
          provenSkillsHeld: Array.from(provenHeld),
          academicOnlySkillsHeld: Array.from(academicHeld),
        };
      } catch (err: any) {
        console.warn(`[JobAnalyzer] Student gap analysis failed: ${err.message}`);
      }
    }

    const summaryResult: RoleJobMarketSummary = {
      roleId: targetRole.roleId,
      roleTitle: targetRole.title,
      sampleSize: sampleCount,
      analyzedAt,
      cachedAt: analyzedAt,
      isFromCache: false,
      topSkillsInDemand: topSkillsInDemand.slice(0, 15),
      topToolsInDemand: topToolsInDemand.slice(0, 15),
      experienceDistribution,
      marketVariations,
      studentGapAnalysis,
    };

    // 7. Save in Redis
    try {
      await cacheRepository.set(
        cacheKey,
        JSON.stringify(summaryResult),
        this.ROLE_MARKET_CACHE_TTL
      );
    } catch {}

    return summaryResult;
  }
}

export const jobAnalyzerService = new JobAnalyzerService();
