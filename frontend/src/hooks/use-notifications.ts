import { useState, useEffect, useCallback, useRef } from "react"
import { notificacionesAPI } from "@/lib/api"

export interface Notificacion {
  id: number
  titulo: string
  mensaje: string
  tipo: string
  prioridad: "baja" | "media" | "alta" | "urgente"
  leida: boolean
  ficha?: number
  fecha_creacion: string
  tiempo_transcurrido?: string
}

// Solicitar permiso para notificaciones nativas del navegador
const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("Este navegador no soporta notificaciones")
    return false
  }
  
  if (Notification.permission === "granted") {
    return true
  }
  
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  }
  
  return false
}

// Mostrar notificación nativa del navegador
const showBrowserNotification = (titulo: string, mensaje: string, prioridad: string) => {
  if (Notification.permission === "granted") {
    const icon = prioridad === "urgente" || prioridad === "alta" 
      ? "🚨" 
      : "🔔"
    
    const notification = new Notification(`${icon} ${titulo}`, {
      body: mensaje,
      icon: "/favicon.ico",
      tag: `notif-${Date.now()}`,
      requireInteraction: prioridad === "urgente", // No se cierra automáticamente si es urgente
      silent: false,
    })
    
    // Cerrar automáticamente después de 10 segundos si no es urgente
    if (prioridad !== "urgente") {
      setTimeout(() => notification.close(), 10000)
    }
    
    // Focus a la ventana cuando se hace click
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  }
}

// Sonido de notificación urgente (beep simple)
const playUrgentSound = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    
    const audioContext = new AudioContextClass()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 880 // La nota A5
    oscillator.type = "sine"
    gainNode.gain.value = 0.3
    
    oscillator.start()
    setTimeout(() => {
      oscillator.stop()
      audioContext.close()
    }, 200)
  } catch {
    // Silenciosamente ignorar si no se puede reproducir
  }
}

// Vibración en móvil
const vibrate = () => {
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100])
  }
}

export function useNotifications(enabled: boolean = true, pollingInterval: number = 15000) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const prevCountRef = useRef<number>(0)
  const prevIdsRef = useRef<Set<number>>(new Set())
  const [newUrgent, setNewUrgent] = useState(false)

  // Solicitar permiso al montar
  useEffect(() => {
    requestNotificationPermission().then(setPermissionGranted)
  }, [])

  const cargar = useCallback(async () => {
    if (!enabled) return
    
    try {
      setLoading(true)
      const data = await notificacionesAPI.noLeidas()
      const newNotifs: Notificacion[] = Array.isArray(data) ? data : []
      
      // Detectar notificaciones completamente nuevas (que no existían antes)
      const newIds = new Set(newNotifs.map(n => n.id))
      const trulyNewNotifs = newNotifs.filter(n => !prevIdsRef.current.has(n.id))
      
      if (trulyNewNotifs.length > 0 && prevIdsRef.current.size > 0) {
        // Hay notificaciones nuevas
        for (const notif of trulyNewNotifs) {
          // Mostrar notificación nativa del navegador
          if (permissionGranted) {
            showBrowserNotification(notif.titulo, notif.mensaje, notif.prioridad)
          }
          
          // Si es urgente o alta, sonido y vibración
          if (notif.prioridad === "urgente" || notif.prioridad === "alta") {
            playUrgentSound()
            vibrate()
            setNewUrgent(true)
            setTimeout(() => setNewUrgent(false), 2000)
          }
        }
      }
      
      prevCountRef.current = newNotifs.length
      prevIdsRef.current = newIds
      setNotificaciones(newNotifs)
      setError(null)
    } catch (err) {
      console.error("Error al cargar notificaciones:", err)
      setError("Error al cargar notificaciones")
    } finally {
      setLoading(false)
    }
  }, [enabled, permissionGranted])

  const marcarLeida = useCallback(async (id: number) => {
    try {
      await notificacionesAPI.marcarLeida(id)
      setNotificaciones(prev => prev.filter(n => n.id !== id))
      prevCountRef.current = Math.max(0, prevCountRef.current - 1)
    } catch (err) {
      console.error("Error al marcar notificación:", err)
    }
  }, [])

  const marcarTodasLeidas = useCallback(async () => {
    try {
      await notificacionesAPI.marcarTodasLeidas()
      setNotificaciones([])
      prevCountRef.current = 0
    } catch (err) {
      console.error("Error al marcar todas:", err)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    cargar()
    
    pollingRef.current = setInterval(cargar, pollingInterval)
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [enabled, pollingInterval, cargar])

  // Agrupar por ficha
  const agrupadasPorFicha = useCallback(() => {
    const grupos: Record<string, Notificacion[]> = {}
    notificaciones.forEach(n => {
      const key = n.ficha ? `ficha-${n.ficha}` : 'general'
      if (!grupos[key]) grupos[key] = []
      grupos[key].push(n)
    })
    return grupos
  }, [notificaciones])

  // Filtrar por prioridad
  const filtrarPorPrioridad = useCallback((prioridad: Notificacion["prioridad"]) => {
    return notificaciones.filter(n => n.prioridad === prioridad)
  }, [notificaciones])

  // Contar por prioridad
  const contarPorPrioridad = useCallback(() => {
    return {
      urgente: notificaciones.filter(n => n.prioridad === "urgente").length,
      alta: notificaciones.filter(n => n.prioridad === "alta").length,
      media: notificaciones.filter(n => n.prioridad === "media").length,
      baja: notificaciones.filter(n => n.prioridad === "baja").length,
    }
  }, [notificaciones])

  return {
    notificaciones,
    loading,
    error,
    count: notificaciones.length,
    newUrgent,
    cargar,
    marcarLeida,
    marcarTodasLeidas,
    agrupadasPorFicha,
    filtrarPorPrioridad,
    contarPorPrioridad,
  }
}
