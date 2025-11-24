from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import (Usuario, Paciente, FichaEmergencia, SignosVitales, SolicitudMedicamento, 
                     Anamnesis, Diagnostico, SolicitudExamen, AuditLog, ConfiguracionHospital, Cama)


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


class SignosVitalesNestedSerializer(serializers.ModelSerializer):
    """Serializer para crear signos vitales anidados (dentro de ficha)"""
    
    class Meta:
        model = SignosVitales
        exclude = ['ficha']  # ficha se asigna automáticamente en la creación anidada
        read_only_fields = ['id', 'timestamp']


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
