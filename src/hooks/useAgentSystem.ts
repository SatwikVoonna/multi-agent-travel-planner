import { useState, useEffect, useCallback } from 'react';
import { AgentMessage, AgentStatus, AgentType, TravelInput, TravelPlan, Agent } from '@/types/agent';
import { messageQueue } from '@/lib/messageQueue';
import { coordinatorAgent } from '@/lib/agents/coordinatorAgent';
import { weatherAgent } from '@/lib/agents/weatherAgent';
import { budgetAgent } from '@/lib/agents/budgetAgent';
import { hotelAgent } from '@/lib/agents/hotelAgent';
import { transportAgent } from '@/lib/agents/transportAgent';
import { itineraryAgent } from '@/lib/agents/itineraryAgent';

const agentDefinitions: Agent[] = [
  { id: 'user', name: 'User Agent', description: 'Collects and validates user inputs', status: 'idle', icon: '👤', color: 'agent-user' },
  { id: 'coordinator', name: 'Coordinator', description: 'Orchestrates all agents', status: 'idle', icon: '🎯', color: 'agent-coordinator' },
  { id: 'weather', name: 'Weather Agent', description: 'Fetches real-time weather', status: 'idle', icon: '🌤️', color: 'agent-weather' },
  { id: 'budget', name: 'Budget Agent', description: 'Tracks and validates budget', status: 'idle', icon: '💰', color: 'agent-budget' },
  { id: 'hotel', name: 'Hotel Agent', description: 'Finds accommodations', status: 'idle', icon: '🏨', color: 'agent-hotel' },
  { id: 'transport', name: 'Transport Agent', description: 'Optimizes transport', status: 'idle', icon: '✈️', color: 'agent-transport' },
  { id: 'itinerary', name: 'Itinerary Agent', description: 'Plans daily activities', status: 'idle', icon: '📅', color: 'agent-itinerary' },
];

export function useAgentSystem() {
  const [agents, setAgents] = useState<Agent[]>(agentDefinitions);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to message queue
  useEffect(() => {
    const unsubscribe = messageQueue.onMessage((message) => {
      setMessages(prev => [...prev.slice(-50), message]); // Keep last 50 messages
    });

    return unsubscribe;
  }, []);

  // Subscribe to agent status changes
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const agentInstances = [
      { agent: coordinatorAgent, id: 'coordinator' as AgentType },
      { agent: weatherAgent, id: 'weather' as AgentType },
      { agent: budgetAgent, id: 'budget' as AgentType },
      { agent: hotelAgent, id: 'hotel' as AgentType },
      { agent: transportAgent, id: 'transport' as AgentType },
      { agent: itineraryAgent, id: 'itinerary' as AgentType },
    ];

    agentInstances.forEach(({ agent, id }) => {
      const unsub = agent.onStatusChange((status) => {
        setAgents(prev => prev.map(a => 
          a.id === id ? { ...a, status } : a
        ));
      });
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const startPlanning = useCallback(async (input: TravelInput) => {
    setIsPlanning(true);
    setError(null);
    setTravelPlan(null);
    setMessages([]);
    
    // Reset all agents to idle
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle' as AgentStatus })));
    
    // Set user agent as active
    setAgents(prev => prev.map(a => 
      a.id === 'user' ? { ...a, status: 'completed' as AgentStatus } : a
    ));

    // Add initial user message
    messageQueue.send({
      from: 'user',
      to: 'coordinator',
      content: `Planning trip to ${input.destination} for ${input.travelers} travelers`,
      type: 'request',
    });

    try {
      const plan = await coordinatorAgent.process(input);
      setTravelPlan(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Planning failed');
    } finally {
      setIsPlanning(false);
    }
  }, []);

  const resetPlanning = useCallback(() => {
    setTravelPlan(null);
    setMessages([]);
    setError(null);
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle' as AgentStatus })));
    messageQueue.clearLog();
  }, []);

  return {
    agents,
    messages,
    isPlanning,
    travelPlan,
    error,
    startPlanning,
    resetPlanning,
  };
}
