import { BaseAgent } from './baseAgent';
import { AgentMessage, TransportOption, TravelInput } from '@/types/agent';

interface TransportInput {
  from: string;
  to: string;
  date: Date;
  budget: number;
  preference: 'public' | 'rental' | 'mixed';
  travelInput: TravelInput;
}

/**
 * AI Transport Agent - Generates transport options
 * 
 * Uses simulated but realistic pricing based on Indian transport costs
 * Documented as academic assumption
 */
export class AITransportAgent extends BaseAgent {
  constructor() {
    super('transport');
  }

  protected handleMessage(message: AgentMessage): void {
    console.log(`[AITransportAgent] Received: ${message.content}`);
  }

  async process(input: TransportInput): Promise<TransportOption[]> {
    this.setStatus('thinking');
    this.sendMessage('coordinator', `🚆 Finding transport to ${input.to}`, 'notification');

    const options = this.generateTransportOptions(input);
    
    this.setStatus('completed');
    this.sendMessage('coordinator', `✅ Found ${options.length} transport options`, 'response');
    
    if (options[0]) {
      this.sendMessage('budget', `cost: ${options[0].price * 2}`, 'notification');
    }

    return options;
  }

  private generateTransportOptions(input: TransportInput): TransportOption[] {
    const options: TransportOption[] = [];
    
    // Estimate distance (simplified - in production, use actual API)
    const estimatedDistanceKm = 500;
    
    // Flight option (if applicable)
    if (input.preference !== 'public' && estimatedDistanceKm > 300) {
      options.push({
        id: 'transport-flight',
        type: 'flight',
        from: input.from,
        to: input.to,
        duration: `${Math.ceil(estimatedDistanceKm / 800)}h`,
        price: 3000 + Math.floor(estimatedDistanceKm * 2.5),
        departure: '08:00 AM',
        arrival: '10:30 AM'
      });
    }
    
    // Train option
    options.push({
      id: 'transport-train',
      type: 'train',
      from: input.from,
      to: input.to,
      duration: `${Math.ceil(estimatedDistanceKm / 60)}h`,
      price: 500 + Math.floor(estimatedDistanceKm * 0.8),
      departure: '06:00 AM',
      arrival: 'Varies'
    });
    
    // Bus option
    options.push({
      id: 'transport-bus',
      type: 'bus',
      from: input.from,
      to: input.to,
      duration: `${Math.ceil(estimatedDistanceKm / 50)}h`,
      price: 400 + Math.floor(estimatedDistanceKm * 0.5),
      departure: '08:00 PM',
      arrival: 'Next morning'
    });

    return options.sort((a, b) => a.price - b.price);
  }
}

export const aiTransportAgent = new AITransportAgent();
