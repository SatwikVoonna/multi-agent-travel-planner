import { Agent, AgentStatus } from '@/types/agent';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agent: Agent;
  isActive?: boolean;
}

const statusColors: Record<AgentStatus, string> = {
  idle: 'bg-muted',
  thinking: 'bg-warning animate-pulse',
  active: 'bg-primary animate-pulse-ring',
  completed: 'bg-success',
  error: 'bg-destructive',
};

const statusLabels: Record<AgentStatus, string> = {
  idle: 'Idle',
  thinking: 'Thinking...',
  active: 'Active',
  completed: 'Done',
  error: 'Error',
};

export function AgentCard({ agent, isActive }: AgentCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-card p-4 transition-all duration-300',
        'hover:shadow-lg hover:border-primary/30',
        isActive && 'ring-2 ring-primary shadow-glow',
        agent.status === 'thinking' && 'border-warning/50',
        agent.status === 'active' && 'border-primary/50',
        agent.status === 'completed' && 'border-success/50',
        agent.status === 'error' && 'border-destructive/50'
      )}
    >
      {/* Status indicator */}
      <div className="absolute -top-1.5 -right-1.5">
        <span
          className={cn(
            'flex h-4 w-4 rounded-full',
            statusColors[agent.status]
          )}
        >
          {(agent.status === 'thinking' || agent.status === 'active') && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75',
                agent.status === 'thinking' ? 'bg-warning' : 'bg-primary',
                'animate-ping'
              )}
            />
          )}
        </span>
      </div>

      {/* Agent icon and name */}
      <div className="flex items-start gap-3 mb-2">
        <span className="text-2xl shrink-0">{agent.icon}</span>
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-sm text-foreground leading-tight">
            {agent.name}
          </h3>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5 break-words">{agent.description}</p>
        </div>
      </div>

      {/* Status label */}
      <div className="mt-3 flex items-center justify-between">
        <span
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            agent.status === 'idle' && 'bg-muted text-muted-foreground',
            agent.status === 'thinking' && 'bg-warning/20 text-warning',
            agent.status === 'active' && 'bg-primary/20 text-primary',
            agent.status === 'completed' && 'bg-success/20 text-success',
            agent.status === 'error' && 'bg-destructive/20 text-destructive'
          )}
        >
          {statusLabels[agent.status]}
        </span>
      </div>
    </div>
  );
}
