export function validateRUT(rut: string): boolean {
  // Limpiar RUT
  const cleanRut = rut.replace(/[.-]/g, '').toUpperCase()

  if (cleanRut.length < 8) return false

  const body = cleanRut.slice(0, -1)
  const dv = cleanRut.slice(-1)

  // Calcular dígito verificador
  let sum = 0
  let multiplier = 2

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const expectedDV = 11 - (sum % 11)
  const calculatedDV =
    expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : expectedDV.toString()

  return dv === calculatedDV
}

export function formatRUT(rut: string): string {
  const cleanRut = rut.replace(/[.-]/g, '').toUpperCase()
  
  if (cleanRut.length < 2) return cleanRut
  
  const body = cleanRut.slice(0, -1)
  const dv = cleanRut.slice(-1)
  
  // Agregar puntos cada 3 dígitos
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  return `${formattedBody}-${dv}`
}