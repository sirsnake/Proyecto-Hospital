

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Camera,
  Video,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Plus,
  Maximize,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getApiUrl } from "@/lib/api"

const API_BASE_URL = getApiUrl()

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
  
  // Estados para grabación de audio
  const [grabandoAudio, setGrabandoAudio] = useState(false)
  const [tiempoGrabacion, setTiempoGrabacion] = useState(0)
  
  // Estados para modal de cámara
  const [mostrarCamara, setMostrarCamara] = useState(false)
  const [tipoCamara, setTipoCamara] = useState<'foto' | 'video'>('foto')
  const [grabandoVideo, setGrabandoVideo] = useState(false)
  const [tiempoVideo, setTiempoVideo] = useState(0)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const videoRecorderRef = useRef<MediaRecorder | null>(null)
  const videoChunksRef = useRef<Blob[]>([])
  const videoTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Refs para grabación (evitar problemas de estado)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageIdRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownOpenRef = useRef(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  // Detectar si es móvil/tablet (tiene cámara nativa)
  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  // Helper para crear archivo desde blob (compatible con todos los navegadores)
  const createFileFromBlob = (blob: Blob, filename: string, mimeType: string): File => {
    try {
      // Usar el constructor File global
      const FileConstructor = globalThis.File || window.File
      return new FileConstructor([blob], filename, { type: mimeType })
    } catch {
      // Fallback para navegadores que no soportan el constructor File
      const file = blob as any
      file.name = filename
      file.lastModified = Date.now()
      return file as File
    }
  }

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
    // Pasar el nombre explícitamente como tercer parámetro
    // Esto es necesario porque algunos navegadores no mantienen el nombre del File
    formData.append("archivo", file, file.name)
    formData.append("ficha_id", fichaId.toString())
    
    console.log("Subiendo archivo:", {
      name: file.name,
      type: file.type,
      size: file.size,
      ficha_id: fichaId
    })

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
        // Mostrar mensaje de error más descriptivo
        let errorMsg = "Error al subir archivo"
        if (errorData.archivo) {
          errorMsg = Array.isArray(errorData.archivo) 
            ? errorData.archivo.join(", ") 
            : errorData.archivo
        } else if (errorData.detail) {
          errorMsg = errorData.detail
        } else if (errorData.ficha_id) {
          errorMsg = Array.isArray(errorData.ficha_id) 
            ? errorData.ficha_id.join(", ") 
            : errorData.ficha_id
        }
        setError(errorMsg)
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
      // Validar tamaño (100MB para videos, 50MB para otros)
      const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 50 * 1024 * 1024
      if (file.size > maxSize) {
        setError(`El archivo no puede superar los ${file.type.startsWith('video/') ? '100MB' : '50MB'}`)
        return
      }

      // Validar extensión - ahora incluye videos y audios
      const extensionesPermitidas = [
        // Imágenes
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".heic", ".heif", ".avif",
        // Videos
        ".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v", ".3gp",
        // Audio
        ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".webm",
        // Documentos
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".odt", ".ods", ".ppt", ".pptx", ".txt"
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
  
  // Capturar foto desde cámara (móvil)
  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setArchivoSeleccionado(file)
      setError(null)
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ""
    }
  }
  
  // Iniciar grabación de audio
  const iniciarGrabacionAudio = async () => {
    try {
      // Limpiar grabación anterior si existe
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      audioChunksRef.current = []
      
      // Detectar formato soportado
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/wav'
      
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }
      
      recorder.onstop = () => {
        // Limpiar timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        
        // Crear archivo de audio
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
          // Limpiar mime type de codecs (ej: audio/webm; codecs=opus -> audio/webm)
          const cleanMimeType = mimeType.split(';')[0].trim()
          const extension = cleanMimeType.split('/')[1]
          const audioFile = createFileFromBlob(audioBlob, `audio_${Date.now()}.${extension}`, cleanMimeType)
          console.log("Audio creado:", { name: audioFile.name, type: audioFile.type, size: audioFile.size })
          setArchivoSeleccionado(audioFile)
        }
        
        // Detener stream
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop())
          audioStreamRef.current = null
        }
        
        setTiempoGrabacion(0)
        setGrabandoAudio(false)
        mediaRecorderRef.current = null
        audioChunksRef.current = []
      }
      
      recorder.start(1000) // Capturar datos cada segundo
      setGrabandoAudio(true)
      setTiempoGrabacion(0)
      
      // Timer para mostrar duración
      timerRef.current = setInterval(() => {
        setTiempoGrabacion(prev => prev + 1)
      }, 1000)
      
    } catch (err) {
      console.error('Error accediendo al micrófono:', err)
      setError("No se pudo acceder al micrófono. Verifica los permisos.")
    }
  }
  
  // Detener grabación de audio
  const detenerGrabacionAudio = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch (err) {
        console.error('Error deteniendo grabación:', err)
        // Forzar limpieza
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop())
          audioStreamRef.current = null
        }
        setGrabandoAudio(false)
        setTiempoGrabacion(0)
      }
    }
  }
  
  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])
  
  // Formatear tiempo de grabación
  const formatearTiempoGrabacion = (segundos: number) => {
    const mins = Math.floor(segundos / 60)
    const secs = segundos % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Obtener icono según tipo de archivo
  const getIconoArchivo = (tipo: string) => {
    switch (tipo) {
      case "imagen":
        return <ImageIcon className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "audio":
        return <Mic className="h-4 w-4" />
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
      e.stopPropagation()
      // Solo enviar si no está abierto el dropdown
      if (!dropdownOpen) {
        enviarMensaje()
      }
    }
  }
  
  // Abrir cámara - Siempre usa modal con preview en todos los dispositivos
  const abrirCamara = async (tipo: 'foto' | 'video') => {
    setTipoCamara(tipo)
    setMostrarCamara(true)
    setGrabandoVideo(false)
    setTiempoVideo(0)
    
    try {
      // En móvil usar cámara trasera (environment), en desktop la frontal (user)
      const facingMode = isMobile ? 'environment' : 'user'
      const constraints = tipo === 'foto' 
        ? { video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } }
        : { video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      cameraStreamRef.current = stream
      
      // Esperar a que el ref esté disponible
      setTimeout(() => {
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream
          videoPreviewRef.current.play()
        }
      }, 100)
    } catch (err) {
      console.error('Error accediendo a la cámara:', err)
      setMostrarCamara(false)
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }
  
  // Cerrar modal de cámara
  const cerrarCamara = () => {
    // Detener stream
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop())
      cameraStreamRef.current = null
    }
    // Detener grabación si está activa
    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.stop()
    }
    // Limpiar timer
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current)
      videoTimerRef.current = null
    }
    setMostrarCamara(false)
    setGrabandoVideo(false)
    setTiempoVideo(0)
  }
  
  // Capturar foto desde el preview
  const capturarFoto = () => {
    if (!videoPreviewRef.current || !cameraStreamRef.current) return
    
    const video = videoPreviewRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      // Solo voltear en desktop (cámara frontal tiene efecto espejo)
      if (!isMobile) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, 0, 0)
    }
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = createFileFromBlob(blob, `foto_${Date.now()}.jpg`, 'image/jpeg')
        setArchivoSeleccionado(file)
        cerrarCamara()
      }
    }, 'image/jpeg', 0.9)
  }
  
  // Iniciar grabación de video
  const iniciarGrabacionVideo = () => {
    if (!cameraStreamRef.current) return
    
    videoChunksRef.current = []
    
    try {
      const recorder = new MediaRecorder(cameraStreamRef.current, {
        mimeType: 'video/webm;codecs=vp9,opus'
      })
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data)
        }
      }
      
      recorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: 'video/webm' })
        const file = createFileFromBlob(blob, `video_${Date.now()}.webm`, 'video/webm')
        setArchivoSeleccionado(file)
        cerrarCamara()
      }
      
      videoRecorderRef.current = recorder
      recorder.start(100) // Guardar chunks cada 100ms
      setGrabandoVideo(true)
      setTiempoVideo(0)
      
      // Timer para mostrar tiempo
      videoTimerRef.current = setInterval(() => {
        setTiempoVideo(prev => prev + 1)
      }, 1000)
      
    } catch (err) {
      console.error('Error iniciando grabación:', err)
      // Fallback: probar sin codec específico
      try {
        const recorder = new MediaRecorder(cameraStreamRef.current)
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            videoChunksRef.current.push(e.data)
          }
        }
        
        recorder.onstop = () => {
          const blob = new Blob(videoChunksRef.current, { type: 'video/webm' })
          const file = createFileFromBlob(blob, `video_${Date.now()}.webm`, 'video/webm')
          setArchivoSeleccionado(file)
          cerrarCamara()
        }
        
        videoRecorderRef.current = recorder
        recorder.start(100)
        setGrabandoVideo(true)
        setTiempoVideo(0)
        
        videoTimerRef.current = setInterval(() => {
          setTiempoVideo(prev => prev + 1)
        }, 1000)
      } catch (err2) {
        console.error('Error con fallback de grabación:', err2)
        setError('No se pudo iniciar la grabación de video')
      }
    }
  }
  
  // Detener grabación de video
  const detenerGrabacionVideo = () => {
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current)
      videoTimerRef.current = null
    }
    
    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.stop()
    }
  }
  
  // Formatear tiempo de video
  const formatearTiempoVideo = (segundos: number) => {
    const mins = Math.floor(segundos / 60)
    const secs = segundos % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Manejar captura de video desde cámara
  const handleVideoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setArchivoSeleccionado(file)
      setError(null)
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = ""
    }
  }

  // Modal de cámara para todos los dispositivos
  const CameraModal = () => {
    if (!mostrarCamara) return null
    
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-900/90 backdrop-blur-sm safe-area-top">
          <div className="flex items-center gap-2">
            {tipoCamara === 'foto' ? (
              <Camera className="h-5 w-5 text-blue-400" />
            ) : (
              <Video className="h-5 w-5 text-red-400" />
            )}
            <h3 className="text-white font-medium">
              {tipoCamara === 'foto' ? 'Tomar Foto' : 'Grabar Video'}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={cerrarCamara}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Preview de cámara - ocupa todo el espacio disponible */}
        <div className="flex-1 relative bg-black">
          <video
            ref={videoPreviewRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover",
              // Solo efecto espejo en desktop (cámara frontal)
              !isMobile && "transform scale-x-[-1]"
            )}
          />
          
          {/* Indicador de grabación */}
          {grabandoVideo && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600/90 px-4 py-2 rounded-full">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="text-white font-medium">
                REC {formatearTiempoVideo(tiempoVideo)}
              </span>
            </div>
          )}
        </div>
        
        {/* Controles - estilo cámara de celular */}
        <div className="p-6 flex justify-center items-center gap-8 bg-slate-900/90 backdrop-blur-sm safe-area-bottom">
          {/* Botón cancelar a la izquierda */}
          <Button
            variant="ghost"
            onClick={cerrarCamara}
            className="text-slate-300 hover:text-white"
          >
            Cancelar
          </Button>
          
          {/* Botón principal en el centro */}
          {tipoCamara === 'foto' ? (
            // Botón de captura de foto - estilo cámara
            <button
              onClick={capturarFoto}
              className="w-20 h-20 rounded-full bg-white border-4 border-slate-600 hover:bg-slate-200 active:scale-95 transition-transform flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-400" />
            </button>
          ) : (
            // Controles de video
            !grabandoVideo ? (
              <button
                onClick={iniciarGrabacionVideo}
                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition-transform flex items-center justify-center"
              >
                <div className="w-8 h-8 rounded-full bg-red-400" />
              </button>
            ) : (
              <button
                onClick={detenerGrabacionVideo}
                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition-transform animate-pulse flex items-center justify-center"
              >
                <Square className="w-8 h-8 text-white" />
              </button>
            )
          )}
          
          {/* Espacio a la derecha para balance */}
          <div className="w-16" />
        </div>
      </div>
    )
  }

  // Modo pantalla completa (para móvil)
  if (fullScreen) {
    return (
      <>
        <CameraModal />
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

        {/* Barra de grabación de audio - bonita y visible */}
        {grabandoAudio && (
          <div className="px-4 pt-2 flex-shrink-0">
            <div className="flex items-center gap-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <Mic className="w-5 h-5 text-red-400 animate-pulse" />
              <span className="text-red-300 font-medium">Grabando audio...</span>
              <span className="text-red-400 font-mono text-lg">{formatearTiempoGrabacion(tiempoGrabacion)}</span>
              <div className="flex-1" />
              <Button 
                variant="destructive" 
                size="sm"
                onClick={detenerGrabacionAudio}
                className="flex items-center gap-1"
              >
                <Square className="w-4 h-4" />
                Detener
              </Button>
            </div>
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
                                onError={(e) => {
                                  // Fallback si la imagen no carga
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                              <p className="text-xs mt-1 opacity-70 flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                {mensaje.archivo_adjunto.nombre_original}
                              </p>
                            </a>
                          ) : mensaje.archivo_adjunto.tipo === 'video' ? (
                            /* Si es video, mostrar reproductor con fullscreen */
                            <div className="rounded-lg overflow-hidden bg-black/20 relative group">
                              <video 
                                src={mensaje.archivo_adjunto.archivo}
                                controls
                                className="max-w-full max-h-64 rounded-lg"
                                preload="metadata"
                                playsInline
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.preventDefault()
                                  const video = e.currentTarget.previousElementSibling as HTMLVideoElement
                                  if (video?.requestFullscreen) {
                                    video.requestFullscreen()
                                  } else if ((video as any)?.webkitEnterFullscreen) {
                                    (video as any).webkitEnterFullscreen()
                                  }
                                }}
                                title="Pantalla completa"
                              >
                                <Maximize className="h-4 w-4 text-white" />
                              </Button>
                              <p className="text-xs mt-1 opacity-70 flex items-center gap-1 p-1">
                                <Video className="h-3 w-3" />
                                {mensaje.archivo_adjunto.nombre_original}
                              </p>
                            </div>
                          ) : mensaje.archivo_adjunto.tipo === 'audio' ? (
                            /* Si es audio, mostrar reproductor de audio */
                            <div className="flex items-center gap-2 p-2 bg-black/20 rounded-lg">
                              <Mic className="h-4 w-4 flex-shrink-0" />
                              <audio 
                                src={mensaje.archivo_adjunto.archivo}
                                controls
                                className="flex-1 h-8"
                                preload="metadata"
                              />
                            </div>
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
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.odt,.ods,.ppt,.pptx,.txt"
            />
            {/* Input para captura de foto desde cámara en móvil */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCameraCapture}
            />
            {/* Input para captura de video desde cámara en móvil */}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={handleVideoCapture}
            />
            
            {/* Menú de adjuntos */}
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "flex-shrink-0 border-slate-700",
                    archivoSeleccionado 
                      ? "text-blue-400 border-blue-500/50 bg-blue-500/10" 
                      : "text-slate-400"
                  )}
                  title="Adjuntar archivo"
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onSelect={() => { setDropdownOpen(false); setTimeout(() => fileInputRef.current?.click(), 100) }}>
                  <Paperclip className="h-4 w-4 mr-2" />
                  Archivo
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setDropdownOpen(false); setTimeout(() => abrirCamara('foto'), 100) }}>
                  <Camera className="h-4 w-4 mr-2" />
                  Tomar foto
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setDropdownOpen(false); setTimeout(() => abrirCamara('video'), 100) }}>
                  <Video className="h-4 w-4 mr-2" />
                  Grabar video
                </DropdownMenuItem>
                {!grabandoAudio ? (
                  <DropdownMenuItem onSelect={() => { setDropdownOpen(false); setTimeout(() => iniciarGrabacionAudio(), 100) }}>
                    <Mic className="h-4 w-4 mr-2" />
                    Grabar audio
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            
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
      </>
    )
  }

  // Modo normal (embebido)
  return (
    <>
      <CameraModal />
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

          {/* Barra de grabación de audio - bonita y visible */}
          {grabandoAudio && (
            <div className="px-4 py-2 flex-shrink-0">
              <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                <Mic className="w-4 h-4 text-red-400 animate-pulse" />
                <span className="text-red-300 text-sm font-medium">Grabando...</span>
                <span className="text-red-400 font-mono text-sm">{formatearTiempoGrabacion(tiempoGrabacion)}</span>
                <div className="flex-1" />
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={detenerGrabacionAudio}
                  className="h-7 px-2 flex items-center gap-1"
                >
                  <Square className="w-3 h-3" />
                  Detener
                </Button>
              </div>
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
                            ) : mensaje.archivo_adjunto.tipo === "video" ? (
                              <div className="rounded-lg overflow-hidden bg-black/20 relative group">
                                <video 
                                  src={mensaje.archivo_adjunto.archivo}
                                  controls
                                  className="max-w-full max-h-48 rounded-lg"
                                  preload="metadata"
                                  playsInline
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-2 right-2 h-6 w-6 bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    const video = e.currentTarget.previousElementSibling as HTMLVideoElement
                                    if (video?.requestFullscreen) {
                                      video.requestFullscreen()
                                    } else if ((video as any)?.webkitEnterFullscreen) {
                                      (video as any).webkitEnterFullscreen()
                                    }
                                  }}
                                  title="Pantalla completa"
                                >
                                  <Maximize className="h-3 w-3 text-white" />
                                </Button>
                              </div>
                            ) : mensaje.archivo_adjunto.tipo === "audio" ? (
                              <div className="flex items-center gap-2 p-2 bg-black/10 dark:bg-black/20 rounded-lg">
                                <Mic className="h-4 w-4 flex-shrink-0" />
                                <audio 
                                  src={mensaje.archivo_adjunto.archivo}
                                  controls
                                  className="flex-1 h-8"
                                  preload="metadata"
                                />
                              </div>
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
              disabled={enviando || grabandoAudio}
              className="flex-shrink-0 h-10 w-10"
              title="Adjuntar archivo"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            {/* Botón de micrófono */}
            {!grabandoAudio && (
              <Button
                variant="ghost"
                size="icon"
                onClick={iniciarGrabacionAudio}
                disabled={enviando}
                className="flex-shrink-0 h-10 w-10"
                title="Grabar audio"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
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
    </>
  )
}
