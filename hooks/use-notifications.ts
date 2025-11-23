"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { notificacionesAPI } from '@/lib/api'

export interface Notificacion {
  id: number
  tipo: string
  tipo_display: string
  titulo: string
  mensaje: string
  ficha: number | null
  paciente_nombre: string | null
  leida: boolean
  fecha_creacion: string
  fecha_lectura: string | null
  datos_extra: any
}

interface UseNotificationsReturn {
  notificaciones: Notificacion[]
  noLeidas: number
  conectado: boolean
  marcarLeida: (id: number) => Promise<void>
  marcarTodasLeidas: () => Promise<void>
  cargarNotificaciones: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [conectado, setConectado] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cargar notificaciones iniciales
  const cargarNotificaciones = useCallback(async () => {
    try {
      const data = await notificacionesAPI.listar()
      setNotificaciones(data)
      setNoLeidas(data.filter((n: Notificacion) => !n.leida).length)
    } catch (error) {
      console.error('Error cargando notificaciones:', error)
    }
  }, [])

  // Conectar WebSocket
  const conectarWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const ws = new WebSocket('ws://localhost:8000/ws/notificaciones/')

    ws.onopen = () => {
      console.log('✅ WebSocket conectado')
      setConectado(true)
      // Limpiar timeout de reconexión si existe
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'connection_established') {
          console.log('📡 Conexión establecida:', data.message)
        } else if (data.type === 'nueva_notificacion') {
          console.log('🔔 Nueva notificación:', data.notificacion)
          const nuevaNotif: Notificacion = data.notificacion
          
          // Agregar al inicio de la lista
          setNotificaciones(prev => [nuevaNotif, ...prev])
          setNoLeidas(prev => prev + 1)
          
          // Mostrar notificación del navegador si tiene permiso
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(nuevaNotif.titulo, {
              body: nuevaNotif.mensaje,
              icon: '/favicon.ico',
              tag: `notif-${nuevaNotif.id}`,
            })
          }
          
          // Reproducir sonido
          const audio = new Audio('/notification.mp3')
          audio.play().catch(() => console.log('No se pudo reproducir el sonido'))
        } else if (data.type === 'notificacion_marcada') {
          console.log('✓ Notificación marcada como leída:', data.notificacion_id)
        }
      } catch (error) {
        console.error('Error procesando mensaje WebSocket:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('❌ Error en WebSocket:', error)
    }

    ws.onclose = () => {
      console.log('🔌 WebSocket desconectado')
      setConectado(false)
      
      // Intentar reconectar después de 3 segundos
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Intentando reconectar...')
        conectarWebSocket()
      }, 3000)
    }

    wsRef.current = ws
  }, [])

  // Marcar como leída
  const marcarLeida = useCallback(async (id: number) => {
    try {
      await notificacionesAPI.marcarLeida(id)
      
      setNotificaciones(prev =>
        prev.map(n => n.id === id ? { ...n, leida: true } : n)
      )
      setNoLeidas(prev => Math.max(0, prev - 1))
      
      // Enviar por WebSocket también
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'marcar_leida',
          notificacion_id: id
        }))
      }
    } catch (error) {
      console.error('Error marcando notificación como leída:', error)
    }
  }, [])

  // Marcar todas como leídas
  const marcarTodasLeidas = useCallback(async () => {
    try {
      await notificacionesAPI.marcarTodasLeidas()
      
      setNotificaciones(prev =>
        prev.map(n => ({ ...n, leida: true }))
      )
      setNoLeidas(0)
    } catch (error) {
      console.error('Error marcando todas como leídas:', error)
    }
  }, [])

  // Efecto inicial
  useEffect(() => {
    cargarNotificaciones()
    conectarWebSocket()

    // Solicitar permiso para notificaciones del navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Ping cada 30 segundos para mantener conexión
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)

    // Cleanup
    return () => {
      clearInterval(pingInterval)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [cargarNotificaciones, conectarWebSocket])

  return {
    notificaciones,
    noLeidas,
    conectado,
    marcarLeida,
    marcarTodasLeidas,
    cargarNotificaciones,
  }
}
