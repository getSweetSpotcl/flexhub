import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { MainLayout } from '@/components/layouts/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCurrentUser, checkUserOnboarding } from '@/lib/actions/auth'
import { Shield, User as UserIcon, Star } from 'lucide-react'

export default async function DashboardPage() {
  const { userId } = await auth()
  const clerkUser = await currentUser()

  if (!userId) {
    redirect('/login')
  }

  // Verificar si necesita onboarding
  const { needsOnboarding } = await checkUserOnboarding()
  if (needsOnboarding) {
    redirect('/onboarding')
  }

  // Obtener usuario de la base de datos
  const dbUser = await getCurrentUser()

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Bienvenido, {dbUser?.firstName || clerkUser?.firstName || 'Usuario'}!
              </h1>
              <p className="text-muted-foreground">
                Gestiona tus espacios y reservas desde aquí
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={dbUser?.role === 'HOST' ? 'default' : 'secondary'}>
                {dbUser?.role === 'HOST' ? 'Host' : 'Guest'}
              </Badge>
              {dbUser?.isVerified && (
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Verificado
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Espacios Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                +0% desde el mes pasado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Reservas Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                +0% desde el mes pasado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0</div>
              <p className="text-xs text-muted-foreground">
                +0% desde el mes pasado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Rating Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0.0</div>
              <p className="text-xs text-muted-foreground">
                De 0 reseñas totales
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Información de Usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>Email:</strong>{' '}
                  {clerkUser?.emailAddresses[0]?.emailAddress}
                </p>
                <p>
                  <strong>Nombre completo:</strong>{' '}
                  {dbUser?.firstName} {dbUser?.lastName}
                </p>
                <p>
                  <strong>RUT:</strong> {dbUser?.rut || 'No registrado'}
                </p>
                <p>
                  <strong>Teléfono:</strong> {dbUser?.phone || 'No registrado'}
                </p>
                <p>
                  <strong>Tipo de cuenta:</strong>{' '}
                  <Badge variant="outline" className="ml-1">
                    {dbUser?.role === 'HOST' ? 'Host' : 'Guest'}
                  </Badge>
                </p>
                <p>
                  <strong>Fecha de registro:</strong>{' '}
                  {dbUser?.createdAt ? new Date(dbUser.createdAt).toLocaleDateString('es-CL') : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
