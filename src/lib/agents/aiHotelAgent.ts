import { BaseAgent } from './baseAgent';
import { AgentMessage, HotelOption, TravelInput } from '@/types/agent';
import { getAIHotels, AIHotelsResponse, AIHotelOption } from '@/lib/api/travelAI';

interface HotelInput {
  destination: string;
  budget: number;
  nights: number;
  preference: 'budget' | 'mid-range' | 'luxury';
  travelInput: TravelInput;
}

export class AIHotelAgent extends BaseAgent {
  constructor() {
    super('hotel');
  }

  protected handleMessage(message: AgentMessage): void {
    console.log(`[AIHotelAgent] Received: ${message.content}`);
  }

  async process(input: HotelInput): Promise<HotelOption[]> {
    this.setStatus('thinking');
    this.sendMessage('coordinator', `🏨 AI searching Booking.com/Airbnb-style hotels in ${input.destination}`, 'notification');

    try {
      const aiResponse = await getAIHotels(input.travelInput);
      
      const hotels = this.convertAIResponseToHotels(aiResponse, input.nights);
      
      this.setStatus('completed');
      this.sendMessage('coordinator', `✅ Found ${hotels.length} AI-recommended accommodations. ${aiResponse.recommendation}`, 'response');
      
      if (hotels[0]) {
        this.sendMessage('budget', `cost: ${hotels[0].pricePerNight * input.nights}`, 'notification');
      }

      return hotels;
    } catch (error) {
      console.error('[AIHotelAgent] Error:', error);
      this.sendMessage('coordinator', '⚠️ AI unavailable, using fallback hotels', 'notification');
      
      return this.generateFallbackHotels(input);
    }
  }

  private convertAIResponseToHotels(response: AIHotelsResponse, nights: number): HotelOption[] {
    return response.hotels.map((hotel: AIHotelOption, index: number) => ({
      id: `ai-hotel-${index}`,
      name: hotel.name,
      rating: hotel.rating,
      pricePerNight: hotel.pricePerNight,
      location: `${hotel.location} (${hotel.distanceToCenter} from center)`,
      amenities: hotel.amenities,
      image: undefined,
      // Extended info stored in description via amenities
    }));
  }

  private generateFallbackHotels(input: HotelInput): HotelOption[] {
    const hotelTemplates = {
      budget: [
        { name: 'Backpacker Haven', rating: 3.5, basePrice: 800, amenities: ['WiFi', 'AC', 'Breakfast'] },
        { name: 'City Budget Inn', rating: 3.2, basePrice: 600, amenities: ['WiFi', 'TV'] },
      ],
      'mid-range': [
        { name: 'Comfort Stay Hotel', rating: 4.0, basePrice: 2500, amenities: ['WiFi', 'AC', 'Pool', 'Gym', 'Breakfast'] },
        { name: 'Urban Retreat', rating: 4.2, basePrice: 2800, amenities: ['WiFi', 'AC', 'Spa', 'Restaurant'] },
      ],
      luxury: [
        { name: 'Grand Palace Resort', rating: 4.8, basePrice: 8000, amenities: ['WiFi', 'AC', 'Pool', 'Spa', 'Fine Dining', 'Butler'] },
        { name: 'Royal Heritage Hotel', rating: 4.9, basePrice: 12000, amenities: ['WiFi', 'AC', 'Private Beach', 'Spa', 'Golf'] },
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
}

export const aiHotelAgent = new AIHotelAgent();
