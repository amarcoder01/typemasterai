import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, HelpCircle, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/searchable-select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AVATAR_COLORS = [
  { value: "bg-primary", label: "Amber", class: "bg-primary" },
  { value: "bg-blue-500", label: "Blue", class: "bg-blue-500" },
  { value: "bg-green-500", label: "Green", class: "bg-green-500" },
  { value: "bg-purple-500", label: "Purple", class: "bg-purple-500" },
  { value: "bg-pink-500", label: "Pink", class: "bg-pink-500" },
  { value: "bg-red-500", label: "Red", class: "bg-red-500" },
  { value: "bg-orange-500", label: "Orange", class: "bg-orange-500" },
  { value: "bg-cyan-500", label: "Cyan", class: "bg-cyan-500" },
];

const COUNTRY_OPTIONS = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus",
  "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
  "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Democratic Republic)",
  "Congo (Republic)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti",
  "Dominica", "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea",
  "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia",
  "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro",
  "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
  "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname",
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe", "Other"
].map(c => ({ value: c, label: c }));

const KEYBOARD_LAYOUTS = ["QWERTY", "DVORAK", "COLEMAK", "AZERTY", "QWERTZ", "Other"];

export default function ProfileEdit() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || "bg-primary");
  const [bio, setBio] = useState(user?.bio || "");
  const [country, setCountry] = useState(user?.country || "");
  const [keyboardLayout, setKeyboardLayout] = useState(user?.keyboardLayout || "QWERTY");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const initialValues = {
    avatarColor: user?.avatarColor || "bg-primary",
    bio: user?.bio || "",
    country: user?.country || "",
    keyboardLayout: user?.keyboardLayout || "QWERTY",
  };

  useEffect(() => {
    const hasChanges = 
      avatarColor !== initialValues.avatarColor ||
      bio !== initialValues.bio ||
      country !== initialValues.country ||
      keyboardLayout !== initialValues.keyboardLayout;
    setHasUnsavedChanges(hasChanges);
  }, [avatarColor, bio, country, keyboardLayout, initialValues.avatarColor, initialValues.bio, initialValues.country, initialValues.keyboardLayout]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      setErrorMessage(null);
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Failed to update profile (Error ${response.status})`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      setHasUnsavedChanges(false);
      toast({
        title: "Profile Updated!",
        description: "Your profile has been updated successfully.",
      });
      setLocation("/profile");
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setRetryCount(prev => prev + 1);
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRetry = useCallback(() => {
    updateProfileMutation.mutate({
      avatarColor,
      bio: bio || null,
      country: country || null,
      keyboardLayout,
    });
  }, [avatarColor, bio, country, keyboardLayout, updateProfileMutation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      avatarColor,
      bio: bio || null,
      country: country || null,
      keyboardLayout,
    });
  };

  if (!user) {
    setLocation("/login");
    return null;
  }

  const bioCharWarning = bio.length >= 180;
  const bioCharLimit = bio.length >= 200;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setLocation("/profile")} data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Back to profile</p>
            </TooltipContent>
          </Tooltip>
          <div>
            <h1 className="text-3xl font-bold">Edit Profile</h1>
            <p className="text-muted-foreground">Customize your typing profile</p>
          </div>
          {hasUnsavedChanges && (
            <div className="ml-auto flex items-center gap-2 text-amber-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Unsaved changes</span>
            </div>
          )}
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{errorMessage}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={updateProfileMutation.isPending}
                className="ml-4"
                data-testid="button-retry"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", updateProfileMutation.isPending && "animate-spin")} />
                Retry {retryCount > 1 ? `(${retryCount})` : ""}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Avatar Color</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>Your avatar color appears on your profile, leaderboards, and in multiplayer races. Choose a color that represents you!</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>Choose a color for your avatar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="w-20 h-20 border-4 border-background shadow-xl cursor-pointer">
                      <AvatarFallback className={cn(avatarColor, "text-primary-foreground text-2xl")}>
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This is how your avatar will appear to others</p>
                  </TooltipContent>
                </Tooltip>
                <div className="flex-1">
                  <div className="grid grid-cols-8 gap-2">
                    {AVATAR_COLORS.map((color) => (
                      <Tooltip key={color.value}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setAvatarColor(color.value)}
                            className={cn(
                              "w-10 h-10 rounded-full border-2 transition-all",
                              color.class,
                              avatarColor === color.value
                                ? "border-foreground scale-110 ring-2 ring-foreground/20"
                                : "border-border hover:scale-105"
                            )}
                            data-testid={`color-${color.label.toLowerCase()}`}
                          >
                            {avatarColor === color.value && (
                              <Check className="w-5 h-5 mx-auto text-white drop-shadow-sm" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{color.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Bio</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>Write a short description about yourself. This will be visible on your public profile and helps other typists get to know you.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>Tell others about yourself (max 200 characters)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="I love typing and improving my speed..."
                maxLength={200}
                rows={3}
                className={cn(
                  bioCharLimit && "border-destructive focus-visible:ring-destructive",
                  bioCharWarning && !bioCharLimit && "border-amber-500 focus-visible:ring-amber-500"
                )}
                data-testid="input-bio"
              />
              <div className="flex items-center justify-between mt-2">
                <p className={cn(
                  "text-xs transition-colors",
                  bioCharLimit ? "text-destructive font-medium" : 
                  bioCharWarning ? "text-amber-500" : "text-muted-foreground"
                )}>
                  {bio.length}/200 characters
                  {bioCharLimit && " (limit reached)"}
                  {bioCharWarning && !bioCharLimit && " (approaching limit)"}
                </p>
                {bio.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setBio("")}
                        data-testid="button-clear-bio"
                      >
                        Clear
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear your bio</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Location</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>Your country is displayed on your profile and helps you find typists from your region. It may also be used for regional leaderboards.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>Your country or region</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <SearchableSelect
                value={country}
                onValueChange={setCountry}
                options={COUNTRY_OPTIONS}
                placeholder="Select your country"
                searchPlaceholder="Search countries..."
                emptyText="No country found."
                data-testid="select-country"
              />
              {country && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setCountry("")}
                      data-testid="button-clear-country"
                    >
                      Clear selection
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove country from profile</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Keyboard Layout</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>Your keyboard layout affects typing analytics and comparisons. Select the layout that matches your physical keyboard for accurate statistics.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>Your preferred keyboard layout</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={keyboardLayout} onValueChange={setKeyboardLayout}>
                <SelectTrigger data-testid="select-keyboard">
                  <SelectValue placeholder="Select layout" />
                </SelectTrigger>
                <SelectContent>
                  {KEYBOARD_LAYOUTS.map((layout) => (
                    <SelectItem key={layout} value={layout}>
                      {layout}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {keyboardLayout === "QWERTY" && "Standard layout used in most English-speaking countries"}
                {keyboardLayout === "DVORAK" && "Alternative layout optimized for efficiency"}
                {keyboardLayout === "COLEMAK" && "Modern layout balancing efficiency and ease of learning"}
                {keyboardLayout === "AZERTY" && "Standard layout used in French-speaking countries"}
                {keyboardLayout === "QWERTZ" && "Standard layout used in German-speaking countries"}
                {keyboardLayout === "Other" && "Custom or non-standard keyboard layout"}
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end items-center">
            {hasUnsavedChanges && (
              <span className="text-sm text-muted-foreground mr-auto">
                Don't forget to save your changes!
              </span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/profile")}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Discard changes and return to profile</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending || !hasUnsavedChanges} 
                  data-testid="button-save-profile"
                  className="min-w-[120px]"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{hasUnsavedChanges ? "Save your profile changes" : "No changes to save"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </form>
      </div>
    </TooltipProvider>
  );
}
