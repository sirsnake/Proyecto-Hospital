"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Image as ImageIcon,
  FileText,
  File,
  Download,
  Loader2,
  Eye,
  Trash2,
  FolderOpen,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ArchivoAdjunto {
  id: number
  nombre_original: string
  archivo: string
  tipo: string
  tamano: number
  fecha_subida: string
  subido_por: {
    id: number
    username: string
    first_name: string
    last_name: string
    rol: string
  }
}

interface GaleriaArchivosProps {
  fichaId: number
  className?: string
  mostrarSubidoPor?: boolean
  permitirEliminar?: boolean
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

export function GaleriaArchivos({
  fichaId,
  className,
  mostrarSubidoPor = true,
  permitirEliminar = false,
}: GaleriaArchivosProps) {
  const [archivos, setArchivos] = useState<ArchivoAdjunto[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<ArchivoAdjunto | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotacion, setRotacion] = useState(0)

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

  // Cargar archivos
  const cargarArchivos = useCallback(async () => {
    if (!fichaId) return

    setCargando(true)
    try {
      const response = await fetch(
        `${API_BASE_URL}/archivos/por_ficha/?ficha_id=${fichaId}`,
        { credentials: "include" }
      )
      if (response.ok) {
        const data = await response.json()
        setArchivos(data)
        setError(null)
      } else {
        setError("Error al cargar archivos")
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setCargando(false)
    }
  }, [fichaId])

  useEffect(() => {
    cargarArchivos()
  }, [cargarArchivos])

  // Eliminar archivo
  const eliminarArchivo = async (archivoId: number) => {
    if (!confirm("¿Estás seguro de eliminar este archivo?")) return

    const csrfToken = await getCsrfToken()
    try {
      const response = await fetch(`${API_BASE_URL}/archivos/${archivoId}/`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrfToken || "",
        },
      })

      if (response.ok) {
        setArchivos((prev) => prev.filter((a) => a.id !== archivoId))
        if (archivoSeleccionado?.id === archivoId) {
          setArchivoSeleccionado(null)
        }
      } else {
        setError("Error al eliminar archivo")
      }
    } catch {
      setError("Error de conexión")
    }
  }

  // Obtener icono según tipo
  const getIconoArchivo = (tipo: string, size: "sm" | "lg" = "sm") => {
    const sizeClass = size === "lg" ? "h-12 w-12" : "h-5 w-5"
    switch (tipo) {
      case "imagen":
        return <ImageIcon className={sizeClass} />
      case "pdf":
        return <FileText className={cn(sizeClass, "text-red-500")} />
      case "documento":
        return <FileText className={cn(sizeClass, "text-blue-500")} />
      default:
        return <File className={sizeClass} />
    }
  }

  // Formatear tamaño
  const formatearTamano = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  // Formatear fecha
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Agrupar archivos por tipo
  const archivosPorTipo = archivos.reduce((acc, archivo) => {
    const tipo = archivo.tipo
    if (!acc[tipo]) {
      acc[tipo] = []
    }
    acc[tipo].push(archivo)
    return acc
  }, {} as Record<string, ArchivoAdjunto[]>)

  // Reset visor de imagen
  const resetVisor = () => {
    setZoom(1)
    setRotacion(0)
  }

  // Abrir visor
  const abrirVisor = (archivo: ArchivoAdjunto) => {
    resetVisor()
    setArchivoSeleccionado(archivo)
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              <CardTitle className="text-base">Archivos Adjuntos</CardTitle>
            </div>
            <Badge variant="secondary">{archivos.length} archivos</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          {cargando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : archivos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay archivos adjuntos</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-6">
                {/* Imágenes */}
                {archivosPorTipo["imagen"]?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Imágenes ({archivosPorTipo["imagen"].length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {archivosPorTipo["imagen"].map((archivo) => (
                        <div
                          key={archivo.id}
                          className="relative group rounded-lg overflow-hidden border bg-muted/50"
                        >
                          <img
                            src={archivo.archivo}
                            alt={archivo.nombre_original}
                            className="w-full h-24 object-cover cursor-pointer"
                            onClick={() => abrirVisor(archivo)}
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => abrirVisor(archivo)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <a href={archivo.archivo} download>
                              <Button variant="secondary" size="icon" className="h-8 w-8">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                            {permitirEliminar && (
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => eliminarArchivo(archivo.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs truncate">{archivo.nombre_original}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documentos PDF */}
                {archivosPorTipo["pdf"]?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-500" />
                      PDFs ({archivosPorTipo["pdf"].length})
                    </h4>
                    <div className="space-y-2">
                      {archivosPorTipo["pdf"].map((archivo) => (
                        <div
                          key={archivo.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          {getIconoArchivo("pdf", "lg")}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {archivo.nombre_original}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatearTamano(archivo.tamano)} • {formatearFecha(archivo.fecha_subida)}
                            </p>
                            {mostrarSubidoPor && (
                              <p className="text-xs text-muted-foreground">
                                Subido por: {archivo.subido_por.first_name} {archivo.subido_por.last_name}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <a
                              href={archivo.archivo}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </a>
                            <a href={`${API_BASE_URL}/archivos/${archivo.id}/download/`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                            {permitirEliminar && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => eliminarArchivo(archivo.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Otros documentos */}
                {(archivosPorTipo["documento"]?.length > 0 || archivosPorTipo["otro"]?.length > 0) && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <File className="h-4 w-4" />
                      Documentos ({(archivosPorTipo["documento"]?.length || 0) + (archivosPorTipo["otro"]?.length || 0)})
                    </h4>
                    <div className="space-y-2">
                      {[...(archivosPorTipo["documento"] || []), ...(archivosPorTipo["otro"] || [])].map((archivo) => (
                        <div
                          key={archivo.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          {getIconoArchivo(archivo.tipo, "lg")}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {archivo.nombre_original}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatearTamano(archivo.tamano)} • {formatearFecha(archivo.fecha_subida)}
                            </p>
                            {mostrarSubidoPor && (
                              <p className="text-xs text-muted-foreground">
                                Subido por: {archivo.subido_por.first_name} {archivo.subido_por.last_name}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <a href={`${API_BASE_URL}/archivos/${archivo.id}/download/`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                            {permitirEliminar && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => eliminarArchivo(archivo.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Visor de imágenes */}
      <Dialog open={!!archivoSeleccionado && archivoSeleccionado.tipo === "imagen"} onOpenChange={() => setArchivoSeleccionado(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate max-w-md">{archivoSeleccionado?.nombre_original}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRotacion((r) => (r + 90) % 360)}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto max-h-[70vh] bg-muted/50 rounded-lg p-4">
            {archivoSeleccionado && (
              <img
                src={archivoSeleccionado.archivo}
                alt={archivoSeleccionado.nombre_original}
                style={{
                  transform: `scale(${zoom}) rotate(${rotacion}deg)`,
                  transition: "transform 0.2s ease",
                }}
                className="max-w-full h-auto"
              />
            )}
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>
              {archivoSeleccionado && formatearTamano(archivoSeleccionado.tamano)} • {archivoSeleccionado && formatearFecha(archivoSeleccionado.fecha_subida)}
            </span>
            {archivoSeleccionado && (
              <a href={archivoSeleccionado.archivo} download>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
