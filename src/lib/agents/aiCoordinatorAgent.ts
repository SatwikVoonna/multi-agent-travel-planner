import { BaseAgent } from './baseAgent';
import { AgentMessage, TravelInput, TravelPlan, AgentType } from '@/types/agent';
import { weatherAgent } from './weatherAgent';
import { aiBudgetAgent } from './aiBudgetAgent';
import { aiHotelAgent } from './aiHotelAgent';
import { aiTransportAgent } from './aiTransportAgent';
import { aiItineraryAgent } from './aiItineraryAgent';

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
    this.broadcast('🚀 Starting AI-powered travel plan coordination with Gemini');

    try {
      const plan = await this.coordinatePlanning(input);
      this.setStatus('completed');
      this.broadcast('✅ AI Travel plan completed successfully!');
      return plan;
    } catch (error) {
      this.setStatus('error');
      this.broadcast('❌ Error during AI planning. Please try again.');
      throw error;
    } finally {
      this.planningInProgress = false;
    }
  }

  private async coordinatePlanning(input: TravelInput): Promise<TravelPlan> {
    const startDate = input.startDate!;
    const endDate = input.endDate!;
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Phase 1: Parallel AI-powered data gathering
    this.sendMessage('weather', 'Request weather data', 'request');
    this.sendMessage('budget', 'Request AI budget analysis', 'request');
    this.sendMessage('hotel', 'Request AI hotel recommendations (Booking.com/Airbnb style)', 'request');
    this.sendMessage('transport', 'Request AI transport options', 'request');

    const [weatherData, budgetValidation, hotels, transports] = await Promise.all([
      weatherAgent.process({
        destination: input.destination,
        startDate,
        endDate,
      }),
      aiBudgetAgent.process({
        totalBudget: input.budget,
        duration,
        travelers: input.travelers,
        accommodation: input.preferences.accommodation,
        travelInput: input,
      }),
      aiHotelAgent.process({
        destination: input.destination,
        budget: input.budget * 0.35,
        nights: duration - 1,
        preference: input.preferences.accommodation,
        travelInput: input,
      }),
      aiTransportAgent.process({
        from: 'Your City',
        to: input.destination,
        date: startDate,
        budget: input.budget,
        preference: input.preferences.transportMode,
        travelInput: input,
      }),
    ]);

    // Phase 2: Create AI-powered itinerary based on gathered data
    this.sendMessage('itinerary', 'Request AI itinerary creation with Gemini', 'request');
    
    const itinerary = await aiItineraryAgent.process({
      destination: input.destination,
      duration,
      weather: weatherData,
      budget: input.budget,
      preferences: input.preferences,
      travelInput: input,
    });

    // Phase 3: Calculate final costs
    const selectedHotel = hotels[0];
    const selectedTransport = transports[0];
    const accommodationCost = selectedHotel ? selectedHotel.pricePerNight * (duration - 1) : 0;
    const transportCost = selectedTransport ? selectedTransport.price * 2 : 0; // Round trip
    const activitiesCost = itinerary.reduce((sum, day) => sum + day.totalCost, 0);
    const foodCost = budgetValidation.breakdown.food;
    const miscCost = budgetValidation.breakdown.miscellaneous;
    const totalCost = accommodationCost + transportCost + activitiesCost + foodCost + miscCost;

    // Phase 4: Final budget check
    let budgetStatus: 'approved' | 'warning' | 'exceeded';
    if (totalCost <= input.budget) {
      budgetStatus = 'approved';
    } else if (totalCost <= input.budget * 1.1) {
      budgetStatus = 'warning';
    } else {
      budgetStatus = 'exceeded';
    }

    // Determine weather status
    const suitableDays = weatherData.filter(w => w.suitable).length;
    const weatherStatus = suitableDays === duration 
      ? 'suitable' 
      : suitableDays >= duration * 0.7 
        ? 'partially-suitable' 
        : 'unsuitable';

    return {
      destination: input.destination,
      duration,
      totalBudget: input.budget,
      totalCost,
      budgetStatus,
      weatherStatus,
      hotel: selectedHotel || null,
      transport: selectedTransport || null,
      itinerary,
      generatedAt: new Date(),
    };
  }
}

export const aiCoordinatorAgent = new AICoordinatorAgent();
