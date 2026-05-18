/**
 * Isotipo TCG Nexo (viewBox 64×64).
 * Mantener en sync con `public/brand/tcg-nexo-mark.svg` y `app/icon.svg`.
 */
export const BRAND_MARK_VIEWBOX = '0 0 64 64'

export const brandMarkSvgInner = (
  <>
    <rect width="64" height="64" rx="14" fill="#0f766e" />
    <g transform="translate(32 34)">
      <rect
        x={-7.25}
        y={-10.75}
        width={14.5}
        height={21.5}
        rx={2.25}
        fill="#fafafa"
        fillOpacity={0.17}
        transform="rotate(-13)"
      />
      <rect
        x={-7.25}
        y={-10.75}
        width={14.5}
        height={21.5}
        rx={2.25}
        fill="#fafafa"
        fillOpacity={0.28}
        transform="rotate(11)"
      />
      <path
        d="M-9.5 5.5c4.2 2.2 8.6 2.2 12.8 0"
        stroke="#14b8a6"
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
        opacity={0.95}
      />
    </g>
    <path
      fill="#fafafa"
      d="M20.25 18.25h5.4v13.55L36.1 18.25H41.75v27.5h-5.4V31.7L25.65 45.75H20.25V18.25z"
    />
  </>
)
