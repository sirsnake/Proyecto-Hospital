"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DashboardLayout from "@/components/dashboard-layout"
import { getSession } from "@/lib/auth"

export default function DocumentosFichaPage() {
  const router = useRouter()
  const params = useParams()
  const fichaId = params?.fichaId as string
  const [user, setUser] = useState<any>(null)
  const [ficha, setFicha] = useState<any>(null)
  const [diagnostico, setDiagnostico] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = getSession()
    if (!currentUser || currentUser.rol !== "medico") {
      router.push("/")
      return
    }
    setUser(currentUser)
    cargarDatos()
  }, [fichaId, router])

  const cargarDatos = async () => {
    try {
      setLoading(true)

      // Cargar ficha
      const fichaResponse = await fetch(`http://localhost:8000/api/fichas/${fichaId}/`, {
        credentials: 'include'
      })
      const fichaData = await fichaResponse.json()
      
      // Transformar datos
      const fichaTransformada = {
        ...fichaData,
        paciente: {
          nombres: fichaData.paciente.nombres,
          apellidos: fichaData.paciente.apellidos,
          rut: fichaData.paciente.rut,
          esNN: fichaData.paciente.es_nn,
          idTemporal: fichaData.paciente.id_temporal
        }
      }
      setFicha(fichaTransformada)

      // Cargar diagnóstico
      const diagResponse = await fetch(`http://localhost:8000/api/diagnosticos/?ficha=${fichaId}`, {
        credentials: 'include'
      })
      const diagData = await diagResponse.json()
      console.log('📋 Respuesta diagnósticos:', diagData)
      
      // La API devuelve un objeto con results, no un array directo
      if (diagData.results && diagData.results.length > 0) {
        console.log('✅ Diagnóstico encontrado:', diagData.results[0])
        setDiagnostico(diagData.results[0])
      } else if (Array.isArray(diagData) && diagData.length > 0) {
        // Por si acaso la API devuelve un array directo
        console.log('✅ Diagnóstico encontrado (array):', diagData[0])
        setDiagnostico(diagData[0])
      } else {
        console.log('❌ No se encontró diagnóstico')
      }

    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  const abrirPDF = (tipo: string) => {
    window.open(`http://localhost:8000/api/documentos/${tipo}/${fichaId}/`, '_blank')
  }

  // Verificar si tiene receta con medicamentos válidos
  const tieneReceta = (() => {
    console.log('🔍 Verificando receta - diagnostico:', diagnostico)
    console.log('🔍 medicamentos_prescritos:', diagnostico?.medicamentos_prescritos)
    
    if (!diagnostico?.medicamentos_prescritos) {
      console.log('❌ No hay diagnostico o medicamentos_prescritos')
      return false
    }
    
    try {
      const meds = JSON.parse(diagnostico.medicamentos_prescritos)
      console.log('✅ Medicamentos parseados:', meds)
      
      if (!Array.isArray(meds)) {
        console.log('❌ No es un array')
        return false
      }
      
      // Verificar que haya al menos un medicamento con nombre y dosis
      const medicamentosValidos = meds.filter(m => m.nombre?.trim() && m.dosis?.trim())
      console.log('✅ Medicamentos válidos:', medicamentosValidos.length)
      
      const resultado = medicamentosValidos.length > 0
      console.log('🎯 tieneReceta:', resultado)
      return resultado
    } catch (e) {
      console.log('❌ Error parseando:', e)
      return false
    }
  })()

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!ficha) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-white">No se encontró la ficha</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-950 p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Documentos y PDFs - Ficha #{fichaId}
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
        <Card className="border-slate-800 bg-slate-900/50 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Información del Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Nombre</p>
                <p className="text-white font-medium">
                  {ficha.paciente.esNN 
                    ? `Paciente NN (${ficha.paciente.idTemporal})`
                    : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`
                  }
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">RUT</p>
                <p className="text-white font-medium">{ficha.paciente.rut || "Sin RUT"}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Estado</p>
                <Badge className={
                  ficha.estado === 'en_ruta' ? 'bg-blue-500' :
                  ficha.estado === 'en_hospital' ? 'bg-yellow-500' :
                  ficha.estado === 'atendida' ? 'bg-green-500' :
                  'bg-red-500'
                }>
                  {ficha.estado === 'en_ruta' ? 'En Ruta' :
                   ficha.estado === 'en_hospital' ? 'En Hospital' :
                   ficha.estado === 'atendida' ? 'Atendida' : 'Alta'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documentos Disponibles */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Documentos Disponibles en PDF</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Ficha de Emergencia */}
            <div className="p-4 bg-slate-800/50 rounded border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Ficha de Emergencia Completa</h3>
                  <p className="text-slate-400 text-sm">Información completa del paciente y atención de emergencia</p>
                </div>
              </div>
              <Button onClick={() => abrirPDF('ficha')} className="bg-blue-600 hover:bg-blue-700">
                Ver PDF
              </Button>
            </div>

            {/* Receta Médica */}
            <div className="p-4 bg-slate-800/50 rounded border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded">
                  <span className="text-2xl text-green-400">℞</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Receta Médica</h3>
                  <p className="text-slate-400 text-sm">Prescripción de medicamentos</p>
                  {!tieneReceta && (
                    <Badge className="mt-1 bg-amber-500/20 text-amber-500">Sin receta guardada</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {tieneReceta ? (
                  <>
                    <Button onClick={() => router.push(`/dashboard/medico/receta/${fichaId}`)} className="bg-blue-600 hover:bg-blue-700">
                      Ver/Editar Receta
                    </Button>
                    <Button onClick={() => abrirPDF('receta')} className="bg-green-600 hover:bg-green-700">
                      Descargar PDF
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => router.push(`/dashboard/medico/receta/${fichaId}`)} className="bg-blue-600 hover:bg-blue-700">
                    Crear Receta
                  </Button>
                )}
              </div>
            </div>

            {/* Orden de Exámenes */}
            {diagnostico && (
              <div className="p-4 bg-slate-800/50 rounded border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/10 rounded">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Orden de Exámenes</h3>
                    <p className="text-slate-400 text-sm">Solicitudes de exámenes de laboratorio</p>
                  </div>
                </div>
                <Button onClick={() => abrirPDF('orden-examenes')} className="bg-purple-600 hover:bg-purple-700">
                  Ver PDF
                </Button>
              </div>
            )}

            {/* Alta Médica */}
            {ficha.estado === 'alta' && diagnostico && (
              <div className="p-4 bg-slate-800/50 rounded border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 rounded">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Alta Médica</h3>
                    <p className="text-slate-400 text-sm">Certificado de alta del paciente</p>
                  </div>
                </div>
                <Button onClick={() => abrirPDF('alta')} className="bg-emerald-600 hover:bg-emerald-700">
                  Ver PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
