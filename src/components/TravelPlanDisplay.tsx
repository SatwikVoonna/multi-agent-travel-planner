import { TravelPlan, DayPlan, Activity, MealRecommendation, BudgetBreakdown, AgentDecisions } from '@/types/agent';
import { cn } from '@/lib/utils';
import { TravelMap } from '@/components/TravelMap';
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
  Clock,
  Utensils,
  Navigation,
  Brain,
  TrendingDown,
  Lightbulb,
  Train,
  Bus,
  Car
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateTravelPDF } from '@/lib/generateTravelPDF';
import { Download } from 'lucide-react';

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

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-5 h-5" />;
      case 'train': return <Train className="w-5 h-5" />;
      case 'bus': return <Bus className="w-5 h-5" />;
      default: return <Car className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header Summary */}
      <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-success/10 rounded-2xl p-4 sm:p-6 border">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              {plan.destination}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {plan.duration} Days • {plan.itinerary[0]?.date} to {plan.itinerary[plan.itinerary.length - 1]?.date}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>
            Plan Another Trip
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
          <div className="bg-card rounded-xl p-3 sm:p-4 border">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Cost</span>
            </div>
            <p className="text-lg sm:text-2xl font-display font-bold">
              ₹{plan.totalCost.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              of ₹{plan.totalBudget.toLocaleString()} budget
            </p>
          </div>

          <div className="bg-card rounded-xl p-3 sm:p-4 border">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              {getBudgetIcon()}
              <span className="text-xs sm:text-sm text-muted-foreground">Budget Status</span>
            </div>
            <p className={cn(
              'text-lg sm:text-xl font-display font-bold capitalize',
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

          <div className="bg-card rounded-xl p-3 sm:p-4 border">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <Sun className="w-4 h-4 text-warning" />
              <span className="text-xs sm:text-sm text-muted-foreground">Weather</span>
            </div>
            <p className={cn(
              'text-lg sm:text-xl font-display font-bold capitalize',
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

      {/* Budget Breakdown */}
      {plan.budgetBreakdown && (
        <div className="bg-card rounded-xl p-5 border">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Cost Breakdown
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Accommodation', value: plan.budgetBreakdown.accommodation, icon: '🏨' },
              { label: 'Transport', value: plan.budgetBreakdown.transport, icon: '✈️' },
              { label: 'Activities', value: plan.budgetBreakdown.activities, icon: '🎯' },
              { label: 'Food', value: plan.budgetBreakdown.food, icon: '🍽️' },
              { label: 'Local Transport', value: plan.budgetBreakdown.localTransport || 0, icon: '🚗' },
              { label: 'Miscellaneous', value: plan.budgetBreakdown.miscellaneous, icon: '📦' },
            ].map(item => (
              <div key={item.label} className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <span>{item.icon}</span>
                  {item.label}
                </div>
                <p className="font-semibold">₹{item.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Optimization */}
      {plan.budgetOptimization?.applied && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2 text-success">
            <TrendingDown className="w-5 h-5" />
            Budget Optimization Applied — Saved ₹{plan.budgetOptimization.saved.toLocaleString()}
          </h3>
          <ul className="space-y-1">
            {plan.budgetOptimization.changes.map((change, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                {change}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hotel & Transport */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plan.hotel && (
          <div className="bg-card rounded-xl p-5 border">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-accent" />
              <h3 className="font-display font-semibold">Accommodation</h3>
            </div>
            <p className="font-medium text-foreground">{plan.hotel.name}</p>
            <p className="text-sm text-muted-foreground">{plan.hotel.location}</p>
            {plan.hotel.type && (
              <span className="text-xs bg-secondary px-2 py-0.5 rounded capitalize">{plan.hotel.type}</span>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-warning">{'★'.repeat(Math.floor(plan.hotel.rating))}</span>
              <span className="text-sm text-muted-foreground">{plan.hotel.rating}/5</span>
            </div>
            <p className="mt-2 font-semibold">
              ₹{plan.hotel.pricePerNight.toLocaleString()}/night
            </p>
            {plan.hotel.totalCost && (
              <p className="text-xs text-muted-foreground">
                Total: ₹{plan.hotel.totalCost.toLocaleString()} ({plan.duration - 1} nights)
              </p>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              {plan.hotel.amenities.slice(0, 5).map((amenity) => (
                <span key={amenity} className="text-xs bg-secondary px-2 py-0.5 rounded">
                  {amenity}
                </span>
              ))}
            </div>
            {plan.hotel.alternatives && plan.hotel.alternatives.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">Alternatives:</p>
                {plan.hotel.alternatives.map((alt, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {alt.name} — ₹{alt.pricePerNight.toLocaleString()}/night (★{alt.rating})
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {plan.transport && (
          <div className="bg-card rounded-xl p-5 border">
            <div className="flex items-center gap-2 mb-3">
              {getTransportIcon(plan.transport.type)}
              <h3 className="font-display font-semibold">Transport</h3>
            </div>
            <p className="font-medium text-foreground capitalize">{plan.transport.type}</p>
            <p className="text-sm text-muted-foreground">
              {plan.transport.from} → {plan.transport.to}
            </p>
            {plan.transport.carrier && (
              <p className="text-xs text-muted-foreground mt-1">{plan.transport.carrier}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {plan.transport.duration}
              </span>
            </div>
            <p className="mt-2 font-semibold">
              ₹{plan.transport.price.toLocaleString()} (one way)
            </p>
            {plan.transport.roundTripCost && (
              <p className="text-xs text-muted-foreground">
                Round trip: ₹{plan.transport.roundTripCost.toLocaleString()}
              </p>
            )}
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

      {/* Agent Decision Summary */}
      {plan.agentDecisions && (
        <div className="bg-card rounded-xl p-5 border">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Agent Decision Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(plan.agentDecisions).map(([agent, decision]) => (
              decision ? (
                <div key={agent} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm font-medium capitalize mb-1">
                    {agent.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground">{decision}</p>
                </div>
              ) : null
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {plan.tips && plan.tips.length > 0 && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" />
            Travel Tips
          </h3>
          <ul className="space-y-2">
            {plan.tips.map((tip, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-accent font-bold mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Download PDF */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={() => generateTravelPDF(plan)}
          className="gap-2"
        >
          <Download className="w-5 h-5" />
          Download Trip Plan as PDF
        </Button>
      </div>

      {/* Summary Footer */}
      <div className="bg-muted rounded-xl p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Plan generated at {plan.generatedAt.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Powered by Multi-Agent AI System • Gemini 2.5 Flash • Prices are estimates
        </p>
      </div>
    </div>
  );
}

function MealCard({ meal, type }: { meal: MealRecommendation; type: 'lunch' | 'dinner' }) {
  return (
    <div className="flex items-start gap-3 bg-accent/5 rounded-lg p-3">
      <Utensils className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{meal.name}</p>
          <span className="text-xs text-muted-foreground">{meal.timeSlot}</span>
        </div>
        <p className="text-xs text-muted-foreground">{meal.cuisine} • {meal.famousFor}</p>
        <p className="text-xs font-medium mt-1">₹{meal.costPerPerson.toLocaleString()}/person</p>
      </div>
    </div>
  );
}

function DayCard({ day }: { day: DayPlan }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-3 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
            {day.day}
          </span>
          <div>
            <p className="font-semibold text-sm sm:text-base">Day {day.day}{day.theme ? ` — ${day.theme}` : ''}</p>
            <p className="text-xs text-muted-foreground">{day.date}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 ml-11 sm:ml-0">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <span>{day.weather.icon}</span>
            <span>{day.weather.temperature}°C</span>
            <span className="text-muted-foreground hidden sm:inline">• {day.weather.condition}</span>
          </div>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            day.weather.suitable 
              ? 'bg-success/20 text-success' 
              : 'bg-warning/20 text-warning'
          )}>
            {day.weather.suitable ? 'Good' : 'Indoor'}
          </span>
        </div>
      </div>

      {day.weather.recommendation && (
        <div className="px-5 py-2 bg-muted/30 text-xs text-muted-foreground flex items-center gap-1">
          <Sun className="w-3 h-3" />
          {day.weather.recommendation}
        </div>
      )}
      
      <div className="p-3 sm:p-5">
        <div className="space-y-3">
          {day.activities.map((activity, index) => (
            <div key={activity.id}>
              {/* Travel indicator */}
              {activity.travelFromPrevious && activity.travelFromPrevious.travelTime && index > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 ml-9">
                  <Navigation className="w-3 h-3" />
                  {activity.travelFromPrevious.distanceKm}km • {activity.travelFromPrevious.travelTime} by {activity.travelFromPrevious.mode}
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  {activity.timeSlot && (
                    <span className="text-xs text-muted-foreground mb-1 w-16 text-right">{activity.timeSlot}</span>
                  )}
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{activity.name}</p>
                    <span className="text-sm font-semibold text-foreground">
                      {activity.cost === 0 ? 'Free' : `₹${activity.cost.toLocaleString()}`}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded">{activity.type}</span>
                    <span className="text-xs text-muted-foreground">{activity.duration}</span>
                  </div>
                  {activity.tips && (
                    <p className="text-xs text-accent mt-1 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      {activity.tips}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Meals */}
        {(day.meals?.lunch || day.meals?.dinner) && (
          <div className="mt-4 pt-3 border-t space-y-2">
            <p className="text-sm font-medium flex items-center gap-1 mb-2">
              <Utensils className="w-4 h-4 text-accent" />
              Dining
            </p>
            {day.meals.lunch && <MealCard meal={day.meals.lunch} type="lunch" />}
            {day.meals.dinner && <MealCard meal={day.meals.dinner} type="dinner" />}
          </div>
        )}
        
        <div className="mt-4 pt-3 border-t flex justify-between text-sm">
          <span className="text-muted-foreground">Day Total</span>
          <span className="font-semibold">₹{day.totalCost.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
