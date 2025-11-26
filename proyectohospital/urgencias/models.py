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
    
    # Campos profesionales adicionales
    especialidad = models.CharField(max_length=100, blank=True, null=True, help_text="Especialidad médica o profesional")
    registro_profesional = models.CharField(max_length=50, blank=True, null=True, help_text="Número de registro profesional")
    
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


class SolicitudExamen(models.Model):
    """Solicitud de exámenes médicos"""
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('en_proceso', 'En Proceso'),
        ('completado', 'Completado'),
        ('cancelado', 'Cancelado'),
    ]
    
    PRIORIDAD_CHOICES = [
        ('urgente', 'Urgente'),
        ('normal', 'Normal'),
        ('diferido', 'Diferido'),
    ]
    
    ficha = models.ForeignKey(FichaEmergencia, on_delete=models.CASCADE, related_name='solicitudes_examenes')
    medico = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='examenes_solicitados')
    
    tipo_examen = models.CharField(max_length=200, help_text="Tipo de examen solicitado")
    examenes_especificos = models.TextField(help_text="Lista detallada de exámenes")
    justificacion = models.TextField(help_text="Justificación clínica")
    prioridad = models.CharField(max_length=20, choices=PRIORIDAD_CHOICES, default='normal')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    
    observaciones = models.TextField(blank=True, null=True)
    resultados = models.TextField(blank=True, null=True)
    
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Solicitud de Examen'
        verbose_name_plural = 'Solicitudes de Exámenes'
        ordering = ['-fecha_solicitud']
    
    def __str__(self):
        return f"{self.tipo_examen} - Ficha #{self.ficha.id} ({self.estado})"


class ConfiguracionHospital(models.Model):
    """Configuración general del hospital"""
    camas_totales = models.IntegerField(default=50, validators=[MinValueValidator(1)])
    camas_uci = models.IntegerField(default=10, validators=[MinValueValidator(0)])
    salas_emergencia = models.IntegerField(default=5, validators=[MinValueValidator(1)])
    boxes_atencion = models.IntegerField(default=15, validators=[MinValueValidator(1)])
    actualizado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Configuración del Hospital'
        verbose_name_plural = 'Configuraciones del Hospital'
    
    def __str__(self):
        return f"Configuración Hospital - Actualizado {self.fecha_actualizacion.strftime('%d/%m/%Y %H:%M')}"
    
    @classmethod
    def get_configuracion(cls):
        """Obtiene o crea la configuración del hospital"""
        config, created = cls.objects.get_or_create(pk=1)
        return config


class Cama(models.Model):
    """Modelo para gestión de camas del hospital"""
    TIPO_CHOICES = [
        ('general', 'General'),
        ('uci', 'UCI'),
        ('emergencia', 'Emergencia'),
    ]
    
    ESTADO_CHOICES = [
        ('disponible', 'Disponible'),
        ('ocupada', 'Ocupada'),
        ('mantenimiento', 'Mantenimiento'),
        ('limpieza', 'En Limpieza'),
    ]
    
    numero = models.CharField(max_length=20, unique=True, help_text="Número o código de la cama")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='general')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='disponible')
    piso = models.IntegerField(validators=[MinValueValidator(1)], blank=True, null=True)
    sala = models.CharField(max_length=50, blank=True, null=True)
    
    # Asignación actual
    ficha_actual = models.OneToOneField('FichaEmergencia', on_delete=models.SET_NULL, null=True, blank=True, related_name='cama_asignada')
    fecha_asignacion = models.DateTimeField(blank=True, null=True)
    asignado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name='camas_asignadas')
    
    observaciones = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Cama'
        verbose_name_plural = 'Camas'
        ordering = ['tipo', 'numero']
        indexes = [
            models.Index(fields=['estado', 'tipo']),
            models.Index(fields=['numero']),
        ]
    
    def __str__(self):
        return f"Cama {self.numero} ({self.get_tipo_display()}) - {self.get_estado_display()}"
    
    def liberar(self):
        """Libera la cama para nuevo uso"""
        self.estado = 'disponible'
        self.ficha_actual = None
        self.fecha_asignacion = None
        self.asignado_por = None
        self.save()
    
    def asignar(self, ficha, usuario):
        """Asigna la cama a una ficha"""
        from django.utils import timezone
        self.estado = 'ocupada'
        self.ficha_actual = ficha
        self.fecha_asignacion = timezone.now()
        self.asignado_por = usuario
        self.save()


class AuditLog(models.Model):
    """Registro de auditoría para todas las acciones del sistema"""
    ACCION_CHOICES = [
        ('crear', 'Crear'),
        ('editar', 'Editar'),
        ('eliminar', 'Eliminar'),
        ('autorizar', 'Autorizar'),
        ('rechazar', 'Rechazar'),
        ('login', 'Inicio de Sesión'),
        ('logout', 'Cierre de Sesión'),
    ]
    
    usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name='acciones_auditoria')
    accion = models.CharField(max_length=20, choices=ACCION_CHOICES)
    modelo = models.CharField(max_length=100, help_text="Modelo afectado (ej: FichaEmergencia, Usuario)")
    objeto_id = models.IntegerField(blank=True, null=True, help_text="ID del objeto afectado")
    detalles = models.JSONField(blank=True, null=True, help_text="Detalles adicionales de la acción")
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Log de Auditoría'
        verbose_name_plural = 'Logs de Auditoría'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['usuario', '-timestamp']),
            models.Index(fields=['modelo', '-timestamp']),
        ]
    
    def __str__(self):
        usuario_str = self.usuario.get_full_name() if self.usuario else "Sistema"
        return f"{usuario_str} - {self.get_accion_display()} - {self.modelo} #{self.objeto_id or 'N/A'} - {self.timestamp.strftime('%d/%m/%Y %H:%M')}"


def archivo_upload_path(instance, filename):
    """Genera la ruta de subida para archivos adjuntos"""
    import os
    from django.utils import timezone
    ficha_id = instance.ficha.id if instance.ficha else 'general'
    fecha = timezone.now().strftime('%Y/%m')
    return f'archivos_fichas/{ficha_id}/{fecha}/{filename}'


class ArchivoAdjunto(models.Model):
    """Archivos adjuntos a fichas de emergencia (imágenes, PDFs, documentos)"""
    TIPO_CHOICES = [
        ('imagen', 'Imagen'),
        ('pdf', 'PDF'),
        ('documento', 'Documento'),
        ('otro', 'Otro'),
    ]
    
    ficha = models.ForeignKey(FichaEmergencia, on_delete=models.CASCADE, related_name='archivos')
    subido_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='archivos_subidos')
    
    archivo = models.FileField(upload_to=archivo_upload_path)
    nombre_original = models.CharField(max_length=255)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    tamano = models.BigIntegerField(help_text="Tamaño en bytes")
    mime_type = models.CharField(max_length=100, blank=True, null=True)
    
    descripcion = models.TextField(blank=True, null=True)
    
    fecha_subida = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Archivo Adjunto'
        verbose_name_plural = 'Archivos Adjuntos'
        ordering = ['-fecha_subida']
    
    def __str__(self):
        return f"{self.nombre_original} - Ficha #{self.ficha.id}"
    
    def get_extension(self):
        import os
        return os.path.splitext(self.nombre_original)[1].lower()
    
    @staticmethod
    def get_tipo_from_mime(mime_type, filename):
        """Determina el tipo de archivo basado en mime_type o extensión"""
        if mime_type:
            if mime_type.startswith('image/'):
                return 'imagen'
            elif mime_type == 'application/pdf':
                return 'pdf'
            elif mime_type in ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                              'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']:
                return 'documento'
        
        # Fallback por extensión
        import os
        ext = os.path.splitext(filename)[1].lower()
        if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']:
            return 'imagen'
        elif ext == '.pdf':
            return 'pdf'
        elif ext in ['.doc', '.docx', '.xls', '.xlsx', '.odt', '.ods']:
            return 'documento'
        
        return 'otro'


class MensajeChat(models.Model):
    """Mensajes de chat entre paramédico, TENS y médico por cada ficha"""
    ficha = models.ForeignKey(FichaEmergencia, on_delete=models.CASCADE, related_name='mensajes')
    autor = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='mensajes_enviados')
    
    contenido = models.TextField()
    archivo_adjunto = models.ForeignKey(ArchivoAdjunto, on_delete=models.SET_NULL, null=True, blank=True, related_name='mensajes')
    
    leido_por = models.ManyToManyField(Usuario, blank=True, related_name='mensajes_leidos')
    
    fecha_envio = models.DateTimeField(auto_now_add=True)
    editado = models.BooleanField(default=False)
    fecha_edicion = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Mensaje de Chat'
        verbose_name_plural = 'Mensajes de Chat'
        ordering = ['fecha_envio']
        indexes = [
            models.Index(fields=['ficha', 'fecha_envio']),
        ]
    
    def __str__(self):
        autor_nombre = self.autor.get_full_name() if self.autor else "Sistema"
        return f"[Ficha #{self.ficha.id}] {autor_nombre}: {self.contenido[:50]}..."
    
    def marcar_como_leido(self, usuario):
        """Marca el mensaje como leído por un usuario"""
        if usuario not in self.leido_por.all():
            self.leido_por.add(usuario)


class Notificacion(models.Model):
    """Modelo para notificaciones del sistema"""
    
    TIPO_CHOICES = [
        ('nueva_ficha', 'Nueva Ficha de Emergencia'),
        ('ficha_llegada', 'Paciente Llegó al Hospital'),
        ('solicitud_medicamento', 'Solicitud de Medicamento'),
        ('medicamento_autorizado', 'Medicamento Autorizado'),
        ('medicamento_rechazado', 'Medicamento Rechazado'),
        ('nuevos_signos', 'Nuevos Signos Vitales'),
        ('diagnostico', 'Nuevo Diagnóstico'),
        ('mensaje_chat', 'Nuevo Mensaje'),
        ('examen_solicitado', 'Examen Solicitado'),
        ('cama_asignada', 'Cama Asignada'),
        ('alta_paciente', 'Alta de Paciente'),
        ('sistema', 'Notificación del Sistema'),
    ]
    
    PRIORIDAD_CHOICES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
        ('urgente', 'Urgente'),
    ]
    
    # Destinatario de la notificación
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='notificaciones'
    )
    
    # Tipo y contenido
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES)
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    prioridad = models.CharField(max_length=10, choices=PRIORIDAD_CHOICES, default='media')
    
    # Referencias opcionales
    ficha = models.ForeignKey(
        FichaEmergencia,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notificaciones'
    )
    
    # Estado
    leida = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_leida = models.DateTimeField(null=True, blank=True)
    
    # Datos adicionales en JSON (para links, acciones, etc.)
    datos_extra = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-fecha_creacion']
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        indexes = [
            models.Index(fields=['usuario', 'leida']),
            models.Index(fields=['usuario', 'fecha_creacion']),
        ]
    
    def __str__(self):
        return f"{self.get_tipo_display()} - {self.usuario.username}"
    
    def marcar_leida(self):
        """Marca la notificación como leída"""
        from django.utils import timezone
        if not self.leida:
            self.leida = True
            self.fecha_leida = timezone.now()
            self.save(update_fields=['leida', 'fecha_leida'])
    
    @classmethod
    def crear_notificacion(cls, usuario, tipo, titulo, mensaje, ficha=None, prioridad='media', datos_extra=None):
        """Helper para crear notificaciones"""
        return cls.objects.create(
            usuario=usuario,
            tipo=tipo,
            titulo=titulo,
            mensaje=mensaje,
            ficha=ficha,
            prioridad=prioridad,
            datos_extra=datos_extra or {}
        )
    
    @classmethod
    def notificar_rol(cls, rol, tipo, titulo, mensaje, ficha=None, prioridad='media', datos_extra=None):
        """Crear notificación para todos los usuarios de un rol"""
        usuarios = Usuario.objects.filter(rol=rol, is_active=True)
        notificaciones = []
        for usuario in usuarios:
            notificaciones.append(cls(
                usuario=usuario,
                tipo=tipo,
                titulo=titulo,
                mensaje=mensaje,
                ficha=ficha,
                prioridad=prioridad,
                datos_extra=datos_extra or {}
            ))
        return cls.objects.bulk_create(notificaciones)
    
    @classmethod
    def notificar_roles(cls, roles, tipo, titulo, mensaje, ficha=None, prioridad='media', datos_extra=None):
        """Crear notificación para todos los usuarios de varios roles"""
        usuarios = Usuario.objects.filter(rol__in=roles, is_active=True)
        notificaciones = []
        for usuario in usuarios:
            notificaciones.append(cls(
                usuario=usuario,
                tipo=tipo,
                titulo=titulo,
                mensaje=mensaje,
                ficha=ficha,
                prioridad=prioridad,
                datos_extra=datos_extra or {}
            ))
        return cls.objects.bulk_create(notificaciones)
