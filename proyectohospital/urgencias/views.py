from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission


class IsAdministrador(BasePermission):
    """Permiso que solo permite acceso a administradores"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'administrador'
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.utils import timezone
from django.db.models import Q
from django.http import FileResponse, HttpResponse
from django.template.loader import render_to_string
from weasyprint import HTML
import io
from .models import (Usuario, Paciente, FichaEmergencia, SignosVitales, SolicitudMedicamento, 
                     Anamnesis, Triage, Diagnostico, SolicitudExamen, AuditLog, ConfiguracionHospital, Cama,
                     ArchivoAdjunto, MensajeChat, Notificacion, NotaEvolucion, Turno, ConfiguracionTurno)
from .serializers import (
    UsuarioSerializer, LoginSerializer, PacienteSerializer, 
    FichaEmergenciaSerializer, FichaEmergenciaCreateSerializer,
    SignosVitalesSerializer, SignosVitalesCreateSerializer,
    SolicitudMedicamentoSerializer, AnamnesisSerializer, TriageSerializer,
    DiagnosticoSerializer, SolicitudExamenSerializer, AuditLogSerializer,
    ConfiguracionHospitalSerializer, CamaSerializer,
    ArchivoAdjuntoSerializer, ArchivoAdjuntoUploadSerializer,
    MensajeChatSerializer, MensajeChatCreateSerializer,
    NotificacionSerializer, NotaEvolucionSerializer, NotaEvolucionCreateSerializer,
    TurnoSerializer, ConfiguracionTurnoSerializer, TurnoAsignacionMasivaSerializer
)


# Función helper para obtener IP del cliente
def get_client_ip(request):
    """Obtener IP del cliente desde el request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_token_view(request):
    """Endpoint para obtener el CSRF token"""
    csrf_token = get_token(request)
    return Response({'csrfToken': csrf_token})


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Endpoint para login de usuarios"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)
        
        # Registrar login en auditoría
        AuditLog.objects.create(
            usuario=user,
            accion='login',
            modelo='Sesion',
            objeto_id=user.id,
            detalles={'username': user.username, 'rol': user.rol},
            ip_address=get_client_ip(request)
        )
        
        # Crear respuesta y asegurar que se envíe el CSRF token
        response = Response({
            'user': UsuarioSerializer(user).data,
            'message': 'Login exitoso'
        })
        
        # Forzar que Django envíe el CSRF cookie
        from django.middleware.csrf import get_token
        get_token(request)
        
        return response
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Endpoint para logout de usuarios"""
    user = request.user
    
    # Registrar logout en auditoría
    AuditLog.objects.create(
        usuario=user,
        accion='logout',
        modelo='Sesion',
        objeto_id=user.id,
        detalles={'username': user.username},
        ip_address=get_client_ip(request)
    )
    
    logout(request)
    return Response({'message': 'Logout exitoso'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Endpoint para obtener el usuario actual"""
    serializer = UsuarioSerializer(request.user)
    return Response(serializer.data)


class PacienteViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de pacientes"""
    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """Registrar creación de paciente en auditoría"""
        paciente = serializer.save()
        AuditLog.objects.create(
            usuario=self.request.user,
            accion='crear',
            modelo='Paciente',
            objeto_id=paciente.id,
            detalles={
                'nombre': f"{paciente.nombres} {paciente.apellidos}",
                'rut': paciente.rut or 'NN',
                'es_nn': paciente.es_nn
            },
            ip_address=get_client_ip(self.request)
        )
    
    def perform_update(self, serializer):
        """Registrar actualización de paciente en auditoría"""
        paciente = serializer.save()
        AuditLog.objects.create(
            usuario=self.request.user,
            accion='editar',
            modelo='Paciente',
            objeto_id=paciente.id,
            detalles={
                'nombre': f"{paciente.nombres} {paciente.apellidos}",
                'rut': paciente.rut or 'NN'
            },
            ip_address=get_client_ip(self.request)
        )
    
    def get_queryset(self):
        queryset = Paciente.objects.all()
        rut = self.request.query_params.get('rut', None)
        es_nn = self.request.query_params.get('es_nn', None)
        
        if rut:
            queryset = queryset.filter(rut=rut)
        if es_nn is not None:
            queryset = queryset.filter(es_nn=es_nn.lower() == 'true')
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def buscar(self, request):
        """Buscar pacientes por RUT, nombre, apellido o ID temporal"""
        q = request.query_params.get('q', '').strip()
        
        if not q:
            return Response({'error': 'Debe proporcionar un término de búsqueda'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Buscar por RUT exacto primero
        pacientes = Paciente.objects.filter(rut__iexact=q)
        
        # Si no se encuentra por RUT, buscar por nombre/apellido
        if not pacientes.exists():
            pacientes = Paciente.objects.filter(
                Q(nombres__icontains=q) | 
                Q(apellidos__icontains=q) |
                Q(id_temporal__icontains=q)
            )
        
        # Limitar a 10 resultados
        pacientes = pacientes[:10]
        
        if not pacientes.exists():
            return Response([], status=status.HTTP_200_OK)
        
        return Response(PacienteSerializer(pacientes, many=True).data)
    
    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        """Obtener historial completo de un paciente"""
        paciente = self.get_object()
        
        # Obtener todas las fichas del paciente ordenadas por fecha
        fichas = FichaEmergencia.objects.filter(paciente=paciente).select_related(
            'paramedico', 'anamnesis', 'diagnostico'
        ).prefetch_related(
            'signos_vitales', 'solicitudes_medicamentos', 'solicitudes_examenes'
        ).order_by('-fecha_registro')
        
        # Serializar las fichas
        serializer = FichaEmergenciaSerializer(fichas, many=True)
        
        return Response({
            'paciente': PacienteSerializer(paciente).data,
            'fichas': serializer.data,
            'total_atenciones': fichas.count()
        })


class FichaEmergenciaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de fichas de emergencia"""
    queryset = FichaEmergencia.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return FichaEmergenciaCreateSerializer
        return FichaEmergenciaSerializer
    
    def get_queryset(self):
        queryset = FichaEmergencia.objects.select_related(
            'paciente', 'paramedico'
        ).prefetch_related(
            'signos_vitales', 'solicitudes_medicamentos', 'anamnesis', 'diagnostico'
        )
        
        # Filtros
        estado = self.request.query_params.get('estado', None)
        prioridad = self.request.query_params.get('prioridad', None)
        paramedico_id = self.request.query_params.get('paramedico', None)
        paciente_id = self.request.query_params.get('paciente_id', None)
        
        if estado:
            queryset = queryset.filter(estado=estado)
        if prioridad:
            queryset = queryset.filter(prioridad=prioridad)
        if paramedico_id:
            queryset = queryset.filter(paramedico_id=paramedico_id)
        if paciente_id:
            queryset = queryset.filter(paciente_id=paciente_id).order_by('-fecha_registro')
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Sobrescribir create para devolver la respuesta con el serializer completo"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ficha = serializer.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='crear',
            modelo='FichaEmergencia',
            objeto_id=ficha.id,
            detalles={
                'paciente': str(ficha.paciente),
                'prioridad': ficha.prioridad,
                'motivo': ficha.motivo_consulta[:100]
            },
            ip_address=get_client_ip(request)
        )
        
        # Crear notificaciones para TENS y Médicos
        paciente_nombre = f"{ficha.paciente.nombres} {ficha.paciente.apellidos}" if not ficha.paciente.es_nn else f"Paciente NN ({ficha.paciente.id_temporal})"
        prioridad_display = ficha.get_prioridad_display()
        
        # Notificar a TENS
        Notificacion.notificar_rol(
            rol='tens',
            tipo='nueva_ficha',
            titulo=f'Nueva emergencia en ruta',
            mensaje=f'Paciente: {paciente_nombre}\nPrioridad: {prioridad_display}\nMotivo: {ficha.motivo_consulta[:100]}...',
            ficha=ficha,
            prioridad='alta' if ficha.prioridad in ['C1', 'C2'] else 'media'
        )
        
        # Notificar a Médicos si es prioridad alta
        if ficha.prioridad in ['C1', 'C2']:
            Notificacion.notificar_rol(
                rol='medico',
                tipo='nueva_ficha',
                titulo=f'🚨 Emergencia {prioridad_display} en ruta',
                mensaje=f'Paciente: {paciente_nombre}\nMotivo: {ficha.motivo_consulta[:100]}...',
                ficha=ficha,
                prioridad='urgente'
            )
        
        # Devolver la ficha completa con todos los datos
        output_serializer = FichaEmergenciaSerializer(ficha)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=False, methods=['get'])
    def en_ruta(self, request):
        """Obtener fichas en ruta"""
        fichas = self.get_queryset().filter(estado='en_ruta')
        serializer = self.get_serializer(fichas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def en_hospital(self, request):
        """Obtener fichas en hospital"""
        fichas = self.get_queryset().filter(estado='en_hospital')
        serializer = self.get_serializer(fichas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def atendidas(self, request):
        """Obtener fichas atendidas hoy (con diagnóstico realizado hoy)"""
        from django.utils import timezone
        from .models import Diagnostico
        
        hoy = timezone.now().date()
        
        # Fichas con diagnóstico realizado hoy
        fichas_ids = Diagnostico.objects.filter(
            fecha_diagnostico__date=hoy
        ).values_list('ficha_id', flat=True)
        
        fichas = self.get_queryset().filter(
            id__in=fichas_ids
        ).order_by('-fecha_actualizacion')
        
        serializer = self.get_serializer(fichas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dados_de_alta(self, request):
        """Obtener fichas de pacientes dados de alta (domicilio y voluntaria)"""
        fichas = self.get_queryset().filter(
            estado='dado_de_alta',
            diagnostico__isnull=False
        ).order_by('-fecha_actualizacion')
        
        serializer = self.get_serializer(fichas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def hospitalizados(self, request):
        """Obtener fichas de pacientes hospitalizados"""
        fichas = self.get_queryset().filter(
            estado='hospitalizado',
            diagnostico__isnull=False
        ).order_by('-fecha_actualizacion')
        
        serializer = self.get_serializer(fichas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def en_uci(self, request):
        """Obtener fichas de pacientes en UCI"""
        fichas = self.get_queryset().filter(
            estado='uci',
            diagnostico__isnull=False
        ).order_by('-fecha_actualizacion')
        
        serializer = self.get_serializer(fichas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def derivados(self, request):
        """Obtener fichas de pacientes derivados"""
        fichas = self.get_queryset().filter(
            estado='derivado',
            diagnostico__isnull=False
        ).order_by('-fecha_actualizacion')
        
        serializer = self.get_serializer(fichas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def fallecidos(self, request):
        """Obtener fichas de pacientes fallecidos"""
        fichas = self.get_queryset().filter(
            estado='fallecido',
            diagnostico__isnull=False
        ).order_by('-fecha_actualizacion')
        
        serializer = self.get_serializer(fichas, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar el estado de una ficha"""
        from django.utils import timezone
        
        ficha = self.get_object()
        nuevo_estado = request.data.get('estado')
        estado_anterior = ficha.estado
        
        estados_validos = ['en_ruta', 'en_hospital', 'atendido', 'dado_de_alta', 'hospitalizado', 'uci', 'derivado', 'fallecido']
        if nuevo_estado not in estados_validos:
            return Response(
                {'error': 'Estado inválido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ficha.estado = nuevo_estado
        
        # Guardar fecha de llegada al hospital cuando cambia a en_hospital
        if nuevo_estado == 'en_hospital' and estado_anterior == 'en_ruta':
            ficha.fecha_llegada_hospital = timezone.now()
        
        ficha.save()
        
        # Registrar cambio de estado en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='alta' if nuevo_estado == 'dado_de_alta' else 'editar',
            modelo='FichaEmergencia',
            objeto_id=ficha.id,
            detalles={
                'estado_anterior': estado_anterior,
                'estado_nuevo': nuevo_estado,
                'paciente': str(ficha.paciente)
            },
            ip_address=get_client_ip(request)
        )
        
        # Si es dado de alta, liberar la cama automáticamente
        if nuevo_estado == 'dado_de_alta':
            cama = Cama.objects.filter(ficha_actual=ficha).first()
            if cama:
                cama.estado = 'limpieza'  # Pasa a limpieza antes de disponible
                cama.ficha_actual = None
                cama.fecha_asignacion = None
                cama.asignado_por = None
                cama.save()
                
                # Notificar que hay cama para limpiar
                Notificacion.notificar_rol(
                    rol='tens',
                    tipo='sistema',
                    titulo=f'🧹 Cama requiere limpieza',
                    mensaje=f'La cama {cama.numero} ha sido liberada y requiere limpieza.',
                    prioridad='baja'
                )
        
        # Crear notificaciones según el cambio de estado
        paciente_nombre = f"{ficha.paciente.nombres} {ficha.paciente.apellidos}" if not ficha.paciente.es_nn else f"Paciente NN ({ficha.paciente.id_temporal})"
        
        if nuevo_estado == 'en_hospital' and estado_anterior == 'en_ruta':
            # Paciente llegó al hospital - notificar TENS y Médicos
            Notificacion.notificar_roles(
                roles=['tens', 'medico'],
                tipo='ficha_llegada',
                titulo=f'🏥 Paciente llegó al hospital',
                mensaje=f'Paciente: {paciente_nombre}\nPrioridad: {ficha.get_prioridad_display()}\nRequiere triage y atención',
                ficha=ficha,
                prioridad='alta' if ficha.prioridad in ['C1', 'C2'] else 'media'
            )
        
        serializer = self.get_serializer(ficha)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def asignar_medico(self, request, pk=None):
        """Asignar médico a una ficha"""
        ficha = self.get_object()
        medico_id = request.data.get('medico_id')
        
        if not medico_id:
            return Response({'error': 'Debe proporcionar medico_id'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            medico = Usuario.objects.get(id=medico_id, rol='medico')
        except Usuario.DoesNotExist:
            return Response({'error': 'Médico no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        ficha.medico_asignado = medico
        ficha.save()
        
        # Notificar al médico
        paciente_nombre = f"{ficha.paciente.nombres} {ficha.paciente.apellidos}" if not ficha.paciente.es_nn else f"Paciente NN ({ficha.paciente.id_temporal})"
        Notificacion.objects.create(
            usuario=medico,
            tipo='asignacion',
            titulo=f'Nuevo paciente asignado',
            mensaje=f'Se le ha asignado el paciente: {paciente_nombre}\nPrioridad: {ficha.get_prioridad_display()}\nMotivo: {ficha.motivo_consulta[:100]}',
            ficha=ficha,
            prioridad='alta' if ficha.prioridad in ['C1', 'C2'] else 'media'
        )
        
        # Log de auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='editar',
            modelo='FichaEmergencia',
            objeto_id=ficha.id,
            detalles={
                'accion': 'asignar_medico',
                'medico_id': medico.id,
                'medico_nombre': medico.get_full_name()
            },
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(ficha)
        return Response(serializer.data)


class SignosVitalesViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de signos vitales"""
    queryset = SignosVitales.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SignosVitalesCreateSerializer
        return SignosVitalesSerializer
    
    def get_queryset(self):
        queryset = SignosVitales.objects.all()
        ficha_id = self.request.query_params.get('ficha', None)
        
        if ficha_id:
            queryset = queryset.filter(ficha_id=ficha_id)
        
        return queryset
    
    def _detectar_signos_criticos(self, signos):
        """Detectar si hay signos vitales críticos y retornar lista de alertas"""
        alertas = []
        
        # Frecuencia cardíaca crítica
        if signos.frecuencia_cardiaca:
            if signos.frecuencia_cardiaca < 50:
                alertas.append(f"Bradicardia severa: FC {signos.frecuencia_cardiaca} lpm")
            elif signos.frecuencia_cardiaca > 120:
                alertas.append(f"Taquicardia: FC {signos.frecuencia_cardiaca} lpm")
        
        # Presión arterial crítica
        if signos.presion_sistolica:
            if signos.presion_sistolica < 90:
                alertas.append(f"Hipotensión: PA {signos.presion_sistolica}/{signos.presion_diastolica} mmHg")
            elif signos.presion_sistolica > 180:
                alertas.append(f"Crisis hipertensiva: PA {signos.presion_sistolica}/{signos.presion_diastolica} mmHg")
        
        # Saturación de oxígeno crítica
        if signos.saturacion_o2:
            if signos.saturacion_o2 < 90:
                alertas.append(f"Hipoxemia severa: SatO2 {signos.saturacion_o2}%")
        
        # Temperatura crítica
        if signos.temperatura:
            if signos.temperatura < 35:
                alertas.append(f"Hipotermia: {signos.temperatura}°C")
            elif signos.temperatura > 39.5:
                alertas.append(f"Fiebre alta: {signos.temperatura}°C")
        
        # Frecuencia respiratoria crítica
        if signos.frecuencia_respiratoria:
            if signos.frecuencia_respiratoria < 10:
                alertas.append(f"Bradipnea: FR {signos.frecuencia_respiratoria} rpm")
            elif signos.frecuencia_respiratoria > 30:
                alertas.append(f"Taquipnea severa: FR {signos.frecuencia_respiratoria} rpm")
        
        # Glasgow crítico
        if signos.escala_glasgow and signos.escala_glasgow <= 8:
            alertas.append(f"Glasgow crítico: {signos.escala_glasgow}/15")
        
        return alertas
    
    def perform_create(self, serializer):
        """Registrar signos vitales en auditoría y notificar si hay críticos"""
        signos = serializer.save()
        
        # Auditoría
        AuditLog.objects.create(
            usuario=self.request.user,
            accion='crear',
            modelo='SignosVitales',
            objeto_id=signos.id,
            detalles={
                'ficha_id': signos.ficha.id,
                'paciente': str(signos.ficha.paciente),
                'fc': signos.frecuencia_cardiaca,
                'pa': f"{signos.presion_sistolica}/{signos.presion_diastolica}",
                'temp': str(signos.temperatura) if signos.temperatura else None,
                'sat': signos.saturacion_o2
            },
            ip_address=get_client_ip(self.request)
        )
        
        # Detectar signos críticos
        alertas = self._detectar_signos_criticos(signos)
        
        if alertas:
            # Notificar al médico asignado
            ficha = signos.ficha
            paciente_nombre = str(ficha.paciente) if ficha.paciente else f"NN-{ficha.id}"
            
            mensaje_alertas = "\n".join([f"⚠️ {a}" for a in alertas])
            
            # Si hay médico asignado, notificar solo a él
            if ficha.medico_asignado:
                Notificacion.crear_notificacion(
                    usuario=ficha.medico_asignado,
                    tipo='signos_criticos',
                    titulo=f'🚨 Signos Vitales Críticos',
                    mensaje=f'Paciente: {paciente_nombre}\n{mensaje_alertas}',
                    ficha=ficha,
                    prioridad='urgente'
                )
            else:
                # Si no hay médico asignado, notificar a todos los médicos
                Notificacion.notificar_rol(
                    rol='medico',
                    tipo='signos_criticos',
                    titulo=f'🚨 Signos Vitales Críticos',
                    mensaje=f'Paciente: {paciente_nombre}\n{mensaje_alertas}',
                    ficha=ficha,
                    prioridad='urgente'
                )


class SolicitudMedicamentoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de solicitudes de medicamentos"""
    queryset = SolicitudMedicamento.objects.all()
    serializer_class = SolicitudMedicamentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = SolicitudMedicamento.objects.select_related('ficha', 'paramedico', 'medico')
        
        estado = self.request.query_params.get('estado', None)
        ficha_id = self.request.query_params.get('ficha', None)
        
        if estado:
            queryset = queryset.filter(estado=estado)
        if ficha_id:
            queryset = queryset.filter(ficha_id=ficha_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def pendientes(self, request):
        """Obtener solicitudes pendientes de autorización"""
        solicitudes = self.get_queryset().filter(estado='pendiente')
        serializer = self.get_serializer(solicitudes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def autorizar(self, request, pk=None):
        """Autorizar una solicitud de medicamento"""
        solicitud = self.get_object()
        
        if solicitud.estado != 'pendiente':
            return Response(
                {'error': 'La solicitud ya fue procesada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        solicitud.estado = 'autorizado'
        solicitud.medico = request.user
        solicitud.respuesta = request.data.get('respuesta', 'Autorizado')
        solicitud.fecha_respuesta = timezone.now()
        solicitud.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='autorizar',
            modelo='SolicitudMedicamento',
            objeto_id=solicitud.id,
            detalles={
                'ficha_id': solicitud.ficha.id,
                'medicamento': solicitud.medicamento,
                'dosis': solicitud.dosis,
                'paciente': str(solicitud.ficha.paciente)
            },
            ip_address=get_client_ip(request)
        )
        
        # Notificar al paramédico que solicitó
        if solicitud.paramedico:
            Notificacion.crear_notificacion(
                usuario=solicitud.paramedico,
                tipo='medicamento_autorizado',
                titulo='✅ Medicamento autorizado',
                mensaje=f'{solicitud.medicamento} - {solicitud.dosis}\nAutorizado por: Dr. {request.user.get_full_name()}',
                ficha=solicitud.ficha,
                prioridad='alta'
            )
        
        # Notificar a TENS para administración
        Notificacion.notificar_rol(
            rol='tens',
            tipo='medicamento_autorizado',
            titulo='Medicamento autorizado para administrar',
            mensaje=f'Paciente: Ficha #{solicitud.ficha.id}\n{solicitud.medicamento} - {solicitud.dosis}',
            ficha=solicitud.ficha,
            prioridad='alta'
        )
        
        serializer = self.get_serializer(solicitud)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Rechazar una solicitud de medicamento"""
        solicitud = self.get_object()
        
        if solicitud.estado != 'pendiente':
            return Response(
                {'error': 'La solicitud ya fue procesada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        solicitud.estado = 'rechazado'
        solicitud.medico = request.user
        solicitud.respuesta = request.data.get('respuesta', 'Rechazado')
        solicitud.fecha_respuesta = timezone.now()
        solicitud.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='rechazar',
            modelo='SolicitudMedicamento',
            objeto_id=solicitud.id,
            detalles={
                'ficha_id': solicitud.ficha.id,
                'medicamento': solicitud.medicamento,
                'motivo': solicitud.respuesta,
                'paciente': str(solicitud.ficha.paciente)
            },
            ip_address=get_client_ip(request)
        )
        
        # Notificar al paramédico que solicitó
        if solicitud.paramedico:
            Notificacion.crear_notificacion(
                usuario=solicitud.paramedico,
                tipo='medicamento_rechazado',
                titulo='❌ Medicamento rechazado',
                mensaje=f'{solicitud.medicamento} - {solicitud.dosis}\nMotivo: {solicitud.respuesta}\nPor: Dr. {request.user.get_full_name()}',
                ficha=solicitud.ficha,
                prioridad='alta'
            )
        
        serializer = self.get_serializer(solicitud)
        return Response(serializer.data)


class AnamnesisViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de anamnesis"""
    queryset = Anamnesis.objects.all()
    serializer_class = AnamnesisSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Anamnesis.objects.select_related('ficha', 'tens')
        ficha_id = self.request.query_params.get('ficha', None)
        
        if ficha_id:
            queryset = queryset.filter(ficha_id=ficha_id)
        
        return queryset
    
    def perform_create(self, serializer):
        """Registrar anamnesis en auditoría"""
        anamnesis = serializer.save()
        AuditLog.objects.create(
            usuario=self.request.user,
            accion='crear',
            modelo='Anamnesis',
            objeto_id=anamnesis.id,
            detalles={
                'ficha_id': anamnesis.ficha.id,
                'paciente': str(anamnesis.ficha.paciente),
                'alergias': anamnesis.alergias[:50] if anamnesis.alergias else None,
                'antecedentes': bool(anamnesis.antecedentes_personales)
            },
            ip_address=get_client_ip(self.request)
        )
    
    def perform_update(self, serializer):
        """Registrar actualización de anamnesis en auditoría"""
        anamnesis = serializer.save()
        AuditLog.objects.create(
            usuario=self.request.user,
            accion='editar',
            modelo='Anamnesis',
            objeto_id=anamnesis.id,
            detalles={
                'ficha_id': anamnesis.ficha.id,
                'paciente': str(anamnesis.ficha.paciente)
            },
            ip_address=get_client_ip(self.request)
        )


class TriageViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de triage hospitalario"""
    queryset = Triage.objects.all()
    serializer_class = TriageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Triage.objects.select_related('ficha', 'realizado_por', 'ficha__paciente')
        ficha_id = self.request.query_params.get('ficha', None)
        
        if ficha_id:
            queryset = queryset.filter(ficha_id=ficha_id)
        
        return queryset.order_by('-fecha_triage')
    
    def create(self, request, *args, **kwargs):
        """Crear triage y notificar al equipo médico"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        triage = serializer.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='crear',
            modelo='Triage',
            objeto_id=triage.id,
            detalles={
                'ficha_id': triage.ficha.id,
                'paciente': str(triage.ficha.paciente),
                'nivel_esi': triage.nivel_esi,
                'motivo': triage.motivo_consulta_triage[:100] if triage.motivo_consulta_triage else None
            },
            ip_address=get_client_ip(request)
        )
        
        # Obtener información del paciente
        ficha = triage.ficha
        paciente = ficha.paciente
        paciente_nombre = f"{paciente.nombres} {paciente.apellidos}" if not paciente.es_nn else f"Paciente NN ({paciente.id_temporal})"
        tens_nombre = request.user.get_full_name() or request.user.username
        
        # Determinar prioridad de notificación según nivel ESI
        prioridad_notif = 'urgente' if triage.nivel_esi <= 2 else ('alta' if triage.nivel_esi == 3 else 'media')
        
        # Actualizar la prioridad de la ficha basándose en el triage
        prioridad_mapping = {
            1: 'C1',
            2: 'C2', 
            3: 'C3',
            4: 'C4',
            5: 'C5',
        }
        ficha.prioridad = prioridad_mapping.get(triage.nivel_esi, ficha.prioridad)
        ficha.save()
        
        # Notificar a médicos
        Notificacion.notificar_rol(
            rol='medico',
            tipo='triage_completado',
            titulo=f'Triage completado - ESI {triage.nivel_esi}',
            mensaje=f'Paciente: {paciente_nombre}\nNivel: {triage.get_nivel_esi_display()}\nMotivo: {triage.motivo_consulta_triage[:100]}...\nRealizado por: {tens_nombre}',
            ficha=ficha,
            prioridad=prioridad_notif
        )
        
        # Si es ESI 1-2, notificar también a administrador
        if triage.nivel_esi <= 2:
            Notificacion.notificar_rol(
                rol='administrador',
                tipo='triage_completado',
                titulo=f'🚨 Paciente crítico - ESI {triage.nivel_esi}',
                mensaje=f'Paciente: {paciente_nombre}\nRequiere atención inmediata\nTiempo máximo: {triage.get_tiempo_atencion_maximo()}',
                ficha=ficha,
                prioridad='urgente'
            )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=False, methods=['get'])
    def pendientes(self, request):
        """Obtener fichas que necesitan triage (en_hospital sin triage)"""
        fichas_sin_triage = FichaEmergencia.objects.filter(
            estado='en_hospital',
            triage__isnull=True
        ).select_related('paciente', 'paramedico').order_by('-fecha_registro')
        
        # Devolver serializado
        from .serializers import FichaEmergenciaSerializer
        serializer = FichaEmergenciaSerializer(fichas_sin_triage, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Estadísticas de triage del día"""
        from django.db.models import Count
        from datetime import datetime, timedelta
        
        hoy = timezone.now().date()
        
        # Contar por nivel ESI
        triages_hoy = Triage.objects.filter(fecha_triage__date=hoy)
        por_nivel = triages_hoy.values('nivel_esi').annotate(count=Count('id')).order_by('nivel_esi')
        
        # Tiempo promedio de espera (fichas con triage vs sin triage)
        total_triages = triages_hoy.count()
        
        return Response({
            'fecha': str(hoy),
            'total_triages': total_triages,
            'por_nivel_esi': list(por_nivel),
        })


class DiagnosticoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de diagnósticos"""
    queryset = Diagnostico.objects.all()
    serializer_class = DiagnosticoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Diagnostico.objects.select_related('ficha', 'medico')
        ficha_id = self.request.query_params.get('ficha', None)
        
        if ficha_id:
            queryset = queryset.filter(ficha_id=ficha_id)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Crear diagnóstico y cambiar estado según tipo de alta"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        diagnostico = serializer.save()
        
        # Registrar en auditoría
        tipo_alta = request.data.get('tipo_alta', 'domicilio')
        AuditLog.objects.create(
            usuario=request.user,
            accion='crear',
            modelo='Diagnostico',
            objeto_id=diagnostico.id,
            detalles={
                'ficha_id': diagnostico.ficha.id,
                'paciente': str(diagnostico.ficha.paciente),
                'diagnostico_cie10': diagnostico.diagnostico_cie10,
                'descripcion': diagnostico.descripcion[:100] if diagnostico.descripcion else None,
                'tipo_alta': tipo_alta
            },
            ip_address=get_client_ip(request)
        )
        
        # Obtener tipo de alta y cambiar estado de la ficha
        ficha_id = request.data.get('ficha')
        
        if ficha_id:
            try:
                ficha = FichaEmergencia.objects.get(id=ficha_id)
                
                # Mapeo de tipo de alta a estado de ficha
                estado_mapping = {
                    'domicilio': 'dado_de_alta',
                    'hospitalizacion': 'hospitalizado',
                    'uci': 'uci',
                    'derivacion': 'derivado',
                    'voluntaria': 'dado_de_alta',
                    'fallecido': 'fallecido',
                }
                
                nuevo_estado = estado_mapping.get(tipo_alta, 'dado_de_alta')
                ficha.estado = nuevo_estado
                ficha.save()
                
                # Crear notificaciones según tipo de alta
                paciente_nombre = f"{ficha.paciente.nombres} {ficha.paciente.apellidos}" if not ficha.paciente.es_nn else f"Paciente NN ({ficha.paciente.id_temporal})"
                medico_nombre = request.user.get_full_name() or request.user.username
                
                # Notificación base para TENS
                Notificacion.notificar_rol(
                    rol='tens',
                    tipo='diagnostico',
                    titulo=f'Diagnóstico completado',
                    mensaje=f'Paciente: {paciente_nombre}\nTipo de alta: {dict(Diagnostico.TIPO_ALTA_CHOICES).get(tipo_alta, tipo_alta)}\nMédico: Dr. {medico_nombre}',
                    ficha=ficha,
                    prioridad='media'
                )
                
                # Notificaciones específicas por tipo de alta
                if tipo_alta == 'hospitalizacion':
                    Notificacion.notificar_rol(
                        rol='administrador',
                        tipo='hospitalizacion',
                        titulo=f'🏥 Paciente requiere hospitalización',
                        mensaje=f'Paciente: {paciente_nombre}\nRequiere asignación de cama en hospitalización',
                        ficha=ficha,
                        prioridad='alta'
                    )
                elif tipo_alta == 'uci':
                    Notificacion.notificar_roles(
                        roles=['administrador', 'medico'],
                        tipo='ingreso_uci',
                        titulo=f'🚨 Ingreso a UCI',
                        mensaje=f'Paciente: {paciente_nombre}\nRequiere traslado urgente a UCI',
                        ficha=ficha,
                        prioridad='urgente'
                    )
                elif tipo_alta == 'derivacion':
                    destino = request.data.get('destino_derivacion', 'No especificado')
                    Notificacion.notificar_rol(
                        rol='administrador',
                        tipo='derivacion',
                        titulo=f'Paciente para derivación',
                        mensaje=f'Paciente: {paciente_nombre}\nDestino: {destino}\nCoordinar traslado',
                        ficha=ficha,
                        prioridad='alta'
                    )
                elif tipo_alta == 'fallecido':
                    Notificacion.notificar_rol(
                        rol='administrador',
                        tipo='fallecimiento',
                        titulo=f'⚫ Fallecimiento registrado',
                        mensaje=f'Paciente: {paciente_nombre}\nRequiere protocolo de fallecimiento y documentación',
                        ficha=ficha,
                        prioridad='urgente'
                    )
                
                # Liberar la cama automáticamente si el paciente se va (domicilio, derivación, voluntaria, fallecido)
                if tipo_alta in ['domicilio', 'derivacion', 'voluntaria', 'fallecido']:
                    if hasattr(ficha, 'cama_asignada') and ficha.cama_asignada:
                        cama = ficha.cama_asignada
                        cama.liberar()
                    
            except FichaEmergencia.DoesNotExist:
                pass
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class SolicitudExamenViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de solicitudes de exámenes"""
    queryset = SolicitudExamen.objects.all()
    serializer_class = SolicitudExamenSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Crear solicitud de examen y notificar a TENS"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        solicitud = serializer.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='crear',
            modelo='SolicitudExamen',
            objeto_id=solicitud.id,
            detalles={
                'ficha_id': solicitud.ficha.id,
                'tipo_examen': solicitud.tipo_examen,
                'prioridad': solicitud.prioridad,
                'paciente': str(solicitud.ficha.paciente)
            },
            ip_address=get_client_ip(request)
        )
        
        # Notificar a TENS sobre nuevo examen solicitado
        paciente = solicitud.ficha.paciente
        paciente_nombre = f"{paciente.nombres} {paciente.apellidos}" if not paciente.es_nn else f"Paciente NN ({paciente.id_temporal})"
        medico_nombre = request.user.get_full_name() or request.user.username
        
        Notificacion.notificar_rol(
            rol='tens',
            tipo='examen_solicitado',
            titulo=f'Nuevo examen solicitado',
            mensaje=f'Paciente: {paciente_nombre}\nExamen: {solicitud.tipo_examen}\nPrioridad: {solicitud.get_prioridad_display()}\nSolicitado por: Dr. {medico_nombre}',
            ficha=solicitud.ficha,
            prioridad='alta' if solicitud.prioridad == 'urgente' else 'media'
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def get_queryset(self):
        queryset = SolicitudExamen.objects.select_related('ficha', 'medico')
        
        ficha_id = self.request.query_params.get('ficha', None)
        if ficha_id:
            queryset = queryset.filter(ficha_id=ficha_id)
        
        estado = self.request.query_params.get('estado', None)
        if estado:
            queryset = queryset.filter(estado=estado)
        
        return queryset.order_by('-fecha_solicitud')
    
    @action(detail=False, methods=['get'])
    def pendientes(self, request):
        """Obtener solicitudes pendientes"""
        solicitudes = self.get_queryset().filter(estado='pendiente')
        serializer = self.get_serializer(solicitudes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def marcar_proceso(self, request, pk=None):
        """Marcar examen como en proceso"""
        solicitud = self.get_object()
        solicitud.estado = 'en_proceso'
        solicitud.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='editar',
            modelo='SolicitudExamen',
            objeto_id=solicitud.id,
            detalles={
                'ficha_id': solicitud.ficha.id,
                'tipo_examen': solicitud.tipo_examen,
                'estado': 'en_proceso'
            },
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(solicitud)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def completar(self, request, pk=None):
        """Completar examen con resultados"""
        solicitud = self.get_object()
        resultados = request.data.get('resultados', '')
        observaciones = request.data.get('observaciones', '')
        
        solicitud.estado = 'completado'
        solicitud.resultados = resultados
        if observaciones:
            solicitud.observaciones = observaciones
        solicitud.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='completar',
            modelo='SolicitudExamen',
            objeto_id=solicitud.id,
            detalles={
                'ficha_id': solicitud.ficha.id,
                'tipo_examen': solicitud.tipo_examen,
                'tiene_resultados': bool(resultados)
            },
            ip_address=get_client_ip(request)
        )
        
        # Notificar al médico que solicitó el examen
        if solicitud.medico:
            paciente = solicitud.ficha.paciente
            paciente_nombre = f"{paciente.nombres} {paciente.apellidos}" if not paciente.es_nn else f"Paciente NN ({paciente.id_temporal})"
            
            Notificacion.crear_notificacion(
                usuario=solicitud.medico,
                tipo='examen_completado',
                titulo=f'Resultados de examen disponibles',
                mensaje=f'Paciente: {paciente_nombre}\nExamen: {solicitud.tipo_examen}\nResultados listos para revisión',
                ficha=solicitud.ficha,
                prioridad='alta'
            )
        
        serializer = self.get_serializer(solicitud)
        return Response(serializer.data)


class DocumentosPDFViewSet(viewsets.ViewSet):
    """ViewSet para generación de documentos PDF"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='ficha/(?P<ficha_id>[^/.]+)')
    def ficha_pdf(self, request, ficha_id=None):
        """Generar PDF de ficha de emergencia completa"""
        try:
            ficha = FichaEmergencia.objects.select_related('paciente').get(id=ficha_id)
            signos_vitales = SignosVitales.objects.filter(ficha=ficha).order_by('timestamp')
            
            # Intentar obtener el diagnóstico si existe
            try:
                diagnostico = Diagnostico.objects.select_related('medico').get(ficha=ficha)
            except Diagnostico.DoesNotExist:
                diagnostico = None
            
            context = {
                'ficha': ficha,
                'paciente': ficha.paciente,
                'signos_vitales': signos_vitales,
                'diagnostico': diagnostico,
                'fecha_actual': timezone.now().strftime('%d/%m/%Y %H:%M'),
            }
            
            html_string = render_to_string('pdf/ficha_emergencia.html', context)
            html = HTML(string=html_string)
            pdf_file = html.write_pdf()
            
            # Registrar en auditoría
            AuditLog.objects.create(
                usuario=request.user,
                accion='generar_pdf',
                modelo='FichaEmergencia',
                objeto_id=ficha.id,
                detalles={
                    'tipo_documento': 'ficha_emergencia',
                    'paciente_id': ficha.paciente.id,
                    'paciente_nombre': f"{ficha.paciente.nombres} {ficha.paciente.apellidos}" if not ficha.paciente.es_nn else f"NN-{ficha.paciente.id_temporal}",
                },
                ip_address=get_client_ip(request)
            )
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="ficha_{ficha_id}.pdf"'
            return response
            
        except FichaEmergencia.DoesNotExist:
            return Response({'error': 'Ficha no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='receta/(?P<ficha_id>[^/.]+)')
    def receta_pdf(self, request, ficha_id=None):
        """Generar PDF de receta médica"""
        try:
            ficha = FichaEmergencia.objects.select_related('paciente').get(id=ficha_id)
            diagnostico = Diagnostico.objects.select_related('medico').get(ficha=ficha)
            
            context = {
                'ficha': ficha,
                'paciente': ficha.paciente,
                'diagnostico': diagnostico,
                'medico': diagnostico.medico,
                'fecha_actual': timezone.now().strftime('%d/%m/%Y %H:%M'),
            }
            
            html_string = render_to_string('pdf/receta_medica.html', context)
            html = HTML(string=html_string)
            pdf_file = html.write_pdf()
            
            # Registrar en auditoría
            AuditLog.objects.create(
                usuario=request.user,
                accion='generar_pdf',
                modelo='Diagnostico',
                objeto_id=diagnostico.id,
                detalles={
                    'tipo_documento': 'receta_medica',
                    'ficha_id': ficha.id,
                    'paciente_nombre': f"{ficha.paciente.nombres} {ficha.paciente.apellidos}" if not ficha.paciente.es_nn else f"NN-{ficha.paciente.id_temporal}",
                    'medico': f"{diagnostico.medico.first_name} {diagnostico.medico.last_name}",
                },
                ip_address=get_client_ip(request)
            )
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="receta_{ficha_id}.pdf"'
            return response
            
        except FichaEmergencia.DoesNotExist:
            return Response({'error': 'Ficha no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        except Diagnostico.DoesNotExist:
            return Response({'error': 'No hay diagnóstico para esta ficha'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='orden-examenes/(?P<ficha_id>[^/.]+)')
    def orden_examenes_pdf(self, request, ficha_id=None):
        """Generar PDF de orden de exámenes"""
        try:
            ficha = FichaEmergencia.objects.select_related('paciente').get(id=ficha_id)
            diagnostico = Diagnostico.objects.select_related('medico').get(ficha=ficha)
            
            # Obtener solicitudes de exámenes si existen
            examenes = SolicitudExamen.objects.filter(ficha=ficha)
            examenes_list = []
            for examen in examenes:
                examenes_list.append({
                    'nombre': examen.tipo_examen,
                    'urgente': examen.prioridad == 'alta',
                    'indicaciones': examen.observaciones
                })
            
            # Si no hay solicitudes específicas, usar el texto del tratamiento/indicaciones
            examenes_texto = diagnostico.indicaciones_medicas if diagnostico.indicaciones_medicas else ""
            
            context = {
                'ficha': ficha,
                'paciente': ficha.paciente,
                'diagnostico': diagnostico,
                'medico': diagnostico.medico,
                'examenes_list': examenes_list if examenes_list else None,
                'examenes_texto': examenes_texto,
                'fecha_actual': timezone.now().strftime('%d/%m/%Y %H:%M'),
            }
            
            html_string = render_to_string('pdf/orden_examenes.html', context)
            html = HTML(string=html_string)
            pdf_file = html.write_pdf()
            
            # Registrar en auditoría
            AuditLog.objects.create(
                usuario=request.user,
                accion='generar_pdf',
                modelo='SolicitudExamen',
                objeto_id=ficha.id,
                detalles={
                    'tipo_documento': 'orden_examenes',
                    'ficha_id': ficha.id,
                    'paciente_nombre': f"{ficha.paciente.nombres} {ficha.paciente.apellidos}" if not ficha.paciente.es_nn else f"NN-{ficha.paciente.id_temporal}",
                    'cantidad_examenes': len(examenes_list),
                },
                ip_address=get_client_ip(request)
            )
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="orden_examenes_{ficha_id}.pdf"'
            return response
            
        except FichaEmergencia.DoesNotExist:
            return Response({'error': 'Ficha no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        except Diagnostico.DoesNotExist:
            return Response({'error': 'No hay diagnóstico para esta ficha'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='alta/(?P<ficha_id>[^/.]+)')
    def alta_pdf(self, request, ficha_id=None):
        """Generar PDF de alta médica"""
        try:
            ficha = FichaEmergencia.objects.select_related('paciente').get(id=ficha_id)
            
            # Intentar obtener el diagnóstico
            try:
                diagnostico = Diagnostico.objects.select_related('medico').get(ficha=ficha)
                medico = diagnostico.medico
            except Diagnostico.DoesNotExist:
                diagnostico = None
                # Usar el usuario actual como médico si no hay diagnóstico
                medico = request.user
            
            context = {
                'ficha': ficha,
                'paciente': ficha.paciente,
                'diagnostico': diagnostico,
                'medico': medico,
                'fecha_actual': timezone.now().strftime('%d/%m/%Y %H:%M'),
            }
            
            html_string = render_to_string('pdf/alta_medica.html', context)
            html = HTML(string=html_string)
            pdf_file = html.write_pdf()
            
            # Registrar en auditoría
            AuditLog.objects.create(
                usuario=request.user,
                accion='generar_pdf',
                modelo='FichaEmergencia',
                objeto_id=ficha.id,
                detalles={
                    'tipo_documento': 'alta_medica',
                    'ficha_id': ficha.id,
                    'paciente_nombre': f"{ficha.paciente.nombres} {ficha.paciente.apellidos}" if not ficha.paciente.es_nn else f"NN-{ficha.paciente.id_temporal}",
                },
                ip_address=get_client_ip(request)
            )
            
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="alta_{ficha_id}.pdf"'
            return response
            
        except FichaEmergencia.DoesNotExist:
            return Response({'error': 'Ficha no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UsuarioViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de usuarios (solo administradores)"""
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Solo administradores pueden ver todos los usuarios
        if self.request.user.rol == 'administrador':
            queryset = Usuario.objects.all()
            
            # Filtros opcionales
            rol = self.request.query_params.get('rol', None)
            search = self.request.query_params.get('search', None)
            activo = self.request.query_params.get('activo', None)
            
            if rol:
                queryset = queryset.filter(rol=rol)
            if search:
                queryset = queryset.filter(
                    Q(first_name__icontains=search) |
                    Q(last_name__icontains=search) |
                    Q(email__icontains=search) |
                    Q(rut__icontains=search)
                )
            if activo is not None:
                queryset = queryset.filter(is_active=(activo.lower() == 'true'))
            
            return queryset.order_by('-date_joined')
        return Usuario.objects.filter(id=self.request.user.id)
    
    def create(self, request, *args, **kwargs):
        # Solo administradores pueden crear usuarios
        if request.user.rol != 'administrador':
            return Response(
                {'error': 'No tienes permisos para crear usuarios'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='crear',
            modelo='Usuario',
            objeto_id=usuario.id,
            detalles={
                'usuario_creado': usuario.get_full_name(),
                'rol': usuario.rol,
                'email': usuario.email
            },
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        # Solo administradores pueden editar usuarios
        if request.user.rol != 'administrador':
            return Response(
                {'error': 'No tienes permisos para editar usuarios'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='editar',
            modelo='Usuario',
            objeto_id=usuario.id,
            detalles={
                'usuario_editado': usuario.get_full_name(),
                'cambios': request.data
            },
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        # Solo administradores pueden eliminar usuarios
        if request.user.rol != 'administrador':
            return Response(
                {'error': 'No tienes permisos para eliminar usuarios'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance = self.get_object()
        usuario_info = {
            'nombre': instance.get_full_name(),
            'rol': instance.rol,
            'email': instance.email
        }
        
        # Registrar en auditoría antes de eliminar
        AuditLog.objects.create(
            usuario=request.user,
            accion='eliminar',
            modelo='Usuario',
            objeto_id=instance.id,
            detalles={'usuario_eliminado': usuario_info},
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        instance.is_active = False
        instance.save()
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Estadísticas de usuarios para el dashboard del administrador"""
        if request.user.rol != 'administrador':
            return Response(
                {'error': 'No tienes permisos'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        hoy = timezone.now().date()
        
        total_usuarios = Usuario.objects.filter(is_active=True).count()
        usuarios_por_rol = {}
        for rol_code, rol_nombre in Usuario.ROL_CHOICES:
            usuarios_por_rol[rol_code] = Usuario.objects.filter(rol=rol_code, is_active=True).count()
        
        # Personal con turno asignado hoy (excluyendo descansos)
        turnos_hoy = Turno.objects.filter(fecha=hoy).exclude(tipo_turno='DESCANSO')
        personal_en_turno = turnos_hoy.count()
        
        # Personal en turno por rol
        personal_turno_por_rol = {}
        for turno in turnos_hoy.select_related('usuario'):
            rol = turno.usuario.rol
            if rol not in personal_turno_por_rol:
                personal_turno_por_rol[rol] = 0
            personal_turno_por_rol[rol] += 1
        
        # Estadísticas de fichas
        fichas_en_ruta = FichaEmergencia.objects.filter(estado='en_ruta').count()
        fichas_en_hospital = FichaEmergencia.objects.filter(estado='en_hospital').count()
        
        return Response({
            'total_usuarios': total_usuarios,
            'usuarios_por_rol': usuarios_por_rol,
            'usuarios_activos_hoy': Usuario.objects.filter(
                last_login__date=hoy
            ).count(),
            'personal_en_turno': personal_en_turno,
            'personal_turno_por_rol': personal_turno_por_rol,
            'fichas_en_ruta': fichas_en_ruta,
            'fichas_en_hospital': fichas_en_hospital
        })
    
    @action(detail=False, methods=['get'])
    def medicos(self, request):
        """Obtener lista de médicos activos para asignación"""
        solo_en_turno = request.query_params.get('en_turno', 'false').lower() == 'true'
        
        medicos = Usuario.objects.filter(rol='medico', is_active=True).order_by('first_name', 'last_name')
        
        # Si se pide solo médicos en turno, filtrar
        if solo_en_turno:
            hoy = timezone.now().date()
            turnos_hoy = Turno.objects.filter(
                fecha=hoy,
                usuario__rol='medico'
            ).exclude(tipo_turno='DESCANSO').values_list('usuario_id', flat=True)
            medicos = medicos.filter(id__in=turnos_hoy)
        
        # Agregar conteo de pacientes asignados a cada médico
        from django.db.models import Count
        medicos_con_pacientes = medicos.annotate(
            pacientes_asignados=Count('fichas_medico', filter=Q(fichas_medico__estado__in=['en_hospital', 'atendido']))
        )
        
        data = []
        for medico in medicos_con_pacientes:
            # Verificar si está en turno hoy
            hoy = timezone.now().date()
            turno_hoy = Turno.objects.filter(
                usuario=medico,
                fecha=hoy
            ).exclude(tipo_turno='DESCANSO').first()
            
            data.append({
                'id': medico.id,
                'nombre': medico.get_full_name(),
                'especialidad': medico.especialidad or 'General',
                'pacientes_asignados': medico.pacientes_asignados,
                'en_turno': turno_hoy is not None,
                'tipo_turno': turno_hoy.tipo_turno if turno_hoy else None
            })
        
        return Response(data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para logs de auditoría (solo lectura, solo administradores)"""
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Solo administradores pueden ver logs
        if self.request.user.rol != 'administrador':
            return AuditLog.objects.none()
        
        queryset = AuditLog.objects.all()
        
        # Filtros
        usuario_id = self.request.query_params.get('usuario', None)
        accion = self.request.query_params.get('accion', None)
        modelo = self.request.query_params.get('modelo', None)
        fecha_desde = self.request.query_params.get('fecha_desde', None)
        fecha_hasta = self.request.query_params.get('fecha_hasta', None)
        
        if usuario_id:
            # Buscar por nombre de usuario (parcial) o por ID
            if usuario_id.isdigit():
                queryset = queryset.filter(usuario_id=usuario_id)
            else:
                queryset = queryset.filter(usuario_nombre__icontains=usuario_id)
        if accion:
            queryset = queryset.filter(accion=accion)
        if modelo:
            queryset = queryset.filter(modelo=modelo)
        if fecha_desde:
            queryset = queryset.filter(timestamp__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(timestamp__lte=fecha_hasta)
        
        return queryset.order_by('-timestamp')
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Resumen de actividad para el dashboard"""
        if request.user.rol != 'administrador':
            return Response(
                {'error': 'No tienes permisos'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        hoy = timezone.now().date()
        logs_hoy = AuditLog.objects.filter(timestamp__date=hoy)
        
        return Response({
            'total_acciones_hoy': logs_hoy.count(),
            'acciones_por_tipo': {
                accion[0]: logs_hoy.filter(accion=accion[0]).count()
                for accion in AuditLog.ACCION_CHOICES
            },
            'ultimas_acciones': AuditLogSerializer(
                AuditLog.objects.all()[:10], many=True
            ).data
        })


class ConfiguracionHospitalViewSet(viewsets.ModelViewSet):
    """ViewSet para configuración del hospital"""
    queryset = ConfiguracionHospital.objects.all()
    serializer_class = ConfiguracionHospitalSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        # Solo administradores pueden modificar la configuración
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdministrador()]
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['get'])
    def actual(self, request):
        """Obtiene la configuración actual del hospital"""
        config = ConfiguracionHospital.get_configuracion()
        serializer = self.get_serializer(config)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def actualizar(self, request):
        """Actualiza la configuración del hospital"""
        config = ConfiguracionHospital.get_configuracion()
        config.camas_totales = request.data.get('camas_totales', config.camas_totales)
        config.camas_uci = request.data.get('camas_uci', config.camas_uci)
        config.salas_emergencia = request.data.get('salas_emergencia', config.salas_emergencia)
        config.boxes_atencion = request.data.get('boxes_atencion', config.boxes_atencion)
        config.actualizado_por = request.user
        config.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='editar',
            modelo='ConfiguracionHospital',
            objeto_id=config.id,
            detalles={
                'camas_totales': config.camas_totales,
                'camas_uci': config.camas_uci,
                'salas_emergencia': config.salas_emergencia,
                'boxes_atencion': config.boxes_atencion,
            },
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(config)
        return Response(serializer.data)


class CamaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de camas"""
    queryset = Cama.objects.all()
    serializer_class = CamaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Cama.objects.select_related('ficha_actual__paciente', 'asignado_por').all()
        
        # Filtros
        tipo = self.request.query_params.get('tipo', None)
        estado = self.request.query_params.get('estado', None)
        piso = self.request.query_params.get('piso', None)
        
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        if estado:
            queryset = queryset.filter(estado=estado)
        if piso:
            queryset = queryset.filter(piso=piso)
        
        return queryset
    
    def perform_create(self, serializer):
        """Registrar creación en auditoría"""
        cama = serializer.save()
        AuditLog.objects.create(
            usuario=self.request.user,
            accion='crear',
            modelo='Cama',
            objeto_id=cama.id,
            detalles={'numero': cama.numero, 'tipo': cama.tipo},
            ip_address=get_client_ip(self.request)
        )
    
    def perform_update(self, serializer):
        """Registrar actualización en auditoría"""
        cama = serializer.save()
        AuditLog.objects.create(
            usuario=self.request.user,
            accion='editar',
            modelo='Cama',
            objeto_id=cama.id,
            detalles={'numero': cama.numero, 'estado': cama.estado},
            ip_address=get_client_ip(self.request)
        )
    
    def perform_destroy(self, instance):
        """Registrar eliminación en auditoría"""
        cama_info = {'numero': instance.numero, 'tipo': instance.tipo}
        cama_id = instance.id
        instance.delete()
        AuditLog.objects.create(
            usuario=self.request.user,
            accion='eliminar',
            modelo='Cama',
            objeto_id=cama_id,
            detalles=cama_info,
            ip_address=get_client_ip(self.request)
        )
    
    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        """Obtener camas disponibles"""
        tipo = request.query_params.get('tipo', None)
        queryset = self.get_queryset().filter(estado='disponible')
        
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Estadísticas de ocupación de camas"""
        total = Cama.objects.count()
        ocupadas = Cama.objects.filter(estado='ocupada').count()
        disponibles = Cama.objects.filter(estado='disponible').count()
        mantenimiento = Cama.objects.filter(estado='mantenimiento').count()
        limpieza = Cama.objects.filter(estado='limpieza').count()
        
        por_tipo = {}
        for tipo, _ in Cama.TIPO_CHOICES:
            tipo_total = Cama.objects.filter(tipo=tipo).count()
            tipo_ocupadas = Cama.objects.filter(tipo=tipo, estado='ocupada').count()
            tipo_disponibles = Cama.objects.filter(tipo=tipo, estado='disponible').count()
            por_tipo[tipo] = {
                'total': tipo_total,
                'ocupadas': tipo_ocupadas,
                'disponibles': tipo_disponibles,
                'porcentaje_ocupacion': round((tipo_ocupadas / tipo_total * 100) if tipo_total > 0 else 0, 1)
            }
        
        return Response({
            'total': total,
            'ocupadas': ocupadas,
            'disponibles': disponibles,
            'mantenimiento': mantenimiento,
            'limpieza': limpieza,
            'porcentaje_ocupacion': round((ocupadas / total * 100) if total > 0 else 0, 1),
            'por_tipo': por_tipo
        })
    
    @action(detail=True, methods=['post'])
    def asignar(self, request, pk=None):
        """Asignar cama a una ficha"""
        cama = self.get_object()
        ficha_id = request.data.get('ficha_id')
        
        if not ficha_id:
            return Response({'error': 'Debe proporcionar ficha_id'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            ficha = FichaEmergencia.objects.get(id=ficha_id)
        except FichaEmergencia.DoesNotExist:
            return Response({'error': 'Ficha no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        
        if cama.estado != 'disponible':
            return Response({'error': 'La cama no está disponible'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Si la ficha ya tiene una cama asignada, liberarla primero
        cama_anterior = Cama.objects.filter(ficha_actual=ficha).first()
        if cama_anterior:
            cama_anterior.liberar()
        
        cama.asignar(ficha, request.user)
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='editar',
            modelo='Cama',
            objeto_id=cama.id,
            detalles={
                'accion': 'asignar',
                'ficha_id': ficha.id,
                'paciente': str(ficha.paciente)
            },
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(cama)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def liberar(self, request, pk=None):
        """Liberar cama"""
        cama = self.get_object()
        
        if cama.estado != 'ocupada':
            return Response({'error': 'La cama no está ocupada'}, status=status.HTTP_400_BAD_REQUEST)
        
        ficha_id = cama.ficha_actual.id if cama.ficha_actual else None
        cama.estado = 'limpieza'  # Pasa a limpieza primero
        cama.ficha_actual = None
        cama.fecha_asignacion = None
        cama.asignado_por = None
        cama.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='editar',
            modelo='Cama',
            objeto_id=cama.id,
            detalles={
                'accion': 'liberar',
                'ficha_id': ficha_id
            },
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(cama)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def marcar_lista(self, request, pk=None):
        """Marcar cama como lista/disponible después de limpieza"""
        cama = self.get_object()
        
        if cama.estado not in ['limpieza', 'mantenimiento']:
            return Response({'error': 'La cama debe estar en limpieza o mantenimiento'}, status=status.HTTP_400_BAD_REQUEST)
        
        cama.estado = 'disponible'
        cama.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='editar',
            modelo='Cama',
            objeto_id=cama.id,
            detalles={'accion': 'marcar_lista'},
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(cama)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado de una cama"""
        cama = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        estados_validos = ['disponible', 'ocupada', 'reservada', 'mantenimiento', 'limpieza']
        if nuevo_estado not in estados_validos:
            return Response({'error': f'Estado inválido. Debe ser uno de: {estados_validos}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # No permitir cambiar a ocupada sin asignar ficha
        if nuevo_estado == 'ocupada' and not cama.ficha_actual:
            return Response({'error': 'No se puede marcar como ocupada sin asignar un paciente'}, status=status.HTTP_400_BAD_REQUEST)
        
        estado_anterior = cama.estado
        cama.estado = nuevo_estado
        cama.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='editar',
            modelo='Cama',
            objeto_id=cama.id,
            detalles={
                'accion': 'cambiar_estado',
                'estado_anterior': estado_anterior,
                'estado_nuevo': nuevo_estado
            },
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(cama)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def tipos(self, request):
        """Obtener tipos de camas disponibles"""
        tipos = [{'value': tipo, 'label': label} for tipo, label in Cama.TIPO_CHOICES]
        return Response(tipos)
    
    @action(detail=False, methods=['get'])
    def tipos_disponibles(self, request):
        """Obtener resumen de camas por tipo"""
        resultado = []
        for tipo, label in Cama.TIPO_CHOICES:
            camas = Cama.objects.filter(tipo=tipo)
            total = camas.count()
            disponibles = camas.filter(estado='disponible').count()
            ocupadas = camas.filter(estado='ocupada').count()
            if total > 0:
                resultado.append({
                    'tipo': tipo,
                    'label': label,
                    'total': total,
                    'disponibles': disponibles,
                    'ocupadas': ocupadas,
                })
        return Response(resultado)
    
    @action(detail=False, methods=['post'])
    def eliminar_tipo(self, request):
        """Eliminar todas las camas de un tipo"""
        if request.user.rol != 'administrador':
            return Response({'error': 'Solo administradores pueden eliminar camas'}, status=status.HTTP_403_FORBIDDEN)
        
        tipo = request.data.get('tipo')
        tipos_validos = [t[0] for t in Cama.TIPO_CHOICES]
        if tipo not in tipos_validos:
            return Response({'error': f'Tipo inválido. Debe ser uno de: {tipos_validos}'}, status=status.HTTP_400_BAD_REQUEST)
        
        camas = Cama.objects.filter(tipo=tipo)
        ocupadas = camas.filter(estado='ocupada').count()
        
        if ocupadas > 0:
            return Response({'error': f'No se pueden eliminar: hay {ocupadas} camas ocupadas de tipo {tipo}'}, status=status.HTTP_400_BAD_REQUEST)
        
        total = camas.count()
        camas.delete()
        
        # Auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='eliminar',
            modelo='Cama',
            detalles={'accion': 'eliminar_tipo', 'tipo': tipo, 'cantidad': total},
        )
        
        return Response({'mensaje': f'Se eliminaron {total} camas de tipo {tipo}', 'eliminadas': total})
    
    @action(detail=False, methods=['post'])
    def crear_multiple(self, request):
        """Crear múltiples camas de un tipo"""
        if request.user.rol != 'administrador':
            return Response({'error': 'Solo administradores pueden crear camas'}, status=status.HTTP_403_FORBIDDEN)
        
        tipo = request.data.get('tipo')
        cantidad = request.data.get('cantidad', 1)
        
        tipos_validos = [t[0] for t in Cama.TIPO_CHOICES]
        if tipo not in tipos_validos:
            return Response({'error': f'Tipo inválido. Debe ser uno de: {tipos_validos}'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            cantidad = int(cantidad)
            if cantidad < 1 or cantidad > 50:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'error': 'La cantidad debe ser un número entre 1 y 50'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Obtener el último número de camas de ese tipo
        prefijo = tipo.upper().replace('_', '-')
        if tipo == 'cama_general':
            prefijo = 'CAM'
        elif tipo == 'box':
            prefijo = 'BOX'
        elif tipo == 'uci':
            prefijo = 'UCI'
        elif tipo == 'uti':
            prefijo = 'UTI'
        
        camas_existentes = Cama.objects.filter(tipo=tipo).count()
        
        camas_creadas = []
        for i in range(1, cantidad + 1):
            numero = f"{prefijo}-{(camas_existentes + i):02d}"
            # Verificar que no exista
            if Cama.objects.filter(numero=numero).exists():
                # Buscar el siguiente disponible
                j = camas_existentes + i
                while Cama.objects.filter(numero=f"{prefijo}-{j:02d}").exists():
                    j += 1
                numero = f"{prefijo}-{j:02d}"
            
            cama = Cama.objects.create(numero=numero, tipo=tipo, estado='disponible')
            camas_creadas.append(cama)
        
        # Auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='crear',
            modelo='Cama',
            objeto_id=0,
            detalles={'accion': 'crear_multiple', 'tipo': tipo, 'cantidad': cantidad},
            ip_address=get_client_ip(request)
        )
        
        serializer = self.get_serializer(camas_creadas, many=True)
        return Response({
            'mensaje': f'Se crearon {cantidad} camas de tipo {tipo}',
            'camas': serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def eliminar_multiple(self, request):
        """Eliminar múltiples camas (solo las que estén disponibles)"""
        if request.user.rol != 'administrador':
            return Response({'error': 'Solo administradores pueden eliminar camas'}, status=status.HTTP_403_FORBIDDEN)
        
        ids = request.data.get('ids', [])
        
        if not ids:
            return Response({'error': 'Debe proporcionar lista de IDs'}, status=status.HTTP_400_BAD_REQUEST)
        
        camas = Cama.objects.filter(id__in=ids, estado='disponible')
        count = camas.count()
        
        if count == 0:
            return Response({'error': 'No se encontraron camas disponibles para eliminar'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='eliminar',
            modelo='Cama',
            objeto_id=0,
            detalles={'accion': 'eliminar_multiple', 'ids': ids, 'eliminadas': count},
            ip_address=get_client_ip(request)
        )
        
        camas.delete()
        
        return Response({'mensaje': f'Se eliminaron {count} camas'})


class ArchivoAdjuntoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de archivos adjuntos"""
    queryset = ArchivoAdjunto.objects.all()
    serializer_class = ArchivoAdjuntoSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        if self.action in ['create', 'upload']:
            return ArchivoAdjuntoUploadSerializer
        return ArchivoAdjuntoSerializer
    
    def get_queryset(self):
        queryset = ArchivoAdjunto.objects.all()
        ficha_id = self.request.query_params.get('ficha')
        if ficha_id:
            queryset = queryset.filter(ficha_id=ficha_id)
        return queryset.order_by('-fecha_subida')
    
    def perform_create(self, serializer):
        archivo = serializer.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=self.request.user,
            accion='crear',
            modelo='ArchivoAdjunto',
            objeto_id=archivo.id,
            detalles={
                'nombre': archivo.nombre_original,
                'tipo': archivo.tipo,
                'ficha_id': archivo.ficha_id,
            },
            ip_address=get_client_ip(self.request)
        )
    
    def perform_destroy(self, instance):
        # Registrar en auditoría antes de eliminar
        AuditLog.objects.create(
            usuario=self.request.user,
            accion='eliminar',
            modelo='ArchivoAdjunto',
            objeto_id=instance.id,
            detalles={
                'nombre': instance.nombre_original,
                'tipo': instance.tipo,
                'ficha_id': instance.ficha_id,
            },
            ip_address=get_client_ip(self.request)
        )
        instance.delete()
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request):
        """Subir un nuevo archivo adjunto"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"Upload request data: {request.data}")
        logger.info(f"Upload request FILES: {request.FILES}")
        
        serializer = ArchivoAdjuntoUploadSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            archivo = serializer.save()
            
            # Registrar en auditoría
            AuditLog.objects.create(
                usuario=request.user,
                accion='crear',
                modelo='ArchivoAdjunto',
                objeto_id=archivo.id,
                detalles={
                    'nombre': archivo.nombre_original,
                    'tipo': archivo.tipo,
                    'ficha_id': archivo.ficha_id,
                    'metodo': 'upload_action',
                },
                ip_address=get_client_ip(request)
            )
            
            return Response(ArchivoAdjuntoSerializer(archivo, context={'request': request}).data, status=status.HTTP_201_CREATED)
        
        logger.error(f"Upload validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def por_ficha(self, request):
        """Obtener todos los archivos de una ficha"""
        ficha_id = request.query_params.get('ficha_id')
        if not ficha_id:
            return Response({'error': 'Debe proporcionar ficha_id'}, status=status.HTTP_400_BAD_REQUEST)
        
        archivos = ArchivoAdjunto.objects.filter(ficha_id=ficha_id).order_by('-fecha_subida')
        serializer = self.get_serializer(archivos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Descargar un archivo"""
        archivo = self.get_object()
        response = FileResponse(archivo.archivo.open('rb'), as_attachment=True)
        response['Content-Disposition'] = f'attachment; filename="{archivo.nombre_original}"'
        return response


class MensajeChatViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de mensajes de chat"""
    queryset = MensajeChat.objects.all()
    serializer_class = MensajeChatSerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MensajeChatCreateSerializer
        return MensajeChatSerializer
    
    def get_queryset(self):
        queryset = MensajeChat.objects.all()
        ficha_id = self.request.query_params.get('ficha')
        if ficha_id:
            queryset = queryset.filter(ficha_id=ficha_id)
        return queryset.order_by('fecha_envio')
    
    def create(self, request, *args, **kwargs):
        """Override create para devolver el mensaje con el serializer completo"""
        create_serializer = self.get_serializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        mensaje = create_serializer.save()
        
        # Crear notificaciones para otros usuarios involucrados en la ficha
        ficha = mensaje.ficha
        autor = mensaje.autor
        autor_nombre = autor.get_full_name() or autor.username
        paciente = ficha.paciente
        paciente_nombre = f"{paciente.nombres} {paciente.apellidos}" if not paciente.es_nn else f"Paciente NN ({paciente.id_temporal})"
        
        # Obtener usuarios que han participado en el chat de esta ficha o están relacionados
        usuarios_notificar = set()
        
        # Agregar paramédico de la ficha
        if ficha.paramedico and ficha.paramedico != autor:
            usuarios_notificar.add(ficha.paramedico)
        
        # Agregar médico del diagnóstico si existe
        if hasattr(ficha, 'diagnostico') and ficha.diagnostico and ficha.diagnostico.medico and ficha.diagnostico.medico != autor:
            usuarios_notificar.add(ficha.diagnostico.medico)
        
        # Agregar TENS de la anamnesis si existe
        if hasattr(ficha, 'anamnesis') and ficha.anamnesis and ficha.anamnesis.tens and ficha.anamnesis.tens != autor:
            usuarios_notificar.add(ficha.anamnesis.tens)
        
        # Agregar otros participantes del chat
        otros_autores = MensajeChat.objects.filter(ficha=ficha).exclude(autor=autor).values_list('autor', flat=True).distinct()
        for usuario_id in otros_autores:
            try:
                usuario = Usuario.objects.get(id=usuario_id)
                if usuario != autor:
                    usuarios_notificar.add(usuario)
            except Usuario.DoesNotExist:
                pass
        
        # Crear notificaciones
        for usuario in usuarios_notificar:
            Notificacion.crear_notificacion(
                usuario=usuario,
                tipo='mensaje_chat',
                titulo=f'💬 Nuevo mensaje de {autor_nombre}',
                mensaje=f'Paciente: {paciente_nombre}\n"{mensaje.contenido[:100]}..."' if len(mensaje.contenido) > 100 else f'Paciente: {paciente_nombre}\n"{mensaje.contenido}"',
                ficha=ficha,
                prioridad='media'
            )
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='crear',
            modelo='MensajeChat',
            objeto_id=mensaje.id,
            detalles={
                'ficha_id': ficha.id,
                'contenido_preview': mensaje.contenido[:100] if len(mensaje.contenido) > 100 else mensaje.contenido,
                'paciente': paciente_nombre,
            },
            ip_address=get_client_ip(request)
        )
        
        # Devolver con el serializer de lectura para incluir autor completo
        read_serializer = MensajeChatSerializer(mensaje, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        serializer.save()
    
    @action(detail=False, methods=['get'])
    def por_ficha(self, request):
        """Obtener todos los mensajes de una ficha"""
        ficha_id = request.query_params.get('ficha_id')
        if not ficha_id:
            return Response({'error': 'Debe proporcionar ficha_id'}, status=status.HTTP_400_BAD_REQUEST)
        
        mensajes = MensajeChat.objects.filter(ficha_id=ficha_id).order_by('fecha_envio')
        serializer = self.get_serializer(mensajes, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def no_leidos(self, request):
        """Obtener conteo de mensajes no leídos por ficha"""
        user = request.user
        ficha_id = request.query_params.get('ficha_id')
        
        queryset = MensajeChat.objects.exclude(autor=user).exclude(leido_por=user)
        if ficha_id:
            queryset = queryset.filter(ficha_id=ficha_id)
        
        # Agrupar por ficha
        from django.db.models import Count
        conteos = queryset.values('ficha').annotate(no_leidos=Count('id'))
        
        return Response(list(conteos))
    
    @action(detail=False, methods=['post'])
    def marcar_leidos(self, request):
        """Marcar mensajes como leídos"""
        mensaje_ids = request.data.get('mensaje_ids', [])
        user = request.user
        
        mensajes = MensajeChat.objects.filter(id__in=mensaje_ids)
        for mensaje in mensajes:
            mensaje.marcar_como_leido(user)
        
        return Response({'status': 'ok', 'marcados': len(mensaje_ids)})


class NotaEvolucionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de Notas de Evolución Clínica.
    
    Las notas de evolución permiten documentar el progreso del paciente
    durante su hospitalización sin modificar el diagnóstico original.
    """
    queryset = NotaEvolucion.objects.all()
    serializer_class = NotaEvolucionSerializer
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return NotaEvolucionCreateSerializer
        return NotaEvolucionSerializer
    
    def get_queryset(self):
        queryset = NotaEvolucion.objects.all()
        ficha_id = self.request.query_params.get('ficha')
        if ficha_id:
            queryset = queryset.filter(ficha_id=ficha_id)
        return queryset.order_by('-fecha_hora')
    
    def create(self, request, *args, **kwargs):
        """Crear una nueva nota de evolución"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nota = serializer.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='crear',
            modelo='NotaEvolucion',
            objeto_id=nota.id,
            detalles={
                'ficha_id': nota.ficha_id,
                'tipo': nota.tipo,
                'paciente': f"{nota.ficha.paciente.nombres} {nota.ficha.paciente.apellidos}" if not nota.ficha.paciente.es_nn else f"NN ({nota.ficha.paciente.id_temporal})",
            },
            ip_address=get_client_ip(request)
        )
        
        read_serializer = NotaEvolucionSerializer(nota, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Actualizar una nota de evolución (requiere motivo de edición)"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        nota = serializer.save()
        
        # Registrar en auditoría
        AuditLog.objects.create(
            usuario=request.user,
            accion='actualizar',
            modelo='NotaEvolucion',
            objeto_id=nota.id,
            detalles={
                'ficha_id': nota.ficha_id,
                'tipo': nota.tipo,
                'motivo_edicion': nota.motivo_edicion,
            },
            ip_address=get_client_ip(request)
        )
        
        read_serializer = NotaEvolucionSerializer(nota, context={'request': request})
        return Response(read_serializer.data)
    
    @action(detail=False, methods=['get'])
    def por_ficha(self, request):
        """Obtener todas las notas de evolución de una ficha"""
        ficha_id = request.query_params.get('ficha_id')
        if not ficha_id:
            return Response({'error': 'Debe proporcionar ficha_id'}, status=status.HTTP_400_BAD_REQUEST)
        
        notas = NotaEvolucion.objects.filter(ficha_id=ficha_id).order_by('-fecha_hora')
        serializer = self.get_serializer(notas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Obtener un resumen de la evolución del paciente"""
        ficha_id = request.query_params.get('ficha_id')
        if not ficha_id:
            return Response({'error': 'Debe proporcionar ficha_id'}, status=status.HTTP_400_BAD_REQUEST)
        
        notas = NotaEvolucion.objects.filter(ficha_id=ficha_id).order_by('-fecha_hora')
        
        resumen = {
            'total_notas': notas.count(),
            'ultima_nota': NotaEvolucionSerializer(notas.first()).data if notas.exists() else None,
            'notas_por_tipo': {},
        }
        
        # Contar por tipo
        for tipo, _ in NotaEvolucion.TIPO_CHOICES:
            resumen['notas_por_tipo'][tipo] = notas.filter(tipo=tipo).count()
        
        return Response(resumen)


class NotificacionViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de notificaciones"""
    serializer_class = NotificacionSerializer
    
    def get_queryset(self):
        """Solo notificaciones del usuario actual"""
        return Notificacion.objects.filter(usuario=self.request.user)
    
    @action(detail=False, methods=['get'])
    def no_leidas(self, request):
        """Obtener notificaciones no leídas"""
        notificaciones = self.get_queryset().filter(leida=False)
        serializer = self.get_serializer(notificaciones, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def conteo(self, request):
        """Obtener conteo de notificaciones no leídas"""
        count = self.get_queryset().filter(leida=False).count()
        return Response({'no_leidas': count})
    
    @action(detail=False, methods=['get'])
    def recientes(self, request):
        """Obtener las últimas 50 notificaciones"""
        notificaciones = self.get_queryset()[:50]
        serializer = self.get_serializer(notificaciones, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def marcar_leida(self, request, pk=None):
        """Marcar una notificación como leída"""
        notificacion = self.get_object()
        notificacion.marcar_leida()
        return Response({'status': 'ok'})
    
    @action(detail=False, methods=['post'])
    def marcar_todas_leidas(self, request):
        """Marcar todas las notificaciones como leídas"""
        count = self.get_queryset().filter(leida=False).update(
            leida=True, 
            fecha_leida=timezone.now()
        )
        return Response({'status': 'ok', 'marcadas': count})
    
    @action(detail=False, methods=['post'])
    def marcar_leidas(self, request):
        """Marcar múltiples notificaciones como leídas"""
        ids = request.data.get('ids', [])
        count = self.get_queryset().filter(id__in=ids, leida=False).update(
            leida=True,
            fecha_leida=timezone.now()
        )
        return Response({'status': 'ok', 'marcadas': count})
    
    @action(detail=False, methods=['delete'])
    def eliminar_leidas(self, request):
        """Eliminar todas las notificaciones leídas"""
        count, _ = self.get_queryset().filter(leida=True).delete()
        return Response({'status': 'ok', 'eliminadas': count})


# ============================================
# ENDPOINT DE POLLING PARA CHAT Y NOTIFICACIONES
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def poll_updates(request):
    """
    Endpoint de polling para obtener actualizaciones de chat y notificaciones.
    El frontend debe llamar este endpoint cada 2-3 segundos.
    """
    try:
        user = request.user
        ficha_id = request.query_params.get('ficha_id')
        last_message_id = request.query_params.get('last_message_id', 0)
        last_notification_id = request.query_params.get('last_notification_id', 0)
        
        response_data = {
            'mensajes': [],
            'notificaciones': [],
            'notificaciones_no_leidas': 0,
        }
        
        # Obtener nuevos mensajes si hay ficha_id
        if ficha_id:
            try:
                nuevos_mensajes = MensajeChat.objects.filter(
                    ficha_id=int(ficha_id),
                    id__gt=int(last_message_id)
                ).order_by('fecha_envio')
                
                response_data['mensajes'] = MensajeChatSerializer(
                    nuevos_mensajes, 
                    many=True,
                    context={'request': request}
                ).data
            except (ValueError, TypeError):
                pass  # Ignorar errores de conversión
        
        # Obtener nuevas notificaciones
        try:
            nuevas_notificaciones = Notificacion.objects.filter(
                usuario=user,
                id__gt=int(last_notification_id)
            ).order_by('-fecha_creacion')[:20]
            
            response_data['notificaciones'] = NotificacionSerializer(
                nuevas_notificaciones,
                many=True
            ).data
            
            # Conteo de notificaciones no leídas
            response_data['notificaciones_no_leidas'] = Notificacion.objects.filter(
                usuario=user,
                leida=False
            ).count()
        except Exception:
            pass  # Ignorar errores de notificaciones
        
        return Response(response_data)
    except Exception as e:
        return Response({
            'mensajes': [],
            'notificaciones': [],
            'notificaciones_no_leidas': 0,
            'error': str(e)
        })


# ============================================================================
# TURNOS
# ============================================================================

class ConfiguracionTurnoViewSet(viewsets.ModelViewSet):
    """ViewSet para configuración de horarios de turnos"""
    queryset = ConfiguracionTurno.objects.all()
    serializer_class = ConfiguracionTurnoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ConfiguracionTurno.objects.filter(activo=True)
    
    @action(detail=False, methods=['get'])
    def horarios(self, request):
        """Obtiene todos los horarios configurados"""
        configs = ConfiguracionTurno.objects.filter(activo=True)
        if not configs.exists():
            # Retornar horarios por defecto
            from datetime import time
            return Response({
                'AM': {'inicio': '08:00', 'fin': '20:00'},
                'PM': {'inicio': '20:00', 'fin': '08:00'},
                'DOBLE': {'inicio': '08:00', 'fin': '08:00'},
            })
        
        horarios = {}
        for config in configs:
            horarios[config.tipo] = {
                'inicio': config.hora_inicio.strftime('%H:%M'),
                'fin': config.hora_fin.strftime('%H:%M')
            }
        return Response(horarios)
    
    @action(detail=False, methods=['post'])
    def actualizar_horarios(self, request):
        """Actualiza los horarios de los turnos (solo admin)"""
        if request.user.rol != 'administrador':
            return Response({'error': 'Solo administradores pueden modificar horarios'},
                          status=status.HTTP_403_FORBIDDEN)
        
        from datetime import datetime
        horarios = request.data.get('horarios', {})
        
        for tipo, horario in horarios.items():
            if tipo not in ['AM', 'PM', 'DOBLE']:
                continue
            
            try:
                hora_inicio = datetime.strptime(horario['inicio'], '%H:%M').time()
                hora_fin = datetime.strptime(horario['fin'], '%H:%M').time()
                
                ConfiguracionTurno.objects.update_or_create(
                    tipo=tipo,
                    defaults={
                        'hora_inicio': hora_inicio,
                        'hora_fin': hora_fin,
                        'activo': True
                    }
                )
            except (KeyError, ValueError) as e:
                return Response({'error': f'Error en horario {tipo}: {str(e)}'},
                              status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'mensaje': 'Horarios actualizados correctamente'})


class TurnoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de turnos"""
    queryset = Turno.objects.all()
    serializer_class = TurnoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Turno.objects.all()
        
        # Filtrar por usuario
        usuario_id = self.request.query_params.get('usuario')
        if usuario_id:
            queryset = queryset.filter(usuario_id=usuario_id)
        
        # Filtrar por fecha
        fecha = self.request.query_params.get('fecha')
        if fecha:
            queryset = queryset.filter(fecha=fecha)
        
        # Filtrar por rango de fechas
        fecha_desde = self.request.query_params.get('fecha_desde')
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_desde:
            queryset = queryset.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha__lte=fecha_hasta)
        
        # Filtrar por rol
        rol = self.request.query_params.get('rol')
        if rol:
            queryset = queryset.filter(usuario__rol=rol)
        
        # Filtrar por tipo de turno
        tipo_turno = self.request.query_params.get('tipo_turno')
        if tipo_turno:
            queryset = queryset.filter(tipo_turno=tipo_turno)
        
        # Filtrar solo en turno activo
        en_turno = self.request.query_params.get('en_turno')
        if en_turno == 'true':
            queryset = queryset.filter(en_turno=True)
        
        return queryset.select_related('usuario', 'creado_por').order_by('fecha', 'usuario__first_name')
    
    @action(detail=False, methods=['get'])
    def mi_turno(self, request):
        """Obtiene el turno actual del usuario logueado"""
        usuario = request.user
        hoy = timezone.now().date()
        
        # Buscar turno programado
        turno_actual = Turno.get_turno_actual(usuario)
        
        # Verificar si tiene turno hoy
        turno_hoy = Turno.objects.filter(usuario=usuario, fecha=hoy).first()
        
        if turno_actual:
            return Response({
                'tiene_turno_programado': True,
                'turno_actual': TurnoSerializer(turno_actual).data,
                'en_horario': turno_actual.esta_en_horario(),
                'en_turno': turno_actual.en_turno,
                'puede_iniciar_voluntario': False,
                'mensaje': f'Tienes turno {turno_actual.get_tipo_turno_display()}'
            })
        
        if turno_hoy and turno_hoy.tipo_turno == 'DESCANSO':
            return Response({
                'tiene_turno_programado': True,
                'turno_actual': TurnoSerializer(turno_hoy).data,
                'en_horario': False,
                'en_turno': turno_hoy.en_turno,
                'puede_iniciar_voluntario': True,
                'mensaje': 'Hoy es tu día de descanso'
            })
        
        return Response({
            'tiene_turno_programado': False,
            'turno_actual': None,
            'en_horario': False,
            'en_turno': False,
            'puede_iniciar_voluntario': True,
            'mensaje': 'No tienes turno programado para hoy'
        })
    
    @action(detail=False, methods=['post'])
    def iniciar_turno(self, request):
        """Inicia el turno del usuario"""
        usuario = request.user
        turno = Turno.get_turno_actual(usuario)
        
        if turno:
            turno.iniciar_turno()
            return Response({
                'mensaje': 'Turno iniciado correctamente',
                'turno': TurnoSerializer(turno).data
            })
        
        return Response({'error': 'No tienes turno programado para iniciar'},
                       status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def iniciar_voluntario(self, request):
        """Inicia un turno voluntario (cuando no tiene turno programado)"""
        usuario = request.user
        
        # Verificar que no tenga ya un turno activo
        if Turno.usuario_en_turno(usuario):
            return Response({'error': 'Ya tienes un turno activo'},
                           status=status.HTTP_400_BAD_REQUEST)
        
        turno = Turno.crear_turno_voluntario(usuario)
        
        return Response({
            'mensaje': 'Turno voluntario iniciado correctamente',
            'turno': TurnoSerializer(turno).data
        })
    
    @action(detail=False, methods=['post'])
    def finalizar_turno(self, request):
        """Finaliza el turno actual del usuario"""
        usuario = request.user
        hoy = timezone.now().date()
        
        turno = Turno.objects.filter(usuario=usuario, fecha=hoy, en_turno=True).first()
        
        if turno:
            turno.finalizar_turno()
            return Response({
                'mensaje': 'Turno finalizado correctamente',
                'turno': TurnoSerializer(turno).data
            })
        
        return Response({'error': 'No tienes turno activo para finalizar'},
                       status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def asignar_masivo(self, request):
        """Asigna turnos de forma masiva a un usuario"""
        if request.user.rol != 'administrador':
            return Response({'error': 'Solo administradores pueden asignar turnos'},
                          status=status.HTTP_403_FORBIDDEN)
        
        serializer = TurnoAsignacionMasivaSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        usuario_id = serializer.validated_data['usuario_id']
        turnos_data = serializer.validated_data['turnos']
        usuario = Usuario.objects.get(id=usuario_id)
        
        turnos_creados = []
        turnos_actualizados = []
        
        for turno_data in turnos_data:
            turno, created = Turno.objects.update_or_create(
                usuario=usuario,
                fecha=turno_data['fecha'],
                defaults={
                    'tipo_turno': turno_data['tipo_turno'],
                    'creado_por': request.user,
                    'notas': turno_data.get('notas', '')
                }
            )
            if created:
                turnos_creados.append(turno)
            else:
                turnos_actualizados.append(turno)
        
        return Response({
            'mensaje': f'{len(turnos_creados)} turnos creados, {len(turnos_actualizados)} turnos actualizados',
            'turnos_creados': TurnoSerializer(turnos_creados, many=True).data,
            'turnos_actualizados': TurnoSerializer(turnos_actualizados, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def calendario_mensual(self, request):
        """Obtiene el calendario de turnos de un mes"""
        from datetime import datetime, timedelta
        import calendar
        
        # Obtener mes y año de los parámetros
        try:
            mes = int(request.query_params.get('mes', timezone.now().month))
            anio = int(request.query_params.get('anio', timezone.now().year))
        except ValueError:
            return Response({'error': 'Mes y año deben ser números válidos'},
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Calcular primer y último día del mes
        primer_dia = datetime(anio, mes, 1).date()
        ultimo_dia = datetime(anio, mes, calendar.monthrange(anio, mes)[1]).date()
        
        # Obtener todos los turnos del mes
        turnos = Turno.objects.filter(
            fecha__gte=primer_dia,
            fecha__lte=ultimo_dia
        ).select_related('usuario').order_by('fecha', 'usuario__first_name')
        
        # Filtrar por rol si se especifica
        rol = request.query_params.get('rol')
        if rol:
            turnos = turnos.filter(usuario__rol=rol)
        
        # Agrupar por fecha
        calendario = {}
        for turno in turnos:
            fecha_str = turno.fecha.isoformat()
            if fecha_str not in calendario:
                calendario[fecha_str] = []
            calendario[fecha_str].append(TurnoSerializer(turno).data)
        
        return Response({
            'mes': mes,
            'anio': anio,
            'primer_dia': primer_dia.isoformat(),
            'ultimo_dia': ultimo_dia.isoformat(),
            'calendario': calendario
        })
    
    @action(detail=False, methods=['get'])
    def personal_en_turno(self, request):
        """Obtiene el personal con turno asignado para hoy (excluyendo descansos)"""
        hoy = timezone.now().date()
        
        # Turnos asignados para hoy que NO son descanso
        turnos_hoy = Turno.objects.filter(
            fecha=hoy
        ).exclude(
            tipo_turno='DESCANSO'
        ).select_related('usuario')
        
        # Agrupar por rol
        por_rol = {}
        for turno in turnos_hoy:
            rol = turno.usuario.rol
            if rol not in por_rol:
                por_rol[rol] = []
            por_rol[rol].append({
                'usuario_id': turno.usuario.id,
                'nombre': turno.usuario.get_full_name(),
                'tipo_turno': turno.tipo_turno,
                'tipo_turno_display': turno.get_tipo_turno_display(),
                'en_turno': turno.en_turno,
                'esta_en_horario': turno.esta_en_horario(),
                'hora_entrada': turno.hora_entrada.isoformat() if turno.hora_entrada else None,
                'es_voluntario': turno.es_voluntario
            })
        
        # Contar los que realmente están activos (en su horario)
        total_activos = sum(
            1 for turno in turnos_hoy if turno.esta_en_horario()
        )
        
        return Response({
            'fecha': hoy.isoformat(),
            'total_asignados': turnos_hoy.count(),
            'total_activos': total_activos,
            'por_rol': por_rol
        })
    
    @action(detail=False, methods=['get'])
    def staff_disponible(self, request):
        """Obtiene todo el staff disponible para asignar turnos"""
        roles_staff = ['medico', 'tens', 'paramedico']
        usuarios = Usuario.objects.filter(
            rol__in=roles_staff,
            is_active=True
        ).order_by('rol', 'first_name')
        
        staff_por_rol = {}
        for usuario in usuarios:
            rol = usuario.rol
            if rol not in staff_por_rol:
                staff_por_rol[rol] = []
            staff_por_rol[rol].append({
                'id': usuario.id,
                'nombre': usuario.get_full_name(),
                'username': usuario.username,
                'especialidad': usuario.especialidad
            })
        
        return Response(staff_por_rol)
