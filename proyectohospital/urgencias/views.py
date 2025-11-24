from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.utils import timezone
from django.db.models import Q
from django.http import FileResponse, HttpResponse
from django.template.loader import render_to_string
from weasyprint import HTML
import io
from .models import (Usuario, Paciente, FichaEmergencia, SignosVitales, SolicitudMedicamento, 
                     Anamnesis, Diagnostico, SolicitudExamen, AuditLog, ConfiguracionHospital, Cama)
from .serializers import (
    UsuarioSerializer, LoginSerializer, PacienteSerializer, 
    FichaEmergenciaSerializer, FichaEmergenciaCreateSerializer,
    SignosVitalesSerializer, SignosVitalesCreateSerializer,
    SolicitudMedicamentoSerializer, AnamnesisSerializer, 
    DiagnosticoSerializer, SolicitudExamenSerializer, AuditLogSerializer,
    ConfiguracionHospitalSerializer, CamaSerializer
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
        """Obtener fichas atendidas (con diagnóstico)"""
        from django.db.models import Exists, OuterRef
        from .models import Diagnostico
        
        # Filtrar fichas que tienen diagnóstico
        fichas = self.get_queryset().filter(
            diagnostico__isnull=False
        ).order_by('-fecha_actualizacion')
        
        serializer = self.get_serializer(fichas, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar el estado de una ficha"""
        ficha = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        if nuevo_estado not in ['en_ruta', 'en_hospital', 'atendido']:
            return Response(
                {'error': 'Estado inválido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ficha.estado = nuevo_estado
        ficha.save()
        
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
        """Crear diagnóstico y cerrar la ficha"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Marcar la ficha como atendida automáticamente
        ficha_id = request.data.get('ficha')
        if ficha_id:
            try:
                ficha = FichaEmergencia.objects.get(id=ficha_id)
                ficha.estado = 'atendido'
                ficha.save()
                print(f"✅ Ficha #{ficha_id} marcada como atendida automáticamente")
            except FichaEmergencia.DoesNotExist:
                print(f"⚠️ Ficha #{ficha_id} no encontrada")
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class SolicitudExamenViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de solicitudes de exámenes"""
    queryset = SolicitudExamen.objects.all()
    serializer_class = SolicitudExamenSerializer
    permission_classes = [IsAuthenticated]
    
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
        cama.liberar()
        
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
