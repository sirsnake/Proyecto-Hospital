// Servicio para consumir la API de Django

// CAMBIAR A true PARA USAR PYTHONANYWHERE (producción)
// Para desarrollo local: false
// Para producción (Vercel/Android): true
const USE_PYTHONANYWHERE = false

// Detectar si estamos en un túnel de desarrollo o localhost
export function getApiUrl(): string {
  // Si queremos usar PythonAnywhere explícitamente
  if (USE_PYTHONANYWHERE) {
    return 'https://sirsnake.pythonanywhere.com/api'
  }
  
  if (typeof window === 'undefined') {
    return 'http://localhost:8003/api'
  }
  
  const hostname = window.location.hostname
  
  // Si estamos en Vercel (producción), usar PythonAnywhere
  if (hostname.includes('vercel.app') || hostname.includes('proyecto-hospital')) {
    return 'https://sirsnake.pythonanywhere.com/api'
  }
  
  // Si estamos en localhost, usar localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8003/api'
  }
  
  // Si estamos en un túnel de VS Code, usar el túnel del backend
  if (hostname.includes('devtunnels.ms')) {
    // Reemplazar el puerto del frontend por el del backend
    const backendHost = hostname.replace('-3000.', '-8003.').replace('-3001.', '-8003.')
    return `https://${backendHost}/api`
  }
  
  // Para app Android u otras situaciones, usar PythonAnywhere
  // (Android no puede acceder a localhost del PC)
  return 'https://sirsnake.pythonanywhere.com/api'
}

const API_URL = getApiUrl()

// Obtener CSRF token de las cookies
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

// Obtener CSRF token desde Django si no existe
let csrfTokenPromise: Promise<void> | null = null
async function ensureCSRFToken() {
  if (csrfTokenPromise) {
    return csrfTokenPromise
  }
  
  if (getCookie('csrftoken')) {
    return Promise.resolve()
  }
  
  csrfTokenPromise = fetch(`${API_URL}/csrf/`, {
    credentials: 'include',
  }).then(() => {
    csrfTokenPromise = null
  }).catch((err) => {
    csrfTokenPromise = null
    console.error('Error obteniendo CSRF token:', err)
  })
  
  return csrfTokenPromise
}

// Configuración de fetch con credenciales y CSRF
const fetchWithCredentials = async (url: string, options: RequestInit = {}) => {
  // Para operaciones POST, PUT, DELETE, asegurar que tenemos el CSRF token
  if (options.method && options.method !== 'GET') {
    await ensureCSRFToken()
  }
  
  const csrfToken = getCookie('csrftoken')
  
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && options.method !== 'GET' ? { 'X-CSRFToken': csrfToken } : {}),
      ...options.headers,
    },
  }

  const response = await fetch(url, { ...defaultOptions, ...options })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error en la solicitud' }))
    
    // 404 en búsqueda de paciente no es un error crítico
    if (response.status === 404 && url.includes('/buscar/')) {
      // Paciente no encontrado - se creará uno nuevo
    } else {
      console.error('Error del servidor:', error)
    }
    
    // Si hay errores de validación, mostrarlos todos
    if (error && typeof error === 'object' && !error.detail && !error.message) {
      const errorMessages = Object.entries(error).map(([field, messages]) => {
        // Si el mensaje es un objeto (como signos_vitales_data), convertirlo a string legible
        if (typeof messages === 'object' && messages !== null && !Array.isArray(messages)) {
          const subErrors = Object.entries(messages as Record<string, any>).map(([subField, subMessages]) => {
            const subMessageArray = Array.isArray(subMessages) ? subMessages : [subMessages]
            return `${subField}: ${subMessageArray.join(', ')}`
          }).join('; ')
          return `${field} → ${subErrors}`
        }
        
        const messageArray = Array.isArray(messages) ? messages : [messages]
        const fieldName = field === 'rut' ? 'RUT' : 
                         field === 'nombres' ? 'Nombres' :
                         field === 'apellidos' ? 'Apellidos' :
                         field === 'sexo' ? 'Sexo' :
                         field === 'non_field_errors' ? 'Error' : field
        return `${fieldName}: ${messageArray.join(', ')}`
      }).join('; ')
      throw new Error(errorMessages || `Error ${response.status}`)
    }
    
    throw new Error(error.detail || error.message || `Error ${response.status}: ${response.statusText}`)
  }

  // Si la respuesta está vacía, retornar objeto vacío
  const text = await response.text()
  return text ? JSON.parse(text) : {}
}

// Autenticación
export const authAPI = {
  login: async (email: string, password: string) => {
    return fetchWithCredentials(`${API_URL}/login/`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  logout: async () => {
    return fetchWithCredentials(`${API_URL}/logout/`, {
      method: 'POST',
    })
  },

  getCurrentUser: async () => {
    return fetchWithCredentials(`${API_URL}/current-user/`)
  },
}

// Pacientes
export const pacientesAPI = {
  listar: async () => {
    return fetchWithCredentials(`${API_URL}/pacientes/`)
  },

  obtener: async (id: number) => {
    return fetchWithCredentials(`${API_URL}/pacientes/${id}/`)
  },

  crear: async (data: any) => {
    return fetchWithCredentials(`${API_URL}/pacientes/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  actualizar: async (id: number, data: any) => {
    return fetchWithCredentials(`${API_URL}/pacientes/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  buscar: async (query: string) => {
    const params = new URLSearchParams()
    params.append('q', query)
    return fetchWithCredentials(`${API_URL}/pacientes/buscar/?${params}`)
  },

  historial: async (id: number) => {
    return fetchWithCredentials(`${API_URL}/pacientes/${id}/historial/`)
  },
}

// Fichas de Emergencia
export const fichasAPI = {
  listar: async (filtros?: { estado?: string; prioridad?: string; paramedico?: number; paciente_id?: number }) => {
    const params = new URLSearchParams()
    if (filtros?.estado) params.append('estado', filtros.estado)
    if (filtros?.prioridad) params.append('prioridad', filtros.prioridad)
    if (filtros?.paramedico) params.append('paramedico', filtros.paramedico.toString())
    if (filtros?.paciente_id) params.append('paciente_id', filtros.paciente_id.toString())
    
    return fetchWithCredentials(`${API_URL}/fichas/?${params}`)
  },

  obtener: async (id: number) => {
    return fetchWithCredentials(`${API_URL}/fichas/${id}/`)
  },

  atendidas: async () => {
    return fetchWithCredentials(`${API_URL}/fichas/atendidas/`)
  },

  dadosDeAlta: async () => {
    return fetchWithCredentials(`${API_URL}/fichas/dados_de_alta/`)
  },

  hospitalizados: async () => {
    return fetchWithCredentials(`${API_URL}/fichas/hospitalizados/`)
  },

  enUci: async () => {
    return fetchWithCredentials(`${API_URL}/fichas/en_uci/`)
  },

  derivados: async () => {
    return fetchWithCredentials(`${API_URL}/fichas/derivados/`)
  },

  fallecidos: async () => {
    return fetchWithCredentials(`${API_URL}/fichas/fallecidos/`)
  },

  crear: async (data: any) => {
    return fetchWithCredentials(`${API_URL}/fichas/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  actualizar: async (id: number, data: any) => {
    return fetchWithCredentials(`${API_URL}/fichas/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  enRuta: async () => {
    return fetchWithCredentials(`${API_URL}/fichas/en_ruta/`)
  },

  enHospital: async () => {
    return fetchWithCredentials(`${API_URL}/fichas/en_hospital/`)
  },

  cambiarEstado: async (id: number, estado: string) => {
    return fetchWithCredentials(`${API_URL}/fichas/${id}/cambiar_estado/`, {
      method: 'POST',
      body: JSON.stringify({ estado }),
    })
  },
}

// Signos Vitales
export const signosVitalesAPI = {
  crear: async (data: any) => {
    return fetchWithCredentials(`${API_URL}/signos-vitales/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  porFicha: async (fichaId: number) => {
    return fetchWithCredentials(`${API_URL}/signos-vitales/?ficha=${fichaId}`)
  },
}

// Solicitudes de Medicamentos
export const solicitudesMedicamentosAPI = {
  listar: async (filtros?: { estado?: string; ficha?: number }) => {
    const params = new URLSearchParams()
    if (filtros?.estado) params.append('estado', filtros.estado)
    if (filtros?.ficha) params.append('ficha', filtros.ficha.toString())
    
    return fetchWithCredentials(`${API_URL}/solicitudes-medicamentos/?${params}`)
  },

  crear: async (data: any) => {
    return fetchWithCredentials(`${API_URL}/solicitudes-medicamentos/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  pendientes: async () => {
    return fetchWithCredentials(`${API_URL}/solicitudes-medicamentos/pendientes/`)
  },

  autorizar: async (id: number, respuesta?: string) => {
    return fetchWithCredentials(`${API_URL}/solicitudes-medicamentos/${id}/autorizar/`, {
      method: 'POST',
      body: JSON.stringify({ respuesta: respuesta || 'Autorizado' }),
    })
  },

  rechazar: async (id: number, respuesta: string) => {
    return fetchWithCredentials(`${API_URL}/solicitudes-medicamentos/${id}/rechazar/`, {
      method: 'POST',
      body: JSON.stringify({ respuesta }),
    })
  },
}

// Anamnesis
export const anamnesisAPI = {
  crear: async (data: any) => {
    return fetchWithCredentials(`${API_URL}/anamnesis/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  actualizar: async (id: number, data: any) => {
    return fetchWithCredentials(`${API_URL}/anamnesis/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  porFicha: async (fichaId: number) => {
    return fetchWithCredentials(`${API_URL}/anamnesis/?ficha=${fichaId}`)
  },
}

// Triage
export const triageAPI = {
  crear: async (data: any) => {
    return fetchWithCredentials(`${API_URL}/triage/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  actualizar: async (id: number, data: any) => {
    return fetchWithCredentials(`${API_URL}/triage/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  porFicha: async (fichaId: number) => {
    return fetchWithCredentials(`${API_URL}/triage/?ficha=${fichaId}`)
  },

  pendientes: async () => {
    return fetchWithCredentials(`${API_URL}/triage/pendientes/`)
  },

  estadisticas: async () => {
    return fetchWithCredentials(`${API_URL}/triage/estadisticas/`)
  },
}

// Diagnósticos
export const diagnosticosAPI = {
  crear: async (data: any) => {
    return fetchWithCredentials(`${API_URL}/diagnosticos/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  actualizar: async (id: number, data: any) => {
    return fetchWithCredentials(`${API_URL}/diagnosticos/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  porFicha: async (fichaId: number) => {
    return fetchWithCredentials(`${API_URL}/diagnosticos/?ficha=${fichaId}`)
  },
  
  actualizarPorFicha: async (fichaId: number, data: any) => {
    // Primero obtener el diagnóstico existente
    const diagnosticos = await fetchWithCredentials(`${API_URL}/diagnosticos/?ficha=${fichaId}`)
    if (diagnosticos && diagnosticos.length > 0) {
      // Actualizar el diagnóstico existente - NO incluir ficha en el PATCH
      const { ficha, ...dataWithoutFicha } = data
      return fetchWithCredentials(`${API_URL}/diagnosticos/${diagnosticos[0].id}/`, {
        method: 'PATCH',
        body: JSON.stringify(dataWithoutFicha),
      })
    }
    // Si no existe, crear uno nuevo (esto no debería pasar si llegamos aquí)
    throw new Error('No se encontró diagnóstico existente para actualizar')
  },
}

// Solicitudes de Exámenes
export const solicitudesExamenesAPI = {
  crear: async (data: any) => {
    return fetchWithCredentials(`${API_URL}/solicitudes-examenes/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  listar: async (params?: { estado?: string; ficha?: number }) => {
    let url = `${API_URL}/solicitudes-examenes/`
    if (params) {
      const queryParams = new URLSearchParams()
      if (params.estado) queryParams.append('estado', params.estado)
      if (params.ficha) queryParams.append('ficha', params.ficha.toString())
      if (queryParams.toString()) url += `?${queryParams.toString()}`
    }
    return fetchWithCredentials(url)
  },

  pendientes: async () => {
    return fetchWithCredentials(`${API_URL}/solicitudes-examenes/pendientes/`)
  },

  porFicha: async (fichaId: number) => {
    return fetchWithCredentials(`${API_URL}/solicitudes-examenes/?ficha=${fichaId}`)
  },

  actualizar: async (id: number, data: { estado?: string; resultados?: string }) => {
    return fetchWithCredentials(`${API_URL}/solicitudes-examenes/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  marcarProceso: async (id: number) => {
    return fetchWithCredentials(`${API_URL}/solicitudes-examenes/${id}/marcar_proceso/`, {
      method: 'POST',
    })
  },

  completar: async (id: number, resultados: string, observaciones?: string) => {
    return fetchWithCredentials(`${API_URL}/solicitudes-examenes/${id}/completar/`, {
      method: 'POST',
      body: JSON.stringify({ resultados, observaciones }),
    })
  },
}

// API para Notas de Evolución Clínica
export interface NotaEvolucion {
  id: number
  ficha: number
  medico: {
    id: number
    nombre: string
    rol: string
  } | null
  tipo: string
  tipo_display: string
  fecha_hora: string
  subjetivo: string
  objetivo: string
  analisis: string
  plan: string
  signos_vitales: {
    pa_sistolica?: number
    pa_diastolica?: number
    fc?: number
    fr?: number
    temp?: number
    sat_o2?: number
  } | null
  glasgow: number | null
  indicaciones_actualizadas: string
  medicamentos_actualizados: string
  editado: boolean
  fecha_edicion: string | null
  motivo_edicion: string
}

export interface NotaEvolucionCreate {
  ficha_id: number
  tipo?: string
  subjetivo?: string
  objetivo?: string
  analisis?: string
  plan?: string
  signos_vitales?: Record<string, string | number | undefined>
  glasgow?: number
  indicaciones_actualizadas?: string
  medicamentos_actualizados?: string
  motivo_edicion?: string
}

export const notasEvolucionAPI = {
  obtenerPorFicha: async (fichaId: number): Promise<NotaEvolucion[]> => {
    return await fetchWithCredentials(`${API_URL}/notas-evolucion/por_ficha/?ficha_id=${fichaId}`)
  },

  obtenerResumen: async (fichaId: number) => {
    return await fetchWithCredentials(`${API_URL}/notas-evolucion/resumen/?ficha_id=${fichaId}`)
  },

  crear: async (data: NotaEvolucionCreate): Promise<NotaEvolucion> => {
    return await fetchWithCredentials(`${API_URL}/notas-evolucion/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  actualizar: async (id: number, data: Partial<NotaEvolucionCreate>): Promise<NotaEvolucion> => {
    return await fetchWithCredentials(`${API_URL}/notas-evolucion/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  eliminar: async (id: number): Promise<void> => {
    await fetchWithCredentials(`${API_URL}/notas-evolucion/${id}/`, {
      method: 'DELETE',
    })
  },
}

// API para documentos PDF
export const documentosAPI = {
  descargarFichaPDF: async (fichaId: number) => {
    const response = await fetch(`${API_URL}/documentos/ficha/${fichaId}/`, {
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error('Error al generar PDF de ficha')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ficha_${fichaId}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  descargarRecetaPDF: async (fichaId: number) => {
    const response = await fetch(`${API_URL}/documentos/receta/${fichaId}/`, {
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error('Error al generar receta médica')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `receta_${fichaId}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  descargarOrdenExamenesPDF: async (fichaId: number) => {
    const response = await fetch(`${API_URL}/documentos/orden-examenes/${fichaId}/`, {
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error('Error al generar orden de exámenes')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `orden_examenes_${fichaId}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  descargarAltaPDF: async (fichaId: number) => {
    const response = await fetch(`${API_URL}/documentos/alta/${fichaId}/`, {
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error('Error al generar alta médica')
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `alta_${fichaId}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  abrirFichaPDF: (fichaId: number) => {
    window.open(`${API_URL}/documentos/ficha/${fichaId}/`, '_blank')
  },

  abrirRecetaPDF: (fichaId: number) => {
    window.open(`${API_URL}/documentos/receta/${fichaId}/`, '_blank')
  },

  abrirOrdenExamenesPDF: (fichaId: number) => {
    window.open(`${API_URL}/documentos/orden-examenes/${fichaId}/`, '_blank')
  },

  abrirAltaPDF: (fichaId: number) => {
    window.open(`${API_URL}/documentos/alta/${fichaId}/`, '_blank')
  },
}

// API para gestión de usuarios (admin)
export const usuariosAPI = {
  listar: async (params?: { rol?: string; search?: string; activo?: boolean }) => {
    const query = new URLSearchParams()
    if (params?.rol) query.append('rol', params.rol)
    if (params?.search) query.append('search', params.search)
    if (params?.activo !== undefined) query.append('activo', params.activo.toString())
    
    return fetchWithCredentials(`${API_URL}/usuarios/?${query.toString()}`)
  },

  obtener: async (id: number) => {
    return fetchWithCredentials(`${API_URL}/usuarios/${id}/`)
  },

  crear: async (data: any) => {
    return fetchWithCredentials(`${API_URL}/usuarios/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  actualizar: async (id: number, data: any) => {
    return fetchWithCredentials(`${API_URL}/usuarios/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  actualizarParcial: async (id: number, data: any) => {
    return fetchWithCredentials(`${API_URL}/usuarios/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  eliminar: async (id: number) => {
    return fetchWithCredentials(`${API_URL}/usuarios/${id}/`, {
      method: 'DELETE',
    })
  },

  estadisticas: async () => {
    return fetchWithCredentials(`${API_URL}/usuarios/estadisticas/`)
  },
}

// API para logs de auditoría (admin)
export const auditLogsAPI = {
  listar: async (params?: { 
    usuario?: number; 
    accion?: string; 
    modelo?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }) => {
    const query = new URLSearchParams()
    if (params?.usuario) query.append('usuario', params.usuario.toString())
    if (params?.accion) query.append('accion', params.accion)
    if (params?.modelo) query.append('modelo', params.modelo)
    if (params?.fecha_desde) query.append('fecha_desde', params.fecha_desde)
    if (params?.fecha_hasta) query.append('fecha_hasta', params.fecha_hasta)
    
    return fetchWithCredentials(`${API_URL}/audit-logs/?${query.toString()}`)
  },

  resumen: async () => {
    return fetchWithCredentials(`${API_URL}/audit-logs/resumen/`)
  },
}

// Configuración del Hospital
export const configuracionAPI = {
  actual: async () => {
    return fetchWithCredentials(`${API_URL}/configuracion/actual/`)
  },

  actualizar: async (data: {
    camas_totales: number
    camas_uci: number
    salas_emergencia: number
    boxes_atencion: number
  }) => {
    return fetchWithCredentials(`${API_URL}/configuracion/actualizar/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// Camas
export const camasAPI = {
  listar: async (filtros?: { tipo?: string; estado?: string; piso?: number }) => {
    const params = new URLSearchParams()
    if (filtros?.tipo) params.append('tipo', filtros.tipo)
    if (filtros?.estado) params.append('estado', filtros.estado)
    if (filtros?.piso) params.append('piso', filtros.piso.toString())
    
    return fetchWithCredentials(`${API_URL}/camas/?${params}`)
  },

  crear: async (data: any) => {
    return fetchWithCredentials(`${API_URL}/camas/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  actualizar: async (id: number, data: any) => {
    return fetchWithCredentials(`${API_URL}/camas/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  eliminar: async (id: number) => {
    return fetchWithCredentials(`${API_URL}/camas/${id}/`, {
      method: 'DELETE',
    })
  },

  disponibles: async (tipo?: string) => {
    const params = new URLSearchParams()
    if (tipo) params.append('tipo', tipo)
    return fetchWithCredentials(`${API_URL}/camas/disponibles/?${params}`)
  },

  estadisticas: async () => {
    return fetchWithCredentials(`${API_URL}/camas/estadisticas/`)
  },

  tipos: async () => {
    return fetchWithCredentials(`${API_URL}/camas/tipos/`)
  },

  asignar: async (id: number, fichaId: number) => {
    return fetchWithCredentials(`${API_URL}/camas/${id}/asignar/`, {
      method: 'POST',
      body: JSON.stringify({ ficha_id: fichaId }),
    })
  },

  liberar: async (id: number) => {
    return fetchWithCredentials(`${API_URL}/camas/${id}/liberar/`, {
      method: 'POST',
    })
  },

  marcarLista: async (id: number) => {
    return fetchWithCredentials(`${API_URL}/camas/${id}/marcar_lista/`, {
      method: 'POST',
    })
  },

  cambiarEstado: async (id: number, estado: string) => {
    return fetchWithCredentials(`${API_URL}/camas/${id}/cambiar_estado/`, {
      method: 'POST',
      body: JSON.stringify({ estado }),
    })
  },

  crearMultiple: async (tipo: string, cantidad: number) => {
    return fetchWithCredentials(`${API_URL}/camas/crear_multiple/`, {
      method: 'POST',
      body: JSON.stringify({ tipo, cantidad }),
    })
  },

  eliminarMultiple: async (ids: number[]) => {
    return fetchWithCredentials(`${API_URL}/camas/eliminar_multiple/`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  tiposDisponibles: async () => {
    return fetchWithCredentials(`${API_URL}/camas/tipos_disponibles/`)
  },

  eliminarTipo: async (tipo: string) => {
    return fetchWithCredentials(`${API_URL}/camas/eliminar_tipo/`, {
      method: 'POST',
      body: JSON.stringify({ tipo }),
    })
  },
}

// Médicos
export const medicosAPI = {
  listar: async (soloEnTurno: boolean = false) => {
    const params = soloEnTurno ? '?en_turno=true' : ''
    return fetchWithCredentials(`${API_URL}/usuarios/medicos/${params}`)
  },
  
  asignarAFicha: async (fichaId: number, medicoId: number) => {
    return fetchWithCredentials(`${API_URL}/fichas/${fichaId}/asignar_medico/`, {
      method: 'POST',
      body: JSON.stringify({ medico_id: medicoId }),
    })
  },
}

// Chat y Mensajes
export const chatAPI = {
  obtenerMensajes: async (fichaId: number) => {
    return fetchWithCredentials(`${API_URL}/mensajes/por_ficha/?ficha_id=${fichaId}`)
  },

  enviarMensaje: async (fichaId: number, contenido: string, archivo?: File) => {
    await ensureCSRFToken()
    const csrfToken = getCookie('csrftoken')
    
    const formData = new FormData()
    formData.append('ficha', fichaId.toString())
    formData.append('contenido', contenido)
    if (archivo) {
      formData.append('archivo', archivo)
    }
    
    const response = await fetch(`${API_URL}/mensajes/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
      body: formData,
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error enviando mensaje' }))
      throw new Error(error.detail || 'Error enviando mensaje')
    }
    
    return response.json()
  },

  poll: async (fichaId: number, lastMessageId: number) => {
    try {
      return await fetchWithCredentials(
        `${API_URL}/poll/?ficha_id=${fichaId}&last_message_id=${lastMessageId}`
      )
    } catch (error) {
      // Silenciar errores de polling para no saturar la consola
      return { mensajes: [], notificaciones: [], notificaciones_no_leidas: 0 }
    }
  },
}

// Notificaciones API
export const notificacionesAPI = {
  obtener: async () => {
    try {
      return await fetchWithCredentials(`${API_URL}/notificaciones/recientes/`)
    } catch (error) {
      console.warn('Error al obtener notificaciones:', error)
      return []
    }
  },

  noLeidas: async () => {
    try {
      return await fetchWithCredentials(`${API_URL}/notificaciones/no_leidas/`)
    } catch (error) {
      console.warn('Error al obtener notificaciones no leídas:', error)
      return []
    }
  },

  conteo: async () => {
    try {
      return await fetchWithCredentials(`${API_URL}/notificaciones/conteo/`)
    } catch (error) {
      console.warn('Error al obtener conteo de notificaciones:', error)
      return { no_leidas: 0 }
    }
  },

  marcarLeida: async (id: number) => {
    await ensureCSRFToken()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`${API_URL}/notificaciones/${id}/marcar_leida/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
    })
    
    if (!response.ok) {
      throw new Error('Error al marcar notificación como leída')
    }
    
    return response.json()
  },

  marcarTodasLeidas: async () => {
    await ensureCSRFToken()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`${API_URL}/notificaciones/marcar_todas_leidas/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
    })
    
    if (!response.ok) {
      throw new Error('Error al marcar notificaciones como leídas')
    }
    
    return response.json()
  },
}

// Turnos API
export const turnosAPI = {
  // Obtener mi turno actual
  miTurno: async () => {
    try {
      return await fetchWithCredentials(`${API_URL}/turnos/mi_turno/`)
    } catch (error) {
      console.warn('Error al verificar turno:', error)
      return {
        tiene_turno_programado: false,
        turno_actual: null,
        en_horario: false,
        en_turno: false,
        puede_iniciar_voluntario: true,
        mensaje: 'Error al verificar turno'
      }
    }
  },

  // Iniciar turno programado
  iniciarTurno: async () => {
    await ensureCSRFToken()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`${API_URL}/turnos/iniciar_turno/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
    })
    
    return response.json()
  },

  // Iniciar turno voluntario
  iniciarVoluntario: async () => {
    await ensureCSRFToken()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`${API_URL}/turnos/iniciar_voluntario/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
    })
    
    return response.json()
  },

  // Finalizar turno
  finalizarTurno: async () => {
    await ensureCSRFToken()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`${API_URL}/turnos/finalizar_turno/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
    })
    
    return response.json()
  },

  // Calendario mensual
  calendarioMensual: async (mes: number, anio: number, rol?: string) => {
    let url = `${API_URL}/turnos/calendario_mensual/?mes=${mes}&anio=${anio}`
    if (rol) {
      url += `&rol=${rol}`
    }
    return await fetchWithCredentials(url)
  },

  // Personal en turno
  personalEnTurno: async () => {
    return await fetchWithCredentials(`${API_URL}/turnos/personal_en_turno/`)
  },

  // Staff disponible para asignar
  staffDisponible: async () => {
    return await fetchWithCredentials(`${API_URL}/turnos/staff_disponible/`)
  },

  // Obtener turnos con filtros
  listar: async (params?: {
    usuario?: number
    fecha?: string
    fecha_desde?: string
    fecha_hasta?: string
    rol?: string
    tipo_turno?: string
    en_turno?: boolean
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
    }
    const url = `${API_URL}/turnos/${searchParams.toString() ? '?' + searchParams.toString() : ''}`
    return await fetchWithCredentials(url)
  },

  // Asignar turnos masivamente
  asignarMasivo: async (usuarioId: number, turnos: { fecha: string; tipo_turno: string }[]) => {
    await ensureCSRFToken()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`${API_URL}/turnos/asignar_masivo/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
      body: JSON.stringify({
        usuario_id: usuarioId,
        turnos
      }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error asignando turnos' }))
      throw new Error(error.detail || error.error || 'Error asignando turnos')
    }
    
    return response.json()
  },

  // Crear/actualizar un turno
  crear: async (data: { usuario: number; fecha: string; tipo_turno: string; notas?: string }) => {
    await ensureCSRFToken()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`${API_URL}/turnos/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error creando turno' }))
      throw new Error(error.detail || 'Error creando turno')
    }
    
    return response.json()
  },

  // Eliminar turno
  eliminar: async (id: number) => {
    await ensureCSRFToken()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`${API_URL}/turnos/${id}/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
    })
    
    if (!response.ok) {
      throw new Error('Error eliminando turno')
    }
    
    return true
  },

  // Configuración de horarios
  obtenerHorarios: async () => {
    return await fetchWithCredentials(`${API_URL}/configuracion-turnos/horarios/`)
  },

  actualizarHorarios: async (horarios: Record<string, { inicio: string; fin: string }>) => {
    await ensureCSRFToken()
    const csrfToken = getCookie('csrftoken')
    
    const response = await fetch(`${API_URL}/configuracion-turnos/actualizar_horarios/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
      body: JSON.stringify({ horarios }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error actualizando horarios' }))
      throw new Error(error.detail || error.error || 'Error actualizando horarios')
    }
    
    return response.json()
  },
}

