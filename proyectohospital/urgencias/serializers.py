from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import (Usuario, Paciente, FichaEmergencia, SignosVitales, SolicitudMedicamento, 
                     Anamnesis, Diagnostico, SolicitudExamen, AuditLog, ConfiguracionHospital, Cama,
                     ArchivoAdjunto, MensajeChat, Notificacion)


class UsuarioSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Usuario"""
    nombre_completo = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'nombre_completo', 
                  'rut', 'rol', 'telefono', 'especialidad', 'registro_profesional', 'is_active', 'date_joined', 'last_login']
        read_only_fields = ['id', 'date_joined', 'last_login']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }
    
    def get_nombre_completo(self, obj):
        return obj.get_full_name()
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        usuario = Usuario(**validated_data)
        if password:
            usuario.set_password(password)
        else:
            # Contraseña por defecto si no se proporciona
            usuario.set_password('changeme123')
        usuario.save()
        return usuario
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    """Serializer para login de usuarios"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            # Buscar usuario por email
            try:
                usuario = Usuario.objects.get(email=email)
                user = authenticate(username=usuario.username, password=password)
                if not user:
                    raise serializers.ValidationError('Credenciales inválidas')
            except Usuario.DoesNotExist:
                raise serializers.ValidationError('Credenciales inválidas')
            
            if not user.is_active:
                raise serializers.ValidationError('Usuario inactivo')
            
            data['user'] = user
        else:
            raise serializers.ValidationError('Debe proporcionar email y contraseña')
        
        return data


class PacienteSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Paciente"""
    
    class Meta:
        model = Paciente
        fields = '__all__'
        read_only_fields = ['id', 'fecha_registro']
    
    def validate(self, data):
        # Si es paciente NN, no requiere RUT
        if data.get('es_nn'):
            if not data.get('id_temporal'):
                raise serializers.ValidationError({'id_temporal': 'Pacientes NN requieren ID temporal'})
        else:
            if not data.get('rut'):
                raise serializers.ValidationError({'rut': 'Pacientes identificados requieren RUT'})
        
        return data


class SignosVitalesSerializer(serializers.ModelSerializer):
    """Serializer para signos vitales"""
    
    class Meta:
        model = SignosVitales
        fields = '__all__'
        read_only_fields = ['id', 'timestamp']
    
    def validate_presion_sistolica(self, value):
        if value and (value < 60 or value > 250):
            raise serializers.ValidationError('La presión sistólica debe estar entre 60 y 250 mmHg')
        return value
    
    def validate_presion_diastolica(self, value):
        if value and (value < 40 or value > 150):
            raise serializers.ValidationError('La presión diastólica debe estar entre 40 y 150 mmHg')
        return value
    
    def validate_frecuencia_cardiaca(self, value):
        if value and (value < 30 or value > 220):
            raise serializers.ValidationError('La frecuencia cardíaca debe estar entre 30 y 220 lpm')
        return value
    
    def validate_frecuencia_respiratoria(self, value):
        if value and (value < 8 or value > 60):
            raise serializers.ValidationError('La frecuencia respiratoria debe estar entre 8 y 60 rpm')
        return value
    
    def validate_saturacion_o2(self, value):
        if value and (value < 50 or value > 100):
            raise serializers.ValidationError('La saturación de O₂ debe estar entre 50% y 100%')
        return value
    
    def validate_temperatura(self, value):
        if value and (value < 32 or value > 42):
            raise serializers.ValidationError('La temperatura debe estar entre 32°C y 42°C')
        return value
    
    def validate_glucosa(self, value):
        if value and (value < 20 or value > 600):
            raise serializers.ValidationError('La glucosa debe estar entre 20 y 600 mg/dL')
        return value
    
    def validate_escala_glasgow(self, value):
        if value and (value < 3 or value > 15):
            raise serializers.ValidationError('La escala de Glasgow debe estar entre 3 y 15')
        return value
    
    def validate_eva(self, value):
        if value and (value < 0 or value > 10):
            raise serializers.ValidationError('La escala EVA debe estar entre 0 y 10')
        return value


class SignosVitalesNestedSerializer(serializers.ModelSerializer):
    """Serializer para crear signos vitales anidados (dentro de ficha)"""
    
    class Meta:
        model = SignosVitales
        exclude = ['ficha']  # ficha se asigna automáticamente en la creación anidada
        read_only_fields = ['id', 'timestamp']
    
    def validate_presion_sistolica(self, value):
        if value and (value < 60 or value > 250):
            raise serializers.ValidationError('La presión sistólica debe estar entre 60 y 250 mmHg')
        return value
    
    def validate_presion_diastolica(self, value):
        if value and (value < 40 or value > 150):
            raise serializers.ValidationError('La presión diastólica debe estar entre 40 y 150 mmHg')
        return value
    
    def validate_frecuencia_cardiaca(self, value):
        if value and (value < 30 or value > 220):
            raise serializers.ValidationError('La frecuencia cardíaca debe estar entre 30 y 220 lpm')
        return value
    
    def validate_frecuencia_respiratoria(self, value):
        if value and (value < 8 or value > 60):
            raise serializers.ValidationError('La frecuencia respiratoria debe estar entre 8 y 60 rpm')
        return value
    
    def validate_saturacion_o2(self, value):
        if value and (value < 50 or value > 100):
            raise serializers.ValidationError('La saturación de O₂ debe estar entre 50% y 100%')
        return value
    
    def validate_temperatura(self, value):
        if value and (value < 32 or value > 42):
            raise serializers.ValidationError('La temperatura debe estar entre 32°C y 42°C')
        return value
    
    def validate_glucosa(self, value):
        if value and (value < 20 or value > 600):
            raise serializers.ValidationError('La glucosa debe estar entre 20 y 600 mg/dL')
        return value
    
    def validate_escala_glasgow(self, value):
        if value and (value < 3 or value > 15):
            raise serializers.ValidationError('La escala de Glasgow debe estar entre 3 y 15')
        return value
    
    def validate_eva(self, value):
        if value and (value < 0 or value > 10):
            raise serializers.ValidationError('La escala EVA debe estar entre 0 y 10')
        return value


class SignosVitalesCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear signos vitales directamente (con ficha)"""
    
    class Meta:
        model = SignosVitales
        fields = '__all__'
        read_only_fields = ['id', 'timestamp']


class SolicitudMedicamentoSerializer(serializers.ModelSerializer):
    """Serializer para solicitudes de medicamentos"""
    paramedico_nombre = serializers.CharField(source='paramedico.get_full_name', read_only=True)
    medico_nombre = serializers.CharField(source='medico.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = SolicitudMedicamento
        fields = '__all__'
        read_only_fields = ['id', 'fecha_solicitud', 'fecha_respuesta']


class AnamnesisSerializer(serializers.ModelSerializer):
    """Serializer para anamnesis"""
    tens_nombre = serializers.CharField(source='tens.get_full_name', read_only=True)
    
    class Meta:
        model = Anamnesis
        fields = '__all__'
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']


class DiagnosticoSerializer(serializers.ModelSerializer):
    """Serializer para diagnósticos"""
    medico_nombre = serializers.CharField(source='medico.get_full_name', read_only=True)
    
    class Meta:
        model = Diagnostico
        fields = '__all__'
        read_only_fields = ['id', 'fecha_diagnostico']


class SolicitudExamenSerializer(serializers.ModelSerializer):
    """Serializer para solicitudes de exámenes"""
    medico_nombre = serializers.CharField(source='medico.get_full_name', read_only=True)
    
    class Meta:
        model = SolicitudExamen
        fields = '__all__'
        read_only_fields = ['id', 'fecha_solicitud', 'fecha_actualizacion']


class FichaEmergenciaSerializer(serializers.ModelSerializer):
    """Serializer completo para fichas de emergencia"""
    paciente = PacienteSerializer(read_only=True)
    paciente_id = serializers.PrimaryKeyRelatedField(
        queryset=Paciente.objects.all(), 
        source='paciente', 
        write_only=True
    )
    paramedico_nombre = serializers.CharField(source='paramedico.get_full_name', read_only=True)
    signos_vitales = SignosVitalesSerializer(many=True, read_only=True)
    solicitudes_medicamentos = SolicitudMedicamentoSerializer(many=True, read_only=True)
    solicitudes_examenes = SolicitudExamenSerializer(many=True, read_only=True)
    anamnesis = AnamnesisSerializer(read_only=True)
    diagnostico = DiagnosticoSerializer(read_only=True)
    
    class Meta:
        model = FichaEmergencia
        fields = '__all__'
        read_only_fields = ['id', 'fecha_registro', 'fecha_actualizacion']


class FichaEmergenciaCreateSerializer(serializers.ModelSerializer):
    """Serializer simplificado para crear fichas de emergencia"""
    signos_vitales_data = SignosVitalesNestedSerializer(write_only=True)
    
    class Meta:
        model = FichaEmergencia
        fields = ['paciente', 'paramedico', 'motivo_consulta', 'circunstancias', 
                  'sintomas', 'nivel_consciencia', 'estado', 'prioridad', 'eta', 
                  'signos_vitales_data']
    
    def create(self, validated_data):
        signos_data = validated_data.pop('signos_vitales_data')
        ficha = FichaEmergencia.objects.create(**validated_data)
        SignosVitales.objects.create(ficha=ficha, **signos_data)
        return ficha


class ConfiguracionHospitalSerializer(serializers.ModelSerializer):
    """Serializer para configuración del hospital"""
    actualizado_por_nombre = serializers.CharField(source='actualizado_por.get_full_name', read_only=True)
    
    class Meta:
        model = ConfiguracionHospital
        fields = ['id', 'camas_totales', 'camas_uci', 'salas_emergencia', 'boxes_atencion',
                  'actualizado_por', 'actualizado_por_nombre', 'fecha_actualizacion']
        read_only_fields = ['id', 'fecha_actualizacion']


class CamaSerializer(serializers.ModelSerializer):
    """Serializer para camas del hospital"""
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    paciente_nombre = serializers.SerializerMethodField()
    ficha_id = serializers.IntegerField(source='ficha_actual.id', read_only=True)
    asignado_por_nombre = serializers.CharField(source='asignado_por.get_full_name', read_only=True)
    
    class Meta:
        model = Cama
        fields = ['id', 'numero', 'tipo', 'tipo_display', 'estado', 'estado_display',
                  'piso', 'sala', 'ficha_actual', 'ficha_id', 'paciente_nombre',
                  'fecha_asignacion', 'asignado_por', 'asignado_por_nombre',
                  'observaciones', 'fecha_creacion', 'fecha_actualizacion']
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']
    
    def get_paciente_nombre(self, obj):
        if obj.ficha_actual and obj.ficha_actual.paciente:
            paciente = obj.ficha_actual.paciente
            if paciente.es_nn:
                return f"NN - {paciente.id_temporal}"
            return f"{paciente.nombres} {paciente.apellidos}"
        return None


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer para logs de auditoría"""
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)
    usuario_rol = serializers.CharField(source='usuario.rol', read_only=True)
    accion_display = serializers.CharField(source='get_accion_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ['id', 'usuario', 'usuario_nombre', 'usuario_rol', 'accion', 
                  'accion_display', 'modelo', 'objeto_id', 'detalles', 
                  'ip_address', 'user_agent', 'timestamp']
        read_only_fields = fields


class ArchivoAdjuntoSerializer(serializers.ModelSerializer):
    """Serializer para archivos adjuntos"""
    subido_por_nombre = serializers.CharField(source='subido_por.get_full_name', read_only=True)
    subido_por_rol = serializers.CharField(source='subido_por.rol', read_only=True)
    url = serializers.SerializerMethodField()
    extension = serializers.SerializerMethodField()
    
    class Meta:
        model = ArchivoAdjunto
        fields = ['id', 'ficha', 'subido_por', 'subido_por_nombre', 'subido_por_rol',
                  'archivo', 'url', 'nombre_original', 'tipo', 'tamano', 'mime_type',
                  'extension', 'descripcion', 'fecha_subida']
        read_only_fields = ['id', 'fecha_subida', 'subido_por', 'tipo', 'tamano', 'mime_type']
    
    def get_url(self, obj):
        request = self.context.get('request')
        if obj.archivo and request:
            return request.build_absolute_uri(obj.archivo.url)
        return obj.archivo.url if obj.archivo else None
    
    def get_extension(self, obj):
        return obj.get_extension()


class ArchivoAdjuntoUploadSerializer(serializers.ModelSerializer):
    """Serializer para subir archivos"""
    archivo = serializers.FileField()
    ficha_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = ArchivoAdjunto
        fields = ['ficha', 'ficha_id', 'archivo', 'descripcion']
        extra_kwargs = {
            'ficha': {'required': False}
        }
    
    def validate_archivo(self, value):
        # Validar tamaño (50MB máximo)
        max_size = 50 * 1024 * 1024  # 50MB
        if value.size > max_size:
            raise serializers.ValidationError(f'El archivo es demasiado grande. Tamaño máximo: 50MB')
        
        # Validar extensión
        import os
        from django.conf import settings
        ext = os.path.splitext(value.name)[1].lower()
        allowed_extensions = getattr(settings, 'ALLOWED_UPLOAD_EXTENSIONS', 
            ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'])
        
        if ext not in allowed_extensions:
            raise serializers.ValidationError(f'Tipo de archivo no permitido. Extensiones permitidas: {", ".join(allowed_extensions)}')
        
        return value
    
    def validate(self, data):
        # Permitir ficha_id como alternativa a ficha
        if 'ficha_id' in data and 'ficha' not in data:
            try:
                data['ficha'] = FichaEmergencia.objects.get(id=data['ficha_id'])
            except FichaEmergencia.DoesNotExist:
                raise serializers.ValidationError({'ficha_id': 'Ficha no encontrada'})
        return data
    
    def create(self, validated_data):
        archivo = validated_data['archivo']
        # Remover ficha_id si existe (ya tenemos ficha)
        validated_data.pop('ficha_id', None)
        
        # Determinar tipo de archivo
        tipo = ArchivoAdjunto.get_tipo_from_mime(archivo.content_type, archivo.name)
        
        adjunto = ArchivoAdjunto.objects.create(
            ficha=validated_data['ficha'],
            subido_por=self.context['request'].user,
            archivo=archivo,
            nombre_original=archivo.name,
            tipo=tipo,
            tamano=archivo.size,
            mime_type=archivo.content_type,
            descripcion=validated_data.get('descripcion', '')
        )
        return adjunto


class MensajeChatSerializer(serializers.ModelSerializer):
    """Serializer para mensajes de chat"""
    autor = serializers.SerializerMethodField()
    archivo_adjunto = ArchivoAdjuntoSerializer(read_only=True)
    leido_por = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    
    class Meta:
        model = MensajeChat
        fields = ['id', 'ficha', 'autor', 'contenido', 'archivo_adjunto', 
                  'fecha_envio', 'editado', 'fecha_edicion', 'leido_por']
        read_only_fields = ['id', 'fecha_envio', 'editado', 'fecha_edicion']
    
    def get_autor(self, obj):
        return {
            'id': obj.autor.id,
            'username': obj.autor.username,
            'first_name': obj.autor.first_name or obj.autor.username,
            'last_name': obj.autor.last_name or '',
            'rol': obj.autor.rol
        }


class MensajeChatCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear mensajes de chat"""
    ficha_id = serializers.IntegerField(write_only=True, required=False)
    archivo_adjunto_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = MensajeChat
        fields = ['ficha', 'ficha_id', 'contenido', 'archivo_adjunto', 'archivo_adjunto_id']
        extra_kwargs = {
            'ficha': {'required': False},
            'archivo_adjunto': {'required': False}
        }
    
    def validate(self, data):
        # Permitir ficha_id como alternativa a ficha
        if 'ficha_id' in data and 'ficha' not in data:
            try:
                data['ficha'] = FichaEmergencia.objects.get(id=data['ficha_id'])
            except FichaEmergencia.DoesNotExist:
                raise serializers.ValidationError({'ficha_id': 'Ficha no encontrada'})
        
        # Permitir archivo_adjunto_id como alternativa
        if 'archivo_adjunto_id' in data and data['archivo_adjunto_id']:
            try:
                data['archivo_adjunto'] = ArchivoAdjunto.objects.get(id=data['archivo_adjunto_id'])
            except ArchivoAdjunto.DoesNotExist:
                raise serializers.ValidationError({'archivo_adjunto_id': 'Archivo no encontrado'})
        
        return data
    
    def create(self, validated_data):
        # Remover campos temporales
        validated_data.pop('ficha_id', None)
        validated_data.pop('archivo_adjunto_id', None)
        
        mensaje = MensajeChat.objects.create(
            ficha=validated_data['ficha'],
            autor=self.context['request'].user,
            contenido=validated_data.get('contenido', ''),
            archivo_adjunto=validated_data.get('archivo_adjunto')
        )
        return mensaje


class NotificacionSerializer(serializers.ModelSerializer):
    """Serializer para notificaciones"""
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    prioridad_display = serializers.CharField(source='get_prioridad_display', read_only=True)
    tiempo_transcurrido = serializers.SerializerMethodField()
    
    class Meta:
        model = Notificacion
        fields = ['id', 'tipo', 'tipo_display', 'titulo', 'mensaje', 'prioridad', 
                  'prioridad_display', 'ficha', 'leida', 'fecha_creacion', 'fecha_leida',
                  'datos_extra', 'tiempo_transcurrido']
        read_only_fields = ['id', 'fecha_creacion', 'fecha_leida']
    
    def get_tiempo_transcurrido(self, obj):
        """Retorna tiempo transcurrido en formato legible"""
        from django.utils import timezone
        delta = timezone.now() - obj.fecha_creacion
        
        if delta.days > 0:
            return f"hace {delta.days} día{'s' if delta.days > 1 else ''}"
        
        hours = delta.seconds // 3600
        if hours > 0:
            return f"hace {hours} hora{'s' if hours > 1 else ''}"
        
        minutes = delta.seconds // 60
        if minutes > 0:
            return f"hace {minutes} minuto{'s' if minutes > 1 else ''}"
        
        return "hace un momento"
