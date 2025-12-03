"""
Utilidades compartidas para el proyecto Hospital
"""
from .models import AuditLog


def get_client_ip(request):
    """Obtiene la IP del cliente desde el request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_audit(request, accion: str, modelo: str, objeto_id: int = None, detalles: dict = None):
    """
    Helper para crear registros de auditoría de forma consistente.
    
    Args:
        request: Request de Django
        accion: Tipo de acción (crear, modificar, eliminar, ver, etc.)
        modelo: Nombre del modelo afectado
        objeto_id: ID del objeto afectado (opcional)
        detalles: Diccionario con detalles adicionales (opcional)
    
    Returns:
        AuditLog: El registro de auditoría creado
    """
    return AuditLog.objects.create(
        usuario=request.user if request.user.is_authenticated else None,
        accion=accion,
        modelo=modelo,
        objeto_id=objeto_id,
        detalles=detalles or {},
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]  # Limitar longitud
    )


def obtener_nombre_paciente(ficha) -> str:
    """
    Obtiene el nombre del paciente de forma consistente.
    
    Args:
        ficha: FichaEmergencia con relación a paciente
    
    Returns:
        str: Nombre del paciente o identificador NN
    """
    if not ficha or not ficha.paciente:
        return "Paciente desconocido"
    
    paciente = ficha.paciente
    if paciente.es_nn:
        return f"Paciente NN ({paciente.id_temporal or 'Sin ID'})"
    
    return f"{paciente.nombres} {paciente.apellidos}".strip() or "Sin nombre"


class SignosVitalesValidationMixin:
    """
    Mixin para validaciones de signos vitales.
    Usar en serializers que manejan signos vitales.
    """
    
    RANGOS_SIGNOS = {
        'presion_sistolica': (60, 250, 'mmHg'),
        'presion_diastolica': (40, 150, 'mmHg'),
        'frecuencia_cardiaca': (30, 220, 'lpm'),
        'frecuencia_respiratoria': (5, 60, 'rpm'),
        'temperatura': (32.0, 42.0, '°C'),
        'saturacion_o2': (50, 100, '%'),
        'glasgow': (3, 15, ''),
        'eva_dolor': (0, 10, '')
    }
    
    def validate_presion_sistolica(self, value):
        if value and (value < 60 or value > 250):
            from rest_framework import serializers
            raise serializers.ValidationError('La presión sistólica debe estar entre 60 y 250 mmHg')
        return value
    
    def validate_presion_diastolica(self, value):
        if value and (value < 40 or value > 150):
            from rest_framework import serializers
            raise serializers.ValidationError('La presión diastólica debe estar entre 40 y 150 mmHg')
        return value
    
    def validate_frecuencia_cardiaca(self, value):
        if value and (value < 30 or value > 220):
            from rest_framework import serializers
            raise serializers.ValidationError('La frecuencia cardíaca debe estar entre 30 y 220 lpm')
        return value
    
    def validate_frecuencia_respiratoria(self, value):
        if value and (value < 5 or value > 60):
            from rest_framework import serializers
            raise serializers.ValidationError('La frecuencia respiratoria debe estar entre 5 y 60 rpm')
        return value
    
    def validate_temperatura(self, value):
        if value and (value < 32.0 or value > 42.0):
            from rest_framework import serializers
            raise serializers.ValidationError('La temperatura debe estar entre 32.0 y 42.0 °C')
        return value
    
    def validate_saturacion_o2(self, value):
        if value and (value < 50 or value > 100):
            from rest_framework import serializers
            raise serializers.ValidationError('La saturación de O2 debe estar entre 50 y 100%')
        return value
    
    def validate_glasgow(self, value):
        if value and (value < 3 or value > 15):
            from rest_framework import serializers
            raise serializers.ValidationError('La escala de Glasgow debe estar entre 3 y 15')
        return value
    
    def validate_eva_dolor(self, value):
        if value and (value < 0 or value > 10):
            from rest_framework import serializers
            raise serializers.ValidationError('La escala EVA debe estar entre 0 y 10')
        return value
