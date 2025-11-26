from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'pacientes', views.PacienteViewSet, basename='paciente')
router.register(r'fichas', views.FichaEmergenciaViewSet, basename='ficha')
router.register(r'signos-vitales', views.SignosVitalesViewSet, basename='signos-vitales')
router.register(r'solicitudes-medicamentos', views.SolicitudMedicamentoViewSet, basename='solicitud-medicamento')
router.register(r'anamnesis', views.AnamnesisViewSet, basename='anamnesis')
router.register(r'diagnosticos', views.DiagnosticoViewSet, basename='diagnostico')
router.register(r'solicitudes-examenes', views.SolicitudExamenViewSet, basename='solicitud-examen')
router.register(r'documentos', views.DocumentosPDFViewSet, basename='documento')
router.register(r'usuarios', views.UsuarioViewSet, basename='usuario')
router.register(r'audit-logs', views.AuditLogViewSet, basename='audit-log')
router.register(r'configuracion', views.ConfiguracionHospitalViewSet, basename='configuracion')
router.register(r'camas', views.CamaViewSet, basename='cama')
router.register(r'archivos', views.ArchivoAdjuntoViewSet, basename='archivo')
router.register(r'mensajes', views.MensajeChatViewSet, basename='mensaje')
router.register(r'notificaciones', views.NotificacionViewSet, basename='notificacion')

urlpatterns = [
    path('csrf/', views.csrf_token_view, name='csrf-token'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('current-user/', views.current_user, name='current-user'),
    path('poll/', views.poll_updates, name='poll-updates'),
    path('', include(router.urls)),
]
