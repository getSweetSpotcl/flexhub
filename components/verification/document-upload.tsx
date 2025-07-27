'use client'

import { useState } from 'react'
import { UploadDropzone } from '@uploadthing/react'
import { FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { submitVerificationDocuments } from '@/lib/actions/verification'
import type { OurFileRouter } from '@/app/api/uploadthing/core'

interface UploadedFile {
  url: string
  name: string
  size: number
}

export function DocumentUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      setError('Por favor sube al menos un documento')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await submitVerificationDocuments(
        uploadedFiles.map(f => f.url)
      )

      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error || 'Error al enviar documentos')
      }
    } catch {
      setError('Error inesperado al enviar documentos')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">¡Documentos enviados!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Revisaremos tus documentos en las próximas 24-48 horas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificación de Identidad</CardTitle>
        <CardDescription>
          Sube una foto clara de tu cédula de identidad o pasaporte para verificar tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {uploadedFiles.length === 0 ? (
          <UploadDropzone<OurFileRouter, "documentUploader">
            endpoint="documentUploader"
            onClientUploadComplete={(res) => {
              if (res) {
                setUploadedFiles(res.map(file => ({
                  url: file.url,
                  name: file.name,
                  size: file.size,
                })))
              }
            }}
            onUploadError={(error: Error) => {
              setError(`Error al subir archivo: ${error.message}`)
            }}
            appearance={{
              container: {
                border: '2px dashed',
                borderRadius: '0.5rem',
              },
              uploadIcon: {
                color: 'rgb(99 102 241)',
              },
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Subido
                  </Badge>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadedFiles([])
                  setError(null)
                }}
                disabled={isSubmitting}
              >
                Cambiar archivos
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar para verificación'
                )}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 flex items-start gap-2">
            <XCircle className="h-5 w-5 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="text-sm font-medium">Documentos aceptados:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Cédula de identidad chilena (ambos lados)</li>
            <li>• Pasaporte vigente</li>
            <li>• Licencia de conducir chilena</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            Los documentos deben estar vigentes y ser claramente legibles.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}