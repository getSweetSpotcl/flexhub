import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get current time
    const now = new Date()

    // Find expired bookings (payment deadline passed and still pending payment)
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        paymentDeadline: {
          lt: now,
        },
      },
    })

    // Cancel expired bookings
    const cancelledBookings = await prisma.booking.updateMany({
      where: {
        id: {
          in: expiredBookings.map(booking => booking.id),
        },
      },
      data: {
        status: 'CANCELLED',
        updatedAt: now,
      },
    })

    // Release availability for cancelled bookings
    for (const booking of expiredBookings) {
      await prisma.availability.deleteMany({
        where: {
          bookingId: booking.id,
          type: 'BLOCKED',
        },
      })
    }

    console.log(`Cleaned up ${cancelledBookings.count} expired bookings`)

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cancelledBookings.count} expired bookings`,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Cleanup cron job failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}