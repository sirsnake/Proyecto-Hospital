import { useEffect, useState, useRef, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getSession } from "@/lib/auth"
import { fichasAPI, chatAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Send,
  Paperclip,
  Loader2,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Image as ImageIcon,
  X,
  Camera,
  Video,
  Mic,
  Square,
  Plus,
} from "lucide-react"

interface Mensaje {
  id: number
  autor: {
    id: number
    username: string
    first_name: string
    last_name: string
    rol: string
  }
  contenido: string
  archivo_adjunto: {
    id: number
    nombre_original: string
    archivo: string
    tipo: string
  } | null
  fecha_envio: string
  leido_por: number[]
}

interface FichaInfo {
  id: number
  paciente_nombre: string
  prioridad: string
  estado: string
  eta: string
}

function ChatParamedicoPage() {
  const navigate = useNavigate()
  const params = useParams()
  const fichaId = params.fichaId as string

  const [user, setUser] = useState<any>(null)
  const [ficha, setFicha] = useState<FichaInfo | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [nuevoMensaje, setNuevoMensaje] = useState("")
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
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
  
  // Refs para grabación
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageIdRef = useRef<number>(0)
  
  // Detectar si es móvil
  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // Cargar información de la ficha
  const cargarFicha = useCallback(async () => {
    try {
      const data = await fichasAPI.obtener(parseInt(fichaId))
      setFicha({
        id: data.id,
        paciente_nombre: data.paciente_nombre || `Paciente #${data.paciente}`,
        prioridad: data.prioridad,
        estado: data.estado,
        eta: data.eta,
      })
    } catch (err) {
      console.error("Error cargando ficha:", err)
    }
  }, [fichaId])

  // Cargar mensajes
  const cargarMensajes = useCallback(async () => {
    try {
      const data = await chatAPI.obtenerMensajes(parseInt(fichaId))
      const mensajesArray = Array.isArray(data) ? data : (data.results || [])
      setMensajes(mensajesArray)
      if (mensajesArray.length > 0) {
        lastMessageIdRef.current = Math.max(...mensajesArray.map((m: Mensaje) => m.id))
      }
    } catch (err) {
      console.error("Error cargando mensajes:", err)
    } finally {
      setCargando(false)
    }
  }, [fichaId])

  // Polling para nuevos mensajes
  const pollMensajes = useCallback(async () => {
    try {
      const data = await chatAPI.poll(parseInt(fichaId), lastMessageIdRef.current)
      if (data.mensajes && data.mensajes.length > 0) {
        setMensajes((prev) => {
          const nuevos = data.mensajes.filter(
            (m: Mensaje) => !prev.some((existing) => existing.id === m.id)
          )
          if (nuevos.length > 0) {
            lastMessageIdRef.current = Math.max(...data.mensajes.map((m: Mensaje) => m.id))
            return [...prev, ...nuevos]
          }
          return prev
        })
      }
    } catch {
      // Silenciar errores de polling
    }
  }, [fichaId])

  // Scroll al final
  const scrollAlFinal = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  // Helper para crear archivo desde blob
  const createFileFromBlob = (blob: Blob, filename: string, mimeType: string): File => {
    return new File([blob], filename, { type: mimeType, lastModified: Date.now() })
  }

  // Iniciar grabación de audio
  const iniciarGrabacionAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm; codecs=opus')) {
        mimeType = 'audio/webm; codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg'
      }
      
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }
      
      recorder.onstop = () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
          const cleanMimeType = mimeType.split(';')[0].trim()
          const extension = cleanMimeType.split('/')[1]
          const audioFile = createFileFromBlob(audioBlob, `audio_${Date.now()}.${extension}`, cleanMimeType)
          setArchivoSeleccionado(audioFile)
        }
        
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop())
          audioStreamRef.current = null
        }
        
        setTiempoGrabacion(0)
        setGrabandoAudio(false)
        mediaRecorderRef.current = null
        audioChunksRef.current = []
      }
      
      recorder.start(1000)
      setGrabandoAudio(true)
      setTiempoGrabacion(0)
      
      timerRef.current = setInterval(() => {
        setTiempoGrabacion(prev => prev + 1)
      }, 1000)
      
    } catch (err) {
      console.error('Error accediendo al micrófono:', err)
      alert("No se pudo acceder al micrófono. Verifica los permisos.")
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
  
  // Formatear tiempo de grabación
  const formatearTiempoGrabacion = (segundos: number) => {
    const mins = Math.floor(segundos / 60)
    const secs = segundos % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
    }
  }
  
  // Cerrar modal de cámara
  const cerrarCamara = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop())
      cameraStreamRef.current = null
    }
    if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
      videoRecorderRef.current.stop()
    }
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
      recorder.start(100)
      setGrabandoVideo(true)
      setTiempoVideo(0)
      
      videoTimerRef.current = setInterval(() => {
        setTiempoVideo(prev => prev + 1)
      }, 1000)
      
    } catch (err) {
      console.error('Error iniciando grabación:', err)
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

  // Enviar mensaje
  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim() && !archivoSeleccionado) return

    setEnviando(true)
    try {
      let archivoId: number | undefined = undefined
      
      // Si hay archivo, subirlo primero
      if (archivoSeleccionado) {
        const uploadedId = await chatAPI.subirArchivo(parseInt(fichaId), archivoSeleccionado)
        if (!uploadedId) {
          console.error("Error al subir archivo")
          setEnviando(false)
          return
        }
        archivoId = uploadedId
      }
      
      const contenido = nuevoMensaje.trim() || "(Archivo adjunto)"
      const mensaje = await chatAPI.enviarMensaje(
        parseInt(fichaId),
        contenido,
        archivoId
      )
      setMensajes((prev) => [...prev, mensaje])
      setNuevoMensaje("")
      setArchivoSeleccionado(null)
      lastMessageIdRef.current = mensaje.id
    } catch (err) {
      console.error("Error enviando mensaje:", err)
    } finally {
      setEnviando(false)
    }
  }

  // Manejar Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!dropdownOpen) {
        enviarMensaje()
      }
    }
  }

  // Manejar archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert("El archivo es demasiado grande (máximo 50MB)")
        return
      }
      setArchivoSeleccionado(file)
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

  // Efectos
  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "paramedico") {
      navigate("/")
      return
    }
    setUser(currentUser)
  }, [navigate])

  useEffect(() => {
    if (user && fichaId) {
      cargarFicha()
      cargarMensajes()
    }
  }, [user, fichaId, cargarFicha, cargarMensajes])

  useEffect(() => {
    if (fichaId) {
      pollingRef.current = setInterval(pollMensajes, 2000)
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [fichaId, pollMensajes])

  useEffect(() => {
    scrollAlFinal()
  }, [mensajes, scrollAlFinal])

  if (!user) return null

  const getPrioridadColor = (p: string) => {
    switch (p) {
      case "C1": return "bg-red-600"
      case "C2": return "bg-orange-500"
      case "C3": return "bg-yellow-500 text-black"
      case "C4": return "bg-green-500"
      case "C5": return "bg-blue-500"
      default: return "bg-slate-500"
    }
  }

  const formatearHora = (fecha: string) => {
    if (!fecha) return "--:--"
    const date = new Date(fecha)
    if (isNaN(date.getTime())) return "--:--"
    return date.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getIniciales = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
  }

  const getRolColor = (rol: string) => {
    switch (rol) {
      case "medico": return "bg-blue-600"
      case "paramedico": return "bg-emerald-600"
      case "tens": return "bg-purple-600"
      default: return "bg-slate-600"
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
            className={`w-full h-full object-cover ${!isMobile ? 'transform scale-x-[-1]' : ''}`}
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

  return (
    <>
      <CameraModal />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard/paramedico")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            {ficha && (
              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={getPrioridadColor(ficha.prioridad)}>{ficha.prioridad}</Badge>
                  <div>
                    <h1 className="text-white font-semibold">Ficha #{ficha.id}</h1>
                    <p className="text-xs text-slate-400">{ficha.paciente_nombre}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>ETA: {ficha.eta}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="container mx-auto px-4 py-4 max-w-2xl">
            {cargando ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : mensajes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                  <Send className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-white font-semibold mb-1">Sin mensajes</h3>
                <p className="text-sm text-slate-400">Envía un mensaje para iniciar la conversación con el hospital</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mensajes.map((mensaje, index) => {
                  const autor = mensaje.autor || { 
                    id: user?.id || 0, 
                    first_name: user?.first_name || 'Usuario', 
                    last_name: user?.last_name || '', 
                    rol: user?.rol || 'desconocido' 
                  }
                  const esMio = autor.id === user?.id
                  return (
                    <div
                      key={mensaje.id ?? `msg-${index}`}
                      className={cn("flex gap-2", esMio ? "justify-end" : "justify-start")}
                    >
                      {!esMio && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className={getRolColor(autor.rol)}>
                            {getIniciales(autor.first_name, autor.last_name)}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={cn("max-w-[75%]", esMio ? "items-end" : "items-start")}>
                        {!esMio && (
                          <p className="text-xs text-slate-400 mb-1">
                            {autor.first_name} {autor.last_name}
                            <span className="ml-1 text-slate-500">({autor.rol})</span>
                          </p>
                        )}

                        <div
                          className={cn(
                            "rounded-2xl px-4 py-2",
                            esMio
                              ? "bg-emerald-600 text-white rounded-br-md"
                              : "bg-slate-800 text-white rounded-bl-md"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{mensaje.contenido}</p>

                          {mensaje.archivo_adjunto && (
                            <div className="mt-2">
                              {/* Imagen - mostrar preview */}
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
                              ) : mensaje.archivo_adjunto.tipo === 'video' ? (
                                /* Video - mostrar reproductor */
                                <div className="rounded-lg overflow-hidden bg-black/20">
                                  <video 
                                    src={mensaje.archivo_adjunto.archivo}
                                    controls
                                    className="max-w-full max-h-64 rounded-lg"
                                    preload="metadata"
                                    playsInline
                                  />
                                  <p className="text-xs mt-1 opacity-70 flex items-center gap-1 p-1">
                                    <Video className="h-3 w-3" />
                                    {mensaje.archivo_adjunto.nombre_original}
                                  </p>
                                </div>
                              ) : mensaje.archivo_adjunto.tipo === 'audio' ? (
                                /* Audio - mostrar reproductor */
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
                                /* Otros archivos - mostrar enlace de descarga */
                                <a
                                  href={mensaje.archivo_adjunto.archivo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 bg-black/20 rounded-lg hover:bg-black/30 transition-colors"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span className="text-xs truncate">
                                    {mensaje.archivo_adjunto.nombre_original}
                                  </span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        <div className={cn("flex items-center gap-1 mt-1", esMio ? "justify-end" : "justify-start")}>
                          <span className="text-[10px] text-slate-500">{formatearHora(mensaje.fecha_envio)}</span>
                          {esMio && (
                            mensaje.leido_por.length > 1 ? (
                              <CheckCheck className="w-3 h-3 text-blue-400" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-500" />
                            )
                          )}
                        </div>
                      </div>

                      {esMio && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-emerald-600">
                            {getIniciales(user.first_name || "P", user.last_name || "M")}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Archivo seleccionado */}
      {archivoSeleccionado && (
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg mb-2 border border-slate-700">
            {archivoSeleccionado.type.startsWith('image') ? (
              <ImageIcon className="w-4 h-4 text-blue-400" />
            ) : archivoSeleccionado.type.startsWith('video') ? (
              <Video className="w-4 h-4 text-purple-400" />
            ) : archivoSeleccionado.type.startsWith('audio') ? (
              <Mic className="w-4 h-4 text-green-400" />
            ) : (
              <Paperclip className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-sm text-white flex-1 truncate">{archivoSeleccionado.name}</span>
            <span className="text-xs text-slate-400">
              {(archivoSeleccionado.size / 1024).toFixed(1)} KB
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 text-slate-400 hover:text-red-400"
              onClick={() => setArchivoSeleccionado(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Grabando Audio Indicator */}
      {grabandoAudio && (
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex items-center gap-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <Mic className="w-5 h-5 text-red-400 animate-pulse" />
            <span className="text-red-300 font-medium">Grabando audio...</span>
            <span className="text-red-400 font-mono text-lg">{formatearTiempoGrabacion(tiempoGrabacion)}</span>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="destructive"
              onClick={detenerGrabacionAudio}
              className="bg-red-600 hover:bg-red-700"
            >
              <Square className="w-4 h-4 mr-1" />
              Detener
            </Button>
          </div>
        </div>
      )}

      {/* Input de mensaje */}
      <div className="border-t border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 max-w-2xl">
          <div className="flex items-center gap-2">
            {/* Inputs ocultos para cámara y video */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.mp3,.wav,.ogg,.mp4,.webm,.mov"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
              capture="environment"
            />
            <input
              type="file"
              ref={videoInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="video/*"
              capture="environment"
            />
            
            {/* Menú de adjuntar */}
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={enviando || grabandoAudio}
                  className="text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-slate-800 border-slate-700 w-48">
                <DropdownMenuItem 
                  onClick={() => abrirCamara('foto')}
                  className="text-white hover:bg-slate-700 cursor-pointer focus:bg-slate-700"
                >
                  <Camera className="w-4 h-4 mr-3 text-blue-400" />
                  <span>Tomar Foto</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => abrirCamara('video')}
                  className="text-white hover:bg-slate-700 cursor-pointer focus:bg-slate-700"
                >
                  <Video className="w-4 h-4 mr-3 text-purple-400" />
                  <span>Grabar Video</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={iniciarGrabacionAudio}
                  className="text-white hover:bg-slate-700 cursor-pointer focus:bg-slate-700"
                >
                  <Mic className="w-4 h-4 mr-3 text-green-400" />
                  <span>Grabar Audio</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-white hover:bg-slate-700 cursor-pointer focus:bg-slate-700"
                >
                  <Paperclip className="w-4 h-4 mr-3 text-slate-400" />
                  <span>Adjuntar Archivo</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Input
              placeholder="Escribe un mensaje..."
              value={nuevoMensaje}
              onChange={(e) => setNuevoMensaje(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={enviando || grabandoAudio}
              className="flex-1 bg-slate-800 border-slate-700 text-white"
            />

            <Button
              onClick={enviarMensaje}
              disabled={enviando || grabandoAudio || (!nuevoMensaje.trim() && !archivoSeleccionado)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {enviando ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}

export default ChatParamedicoPage
