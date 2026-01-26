import { AgentType, AgentStatus, AgentMessage } from '@/types/agent';
import { messageQueue } from '@/lib/messageQueue';

export abstract class BaseAgent {
  protected id: AgentType;
  protected status: AgentStatus = 'idle';
  protected statusListeners: ((status: AgentStatus) => void)[] = [];

  constructor(id: AgentType) {
    this.id = id;
    this.setupMessageHandling();
  }

  private setupMessageHandling() {
    messageQueue.subscribe(this.id, (message) => {
      this.handleMessage(message);
    });
  }

  protected abstract handleMessage(message: AgentMessage): void;

  protected setStatus(status: AgentStatus) {
    this.status = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  onStatusChange(listener: (status: AgentStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      const index = this.statusListeners.indexOf(listener);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  protected sendMessage(to: AgentType, content: string, type: AgentMessage['type'] = 'request') {
    return messageQueue.send({
      from: this.id,
      to,
      content,
      type,
    });
  }

  protected broadcast(content: string) {
    return messageQueue.send({
      from: this.id,
      to: 'coordinator',
      content,
      type: 'broadcast',
    });
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getId(): AgentType {
    return this.id;
  }

  abstract process(data: unknown): Promise<unknown>;
}
