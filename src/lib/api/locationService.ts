/**
 * Location Service - Client-side location utilities
 * Uses OpenStreetMap Nominatim for geocoding
 */

export interface ResolvedLocation {
  lat: number;
  lon: number;
  displayName: string;
  city: string;
  state: string;
  country: string;
}

export interface NearbyPlace {
  name: string;
  category: string;
  distance: number;
  address?: string;
}

/**
 * Resolve a destination name to coordinates using Nominatim
 * This is a free API with no key required
 */
export async function resolveDestination(destination: string): Promise<ResolvedLocation | null> {
  try {
    const searchQuery = destination.includes('India') ? destination : `${destination}, India`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LovableTravelPlanner/1.0'
      }
    });
    
    if (!response.ok) {
      console.error('Nominatim error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      return null;
    }
    
    const result = data[0];
    const address = result.address || {};
    
    return {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      displayName: result.display_name,
      city: address.city || address.town || address.village || address.county || destination,
      state: address.state || '',
      country: address.country || 'India'
    };
  } catch (error) {
    console.error('Location resolution error:', error);
    return null;
  }
}

/**
 * Get destination suggestions for autocomplete
 */
export async function getDestinationSuggestions(query: string): Promise<string[]> {
  if (query.length < 2) return [];
  
  try {
    const searchQuery = `${query}, India`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LovableTravelPlanner/1.0'
      }
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    return data.map((item: any) => {
      const address = item.address || {};
      const city = address.city || address.town || address.village || address.county;
      const state = address.state;
      
      if (city && state) {
        return `${city}, ${state}`;
      }
      return item.display_name.split(',').slice(0, 2).join(',');
    });
  } catch (error) {
    console.error('Suggestion fetch error:', error);
    return [];
  }
}

/**
 * Validate if a destination exists in India
 */
export async function validateDestination(destination: string): Promise<boolean> {
  const location = await resolveDestination(destination);
  return location !== null && location.country.toLowerCase().includes('india');
}

/**
 * Calculate distance between two points (Haversine formula)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
