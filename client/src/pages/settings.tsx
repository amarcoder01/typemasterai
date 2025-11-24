import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Volume2, Keyboard, Shield, Trash2, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { keyboardSound, type SoundType } from "@/lib/keyboard-sounds";
import { cn } from "@/lib/utils";
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

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
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
    
    if (smoothCaretSetting !== null) {
      setSmoothCaret(smoothCaretSetting === 'true');
    }
    if (quickRestartSetting !== null) {
      setQuickRestart(quickRestartSetting === 'true');
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
                  <span>Theme</span>
                  <span className="font-normal text-xs text-muted-foreground">Select your preferred color scheme</span>
                </Label>
                <Select value={theme} onValueChange={(value) => setTheme(value as any)}>
                  <SelectTrigger className="w-[180px]">
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
                  <span>Blur Effects</span>
                  <span className="font-normal text-xs text-muted-foreground">Enable glassmorphism blur</span>
                </Label>
                <Switch id="blur" defaultChecked />
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
                  <span>Keyboard Sounds</span>
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
                  <span>Sound Type</span>
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
                  <span>Test Sound</span>
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
                  <span>Smooth Caret</span>
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
                  <span>Quick Restart</span>
                  <span className="font-normal text-xs text-muted-foreground">Press 'Tab' to restart test</span>
                </Label>
                <Switch
                  id="quick-restart"
                  checked={quickRestart}
                  onCheckedChange={handleQuickRestartChange}
                  data-testid="switch-quick-restart"
                />
              </div>
            </CardContent>
          </Card>

          {/* Security - Only show if user is logged in */}
          {user && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" /> Security & Privacy
                </CardTitle>
                <CardDescription>Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Change Password */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Change Password</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Update your password to keep your account secure
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Current Password */}
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          data-testid="input-current-password"
                          placeholder="Enter your current password"
                          className="pr-10"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          data-testid="toggle-current-password"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    {/* New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          data-testid="input-new-password"
                          placeholder="Enter new password"
                          className="pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          data-testid="toggle-new-password"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      {/* Password Strength Indicator */}
                      {newPassword && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Password Strength:</span>
                            <span className={cn("font-medium", passwordStrength.color)}>
                              {passwordStrength.label}
                            </span>
                          </div>
                          <div className="flex gap-1 h-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={cn(
                                  "flex-1 rounded-full transition-colors",
                                  level <= passwordStrength.strength
                                    ? passwordStrength.strength <= 2
                                      ? "bg-destructive"
                                      : passwordStrength.strength <= 3
                                      ? "bg-yellow-500"
                                      : passwordStrength.strength <= 4
                                      ? "bg-blue-500"
                                      : "bg-green-500"
                                    : "bg-muted"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Password Requirements */}
                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground font-medium">Password must contain:</p>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            {newPassword.length >= 8 ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-muted-foreground" />
                            )}
                            <span className={newPassword.length >= 8 ? "text-foreground" : "text-muted-foreground"}>
                              At least 8 characters
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/[A-Z]/.test(newPassword) ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-muted-foreground" />
                            )}
                            <span className={/[A-Z]/.test(newPassword) ? "text-foreground" : "text-muted-foreground"}>
                              One uppercase letter
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/[a-z]/.test(newPassword) ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-muted-foreground" />
                            )}
                            <span className={/[a-z]/.test(newPassword) ? "text-foreground" : "text-muted-foreground"}>
                              One lowercase letter
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/\d/.test(newPassword) ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            ) : (
                              <XCircle className="w-3 h-3 text-muted-foreground" />
                            )}
                            <span className={/\d/.test(newPassword) ? "text-foreground" : "text-muted-foreground"}>
                              One number
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          data-testid="input-confirm-password"
                          placeholder="Re-enter new password"
                          className="pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          data-testid="toggle-confirm-password"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      {/* Password Match Indicator */}
                      {confirmPassword && (
                        <div className="flex items-center gap-2 text-xs">
                          {newPassword === confirmPassword ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              <span className="text-green-500">Passwords match</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-destructive" />
                              <span className="text-destructive">Passwords do not match</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={handleChangePassword}
                      disabled={!currentPassword || !newPassword || !confirmPassword || changePasswordMutation.isPending || validatePassword().length > 0}
                      data-testid="button-change-password"
                      className="w-full"
                    >
                      {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-destructive">Danger Zone</Label>
                    <p className="text-sm text-muted-foreground">
                      Once you delete your account, there is no going back. All your test results, conversations, and profile data will be permanently deleted.
                    </p>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          className="gap-2"
                          data-testid="button-delete-account"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account
                            and remove all your data from our servers, including:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>All typing test results</li>
                              <li>AI chat conversations</li>
                              <li>Profile information</li>
                              <li>Leaderboard entries</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteAccountMutation.mutate()}
                            className="bg-destructive hover:bg-destructive/90"
                            data-testid="button-confirm-delete"
                          >
                            {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
  );
}
