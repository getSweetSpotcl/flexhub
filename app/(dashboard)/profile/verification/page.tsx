import { redirect } from 'next/navigation'
import { MainLayout } from '@/components/layouts/main-layout'
import { DocumentUpload } from '@/components/verification/document-upload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, CheckCircle2, Clock, XCircle, Phone } from 'lucide-react'
import { getCurrentUser } from '@/lib/actions/auth'
import { getVerificationStatus } from '@/lib/actions/verification'
import { auth } from '@clerk/nextjs/server'

export default async function VerificationPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/login')
  }

  const user = await getCurrentUser()
  const verificationStatus = await getVerificationStatus()

  if (!user) {
    redirect('/onboarding')
  }

  if (!verificationStatus) {
    redirect('/dashboard')
  }

  const getStatusBadge = () => {
    if (verificationStatus.latestRequest) {
      switch (verificationStatus.latestRequest.status) {
        case 'PENDING':
          return (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              En revisión
            </Badge>
          )
        case 'APPROVED':
          return (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Aprobado
            </Badge>
          )
        case 'REJECTED':
          return (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              Rechazado
            </Badge>
          )
      }
    }
    return null
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Verificación de Cuenta</h1>
          <p className="text-muted-foreground">
            Verifica tu identidad para aumentar la confianza y desbloquear más funciones
          </p>
        </div>

        <div className="grid gap-6">
          {/* Estado actual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Estado de Verificación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Nivel actual</p>
                    <p className="text-sm text-muted-foreground">
                      {verificationStatus.tier === 'BASIC' && 'Básico - Sin verificar'}
                      {verificationStatus.tier === 'VERIFIED' && 'Verificado'}
                      {verificationStatus.tier === 'PREMIUM' && 'Premium'}
                    </p>
                  </div>
                  {getStatusBadge()}
                </div>

                {verificationStatus.latestRequest?.status === 'REJECTED' && (
                  <div className="rounded-lg bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">
                      Tu solicitud de verificación fue rechazada. Por favor, intenta nuevamente con documentos más claros.
                    </p>
                  </div>
                )}

                {verificationStatus.latestRequest?.status === 'PENDING' && (
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm text-muted-foreground">
                      Estamos revisando tus documentos. Este proceso puede tomar hasta 48 horas.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verificación de identidad */}
          {(!verificationStatus.latestRequest || 
            verificationStatus.latestRequest.status === 'REJECTED') && (
            <DocumentUpload />
          )}

          {/* Verificación de teléfono */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Verificación de Teléfono
              </CardTitle>
              <CardDescription>
                Verifica tu número de teléfono para mayor seguridad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{user.phone || 'No registrado'}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.phoneVerified ? 'Verificado' : 'Sin verificar'}
                    </p>
                  </div>
                  {user.phoneVerified ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Verificado
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Verificar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Beneficios de la verificación */}
          <Card>
            <CardHeader>
              <CardTitle>Beneficios de la Verificación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Mayor confianza</p>
                    <p className="text-sm text-muted-foreground">
                      Los usuarios verificados generan más confianza en la comunidad
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Badge verificado</p>
                    <p className="text-sm text-muted-foreground">
                      Muestra un distintivo especial en tu perfil y espacios
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Prioridad en búsquedas</p>
                    <p className="text-sm text-muted-foreground">
                      Tus espacios aparecerán primero en los resultados
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Soporte prioritario</p>
                    <p className="text-sm text-muted-foreground">
                      Acceso a soporte dedicado y respuesta más rápida
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}