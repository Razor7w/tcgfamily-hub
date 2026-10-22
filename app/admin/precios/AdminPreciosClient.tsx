'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  alpha,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined'
import QrCodeScanner from '@mui/icons-material/QrCodeScanner'
import Search from '@mui/icons-material/Search'
import { AdminStorePageHeading } from '@/components/admin/AdminStorePageHeading'
import {
  useCreateStoreProduct,
  useDeleteStoreProduct,
  useStoreProducts,
  useUpdateStoreProduct,
  lookupStoreProduct
} from '@/hooks/useStoreProducts'
import {
  formatStoreProductPriceClp,
  isValidStoreProductBarcode,
  normalizeStoreProductBarcode,
  normalizeStoreProductName,
  parseStoreProductPriceClp,
  STORE_PRODUCT_PAGE_SIZE,
  type StoreProductDto
} from '@/lib/store-product'
import StoreProductBarcodeScanner from '@/components/admin/StoreProductBarcodeScanner'

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; product: StoreProductDto }
  | { status: 'missing'; barcode: string }
  | { status: 'error'; message: string }

export default function AdminPreciosClient() {
  const inputRef = useRef<HTMLInputElement>(null)

  const [barcode, setBarcode] = useState('')
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' })
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [listQuery, setListQuery] = useState('')
  const [page, setPage] = useState(1)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StoreProductDto | null>(null)

  const list = useStoreProducts(listQuery, page)
  const createProduct = useCreateStoreProduct()
  const updateProduct = useUpdateStoreProduct()
  const deleteProduct = useDeleteStoreProduct()

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    inputRef.current?.focus()
  }, [])

  const applyBarcode = (raw: string) => {
    const next = normalizeStoreProductBarcode(raw)
    setBarcode(next)
    setCameraOn(false)
    if (isValidStoreProductBarcode(next)) {
      void runLookup(next, { focusInput: false })
    }
  }

  const runLookup = async (
    code = barcode,
    options?: { focusInput?: boolean }
  ) => {
    const normalized = normalizeStoreProductBarcode(code)
    if (!isValidStoreProductBarcode(normalized)) {
      setLookup({ status: 'error', message: 'Ingresa o lee un código válido.' })
      return
    }
    setLookup({ status: 'loading' })
    setNotice(null)
    try {
      const result = await lookupStoreProduct(normalized)
      if (result.found && result.product) {
        setLookup({ status: 'found', product: result.product })
        setName(result.product.name)
        setPrice(String(result.product.priceClp))
      } else {
        setLookup({ status: 'missing', barcode: normalized })
        setName('')
        setPrice('')
      }
    } catch (error) {
      setLookup({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo consultar el código'
      })
    }
    if (options?.focusInput !== false) {
      window.setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    }
  }

  const saveNew = async () => {
    if (lookup.status !== 'missing') return
    const productName = normalizeStoreProductName(name)
    const priceClp = parseStoreProductPriceClp(price)
    if (!productName || priceClp == null) return
    try {
      const product = await createProduct.mutateAsync({
        barcode: lookup.barcode,
        name: productName,
        priceClp
      })
      setLookup({ status: 'found', product })
      setName(product.name)
      setPrice(String(product.priceClp))
      setPage(1)
      setNotice('Producto registrado.')
    } catch (error) {
      setLookup({
        status: 'error',
        message: error instanceof Error ? error.message : 'No se pudo registrar'
      })
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    const leaveEmptyPage = (list.data?.products.length ?? 0) <= 1 && page > 1
    try {
      await deleteProduct.mutateAsync(id)
      if (lookup.status === 'found' && lookup.product.id === id) {
        setLookup({ status: 'idle' })
        setName('')
        setPrice('')
      }
      if (leaveEmptyPage) {
        setPage(current => Math.max(1, current - 1))
      }
      setNotice(`Se borró ${deleteTarget.name}.`)
      setDeleteTarget(null)
    } catch (error) {
      setLookup({
        status: 'error',
        message: error instanceof Error ? error.message : 'No se pudo borrar'
      })
      setDeleteTarget(null)
    }
  }

  const saveEdit = async () => {
    if (lookup.status !== 'found') return
    const productName = normalizeStoreProductName(name)
    const priceClp = parseStoreProductPriceClp(price)
    if (!productName || priceClp == null) return
    try {
      const product = await updateProduct.mutateAsync({
        id: lookup.product.id,
        name: productName,
        priceClp
      })
      setLookup({ status: 'found', product })
      setPage(1)
      setNotice('Datos actualizados.')
    } catch (error) {
      setLookup({
        status: 'error',
        message:
          error instanceof Error ? error.message : 'No se pudo actualizar'
      })
    }
  }

  const products = list.data?.products ?? []
  const total = list.data?.total ?? 0
  const pageSize = list.data?.pageSize ?? STORE_PRODUCT_PAGE_SIZE
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pageClamped = Math.min(page, pageCount)
  const rangeFrom = total === 0 ? 0 : (pageClamped - 1) * pageSize + 1
  const rangeTo = Math.min(pageClamped * pageSize, total)

  return (
    <Box
      sx={t => ({
        minHeight: '100dvh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: { xs: 2, sm: 4 }
      })}
    >
      <Container maxWidth="md">
        <Stack spacing={{ xs: 2.5, sm: 3 }}>
          <AdminStorePageHeading showActiveStoreAvatar>
            <Box>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <LocalOfferOutlined color="primary" />
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    fontSize: { xs: '1.65rem', sm: '2rem' }
                  }}
                >
                  Precios
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75, maxWidth: 560 }}
              >
                Lee el código de barras para ver el precio. Si el producto no
                está, regístralo con nombre y precio vinculado a ese código.
              </Typography>
            </Box>
          </AdminStorePageHeading>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5, md: 3 },
              borderRadius: 3,
              border: 1,
              borderColor: 'divider'
            }}
          >
            <Stack spacing={2}>
              <Box
                component="form"
                onSubmit={event => {
                  event.preventDefault()
                  void runLookup()
                }}
              >
                <TextField
                  inputRef={inputRef}
                  fullWidth
                  autoFocus
                  label="Código de barras"
                  placeholder="Escanea o escribe el código"
                  value={barcode}
                  onChange={event => setBarcode(event.target.value)}
                  size="medium"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="Leer con cámara"
                            onClick={() => {
                              setCameraError(null)
                              setCameraOn(open => !open)
                            }}
                          >
                            <QrCodeScanner />
                          </IconButton>
                          <IconButton
                            type="submit"
                            aria-label="Consultar código"
                            color="primary"
                          >
                            <Search />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </Box>

              {cameraOn ? (
                <StoreProductBarcodeScanner
                  onDetect={applyBarcode}
                  onClose={() => setCameraOn(false)}
                  onError={message => {
                    setCameraError(message)
                    setCameraOn(false)
                  }}
                />
              ) : null}

              {cameraError ? (
                <Alert severity="info">{cameraError}</Alert>
              ) : null}
              {notice ? (
                <Alert severity="success" onClose={() => setNotice(null)}>
                  {notice}
                </Alert>
              ) : null}

              {lookup.status === 'loading' ? (
                <Typography color="text.secondary">Consultando…</Typography>
              ) : null}

              {lookup.status === 'error' ? (
                <Alert severity="error">{lookup.message}</Alert>
              ) : null}

              {lookup.status === 'found' ? (
                <Stack spacing={1.75}>
                  <Box
                    sx={t => ({
                      p: { xs: 2, sm: 2.5 },
                      borderRadius: 2,
                      bgcolor: alpha(t.palette.success.main, 0.08),
                      border: `1px solid ${alpha(t.palette.success.main, 0.24)}`
                    })}
                  >
                    <Typography variant="overline" color="text.secondary">
                      {lookup.product.barcode}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {lookup.product.name}
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 800,
                        letterSpacing: '-0.03em',
                        fontVariantNumeric: 'tabular-nums',
                        mt: 0.5
                      }}
                    >
                      {formatStoreProductPriceClp(lookup.product.priceClp)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 1.5,
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'minmax(0, 1.4fr) minmax(0, 0.8fr) auto'
                      },
                      alignItems: 'start'
                    }}
                  >
                    <TextField
                      label="Nombre"
                      value={name}
                      onChange={event => setName(event.target.value)}
                      size="small"
                    />
                    <TextField
                      label="Precio"
                      value={price}
                      onChange={event => setPrice(event.target.value)}
                      size="small"
                      inputProps={{ inputMode: 'numeric' }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        onClick={() => void saveEdit()}
                        disabled={updateProduct.isPending}
                        sx={{ minHeight: 40 }}
                      >
                        {updateProduct.isPending ? 'Guardando…' : 'Actualizar'}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteOutline />}
                        onClick={() => setDeleteTarget(lookup.product)}
                        disabled={deleteProduct.isPending}
                        sx={{ minHeight: 40 }}
                      >
                        Borrar
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              ) : null}

              {lookup.status === 'missing' ? (
                <Stack spacing={1.75}>
                  <Alert severity="warning">
                    El código <strong>{lookup.barcode}</strong> no está
                    registrado. Completa el nombre y el precio para crearlo.
                  </Alert>
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 1.5,
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'minmax(0, 1.4fr) minmax(0, 0.8fr) auto'
                      },
                      alignItems: 'start'
                    }}
                  >
                    <TextField
                      label="Nombre del producto"
                      value={name}
                      onChange={event => setName(event.target.value)}
                      size="small"
                      required
                      autoFocus
                    />
                    <TextField
                      label="Precio"
                      value={price}
                      onChange={event => setPrice(event.target.value)}
                      size="small"
                      required
                      inputProps={{ inputMode: 'numeric' }}
                    />
                    <Button
                      variant="contained"
                      onClick={() => void saveNew()}
                      disabled={
                        createProduct.isPending ||
                        !normalizeStoreProductName(name) ||
                        parseStoreProductPriceClp(price) == null
                      }
                      sx={{ minHeight: 40 }}
                    >
                      {createProduct.isPending ? 'Guardando…' : 'Registrar'}
                    </Button>
                  </Box>
                </Stack>
              ) : null}
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5, md: 3 },
              borderRadius: 3,
              border: 1,
              borderColor: 'divider'
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ sm: 'center' }}
              sx={{ mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Productos de la tienda
              </Typography>
              <TextField
                size="small"
                label="Buscar"
                placeholder="Nombre o código"
                value={listQuery}
                onChange={event => {
                  setListQuery(event.target.value)
                  setPage(1)
                }}
                sx={{ width: { xs: '100%', sm: 260 } }}
              />
            </Stack>
            {list.isPending && products.length === 0 ? (
              <Typography color="text.secondary">Cargando…</Typography>
            ) : products.length === 0 ? (
              <Typography color="text.secondary">
                {listQuery.trim()
                  ? 'No hay productos que coincidan con la búsqueda.'
                  : 'Aún no hay productos registrados en esta tienda.'}
              </Typography>
            ) : (
              <Stack spacing={1}>
                {products.map(product => (
                  <Box
                    key={product.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1,
                      p: 1.25,
                      borderRadius: 2,
                      border: 1,
                      borderColor:
                        lookup.status === 'found' &&
                        lookup.product.id === product.id
                          ? 'primary.main'
                          : 'divider',
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Box
                      component="button"
                      type="button"
                      onClick={() => {
                        setBarcode(product.barcode)
                        setLookup({ status: 'found', product })
                        setName(product.name)
                        setPrice(String(product.priceClp))
                        inputRef.current?.focus()
                      }}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 2,
                        textAlign: 'left',
                        border: 0,
                        bgcolor: 'transparent',
                        cursor: 'pointer',
                        color: 'inherit',
                        p: 0
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700 }}>
                          {product.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {product.barcode}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}
                      >
                        {formatStoreProductPriceClp(product.priceClp)}
                      </Typography>
                    </Box>
                    <IconButton
                      aria-label={`Borrar ${product.name}`}
                      color="error"
                      onClick={event => {
                        event.stopPropagation()
                        setDeleteTarget(product)
                      }}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </Box>
                ))}
                <Stack alignItems="center" spacing={0.75} sx={{ pt: 1 }}>
                  {pageCount > 1 ? (
                    <Pagination
                      count={pageCount}
                      page={pageClamped}
                      onChange={(_, next) => setPage(next)}
                      color="primary"
                      size="small"
                      showFirstButton
                      showLastButton
                      sx={{
                        '& .MuiPagination-ul': {
                          flexWrap: 'wrap',
                          justifyContent: 'center'
                        }
                      }}
                    />
                  ) : null}
                  <Typography variant="caption" color="text.secondary">
                    {rangeFrom}–{rangeTo} de {total}
                  </Typography>
                </Stack>
              </Stack>
            )}
          </Paper>
        </Stack>
      </Container>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      >
        <DialogTitle>Borrar producto</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Eliminar &quot;{deleteTarget?.name}&quot;? Esta acción no se puede
            deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void confirmDelete()}
            disabled={deleteProduct.isPending}
          >
            {deleteProduct.isPending ? 'Borrando…' : 'Borrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
