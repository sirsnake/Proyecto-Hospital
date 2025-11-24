"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import DashboardLayout from "@/components/dashboard-layout"
import { diagnosticosAPI } from "@/lib/api"

interface Medicamento {
  id: string
  nombre: string
  dosis: string
  frecuencia: string
  duracion: string
  indicaciones: string
}

interface FichaData {
  id: number
  paciente: {
    esNN: boolean
    idTemporal?: string
    nombres?: string
    apellidos?: string
    rut?: string
    edad?: number
    edadAproximada?: number
    sexo: string
  }
  motivoConsulta: string
  prioridad: string
  estado: string
}

interface DiagnosticoData {
  id?: number
  diagnostico_cie10: string
  descripcion: string
  indicaciones_medicas: string
  medicamentos_prescritos: string
}

export default function RecetaMedicaPage() {
  const router = useRouter()
  const params = useParams()
  const fichaId = params?.fichaId as string
  const { toast } = useToast()

  const [ficha, setFicha] = useState<FichaData | null>(null)
  const [diagnostico, setDiagnostico] = useState<DiagnosticoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([{
    id: "1",
    nombre: "",
    dosis: "",
    frecuencia: "",
    duracion: "",
    indicaciones: ""
  }])

  const [indicacionesGenerales, setIndicacionesGenerales] = useState("")
  const [recetaGuardada, setRecetaGuardada] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [fichaId])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      // Cargar ficha
      const fichaRes = await fetch(`http://localhost:8000/api/fichas/${fichaId}/`, {
        credentials: 'include',
      })
      
      if (!fichaRes.ok) throw new Error('Error al cargar ficha')
      const fichaData = await fichaRes.json()
      setFicha(fichaData)

      // Intentar cargar diagnóstico existente
      const diagRes = await fetch(`http://localhost:8000/api/diagnosticos/?ficha=${fichaId}`, {
        credentials: 'include',
      })
      
      if (diagRes.ok) {
        const diagData = await diagRes.json()
        if (diagData.results && diagData.results.length > 0) {
          const diag = diagData.results[0]
          setDiagnostico(diag)
          setIndicacionesGenerales(diag.indicaciones_medicas || "")
          
          // Si ya tiene medicamentos guardados, parsearlos
          if (diag.medicamentos_prescritos) {
            try {
              const meds = JSON.parse(diag.medicamentos_prescritos)
              console.log('🔍 Medicamentos parseados:', meds)
              
              // Verificar si hay medicamentos VÁLIDOS (con nombre y dosis)
              const medicamentosValidos = Array.isArray(meds) 
                ? meds.filter(m => m.nombre?.trim() && m.dosis?.trim())
                : []
              
              console.log('✅ Medicamentos válidos encontrados:', medicamentosValidos.length)
              
              if (medicamentosValidos.length > 0) {
                setMedicamentos(meds)
                setRecetaGuardada(true)
                console.log('✓ Receta marcada como GUARDADA')
              } else {
                // Array vacío o solo medicamentos vacíos
                setRecetaGuardada(false)
                console.log('✗ Receta marcada como NO GUARDADA (sin medicamentos válidos)')
              }
            } catch (e) {
              // Si no es JSON válido, es formato antiguo - no hay receta guardada
              setRecetaGuardada(false)
              console.log('✗ Receta marcada como NO GUARDADA (error de parse)')
            }
          } else {
            // No hay receta guardada
            setRecetaGuardada(false)
            console.log('✗ Receta marcada como NO GUARDADA (sin medicamentos_prescritos)')
          }
        }
      }
    } catch (error) {
      console.error("Error cargando datos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del paciente",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const agregarMedicamento = () => {
    const nuevoId = (parseInt(medicamentos[medicamentos.length - 1]?.id || "0") + 1).toString()
    setMedicamentos([...medicamentos, {
      id: nuevoId,
      nombre: "",
      dosis: "",
      frecuencia: "",
      duracion: "",
      indicaciones: ""
    }])
  }

  const eliminarMedicamento = (id: string) => {
    if (medicamentos.length > 1) {
      setMedicamentos(medicamentos.filter(m => m.id !== id))
    }
  }

  const actualizarMedicamento = (id: string, campo: keyof Medicamento, valor: string) => {
    setMedicamentos(medicamentos.map(m => 
      m.id === id ? { ...m, [campo]: valor } : m
    ))
  }

  const validarFormulario = () => {
    // Verificar que al menos un medicamento tenga nombre y dosis
    const medicamentosValidos = medicamentos.filter(m => m.nombre.trim() && m.dosis.trim())
    
    if (medicamentosValidos.length === 0) {
      toast({
        title: "Validación",
        description: "Debe agregar al menos un medicamento con nombre y dosis",
        variant: "destructive"
      })
      return false
    }
    
    return true
  }

  const guardarReceta = async () => {
    if (!validarFormulario()) return

    if (!diagnostico) {
      toast({
        title: "Error",
        description: "No se encontró diagnóstico asociado a esta ficha",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)

      // Filtrar medicamentos válidos
      const medicamentosValidos = medicamentos.filter(m => m.nombre.trim() && m.dosis.trim())

      // Actualizar diagnóstico con medicamentos usando la API
      if (!diagnostico.id) throw new Error('ID de diagnóstico no disponible')
      
      await diagnosticosAPI.actualizar(diagnostico.id, {
        medicamentos_prescritos: JSON.stringify(medicamentosValidos),
        indicaciones_medicas: indicacionesGenerales
      })

      setRecetaGuardada(true)
      
      toast({
        title: "Éxito",
        description: "Receta médica guardada correctamente",
      })
    } catch (error) {
      console.error("Error guardando receta:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la receta médica",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const descargarPDF = () => {
    window.open(`http://localhost:8000/api/documentos/receta/${fichaId}/`, '_blank')
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Cargando datos...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!ficha) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertDescription>No se encontró la ficha médica</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  // Log del estado antes del render
  console.log('🎨 RENDERIZANDO - recetaGuardada:', recetaGuardada)

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-950 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Receta Médica - Ficha #{fichaId}
              </h1>
            </div>
            <Button 
              onClick={() => router.push('/dashboard/medico?tab=atendidos')}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver a Pacientes Atendidos
            </Button>
          </div>
        </div>

        {/* Información del Paciente */}
        <Card className="border-slate-800 bg-slate-900/50 mb-4">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Información del Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label className="text-slate-400 text-sm">Nombre</Label>
                <p className="text-white font-semibold">
                  {ficha.paciente.esNN 
                    ? `Paciente NN (${ficha.paciente.idTemporal})`
                    : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`
                  }
                </p>
              </div>
              <div>
                <Label className="text-slate-400 text-sm">RUT</Label>
                <p className="text-white font-medium">{ficha.paciente.rut || "Sin RUT"}</p>
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Edad</Label>
                <p className="text-white font-medium">
                  {ficha.paciente.edad || ficha.paciente.edadAproximada || "-"} años
                </p>
              </div>
              <div>
                <Label className="text-slate-400 text-sm">Sexo</Label>
                <p className="text-white font-medium">{ficha.paciente.sexo}</p>
              </div>
            </div>

            {diagnostico && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded">
                <Label className="text-slate-400 text-sm">Diagnóstico</Label>
                <p className="text-white font-medium mt-1">
                  {diagnostico.diagnostico_cie10} - {diagnostico.descripcion}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulario de Medicamentos */}
        <Card className="border-slate-800 bg-slate-900/50 mb-4">
          <CardHeader className="border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <span className="text-2xl">℞</span>
                Medicamentos Prescritos ({medicamentos.length})
              </CardTitle>
              <Button 
                onClick={agregarMedicamento}
                variant="outline"
                className="border-slate-700"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Agregar Medicamento
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {medicamentos.map((med, index) => (
              <div key={med.id} className="p-4 bg-slate-800/50 rounded border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">
                    {index + 1}. {med.nombre || `Medicamento #${index + 1}`}
                  </h3>
                  {medicamentos.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarMedicamento(med.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`nombre-${med.id}`} className="text-slate-300">
                      Nombre del Medicamento *
                    </Label>
                    <Input
                      id={`nombre-${med.id}`}
                      value={med.nombre}
                      onChange={(e) => actualizarMedicamento(med.id, 'nombre', e.target.value)}
                      placeholder="Ej: Paracetamol"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor={`dosis-${med.id}`} className="text-slate-300">
                      Dosis *
                    </Label>
                    <Input
                      id={`dosis-${med.id}`}
                      value={med.dosis}
                      onChange={(e) => actualizarMedicamento(med.id, 'dosis', e.target.value)}
                      placeholder="Ej: 500mg"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor={`frecuencia-${med.id}`} className="text-slate-300">
                      Frecuencia
                    </Label>
                    <Input
                      id={`frecuencia-${med.id}`}
                      value={med.frecuencia}
                      onChange={(e) => actualizarMedicamento(med.id, 'frecuencia', e.target.value)}
                      placeholder="Ej: Cada 8 horas"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`duracion-${med.id}`} className="text-slate-300">
                      Duración
                    </Label>
                    <Input
                      id={`duracion-${med.id}`}
                      value={med.duracion}
                      onChange={(e) => actualizarMedicamento(med.id, 'duracion', e.target.value)}
                      placeholder="Ej: 7 días"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor={`indicaciones-${med.id}`} className="text-slate-300">
                      Indicaciones Específicas
                    </Label>
                    <Textarea
                      id={`indicaciones-${med.id}`}
                      value={med.indicaciones}
                      onChange={(e) => actualizarMedicamento(med.id, 'indicaciones', e.target.value)}
                      placeholder="Ej: Tomar con alimentos, no consumir alcohol..."
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {medicamentos.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <p>No hay medicamentos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Indicaciones Generales */}
        <Card className="border-slate-800 bg-slate-900/50 mb-4">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-white flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Indicaciones Generales
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Textarea
              value={indicacionesGenerales}
              onChange={(e) => setIndicacionesGenerales(e.target.value)}
              placeholder="Indicaciones adicionales para el paciente (reposo, controles, cuidados especiales, etc.)"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[120px]"
            />
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        {!recetaGuardada ? (
          <div>
            <Button
              onClick={guardarReceta}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Guardando Receta...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar Receta Médica
                </>
              )}
            </Button>
          </div>
        ) : (
          <div>
            <Alert className="mb-4 bg-emerald-500/10 border-emerald-500/30">
              <AlertDescription className="text-emerald-400">
                ✅ Receta médica guardada exitosamente. Puede descargar el PDF o modificar la receta.
              </AlertDescription>
            </Alert>
            <div className="flex gap-4">
              <Button
                onClick={() => setRecetaGuardada(false)}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modificar Receta
              </Button>
              <Button
                onClick={descargarPDF}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar Receta
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
