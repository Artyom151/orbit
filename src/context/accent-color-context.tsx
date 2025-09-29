
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type AccentColorContextType = {
    accentColor: string;
    setAccentColor: (color: string) => void;
    customColor: string;
    setCustomColor: (color: string) => void;
};

const AccentColorContext = createContext<AccentColorContextType | undefined>(undefined);

const DEFAULT_ACCENT_COLOR = '262 80% 68%';
const DEFAULT_CUSTOM_COLOR_HEX = '#A78BFA';

export function AccentColorProvider({ children }: { children: ReactNode }) {
    const [accentColor, setAccentColorState] = useState(DEFAULT_ACCENT_COLOR);
    const [customColor, setCustomColorState] = useState(DEFAULT_CUSTOM_COLOR_HEX);

    useEffect(() => {
        const storedAccent = localStorage.getItem('accentColor');
        const storedCustom = localStorage.getItem('customAccentColor');
        if (storedAccent) {
            setAccentColorState(storedAccent);
        }
        if (storedCustom) {
            setCustomColorState(storedCustom);
        }
    }, []);

    const setAccentColor = useCallback((color: string) => {
        let hslValue = color;
        // If it's a hex color, we just store it as a custom color and derive HSL for the theme
        if (color.startsWith('#')) {
            hslValue = hexToHsl(color);
            setCustomColorState(color);
            localStorage.setItem('customAccentColor', color);
        }
        
        setAccentColorState(hslValue);
        localStorage.setItem('accentColor', hslValue);
        document.documentElement.style.setProperty('--primary', hslValue);
        document.documentElement.style.setProperty('--ring', hslValue);

    }, []);

    const setCustomColor = useCallback((color: string) => {
         setAccentColor(color);
    }, [setAccentColor]);

    // Apply the color on initial load
    useEffect(() => {
        document.documentElement.style.setProperty('--primary', accentColor);
        document.documentElement.style.setProperty('--ring', accentColor);
    }, [accentColor]);

    const value = { accentColor, setAccentColor, customColor, setCustomColor };

    return (
        <AccentColorContext.Provider value={value}>
            {children}
        </AccentColorContext.Provider>
    );
}

export function useAccentColor() {
    const context = useContext(AccentColorContext);
    if (context === undefined) {
        throw new Error('useAccentColor must be used within an AccentColorProvider');
    }
    return context;
}

// Helper function to convert hex to HSL string
function hexToHsl(hex: string): string {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }

    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
}
