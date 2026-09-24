export function Logo({ showTagline = false }: { showTagline?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50" cy="50" rx="45" ry="18" stroke="#7C3AED" strokeWidth="4" transform="rotate(0 50 50)" />
        <ellipse cx="50" cy="50" rx="45" ry="18" stroke="#F59E0B" strokeWidth="4" transform="rotate(60 50 50)" />
        <ellipse cx="50" cy="50" rx="45" ry="18" stroke="#3B82F6" strokeWidth="4" transform="rotate(120 50 50)" />
        <circle cx="50" cy="50" r="14" fill="#16A34A" />
        <text
          x="50"
          y="54"
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill="white"
          fontFamily="Arial, sans-serif"
        >
          ARCH
        </text>
      </svg>

      <div className="flex flex-col leading-none">
        <span className="text-lg font-extrabold tracking-wide text-white">
          ARCHON NELL
        </span>
        <span className="text-[10px] font-semibold tracking-[0.2em] text-red-500">
          INCORPORATED
        </span>
        {showTagline && (
          <span className="mt-0.5 text-[9px] font-medium text-white/70">
            Partner &nbsp;○&nbsp; Innovator &nbsp;○&nbsp; Solutions Provider
          </span>
        )}
      </div>
    </div>
  );
}