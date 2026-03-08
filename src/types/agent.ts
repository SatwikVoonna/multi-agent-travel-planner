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
  recommendation?: string;
}

export interface HotelOption {
  id: string;
  name: string;
  rating: number;
  pricePerNight: number;
  totalCost?: number;
  location: string;
  type?: string;
  amenities: string[];
  image?: string;
  alternatives?: { name: string; pricePerNight: number; rating: number }[];
}

export interface TransportOption {
  id: string;
  type: 'flight' | 'train' | 'bus' | 'car';
  from: string;
  to: string;
  duration: string;
  price: number;
  roundTripCost?: number;
  carrier?: string;
  departure: string;
  arrival: string;
}

export interface MealRecommendation {
  name: string;
  cuisine: string;
  famousFor: string;
  costPerPerson: number;
  timeSlot: string;
  location: string;
}

export interface TravelBetween {
  distanceKm: number;
  travelTime: string;
  mode: string;
}

export interface Activity {
  id: string;
  name: string;
  type: string;
  duration: string;
  cost: number;
  description: string;
  weatherDependent: boolean;
  timeSlot?: string;
  tips?: string;
  travelFromPrevious?: TravelBetween;
}

export interface DayPlan {
  day: number;
  date: string;
  theme?: string;
  weather: WeatherData;
  activities: Activity[];
  meals?: {
    lunch?: MealRecommendation;
    dinner?: MealRecommendation;
  };
  totalCost: number;
}

export interface BudgetBreakdown {
  accommodation: number;
  transport: number;
  activities: number;
  food: number;
  localTransport?: number;
  miscellaneous: number;
  total: number;
}

export interface BudgetOptimization {
  applied: boolean;
  changes: string[];
  saved: number;
}

export interface AgentDecisions {
  weather_agent?: string;
  budget_agent?: string;
  location_agent?: string;
  itinerary_agent?: string;
  food_agent?: string;
  transport_agent?: string;
}

export interface TravelPlan {
  destination: string;
  duration: number;
  totalBudget: number;
  totalCost: number;
  budgetStatus: 'approved' | 'warning' | 'exceeded';
  budgetBreakdown?: BudgetBreakdown;
  budgetOptimization?: BudgetOptimization;
  weatherStatus: 'suitable' | 'partially-suitable' | 'unsuitable';
  hotel: HotelOption | null;
  transport: TransportOption | null;
  itinerary: DayPlan[];
  agentDecisions?: AgentDecisions;
  tips?: string[];
  generatedAt: Date;
}
