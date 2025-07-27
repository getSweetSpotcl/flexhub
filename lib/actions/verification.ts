'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function submitVerificationDocuments(documentUrls: string[]) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'No autorizado' }
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Crear registro de verificación
    await prisma.verificationRequest.create({
      data: {
        userId: user.id,
        documentUrls,
        status: 'PENDING',
        type: 'IDENTITY',
      },
    })

    // Actualizar estado del usuario
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationTier: 'VERIFIED', // Temporalmente, debería ser PENDING
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/profile')

    return { success: true }
  } catch (error) {
    console.error('Error al enviar documentos:', error)
    return { success: false, error: 'Error al procesar la solicitud' }
  }
}

export async function getVerificationStatus() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        verificationRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!user) {
      return null
    }

    return {
      tier: user.verificationTier,
      isVerified: user.isVerified,
      latestRequest: user.verificationRequests[0] || null,
    }
  } catch (error) {
    console.error('Error obteniendo estado de verificación:', error)
    return null
  }
}

export async function updatePhoneNumber(phone: string) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'No autorizado' }
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Validar formato de teléfono chileno
    const phoneRegex = /^\+56[0-9]{8,9}$/
    if (!phoneRegex.test(phone)) {
      return { success: false, error: 'Formato de teléfono inválido' }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        phone,
        phoneVerified: false, // Requerirá verificación por SMS
      },
    })

    revalidatePath('/profile')

    return { success: true }
  } catch (error) {
    console.error('Error al actualizar teléfono:', error)
    return { success: false, error: 'Error al actualizar teléfono' }
  }
}