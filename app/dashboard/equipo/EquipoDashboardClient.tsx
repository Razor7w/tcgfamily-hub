'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import GroupsIcon from '@mui/icons-material/Groups'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import TeamFeaturedDeckPicker from '@/components/teams/TeamFeaturedDeckPicker'
import TeamBrandingEditor from '@/components/teams/TeamBrandingEditor'
import TeamPostsSection from '@/components/teams/TeamPostsSection'
import TeamDisbandConfirmDialog from '@/components/teams/TeamDisbandConfirmDialog'
import TeamsBrowseSection from '@/components/teams/TeamsBrowseSection'
import TeamInviteRutField, {
  isTeamInviteRutValid
} from '@/components/teams/TeamInviteRutField'
import TeamMedalsRow from '@/components/teams/TeamMedalsRow'
import { useNotifications } from '@/hooks/useNotifications'
import {
  useCancelTeamInvitation,
  useApplyForTeam,
  useDisbandTeam,
  useInviteToTeam,
  useLeaveTeam,
  useRemoveTeamMember,
  useTeamManage,
  useTeamsMe,
  useUpdateTeam,
  useUpdateTeamMemberRole
} from '@/hooks/useTeams'
import { slugFromTeamName } from '@/lib/teams/slug'

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function TeamProfileEditForm({
  teamSlug,
  initialName,
  initialBio
}: {
  teamSlug: string
  initialName: string
  initialBio: string
}) {
  const [editName, setEditName] = useState(initialName)
  const [editBio, setEditBio] = useState(initialBio)
  const [editMsg, setEditMsg] = useState<string | null>(null)
  const [editErr, setEditErr] = useState<string | null>(null)
  const updateTeam = useUpdateTeam(teamSlug)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setEditMsg(null)
    setEditErr(null)
    try {
      await updateTeam.mutateAsync({
        name: editName.trim(),
        bio: editBio.trim()
      })
      setEditMsg('Equipo actualizado.')
    } catch (err) {
      setEditErr(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <Paper
      component="form"
      onSubmit={handleSaveProfile}
      variant="outlined"
      sx={{ p: 2.5, borderRadius: 3 }}
    >
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Perfil del equipo
      </Typography>
      <Stack spacing={2}>
        <TextField
          label="Nombre"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          fullWidth
        />
        <TextField
          label="Descripción"
          value={editBio}
          onChange={e => setEditBio(e.target.value)}
          multiline
          minRows={3}
          fullWidth
        />
        {editMsg ? <Alert severity="success">{editMsg}</Alert> : null}
        {editErr ? <Alert severity="error">{editErr}</Alert> : null}
        <Button
          type="submit"
          variant="contained"
          disabled={updateTeam.isPending}
          sx={{ alignSelf: 'flex-start' }}
        >
          Guardar cambios
        </Button>
      </Stack>
    </Paper>
  )
}

export default function EquipoDashboardClient() {
  const {
    data: me,
    isPending: mePending,
    isError: meError,
    error: meErr
  } = useTeamsMe()
  const { data: notifications } = useNotifications()
  const pendingNotificationCount = notifications?.unreadCount ?? 0

  const teamSlug = me?.membership?.teamSlug ?? ''
  const {
    data: manage,
    isPending: managePending,
    isError: manageError,
    error: manageErr
  } = useTeamManage(teamSlug, Boolean(teamSlug))

  const [createName, setCreateName] = useState('')
  const [createSlug, setCreateSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [createBio, setCreateBio] = useState('')
  const [createErr, setCreateErr] = useState<string | null>(null)
  const applyForTeam = useApplyForTeam()

  const [inviteRut, setInviteRut] = useState('')
  const [inviteErr, setInviteErr] = useState<string | null>(null)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)
  const inviteToTeam = useInviteToTeam(teamSlug)

  const leaveTeam = useLeaveTeam()
  const disbandTeam = useDisbandTeam(teamSlug)
  const [disbandOpen, setDisbandOpen] = useState(false)
  const [disbandErr, setDisbandErr] = useState<string | null>(null)
  const [teamTab, setTeamTab] = useState(0)
  const [showApplyForm, setShowApplyForm] = useState(false)
  const cancelInvitation = useCancelTeamInvitation(teamSlug)
  const updateMemberRole = useUpdateTeamMemberRole(teamSlug)
  const removeMember = useRemoveTeamMember(teamSlug)

  const suggestedSlug = useMemo(
    () => slugFromTeamName(createName),
    [createName]
  )
  const effectiveCreateSlug = slugTouched ? createSlug : suggestedSlug

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateErr(null)
    try {
      await applyForTeam.mutateAsync({
        name: createName.trim(),
        slug: effectiveCreateSlug.trim(),
        bio: createBio.trim()
      })
      setCreateName('')
      setCreateSlug('')
      setSlugTouched(false)
      setCreateBio('')
      setShowApplyForm(false)
    } catch (err) {
      setCreateErr(err instanceof Error ? err.message : 'Error al solicitar')
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteErr(null)
    setInviteMsg(null)
    if (!isTeamInviteRutValid(inviteRut)) {
      setInviteErr('Introduce un RUT válido')
      return
    }
    try {
      const result = await inviteToTeam.mutateAsync(inviteRut.trim())
      setInviteRut('')
      setInviteMsg(
        result.invitation.linkStatus === 'awaiting_user'
          ? 'Solicitud guardada. Se enviará cuando esa persona se registre con ese RUT.'
          : 'Solicitud enviada. El jugador la verá en Notificaciones.'
      )
    } catch (err) {
      setInviteErr(err instanceof Error ? err.message : 'Error al invitar')
    }
  }

  if (mePending) {
    return (
      <Container maxWidth="md" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    )
  }

  if (meError) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          {meErr instanceof Error ? meErr.message : 'Error'}
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: t => alpha(t.palette.primary.main, 0.12),
              color: 'primary.main'
            }}
          >
            <GroupsIcon />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
              Tu equipo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Un jugador, un equipo. Independiente de la tienda activa.
            </Typography>
          </Box>
        </Stack>

        {!me?.membership && pendingNotificationCount > 0 ? (
          <Alert
            severity="info"
            action={
              <Button
                component={Link}
                href="/dashboard/notificaciones"
                size="small"
              >
                Ver notificaciones
              </Button>
            }
          >
            Tienes {pendingNotificationCount} solicitud(es) de equipo
            pendiente(s).
          </Alert>
        ) : null}

        {!me?.membership && me?.application ? (
          <Alert severity="info">
            Tu solicitud para el equipo <strong>{me.application.name}</strong>{' '}
            está pendiente de aprobación por el administrador. URL reservada:{' '}
            <code>/equipos/{me.application.slug}</code>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Enviada {formatDate(me.application.submittedAt)}
            </Typography>
          </Alert>
        ) : null}

        {!me?.membership && me?.lastRejected && !me?.application ? (
          <Alert severity="warning">
            Tu solicitud para <strong>{me.lastRejected.name}</strong> fue
            rechazada
            {me.lastRejected.rejectionReason
              ? `: ${me.lastRejected.rejectionReason}`
              : '.'}
          </Alert>
        ) : null}

        {!me?.membership ? (
          <TeamsBrowseSection
            canApplyForTeam={Boolean(me?.canApplyForTeam)}
            onFormTeam={() => setShowApplyForm(true)}
          />
        ) : null}

        {!me?.membership && me?.canApplyForTeam && showApplyForm ? (
          <Paper
            component="form"
            onSubmit={handleCreate}
            variant="outlined"
            sx={{ p: 2.5, borderRadius: 3 }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Solicitar equipo
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Un administrador debe aprobar tu solicitud antes de que el
                  equipo quede activo.
                </Typography>
              </Box>
              <Button
                type="button"
                size="small"
                onClick={() => setShowApplyForm(false)}
              >
                Cancelar
              </Button>
            </Stack>
            <Stack spacing={2}>
              <TextField
                label="Nombre del equipo"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                required
                fullWidth
                inputProps={{ maxLength: me.limits.nameMax }}
              />
              <TextField
                label="URL (slug)"
                value={effectiveCreateSlug}
                onChange={e => {
                  setSlugTouched(true)
                  setCreateSlug(e.target.value)
                }}
                helperText={`Página pública: /equipos/${effectiveCreateSlug || '…'}`}
                fullWidth
              />
              <TextField
                label="Descripción"
                value={createBio}
                onChange={e => setCreateBio(e.target.value)}
                multiline
                minRows={3}
                fullWidth
                inputProps={{ maxLength: me.limits.bioMax }}
              />
              {createErr ? <Alert severity="error">{createErr}</Alert> : null}
              <Button
                type="submit"
                variant="contained"
                disabled={applyForTeam.isPending}
                sx={{ alignSelf: 'flex-start' }}
              >
                {applyForTeam.isPending ? 'Enviando…' : 'Enviar solicitud'}
              </Button>
            </Stack>
          </Paper>
        ) : null}

        {!me?.membership &&
        !me?.canApplyForTeam &&
        !me?.application &&
        pendingNotificationCount === 0 ? (
          <Alert severity="info">
            Ya perteneces a un equipo o tienes una solicitud en curso.
          </Alert>
        ) : null}

        {me?.membership ? (
          <>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    src={me.membership.teamLogoUrl || undefined}
                    sx={{ width: 56, height: 56 }}
                  >
                    {me.membership.teamName.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      {me.membership.teamName}
                    </Typography>
                    <Chip
                      size="small"
                      label={me.membership.roleLabel}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Stack>
                <Button
                  component={Link}
                  href={`/equipos/${me.membership.teamSlug}`}
                  endIcon={<OpenInNewIcon />}
                  variant="outlined"
                >
                  Ver página pública
                </Button>
              </Stack>
            </Paper>

            {managePending ? (
              <CircularProgress sx={{ alignSelf: 'center' }} />
            ) : manageError ? (
              <Alert severity="error">
                {manageErr instanceof Error ? manageErr.message : 'Error'}
              </Alert>
            ) : manage ? (
              <Stack spacing={2}>
                <Paper
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    borderColor: t => alpha(t.palette.text.primary, 0.1)
                  }}
                >
                  <Tabs
                    value={teamTab}
                    onChange={(_, value: number) => setTeamTab(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{
                      px: { xs: 1, sm: 2 },
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '& .MuiTab-root': {
                        fontWeight: 600,
                        textTransform: 'none'
                      }
                    }}
                  >
                    <Tab label="Perfil" />
                    <Tab label="Publicaciones" />
                    <Tab label="Miembros" />
                    <Tab label="Mazo favorito" />
                  </Tabs>

                  <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                    {teamTab === 0 ? (
                      <Stack spacing={3}>
                        <Paper
                          variant="outlined"
                          sx={{ p: 2.5, borderRadius: 3 }}
                        >
                          <TeamMedalsRow medals={manage.medals ?? []} />
                        </Paper>

                        {manage.viewer.isCaptain ? (
                          <TeamBrandingEditor
                            teamId={manage.team.id}
                            teamSlug={teamSlug}
                            teamName={manage.team.name}
                            teamBio={manage.team.bio}
                            memberCount={manage.memberCount}
                            logoUrl={manage.team.logoUrl}
                            coverUrl={manage.team.coverUrl}
                          />
                        ) : null}

                        {manage.viewer.canManage ? (
                          <TeamProfileEditForm
                            key={teamSlug}
                            teamSlug={teamSlug}
                            initialName={manage.team.name}
                            initialBio={manage.team.bio}
                          />
                        ) : !manage.viewer.isCaptain ? (
                          <Paper
                            variant="outlined"
                            sx={{ p: 2.5, borderRadius: 3 }}
                          >
                            <Typography
                              variant="subtitle1"
                              fontWeight={700}
                              gutterBottom
                            >
                              Perfil del equipo
                            </Typography>
                            <Typography variant="h6" fontWeight={800}>
                              {manage.team.name}
                            </Typography>
                            {manage.team.bio ? (
                              <Typography
                                color="text.secondary"
                                sx={{
                                  mt: 1,
                                  lineHeight: 1.65,
                                  maxWidth: '48rem'
                                }}
                              >
                                {manage.team.bio}
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 1 }}
                              >
                                Sin descripción.
                              </Typography>
                            )}
                          </Paper>
                        ) : null}
                      </Stack>
                    ) : null}

                    {teamTab === 1 ? (
                      <TeamPostsSection
                        teamSlug={teamSlug}
                        teamId={manage.team.id}
                        showComposer
                        title=""
                        scope="members"
                      />
                    ) : null}

                    {teamTab === 2 ? (
                      <Stack spacing={3}>
                        <Paper
                          variant="outlined"
                          sx={{ p: 2.5, borderRadius: 3 }}
                        >
                          <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            gutterBottom
                          >
                            Miembros ({manage.memberCount})
                          </Typography>
                          <Stack spacing={1.5} divider={<Divider flexItem />}>
                            {manage.members.map(member => (
                              <Stack
                                key={member.userId}
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1}
                                alignItems={{ sm: 'center' }}
                                justifyContent="space-between"
                              >
                                <Stack
                                  direction="row"
                                  spacing={1.5}
                                  alignItems="center"
                                >
                                  <Avatar src={member.imageUrl || undefined}>
                                    {member.displayName
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </Avatar>
                                  <Box>
                                    <Typography fontWeight={600}>
                                      {member.displayName}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {member.roleLabel}
                                    </Typography>
                                  </Box>
                                </Stack>
                                {manage.viewer.isCaptain &&
                                member.role !== 'captain' &&
                                member.userId !== manage.viewer.userId ? (
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                  >
                                    <Select
                                      size="small"
                                      value={
                                        member.role === 'co_captain'
                                          ? 'co_captain'
                                          : 'member'
                                      }
                                      onChange={e =>
                                        void updateMemberRole.mutateAsync({
                                          userId: member.userId,
                                          role: e.target.value as
                                            | 'co_captain'
                                            | 'member'
                                        })
                                      }
                                    >
                                      <MenuItem value="member">
                                        Miembro
                                      </MenuItem>
                                      <MenuItem value="co_captain">
                                        Co-capitán
                                      </MenuItem>
                                    </Select>
                                    <Button
                                      color="error"
                                      size="small"
                                      onClick={() =>
                                        void removeMember.mutateAsync(
                                          member.userId
                                        )
                                      }
                                    >
                                      Quitar
                                    </Button>
                                  </Stack>
                                ) : null}
                              </Stack>
                            ))}
                          </Stack>
                        </Paper>

                        {manage.viewer.canManage ? (
                          <Paper
                            component="form"
                            onSubmit={handleInvite}
                            variant="outlined"
                            sx={{ p: 2.5, borderRadius: 3 }}
                          >
                            <Typography
                              variant="subtitle1"
                              fontWeight={700}
                              gutterBottom
                            >
                              Invitar jugador
                            </Typography>
                            <Stack spacing={1.5}>
                              <TeamInviteRutField
                                value={inviteRut}
                                onChange={setInviteRut}
                                disabled={inviteToTeam.isPending}
                                error={inviteErr}
                              />
                              <Button
                                type="submit"
                                variant="contained"
                                disabled={
                                  inviteToTeam.isPending ||
                                  !isTeamInviteRutValid(inviteRut)
                                }
                                sx={{ alignSelf: 'flex-start' }}
                              >
                                Enviar solicitud
                              </Button>
                            </Stack>
                            {inviteMsg ? (
                              <Alert severity="success" sx={{ mt: 2 }}>
                                {inviteMsg}
                              </Alert>
                            ) : null}
                            {inviteErr ? (
                              <Alert severity="error" sx={{ mt: 2 }}>
                                {inviteErr}
                              </Alert>
                            ) : null}
                          </Paper>
                        ) : null}

                        {manage.viewer.canManage &&
                        manage.invitations.length > 0 ? (
                          <Paper
                            variant="outlined"
                            sx={{ p: 2.5, borderRadius: 3 }}
                          >
                            <Typography
                              variant="subtitle1"
                              fontWeight={700}
                              gutterBottom
                            >
                              Solicitudes enviadas
                            </Typography>
                            <Stack spacing={1}>
                              {manage.invitations.map(inv => (
                                <Stack
                                  key={inv.id}
                                  direction="row"
                                  justifyContent="space-between"
                                  alignItems="center"
                                >
                                  <Stack
                                    direction="row"
                                    spacing={1.25}
                                    alignItems="center"
                                  >
                                    {inv.linkStatus === 'linked' &&
                                    inv.inviteeImage ? (
                                      <Avatar src={inv.inviteeImage}>
                                        {inv.inviteeName
                                          .slice(0, 1)
                                          .toUpperCase()}
                                      </Avatar>
                                    ) : null}
                                    <Box>
                                      <Typography
                                        variant="body2"
                                        fontWeight={600}
                                      >
                                        {inv.linkStatus === 'awaiting_user'
                                          ? inv.inviteeRut
                                          : inv.inviteeName}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {inv.linkStatus === 'awaiting_user'
                                          ? 'Esperando registro · '
                                          : inv.inviteeRut
                                            ? `${inv.inviteeRut} · `
                                            : inv.inviteePopid
                                              ? `POP ${inv.inviteePopid} · `
                                              : ''}
                                        expira {formatDate(inv.expiresAt)}
                                      </Typography>
                                    </Box>
                                  </Stack>
                                  <Button
                                    size="small"
                                    onClick={() =>
                                      void cancelInvitation.mutateAsync(inv.id)
                                    }
                                  >
                                    Cancelar
                                  </Button>
                                </Stack>
                              ))}
                            </Stack>
                          </Paper>
                        ) : null}
                      </Stack>
                    ) : null}

                    {teamTab === 3 ? (
                      <TeamFeaturedDeckPicker
                        teamSlug={teamSlug}
                        featuredDecklistId={manage.viewer.featuredDecklistId}
                      />
                    ) : null}
                  </Box>
                </Paper>

                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  {manage.viewer.role !== 'captain' ? (
                    <Button
                      color="warning"
                      variant="outlined"
                      disabled={leaveTeam.isPending}
                      onClick={() => void leaveTeam.mutateAsync()}
                    >
                      Salir del equipo
                    </Button>
                  ) : (
                    <Button
                      color="error"
                      variant="outlined"
                      disabled={disbandTeam.isPending}
                      onClick={() => {
                        setDisbandErr(null)
                        setDisbandOpen(true)
                      }}
                    >
                      Disolver equipo
                    </Button>
                  )}
                </Stack>
              </Stack>
            ) : null}
          </>
        ) : null}
      </Stack>

      <TeamDisbandConfirmDialog
        open={disbandOpen}
        teamName={manage?.team.name ?? me?.membership?.teamName}
        pending={disbandTeam.isPending}
        error={disbandErr}
        onClose={() => setDisbandOpen(false)}
        onConfirm={async () => {
          setDisbandErr(null)
          try {
            await disbandTeam.mutateAsync()
            setDisbandOpen(false)
          } catch (err) {
            setDisbandErr(
              err instanceof Error
                ? err.message
                : 'No se pudo disolver el equipo'
            )
          }
        }}
      />
    </Container>
  )
}
