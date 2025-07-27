import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MainLayout } from '@/components/layouts/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  Edit,
  FileText,
  Star
} from 'lucide-react'
import { getCurrentUser } from '@/lib/actions/auth'
import { auth, currentUser } from '@clerk/nextjs/server'
import { formatRUT } from '@/lib/validations/rut'

export default async function ProfilePage() {
  const { userId } = await auth()
  const clerkUser = await currentUser()
  
  if (!userId) {
    redirect('/login')
  }

  const dbUser = await getCurrentUser()
  
  if (!dbUser) {
    redirect('/onboarding')
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Gestiona tu información personal y preferencias
          </p>
        </div>

        <div className="grid gap-6">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Información Personal</CardTitle>
                <Button variant="outline" size="sm" disabled>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={dbUser.avatar || clerkUser?.imageUrl} />
                  <AvatarFallback>
                    <User className="h-10 w-10" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      Nombre completo
                    </div>
                    <p className="font-medium">
                      {dbUser.firstName} {dbUser.lastName}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                    <p className="font-medium">{dbUser.email}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      Teléfono
                    </div>
                    <p className="font-medium">{dbUser.phone || 'No registrado'}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      RUT
                    </div>
                    <p className="font-medium">
                      {dbUser.rut ? formatRUT(dbUser.rut) : 'No registrado'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Miembro desde
                    </div>
                    <p className="font-medium">
                      {new Date(dbUser.createdAt).toLocaleDateString('es-CL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      Tipo de cuenta
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={dbUser.role === 'HOST' ? 'default' : 'secondary'}>
                        {dbUser.role === 'HOST' ? 'Host' : 'Guest'}
                      </Badge>
                      {dbUser.isVerified && (
                        <Badge variant="outline" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Verificado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estado de verificación */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Verificación de Cuenta</CardTitle>
                  <CardDescription>
                    Aumenta la confianza verificando tu identidad
                  </CardDescription>
                </div>
                <Link href="/profile/verification">
                  <Button variant="outline" size="sm">
                    Gestionar
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      dbUser.isVerified ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <div>
                      <p className="font-medium">Documento de identidad</p>
                      <p className="text-sm text-muted-foreground">
                        {dbUser.isVerified ? 'Verificado' : 'Pendiente de verificación'}
                      </p>
                    </div>
                  </div>
                  {dbUser.isVerified && (
                    <Badge variant="outline" className="gap-1">
                      <Shield className="h-3 w-3 text-green-500" />
                      Verificado
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      dbUser.phoneVerified ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <div>
                      <p className="font-medium">Número de teléfono</p>
                      <p className="text-sm text-muted-foreground">
                        {dbUser.phoneVerified ? 'Verificado' : 'Sin verificar'}
                      </p>
                    </div>
                  </div>
                  {dbUser.phoneVerified && (
                    <Badge variant="outline" className="gap-1">
                      <Phone className="h-3 w-3 text-green-500" />
                      Verificado
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas */}
          {dbUser.role === 'HOST' && (
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas como Host</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-sm text-muted-foreground">Espacios activos</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-sm text-muted-foreground">Reservas totales</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold flex items-center justify-center gap-1">
                      0.0 <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">Rating promedio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuración de seguridad */}
          <Card>
            <CardHeader>
              <CardTitle>Seguridad</CardTitle>
              <CardDescription>
                Gestiona la seguridad de tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" disabled>
                <Edit className="h-4 w-4 mr-2" />
                Cambiar contraseña
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Shield className="h-4 w-4 mr-2" />
                Autenticación de dos factores
              </Button>
              <p className="text-sm text-muted-foreground">
                La gestión de contraseña y autenticación se realiza a través de Clerk
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}