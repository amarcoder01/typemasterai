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
import { Loader2, MessageSquarePlus, Bug, Lightbulb, MessageCircle, Palette, Zap, FileText } from "lucide-react";
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
      const res = await fetch("/api/feedback/categories", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
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
          className={triggerClassName}
          data-testid="button-open-feedback"
        >
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Help us improve TypeMasterAI by sharing your thoughts, reporting bugs, or suggesting new features.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={form.watch("categoryId") || ""}
              onValueChange={(value) => form.setValue("categoryId", value)}
            >
              <SelectTrigger id="category" data-testid="select-feedback-category">
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
            <Label htmlFor="subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject"
              placeholder="Brief summary of your feedback"
              {...form.register("subject")}
              data-testid="input-feedback-subject"
            />
            {form.formState.errors.subject && (
              <p className="text-sm text-destructive" data-testid="text-error-subject">
                {form.formState.errors.subject.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Describe your feedback in detail. Include steps to reproduce if reporting a bug."
              rows={5}
              {...form.register("message")}
              data-testid="textarea-feedback-message"
            />
            {form.formState.errors.message && (
              <p className="text-sm text-destructive" data-testid="text-error-message">
                {form.formState.errors.message.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {form.watch("message")?.length || 0} / 5000 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={form.watch("priority")}
              onValueChange={(value) => form.setValue("priority", value as "low" | "medium" | "high" | "critical")}
            >
              <SelectTrigger id="priority" data-testid="select-feedback-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(priorityLabels).map(([value, { label, description }]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex flex-col">
                      <span>{label}</span>
                      <span className="text-xs text-muted-foreground">{description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {user && (
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="anonymous" className="text-sm font-medium">
                  Submit Anonymously
                </Label>
                <p className="text-xs text-muted-foreground">
                  Your username won't be attached to this feedback
                </p>
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
              <Label htmlFor="contactEmail">Contact Email (Optional)</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="your@email.com"
                {...form.register("contactEmail")}
                data-testid="input-feedback-email"
              />
              <p className="text-xs text-muted-foreground">
                Provide an email if you'd like us to follow up on your feedback
              </p>
              {form.formState.errors.contactEmail && (
                <p className="text-sm text-destructive" data-testid="text-error-email">
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

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel-feedback"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              data-testid="button-submit-feedback"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Feedback"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
