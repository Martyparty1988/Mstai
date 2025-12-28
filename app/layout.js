import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
    title: 'MST - Martyho Solar Tracker',
    description: 'Solar Installation Management System',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0'
};

export default function RootLayout({ children }) {
    return (
        <html lang="cs">
            <body>
                <main className="container" style={{ padding: '20px', paddingBottom: '90px', maxWidth: '800px', margin: '0 auto' }}>
                    {children}
                </main>
                <Navbar />
            </body>
        </html>
    );
}
