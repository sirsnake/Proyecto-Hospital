"use client"

import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { documentosAPI } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import type { FichaEmergencia } from "@/lib/types"

interface ModalDiagnosticoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ficha: FichaEmergencia | null
  onConfirm: (diagnostico: any) => void
}

export function ModalDiagnostico({ open, onOpenChange, ficha, onConfirm }: ModalDiagnosticoProps) {
  const [formData, setFormData] = useState({
    codigoCIE10: "",
    diagnostico: "",
    descripcion: "",
    indicaciones: "",
    medicamentos: "",
    tipoAlta: "",
  })

  const [error, setError] = useState("")
  const [guardado, setGuardado] = useState(false)

  const handleDescargarFicha = async () => {
    if (!ficha) return
    try {
      await documentosAPI.descargarFichaPDF(ficha.id)
      toast({
        title: "PDF descargado",
        description: "La ficha completa ha sido descargada",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar la ficha",
        variant: "destructive",
      })
    }
  }

  const handleDescargarReceta = async () => {
    if (!ficha) return
    try {
      await documentosAPI.descargarRecetaPDF(ficha.id)
      toast({
        title: "PDF descargado",
        description: "La receta médica ha sido descargada",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar la receta",
        variant: "destructive",
      })
    }
  }

  const handleDescargarOrdenExamenes = async () => {
    if (!ficha) return
    try {
      await documentosAPI.descargarOrdenExamenesPDF(ficha.id)
      toast({
        title: "PDF descargado",
        description: "La orden de exámenes ha sido descargada",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar la orden de exámenes",
        variant: "destructive",
      })
    }
  }

  const handleDescargarAlta = async () => {
    if (!ficha) return
    try {
      await documentosAPI.descargarAltaPDF(ficha.id)
      toast({
        title: "PDF descargado",
        description: "El documento de alta médica ha sido descargado",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar el alta médica",
        variant: "destructive",
      })
    }
  }

  const handleConfirm = () => {
    setError("")
    
    if (!formData.codigoCIE10 || !formData.diagnostico || !formData.indicaciones || !formData.tipoAlta) {
      setError('⚠️ Por favor complete todos los campos obligatorios: Código CIE-10, Diagnóstico, Indicaciones y Tipo de Alta')
      return
    }
    
    console.log('📋 Datos del diagnóstico a enviar:', formData)
    onConfirm(formData)
    setGuardado(true)
    
    // NO resetear automáticamente - mantener los botones de PDF visible
  }

  if (!ficha) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Diagnóstico y Alta Médica</DialogTitle>
          <DialogDescription className="text-slate-400">
            Paciente:{" "}
            {ficha.paciente.esNN
              ? `NN (${ficha.paciente.idTemporal})`
              : `${ficha.paciente.nombres} ${ficha.paciente.apellidos}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumen del Caso */}
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Resumen del Caso</h4>
            <p className="text-sm text-slate-300 mb-2">
              <strong>Motivo:</strong> {ficha.motivoConsulta}
            </p>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-slate-400">PA:</span>{" "}
                <span className="text-white">
                  {ficha.signosVitales.presionSistolica}/{ficha.signosVitales.presionDiastolica}
                </span>
              </div>
              <div>
                <span className="text-slate-400">FC:</span>{" "}
                <span className="text-white">{ficha.signosVitales.frecuenciaCardiaca}</span>
              </div>
              <div>
                <span className="text-slate-400">SatO₂:</span>{" "}
                <span className="text-white">{ficha.signosVitales.saturacionO2}%</span>
              </div>
              <div>
                <span className="text-slate-400">Temp:</span>{" "}
                <span className="text-white">{ficha.signosVitales.temperatura}°C</span>
              </div>
            </div>
          </div>

          {/* Alergias Críticas */}
          {ficha.anamnesis?.alergiasCriticas && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm font-semibold text-red-500">⚠️ ALERGIAS MEDICAMENTOSAS:</p>
              <p className="text-sm text-red-400">{ficha.anamnesis.alergiasMedicamentosas.join(", ")}</p>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
              <p className="text-sm font-semibold text-red-500">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="codigo-cie10" className="text-slate-300">
              Código CIE-10 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="codigo-cie10"
              placeholder="Ej: I21.9"
              value={formData.codigoCIE10}
              onChange={(e) => setFormData({ ...formData, codigoCIE10: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnostico" className="text-slate-300">
              Diagnóstico Principal <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="diagnostico"
              placeholder="Ej: Infarto agudo del miocardio"
              value={formData.diagnostico}
              onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion" className="text-slate-300">
              Observaciones Adicionales
            </Label>
            <Textarea
              id="descripcion"
              placeholder="Detalles adicionales del cuadro clínico, evolución, hallazgos..."
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="indicaciones" className="text-slate-300">
              Indicaciones Médicas <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="indicaciones"
              placeholder="Reposo absoluto, control de signos vitales cada 4 horas..."
              value={formData.indicaciones}
              onChange={(e) => setFormData({ ...formData, indicaciones: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicamentos" className="text-slate-300">
              Medicamentos Prescritos
            </Label>
            <Textarea
              id="medicamentos"
              placeholder="Aspirina 100mg cada 24 horas&#10;Enalapril 10mg cada 12 horas..."
              value={formData.medicamentos}
              onChange={(e) => setFormData({ ...formData, medicamentos: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo-alta" className="text-slate-300">
              Tipo de Alta <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.tipoAlta} onValueChange={(value) => setFormData({ ...formData, tipoAlta: value })}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Seleccionar tipo de alta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="domicilio">Alta a Domicilio</SelectItem>
                <SelectItem value="hospitalizacion">Hospitalización</SelectItem>
                <SelectItem value="derivacion">Derivación a Especialista</SelectItem>
                <SelectItem value="uci">Ingreso a UCI</SelectItem>
                <SelectItem value="fallecido">Fallecido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {guardado && (
          <Alert className="bg-green-900/20 border-green-700">
            <AlertDescription className="text-green-400">
              ✅ Diagnóstico guardado exitosamente. Ahora puede imprimir los documentos necesarios.
            </AlertDescription>
          </Alert>
        )}

        {guardado ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={handleDescargarFicha}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ficha Completa
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleDescargarReceta}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Receta Médica
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleDescargarOrdenExamenes}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Orden de Exámenes
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                onClick={handleDescargarAlta}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Alta Médica
              </Button>
            </div>
            <Button 
              variant="outline" 
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800" 
              onClick={() => {
                setGuardado(false)
                setFormData({
                  codigoCIE10: "",
                  diagnostico: "",
                  descripcion: "",
                  indicaciones: "",
                  medicamentos: "",
                  tipoAlta: "",
                })
                onOpenChange(false)
              }}
            >
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={handleConfirm}
              disabled={!formData.codigoCIE10 || !formData.diagnostico || !formData.indicaciones || !formData.tipoAlta}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Guardar Diagnóstico
            </Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
