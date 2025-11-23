import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Volume2, Keyboard } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

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
                <Switch id="sound-enabled" defaultChecked />
              </div>
              
               <div className="flex items-center justify-between">
                <Label htmlFor="sound-type" className="flex flex-col gap-1">
                  <span>Sound Type</span>
                  <span className="font-normal text-xs text-muted-foreground">Choose switch type</span>
                </Label>
                <Select defaultValue="mechanical">
                  <SelectTrigger className="w-[180px]">
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
        </div>
      </div>
  );
}
