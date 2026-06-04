# Atrevete Luna - Sistema de Gestión

Sistema de gestión integral para producción, almacén, ventas, deudas y gastos con autenticación por roles y permisos granulares.

## Características

- 📊 **Dashboard** con métricas y resúmenes ejecutivos
- 🏭 **Gestión de producción** con control de lotes
- 📦 **Almacén** con transferencias entre ubicaciones
- 💰 **Ventas** con generación automática de deudas
- 💸 **Control de deudas** con pagos parciales/totales/adelantados
- 👥 **Clientes** con historial
- 📈 **Estadísticas** con gráficos
- 🔐 **Sistema de roles y permisos** granulares por módulo y acción
- 👤 **Gestión de usuarios** con asignación de roles

## Stack tecnológico

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19 + Tailwind CSS 4
- **Base de datos:** PostgreSQL
- **ORM:** Prisma 7
- **Autenticación:** JWT con cookies httpOnly
- **Gestión de estado:** Zustand
- **Validación:** Zod

## Setup local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env` y rellena los valores:

```bash
cp .env.example .env
```

Edita `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/atrevete-luna?schema=public"
JWT_SECRET="un-secreto-aleatorio-largo"
```

### 3. Crear la base de datos y aplicar migraciones

```bash
npx prisma migrate dev
```

### 4. Inicializar el superadmin y roles por defecto

```bash
npm run db:seed
```

O mediante el endpoint HTTP (necesita que la app esté corriendo):

```bash
curl -X POST http://localhost:3000/api/seed
```

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Credenciales por defecto

Después del seed:

- **Email:** `admin@atrevete.com`
- **Contraseña:** `admin123`
- **Rol:** SuperAdmin (acceso total)

⚠️ **Cambia la contraseña inmediatamente después del primer login.**

## Despliegue en Vercel

### 1. Preparar la base de datos

Crea una base de datos PostgreSQL en alguno de estos servicios (todos tienen plan gratuito):

- **[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)** (recomendado)
- **[Neon](https://neon.tech)**
- **[Supabase](https://supabase.com)**

Copia la `DATABASE_URL` que te proporcionan.

### 2. Subir el código a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/atrevete-luna.git
git push -u origin main
```

### 3. Importar en Vercel

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Importa tu repositorio
3. Configura las variables de entorno:
   - `DATABASE_URL`: la URL de tu base de datos PostgreSQL
   - `JWT_SECRET`: genera uno con `openssl rand -base64 32`
4. Haz clic en **Deploy**

### 4. Aplicar migraciones y seed

Después del primer deploy, necesitas inicializar la base de datos. Hay dos opciones:

**Opción A: Desde la consola de Vercel**

Ve a la pestaña "Console" de tu proyecto y ejecuta:

```bash
npx prisma migrate deploy
curl -X POST https://tu-app.vercel.app/api/seed
```

**Opción B: Desde tu máquina local**

Con la `DATABASE_URL` apuntando a la base de datos de producción:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Luego, en el navegador o con curl:

```bash
curl -X POST https://tu-app.vercel.app/api/seed
```

### 5. Verificar

Visita `https://tu-app.vercel.app/login` e ingresa con las credenciales por defecto.

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Compila la app para producción |
| `npm run start` | Inicia el servidor de producción |
| `npm run lint` | Ejecuta ESLint |
| `npm run db:migrate` | Aplica migraciones pendientes (producción) |
| `npm run db:seed` | Inicializa superadmin y roles |
| `npm run db:studio` | Abre Prisma Studio |

## Estructura del proyecto

```
.
├── app/                      # Rutas de Next.js (App Router)
│   ├── (dashboard)/          # Rutas protegidas con layout de dashboard
│   ├── api/                  # API routes
│   ├── login/                # Página de login
│   └── layout.tsx            # Layout raíz
├── components/               # Componentes compartidos
├── hooks/                    # Custom hooks
├── lib/                      # Utilidades y configuración
│   ├── auth.ts               # Lógica de autenticación
│   ├── prisma.ts             # Cliente de Prisma
│   ├── permissions.ts        # Constantes y tipos de permisos
│   ├── apiGuard.ts           # Guard para APIs
│   └── seed.ts               # Seed de datos iniciales
├── prisma/                   # Schema y migraciones
├── scripts/                  # Scripts auxiliares
├── stores/                   # Stores de Zustand
└── middleware.ts             # Middleware de Next.js
```

## Sistema de roles y permisos

El sistema usa dos capas:

1. **Backend (`lib/apiGuard.ts`):** Protege las APIs con `requirePermission()`. Si un usuario sin permiso intenta acceder, devuelve 403.

2. **Frontend (`components/PermissionGuard.tsx`):** Oculta elementos de la UI si el usuario no tiene permiso.

```tsx
<PermissionGuard module="ventas" action="create">
  <Button>Nueva venta</Button>
</PermissionGuard>
```

### Módulos disponibles

- `dashboard`, `ventas`, `productos`, `almacen`, `produccion`
- `clientes`, `deudas`, `gastos`, `marketing`, `estadisticas`
- `configuracion`, `roles`, `usuarios`

### Acciones disponibles

- `view`, `create`, `edit`, `delete`

## Licencia

Privado.
