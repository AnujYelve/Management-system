import './globals.css'
import AIChatbot from '@/components/AIChatbot'

export const metadata = {
  title: 'LibraryHub — Multi-Store Library Management',
  description: 'Discover, issue, and manage books across multiple local library stores — powered by AI.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <AIChatbot />
      </body>
    </html>
  )
}
