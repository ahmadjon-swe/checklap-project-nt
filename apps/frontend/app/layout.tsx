import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/providers';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'CheckLab — Online Exam Platform',
  description: 'Create and take exams online',
};

const themeScript = `(function(){try{var t=localStorage.getItem('quiz-theme');var theme=t?JSON.parse(t).state?.theme:'dark';if(theme!=='light')document.documentElement.classList.add('dark');var p=localStorage.getItem('quiz-premium');var tier=p?JSON.parse(p).state?.tier:'free';if(tier==='pro')document.documentElement.classList.add('tier-pro');else if(tier==='enterprise')document.documentElement.classList.add('tier-enterprise');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased transition-colors">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
