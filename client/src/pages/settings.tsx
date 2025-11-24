import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Volume2, Keyboard, Shield, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { keyboardSound, type SoundType } from "@/lib/keyboard-sounds";
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
  
  // Sound settings state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState<SoundType>('mechanical');

  // Load sound settings on mount
  useEffect(() => {
    const settings = keyboardSound.getSettings();
    setSoundEnabled(settings.enabled);
    setSoundType(settings.soundType);
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

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
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

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    
    changePasswordMutation.mutate();
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
                <Switch id="smooth-caret" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                 <Label htmlFor="quick-restart" className="flex flex-col gap-1">
                  <span>Quick Restart</span>
                  <span className="font-normal text-xs text-muted-foreground">Press 'Tab' to restart test</span>
                </Label>
                <Switch id="quick-restart" defaultChecked />
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
                  <Label className="text-base font-semibold">Change Password</Label>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        data-testid="input-current-password"
                        placeholder="Enter current password"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        data-testid="input-new-password"
                        placeholder="Enter new password (min 8 characters)"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        data-testid="input-confirm-password"
                        placeholder="Confirm new password"
                      />
                    </div>
                    
                    <Button
                      onClick={handleChangePassword}
                      disabled={!currentPassword || !newPassword || !confirmPassword || changePasswordMutation.isPending}
                      data-testid="button-change-password"
                    >
                      {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
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
