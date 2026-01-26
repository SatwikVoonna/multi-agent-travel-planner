import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TravelRequest {
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
  weatherData?: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: TravelRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = getSystemPrompt(request.type);
    const userPrompt = getUserPrompt(request);

    console.log(`Processing ${request.type} request for ${request.destination}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'API credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse JSON from AI response
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      content.match(/\{[\s\S]*\}/);
    
    let parsedData;
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      parsedData = JSON.parse(jsonStr);
    } else {
      parsedData = { raw: content };
    }

    console.log(`Successfully processed ${request.type} request`);

    return new Response(
      JSON.stringify({ success: true, data: parsedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-travel-planner:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getSystemPrompt(type: string): string {
  const basePrompt = `You are an expert travel planning AI assistant. You provide detailed, realistic, and budget-conscious travel recommendations. Always respond with valid JSON.`;

  const typePrompts: Record<string, string> = {
    itinerary: `${basePrompt}
You specialize in creating day-by-day travel itineraries that:
- Balance popular attractions with hidden gems
- Consider weather and seasonal factors
- Optimize for time and money efficiency
- Include realistic timing and travel between locations
- Suggest both free and paid activities
- Consider meal times and rest periods`,

    hotels: `${basePrompt}
You specialize in accommodation recommendations similar to Booking.com and Airbnb:
- Provide a mix of budget, mid-range, and luxury options
- Include hostels, guesthouses, hotels, and vacation rentals
- Estimate realistic prices in the local market
- Consider location, amenities, and value for money
- Include ratings and key features`,

    transport: `${basePrompt}
You specialize in transportation options:
- Compare flights, trains, buses, and car rentals
- Provide realistic pricing and duration estimates
- Consider convenience vs cost trade-offs
- Include local transportation within the destination
- Suggest booking platforms and tips`,

    activities: `${basePrompt}
You specialize in recommending activities and experiences:
- Mix of cultural, adventure, relaxation, and unique local experiences
- Include both ticketed attractions and free activities
- Provide realistic costs and duration
- Consider weather dependencies
- Suggest best times to visit`,

    budget: `${basePrompt}
You specialize in travel budget optimization:
- Break down costs by category (accommodation, transport, food, activities)
- Suggest money-saving tips specific to the destination
- Identify areas where splurging is worth it vs where to save
- Provide daily budget estimates
- Suggest alternative options at different price points`,
  };

  return typePrompts[type] || basePrompt;
}

function getUserPrompt(request: TravelRequest): string {
  const { destination, duration, budget, currency, travelers, preferences, weatherData, type } = request;

  const baseContext = `
Destination: ${destination}
Duration: ${duration} days
Total Budget: ${currency} ${budget.toLocaleString()}
Number of Travelers: ${travelers}
Accommodation Preference: ${preferences.accommodation}
Activity Interests: ${preferences.activities.join(', ') || 'General sightseeing'}
Transport Preference: ${preferences.transportMode}
Travel Pace: ${preferences.pace}
${weatherData ? `Weather Forecast: ${JSON.stringify(weatherData)}` : ''}
`;

  const typePrompts: Record<string, string> = {
    itinerary: `${baseContext}
Create a detailed ${duration}-day itinerary for ${destination}. Return JSON format:
{
  "days": [
    {
      "day": 1,
      "theme": "Day theme",
      "activities": [
        {
          "name": "Activity name",
          "type": "sightseeing|food|adventure|culture|relaxation|shopping",
          "duration": "2h",
          "cost": 500,
          "description": "Brief description",
          "location": "Area name",
          "weatherDependent": true/false,
          "bestTime": "Morning/Afternoon/Evening",
          "tips": "Insider tip"
        }
      ],
      "meals": {
        "breakfast": { "suggestion": "Place", "budget": 200 },
        "lunch": { "suggestion": "Place", "budget": 400 },
        "dinner": { "suggestion": "Place", "budget": 600 }
      },
      "totalCost": 2500
    }
  ],
  "totalTripCost": 10000,
  "tips": ["General tips for the trip"]
}`,

    hotels: `${baseContext}
Recommend accommodation options for ${destination}. Return JSON format:
{
  "hotels": [
    {
      "name": "Hotel/Property name",
      "type": "hotel|hostel|guesthouse|resort|apartment|villa",
      "rating": 4.5,
      "pricePerNight": 2500,
      "totalPrice": 10000,
      "location": "Area name",
      "distanceToCenter": "2 km",
      "amenities": ["WiFi", "Pool", "Breakfast"],
      "highlights": ["Best feature"],
      "bookingPlatform": "Booking.com/Airbnb/Direct",
      "valueScore": 8.5,
      "category": "budget|mid-range|luxury"
    }
  ],
  "recommendation": "Best value pick and why",
  "tips": ["Booking tips"]
}`,

    transport: `${baseContext}
Recommend transport options to reach ${destination}. Return JSON format:
{
  "options": [
    {
      "type": "flight|train|bus|car",
      "from": "Origin assumption",
      "to": "${destination}",
      "duration": "3h 30m",
      "price": 4500,
      "carrier": "Airline/Company name",
      "class": "Economy/Business",
      "departure": "06:00 AM",
      "arrival": "09:30 AM",
      "frequency": "Daily",
      "bookingPlatform": "Where to book",
      "pros": ["Fast", "Comfortable"],
      "cons": ["Expensive"]
    }
  ],
  "localTransport": {
    "options": ["Metro", "Taxi", "Rental"],
    "dailyCost": 500,
    "tips": ["How to get around"]
  },
  "recommendation": "Best option and why"
}`,

    activities: `${baseContext}
Recommend activities and experiences in ${destination}. Return JSON format:
{
  "activities": [
    {
      "name": "Activity name",
      "type": "sightseeing|adventure|culture|food|relaxation|nightlife|shopping",
      "cost": 500,
      "duration": "2-3 hours",
      "description": "What to expect",
      "location": "Area",
      "rating": 4.8,
      "weatherDependent": false,
      "bestTime": "Morning",
      "tips": "Insider advice",
      "mustDo": true/false
    }
  ],
  "freeActivities": ["Free things to do"],
  "hiddenGems": ["Lesser known attractions"],
  "tips": ["General activity tips"]
}`,

    budget: `${baseContext}
Analyze and optimize the travel budget. Return JSON format:
{
  "breakdown": {
    "accommodation": { "allocated": 8000, "percentage": 35, "tips": "How to save" },
    "transport": { "allocated": 5000, "percentage": 20, "tips": "How to save" },
    "activities": { "allocated": 4000, "percentage": 15, "tips": "How to save" },
    "food": { "allocated": 5000, "percentage": 20, "tips": "How to save" },
    "miscellaneous": { "allocated": 3000, "percentage": 10, "tips": "Emergency fund" }
  },
  "totalAllocated": 25000,
  "dailyBudget": 6250,
  "perPersonDaily": 3125,
  "savingTips": ["Money saving strategies"],
  "splurgeWorthy": ["Worth spending on"],
  "status": "within_budget|tight|over_budget",
  "adjustments": ["Suggested adjustments if over budget"]
}`,
  };

  return typePrompts[type] || `Provide travel information for ${destination}. ${baseContext}`;
}
