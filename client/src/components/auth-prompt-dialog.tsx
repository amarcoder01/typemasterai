import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";

interface AuthPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export default function AuthPromptDialog({
  open,
  onOpenChange,
  title = "Save Your Progress",
  description = "Create an account to save your typing test results, track your progress, and compete on the leaderboard!",
}: AuthPromptDialogProps) {
  const [, setLocation] = useLocation();

  const handleSignUp = () => {
    onOpenChange(false);
    setLocation("/register");
  };

  const handleSignIn = () => {
    onOpenChange(false);
    setLocation("/login");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Maybe Later</AlertDialogCancel>
          <AlertDialogAction onClick={handleSignIn} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
            Sign In
          </AlertDialogAction>
          <AlertDialogAction onClick={handleSignUp}>
            Sign Up
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
