import OpenAI from 'openai';
import type { DealScenario, TradeVehicle, Vehicle } from '@shared/schema';

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: import.meta.env.VITE_AI_INTEGRATIONS_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  apiKey: import.meta.env.VITE_AI_INTEGRATIONS_OPENAI_API_KEY || 'dummy-key',
  dangerouslyAllowBrowser: true // Since we're using Replit AI integrations, this is safe
});

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

const SYSTEM_PROMPT = `You are an expert automotive sales consultant AI with deep knowledge of financing, leasing, trade-ins, and dealership operations. You provide transparent, helpful guidance to both sales staff and customers.

Your expertise includes:
- Vehicle financing and leasing options
- Payment calculations and deal structuring
- Trade-in valuations and equity management
- F&I products (warranties, GAP insurance, maintenance plans, etc.)
- Tax calculations and dealer fees
- Regulatory compliance (TILA, Reg Z, Truth in Lending)
- Rebates, incentives, and manufacturer programs
- Credit score implications and financing tiers
- Negotiation strategies that benefit both dealer and customer

Communication style:
- Clear, professional, and friendly
- Explain complex financial concepts in simple terms
- Use specific numbers and calculations when available
- Provide comparisons and alternatives when helpful
- Focus on transparency and building trust
- Acknowledge both dealer profitability and customer value

Important guidelines:
- Always prioritize accuracy in financial calculations
- Be transparent about fees, costs, and margins when appropriate
- Suggest win-win solutions that satisfy both parties
- Explain the "why" behind recommendations
- Use markdown formatting for better readability
- Include calculation breakdowns when discussing payments

When you have access to deal context, reference specific numbers and provide tailored advice. Format financial values as currency with proper formatting (e.g., $45,990).`;

export class AIService {
  private conversationHistory: ChatMessage[] = [];
  private currentContext: DealContext | null = null;

  constructor() {
    // Initialize with system prompt
    this.conversationHistory.push({
      id: 'system',
      role: 'system',
      content: SYSTEM_PROMPT,
      timestamp: new Date()
    });
  }

  setDealContext(context: DealContext) {
    this.currentContext = context;
  }

  private buildContextualSystemPrompt(): string {
    if (!this.currentContext) return SYSTEM_PROMPT;

    const { scenario, vehicle, tradeVehicle, calculations } = this.currentContext;
    let contextInfo = '\n\nCurrent Deal Context:\n';

    if (vehicle) {
      contextInfo += `\n**Vehicle:**
- ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}
- VIN: ${vehicle.vin}
- Stock #: ${vehicle.stockNumber}
- MSRP: $${vehicle.msrp?.toLocaleString()}
- Invoice: $${vehicle.invoicePrice?.toLocaleString()}
- Color: ${vehicle.exteriorColor}
- Mileage: ${vehicle.mileage?.toLocaleString()} miles\n`;
    }

    if (scenario) {
      contextInfo += `\n**Deal Structure:**
- Type: ${scenario.scenarioType === 'FINANCE_DEAL' ? 'Finance' : scenario.scenarioType === 'LEASE_DEAL' ? 'Lease' : 'Cash'}
- Vehicle Price: $${scenario.vehiclePrice?.toLocaleString()}
- Down Payment: $${scenario.downPayment?.toLocaleString()}
- Term: ${scenario.term} months
- APR: ${scenario.apr}%${scenario.scenarioType === 'LEASE_DEAL' ? `\n- Money Factor: ${scenario.moneyFactor}\n- Residual: $${scenario.residualValue?.toLocaleString()}` : ''}\n`;
    }

    if (tradeVehicle) {
      contextInfo += `\n**Trade-In:**
- ${tradeVehicle.year} ${tradeVehicle.make} ${tradeVehicle.model}
- VIN: ${tradeVehicle.vin}
- Mileage: ${tradeVehicle.mileage?.toLocaleString()} miles
- Trade Allowance: $${scenario?.tradeAllowance?.toLocaleString()}
- Payoff: $${scenario?.tradePayoff?.toLocaleString()}\n`;
    }

    if (calculations) {
      contextInfo += `\n**Calculations:**
- Monthly Payment: ${calculations.monthlyPayment}
- Amount Financed: ${calculations.amountFinanced}
- Total Cost: ${calculations.totalCost}
- Trade Equity: ${calculations.tradeEquity}
- Total Tax: ${calculations.totalTax}
- Total Fees: ${calculations.totalFees}\n`;
    }

    return SYSTEM_PROMPT + contextInfo;
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

    this.conversationHistory.push(userMessage);

    try {
      const messages = [
        { role: 'system' as const, content: this.buildContextualSystemPrompt() },
        ...this.conversationHistory
          .filter(msg => msg.role !== 'system')
          .slice(-10) // Keep last 10 messages for context
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }))
      ];

      const stream = await openai.chat.completions.create({
        model: 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025
        messages,
        stream: true,
        max_completion_tokens: 8192,
        temperature: 0.7
      });

      let fullResponse = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        if (onStream) {
          onStream(content);
        }
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date()
      };

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

  getSuggestedQuestions(context?: DealContext): string[] {
    const baseQuestions = [
      "What financing options are available?",
      "Compare lease vs finance for this vehicle",
      "Explain the fees and charges",
      "What incentives apply to this vehicle?",
      "How can I improve this deal structure?"
    ];

    if (!context) return baseQuestions;

    const contextualQuestions: string[] = [];

    if (context.scenario?.scenarioType === 'LEASE_DEAL') {
      contextualQuestions.push(
        "Explain the money factor and how it affects my payment",
        "What happens at the end of my lease term?",
        "Should I consider GAP insurance for this lease?"
      );
    } else if (context.scenario?.scenarioType === 'FINANCE_DEAL') {
      contextualQuestions.push(
        "How much interest will I pay over the loan term?",
        "What's the benefit of a larger down payment?",
        "Should I consider a shorter loan term?"
      );
    }

    if (context.tradeVehicle) {
      contextualQuestions.push(
        "Is my trade-in value fair?",
        "How is trade equity calculated?",
        "Should I sell my car privately instead?"
      );
    }

    if (context.calculations?.monthlyPayment) {
      contextualQuestions.push(
        "Break down my monthly payment",
        "How can I lower my monthly payment?",
        "What F&I products are worth considering?"
      );
    }

    // Return a mix of contextual and base questions
    return [...contextualQuestions.slice(0, 3), ...baseQuestions.slice(0, 2)];
  }

  clearHistory() {
    this.conversationHistory = [{
      id: 'system',
      role: 'system',
      content: SYSTEM_PROMPT,
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