from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator


class Usuario(AbstractUser):
    """Modelo de usuario extendido para el sistema de urgencias"""
    ROL_CHOICES = [
        ('paramedico', 'Paramédico'),
        ('tens', 'TENS'),
        ('medico', 'Médico'),
        ('administrador', 'Administrador'),
    ]
    
    rut = models.CharField(max_length=12, unique=True)
    rol = models.CharField(max_length=20, choices=ROL_CHOICES)
    telefono = models.CharField(max_length=15, blank=True, null=True)
    
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.get_rol_display()})"


class Paciente(models.Model):
    """Modelo para pacientes registrados en el sistema"""
    SEXO_CHOICES = [
        ('Masculino', 'Masculino'),
        ('Femenino', 'Femenino'),
    ]
    
    rut = models.CharField(max_length=12, unique=True, blank=True, null=True)
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    fecha_nacimiento = models.DateField(blank=True, null=True)
    sexo = models.CharField(max_length=10, choices=SEXO_CHOICES)
    telefono = models.CharField(max_length=15, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    
    # Campos para pacientes NN (sin identificación)
    es_nn = models.BooleanField(default=False)
    id_temporal = models.CharField(max_length=20, unique=True, blank=True, null=True)
    edad_aproximada = models.IntegerField(blank=True, null=True)
    caracteristicas = models.TextField(blank=True, null=True, help_text="Características físicas para identificación")
    
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Paciente'
        verbose_name_plural = 'Pacientes'
        ordering = ['-fecha_registro']
    
    def __str__(self):
        if self.es_nn:
            return f"Paciente NN ({self.id_temporal})"
        return f"{self.nombres} {self.apellidos} - {self.rut}"


class FichaEmergencia(models.Model):
    """Ficha de emergencia registrada por paramédicos"""
    ESTADO_CHOICES = [
        ('en_ruta', 'En Ruta'),
        ('en_hospital', 'En Hospital'),
        ('atendido', 'Atendido'),
    ]
    
    PRIORIDAD_CHOICES = [
        ('C1', 'C1 - Crítico'),
        ('C2', 'C2 - Emergencia'),
        ('C3', 'C3 - Urgencia'),
        ('C4', 'C4 - Urgencia Menor'),
        ('C5', 'C5 - No Urgente'),
    ]
    
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='fichas')
    paramedico = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='fichas_paramedico')
    
    motivo_consulta = models.TextField()
    circunstancias = models.TextField()
    sintomas = models.TextField()
    nivel_consciencia = models.CharField(max_length=200)
    
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='en_ruta')
    prioridad = models.CharField(max_length=2, choices=PRIORIDAD_CHOICES)
    eta = models.CharField(max_length=50, blank=True, null=True, help_text="Tiempo estimado de llegada")
    
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Ficha de Emergencia'
        verbose_name_plural = 'Fichas de Emergencia'
        ordering = ['-fecha_registro']
    
    def __str__(self):
        return f"Ficha #{self.id} - {self.paciente} - {self.get_prioridad_display()}"


class SignosVitales(models.Model):
    """Registro de signos vitales del paciente"""
    ficha = models.ForeignKey(FichaEmergencia, on_delete=models.CASCADE, related_name='signos_vitales')
    
    presion_sistolica = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(300)])
    presion_diastolica = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(200)])
    frecuencia_cardiaca = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(300)])
    frecuencia_respiratoria = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    saturacion_o2 = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    temperatura = models.DecimalField(max_digits=4, decimal_places=1)
    glucosa = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(0)])
    escala_glasgow = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(3), MaxValueValidator(15)])
    eva = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(0), MaxValueValidator(10)], help_text="Escala de dolor 0-10")
    
    ubicacion_gps = models.CharField(max_length=100, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Signos Vitales'
        verbose_name_plural = 'Signos Vitales'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"Signos Vitales - Ficha #{self.ficha.id} - {self.timestamp.strftime('%d/%m/%Y %H:%M')}"


class SolicitudMedicamento(models.Model):
    """Solicitudes de medicamentos realizadas por paramédicos"""
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('autorizado', 'Autorizado'),
        ('rechazado', 'Rechazado'),
    ]
    
    ficha = models.ForeignKey(FichaEmergencia, on_delete=models.CASCADE, related_name='solicitudes_medicamentos')
    paramedico = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='solicitudes_realizadas')
    medico = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name='solicitudes_autorizadas')
    
    medicamento = models.CharField(max_length=200)
    dosis = models.CharField(max_length=200)
    justificacion = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    respuesta = models.TextField(blank=True, null=True)
    
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_respuesta = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Solicitud de Medicamento'
        verbose_name_plural = 'Solicitudes de Medicamentos'
        ordering = ['-fecha_solicitud']
    
    def __str__(self):
        return f"{self.medicamento} - {self.get_estado_display()}"


class Anamnesis(models.Model):
    """Anamnesis registrada por TENS en el hospital"""
    ficha = models.OneToOneField(FichaEmergencia, on_delete=models.CASCADE, related_name='anamnesis')
    tens = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='anamnesis_registradas')
    
    historia_enfermedad_actual = models.TextField()
    antecedentes_medicos = models.TextField()
    alergias_medicamentosas = models.JSONField(default=list, help_text="Lista de alergias")
    alergias_criticas = models.BooleanField(default=False)
    medicamentos_habituales = models.TextField(blank=True, null=True)
    antecedentes_quirurgicos = models.TextField(blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Anamnesis'
        verbose_name_plural = 'Anamnesis'
    
    def __str__(self):
        return f"Anamnesis - Ficha #{self.ficha.id}"


class Diagnostico(models.Model):
    """Diagnóstico médico final"""
    ficha = models.OneToOneField(FichaEmergencia, on_delete=models.CASCADE, related_name='diagnostico')
    medico = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='diagnosticos_realizados')
    
    diagnostico_cie10 = models.CharField(max_length=100, help_text="Código CIE-10")
    descripcion = models.TextField()
    indicaciones_medicas = models.TextField()
    medicamentos_prescritos = models.TextField(blank=True, null=True)
    
    fecha_diagnostico = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Diagnóstico'
        verbose_name_plural = 'Diagnósticos'
        ordering = ['-fecha_diagnostico']
    
    def __str__(self):
        return f"Diagnóstico {self.diagnostico_cie10} - Ficha #{self.ficha.id}"
