import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, MessageSquare, Bug, Lightbulb, MessageCircle, Palette, Zap, FileText, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const feedbackFormSchema = z.object({
  categoryId: z.string().optional(),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200, "Subject must be less than 200 characters"),
  message: z.string().min(20, "Message must be at least 20 characters").max(5000, "Message must be less than 5000 characters"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  isAnonymous: z.boolean(),
  contactEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  honeypot: z.string().optional(),
});

type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

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

const categoryIcons: Record<string, React.ReactNode> = {
  "bug-report": <Bug className="h-4 w-4" />,
  "feature-request": <Lightbulb className="h-4 w-4" />,
  "general-feedback": <MessageCircle className="h-4 w-4" />,
  "ux-ui-improvement": <Palette className="h-4 w-4" />,
  "performance-issue": <Zap className="h-4 w-4" />,
  "content-issue": <FileText className="h-4 w-4" />,
};

const priorityLabels = {
  low: { label: "Low", description: "Minor issue or suggestion" },
  medium: { label: "Medium", description: "Moderate impact" },
  high: { label: "High", description: "Significant issue" },
  critical: { label: "Critical", description: "Urgent, blocking issue" },
};

interface FeedbackWidgetProps {
  triggerClassName?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  triggerSize?: "default" | "sm" | "lg" | "icon";
}

export default function FeedbackWidget({
  triggerClassName,
  triggerVariant = "outline",
  triggerSize = "default",
}: FeedbackWidgetProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<FeedbackCategory[]>({
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
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      categoryId: undefined,
      subject: "",
      message: "",
      priority: "medium",
      isAnonymous: false,
      contactEmail: "",
      honeypot: "",
    },
  });

  const isAnonymous = form.watch("isAnonymous");

  const submitMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      const parsedCategoryId = data.categoryId && data.categoryId.trim() !== "" 
        ? parseInt(data.categoryId, 10) 
        : undefined;
      
      const payload: Record<string, unknown> = {
        subject: data.subject,
        message: data.message,
        priority: data.priority,
        isAnonymous: data.isAnonymous,
        pageUrl: window.location.href,
      };
      
      if (parsedCategoryId && !isNaN(parsedCategoryId)) {
        payload.categoryId = parsedCategoryId;
      }
      
      if (data.contactEmail && data.contactEmail.trim() !== "") {
        payload.contactEmail = data.contactEmail.trim();
      }

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit feedback");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Feedback submitted successfully!", {
        description: "Thank you for helping us improve TypeMasterAI.",
      });
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to submit feedback", {
        description: error.message,
      });
    },
  });

  const onSubmit = (data: FeedbackFormData) => {
    if (data.honeypot) {
      form.reset();
      setOpen(false);
      return;
    }
    submitMutation.mutate(data);
  };

  const activeCategories = categories.filter(c => c.isActive);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={`${triggerClassName} relative overflow-hidden group bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 hover:from-cyan-500 hover:via-purple-500 hover:to-pink-500 border-0 text-white transition-all duration-300 font-semibold`}
          data-testid="button-open-feedback"
          aria-label="Give feedback"
        >
          <MessageSquare className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
          <span>Feedback</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 bg-card border-border">
        <DialogHeader className="px-5 pt-5 pb-3 space-y-1.5">
          <DialogTitle className="text-xl font-semibold">Share feedback</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Help us improve TypeMasterAI
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="px-5 pb-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-xs font-medium">
              Category
            </Label>
            <Select
              value={form.watch("categoryId") || ""}
              onValueChange={(value) => form.setValue("categoryId", value)}
            >
              <SelectTrigger id="category" data-testid="select-feedback-category" className="h-10">
                <SelectValue placeholder="Select a category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {categoriesLoading ? (
                  <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                ) : activeCategories.length === 0 ? (
                  <SelectItem value="none" disabled>No categories available</SelectItem>
                ) : (
                  activeCategories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      <div className="flex items-center gap-2">
                        {categoryIcons[category.slug] || <MessageCircle className="h-4 w-4" />}
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-xs font-medium">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject"
              placeholder="Brief summary of your feedback"
              {...form.register("subject")}
              data-testid="input-feedback-subject"
              className="h-10"
            />
            {form.formState.errors.subject && (
              <p className="text-xs text-destructive" data-testid="text-error-subject">
                {form.formState.errors.subject.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-xs font-medium">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Describe your feedback in detail..."
              rows={3}
              {...form.register("message")}
              data-testid="textarea-feedback-message"
              className="resize-none"
            />
            {form.formState.errors.message && (
              <p className="text-xs text-destructive" data-testid="text-error-message">
                {form.formState.errors.message.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {form.watch("message")?.length || 0} / 5000
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority" className="text-xs font-medium">Priority</Label>
            <Select
              value={form.watch("priority")}
              onValueChange={(value) => form.setValue("priority", value as "low" | "medium" | "high" | "critical")}
            >
              <SelectTrigger id="priority" data-testid="select-feedback-priority" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(priorityLabels).map(([value, { label, description }]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">{description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {user && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="space-y-0">
                <Label htmlFor="anonymous" className="text-xs font-medium cursor-pointer">
                  Submit anonymously
                </Label>
              </div>
              <Switch
                id="anonymous"
                checked={form.watch("isAnonymous")}
                onCheckedChange={(checked) => form.setValue("isAnonymous", checked)}
                data-testid="switch-feedback-anonymous"
              />
            </div>
          )}

          {(isAnonymous || !user) && (
            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="text-xs font-medium">
                Contact email <span className="text-muted-foreground text-[10px]">(Optional)</span>
              </Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="your@email.com"
                {...form.register("contactEmail")}
                data-testid="input-feedback-email"
                className="h-9"
              />
              {form.formState.errors.contactEmail && (
                <p className="text-xs text-destructive" data-testid="text-error-email">
                  {form.formState.errors.contactEmail.message}
                </p>
              )}
            </div>
          )}

          <input
            type="text"
            {...form.register("honeypot")}
            className="absolute -left-[9999px] opacity-0 pointer-events-none"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel-feedback"
              className="flex-1 h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              data-testid="button-submit-feedback"
              className="flex-1 h-9 bg-primary hover:bg-primary/90"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit feedback"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
