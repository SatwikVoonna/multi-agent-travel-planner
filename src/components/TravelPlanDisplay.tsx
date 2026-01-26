import { TravelPlan, DayPlan } from '@/types/agent';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sun, 
  Cloud, 
  CloudRain,
  MapPin,
  Building2,
  Plane,
  Calendar,
  Wallet,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TravelPlanDisplayProps {
  plan: TravelPlan;
  onReset: () => void;
}

export function TravelPlanDisplay({ plan, onReset }: TravelPlanDisplayProps) {
  const getBudgetIcon = () => {
    switch (plan.budgetStatus) {
      case 'approved':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'exceeded':
        return <XCircle className="w-5 h-5 text-destructive" />;
    }
  };

  const getWeatherIcon = (condition: string) => {
    if (condition.toLowerCase().includes('rain')) return <CloudRain className="w-4 h-4" />;
    if (condition.toLowerCase().includes('cloud')) return <Cloud className="w-4 h-4" />;
    return <Sun className="w-4 h-4 text-warning" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Summary */}
      <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-success/10 rounded-2xl p-6 border">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              {plan.destination}
            </h2>
            <p className="text-muted-foreground mt-1">
              {plan.duration} Days • {plan.itinerary[0]?.date} to {plan.itinerary[plan.itinerary.length - 1]?.date}
            </p>
          </div>
          <Button variant="outline" onClick={onReset}>
            Plan Another Trip
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-card rounded-xl p-4 border">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Cost</span>
            </div>
            <p className="text-2xl font-display font-bold">
              ₹{plan.totalCost.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              of ₹{plan.totalBudget.toLocaleString()} budget
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 border">
            <div className="flex items-center gap-2 mb-2">
              {getBudgetIcon()}
              <span className="text-sm text-muted-foreground">Budget Status</span>
            </div>
            <p className={cn(
              'text-xl font-display font-bold capitalize',
              plan.budgetStatus === 'approved' && 'text-success',
              plan.budgetStatus === 'warning' && 'text-warning',
              plan.budgetStatus === 'exceeded' && 'text-destructive'
            )}>
              {plan.budgetStatus}
            </p>
            <p className="text-sm text-muted-foreground">
              {plan.budgetStatus === 'approved' 
                ? `₹${(plan.totalBudget - plan.totalCost).toLocaleString()} remaining`
                : plan.budgetStatus === 'warning'
                  ? 'Slightly over budget'
                  : 'Exceeds budget'
              }
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 border">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-warning" />
              <span className="text-sm text-muted-foreground">Weather</span>
            </div>
            <p className={cn(
              'text-xl font-display font-bold capitalize',
              plan.weatherStatus === 'suitable' && 'text-success',
              plan.weatherStatus === 'partially-suitable' && 'text-warning',
              plan.weatherStatus === 'unsuitable' && 'text-destructive'
            )}>
              {plan.weatherStatus.replace('-', ' ')}
            </p>
            <p className="text-sm text-muted-foreground">
              {plan.weatherStatus === 'suitable' 
                ? 'Great weather expected!'
                : 'Some days may have weather issues'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Hotel & Transport */}
      <div className="grid grid-cols-2 gap-4">
        {plan.hotel && (
          <div className="bg-card rounded-xl p-5 border">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-agent-hotel" />
              <h3 className="font-display font-semibold">Accommodation</h3>
            </div>
            <p className="font-medium text-foreground">{plan.hotel.name}</p>
            <p className="text-sm text-muted-foreground">{plan.hotel.location}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-warning">{'★'.repeat(Math.floor(plan.hotel.rating))}</span>
              <span className="text-sm text-muted-foreground">{plan.hotel.rating}/5</span>
            </div>
            <p className="mt-2 font-semibold">
              ₹{plan.hotel.pricePerNight.toLocaleString()}/night
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {plan.hotel.amenities.slice(0, 4).map((amenity) => (
                <span key={amenity} className="text-xs bg-secondary px-2 py-0.5 rounded">
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}

        {plan.transport && (
          <div className="bg-card rounded-xl p-5 border">
            <div className="flex items-center gap-2 mb-3">
              <Plane className="w-5 h-5 text-agent-transport" />
              <h3 className="font-display font-semibold">Transport</h3>
            </div>
            <p className="font-medium text-foreground capitalize">{plan.transport.type}</p>
            <p className="text-sm text-muted-foreground">
              {plan.transport.from} → {plan.transport.to}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {plan.transport.duration}
              </span>
            </div>
            <p className="mt-2 font-semibold">
              ₹{plan.transport.price.toLocaleString()} (one way)
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Departs: {plan.transport.departure} • Arrives: {plan.transport.arrival}
            </p>
          </div>
        )}
      </div>

      {/* Day-wise Itinerary */}
      <div>
        <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Day-wise Itinerary
        </h3>
        
        <div className="space-y-4">
          {plan.itinerary.map((day) => (
            <DayCard key={day.day} day={day} />
          ))}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-muted rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Plan generated at {plan.generatedAt.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Powered by Multi-Agent AI System • Weather data may vary
        </p>
      </div>
    </div>
  );
}

function DayCard({ day }: { day: DayPlan }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
            {day.day}
          </span>
          <div>
            <p className="font-semibold">Day {day.day}</p>
            <p className="text-xs text-muted-foreground">{day.date}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <span>{day.weather.icon}</span>
            <span>{day.weather.temperature}°C</span>
            <span className="text-muted-foreground">• {day.weather.condition}</span>
          </div>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            day.weather.suitable 
              ? 'bg-success/20 text-success' 
              : 'bg-warning/20 text-warning'
          )}>
            {day.weather.suitable ? 'Good' : 'Check weather'}
          </span>
        </div>
      </div>
      
      <div className="p-5">
        <div className="space-y-3">
          {day.activities.map((activity, index) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent flex-shrink-0 mt-0.5">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{activity.name}</p>
                  <span className="text-sm text-muted-foreground">
                    ₹{activity.cost.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded">{activity.type}</span>
                  <span className="text-xs text-muted-foreground">{activity.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t flex justify-between text-sm">
          <span className="text-muted-foreground">Day Total</span>
          <span className="font-semibold">₹{day.totalCost.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
