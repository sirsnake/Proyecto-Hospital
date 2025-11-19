from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Usuario, Paciente, FichaEmergencia, SignosVitales, SolicitudMedicamento, Anamnesis, Diagnostico


class UsuarioSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Usuario"""
    nombre_completo = serializers.SerializerMethodField()
    
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'nombre_completo', 'rut', 'rol', 'telefono']
        read_only_fields = ['id']
    
    def get_nombre_completo(self, obj):
        return obj.get_full_name()


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


class SignosVitalesCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear signos vitales (sin requerir ficha)"""
    
    class Meta:
        model = SignosVitales
        exclude = ['ficha']  # Excluir ficha porque se asignará automáticamente
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
    anamnesis = AnamnesisSerializer(read_only=True)
    diagnostico = DiagnosticoSerializer(read_only=True)
    
    class Meta:
        model = FichaEmergencia
        fields = '__all__'
        read_only_fields = ['id', 'fecha_registro', 'fecha_actualizacion']


class FichaEmergenciaCreateSerializer(serializers.ModelSerializer):
    """Serializer simplificado para crear fichas de emergencia"""
    signos_vitales_data = SignosVitalesCreateSerializer(write_only=True)
    
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
