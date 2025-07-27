import Link from 'next/link'
import { Building2, MapPin, Mail, Phone } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerSections = [
    {
      title: 'Plataforma',
      links: [
        { href: '/search', label: 'Buscar Espacios' },
        { href: '/become-host', label: 'Ser Host' },
        { href: '/how-it-works', label: 'Cómo Funciona' },
        { href: '/pricing', label: 'Precios' },
      ],
    },
    {
      title: 'Empresa',
      links: [
        { href: '/about', label: 'Acerca de' },
        { href: '/careers', label: 'Trabaja con Nosotros' },
        { href: '/press', label: 'Prensa' },
        { href: '/blog', label: 'Blog' },
      ],
    },
    {
      title: 'Soporte',
      links: [
        { href: '/help', label: 'Centro de Ayuda' },
        { href: '/contact', label: 'Contacto' },
        { href: '/safety', label: 'Seguridad' },
        { href: '/insurance', label: 'Seguros' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { href: '/terms', label: 'Términos y Condiciones' },
        { href: '/privacy', label: 'Política de Privacidad' },
        { href: '/cookies', label: 'Política de Cookies' },
        { href: '/disclaimer', label: 'Descargo de Responsabilidad' },
      ],
    },
  ]

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-8 py-16 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">FlexHub</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              La plataforma líder en Chile para el alquiler flexible de espacios
              de trabajo.
            </p>

            {/* Contact Info */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Santiago, Chile</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a
                  href="mailto:hola@flexhub.com"
                  className="hover:text-foreground"
                >
                  hola@flexhub.com
                </a>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <a href="tel:+56912345678" className="hover:text-foreground">
                  +56 9 1234 5678
                </a>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map(section => (
            <div key={section.title}>
              <h3 className="font-semibold">{section.title}</h3>
              <ul className="mt-4 space-y-2">
                {section.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Footer */}
        <div className="flex flex-col items-center justify-between border-t py-6 md:flex-row">
          <div className="text-sm text-muted-foreground">
            © {currentYear} FlexHub. Todos los derechos reservados.
          </div>

          {/* Social Links */}
          <div className="mt-4 flex space-x-6 md:mt-0">
            <Link
              href="/sitemap"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Mapa del Sitio
            </Link>
            <Link
              href="/status"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Estado del Servicio
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
