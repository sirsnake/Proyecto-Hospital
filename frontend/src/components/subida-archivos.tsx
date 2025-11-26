

import * as React from "react"
import { useState, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  X,
  Image as ImageIcon,
  FileText,
  File,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ArchivoParaSubir {
  file: File
  id: string
  progreso: number
  estado: "pendiente" | "subiendo" | "completado" | "error"
  error?: string
}

interface SubidaArchivosProps {
  fichaId: number
  onArchivoSubido?: (archivo: { id: number; nombre: string; tipo: string }) => void
  className?: string
  maxArchivos?: number
  maxTamano?: number // en bytes
}

const API_BASE_URL = "http://localhost:8000/api"

const EXTENSIONES_PERMITIDAS = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".odt", ".ods"
]

const TIPOS_MIME_PERMITIDOS = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet"
]

export function SubidaArchivos({
  fichaId,
  onArchivoSubido,
  className,
  maxArchivos = 10,
  maxTamano = 50 * 1024 * 1024, // 50MB por defecto
}: SubidaArchivosProps) {
  const [archivos, setArchivos] = useState<ArchivoParaSubir[]>([])
  const [arrastrando, setArrastrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Validar archivo
  const validarArchivo = useCallback((file: File): string | null => {
    // Validar tamaño
    if (file.size > maxTamano) {
      return `El archivo supera el límite de ${formatearTamano(maxTamano)}`
    }

    // Validar tipo MIME
    if (!TIPOS_MIME_PERMITIDOS.includes(file.type)) {
      // Verificar por extensión como fallback
      const extension = "." + file.name.split(".").pop()?.toLowerCase()
      if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
        return "Tipo de archivo no permitido"
      }
    }

    return null
  }, [maxTamano])

  // Subir un archivo
  const subirArchivo = useCallback(async (archivoParaSubir: ArchivoParaSubir) => {
    const csrfToken = await getCsrfToken()
    const formData = new FormData()
    formData.append("archivo", archivoParaSubir.file)
    formData.append("ficha_id", fichaId.toString())

    try {
      // Actualizar estado a subiendo
      setArchivos((prev) =>
        prev.map((a) =>
          a.id === archivoParaSubir.id ? { ...a, estado: "subiendo" as const, progreso: 0 } : a
        )
      )

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
        
        // Actualizar estado a completado
        setArchivos((prev) =>
          prev.map((a) =>
            a.id === archivoParaSubir.id 
              ? { ...a, estado: "completado" as const, progreso: 100 } 
              : a
          )
        )

        // Callback
        onArchivoSubido?.({
          id: data.id,
          nombre: data.nombre_original,
          tipo: data.tipo,
        })

        // Remover archivo después de 2 segundos
        setTimeout(() => {
          setArchivos((prev) => prev.filter((a) => a.id !== archivoParaSubir.id))
        }, 2000)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Error al subir archivo")
      }
    } catch (err) {
      setArchivos((prev) =>
        prev.map((a) =>
          a.id === archivoParaSubir.id
            ? { ...a, estado: "error" as const, error: err instanceof Error ? err.message : "Error desconocido" }
            : a
        )
      )
    }
  }, [fichaId, getCsrfToken, onArchivoSubido])

  // Procesar archivos seleccionados
  const procesarArchivos = useCallback(async (files: FileList | File[]) => {
    setError(null)
    const fileArray = Array.from(files)

    // Validar cantidad
    if (archivos.length + fileArray.length > maxArchivos) {
      setError(`Máximo ${maxArchivos} archivos a la vez`)
      return
    }

    const nuevosArchivos: ArchivoParaSubir[] = []
    const errores: string[] = []

    for (const file of fileArray) {
      const errorValidacion = validarArchivo(file)
      if (errorValidacion) {
        errores.push(`${file.name}: ${errorValidacion}`)
        continue
      }

      nuevosArchivos.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        progreso: 0,
        estado: "pendiente",
      })
    }

    if (errores.length > 0) {
      setError(errores.join("\n"))
    }

    if (nuevosArchivos.length > 0) {
      setArchivos((prev) => [...prev, ...nuevosArchivos])

      // Subir archivos secuencialmente
      for (const archivo of nuevosArchivos) {
        await subirArchivo(archivo)
      }
    }
  }, [archivos.length, maxArchivos, subirArchivo, validarArchivo])

  // Handlers de drag & drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setArrastrando(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setArrastrando(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setArrastrando(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      procesarArchivos(files)
    }
  }, [procesarArchivos])

  // Handler de input file
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      procesarArchivos(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [procesarArchivos])

  // Remover archivo de la cola
  const removerArchivo = useCallback((id: string) => {
    setArchivos((prev) => prev.filter((a) => a.id !== id))
  }, [])

  // Obtener icono según tipo de archivo
  const getIconoArchivo = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />
    }
    if (file.type === "application/pdf") {
      return <FileText className="h-5 w-5 text-red-500" />
    }
    return <File className="h-5 w-5 text-gray-500" />
  }

  // Formatear tamaño
  const formatearTamano = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  return (
    <div className={className}>
      {/* Zona de drop */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          arrastrando
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-8">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={handleFileSelect}
            accept={EXTENSIONES_PERMITIDAS.join(",")}
          />
          <Upload className={cn(
            "h-10 w-10 mb-3 transition-colors",
            arrastrando ? "text-primary" : "text-muted-foreground"
          )} />
          <p className="text-sm font-medium mb-1">
            {arrastrando ? "Suelta los archivos aquí" : "Arrastra archivos o haz clic para seleccionar"}
          </p>
          <p className="text-xs text-muted-foreground">
            Imágenes, PDFs, Word, Excel (máx. {formatearTamano(maxTamano)})
          </p>
        </CardContent>
      </Card>

      {/* Error general */}
      {error && (
        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm whitespace-pre-line">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Lista de archivos */}
      {archivos.length > 0 && (
        <div className="mt-4 space-y-2">
          {archivos.map((archivo) => (
            <div
              key={archivo.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                archivo.estado === "error" && "border-red-500 bg-red-50 dark:bg-red-900/20",
                archivo.estado === "completado" && "border-green-500 bg-green-50 dark:bg-green-900/20"
              )}
            >
              {getIconoArchivo(archivo.file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{archivo.file.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatearTamano(archivo.file.size)}
                  </span>
                  {archivo.estado === "subiendo" && (
                    <Progress value={archivo.progreso} className="h-1 flex-1" />
                  )}
                  {archivo.estado === "error" && (
                    <span className="text-xs text-red-500">{archivo.error}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                {archivo.estado === "pendiente" && (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
                {archivo.estado === "subiendo" && (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
                {archivo.estado === "completado" && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {archivo.estado === "error" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      removerArchivo(archivo.id)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
