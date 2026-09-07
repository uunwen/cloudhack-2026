import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

const baseClasses =
  'rounded-2xl px-6 py-3 font-semibold font-sans transition-transform duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral disabled:opacity-50 disabled:cursor-not-allowed'

const variantClasses = {
  primary: 'bg-accent-coral text-white hover:opacity-90',
  secondary: 'bg-primary-yellow text-text-dark hover:opacity-90',
}

function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}

export default Button
