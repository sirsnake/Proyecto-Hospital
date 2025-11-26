"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

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
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

export function ChatPanel({
  fichaId,
  usuarioActual,
  className,
  minimizado = false,
  onToggleMinimizar,
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
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
      }
      return null
    } catch {
      return null
    }
  }

  // Enviar mensaje
  const enviarMensaje = async () => {
    if ((!nuevoMensaje.trim() && !archivoSeleccionado) || enviando) return

    setEnviando(true)
    
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
      const response = await fetch(`${API_BASE_URL}/mensajes/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken || "",
        },
        body: JSON.stringify({
          ficha: fichaId,
          contenido: nuevoMensaje.trim(),
          archivo_adjunto: archivoId,
        }),
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
      } else {
        setError("Error al enviar mensaje")
      }
    } catch {
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
  const getIniciales = (usuario: Usuario) => {
    return `${usuario.first_name?.[0] || ""}${usuario.last_name?.[0] || ""}`.toUpperCase() || usuario.username[0].toUpperCase()
  }

  // Obtener color según rol
  const getColorRol = (rol: string) => {
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

  // Formatear hora
  const formatearHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    })
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

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader 
        className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer"
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
        <CardContent className="flex flex-col flex-1 p-0">
          {error && (
            <div className="mx-4 mb-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          {/* Área de mensajes */}
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
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
                mensajes.map((mensaje) => {
                  const esMio = mensaje.autor.id === usuarioActual.id
                  return (
                    <div
                      key={mensaje.id}
                      className={cn(
                        "flex gap-2",
                        esMio ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={getColorRol(mensaje.autor.rol)}>
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
                        {!esMio && (
                          <div className="text-xs font-medium mb-1 opacity-70">
                            {mensaje.autor.first_name} {mensaje.autor.last_name}
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {mensaje.autor.rol}
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

          <Separator />

          {/* Archivo seleccionado */}
          {archivoSeleccionado && (
            <div className="px-4 py-2 flex items-center gap-2 bg-muted/50">
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
          <div className="p-4 flex items-center gap-2">
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
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              placeholder="Escribe un mensaje..."
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={enviando}
              className="flex-1"
            />
            <Button
              onClick={enviarMensaje}
              disabled={enviando || (!nuevoMensaje.trim() && !archivoSeleccionado)}
              size="icon"
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
