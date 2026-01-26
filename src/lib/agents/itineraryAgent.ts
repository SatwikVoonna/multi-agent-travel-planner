import { BaseAgent } from './baseAgent';
import { AgentMessage, DayPlan, Activity, WeatherData, TravelPreferences } from '@/types/agent';

interface ItineraryInput {
  destination: string;
  duration: number;
  weather: WeatherData[];
  budget: number;
  preferences: TravelPreferences;
}

export class ItineraryAgent extends BaseAgent {
  constructor() {
    super('itinerary');
  }

  protected handleMessage(message: AgentMessage): void {
    console.log(`[ItineraryAgent] Received: ${message.content}`);
    
    // React to weather changes
    if (message.from === 'weather' && message.content.includes('weather change')) {
      this.sendMessage('coordinator', 'Itinerary may need adjustment due to weather', 'notification');
    }
  }

  async process(input: ItineraryInput): Promise<DayPlan[]> {
    this.setStatus('thinking');
    this.sendMessage('coordinator', `Creating ${input.duration}-day itinerary for ${input.destination}`, 'notification');

    await this.simulateDelay(1200);

    const itinerary = this.generateItinerary(input);
    
    this.setStatus('completed');
    const totalCost = itinerary.reduce((sum, day) => sum + day.totalCost, 0);
    this.sendMessage('coordinator', `Itinerary ready! Total activities cost: ${totalCost}`, 'response');
    this.sendMessage('budget', `cost: ${totalCost}`, 'notification');

    return itinerary;
  }

  private generateItinerary(input: ItineraryInput): DayPlan[] {
    const activityBank = this.getActivityBank(input.destination);
    const dailyBudget = (input.budget * 0.2) / input.duration; // 20% for activities
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
    // Generic activities that can apply to most destinations
    return [
      { id: 'act-1', name: 'City Walking Tour', type: 'sightseeing', duration: '3h', cost: 500, description: 'Explore the heart of the city', weatherDependent: true },
      { id: 'act-2', name: 'Local Market Visit', type: 'shopping', duration: '2h', cost: 200, description: 'Experience local culture and crafts', weatherDependent: false },
      { id: 'act-3', name: 'Heritage Site Visit', type: 'culture', duration: '4h', cost: 800, description: 'Historical monuments and museums', weatherDependent: false },
      { id: 'act-4', name: 'Beach/Nature Walk', type: 'nature', duration: '3h', cost: 0, description: 'Relax by natural landscapes', weatherDependent: true },
      { id: 'act-5', name: 'Adventure Activity', type: 'adventure', duration: '4h', cost: 1500, description: 'Water sports or hiking', weatherDependent: true },
      { id: 'act-6', name: 'Food Tour', type: 'food', duration: '3h', cost: 1000, description: 'Taste local delicacies', weatherDependent: false },
      { id: 'act-7', name: 'Sunset Point Visit', type: 'sightseeing', duration: '2h', cost: 100, description: 'Scenic viewpoint experience', weatherDependent: true },
      { id: 'act-8', name: 'Night Market/Entertainment', type: 'entertainment', duration: '3h', cost: 600, description: 'Evening entertainment', weatherDependent: false },
      { id: 'act-9', name: 'Museum Visit', type: 'culture', duration: '2h', cost: 300, description: 'Art and history museum', weatherDependent: false },
      { id: 'act-10', name: 'Local Workshop/Class', type: 'experience', duration: '2h', cost: 800, description: 'Learn local craft or cooking', weatherDependent: false },
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

    // Filter activities based on weather
    const availableActivities = activities.filter(a => {
      if (a.weatherDependent && !weather.suitable) return false;
      return true;
    });

    // Shuffle to vary activities across days
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

  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const itineraryAgent = new ItineraryAgent();
