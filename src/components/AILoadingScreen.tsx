import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

const floatingIcons = ['✈️', '🧳', '🍔', '🍕', '🌍', '📍', '🗺️', '🚆', '🏝️', '🚕'];

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
  "Packing snacks for the journey 🍟",
  "Convincing the budget agent to allow dessert 🍰",
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

const agentActivities = [
  { name: 'Weather Agent', icon: '☀️', message: 'Checking destination forecast', color: 'bg-warning/20 text-warning' },
  { name: 'Budget Agent', icon: '💰', message: 'Balancing your expenses', color: 'bg-success/20 text-success' },
  { name: 'Location Agent', icon: '📍', message: 'Discovering top attractions', color: 'bg-accent/20 text-accent' },
  { name: 'Transport Agent', icon: '✈️', message: 'Finding the fastest route', color: 'bg-primary/20 text-primary' },
  { name: 'Accommodation Agent', icon: '🏨', message: 'Searching cozy stays', color: 'bg-secondary/80 text-secondary-foreground' },
];

interface AILoadingScreenProps {
  isVisible: boolean;
}

export function AILoadingScreen({ isVisible }: AILoadingScreenProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeAgents, setActiveAgents] = useState<boolean[]>(new Array(agentActivities.length).fill(false));

  // Evenly distribute icons in a grid pattern with jitter
  const iconPositions = useMemo(() => {
    const cols = 4;
    const rows = Math.ceil(floatingIcons.length / cols);
    return floatingIcons.map((_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cellW = 80 / cols;
      const cellH = 80 / rows;
      return {
        left: 5 + col * cellW + Math.random() * cellW * 0.6,
        top: 5 + row * cellH + Math.random() * cellH * 0.6,
        driftX1: (Math.random() - 0.5) * 300,
        driftX2: (Math.random() - 0.5) * 250,
        driftX3: (Math.random() - 0.5) * 350,
        driftY1: (Math.random() - 0.5) * 250,
        driftY2: (Math.random() - 0.5) * 300,
        driftY3: (Math.random() - 0.5) * 200,
        spin1: 45 + Math.random() * 90,
        spin2: -(30 + Math.random() * 60),
        spin3: 20 + Math.random() * 70,
        duration: 10 + Math.random() * 8,
        delay: Math.random() * 2,
        size: 30 + Math.random() * 16,
      };
    });
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % planningMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % funnyQuotes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) { setProgress(0); return; }
    const interval = setInterval(() => {
      setProgress(prev => prev >= 92 ? 92 : prev + Math.random() * 3 + 0.5);
    }, 500);
    return () => clearInterval(interval);
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) { setActiveAgents(new Array(agentActivities.length).fill(false)); return; }
    const timers = agentActivities.map((_, i) =>
      setTimeout(() => {
        setActiveAgents(prev => { const next = [...prev]; next[i] = true; return next; });
      }, 800 + i * 1200)
    );
    return () => timers.forEach(clearTimeout);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md"
        >
          {/* Floating icons layer — full screen, behind content */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            {floatingIcons.map((emoji, i) => {
              const p = iconPositions[i];
              return (
                <motion.span
                  key={i}
                  className="absolute opacity-[0.15] select-none"
                  style={{ left: `${p.left}%`, top: `${p.top}%`, fontSize: p.size }}
                  animate={{
                    x: [0, p.driftX1, p.driftX2, p.driftX3, 0],
                    y: [0, p.driftY1, p.driftY2, p.driftY3, 0],
                    rotate: [0, p.rotate1, -p.rotate2, p.rotate1 * 0.5, 0],
                  }}
                  transition={{
                    duration: p.duration,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: p.delay,
                  }}
                >
                  {emoji}
                </motion.span>
              );
            })}
          </div>

          {/* Centered content */}
          <div className="relative z-10 flex items-center justify-center w-full h-full px-4">
            <div className="flex flex-col items-center max-w-xl w-full text-center">
              {/* Spinning globe */}
              <motion.div
                className="w-20 h-20 rounded-full gradient-hero flex items-center justify-center shadow-glow mb-6"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                <span className="text-3xl">🌍</span>
              </motion.div>

              {/* Title */}
              <motion.h2
                className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                Designing Your Dream Itinerary
              </motion.h2>

              {/* Rotating message */}
              <div className="h-7 mb-5">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={messageIndex}
                    className="text-muted-foreground text-sm"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                  >
                    {planningMessages[messageIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Progress */}
              <div className="w-full max-w-sm mb-6">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {progress < 30 ? 'Gathering information...' : progress < 60 ? 'Agents collaborating...' : progress < 85 ? 'Finalizing your plan...' : 'Almost there...'}
                </p>
              </div>

              {/* Agent cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6 w-full max-w-md">
                {agentActivities.map((agent, i) => (
                  <motion.div
                    key={agent.name}
                    className={`rounded-xl p-2.5 border transition-all ${activeAgents[i] ? agent.color + ' border-current/20' : 'bg-muted/40 border-transparent opacity-40'}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: activeAgents[i] ? 1 : 0.4, scale: activeAgents[i] ? 1 : 0.95 }}
                    transition={{ duration: 0.35, delay: i * 0.12 }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-base">{agent.icon}</span>
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

              {/* Quote */}
              <div className="h-10">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={quoteIndex}
                    className="text-xs italic text-muted-foreground/60 max-w-xs mx-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    "{funnyQuotes[quoteIndex]}"
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
