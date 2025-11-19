import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  ChevronDown,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Sparkles,
  Bot,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { aiService, type ChatMessage, type DealContext } from '@/lib/ai-service';
import { ScenarioFormContext, useScenarioForm } from '@/contexts/scenario-form-context';
import { useContext } from 'react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

export function AIChatCompanion() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Get deal context if available (only in deal worksheet)
  const scenarioContext = useContext(ScenarioFormContext);
  
  // Build deal context for AI service
  const dealContext = useMemo<DealContext | undefined>(() => {
    if (!scenarioContext) return undefined;
    
    const { scenario, calculations } = scenarioContext;
    
    return {
      scenario,
      vehicle: undefined, // TODO: Get vehicle from deal
      tradeVehicle: scenarioContext.tradeVehicle,
      calculations: {
        monthlyPayment: calculations.monthlyPayment.toFixed(2),
        totalCost: calculations.totalCost.toFixed(2),
        amountFinanced: calculations.amountFinanced.toFixed(2),
        tradeEquity: calculations.tradeEquity.toFixed(2),
        totalTax: calculations.totalTax.toFixed(2),
        totalFees: calculations.totalFees.toFixed(2),
      }
    };
  }, [scenarioContext]);
  
  // Update AI service context when deal changes
  useEffect(() => {
    if (dealContext) {
      aiService.setDealContext(dealContext);
    }
  }, [dealContext]);
  
  // Get suggested questions based on context
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  
  useEffect(() => {
    const loadSuggestions = async () => {
      const suggestions = await aiService.getSuggestedQuestions(dealContext);
      setSuggestedQuestions(suggestions);
    };
    loadSuggestions();
  }, [dealContext]);
  
  // Load chat history on mount
  useEffect(() => {
    const history = aiService.getHistory();
    setMessages(history);
  }, []);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);
  
  // Auto-fullscreen on mobile when opened
  useEffect(() => {
    if (isMobile && isOpen) {
      setIsFullscreen(true);
    }
  }, [isMobile, isOpen]);
  
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userInput = input;
    setInput('');
    setIsTyping(true);
    setStreamingMessage('');
    
    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      let fullResponse = '';
      
      await aiService.sendMessage(userInput, (chunk) => {
        fullResponse += chunk;
        setStreamingMessage(fullResponse);
      });
      
      // Add the complete AI message
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date()
      }]);
      
      setStreamingMessage('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message. Please try again.',
      });
    } finally {
      setIsTyping(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied',
      description: 'Message copied to clipboard',
    });
  };
  
  const handleExportChat = () => {
    const markdown = aiService.exportHistory();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deal-chat-${format(new Date(), 'yyyy-MM-dd-HHmm')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported',
      description: 'Chat history exported successfully',
    });
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  return (
    <>
      {/* Floating chat bubble */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn(
              "fixed z-50",
              isMobile ? "bottom-20 right-4" : "bottom-8 right-8"
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  onClick={() => setIsOpen(true)}
                  data-testid="button-open-ai-chat"
                >
                  <MessageCircle className="h-6 w-6" />
                  <Sparkles className="h-3 w-3 absolute top-2 right-2 text-yellow-300" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>AI Deal Assistant</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className={cn(
              "fixed z-50 flex flex-col",
              isFullscreen ? 
                "inset-0" : 
                isMobile ? 
                  "inset-x-0 bottom-0 h-[80vh] rounded-t-2xl" :
                  "bottom-8 right-8 w-[400px] h-[600px] rounded-2xl",
              "bg-background/80 backdrop-blur-xl border shadow-2xl"
            )}
            data-testid="ai-chat-window"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-background/50">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bot className="h-6 w-6 text-primary" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold">AI Deal Assistant</h3>
                  <p className="text-xs text-muted-foreground">Powered by GPT-5</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleExportChat}
                      data-testid="button-export-chat"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export chat</p>
                  </TooltipContent>
                </Tooltip>
                {!isMobile && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={toggleFullscreen}
                        data-testid="button-toggle-fullscreen"
                      >
                        {isFullscreen ? 
                          <Minimize2 className="h-4 w-4" /> : 
                          <Maximize2 className="h-4 w-4" />
                        }
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-close-chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Deal context banner */}
            {dealContext && dealContext.scenario && (
              <div className="px-4 py-2 bg-primary/10 border-b">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-xs">
                    {dealContext.scenario.scenarioType === 'FINANCE_DEAL' ? 'Finance' : 
                     dealContext.scenario.scenarioType === 'LEASE_DEAL' ? 'Lease' : 'Cash'}
                  </Badge>
                  <span className="text-muted-foreground">
                    ${dealContext.calculations?.monthlyPayment}/mo • 
                    {dealContext.scenario.term} months
                  </span>
                </div>
              </div>
            )}
            
            {/* Messages area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Welcome message if no messages */}
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
                  >
                    <Bot className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                    <h3 className="text-lg font-semibold mb-2">Hello! I'm your AI Deal Assistant</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      I can help you structure deals, explain financing options, analyze trade-ins, and much more.
                    </p>
                    
                    {/* Suggested questions */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
                      {suggestedQuestions.slice(0, 3).map((question, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left"
                          onClick={() => {
                            setInput(question);
                            inputRef.current?.focus();
                          }}
                          data-testid={`button-suggestion-${i}`}
                        >
                          <Sparkles className="h-3 w-3 mr-2" />
                          {question}
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                )}
                
                {/* Message list */}
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onCopy={() => handleCopyMessage(message.content)}
                  />
                ))}
                
                {/* Streaming message */}
                {streamingMessage && (
                  <MessageBubble
                    message={{
                      id: 'streaming',
                      role: 'assistant',
                      content: streamingMessage,
                      timestamp: new Date()
                    }}
                    isStreaming
                  />
                )}
                
                {/* Typing indicator */}
                {isTyping && !streamingMessage && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Bot className="h-5 w-5" />
                    <div className="flex gap-1">
                      <span className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {/* Quick suggestions */}
            {messages.length > 0 && !isTyping && (
              <div className="px-4 pb-2">
                <ScrollArea className="w-full">
                  <div className="flex gap-2">
                    {suggestedQuestions.slice(0, 3).map((question, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap text-xs"
                        onClick={() => {
                          setInput(question);
                          inputRef.current?.focus();
                        }}
                        data-testid={`button-quick-suggestion-${i}`}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {/* Input area */}
            <div className="p-4 border-t bg-background/50">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about deals, financing, trade-ins..."
                  disabled={isTyping}
                  className="flex-1"
                  data-testid="input-chat-message"
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isTyping}
                  data-testid="button-send-message"
                >
                  {isTyping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Message bubble component
function MessageBubble({ 
  message, 
  onCopy, 
  isStreaming = false 
}: { 
  message: ChatMessage; 
  onCopy?: () => void;
  isStreaming?: boolean;
}) {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse"
      )}
      data-testid={`message-${message.id}`}
    >
      {/* Avatar */}
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      
      {/* Message content */}
      <div className={cn(
        "flex-1 space-y-1",
        isUser && "flex flex-col items-end"
      )}>
        <div className={cn(
          "rounded-xl px-3 py-2 max-w-[85%]",
          isUser ? 
            "bg-primary text-primary-foreground" : 
            "bg-muted/50 backdrop-blur-sm border"
        )}>
          {/* Render markdown content */}
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
            {message.content.split('\n').map((paragraph, i) => {
              // Handle code blocks
              if (paragraph.startsWith('```')) {
                return (
                  <pre key={i} className="bg-background/50 p-2 rounded text-xs overflow-x-auto">
                    <code>{paragraph.replace(/```/g, '')}</code>
                  </pre>
                );
              }
              
              // Handle bullet points
              if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                return (
                  <li key={i} className="ml-4">
                    {paragraph.substring(2)}
                  </li>
                );
              }
              
              // Handle bold text
              let formattedParagraph = paragraph.replace(
                /\*\*(.*?)\*\*/g,
                '<strong>$1</strong>'
              );
              
              // Handle inline code
              formattedParagraph = formattedParagraph.replace(
                /`(.*?)`/g,
                '<code class="bg-background/50 px-1 rounded">$1</code>'
              );
              
              return (
                <p 
                  key={i} 
                  dangerouslySetInnerHTML={{ __html: formattedParagraph }}
                />
              );
            })}
            {isStreaming && (
              <span className="inline-block w-1 h-4 bg-current animate-pulse" />
            )}
          </div>
        </div>
        
        {/* Message actions and timestamp */}
        <div className={cn(
          "flex items-center gap-2",
          isUser && "flex-row-reverse"
        )}>
          <span className="text-[10px] text-muted-foreground">
            {format(message.timestamp, 'HH:mm')}
          </span>
          {!isUser && !isStreaming && onCopy && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onCopy}
              data-testid={`button-copy-${message.id}`}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Hook to safely get scenario context
function useGetScenarioContext() {
  try {
    return useScenarioForm();
  } catch {
    // Context not available (not in a deal worksheet)
    return null;
  }
}