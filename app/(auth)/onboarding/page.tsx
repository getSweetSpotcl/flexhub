'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Building2, User, FileText, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { onboardingSchema, type OnboardingFormData } from '@/lib/validations/auth'
import { completeOnboarding } from '@/lib/actions/auth'
import { formatRUT } from '@/lib/validations/rut'

const steps = [
  { id: 'role', title: 'Tipo de cuenta', icon: User },
  { id: 'personal', title: 'Información personal', icon: FileText },
  { id: 'terms', title: 'Términos y condiciones', icon: Check },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      role: undefined,
      firstName: '',
      lastName: '',
      phone: '+56',
      rut: '',
      acceptsTerms: false,
    },
    mode: 'onChange',
  })

  const progress = ((currentStep + 1) / steps.length) * 100

  async function onSubmit(data: OnboardingFormData) {
    setIsLoading(true)
    try {
      const result = await completeOnboarding(data)
      
      if (result.success) {
        router.push('/dashboard')
      } else {
        form.setError('root', {
          message: result.error || 'Error al completar el perfil',
        })
      }
    } catch {
      form.setError('root', {
        message: 'Error inesperado. Por favor intenta nuevamente.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!form.watch('role')
      case 1:
        const fields = ['firstName', 'lastName', 'phone', 'rut'] as const
        return fields.every(field => {
          const value = form.watch(field)
          const fieldState = form.getFieldState(field)
          return value && !fieldState.error
        })
      case 2:
        return form.watch('acceptsTerms')
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Completa tu perfil</h1>
          <p className="text-muted-foreground">
            Necesitamos algunos datos para personalizar tu experiencia
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} />
          <div className="flex justify-between text-sm text-muted-foreground">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 ${
                  index <= currentStep ? 'text-primary' : ''
                }`}
              >
                <step.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {form.formState.errors.root && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {form.formState.errors.root.message}
              </div>
            )}

            {/* Step 1: Role Selection */}
            {currentStep === 0 && (
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel>¿Cómo quieres usar FlexHub?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        className="grid gap-4"
                      >
                        <label
                          htmlFor="guest"
                          className="flex items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer hover:bg-accent"
                        >
                          <RadioGroupItem value="GUEST" id="guest" />
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal cursor-pointer">
                              Busco espacios para trabajar
                            </FormLabel>
                            <FormDescription>
                              Podrás buscar y reservar espacios de trabajo flexibles
                            </FormDescription>
                          </div>
                        </label>
                        <label
                          htmlFor="host"
                          className="flex items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer hover:bg-accent"
                        >
                          <RadioGroupItem value="HOST" id="host" />
                          <div className="space-y-1 leading-none">
                            <FormLabel className="font-normal cursor-pointer">
                              Quiero publicar espacios
                            </FormLabel>
                            <FormDescription>
                              Podrás listar tus espacios y recibir reservas
                            </FormDescription>
                          </div>
                        </label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Step 2: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Juan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                          <Input placeholder="Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="+56912345678" {...field} />
                      </FormControl>
                      <FormDescription>
                        Incluye el código de país (+56)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUT</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="12.345.678-9"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatRUT(e.target.value)
                            field.onChange(formatted)
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Necesario para la facturación electrónica
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 3: Terms */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 h-48 overflow-y-auto text-sm text-muted-foreground">
                  <h3 className="font-semibold text-foreground mb-2">
                    Términos y Condiciones de Uso
                  </h3>
                  <p className="mb-2">
                    Al utilizar FlexHub, aceptas cumplir con estos términos y condiciones...
                  </p>
                  <p className="mb-2">
                    1. <strong>Uso de la plataforma:</strong> FlexHub es una plataforma de
                    intermediación entre hosts y guests...
                  </p>
                  <p className="mb-2">
                    2. <strong>Responsabilidades:</strong> Los usuarios son responsables de
                    la veracidad de la información proporcionada...
                  </p>
                  <p className="mb-2">
                    3. <strong>Pagos y comisiones:</strong> FlexHub cobra una comisión del
                    8% sobre cada transacción...
                  </p>
                  <p>
                    4. <strong>Política de cancelación:</strong> Las cancelaciones se rigen
                    por las políticas establecidas por cada host...
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="acceptsTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Acepto los términos y condiciones de uso
                        </FormLabel>
                        <FormDescription>
                          Al aceptar, confirmas que has leído y estás de acuerdo con
                          nuestros términos de servicio y política de privacidad.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                disabled={currentStep === 0 || isLoading}
              >
                Anterior
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceed() || isLoading}
                >
                  Siguiente
                </Button>
              ) : (
                <Button type="submit" disabled={!canProceed() || isLoading}>
                  {isLoading ? 'Completando...' : 'Completar perfil'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </Card>
    </div>
  )
}