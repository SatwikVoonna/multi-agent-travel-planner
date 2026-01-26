import { BaseAgent } from './baseAgent';
import { AgentMessage, TransportOption, TravelInput } from '@/types/agent';
import { getAITransport, AITransportResponse, AITransportOption } from '@/lib/api/travelAI';

interface TransportInput {
  from: string;
  to: string;
  date: Date;
  budget: number;
  preference: 'public' | 'rental' | 'mixed';
  travelInput: TravelInput;
}

export class AITransportAgent extends BaseAgent {
  constructor() {
    super('transport');
  }

  protected handleMessage(message: AgentMessage): void {
    console.log(`[AITransportAgent] Received: ${message.content}`);
  }

  async process(input: TransportInput): Promise<TransportOption[]> {
    this.setStatus('thinking');
    this.sendMessage('coordinator', `🚗 AI finding best transport from ${input.from} to ${input.to}`, 'notification');

    try {
      const aiResponse = await getAITransport(input.travelInput);
      
      const options = this.convertAIResponseToTransport(aiResponse, input);
      
      this.setStatus('completed');
      this.sendMessage('coordinator', `✅ Found ${options.length} transport options. ${aiResponse.recommendation}`, 'response');
      
      if (options[0]) {
        this.sendMessage('budget', `cost: ${options[0].price}`, 'notification');
      }

      return options;
    } catch (error) {
      console.error('[AITransportAgent] Error:', error);
      this.sendMessage('coordinator', '⚠️ AI unavailable, using fallback transport', 'notification');
      
      return this.generateFallbackTransport(input);
    }
  }

  private convertAIResponseToTransport(response: AITransportResponse, input: TransportInput): TransportOption[] {
    return response.options.map((opt: AITransportOption, index: number) => ({
      id: `ai-transport-${index}`,
      type: this.mapTransportType(opt.type),
      from: opt.from || input.from,
      to: opt.to || input.to,
      duration: opt.duration,
      price: opt.price,
      departure: opt.departure,
      arrival: opt.arrival,
    }));
  }

  private mapTransportType(type: string): 'flight' | 'train' | 'bus' | 'car' {
    const typeMap: Record<string, 'flight' | 'train' | 'bus' | 'car'> = {
      'flight': 'flight',
      'airplane': 'flight',
      'plane': 'flight',
      'train': 'train',
      'rail': 'train',
      'bus': 'bus',
      'coach': 'bus',
      'car': 'car',
      'rental': 'car',
      'drive': 'car',
    };
    return typeMap[type.toLowerCase()] || 'bus';
  }

  private generateFallbackTransport(input: TransportInput): TransportOption[] {
    const options: TransportOption[] = [];

    if (input.budget > 3000) {
      options.push({
        id: 'transport-flight',
        type: 'flight',
        from: input.from,
        to: input.to,
        duration: '2h 30m',
        price: 4500 + Math.floor(Math.random() * 2000),
        departure: '06:00 AM',
        arrival: '08:30 AM',
      });
    }

    options.push({
      id: 'transport-train',
      type: 'train',
      from: input.from,
      to: input.to,
      duration: '8h 15m',
      price: 1200 + Math.floor(Math.random() * 500),
      departure: '10:00 PM',
      arrival: '06:15 AM (+1)',
    });

    options.push({
      id: 'transport-bus',
      type: 'bus',
      from: input.from,
      to: input.to,
      duration: '10h 30m',
      price: 600 + Math.floor(Math.random() * 300),
      departure: '09:00 PM',
      arrival: '07:30 AM (+1)',
    });

    if (input.preference === 'rental' || input.preference === 'mixed') {
      options.push({
        id: 'transport-car',
        type: 'car',
        from: input.from,
        to: input.to,
        duration: '7h 00m',
        price: 2000 + Math.floor(Math.random() * 1000),
        departure: 'Flexible',
        arrival: 'Flexible',
      });
    }

    return options
      .filter(o => o.price <= input.budget * 0.3)
      .sort((a, b) => a.price - b.price);
  }
}

export const aiTransportAgent = new AITransportAgent();
