import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2,
  Send,
  Bot,
  User,
  Plus,
  ChevronRight,
  Search,
  MoreVertical,
  Trash2,
  Sparkles,
  Paperclip,
  PanelLeft,
  SquarePen,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
  isPinned: number;
  createdAt: string;
  updatedAt: string;
}

export default function Chat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversationsData } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const response = await fetch("/api/conversations", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch conversations");
      return response.json();
    },
    enabled: !!user,
  });

  const conversations = conversationsData?.conversations || [];

  const loadConversation = async (id: number) => {
    const response = await fetch(`/api/conversations/${id}/messages`, {
      credentials: "include",
    });
    const data = await response.json();
    setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content })));
    setCurrentConversationId(id);
  };

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "New Chat" }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setCurrentConversationId(data.conversation.id);
      setMessages([]);
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setCurrentConversationId(null);
      setMessages([]);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: [...messages, userMessage],
          conversationId: currentConversationId,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream");

      let assistantMessage = "";
      let newConvId = currentConversationId;
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              if (newConvId) {
                queryClient.invalidateQueries({ queryKey: ["conversations"] });
                if (!currentConversationId) {
                  setCurrentConversationId(newConvId);
                }
              }
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.conversationId && !currentConversationId) {
                newConvId = parsed.conversationId;
              }
              if (parsed.content) {
                assistantMessage += parsed.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantMessage,
                  };
                  return newMessages;
                });
              }
              if (parsed.error) throw new Error(parsed.error);
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const groupedConversations = () => {
    const now = new Date();
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const lastWeek: Conversation[] = [];
    const older: Conversation[] = [];

    conversations.forEach((conv: Conversation) => {
      const convDate = new Date(conv.updatedAt);
      const diffTime = now.getTime() - convDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);

      if (diffDays < 1) today.push(conv);
      else if (diffDays < 2) yesterday.push(conv);
      else if (diffDays < 7) lastWeek.push(conv);
      else older.push(conv);
    });

    return { today, yesterday, lastWeek, older };
  };

  const filtered = conversations.filter((c: Conversation) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { today, yesterday, lastWeek, older } = groupedConversations();

  return (
    <div className="fixed inset-0 top-16 flex z-40">
      {/* Sidebar - ChatGPT Dark Style */}
      <div
        className={cn(
          "bg-gradient-to-b from-zinc-950 to-zinc-900 border-r border-zinc-800 transition-all duration-300 flex flex-col relative",
          sidebarOpen ? "w-64" : "w-0"
        )}
      >
        {sidebarOpen && (
          <>
            {/* Top header with collapse and new chat icons */}
            <div className="flex items-center justify-between p-2 border-b border-zinc-800/50">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg hover:bg-zinc-800/50 text-zinc-300"
                onClick={() => setSidebarOpen(false)}
                data-testid="button-close-sidebar"
              >
                <PanelLeft className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => createConversationMutation.mutate()}
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg hover:bg-zinc-800/50 text-zinc-300"
                data-testid="button-new-chat-icon"
              >
                <SquarePen className="w-5 h-5" />
              </Button>
            </div>

            {/* New Chat Button */}
            <div className="px-2 pt-2 pb-2">
              <Button
                onClick={() => createConversationMutation.mutate()}
                variant="outline"
                className="w-full justify-start gap-2 h-10 rounded-lg bg-transparent border-zinc-700 hover:bg-zinc-800/50 text-zinc-100"
                data-testid="button-new-chat"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">New chat</span>
              </Button>
            </div>

            <div className="px-2 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-9 text-sm rounded-lg bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent px-1">
              {searchTerm ? (
                <div className="p-2">
                  {filtered.map((conv: Conversation) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={currentConversationId === conv.id}
                      onSelect={() => loadConversation(conv.id)}
                      onDelete={() => deleteConversationMutation.mutate(conv.id)}
                    />
                  ))}
                </div>
              ) : (
                <>
                  {today.length > 0 && (
                    <ConversationGroup
                      title="Today"
                      conversations={today}
                      currentId={currentConversationId}
                      onSelect={loadConversation}
                      onDelete={deleteConversationMutation.mutate}
                    />
                  )}
                  {yesterday.length > 0 && (
                    <ConversationGroup
                      title="Yesterday"
                      conversations={yesterday}
                      currentId={currentConversationId}
                      onSelect={loadConversation}
                      onDelete={deleteConversationMutation.mutate}
                    />
                  )}
                  {lastWeek.length > 0 && (
                    <ConversationGroup
                      title="Previous 7 Days"
                      conversations={lastWeek}
                      currentId={currentConversationId}
                      onSelect={loadConversation}
                      onDelete={deleteConversationMutation.mutate}
                    />
                  )}
                  {older.length > 0 && (
                    <ConversationGroup
                      title="Older"
                      conversations={older}
                      currentId={currentConversationId}
                      onSelect={loadConversation}
                      onDelete={deleteConversationMutation.mutate}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Open Sidebar Button - Only when closed */}
      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-2 z-50 h-8 w-8 rounded-full hover:bg-zinc-800/50"
          onClick={() => setSidebarOpen(true)}
          data-testid="button-open-sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-8 max-w-4xl w-full px-4">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>
              
              {/* Heading */}
              <h1 className="text-4xl font-semibold tracking-tight text-foreground" data-testid="text-welcome-heading">
                How can I help you today?
              </h1>
              
              {/* Suggestion Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto mt-6">
                <button
                  onClick={() => setInput("What are the best practices for improving typing speed?")}
                  className="group p-4 text-left rounded-2xl border border-border bg-background hover:bg-muted/50 transition-colors"
                  data-testid="suggestion-typing-speed"
                >
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Improve typing speed
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Learn techniques to type faster and more accurately
                  </div>
                </button>
                
                <button
                  onClick={() => setInput("How do I maintain proper typing posture?")}
                  className="group p-4 text-left rounded-2xl border border-border bg-background hover:bg-muted/50 transition-colors"
                  data-testid="suggestion-typing-posture"
                >
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Typing ergonomics
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Tips for healthy typing habits and posture
                  </div>
                </button>
                
                <button
                  onClick={() => setInput("What is a good typing speed for professionals?")}
                  className="group p-4 text-left rounded-2xl border border-border bg-background hover:bg-muted/50 transition-colors"
                  data-testid="suggestion-professional-speed"
                >
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Professional standards
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Average typing speeds for different professions
                  </div>
                </button>
                
                <button
                  onClick={() => setInput("How can I practice touch typing effectively?")}
                  className="group p-4 text-left rounded-2xl border border-border bg-background hover:bg-muted/50 transition-colors"
                  data-testid="suggestion-touch-typing"
                >
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Touch typing practice
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Effective methods to master touch typing
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="w-full">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-full py-8 px-4",
                    message.role === "assistant" ? "bg-muted/30" : "bg-background"
                  )}
                  data-testid={`message-${message.role}-${index}`}
                >
                  <div className="max-w-3xl mx-auto flex gap-6">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className={cn(
                        message.role === "assistant" 
                          ? "bg-gradient-to-br from-primary to-purple-600" 
                          : "bg-primary/10"
                      )}>
                        {message.role === "assistant" ? (
                          <Bot className="w-5 h-5 text-white" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2 overflow-hidden pt-1">
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-8 mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-2xl font-semibold mt-6 mb-3 text-foreground border-l-4 border-primary pl-4" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-5 mb-2 text-foreground" {...props} />,
                              p: ({node, ...props}) => <p className="leading-7 my-3 text-foreground/90" {...props} />,
                              ul: ({node, ...props}) => <ul className="my-4 space-y-2 pl-6" {...props} />,
                              ol: ({node, ...props}) => <ol className="my-4 space-y-2 pl-6 list-decimal" {...props} />,
                              li: ({node, ...props}) => (
                                <li className="leading-7 text-foreground/90 pl-2" {...props} />
                              ),
                              a: ({node, href, ...props}) => (
                                <a 
                                  href={href} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors inline-flex items-center gap-1 font-medium"
                                  {...props}
                                />
                              ),
                              code: ({node, inline, className, children, ...props}: any) => {
                                if (inline) {
                                  return (
                                    <code 
                                      className="bg-muted/60 text-foreground px-1.5 py-0.5 rounded text-sm font-mono border border-border/40"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  );
                                }
                                return (
                                  <code 
                                    className={`${className} block bg-muted/40 p-4 rounded-lg border border-border/40 overflow-x-auto text-sm font-mono`}
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                              pre: ({node, ...props}) => (
                                <pre className="my-4 bg-muted/40 rounded-lg border border-border/40 overflow-hidden" {...props} />
                              ),
                              blockquote: ({node, children, ...props}) => {
                                // Extract text content from children for admonition detection
                                const extractText = (children: any): string => {
                                  if (typeof children === 'string') return children;
                                  if (Array.isArray(children)) {
                                    return children.map(extractText).join('');
                                  }
                                  if (children?.props?.children) {
                                    return extractText(children.props.children);
                                  }
                                  return '';
                                };
                                
                                const text = extractText(children).trim().toLowerCase();
                                
                                // Check for admonition markers at the START of the blockquote
                                const notePattern = /^(\*\*note:?\*\*|ℹ️|📘|\*\*info:?\*\*|note:|info:)/i;
                                
                                if (notePattern.test(text)) {
                                  return (
                                    <blockquote className="border-l-4 border-blue-500 pl-4 py-3 my-4 bg-blue-500/10 rounded-r-lg text-foreground" {...props}>
                                      <div className="flex items-start gap-2">
                                        <span className="text-blue-500 text-lg flex-shrink-0 mt-0.5">ℹ️</span>
                                        <div className="flex-1">{children}</div>
                                      </div>
                                    </blockquote>
                                  );
                                }
                                
                                const warningPattern = /^(\*\*warning:?\*\*|⚠️|\*\*caution:?\*\*|warning:|caution:)/i;
                                const successPattern = /^(\*\*success:?\*\*|✅|✓|\*\*done:?\*\*|success:|done:)/i;
                                const dangerPattern = /^(\*\*danger:?\*\*|❌|\*\*error:?\*\*|\*\*critical:?\*\*|danger:|error:|critical:)/i;
                                const tipPattern = /^(\*\*tip:?\*\*|💡|\*\*hint:?\*\*|tip:|hint:)/i;
                                
                                if (warningPattern.test(text)) {
                                  return (
                                    <blockquote className="border-l-4 border-yellow-500 pl-4 py-3 my-4 bg-yellow-500/10 rounded-r-lg text-foreground" {...props}>
                                      <div className="flex items-start gap-2">
                                        <span className="text-yellow-500 text-lg flex-shrink-0 mt-0.5">⚠️</span>
                                        <div className="flex-1">{children}</div>
                                      </div>
                                    </blockquote>
                                  );
                                }
                                
                                if (successPattern.test(text)) {
                                  return (
                                    <blockquote className="border-l-4 border-green-500 pl-4 py-3 my-4 bg-green-500/10 rounded-r-lg text-foreground" {...props}>
                                      <div className="flex items-start gap-2">
                                        <span className="text-green-500 text-lg flex-shrink-0 mt-0.5">✅</span>
                                        <div className="flex-1">{children}</div>
                                      </div>
                                    </blockquote>
                                  );
                                }
                                
                                if (dangerPattern.test(text)) {
                                  return (
                                    <blockquote className="border-l-4 border-red-500 pl-4 py-3 my-4 bg-red-500/10 rounded-r-lg text-foreground" {...props}>
                                      <div className="flex items-start gap-2">
                                        <span className="text-red-500 text-lg flex-shrink-0 mt-0.5">❌</span>
                                        <div className="flex-1">{children}</div>
                                      </div>
                                    </blockquote>
                                  );
                                }
                                
                                if (tipPattern.test(text)) {
                                  return (
                                    <blockquote className="border-l-4 border-purple-500 pl-4 py-3 my-4 bg-purple-500/10 rounded-r-lg text-foreground" {...props}>
                                      <div className="flex items-start gap-2">
                                        <span className="text-purple-500 text-lg flex-shrink-0 mt-0.5">💡</span>
                                        <div className="flex-1">{children}</div>
                                      </div>
                                    </blockquote>
                                  );
                                }
                                
                                // Default blockquote (for sources and general quotes)
                                return (
                                  <blockquote className="border-l-4 border-primary/50 pl-4 py-3 my-4 bg-primary/5 rounded-r-lg text-foreground/90" {...props}>
                                    {children}
                                  </blockquote>
                                );
                              },
                              strong: ({node, ...props}) => (
                                <strong className="font-semibold text-foreground" {...props} />
                              ),
                              table: ({node, ...props}) => (
                                <div className="my-4 overflow-x-auto">
                                  <table className="min-w-full border-collapse border border-border/40 rounded-lg overflow-hidden" {...props} />
                                </div>
                              ),
                              thead: ({node, ...props}) => (
                                <thead className="bg-muted/40" {...props} />
                              ),
                              tbody: ({node, ...props}) => (
                                <tbody className="divide-y divide-border/40" {...props} />
                              ),
                              tr: ({node, ...props}) => (
                                <tr className="hover:bg-muted/20 transition-colors" {...props} />
                              ),
                              th: ({node, ...props}) => (
                                <th className="px-4 py-2 text-left font-semibold text-foreground border-r border-border/40 last:border-r-0" {...props} />
                              ),
                              td: ({node, ...props}) => (
                                <td className="px-4 py-2 text-foreground/90 border-r border-border/40 last:border-r-0" {...props} />
                              ),
                            }}
                          >
                            {message.content || "..."}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-7 text-foreground">
                          {message.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="w-full py-8 px-4 bg-muted/30">
                  <div className="max-w-3xl mx-auto flex gap-6">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600">
                        <Bot className="w-5 h-5 text-white" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 pt-1">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input Area - ChatGPT Style */}
        <div className="border-t border-border bg-background">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="relative bg-background border border-border rounded-3xl shadow-sm hover:shadow-md transition-shadow">
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-3 bottom-3 h-10 w-10 rounded-lg hover:bg-muted text-muted-foreground"
                disabled={isLoading}
                data-testid="button-attach-file"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message TypeMasterAI..."
                className="min-h-[56px] max-h-[200px] resize-none border-0 bg-transparent pl-14 pr-14 py-4 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isLoading}
                data-testid="input-chat-message"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                size="icon"
                className={cn(
                  "absolute right-3 bottom-3 h-10 w-10 rounded-full transition-all",
                  input.trim() && !isLoading 
                    ? "bg-foreground hover:bg-foreground/90 text-background" 
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                data-testid="button-send-message"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationGroup({
  title,
  conversations,
  currentId,
  onSelect,
  onDelete,
}: {
  title: string;
  conversations: Conversation[];
  currentId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="mb-3">
      <h3 className="px-3 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-1 px-2">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={currentId === conv.id}
            onSelect={() => onSelect(conv.id)}
            onDelete={() => onDelete(conv.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cn(
        "group relative px-3 py-2.5 rounded-lg cursor-pointer transition-all flex items-center gap-2",
        isActive 
          ? "bg-zinc-800/70 text-zinc-50" 
          : "text-zinc-300 hover:bg-zinc-800/40"
      )}
      onClick={onSelect}
      data-testid={`conversation-${conversation.id}`}
    >
      <span className="text-sm truncate flex-1 leading-tight">{conversation.title}</span>
      <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0", isOpen && "opacity-100")}>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100"
              data-testid={`button-menu-${conversation.id}`}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="bg-zinc-800 border-zinc-700 min-w-[160px]"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setIsOpen(false);
              }}
              className="text-zinc-300 hover:bg-zinc-700 focus:bg-zinc-700 focus:text-zinc-100 cursor-pointer"
              data-testid={`button-delete-${conversation.id}`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
