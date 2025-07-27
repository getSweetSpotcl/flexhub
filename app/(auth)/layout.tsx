export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">FlexHub</h2>
          <p className="text-muted-foreground">
            Tu plataforma de espacios de trabajo flexibles
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
