import { BaseAgent } from './baseAgent';
import { AgentMessage, TravelInput, TravelPlan, AgentType } from '@/types/agent';
import { weatherAgent } from './weatherAgent';
import { budgetAgent } from './budgetAgent';
import { hotelAgent } from './hotelAgent';
import { transportAgent } from './transportAgent';
import { itineraryAgent } from './itineraryAgent';

export class CoordinatorAgent extends BaseAgent {
  private planningInProgress = false;

  constructor() {
    super('coordinator');
  }

  protected handleMessage(message: AgentMessage): void {
    console.log(`[Coordinator] From ${message.from}: ${message.content}`);
  }

  async process(input: TravelInput): Promise<TravelPlan> {
    if (this.planningInProgress) {
      throw new Error('Planning already in progress');
    }

    this.planningInProgress = true;
    this.setStatus('active');
    this.broadcast('Starting travel plan coordination');

    try {
      const plan = await this.coordinatePlanning(input);
      this.setStatus('completed');
      this.broadcast('Travel plan completed successfully!');
      return plan;
    } catch (error) {
      this.setStatus('error');
      this.broadcast('Error during planning. Please try again.');
      throw error;
    } finally {
      this.planningInProgress = false;
    }
  }

  private async coordinatePlanning(input: TravelInput): Promise<TravelPlan> {
    const startDate = input.startDate!;
    const endDate = input.endDate!;
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Phase 1: Parallel data gathering
    this.sendMessage('weather', 'Request weather data', 'request');
    this.sendMessage('budget', 'Request budget analysis', 'request');
    this.sendMessage('hotel', 'Request hotel options', 'request');
    this.sendMessage('transport', 'Request transport options', 'request');

    const [weatherData, budgetValidation, hotels, transports] = await Promise.all([
      weatherAgent.process({
        destination: input.destination,
        startDate,
        endDate,
      }),
      budgetAgent.process({
        totalBudget: input.budget,
        duration,
        travelers: input.travelers,
        accommodation: input.preferences.accommodation,
      }),
      hotelAgent.process({
        destination: input.destination,
        budget: input.budget * 0.35,
        nights: duration - 1,
        preference: input.preferences.accommodation,
      }),
      transportAgent.process({
        from: 'Your City', // Could be made dynamic
        to: input.destination,
        date: startDate,
        budget: input.budget,
        preference: input.preferences.transportMode,
      }),
    ]);

    // Phase 2: Create itinerary based on gathered data
    this.sendMessage('itinerary', 'Request itinerary creation', 'request');
    
    const itinerary = await itineraryAgent.process({
      destination: input.destination,
      duration,
      weather: weatherData,
      budget: input.budget,
      preferences: input.preferences,
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

export const coordinatorAgent = new CoordinatorAgent();
