import { BaseAgent } from './baseAgent';
import { AgentMessage, DayPlan, Activity, WeatherData, TravelPreferences, TravelInput } from '@/types/agent';
import { getAIItinerary, AIItineraryResponse, AIItineraryDay } from '@/lib/api/travelAI';

interface ItineraryInput {
  destination: string;
  duration: number;
  weather: WeatherData[];
  budget: number;
  preferences: TravelPreferences;
  travelInput: TravelInput;
}

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
    this.sendMessage('coordinator', `🤖 AI generating ${input.duration}-day itinerary for ${input.destination}`, 'notification');

    try {
      const aiResponse = await getAIItinerary(input.travelInput, input.weather);
      
      const itinerary = this.convertAIResponseToItinerary(aiResponse, input.weather);
      
      this.setStatus('completed');
      const totalCost = itinerary.reduce((sum, day) => sum + day.totalCost, 0);
      this.sendMessage('coordinator', `✅ AI itinerary ready! Total activities cost: ₹${totalCost.toLocaleString()}`, 'response');
      this.sendMessage('budget', `cost: ${totalCost}`, 'notification');

      return itinerary;
    } catch (error) {
      console.error('[AIItineraryAgent] Error:', error);
      this.sendMessage('coordinator', '⚠️ AI unavailable, using fallback itinerary', 'notification');
      
      // Fallback to basic generation
      return this.generateFallbackItinerary(input);
    }
  }

  private convertAIResponseToItinerary(response: AIItineraryResponse, weather: WeatherData[]): DayPlan[] {
    return response.days.map((day: AIItineraryDay, index: number) => {
      const weatherData = weather[index] || weather[weather.length - 1];
      
      const activities: Activity[] = day.activities.map((act, actIndex) => ({
        id: `ai-act-${day.day}-${actIndex}`,
        name: act.name,
        type: act.type,
        duration: act.duration,
        cost: act.cost,
        description: `${act.description}${act.tips ? ` Pro tip: ${act.tips}` : ''}`,
        weatherDependent: act.weatherDependent,
      }));

      // Add meal costs to total
      const mealsCost = (day.meals?.breakfast?.budget || 0) + 
                        (day.meals?.lunch?.budget || 0) + 
                        (day.meals?.dinner?.budget || 0);

      return {
        day: day.day,
        date: weatherData.date,
        weather: weatherData,
        activities,
        totalCost: day.totalCost || (activities.reduce((sum, a) => sum + a.cost, 0) + mealsCost),
      };
    });
  }

  private generateFallbackItinerary(input: ItineraryInput): DayPlan[] {
    const activityBank = this.getActivityBank(input.destination);
    const dailyBudget = (input.budget * 0.2) / input.duration;
    const plans: DayPlan[] = [];

    for (let day = 0; day < input.duration; day++) {
      const weather = input.weather[day] || input.weather[input.weather.length - 1];
      const activities = this.selectActivitiesForDay(
        activityBank,
        weather,
        dailyBudget,
        input.preferences,
        day
      );

      plans.push({
        day: day + 1,
        date: weather.date,
        weather,
        activities,
        totalCost: activities.reduce((sum, a) => sum + a.cost, 0),
      });
    }

    return plans;
  }

  private getActivityBank(destination: string): Activity[] {
    return [
      { id: 'act-1', name: 'City Walking Tour', type: 'sightseeing', duration: '3h', cost: 500, description: 'Explore the heart of the city', weatherDependent: true },
      { id: 'act-2', name: 'Local Market Visit', type: 'shopping', duration: '2h', cost: 200, description: 'Experience local culture and crafts', weatherDependent: false },
      { id: 'act-3', name: 'Heritage Site Visit', type: 'culture', duration: '4h', cost: 800, description: 'Historical monuments and museums', weatherDependent: false },
      { id: 'act-4', name: 'Beach/Nature Walk', type: 'nature', duration: '3h', cost: 0, description: 'Relax by natural landscapes', weatherDependent: true },
      { id: 'act-5', name: 'Adventure Activity', type: 'adventure', duration: '4h', cost: 1500, description: 'Water sports or hiking', weatherDependent: true },
      { id: 'act-6', name: 'Food Tour', type: 'food', duration: '3h', cost: 1000, description: 'Taste local delicacies', weatherDependent: false },
    ];
  }

  private selectActivitiesForDay(
    activities: Activity[],
    weather: WeatherData,
    budget: number,
    preferences: TravelPreferences,
    dayIndex: number
  ): Activity[] {
    const selected: Activity[] = [];
    let remainingBudget = budget;
    let hoursUsed = 0;
    const maxHours = preferences.pace === 'relaxed' ? 6 : preferences.pace === 'packed' ? 10 : 8;

    const availableActivities = activities.filter(a => {
      if (a.weatherDependent && !weather.suitable) return false;
      return true;
    });

    const shuffled = [...availableActivities].sort(() => Math.random() - 0.5);

    for (const activity of shuffled) {
      const duration = parseInt(activity.duration);
      if (
        hoursUsed + duration <= maxHours &&
        activity.cost <= remainingBudget &&
        !selected.find(s => s.type === activity.type)
      ) {
        selected.push({
          ...activity,
          id: `${activity.id}-day${dayIndex}`,
        });
        hoursUsed += duration;
        remainingBudget -= activity.cost;
      }

      if (selected.length >= 4) break;
    }

    return selected;
  }
}

export const aiItineraryAgent = new AIItineraryAgent();
