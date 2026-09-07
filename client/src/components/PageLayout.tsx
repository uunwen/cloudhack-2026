import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageLayoutProps {
  children: ReactNode
  maxWidth?: string
}

function PageLayout({ children, maxWidth = 'max-w-2xl' }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background-cream animate-fade-in">
      <header className="border-b border-primary-yellow">
        <div className={`${maxWidth} mx-auto px-6 py-4 flex items-center justify-between`}>
          <Link to="/" className="flex items-center gap-2 w-fit">
            <img src="/LoreDrop.png" alt="Lore Drop mascot" className="h-10 w-auto" />
            <span className="font-sans font-bold text-lg text-text-dark">Lore Drop</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/upload" className="text-sm font-sans text-text-dark hover:underline">
              Try now
            </Link>
            <Link to="/sessions" className="text-sm font-sans text-text-dark hover:underline">
              My sessions
            </Link>
          </div>
        </div>
      </header>
      <main className={`${maxWidth} mx-auto px-6 py-16`}>{children}</main>
    </div>
  )
}

export default PageLayout
