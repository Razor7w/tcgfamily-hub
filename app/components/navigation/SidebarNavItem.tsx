'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material'
import { useSidebarRail } from '@/components/navigation/useSidebarRail'

type SidebarNavItemProps = {
  label: string
  icon: ReactNode
  href?: string
  selected?: boolean
  onClick?: () => void
  /** Padding left (theme spacing) while labels are visible. */
  inset?: number
  trailing?: ReactNode
  ariaExpanded?: boolean
}

export default function SidebarNavItem({
  label,
  icon,
  href,
  selected,
  onClick,
  inset,
  trailing,
  ariaExpanded
}: SidebarNavItemProps) {
  const rail = useSidebarRail()
  const button = (
    <ListItemButton
      {...(href ? { component: Link, href } : {})}
      selected={selected}
      onClick={onClick}
      aria-label={rail ? label : undefined}
      {...(ariaExpanded != null ? { 'aria-expanded': ariaExpanded } : {})}
      sx={{
        ...(inset != null && !rail ? { pl: inset } : null),
        ...(rail ? { justifyContent: 'center', px: 1.25, minHeight: 44 } : null)
      }}
    >
      <ListItemIcon
        sx={rail ? { minWidth: 0, justifyContent: 'center' } : undefined}
      >
        {icon}
      </ListItemIcon>
      {rail ? null : <ListItemText primary={label} />}
      {rail ? null : trailing}
    </ListItemButton>
  )

  return (
    <ListItem disablePadding>
      {rail ? (
        <Tooltip title={label} placement="right">
          {button}
        </Tooltip>
      ) : (
        button
      )}
    </ListItem>
  )
}
