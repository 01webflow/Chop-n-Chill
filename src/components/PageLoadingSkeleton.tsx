export function PageLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-h-[85vh] bg-[#101010] pt-28 pb-20 px-5 sm:px-8 flex flex-col justify-between"
    >
      <div className="max-w-7xl mx-auto w-full space-y-12">
        {/* Global Branded Spinner Header */}
        <div className="flex flex-col items-center justify-center text-center pt-6 pb-4">
          <div className="relative w-14 h-14 flex items-center justify-center mb-5" aria-hidden="true">
            <span className="absolute inset-0 rounded-full border-2 border-[#C9A45C]/20" />
            <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#C9A45C] border-r-[#DFC082]/70 animate-spin motion-reduce:animate-none" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#C9A45C]" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C9A45C] mb-2">
            Chop &apos;n Chill · Kasoa, Ghana
          </p>
          <p className="font-display text-2xl sm:text-3xl text-[#F8F4EC]">
            Preparing Your Lounge Experience
          </p>
          <span className="sr-only">Loading Chop &apos;n Chill menu, gallery, and venue details...</span>
        </div>

        {/* Hero & Editorial Skeleton Preview */}
        <div className="rounded-sm border border-[#F8F4EC]/10 bg-[#151515] p-6 sm:p-10 space-y-6 animate-pulse motion-reduce:animate-none">
          <div className="h-3.5 w-44 rounded-sm bg-[#C9A45C]/20" />
          <div className="space-y-3 max-w-2xl">
            <div className="h-9 sm:h-11 w-full rounded-sm bg-[#F8F4EC]/10" />
            <div className="h-9 sm:h-11 w-4/5 rounded-sm bg-[#F8F4EC]/10" />
          </div>
          <div className="h-4 w-full max-w-lg rounded-sm bg-[#F8F4EC]/8" />
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="h-12 w-44 rounded-sm bg-[#C9A45C]/25" />
            <div className="h-12 w-44 rounded-sm bg-[#F8F4EC]/10" />
          </div>
        </div>

        {/* Section Cards Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse motion-reduce:animate-none">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="rounded-sm border border-[#F8F4EC]/10 bg-[#151515] overflow-hidden"
            >
              <div className="aspect-[4/3] bg-[#1C1C1C]" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-28 rounded-sm bg-[#C9A45C]/20" />
                <div className="h-5 w-3/4 rounded-sm bg-[#F8F4EC]/10" />
                <div className="h-3.5 w-full rounded-sm bg-[#F8F4EC]/8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
