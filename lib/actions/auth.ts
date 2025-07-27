'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { onboardingSchema, type OnboardingFormData } from '@/lib/validations/auth'
import { revalidatePath } from 'next/cache'

export async function completeOnboarding(data: OnboardingFormData) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'No autorizado' }
    }

    // Validar los datos
    const validatedData = onboardingSchema.parse(data)

    // Buscar el usuario por clerkId
    let existingUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    // Si no existe el usuario, crearlo (fallback en caso de que el webhook no haya funcionado)
    if (!existingUser) {
      const { currentUser } = await import('@clerk/nextjs/server')
      const clerkUser = await currentUser()
      
      if (!clerkUser) {
        return { success: false, error: 'No se pudo obtener información del usuario' }
      }

      existingUser = await prisma.user.create({
        data: {
          clerkId: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          avatar: clerkUser.imageUrl,
        },
      })
    }

    // Verificar si el RUT ya está en uso
    if (validatedData.rut) {
      const rutExists = await prisma.user.findFirst({
        where: {
          rut: validatedData.rut,
          NOT: { id: existingUser.id },
        },
      })

      if (rutExists) {
        return { success: false, error: 'El RUT ya está registrado' }
      }
    }

    // Actualizar el usuario
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: validatedData.role,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        rut: validatedData.rut,
        verificationTier: 'BASIC',
      },
    })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error en onboarding:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Error al completar el perfil' }
  }
}

export async function getCurrentUser() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    return user
  } catch (error) {
    console.error('Error obteniendo usuario:', error)
    return null
  }
}

export async function checkUserOnboarding() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { needsOnboarding: false, isAuthenticated: false }
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        role: true,
        firstName: true,
        rut: true,
      },
    })

    // Si no existe el usuario en la BD, el webhook aún no se ha ejecutado
    if (!user) {
      return { needsOnboarding: true, isAuthenticated: true }
    }

    // Verificar si completó el onboarding
    const needsOnboarding = !user.role || !user.firstName || !user.rut

    return { needsOnboarding, isAuthenticated: true }
  } catch (error) {
    console.error('Error verificando onboarding:', error)
    return { needsOnboarding: false, isAuthenticated: false }
  }
}