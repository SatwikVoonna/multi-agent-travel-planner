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
// NOMINATIM – Location Resolution (FREE, no key)
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
// OPENWEATHERMAP – Real weather (FREE tier)
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
    const cond = ['Clear', 'Clouds', 'Clear'][i % 3];
    out.push({ date: d.toISOString().split('T')[0], temperature: 28 + Math.floor(Math.random() * 7), condition: cond, icon: weatherIcon(cond), humidity: 55, windSpeed: 12, suitable: true });
  }
  return out;
}

// ============================================================================
// GEMINI AI GATEWAY – Used for reasoning over real data
// ============================================================================

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) throw new Error('LOVABLE_API_KEY not configured');

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
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

function parseJSON(content: string): any {
  // Try extracting from markdown code block first
  const blockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (blockMatch) {
    return JSON.parse(blockMatch[1].trim());
  }
  // Try raw JSON object
  const objMatch = content.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch (_) { /* fall through */ }
  }
  // Try raw JSON array
  const arrMatch = content.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch (_) { /* fall through */ }
  }
  // Last resort: try parsing the whole content
  return JSON.parse(content.trim());
}

// ============================================================================
// STEP 1: Discover tourist places via Gemini
// ============================================================================

async function discoverPlaces(destination: string, city: string, state: string, activities: string[]): Promise<any[]> {
  console.log(`[Places] Discovering attractions in ${destination}...`);

  const system = `You are a knowledgeable Indian travel expert. You know REAL tourist places across all of India — from popular destinations to offbeat villages. Return ONLY valid JSON, no markdown, no explanation.`;

  const prompt = `List the top 15 real tourist attractions in and around "${destination}" (${city}, ${state}, India).

Include a mix of: ${activities.join(', ')}, sightseeing, cultural sites, nature spots, local markets, food streets.

Return a JSON array with this EXACT format:
[
  {
    "name": "Exact real place name",
    "category": "beach|historical|temple|nature|market|food|museum|adventure|cultural|viewpoint",
    "description": "One sentence about this place",
    "duration_hours": 2,
    "estimated_cost_inr": 200,
    "outdoor": true,
    "best_time": "Morning"
  }
]

RULES:
- Use ONLY real, existing places that tourists actually visit
- Include the specific proper name (e.g. "Baga Beach" not "Beach Visit")
- estimated_cost_inr = entry fee + typical spending (0 if free)
- Return at least 12 places
- Mix categories for variety`;

  try {
    const raw = await callGemini(system, prompt);
    const places = parseJSON(raw);
    if (!Array.isArray(places) || places.length === 0) throw new Error('Empty places array');
    console.log(`[Places] ✓ Found ${places.length} real attractions`);
    return places;
  } catch (e) {
    console.error('[Places] Error:', e);
    throw new Error(`Failed to discover places for ${destination}`);
  }
}

// ============================================================================
// STEP 2: Discover accommodation via Gemini
// ============================================================================

async function discoverAccommodation(destination: string, preference: string, budget: number, duration: number): Promise<any[]> {
  console.log(`[Hotels] Finding ${preference} accommodation in ${destination}...`);

  const nightlyBudget = Math.round((budget * 0.3) / duration);

  const system = `You are an Indian hotel expert. You know real hotels, guesthouses, and resorts across India. Return ONLY valid JSON.`;

  const prompt = `List 3 real accommodation options in "${destination}", India for a ${preference} traveler.
Nightly budget target: approximately ₹${nightlyBudget}.

Return a JSON array:
[
  {
    "name": "Real hotel/guesthouse name",
    "type": "hotel|guesthouse|resort|hostel",
    "rating": 4.2,
    "price_per_night": ${nightlyBudget},
    "address": "Area or locality name",
    "amenities": ["WiFi", "AC", "Restaurant"],
    "why_chosen": "Brief reason"
  }
]

RULES:
- Use realistic hotel names that could exist in ${destination}
- Prices must be realistic for the category
- Include one budget, one mid-range, one premium option
- Prices in INR`;

  try {
    const raw = await callGemini(system, prompt);
    const hotels = parseJSON(raw);
    if (!Array.isArray(hotels) || hotels.length === 0) throw new Error('Empty hotels array');
    console.log(`[Hotels] ✓ Found ${hotels.length} options`);
    return hotels;
  } catch (e) {
    console.error('[Hotels] Error:', e);
    // Fallback
    return [{
      name: `${preference === 'luxury' ? 'Resort' : 'Hotel'} in ${destination}`,
      type: 'hotel', rating: 3.5, price_per_night: nightlyBudget,
      address: destination, amenities: ['WiFi', 'AC'], why_chosen: 'Fallback option'
    }];
  }
}

// ============================================================================
// STEP 3: Generate transport options
// ============================================================================

function generateTransport(from: string, to: string, preference: string): any {
  // Use logic-based distance heuristic
  const options = [];

  // Flight
  if (preference !== 'public') {
    options.push({
      type: 'flight', from, to,
      duration: '2h 00m',
      price: 4500 + Math.floor(Math.random() * 2000),
      carrier: 'IndiGo / SpiceJet / Air India',
      booking: 'MakeMyTrip, Goibibo'
    });
  }

  // Train
  options.push({
    type: 'train', from, to,
    duration: '10h 00m',
    price: 800 + Math.floor(Math.random() * 600),
    carrier: 'Indian Railways (AC 3-Tier)',
    booking: 'IRCTC'
  });

  // Bus
  options.push({
    type: 'bus', from, to,
    duration: '12h 00m',
    price: 600 + Math.floor(Math.random() * 400),
    carrier: 'KSRTC / RedBus Partners',
    booking: 'RedBus, AbhiBus'
  });

  return options;
}

// ============================================================================
// STEP 4: Build final itinerary with Gemini reasoning
// ============================================================================

async function buildItinerary(
  destination: string,
  location: LocationData,
  duration: number,
  budget: number,
  travelers: number,
  preferences: TravelRequest['preferences'],
  places: any[],
  hotels: any[],
  transportOptions: any[],
  weather: WeatherDay[],
  originCity: string
): Promise<any> {
  console.log(`[Itinerary] Building ${duration}-day plan with Gemini reasoning...`);

  // Select best hotel based on preference
  const prefMap: Record<string, number> = { budget: 0, 'mid-range': 1, luxury: 2 };
  const hotelIdx = Math.min(prefMap[preferences.accommodation] || 1, hotels.length - 1);
  const selectedHotel = hotels[hotelIdx] || hotels[0];

  // Select best transport
  const selectedTransport = transportOptions[0]; // Best option first

  const system = `You are an expert travel itinerary planner. You create optimized day-by-day plans using ONLY the provided places. Return ONLY valid JSON, no other text.`;

  const prompt = `Create a ${duration}-day travel itinerary for ${destination}.

=== AVAILABLE PLACES (USE ONLY THESE) ===
${JSON.stringify(places, null, 2)}

=== WEATHER FORECAST ===
${JSON.stringify(weather, null, 2)}

=== SELECTED HOTEL ===
${JSON.stringify(selectedHotel, null, 2)}

=== TRANSPORT ===
${JSON.stringify(selectedTransport, null, 2)}

=== CONSTRAINTS ===
- Total budget: ₹${budget} for ${travelers} traveler(s)
- Pace: ${preferences.pace}
- Activities preference: ${preferences.activities.join(', ')}

Return this EXACT JSON structure:
{
  "destination": "${destination}",
  "duration": ${duration},
  "daily_plan": [
    {
      "day": 1,
      "date": "${weather[0]?.date || new Date().toISOString().split('T')[0]}",
      "theme": "Short theme for the day",
      "weather": {
        "condition": "${weather[0]?.condition || 'Clear'}",
        "temperature": ${weather[0]?.temperature || 28},
        "suitable": ${weather[0]?.suitable ?? true}
      },
      "activities": [
        {
          "name": "EXACT place name from the list above",
          "description": "What to do here in 1-2 sentences",
          "category": "category",
          "time_of_day": "Morning",
          "duration": "2-3 hours",
          "estimated_cost": 200,
          "weather_suitable": true,
          "tips": "One practical tip"
        }
      ],
      "meals": {
        "breakfast": { "suggestion": "Local spot or cuisine", "budget": 200 },
        "lunch": { "suggestion": "Restaurant or street food area", "budget": 300 },
        "dinner": { "suggestion": "Restaurant name or area", "budget": 400 }
      },
      "daily_cost": 1500
    }
  ],
  "accommodation": {
    "name": "${selectedHotel.name}",
    "type": "${selectedHotel.type}",
    "rating": ${selectedHotel.rating},
    "price_per_night": ${selectedHotel.price_per_night},
    "total_cost": ${selectedHotel.price_per_night * (duration - 1)},
    "address": "${selectedHotel.address}",
    "amenities": ${JSON.stringify(selectedHotel.amenities || ['WiFi', 'AC'])}
  },
  "transport": {
    "type": "${selectedTransport.type}",
    "from": "${originCity}",
    "to": "${destination}",
    "price": ${selectedTransport.price},
    "duration": "${selectedTransport.duration}",
    "round_trip_cost": ${selectedTransport.price * 2}
  },
  "budget_breakdown": {
    "accommodation": ${selectedHotel.price_per_night * (duration - 1)},
    "transport": ${selectedTransport.price * 2},
    "activities": 0,
    "food": 0,
    "miscellaneous": 0,
    "total": 0
  },
  "budget_status": "approved",
  "weather_status": "suitable",
  "tips": ["3-5 practical travel tips"],
  "notes": "Academic note: prices are estimates"
}

RULES:
1. Each day MUST have 2-4 activities using EXACT names from the places list
2. On rainy days, prefer indoor places (museums, temples, markets, food streets)
3. On clear days, prefer outdoor places (beaches, viewpoints, nature)
4. Calculate daily_cost = sum of activity costs + meal budgets
5. budget_breakdown.activities = sum of all activity costs across all days
6. budget_breakdown.food = sum of all meal budgets across all days
7. budget_breakdown.miscellaneous = 10% of subtotal
8. budget_breakdown.total = sum of all categories
9. budget_status: "approved" if total <= ${budget}, "warning" if total <= ${budget * 1.15}, "exceeded" otherwise
10. weather_status: "suitable" if most days are suitable, "partially-suitable" if mixed
11. NEVER use generic names like "Beach Visit" — always use the specific place name`;

  try {
    const raw = await callGemini(system, prompt);
    const plan = parseJSON(raw);
    console.log(`[Itinerary] ✓ Plan generated with ${plan.daily_plan?.length || 0} days`);
    return plan;
  } catch (e) {
    console.error('[Itinerary] Gemini error:', e);
    throw new Error('Failed to generate itinerary');
  }
}

// ============================================================================
// MAIN: Full plan generation pipeline
// ============================================================================

async function generateFullPlan(req: TravelRequest): Promise<any> {
  console.log(`\n========== GENERATING PLAN ==========`);
  console.log(`Destination: ${req.destination}`);
  console.log(`Duration: ${req.duration} days | Budget: ₹${req.budget}`);

  // 1. Resolve location
  console.log('\n[1/5] Resolving location...');
  const loc = await resolveLocation(req.destination);
  if (!loc) throw new Error(`Cannot find location: ${req.destination}`);
  console.log(`✓ ${loc.city}, ${loc.state} (${loc.lat}, ${loc.lon})`);

  // 2. Fetch weather
  console.log('\n[2/5] Fetching weather...');
  const weather = await fetchWeather(loc.lat, loc.lon, req.duration);
  console.log(`✓ Weather for ${weather.length} days`);

  // 3. Discover places via Gemini
  console.log('\n[3/5] Discovering places via Gemini...');
  const places = await discoverPlaces(req.destination, loc.city, loc.state, req.preferences.activities);

  // 4. Find accommodation via Gemini
  console.log('\n[4/5] Finding accommodation...');
  const hotels = await discoverAccommodation(req.destination, req.preferences.accommodation, req.budget, req.duration);

  // 5. Generate transport
  console.log('\n[5/5] Generating transport options...');
  const originCity = req.originCity || 'Delhi';
  const transport = generateTransport(originCity, loc.city, req.preferences.transportMode);

  // 6. Build final itinerary with Gemini reasoning
  console.log('\n[6/6] Building itinerary with Gemini...');
  const plan = await buildItinerary(
    req.destination, loc, req.duration, req.budget, req.travelers,
    req.preferences, places, hotels, transport, weather, originCity
  );

  // Attach metadata
  plan.resolvedLocation = { lat: loc.lat, lon: loc.lon };
  plan.sourceData = {
    placesDiscovered: places.length,
    accommodationsFound: hotels.length,
    weatherSource: Deno.env.get('OPENWEATHERMAP_API_KEY') ? 'OpenWeatherMap API' : 'Simulated',
    placesSource: 'Gemini AI (real place knowledge)',
    locationSource: 'OpenStreetMap Nominatim',
    priceNote: 'Prices are realistic estimates (academic assumption)',
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
