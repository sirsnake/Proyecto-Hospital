from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import FichaEmergencia, SolicitudMedicamento, SolicitudExamen, SignosVitales, Diagnostico, Notificacion, Usuario
import json


def enviar_notificacion_websocket(usuario_id, notificacion_data):
    """Enviar notificación a través de WebSocket"""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'notificaciones_{usuario_id}',
        {
            'type': 'notificacion_nueva',
            'notificacion': notificacion_data
        }
    )


def crear_y_enviar_notificacion(tipo, titulo, mensaje, usuario_destinatario, ficha=None, datos_extra=None):
    """Crear una notificación en la BD y enviarla por WebSocket"""
    notificacion = Notificacion.objects.create(
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
        usuario_destinatario=usuario_destinatario,
        ficha=ficha,
        datos_extra=datos_extra or {}
    )
    
    # Enviar por WebSocket
    enviar_notificacion_websocket(usuario_destinatario.id, {
        'id': notificacion.id,
        'tipo': notificacion.tipo,
        'titulo': notificacion.titulo,
        'mensaje': notificacion.mensaje,
        'ficha_id': ficha.id if ficha else None,
        'fecha_creacion': notificacion.fecha_creacion.isoformat(),
        'leida': notificacion.leida,
        'datos_extra': notificacion.datos_extra
    })
    
    return notificacion


@receiver(post_save, sender=FichaEmergencia)
def notificar_nueva_ficha(sender, instance, created, **kwargs):
    """Notificar cuando se crea una nueva ficha de emergencia"""
    if created:
        # Notificar a todos los médicos
        medicos = Usuario.objects.filter(rol='medico', is_active=True)
        for medico in medicos:
            crear_y_enviar_notificacion(
                tipo='nueva_ficha',
                titulo='Nueva Ficha de Emergencia',
                mensaje=f'Paciente: {instance.paciente.nombres} {instance.paciente.apellidos}. '
                       f'Prioridad: {instance.get_prioridad_display()}. '
                       f'Motivo: {instance.motivo_consulta[:100]}',
                usuario_destinatario=medico,
                ficha=instance,
                datos_extra={
                    'paciente_id': instance.paciente.id,
                    'prioridad': instance.prioridad,
                    'paramedico': instance.paramedico.get_full_name()
                }
            )


@receiver(post_save, sender=SolicitudMedicamento)
def notificar_solicitud_medicamento(sender, instance, created, **kwargs):
    """Notificar cuando se solicita un medicamento"""
    if created:
        # Notificar al paramédico de la ficha
        if instance.ficha.paramedico:
            crear_y_enviar_notificacion(
                tipo='solicitud_medicamento',
                titulo='Nueva Solicitud de Medicamento',
                mensaje=f'Medicamento: {instance.medicamento}. '
                       f'Vía: {instance.via_administracion}. '
                       f'Paciente: {instance.ficha.paciente.nombres} {instance.ficha.paciente.apellidos}',
                usuario_destinatario=instance.ficha.paramedico,
                ficha=instance.ficha,
                datos_extra={
                    'medicamento': instance.medicamento,
                    'dosis': instance.dosis,
                    'via': instance.via_administracion
                }
            )


@receiver(post_save, sender=SolicitudExamen)
def notificar_solicitud_examen(sender, instance, created, **kwargs):
    """Notificar cuando se solicita un examen"""
    if created:
        # Notificar al paramédico de la ficha
        if instance.ficha.paramedico:
            crear_y_enviar_notificacion(
                tipo='solicitud_examen',
                titulo='Nueva Solicitud de Examen',
                mensaje=f'Tipo: {instance.tipo_examen}. '
                       f'Exámenes: {instance.examenes_especificos}. '
                       f'Paciente: {instance.ficha.paciente.nombres} {instance.ficha.paciente.apellidos}',
                usuario_destinatario=instance.ficha.paramedico,
                ficha=instance.ficha,
                datos_extra={
                    'tipo_examen': instance.tipo_examen,
                    'examenes': instance.examenes_especificos
                }
            )


@receiver(post_save, sender=SignosVitales)
def notificar_signos_vitales(sender, instance, created, **kwargs):
    """Notificar cuando TENS registra signos vitales"""
    if created:
        # Notificar al médico asignado si existe
        medicos = Usuario.objects.filter(rol='medico', is_active=True)
        for medico in medicos:
            crear_y_enviar_notificacion(
                tipo='signos_vitales',
                titulo='Nuevos Signos Vitales Registrados',
                mensaje=f'TENS ha registrado signos vitales. '
                       f'PA: {instance.presion_sistolica}/{instance.presion_diastolica} mmHg. '
                       f'FC: {instance.frecuencia_cardiaca} lpm. '
                       f'Paciente: {instance.ficha.paciente.nombres} {instance.ficha.paciente.apellidos}',
                usuario_destinatario=medico,
                ficha=instance.ficha,
                datos_extra={
                    'presion_sistolica': instance.presion_sistolica,
                    'presion_diastolica': instance.presion_diastolica,
                    'frecuencia_cardiaca': instance.frecuencia_cardiaca,
                    'glasgow': instance.escala_glasgow
                }
            )


@receiver(post_save, sender=Diagnostico)
def notificar_diagnostico(sender, instance, created, **kwargs):
    """Notificar cuando se registra un diagnóstico"""
    if created:
        # Notificar al paramédico de la ficha
        if instance.ficha.paramedico:
            crear_y_enviar_notificacion(
                tipo='diagnostico' if instance.tipo_alta == 'hospitalizado' else 'alta_medica',
                titulo='Nuevo Diagnóstico' if instance.tipo_alta == 'hospitalizado' else 'Alta Médica',
                mensaje=f'Diagnóstico: {instance.diagnostico}. '
                       f'CIE-10: {instance.codigo_cie10}. '
                       f'Tipo de alta: {instance.get_tipo_alta_display()}. '
                       f'Paciente: {instance.ficha.paciente.nombres} {instance.ficha.paciente.apellidos}',
                usuario_destinatario=instance.ficha.paramedico,
                ficha=instance.ficha,
                datos_extra={
                    'diagnostico': instance.diagnostico,
                    'codigo_cie10': instance.codigo_cie10,
                    'tipo_alta': instance.tipo_alta
                }
            )


@receiver(pre_save, sender=FichaEmergencia)
def notificar_cambio_estado(sender, instance, **kwargs):
    """Notificar cuando cambia el estado de una ficha"""
    if instance.pk:  # Solo si la ficha ya existe
        try:
            ficha_anterior = FichaEmergencia.objects.get(pk=instance.pk)
            if ficha_anterior.estado != instance.estado:
                # Notificar al paramédico
                if instance.paramedico:
                    crear_y_enviar_notificacion(
                        tipo='cambio_estado',
                        titulo='Cambio de Estado de Ficha',
                        mensaje=f'La ficha cambió de "{ficha_anterior.get_estado_display()}" '
                               f'a "{instance.get_estado_display()}". '
                               f'Paciente: {instance.paciente.nombres} {instance.paciente.apellidos}',
                        usuario_destinatario=instance.paramedico,
                        ficha=instance,
                        datos_extra={
                            'estado_anterior': ficha_anterior.estado,
                            'estado_nuevo': instance.estado
                        }
                    )
        except FichaEmergencia.DoesNotExist:
            pass
