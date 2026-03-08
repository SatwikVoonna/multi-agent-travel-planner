import { BaseAgent } from './baseAgent';
import { AgentMessage, TravelInput, TravelPlan, WeatherData, HotelOption, TransportOption, DayPlan, Activity, MealRecommendation, TravelBetween } from '@/types/agent';
import { supabase } from '@/integrations/supabase/client';

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
      this.broadcast('✅ Travel plan completed!');
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

    this.sendMessage('weather', 'Fetching weather data', 'request');
    this.sendMessage('hotel', 'Discovering accommodations', 'request');
    this.sendMessage('transport', 'Planning transport', 'request');
    this.sendMessage('itinerary', 'Creating itinerary with real places', 'request');
    this.sendMessage('budget', 'Analyzing budget', 'request');

    this.broadcast(`📍 Planning ${duration}-day trip to ${input.destination}...`);

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
    this.broadcast(`✓ Generated plan with ${raw.daily_plan?.length || 0} days`);

    return this.mapToTravelPlan(raw, input, duration);
  }

  private mapToTravelPlan(raw: any, input: TravelInput, duration: number): TravelPlan {
    // Map daily plan
    const itinerary: DayPlan[] = (raw.daily_plan || []).map((day: any) => {
      const w = day.weather || {};
      const weather: WeatherData = {
        date: day.date || '',
        temperature: w.temperature || 28,
        condition: w.condition || 'Clear',
        icon: this.weatherIcon(w.condition || 'Clear'),
        humidity: w.humidity || 55,
        windSpeed: w.windSpeed || 12,
        suitable: w.suitable ?? true,
        recommendation: w.recommendation || '',
      };

      const activities: Activity[] = (day.activities || []).map((act: any, idx: number) => {
        const travel: TravelBetween | undefined = act.travel_from_previous ? {
          distanceKm: act.travel_from_previous.distance_km || 0,
          travelTime: act.travel_from_previous.travel_time || '',
          mode: act.travel_from_previous.mode || '',
        } : undefined;

        return {
          id: `act-${day.day}-${idx}`,
          name: act.name || 'Unknown Place',
          type: act.category || 'sightseeing',
          duration: act.duration || '2 hours',
          cost: act.estimated_cost || 0,
          description: act.description || '',
          weatherDependent: act.category === 'beach' || act.category === 'nature' || act.category === 'adventure',
          timeSlot: act.time_slot || '',
          tips: act.tips || '',
          travelFromPrevious: travel,
        };
      });

      const meals: DayPlan['meals'] = {};
      if (day.meals?.lunch) {
        const l = day.meals.lunch;
        meals.lunch = {
          name: l.name || '',
          cuisine: l.cuisine || '',
          famousFor: l.famous_for || '',
          costPerPerson: l.cost_per_person || 0,
          timeSlot: l.time_slot || '1:00 PM',
          location: l.location || '',
        };
      }
      if (day.meals?.dinner) {
        const d = day.meals.dinner;
        meals.dinner = {
          name: d.name || '',
          cuisine: d.cuisine || '',
          famousFor: d.famous_for || '',
          costPerPerson: d.cost_per_person || 0,
          timeSlot: d.time_slot || '8:00 PM',
          location: d.location || '',
        };
      }

      return {
        day: day.day,
        date: day.date || '',
        theme: day.theme || '',
        weather,
        activities,
        meals,
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
      totalCost: acc.total_cost || (acc.price_per_night || 1500) * Math.max(duration - 1, 1),
      location: acc.address || input.destination,
      type: acc.type || 'hotel',
      amenities: acc.amenities || ['WiFi', 'AC'],
      alternatives: (acc.alternatives || []).map((a: any) => ({
        name: a.name,
        pricePerNight: a.price_per_night,
        rating: a.rating,
      })),
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
      roundTripCost: tr.round_trip_cost || (tr.price || 1000) * 2,
      carrier: tr.carrier || '',
      departure: '08:00 AM',
      arrival: 'Varies',
    };

    // Budget
    const bb = raw.budget_breakdown || {};
    const totalCost = bb.total || itinerary.reduce((s, d) => s + d.totalCost, 0) + (hotel.totalCost || 0) + (transport.roundTripCost || 0);

    // Notify agents
    this.sendMessage('weather', `Weather status: ${raw.weather_status || 'suitable'}`, 'response');
    this.sendMessage('hotel', `Selected: ${hotel.name} (₹${hotel.pricePerNight}/night)`, 'response');
    this.sendMessage('transport', `${transport.type}: ${transport.from} → ${transport.to} (₹${transport.price})`, 'response');
    this.sendMessage('budget', `Total: ₹${totalCost} — Status: ${raw.budget_status || 'approved'}`, 'response');
    this.sendMessage('itinerary', `Created ${itinerary.length}-day plan`, 'response');

    return {
      destination: raw.destination || input.destination,
      duration,
      totalBudget: input.budget,
      totalCost,
      budgetStatus: raw.budget_status || 'approved',
      budgetBreakdown: bb.total ? {
        accommodation: bb.accommodation || 0,
        transport: bb.transport || 0,
        activities: bb.activities || 0,
        food: bb.food || 0,
        localTransport: bb.local_transport || 0,
        miscellaneous: bb.miscellaneous || 0,
        total: bb.total,
      } : undefined,
      budgetOptimization: raw.budget_optimization?.applied ? {
        applied: true,
        changes: raw.budget_optimization.changes || [],
        saved: raw.budget_optimization.saved || 0,
      } : undefined,
      weatherStatus: raw.weather_status || 'suitable',
      hotel,
      transport,
      itinerary,
      agentDecisions: raw.agent_decisions || undefined,
      tips: raw.tips || [],
      generatedAt: new Date(),
    };
  }

  private weatherIcon(condition: string): string {
    const m: Record<string, string> = { Clear: '☀️', Sunny: '☀️', Clouds: '⛅', Cloudy: '⛅', Rain: '🌧️', Drizzle: '🌦️', Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️' };
    return m[condition] || '🌤️';
  }
}

export const aiCoordinatorAgent = new AICoordinatorAgent();
