export function DecorativeBlobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-blob" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[hsl(var(--coral)/.08)] rounded-full blur-3xl animate-blob-delayed" />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[hsl(var(--lavender)/.08)] rounded-full blur-3xl animate-blob" />
      <div className="absolute top-3/4 right-1/3 w-48 h-48 bg-[hsl(var(--amber)/.06)] rounded-full blur-3xl animate-blob-delayed" />
    </div>
  )
}
