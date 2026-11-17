export default function PageLoading({ label = 'page' }: { label?: string }) {
  return (
    <div
      className="min-h-screen bg-canvas font-[var(--font-poppins)]"
      role="status"
      aria-label={`Loading ${label}`}
      aria-busy="true"
    >
      <span className="sr-only">Loading {label} content...</span>
      <div className="h-16 animate-pulse border-b border-stone-200 bg-white motion-reduce:animate-none" />
      <div className="min-h-[65vh] animate-pulse bg-[#E8DCCB] motion-reduce:animate-none">
        <div className="mx-auto flex min-h-[65vh] max-w-5xl flex-col justify-center gap-5 px-6">
          <div className="h-8 w-3/4 max-w-lg rounded bg-white/50" />
          <div className="h-8 w-1/2 max-w-sm rounded bg-white/40" />
          <div className="mt-2 h-4 w-full max-w-md rounded bg-white/40" />
          <div className="h-4 w-4/5 max-w-sm rounded bg-white/40" />
          <div className="mt-3 h-10 w-44 rounded-md bg-[#A50000]/25" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
        <div className="mx-auto h-7 w-56 animate-pulse rounded bg-stone-200 motion-reduce:animate-none" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-xl border border-stone-200 bg-white p-4 motion-reduce:animate-none">
              <div className="aspect-[16/9] rounded-lg bg-stone-200" />
              <div className="mt-4 h-4 w-3/4 rounded bg-stone-200" />
              <div className="mt-3 h-3 w-full rounded bg-stone-100" />
              <div className="mt-2 h-3 w-4/5 rounded bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
