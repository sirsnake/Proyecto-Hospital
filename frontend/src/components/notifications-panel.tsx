import React, { useRef } from "react"
import { Bell, X, CheckCircle, Clock, AlertTriangle, FileText, Pill, MessageCircle, Activity, Bed, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useNotifications, type Notificacion } from "@/hooks/use-notifications"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

const getIconByType = (tipo: string) => {
  switch (tipo) {
    case 'nueva_ficha':
    case 'ficha_llegada':
      return <UserPlus className="w-4 h-4" />
    case 'solicitud_medicamento':
    case 'medicamento_autorizado':
    case 'medicamento_rechazado':
      return <Pill className="w-4 h-4" />
    case 'nuevos_signos':
    case 'signos_criticos':
      return <Activity className="w-4 h-4" />
    case 'mensaje_chat':
      return <MessageCircle className="w-4 h-4" />
    case 'examen_solicitado':
    case 'examen_completado':
      return <FileText className="w-4 h-4" />
    case 'cama_asignada':
    case 'hospitalizacion':
    case 'ingreso_uci':
      return <Bed className="w-4 h-4" />
    case 'tiempo_espera':
      return <Clock className="w-4 h-4" />
    default:
      return <Bell className="w-4 h-4" />
  }
}

const getPriorityStyles = (prioridad: Notificacion["prioridad"]) => {
  switch (prioridad) {
    case 'urgente':
      return { dot: 'bg-red-500', bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', icon: 'text-red-400' }
    case 'alta':
      return { dot: 'bg-orange-500', bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400', icon: 'text-orange-400' }
    case 'media':
      return { dot: 'bg-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400', icon: 'text-yellow-400' }
    case 'baja':
    default:
      return { dot: 'bg-blue-500', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', icon: 'text-blue-400' }
  }
}

export type NotificationAction = {
  type: 'navigate' | 'chat' | 'signos' | 'examen'
  fichaId?: number
}

function NotificationItem({ notif, onMarkRead, onAction }: { 
  notif: Notificacion
  onMarkRead: (id: number) => void
  onAction?: (action: NotificationAction) => void
}) {
  const styles = getPriorityStyles(notif.prioridad)
  
  const handleClick = () => {
    onMarkRead(notif.id)
    if (!notif.ficha || !onAction) return
    switch (notif.tipo) {
      case 'mensaje_chat':
        onAction({ type: 'chat', fichaId: notif.ficha })
        break
      case 'signos_criticos':
      case 'nuevos_signos':
        onAction({ type: 'signos', fichaId: notif.ficha })
        break
      case 'examen_completado':
      case 'examen_solicitado':
        onAction({ type: 'examen', fichaId: notif.ficha })
        break
      default:
        onAction({ type: 'navigate', fichaId: notif.ficha })
    }
  }
  
  const getQuickActionText = () => {
    switch (notif.tipo) {
      case 'mensaje_chat': return '💬 Abrir chat'
      case 'signos_criticos':
      case 'nuevos_signos': return '📊 Ver signos'
      case 'examen_completado': return '📋 Ver resultados'
      default: return null
    }
  }
  
  const quickActionText = getQuickActionText()
  
  return (
    <div className={cn("p-4 border-b border-slate-700/50 hover:bg-slate-800/50 cursor-pointer transition-all duration-200 group", notif.prioridad === 'urgente' && "animate-pulse")} onClick={handleClick}>
      <div className="flex items-start gap-3">
        <div className={cn("w-2 h-2 mt-2 rounded-full flex-shrink-0", styles.dot)} />
        <div className={cn("mt-0.5", styles.icon)}>{getIconByType(notif.tipo)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-white leading-tight">{notif.titulo}</p>
            {notif.prioridad === 'urgente' && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 animate-pulse" />}
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{notif.mensaje}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3 h-3" />
              <span className="text-[10px]">{notif.tiempo_transcurrido || new Date(notif.fecha_creacion).toLocaleString('es-CL')}</span>
            </div>
            {notif.ficha && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Ficha #{notif.ficha}</Badge>}
            {quickActionText && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{quickActionText}</Badge>}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id) }}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

function NotificationsContent({ notificaciones, onMarkRead, onMarkAllRead, onAction, conteo, maxHeight = "400px" }: {
  notificaciones: Notificacion[]
  onMarkRead: (id: number) => void
  onMarkAllRead: () => void
  onAction?: (action: NotificationAction) => void
  conteo: { urgente: number; alta: number; media: number; baja: number }
  maxHeight?: string
}) {
  return (
    <div className="flex flex-col overflow-hidden" style={{ maxHeight }}>
      {notificaciones.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700/50 bg-slate-800/30 flex-shrink-0">
          {conteo.urgente > 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">{conteo.urgente} urgente{conteo.urgente > 1 ? 's' : ''}</Badge>}
          {conteo.alta > 0 && <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">{conteo.alta} alta{conteo.alta > 1 ? 's' : ''}</Badge>}
          {conteo.media > 0 && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">{conteo.media} media{conteo.media > 1 ? 's' : ''}</Badge>}
          {conteo.baja > 0 && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">{conteo.baja} baja{conteo.baja > 1 ? 's' : ''}</Badge>}
        </div>
      )}
      <div className="flex-1 overflow-y-auto min-h-0">
        {notificaciones.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <Bell className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-sm text-slate-400 font-medium">Sin notificaciones nuevas</p>
            <p className="text-xs text-slate-500 mt-1">Las alertas importantes aparecerán aquí</p>
          </div>
        ) : (
          <div>{notificaciones.map((notif) => <NotificationItem key={notif.id} notif={notif} onMarkRead={onMarkRead} onAction={onAction} />)}</div>
        )}
      </div>
      {notificaciones.length > 0 && (
        <div className="p-3 border-t border-slate-700/50 bg-slate-800/30 flex-shrink-0">
          <Button variant="ghost" size="sm" className="w-full text-xs text-slate-400 hover:text-white hover:bg-slate-700" onClick={onMarkAllRead}>
            <CheckCircle className="w-3 h-3 mr-2" />Marcar todas como leídas
          </Button>
        </div>
      )}
    </div>
  )
}

export function NotificationsPanel({ onNavigateToFicha, onOpenChat, onViewSignos }: { 
  onNavigateToFicha?: (fichaId: number) => void 
  onOpenChat?: (fichaId: number) => void
  onViewSignos?: (fichaId: number) => void
}) {
  const isMobile = useIsMobile()
  const { notificaciones, count, newUrgent, marcarLeida, marcarTodasLeidas, contarPorPrioridad } = useNotifications(true, 15000)
  const [isOpen, setIsOpen] = React.useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const conteo = contarPorPrioridad()
  const hasUrgent = conteo.urgente > 0 || conteo.alta > 0
  
  const handleAction = (action: NotificationAction) => {
    setIsOpen(false)
    if (!action.fichaId) return
    switch (action.type) {
      case 'chat':
        onOpenChat ? onOpenChat(action.fichaId) : onNavigateToFicha?.(action.fichaId)
        break
      case 'signos':
        onViewSignos ? onViewSignos(action.fichaId) : onNavigateToFicha?.(action.fichaId)
        break
      default:
        onNavigateToFicha?.(action.fichaId)
    }
  }
  
  const handleMarkRead = async (id: number) => { await marcarLeida(id) }
  const handleMarkAllRead = async () => { await marcarTodasLeidas(); setIsOpen(false) }

  const TriggerButton = (
    <Button ref={triggerRef} variant="ghost" size="icon" className={cn("relative text-slate-400 hover:text-white hover:bg-slate-800 transition-all", newUrgent && "animate-bounce", hasUrgent && "text-red-400")} onClick={() => isMobile && setIsOpen(true)}>
      <Bell className={cn("w-5 h-5", hasUrgent && "text-red-400")} />
      {count > 0 && <span className={cn("absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white px-1", hasUrgent ? "bg-red-500 animate-pulse" : "bg-blue-500")}>{count > 99 ? "99+" : count}</span>}
    </Button>
  )

  if (isMobile) {
    return (
      <>
        {TriggerButton}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="right" className="w-full sm:w-96 p-0 bg-slate-900 border-slate-800">
            <SheetHeader className="p-4 border-b border-slate-800">
              <SheetTitle className="flex items-center justify-between text-white">
                <span className="flex items-center gap-2"><Bell className="w-5 h-5" />Notificaciones</span>
                <Badge variant="secondary">{count}</Badge>
              </SheetTitle>
            </SheetHeader>
            <NotificationsContent notificaciones={notificaciones} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} onAction={handleAction} conteo={conteo} maxHeight="calc(100vh - 100px)" />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{TriggerButton}</PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-slate-900 border-slate-800 shadow-2xl" align="end" sideOffset={8}>
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2"><Bell className="w-4 h-4" />Notificaciones</h3>
          <Badge variant="secondary" className="text-xs">{count}</Badge>
        </div>
        <NotificationsContent notificaciones={notificaciones} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} onAction={handleAction} conteo={conteo} maxHeight="60vh" />
      </PopoverContent>
    </Popover>
  )
}
