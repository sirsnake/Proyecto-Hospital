from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, Paciente, FichaEmergencia, SignosVitales, SolicitudMedicamento, Anamnesis, Diagnostico, SolicitudExamen, Turno, ConfiguracionTurno


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ['username', 'email', 'get_full_name', 'rut', 'rol', 'is_active']
    list_filter = ['rol', 'is_active', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        ('Información Adicional', {'fields': ('rut', 'rol', 'telefono')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Información Adicional', {'fields': ('rut', 'rol', 'telefono', 'first_name', 'last_name', 'email')}),
    )


@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'rut', 'sexo', 'es_nn', 'id_temporal', 'fecha_registro']
    list_filter = ['es_nn', 'sexo', 'fecha_registro']
    search_fields = ['rut', 'nombres', 'apellidos', 'id_temporal']


@admin.register(FichaEmergencia)
class FichaEmergenciaAdmin(admin.ModelAdmin):
    list_display = ['id', 'paciente', 'prioridad', 'estado', 'paramedico', 'fecha_registro']
    list_filter = ['estado', 'prioridad', 'fecha_registro']
    search_fields = ['paciente__nombres', 'paciente__apellidos', 'motivo_consulta']
    date_hierarchy = 'fecha_registro'


@admin.register(SignosVitales)
class SignosVitalesAdmin(admin.ModelAdmin):
    list_display = ['ficha', 'presion_sistolica', 'presion_diastolica', 'frecuencia_cardiaca', 'saturacion_o2', 'timestamp']
    list_filter = ['timestamp']
    date_hierarchy = 'timestamp'


@admin.register(SolicitudMedicamento)
class SolicitudMedicamentoAdmin(admin.ModelAdmin):
    list_display = ['medicamento', 'ficha', 'paramedico', 'estado', 'medico', 'fecha_solicitud']
    list_filter = ['estado', 'fecha_solicitud']
    search_fields = ['medicamento', 'justificacion']


@admin.register(Anamnesis)
class AnamnesisAdmin(admin.ModelAdmin):
    list_display = ['ficha', 'tens', 'alergias_criticas', 'fecha_creacion']
    list_filter = ['alergias_criticas', 'fecha_creacion']


@admin.register(Diagnostico)
class DiagnosticoAdmin(admin.ModelAdmin):
    list_display = ['ficha', 'diagnostico_cie10', 'medico', 'fecha_diagnostico']
    list_filter = ['fecha_diagnostico']
    search_fields = ['diagnostico_cie10', 'descripcion']


@admin.register(SolicitudExamen)
class SolicitudExamenAdmin(admin.ModelAdmin):
    list_display = ['tipo_examen', 'ficha', 'medico', 'prioridad', 'estado', 'fecha_solicitud']
    list_filter = ['estado', 'prioridad', 'tipo_examen', 'fecha_solicitud']
    search_fields = ['tipo_examen', 'examenes_especificos', 'justificacion']
    readonly_fields = ['fecha_solicitud', 'fecha_actualizacion']


@admin.register(ConfiguracionTurno)
class ConfiguracionTurnoAdmin(admin.ModelAdmin):
    list_display = ['tipo', 'hora_inicio', 'hora_fin', 'activo']
    list_filter = ['activo', 'tipo']


@admin.register(Turno)
class TurnoAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'fecha', 'tipo_turno', 'en_turno', 'es_voluntario', 'hora_entrada', 'hora_salida']
    list_filter = ['tipo_turno', 'fecha', 'en_turno', 'es_voluntario', 'usuario__rol']
    search_fields = ['usuario__first_name', 'usuario__last_name', 'usuario__username']
    date_hierarchy = 'fecha'
    raw_id_fields = ['usuario', 'creado_por']
    readonly_fields = ['fecha_creacion', 'fecha_modificacion']
