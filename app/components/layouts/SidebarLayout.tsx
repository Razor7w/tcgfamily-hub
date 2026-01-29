import { Grid } from '@mui/material'
import React from 'react'

type SidebarLayoutProps = {
  sidebar: React.ReactNode
  children: React.ReactNode
  sidebarSize?: number
  contentSize?: number
}

export default function SidebarLayout({
  sidebar,
  children,
  sidebarSize = 3,
  contentSize = 9
}: SidebarLayoutProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={sidebarSize}>{sidebar}</Grid>
      <Grid size={contentSize}>{children}</Grid>
    </Grid>
  )
}
