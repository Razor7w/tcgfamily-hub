'use client'

import { Box, Card, CardContent, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'

interface Module {
  id: string
  name: string
  icon: React.ReactNode
  route?: string
}

interface CardModuleProps {
  module: Module
}

export default function CardModule({ module }: CardModuleProps) {
  const router = useRouter()
  const handleCardClick = (module: Module) => {
    if (module.route) {
      router.push(module.route)
    }
  }
  return (
    <>
      <Card
        onClick={() => handleCardClick(module)}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: module.route ? 'pointer' : 'default',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': module.route
            ? {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            : {},
          opacity: module.route ? 1 : 0.6
        }}
      >
        <CardContent
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            py: 4
          }}
        >
          <Box
            sx={{
              fontSize: 48,
              color: 'primary.main',
              mb: 2
            }}
          >
            {module.icon}
          </Box>
          <Typography variant="h6" component="h2">
            {module.name}
          </Typography>
        </CardContent>
      </Card>
    </>
  )
}
