import React, { useState } from 'react';
import { ShareResults } from "@/components/ShareResults";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export default function ShareResultsTestPage() {
  const [wpm, setWpm] = useState(65);
  const [accuracy, setAccuracy] = useState(98);
  const [mode, setMode] = useState<number | string>(60);
  
  return (
    <div className="container mx-auto p-8 space-y-8 max-w-4xl">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500 inline-block">
          Share Component Test Page
        </h1>
        <p className="text-muted-foreground">
          Playground to test the standalone ShareResults component with different values.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls Panel */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
            <CardDescription>Adjust values to see how the component reacts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>WPM (Speed)</Label>
                <Badge variant="outline">{wpm} WPM</Badge>
              </div>
              <Slider 
                value={[wpm]} 
                onValueChange={(val) => setWpm(val[0])} 
                min={0} 
                max={200} 
                step={1} 
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Accuracy (%)</Label>
                <Badge variant="outline" className={accuracy >= 95 ? "text-green-500" : "text-orange-500"}>
                  {accuracy}%
                </Badge>
              </div>
              <Slider 
                value={[accuracy]} 
                onValueChange={(val) => setAccuracy(val[0])} 
                min={0} 
                max={100} 
                step={1} 
              />
            </div>

            <div className="space-y-3">
              <Label>Mode / Duration</Label>
              <div className="flex gap-2">
                <Input 
                  value={mode} 
                  onChange={(e) => {
                    const val = e.target.value;
                    // Try to parse as number if possible
                    const num = parseInt(val);
                    if (!isNaN(num) && num.toString() === val) {
                      setMode(num);
                    } else {
                      setMode(val);
                    }
                  }} 
                  placeholder="e.g. 60 or 'Dictation'" 
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a number (seconds) or text (e.g. "Dictation")
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Component Preview */}
        <Card className="bg-muted/10 border-dashed border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Preview
              <Badge>Live</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ShareResults 
              wpm={wpm} 
              accuracy={accuracy} 
              mode={mode} 
              onShareTracked={(platform) => console.log(`Shared via ${platform}`)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
