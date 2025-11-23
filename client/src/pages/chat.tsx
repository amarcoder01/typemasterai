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
  Pin,
  Trash2,
  Edit2,
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
      {/* Sidebar */}
      <div
        className={cn(
          "bg-background border-r border-border transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-80" : "w-0"
        )}
      >
        {sidebarOpen && (
          <>
            <div className="p-3 border-b border-border">
              <Button
                onClick={() => createConversationMutation.mutate()}
                className="w-full"
                data-testid="button-new-chat"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>

            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
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
        className="absolute left-0 top-0 z-10"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </Button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-6 max-w-2xl">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">How can I help you today?</h2>
                <p className="text-muted-foreground">
                  I'm powered by GPT-4 with web search. Ask me anything!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn("flex gap-4", message.role === "user" ? "justify-end" : "")}
                >
                  {message.role === "assistant" && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600">
                        <Bot className="w-4 h-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 max-w-[80%]",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content || "..."}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  {message.role === "user" && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-secondary">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600">
                      <Bot className="w-4 h-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto flex gap-3">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Message AI Assistant..."
              className="min-h-[56px] max-h-[200px] resize-none"
              disabled={isLoading}
              data-testid="input-chat-message"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="h-[56px] w-[56px] flex-shrink-0"
              data-testid="button-send-message"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            AI can make mistakes. Verify important information.
          </p>
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
    <div className="mb-4">
      <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={cn(
        "group relative px-3 py-2 rounded-lg cursor-pointer transition-colors",
        isActive ? "bg-accent" : "hover:bg-accent/50"
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm truncate flex-1">{conversation.title}</span>
        {showMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
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
