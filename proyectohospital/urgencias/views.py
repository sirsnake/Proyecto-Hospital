from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
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
                     ArchivoAdjunto, MensajeChat, Notificacion)
from .serializers import (
    UsuarioSerializer, LoginSerializer, PacienteSerializer, 
    FichaEmergenciaSerializer, FichaEmergenciaCreateSerializer,
    SignosVitalesSerializer, SignosVitalesCreateSerializer,
    SolicitudMedicamentoSerializer, AnamnesisSerializer, TriageSerializer,
    DiagnosticoSerializer, SolicitudExamenSerializer, AuditLogSerializer,
    ConfiguracionHospitalSerializer, CamaSerializer,
    ArchivoAdjuntoSerializer, ArchivoAdjuntoUploadSerializer,
    MensajeChatSerializer, MensajeChatCreateSerializer,
    NotificacionSerializer
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
        
        if estado:
            queryset = queryset.filter(estado=estado)
        if prioridad:
            queryset = queryset.filter(prioridad=prioridad)
        if paramedico_id:
            queryset = queryset.filter(paramedico_id=paramedico_id)
        
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
        """Obtener fichas atendidas (con diagnóstico pero no dados de alta)"""
        from django.db.models import Exists, OuterRef
        from .models import Diagnostico
        
        # Filtrar fichas que tienen diagnóstico pero no están dados de alta
        fichas = self.get_queryset().filter(
            diagnostico__isnull=False,
            estado='atendido'
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
    
    def perform_create(self, serializer):
        """Registrar signos vitales en auditoría"""
        signos = serializer.save()
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
                'sat': signos.saturacion_oxigeno
            },
            ip_address=get_client_ip(self.request)
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
                'diagnostico_principal': diagnostico.diagnostico_principal[:100] if diagnostico.diagnostico_principal else None,
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
        
        total_usuarios = Usuario.objects.filter(is_active=True).count()
        usuarios_por_rol = {}
        for rol_code, rol_nombre in Usuario.ROL_CHOICES:
            usuarios_por_rol[rol_code] = Usuario.objects.filter(rol=rol_code, is_active=True).count()
        
        return Response({
            'total_usuarios': total_usuarios,
            'usuarios_por_rol': usuarios_por_rol,
            'usuarios_activos_hoy': Usuario.objects.filter(
                last_login__date=timezone.now().date()
            ).count()
        })
    
    @action(detail=False, methods=['get'])
    def medicos(self, request):
        """Obtener lista de médicos activos para asignación"""
        medicos = Usuario.objects.filter(rol='medico', is_active=True).order_by('first_name', 'last_name')
        
        # Agregar conteo de pacientes asignados a cada médico
        from django.db.models import Count
        medicos_con_pacientes = medicos.annotate(
            pacientes_asignados=Count('fichas_medico', filter=Q(fichas_medico__estado__in=['en_hospital', 'atendido']))
        )
        
        data = []
        for medico in medicos_con_pacientes:
            data.append({
                'id': medico.id,
                'nombre': medico.get_full_name(),
                'especialidad': medico.especialidad or 'General',
                'pacientes_asignados': medico.pacientes_asignados
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
            queryset = queryset.filter(usuario_id=usuario_id)
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
            
            return Response(ArchivoAdjuntoSerializer(archivo).data, status=status.HTTP_201_CREATED)
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
