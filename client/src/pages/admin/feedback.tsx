import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import { format, parseISO, subDays } from "date-fns";
import {
  MessageSquare, Search, Filter, RefreshCw, Loader2, AlertTriangle, ChevronLeft, ChevronRight,
  Clock, User, Tag, Flag, Activity, TrendingUp, Send, Eye, EyeOff, Archive,
  Bug, Lightbulb, MessageCircle, Palette, Zap, FileText, Shield, BarChart2, History
} from "lucide-react";
import { Link } from "wouter";

interface FeedbackCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface Feedback {
  id: number;
  userId: string | null;
  isAnonymous: boolean;
  contactEmail: string | null;
  categoryId: number | null;
  subject: string;
  message: string;
  priority: string;
  status: string;
  sentimentScore: number | null;
  sentimentLabel: string | null;
  aiCategoryId: number | null;
  aiSummary: string | null;
  aiPriorityScore: number | null;
  aiTags: string[] | null;
  aiProcessedAt: string | null;
  source: string;
  pageUrl: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  resolutionNotes: string | null;
  userNotified: boolean;
  isSpam: boolean;
  isArchived: boolean;
  upvotes: number;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackResponse {
  id: number;
  feedbackId: number;
  adminUserId: string;
  message: string;
  isInternalNote: boolean;
  templateName: string | null;
  createdAt: string;
  adminUsername?: string;
}

interface FeedbackStatusHistory {
  id: number;
  feedbackId: number;
  previousStatus: string | null;
  newStatus: string;
  previousPriority: string | null;
  newPriority: string | null;
  changedByUserId: string | null;
  changeReason: string | null;
  isAutomated: boolean;
  createdAt: string;
  changedByUsername?: string;
}

interface FeedbackListResponse {
  feedback: Feedback[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface FeedbackDetailResponse {
  feedback: Feedback;
  responses: FeedbackResponse[];
  history: FeedbackStatusHistory[];
  attachments: any[];
  category: FeedbackCategory | null;
}

interface AnalyticsData {
  totalFeedback: number;
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  sentimentBreakdown: { negative: number; neutral: number; positive: number };
  categoryBreakdown: Record<string, number>;
  averageResolutionTimeHours: number | null;
  recentTrend: number;
}

const categoryIcons: Record<string, React.ReactNode> = {
  "bug-report": <Bug className="h-4 w-4" />,
  "feature-request": <Lightbulb className="h-4 w-4" />,
  "general-feedback": <MessageCircle className="h-4 w-4" />,
  "ux-ui-improvement": <Palette className="h-4 w-4" />,
  "performance-issue": <Zap className="h-4 w-4" />,
  "content-issue": <FileText className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  new: "bg-blue-500",
  under_review: "bg-yellow-500",
  in_progress: "bg-purple-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
  wont_fix: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  new: "New",
  under_review: "Under Review",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  wont_fix: "Won't Fix",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  critical: "bg-red-600",
};

const sentimentColors: Record<string, string> = {
  negative: "#ef4444",
  neutral: "#6b7280",
  positive: "#22c55e",
};

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AdminFeedbackDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<number | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [statusChangeReason, setStatusChangeReason] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [newPriority, setNewPriority] = useState<string>("");

  const { data: adminCheck, isLoading: adminCheckLoading, error: adminCheckError } = useQuery({
    queryKey: ["feedback-admin-check"],
    queryFn: async () => {
      const res = await fetch("/api/admin/feedback?page=1&limit=1", { credentials: "include" });
      if (res.status === 403) {
        return { isAdmin: false };
      }
      if (!res.ok) throw new Error("Failed to check admin status");
      return { isAdmin: true };
    },
    retry: false,
  });

  const { data: categories = [] } = useQuery<FeedbackCategory[]>({
    queryKey: ["feedback-categories"],
    queryFn: async () => {
      const res = await fetch("/api/feedback/categories", { 
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      return data.categories || [];
    },
    enabled: adminCheck?.isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const { data: feedbackList, isLoading: feedbackLoading, refetch: refetchFeedback } = useQuery<FeedbackListResponse>({
    queryKey: ["admin-feedback-list", page, limit, statusFilter, priorityFilter, categoryFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);
      if (categoryFilter !== "all") params.append("categoryId", categoryFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/admin/feedback?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch feedback");
      return res.json();
    },
    enabled: adminCheck?.isAdmin,
    staleTime: 30000,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["admin-feedback-analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/feedback/analytics", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: adminCheck?.isAdmin,
    staleTime: 60000,
  });

  const { data: feedbackDetail, isLoading: detailLoading } = useQuery<FeedbackDetailResponse>({
    queryKey: ["admin-feedback-detail", selectedFeedbackId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/feedback/${selectedFeedbackId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch feedback detail");
      return res.json();
    },
    enabled: !!selectedFeedbackId && detailDialogOpen,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, priority, changeReason, resolutionNotes, notifyUser }: {
      id: number;
      status: string;
      priority?: string;
      changeReason?: string;
      resolutionNotes?: string;
      notifyUser?: boolean;
    }) => {
      const res = await fetch(`/api/admin/feedback/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, priority, changeReason, resolutionNotes, notifyUser }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-feedback-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-feedback-detail", selectedFeedbackId] });
      queryClient.invalidateQueries({ queryKey: ["admin-feedback-analytics"] });
      setStatusChangeReason("");
      setNewStatus("");
      setNewPriority("");
    },
    onError: (error: Error) => {
      toast.error("Failed to update status", { description: error.message });
    },
  });

  const addResponseMutation = useMutation({
    mutationFn: async ({ id, message, isInternalNote }: { id: number; message: string; isInternalNote: boolean }) => {
      const res = await fetch(`/api/admin/feedback/${id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message, isInternalNote }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add response");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Response added successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-feedback-detail", selectedFeedbackId] });
      setResponseMessage("");
      setIsInternalNote(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to add response", { description: error.message });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/feedback/${id}/archive`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to archive feedback");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Feedback archived");
      queryClient.invalidateQueries({ queryKey: ["admin-feedback-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-feedback-analytics"] });
      setDetailDialogOpen(false);
    },
    onError: () => {
      toast.error("Failed to archive feedback");
    },
  });

  const markSpamMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/feedback/${id}/spam`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark as spam");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Marked as spam");
      queryClient.invalidateQueries({ queryKey: ["admin-feedback-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-feedback-analytics"] });
      setDetailDialogOpen(false);
    },
    onError: () => {
      toast.error("Failed to mark as spam");
    },
  });

  const handleOpenDetail = (id: number) => {
    setSelectedFeedbackId(id);
    setDetailDialogOpen(true);
  };

  const handleStatusUpdate = () => {
    if (!selectedFeedbackId || !newStatus) return;
    updateStatusMutation.mutate({
      id: selectedFeedbackId,
      status: newStatus,
      priority: newPriority || undefined,
      changeReason: statusChangeReason || undefined,
    });
  };

  const handleAddResponse = () => {
    if (!selectedFeedbackId || !responseMessage.trim()) return;
    addResponseMutation.mutate({
      id: selectedFeedbackId,
      message: responseMessage.trim(),
      isInternalNote,
    });
  };

  if (adminCheckLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground mb-4">Please log in to access the admin dashboard.</p>
              <Link href="/login">
                <Button data-testid="link-login">Log In</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                You don't have permission to access the feedback admin dashboard.
              </p>
              <Link href="/">
                <Button variant="outline" data-testid="link-home">Return Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusChartData = analyticsData?.statusBreakdown
    ? Object.entries(analyticsData.statusBreakdown).map(([name, value]) => ({
        name: statusLabels[name] || name,
        value,
      }))
    : [];

  const sentimentChartData = analyticsData?.sentimentBreakdown
    ? [
        { name: "Negative", value: analyticsData.sentimentBreakdown.negative, fill: sentimentColors.negative },
        { name: "Neutral", value: analyticsData.sentimentBreakdown.neutral, fill: sentimentColors.neutral },
        { name: "Positive", value: analyticsData.sentimentBreakdown.positive, fill: sentimentColors.positive },
      ]
    : [];

  const priorityChartData = analyticsData?.priorityBreakdown
    ? Object.entries(analyticsData.priorityBreakdown).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feedback Dashboard</h1>
          <p className="text-muted-foreground">Manage and respond to user feedback</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchFeedback()} data-testid="button-refresh-feedback">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list" data-testid="tab-feedback-list">
            <MessageSquare className="h-4 w-4 mr-2" />
            Feedback List
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-feedback-analytics">
            <BarChart2 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search feedback..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                    data-testid="input-search-feedback"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[130px]" data-testid="select-filter-priority">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                    <SelectTrigger className="w-[150px]" data-testid="select-filter-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.filter(c => c.isActive).map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {feedbackLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !feedbackList?.feedback.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No feedback found matching your criteria.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">ID</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead className="w-[120px]">Category</TableHead>
                          <TableHead className="w-[100px]">Priority</TableHead>
                          <TableHead className="w-[120px]">Status</TableHead>
                          <TableHead className="w-[100px]">Sentiment</TableHead>
                          <TableHead className="w-[150px]">Created</TableHead>
                          <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feedbackList.feedback.map((fb) => {
                          const category = categories.find(c => c.id === fb.categoryId);
                          return (
                            <TableRow
                              key={fb.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleOpenDetail(fb.id)}
                              data-testid={`row-feedback-${fb.id}`}
                            >
                              <TableCell className="font-mono text-sm">#{fb.id}</TableCell>
                              <TableCell>
                                <div className="max-w-[300px] truncate font-medium">{fb.subject}</div>
                                {fb.isAnonymous && (
                                  <span className="text-xs text-muted-foreground">(Anonymous)</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {category ? (
                                  <div className="flex items-center gap-1.5">
                                    {categoryIcons[category.slug] || <Tag className="h-3.5 w-3.5" />}
                                    <span className="text-sm">{category.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={`${priorityColors[fb.priority]} text-white`}>
                                  {fb.priority.charAt(0).toUpperCase() + fb.priority.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className={`${statusColors[fb.status]} text-white`}>
                                  {statusLabels[fb.status] || fb.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {fb.sentimentLabel ? (
                                  <Badge
                                    variant="outline"
                                    style={{ borderColor: sentimentColors[fb.sentimentLabel] }}
                                    className="capitalize"
                                  >
                                    {fb.sentimentLabel}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(parseISO(fb.createdAt), "MMM d, yyyy HH:mm")}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => { e.stopPropagation(); handleOpenDetail(fb.id); }}
                                  data-testid={`button-view-feedback-${fb.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {feedbackList.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, feedbackList.pagination.total)} of {feedbackList.pagination.total} entries
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 1}
                          onClick={() => setPage(p => p - 1)}
                          data-testid="button-prev-page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Page {page} of {feedbackList.pagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= feedbackList.pagination.totalPages}
                          onClick={() => setPage(p => p + 1)}
                          data-testid="button-next-page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !analyticsData ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No analytics data available.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Feedback</p>
                        <p className="text-3xl font-bold">{analyticsData.totalFeedback}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-primary opacity-80" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Review</p>
                        <p className="text-3xl font-bold">
                          {(analyticsData.statusBreakdown?.new || 0) + (analyticsData.statusBreakdown?.under_review || 0)}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-500 opacity-80" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Resolved</p>
                        <p className="text-3xl font-bold">{analyticsData.statusBreakdown?.resolved || 0}</p>
                      </div>
                      <Activity className="h-8 w-8 text-green-500 opacity-80" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
                        <p className="text-3xl font-bold">
                          {analyticsData.averageResolutionTimeHours 
                            ? `${Math.round(analyticsData.averageResolutionTimeHours)}h`
                            : "—"}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-500 opacity-80" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {statusChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sentiment Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={sentimentChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {sentimentChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Priority Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={priorityChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <ChartTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                          }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : feedbackDetail ? (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl">
                      #{feedbackDetail.feedback.id}: {feedbackDetail.feedback.subject}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {feedbackDetail.feedback.isAnonymous ? "Anonymous" : `User ID: ${feedbackDetail.feedback.userId}`}
                      {feedbackDetail.feedback.contactEmail && ` • ${feedbackDetail.feedback.contactEmail}`}
                      {" • "}Submitted {format(parseISO(feedbackDetail.feedback.createdAt), "MMMM d, yyyy 'at' HH:mm")}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${priorityColors[feedbackDetail.feedback.priority]} text-white`}>
                      {feedbackDetail.feedback.priority.charAt(0).toUpperCase() + feedbackDetail.feedback.priority.slice(1)}
                    </Badge>
                    <Badge className={`${statusColors[feedbackDetail.feedback.status]} text-white`}>
                      {statusLabels[feedbackDetail.feedback.status]}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 pr-4">
                <Tabs defaultValue="details" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="responses">
                      Responses ({feedbackDetail.responses.length})
                    </TabsTrigger>
                    <TabsTrigger value="history">
                      History ({feedbackDetail.history.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Message</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap">{feedbackDetail.feedback.message}</p>
                        </CardContent>
                      </Card>

                      <div className="space-y-4">
                        {feedbackDetail.feedback.aiSummary && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                AI Analysis
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm">{feedbackDetail.feedback.aiSummary}</p>
                              {feedbackDetail.feedback.sentimentScore !== null && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Sentiment:</span>
                                  <Badge
                                    variant="outline"
                                    style={{ borderColor: sentimentColors[feedbackDetail.feedback.sentimentLabel || "neutral"] }}
                                    className="capitalize"
                                  >
                                    {feedbackDetail.feedback.sentimentLabel} ({(feedbackDetail.feedback.sentimentScore * 100).toFixed(0)}%)
                                  </Badge>
                                </div>
                              )}
                              {feedbackDetail.feedback.aiTags && feedbackDetail.feedback.aiTags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {feedbackDetail.feedback.aiTags.map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Update Status</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Status</Label>
                                <Select value={newStatus} onValueChange={setNewStatus}>
                                  <SelectTrigger data-testid="select-new-status">
                                    <SelectValue placeholder="Change status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(statusLabels).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Priority</Label>
                                <Select value={newPriority} onValueChange={setNewPriority}>
                                  <SelectTrigger data-testid="select-new-priority">
                                    <SelectValue placeholder="Change priority" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Reason (optional)</Label>
                              <Input
                                value={statusChangeReason}
                                onChange={(e) => setStatusChangeReason(e.target.value)}
                                placeholder="Why are you changing the status?"
                                data-testid="input-status-reason"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={handleStatusUpdate}
                              disabled={!newStatus || updateStatusMutation.isPending}
                              data-testid="button-update-status"
                            >
                              {updateStatusMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              Update Status
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Add Response</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Textarea
                          value={responseMessage}
                          onChange={(e) => setResponseMessage(e.target.value)}
                          placeholder="Write your response..."
                          rows={4}
                          data-testid="textarea-response"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              id="internal-note"
                              checked={isInternalNote}
                              onCheckedChange={setIsInternalNote}
                              data-testid="switch-internal-note"
                            />
                            <Label htmlFor="internal-note" className="text-sm">
                              {isInternalNote ? (
                                <span className="flex items-center gap-1">
                                  <EyeOff className="h-3.5 w-3.5" />
                                  Internal note (not visible to user)
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5" />
                                  Public response
                                </span>
                              )}
                            </Label>
                          </div>
                          <Button
                            size="sm"
                            onClick={handleAddResponse}
                            disabled={!responseMessage.trim() || addResponseMutation.isPending}
                            data-testid="button-send-response"
                          >
                            {addResponseMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Send className="h-4 w-4 mr-2" />
                            )}
                            Send
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => archiveMutation.mutate(feedbackDetail.feedback.id)}
                        disabled={archiveMutation.isPending}
                        data-testid="button-archive-feedback"
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => markSpamMutation.mutate(feedbackDetail.feedback.id)}
                        disabled={markSpamMutation.isPending}
                        data-testid="button-mark-spam"
                      >
                        Mark as Spam
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="responses" className="space-y-3">
                    {feedbackDetail.responses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No responses yet.</p>
                    ) : (
                      feedbackDetail.responses.map((response) => (
                        <Card key={response.id} className={response.isInternalNote ? "border-dashed border-yellow-500/50" : ""}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {response.adminUsername || `Admin #${response.adminUserId.slice(0, 8)}`}
                                </span>
                                {response.isInternalNote && (
                                  <Badge variant="outline" className="text-xs">
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    Internal
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(response.createdAt), "MMM d, yyyy HH:mm")}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{response.message}</p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="space-y-3">
                    {feedbackDetail.history.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No status history.</p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                        {feedbackDetail.history.map((entry, index) => (
                          <div key={entry.id} className="relative pl-10 pb-4">
                            <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary" />
                            <div className="text-sm">
                              <p className="font-medium">
                                {entry.previousStatus ? (
                                  <>
                                    Status: {statusLabels[entry.previousStatus]} → {statusLabels[entry.newStatus]}
                                  </>
                                ) : (
                                  <>Status set to {statusLabels[entry.newStatus]}</>
                                )}
                              </p>
                              {entry.previousPriority && entry.newPriority && entry.previousPriority !== entry.newPriority && (
                                <p className="text-muted-foreground">
                                  Priority: {entry.previousPriority} → {entry.newPriority}
                                </p>
                              )}
                              {entry.changeReason && (
                                <p className="text-muted-foreground italic">"{entry.changeReason}"</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {entry.isAutomated ? "Automated" : entry.changedByUsername || "Admin"} •{" "}
                                {format(parseISO(entry.createdAt), "MMM d, yyyy HH:mm")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </ScrollArea>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
