"use client";

import * as React from "react";
import { Paintbrush, Palette } from "lucide-react";
import { useAccentColor } from "@/context/accent-color-context";
import { DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const PRESET_COLORS = [
  { name: 'Purple', hsl: '262 80% 68%' },
  { name: 'Blue', hsl: '217 91% 60%' },
  { name: 'Green', hsl: '142 71% 45%' },
  { name: 'Orange', hsl: '25 95% 53%' },
  { name: 'Red', hsl: '0 84% 60%' },
];

export function AccentColorToggle() {
  const { accentColor, setAccentColor, customColor, setCustomColor } = useAccentColor();

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    setAccentColor(newColor);
  };
  
  return (
     <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Paintbrush className="mr-2" />
          <span>Accent Color</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
            <DropdownMenuSubContent>
                {PRESET_COLORS.map(color => (
                    <DropdownMenuItem key={color.name} onClick={() => setAccentColor(color.hsl)}>
                       <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: `hsl(${color.hsl})` }} />
                       {color.name}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                 <Popover>
                    <PopoverTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Palette className="mr-2"/>
                            Custom
                        </DropdownMenuItem>
                    </PopoverTrigger>
                    <PopoverContent>
                        <div className="flex items-center gap-2">
                           <Input 
                                type="color" 
                                value={customColor} 
                                onChange={handleCustomColorChange}
                                className="w-10 h-10 p-1"
                            />
                           <p className="text-sm font-medium">Custom Color</p>
                        </div>
                    </PopoverContent>
                </Popover>

            </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
  );
}
