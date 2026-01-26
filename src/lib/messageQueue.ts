import { AgentMessage, AgentType } from '@/types/agent';

type MessageHandler = (message: AgentMessage) => void;

class MessageQueue {
  private subscribers: Map<AgentType, MessageHandler[]> = new Map();
  private messageLog: AgentMessage[] = [];
  private globalListeners: ((message: AgentMessage) => void)[] = [];

  subscribe(agentId: AgentType, handler: MessageHandler): () => void {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, []);
    }
    this.subscribers.get(agentId)!.push(handler);

    return () => {
      const handlers = this.subscribers.get(agentId);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  onMessage(listener: (message: AgentMessage) => void): () => void {
    this.globalListeners.push(listener);
    return () => {
      const index = this.globalListeners.indexOf(listener);
      if (index > -1) {
        this.globalListeners.splice(index, 1);
      }
    };
  }

  send(message: Omit<AgentMessage, 'id' | 'timestamp'>): AgentMessage {
    const fullMessage: AgentMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.messageLog.push(fullMessage);

    // Notify global listeners
    this.globalListeners.forEach(listener => listener(fullMessage));

    // Notify specific agent subscribers
    const handlers = this.subscribers.get(message.to);
    if (handlers) {
      handlers.forEach(handler => handler(fullMessage));
    }

    // For broadcasts, notify all agents except sender
    if (message.type === 'broadcast') {
      this.subscribers.forEach((handlers, agentId) => {
        if (agentId !== message.from) {
          handlers.forEach(handler => handler(fullMessage));
        }
      });
    }

    return fullMessage;
  }

  getMessageLog(): AgentMessage[] {
    return [...this.messageLog];
  }

  clearLog(): void {
    this.messageLog = [];
  }
}

export const messageQueue = new MessageQueue();
