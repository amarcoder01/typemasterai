import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, BellOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notificationManager } from '@/lib/notification-manager';

interface NotificationPreferences {
  id: number;
  userId: string;
  dailyReminder: boolean;
  dailyReminderTime: string | null;
  streakWarning: boolean;
  streakMilestone: boolean;
  weeklySummary: boolean;
  weeklySummaryDay: string | null;
  achievementUnlocked: boolean;
  challengeInvite: boolean;
  challengeComplete: boolean;
  leaderboardChange: boolean;
  newPersonalRecord: boolean;
  raceInvite: boolean;
  raceStarting: boolean;
  socialUpdates: boolean;
  tipOfTheDay: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkPermissionStatus();
    loadPreferences();
  }, []);

  const checkPermissionStatus = async () => {
    const permission = await notificationManager.getPermissionStatus();
    setSubscribed(permission === 'granted');
    setPermission(permission);
  };

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const prefs = await response.json();
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const success = await notificationManager.requestPermission();
      if (success) {
        setSubscribed(true);
        setPermission('granted');
        toast({
          title: "Notifications Enabled!",
          description: "You'll now receive push notifications",
        });
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      toast({
        title: "Error",
        description: "Failed to enable notifications",
        variant: "destructive",
      });
    }
  };

  const handleDisableNotifications = async () => {
    try {
      await notificationManager.unsubscribe();
      setSubscribed(false);
      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive push notifications",
      });
    } catch (error) {
      console.error('Failed to disable notifications:', error);
    }
  };

  const handleTestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
      });
      
      if (response.ok) {
        toast({
          title: "Test Notification Sent!",
          description: "Check your notifications",
        });
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  const handleSavePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        toast({
          title: "Preferences Saved",
          description: "Your notification settings have been updated",
        });
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-muted-foreground">
          Manage your notification preferences and push notification settings
        </p>
      </div>

      {/* Push Notification Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            Push Notifications
          </CardTitle>
          <CardDescription>
            Enable browser push notifications to stay updated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Status</p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {subscribed ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Enabled
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-gray-400" />
                    Disabled
                  </>
                )}
              </p>
            </div>
            {!subscribed ? (
              <Button onClick={handleEnableNotifications} data-testid="button-enable-notifications">
                Enable Notifications
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleTestNotification} data-testid="button-test-notification">
                  Send Test
                </Button>
                <Button variant="destructive" onClick={handleDisableNotifications} data-testid="button-disable-notifications">
                  Disable
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      {preferences && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Daily & Weekly Notifications</CardTitle>
              <CardDescription>
                Stay on track with regular reminders and summaries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dailyReminder" className="flex-1">
                  Daily Practice Reminder
                  <p className="text-sm text-muted-foreground">Get reminded to practice every day</p>
                </Label>
                <Switch
                  id="dailyReminder"
                  checked={preferences.dailyReminder}
                  onCheckedChange={(checked) => updatePreference('dailyReminder', checked)}
                  data-testid="switch-daily-reminder"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label htmlFor="streakWarning" className="flex-1">
                  Streak Warning
                  <p className="text-sm text-muted-foreground">Get notified when your streak is at risk</p>
                </Label>
                <Switch
                  id="streakWarning"
                  checked={preferences.streakWarning}
                  onCheckedChange={(checked) => updatePreference('streakWarning', checked)}
                  data-testid="switch-streak-warning"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label htmlFor="weeklySummary" className="flex-1">
                  Weekly Summary
                  <p className="text-sm text-muted-foreground">Receive your weekly progress report</p>
                </Label>
                <Switch
                  id="weeklySummary"
                  checked={preferences.weeklySummary}
                  onCheckedChange={(checked) => updatePreference('weeklySummary', checked)}
                  data-testid="switch-weekly-summary"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Achievements & Challenges</CardTitle>
              <CardDescription>
                Get notified about your progress and accomplishments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="achievementUnlocked" className="flex-1">
                  Achievement Unlocked
                  <p className="text-sm text-muted-foreground">Celebrate when you unlock badges</p>
                </Label>
                <Switch
                  id="achievementUnlocked"
                  checked={preferences.achievementUnlocked}
                  onCheckedChange={(checked) => updatePreference('achievementUnlocked', checked)}
                  data-testid="switch-achievement-unlocked"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label htmlFor="challengeInvite" className="flex-1">
                  Challenge Invitations
                  <p className="text-sm text-muted-foreground">Get notified about new challenges</p>
                </Label>
                <Switch
                  id="challengeInvite"
                  checked={preferences.challengeInvite}
                  onCheckedChange={(checked) => updatePreference('challengeInvite', checked)}
                  data-testid="switch-challenge-invite"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label htmlFor="challengeComplete" className="flex-1">
                  Challenge Completed
                  <p className="text-sm text-muted-foreground">Celebrate when you complete challenges</p>
                </Label>
                <Switch
                  id="challengeComplete"
                  checked={preferences.challengeComplete}
                  onCheckedChange={(checked) => updatePreference('challengeComplete', checked)}
                  data-testid="switch-challenge-complete"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Social & Competition</CardTitle>
              <CardDescription>
                Stay updated on competitive features and social interactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="raceInvite" className="flex-1">
                  Race Invitations
                  <p className="text-sm text-muted-foreground">Get notified when invited to typing races</p>
                </Label>
                <Switch
                  id="raceInvite"
                  checked={preferences.raceInvite}
                  onCheckedChange={(checked) => updatePreference('raceInvite', checked)}
                  data-testid="switch-race-invite"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label htmlFor="leaderboardChange" className="flex-1">
                  Leaderboard Changes
                  <p className="text-sm text-muted-foreground">Get updates when your rank changes</p>
                </Label>
                <Switch
                  id="leaderboardChange"
                  checked={preferences.leaderboardChange}
                  onCheckedChange={(checked) => updatePreference('leaderboardChange', checked)}
                  data-testid="switch-leaderboard-change"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label htmlFor="newPersonalRecord" className="flex-1">
                  Personal Records
                  <p className="text-sm text-muted-foreground">Celebrate new personal bests</p>
                </Label>
                <Switch
                  id="newPersonalRecord"
                  checked={preferences.newPersonalRecord}
                  onCheckedChange={(checked) => updatePreference('newPersonalRecord', checked)}
                  data-testid="switch-personal-record"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSavePreferences}
              disabled={saving}
              size="lg"
              data-testid="button-save-preferences"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
