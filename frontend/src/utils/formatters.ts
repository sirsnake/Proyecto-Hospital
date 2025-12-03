// Utilidades de formateo compartidas

export function formatearTamano(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatearFecha(fecha: string | Date): string {
  if (!fecha) return "N/A"
  const date = new Date(fecha)
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  })
}

export function formatearFechaHora(fecha: string | Date): string {
  if (!fecha) return "N/A"
  const date = new Date(fecha)
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatearHora(fecha: string | Date): string {
  if (!fecha) return "N/A"
  const date = new Date(fecha)
  return date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatearTiempoRelativo(fecha: string | Date): string {
  if (!fecha) return "N/A"
  
  const date = new Date(fecha)
  const ahora = new Date()
  const diffMs = ahora.getTime() - date.getTime()
  const diffMinutos = Math.floor(diffMs / (1000 * 60))
  const diffHoras = Math.floor(diffMinutos / 60)
  const diffDias = Math.floor(diffHoras / 24)
  
  if (diffMinutos < 1) return "ahora"
  if (diffMinutos < 60) return `hace ${diffMinutos}m`
  if (diffHoras < 24) return `hace ${diffHoras}h`
  if (diffDias < 7) return `hace ${diffDias}d`
  
  return formatearFecha(fecha)
}

export function obtenerNombrePaciente(paciente: any): string {
  if (!paciente) return "Paciente desconocido"
  if (paciente.es_nn) {
    return `Paciente NN (${paciente.id_temporal || 'Sin ID'})`
  }
  return `${paciente.nombres || ''} ${paciente.apellidos || ''}`.trim() || "Sin nombre"
}

export function obtenerEdad(fechaNacimiento: string | Date | null): string {
  if (!fechaNacimiento) return "N/A"
  
  const nacimiento = new Date(fechaNacimiento)
  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const m = hoy.getMonth() - nacimiento.getMonth()
  
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--
  }
  
  return `${edad} años`
}

// Colores de prioridad de triage
export const COLORES_TRIAGE = {
  C1: { bg: 'bg-red-600', text: 'text-red-400', border: 'border-red-500', nombre: 'Vital' },
  C2: { bg: 'bg-orange-600', text: 'text-orange-400', border: 'border-orange-500', nombre: 'Emergencia' },
  C3: { bg: 'bg-yellow-600', text: 'text-yellow-400', border: 'border-yellow-500', nombre: 'Urgencia' },
  C4: { bg: 'bg-green-600', text: 'text-green-400', border: 'border-green-500', nombre: 'Menor' },
  C5: { bg: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500', nombre: 'No urgente' },
} as const

export function getColorTriage(prioridad: string): typeof COLORES_TRIAGE[keyof typeof COLORES_TRIAGE] {
  return COLORES_TRIAGE[prioridad as keyof typeof COLORES_TRIAGE] || COLORES_TRIAGE.C5
}
