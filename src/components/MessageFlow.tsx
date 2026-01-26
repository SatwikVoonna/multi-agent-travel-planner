import { AgentMessage, AgentType } from '@/types/agent';
import { cn } from '@/lib/utils';
import { useRef, useEffect } from 'react';

interface MessageFlowProps {
  messages: AgentMessage[];
}

const agentColors: Record<AgentType, string> = {
  user: 'bg-agent-user',
  coordinator: 'bg-agent-coordinator',
  weather: 'bg-agent-weather',
  budget: 'bg-agent-budget',
  hotel: 'bg-agent-hotel',
  transport: 'bg-agent-transport',
  itinerary: 'bg-agent-itinerary',
};

const agentIcons: Record<AgentType, string> = {
  user: '👤',
  coordinator: '🎯',
  weather: '🌤️',
  budget: '💰',
  hotel: '🏨',
  transport: '✈️',
  itinerary: '📅',
};

export function MessageFlow({ messages }: MessageFlowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        <div className="text-center">
          <div className="text-3xl mb-2">💬</div>
          <p>Agent messages will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin"
    >
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={cn(
            'flex items-start gap-2 p-2 rounded-lg bg-muted/50',
            'animate-fade-in',
            message.type === 'broadcast' && 'bg-primary/10 border border-primary/20'
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* From agent */}
          <span
            className={cn(
              'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs',
              agentColors[message.from],
              'text-white'
            )}
          >
            {agentIcons[message.from]}
          </span>

          {/* Arrow */}
          <span className="text-muted-foreground text-xs self-center">→</span>

          {/* To agent */}
          <span
            className={cn(
              'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs',
              agentColors[message.to],
              'text-white'
            )}
          >
            {agentIcons[message.to]}
          </span>

          {/* Message content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate">{message.content}</p>
            <span className="text-[10px] text-muted-foreground">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>

          {/* Message type badge */}
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0',
              message.type === 'request' && 'bg-primary/20 text-primary',
              message.type === 'response' && 'bg-success/20 text-success',
              message.type === 'notification' && 'bg-warning/20 text-warning',
              message.type === 'broadcast' && 'bg-accent/20 text-accent'
            )}
          >
            {message.type}
          </span>
        </div>
      ))}
    </div>
  );
}
