"""
WebSocket consumers para chat en tiempo real entre paramédico, TENS y médico
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class ChatConsumer(AsyncWebsocketConsumer):
    """Consumer para el chat de una ficha de emergencia"""
    
    async def connect(self):
        self.ficha_id = self.scope['url_route']['kwargs']['ficha_id']
        self.room_group_name = f'chat_ficha_{self.ficha_id}'
        self.user = self.scope['user']
        
        # Solo usuarios autenticados pueden conectarse
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Unirse al grupo de la ficha
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Notificar que el usuario se conectó
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_join',
                'user_id': self.user.id,
                'user_name': self.user.get_full_name(),
                'user_rol': self.user.rol,
            }
        )
    
    async def disconnect(self, close_code):
        # Notificar que el usuario se desconectó
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_leave',
                    'user_id': self.user.id,
                    'user_name': self.user.get_full_name(),
                }
            )
            
            # Salir del grupo
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Recibe mensaje del WebSocket"""
        data = json.loads(text_data)
        message_type = data.get('type', 'chat_message')
        
        if message_type == 'chat_message':
            contenido = data.get('contenido', '').strip()
            # Soportar ambos nombres: archivo_id y archivo_adjunto_id
            archivo_id = data.get('archivo_id') or data.get('archivo_adjunto_id')
            
            if not contenido and not archivo_id:
                return
            
            # Guardar mensaje en la base de datos
            mensaje = await self.save_message(contenido, archivo_id)
            
            if mensaje:
                # Enviar mensaje a todos en el grupo con formato completo
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'mensaje': mensaje,
                    }
                )
        
        elif message_type == 'typing':
            # Notificar que el usuario está escribiendo
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing',
                    'user_id': self.user.id,
                    'username': self.user.get_full_name() or self.user.username,
                }
            )
        
        elif message_type == 'stop_typing':
            # Notificar que el usuario dejó de escribir
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'stop_typing',
                    'user_id': self.user.id,
                    'username': self.user.get_full_name() or self.user.username,
                }
            )
        
        elif message_type == 'mark_read':
            # Marcar mensajes como leídos
            mensaje_ids = data.get('mensaje_ids', [])
            await self.mark_messages_read(mensaje_ids)
            
            # Notificar a todos que los mensajes fueron leídos
            for msg_id in mensaje_ids:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'message_read',
                        'mensaje_id': msg_id,
                        'user_id': self.user.id,
                    }
                )
    
    async def chat_message(self, event):
        """Envía mensaje al WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'mensaje': event['mensaje'],
        }))
    
    async def user_join(self, event):
        """Notifica que un usuario se unió al chat"""
        await self.send(text_data=json.dumps({
            'type': 'user_join',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'user_rol': event['user_rol'],
        }))
    
    async def user_leave(self, event):
        """Notifica que un usuario salió del chat"""
        await self.send(text_data=json.dumps({
            'type': 'user_leave',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
        }))
    
    async def typing(self, event):
        """Notifica que un usuario está escribiendo"""
        # No enviar a sí mismo
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
            }))
    
    async def stop_typing(self, event):
        """Notifica que un usuario dejó de escribir"""
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'stop_typing',
                'user_id': event['user_id'],
                'username': event['username'],
            }))
    
    async def message_read(self, event):
        """Notifica que un mensaje fue leído"""
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'mensaje_id': event['mensaje_id'],
            'user_id': event['user_id'],
        }))
    
    @database_sync_to_async
    def save_message(self, contenido, archivo_id=None):
        """Guarda el mensaje en la base de datos y retorna formato para el frontend"""
        from .models import MensajeChat, FichaEmergencia, ArchivoAdjunto
        
        try:
            ficha = FichaEmergencia.objects.get(id=self.ficha_id)
            
            archivo = None
            if archivo_id:
                try:
                    archivo = ArchivoAdjunto.objects.get(id=archivo_id, ficha=ficha)
                except ArchivoAdjunto.DoesNotExist:
                    archivo = None
            
            mensaje = MensajeChat.objects.create(
                ficha=ficha,
                autor=self.user,
                contenido=contenido,
                archivo_adjunto=archivo,
            )
            
            # Construir datos del archivo adjunto si existe
            archivo_adjunto_data = None
            if mensaje.archivo_adjunto:
                archivo_adjunto_data = {
                    'id': mensaje.archivo_adjunto.id,
                    'nombre_original': mensaje.archivo_adjunto.nombre_original,
                    'archivo': mensaje.archivo_adjunto.archivo.url if mensaje.archivo_adjunto.archivo else None,
                    'tipo': mensaje.archivo_adjunto.tipo,
                    'tamano': mensaje.archivo_adjunto.tamano,
                    'fecha_subida': mensaje.archivo_adjunto.fecha_subida.isoformat(),
                }
            
            # Retornar en el formato que espera el frontend
            return {
                'id': mensaje.id,
                'ficha': mensaje.ficha_id,
                'autor': {
                    'id': mensaje.autor.id,
                    'username': mensaje.autor.username,
                    'first_name': mensaje.autor.first_name or mensaje.autor.username,
                    'last_name': mensaje.autor.last_name or '',
                    'rol': mensaje.autor.rol,
                },
                'contenido': mensaje.contenido,
                'archivo_adjunto': archivo_adjunto_data,
                'fecha_envio': mensaje.fecha_envio.isoformat(),
                'leido_por': [mensaje.autor.id],  # El autor siempre ha "leído" su propio mensaje
            }
        except FichaEmergencia.DoesNotExist:
            return None
    
    @database_sync_to_async
    def mark_messages_read(self, mensaje_ids):
        """Marca mensajes como leídos por el usuario actual"""
        from .models import MensajeChat
        
        mensajes = MensajeChat.objects.filter(id__in=mensaje_ids, ficha_id=self.ficha_id)
        for mensaje in mensajes:
            mensaje.marcar_como_leido(self.user)
