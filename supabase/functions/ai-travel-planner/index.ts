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
      temperature: 0.2,
      max_tokens: 16000,
      response_format: { type: 'json_object' },
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

// Evaluate simple math expressions in JSON values
function evaluateMathInJson(str: string): string {
  return str.replace(
    /:\s*([\d\s\+\-\*\/\(\)\.]+(?:[\+\-\*\/][\d\s\+\-\*\/\(\)\.]+)+)\s*([,\}\]])/g,
    (match, expr, ending) => {
      try {
        if (/[+\-*/]/.test(expr) && /\d/.test(expr)) {
          const result = Function(`"use strict"; return (${expr.trim()})`)();
          if (typeof result === 'number' && isFinite(result)) {
            return `: ${result}${ending}`;
          }
        }
      } catch (_) { /* leave as-is */ }
      return match;
    }
  );
}

function sanitizeJsonString(str: string): string {
  let s = evaluateMathInJson(str);
  s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === '\\') { result += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString && ch === '\n') { result += '\\n'; continue; }
    if (inString && ch === '\r') { result += '\\r'; continue; }
    if (inString && ch === '\t') { result += '\\t'; continue; }
    result += ch;
  }
  return result;
}

function parseJSON(content: string): any {
  let cleaned = content
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  cleaned = sanitizeJsonString(cleaned);

  try { return JSON.parse(cleaned); } catch (e) {
    const msg = (e as Error).message;
    const posMatch = msg.match(/position (\d+)/);
    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      const context = cleaned.substring(Math.max(0, pos - 80), pos + 80);
      console.error(`[JSON] Parse fail at pos ${pos}. Context: ...${context}...`);
    }
  }

  const objStart = cleaned.indexOf('{');
  const objEnd = cleaned.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    let slice = cleaned.substring(objStart, objEnd + 1);
    slice = slice.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    try { return JSON.parse(slice); } catch (_) { /* continue */ }
  }

  if (objStart !== -1) {
    let candidate = cleaned.substring(objStart);
    const patterns = [
      /,\s*"[^"]*"\s*:\s*"[^"]*$/,
      /,\s*"[^"]*"\s*:\s*$/,
      /,\s*"[^"]*"\s*:\s*\[?\s*$/,
      /,\s*"[^"]*$/,
    ];
    for (const pattern of patterns) {
      candidate = candidate.replace(pattern, '');
    }
    candidate = candidate.replace(/,\s*$/, '');
    const openBrackets = (candidate.match(/\[/g) || []).length - (candidate.match(/\]/g) || []).length;
    const openBraces = (candidate.match(/\{/g) || []).length - (candidate.match(/\}/g) || []).length;
    for (let i = 0; i < openBrackets; i++) candidate += ']';
    for (let i = 0; i < openBraces; i++) candidate += '}';
    candidate = candidate.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

    try {
      const result = JSON.parse(candidate);
      console.warn(`Recovered JSON from truncated response (closed ${openBraces} braces, ${openBrackets} brackets)`);
      return result;
    } catch (e) {
      console.error('Recovery attempt 1 failed:', (e as Error).message);
      let lastTry = cleaned.substring(objStart);
      let braceCount = 0;
      let lastBalancedPos = -1;
      for (let i = 0; i < lastTry.length; i++) {
        if (lastTry[i] === '{') braceCount++;
        if (lastTry[i] === '}') { braceCount--; if (braceCount === 0) lastBalancedPos = i; }
      }
      if (lastBalancedPos > 0) {
        const trimmed = lastTry.substring(0, lastBalancedPos + 1);
        try {
          const result = JSON.parse(trimmed);
          console.warn('Recovered JSON by finding last balanced brace');
          return result;
        } catch (_) { /* give up */ }
      }
      console.error('All recovery attempts failed. First 500 chars:', candidate.substring(0, 500));
    }
  }

  throw new Error('Cannot parse AI response as JSON');
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

  const weatherSummary = weather.map(w => `${w.date}: ${w.condition} ${w.temperature}°C (${w.suitable ? 'outdoor OK' : 'RAIN/STORM — prefer indoor'})`).join('\n');

  const system = `You are an expert Indian travel planner AI. You know REAL tourist places, restaurants, hotels across India. You MUST return ONLY valid JSON — no markdown, no explanation, no text before or after the JSON.

CORE PRINCIPLES:
1. ONLY use real, specific place names — NEVER "Beach Visit", "City Tour", "Local Market"
2. Group nearby attractions on the same day (within 10-15 km radius)
3. If weather is rainy, SWAP outdoor activities with indoor ones (museums, temples, markets, malls)
4. If total cost > budget, you MUST auto-optimize: downgrade transport, pick cheaper hotel, replace paid attractions with free ones
5. Every activity gets a specific time slot (e.g. "9:00 AM", "11:30 AM")
6. Include travel distance and time between consecutive activities`;

  const prompt = `Create a COMPLETE ${duration}-day travel plan for "${destination}" (${location.city}, ${location.state}).

TRAVELER INFO:
- Travelers: ${travelers} person(s)
- Total budget: ₹${budget} for ALL ${travelers} person(s) combined
- Budget per person: ₹${Math.round(budget / travelers)}
- Accommodation: ${preferences.accommodation}
- Transport preference: ${preferences.transportMode}
- Pace: ${preferences.pace}
- Interests: ${preferences.activities.join(', ')}
- Origin city: ${originCity}

WEATHER FORECAST:
${weatherSummary}

PLANNING RULES:

1. PLACE DISCOVERY: Pick 10-15 REAL tourist attractions in ${destination} with proper names (e.g. "Baga Beach", "Fort Aguada", "Basilica of Bom Jesus")
2. SMART CLUSTERING: Group attractions by geographic proximity:
   - Same-day places must be within ~10-15 km of each other
   - Create logical area groupings (e.g. Day 1→Panaji, Day 2→Old Goa, Day 3→North Goa beaches)
   - Avoid unrealistic long travel within a single day
3. TIME SCHEDULING: Every activity must have a specific time slot:
   - Start from 9:00 AM each day
   - Include realistic gaps for travel between places
   - Lunch around 1:00-2:00 PM, Dinner around 7:30-8:30 PM
4. TRAVEL BETWEEN PLACES: For every transition include distance_km, travel_time, and transport mode
5. WEATHER RESCHEDULING:
   - On rainy/stormy days: SWAP outdoor activities (beaches, nature walks, viewpoints) with indoor ones (museums, temples, markets, cultural centers)
   - Clearly note in weather.recommendation what was changed and why
6. FOOD INTEGRATION: Each day must include lunch + dinner with REAL restaurant names, cuisine type, famous dish, cost per person
7. TRANSPORT: flight if >700km from origin, train if 200-700km, bus/car if <200km
8. ACCOMMODATION: Choose 1 hotel matching budget tier, provide 2 alternatives

CRITICAL BUDGET RULES:
- ALL prices for ${travelers} person(s)
- Transport "price" = ONE-WAY cost for ALL ${travelers} person(s) combined
- Transport "round_trip_cost" = price × 2
- Hotel "price_per_night" = per room (2 ppl/room, book ${Math.ceil(travelers / 2)} room(s))
- Hotel "total_cost" = price_per_night × ${duration - 1} night(s) × ${Math.ceil(travelers / 2)} room(s)
- Food costs = per-person × ${travelers}
- Activity fees = per-person × ${travelers}
- TOTAL must not exceed ₹${budget}

AUTOMATIC BUDGET CORRECTION (MANDATORY if total > budget):
If the total cost exceeds ₹${budget}, you MUST fix it:
1. Switch transport: flight → train (suggest real train name), train → bus
2. Choose cheaper accommodation from alternatives
3. Replace expensive activities with free alternatives (parks, beaches, temples)
4. Choose budget restaurants
5. Set budget_optimization.applied = true
6. List ALL changes made in budget_optimization.changes
7. Set budget_optimization.saved to the amount saved
8. Final budget_status MUST be "approved" or "warning" (never "exceeded" if optimization is possible)

TRANSPORT RULES:
- If suggesting train: use REAL train name (e.g. "Goa Express 12779", "Rajdhani Express")
- "round_trip_cost" MUST equal exactly price × 2

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
    "total_cost": 7500,
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
      "theme": "Area Name — Day Theme",
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
  "budget_status": "approved|warning",
  "budget_optimization": {
    "applied": true,
    "changes": [
      "Switched from flight to train (Goa Express 12779) — saved ₹4000",
      "Chose Hotel Mandovi instead of Taj — saved ₹3000",
      "Replaced Scuba Diving with free beach walk — saved ₹2000"
    ],
    "saved": 9000
  },
  "weather_status": "suitable|partially-suitable",
  "agent_decisions": {
    "weather_agent": "Clear weather on Days 1-2: outdoor activities selected. Rain on Day 3: swapped beach activities with museum visits",
    "budget_agent": "Total cost was ₹35000, exceeded budget by ₹5000. Switched flight→train, chose budget hotel. Final cost: ₹28000 (approved)",
    "location_agent": "Selected top-rated attractions within 15km radius per day. Day 1: Panaji cluster, Day 2: Old Goa cluster",
    "itinerary_agent": "Grouped locations by proximity. Added 30-min buffer between activities for travel",
    "food_agent": "Selected restaurants near day's attractions. Mix of local cuisine and popular eateries",
    "transport_agent": "Distance Delhi→Goa is 590km. Selected train as budget-friendly option over flight"
  },
  "tips": ["3-5 practical tips"]
}

CRITICAL:
- EVERY place name must be REAL and specific (never generic)
- EVERY restaurant must be a real or realistic name for ${destination}
- ALL costs in INR, ALL numeric values MUST be pre-computed numbers (NEVER math expressions like 4*1200)
- daily_cost = sum of activity costs + lunch + dinner for ${travelers} person(s) — write the FINAL NUMBER
- budget_breakdown.total MUST equal the sum of all sub-categories
- If total > ₹${budget}: you MUST optimize and set budget_status to "approved" or "warning"
- agent_decisions MUST describe SPECIFIC decisions made, not generic text
- Return ONLY the JSON object`;

  let plan: any;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGemini(system, prompt);
      console.log(`[Plan] Attempt ${attempt + 1}: Raw response length: ${raw.length} chars`);
      plan = parseJSON(raw);
      lastError = null;
      break;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.error(`[Plan] Attempt ${attempt + 1} failed:`, lastError.message);
      if (attempt === 0) {
        console.log('[Plan] Retrying...');
      }
    }
  }
  
  if (lastError || !plan) {
    throw lastError || new Error('Failed to generate plan');
  }

  // Validate essential fields
  if (!plan.daily_plan || !Array.isArray(plan.daily_plan) || plan.daily_plan.length === 0) {
    throw new Error('Generated plan has no daily_plan');
  }

  for (const day of plan.daily_plan) {
    if (!day.activities || day.activities.length === 0) {
      throw new Error(`Day ${day.day} has no activities`);
    }
  }

  // POST-PROCESSING: Auto-correct budget if AI still returned "exceeded"
  const bb = plan.budget_breakdown || {};
  const totalCost = bb.total || 0;
  if (totalCost > budget && plan.budget_status === 'exceeded') {
    // Force status to warning if within 15% over
    const overagePercent = ((totalCost - budget) / budget) * 100;
    if (overagePercent <= 15) {
      plan.budget_status = 'warning';
      if (!plan.budget_optimization) {
        plan.budget_optimization = { applied: false, changes: [], saved: 0 };
      }
      plan.budget_optimization.changes.push(`Budget is ${Math.round(overagePercent)}% over — consider minor adjustments`);
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
