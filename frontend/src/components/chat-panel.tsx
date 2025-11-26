

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  MessageCircle,
  Send,
  Paperclip,
  X,
  Image as ImageIcon,
  FileText,
  File,
  Download,
  Loader2,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Función para obtener la URL del API dinámicamente
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000/api'
  }
  
  const hostname = window.location.hostname
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8000/api'
  }
  
  if (hostname.includes('devtunnels.ms')) {
    const backendHost = hostname.replace('-3000.', '-8000.')
    return `https://${backendHost}/api`
  }
  
  return `http://${hostname.split(':')[0]}:8000/api`
}

interface Usuario {
  id: number
  username: string
  first_name: string
  last_name: string
  rol: string
}

interface ArchivoAdjunto {
  id: number
  nombre_original: string
  archivo: string
  tipo: string
  tamano: number
  fecha_subida: string
}

interface Mensaje {
  id: number
  ficha: number
  autor: Usuario
  contenido: string
  archivo_adjunto: ArchivoAdjunto | null
  fecha_envio: string
  leido_por: number[]
}

interface ChatPanelProps {
  fichaId: number
  usuarioActual: Usuario
  className?: string
  minimizado?: boolean
  onToggleMinimizar?: () => void
  fullScreen?: boolean
  onClose?: () => void
  pacienteNombre?: string
}

const API_BASE_URL = getApiBaseUrl()

export function ChatPanel({
  fichaId,
  usuarioActual,
  className,
  minimizado = false,
  onToggleMinimizar,
  fullScreen = false,
  onClose,
  pacienteNombre,
}: ChatPanelProps) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [nuevoMensaje, setNuevoMensaje] = useState("")
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const [cargando, setCargando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0)
  const [polling, setPolling] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageIdRef = useRef<number>(0)

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

  // Cargar mensajes iniciales
  const cargarMensajes = useCallback(async () => {
    if (!fichaId) return
    
    setCargando(true)
    try {
      const response = await fetch(
        `${API_BASE_URL}/mensajes/por_ficha/?ficha_id=${fichaId}`,
        { credentials: "include" }
      )
      if (response.ok) {
        const data = await response.json()
        setMensajes(data)
        if (data.length > 0) {
          lastMessageIdRef.current = Math.max(...data.map((m: Mensaje) => m.id))
        }
        setError(null)
      }
    } catch {
      setError("Error al cargar mensajes")
    } finally {
      setCargando(false)
    }
  }, [fichaId])

  // Polling para nuevos mensajes
  const pollMensajes = useCallback(async () => {
    if (!fichaId || !polling) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/poll/?ficha_id=${fichaId}&last_message_id=${lastMessageIdRef.current}`,
        { credentials: "include" }
      )
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.mensajes && data.mensajes.length > 0) {
          setMensajes(prev => {
            const nuevos = data.mensajes.filter(
              (m: Mensaje) => !prev.some(existing => existing.id === m.id)
            )
            if (nuevos.length > 0) {
              // Actualizar el último ID
              const maxId = Math.max(...data.mensajes.map((m: Mensaje) => m.id))
              lastMessageIdRef.current = maxId
              
              // Contar mensajes no leídos si está minimizado
              if (minimizado) {
                const noLeidos = nuevos.filter((m: Mensaje) => m.autor.id !== usuarioActual.id)
                setMensajesNoLeidos(prev => prev + noLeidos.length)
              }
              
              return [...prev, ...nuevos]
            }
            return prev
          })
        }
      }
    } catch {
      // Silenciar errores de polling
    }
  }, [fichaId, polling, minimizado, usuarioActual.id])

  // Scroll al último mensaje
  const scrollAlFinal = useCallback(() => {
    // Intentar scroll con el ref del final de mensajes
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    // Fallback al scrollRef
    setTimeout(() => {
      if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight
        } else {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }
    }, 100)
  }, [])

  // Efecto para cargar mensajes iniciales
  useEffect(() => {
    cargarMensajes()
  }, [cargarMensajes])

  // Efecto para polling
  useEffect(() => {
    if (polling && fichaId) {
      pollingRef.current = setInterval(pollMensajes, 2000) // Cada 2 segundos
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [polling, fichaId, pollMensajes])

  // Scroll cuando llegan nuevos mensajes
  useEffect(() => {
    scrollAlFinal()
  }, [mensajes, scrollAlFinal])

  // Limpiar contador de no leídos al expandir
  useEffect(() => {
    if (!minimizado) {
      setMensajesNoLeidos(0)
    }
  }, [minimizado])

  // Subir archivo
  const subirArchivo = async (file: File): Promise<number | null> => {
    const csrfToken = await getCsrfToken()
    const formData = new FormData()
    formData.append("archivo", file)
    formData.append("ficha_id", fichaId.toString())

    try {
      const response = await fetch(`${API_BASE_URL}/archivos/upload/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken || "",
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        return data.id
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Error subiendo archivo:", response.status, errorData)
        setError(`Error al subir archivo: ${JSON.stringify(errorData)}`)
      }
      return null
    } catch (err) {
      console.error("Error en fetch de archivo:", err)
      return null
    }
  }

  // Enviar mensaje
  const enviarMensaje = async () => {
    if ((!nuevoMensaje.trim() && !archivoSeleccionado) || enviando) return

    setEnviando(true)
    setError(null)
    
    try {
      const csrfToken = await getCsrfToken()
      let archivoId: number | null = null

      // Subir archivo si hay uno seleccionado
      if (archivoSeleccionado) {
        archivoId = await subirArchivo(archivoSeleccionado)
        if (!archivoId) {
          setError("Error al subir el archivo")
          setEnviando(false)
          return
        }
      }

      // Enviar mensaje via API REST
      // Si hay archivo pero no texto, usar un mensaje indicativo
      const contenidoMensaje = nuevoMensaje.trim() || (archivoId ? "(Archivo adjunto)" : "")
      
      const mensajeData: { ficha_id: number; contenido: string; archivo_adjunto_id?: number } = {
        ficha_id: fichaId,
        contenido: contenidoMensaje,
      }
      
      // Solo incluir archivo_adjunto_id si existe
      if (archivoId) {
        mensajeData.archivo_adjunto_id = archivoId
      }
      
      const response = await fetch(`${API_BASE_URL}/mensajes/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken || "",
        },
        body: JSON.stringify(mensajeData),
      })

      if (response.ok) {
        const mensaje = await response.json()
        
        // Añadir mensaje a la lista local inmediatamente
        setMensajes(prev => {
          if (!prev.some(m => m.id === mensaje.id)) {
            lastMessageIdRef.current = mensaje.id
            return [...prev, mensaje]
          }
          return prev
        })
        
        setNuevoMensaje("")
        setArchivoSeleccionado(null)
        setError(null)
        
        // Scroll al final después de enviar (con delay para esperar el render)
        setTimeout(() => {
          scrollAlFinal()
        }, 150)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Error enviando mensaje:", response.status, errorData)
        setError(`Error al enviar mensaje: ${JSON.stringify(errorData)}`)
      }
    } catch (err) {
      console.error("Error en fetch de mensaje:", err)
      setError("Error al enviar mensaje")
    } finally {
      setEnviando(false)
    }
  }

  // Manejar selección de archivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validar tamaño (50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError("El archivo no puede superar los 50MB")
        return
      }

      // Validar extensión
      const extensionesPermitidas = [
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp",
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".odt", ".ods"
      ]
      const extension = "." + file.name.split(".").pop()?.toLowerCase()
      if (!extensionesPermitidas.includes(extension)) {
        setError("Tipo de archivo no permitido")
        return
      }

      setArchivoSeleccionado(file)
      setError(null)
    }
    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Obtener icono según tipo de archivo
  const getIconoArchivo = (tipo: string) => {
    switch (tipo) {
      case "imagen":
        return <ImageIcon className="h-4 w-4" />
      case "pdf":
        return <FileText className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  // Obtener iniciales del usuario
  const getIniciales = (usuario: Usuario | null | undefined) => {
    if (!usuario) return "?"
    return `${usuario.first_name?.[0] || ""}${usuario.last_name?.[0] || ""}`.toUpperCase() || usuario.username?.[0]?.toUpperCase() || "?"
  }

  // Obtener color según rol
  const getColorRol = (rol: string | undefined) => {
    switch (rol) {
      case "paramedico":
        return "bg-blue-500"
      case "tens":
        return "bg-green-500"
      case "medico":
        return "bg-purple-500"
      case "administrador":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  // Formatear hora de forma segura
  const formatearHora = (fecha: string | undefined | null) => {
    if (!fecha) return ""
    try {
      const date = new Date(fecha)
      if (isNaN(date.getTime())) return ""
      return date.toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return ""
    }
  }

  // Formatear tamaño de archivo
  const formatearTamano = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  // Manejar tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      enviarMensaje()
    }
  }

  // Modo pantalla completa (para móvil)
  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-slate-950 flex flex-col" 
        style={{ 
          height: '100dvh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        {/* Header fijo */}
        <header className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white"
            onClick={onClose}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-white font-semibold">Chat - Ficha #{fichaId}</h1>
            {pacienteNombre && (
              <p className="text-xs text-slate-400">{pacienteNombre}</p>
            )}
          </div>
          <Badge variant="default" className="text-xs bg-green-600">
            <RefreshCw className="h-3 w-3 mr-1" />
            Activo
          </Badge>
        </header>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-2 p-2 bg-red-900/30 text-red-400 rounded text-sm flex-shrink-0">
            {error}
          </div>
        )}

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {cargando ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : mensajes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No hay mensajes aún. ¡Inicia la conversación!
              </div>
            ) : (
              mensajes.filter(m => m && m.autor).map((mensaje) => {
                const esMio = mensaje.autor?.id === usuarioActual.id
                return (
                  <div
                    key={mensaje.id}
                    className={cn(
                      "flex gap-2",
                      esMio ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={getColorRol(mensaje.autor?.rol)}>
                        {getIniciales(mensaje.autor)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-lg p-3",
                        esMio
                          ? "bg-blue-600 text-white"
                          : "bg-slate-800 text-slate-200"
                      )}
                    >
                      {!esMio && (
                        <p className="text-xs font-medium mb-1 text-slate-400">
                          {mensaje.autor?.first_name} {mensaje.autor?.last_name}
                          <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1">
                            {mensaje.autor?.rol}
                          </Badge>
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{mensaje.contenido}</p>
                      {mensaje.archivo_adjunto && (
                        <div className="mt-2">
                          {/* Si es imagen, mostrar preview */}
                          {mensaje.archivo_adjunto.tipo === 'imagen' ? (
                            <a
                              href={mensaje.archivo_adjunto.archivo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img 
                                src={mensaje.archivo_adjunto.archivo}
                                alt={mensaje.archivo_adjunto.nombre_original}
                                className="max-w-full max-h-48 rounded-lg object-cover"
                                loading="lazy"
                              />
                              <p className="text-xs mt-1 opacity-70 flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                {mensaje.archivo_adjunto.nombre_original}
                              </p>
                            </a>
                          ) : (
                            /* Para otros archivos (PDF, docs, etc) */
                            <a
                              href={mensaje.archivo_adjunto.archivo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-black/20 rounded hover:bg-black/30 transition-colors"
                            >
                              {getIconoArchivo(mensaje.archivo_adjunto.tipo)}
                              <span className="text-xs truncate flex-1">
                                {mensaje.archivo_adjunto.nombre_original}
                              </span>
                              <Download className="h-4 w-4 flex-shrink-0" />
                            </a>
                          )}
                        </div>
                      )}
                      <p className="text-[10px] mt-1 opacity-70 text-right">
                        {formatearHora(mensaje.fecha_envio)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            {/* Elemento invisible al final para scroll */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Área de input - fija abajo */}
        <div 
          className="flex-shrink-0 p-3 bg-slate-900 border-t border-slate-800"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
        >
          {archivoSeleccionado && (
            <div className="flex items-center gap-2 mb-2 p-2 bg-blue-900/30 border border-blue-500/30 rounded-lg">
              {archivoSeleccionado.type.startsWith('image/') ? (
                <ImageIcon className="h-4 w-4 text-blue-400" />
              ) : (
                <FileText className="h-4 w-4 text-blue-400" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-white truncate block">
                  {archivoSeleccionado.name}
                </span>
                <span className="text-xs text-slate-400">
                  {(archivoSeleccionado.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400 hover:text-red-400"
                onClick={() => setArchivoSeleccionado(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.odt,.ods"
            />
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "flex-shrink-0 border-slate-700",
                archivoSeleccionado 
                  ? "text-blue-400 border-blue-500/50 bg-blue-500/10" 
                  : "text-slate-400"
              )}
              onClick={() => fileInputRef.current?.click()}
              title={archivoSeleccionado ? "Cambiar archivo" : "Adjuntar archivo"}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <textarea
              value={nuevoMensaje}
              onChange={(e) => {
                setNuevoMensaje(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              className="flex-1 resize-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              rows={1}
            />
            <Button
              size="icon"
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700"
              onClick={enviarMensaje}
              disabled={enviando || (!nuevoMensaje.trim() && !archivoSeleccionado)}
            >
              {enviando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Modo normal (embebido)
  return (
    <Card className={cn("flex flex-col overflow-hidden", className)} style={{ minHeight: 0 }}>
      <CardHeader 
        className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer flex-shrink-0"
        onClick={onToggleMinimizar}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <CardTitle className="text-base">Chat de la Ficha</CardTitle>
          {mensajesNoLeidos > 0 && (
            <Badge variant="destructive" className="ml-2">
              {mensajesNoLeidos}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs bg-green-600">
            <RefreshCw className="h-3 w-3 mr-1" />
            Activo
          </Badge>
          {onToggleMinimizar && (
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {minimizado ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>

      {!minimizado && (
        <CardContent className="flex flex-col flex-1 p-0 overflow-hidden" style={{ minHeight: 0 }}>
          {error && (
            <div className="mx-4 mb-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-sm flex-shrink-0">
              {error}
            </div>
          )}

          {/* Área de mensajes */}
          <ScrollArea className="flex-1 px-4 overflow-auto" ref={scrollRef} style={{ minHeight: 0 }}>
            <div className="space-y-4 py-4">
              {cargando ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : mensajes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay mensajes aún. ¡Inicia la conversación!
                </div>
              ) : (
                mensajes.filter(m => m && m.autor).map((mensaje) => {
                  const esMio = mensaje.autor?.id === usuarioActual.id
                  return (
                    <div
                      key={mensaje.id}
                      className={cn(
                        "flex gap-2",
                        esMio ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={getColorRol(mensaje.autor?.rol)}>
                          {getIniciales(mensaje.autor)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg p-3",
                          esMio
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {!esMio && mensaje.autor && (
                          <div className="text-xs font-medium mb-1 opacity-70">
                            {mensaje.autor.first_name || mensaje.autor.username} {mensaje.autor.last_name || ''}
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {mensaje.autor.rol || 'usuario'}
                            </Badge>
                          </div>
                        )}
                        
                        {mensaje.contenido && (
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {mensaje.contenido}
                          </p>
                        )}

                        {mensaje.archivo_adjunto && (
                          <div className="mt-2">
                            {mensaje.archivo_adjunto.tipo === "imagen" ? (
                              <a
                                href={mensaje.archivo_adjunto.archivo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={mensaje.archivo_adjunto.archivo}
                                  alt={mensaje.archivo_adjunto.nombre_original}
                                  className="max-w-full rounded max-h-48 object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={`${API_BASE_URL}/archivos/${mensaje.archivo_adjunto.id}/download/`}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded",
                                  esMio
                                    ? "bg-primary-foreground/10"
                                    : "bg-background"
                                )}
                              >
                                {getIconoArchivo(mensaje.archivo_adjunto.tipo)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {mensaje.archivo_adjunto.nombre_original}
                                  </p>
                                  <p className="text-[10px] opacity-70">
                                    {formatearTamano(mensaje.archivo_adjunto.tamano)}
                                  </p>
                                </div>
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        )}

                        <div className={cn(
                          "flex items-center gap-1 mt-1",
                          esMio ? "justify-end" : "justify-start"
                        )}>
                          <span className="text-[10px] opacity-70">
                            {formatearHora(mensaje.fecha_envio)}
                          </span>
                          {esMio && (
                            mensaje.leido_por.length > 1 ? (
                              <CheckCheck className="h-3 w-3 text-blue-400" />
                            ) : (
                              <Check className="h-3 w-3 opacity-70" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>

          <Separator className="flex-shrink-0" />

          {/* Archivo seleccionado */}
          {archivoSeleccionado && (
            <div className="px-4 py-2 flex items-center gap-2 bg-muted/50 flex-shrink-0">
              <Paperclip className="h-4 w-4" />
              <span className="text-sm flex-1 truncate">
                {archivoSeleccionado.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatearTamano(archivoSeleccionado.size)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setArchivoSeleccionado(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Input de mensaje */}
          <div className="p-4 flex items-end gap-2 flex-shrink-0 border-t bg-background">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
              accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.odt,.ods"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={enviando}
              className="flex-shrink-0 h-10 w-10"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <div className="flex-1 relative">
              <textarea
                placeholder="Escribe un mensaje..."
                value={nuevoMensaje}
                onChange={(e) => {
                  setNuevoMensaje(e.target.value)
                  // Auto-resize
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
                }}
                onKeyDown={handleKeyDown}
                disabled={enviando}
                rows={1}
                className="w-full min-h-[44px] max-h-[150px] px-3 py-2.5 text-sm rounded-lg border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden"
              />
              <div className="absolute bottom-1 right-1 text-[10px] text-muted-foreground pointer-events-none">
                {nuevoMensaje.length > 0 && `${nuevoMensaje.length}`}
              </div>
            </div>
            <Button
              onClick={enviarMensaje}
              disabled={enviando || (!nuevoMensaje.trim() && !archivoSeleccionado)}
              size="icon"
              className="flex-shrink-0 h-10 w-10"
            >
              {enviando ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
