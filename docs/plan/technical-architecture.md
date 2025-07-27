# Arquitectura Técnica - WorkSpace Chile

## Stack Tecnológico Completo

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **State Management**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

### Backend

- **Runtime**: Next.js Server Actions + API Routes
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentication**: Clerk
- **File Storage**: Uploadthing
- **Cache**: Redis (Upstash)

### Servicios Externos

- **Payments**: Transbank WebPay Plus
- **Maps**: Google Maps API
- **Real-time**: Pusher
- **Email**: Resend
- **Search**: Algolia
- **Monitoring**: Sentry + Vercel Analytics

## Esquema de Base de Datos

### Modelo de Datos Principal

```prisma
// User model
model User {
  id                String   @id @default(cuid())
  clerkId          String   @unique
  email            String   @unique
  role             UserRole @default(GUEST)

  // Profile
  firstName        String?
  lastName         String?
  phone            String?
  rut              String?  @unique
  avatar           String?

  // Verification
  isVerified       Boolean  @default(false)
  verificationTier VerificationTier @default(BASIC)
  trustScore       Int      @default(0)

  // Ratings
  overallRating    Float?
  totalReviews     Int      @default(0)

  // Relations
  ownedSpaces      Space[]
  bookings         Booking[]
  sentMessages     Message[]
  reviews          Review[] @relation("ReviewsGiven")
  receivedReviews  Review[] @relation("ReviewsReceived")

  @@map("users")
}

// Space model
model Space {
  id               String      @id @default(cuid())
  title            String
  description      String      @db.Text
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

  // Features
  amenities        String[]
  images           String[]

  // Business
  status           SpaceStatus @default(DRAFT)
  isVerified       Boolean     @default(false)
  averageRating    Float?
  totalBookings    Int         @default(0)

  // Relations
  ownerId          String
  owner            User        @relation(fields: [ownerId], references: [id])
  bookings         Booking[]
  availability     Availability[]

  @@index([status, spaceType])
  @@index([latitude, longitude])
  @@map("spaces")
}

// Booking model
model Booking {
  id               String        @id @default(cuid())
  status           BookingStatus @default(PENDING)

  // Timing
  startDate        DateTime
  endDate          DateTime
  totalHours       Int

  // Pricing
  pricePerHour     Decimal       @db.Decimal(10, 0)
  subtotal         Decimal       @db.Decimal(10, 0)
  platformFee      Decimal       @db.Decimal(10, 0)
  taxes            Decimal       @db.Decimal(10, 0)
  discountAmount   Decimal       @default(0) @db.Decimal(10, 0)
  totalAmount      Decimal       @db.Decimal(10, 0)

  // Payment
  paymentProvider  PaymentProvider?
  paymentStatus    PaymentStatus @default(PENDING)
  paidAt           DateTime?

  // Chilean specific
  invoiceNumber    String?
  invoiceUrl       String?

  // Relations
  spaceId          String
  space            Space         @relation(fields: [spaceId], references: [id])
  guestId          String
  guest            User          @relation(fields: [guestId], references: [id])
  messages         Message[]

  @@index([status, createdAt])
  @@index([guestId, status])
  @@map("bookings")
}
```

### Enums y Tipos

```prisma
enum UserRole {
  GUEST
  HOST
  ADMIN
}

enum VerificationTier {
  BASIC
  VERIFIED
  PREMIUM
}

enum SpaceType {
  PRIVATE_OFFICE
  SHARED_DESK
  MEETING_ROOM
  CONFERENCE_ROOM
  COWORKING_SPACE
  PHONE_BOOTH
}

enum SpaceStatus {
  DRAFT
  PENDING_REVIEW
  ACTIVE
  PAUSED
  REJECTED
  SUSPENDED
}

enum BookingStatus {
  PENDING
  PENDING_PAYMENT
  CONFIRMED
  CANCELLED
  COMPLETED
  DISPUTED
}

enum PaymentProvider {
  TRANSBANK
  FLOW
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
  DISPUTED
}
```

## Arquitectura de Aplicación

### Estructura de Directorios

```
app/
├── (auth)/              # Auth routes
│   ├── login/
│   ├── register/
│   └── onboarding/
├── (dashboard)/         # Protected routes
│   ├── host/
│   ├── guest/
│   └── admin/
├── (public)/           # Public routes
│   ├── search/
│   ├── spaces/
│   └── about/
├── api/                # API routes
│   ├── webhooks/
│   ├── cron/
│   └── uploads/
├── globals.css
└── layout.tsx

components/
├── ui/                 # shadcn/ui components
├── forms/              # Form components
├── layouts/            # Layout components
├── spaces/             # Space-related components
├── bookings/           # Booking components
├── messaging/          # Chat components
└── analytics/          # Dashboard components

lib/
├── actions/            # Server Actions
│   ├── auth.ts
│   ├── spaces.ts
│   ├── bookings.ts
│   └── payments.ts
├── validations/        # Zod schemas
├── db/                # Database utilities
├── payments/          # Payment integrations
├── email/             # Email templates
└── utils/             # Helper functions
```

### Patrones de Diseño

#### Server Actions Pattern

```typescript
// lib/actions/spaces.ts
'use server'

import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createSpace(data: CreateSpaceData) {
  const { userId } = auth()
  if (!userId) throw new Error('Unauthorized')

  // Validación
  const validated = createSpaceSchema.parse(data)

  // Operación en DB
  const space = await prisma.space.create({
    data: { ...validated, ownerId: userId },
  })

  // Revalidar cache
  revalidatePath('/dashboard/spaces')

  return { success: true, spaceId: space.id }
}
```

#### Error Boundary Pattern

```typescript
// components/error-boundary.tsx
'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback />
    }

    return this.props.children
  }
}
```

## Integraciones de Terceros

### Clerk Authentication

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
```

### Transbank Integration

```typescript
// lib/payments/transbank.ts
import { WebpayPlus } from 'transbank-sdk'

export class TransbankService {
  private transaction: WebpayPlus.Transaction

  constructor() {
    this.transaction = new WebpayPlus.Transaction(
      new WebpayPlus.Options(
        process.env.TRANSBANK_COMMERCE_CODE!,
        process.env.TRANSBANK_API_KEY!,
        this.getEnvironment()
      )
    )
  }

  async createPayment(booking: Booking) {
    const response = await this.transaction.create(
      `booking-${booking.id}`,
      booking.guestId,
      Math.round(booking.totalAmount),
      this.getReturnUrl()
    )

    return {
      token: response.token,
      url: response.url,
    }
  }
}
```

### Google Maps Integration

```typescript
// components/maps/location-picker.tsx
import { GoogleMap, useLoadScript } from '@react-google-maps/api'

const libraries: ('places')[] = ['places']

export function LocationPicker() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    libraries
  })

  if (!isLoaded) return <div>Loading...</div>

  return <GoogleMap /* props */ />
}
```

## Seguridad y Performance

### Validación de Datos

```typescript
// lib/validations/booking.ts
import { z } from 'zod'

export const createBookingSchema = z
  .object({
    spaceId: z.string().cuid(),
    startDate: z.date().min(new Date()),
    endDate: z.date(),
    message: z.string().max(500).optional(),
  })
  .refine(data => data.endDate > data.startDate, {
    message: 'End date must be after start date',
  })
```

### Rate Limiting

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
})

export async function checkRateLimit(identifier: string) {
  const { success } = await ratelimit.limit(identifier)
  return success
}
```

### Caching Strategy

```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache'

export const getCachedSpaces = unstable_cache(
  async (filters: SearchFilters) => {
    return await searchSpaces(filters)
  },
  ['spaces-search'],
  {
    revalidate: 300, // 5 minutes
    tags: ['spaces'],
  }
)
```

## Deployment y DevOps

### Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/cron/cleanup-expired-bookings",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Environment Variables

```bash
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_***
CLERK_SECRET_KEY=sk_test_***

# Database
DATABASE_URL=postgresql://***
DIRECT_URL=postgresql://***

# Payments
TRANSBANK_COMMERCE_CODE=***
TRANSBANK_API_KEY=***

# External Services
NEXT_PUBLIC_GOOGLE_MAPS_KEY=***
PUSHER_APP_ID=***
RESEND_API_KEY=***
UPLOADTHING_SECRET=***
```

### Docker Configuration (Optional)

```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

## Monitoring y Observabilidad

### Error Tracking

```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
})

export function captureError(error: Error, context?: any) {
  Sentry.captureException(error, { extra: context })
}
```

### Analytics

```typescript
// lib/analytics/tracking.ts
export function trackEvent(event: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    // Vercel Analytics
    va.track(event, properties)

    // Custom analytics
    analytics.track(event, properties)
  }
}
```

### Health Checks

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`

    // Check external services
    const checks = await Promise.all([
      checkClerkStatus(),
      checkTransbankStatus(),
      checkPusherStatus(),
    ])

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks,
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 500 }
    )
  }
}
```

## Escalabilidad y Futuro

### Database Optimization

- Índices compuestos para queries comunes
- Partitioning por región geográfica
- Read replicas para analytics
- Connection pooling con PgBouncer

### Caching Strategy

- Redis para session data
- CDN para assets estáticos
- Application-level caching
- Database query caching

### Performance Monitoring

- Core Web Vitals tracking
- Database query analysis
- API response time monitoring
- User experience metrics

### Future Enhancements

- GraphQL API para mobile apps
- Microservices architecture
- Event sourcing para auditability
- Real-time analytics dashboard
