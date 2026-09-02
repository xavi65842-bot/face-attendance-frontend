import './globals.css';
import 'aos/dist/aos.css';
import ThemeWrapper from '../components/ThemeWrapper';

export const metadata = {
    title: 'Salvation Heritage — Smart Biometric Face Attendance System',
    description: 'Salvation Heritage School Biometric Attendance and Student Information Management System.',
    keywords: 'Salvation Heritage, face attendance, student attendance, school management, biometric',
    authors: [{ name: 'Salvation Heritage' }],
    robots: 'noindex, nofollow',
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
