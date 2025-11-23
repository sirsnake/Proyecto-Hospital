"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { FichaEmergencia } from "@/lib/types"

interface ModalExamenesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ficha: FichaEmergencia | null
  onConfirm: (solicitud: any) => void
}

export function ModalExamenes({ open, onOpenChange, ficha, onConfirm }: ModalExamenesProps) {
  const [formData, setFormData] = useState({
    tipoExamen: "",
    examenesEspecificos: "",
    justificacion: "",
    prioridad: "normal",
  })
  const [error, setError] = useState("")

  const handleConfirm = () => {
    setError("")
    
    if (!formData.tipoExamen || !formData.examenesEspecificos || !formData.justificacion) {
      setError('⚠️ Por favor complete todos los campos obligatorios: Tipo de Examen, Exámenes Específicos y Justificación Clínica')
      return
    }
    
    console.log('🧪 Datos de solicitud de exámenes:', formData)
    onConfirm(formData)
    
    // Resetear formulario
    setFormData({
      tipoExamen: "",
      examenesEspecificos: "",
      justificacion: "",
      prioridad: "normal",
    })
  }

  if (!ficha) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Solicitar Exámenes de Laboratorio</DialogTitle>
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

          {/* Error Alert */}
          {error && (
            <Alert className="bg-red-500/10 border-red-500">
              <AlertDescription className="text-red-500 font-semibold">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="tipo-examen" className="text-slate-300">
              Tipo de Examen <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.tipoExamen} onValueChange={(value) => setFormData({ ...formData, tipoExamen: value })}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Seleccionar tipo de examen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="laboratorio">Laboratorio Clínico</SelectItem>
                <SelectItem value="imagenes">Imágenes (Rx, TAC, RMN)</SelectItem>
                <SelectItem value="ecg">Electrocardiograma</SelectItem>
                <SelectItem value="gases">Gases Arteriales</SelectItem>
                <SelectItem value="microbiologia">Microbiología</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="examenes-especificos" className="text-slate-300">
              Exámenes Específicos <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="examenes-especificos"
              placeholder="Ej: Hemograma completo, PCR, Electrolitos plasmáticos..."
              value={formData.examenesEspecificos}
              onChange={(e) => setFormData({ ...formData, examenesEspecificos: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="justificacion" className="text-slate-300">
              Justificación Clínica <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="justificacion"
              placeholder="Justificación médica para la solicitud de exámenes..."
              value={formData.justificacion}
              onChange={(e) => setFormData({ ...formData, justificacion: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prioridad" className="text-slate-300">
              Prioridad
            </Label>
            <Select value={formData.prioridad} onValueChange={(value) => setFormData({ ...formData, prioridad: value })}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgente">🔴 Urgente</SelectItem>
                <SelectItem value="normal">🟡 Normal</SelectItem>
                <SelectItem value="diferido">🟢 Diferido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            onClick={handleConfirm}
            disabled={!formData.tipoExamen || !formData.examenesEspecificos || !formData.justificacion}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Solicitar Exámenes
          </Button>
          <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
