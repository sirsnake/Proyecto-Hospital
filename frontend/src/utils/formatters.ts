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
