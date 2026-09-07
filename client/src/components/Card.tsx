import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-md p-8 ${className}`}
      {...props}
    />
  )
}

export default Card
