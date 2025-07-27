# Fase 2: Características Avanzadas (8 semanas)

## Resumen de la Fase

La Fase 2 se enfoca en mejorar la experiencia de usuario agregando características avanzadas que diferenciarán a WorkSpace Chile de la competencia. Esta fase incluye comunicación real-time, sistema de reviews, dashboards analíticos y optimización mobile.

## Semanas 11-12: Sistema de Comunicación

### Semana 11: Messaging Real-time

#### Día 1-2: Setup de Pusher y Arquitectura

**Tasks específicos:**

- [ ] Crear cuenta Pusher y obtener credenciales
- [ ] Instalar dependencias necesarias
  ```bash
  pnpm add pusher pusher-js
  pnpm add @types/pusher-js -D
  ```
- [ ] Configurar Pusher en el servidor
- [ ] Crear provider de Pusher para el cliente
- [ ] Diseñar schema de mensajes en Prisma

**Schema de Base de Datos:**

```prisma
model Message {
  id          String   @id @default(cuid())
  content     String   @db.Text
  senderId    String
  bookingId   String

  // Metadata
  createdAt   DateTime @default(now())
  readAt      DateTime?
  editedAt    DateTime?

  // Relations
  sender      User     @relation(fields: [senderId], references: [id])
  booking     Booking  @relation(fields: [bookingId], references: [id])
  attachments MessageAttachment[]

  @@index([bookingId, createdAt])
  @@map("messages")
}

model MessageAttachment {
  id        String   @id @default(cuid())
  messageId String
  url       String
  filename  String
  size      Int
  mimeType  String

  message   Message  @relation(fields: [messageId], references: [id])

  @@map("message_attachments")
}

model MessageThread {
  id              String   @id @default(cuid())
  bookingId       String   @unique
  lastMessageAt   DateTime?
  participantIds  String[]

  booking         Booking  @relation(fields: [bookingId], references: [id])

  @@map("message_threads")
}
```

#### Día 3-5: Implementación del Chat Component

**Tasks específicos:**

- [ ] Crear componente de chat con UI moderna
- [ ] Implementar typing indicators
- [ ] Agregar emoji picker
- [ ] Sistema de notificaciones de nuevos mensajes
- [ ] Implementar scroll infinito para historial

**Componente de Chat:**

```typescript
// components/messaging/chat-window.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import Pusher from 'pusher-js'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageInput } from './message-input'
import { MessageList } from './message-list'
import { TypingIndicator } from './typing-indicator'
import { useMessages } from '@/hooks/use-messages'

export function ChatWindow({ bookingId }: { bookingId: string }) {
  const { user } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Inicializar Pusher
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth'
    })

    const channel = pusher.subscribe(`private-booking-${bookingId}`)

    // Escuchar nuevos mensajes
    channel.bind('new-message', (data: Message) => {
      setMessages(prev => [...prev, data])
      scrollToBottom()
    })

    // Escuchar typing events
    channel.bind('typing', (data: { userId: string, isTyping: boolean }) => {
      if (data.userId !== user?.id) {
        setIsTyping(data.isTyping)
      }
    })

    return () => {
      pusher.unsubscribe(`private-booking-${bookingId}`)
      pusher.disconnect()
    }
  }, [bookingId, user?.id])

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <MessageList messages={messages} currentUserId={user?.id} />
        {isTyping && <TypingIndicator />}
        <div ref={scrollRef} />
      </ScrollArea>

      <MessageInput
        bookingId={bookingId}
        onSend={() => scrollToBottom()}
      />
    </div>
  )
}
```

#### Día 6-7: Server Actions y Real-time Events

**Tasks específicos:**

- [ ] Crear server actions para enviar mensajes
- [ ] Implementar broadcast de mensajes con Pusher
- [ ] Agregar validación y sanitización
- [ ] Implementar rate limiting
- [ ] Crear sistema de notificaciones push

**Server Actions de Mensajería:**

```typescript
// lib/actions/messages.ts
'use server'

import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/db'
import { pusher } from '@/lib/pusher'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

const sendMessageSchema = z.object({
  bookingId: z.string(),
  content: z.string().min(1).max(1000),
  attachmentUrls: z.array(z.string()).optional(),
})

export async function sendMessage(data: SendMessageData) {
  const { userId } = auth()
  if (!userId) throw new Error('No autorizado')

  const validated = sendMessageSchema.parse(data)

  // Verificar que el usuario es parte del booking
  const booking = await prisma.booking.findUnique({
    where: { id: validated.bookingId },
    include: { space: { select: { ownerId: true } } },
  })

  if (!booking) throw new Error('Booking no encontrado')

  const isHost = booking.space.ownerId === userId
  const isGuest = booking.guestId === userId

  if (!isHost && !isGuest) {
    throw new Error('No tienes permiso para enviar mensajes')
  }

  // Sanitizar contenido
  const sanitizedContent = DOMPurify.sanitize(validated.content)

  // Crear mensaje en transacción
  const message = await prisma.$transaction(async tx => {
    // Crear mensaje
    const message = await tx.message.create({
      data: {
        content: sanitizedContent,
        senderId: userId,
        bookingId: validated.bookingId,
      },
      include: {
        sender: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    })

    // Actualizar thread
    await tx.messageThread.upsert({
      where: { bookingId: validated.bookingId },
      update: { lastMessageAt: new Date() },
      create: {
        bookingId: validated.bookingId,
        lastMessageAt: new Date(),
        participantIds: [booking.guestId, booking.space.ownerId],
      },
    })

    // Crear attachments si hay
    if (validated.attachmentUrls?.length) {
      await tx.messageAttachment.createMany({
        data: validated.attachmentUrls.map(url => ({
          messageId: message.id,
          url,
          filename: extractFilename(url),
          size: 0, // Se puede obtener del uploadthing
          mimeType: getMimeType(url),
        })),
      })
    }

    return message
  })

  // Broadcast mensaje via Pusher
  await pusher.trigger(
    `private-booking-${validated.bookingId}`,
    'new-message',
    message
  )

  // Enviar notificación push
  const recipientId = isHost ? booking.guestId : booking.space.ownerId
  await sendPushNotification(recipientId, {
    title: `Nuevo mensaje de ${message.sender.firstName}`,
    body: sanitizedContent.substring(0, 100),
    url: `/dashboard/bookings/${booking.id}/chat`,
  })

  return { success: true, message }
}

export async function markMessagesAsRead(bookingId: string) {
  const { userId } = auth()
  if (!userId) throw new Error('No autorizado')

  await prisma.message.updateMany({
    where: {
      bookingId,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  })

  // Notificar al otro usuario
  await pusher.trigger(`private-booking-${bookingId}`, 'messages-read', {
    userId,
  })

  return { success: true }
}

export async function sendTypingIndicator(
  bookingId: string,
  isTyping: boolean
) {
  const { userId } = auth()
  if (!userId) throw new Error('No autorizado')

  await pusher.trigger(`private-booking-${bookingId}`, 'typing', {
    userId,
    isTyping,
  })

  return { success: true }
}
```

### Semana 12: Notificaciones y Email

#### Día 1-3: Integración de Resend

**Tasks específicos:**

- [ ] Configurar cuenta Resend y obtener API key
- [ ] Instalar SDK de Resend
  ```bash
  pnpm add resend react-email @react-email/components
  ```
- [ ] Crear templates de email con React Email
- [ ] Configurar dominio para envío de emails
- [ ] Implementar queue de emails con background jobs

**Templates de Email:**

```typescript
// emails/booking-confirmation.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface BookingConfirmationEmailProps {
  guestName: string
  spaceName: string
  startDate: string
  endDate: string
  totalAmount: number
  bookingUrl: string
  spaceImageUrl?: string
}

export function BookingConfirmationEmail({
  guestName,
  spaceName,
  startDate,
  endDate,
  totalAmount,
  bookingUrl,
  spaceImageUrl
}: BookingConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu reserva en {spaceName} ha sido confirmada</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://workspace.cl/logo.png"
            width="150"
            height="50"
            alt="WorkSpace Chile"
          />

          <Heading style={h1}>¡Reserva Confirmada!</Heading>

          <Text style={text}>
            Hola {guestName},
          </Text>

          <Text style={text}>
            Tu reserva en <strong>{spaceName}</strong> ha sido confirmada.
          </Text>

          {spaceImageUrl && (
            <Section>
              <Img
                src={spaceImageUrl}
                width="600"
                height="400"
                alt={spaceName}
                style={spaceImage}
              />
            </Section>
          )}

          <Section style={detailsContainer}>
            <Heading as="h2" style={h2}>
              Detalles de tu reserva
            </Heading>

            <Text style={detail}>
              <strong>Check-in:</strong> {startDate}
            </Text>
            <Text style={detail}>
              <strong>Check-out:</strong> {endDate}
            </Text>
            <Text style={detail}>
              <strong>Total pagado:</strong> ${totalAmount.toLocaleString('es-CL')} CLP
            </Text>
          </Section>

          <Button
            style={button}
            href={bookingUrl}
          >
            Ver detalles de la reserva
          </Button>

          <Hr style={hr} />

          <Text style={footer}>
            Si tienes alguna pregunta, no dudes en contactarnos.
          </Text>

          <Text style={footer}>
            WorkSpace Chile - Av. Providencia 1234, Santiago
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
}

// ... más estilos
```

#### Día 4-5: Sistema de Notificaciones In-App

**Tasks específicos:**

- [ ] Crear schema para notificaciones
- [ ] Implementar centro de notificaciones
- [ ] Agregar badge de notificaciones no leídas
- [ ] Crear sistema de preferencias de usuario
- [ ] Implementar notificaciones real-time

**Schema de Notificaciones:**

```prisma
model Notification {
  id          String           @id @default(cuid())
  userId      String
  type        NotificationType
  title       String
  content     String
  actionUrl   String?
  metadata    Json?

  readAt      DateTime?
  createdAt   DateTime         @default(now())

  user        User             @relation(fields: [userId], references: [id])

  @@index([userId, readAt])
  @@map("notifications")
}

model NotificationPreference {
  id                String   @id @default(cuid())
  userId            String   @unique

  // Email preferences
  emailBookingConfirmed    Boolean @default(true)
  emailNewMessage          Boolean @default(true)
  emailBookingReminder     Boolean @default(true)
  emailReviewRequest       Boolean @default(true)
  emailMarketingUpdates    Boolean @default(false)

  // Push preferences
  pushNewMessage           Boolean @default(true)
  pushBookingUpdates       Boolean @default(true)
  pushPriceAlerts          Boolean @default(false)

  user              User     @relation(fields: [userId], references: [id])

  @@map("notification_preferences")
}

enum NotificationType {
  BOOKING_CONFIRMED
  BOOKING_CANCELLED
  NEW_MESSAGE
  REVIEW_REQUEST
  PAYMENT_RECEIVED
  SPACE_APPROVED
  VERIFICATION_COMPLETE
}
```

#### Día 6-7: Queue de Emails y Automatización

**Tasks específicos:**

- [ ] Implementar sistema de queue para emails
- [ ] Crear cron jobs para emails automáticos
- [ ] Sistema de retry para emails fallidos
- [ ] Tracking de emails (open rate, click rate)
- [ ] Unsubscribe links compliance

**Sistema de Queue de Emails:**

```typescript
// lib/email/queue.ts
import { Resend } from 'resend'
import { prisma } from '@/lib/db'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface EmailJob {
  to: string
  subject: string
  template: string
  data: any
  scheduledFor?: Date
}

export async function queueEmail(job: EmailJob) {
  // Guardar en DB para procesamiento
  await prisma.emailQueue.create({
    data: {
      to: job.to,
      subject: job.subject,
      template: job.template,
      data: job.data,
      scheduledFor: job.scheduledFor || new Date(),
      status: 'PENDING',
    },
  })
}

// Cron job que corre cada minuto
export async function processEmailQueue() {
  const pendingEmails = await prisma.emailQueue.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: new Date() },
      attempts: { lt: 3 },
    },
    take: 10,
  })

  for (const email of pendingEmails) {
    try {
      // Renderizar template
      const EmailComponent = await import(`@/emails/${email.template}`)
      const html = render(EmailComponent.default(email.data))

      // Enviar email
      const result = await resend.emails.send({
        from: 'WorkSpace Chile <noreply@workspace.cl>',
        to: email.to,
        subject: email.subject,
        html,
        headers: {
          'X-Entity-Ref-ID': email.id,
        },
      })

      // Marcar como enviado
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId: result.id,
        },
      })
    } catch (error) {
      // Incrementar intentos
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          attempts: { increment: 1 },
          lastError: error.message,
        },
      })
    }
  }
}

// Emails automáticos
export async function scheduleBookingReminder(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      guest: true,
      space: true,
    },
  })

  if (!booking) return

  // Programar recordatorio 24h antes
  const reminderDate = new Date(booking.startDate)
  reminderDate.setDate(reminderDate.getDate() - 1)

  await queueEmail({
    to: booking.guest.email,
    subject: 'Recordatorio: Tu reserva es mañana',
    template: 'booking-reminder',
    data: {
      guestName: booking.guest.firstName,
      spaceName: booking.space.title,
      startDate: booking.startDate,
      checkInInstructions: booking.space.checkInInstructions,
    },
    scheduledFor: reminderDate,
  })
}
```

## Semanas 13-14: Reviews y Ratings

### Semana 13: Sistema de Reviews

#### Día 1-3: Schema y Lógica de Reviews

**Tasks específicos:**

- [ ] Diseñar schema bidireccional de reviews
- [ ] Crear validaciones para prevenir reviews duplicados
- [ ] Implementar cálculo de ratings agregados
- [ ] Sistema de moderación automática
- [ ] Crear triggers para actualizar ratings promedio

**Schema Completo de Reviews:**

```prisma
model Review {
  id                    String   @id @default(cuid())
  bookingId            String   @unique
  reviewerId           String
  revieweeId           String
  reviewType           ReviewType

  // Ratings (1-5)
  overallRating        Int
  cleanlinessRating    Int?
  communicationRating  Int?
  accuracyRating       Int?
  locationRating       Int?
  valueRating          Int?
  checkInRating        Int?

  // Content
  comment              String?  @db.Text

  // Moderation
  status               ReviewStatus @default(PENDING)
  moderatedAt          DateTime?
  moderationReason     String?

  // Metadata
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  // Relations
  booking              Booking  @relation(fields: [bookingId], references: [id])
  reviewer             User     @relation("ReviewsGiven", fields: [reviewerId], references: [id])
  reviewee             User     @relation("ReviewsReceived", fields: [revieweeId], references: [id])

  @@index([revieweeId, status])
  @@index([createdAt])
  @@map("reviews")
}

model ReviewResponse {
  id          String   @id @default(cuid())
  reviewId    String   @unique
  content     String   @db.Text
  createdAt   DateTime @default(now())

  review      Review   @relation(fields: [reviewId], references: [id])

  @@map("review_responses")
}

enum ReviewType {
  GUEST_TO_HOST
  HOST_TO_GUEST
  GUEST_TO_SPACE
}

enum ReviewStatus {
  PENDING
  PUBLISHED
  HIDDEN
  FLAGGED
}
```

#### Día 4-5: UI de Reviews

**Tasks específicos:**

- [ ] Crear modal de review post-checkout
- [ ] Implementar rating con estrellas interactivas
- [ ] Formulario con categorías específicas
- [ ] Preview antes de enviar
- [ ] Componente de display de reviews

**Componente de Review Form:**

```typescript
// components/reviews/review-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { createReview } from '@/lib/actions/reviews'

const reviewSchema = z.object({
  overallRating: z.number().min(1).max(5),
  cleanlinessRating: z.number().min(1).max(5),
  communicationRating: z.number().min(1).max(5),
  accuracyRating: z.number().min(1).max(5),
  locationRating: z.number().min(1).max(5),
  valueRating: z.number().min(1).max(5),
  checkInRating: z.number().min(1).max(5),
  comment: z.string().min(10).max(500)
})

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      overallRating: 0,
      cleanlinessRating: 0,
      communicationRating: 0,
      accuracyRating: 0,
      locationRating: 0,
      valueRating: 0,
      checkInRating: 0,
      comment: ''
    }
  })

  async function onSubmit(data: z.infer<typeof reviewSchema>) {
    setIsSubmitting(true)

    const result = await createReview({
      bookingId,
      ...data
    })

    if (result.success) {
      router.push('/dashboard/reviews/thanks')
    }

    setIsSubmitting(false)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">¿Cómo fue tu experiencia?</h3>

          {/* Overall Rating */}
          <FormField
            control={form.control}
            name="overallRating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calificación general</FormLabel>
                <FormControl>
                  <StarRating
                    value={field.value}
                    onChange={field.onChange}
                    size="large"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Category Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'cleanlinessRating', label: 'Limpieza' },
              { name: 'communicationRating', label: 'Comunicación' },
              { name: 'accuracyRating', label: 'Exactitud del anuncio' },
              { name: 'locationRating', label: 'Ubicación' },
              { name: 'valueRating', label: 'Relación calidad-precio' },
              { name: 'checkInRating', label: 'Proceso de check-in' }
            ].map((category) => (
              <FormField
                key={category.name}
                control={form.control}
                name={category.name as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{category.label}</FormLabel>
                    <FormControl>
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                        size="small"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </div>

          {/* Comment */}
          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comentarios (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Cuéntanos más sobre tu experiencia..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Enviando...' : 'Enviar reseña'}
        </Button>
      </form>
    </Form>
  )
}

// Componente de Rating con Estrellas
function StarRating({
  value,
  onChange,
  size = 'medium'
}: {
  value: number
  onChange: (value: number) => void
  size?: 'small' | 'medium' | 'large'
}) {
  const [hover, setHover] = useState(0)

  const sizeClasses = {
    small: 'h-5 w-5',
    medium: 'h-6 w-6',
    large: 'h-8 w-8'
  }

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none"
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hover || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  )
}
```

#### Día 6-7: Moderación y Agregación

**Tasks específicos:**

- [ ] Implementar detección automática de contenido inapropiado
- [ ] Sistema de flags y reportes
- [ ] Cálculo de ratings agregados con weights
- [ ] Cache de ratings para performance
- [ ] Dashboard de moderación para admins

**Sistema de Moderación:**

```typescript
// lib/moderation/review-moderation.ts
import { prisma } from '@/lib/db'

// Lista de palabras prohibidas (simplificada)
const PROHIBITED_WORDS = [
  // Lista de palabras ofensivas
]

const SPAM_PATTERNS = [
  /\b(click here|visit|www\.|https?:\/\/)\b/gi,
  /\b\d{7,}\b/g, // Números de teléfono
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Emails
]

export async function moderateReview(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { comment: true },
  })

  if (!review?.comment) return { approved: true }

  const comment = review.comment.toLowerCase()

  // Check palabras prohibidas
  for (const word of PROHIBITED_WORDS) {
    if (comment.includes(word)) {
      await flagReview(reviewId, 'INAPPROPRIATE_LANGUAGE')
      return { approved: false, reason: 'Lenguaje inapropiado' }
    }
  }

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(review.comment)) {
      await flagReview(reviewId, 'SPAM')
      return { approved: false, reason: 'Posible spam' }
    }
  }

  // Check mínimo de palabras (muy corto puede ser spam)
  const wordCount = comment.split(/\s+/).length
  if (wordCount < 3) {
    await flagReview(reviewId, 'TOO_SHORT')
    return { approved: false, reason: 'Reseña muy corta' }
  }

  // Aprobar automáticamente
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: 'PUBLISHED' },
  })

  return { approved: true }
}

async function flagReview(reviewId: string, reason: string) {
  await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: 'FLAGGED',
      moderationReason: reason,
    },
  })

  // Notificar a admins
  await createAdminNotification({
    type: 'REVIEW_FLAGGED',
    title: 'Reseña marcada para revisión',
    content: `Razón: ${reason}`,
    actionUrl: `/admin/reviews/${reviewId}`,
  })
}

// Cálculo de ratings agregados
export async function calculateAggregateRatings(userId: string) {
  const reviews = await prisma.review.findMany({
    where: {
      revieweeId: userId,
      status: 'PUBLISHED',
    },
    select: {
      overallRating: true,
      cleanlinessRating: true,
      communicationRating: true,
      accuracyRating: true,
      locationRating: true,
      valueRating: true,
      checkInRating: true,
      createdAt: true,
    },
  })

  if (reviews.length === 0) return null

  // Calcular promedios con peso por antigüedad
  const now = new Date()
  const weights = reviews.map(review => {
    const daysAgo = Math.floor(
      (now.getTime() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    // Reviews más recientes tienen más peso
    return Math.max(0.5, 1 - daysAgo / 365)
  })

  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  const calculateWeightedAverage = (
    ratings: (number | null)[]
  ): number | null => {
    const validRatings = ratings
      .map((r, i) => (r ? { rating: r, weight: weights[i] } : null))
      .filter(Boolean) as { rating: number; weight: number }[]

    if (validRatings.length === 0) return null

    const weightedSum = validRatings.reduce(
      (sum, { rating, weight }) => sum + rating * weight,
      0
    )

    return Math.round((weightedSum / totalWeight) * 10) / 10
  }

  // Actualizar ratings agregados en el usuario
  await prisma.user.update({
    where: { id: userId },
    data: {
      overallRating: calculateWeightedAverage(
        reviews.map(r => r.overallRating)
      ),
      totalReviews: reviews.length,
      cleanlinessRating: calculateWeightedAverage(
        reviews.map(r => r.cleanlinessRating)
      ),
      communicationRating: calculateWeightedAverage(
        reviews.map(r => r.communicationRating)
      ),
      // ... más ratings
      ratingsLastCalculated: new Date(),
    },
  })
}
```

### Semana 14: Trust & Safety

#### Día 1-3: Sistema de Reportes

**Tasks específicos:**

- [ ] Crear sistema de reportes multi-tipo
- [ ] Formulario de reporte con evidencias
- [ ] Workflow de investigación
- [ ] Sistema de sanciones automáticas
- [ ] Historial de reportes por usuario

**Schema de Reportes:**

```prisma
model Report {
  id              String       @id @default(cuid())
  reporterId      String
  reportedUserId  String?
  reportedSpaceId String?
  reportedReviewId String?

  type            ReportType
  reason          ReportReason
  description     String       @db.Text
  evidence        String[]     // URLs de screenshots, etc

  status          ReportStatus @default(PENDING)
  resolution      String?
  resolvedAt      DateTime?
  resolvedBy      String?

  createdAt       DateTime     @default(now())

  // Relations
  reporter        User         @relation("ReportsCreated", fields: [reporterId], references: [id])
  reportedUser    User?        @relation("ReportsReceived", fields: [reportedUserId], references: [id])
  reportedSpace   Space?       @relation(fields: [reportedSpaceId], references: [id])

  @@map("reports")
}

enum ReportType {
  USER
  SPACE
  REVIEW
  MESSAGE
}

enum ReportReason {
  INAPPROPRIATE_CONTENT
  SPAM
  SCAM
  HARASSMENT
  FALSE_INFORMATION
  SAFETY_CONCERN
  OTHER
}

enum ReportStatus {
  PENDING
  INVESTIGATING
  RESOLVED
  DISMISSED
}
```

#### Día 4-5: Verificación Avanzada

**Tasks específicos:**

- [ ] Integración con servicio de verificación de identidad
- [ ] Verificación de antecedentes (opcional premium)
- [ ] Sistema de badges de confianza
- [ ] Verificación de empresa para hosts comerciales
- [ ] Score de confianza algorítmico

**Sistema de Trust Score:**

```typescript
// lib/trust/trust-score.ts
interface TrustFactors {
  accountAge: number // días
  emailVerified: boolean
  phoneVerified: boolean
  idVerified: boolean
  completedBookings: number
  averageRating: number | null
  responseTime: number // horas promedio
  responseRate: number // porcentaje
  reportCount: number
  violationCount: number
}

export function calculateTrustScore(factors: TrustFactors): number {
  let score = 0

  // Factor: Antigüedad de cuenta (max 15 puntos)
  const accountAgeScore = Math.min(15, factors.accountAge / 10)
  score += accountAgeScore

  // Factor: Verificaciones (max 30 puntos)
  if (factors.emailVerified) score += 5
  if (factors.phoneVerified) score += 10
  if (factors.idVerified) score += 15

  // Factor: Actividad positiva (max 30 puntos)
  const bookingScore = Math.min(15, factors.completedBookings * 0.5)
  score += bookingScore

  if (factors.averageRating) {
    const ratingScore = (factors.averageRating / 5) * 15
    score += ratingScore
  }

  // Factor: Responsividad (max 15 puntos)
  const responseScore = Math.min(7.5, 7.5 * (factors.responseRate / 100))
  score += responseScore

  const responseTimeScore = Math.max(0, 7.5 - factors.responseTime / 4)
  score += responseTimeScore

  // Factor: Comportamiento negativo (resta hasta 20 puntos)
  score -= factors.reportCount * 2
  score -= factors.violationCount * 5

  // Normalizar entre 0 y 100
  return Math.max(0, Math.min(100, Math.round(score)))
}

export async function updateUserTrustScore(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          bookings: { where: { status: 'COMPLETED' } },
          receivedReports: { where: { status: 'RESOLVED' } },
          violations: true,
        },
      },
    },
  })

  if (!user) return

  const accountAge = Math.floor(
    (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  const factors: TrustFactors = {
    accountAge,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    idVerified: user.idVerified,
    completedBookings: user._count.bookings,
    averageRating: user.overallRating,
    responseTime: user.avgResponseTime || 24,
    responseRate: user.responseRate || 0,
    reportCount: user._count.receivedReports,
    violationCount: user._count.violations,
  }

  const trustScore = calculateTrustScore(factors)

  await prisma.user.update({
    where: { id: userId },
    data: { trustScore },
  })

  // Otorgar badges según score
  await updateTrustBadges(userId, trustScore)
}
```

#### Día 6-7: Dashboard de Seguridad

**Tasks específicos:**

- [ ] Dashboard para equipo de trust & safety
- [ ] Herramientas de investigación
- [ ] Sistema de acciones en masa
- [ ] Métricas de seguridad
- [ ] Alertas automáticas de patrones sospechosos

**Dashboard de Moderación:**

```typescript
// app/(admin)/admin/safety/page.tsx
export default async function SafetyDashboard() {
  const stats = await getSafetyStats()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trust & Safety Dashboard</h1>

      {/* Métricas Clave */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Reportes Pendientes"
          value={stats.pendingReports}
          trend={stats.reportsTrend}
          urgent={stats.pendingReports > 10}
        />
        <MetricCard
          title="Usuarios Suspendidos"
          value={stats.suspendedUsers}
          subtitle="Últimos 30 días"
        />
        <MetricCard
          title="Trust Score Promedio"
          value={`${stats.avgTrustScore}/100`}
          trend={stats.trustScoreTrend}
        />
        <MetricCard
          title="Tiempo Resolución"
          value={`${stats.avgResolutionTime}h`}
          subtitle="Promedio"
        />
      </div>

      {/* Reportes Recientes */}
      <ReportsTable />

      {/* Usuarios en Riesgo */}
      <RiskUsersTable />

      {/* Patrones Detectados */}
      <SuspiciousPatternsAlert />
    </div>
  )
}
```

## Semanas 15-16: Dashboard para Hosts

### Semana 15: Analytics e Insights

#### Día 1-3: Diseño del Dashboard

**Tasks específicos:**

- [ ] Diseñar layout del dashboard responsivo
- [ ] Implementar navegación con tabs/sidebar
- [ ] Crear componentes de métricas reutilizables
- [ ] Sistema de filtros por período
- [ ] Export de datos a CSV/PDF

**Layout Principal del Dashboard:**

```typescript
// app/(dashboard)/host/dashboard/layout.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/ui/date-range-picker'

export default function HostDashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/10">
        <nav className="p-4 space-y-2">
          <DashboardNav />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header con filtros */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex gap-4">
              <DateRangePicker />
              <ExportButton />
            </div>
          </div>

          {children}
        </div>
      </main>
    </div>
  )
}
```

#### Día 4-5: Implementación de Gráficos

**Tasks específicos:**

- [ ] Integrar librería de charts (Recharts)
- [ ] Gráfico de ingresos por período
- [ ] Heatmap de ocupación
- [ ] Gráfico de tendencias
- [ ] Comparativas período anterior

**Componentes de Analytics:**

```typescript
// components/analytics/revenue-chart.tsx
'use client'

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RevenueData {
  date: string
  revenue: number
  bookings: number
}

export function RevenueChart({ data }: { data: RevenueData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos por Período</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString('es-CL', {
                  month: 'short',
                  day: 'numeric'
                })
              }
            />
            <YAxis
              tickFormatter={(value) =>
                `$${value.toLocaleString('es-CL')}`
              }
            />
            <Tooltip
              formatter={(value: number) =>
                [`$${value.toLocaleString('es-CL')} CLP`, 'Ingresos']
              }
              labelFormatter={(label) =>
                new Date(label).toLocaleDateString('es-CL')
              }
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// components/analytics/occupancy-heatmap.tsx
export function OccupancyHeatmap({ spaceId }: { spaceId: string }) {
  const [data, setData] = useState<OccupancyData[]>([])

  useEffect(() => {
    fetchOccupancyData(spaceId).then(setData)
  }, [spaceId])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa de Calor - Ocupación</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {/* Días de la semana */}
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
            <div key={i} className="text-center text-sm font-medium">
              {day}
            </div>
          ))}

          {/* Heatmap cells */}
          {data.map((cell, i) => (
            <div
              key={i}
              className={`aspect-square rounded ${
                getHeatmapColor(cell.occupancyRate)
              }`}
              title={`${cell.date}: ${Math.round(cell.occupancyRate * 100)}%`}
            />
          ))}
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-2 mt-4">
          <span className="text-sm">Menos</span>
          <div className="flex gap-1">
            {[0, 25, 50, 75, 100].map((value) => (
              <div
                key={value}
                className={`w-4 h-4 rounded ${getHeatmapColor(value / 100)}`}
              />
            ))}
          </div>
          <span className="text-sm">Más</span>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### Día 6-7: Insights Automáticos

**Tasks específicos:**

- [ ] Algoritmo de detección de tendencias
- [ ] Generación de insights automáticos
- [ ] Recomendaciones de pricing
- [ ] Alertas de oportunidades
- [ ] Comparativa con competencia

**Sistema de Insights:**

```typescript
// lib/analytics/insights.ts
interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'opportunity'
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

export async function generateHostInsights(
  hostId: string,
  dateRange: { start: Date; end: Date }
): Promise<Insight[]> {
  const insights: Insight[] = []

  // Obtener datos del período
  const currentPeriodData = await getHostAnalytics(hostId, dateRange)
  const previousPeriodData = await getHostAnalytics(hostId, {
    start: subDays(
      dateRange.start,
      differenceInDays(dateRange.end, dateRange.start)
    ),
    end: dateRange.start,
  })

  // Insight: Cambio en ingresos
  const revenueChange =
    (currentPeriodData.revenue - previousPeriodData.revenue) /
    previousPeriodData.revenue

  if (Math.abs(revenueChange) > 0.1) {
    insights.push({
      type: revenueChange > 0 ? 'positive' : 'negative',
      title: `Ingresos ${revenueChange > 0 ? 'aumentaron' : 'disminuyeron'} ${Math.abs(Math.round(revenueChange * 100))}%`,
      description: `Comparado con el período anterior, tus ingresos ${
        revenueChange > 0 ? 'subieron' : 'bajaron'
      } de $${previousPeriodData.revenue.toLocaleString()} a $${currentPeriodData.revenue.toLocaleString()}`,
    })
  }

  // Insight: Tasa de ocupación
  if (currentPeriodData.occupancyRate < 0.5) {
    insights.push({
      type: 'opportunity',
      title: 'Baja ocupación detectada',
      description: `Tu tasa de ocupación es del ${Math.round(currentPeriodData.occupancyRate * 100)}%. Considera ajustar precios o mejorar tu listing.`,
      action: {
        label: 'Optimizar precios',
        href: '/host/pricing-optimizer',
      },
    })
  }

  // Insight: Días más populares
  const popularDays = currentPeriodData.bookingsByDay
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  insights.push({
    type: 'neutral',
    title: 'Días más solicitados',
    description: `Los días más populares son: ${popularDays
      .map(d => getDayName(d.day))
      .join(', ')}. Considera aumentar precios en estos días.`,
  })

  // Insight: Comparación con mercado
  const marketAverage = await getMarketAveragePrice(
    currentPeriodData.spaceType,
    currentPeriodData.location
  )

  const priceDiff = (currentPeriodData.avgPrice - marketAverage) / marketAverage

  if (Math.abs(priceDiff) > 0.15) {
    insights.push({
      type: priceDiff > 0 ? 'neutral' : 'opportunity',
      title: `Precio ${priceDiff > 0 ? 'sobre' : 'bajo'} el promedio del mercado`,
      description: `Tu precio promedio está ${Math.abs(Math.round(priceDiff * 100))}% ${
        priceDiff > 0 ? 'por encima' : 'por debajo'
      } del mercado ($${marketAverage.toLocaleString()})`,
      action:
        priceDiff < 0
          ? {
              label: 'Ajustar precios',
              href: '/host/spaces/pricing',
            }
          : undefined,
    })
  }

  return insights
}
```

### Semana 16: Gestión Avanzada

#### Día 1-3: Calendario Master

**Tasks específicos:**

- [ ] Implementar calendario con vistas múltiples
- [ ] Drag & drop para mover reservas
- [ ] Bulk operations (bloquear fechas)
- [ ] Integración con calendarios externos
- [ ] Sincronización bidireccional

**Calendario Avanzado:**

```typescript
// components/calendar/master-calendar.tsx
'use client'

import { Calendar, momentLocalizer, View } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    type: 'booking' | 'blocked' | 'maintenance'
    bookingId?: string
    guestName?: string
    amount?: number
  }
}

export function MasterCalendar({
  spaceId
}: {
  spaceId: string
}) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())

  // Cargar eventos
  useEffect(() => {
    loadCalendarEvents(spaceId, date).then(setEvents)
  }, [spaceId, date])

  // Manejar drag & drop
  const moveEvent = useCallback(
    async ({ event, start, end }: any) => {
      const result = await updateBookingDates(
        event.resource.bookingId,
        start,
        end
      )

      if (result.success) {
        setEvents(prev =>
          prev.map(e =>
            e.id === event.id
              ? { ...e, start, end }
              : e
          )
        )
      }
    },
    []
  )

  // Custom event component
  const EventComponent = ({ event }: { event: CalendarEvent }) => (
    <div className={`p-1 text-xs ${getEventColor(event.resource.type)}`}>
      <div className="font-medium">{event.title}</div>
      {event.resource.guestName && (
        <div className="opacity-75">{event.resource.guestName}</div>
      )}
    </div>
  )

  return (
    <div className="h-[600px]">
      <div className="flex justify-between mb-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('month')}
          >
            Mes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('week')}
          >
            Semana
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('day')}
          >
            Día
          </Button>
        </div>

        <BulkActionsMenu spaceId={spaceId} />
      </div>

      <Calendar
        localizer={localizer}
        events={events}
        view={view}
        date={date}
        onView={setView}
        onNavigate={setDate}
        onEventDrop={moveEvent}
        onEventResize={moveEvent}
        components={{
          event: EventComponent
        }}
        draggableAccessor={() => true}
        resizable
        style={{ height: '100%' }}
      />
    </div>
  )
}
```

#### Día 4-5: Pricing Dinámico

**Tasks específicos:**

- [ ] Algoritmo de pricing basado en demanda
- [ ] Sugerencias de precio por temporada
- [ ] A/B testing de precios
- [ ] Descuentos automáticos
- [ ] Reglas de pricing personalizadas

**Sistema de Pricing Dinámico:**

```typescript
// lib/pricing/dynamic-pricing.ts
interface PricingFactors {
  basePrice: number
  dayOfWeek: number
  isHoliday: boolean
  occupancyRate: number
  marketDemand: number
  seasonalFactor: number
  competitorPrices: number[]
}

export function calculateDynamicPrice(factors: PricingFactors): {
  suggestedPrice: number
  confidence: number
  reasoning: string[]
} {
  let price = factors.basePrice
  const reasoning: string[] = []

  // Factor: Día de la semana
  const dayMultipliers = [0.9, 0.9, 0.95, 1, 1.1, 1.2, 1.15] // L-D
  price *= dayMultipliers[factors.dayOfWeek]
  if (factors.dayOfWeek >= 4) {
    reasoning.push('Precio aumentado por fin de semana')
  }

  // Factor: Feriados
  if (factors.isHoliday) {
    price *= 1.3
    reasoning.push('Premium del 30% por feriado')
  }

  // Factor: Ocupación histórica
  if (factors.occupancyRate > 0.8) {
    price *= 1.15
    reasoning.push('Alta demanda histórica (+15%)')
  } else if (factors.occupancyRate < 0.3) {
    price *= 0.85
    reasoning.push('Baja ocupación, precio reducido (-15%)')
  }

  // Factor: Demanda del mercado
  price *= 0.8 + factors.marketDemand * 0.4

  // Factor: Temporada
  price *= factors.seasonalFactor

  // Factor: Competencia
  if (factors.competitorPrices.length > 0) {
    const avgCompetitor =
      factors.competitorPrices.reduce((a, b) => a + b, 0) /
      factors.competitorPrices.length

    if (price > avgCompetitor * 1.2) {
      price = avgCompetitor * 1.15
      reasoning.push('Ajustado para competir con el mercado')
    }
  }

  // Calcular confianza basada en datos disponibles
  const confidence = calculateConfidence(factors)

  return {
    suggestedPrice: Math.round(price),
    confidence,
    reasoning,
  }
}

// Implementación de reglas personalizadas
export async function applyPricingRules(
  spaceId: string,
  date: Date
): Promise<number> {
  const rules = await prisma.pricingRule.findMany({
    where: {
      spaceId,
      active: true,
      OR: [
        { startDate: { lte: date }, endDate: { gte: date } },
        { dayOfWeek: date.getDay() },
      ],
    },
    orderBy: { priority: 'desc' },
  })

  let price = await getBasePrice(spaceId)

  for (const rule of rules) {
    switch (rule.type) {
      case 'PERCENTAGE':
        price *= 1 + rule.adjustment / 100
        break
      case 'FIXED':
        price += rule.adjustment
        break
      case 'OVERRIDE':
        price = rule.adjustment
        break
    }
  }

  return Math.max(0, Math.round(price))
}
```

#### Día 6-7: Herramientas de Marketing

**Tasks específicos:**

- [ ] Sistema de descuentos y promociones
- [ ] Códigos promocionales
- [ ] Email marketing integrado
- [ ] Share buttons para redes sociales
- [ ] Landing pages personalizadas

**Sistema de Promociones:**

```typescript
// lib/marketing/promotions.ts
interface Promotion {
  id: string
  code: string
  type: 'percentage' | 'fixed' | 'nights'
  value: number
  conditions: {
    minNights?: number
    minAmount?: number
    validFrom: Date
    validUntil: Date
    maxUses?: number
    firstTimeOnly?: boolean
  }
}

export async function createPromotion(
  spaceId: string,
  data: CreatePromotionData
): Promise<Promotion> {
  // Generar código único si no se proporciona
  const code = data.code || generatePromoCode()

  const promotion = await prisma.promotion.create({
    data: {
      spaceId,
      code: code.toUpperCase(),
      type: data.type,
      value: data.value,
      conditions: data.conditions,
      active: true,
      usageCount: 0,
    },
  })

  // Programar notificaciones
  if (data.notifySubscribers) {
    await schedulePromotionEmails(promotion)
  }

  return promotion
}

export async function applyPromotion(
  bookingId: string,
  promoCode: string
): Promise<{
  success: boolean
  discount?: number
  error?: string
}> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { space: true, guest: true },
  })

  if (!booking) {
    return { success: false, error: 'Reserva no encontrada' }
  }

  const promotion = await prisma.promotion.findFirst({
    where: {
      code: promoCode.toUpperCase(),
      spaceId: booking.spaceId,
      active: true,
    },
  })

  if (!promotion) {
    return { success: false, error: 'Código inválido' }
  }

  // Validar condiciones
  const validation = validatePromotionConditions(promotion, booking)

  if (!validation.valid) {
    return { success: false, error: validation.reason }
  }

  // Calcular descuento
  let discount = 0

  switch (promotion.type) {
    case 'percentage':
      discount = booking.subtotal * (promotion.value / 100)
      break
    case 'fixed':
      discount = promotion.value
      break
    case 'nights':
      // Ej: 3x2, paga 2 noches de 3
      const nights = calculateNights(booking)
      const freeNights = Math.floor(nights / promotion.value)
      discount = (booking.subtotal / nights) * freeNights
      break
  }

  // Aplicar descuento
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      promotionId: promotion.id,
      discountAmount: discount,
      totalAmount: booking.totalAmount - discount,
    },
  })

  // Incrementar uso
  await prisma.promotion.update({
    where: { id: promotion.id },
    data: { usageCount: { increment: 1 } },
  })

  return { success: true, discount }
}
```

## Semanas 17-18: Optimización Mobile

### Semana 17: PWA Implementation

#### Día 1-3: Setup PWA Base

**Tasks específicos:**

- [ ] Configurar Service Worker
- [ ] Crear manifest.json
- [ ] Implementar estrategias de caching
- [ ] Configurar workbox
- [ ] Testing offline functionality

**Service Worker Setup:**

```typescript
// public/sw.js
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

// Precache de archivos estáticos
precacheAndRoute(self.__WB_MANIFEST)

// Cache de imágenes
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
      }),
    ],
  })
)

// Cache de API calls
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutos
      }),
    ],
  })
)

// Offline fallback
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html')
      })
    )
  }
})

// Background sync para mensajes
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages())
  }
})

// Push notifications
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}

  event.waitUntil(
    self.registration.showNotification(data.title || 'WorkSpace Chile', {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        url: data.url || '/',
      },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

**Manifest Configuration:**

```json
// public/manifest.json
{
  "name": "WorkSpace Chile",
  "short_name": "WorkSpace",
  "description": "Encuentra el espacio perfecto para trabajar",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshot-1.png",
      "sizes": "1280x720",
      "type": "image/png"
    },
    {
      "src": "/screenshot-2.png",
      "sizes": "1280x720",
      "type": "image/png"
    }
  ],
  "shortcuts": [
    {
      "name": "Buscar espacios",
      "url": "/search",
      "icons": [{ "src": "/search-icon.png", "sizes": "96x96" }]
    },
    {
      "name": "Mis reservas",
      "url": "/dashboard/bookings",
      "icons": [{ "src": "/bookings-icon.png", "sizes": "96x96" }]
    }
  ]
}
```

#### Día 4-5: Push Notifications

**Tasks específicos:**

- [ ] Implementar solicitud de permisos
- [ ] Configurar FCM o servicio similar
- [ ] Crear sistema de suscripciones
- [ ] Diferentes tipos de notificaciones
- [ ] Gestión de preferencias

**Push Notifications Implementation:**

```typescript
// lib/notifications/push.ts
export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export async function subscribeToPush(userId: string) {
  const registration = await navigator.serviceWorker.ready

  // Verificar si ya está suscrito
  const existingSubscription = await registration.pushManager.getSubscription()
  if (existingSubscription) {
    return existingSubscription
  }

  // Crear nueva suscripción
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ),
  })

  // Guardar en servidor
  await savePushSubscription(userId, subscription)

  return subscription
}

export async function sendPushNotification(
  userId: string,
  notification: {
    title: string
    body: string
    icon?: string
    badge?: string
    url?: string
    tag?: string
    requireInteraction?: boolean
  }
) {
  const subscriptions = await getUserPushSubscriptions(userId)

  const promises = subscriptions.map(async sub => {
    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify(notification)
      )
    } catch (error) {
      // Si falla, eliminar suscripción inválida
      if (error.statusCode === 410) {
        await deletePushSubscription(sub.id)
      }
    }
  })

  await Promise.all(promises)
}

// Hooks para componentes
export function usePushNotifications() {
  const [permission, setPermission] =
    useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
      checkSubscription()
    }
  }, [])

  const subscribe = async () => {
    const granted = await requestPushPermission()
    if (granted) {
      const subscription = await subscribeToPush(userId)
      setIsSubscribed(!!subscription)
      setPermission('granted')
    }
  }

  return {
    permission,
    isSubscribed,
    subscribe,
  }
}
```

#### Día 6-7: App Install & Updates

**Tasks específicos:**

- [ ] Implementar prompt de instalación
- [ ] Detectar si está instalada
- [ ] Sistema de actualizaciones
- [ ] Deep linking
- [ ] App shortcuts

**Install Prompt Component:**

```typescript
// components/pwa/install-prompt.tsx
'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Detectar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Escuchar evento de instalación
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // Mostrar prompt después de 30 segundos o 3 páginas vistas
      const shouldShow = checkInstallPromptCriteria()
      if (shouldShow) {
        setTimeout(() => setShowPrompt(true), 30000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      trackEvent('pwa_installed')
      setIsInstalled(true)
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
  }

  if (!showPrompt || isInstalled) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg md:bottom-4 md:left-4 md:right-auto md:max-w-sm md:rounded-lg md:border">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex gap-4">
        <img
          src="/icon-72x72.png"
          alt="WorkSpace"
          className="w-12 h-12"
        />

        <div className="flex-1">
          <h3 className="font-semibold">Instala WorkSpace</h3>
          <p className="text-sm text-muted-foreground">
            Acceso rápido desde tu pantalla de inicio
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={handleDismiss} className="flex-1">
          Ahora no
        </Button>
        <Button onClick={handleInstall} className="flex-1">
          Instalar
        </Button>
      </div>
    </div>
  )
}
```

### Semana 18: UX Mobile Específico

#### Día 1-3: Navegación Mobile

**Tasks específicos:**

- [ ] Implementar bottom navigation
- [ ] Gestos táctiles nativos
- [ ] Pull to refresh
- [ ] Transiciones suaves
- [ ] Optimización de formularios

**Bottom Navigation Component:**

```typescript
// components/mobile/bottom-navigation.tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, Calendar, MessageSquare, User } from 'lucide-react'

const navItems = [
  { href: '/', icon: Home, label: 'Inicio' },
  { href: '/search', icon: Search, label: 'Buscar' },
  { href: '/dashboard/bookings', icon: Calendar, label: 'Reservas' },
  { href: '/dashboard/messages', icon: MessageSquare, label: 'Mensajes' },
  { href: '/dashboard/profile', icon: User, label: 'Perfil' }
]

export function BottomNavigation() {
  const pathname = usePathname()

  // No mostrar en desktop
  if (typeof window !== 'undefined' && window.innerWidth > 768) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Safe area para iPhone */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  )
}
```

#### Día 4-5: Touch Gestures

**Tasks específicos:**

- [ ] Swipe para navegar
- [ ] Pinch to zoom en imágenes
- [ ] Long press para opciones
- [ ] Drag to dismiss
- [ ] Haptic feedback

**Swipeable Gallery:**

```typescript
// components/mobile/swipeable-gallery.tsx
'use client'

import { useSwipeable } from 'react-swipeable'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

export function SwipeableGallery({
  images
}: {
  images: string[]
}) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentIndex < images.length - 1) {
        setCurrentIndex(prev => prev + 1)
      }
    },
    onSwipedRight: () => {
      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1)
      }
    },
    trackMouse: true,
    preventDefaultTouchmoveEvent: true
  })

  return (
    <div className="relative overflow-hidden" {...handlers}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative aspect-video"
        >
          <Image
            src={images[currentIndex]}
            alt={`Imagen ${currentIndex + 1}`}
            fill
            className="object-cover"
            priority
          />
        </motion.div>
      </AnimatePresence>

      {/* Indicadores */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-white w-8'
                : 'bg-white/50'
            }`}
          />
        ))}
      </div>

      {/* Contador */}
      <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  )
}
```

#### Día 6-7: Optimización Final Mobile

**Tasks específicos:**

- [ ] Lazy loading de componentes
- [ ] Optimización de imágenes
- [ ] Reducir JavaScript bundle
- [ ] Mejorar Time to Interactive
- [ ] Testing en dispositivos reales

**Mobile Performance Optimizations:**

```typescript
// components/mobile/optimized-image.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'

export function OptimizedImage({
  src,
  alt,
  ...props
}: {
  src: string
  alt: string
  [key: string]: any
}) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className="relative overflow-hidden bg-muted">
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-muted to-muted-foreground/10 animate-shimmer" />
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Image
          src={src}
          alt={alt}
          {...props}
          onLoadingComplete={() => setIsLoading(false)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          quality={85}
        />
      </motion.div>
    </div>
  )
}

// Hook para detectar conexión lenta
export function useNetworkQuality() {
  const [quality, setQuality] = useState<'fast' | 'slow'>('fast')

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection

      const updateQuality = () => {
        if (
          connection.effectiveType === 'slow-2g' ||
          connection.effectiveType === '2g' ||
          connection.saveData
        ) {
          setQuality('slow')
        } else {
          setQuality('fast')
        }
      }

      updateQuality()
      connection.addEventListener('change', updateQuality)

      return () => {
        connection.removeEventListener('change', updateQuality)
      }
    }
  }, [])

  return quality
}

// Componente que adapta calidad según conexión
export function AdaptiveContent({ children }: { children: React.ReactNode }) {
  const quality = useNetworkQuality()

  return (
    <div data-network-quality={quality}>
      {children}
    </div>
  )
}
```

## Criterios de Éxito - Fase 2

### Funcionalidades Completas:

- [ ] Chat real-time funciona sin lag (<100ms)
- [ ] Sistema de reviews operativo y moderado
- [ ] Dashboard muestra métricas precisas
- [ ] PWA instalable en Android/iOS
- [ ] Performance mobile <2s load time

### Métricas de Calidad:

- [ ] Response time promedio hosts <4 horas
- [ ] 90% mensajes leídos en <1 hora
- [ ] 80% usuarios dejan review post-checkout
- [ ] 30% usuarios instalan PWA
- [ ] Mobile bounce rate <40%

### KPIs de Negocio:

- [ ] Aumento 25% en engagement
- [ ] Reducción 15% en disputes
- [ ] Incremento 20% retención usuarios
- [ ] NPS >75 (desde >70)
- [ ] Mobile traffic >60% del total

## Recursos y Documentación

### APIs y SDKs:

- [Pusher Docs](https://pusher.com/docs)
- [Resend Email API](https://resend.com/docs)
- [React Email](https://react.email)
- [Workbox PWA](https://developers.google.com/web/tools/workbox)
- [Web Push Protocol](https://web.dev/push-notifications-overview/)

### Librerías Frontend:

```json
{
  "dependencies": {
    "pusher-js": "^8.0.0",
    "react-big-calendar": "^1.8.0",
    "recharts": "^2.8.0",
    "react-hook-form": "^7.48.0",
    "@tanstack/react-query": "^5.0.0",
    "framer-motion": "^10.0.0",
    "react-swipeable": "^7.0.0"
  }
}
```

### Testing Tools:

- Playwright para E2E testing
- React Testing Library
- MSW para mocking APIs
- Lighthouse CI
- BrowserStack para devices reales

## Checklist Final - Fase 2

### Comunicación:

- [ ] Chat real-time implementado
- [ ] Notificaciones push funcionando
- [ ] Emails automáticos configurados
- [ ] Centro de notificaciones

### Reviews:

- [ ] Sistema bidireccional completo
- [ ] Moderación automática activa
- [ ] Ratings agregados calculados
- [ ] UI/UX de reviews pulida

### Analytics:

- [ ] Dashboard con todas las métricas
- [ ] Gráficos interactivos
- [ ] Export de datos
- [ ] Insights automáticos

### Mobile:

- [ ] PWA completamente funcional
- [ ] Performance optimizado
- [ ] UX nativo implementado
- [ ] App store ready

## Notas de Implementación

1. **Real-time**: Usar Pusher channels privados para seguridad
2. **Emails**: Implementar unsubscribe y preferencias GDPR
3. **Reviews**: Cache agresivo para performance
4. **Mobile**: Priorizar Core Web Vitals
5. **Analytics**: Considerar BigQuery para escala futura
