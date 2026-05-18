'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  Collapse,
  Container,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Divider,
  Snackbar
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { AdminStorePageHeading } from '@/components/admin/AdminStorePageHeading'
import { useQueryClient } from '@tanstack/react-query'
import { meStoresQueryKey } from '@/hooks/useMeStores'
import { useSession } from 'next-auth/react'

type StoreRow = {
  id: string
  name: string
  slug: string
  logoUrl: string
  isActive: boolean
  address: string
  websiteUrl: string
  instagramUrl: string
}

type StoresPayload = {
  canCreateStores: boolean
  stores: StoreRow[]
}

type MemRow = { userId: string; role: string; email: string; name: string }

async function patchStore(storeId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/admin/stores/${storeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok)
    throw new Error(typeof data?.error === 'string' ? data.error : 'Error')
  return data as StoreRow
}

async function uploadStoreLogo(storeId: string, file: File) {
  const contentType =
    file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg'
  const pres = await fetch('/api/r2/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folder: 'store-branding',
      storeId,
      filename: file.name || 'logo.jpg',
      contentType
    })
  })
  const pre = await pres.json()
  if (!pres.ok) {
    throw new Error(
      typeof pre?.error === 'string' ? pre.error : 'Presign falló'
    )
  }
  const { uploadUrl, key, publicUrl } = pre as {
    uploadUrl: string
    key: string
    publicUrl: string
  }
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file
  })
  if (!put.ok) throw new Error('No se pudo subir la imagen')
  return patchStore(storeId, {
    logoUrl: publicUrl,
    logoKey: key
  })
}

export default function AdminTiendasPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const [payload, setPayload] = useState<StoresPayload | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    msg: string
    sev: 'success' | 'error'
  } | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [memLoading, setMemLoading] = useState<string | null>(null)
  const [membershipsByStore, setMembershipsByStore] = useState<
    Record<string, MemRow[]>
  >({})
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<'owner' | 'store_admin'>('store_admin')
  const [savingMembership, setSavingMembership] = useState<string | null>(null)
  const [profileDraft, setProfileDraft] = useState({
    address: '',
    websiteUrl: '',
    instagramUrl: ''
  })
  const [savingProfile, setSavingProfile] = useState<string | null>(null)

  const load = useCallback(async () => {
    setMessage(null)
    try {
      const res = await fetch('/api/admin/stores')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string' ? data.error : 'No autorizado'
        )
      }
      setPayload(data as StoresPayload)
    } catch {
      setMessage('No se pudieron cargar las tiendas')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const fetchMembershipsForStore = async (storeId: string) => {
    setMemLoading(storeId)
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/memberships`)
      const data = await res.json()
      if (!res.ok) throw new Error()
      setMembershipsByStore(prev => ({
        ...prev,
        [storeId]: Array.isArray(data.memberships)
          ? (data.memberships as MemRow[])
          : []
      }))
    } catch {
      setMessage('No se cargó el equipo de esa tienda')
    } finally {
      setMemLoading(null)
    }
  }

  const ensureMemberships = async (storeId: string) => {
    if (membershipsByStore[storeId]) return
    await fetchMembershipsForStore(storeId)
  }

  const toggleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null)
      return
    }
    const store = payload?.stores.find(x => x.id === id)
    if (store) {
      setProfileDraft({
        address: store.address ?? '',
        websiteUrl: store.websiteUrl ?? '',
        instagramUrl: store.instagramUrl ?? ''
      })
    }
    setExpanded(id)
    setAddEmail('')
    setAddRole('store_admin')
    void ensureMemberships(id)
  }

  const onSavePublicProfile = async (storeId: string) => {
    setSavingProfile(storeId)
    setMessage(null)
    try {
      const row = await patchStore(storeId, {
        address: profileDraft.address,
        websiteUrl: profileDraft.websiteUrl,
        instagramUrl: profileDraft.instagramUrl
      })
      setPayload(prev => {
        if (!prev) return prev
        return {
          ...prev,
          stores: prev.stores.map(x =>
            x.id === storeId
              ? {
                  ...x,
                  address: row.address ?? '',
                  websiteUrl: row.websiteUrl ?? '',
                  instagramUrl: row.instagramUrl ?? ''
                }
              : x
          )
        }
      })
      const uid = session?.user?.id ? String(session.user.id) : ''
      if (uid) {
        void queryClient.invalidateQueries({
          queryKey: meStoresQueryKey(uid)
        })
      }
      setToast({
        sev: 'success',
        msg: 'Datos públicos guardados (visibles en el hub de la tienda)'
      })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error')
    } finally {
      setSavingProfile(null)
    }
  }

  const onCreate = async () => {
    setCreating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, slug: newSlug })
      })
      const data = await res.json()
      if (!res.ok)
        throw new Error(
          typeof data?.error === 'string' ? data.error : 'Error al crear'
        )
      setPayload(prev =>
        prev
          ? {
              ...prev,
              stores: [...prev.stores, data]
            }
          : null
      )
      setNewName('')
      setNewSlug('')
      setToast({ sev: 'success', msg: 'Tienda creada' })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error')
    } finally {
      setCreating(false)
    }
  }

  const refreshMembers = async (storeId: string) => {
    await fetchMembershipsForStore(storeId)
  }

  const onAddMembership = async (storeId: string) => {
    setSavingMembership(storeId)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/stores/${storeId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addEmail.trim(),
          role: addRole
        })
      })
      const data = await res.json()
      if (!res.ok)
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'No se pudo agregar usuario'
        )
      setAddEmail('')
      await refreshMembers(storeId)
      setToast({ sev: 'success', msg: 'Membresía guardada' })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error')
    } finally {
      setSavingMembership(null)
    }
  }

  const onRemoveMembership = async (storeId: string, userId: string) => {
    try {
      const res = await fetch(
        `/api/admin/stores/${storeId}/memberships?userId=${encodeURIComponent(userId)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(typeof data?.error === 'string' ? data.error : 'Error')
      }
      await refreshMembers(storeId)
      setToast({ sev: 'success', msg: 'Miembro quitado del equipo' })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Box
      sx={t => ({
        minHeight: '100vh',
        background: `linear-gradient(165deg, ${alpha(t.palette.primary.main, 0.06)} 0%, ${t.palette.background.default} 38%, ${t.palette.background.default} 100%)`,
        py: 4
      })}
    >
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Button component={Link} href="/dashboard" startIcon={<ArrowBack />}>
            Volver al panel
          </Button>
          <AdminStorePageHeading>
            <Stack spacing={1}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Tiendas
              </Typography>
              <Typography color="text.secondary">
                Alta de nuevas ubicaciones solamente desde TCGFamily HQ. En cada
                tienda puedes subir marca y definir equipo (dueño o{' '}
                <code style={{ margin: '0 2px' }}>store_admin</code>). El
                contexto de tienda en el panel lo elige cada usuario desde el
                ícono de tienda del encabezado o desde{' '}
                <Link href="/dashboard/perfil" underline="hover">
                  Perfil
                </Link>
                .
              </Typography>
            </Stack>
          </AdminStorePageHeading>

          {message ? (
            <Alert severity="error" onClose={() => setMessage(null)}>
              {message}
            </Alert>
          ) : null}

          {payload?.canCreateStores ? (
            <Stack spacing={2} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Nueva tienda
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Nombre"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Slug (único)"
                  value={newSlug}
                  onChange={e =>
                    setNewSlug(e.target.value.toLowerCase().replace(/\s/g, '-'))
                  }
                  fullWidth
                  placeholder="nexo-maipu"
                  helperText="minúsculas, números y guiones"
                />
              </Stack>
              <Button
                variant="contained"
                disabled={
                  creating ||
                  !newName.trim() ||
                  !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(newSlug.trim())
                }
                onClick={() => void onCreate()}
              >
                Crear tienda
              </Button>
            </Stack>
          ) : null}

          <Divider />

          {(payload?.stores ?? []).length === 0 ? (
            <Typography color="text.secondary">
              Sin tiendas para listar.
            </Typography>
          ) : (
            payload?.stores.map(s => (
              <Box
                key={s.id}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper'
                }}
              >
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      {(() => {
                        const logo = (s.logoUrl ?? '').trim()
                        return (
                          <Avatar
                            variant="rounded"
                            alt={`Logo ${s.name}`}
                            {...(logo
                              ? {
                                  src: logo,
                                  children: undefined
                                }
                              : {
                                  src: undefined,
                                  children: (
                                    (s.slug || '?').slice(0, 2) || '?'
                                  ).toUpperCase()
                                })}
                            sx={{
                              width: 48,
                              height: 48,
                              bgcolor: logo ? 'action.hover' : undefined,
                              '& .MuiAvatar-img': {
                                objectFit: 'contain',
                                width: '100%',
                                height: '100%',
                                transform: logo ? 'scale(0.92)' : undefined
                              }
                            }}
                          />
                        )
                      })()}
                      <Box>
                        <Typography variant="h6">{s.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {s.slug} · {!s.isActive ? 'inactiva' : 'activa'}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button component="label" variant="outlined" size="small">
                        Subir logo
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={ev => {
                            const f = ev.target.files?.[0]
                            if (f)
                              void uploadStoreLogo(s.id, f)
                                .then(row => {
                                  setPayload(prev => {
                                    if (!prev) return prev
                                    return {
                                      ...prev,
                                      stores: prev.stores.map(x =>
                                        x.id === s.id
                                          ? { ...x, logoUrl: row.logoUrl ?? '' }
                                          : x
                                      )
                                    }
                                  })
                                })
                                .catch(err => {
                                  setMessage(
                                    err instanceof Error ? err.message : 'Error'
                                  )
                                })
                            ev.target.value = ''
                          }}
                        />
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => toggleExpand(s.id)}
                      >
                        {expanded === s.id ? 'Cerrar detalle' : 'Editar tienda'}
                      </Button>
                    </Stack>
                  </Stack>

                  <Collapse in={expanded === s.id}>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Datos públicos (hub /{s.slug})
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Dirección y enlaces que verán los jugadores en la página
                        de la tienda.
                      </Typography>
                      <TextField
                        label="Dirección"
                        value={expanded === s.id ? profileDraft.address : ''}
                        onChange={e => {
                          if (expanded === s.id) {
                            setProfileDraft(d => ({
                              ...d,
                              address: e.target.value
                            }))
                          }
                        }}
                        fullWidth
                        multiline
                        minRows={2}
                        placeholder="Av. ejemplo 123, Santiago"
                      />
                      <TextField
                        label="Sitio web"
                        value={expanded === s.id ? profileDraft.websiteUrl : ''}
                        onChange={e => {
                          if (expanded === s.id) {
                            setProfileDraft(d => ({
                              ...d,
                              websiteUrl: e.target.value
                            }))
                          }
                        }}
                        fullWidth
                        placeholder="https://mitienda.cl"
                      />
                      <TextField
                        label="Instagram"
                        value={
                          expanded === s.id ? profileDraft.instagramUrl : ''
                        }
                        onChange={e => {
                          if (expanded === s.id) {
                            setProfileDraft(d => ({
                              ...d,
                              instagramUrl: e.target.value
                            }))
                          }
                        }}
                        fullWidth
                        placeholder="@mitienda o URL del perfil"
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={savingProfile === s.id}
                        onClick={() => void onSavePublicProfile(s.id)}
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        {savingProfile === s.id
                          ? 'Guardando…'
                          : 'Guardar datos públicos'}
                      </Button>
                      <Divider />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Equipo (
                        {memLoading === s.id
                          ? 'cargando…'
                          : `${(membershipsByStore[s.id] ?? []).length}`}
                        )
                      </Typography>
                      {(membershipsByStore[s.id] ?? []).map(m => (
                        <Stack
                          direction="row"
                          key={`${s.id}:${m.userId}`}
                          alignItems="center"
                          spacing={2}
                          flexWrap="wrap"
                        >
                          <Typography sx={{ flex: '1 1 200px', minWidth: 0 }}>
                            {m.email}{' '}
                            <Typography
                              component="span"
                              color="text.secondary"
                              variant="body2"
                            >
                              ({m.role})
                            </Typography>
                          </Typography>
                          <Button
                            size="small"
                            color="error"
                            onClick={() =>
                              void onRemoveMembership(s.id, m.userId)
                            }
                          >
                            Quitar
                          </Button>
                        </Stack>
                      ))}
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                      >
                        <TextField
                          label="Correo del usuario registrado"
                          value={expanded === s.id ? addEmail : ''}
                          onChange={e => {
                            if (expanded === s.id) setAddEmail(e.target.value)
                          }}
                          fullWidth
                        />
                        <FormControl sx={{ minWidth: 180 }}>
                          <InputLabel>Rol</InputLabel>
                          <Select
                            label="Rol"
                            size="medium"
                            value={addRole}
                            onChange={e => {
                              if (expanded !== s.id) return
                              setAddRole(
                                e.target.value as 'owner' | 'store_admin'
                              )
                            }}
                          >
                            <MenuItem value="store_admin">store_admin</MenuItem>
                            {payload.canCreateStores ? (
                              <MenuItem value="owner">
                                owner (HQ solamente)
                              </MenuItem>
                            ) : null}
                          </Select>
                        </FormControl>
                      </Stack>
                      <Button
                        variant="contained"
                        disabled={
                          savingMembership === s.id || !addEmail.trim().length
                        }
                        size="medium"
                        onClick={() => void onAddMembership(s.id)}
                      >
                        Guardar acceso
                      </Button>
                    </Stack>
                  </Collapse>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </Container>
      <Snackbar
        open={toast !== null}
        autoHideDuration={4200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast !== null ? (
          <Alert
            severity={toast.sev}
            onClose={() => setToast(null)}
            sx={{ width: '100%' }}
          >
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}
