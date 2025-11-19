export type UserRole = "paramedico" | "tens" | "medico" | "administrador"

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  nombre_completo: string
  rut: string
  rol: UserRole
  telefono?: string
}

// Usuarios de prueba para demostración
export const DEMO_USERS: Record<string, { password: string; user: User }> = {
  "paramedico@salud.cl": {
    password: "para123",
    user: {
      id: "1",
      nombre: "Carlos Muñoz",
      email: "paramedico@salud.cl",
      rol: "paramedico",
      rut: "12.345.678-9",
    },
  },
  "tens@salud.cl": {
    password: "tens123",
    user: {
      id: "2",
      nombre: "María González",
      email: "tens@salud.cl",
      rol: "tens",
      rut: "23.456.789-0",
    },
  },
  "medico@salud.cl": {
    password: "medico123",
    user: {
      id: "3",
      nombre: "Dr. Juan Pérez",
      email: "medico@salud.cl",
      rol: "medico",
      rut: "34.567.890-1",
    },
  },
  "admin@salud.cl": {
    password: "admin123",
    user: {
      id: "4",
      nombre: "Ana Silva",
      email: "admin@salud.cl",
      rol: "administrador",
      rut: "45.678.901-2",
    },
  },
}

export function validateCredentials(email: string, password: string): User | null {
  const userRecord = DEMO_USERS[email]
  if (userRecord && userRecord.password === password) {
    return userRecord.user
  }
  return null
}

export function getRoleName(rol: UserRole): string {
  const nombres = {
    paramedico: "Paramédico",
    tens: "TENS",
    medico: "Médico",
    administrador: "Administrador",
  }
  return nombres[rol]
}

export function getRoleDashboardPath(rol: UserRole): string {
  return `/dashboard/${rol}`
}

const SESSION_KEY = "medical_system_user"

export function getSession(): User | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const sessionData = localStorage.getItem(SESSION_KEY)
    if (!sessionData) {
      return null
    }
    return JSON.parse(sessionData) as User
  } catch (error) {
    console.error("Error al obtener la sesión:", error)
    return null
  }
}

export function setSession(user: User): void {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  } catch (error) {
    console.error("Error al guardar la sesión:", error)
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.removeItem(SESSION_KEY)
  } catch (error) {
    console.error("Error al limpiar la sesión:", error)
  }
}
