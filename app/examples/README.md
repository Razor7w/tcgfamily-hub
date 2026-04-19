# Ejemplos de TanStack Query y Zustand

Este directorio contiene ejemplos prácticos de cómo usar **TanStack Query** y **Zustand** en el proyecto.

## 📚 Archivos de Ejemplo

### 1. `TanStackQueryExample.tsx`

Ejemplos de uso de TanStack Query:

- ✅ **useQuery básico**: Obtener datos con caché automático
- ✅ **useMutation**: Crear/actualizar/eliminar datos
- ✅ **Optimistic Updates**: Actualizaciones optimistas para mejor UX
- ✅ **Invalidación de caché**: Refetch automático después de mutaciones

### 2. `ZustandExample.tsx`

Ejemplos de uso de Zustand:

- ✅ **Estado UI simple**: Sidebar, tema, etc.
- ✅ **Filtros globales**: Estado compartido entre componentes
- ✅ **Sistema de notificaciones**: Notificaciones globales
- ✅ **Selectores para performance**: Optimización de re-renders

### 3. `page-refactored.tsx` (en `/Admin/Users/`)

Versión refactorizada de `UsersPage` que muestra:

- ✅ Cómo migrar de `useState` + `fetch` a TanStack Query
- ✅ Uso combinado de TanStack Query + Zustand
- ✅ Manejo de loading states automático
- ✅ Invalidación automática de caché

## 🚀 Cómo Usar

### Ver los ejemplos

1. Importa los componentes de ejemplo en cualquier página:

```tsx
import TanStackQueryExample from '@/examples/TanStackQueryExample'
import ZustandExample from '@/examples/ZustandExample'

export default function ExamplePage() {
  return (
    <Box>
      <TanStackQueryExample />
      <ZustandExample />
    </Box>
  )
}
```

### Usar TanStack Query en tus componentes

```tsx
import { useUsers, useCreateUser } from '@/hooks/useUsers'

function MyComponent() {
  // Obtener datos (con caché automático)
  const { data: users, isLoading, error } = useUsers()

  // Crear usuario (con invalidación automática)
  const createUser = useCreateUser()

  const handleCreate = async () => {
    try {
      await createUser.mutateAsync({
        name: 'Juan',
        email: 'juan@example.com'
      })
      // El caché se invalida automáticamente
    } catch (error) {
      console.error(error)
    }
  }

  if (isLoading) return <div>Cargando...</div>
  if (error) return <div>Error: {error.message}</div>

  return <div>{/* Tu UI */}</div>
}
```

### Usar Zustand para estado global

```tsx
import { useAppStore } from '@/store/useAppStore'

function MyComponent() {
  // Obtener estado
  const sidebarOpen = useAppStore(state => state.sidebarOpen)

  // Obtener acción
  const toggleSidebar = useAppStore(state => state.toggleSidebar)

  return (
    <button onClick={toggleSidebar}>
      Sidebar: {sidebarOpen ? 'Abierto' : 'Cerrado'}
    </button>
  )
}
```

## 📖 Conceptos Clave

### TanStack Query

- **Query**: Para obtener datos (GET)
- **Mutation**: Para modificar datos (POST, PUT, DELETE)
- **Caché automático**: Los datos se cachean y reutilizan
- **Refetch automático**: Se actualiza cuando cambian las dependencias
- **Loading states**: `isLoading`, `isFetching`, `isPending`

### Zustand

- **Store**: Un solo store para todo el estado global
- **Selectores**: Para obtener solo el estado que necesitas
- **Acciones**: Funciones que modifican el estado
- **Persistencia**: Opcional, guarda en localStorage
- **Sin boilerplate**: Mucho más simple que Redux

## 🔄 Migración desde useState + fetch

### Antes (useState + fetch)

```tsx
const [users, setUsers] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetch('/api/users')
    .then(res => res.json())
    .then(data => {
      setUsers(data)
      setLoading(false)
    })
}, [])
```

### Después (TanStack Query)

```tsx
const { data: users, isLoading } = useUsers()
// ¡Eso es todo! Caché, refetch, y loading automático
```

## 💡 Mejores Prácticas

1. **TanStack Query para datos del servidor**: Usa siempre para APIs
2. **Zustand para estado UI**: Solo cuando necesitas compartir entre componentes
3. **Selectores específicos**: Usa selectores en Zustand para mejor performance
4. **Invalidación inteligente**: Invalida solo las queries que necesitas
5. **Optimistic updates**: Para mejor UX en mutaciones

## 📝 Hooks Disponibles

### Users

- `useUsers()` - Obtener todos los usuarios
- `useUser(id)` - Obtener un usuario por ID
- `useCreateUser()` - Crear usuario
- `useUpdateUser()` - Actualizar usuario
- `useDeleteUser()` - Eliminar usuario
- `useBulkUploadUsers()` - Carga masiva desde CSV

### Mails

- `useMails()` - Obtener todos los mails
- `useCreateMail()` - Crear mail

## 🎯 Próximos Pasos

1. Revisa los ejemplos en `TanStackQueryExample.tsx` y `ZustandExample.tsx`
2. Compara `UsersPage` original vs `page-refactored.tsx`
3. Crea tus propios hooks siguiendo el patrón en `/hooks/`
4. Añade más estado global en `/store/useAppStore.ts` si lo necesitas
