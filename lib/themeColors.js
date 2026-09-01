export const getThemeColors = (isDark) => {
    if (isDark) {
        return {
            bg: '#0a0a0a',
            bgSecondary: '#1a0a0a',
            bgTertiary: '#111111',
            text: '#fff',
            textSecondary: '#9ca3af',
            border: 'rgba(193,18,31,0.2)',
            borderLight: 'rgba(193,18,31,0.3)',
            navBg: 'rgba(10,10,10,0.95)',
            cardBg: 'linear-gradient(145deg, #111111, #0f0f0f)',
            inputBg: 'rgba(255,255,255,0.05)',
            inputBorder: 'rgba(193,18,31,0.2)',
            hoverBg: 'rgba(255,255,255,0.03)',
        };
    } else {
        // Light mode: Red and White
        return {
            bg: '#fff5f5',
            bgSecondary: '#fff',
            bgTertiary: '#fef2f2',
            text: '#1a1a1a',
            textSecondary: '#666',
            border: 'rgba(193,18,31,0.3)',
            borderLight: 'rgba(193,18,31,0.2)',
            navBg: 'rgba(255,255,255,0.95)',
            cardBg: 'linear-gradient(145deg, #fff, #fef2f2)',
            inputBg: 'rgba(193,18,31,0.05)',
            inputBorder: 'rgba(193,18,31,0.2)',
            hoverBg: 'rgba(193,18,31,0.05)',
        };
    }
};
