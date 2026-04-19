'use client'

import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined'
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import QrCode2Outlined from '@mui/icons-material/QrCode2Outlined'
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined'
import HowToRegOutlined from '@mui/icons-material/HowToRegOutlined'

const FLOW_TITLE = 'Flujo del correo: emisor → tienda → retiro'

type MailFlowDetailContentProps = {
  /** When true, the main title is omitted (e.g. dialog uses `DialogTitle`). */
  omitTitle?: boolean
}

function MailFlowDetailContent({ omitTitle }: MailFlowDetailContentProps) {
  return (
    <>
      {!omitTitle && (
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {FLOW_TITLE}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Así encajan los pasos con lo que ves en la tabla (columna <strong>Estado</strong> y el
        icono del código junto a cada correo).
      </Typography>
      <List dense disablePadding>
        <ListItem alignItems="flex-start" sx={{ py: 0.75, px: 0 }}>
          <ListItemIcon sx={{ minWidth: 40, mt: 0.25 }}>
            <EditNoteOutlined color="primary" fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
            primary="1. El emisor registra el correo"
            secondary="En el portal indicas el RUT del destinatario (y, si quieres, comentarios). Se genera un código único, por ejemplo 16-04-2026-001. El estado inicial es «No recibido en tienda»."
          />
        </ListItem>
        <ListItem alignItems="flex-start" sx={{ py: 0.75, px: 0 }}>
          <ListItemIcon sx={{ minWidth: 40, mt: 0.25 }}>
            <LocalShippingOutlined color="primary" fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
            primary="2. El envío llega a la tienda"
            secondary="Debes llevar físicamente el paquete a la tienda. Ese traslado es independiente del registro en la web: primero existe el correo en el sistema, luego el paquete debe ingresar en tienda."
          />
        </ListItem>
        <ListItem alignItems="flex-start" sx={{ py: 0.75, px: 0 }}>
          <ListItemIcon sx={{ minWidth: 40, mt: 0.25 }}>
            <QrCode2Outlined color="primary" fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
            primary="3. Muestras el código generado por la página"
            secondary="En esta lista (y en «Últimos correos» del inicio) aparece el código y un icono para abrir el código de barras / QR. Úsalo en tienda para identificar el envío sin ambigüedades."
          />
        </ListItem>
        <ListItem alignItems="flex-start" sx={{ py: 0.75, px: 0 }}>
          <ListItemIcon sx={{ minWidth: 40, mt: 0.25 }}>
            <StorefrontOutlined color="primary" fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
            primary="4. La tienda recibe el correo en el sistema"
            secondary="Cuando el personal confirma el ingreso del paquete, el estado pasa a «En tienda». Hasta entonces el envío no está disponible para retiro con el flujo habitual."
          />
        </ListItem>
        <ListItem alignItems="flex-start" sx={{ py: 0.75, px: 0 }}>
          <ListItemIcon sx={{ minWidth: 40, mt: 0.25 }}>
            <HowToRegOutlined color="primary" fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
            primary="5. El emisor solicita / retira con el mismo código"
            secondary="Para pedir o retirar el paquete en tienda se usa el mismo código generado al registrar el correo (el que muestra el portal). Cuando el retiro queda cerrado, el estado pasa a «Retirado»."
          />
        </ListItem>
      </List>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1, mb: 0 }}>
        Resumen de estados: <strong>No recibido en tienda</strong> → <strong>En tienda</strong> →{' '}
        <strong>Retirado</strong>.
      </Typography>
    </>
  )
}

type MailFlowExplainerProps = {
  variant: 'compact' | 'detailed'
}

export default function MailFlowExplainer({ variant }: MailFlowExplainerProps) {
  const [flowDialogOpen, setFlowDialogOpen] = useState(false)

  if (variant === 'compact') {
    return (
      <>
        <Alert
          severity="info"
          sx={{
            mb: 2,
            py: { xs: 1.25, sm: 'inherit' },
            '& .MuiAlert-message': { width: '100%' }
          }}
        >
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            ¿Cómo funciona un correo?
          </Typography>

          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" color="text.secondary" component="div">
              El <strong>emisor</strong> lo registra aquí y obtiene un <strong>código</strong>{' '}
              (también en código de barras). Llevas el <strong>envío a la tienda</strong>;
              cuando ellos confirman el ingreso, el estado pasa a <strong>En tienda</strong>.
              Para <strong>solicitar o retirar</strong> el paquete en tienda se usa{' '}
              <strong>el mismo código</strong>. Al cerrarse el retiro verás <strong>Retirado</strong>.{' '}
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={() => setFlowDialogOpen(true)}
                underline="hover"
                sx={{
                  cursor: 'pointer',
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  letterSpacing: 'inherit',
                  lineHeight: 'inherit',
                  verticalAlign: 'baseline'
                }}
              >
                Ver paso a paso.
              </Link>
            </Typography>
          </Box>

          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
            <Typography
              variant="caption"
              color="text.secondary"
              component="p"
              sx={{ mb: 1.25, lineHeight: 1.45 }}
            >
              Código único, envío a tienda y retiro con el mismo código. El detalle completo va en
              un toque.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => setFlowDialogOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Ver paso a paso
            </Button>
          </Box>
        </Alert>

        <Dialog
          open={flowDialogOpen}
          onClose={() => setFlowDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          scroll="paper"
          aria-labelledby="mail-flow-dialog-title"
        >
          <DialogTitle id="mail-flow-dialog-title">{FLOW_TITLE}</DialogTitle>
          <DialogContent dividers>
            <MailFlowDetailContent omitTitle />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="contained" onClick={() => setFlowDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </>
    )
  }

  return (
    <Alert
      severity="info"
      id="flujo-correo"
      sx={{
        mb: 3,
        scrollMarginTop: { xs: 72, sm: 88 }
      }}
    >
      <MailFlowDetailContent />
    </Alert>
  )
}
