from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.utils import timezone
from django.db.models import Q
from .models import Usuario, Paciente, FichaEmergencia, SignosVitales, SolicitudMedicamento, Anamnesis, Diagnostico
from .serializers import (
    UsuarioSerializer, LoginSerializer, PacienteSerializer, 
    FichaEmergenciaSerializer, FichaEmergenciaCreateSerializer,
    SignosVitalesSerializer, SolicitudMedicamentoSerializer,
    AnamnesisSerializer, DiagnosticoSerializer
)


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
        """Buscar paciente por RUT o ID temporal"""
        rut = request.query_params.get('rut')
        id_temporal = request.query_params.get('id_temporal')
        
        if rut:
            try:
                paciente = Paciente.objects.get(rut=rut)
                return Response(PacienteSerializer(paciente).data)
            except Paciente.DoesNotExist:
                return Response({'error': 'Paciente no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        if id_temporal:
            try:
                paciente = Paciente.objects.get(id_temporal=id_temporal)
                return Response(PacienteSerializer(paciente).data)
            except Paciente.DoesNotExist:
                return Response({'error': 'Paciente no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response({'error': 'Debe proporcionar RUT o ID temporal'}, status=status.HTTP_400_BAD_REQUEST)


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
    serializer_class = SignosVitalesSerializer
    permission_classes = [IsAuthenticated]
    
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
