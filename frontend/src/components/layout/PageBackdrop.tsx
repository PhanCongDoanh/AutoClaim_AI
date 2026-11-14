import heroCarUrl from '@/assets/hero-car.jpg'

/**
 * Purely decorative layer behind every page: soft light waves and a blurred car
 * in the top-right corner. Never intercepts pointer events.
 */
export function PageBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden" aria-hidden="true">
      <svg
        className="absolute inset-x-0 top-0 h-full w-full"
        viewBox="0 0 1440 420"
        preserveAspectRatio="none"
        fill="none"
      >
        <path d="M560 300C820 120 1040 40 1440 70V0H560Z" fill="url(#backdrop-wave-a)" />
        <path d="M640 330C900 170 1120 110 1440 150" stroke="white" strokeOpacity="0.9" strokeWidth="2" />
        <path d="M720 360C960 230 1180 190 1440 220" stroke="white" strokeOpacity="0.55" strokeWidth="1.5" />
        <defs>
          <linearGradient id="backdrop-wave-a" x1="560" y1="0" x2="1440" y2="300" gradientUnits="userSpaceOnUse">
            <stop stopColor="#dbe7fb" stopOpacity="0" />
            <stop offset="1" stopColor="#cddcf8" stopOpacity="0.75" />
          </linearGradient>
        </defs>
      </svg>

      <img
        src={heroCarUrl}
        alt=""
        className="absolute right-[6%] top-6 hidden w-[340px] select-none opacity-60 mix-blend-multiply blur-[5px] [mask-image:radial-gradient(closest-side,black_60%,transparent)] md:block xl:right-[10%] xl:w-[380px]"
      />
    </div>
  )
}
