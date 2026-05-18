import type { SVGProps } from 'react'
import {
  BRAND_MARK_VIEWBOX,
  brandMarkSvgInner
} from '@/components/brand/brand-mark-paths'

/** Isotipo TCG Nexo: cartas en contorno + N sobre fondo teal. */
export default function BrandMarkSvg({
  size = 32,
  title,
  ...props
}: SVGProps<SVGSVGElement> & {
  size?: number
  title?: string
}) {
  const labelled = Boolean(title)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={BRAND_MARK_VIEWBOX}
      width={size}
      height={size}
      fill="none"
      role={labelled ? 'img' : 'presentation'}
      aria-hidden={labelled ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {brandMarkSvgInner}
    </svg>
  )
}
