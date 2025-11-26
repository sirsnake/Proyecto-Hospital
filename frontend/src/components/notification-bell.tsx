

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Bell,
  FileText,
  MessageCircle,
  Pill,
  AlertTriangle,
  Heart,
  Trash2,
  Check,
  CheckCheck,
  Loader2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Notificacion {
  id: number
  tipo: string
  titulo: string
  mensaje: string
  prioridad: string
  leida: boolean
  ficha: number | null
  tiempo_transcurrido: string
  fecha_creacion: string
}

interface NotificationBellProps {
  className?: string
  pollingInterval?: number // en milisegundos
}

const API_BASE_URL = "http://localhost:8000/api"

export function NotificationBell({
  className,
  pollingInterval = 5000,
}: NotificationBellProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [conteoNoLeidas, setConteoNoLeidas] = useState(0)
  const [cargando, setCargando] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const lastNotificationIdRef = useRef<number>(0)

  // Obtener CSRF token
  const getCsrfToken = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/csrf/`, {
        credentials: "include",
      })
      const data = await response.json()
      return data.csrfToken
    } catch {
      return null
    }
  }, [])

  // Cargar notificaciones
  const cargarNotificaciones = useCallback(async () => {
    setCargando(true)
    try {
      const response = await fetch(`${API_BASE_URL}/notificaciones/recientes/`, {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setNotificaciones(data)
        if (data.length > 0) {
          lastNotificationIdRef.current = Math.max(...data.map((n: Notificacion) => n.id))
        }
        setError(null)
      }
    } catch {
      setError("Error al cargar notificaciones")
    } finally {
      setCargando(false)
    }
  }, [])

  // Obtener conteo de no leídas
  const obtenerConteo = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notificaciones/conteo/`, {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setConteoNoLeidas(data.no_leidas)
      }
    } catch {
      // Silenciar error
    }
  }, [])

  // Polling para nuevas notificaciones
  const pollNotificaciones = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/poll/?last_notification_id=${lastNotificationIdRef.current}`,
        { credentials: "include" }
      )
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.notificaciones && data.notificaciones.length > 0) {
          setNotificaciones(prev => {
            const nuevas = data.notificaciones.filter(
              (n: Notificacion) => !prev.some(existing => existing.id === n.id)
            )
            if (nuevas.length > 0) {
              const maxId = Math.max(...data.notificaciones.map((n: Notificacion) => n.id))
              lastNotificationIdRef.current = maxId
              
              // Incrementar conteo
              const nuevasNoLeidas = nuevas.filter((n: Notificacion) => !n.leida)
              setConteoNoLeidas(prev => prev + nuevasNoLeidas.length)
              
              return [...nuevas, ...prev].slice(0, 50) // Mantener máximo 50
            }
            return prev
          })
        }
      }
    } catch {
      // Silenciar error de polling
    }
  }, [])

  // Marcar notificación como leída
  const marcarLeida = async (id: number) => {
    try {
      const csrfToken = await getCsrfToken()
      const response = await fetch(`${API_BASE_URL}/notificaciones/${id}/marcar_leida/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken || "",
        },
      })

      if (response.ok) {
        setNotificaciones(prev =>
          prev.map(n => n.id === id ? { ...n, leida: true } : n)
        )
        setConteoNoLeidas(prev => Math.max(0, prev - 1))
      }
    } catch {
      // Silenciar error
    }
  }

  // Marcar todas como leídas
  const marcarTodasLeidas = async () => {
    try {
      const csrfToken = await getCsrfToken()
      const response = await fetch(`${API_BASE_URL}/notificaciones/marcar_todas_leidas/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken || "",
        },
      })

      if (response.ok) {
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
        setConteoNoLeidas(0)
      }
    } catch {
      // Silenciar error
    }
  }

  // Eliminar notificaciones leídas
  const eliminarLeidas = async () => {
    try {
      const csrfToken = await getCsrfToken()
      const response = await fetch(`${API_BASE_URL}/notificaciones/eliminar_leidas/`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken || "",
        },
      })

      if (response.ok) {
        setNotificaciones(prev => prev.filter(n => !n.leida))
      }
    } catch {
      // Silenciar error
    }
  }

  // Obtener icono según tipo
  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case "nueva_ficha":
        return <FileText className="h-4 w-4" />
      case "mensaje_chat":
        return <MessageCircle className="h-4 w-4" />
      case "solicitud_medicamento":
        return <Pill className="h-4 w-4" />
      case "alerta_signos":
        return <AlertTriangle className="h-4 w-4" />
      case "cambio_estado":
        return <Heart className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  // Obtener color según prioridad
  const getColorPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case "urgente":
        return "bg-red-500"
      case "alta":
        return "bg-orange-500"
      case "normal":
        return "bg-blue-500"
      case "baja":
        return "bg-gray-500"
      default:
        return "bg-blue-500"
    }
  }

  // Cargar inicial
  useEffect(() => {
    cargarNotificaciones()
    obtenerConteo()
  }, [cargarNotificaciones, obtenerConteo])

  // Polling
  useEffect(() => {
    pollingRef.current = setInterval(pollNotificaciones, pollingInterval)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [pollNotificaciones, pollingInterval])

  // Recargar al abrir
  useEffect(() => {
    if (open) {
      cargarNotificaciones()
    }
  }, [open, cargarNotificaciones])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)}>
          <Bell className="h-5 w-5" />
          {conteoNoLeidas > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {conteoNoLeidas > 99 ? "99+" : conteoNoLeidas}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notificaciones</h4>
          <div className="flex items-center gap-1">
            {conteoNoLeidas > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={marcarTodasLeidas}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Marcar leídas
              </Button>
            )}
          </div>
        </div>

        {/* Lista de notificaciones */}
        <ScrollArea className="h-[300px]">
          {cargando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-sm text-red-500">
              {error}
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tienes notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notificaciones.map((notificacion) => (
                <div
                  key={notificacion.id}
                  className={cn(
                    "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                    !notificacion.leida && "bg-muted/30"
                  )}
                  onClick={() => {
                    if (!notificacion.leida) {
                      marcarLeida(notificacion.id)
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className={cn(
                      "flex items-center justify-center h-8 w-8 rounded-full text-white flex-shrink-0",
                      getColorPrioridad(notificacion.prioridad)
                    )}>
                      {getIconoTipo(notificacion.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm truncate",
                          !notificacion.leida && "font-medium"
                        )}>
                          {notificacion.titulo}
                        </p>
                        {!notificacion.leida && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notificacion.mensaje}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {notificacion.tiempo_transcurrido}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notificaciones.some(n => n.leida) && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive"
                onClick={eliminarLeidas}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Eliminar notificaciones leídas
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
