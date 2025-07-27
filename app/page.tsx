import Link from 'next/link'
import { Search, Building2, Star, Shield, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MainLayout } from '@/components/layouts/main-layout'

export default function Home() {
  const features = [
    {
      icon: Search,
      title: 'Búsqueda Inteligente',
      description:
        'Encuentra el espacio perfecto con filtros avanzados por ubicación, tipo, precio y amenidades.',
    },
    {
      icon: Shield,
      title: 'Reservas Seguras',
      description:
        'Pagos protegidos con Transbank y verificación de identidad para hosts y huéspedes.',
    },
    {
      icon: Clock,
      title: 'Flexibilidad Total',
      description:
        'Reserva por horas, días o semanas. Cancela fácilmente según nuestras políticas.',
    },
  ]

  const spaceTypes = [
    {
      title: 'Oficinas Privadas',
      description: 'Espacios completamente privados para equipos',
      image: '🏢',
      badge: 'Desde $15.000/día',
    },
    {
      title: 'Salas de Reuniones',
      description: 'Perfectas para presentaciones y juntas',
      image: '🤝',
      badge: 'Desde $8.000/hora',
    },
    {
      title: 'Espacios de Coworking',
      description: 'Ambientes colaborativos y dinámicos',
      image: '💻',
      badge: 'Desde $5.000/día',
    },
  ]

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Encuentra tu <span className="text-primary">espacio ideal</span>{' '}
              para trabajar
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Conectamos profesionales con espacios de trabajo flexibles en todo
              Chile. Oficinas, salas de reuniones y espacios de coworking
              disponibles por horas o días.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" asChild>
                <Link href="/search">
                  <Search className="mr-2 h-4 w-4" />
                  Buscar Espacios
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/become-host">
                  <Building2 className="mr-2 h-4 w-4" />
                  Publicar mi Espacio
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              ¿Por qué elegir FlexHub?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              La plataforma más confiable y fácil de usar para encontrar
              espacios de trabajo
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(feature => (
              <Card key={feature.title} className="text-center">
                <CardHeader>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Space Types Section */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tipos de Espacios Disponibles
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Desde oficinas privadas hasta espacios de coworking colaborativos
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {spaceTypes.map(type => (
              <Card
                key={type.title}
                className="group cursor-pointer transition-all hover:shadow-lg"
              >
                <CardHeader>
                  <div className="text-4xl mb-4">{type.image}</div>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{type.title}</CardTitle>
                    <Badge variant="secondary">{type.badge}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{type.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button size="lg" asChild>
              <Link href="/search">Ver Todos los Espacios</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              ¿Tienes un espacio disponible?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Únete a nuestra comunidad de hosts y empieza a generar ingresos
              con tu espacio
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/become-host">
                  <Building2 className="mr-2 h-4 w-4" />
                  Ser Host
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link
                  href="/how-it-works"
                  className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary"
                >
                  Cómo Funciona
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">50+</div>
                <div className="text-sm text-muted-foreground">
                  Espacios Verificados
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">
                  Usuarios Registrados
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">4.8</div>
                <div className="flex items-center justify-center text-sm text-muted-foreground">
                  <Star className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
                  Rating Promedio
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}
