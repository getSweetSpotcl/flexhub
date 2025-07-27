import { SignUp } from '@clerk/nextjs'

export default function RegisterPage() {
  return (
    <div className="flex justify-center">
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary: 'bg-primary hover:bg-primary/90',
            socialButtonsBlockButton: 'border-2 border-border',
            socialButtonsBlockButtonText: 'text-foreground',
            dividerLine: 'bg-border',
            dividerText: 'text-muted-foreground',
            formFieldLabel: 'text-foreground',
            formFieldInput: 'border-border focus:border-primary',
            identityPreviewText: 'text-foreground',
            identityPreviewEditButton: 'text-primary',
          },
        }}
      />
    </div>
  )
}
