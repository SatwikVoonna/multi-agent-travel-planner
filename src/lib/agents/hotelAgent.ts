import { BaseAgent } from './baseAgent';
import { AgentMessage, HotelOption } from '@/types/agent';

interface HotelInput {
  destination: string;
  budget: number;
  nights: number;
  preference: 'budget' | 'mid-range' | 'luxury';
}

export class HotelAgent extends BaseAgent {
  constructor() {
    super('hotel');
  }

  protected handleMessage(message: AgentMessage): void {
    console.log(`[HotelAgent] Received: ${message.content}`);
  }

  async process(input: HotelInput): Promise<HotelOption[]> {
    this.setStatus('thinking');
    this.sendMessage('coordinator', `Searching hotels in ${input.destination}`, 'notification');

    await this.simulateDelay(1000);

    const hotels = this.generateHotelOptions(input);
    
    this.setStatus('completed');
    this.sendMessage('coordinator', `Found ${hotels.length} hotel options`, 'response');
    this.sendMessage('budget', `cost: ${hotels[0]?.pricePerNight * input.nights || 0}`, 'notification');

    return hotels;
  }

  private generateHotelOptions(input: HotelInput): HotelOption[] {
    const hotelTemplates = {
      budget: [
        { name: 'Backpacker Haven', rating: 3.5, basePrice: 800, amenities: ['WiFi', 'AC', 'Breakfast'] },
        { name: 'City Budget Inn', rating: 3.2, basePrice: 600, amenities: ['WiFi', 'TV'] },
        { name: 'Traveler\'s Rest', rating: 3.8, basePrice: 900, amenities: ['WiFi', 'AC', 'Laundry'] },
      ],
      'mid-range': [
        { name: 'Comfort Stay Hotel', rating: 4.0, basePrice: 2500, amenities: ['WiFi', 'AC', 'Pool', 'Gym', 'Breakfast'] },
        { name: 'Urban Retreat', rating: 4.2, basePrice: 2800, amenities: ['WiFi', 'AC', 'Spa', 'Restaurant'] },
        { name: 'City Central Hotel', rating: 4.1, basePrice: 2200, amenities: ['WiFi', 'AC', 'Bar', 'Room Service'] },
      ],
      luxury: [
        { name: 'Grand Palace Resort', rating: 4.8, basePrice: 8000, amenities: ['WiFi', 'AC', 'Pool', 'Spa', 'Fine Dining', 'Butler'] },
        { name: 'Royal Heritage Hotel', rating: 4.9, basePrice: 12000, amenities: ['WiFi', 'AC', 'Private Beach', 'Spa', 'Golf'] },
        { name: 'The Elite Collection', rating: 4.7, basePrice: 7000, amenities: ['WiFi', 'AC', 'Rooftop Bar', 'Spa', 'Concierge'] },
      ],
    };

    const templates = hotelTemplates[input.preference];
    const budgetPerNight = input.budget / input.nights;

    return templates
      .filter(t => t.basePrice <= budgetPerNight * 1.2)
      .map((template, index) => ({
        id: `hotel-${index}`,
        name: `${template.name} - ${input.destination}`,
        rating: template.rating,
        pricePerNight: template.basePrice + Math.floor(Math.random() * 500),
        location: `Central ${input.destination}`,
        amenities: template.amenities,
      }))
      .sort((a, b) => b.rating - a.rating);
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const hotelAgent = new HotelAgent();
