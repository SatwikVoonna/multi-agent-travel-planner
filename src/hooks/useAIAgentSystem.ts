import { useState, useCallback, useEffect } from 'react';
import { TravelInput, TravelPlan, AgentMessage, AgentStatus } from '@/types/agent';
import { aiCoordinatorAgent } from '@/lib/agents/aiCoordinatorAgent';
import { aiBudgetAgent } from '@/lib/agents/aiBudgetAgent';
import { aiHotelAgent } from '@/lib/agents/aiHotelAgent';
import { aiTransportAgent } from '@/lib/agents/aiTransportAgent';
import { aiItineraryAgent } from '@/lib/agents/aiItineraryAgent';
import { weatherAgent } from '@/lib/agents/weatherAgent';
import { messageQueue } from '@/lib/messageQueue';

interface AgentStatuses {
  coordinator: AgentStatus;
  budget: AgentStatus;
  weather: AgentStatus;
  hotel: AgentStatus;
  transport: AgentStatus;
  itinerary: AgentStatus;
}

export function useAIAgentSystem() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatuses>({
    coordinator: 'idle',
    budget: 'idle',
    weather: 'idle',
    hotel: 'idle',
    transport: 'idle',
    itinerary: 'idle',
  });

  useEffect(() => {
    // Subscribe to message queue for real-time updates
    const unsubscribe = messageQueue.onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    // Subscribe to status changes from each agent
    const statusUnsubscribes = [
      aiCoordinatorAgent.onStatusChange((status) => {
        setAgentStatuses(prev => ({ ...prev, coordinator: status }));
      }),
      aiBudgetAgent.onStatusChange((status) => {
        setAgentStatuses(prev => ({ ...prev, budget: status }));
      }),
      weatherAgent.onStatusChange((status) => {
        setAgentStatuses(prev => ({ ...prev, weather: status }));
      }),
      aiHotelAgent.onStatusChange((status) => {
        setAgentStatuses(prev => ({ ...prev, hotel: status }));
      }),
      aiTransportAgent.onStatusChange((status) => {
        setAgentStatuses(prev => ({ ...prev, transport: status }));
      }),
      aiItineraryAgent.onStatusChange((status) => {
        setAgentStatuses(prev => ({ ...prev, itinerary: status }));
      }),
    ];

    return () => {
      unsubscribe();
      statusUnsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const generatePlan = useCallback(async (input: TravelInput) => {
    setIsProcessing(true);
    setError(null);
    setMessages([]);
    setTravelPlan(null);

    // Reset all agent statuses
    setAgentStatuses({
      coordinator: 'idle',
      budget: 'idle',
      weather: 'idle',
      hotel: 'idle',
      transport: 'idle',
      itinerary: 'idle',
    });

    try {
      const plan = await aiCoordinatorAgent.process(input);
      setTravelPlan(plan);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('AI Agent system error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const resetPlan = useCallback(() => {
    setTravelPlan(null);
    setMessages([]);
    setError(null);
    setAgentStatuses({
      coordinator: 'idle',
      budget: 'idle',
      weather: 'idle',
      hotel: 'idle',
      transport: 'idle',
      itinerary: 'idle',
    });
  }, []);

  return {
    isProcessing,
    travelPlan,
    messages,
    error,
    agentStatuses,
    generatePlan,
    resetPlan,
  };
}
