import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DayPlan } from '@/types/agent';

interface TravelMapProps {
  destination: string;
  lat: number;
  lon: number;
  itinerary: DayPlan[];
}

const dayColors = [
  '#6391FF', // blue
  '#FACC50', // gold
  '#86EFAC', // green
  '#F97373', // red
  '#C4A7FF', // purple
  '#FDBA74', // orange
  '#67E8F9', // cyan
  '#F0ABFC', // pink
];

export function TravelMap({ destination, lat, lon, itinerary }: TravelMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
    }).setView([lat, lon], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add a main destination marker
    const mainIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background:#6391FF;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);">📍</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    L.marker([lat, lon], { icon: mainIcon })
      .addTo(map)
      .bindPopup(`<b>${destination}</b><br/>Your destination`);

    // Add day-wise activity markers
    itinerary.forEach((day) => {
      const color = dayColors[(day.day - 1) % dayColors.length];
      day.activities.forEach((activity, idx) => {
        // We don't have individual lat/lon for each activity, 
        // so we place them in a spread pattern around the destination
        const angle = ((day.day - 1) * 60 + idx * 30) * (Math.PI / 180);
        const spread = 0.01 + idx * 0.005 + (day.day - 1) * 0.008;
        const aLat = lat + Math.cos(angle) * spread;
        const aLon = lon + Math.sin(angle) * spread;

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background:${color};color:#0B0F1A;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${day.day}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const costStr = activity.cost === 0 ? 'Free' : `₹${activity.cost.toLocaleString()}`;
        L.marker([aLat, aLon], { icon })
          .addTo(map)
          .bindPopup(`<b>Day ${day.day}: ${activity.name}</b><br/>${activity.timeSlot || ''} • ${costStr}<br/><small>${activity.description || ''}</small>`);
      });
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [lat, lon, destination, itinerary]);

  return (
    <div className="rounded-xl overflow-hidden border" style={{ height: '350px' }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
