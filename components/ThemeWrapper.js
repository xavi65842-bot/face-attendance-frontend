'use client';

import { ThemeProvider } from '../lib/ThemeContext';

export default function ThemeWrapper({ children }) {
    return (
        <ThemeProvider>
            {children}
        </ThemeProvider>
    );
}
