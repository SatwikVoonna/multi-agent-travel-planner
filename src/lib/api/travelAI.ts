import { supabase } from '@/integrations/supabase/client';
import { TravelInput, WeatherData } from '@/types/agent';

export interface AITravelRequest {
  type: 'itinerary' | 'hotels' | 'transport' | 'activities' | 'budget';
  destination: string;
  duration: number;
  budget: number;
  currency: string;
  travelers: number;
  preferences: {
    accommodation: string;
    activities: string[];
    transportMode: string;
    pace: string;
  };
  weatherData?: WeatherData[];
}

export interface AIItineraryDay {
  day: number;
  theme: string;
  activities: {
    name: string;
    type: string;
    duration: string;
    cost: number;
    description: string;
    location: string;
    weatherDependent: boolean;
    bestTime: string;
    tips: string;
  }[];
  meals: {
    breakfast: { suggestion: string; budget: number };
    lunch: { suggestion: string; budget: number };
    dinner: { suggestion: string; budget: number };
  };
  totalCost: number;
}

export interface AIItineraryResponse {
  days: AIItineraryDay[];
  totalTripCost: number;
  tips: string[];
}

export interface AIHotelOption {
  name: string;
  type: string;
  rating: number;
  pricePerNight: number;
  totalPrice: number;
  location: string;
  distanceToCenter: string;
  amenities: string[];
  highlights: string[];
  bookingPlatform: string;
  valueScore: number;
  category: 'budget' | 'mid-range' | 'luxury';
}

export interface AIHotelsResponse {
  hotels: AIHotelOption[];
  recommendation: string;
  tips: string[];
}

export interface AITransportOption {
  type: string;
  from: string;
  to: string;
  duration: string;
  price: number;
  carrier: string;
  class: string;
  departure: string;
  arrival: string;
  frequency: string;
  bookingPlatform: string;
  pros: string[];
  cons: string[];
}

export interface AITransportResponse {
  options: AITransportOption[];
  localTransport: {
    options: string[];
    dailyCost: number;
    tips: string[];
  };
  recommendation: string;
}

export interface AIActivity {
  name: string;
  type: string;
  cost: number;
  duration: string;
  description: string;
  location: string;
  rating: number;
  weatherDependent: boolean;
  bestTime: string;
  tips: string;
  mustDo: boolean;
}

export interface AIActivitiesResponse {
  activities: AIActivity[];
  freeActivities: string[];
  hiddenGems: string[];
  tips: string[];
}

export interface AIBudgetBreakdown {
  breakdown: {
    accommodation: { allocated: number; percentage: number; tips: string };
    transport: { allocated: number; percentage: number; tips: string };
    activities: { allocated: number; percentage: number; tips: string };
    food: { allocated: number; percentage: number; tips: string };
    miscellaneous: { allocated: number; percentage: number; tips: string };
  };
  totalAllocated: number;
  dailyBudget: number;
  perPersonDaily: number;
  savingTips: string[];
  splurgeWorthy: string[];
  status: 'within_budget' | 'tight' | 'over_budget';
  adjustments: string[];
}

export async function fetchAITravelData<T>(request: AITravelRequest): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai-travel-planner', {
    body: request,
  });

  if (error) {
    console.error('AI Travel API error:', error);
    throw new Error(error.message || 'Failed to fetch AI travel data');
  }

  if (!data.success) {
    throw new Error(data.error || 'AI request failed');
  }

  return data.data as T;
}

export async function getAIItinerary(input: TravelInput, weatherData?: WeatherData[]): Promise<AIItineraryResponse> {
  const duration = input.startDate && input.endDate 
    ? Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 3;

  return fetchAITravelData<AIItineraryResponse>({
    type: 'itinerary',
    destination: input.destination,
    duration,
    budget: input.budget,
    currency: input.currency,
    travelers: input.travelers,
    preferences: input.preferences,
    weatherData,
  });
}

export async function getAIHotels(input: TravelInput): Promise<AIHotelsResponse> {
  const duration = input.startDate && input.endDate 
    ? Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 3;

  return fetchAITravelData<AIHotelsResponse>({
    type: 'hotels',
    destination: input.destination,
    duration,
    budget: input.budget,
    currency: input.currency,
    travelers: input.travelers,
    preferences: input.preferences,
  });
}

export async function getAITransport(input: TravelInput): Promise<AITransportResponse> {
  const duration = input.startDate && input.endDate 
    ? Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 3;

  return fetchAITravelData<AITransportResponse>({
    type: 'transport',
    destination: input.destination,
    duration,
    budget: input.budget,
    currency: input.currency,
    travelers: input.travelers,
    preferences: input.preferences,
  });
}

export async function getAIActivities(input: TravelInput): Promise<AIActivitiesResponse> {
  const duration = input.startDate && input.endDate 
    ? Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 3;

  return fetchAITravelData<AIActivitiesResponse>({
    type: 'activities',
    destination: input.destination,
    duration,
    budget: input.budget,
    currency: input.currency,
    travelers: input.travelers,
    preferences: input.preferences,
  });
}

export async function getAIBudgetAnalysis(input: TravelInput): Promise<AIBudgetBreakdown> {
  const duration = input.startDate && input.endDate 
    ? Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 3;

  return fetchAITravelData<AIBudgetBreakdown>({
    type: 'budget',
    destination: input.destination,
    duration,
    budget: input.budget,
    currency: input.currency,
    travelers: input.travelers,
    preferences: input.preferences,
  });
}
