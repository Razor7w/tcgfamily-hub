# Implementación de TanStack Query y Zustand

## ✅ Lo que se ha implementado

### 1. **Configuración Base**

#### Dependencias instaladas
- `@tanstack/react-query`: ^5.62.0
- `zustand`: ^5.0.2

#### Provider configurado
- ✅ `app/lib/query-client.tsx`: QueryClientProvider configurado
- ✅ `app/layout.tsx`: QueryProvider añadido al layout raíz

### 2. **Hooks personalizados para APIs**

#### Users (`app/hooks/useUsers.ts`)
- ✅ `useUsers()` - Obtener todos los usuarios
- ✅ `useUser(id)` - Obtener un usuario por ID
- ✅ `useCreateUser()` - Crear usuario
- ✅ `useUpdateUser()` - Actualizar usuario
- ✅ `useDeleteUser()` - Eliminar usuario
- ✅ `useBulkUploadUsers()` - Carga masiva desde CSV

#### Mails (`app/hooks/useMails.ts`)
- ✅ `useMails()` - Obtener todos los mails
- ✅ `useCreateMail()` - Crear mail

### 3. **Store de Zustand**

#### `app/store/useAppStore.ts`
- ✅ Estado UI: `sidebarOpen`, `theme`
- ✅ Filtros globales: `userFilter` (role, search)
- ✅ Sistema de notificaciones: `notifications`
- ✅ Persistencia en localStorage (solo theme y sidebarOpen)
- ✅ Selectores optimizados: `useSidebar()`, `useTheme()`, `useUserFilter()`

### 4. **Ejemplos y Documentación**

#### Archivos de ejemplo
- ✅ `app/examples/TanStackQueryExample.tsx` - Ejemplos de TanStack Query
- ✅ `app/examples/ZustandExample.tsx` - Ejemplos de Zustand
- ✅ `app/examples/CombinedExample.tsx` - Ejemplo combinado
- ✅ `app/examples/README.md` - Documentación de ejemplos

#### Componente refactorizado
- ✅ `app/Admin/Users/page-refactored.tsx` - Versión refactorizada usando TanStack Query

## 🚀 Cómo usar

### Instalar dependencias

```bash
npm install
# o
yarn install
```

### Usar TanStack Query

```tsx
import { useUsers, useCreateUser } from "@/hooks/useUsers";

function MyComponent() {
  const { data: users, isLoading, error } = useUsers();
  const createUser = useCreateUser();

  const handleCreate = async () => {
    await createUser.mutateAsync({
      name: "Juan",
      email: "juan@example.com",
    });
  };

  // ...
}
```

### Usar Zustand

```tsx
import { useAppStore } from "@/store/useAppStore";

function MyComponent() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return <button onClick={toggleSidebar}>Toggle</button>;
}
```

## 📁 Estructura de archivos

```
app/
├── lib/
│   └── query-client.tsx          # QueryClientProvider
├── hooks/
│   ├── useUsers.ts              # Hooks para usuarios
│   └── useMails.ts              # Hooks para mails
├── store/
│   └── useAppStore.ts           # Store de Zustand
├── examples/
│   ├── TanStackQueryExample.tsx
│   ├── ZustandExample.tsx
│   ├── CombinedExample.tsx
│   └── README.md
└── Admin/
    └── Users/
        └── page-refactored.tsx   # Ejemplo de migración
```

## 🔄 Migración desde código anterior

### Antes (useState + fetch)
```tsx
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch("/api/users")
    .then(res => res.json())
    .then(data => {
      setUsers(data);
      setLoading(false);
    });
}, []);
```

### Después (TanStack Query)
```tsx
const { data: users, isLoading } = useUsers();
```

**Beneficios:**
- ✅ Menos código
- ✅ Caché automático
- ✅ Refetch automático
- ✅ Loading states automáticos
- ✅ Manejo de errores integrado

## 💡 Mejores Prácticas

### TanStack Query
1. **Usa siempre para datos del servidor**: No uses `useState` + `fetch`
2. **Invalidación inteligente**: Invalida solo las queries necesarias
3. **Optimistic updates**: Para mejor UX en mutaciones
4. **Query keys consistentes**: Usa arrays para las keys

### Zustand
1. **Solo para estado global**: No uses para estado local
2. **Selectores específicos**: Para mejor performance
3. **Persistencia selectiva**: Solo persiste lo necesario
4. **Acciones claras**: Separa estado de acciones

## 📝 Próximos pasos

1. **Revisar ejemplos**: Mira los archivos en `/examples/`
2. **Migrar componentes**: Refactoriza componentes existentes
3. **Añadir más hooks**: Crea hooks para otras APIs
4. **Extender store**: Añade más estado global si es necesario

## 🐛 Troubleshooting

### Error: "Cannot find module '@tanstack/react-query'"
```bash
npm install @tanstack/react-query zustand
```

### Error: "QueryClientProvider not found"
Asegúrate de que `QueryProvider` esté en `app/layout.tsx`

### Zustand persist no funciona
Verifica que `createJSONStorage` esté importado correctamente

## 📚 Recursos

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)
- [Ejemplos en el proyecto](./app/examples/README.md)
