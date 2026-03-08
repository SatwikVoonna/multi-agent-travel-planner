import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

const floatingIcons = [
  { emoji: '✈️', size: 'text-3xl' },
  { emoji: '🧳', size: 'text-2xl' },
  { emoji: '🍕', size: 'text-2xl' },
  { emoji: '🍔', size: 'text-xl' },
  { emoji: '🌍', size: 'text-3xl' },
  { emoji: '📍', size: 'text-2xl' },
  { emoji: '🗺️', size: 'text-2xl' },
  { emoji: '🏝️', size: 'text-3xl' },
  { emoji: '🚆', size: 'text-2xl' },
  { emoji: '🚕', size: 'text-xl' },
  { emoji: '🍟', size: 'text-xl' },
  { emoji: '🏖️', size: 'text-2xl' },
  { emoji: '🎒', size: 'text-xl' },
  { emoji: '🌴', size: 'text-2xl' },
];

const planningMessages = [
  "Please wait while we craft your perfect adventure ✨",
  "Scanning the world for the best travel spots 🌍",
  "Our AI agents are negotiating the best deals 🤖",
  "Finding hidden gems and must-see attractions 🗺️",
  "Optimizing your trip for the best experience ✈️",
  "Calculating routes and travel times 🚆",
  "Looking for the best food spots nearby 🍕",
  "Checking the weather so you don't get caught in the rain ☀️",
  "Budget agent is making sure you don't go broke 💸",
  "Packing your itinerary with amazing memories 📍",
  "Packing snacks for the journey 🍟",
  "Convincing the budget agent to allow dessert 🍰",
  "Teaching the AI how to relax on the beach 🏖️",
  "Almost ready… your adventure awaits 🌴",
];

const funnyQuotes = [
  "The world is a book and those who do not travel read only one page.",
  "Travel is the only thing you buy that makes you richer.",
  "Adventure may hurt you but monotony will kill you.",
  "Catching flights, not feelings.",
  "Life is short and the world is wide.",
  "Work. Save. Travel. Repeat.",
];

interface AgentActivity {
  name: string;
  icon: string;
  message: string;
  color: string;
}

const agentActivities: AgentActivity[] = [
  { name: 'Weather Agent', icon: '☀️', message: 'Checking destination forecast', color: 'bg-warning/20 text-warning' },
  { name: 'Budget Agent', icon: '💰', message: 'Balancing your expenses', color: 'bg-success/20 text-success' },
  { name: 'Location Agent', icon: '📍', message: 'Discovering top attractions', color: 'bg-accent/20 text-accent' },
  { name: 'Transport Agent', icon: '✈️', message: 'Finding the fastest route', color: 'bg-primary/20 text-primary' },
  { name: 'Accommodation Agent', icon: '🏨', message: 'Searching cozy stays', color: 'bg-[hsl(280,70%,55%)]/20 text-[hsl(280,70%,55%)]' },
];

interface AILoadingScreenProps {
  isVisible: boolean;
}

export function AILoadingScreen({ isVisible }: AILoadingScreenProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeAgents, setActiveAgents] = useState<boolean[]>(new Array(agentActivities.length).fill(false));

  // Rotate planning messages every 2.5s
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % planningMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isVisible]);

  // Rotate quotes every 6s
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % funnyQuotes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isVisible]);

  // Simulate progress
  useEffect(() => {
    if (!isVisible) { setProgress(0); return; }
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) return 92; // Cap at 92% until done
        return prev + Math.random() * 3 + 0.5;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isVisible]);

  // Activate agents one by one
  useEffect(() => {
    if (!isVisible) { setActiveAgents(new Array(agentActivities.length).fill(false)); return; }
    agentActivities.forEach((_, i) => {
      setTimeout(() => {
        setActiveAgents(prev => { const next = [...prev]; next[i] = true; return next; });
      }, 800 + i * 1200);
    });
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md"
        >
          {/* Floating travel icons */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {floatingIcons.map((item, i) => (
              <motion.div
                key={i}
                className={`absolute ${item.size} opacity-20`}
                initial={{
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                  y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                }}
                animate={{
                  x: [
                    Math.random() * 300 + 50,
                    Math.random() * 600 + 100,
                    Math.random() * 400 + 50,
                  ],
                  y: [
                    Math.random() * 200 + 50,
                    Math.random() * 500 + 100,
                    Math.random() * 300 + 50,
                  ],
                  rotate: [0, 15, -10, 0],
                }}
                transition={{
                  duration: 12 + Math.random() * 10,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                  delay: i * 0.3,
                }}
              >
                {item.emoji}
              </motion.div>
            ))}
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto px-6 text-center">
            {/* Animated globe/compass */}
            <motion.div
              className="w-24 h-24 rounded-full gradient-hero flex items-center justify-center shadow-glow mb-8"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <span className="text-4xl">🌍</span>
            </motion.div>

            {/* Title */}
            <motion.h2
              className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Designing Your Dream Itinerary
            </motion.h2>

            {/* Rotating planning message */}
            <div className="h-8 mb-6">
              <AnimatePresence mode="wait">
                <motion.p
                  key={messageIndex}
                  className="text-muted-foreground text-sm md:text-base"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                >
                  {planningMessages[messageIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md mb-8">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {progress < 30 ? 'Gathering information...' : progress < 60 ? 'Agents collaborating...' : progress < 85 ? 'Finalizing your plan...' : 'Almost there...'}
              </p>
            </div>

            {/* Agent activity cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 w-full max-w-lg">
              {agentActivities.map((agent, i) => (
                <motion.div
                  key={agent.name}
                  className={`rounded-xl p-3 border transition-all ${activeAgents[i] ? agent.color + ' border-current/20' : 'bg-muted/50 border-transparent opacity-40'}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: activeAgents[i] ? 1 : 0.4,
                    scale: activeAgents[i] ? 1 : 0.95,
                  }}
                  transition={{ duration: 0.4, delay: i * 0.15 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{agent.icon}</span>
                    {activeAgents[i] && (
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-current"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <p className="text-[10px] font-semibold leading-tight">{agent.name}</p>
                  <p className="text-[9px] opacity-70 leading-tight mt-0.5">{agent.message}</p>
                </motion.div>
              ))}
            </div>

            {/* Funny quote */}
            <div className="h-12">
              <AnimatePresence mode="wait">
                <motion.p
                  key={quoteIndex}
                  className="text-xs italic text-muted-foreground/70 max-w-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  "{funnyQuotes[quoteIndex]}"
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
