import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2,
  Send,
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
  Copy,
  Check,
  RefreshCw,
  Square,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Clock,
  Zap,
  BookOpen,
  Code,
  MessageSquare,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  feedback?: "up" | "down" | null;
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7 rounded-md hover:bg-muted", className)}
      onClick={handleCopy}
      data-testid="button-copy"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
      )}
    </Button>
  );
}

function CodeBlock({ language, children }: { language?: string; children: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const displayLanguage = language?.replace(/^language-/, '') || 'code';
  
  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 dark:bg-zinc-900 border-b border-zinc-700 rounded-t-lg">
        <span className="text-xs text-zinc-400 font-mono">{displayLanguage}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
          onClick={handleCopy}
          data-testid="button-copy-code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className="bg-zinc-800 dark:bg-zinc-900 p-4 rounded-b-lg overflow-x-auto">
        <code className="text-sm font-mono text-zinc-100">{children}</code>
      </pre>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-full animate-pulse" style={{ animationDelay: "0ms", animationDuration: "1s" }} />
        <span className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-full animate-pulse" style={{ animationDelay: "200ms", animationDuration: "1s" }} />
        <span className="w-2.5 h-2.5 bg-gradient-to-r from-primary to-purple-500 rounded-full animate-pulse" style={{ animationDelay: "400ms", animationDuration: "1s" }} />
      </div>
      <span className="text-sm text-muted-foreground font-medium">Generating response...</span>
    </div>
  );
}

function AIIcon({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <div className={cn("relative", animated && "animate-pulse")}>
      <Sparkles className={cn("text-white", className)} />
      {animated && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-purple-500/50 rounded-full blur-sm animate-ping" style={{ animationDuration: "2s" }} />
      )}
    </div>
  );
}

function formatTimestamp(date?: Date): string {
  if (!date) return "";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    try {
      const response = await fetch(`/api/conversations/${id}/messages`, {
        credentials: "include",
      });
      if (!response.ok) {
        console.error("Failed to load conversation");
        return;
      }
      const data = await response.json();
      setMessages(data.messages?.map((m: any) => ({ 
        role: m.role, 
        content: m.content,
        timestamp: m.createdAt ? new Date(m.createdAt) : undefined,
      })) || []);
      setCurrentConversationId(id);
    } catch (error) {
      console.error("Error loading conversation:", error);
      setMessages([]);
    }
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

  const renameConversationMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error("Failed to rename conversation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast({
        title: "Renamed",
        description: "Conversation renamed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Rename Failed",
        description: "Could not rename conversation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRename = (id: number, newTitle: string) => {
    renameConversationMutation.mutate({ id, title: newTitle });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!validTypes.includes(file.type)) {
      alert('Unsupported file type. Please upload an image (JPG, PNG, GIF, WebP), PDF, Word document, or text file.');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
  };

  const analyzeFile = async (file: File): Promise<string> => {
    setIsAnalyzingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/analyze-file', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to analyze file');
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('File analysis error:', error);
      throw error;
    } finally {
      setIsAnalyzingFile(false);
    }
  };

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, []);

  const sendMessage = async (regenerateFromIndex?: number) => {
    const isRegenerating = regenerateFromIndex !== undefined;
    
    if (!isRegenerating && (!input.trim() && !uploadedFile) || isLoading) return;

    let messageContent = isRegenerating ? "" : input;
    let fileAnalysis = "";
    let messagesToSend = [...messages];

    if (isRegenerating) {
      messagesToSend = messages.slice(0, regenerateFromIndex);
      const lastUserMessage = messagesToSend.filter(m => m.role === "user").pop();
      if (lastUserMessage) {
        messageContent = lastUserMessage.content;
      }
      setMessages(messagesToSend);
    } else if (uploadedFile) {
      try {
        fileAnalysis = await analyzeFile(uploadedFile);
        messageContent = `${input}\n\n[Attached file: ${uploadedFile.name}]\n\n${fileAnalysis}`;
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error analyzing file: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, timestamp: new Date() },
        ]);
        setUploadedFile(null);
        setIsAnalyzingFile(false);
        return;
      }
    }

    const userMessage: Message = { role: "user", content: messageContent, timestamp: new Date() };
    
    if (!isRegenerating) {
      setMessages((prev) => [...prev, userMessage]);
      messagesToSend = [...messages, userMessage];
    }
    
    setInput("");
    setUploadedFile(null);
    setIsLoading(true);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: messagesToSend,
          conversationId: currentConversationId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream");

      let assistantMessage = "";
      let newConvId = currentConversationId;
      setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date() }]);

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
                    timestamp: new Date(),
                  };
                  return newMessages;
                });
              }
              if (parsed.error) throw new Error(parsed.error);
            } catch (e) {}
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again.", timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleFeedback = (index: number, feedback: "up" | "down") => {
    setMessages((prev) => {
      const newMessages = [...prev];
      newMessages[index] = {
        ...newMessages[index],
        feedback: newMessages[index].feedback === feedback ? null : feedback,
      };
      return newMessages;
    });
  };

  const regenerateResponse = (messageIndex: number) => {
    if (isLoading) return;
    sendMessage(messageIndex);
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
    <TooltipProvider delayDuration={300}>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg hover:bg-zinc-800/50 text-zinc-300"
                    onClick={() => setSidebarOpen(false)}
                    data-testid="button-close-sidebar"
                  >
                    <PanelLeft className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Close sidebar</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => createConversationMutation.mutate()}
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg hover:bg-zinc-800/50 text-zinc-300"
                    data-testid="button-new-chat-icon"
                  >
                    <SquarePen className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>New chat</p>
                </TooltipContent>
              </Tooltip>
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
                      onRename={(newTitle) => handleRename(conv.id, newTitle)}
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
                      onRename={handleRename}
                    />
                  )}
                  {yesterday.length > 0 && (
                    <ConversationGroup
                      title="Yesterday"
                      conversations={yesterday}
                      currentId={currentConversationId}
                      onSelect={loadConversation}
                      onDelete={deleteConversationMutation.mutate}
                      onRename={handleRename}
                    />
                  )}
                  {lastWeek.length > 0 && (
                    <ConversationGroup
                      title="Previous 7 Days"
                      conversations={lastWeek}
                      currentId={currentConversationId}
                      onSelect={loadConversation}
                      onDelete={deleteConversationMutation.mutate}
                      onRename={handleRename}
                    />
                  )}
                  {older.length > 0 && (
                    <ConversationGroup
                      title="Older"
                      conversations={older}
                      currentId={currentConversationId}
                      onSelect={loadConversation}
                      onDelete={deleteConversationMutation.mutate}
                      onRename={handleRename}
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-2 z-50 h-8 w-8 rounded-full hover:bg-zinc-800/50"
              onClick={() => setSidebarOpen(true)}
              data-testid="button-open-sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Open sidebar</p>
          </TooltipContent>
        </Tooltip>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto mt-6">
                <button
                  onClick={() => setInput("What are the best practices for improving typing speed?")}
                  className="group p-4 text-left rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all"
                  data-testid="suggestion-typing-speed"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                      <Zap className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors text-sm">
                    Improve speed
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Type faster & accurately
                  </div>
                </button>
                
                <button
                  onClick={() => setInput("How do I maintain proper typing posture and prevent strain?")}
                  className="group p-4 text-left rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all"
                  data-testid="suggestion-typing-posture"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-green-500/10">
                      <User className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors text-sm">
                    Ergonomics
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Healthy typing habits
                  </div>
                </button>
                
                <button
                  onClick={() => setInput("What keyboard shortcuts should every programmer know?")}
                  className="group p-4 text-left rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all"
                  data-testid="suggestion-keyboard-shortcuts"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/10">
                      <Code className="w-4 h-4 text-purple-500" />
                    </div>
                  </div>
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors text-sm">
                    Shortcuts
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Essential keyboard tips
                  </div>
                </button>
                
                <button
                  onClick={() => setInput("How can I practice touch typing effectively?")}
                  className="group p-4 text-left rounded-2xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all"
                  data-testid="suggestion-touch-typing"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-orange-500/10">
                      <BookOpen className="w-4 h-4 text-orange-500" />
                    </div>
                  </div>
                  <div className="font-medium text-foreground group-hover:text-primary transition-colors text-sm">
                    Touch typing
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Master typing technique
                  </div>
                </button>
              </div>
              
              {/* Capabilities row */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat with AI</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" />
                  <span>Web search</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Analyze files</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" />
                  <span>Code help</span>
                </div>
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
                    "w-full py-6 px-4 group/message",
                    message.role === "assistant" ? "bg-muted/30" : "bg-background"
                  )}
                  data-testid={`message-${message.role}-${index}`}
                >
                  <div className="max-w-3xl mx-auto flex gap-4">
                    <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                      <AvatarFallback className={cn(
                        message.role === "assistant" 
                          ? "bg-gradient-to-br from-primary to-purple-600" 
                          : "bg-primary/10"
                      )}>
                        {message.role === "assistant" ? (
                          <AIIcon className="w-5 h-5" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2 overflow-hidden">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {message.role === "assistant" ? "TypeMasterAI" : "You"}
                        </span>
                        {message.timestamp && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(message.timestamp)}
                          </span>
                        )}
                      </div>
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
                                const codeString = String(children).replace(/\n$/, '');
                                return <CodeBlock language={className}>{codeString}</CodeBlock>;
                              },
                              pre: ({node, children, ...props}) => {
                                return <>{children}</>;
                              },
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
                      
                      {/* Message Actions */}
                      <div className={cn(
                        "flex items-center gap-1 mt-3 pt-2 border-t border-border/30 opacity-0 group-hover/message:opacity-100 transition-opacity",
                        message.content && "opacity-100 sm:opacity-0"
                      )}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CopyButton text={message.content} />
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p>Copy message</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        {message.role === "assistant" && message.content && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-7 w-7 rounded-md hover:bg-muted",
                                    message.feedback === "up" && "text-green-500 bg-green-500/10"
                                  )}
                                  onClick={() => handleFeedback(index, "up")}
                                  data-testid={`button-thumbs-up-${index}`}
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>Good response</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-7 w-7 rounded-md hover:bg-muted",
                                    message.feedback === "down" && "text-red-500 bg-red-500/10"
                                  )}
                                  onClick={() => handleFeedback(index, "down")}
                                  data-testid={`button-thumbs-down-${index}`}
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>Bad response</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-md hover:bg-muted"
                                  onClick={() => regenerateResponse(index)}
                                  disabled={isLoading}
                                  data-testid={`button-regenerate-${index}`}
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>Regenerate response</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading / Streaming indicator */}
              {isLoading && !isStreaming && (
                <div className="w-full py-6 px-4 bg-muted/30">
                  <div className="max-w-3xl mx-auto flex gap-4">
                    <Avatar className="w-8 h-8 flex-shrink-0 mt-1 animate-pulse">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600">
                        <AIIcon className="w-5 h-5" animated />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">TypeMasterAI</span>
                      </div>
                      <TypingIndicator />
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              {/* File Preview */}
              {uploadedFile && (
                <div className="px-14 pt-3">
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border">
                    <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground flex-1 truncate">
                      {uploadedFile.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-background"
                      onClick={() => setUploadedFile(null)}
                    >
                      <span className="text-xs">×</span>
                    </Button>
                  </div>
                </div>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-3 bottom-3 h-10 w-10 rounded-lg hover:bg-muted text-muted-foreground"
                    disabled={isLoading || isAnalyzingFile}
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-attach-file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Attach image, PDF, or document</p>
                </TooltipContent>
              </Tooltip>
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
              {isStreaming ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={stopGeneration}
                      size="icon"
                      className="absolute right-3 bottom-3 h-10 w-10 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all"
                      data-testid="button-stop-generation"
                    >
                      <Square className="w-4 h-4 fill-current" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Stop generating</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => sendMessage()}
                      disabled={isLoading || (!input.trim() && !uploadedFile)}
                      size="icon"
                      className={cn(
                        "absolute right-3 bottom-3 h-10 w-10 rounded-full transition-all",
                        (input.trim() || uploadedFile) && !isLoading 
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
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{isLoading ? 'Sending...' : 'Send message'}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="flex items-center justify-between mt-3 px-1">
              <span className={cn(
                "text-xs transition-colors",
                input.length > 4000 ? "text-red-500" : "text-muted-foreground"
              )}>
                {input.length > 0 && `${input.length.toLocaleString()} characters`}
              </span>
              <p className="text-xs text-muted-foreground">
                AI can make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}

function ConversationGroup({
  title,
  conversations,
  currentId,
  onSelect,
  onDelete,
  onRename,
}: {
  title: string;
  conversations: Conversation[];
  currentId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onRename: (id: number, newTitle: string) => void;
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
            onRename={(newTitle) => onRename(conv.id, newTitle)}
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
  onRename,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editTitle with conversation.title when it changes (after successful rename)
  useEffect(() => {
    setEditTitle(conversation.title);
  }, [conversation.title]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== conversation.title) {
      onRename(editTitle.trim());
    } else {
      setEditTitle(conversation.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditTitle(conversation.title);
      setIsEditing(false);
    }
    // Stop propagation to prevent Radix keyboard navigation
    e.stopPropagation();
  };

  return (
    <div
      className={cn(
        "group relative px-3 py-2.5 rounded-lg cursor-pointer transition-all flex items-center gap-2",
        isActive 
          ? "bg-zinc-800/70 text-zinc-50" 
          : "text-zinc-300 hover:bg-zinc-800/40"
      )}
      onClick={isEditing ? undefined : onSelect}
      data-testid={`conversation-${conversation.id}`}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-1 text-sm bg-zinc-700 text-zinc-100 px-2 py-1 rounded border border-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary"
          data-testid={`input-rename-${conversation.id}`}
        />
      ) : (
        <span className="text-sm truncate flex-1 leading-tight">{conversation.title}</span>
      )}
      <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0", (isOpen || isEditing) && "opacity-100")}>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
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
            onCloseAutoFocus={(e) => {
              // Prevent dropdown from stealing focus when closing
              // This is the KEY fix for the rename issue
              if (isEditing) {
                e.preventDefault();
                inputRef.current?.focus();
              }
            }}
          >
            <DropdownMenuItem
              onSelect={(e) => {
                // Prevent default close behavior
                e.preventDefault();
                setIsEditing(true);
                setIsOpen(false);
              }}
              className="text-zinc-300 hover:bg-zinc-700 focus:bg-zinc-700 focus:text-zinc-100 cursor-pointer"
              data-testid={`button-rename-${conversation.id}`}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                onDelete();
                setIsOpen(false);
              }}
              className="text-red-400 hover:bg-zinc-700 focus:bg-zinc-700 focus:text-red-300 cursor-pointer"
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
