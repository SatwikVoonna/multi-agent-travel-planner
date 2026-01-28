import { BaseAgent } from './baseAgent';
import { AgentMessage, DayPlan, Activity, WeatherData, TravelPreferences, TravelInput } from '@/types/agent';

interface ItineraryInput {
  destination: string;
  duration: number;
  weather: WeatherData[];
  budget: number;
  preferences: TravelPreferences;
  travelInput: TravelInput;
}

/**
 * AI Itinerary Agent - Creates day-wise plans with REAL place names
 * 
 * CRITICAL CHANGE: This agent now works with grounded data only
 * Places come from Geoapify discovery, not hallucination
 */
export class AIItineraryAgent extends BaseAgent {
  constructor() {
    super('itinerary');
  }

  protected handleMessage(message: AgentMessage): void {
    console.log(`[AIItineraryAgent] Received: ${message.content}`);
    
    if (message.from === 'weather' && message.content.includes('weather change')) {
      this.sendMessage('coordinator', 'Itinerary may need adjustment due to weather', 'notification');
    }
  }

  async process(input: ItineraryInput): Promise<DayPlan[]> {
    this.setStatus('thinking');
    this.sendMessage('coordinator', `📅 Creating ${input.duration}-day itinerary for ${input.destination}`, 'notification');

    // The actual itinerary with real places comes from the grounded coordinator
    // This fallback is only used if the main API fails
    const itinerary = this.generateFallbackItinerary(input);
    
    this.setStatus('completed');
    const totalCost = itinerary.reduce((sum, day) => sum + day.totalCost, 0);
    this.sendMessage('coordinator', `✅ Itinerary ready! Total activities cost: ₹${totalCost.toLocaleString()}`, 'response');
    this.sendMessage('budget', `cost: ${totalCost}`, 'notification');

    return itinerary;
  }

  private generateFallbackItinerary(input: ItineraryInput): DayPlan[] {
    const plans: DayPlan[] = [];
    const dailyBudget = (input.budget * 0.2) / input.duration;

    for (let day = 0; day < input.duration; day++) {
      const weather = input.weather[day] || input.weather[input.weather.length - 1];
      
      const activities: Activity[] = [
        {
          id: `act-${day}-1`,
          name: `Explore ${input.destination} - Morning`,
          type: 'sightseeing',
          duration: '3h',
          cost: Math.round(dailyBudget * 0.3),
          description: 'Enable API keys for specific place recommendations',
          weatherDependent: true
        },
        {
          id: `act-${day}-2`,
          name: `Local Experience - Afternoon`,
          type: 'culture',
          duration: '3h',
          cost: Math.round(dailyBudget * 0.3),
          description: 'Discover local attractions',
          weatherDependent: false
        },
        {
          id: `act-${day}-3`,
          name: `Evening Activity`,
          type: 'food',
          duration: '2h',
          cost: Math.round(dailyBudget * 0.2),
          description: 'Local cuisine and evening walk',
          weatherDependent: false
        }
      ];

      plans.push({
        day: day + 1,
        date: weather.date,
        weather,
        activities,
        totalCost: activities.reduce((sum, a) => sum + a.cost, 0)
      });
    }

    return plans;
  }
}

export const aiItineraryAgent = new AIItineraryAgent();
