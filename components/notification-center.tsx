"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useNotifications } from "@/hooks/use-notifications"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export function NotificationCenter() {
  const { notificaciones, noLeidas, conectado, marcarLeida, marcarTodasLeidas } = useNotifications()

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'nueva_ficha':
        return '🆕'
      case 'solicitud_medicamento':
        return '💊'
      case 'solicitud_examen':
        return '🔬'
      case 'cambio_estado':
        return '🔄'
      case 'signos_vitales':
        return '❤️'
      case 'diagnostico':
        return '📋'
      case 'alta_medica':
        return '🏥'
      default:
        return '📢'
    }
  }

  const getBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'nueva_ficha':
        return 'bg-blue-500'
      case 'solicitud_medicamento':
        return 'bg-purple-500'
      case 'solicitud_examen':
        return 'bg-cyan-500'
      case 'cambio_estado':
        return 'bg-amber-500'
      case 'signos_vitales':
        return 'bg-red-500'
      case 'diagnostico':
        return 'bg-green-500'
      case 'alta_medica':
        return 'bg-emerald-500'
      default:
        return 'bg-slate-500'
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {noLeidas > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500"
              variant="destructive"
            >
              {noLeidas > 99 ? '99+' : noLeidas}
            </Badge>
          )}
          {!conectado && (
            <span className="absolute bottom-0 right-0 h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notificaciones</h3>
            {!conectado && (
              <Badge variant="outline" className="text-xs">
                Reconectando...
              </Badge>
            )}
          </div>
          {noLeidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={marcarTodasLeidas}
              className="text-xs"
            >
              Marcar todas leídas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No hay notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notificaciones.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notif.leida ? 'bg-blue-500/5' : ''
                  }`}
                  onClick={() => !notif.leida && marcarLeida(notif.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notif.tipo)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">
                          {notif.titulo}
                        </p>
                        {!notif.leida && (
                          <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notif.mensaje}
                      </p>
                      {notif.paciente_nombre && (
                        <p className="text-xs text-muted-foreground mt-1">
                          👤 {notif.paciente_nombre}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getBadgeColor(notif.tipo)} text-white border-0`}
                        >
                          {notif.tipo_display}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notif.fecha_creacion), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
