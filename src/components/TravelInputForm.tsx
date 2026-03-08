import { useState } from 'react';
import { TravelInput, TravelPreferences } from '@/types/agent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, MapPin, Users, Wallet, Plane, Navigation } from 'lucide-react';

interface TravelInputFormProps {
  onSubmit: (input: TravelInput) => void;
  isLoading?: boolean;
}

const popularDestinations = [
  'Goa, India',
  'Manali, India',
  'Jaipur, India',
  'Kerala, India',
  'Rishikesh, India',
  'Udaipur, India',
];

const activityOptions = [
  'Beaches',
  'Adventure',
  'Culture',
  'Nature',
  'Food',
  'Shopping',
  'Nightlife',
  'Relaxation',
];

export function TravelInputForm({ onSubmit, isLoading }: TravelInputFormProps) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [budget, setBudget] = useState('25000');
  const [travelers, setTravelers] = useState('2');
  const [accommodation, setAccommodation] = useState<'budget' | 'mid-range' | 'luxury'>('mid-range');
  const [transportMode, setTransportMode] = useState<'public' | 'rental' | 'mixed'>('mixed');
  const [pace, setPace] = useState<'relaxed' | 'moderate' | 'packed'>('moderate');
  const [selectedActivities, setSelectedActivities] = useState<string[]>(['Culture', 'Food']);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!destination || !startDate || !endDate) {
      return;
    }

    const input: TravelInput = {
      destination,
      startDate,
      endDate,
      budget: parseInt(budget),
      currency: '₹',
      travelers: parseInt(travelers),
      preferences: {
        accommodation,
        activities: selectedActivities,
        transportMode,
        pace,
      },
    };

    onSubmit(input);
  };

  const toggleActivity = (activity: string) => {
    setSelectedActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Destination */}
      <div className="space-y-2">
        <Label htmlFor="destination" className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Destination
        </Label>
        <Input
          id="destination"
          placeholder="Where do you want to go?"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="text-lg"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {popularDestinations.map((dest) => (
            <button
              key={dest}
              type="button"
              onClick={() => setDestination(dest)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-colors',
                destination === dest
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary hover:bg-secondary/80 border-transparent'
              )}
            >
              {dest}
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            Start Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
              >
                {startDate ? format(startDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            End Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
              >
                {endDate ? format(endDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={(date) => date < (startDate || new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Budget and Travelers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="budget" className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            Budget (₹)
          </Label>
          <Input
            id="budget"
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            min="5000"
            step="1000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="travelers" className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Travelers
          </Label>
          <Select value={travelers} onValueChange={setTravelers}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <SelectItem key={n} value={n.toString()}>
                  {n} {n === 1 ? 'Person' : 'People'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preferences */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Accommodation</Label>
          <Select value={accommodation} onValueChange={(v) => setAccommodation(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="budget">Budget</SelectItem>
              <SelectItem value="mid-range">Mid-Range</SelectItem>
              <SelectItem value="luxury">Luxury</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Transport</Label>
          <Select value={transportMode} onValueChange={(v) => setTransportMode(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="rental">Rental</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Pace</Label>
          <Select value={pace} onValueChange={(v) => setPace(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relaxed">Relaxed</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="packed">Packed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activities */}
      <div className="space-y-2">
        <Label>Preferred Activities</Label>
        <div className="flex flex-wrap gap-2">
          {activityOptions.map((activity) => (
            <button
              key={activity}
              type="button"
              onClick={() => toggleActivity(activity)}
              className={cn(
                'text-sm px-3 py-1.5 rounded-full border transition-all',
                selectedActivities.includes(activity)
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-secondary hover:bg-secondary/80 border-transparent'
              )}
            >
              {activity}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full gradient-hero text-white font-semibold"
        disabled={isLoading || !destination || !startDate || !endDate}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
            Planning Your Trip...
          </>
        ) : (
          <>
            <Plane className="w-4 h-4 mr-2" />
            Generate Travel Plan
          </>
        )}
      </Button>
    </form>
  );
}
