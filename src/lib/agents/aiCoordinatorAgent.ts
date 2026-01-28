import { BaseAgent } from './baseAgent';
import { AgentMessage, TravelInput, TravelPlan, WeatherData, HotelOption, TransportOption, DayPlan } from '@/types/agent';
import { fetchGroundedTravelPlan, GroundedTravelPlan } from '@/lib/api/travelAI';

/**
 * AI Coordinator Agent - Orchestrates the grounded travel planning process
 * 
 * KEY CHANGES:
 * - Uses a single API call for full grounded plan
 * - Location resolution via Nominatim (no hardcoded destinations)
 * - Places discovered via Geoapify (real tourist spots)
 * - Gemini used for reasoning, NOT hallucination
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
    if (this.planningInProgress) {
      throw new Error('Planning already in progress');
    }

    this.planningInProgress = true;
    this.setStatus('active');
    this.broadcast('🚀 Starting location-grounded travel planning with real data...');

    try {
      const plan = await this.coordinatePlanning(input);
      this.setStatus('completed');
      this.broadcast('✅ Grounded travel plan completed with real place names!');
      return plan;
    } catch (error) {
      this.setStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.broadcast(`❌ Planning error: ${errorMessage}`);
      throw error;
    } finally {
      this.planningInProgress = false;
    }
  }

  private async coordinatePlanning(input: TravelInput): Promise<TravelPlan> {
    const startDate = input.startDate!;
    const endDate = input.endDate!;
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Step 1: Notify agents
    this.sendMessage('budget', 'Requesting grounded budget analysis', 'request');
    this.sendMessage('weather', 'Requesting real-time weather data', 'request');
    this.sendMessage('hotel', 'Searching for accommodations via Geoapify', 'request');
    this.sendMessage('transport', 'Generating transport options', 'request');
    this.sendMessage('itinerary', 'Creating itinerary with real place names', 'request');

    // Step 2: Fetch the complete grounded plan
    this.broadcast(`📍 Resolving location: ${input.destination} via OpenStreetMap...`);
    
    let groundedPlan: GroundedTravelPlan;
    
    try {
      groundedPlan = await fetchGroundedTravelPlan(input);
      
      this.broadcast(`✓ Location resolved: ${groundedPlan.destination}`);
      this.broadcast(`✓ Discovered ${groundedPlan.sourceData.placesDiscovered} real places`);
      this.broadcast(`✓ Found ${groundedPlan.sourceData.accommodationsFound} accommodations`);
      this.broadcast(`✓ Weather source: ${groundedPlan.sourceData.weatherSource}`);
      
    } catch (error) {
      console.error('[AICoordinator] Grounded plan error:', error);
      this.broadcast('⚠️ Using fallback planning mode...');
      return this.generateFallbackPlan(input, duration);
    }

    // Step 3: Convert to TravelPlan format
    const weatherData: WeatherData[] = groundedPlan.itinerary.map((day, index) => ({
      date: day.date,
      temperature: day.weather.temperature,
      condition: day.weather.condition,
      icon: this.getWeatherIcon(day.weather.condition),
      humidity: 50,
      windSpeed: 10,
      suitable: day.weather.suitable
    }));

    const hotel: HotelOption = {
      id: 'grounded-hotel-1',
      name: groundedPlan.accommodation.name,
      rating: 4.0,
      pricePerNight: groundedPlan.accommodation.pricePerNight,
      location: groundedPlan.accommodation.address,
      amenities: ['WiFi', 'AC', 'Parking']
    };

    const transport: TransportOption = {
      id: 'grounded-transport-1',
      type: groundedPlan.transport.type as 'flight' | 'train' | 'bus' | 'car',
      from: groundedPlan.transport.from,
      to: groundedPlan.transport.to,
      duration: groundedPlan.transport.duration,
      price: groundedPlan.transport.price,
      departure: '08:00 AM',
      arrival: 'Varies'
    };

    const itinerary: DayPlan[] = groundedPlan.itinerary.map((day) => ({
      day: day.day,
      date: day.date,
      weather: weatherData[day.day - 1] || weatherData[0],
      activities: day.activities.map((act, idx) => ({
        id: `act-${day.day}-${idx}`,
        name: act.name,
        type: act.category,
        duration: act.duration,
        cost: act.estimatedCost,
        description: act.tips,
        weatherDependent: !act.weatherSuitable
      })),
      totalCost: day.dailyCost
    }));

    // Notify agents of completion
    this.sendMessage('budget', `Budget status: ${groundedPlan.budgetStatus}`, 'response');
    this.sendMessage('weather', `Weather status: ${groundedPlan.weatherStatus}`, 'response');
    this.sendMessage('hotel', `Selected: ${hotel.name}`, 'response');
    this.sendMessage('transport', `Selected: ${transport.type}`, 'response');
    this.sendMessage('itinerary', `Created ${itinerary.length}-day plan with real places`, 'response');

    return {
      destination: groundedPlan.destination,
      duration: groundedPlan.duration,
      totalBudget: input.budget,
      totalCost: groundedPlan.budgetBreakdown.total,
      budgetStatus: groundedPlan.budgetStatus,
      weatherStatus: groundedPlan.weatherStatus,
      hotel,
      transport,
      itinerary,
      generatedAt: new Date()
    };
  }

  private getWeatherIcon(condition: string): string {
    const icons: Record<string, string> = {
      'Clear': '☀️',
      'Sunny': '☀️',
      'Clouds': '⛅',
      'Cloudy': '⛅',
      'Partly Cloudy': '⛅',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '❄️',
      'Mist': '🌫️',
      'Fog': '🌫️'
    };
    return icons[condition] || '🌤️';
  }

  private generateFallbackPlan(input: TravelInput, duration: number): TravelPlan {
    // Fallback for when API fails
    const weatherData: WeatherData[] = [];
    const itinerary: DayPlan[] = [];
    
    for (let i = 0; i < duration; i++) {
      const date = new Date(input.startDate!);
      date.setDate(date.getDate() + i);
      
      weatherData.push({
        date: date.toISOString().split('T')[0],
        temperature: 25 + Math.floor(Math.random() * 10),
        condition: 'Clear',
        icon: '☀️',
        humidity: 50,
        windSpeed: 10,
        suitable: true
      });
      
      itinerary.push({
        day: i + 1,
        date: date.toISOString().split('T')[0],
        weather: weatherData[i],
        activities: [
          {
            id: `fallback-${i}-1`,
            name: `Explore ${input.destination} - Day ${i + 1}`,
            type: 'sightseeing',
            duration: '4h',
            cost: 500,
            description: 'Please enable API keys for specific place recommendations',
            weatherDependent: true
          }
        ],
        totalCost: 2000
      });
    }

    return {
      destination: input.destination,
      duration,
      totalBudget: input.budget,
      totalCost: duration * 2000,
      budgetStatus: 'warning',
      weatherStatus: 'suitable',
      hotel: {
        id: 'fallback-hotel',
        name: `Hotel in ${input.destination}`,
        rating: 3.5,
        pricePerNight: 1500,
        location: input.destination,
        amenities: ['WiFi', 'AC']
      },
      transport: {
        id: 'fallback-transport',
        type: 'train',
        from: 'Your City',
        to: input.destination,
        duration: '6h',
        price: 800,
        departure: 'Morning',
        arrival: 'Afternoon'
      },
      itinerary,
      generatedAt: new Date()
    };
  }
}

export const aiCoordinatorAgent = new AICoordinatorAgent();
