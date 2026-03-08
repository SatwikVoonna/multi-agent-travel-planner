import { BaseAgent } from './baseAgent';
import { AgentMessage, TravelInput, TravelPlan, WeatherData, HotelOption, TransportOption, DayPlan, Activity } from '@/types/agent';
import { supabase } from '@/integrations/supabase/client';

/**
 * AI Coordinator Agent - Orchestrates the grounded travel planning process
 * Calls the edge function which uses Gemini for place discovery + itinerary reasoning
 */
export class AICoordinatorAgent extends BaseAgent {
  private planningInProgress = false;

  constructor() {
    super('coordinator');
  }

  protected handleMessage(message: AgentMessage): void {
    console.log(`[AICoordinator] From ${message.from}: ${message.content}`);
  }

  async process(input: TravelInput): Promise<TravelPlan> {
    if (this.planningInProgress) throw new Error('Planning already in progress');
    this.planningInProgress = true;
    this.setStatus('active');
    this.broadcast('🚀 Starting AI-powered travel planning...');

    try {
      const plan = await this.buildPlan(input);
      this.setStatus('completed');
      this.broadcast('✅ Travel plan completed with real place names!');
      return plan;
    } catch (error) {
      this.setStatus('error');
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.broadcast(`❌ Error: ${msg}`);
      throw error;
    } finally {
      this.planningInProgress = false;
    }
  }

  private async buildPlan(input: TravelInput): Promise<TravelPlan> {
    const startDate = input.startDate!;
    const endDate = input.endDate!;
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Notify agents
    this.sendMessage('weather', 'Fetching real-time weather data', 'request');
    this.sendMessage('hotel', 'Discovering accommodation options', 'request');
    this.sendMessage('transport', 'Generating transport options', 'request');
    this.sendMessage('itinerary', 'Creating itinerary with real places', 'request');
    this.sendMessage('budget', 'Analyzing budget', 'request');

    this.broadcast(`📍 Resolving location: ${input.destination}...`);

    const { data, error } = await supabase.functions.invoke('ai-travel-planner', {
      body: {
        type: 'full-plan',
        destination: input.destination,
        duration,
        budget: input.budget,
        currency: input.currency,
        travelers: input.travelers,
        preferences: input.preferences,
        originCity: 'Delhi',
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to generate travel plan');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Planning failed');
    }

    const raw = data.data;

    this.broadcast(`✓ Discovered ${raw.sourceData?.placesDiscovered || 0} real places`);
    this.broadcast(`✓ Found ${raw.sourceData?.accommodationsFound || 0} accommodation options`);

    // Map the new response format to TravelPlan
    return this.mapToTravelPlan(raw, input, duration);
  }

  private mapToTravelPlan(raw: any, input: TravelInput, duration: number): TravelPlan {
    // Map daily plan to itinerary
    const itinerary: DayPlan[] = (raw.daily_plan || []).map((day: any) => {
      const weather: WeatherData = {
        date: day.date || '',
        temperature: day.weather?.temperature || 28,
        condition: day.weather?.condition || 'Clear',
        icon: this.weatherIcon(day.weather?.condition || 'Clear'),
        humidity: 55,
        windSpeed: 12,
        suitable: day.weather?.suitable ?? true,
      };

      const activities: Activity[] = (day.activities || []).map((act: any, idx: number) => ({
        id: `act-${day.day}-${idx}`,
        name: act.name || 'Unknown Place',
        type: act.category || 'sightseeing',
        duration: act.duration || '2 hours',
        cost: act.estimated_cost || 0,
        description: act.description || act.tips || '',
        weatherDependent: !(act.weather_suitable ?? true),
      }));

      return {
        day: day.day,
        date: day.date || '',
        weather,
        activities,
        totalCost: day.daily_cost || activities.reduce((s: number, a: Activity) => s + a.cost, 0),
      };
    });

    // Map accommodation
    const acc = raw.accommodation || {};
    const hotel: HotelOption = {
      id: 'hotel-1',
      name: acc.name || `Hotel in ${input.destination}`,
      rating: acc.rating || 3.5,
      pricePerNight: acc.price_per_night || 1500,
      location: acc.address || input.destination,
      amenities: acc.amenities || ['WiFi', 'AC'],
    };

    // Map transport
    const tr = raw.transport || {};
    const transport: TransportOption = {
      id: 'transport-1',
      type: (tr.type || 'train') as 'flight' | 'train' | 'bus' | 'car',
      from: tr.from || 'Delhi',
      to: tr.to || input.destination,
      duration: tr.duration || '10h',
      price: tr.price || 1000,
      departure: '08:00 AM',
      arrival: 'Varies',
    };

    // Budget
    const bb = raw.budget_breakdown || {};
    const totalCost = bb.total || itinerary.reduce((s, d) => s + d.totalCost, 0) + hotel.pricePerNight * (duration - 1) + transport.price * 2;

    // Notify agents
    this.sendMessage('weather', `Weather: ${raw.weather_status || 'suitable'}`, 'response');
    this.sendMessage('hotel', `Selected: ${hotel.name}`, 'response');
    this.sendMessage('transport', `Selected: ${transport.type} (₹${transport.price})`, 'response');
    this.sendMessage('budget', `Status: ${raw.budget_status || 'approved'}`, 'response');
    this.sendMessage('itinerary', `Created ${itinerary.length}-day plan`, 'response');

    return {
      destination: raw.destination || input.destination,
      duration,
      totalBudget: input.budget,
      totalCost,
      budgetStatus: raw.budget_status || 'approved',
      weatherStatus: raw.weather_status || 'suitable',
      hotel,
      transport,
      itinerary,
      generatedAt: new Date(),
    };
  }

  private weatherIcon(condition: string): string {
    const m: Record<string, string> = { Clear: '☀️', Sunny: '☀️', Clouds: '⛅', Cloudy: '⛅', Rain: '🌧️', Drizzle: '🌦️', Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️' };
    return m[condition] || '🌤️';
  }
}

export const aiCoordinatorAgent = new AICoordinatorAgent();
