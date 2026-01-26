import { BaseAgent } from './baseAgent';
import { AgentMessage, BudgetBreakdown, TravelInput } from '@/types/agent';
import { getAIBudgetAnalysis, AIBudgetBreakdown } from '@/lib/api/travelAI';

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
    this.sendMessage('coordinator', `💰 AI analyzing budget of ₹${input.totalBudget.toLocaleString()} for ${input.duration} days`, 'notification');

    try {
      const aiResponse = await getAIBudgetAnalysis(input.travelInput);
      
      const validation = this.convertAIResponseToValidation(aiResponse, input);
      
      this.allocatedCosts = validation.breakdown;
      this.currentBudget = input.totalBudget;
      this.setStatus('completed');

      const status = validation.approved ? '✅ APPROVED' : '⚠️ NEEDS ADJUSTMENT';
      this.sendMessage('coordinator', `Budget analysis complete: ${status}. AI Tips: ${validation.aiTips?.[0] || 'Optimize spending wisely'}`, 'response');

      return validation;
    } catch (error) {
      console.error('[AIBudgetAgent] Error:', error);
      this.sendMessage('coordinator', '⚠️ AI unavailable, using fallback analysis', 'notification');
      
      return this.generateFallbackValidation(input);
    }
  }

  private convertAIResponseToValidation(response: AIBudgetBreakdown, input: BudgetInput): BudgetValidation {
    const breakdown: BudgetBreakdown = {
      accommodation: response.breakdown.accommodation.allocated,
      transport: response.breakdown.transport.allocated,
      activities: response.breakdown.activities.allocated,
      food: response.breakdown.food.allocated,
      miscellaneous: response.breakdown.miscellaneous.allocated,
      total: response.totalAllocated,
    };

    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (response.status === 'over_budget') {
      warnings.push('Estimated costs exceed your budget');
      suggestions.push(...response.adjustments);
    } else if (response.status === 'tight') {
      warnings.push('Budget is tight - consider reducing some expenses');
    }

    // Add AI-generated tips
    suggestions.push(response.breakdown.accommodation.tips);
    suggestions.push(response.breakdown.transport.tips);
    suggestions.push(response.breakdown.food.tips);

    return {
      approved: response.status !== 'over_budget',
      breakdown,
      warnings,
      suggestions: suggestions.filter(Boolean),
      aiTips: response.savingTips,
      splurgeWorthy: response.splurgeWorthy,
    };
  }

  private generateFallbackValidation(input: BudgetInput): BudgetValidation {
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

    if (breakdown.total > input.totalBudget) {
      warnings.push(`Estimated cost exceeds budget by ₹${breakdown.total - input.totalBudget}`);
      suggestions.push('Consider reducing accommodation category');
    }

    const perPersonPerDay = breakdown.total / (input.travelers * input.duration);
    if (perPersonPerDay < 2000) {
      warnings.push('Budget may be tight for comfortable travel');
    }

    return { 
      approved: breakdown.total <= input.totalBudget, 
      breakdown, 
      warnings, 
      suggestions 
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
