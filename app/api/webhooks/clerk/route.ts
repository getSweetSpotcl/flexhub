import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  // Check if we have the webhook secret
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error(
      'Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local'
    )
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data)
        break
      case 'user.updated':
        await handleUserUpdated(evt.data)
        break
      case 'user.deleted':
        await handleUserDeleted(evt.data)
        break
      default:
        console.log(`Unhandled webhook event type: ${eventType}`)
    }

    return new Response('Webhook processed successfully', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Error processing webhook', { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleUserCreated(userData: Record<string, any>) {
  try {
    const user = await prisma.user.create({
      data: {
        clerkId: userData.id,
        email: userData.email_addresses[0]?.email_address || '',
        firstName: userData.first_name,
        lastName: userData.last_name,
        avatar: userData.image_url,
        // Default role is GUEST from schema
      },
    })
    console.log('User created in database:', user.id)
  } catch (error) {
    console.error('Error creating user in database:', error)
    throw error
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleUserUpdated(userData: Record<string, any>) {
  try {
    const user = await prisma.user.update({
      where: { clerkId: userData.id },
      data: {
        email: userData.email_addresses[0]?.email_address || '',
        firstName: userData.first_name,
        lastName: userData.last_name,
        avatar: userData.image_url,
      },
    })
    console.log('User updated in database:', user.id)
  } catch (error) {
    console.error('Error updating user in database:', error)
    throw error
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleUserDeleted(userData: Record<string, any>) {
  try {
    await prisma.user.delete({
      where: { clerkId: userData.id },
    })
    console.log('User deleted from database:', userData.id)
  } catch (error) {
    console.error('Error deleting user from database:', error)
    throw error
  }
}
