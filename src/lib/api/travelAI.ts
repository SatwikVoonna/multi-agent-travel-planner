import { supabase } from '@/integrations/supabase/client';
import { TravelInput, WeatherData } from '@/types/agent';

// ============================================================================
// TYPE DEFINITIONS FOR GROUNDED TRAVEL PLANNING
// ============================================================================

export interface GroundedTravelRequest {
  type: 'full-plan' | 'weather';
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
  originCity?: string;
}

export interface GroundedItineraryActivity {
  name: string;
  time: string;
  duration: string;
  category: string;
  estimatedCost: number;
  weatherSuitable: boolean;
  tips: string;
}

export interface GroundedDayPlan {
  day: number;
  date: string;
  weather: {
    condition: string;
    temperature: number;
    suitable: boolean;
  };
  activities: GroundedItineraryActivity[];
  meals: {
    breakfast: { suggestion: string; budget: number };
    lunch: { suggestion: string; budget: number };
    dinner: { suggestion: string; budget: number };
  };
  dailyCost: number;
}

export interface GroundedAccommodation {
  name: string;
  type: string;
  pricePerNight: number;
  totalCost: number;
  address: string;
}

export interface GroundedTransport {
  type: string;
  from: string;
  to: string;
  price: number;
  duration: string;
  roundTripCost: number;
}

export interface GroundedBudgetBreakdown {
  accommodation: number;
  transport: number;
  activities: number;
  food: number;
  miscellaneous: number;
  total: number;
}

export interface SourceDataInfo {
  placesDiscovered: number;
  accommodationsFound: number;
  weatherSource: string;
  placesSource: string;
  locationSource: string;
  priceNote: string;
}

export interface GroundedTravelPlan {
  destination: string;
  resolvedLocation: { lat: number; lon: number };
  duration: number;
  itinerary: GroundedDayPlan[];
  accommodation: GroundedAccommodation;
  transport: GroundedTransport;
  budgetBreakdown: GroundedBudgetBreakdown;
  budgetStatus: 'approved' | 'warning' | 'exceeded';
  weatherStatus: 'suitable' | 'partially-suitable' | 'unsuitable';
  tips: string[];
  notes: string;
  sourceData: SourceDataInfo;
}

// Legacy type exports for backward compatibility
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

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch a complete grounded travel plan
 * This is the main entry point for the new location-aware planning
 */
export async function fetchGroundedTravelPlan(input: TravelInput): Promise<GroundedTravelPlan> {
  const duration = input.startDate && input.endDate 
    ? Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 3;

  const request: GroundedTravelRequest = {
    type: 'full-plan',
    destination: input.destination,
    duration,
    budget: input.budget,
    currency: input.currency,
    travelers: input.travelers,
    preferences: input.preferences,
    originCity: 'Delhi' // Can be made configurable
  };

  const { data, error } = await supabase.functions.invoke('ai-travel-planner', {
    body: request,
  });

  if (error) {
    console.error('Grounded Travel API error:', error);
    throw new Error(error.message || 'Failed to fetch travel plan');
  }

  if (!data.success) {
    throw new Error(data.error || 'Travel planning failed');
  }

  return data.data as GroundedTravelPlan;
}

/**
 * Convert grounded plan to legacy format for UI compatibility
 */
export function convertToLegacyFormat(plan: GroundedTravelPlan): {
  itinerary: AIItineraryResponse;
  hotels: AIHotelsResponse;
  transport: AITransportResponse;
  budget: AIBudgetBreakdown;
} {
  // Convert itinerary
  const itinerary: AIItineraryResponse = {
    days: plan.itinerary.map(day => ({
      day: day.day,
      theme: `Day ${day.day} - ${day.weather.condition}`,
      activities: day.activities.map(act => ({
        name: act.name,
        type: act.category,
        duration: act.duration,
        cost: act.estimatedCost,
        description: act.tips,
        location: plan.destination,
        weatherDependent: !act.weatherSuitable,
        bestTime: act.time,
        tips: act.tips
      })),
      meals: day.meals,
      totalCost: day.dailyCost
    })),
    totalTripCost: plan.budgetBreakdown.total,
    tips: plan.tips
  };

  // Convert accommodation to hotel format
  const hotels: AIHotelsResponse = {
    hotels: [{
      name: plan.accommodation.name,
      type: plan.accommodation.type,
      rating: 4.0,
      pricePerNight: plan.accommodation.pricePerNight,
      totalPrice: plan.accommodation.totalCost,
      location: plan.accommodation.address,
      distanceToCenter: 'Central location',
      amenities: ['WiFi', 'AC', 'TV'],
      highlights: ['Good value', 'Central location'],
      bookingPlatform: 'Direct booking',
      valueScore: 8.0,
      category: 'mid-range'
    }],
    recommendation: `${plan.accommodation.name} - ₹${plan.accommodation.pricePerNight}/night`,
    tips: ['Book in advance for better rates']
  };

  // Convert transport
  const transport: AITransportResponse = {
    options: [{
      type: plan.transport.type,
      from: plan.transport.from,
      to: plan.transport.to,
      duration: plan.transport.duration,
      price: plan.transport.price,
      carrier: 'Various operators',
      class: 'Standard',
      departure: 'Flexible',
      arrival: 'Varies',
      frequency: 'Daily',
      bookingPlatform: 'MakeMyTrip/RedBus/IRCTC',
      pros: ['Convenient', 'Multiple options'],
      cons: ['Book early for best prices']
    }],
    localTransport: {
      options: ['Auto', 'Taxi', 'Local bus'],
      dailyCost: 500,
      tips: ['Negotiate rates before boarding autos']
    },
    recommendation: `${plan.transport.type} - ₹${plan.transport.price} one way`
  };

  // Convert budget breakdown
  const budget: AIBudgetBreakdown = {
    breakdown: {
      accommodation: { 
        allocated: plan.budgetBreakdown.accommodation, 
        percentage: Math.round((plan.budgetBreakdown.accommodation / plan.budgetBreakdown.total) * 100),
        tips: 'Book directly for better rates'
      },
      transport: { 
        allocated: plan.budgetBreakdown.transport, 
        percentage: Math.round((plan.budgetBreakdown.transport / plan.budgetBreakdown.total) * 100),
        tips: 'Book trains 2-3 weeks in advance'
      },
      activities: { 
        allocated: plan.budgetBreakdown.activities, 
        percentage: Math.round((plan.budgetBreakdown.activities / plan.budgetBreakdown.total) * 100),
        tips: 'Many attractions have free entry'
      },
      food: { 
        allocated: plan.budgetBreakdown.food, 
        percentage: Math.round((plan.budgetBreakdown.food / plan.budgetBreakdown.total) * 100),
        tips: 'Try local street food for authentic experience'
      },
      miscellaneous: { 
        allocated: plan.budgetBreakdown.miscellaneous, 
        percentage: Math.round((plan.budgetBreakdown.miscellaneous / plan.budgetBreakdown.total) * 100),
        tips: 'Keep buffer for unexpected expenses'
      }
    },
    totalAllocated: plan.budgetBreakdown.total,
    dailyBudget: Math.round(plan.budgetBreakdown.total / plan.duration),
    perPersonDaily: Math.round(plan.budgetBreakdown.total / plan.duration),
    savingTips: plan.tips,
    splurgeWorthy: ['Local experiences', 'Good food'],
    status: plan.budgetStatus === 'approved' ? 'within_budget' : plan.budgetStatus === 'warning' ? 'tight' : 'over_budget',
    adjustments: plan.budgetStatus === 'exceeded' ? ['Consider budget accommodation', 'Use public transport'] : []
  };

  return { itinerary, hotels, transport, budget };
}

// ============================================================================
// LEGACY API FUNCTIONS (for backward compatibility)
// ============================================================================

export async function getAIItinerary(input: TravelInput, weatherData?: WeatherData[]): Promise<AIItineraryResponse> {
  try {
    const plan = await fetchGroundedTravelPlan(input);
    const { itinerary } = convertToLegacyFormat(plan);
    return itinerary;
  } catch (error) {
    console.error('AI Itinerary error:', error);
    throw error;
  }
}

export async function getAIHotels(input: TravelInput): Promise<AIHotelsResponse> {
  try {
    const plan = await fetchGroundedTravelPlan(input);
    const { hotels } = convertToLegacyFormat(plan);
    return hotels;
  } catch (error) {
    console.error('AI Hotels error:', error);
    throw error;
  }
}

export async function getAITransport(input: TravelInput): Promise<AITransportResponse> {
  try {
    const plan = await fetchGroundedTravelPlan(input);
    const { transport } = convertToLegacyFormat(plan);
    return transport;
  } catch (error) {
    console.error('AI Transport error:', error);
    throw error;
  }
}

export async function getAIBudgetAnalysis(input: TravelInput): Promise<AIBudgetBreakdown> {
  try {
    const plan = await fetchGroundedTravelPlan(input);
    const { budget } = convertToLegacyFormat(plan);
    return budget;
  } catch (error) {
    console.error('AI Budget error:', error);
    throw error;
  }
}
