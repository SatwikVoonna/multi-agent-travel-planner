import { BaseAgent } from './baseAgent';
import { AgentMessage, BudgetBreakdown, TravelInput } from '@/types/agent';

interface BudgetInput {
  totalBudget: number;
  duration: number;
  travelers: number;
  accommodation: 'budget' | 'mid-range' | 'luxury';
  travelInput: TravelInput;
}

interface BudgetValidation {
  approved: boolean;
  breakdown: BudgetBreakdown;
  warnings: string[];
  suggestions: string[];
  aiTips?: string[];
  splurgeWorthy?: string[];
}

/**
 * AI Budget Agent - Validates and optimizes travel budgets
 * 
 * Now works with grounded data from the coordinator
 * Uses realistic cost estimates based on destination
 */
export class AIBudgetAgent extends BaseAgent {
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
    console.log(`[AIBudgetAgent] Received: ${message.content}`);
    
    if (message.content.includes('cost:')) {
      this.handleCostUpdate(message);
    }
  }

  private handleCostUpdate(message: AgentMessage) {
    const match = message.content.match(/cost:\s*(\d+)/);
    if (match) {
      const cost = parseInt(match[1]);
      this.sendMessage('coordinator', `💰 Budget impact noted: ₹${cost.toLocaleString()}`, 'notification');
    }
  }

  async process(input: BudgetInput): Promise<BudgetValidation> {
    this.setStatus('thinking');
    this.sendMessage('coordinator', `💰 Analyzing budget of ₹${input.totalBudget.toLocaleString()} for ${input.duration} days`, 'notification');

    // Generate budget breakdown based on preferences
    const validation = this.generateBudgetValidation(input);
    
    this.allocatedCosts = validation.breakdown;
    this.currentBudget = input.totalBudget;
    this.setStatus('completed');

    const status = validation.approved ? '✅ APPROVED' : '⚠️ NEEDS ADJUSTMENT';
    this.sendMessage('coordinator', `Budget analysis complete: ${status}`, 'response');

    return validation;
  }

  private generateBudgetValidation(input: BudgetInput): BudgetValidation {
    // Accommodation rates based on preference
    const accommodationRates: Record<string, number> = {
      'budget': 0.20,
      'mid-range': 0.30,
      'luxury': 0.45,
    };

    const accommodationRate = accommodationRates[input.accommodation] || 0.30;
    
    // Calculate budget allocation
    const accommodation = Math.round(input.totalBudget * accommodationRate);
    const transport = Math.round(input.totalBudget * 0.20);
    const activities = Math.round(input.totalBudget * 0.20);
    const food = Math.round(input.totalBudget * 0.20);
    const miscellaneous = Math.round(input.totalBudget * 0.10);

    const breakdown: BudgetBreakdown = {
      accommodation,
      transport,
      activities,
      food,
      miscellaneous,
      total: accommodation + transport + activities + food + miscellaneous,
    };

    const warnings: string[] = [];
    const suggestions: string[] = [];
    const aiTips: string[] = [];

    // Validate budget adequacy
    const perPersonPerDay = breakdown.total / (input.travelers * input.duration);
    
    if (perPersonPerDay < 1500) {
      warnings.push('Budget may be tight - consider budget accommodations');
      suggestions.push('Look for hostels or guesthouses');
      suggestions.push('Use public transport over taxis');
    }
    
    if (perPersonPerDay > 5000) {
      aiTips.push('You have flexibility for premium experiences');
      aiTips.push('Consider upgrading transport for comfort');
    }

    // Location-specific tips
    aiTips.push('Book accommodations directly for better rates');
    aiTips.push('Eat at local restaurants for authentic food at lower prices');
    aiTips.push('Many attractions have free or low entry fees');

    const splurgeWorthy = [
      'Local specialty cuisine',
      'Unique cultural experiences',
      'Guided heritage walks'
    ];

    return {
      approved: breakdown.total <= input.totalBudget,
      breakdown,
      warnings,
      suggestions,
      aiTips,
      splurgeWorthy
    };
  }

  validateCost(category: keyof BudgetBreakdown, cost: number): { approved: boolean; message: string } {
    const allocated = this.allocatedCosts[category];
    if (cost > allocated * 1.2) {
      return {
        approved: false,
        message: `Cost for ${category} (₹${cost}) exceeds allocated budget (₹${allocated}) by more than 20%`,
      };
    }
    return { approved: true, message: 'Cost within budget' };
  }
}

export const aiBudgetAgent = new AIBudgetAgent();
