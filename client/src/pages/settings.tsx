import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Volume2, Keyboard, Shield, Trash2, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, HelpCircle, Link2, Unlink, Github, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { keyboardSound, type SoundType } from "@/lib/keyboard-sounds";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

interface LinkedProvider {
  provider: string;
  profileName: string | null;
  email: string | null;
  linkedAt: string;
}

interface ProviderAvailability {
  google: boolean;
  github: boolean;
  facebook: boolean;
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Sound settings state
  const [soundEnabled, setSoundEnabled] = useState(false); // Disabled by default
  const [soundType, setSoundType] = useState<SoundType>('mechanical');

  // Typing behavior settings state
  const [smoothCaret, setSmoothCaret] = useState(true);
  const [quickRestart, setQuickRestart] = useState(true);
  const [zenMode, setZenMode] = useState(false);

  // Load sound settings on mount
  useEffect(() => {
    const settings = keyboardSound.getSettings();
    setSoundEnabled(settings.enabled);
    setSoundType(settings.soundType);
  }, []);

  // Load typing behavior settings on mount
  useEffect(() => {
    const smoothCaretSetting = localStorage.getItem('smoothCaret');
    const quickRestartSetting = localStorage.getItem('quickRestart');
    const zenModeSetting = localStorage.getItem('zenMode');
    
    if (smoothCaretSetting !== null) {
      setSmoothCaret(smoothCaretSetting === 'true');
    }
    if (quickRestartSetting !== null) {
      setQuickRestart(quickRestartSetting === 'true');
    }
    if (zenModeSetting !== null) {
      setZenMode(zenModeSetting === 'true');
    }
  }, []);

  const handleSoundEnabledChange = (enabled: boolean) => {
    setSoundEnabled(enabled);
    keyboardSound.setEnabled(enabled);
    toast({
      title: enabled ? "Keyboard Sounds Enabled" : "Keyboard Sounds Disabled",
      description: enabled ? "You'll hear sound when typing" : "Sound is now muted",
    });
  };

  const handleSoundTypeChange = (type: SoundType) => {
    setSoundType(type);
    keyboardSound.setSoundType(type);
    // Play a preview
    keyboardSound.play();
    toast({
      title: "Sound Type Changed",
      description: `Switched to ${type} sound`,
    });
  };

  const handleSmoothCaretChange = (enabled: boolean) => {
    setSmoothCaret(enabled);
    localStorage.setItem('smoothCaret', enabled.toString());
    toast({
      title: enabled ? "Smooth Caret Enabled" : "Smooth Caret Disabled",
      description: enabled ? "Cursor will animate smoothly" : "Cursor will jump instantly",
    });
  };

  const handleQuickRestartChange = (enabled: boolean) => {
    setQuickRestart(enabled);
    localStorage.setItem('quickRestart', enabled.toString());
    toast({
      title: enabled ? "Quick Restart Enabled" : "Quick Restart Disabled",
      description: enabled ? "Press Tab to restart" : "Use the restart button",
    });
  };

  const handleZenModeChange = (enabled: boolean) => {
    setZenMode(enabled);
    localStorage.setItem('zenMode', enabled.toString());
    toast({
      title: enabled ? "Zen Mode Enabled" : "Zen Mode Disabled",
      description: enabled ? "Minimalist typing experience - focus on the text" : "Full UI with all controls visible",
    });
  };

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change password");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Password Change Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete account");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });
      logout();
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Account Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: providerData, isLoading: providersLoading } = useQuery({
    queryKey: ["linked-providers"],
    queryFn: async (): Promise<{ linkedProviders: LinkedProvider[]; availableProviders: ProviderAvailability }> => {
      const response = await fetch("/api/auth/providers", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch linked providers");
      }
      return response.json();
    },
    enabled: !!user,
  });

  const linkedProviders = providerData?.linkedProviders;
  const availableProviders = providerData?.availableProviders;

  const unlinkProviderMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await fetch(`/api/auth/providers/${provider}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to unlink provider");
      }
      return response.json();
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["linked-providers"] });
      toast({
        title: "Account Unlinked",
        description: `Your ${provider.charAt(0).toUpperCase() + provider.slice(1)} account has been unlinked`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unlink Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isProviderLinked = (provider: string) => {
    return linkedProviders?.some(p => p.provider === provider) ?? false;
  };

  const getProviderInfo = (provider: string) => {
    return linkedProviders?.find(p => p.provider === provider);
  };

  const handleLinkProvider = (provider: string) => {
    window.location.href = `/api/auth/link/${provider}`;
  };

  const isProviderAvailable = (provider: keyof ProviderAvailability) => {
    return availableProviders?.[provider] ?? false;
  };

  const handleUnlinkProvider = (provider: string) => {
    unlinkProviderMutation.mutate(provider);
  };

  // Password validation helper
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    
    // Must meet minimum requirements to even start calculating strength
    const meetsMinimum = password.length >= 8 && 
                        /[A-Z]/.test(password) && 
                        /[a-z]/.test(password) && 
                        /\d/.test(password);
    
    if (!meetsMinimum) {
      return { strength: 0, label: 'Weak', color: 'text-destructive' };
    }
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    if (strength <= 2) return { strength, label: 'Weak', color: 'text-destructive' };
    if (strength <= 3) return { strength, label: 'Fair', color: 'text-yellow-500' };
    if (strength <= 4) return { strength, label: 'Good', color: 'text-blue-500' };
    return { strength, label: 'Strong', color: 'text-green-500' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const validatePassword = () => {
    const errors: string[] = [];
    
    if (!currentPassword) {
      errors.push("Current password is required");
    }
    
    if (!newPassword) {
      errors.push("New password is required");
    } else {
      if (newPassword.length < 8) {
        errors.push("Password must be at least 8 characters");
      }
      if (!/[A-Z]/.test(newPassword)) {
        errors.push("Password must contain at least one uppercase letter");
      }
      if (!/[a-z]/.test(newPassword)) {
        errors.push("Password must contain at least one lowercase letter");
      }
      if (!/\d/.test(newPassword)) {
        errors.push("Password must contain at least one number");
      }
    }
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.push("Passwords do not match");
    }
    
    if (newPassword && currentPassword && newPassword === currentPassword) {
      errors.push("New password must be different from current password");
    }
    
    return errors;
  };

  const handleChangePassword = () => {
    // Capture values at the moment of submission to avoid race conditions
    const currentPwd = currentPassword;
    const newPwd = newPassword;
    const confirmPwd = confirmPassword;
    
    // Re-validate with frozen values
    const errors: string[] = [];
    
    if (!currentPwd) {
      errors.push("Current password is required");
    }
    
    if (!newPwd) {
      errors.push("New password is required");
    } else {
      if (newPwd.length < 8) {
        errors.push("Password must be at least 8 characters");
      }
      if (!/[A-Z]/.test(newPwd)) {
        errors.push("Password must contain at least one uppercase letter");
      }
      if (!/[a-z]/.test(newPwd)) {
        errors.push("Password must contain at least one lowercase letter");
      }
      if (!/\d/.test(newPwd)) {
        errors.push("Password must contain at least one number");
      }
    }
    
    if (newPwd && confirmPwd && newPwd !== confirmPwd) {
      errors.push("Passwords do not match");
    }
    
    if (newPwd && currentPwd && newPwd === currentPwd) {
      errors.push("New password must be different from current password");
    }
    
    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: errors[0],
        variant: "destructive",
      });
      return;
    }
    
    // Submit with frozen values
    changePasswordMutation.mutate({ currentPassword: currentPwd, newPassword: newPwd });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
           <h1 className="text-3xl font-bold">Settings</h1>
           <p className="text-muted-foreground">
             Customize your typing experience
             {!user && " (Settings are saved locally on this device)"}
           </p>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5" /> Appearance
              </CardTitle>
              <CardDescription>Manage theme and visual preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme" className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span>Theme</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[280px]">
                        <p className="font-medium mb-1">Color Theme</p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p><span className="text-blue-400">Focus Flow:</span> Dark theme optimized for typing</p>
                          <p><span className="text-yellow-400">Light:</span> Bright theme for well-lit environments</p>
                          <p><span className="text-purple-400">Cyberpunk:</span> Neon-inspired futuristic look</p>
                          <p><span className="text-orange-400">Retro:</span> Classic vintage terminal style</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="font-normal text-xs text-muted-foreground">Select your preferred color scheme</span>
                </Label>
                <Select value={theme} onValueChange={(value) => setTheme(value as any)}>
                  <SelectTrigger className="w-[180px]" data-testid="select-theme">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="focus">Focus Flow (Dark)</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="cyber">Cyberpunk</SelectItem>
                    <SelectItem value="retro">Retro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                 <Label htmlFor="blur" className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span>Blur Effects</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[240px]">
                        <p className="font-medium mb-1">Glassmorphism Effects</p>
                        <p className="text-xs text-muted-foreground">Adds a frosted glass blur effect to cards and backgrounds. Disable for better performance on older devices.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="font-normal text-xs text-muted-foreground">Enable glassmorphism blur</span>
                </Label>
                <Switch id="blur" defaultChecked data-testid="switch-blur" />
              </div>
            </CardContent>
          </Card>

          {/* Sound */}
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" /> Sound
              </CardTitle>
              <CardDescription>Audio feedback on keystrokes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="sound-enabled" className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span>Keyboard Sounds</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[240px]">
                        <p className="font-medium mb-1">Typing Audio Feedback</p>
                        <p className="text-xs text-muted-foreground">Plays realistic keyboard sounds as you type. Great for improving rhythm and making practice more satisfying!</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="font-normal text-xs text-muted-foreground">Play sound when typing</span>
                </Label>
                <Switch
                  id="sound-enabled"
                  checked={soundEnabled}
                  onCheckedChange={handleSoundEnabledChange}
                  data-testid="switch-sound-enabled"
                />
              </div>
              
               <div className="flex items-center justify-between">
                <Label htmlFor="sound-type" className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span>Sound Type</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[280px]">
                        <p className="font-medium mb-1">Keyboard Switch Type</p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p><span className="text-blue-400">Mechanical:</span> Classic clicky switch sound</p>
                          <p><span className="text-green-400">Linear:</span> Smooth thock sound, no click</p>
                          <p><span className="text-yellow-400">Typewriter:</span> Vintage typewriter bell</p>
                          <p><span className="text-purple-400">Cherry MX Blue:</span> Premium tactile switch</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="font-normal text-xs text-muted-foreground">Choose switch type</span>
                </Label>
                <Select
                  value={soundType}
                  onValueChange={(value) => handleSoundTypeChange(value as SoundType)}
                  disabled={!soundEnabled}
                >
                  <SelectTrigger className="w-[180px]" data-testid="select-sound-type">
                    <SelectValue placeholder="Select sound" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mechanical">Mechanical (Clicky)</SelectItem>
                    <SelectItem value="linear">Linear (Thock)</SelectItem>
                    <SelectItem value="typewriter">Typewriter</SelectItem>
                    <SelectItem value="cherry">Cherry MX Blue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span>Test Sound</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[200px]">
                        <p className="text-xs">Click to hear a preview of the currently selected keyboard sound.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="font-normal text-xs text-muted-foreground">Preview the selected sound</span>
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => keyboardSound.play()}
                  disabled={!soundEnabled}
                  data-testid="button-test-sound"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Play Sound
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Typing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="w-5 h-5" /> Typing Behavior
              </CardTitle>
              <CardDescription>Adjust how the test behaves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between">
                 <Label htmlFor="smooth-caret" className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span>Smooth Caret</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[240px]">
                        <p className="font-medium mb-1">Cursor Animation</p>
                        <p className="text-xs text-muted-foreground">When enabled, the typing cursor glides smoothly between characters. Disable for instant cursor movement.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="font-normal text-xs text-muted-foreground">Animate cursor movement</span>
                </Label>
                <Switch
                  id="smooth-caret"
                  checked={smoothCaret}
                  onCheckedChange={handleSmoothCaretChange}
                  data-testid="switch-smooth-caret"
                />
              </div>

              <div className="flex items-center justify-between">
                 <Label htmlFor="quick-restart" className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span>Quick Restart</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[240px]">
                        <p className="font-medium mb-1">Keyboard Shortcut</p>
                        <p className="text-xs text-muted-foreground">Press the Tab key anytime during a test to instantly restart with a fresh paragraph. Perfect for quick practice sessions!</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="font-normal text-xs text-muted-foreground">Press 'Tab' to restart test</span>
                </Label>
                <Switch
                  id="quick-restart"
                  checked={quickRestart}
                  onCheckedChange={handleQuickRestartChange}
                  data-testid="switch-quick-restart"
                />
              </div>

              <div className="flex items-center justify-between">
                 <Label htmlFor="zen-mode" className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span>Zen Mode</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[260px]">
                        <p className="font-medium mb-1">Distraction-Free Mode</p>
                        <p className="text-xs text-muted-foreground">Hides WPM, accuracy, timer, and controls while typing. Only the text remains visible so you can focus purely on typing without distractions.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="font-normal text-xs text-muted-foreground">Minimalist UI - hides stats and controls during typing</span>
                </Label>
                <Switch
                  id="zen-mode"
                  checked={zenMode}
                  onCheckedChange={handleZenModeChange}
                  data-testid="switch-zen-mode"
                />
              </div>
            </CardContent>
          </Card>

          {/* Connected Accounts - Only show if user is logged in */}
          {user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" /> Connected Accounts
                </CardTitle>
                <CardDescription>Link social accounts for easy sign-in</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {providersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Google */}
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <GoogleIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Google</p>
                          {isProviderLinked("google") ? (
                            <p className="text-xs text-muted-foreground">
                              {getProviderInfo("google")?.email || "Connected"}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Not connected</p>
                          )}
                        </div>
                      </div>
                      {isProviderLinked("google") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlinkProvider("google")}
                          disabled={unlinkProviderMutation.isPending}
                          data-testid="button-unlink-google"
                        >
                          {unlinkProviderMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Unlink className="w-4 h-4 mr-2" />
                              Unlink
                            </>
                          )}
                        </Button>
                      ) : isProviderAvailable("google") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLinkProvider("google")}
                          data-testid="button-link-google"
                        >
                          <Link2 className="w-4 h-4 mr-2" />
                          Link
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not configured</span>
                      )}
                    </div>

                    {/* GitHub */}
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Github className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">GitHub</p>
                          {isProviderLinked("github") ? (
                            <p className="text-xs text-muted-foreground">
                              {getProviderInfo("github")?.profileName || "Connected"}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Not connected</p>
                          )}
                        </div>
                      </div>
                      {isProviderLinked("github") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlinkProvider("github")}
                          disabled={unlinkProviderMutation.isPending}
                          data-testid="button-unlink-github"
                        >
                          {unlinkProviderMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Unlink className="w-4 h-4 mr-2" />
                              Unlink
                            </>
                          )}
                        </Button>
                      ) : isProviderAvailable("github") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLinkProvider("github")}
                          data-testid="button-link-github"
                        >
                          <Link2 className="w-4 h-4 mr-2" />
                          Link
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not configured</span>
                      )}
                    </div>

                    {/* Facebook */}
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <FacebookIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Facebook</p>
                          {isProviderLinked("facebook") ? (
                            <p className="text-xs text-muted-foreground">
                              {getProviderInfo("facebook")?.profileName || "Connected"}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Not connected</p>
                          )}
                        </div>
                      </div>
                      {isProviderLinked("facebook") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlinkProvider("facebook")}
                          disabled={unlinkProviderMutation.isPending}
                          data-testid="button-unlink-facebook"
                        >
                          {unlinkProviderMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Unlink className="w-4 h-4 mr-2" />
                              Unlink
                            </>
                          )}
                        </Button>
                      ) : isProviderAvailable("facebook") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLinkProvider("facebook")}
                          data-testid="button-link-facebook"
                        >
                          <Link2 className="w-4 h-4 mr-2" />
                          Link
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not configured</span>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Linking social accounts allows you to sign in faster. You can unlink accounts at any time.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Security - Only show if user is logged in */}
          {user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" /> Security & Privacy
                </CardTitle>
                <CardDescription>Manage your password and account settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Change Password */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">Change Password</h3>
                    <p className="text-xs text-muted-foreground">
                      Keep your account secure with a strong password
                    </p>
                  </div>
                  
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="current-password" className="text-xs">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          data-testid="input-current-password"
                          placeholder="••••••••"
                          className="pr-10 h-9"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          data-testid="toggle-current-password"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="new-password" className="text-xs">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          data-testid="input-new-password"
                          placeholder="••••••••"
                          className="pr-10 h-9"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          data-testid="toggle-new-password"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="confirm-password" className="text-xs">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          data-testid="input-confirm-password"
                          placeholder="••••••••"
                          className="pr-10 h-9"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          data-testid="toggle-confirm-password"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleChangePassword}
                      disabled={!currentPassword || !newPassword || !confirmPassword || changePasswordMutation.isPending || validatePassword().length > 0}
                      data-testid="button-change-password"
                      size="sm"
                      className="mt-2"
                    >
                      {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-destructive/10 p-2">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="text-sm font-semibold text-destructive">Delete Account</h3>
                      <p className="text-xs text-muted-foreground">
                        Permanently remove your account and all associated data. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        data-testid="button-delete-account"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Delete My Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <div className="rounded-full bg-destructive/10 p-2">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                          </div>
                          Delete Account?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                          <p>This will permanently delete your TypeMasterAI account and remove all your data from our servers.</p>
                          
                          <div className="rounded-md bg-muted p-3 space-y-2">
                            <p className="text-xs font-medium text-foreground">This includes:</p>
                            <ul className="text-xs space-y-1 text-muted-foreground">
                              <li className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-current"></span>
                                All typing test results and statistics
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-current"></span>
                                AI chat conversation history
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-current"></span>
                                Profile information and preferences
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-current"></span>
                                Leaderboard rankings and achievements
                              </li>
                            </ul>
                          </div>
                          
                          <p className="text-xs font-medium text-destructive">This action cannot be undone.</p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteAccountMutation.mutate()}
                          className="bg-destructive hover:bg-destructive/90"
                          data-testid="button-confirm-delete"
                        >
                          {deleteAccountMutation.isPending ? "Deleting..." : "Yes, Delete My Account"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
