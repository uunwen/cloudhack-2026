interface LoadingStateProps {
  message: string
}

function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="flex gap-2">
        <span className="h-3 w-3 rounded-full bg-accent-coral animate-bounce [animation-delay:-0.3s]" />
        <span className="h-3 w-3 rounded-full bg-accent-coral animate-bounce [animation-delay:-0.15s]" />
        <span className="h-3 w-3 rounded-full bg-accent-coral animate-bounce" />
      </div>
      <p className="font-sans text-text-dark/70 text-center">{message}</p>
    </div>
  )
}

export default LoadingState
