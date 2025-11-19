import type { DealScenario, TradeVehicle, Vehicle } from '@shared/schema';

// All AI operations now go through the backend API to protect API keys

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    dealId?: string;
    scenarioId?: string;
    suggestions?: string[];
  };
}

export interface DealContext {
  scenario?: DealScenario;
  vehicle?: Vehicle;
  tradeVehicle?: TradeVehicle | null;
  calculations?: {
    monthlyPayment: string;
    totalCost: string;
    amountFinanced: string;
    tradeEquity: string;
    totalTax: string;
    totalFees: string;
  };
}

export class AIService {
  private conversationHistory: ChatMessage[] = [];
  private currentContext: DealContext | null = null;

  constructor() {
    // Initialize with local system message (not sent to server)
    this.conversationHistory.push({
      id: 'system',
      role: 'system',
      content: 'AI Deal Assistant initialized',
      timestamp: new Date()
    });
  }

  setDealContext(context: DealContext) {
    this.currentContext = context;
  }

  async sendMessage(
    message: string,
    onStream?: (chunk: string) => void
  ): Promise<ChatMessage> {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    // Add user message to history
    this.conversationHistory.push(userMessage);

    try {
      // Prepare request body
      const requestBody = {
        message,
        conversationHistory: this.conversationHistory
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toISOString()
          })),
        context: this.currentContext
      };

      // Make request to backend API with SSE support
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let assistantMessage: ChatMessage | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr.trim()) {
                try {
                  const data = JSON.parse(dataStr);
                  
                  if (data.type === 'chunk' && data.content) {
                    fullResponse += data.content;
                    if (onStream) {
                      onStream(data.content);
                    }
                  } else if (data.type === 'complete' && data.message) {
                    assistantMessage = data.message;
                    if (assistantMessage) {
                      assistantMessage.timestamp = new Date(assistantMessage.timestamp);
                    }
                  } else if (data.type === 'error') {
                    throw new Error(data.error || 'Stream error');
                  }
                } catch (e) {
                  // Skip invalid JSON
                  console.warn('Failed to parse SSE data:', dataStr);
                }
              }
            }
          }
        }
      }

      // Use the complete message from server or construct from streamed response
      if (!assistantMessage) {
        assistantMessage = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: fullResponse || 'No response received',
          timestamp: new Date()
        };
      }

      this.conversationHistory.push(assistantMessage);
      return assistantMessage;
    } catch (error) {
      console.error('AI Service Error:', error);
      
      // Fallback response
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again or contact support if the issue persists.",
        timestamp: new Date()
      };

      this.conversationHistory.push(errorMessage);
      return errorMessage;
    }
  }

  async getSuggestedQuestions(context?: DealContext): Promise<string[]> {
    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: context || this.currentContext }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      // Return default suggestions on error
      return [
        "What financing options are available?",
        "Compare lease vs finance for this vehicle",
        "Explain the fees and charges",
        "What incentives apply to this vehicle?",
        "How can I improve this deal structure?"
      ];
    }
  }

  clearHistory() {
    this.conversationHistory = [{
      id: 'system',
      role: 'system',
      content: 'AI Deal Assistant initialized',
      timestamp: new Date()
    }];
  }

  getHistory(): ChatMessage[] {
    return this.conversationHistory.filter(msg => msg.role !== 'system');
  }

  exportHistory(): string {
    const messages = this.getHistory();
    let markdown = '# AI Deal Assistant Conversation\n\n';
    markdown += `**Date:** ${new Date().toLocaleString()}\n\n`;
    
    if (this.currentContext?.vehicle) {
      const v = this.currentContext.vehicle;
      markdown += `**Vehicle:** ${v.year} ${v.make} ${v.model}\n\n`;
    }

    markdown += '---\n\n';

    messages.forEach(msg => {
      const role = msg.role === 'user' ? '**You**' : '**AI Assistant**';
      const time = msg.timestamp.toLocaleTimeString();
      markdown += `${role} (${time}):\n${msg.content}\n\n`;
    });

    return markdown;
  }
}

// Singleton instance
export const aiService = new AIService();