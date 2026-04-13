'use client'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Grid
} from '@mui/material'
import { useSession } from 'next-auth/react'
import { ExpandMore, MarkunreadMailbox } from '@mui/icons-material'
import CardMail from '@/components/dashboard/CardMails'

export default function DashboardPage() {
  const { data: session } = useSession()
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 4
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
          Hola {session && session.user.name}
        </Typography>
        <Grid container>
          <Accordion defaultExpanded sx={{ width: '100%' }}>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel1-content"
              id="panel1-header"
            >
              <MarkunreadMailbox sx={{ mr: 2 }} />
              <Typography component="span">Últimos Correos</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <CardMail />
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="panel2-content"
              id="panel2-header"
            >
              <Typography component="span">Crédito de tienda</Typography>
            </AccordionSummary>
            <AccordionDetails>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              Suspendisse malesuada lacus ex, sit amet blandit leo lobortis
              eget.
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Container>
    </Box>
  )
}
