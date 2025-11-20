// Servicio para consumir la API de Django
const API_URL = 'http://localhost:8000/api'

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
      console.log('ℹ️ Paciente no encontrado (se creará uno nuevo)')
    } else {
      console.error('❌ Error del servidor:', error)
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

  buscar: async (rut?: string, idTemporal?: string) => {
    const params = new URLSearchParams()
    if (rut) params.append('rut', rut)
    if (idTemporal) params.append('id_temporal', idTemporal)
    return fetchWithCredentials(`${API_URL}/pacientes/buscar/?${params}`)
  },
}

// Fichas de Emergencia
export const fichasAPI = {
  listar: async (filtros?: { estado?: string; prioridad?: string; paramedico?: number }) => {
    const params = new URLSearchParams()
    if (filtros?.estado) params.append('estado', filtros.estado)
    if (filtros?.prioridad) params.append('prioridad', filtros.prioridad)
    if (filtros?.paramedico) params.append('paramedico', filtros.paramedico.toString())
    
    return fetchWithCredentials(`${API_URL}/fichas/?${params}`)
  },

  obtener: async (id: number) => {
    return fetchWithCredentials(`${API_URL}/fichas/${id}/`)
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
}
