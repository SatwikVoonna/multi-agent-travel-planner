import { BaseAgent } from './baseAgent';
import { AgentMessage, BudgetBreakdown, TravelInput } from '@/types/agent';

interface BudgetInput {
  totalBudget: number;
  duration: number;
  travelers: number;
  accommodation: 'budget' | 'mid-range' | 'luxury';
}

interface BudgetValidation {
  approved: boolean;
  breakdown: BudgetBreakdown;
  warnings: string[];
  suggestions: string[];
}

export class BudgetAgent extends BaseAgent {
  private currentBudget: number = 0;
  private allocatedCosts: BudgetBreakdown = {
    accommodation: 0,
    transport: 0,
    activities: 0,
    food: 0,
    miscellaneous: 0,
    total: 0,
  };

  constructor() {
    super('budget');
  }

  protected handleMessage(message: AgentMessage): void {
    console.log(`[BudgetAgent] Received: ${message.content}`);
    
    // React to cost updates from other agents
    if (message.content.includes('cost:')) {
      this.handleCostUpdate(message);
    }
  }

  private handleCostUpdate(message: AgentMessage) {
    const match = message.content.match(/cost:\s*(\d+)/);
    if (match) {
      const cost = parseInt(match[1]);
      this.sendMessage('coordinator', `Budget impact noted: ${cost}`, 'notification');
    }
  }

  async process(input: BudgetInput): Promise<BudgetValidation> {
    this.setStatus('thinking');
    this.sendMessage('coordinator', `Analyzing budget of ${input.totalBudget} for ${input.duration} days`, 'notification');

    await this.simulateDelay(600);

    this.currentBudget = input.totalBudget;
    const breakdown = this.calculateBudgetBreakdown(input);
    const validation = this.validateBudget(breakdown, input);

    this.allocatedCosts = breakdown;
    this.setStatus('completed');

    const status = validation.approved ? 'APPROVED' : 'NEEDS ADJUSTMENT';
    this.sendMessage('coordinator', `Budget analysis complete: ${status}. Total estimated: ${breakdown.total}`, 'response');

    return validation;
  }

  private calculateBudgetBreakdown(input: BudgetInput): BudgetBreakdown {
    const dailyBudget = input.totalBudget / input.duration;
    const accommodationRates = {
      budget: 0.25,
      'mid-range': 0.35,
      luxury: 0.50,
    };

    const accommodationRate = accommodationRates[input.accommodation];
    const accommodation = Math.round(input.totalBudget * accommodationRate);
    const transport = Math.round(input.totalBudget * 0.20);
    const activities = Math.round(input.totalBudget * 0.20);
    const food = Math.round(input.totalBudget * 0.20);
    const miscellaneous = Math.round(input.totalBudget * 0.10);

    return {
      accommodation,
      transport,
      activities,
      food,
      miscellaneous,
      total: accommodation + transport + activities + food + miscellaneous,
    };
  }

  private validateBudget(breakdown: BudgetBreakdown, input: BudgetInput): BudgetValidation {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let approved = true;

    if (breakdown.total > input.totalBudget) {
      approved = false;
      warnings.push(`Estimated cost exceeds budget by ${breakdown.total - input.totalBudget}`);
      suggestions.push('Consider reducing accommodation category');
      suggestions.push('Look for free activities');
    }

    const perPersonPerDay = breakdown.total / (input.travelers * input.duration);
    if (perPersonPerDay < 50) {
      warnings.push('Budget may be tight for comfortable travel');
    }

    if (breakdown.accommodation > input.totalBudget * 0.4) {
      suggestions.push('Accommodation takes over 40% of budget - consider hostels or homestays');
    }

    return { approved, breakdown, warnings, suggestions };
  }

  validateCost(category: keyof BudgetBreakdown, cost: number): { approved: boolean; message: string } {
    const allocated = this.allocatedCosts[category];
    if (cost > allocated * 1.2) {
      return {
        approved: false,
        message: `Cost for ${category} (${cost}) exceeds allocated budget (${allocated}) by more than 20%`,
      };
    }
    return { approved: true, message: 'Cost within budget' };
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const budgetAgent = new BudgetAgent();
