"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export function AudioControls() {
  const [speed, setSpeed] = useState<number>(1);
  const [temperature, setTemperature] = useState<number>(0.7);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="speed-slider" className="text-sm font-medium">
            Speed
          </Label>
          <span className="text-xs text-muted-foreground">
            {speed.toFixed(1)}x
          </span>
        </div>
        <Slider
          id="speed-slider"
          min={0.5}
          max={2}
          step={0.1}
          value={[speed]}
          onValueChange={(value) => setSpeed(value[0])}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="temperature-slider" className="text-sm font-medium">
            Temperature
          </Label>
          <span className="text-xs text-muted-foreground">
            {temperature.toFixed(1)}
          </span>
        </div>
        <Slider
          id="temperature-slider"
          min={0}
          max={1}
          step={0.1}
          value={[temperature]}
          onValueChange={(value) => setTemperature(value[0])}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Lower values produce more consistent output, higher values more
          creative.
        </p>
      </div>
    </div>
  );
}
