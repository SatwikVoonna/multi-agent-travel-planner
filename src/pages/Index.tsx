import { useAgentSystem } from '@/hooks/useAgentSystem';
import { TravelInputForm } from '@/components/TravelInputForm';
import { AgentVisualization } from '@/components/AgentVisualization';
import { TravelPlanDisplay } from '@/components/TravelPlanDisplay';
import { Compass, Sparkles, Bot, Zap } from 'lucide-react';
import heroAgents from '@/assets/hero-agents.jpg';

const Index = () => {
  const {
    agents, 
    messages, 
    isPlanning, 
    travelPlan, 
    error, 
    startPlanning, 
    resetPlanning 
  } = useAgentSystem();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-hero rounded-xl flex items-center justify-center shadow-glow">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl">TravelAI Planner</h1>
                <p className="text-xs text-muted-foreground">Multi-Agent Collaboration System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs bg-success/10 text-success px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                Agents Online
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Only show when no plan */}
      {!travelPlan && (
        <section className="relative py-16 overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${heroAgents})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              Powered by 7 Autonomous AI Agents
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 animate-fade-in">
              Your AI Travel Planning
              <span className="gradient-hero bg-clip-text text-transparent"> Dream Team</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
              Watch autonomous agents collaborate in real-time to create your perfect travel itinerary. 
              Weather-aware, budget-optimized, and fully personalized.
            </p>
            
            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div className="bg-card/80 backdrop-blur rounded-xl p-4 border animate-fade-in" style={{ animationDelay: '200ms' }}>
                <Bot className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-sm">7 Specialized Agents</h3>
                <p className="text-xs text-muted-foreground mt-1">Each with unique expertise</p>
              </div>
              <div className="bg-card/80 backdrop-blur rounded-xl p-4 border animate-fade-in" style={{ animationDelay: '300ms' }}>
                <Zap className="w-8 h-8 text-warning mx-auto mb-2" />
                <h3 className="font-semibold text-sm">Real-time Data</h3>
                <p className="text-xs text-muted-foreground mt-1">Live weather & pricing</p>
              </div>
              <div className="bg-card/80 backdrop-blur rounded-xl p-4 border animate-fade-in" style={{ animationDelay: '400ms' }}>
                <Sparkles className="w-8 h-8 text-accent mx-auto mb-2" />
                <h3 className="font-semibold text-sm">Smart Optimization</h3>
                <p className="text-xs text-muted-foreground mt-1">Budget & preference aware</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {travelPlan ? (
          <TravelPlanDisplay plan={travelPlan} onReset={resetPlanning} />
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="order-2 lg:order-1">
              <div className="bg-card rounded-2xl border p-6 shadow-lg">
                <h2 className="font-display font-bold text-xl mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    ✈️
                  </span>
                  Plan Your Trip
                </h2>
                <TravelInputForm onSubmit={startPlanning} isLoading={isPlanning} />
              </div>
            </div>

            {/* Agent Visualization */}
            <div className="order-1 lg:order-2">
              <div className="bg-card rounded-2xl border p-6 shadow-lg sticky top-24">
                <AgentVisualization agents={agents} messages={messages} />
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-center">
            {error}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Multi-Agent Travel Planner • AI Project Demo</p>
          <p className="text-xs mt-1">Using OpenWeatherMap Free Tier • Mock Hotel & Transport Data</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
