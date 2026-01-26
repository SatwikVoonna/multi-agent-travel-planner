import { Agent } from '@/types/agent';
import { AgentCard } from './AgentCard';
import { MessageFlow } from './MessageFlow';
import { AgentMessage } from '@/types/agent';

interface AgentVisualizationProps {
  agents: Agent[];
  messages: AgentMessage[];
}

export function AgentVisualization({ agents, messages }: AgentVisualizationProps) {
  // Separate coordinator from other agents
  const coordinator = agents.find(a => a.id === 'coordinator');
  const otherAgents = agents.filter(a => a.id !== 'coordinator' && a.id !== 'user');
  const userAgent = agents.find(a => a.id === 'user');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg">Agent Network</h2>
        <span className="text-xs text-muted-foreground">
          Real-time agent collaboration
        </span>
      </div>

      {/* Agent Grid */}
      <div className="relative">
        {/* User Agent */}
        {userAgent && (
          <div className="mb-4">
            <AgentCard agent={userAgent} />
          </div>
        )}

        {/* Coordinator in center */}
        {coordinator && (
          <div className="mb-4">
            <AgentCard agent={coordinator} isActive={coordinator.status === 'active'} />
          </div>
        )}

        {/* Other agents in grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {otherAgents.map((agent) => (
            <AgentCard 
              key={agent.id} 
              agent={agent} 
              isActive={agent.status === 'active' || agent.status === 'thinking'}
            />
          ))}
        </div>
      </div>

      {/* Message Flow */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-sm">Message Flow</h3>
          <span className="text-xs text-muted-foreground">
            {messages.length} messages
          </span>
        </div>
        <div className="bg-muted/30 rounded-xl p-4 border">
          <MessageFlow messages={messages} />
        </div>
      </div>
    </div>
  );
}
