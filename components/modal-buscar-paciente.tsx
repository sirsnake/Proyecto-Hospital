"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { pacientesAPI } from "@/lib/api"

interface ModalBuscarPacienteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModalBuscarPaciente({ open, onOpenChange }: ModalBuscarPacienteProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [resultados, setResultados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [busquedaRealizada, setBusquedaRealizada] = useState(false)

  const handleBuscar = async () => {
    if (!query.trim()) {
      setError("Ingrese RUT, nombre o apellido para buscar")
      return
    }

    try {
      setLoading(true)
      setError("")
      setBusquedaRealizada(true)
      
      const data = await pacientesAPI.buscar(query.trim())
      setResultados(Array.isArray(data) ? data : [])
      
      if (Array.isArray(data) && data.length === 0) {
        setError("No se encontraron pacientes con ese criterio de búsqueda")
      }
    } catch (err: any) {
      console.error('Error al buscar paciente:', err)
      setError(err.message || "Error al buscar paciente")
    } finally {
      setLoading(false)
    }
  }

  const handleVerHistorial = (pacienteId: number) => {
    onOpenChange(false)
    router.push(`/dashboard/historial/${pacienteId}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBuscar()
    }
  }

  const calcularEdad = (fechaNacimiento: string) => {
    const hoy = new Date()
    const nacimiento = new Date(fechaNacimiento)
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    const mes = hoy.getMonth() - nacimiento.getMonth()
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--
    }
    return edad
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Buscar Paciente</DialogTitle>
          <DialogDescription className="text-slate-400">
            Busque por RUT, nombre, apellido o ID temporal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ej: 12345678-9, Juan Pérez, NN-001..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-slate-800 border-slate-700 text-white flex-1"
              autoFocus
            />
            <Button 
              onClick={handleBuscar} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Buscando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Buscar
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert className="bg-amber-500/10 border-amber-500">
              <AlertDescription className="text-amber-500">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {busquedaRealizada && resultados.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-400">
                Se encontraron {resultados.length} paciente(s)
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {resultados.map((paciente) => (
                  <div
                    key={paciente.id}
                    className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">
                          {paciente.es_nn 
                            ? `NN - ${paciente.id_temporal || 'Sin ID'}` 
                            : `${paciente.nombres} ${paciente.apellidos}`
                          }
                        </h3>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          {!paciente.es_nn && (
                            <div>
                              <span className="text-slate-400">RUT:</span>{" "}
                              <span className="text-white">{paciente.rut}</span>
                            </div>
                          )}
                          {paciente.fecha_nacimiento && (
                            <div>
                              <span className="text-slate-400">Edad:</span>{" "}
                              <span className="text-white">
                                {calcularEdad(paciente.fecha_nacimiento)} años
                              </span>
                            </div>
                          )}
                          {paciente.es_nn && paciente.edad_aproximada && (
                            <div>
                              <span className="text-slate-400">Edad aprox:</span>{" "}
                              <span className="text-white">~{paciente.edad_aproximada}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400">Sexo:</span>{" "}
                            <span className="text-white">
                              {paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Femenino' : 'Otro'}
                            </span>
                          </div>
                          {paciente.telefono && (
                            <div>
                              <span className="text-slate-400">Teléfono:</span>{" "}
                              <span className="text-white">{paciente.telefono}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleVerHistorial(paciente.id)}
                        className="ml-4 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Ver Historial
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
