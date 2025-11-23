import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()


class NotificacionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Conectar el WebSocket y unirse al grupo de notificaciones del usuario"""
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return
        
        # Nombre del grupo específico del usuario
        self.room_group_name = f'notificaciones_{self.user.id}'
        
        # Unirse al grupo
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Enviar confirmación de conexión
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Conectado al sistema de notificaciones',
            'user_id': self.user.id,
            'username': self.user.username
        }))
    
    async def disconnect(self, close_code):
        """Desconectar el WebSocket"""
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Recibir mensajes del cliente (WebSocket)"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                # Responder a ping para mantener la conexión
                await self.send(text_data=json.dumps({
                    'type': 'pong'
                }))
            elif message_type == 'marcar_leida':
                # Marcar notificación como leída
                notif_id = data.get('notificacion_id')
                if notif_id:
                    await self.marcar_notificacion_leida(notif_id)
                    await self.send(text_data=json.dumps({
                        'type': 'notificacion_marcada',
                        'notificacion_id': notif_id
                    }))
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Formato de mensaje inválido'
            }))
    
    async def notificacion_nueva(self, event):
        """Enviar notificación nueva al cliente"""
        await self.send(text_data=json.dumps({
            'type': 'nueva_notificacion',
            'notificacion': event['notificacion']
        }))
    
    @database_sync_to_async
    def marcar_notificacion_leida(self, notificacion_id):
        """Marcar una notificación como leída en la base de datos"""
        from .models import Notificacion
        from django.utils import timezone
        
        try:
            notificacion = Notificacion.objects.get(
                id=notificacion_id,
                usuario_destinatario=self.user
            )
            notificacion.leida = True
            notificacion.fecha_lectura = timezone.now()
            notificacion.save()
            return True
        except Notificacion.DoesNotExist:
            return False
