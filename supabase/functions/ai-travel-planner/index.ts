import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================================================
// TYPES
// ============================================================================

interface TravelRequest {
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

interface LocationData {
  lat: number;
  lon: number;
  displayName: string;
  city: string;
  state: string;
  country: string;
}

interface WeatherDay {
  date: string;
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  suitable: boolean;
}

// ============================================================================
// NOMINATIM – Location Resolution
// ============================================================================

async function resolveLocation(destination: string): Promise<LocationData | null> {
  try {
    const q = destination.includes('India') ? destination : `${destination}, India`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'LovableTravelPlanner/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    const r = data[0];
    const a = r.address || {};
    return {
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      displayName: r.display_name,
      city: a.city || a.town || a.village || a.county || a.state_district || destination,
      state: a.state || '',
      country: a.country || 'India',
    };
  } catch (e) {
    console.error('Nominatim error:', e);
    return null;
  }
}

// ============================================================================
// OPENWEATHERMAP – Real weather
// ============================================================================

function weatherIcon(c: string): string {
  const m: Record<string, string> = { Clear: '☀️', Clouds: '⛅', Rain: '🌧️', Drizzle: '🌦️', Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️', Fog: '🌫️', Haze: '🌫️' };
  return m[c] || '🌤️';
}

async function fetchWeather(lat: number, lon: number, days: number): Promise<WeatherDay[]> {
  const key = Deno.env.get('OPENWEATHERMAP_API_KEY');
  if (!key) return simulatedWeather(days);
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric&cnt=${days * 8}`);
    if (!res.ok) { console.error('OWM error:', res.status); return simulatedWeather(days); }
    const data = await res.json();
    const out: WeatherDay[] = [];
    const seen = new Set<string>();
    for (const f of data.list) {
      const d = f.dt_txt.split(' ')[0];
      if (seen.has(d)) continue;
      seen.add(d);
      const cond = f.weather[0].main;
      const temp = Math.round(f.main.temp);
      out.push({ date: d, temperature: temp, condition: cond, icon: weatherIcon(cond), humidity: f.main.humidity, windSpeed: Math.round(f.wind.speed * 3.6), suitable: !['Rain', 'Thunderstorm', 'Snow'].includes(cond) && temp > 10 && temp < 42 });
      if (out.length >= days) break;
    }
    return out;
  } catch (e) { console.error('Weather error:', e); return simulatedWeather(days); }
}

function simulatedWeather(days: number): WeatherDay[] {
  const out: WeatherDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const cond = ['Clear', 'Clouds', 'Clear', 'Rain'][i % 4];
    out.push({ date: d.toISOString().split('T')[0], temperature: 28 + Math.floor(Math.random() * 7), condition: cond, icon: weatherIcon(cond), humidity: 55 + Math.floor(Math.random() * 20), windSpeed: 10 + Math.floor(Math.random() * 10), suitable: cond !== 'Rain' });
  }
  return out;
}

// ============================================================================
// LOVABLE AI GATEWAY
// ============================================================================

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) throw new Error('LOVABLE_API_KEY not configured');

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error('Gemini error:', res.status, t);
    if (res.status === 429) throw new Error('RATE_LIMIT_EXCEEDED');
    if (res.status === 402) throw new Error('CREDITS_EXHAUSTED');
    throw new Error(`AI error: ${res.status}`);
  }

  const j = await res.json();
  return j.choices?.[0]?.message?.content || '';
}

// Robust JSON parsing with truncation recovery
function parseJSON(content: string): any {
  // Try markdown code block
  const blockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (blockMatch) {
    try { return JSON.parse(blockMatch[1].trim()); } catch (_) { /* try recovery */ }
    return parseWithRecovery(blockMatch[1].trim());
  }

  // Try raw JSON object
  const objMatch = content.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch (_) { /* try recovery */ }
  }

  // Try raw JSON array
  const arrMatch = content.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch (_) { /* try recovery */ }
    return parseWithRecovery(arrMatch[0]);
  }

  // Last resort
  try { return JSON.parse(content.trim()); } catch (_) {}
  return parseWithRecovery(content.trim());
}

function parseWithRecovery(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    // Attempt to repair truncated JSON array
    const lastBrace = content.lastIndexOf("}");
    if (lastBrace > 0) {
      // Try closing as array
      const repaired = content.substring(0, lastBrace + 1) + "]";
      try {
        const items = JSON.parse(repaired);
        console.warn(`Recovered ${Array.isArray(items) ? items.length : 'object'} from truncated response`);
        return items;
      } catch { /* try object repair */ }

      // Try closing as object
      const repaired2 = content.substring(0, lastBrace + 1) + "}";
      try {
        return JSON.parse(repaired2);
      } catch { /* give up */ }
    }
    throw new Error("Cannot parse AI response as JSON");
  }
}

// ============================================================================
// COMPLETE PLAN GENERATION — SINGLE GEMINI CALL
// ============================================================================

async function generateCompletePlan(
  destination: string,
  location: LocationData,
  duration: number,
  budget: number,
  travelers: number,
  preferences: TravelRequest['preferences'],
  weather: WeatherDay[],
  originCity: string
): Promise<any> {
  console.log(`[Plan] Generating complete plan via Gemini...`);

  const weatherSummary = weather.map(w => `${w.date}: ${w.condition} ${w.temperature}°C (${w.suitable ? 'outdoor OK' : 'prefer indoor'})`).join('\n');

  const system = `You are an expert Indian travel planner AI. You know REAL tourist places, restaurants, hotels across India. You MUST return ONLY valid JSON — no markdown, no explanation, no text before or after the JSON.`;

  const prompt = `Create a COMPLETE ${duration}-day travel plan for "${destination}" (${location.city}, ${location.state}).

TRAVELER INFO:
- Budget: ₹${budget} total for ${travelers} person(s)
- Accommodation preference: ${preferences.accommodation}
- Transport preference: ${preferences.transportMode}
- Pace: ${preferences.pace}
- Interests: ${preferences.activities.join(', ')}
- Origin city: ${originCity}

WEATHER FORECAST:
${weatherSummary}

INSTRUCTIONS:
1. Pick 10-15 REAL tourist attractions in ${destination} (use proper names like "Baga Beach", "Fort Aguada", NOT generic "Beach Visit")
2. Group attractions by geographic proximity — nearby places on the same day
3. Each day: 2-4 attractions + 1 lunch restaurant + 1 dinner restaurant (all REAL names)
4. Add specific time slots (9:00 AM, 11:30 AM, etc.)
5. On rainy days: prioritize museums, markets, temples, indoor cultural sites
6. On clear days: prioritize beaches, nature, viewpoints, outdoor activities
7. Include travel time between consecutive attractions
8. Choose transport: flight if >700km from origin, train if 200-700km, bus/car if <200km
9. Choose 1 hotel matching the budget tier from 3 options
10. If total cost exceeds budget, optimize: cheaper transport, cheaper hotel, free attractions, budget restaurants
11. Calculate ALL costs accurately

TRANSPORT RULES:
- "price" = ONE-WAY cost only
- "round_trip_cost" MUST equal exactly price × 2 (no surcharges, no rounding up)
- If total trip cost (transport + hotel + activities + food) exceeds budget by more than 10%, you MUST downgrade transport:
  * Switch flight → train (suggest a specific popular train like Rajdhani Express, Shatabdi Express, Duronto Express, Garib Rath, Jan Shatabdi, or the best-known train on that route)
  * Switch train → bus (suggest Volvo AC sleeper or state transport)
  * Show the savings from the downgrade in budget_optimization
- When suggesting train: use a REAL train name that operates on the route (e.g. "Goa Express 12779", "Kerala Express 12625", "Rajdhani Express")

Return this EXACT JSON structure:
{
  "destination": "${destination}",
  "duration": ${duration},
  "transport": {
    "type": "flight|train|bus",
    "from": "${originCity}",
    "to": "${location.city}",
    "duration": "2h 00m",
    "price": 5000,
    "carrier": "Real Airline/Train name and number",
    "round_trip_cost": 10000
  },
  "accommodation": {
    "name": "Real Hotel Name",
    "type": "hotel|resort|guesthouse",
    "rating": 4.2,
    "price_per_night": 2500,
    "total_cost": ${(duration - 1)} * price,
    "address": "Area, ${destination}",
    "amenities": ["WiFi", "AC", "Pool"],
    "alternatives": [
      {"name": "Budget Option", "price_per_night": 1200, "rating": 3.5},
      {"name": "Premium Option", "price_per_night": 5000, "rating": 4.8}
    ]
  },
  "daily_plan": [
    {
      "day": 1,
      "date": "${weather[0]?.date || ''}",
      "theme": "Area Name - Day Theme",
      "weather": {
        "condition": "Clear",
        "temperature": 30,
        "suitable": true,
        "recommendation": "Great for outdoor activities"
      },
      "activities": [
        {
          "name": "REAL Place Name",
          "description": "What to see/do here in 1-2 sentences",
          "category": "beach|historical|temple|nature|market|museum|adventure|cultural|viewpoint",
          "time_slot": "9:00 AM",
          "duration": "2 hours",
          "estimated_cost": 200,
          "tips": "Practical visitor tip",
          "travel_from_previous": {
            "distance_km": 5,
            "travel_time": "15 min",
            "mode": "auto-rickshaw"
          }
        }
      ],
      "meals": {
        "lunch": {
          "name": "Real Restaurant Name",
          "cuisine": "Goan / North Indian etc.",
          "famous_for": "Signature dish",
          "cost_per_person": 400,
          "time_slot": "1:00 PM",
          "location": "Near which attraction"
        },
        "dinner": {
          "name": "Real Restaurant Name",
          "cuisine": "Type",
          "famous_for": "Dish",
          "cost_per_person": 600,
          "time_slot": "8:00 PM",
          "location": "Area"
        }
      },
      "daily_cost": 2500
    }
  ],
  "budget_breakdown": {
    "accommodation": 7500,
    "transport": 10000,
    "activities": 3000,
    "food": 6000,
    "local_transport": 2000,
    "miscellaneous": 1500,
    "total": 30000
  },
  "budget_status": "approved|warning|exceeded",
  "budget_optimization": {
    "applied": false,
    "changes": [],
    "saved": 0
  },
  "weather_status": "suitable|partially-suitable",
  "agent_decisions": {
    "weather_agent": "Explanation of weather-based decisions",
    "budget_agent": "Explanation of budget decisions and any optimizations",
    "location_agent": "How places were selected and clustered",
    "itinerary_agent": "How the schedule was organized",
    "food_agent": "How restaurants were chosen",
    "transport_agent": "Why this transport mode was selected"
  },
  "tips": ["3-5 practical tips"]
}

CRITICAL RULES:
- EVERY place name must be a REAL, specific place (never "Beach Visit" or "City Tour")
- EVERY restaurant must be a real or realistic restaurant name for ${destination}
- ALL costs in INR
- daily_cost = sum of activity costs + lunch + dinner for ${travelers} person(s)
- budget_breakdown.total MUST equal the sum of all sub-categories
- If total > ₹${budget}: set budget_status to "exceeded" and fill budget_optimization with changes you'd make
- Return ONLY the JSON object, nothing else`;

  const raw = await callGemini(system, prompt);
  console.log(`[Plan] Raw response length: ${raw.length} chars`);

  const plan = parseJSON(raw);

  // Validate essential fields
  if (!plan.daily_plan || !Array.isArray(plan.daily_plan) || plan.daily_plan.length === 0) {
    throw new Error('Generated plan has no daily_plan');
  }

  // Ensure every day has activities
  for (const day of plan.daily_plan) {
    if (!day.activities || day.activities.length === 0) {
      throw new Error(`Day ${day.day} has no activities`);
    }
  }

  console.log(`[Plan] ✓ Complete plan: ${plan.daily_plan.length} days, ${plan.daily_plan.reduce((s: number, d: any) => s + (d.activities?.length || 0), 0)} activities`);
  return plan;
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

async function generateFullPlan(req: TravelRequest): Promise<any> {
  console.log(`\n========== GENERATING PLAN ==========`);
  console.log(`Destination: ${req.destination} | ${req.duration} days | ₹${req.budget}`);

  // 1. Resolve location
  console.log('\n[1/3] Resolving location...');
  const loc = await resolveLocation(req.destination);
  if (!loc) throw new Error(`Cannot find location: ${req.destination}`);
  console.log(`✓ ${loc.city}, ${loc.state} (${loc.lat}, ${loc.lon})`);

  // 2. Fetch weather
  console.log('\n[2/3] Fetching weather...');
  const weather = await fetchWeather(loc.lat, loc.lon, req.duration);
  console.log(`✓ Weather for ${weather.length} days`);

  // 3. Generate complete plan in one Gemini call
  console.log('\n[3/3] Generating complete plan via Gemini...');
  const originCity = req.originCity || 'Delhi';
  const plan = await generateCompletePlan(
    req.destination, loc, req.duration, req.budget, req.travelers,
    req.preferences, weather, originCity
  );

  // Attach metadata
  plan.resolvedLocation = { lat: loc.lat, lon: loc.lon };
  plan.sourceData = {
    placesDiscovered: plan.daily_plan.reduce((s: number, d: any) => s + (d.activities?.length || 0), 0),
    accommodationsFound: plan.accommodation?.alternatives?.length ? plan.accommodation.alternatives.length + 1 : 1,
    weatherSource: Deno.env.get('OPENWEATHERMAP_API_KEY') ? 'OpenWeatherMap API' : 'Simulated',
    aiModel: 'Gemini 2.5 Flash via Lovable AI',
    locationSource: 'OpenStreetMap Nominatim',
  };

  console.log('\n✅ Plan complete!');
  return plan;
}

// ============================================================================
// HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const request: TravelRequest = await req.json();
    console.log(`\n========== NEW REQUEST: ${request.type} ==========`);

    let result;
    if (request.type === 'weather') {
      const loc = await resolveLocation(request.destination);
      if (!loc) throw new Error('Cannot resolve location');
      result = await fetchWeather(loc.lat, loc.lon, request.duration);
    } else {
      result = await generateFullPlan(request);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const status = msg === 'RATE_LIMIT_EXCEEDED' ? 429 : msg === 'CREDITS_EXHAUSTED' ? 402 : 500;
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
