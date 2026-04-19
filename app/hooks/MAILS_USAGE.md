# Uso de los hooks de Mails (`useMails`)

Hooks de TanStack Query para consumir la API de mails: listar, crear, obtener por ID, actualizar y eliminar.

---

## 1. `useMails` – Listar todos los mails

```tsx
import { useMails } from '@/hooks/useMails'

function MailList() {
  const { data, isLoading, error, refetch } = useMails()
  const mails = data?.mails ?? []

  if (isLoading) return <div>Cargando…</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {mails.map(m => (
        <li key={m._id}>
          {m.fromUserId?.name} → {m.toUserId?.name}
        </li>
      ))}
    </ul>
  )
}
```

---

## 2. `useCreateMail` – Crear mail

```tsx
import { useCreateMail } from '@/hooks/useMails'

function CreateMailForm() {
  const createMail = useCreateMail()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const mail = await createMail.mutateAsync({
        fromUserId: '507f1f77bcf86cd799439011',
        toUserId: '507f1f77bcf86cd799439012',
        isRecived: false,
        observations: 'Opcional'
      })
      console.log('Creado:', mail)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={createMail.isPending}>
        {createMail.isPending ? 'Creando…' : 'Crear'}
      </button>
    </form>
  )
}
```

---

## 3. `useGetMailById` – Obtener mail por ID

```tsx
import { useGetMailById } from '@/hooks/useMails'

function MailDetail({ mailId }: { mailId: string | null }) {
  const { data: mail, isLoading, error } = useGetMailById(mailId)

  if (!mailId) return <div>Escribe un ID</div>
  if (isLoading) return <div>Cargando…</div>
  if (error) return <div>Error: {error.message}</div>
  if (!mail) return null

  return (
    <div>
      De: {mail.fromUserId?.name} ({mail.fromUserId?.rut})
      <br />
      Para: {mail.toUserId?.name} ({mail.toUserId?.rut})
      <br />
      Recibido: {mail.isRecived ? 'Sí' : 'No'}
    </div>
  )
}
```

---

## 4. `useUpdateMail` – Actualizar mail (PUT)

```tsx
import { useUpdateMail, type UpdateMailData } from '@/hooks/useMails'

function EditMail({ mailId }: { mailId: string }) {
  const updateMail = useUpdateMail()

  const handleMarkReceived = async () => {
    try {
      await updateMail.mutateAsync({
        mailId,
        data: { isRecived: true }
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleChangeObservations = async (observations: string) => {
    try {
      await updateMail.mutateAsync({
        mailId,
        data: { observations }
      })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <button onClick={handleMarkReceived} disabled={updateMail.isPending}>
        Marcar recibido
      </button>
      {/* ... */}
    </div>
  )
}
```

**Campos actualizables (`UpdateMailData`):**

- `fromUserId?: string` – debe existir como usuario
- `toUserId?: string` – debe existir y ser distinto de `fromUserId` si se envían ambos
- `isRecived?: boolean`
- `observations?: string`

Solo se envían los campos que quieras cambiar.

---

## 5. `useDeleteMail` – Eliminar mail (DELETE)

```tsx
import { useDeleteMail } from '@/hooks/useMails'

function DeleteMailButton({ mailId }: { mailId: string }) {
  const deleteMail = useDeleteMail()

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este mail?')) return
    try {
      await deleteMail.mutateAsync(mailId)
      // Redirigir o cerrar modal, etc.
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <button onClick={handleDelete} disabled={deleteMail.isPending}>
      {deleteMail.isPending ? 'Eliminando…' : 'Eliminar'}
    </button>
  )
}
```

---

## Invalidación de caché

- **`useCreateMail`**: invalida `["mails"]`.
- **`useUpdateMail`**: invalida `["mails"]` y `["mails", mailId]`.
- **`useDeleteMail`**: invalida `["mails"]` y elimina la query `["mails", mailId]`.

Tras crear, actualizar o eliminar, las listas y el detalle por ID se actualizan automáticamente.

---

## API utilizada

| Método | Ruta             | Uso            |
| ------ | ---------------- | -------------- |
| GET    | `/api/mail`      | Listar mails   |
| POST   | `/api/mail`      | Crear mail     |
| GET    | `/api/mail/[id]` | Obtener por ID |
| PUT    | `/api/mail/[id]` | Actualizar     |
| DELETE | `/api/mail/[id]` | Eliminar       |

PUT y DELETE requieren sesión **admin**.
