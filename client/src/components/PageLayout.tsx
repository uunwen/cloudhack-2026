import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageLayoutProps {
  children: ReactNode
}

function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background-cream animate-fade-in">
      <header className="border-b border-primary-yellow">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <img src="/LoreDrop.png" alt="Lore Drop mascot" className="h-10 w-auto" />
            <span className="font-sans font-bold text-lg text-text-dark">Lore Drop</span>
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-16">{children}</main>
    </div>
  )
}

export default PageLayout
