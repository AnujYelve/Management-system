import './globals.css'

export const metadata = {
  title: 'Library Management System',
  description: 'Multi-Store Library Management Marketplace',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

