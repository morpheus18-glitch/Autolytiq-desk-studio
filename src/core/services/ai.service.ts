/**
 * AI SERVICE
 *
 * Core AI integration service providing intelligent deal assistance.
 * Uses OpenAI GPT models for automotive sales guidance and deal analysis.
 *
 * Features:
 * - Deal context-aware chat
 * - Financial calculations explanation
 * - Suggested questions based on deal context
 * - Streaming responses
 * - Conversation history management
 *
 * @module CoreServices
 */

import OpenAI from 'openai';
import type { DealScenario, TradeVehicle, Vehicle } from '@shared/schema';

// This uses Replit's AI Integrations service, which provides OpenAI-compatible API access
// The newest OpenAI model is "gpt-5" which was released August 7, 2025
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || 'dummy-key',
});

/**
 * Chat message structure
 */
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

/**
 * Deal context for AI assistance
 */
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

/**
 * System prompt for AI assistant
 */
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

/**
 * AI Service
 *
 * Provides intelligent deal assistance using GPT models.
 */
export class AIService {
  /**
   * Build contextual system prompt with deal data
   */
  private buildContextualSystemPrompt(context?: DealContext): string {
    if (!context) return SYSTEM_PROMPT;

    const { scenario, vehicle, tradeVehicle, calculations } = context;
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

  /**
   * Send message to AI and get response
   */
  async sendMessage(
    message: string,
    conversationHistory: ChatMessage[],
    context?: DealContext,
    onStream?: (chunk: string) => void
  ): Promise<ChatMessage> {
    try {
      const messages = [
        { role: 'system' as const, content: this.buildContextualSystemPrompt(context) },
        ...conversationHistory
          .filter((msg) => msg.role !== 'system')
          .slice(-10) // Keep last 10 messages for context
          .map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
        { role: 'user' as const, content: message },
      ];

      const stream = await openai.chat.completions.create({
        model: 'gpt-5', // The newest OpenAI model is "gpt-5" which was released August 7, 2025
        messages,
        stream: true,
        max_completion_tokens: 8192,
        temperature: 0.7,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        if (onStream) {
          onStream(content);
        }
      }

      return {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('AI Service Error:', error);

      // Fallback response
      return {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content:
          "I apologize, but I'm having trouble processing your request right now. Please try again or contact support if the issue persists.",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get suggested questions based on deal context
   */
  getSuggestedQuestions(context?: DealContext): string[] {
    const baseQuestions = [
      'What financing options are available?',
      'Compare lease vs finance for this vehicle',
      'Explain the fees and charges',
      'What incentives apply to this vehicle?',
      'How can I improve this deal structure?',
    ];

    if (!context) return baseQuestions;

    const contextualQuestions: string[] = [];

    if (context.scenario?.scenarioType === 'LEASE_DEAL') {
      contextualQuestions.push(
        'Explain the money factor and how it affects my payment',
        'What happens at the end of my lease term?',
        'Should I consider GAP insurance for this lease?'
      );
    } else if (context.scenario?.scenarioType === 'FINANCE_DEAL') {
      contextualQuestions.push(
        'How much interest will I pay over the loan term?',
        "What's the benefit of a larger down payment?",
        'Should I consider a shorter loan term?'
      );
    }

    if (context.tradeVehicle) {
      contextualQuestions.push(
        'Is my trade-in value fair?',
        'How is trade equity calculated?',
        'Should I sell my car privately instead?'
      );
    }

    if (context.calculations?.monthlyPayment) {
      contextualQuestions.push(
        'Break down my monthly payment',
        'How do taxes affect my payment?',
        'What F&I products are worth considering?'
      );
    }

    return [...baseQuestions, ...contextualQuestions].slice(0, 8);
  }
}

/**
 * Export singleton instance
 */
export const aiService = new AIService();
