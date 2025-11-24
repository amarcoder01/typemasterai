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
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Search,
  MoreVertical,
  Trash2,
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
    <div className="fixed inset-0 top-16 flex">
      {/* Sidebar - ChatGPT Dark Style */}
      <div
        className={cn(
          "bg-gradient-to-b from-zinc-950 to-zinc-900 border-r border-zinc-800 transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-0"
        )}
      >
        {sidebarOpen && (
          <>
            <div className="p-2.5">
              <Button
                onClick={() => createConversationMutation.mutate()}
                variant="outline"
                className="w-full justify-start gap-3 bg-transparent border-zinc-700 hover:bg-zinc-800/50 text-zinc-100"
                data-testid="button-new-chat"
              >
                <Plus className="w-4 h-4" />
                New chat
              </Button>
            </div>

            <div className="px-2.5 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-zinc-600"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
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

      {/* Toggle Sidebar Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-0 top-0 z-10 hover:bg-zinc-800/50"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        data-testid="button-toggle-sidebar"
      >
        {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </Button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4 max-w-2xl">
              <h1 className="text-4xl font-semibold tracking-tight" data-testid="text-welcome-heading">
                What can I help with?
              </h1>
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
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-7 prose-pre:bg-muted prose-pre:border">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Message AI Assistant..."
                className="min-h-[56px] max-h-[200px] resize-none border-0 bg-transparent px-5 py-4 pr-14 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isLoading}
                data-testid="input-chat-message"
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                size="icon"
                className={cn(
                  "absolute right-3 bottom-3 h-10 w-10 rounded-xl transition-all",
                  input.trim() && !isLoading 
                    ? "bg-primary hover:bg-primary/90" 
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
      <h3 className="px-3 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-0.5 px-1">
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
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={cn(
        "group relative px-3 py-2.5 rounded-lg cursor-pointer transition-all",
        isActive 
          ? "bg-zinc-800 text-zinc-100" 
          : "text-zinc-300 hover:bg-zinc-800/50"
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
      data-testid={`conversation-${conversation.id}`}
    >
      <div className="flex items-center gap-2.5">
        <MessageSquare className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm truncate flex-1">{conversation.title}</span>
        {showMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 flex-shrink-0 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-zinc-300 hover:bg-zinc-700 focus:bg-zinc-700 focus:text-zinc-100"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
