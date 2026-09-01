'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('theme');
        if (saved) {
            setIsDark(saved === 'dark');
        }
    }, []);

    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        localStorage.setItem('theme', newDark ? 'dark' : 'light');
    };

    const getColors = () => {
        if (isDark) {
            // Dark mode: Red and Black (current design)
            return {
                bg: '#0a0a0a',
                bgCard: 'linear-gradient(145deg, #111111, #0f0f0f)',
                text: '#fff',
                textSecondary: '#9ca3af',
                border: 'rgba(193,18,31,0.2)',
                navBg: 'rgba(10,10,10,0.95)',
                inputBg: 'rgba(255,255,255,0.05)',
            };
        } else {
            // Light mode: Red and White
            return {
                bg: '#ffffff',
                bgCard: 'linear-gradient(145deg, #ffffff, #fef2f2)',
                text: '#1a1a1a',
                textSecondary: '#666',
                border: 'rgba(193,18,31,0.3)',
                navBg: 'rgba(255,255,255,0.95)',
                inputBg: 'rgba(193,18,31,0.05)',
            };
        }
    };

    if (!mounted) return children;

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, colors: getColors(), mounted }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
