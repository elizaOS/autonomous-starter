import { Experience, ExperienceType } from '../types';
import { ExperienceRelationshipManager } from './experienceRelationships';
import { ConfidenceDecayManager } from './confidenceDecay';

export interface Experiment {
  id: string;
  hypothesis: string;
  action: string;
  expectedOutcome: string;
  domain: string;
  priority: number;
  relatedExperiences: string[];
  suggestedAt: number;
}

export interface LearningGap {
  domain: string;
  description: string;
  uncertainty: number;
  suggestedExperiments: Experiment[];
}

export class ActiveLearningManager {
  private relationshipManager: ExperienceRelationshipManager;
  private decayManager: ConfidenceDecayManager;

  constructor() {
    this.relationshipManager = new ExperienceRelationshipManager();
    this.decayManager = new ConfidenceDecayManager();
  }

  /**
   * Identify areas where the agent needs more experience
   */
  identifyLearningGaps(experiences: Experience[]): LearningGap[] {
    const gaps: LearningGap[] = [];

    // Group experiences by domain
    const byDomain = this.groupByDomain(experiences);

    // Analyze each domain
    for (const [domain, domainExperiences] of byDomain) {
      // Check for low confidence areas
      const lowConfidence = domainExperiences.filter(
        (exp) => this.decayManager.getDecayedConfidence(exp) < 0.5
      );

      if (lowConfidence.length > 0) {
        gaps.push({
          domain,
          description: `Low confidence in ${lowConfidence.length} experiences`,
          uncertainty: 1 - this.averageConfidence(lowConfidence),
          suggestedExperiments: this.generateExperiments(lowConfidence, domain),
        });
      }

      // Check for contradictions
      const contradictions = this.findContradictions(domainExperiences);
      if (contradictions.length > 0) {
        gaps.push({
          domain,
          description: `${contradictions.length} unresolved contradictions`,
          uncertainty: 0.8,
          suggestedExperiments: this.generateContradictionExperiments(contradictions, domain),
        });
      }

      // Check for old hypotheses that haven't been validated
      const unvalidated = this.findUnvalidatedHypotheses(domainExperiences);
      if (unvalidated.length > 0) {
        gaps.push({
          domain,
          description: `${unvalidated.length} unvalidated hypotheses`,
          uncertainty: 0.7,
          suggestedExperiments: this.generateValidationExperiments(unvalidated, domain),
        });
      }
    }

    return gaps.sort((a, b) => b.uncertainty - a.uncertainty);
  }

  /**
   * Suggest experiments to fill learning gaps
   */
  suggestNextExperiment(experiences: Experience[]): Experiment | null {
    const gaps = this.identifyLearningGaps(experiences);

    if (gaps.length === 0) {
      return null;
    }

    // Get the highest priority gap
    const topGap = gaps[0];

    // Return the highest priority experiment from that gap
    if (topGap.suggestedExperiments.length > 0) {
      return topGap.suggestedExperiments[0];
    }

    return null;
  }

  private groupByDomain(experiences: Experience[]): Map<string, Experience[]> {
    const groups = new Map<string, Experience[]>();

    for (const exp of experiences) {
      if (!groups.has(exp.domain)) {
        groups.set(exp.domain, []);
      }
      groups.get(exp.domain)!.push(exp);
    }

    return groups;
  }

  private averageConfidence(experiences: Experience[]): number {
    if (experiences.length === 0) return 0;

    const sum = experiences.reduce(
      (acc, exp) => acc + this.decayManager.getDecayedConfidence(exp),
      0
    );

    return sum / experiences.length;
  }

  private findContradictions(experiences: Experience[]): Array<[Experience, Experience]> {
    const contradictions: Array<[Experience, Experience]> = [];

    for (let i = 0; i < experiences.length; i++) {
      for (let j = i + 1; j < experiences.length; j++) {
        const exp1 = experiences[i];
        const exp2 = experiences[j];

        // Same action, different outcome
        if (exp1.action === exp2.action && exp1.outcome !== exp2.outcome) {
          contradictions.push([exp1, exp2]);
        }
      }
    }

    return contradictions;
  }

  private findUnvalidatedHypotheses(experiences: Experience[]): Experience[] {
    return experiences.filter((exp) => {
      if (exp.type !== ExperienceType.HYPOTHESIS) return false;

      // Check if there's a validation experience
      const hasValidation = experiences.some(
        (other) =>
          other.type === ExperienceType.VALIDATION && other.relatedExperiences?.includes(exp.id)
      );

      return !hasValidation;
    });
  }

  private generateExperiments(
    lowConfidenceExperiences: Experience[],
    domain: string
  ): Experiment[] {
    return lowConfidenceExperiences.slice(0, 3).map((exp, index) => ({
      id: `exp-${Date.now()}-${index}`,
      hypothesis: `Retesting: ${exp.learning}`,
      action: exp.action,
      expectedOutcome: exp.outcome,
      domain,
      priority: 0.8 - index * 0.1,
      relatedExperiences: [exp.id],
      suggestedAt: Date.now(),
    }));
  }

  private generateContradictionExperiments(
    contradictions: Array<[Experience, Experience]>,
    domain: string
  ): Experiment[] {
    return contradictions.slice(0, 2).map(([exp1, exp2], index) => ({
      id: `exp-${Date.now()}-${index}`,
      hypothesis: `Resolving contradiction: ${exp1.action} has inconsistent outcomes`,
      action: exp1.action,
      expectedOutcome: 'Need to determine correct outcome',
      domain,
      priority: 0.9 - index * 0.1,
      relatedExperiences: [exp1.id, exp2.id],
      suggestedAt: Date.now(),
    }));
  }

  private generateValidationExperiments(
    unvalidatedHypotheses: Experience[],
    domain: string
  ): Experiment[] {
    return unvalidatedHypotheses.slice(0, 2).map((hyp, index) => ({
      id: `exp-${Date.now()}-${index}`,
      hypothesis: `Validating: ${hyp.learning}`,
      action: hyp.action,
      expectedOutcome: hyp.result,
      domain,
      priority: 0.7 - index * 0.1,
      relatedExperiences: [hyp.id],
      suggestedAt: Date.now(),
    }));
  }

  /**
   * Generate a learning curriculum based on current knowledge
   */
  generateLearningCurriculum(experiences: Experience[], targetDomain?: string): Experiment[] {
    const curriculum: Experiment[] = [];

    // Start with basic exploration if few experiences
    const domainExperiences = targetDomain
      ? experiences.filter((exp) => exp.domain === targetDomain)
      : experiences;

    if (domainExperiences.length < 10) {
      // Suggest exploratory experiments
      curriculum.push({
        id: `curr-${Date.now()}-1`,
        hypothesis: 'Explore basic capabilities in this domain',
        action: 'explore_domain',
        expectedOutcome: 'Discover new capabilities',
        domain: targetDomain || 'general',
        priority: 1.0,
        relatedExperiences: [],
        suggestedAt: Date.now(),
      });
    }

    // Add experiments to resolve uncertainties
    const gaps = this.identifyLearningGaps(domainExperiences);
    for (const gap of gaps) {
      curriculum.push(...gap.suggestedExperiments);
    }

    // Sort by priority
    return curriculum.sort((a, b) => b.priority - a.priority);
  }
}
