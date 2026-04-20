import { useAIAgentSystem } from '@/hooks/useAIAgentSystem';
import { TravelInputForm } from '@/components/TravelInputForm';
import { AgentVisualization } from '@/components/AgentVisualization';
import { TravelPlanDisplay } from '@/components/TravelPlanDisplay';
import { AILoadingScreen } from '@/components/AILoadingScreen';
import { Compass, Sparkles, Bot, Zap, Brain, Moon, Sun } from 'lucide-react';
import heroAgents from '@/assets/hero-agents.jpg';
import { Agent, AgentType } from '@/types/agent';
import { useTheme } from '@/hooks/useTheme';

const Index = () => {
  const { theme, toggleTheme } = useTheme();
  const {
    agentStatuses, 
    messages, 
    isProcessing, 
    travelPlan, 
    error, 
    generatePlan, 
    resetPlan 
  } = useAIAgentSystem();

  // Convert agent statuses to agent objects for visualization
  const agents: Agent[] = [
    { id: 'coordinator', name: 'Coordinator', description: 'AI Orchestrator powered by Gemini', status: agentStatuses.coordinator, icon: '🎯', color: 'primary' },
    { id: 'budget', name: 'Budget Agent', description: 'AI cost optimizer', status: agentStatuses.budget, icon: '💰', color: 'success' },
    { id: 'weather', name: 'Weather Agent', description: 'Real-time weather data', status: agentStatuses.weather, icon: '🌤️', color: 'warning' },
    { id: 'hotel', name: 'Hotel Agent', description: 'AI accommodation finder', status: agentStatuses.hotel, icon: '🏨', color: 'accent' },
    { id: 'transport', name: 'Transport Agent', description: 'AI transport optimizer', status: agentStatuses.transport, icon: '🚗', color: 'info' },
    { id: 'itinerary', name: 'Itinerary Agent', description: 'AI trip planner', status: agentStatuses.itinerary, icon: '📋', color: 'secondary' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* AI Loading Screen */}
      <AILoadingScreen isVisible={isProcessing} />
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
              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-lg border bg-card flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="w-4 h-4 text-foreground" /> : <Sun className="w-4 h-4 text-foreground" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Only show when no plan */}
      {!travelPlan && (
        <section className="relative py-8 sm:py-16 overflow-hidden dark:bg-[linear-gradient(135deg,#020617,#020617,#030712)]">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-10"
            style={{ backgroundImage: `url(${heroAgents})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background dark:from-transparent dark:via-transparent dark:to-[#030712]" />
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6 animate-fade-in">
              <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Powered by Gemini AI + 6 Agents
            </div>
            <h2
              className="font-display text-2xl sm:text-4xl md:text-5xl font-bold text-foreground dark:text-[#F9FAFB] dark:font-bold mb-3 sm:mb-4 animate-fade-in dark:[text-shadow:0_4px_20px_rgba(59,130,246,0.2)]"
            >
              Your AI Travel Planning
              <span
                className="bg-clip-text text-transparent dark:[background-image:linear-gradient(90deg,#3B82F6,#8B5CF6)]"
                style={{ backgroundImage: 'var(--gradient-hero)', WebkitBackgroundClip: 'text' }}
              > Dream Team</span>
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground dark:text-[#D1D5DB] max-w-2xl mx-auto mb-6 sm:mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
              Watch Gemini-powered agents collaborate in real-time. 
              Weather-aware, budget-optimized, and fully personalized.
            </p>
            
            {/* Features */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-3xl mx-auto">
              <div className="bg-card/80 backdrop-blur rounded-xl p-3 sm:p-4 border animate-fade-in" style={{ animationDelay: '200ms' }}>
                <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-1 sm:mb-2" />
                <h3 className="font-semibold text-xs sm:text-sm dark:text-[#E5E7EB] dark:font-semibold">7 Agents</h3>
                <p className="text-xs text-muted-foreground dark:text-[#9CA3AF] mt-1 hidden sm:block">Each with unique expertise</p>
              </div>
              <div className="bg-card/80 backdrop-blur rounded-xl p-3 sm:p-4 border animate-fade-in" style={{ animationDelay: '300ms' }}>
                <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-warning mx-auto mb-1 sm:mb-2" />
                <h3 className="font-semibold text-xs sm:text-sm dark:text-[#E5E7EB] dark:font-semibold">Real-time</h3>
                <p className="text-xs text-muted-foreground dark:text-[#9CA3AF] mt-1 hidden sm:block">Live weather & pricing</p>
              </div>
              <div className="bg-card/80 backdrop-blur rounded-xl p-3 sm:p-4 border animate-fade-in" style={{ animationDelay: '400ms' }}>
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-accent mx-auto mb-1 sm:mb-2" />
                <h3 className="font-semibold text-xs sm:text-sm dark:text-[#E5E7EB] dark:font-semibold">Smart AI</h3>
                <p className="text-xs text-muted-foreground dark:text-[#9CA3AF] mt-1 hidden sm:block">Budget & preference aware</p>
              </div>
            </div>

            {/* CTA pointer to scroll down to input form */}
            <div className="mt-12 sm:mt-16">
              <button
                onClick={() => document.getElementById('plan-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="group inline-flex items-center gap-2 bg-gradient-to-br from-[#E8A871] via-[#C8814A] to-[#A86436] dark:from-[#11212D] dark:via-[#4A5C6A] dark:to-[#9BA8AB] text-white dark:text-white px-6 py-3 rounded-full font-medium dark:font-semibold text-sm shadow-[0_4px_20px_rgba(168,100,54,0.4)] dark:shadow-[0_4px_20px_rgba(17,33,45,0.5)] hover:shadow-[0_6px_28px_rgba(168,100,54,0.55)] dark:hover:shadow-[0_6px_28px_rgba(74,92,106,0.6)] transition-all hover:scale-105"
              >
                <Compass className="w-4 h-4" />
                Start Planning Your Trip
                <svg className="w-4 h-4 animate-bounce" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <main id="plan-section" className="container mx-auto px-4 py-8">
        {travelPlan ? (
          <TravelPlanDisplay plan={travelPlan} onReset={resetPlan} />
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div className="order-2 lg:order-1">
              <div className="bg-card rounded-2xl border p-6 shadow-lg">
                <h2 className="font-display font-bold text-xl mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    ✈️
                  </span>
                  Plan Your AI-Powered Trip
                </h2>
                <TravelInputForm onSubmit={generatePlan} isLoading={isProcessing} />
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
          <p>Multi-Agent Travel Planner</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
