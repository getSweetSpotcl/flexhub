# Fase 1: MVP Foundation (10 semanas)

## Resumen de la Fase

La Fase 1 se enfoca en construir los cimientos técnicos y las funcionalidades core necesarias para lanzar un MVP funcional de WorkSpace Chile. Al final de estas 10 semanas, tendremos una plataforma donde los usuarios pueden registrarse, listar espacios, buscar, reservar y pagar.

## Semanas 1-2: Setup del Proyecto Técnico

### Día 1-3: Configuración Base del Proyecto

#### Tasks Específicos:

- [ ] Inicializar proyecto Next.js 15 con App Router
  ```bash
  pnpm create next-app@latest cowork-workspace --typescript --tailwind --app
  ```
- [ ] Configurar TypeScript strict mode
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noImplicitReturns": true
    }
  }
  ```
- [ ] Setup ESLint + Prettier con configuración personalizada
- [ ] Configurar Tailwind CSS v4 con diseño personalizado
- [ ] Instalar y configurar shadcn/ui (New York variant)
  ```bash
  pnpm dlx shadcn-ui@latest init
  ```
- [ ] Configurar path aliases en tsconfig.json
- [ ] Setup Geist fonts desde Google Fonts

#### Estructura Inicial:

```
app/
├── (auth)/
│   ├── login/
│   ├── register/
│   └── onboarding/
├── (dashboard)/
│   ├── host/
│   └── guest/
├── (public)/
│   ├── search/
│   └── spaces/
└── layout.tsx
```

#### Entregables:

- ✅ Proyecto base corriendo con `pnpm dev`
- ✅ Configuración completa de desarrollo
- ✅ Primer componente shadcn/ui (Button) funcionando
- ✅ Layout base con navegación

### Día 4-7: Base de Datos y Autenticación

#### Tasks de Base de Datos:

- [ ] Crear cuenta en Neon PostgreSQL
- [ ] Configurar conexión con connection pooling
- [ ] Instalar Prisma y dependencias
  ```bash
  pnpm add prisma @prisma/client
  pnpm add -D @types/node
  ```
- [ ] Diseñar schema inicial:

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String   @id @default(cuid())
  clerkId          String   @unique
  email            String   @unique
  role             UserRole @default(GUEST)
  isVerified       Boolean  @default(false)

  // Profile
  firstName        String?
  lastName         String?
  phone            String?
  rut              String?  @unique
  avatar           String?

  // Timestamps
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relations
  ownedSpaces      Space[]
  bookings         Booking[]

  @@map("users")
}

model Space {
  id               String      @id @default(cuid())
  title            String
  description      String
  spaceType        SpaceType
  capacity         Int

  // Pricing
  pricePerHour     Decimal     @db.Decimal(10, 0)
  pricePerDay      Decimal?    @db.Decimal(10, 0)

  // Location
  address          String
  city             String
  region           String
  latitude         Float
  longitude        Float

  // Status
  status           SpaceStatus @default(DRAFT)

  // Relations
  ownerId          String
  owner            User        @relation(fields: [ownerId], references: [id])
  bookings         Booking[]

  @@map("spaces")
}

enum UserRole {
  GUEST
  HOST
  ADMIN
}

enum SpaceType {
  PRIVATE_OFFICE
  SHARED_DESK
  MEETING_ROOM
  CONFERENCE_ROOM
  COWORKING_SPACE
}

enum SpaceStatus {
  DRAFT
  PENDING_REVIEW
  ACTIVE
  PAUSED
}
```

#### Tasks de Autenticación:

- [ ] Crear cuenta Clerk y configurar proyecto
- [ ] Instalar Clerk SDK
  ```bash
  pnpm add @clerk/nextjs
  ```
- [ ] Configurar variables de entorno
- [ ] Setup middleware de autenticación
- [ ] Configurar social providers (Google, LinkedIn)
- [ ] Crear páginas de login/register customizadas
- [ ] Implementar componentes de Clerk

#### Código de Middleware:

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/search(.*)',
  '/spaces/(.*)',
  '/api/webhooks/(.*)',
])

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

### Día 8-10: Deployment y CI/CD

#### Tasks de Deployment:

- [ ] Crear proyecto en Vercel
- [ ] Conectar repositorio GitHub
- [ ] Configurar variables de entorno:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  CLERK_SECRET_KEY
  DATABASE_URL
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
  NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
  ```
- [ ] Configurar dominio personalizado
- [ ] Setup Vercel Analytics
- [ ] Configurar preview deployments

#### Webhook Handler para Clerk:

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET')
  }

  // Get headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // Get body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create Svix instance
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify payload
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id!,
      'svix-timestamp': svix_timestamp!,
      'svix-signature': svix_signature!,
    }) as WebhookEvent
  } catch (err) {
    return new Response('Error occured', { status: 400 })
  }

  // Handle event
  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data

    await prisma.user.upsert({
      where: { clerkId: id },
      update: {
        email: email_addresses[0].email_address,
        firstName: first_name,
        lastName: last_name,
      },
      create: {
        clerkId: id,
        email: email_addresses[0].email_address,
        firstName: first_name,
        lastName: last_name,
      },
    })
  }

  return new Response('', { status: 200 })
}
```

## Semanas 3-4: Sistema de Autenticación Completo

### Semana 3: Onboarding y Perfiles

#### Tasks de Onboarding:

- [ ] Crear componente multi-step form con estado
- [ ] Implementar validación RUT chileno:

```typescript
// lib/validations/rut.ts
export function validateRUT(rut: string): boolean {
  // Limpiar RUT
  const cleanRut = rut.replace(/[.-]/g, '').toUpperCase()

  if (cleanRut.length < 8) return false

  const body = cleanRut.slice(0, -1)
  const dv = cleanRut.slice(-1)

  // Calcular dígito verificador
  let sum = 0
  let multiplier = 2

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const expectedDV = 11 - (sum % 11)
  const calculatedDV =
    expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : expectedDV.toString()

  return dv === calculatedDV
}
```

#### Componente de Onboarding:

```typescript
// app/(auth)/onboarding/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { completeOnboarding } from '@/lib/actions/auth'

const onboardingSchema = z.object({
  role: z.enum(['HOST', 'GUEST']),
  firstName: z.string().min(2, 'Mínimo 2 caracteres'),
  lastName: z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().regex(/^\+56[0-9]{8,9}$/, 'Formato: +56912345678'),
  rut: z.string().refine(validateRUT, 'RUT inválido'),
  acceptsTerms: z.boolean().refine(val => val, 'Debes aceptar los términos')
})

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      role: 'GUEST',
      acceptsTerms: false
    }
  })

  async function onSubmit(data: z.infer<typeof onboardingSchema>) {
    const result = await completeOnboarding(data)
    if (result.success) {
      router.push('/dashboard')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1>Completa tu perfil</h1>
      {/* Multi-step form implementation */}
    </div>
  )
}
```

#### Server Action de Onboarding:

```typescript
// lib/actions/auth.ts
'use server'

import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export async function completeOnboarding(data: OnboardingData) {
  const { userId } = auth()

  if (!userId) {
    return { success: false, error: 'No autorizado' }
  }

  try {
    const validatedData = onboardingSchema.parse(data)

    await prisma.user.update({
      where: { clerkId: userId },
      data: {
        role: validatedData.role,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        rut: validatedData.rut,
        isVerified: false, // Pendiente de verificación
      },
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Error al actualizar perfil' }
  }
}
```

### Semana 4: Verificación de Identidad

#### Tasks de Verificación:

- [ ] Configurar Uploadthing para documentos
- [ ] Crear formulario de upload de Cédula/Pasaporte
- [ ] Implementar verificación telefónica con Clerk
- [ ] Crear dashboard admin para aprobar verificaciones
- [ ] Sistema de badges de verificación

#### Componente de Upload de Documentos:

```typescript
// components/verification/document-upload.tsx
'use client'

import { UploadButton } from '@uploadthing/react'
import { verifyUserDocument } from '@/lib/actions/auth'

export function DocumentUpload({ userId }: { userId: string }) {
  return (
    <div className="space-y-4">
      <h3>Sube tu documento de identidad</h3>
      <p className="text-sm text-muted-foreground">
        Cédula de identidad o pasaporte vigente
      </p>

      <UploadButton
        endpoint="documentUploader"
        onClientUploadComplete={async (res) => {
          if (res?.[0]) {
            await verifyUserDocument(userId, res[0].url)
          }
        }}
        onUploadError={(error: Error) => {
          alert(`Error: ${error.message}`)
        }}
      />
    </div>
  )
}
```

## Semanas 5-6: Gestión de Espacios

### Semana 5: Creación de Espacios - Parte 1

#### Tasks del Wizard Multi-step:

- [ ] Crear estructura del wizard con 4 pasos
- [ ] Implementar estado persistente entre pasos
- [ ] Crear validación por paso

#### Estructura del Form Wizard:

```typescript
// components/spaces/create-space-wizard.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const steps = [
  { id: 'basic', title: 'Información Básica' },
  { id: 'location', title: 'Ubicación' },
  { id: 'details', title: 'Detalles y Precios' },
  { id: 'photos', title: 'Fotos' }
]

export function CreateSpaceWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({})
  const router = useRouter()

  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Progress value={progress} className="mb-8" />

      <div className="mb-8">
        <h2>{steps[currentStep].title}</h2>
      </div>

      {currentStep === 0 && <BasicInfoStep />}
      {currentStep === 1 && <LocationStep />}
      {currentStep === 2 && <DetailsStep />}
      {currentStep === 3 && <PhotosStep />}

      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => prev - 1)}
          disabled={currentStep === 0}
        >
          Anterior
        </Button>

        <Button
          onClick={() => {
            if (currentStep === steps.length - 1) {
              // Submit form
            } else {
              setCurrentStep(prev => prev + 1)
            }
          }}
        >
          {currentStep === steps.length - 1 ? 'Publicar' : 'Siguiente'}
        </Button>
      </div>
    </div>
  )
}
```

#### Integración Google Maps:

```typescript
// components/spaces/location-picker.tsx
'use client'

import { useLoadScript, GoogleMap, Marker } from '@react-google-maps/api'
import { usePlacesWidget } from 'react-google-autocomplete'

export function LocationPicker({
  onLocationSelect
}: {
  onLocationSelect: (location: LocationData) => void
}) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    libraries: ['places']
  })

  const { ref } = usePlacesWidget({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    onPlaceSelected: (place) => {
      onLocationSelect({
        address: place.formatted_address,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        city: extractCity(place),
        region: extractRegion(place)
      })
    },
    options: {
      types: ['address'],
      componentRestrictions: { country: 'cl' }
    }
  })

  if (!isLoaded) return <div>Cargando mapa...</div>

  return (
    <div className="space-y-4">
      <input
        ref={ref}
        type="text"
        placeholder="Busca tu dirección"
        className="w-full p-2 border rounded"
      />
      {/* Map component */}
    </div>
  )
}
```

### Semana 6: Creación de Espacios - Parte 2

#### Tasks de Upload de Imágenes:

- [ ] Configurar Uploadthing con límites (20 imágenes, 10MB cada una)
- [ ] Crear galería con drag & drop
- [ ] Implementar reordenamiento de imágenes
- [ ] Preview y crop de imágenes

#### Componente de Galería:

```typescript
// components/spaces/image-gallery-upload.tsx
'use client'

import { useState } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { UploadDropzone } from '@uploadthing/react'
import Image from 'next/image'

export function ImageGalleryUpload({
  maxImages = 20
}: {
  maxImages?: number
}) {
  const [images, setImages] = useState<UploadedImage[]>([])

  const moveImage = (dragIndex: number, hoverIndex: number) => {
    const draggedImage = images[dragIndex]
    const newImages = [...images]
    newImages.splice(dragIndex, 1)
    newImages.splice(hoverIndex, 0, draggedImage)
    setImages(newImages)
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {images.length < maxImages && (
          <UploadDropzone
            endpoint="spaceImageUploader"
            onClientUploadComplete={(res) => {
              setImages(prev => [...prev, ...res])
            }}
          />
        )}

        <div className="grid grid-cols-4 gap-4">
          {images.map((image, index) => (
            <DraggableImage
              key={image.key}
              image={image}
              index={index}
              moveImage={moveImage}
              onDelete={() => {
                setImages(prev => prev.filter((_, i) => i !== index))
              }}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  )
}
```

## Semanas 7-8: Búsqueda y Descubrimiento

### Semana 7: Motor de Búsqueda

#### Tasks de Búsqueda:

- [ ] Crear componente de búsqueda principal
- [ ] Implementar filtros avanzados
- [ ] Sistema de ordenamiento
- [ ] Paginación con infinite scroll
- [ ] URL state management

#### Server Action de Búsqueda:

```typescript
// lib/actions/search.ts
'use server'

import { prisma } from '@/lib/db'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      radius: z.number(), // en km
    })
    .optional(),
  dateRange: z
    .object({
      start: z.date(),
      end: z.date(),
    })
    .optional(),
  priceRange: z
    .object({
      min: z.number(),
      max: z.number(),
    })
    .optional(),
  capacity: z.number().optional(),
  spaceTypes: z
    .array(z.enum(['PRIVATE_OFFICE', 'SHARED_DESK' /* etc */]))
    .optional(),
  amenities: z.array(z.string()).optional(),
  sortBy: z.enum(['price', 'distance', 'rating']).default('distance'),
  page: z.number().default(1),
  limit: z.number().default(20),
})

export async function searchSpaces(params: SearchParams) {
  const validated = searchSchema.parse(params)

  // Construir query dinámica
  const where: any = {
    status: 'ACTIVE',
  }

  // Búsqueda por texto
  if (validated.query) {
    where.OR = [
      { title: { contains: validated.query, mode: 'insensitive' } },
      { description: { contains: validated.query, mode: 'insensitive' } },
    ]
  }

  // Filtro por ubicación (usando PostGIS)
  if (validated.location) {
    const { lat, lng, radius } = validated.location
    // Query espacial con Prisma + PostGIS
    where.AND = {
      ...where.AND,
      // ST_DWithin para búsqueda por radio
    }
  }

  // Filtro por precio
  if (validated.priceRange) {
    where.pricePerHour = {
      gte: validated.priceRange.min,
      lte: validated.priceRange.max,
    }
  }

  // Filtro por capacidad
  if (validated.capacity) {
    where.capacity = { gte: validated.capacity }
  }

  // Filtro por tipo
  if (validated.spaceTypes?.length) {
    where.spaceType = { in: validated.spaceTypes }
  }

  // Ejecutar query con paginación
  const [spaces, total] = await Promise.all([
    prisma.space.findMany({
      where,
      include: {
        owner: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
            isVerified: true,
          },
        },
        _count: {
          select: { bookings: true },
        },
      },
      skip: (validated.page - 1) * validated.limit,
      take: validated.limit,
      orderBy: getOrderBy(validated.sortBy),
    }),
    prisma.space.count({ where }),
  ])

  return {
    spaces,
    pagination: {
      page: validated.page,
      limit: validated.limit,
      total,
      pages: Math.ceil(total / validated.limit),
    },
  }
}
```

### Semana 8: Vista de Mapa y Resultados

#### Tasks de Mapa:

- [ ] Implementar mapa interactivo con Google Maps
- [ ] Clustering de markers
- [ ] Popup cards en markers
- [ ] Toggle vista lista/mapa

#### Componente de Mapa:

```typescript
// components/search/search-map.tsx
'use client'

import { GoogleMap, MarkerClusterer, InfoWindow } from '@react-google-maps/api'
import { SpaceCard } from '@/components/spaces/space-card'

export function SearchMap({
  spaces,
  center
}: {
  spaces: Space[]
  center: { lat: number, lng: number }
}) {
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null)

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={center}
      zoom={13}
      options={{
        streetViewControl: false,
        mapTypeControl: false
      }}
    >
      <MarkerClusterer>
        {(clusterer) =>
          spaces.map((space) => (
            <Marker
              key={space.id}
              position={{ lat: space.latitude, lng: space.longitude }}
              clusterer={clusterer}
              onClick={() => setSelectedSpace(space)}
            />
          ))
        }
      </MarkerClusterer>

      {selectedSpace && (
        <InfoWindow
          position={{
            lat: selectedSpace.latitude,
            lng: selectedSpace.longitude
          }}
          onCloseClick={() => setSelectedSpace(null)}
        >
          <SpaceCard space={selectedSpace} compact />
        </InfoWindow>
      )}
    </GoogleMap>
  )
}
```

## Semanas 9-10: Sistema de Reservas MVP

### Semana 9: Flujo de Booking

#### Tasks de Booking:

- [ ] Crear página detalle con galería lightbox
- [ ] Calendario de disponibilidad interactivo
- [ ] Modal de reserva con cálculo de precios
- [ ] Request-to-book vs Instant book

#### Server Action de Booking:

```typescript
// lib/actions/bookings.ts
'use server'

import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createBookingSchema = z.object({
  spaceId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  guests: z.number().min(1),
  message: z.string().optional(),
})

export async function createBooking(data: CreateBookingData) {
  const { userId } = auth()
  if (!userId) throw new Error('No autorizado')

  const validated = createBookingSchema.parse(data)

  // Verificar disponibilidad
  const isAvailable = await checkAvailability(
    validated.spaceId,
    validated.startDate,
    validated.endDate
  )

  if (!isAvailable) {
    return { success: false, error: 'Espacio no disponible' }
  }

  // Calcular precio
  const pricing = await calculatePrice(
    validated.spaceId,
    validated.startDate,
    validated.endDate
  )

  // Crear reserva en transacción
  const booking = await prisma.$transaction(async tx => {
    // Crear booking
    const booking = await tx.booking.create({
      data: {
        spaceId: validated.spaceId,
        guestId: userId,
        startDate: validated.startDate,
        endDate: validated.endDate,
        totalHours: pricing.hours,
        pricePerHour: pricing.pricePerHour,
        totalAmount: pricing.total,
        platformFee: pricing.platformFee,
        taxes: pricing.iva,
        status: 'PENDING_PAYMENT',
        paymentDeadline: new Date(Date.now() + 30 * 60 * 1000), // 30 min
      },
    })

    // Bloquear disponibilidad
    await tx.availability.create({
      data: {
        spaceId: validated.spaceId,
        startDate: validated.startDate,
        endDate: validated.endDate,
        bookingId: booking.id,
        type: 'BLOCKED',
      },
    })

    return booking
  })

  return { success: true, bookingId: booking.id }
}

export async function calculatePrice(
  spaceId: string,
  startDate: Date,
  endDate: Date
): Promise<PriceBreakdown> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { pricePerHour: true, pricePerDay: true },
  })

  if (!space) throw new Error('Espacio no encontrado')

  const hours = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
  )
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  let subtotal = 0

  // Calcular mejor precio (día completo vs horas)
  if (space.pricePerDay && days > 0) {
    subtotal =
      Number(space.pricePerDay) * days +
      Number(space.pricePerHour) * remainingHours
  } else {
    subtotal = Number(space.pricePerHour) * hours
  }

  const platformFee = subtotal * 0.08 // 8% comisión
  const taxableAmount = subtotal + platformFee
  const iva = taxableAmount * 0.19 // 19% IVA Chile

  return {
    hours,
    pricePerHour: Number(space.pricePerHour),
    subtotal,
    platformFee,
    iva,
    total: taxableAmount + iva,
  }
}
```

### Semana 10: Pagos Chile

#### Tasks de Integración de Pagos:

- [ ] Configurar Transbank WebPay Plus (sandbox)
- [ ] Implementar webhooks de confirmación
- [ ] Sistema de facturación electrónica

#### Integración Transbank:

```typescript
// lib/payments/transbank.ts
import { WebpayPlus } from 'transbank-sdk'

// Configurar ambiente
const environment =
  process.env.NODE_ENV === 'production'
    ? WebpayPlus.Environment.Production
    : WebpayPlus.Environment.Integration

const commerceCode = process.env.TRANSBANK_COMMERCE_CODE!
const apiKey = process.env.TRANSBANK_API_KEY!

const transaction = new WebpayPlus.Transaction(
  new WebpayPlus.Options(commerceCode, apiKey, environment)
)

export async function createTransbankPayment(booking: Booking) {
  const buyOrder = `booking-${booking.id}`
  const sessionId = booking.guestId
  const amount = Math.round(booking.totalAmount)
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/transbank/confirm`

  try {
    const response = await transaction.create(
      buyOrder,
      sessionId,
      amount,
      returnUrl
    )

    // Guardar token en DB
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        transbankToken: response.token,
        paymentProvider: 'TRANSBANK',
      },
    })

    return {
      success: true,
      token: response.token,
      url: response.url + '?token_ws=' + response.token,
    }
  } catch (error) {
    console.error('Transbank error:', error)
    return { success: false, error: 'Error al crear pago' }
  }
}

export async function confirmTransbankPayment(token: string) {
  try {
    const response = await transaction.commit(token)

    if (response.response_code === 0) {
      // Pago aprobado
      const booking = await prisma.booking.findFirst({
        where: { transbankToken: token },
      })

      if (!booking) throw new Error('Booking no encontrado')

      // Actualizar booking
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
          paidAt: new Date(),
          transbankAuthorizationCode: response.authorization_code,
        },
      })

      // Generar factura
      await generateInvoice(booking.id)

      return { success: true, booking }
    } else {
      // Pago rechazado
      return {
        success: false,
        error: `Pago rechazado: ${response.response_code}`,
      }
    }
  } catch (error) {
    return { success: false, error: 'Error al confirmar pago' }
  }
}
```

#### API Route para Confirmación:

```typescript
// app/api/payments/transbank/confirm/route.ts
import { redirect } from 'next/navigation'
import { confirmTransbankPayment } from '@/lib/payments/transbank'

export async function POST(request: Request) {
  const formData = await request.formData()
  const token = formData.get('token_ws') as string

  if (!token) {
    return redirect('/booking/error?reason=no_token')
  }

  const result = await confirmTransbankPayment(token)

  if (result.success) {
    return redirect(`/booking/${result.booking.id}/success`)
  } else {
    return redirect(`/booking/error?reason=${result.error}`)
  }
}
```

## Criterios de Éxito - Fase 1

### Funcionalidades Completas:

- [ ] Usuarios pueden registrarse con Google/LinkedIn
- [ ] Sistema de onboarding diferenciado (Host/Guest)
- [ ] Hosts pueden crear y publicar espacios
- [ ] Sistema de búsqueda con filtros funciona
- [ ] Vista de mapa muestra espacios correctamente
- [ ] Flujo completo de booking operativo
- [ ] Pagos con Transbank funcionan en sandbox
- [ ] Se generan facturas electrónicas

### Métricas Técnicas:

- [ ] 0 errores críticos en producción
- [ ] Tiempo de carga < 3 segundos
- [ ] Cobertura de tests > 60%
- [ ] Todos los endpoints protegidos correctamente

### Entregables de Documentación:

- [ ] README actualizado con instrucciones
- [ ] Documentación de API con ejemplos
- [ ] Guía de deployment
- [ ] Manual de usuario básico

## Recursos y Referencias

### Documentación Oficial:

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Clerk Authentication](https://clerk.com/docs)
- [Prisma ORM](https://www.prisma.io/docs)
- [Transbank Developers](https://www.transbankdevelopers.cl/)

### Librerías Clave:

```json
{
  "dependencies": {
    "@clerk/nextjs": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "transbank-sdk": "^4.0.0",
    "@react-google-maps/api": "^2.19.0",
    "@uploadthing/react": "^6.0.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0"
  }
}
```

### Configuración de Variables de Entorno:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://...

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIza...

# Transbank
TRANSBANK_COMMERCE_CODE=597055555532
TRANSBANK_API_KEY=579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C


# Uploadthing
UPLOADTHING_SECRET=sk_live_...
UPLOADTHING_APP_ID=...
```

## Checklist Final - Fase 1

### Semana 1-2:

- [ ] Proyecto Next.js 15 configurado
- [ ] Clerk authentication funcionando
- [ ] Base de datos PostgreSQL conectada
- [ ] Deployment en Vercel activo

### Semana 3-4:

- [ ] Onboarding flow completo
- [ ] Validación RUT implementada
- [ ] Sistema de verificación básico

### Semana 5-6:

- [ ] Wizard de creación de espacios
- [ ] Upload de imágenes funcional
- [ ] Integración Google Maps

### Semana 7-8:

- [ ] Motor de búsqueda operativo
- [ ] Filtros avanzados funcionando
- [ ] Vista de mapa con markers

### Semana 9-10:

- [ ] Flujo de booking completo
- [ ] Pagos Transbank integrados
- [ ] Sistema MVP listo para beta testing
