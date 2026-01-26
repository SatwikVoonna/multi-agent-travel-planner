export type AgentType = 
  | 'user' 
  | 'budget' 
  | 'weather' 
  | 'hotel' 
  | 'transport' 
  | 'itinerary' 
  | 'coordinator';

export type AgentStatus = 'idle' | 'thinking' | 'active' | 'completed' | 'error';

export interface AgentMessage {
  id: string;
  from: AgentType;
  to: AgentType;
  content: string;
  timestamp: Date;
  type: 'request' | 'response' | 'broadcast' | 'notification';
}

export interface Agent {
  id: AgentType;
  name: string;
  description: string;
  status: AgentStatus;
  icon: string;
  color: string;
}

export interface TravelInput {
  destination: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: number;
  currency: string;
  travelers: number;
  preferences: TravelPreferences;
}

export interface TravelPreferences {
  accommodation: 'budget' | 'mid-range' | 'luxury';
  activities: string[];
  transportMode: 'public' | 'rental' | 'mixed';
  pace: 'relaxed' | 'moderate' | 'packed';
}

export interface WeatherData {
  date: string;
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  suitable: boolean;
}

export interface HotelOption {
  id: string;
  name: string;
  rating: number;
  pricePerNight: number;
  location: string;
  amenities: string[];
  image?: string;
}

export interface TransportOption {
  id: string;
  type: 'flight' | 'train' | 'bus' | 'car';
  from: string;
  to: string;
  duration: string;
  price: number;
  departure: string;
  arrival: string;
}

export interface Activity {
  id: string;
  name: string;
  type: string;
  duration: string;
  cost: number;
  description: string;
  weatherDependent: boolean;
}

export interface DayPlan {
  day: number;
  date: string;
  weather: WeatherData;
  activities: Activity[];
  totalCost: number;
}

export interface TravelPlan {
  destination: string;
  duration: number;
  totalBudget: number;
  totalCost: number;
  budgetStatus: 'approved' | 'warning' | 'exceeded';
  weatherStatus: 'suitable' | 'partially-suitable' | 'unsuitable';
  hotel: HotelOption | null;
  transport: TransportOption | null;
  itinerary: DayPlan[];
  generatedAt: Date;
}

export interface BudgetBreakdown {
  accommodation: number;
  transport: number;
  activities: number;
  food: number;
  miscellaneous: number;
  total: number;
}
