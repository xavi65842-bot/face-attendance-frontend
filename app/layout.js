import './globals.css';
import 'aos/dist/aos.css';
import ThemeWrapper from '../components/ThemeWrapper';

export const metadata = {
    title: process.env.NEXT_PUBLIC_APP_TITLE || 'Face Attendance System by BENX - AI-Powered Attendance Tracking',
    description: 'Advanced AI-powered face recognition attendance system with real-time analytics for educational institutions. Built by BENX.',
    keywords: 'face recognition, attendance system, AI, education, student management, BENX, facial recognition, automated attendance',
    authors: [{ name: 'BENX Development Team' }],
    robots: 'noindex, nofollow', // Prevent search engine indexing for internal systems
};

// Next.js 15+ requires viewport to be a separate named export
export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-gray-50">
                <ThemeWrapper>
                    <main className="min-h-screen">
                        {children}
                    </main>
                </ThemeWrapper>
            </body>
        </html>
    );
}
