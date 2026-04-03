from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.response import Response
from rest_framework.views import APIView

from genapp.api.permissions import IsAdminOnly, IsDoctor, IsPatientOrAdmin, get_user_role
from genapp.doctor.services import check_doctor_access
from genapp.api.article_serializers import ArticleSerializer
from genapp.models import (
    Article,
    DoctorComment,
    DoctorPatient,
    Gene,
    GeneVariant,
    Recommendation,
    UserGenotype,
    UserProfile,
    VitaminTestResult,
)
from genapp.genetics.serializers import (
    GeneSerializer,
    GeneVariantSerializer,
    UserGenotypeSerializer,
)
from genapp.recommendations.serializers import RecommendationSerializer
from genapp.recommendations.services import get_interpretation, get_user_recommendations
from genapp.doctor.serializers import DoctorCommentSerializer
from genapp.users.serializers import (
    LoginSerializer,
    PatientOwnProfileUpdateSerializer,
    PatientProfileSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)
from genapp.vitamins.serializers import VitaminTestResultSerializer
from genapp.users.services import login_user as login_user_service


User = get_user_model()


class PublicArticleViewSet(ReadOnlyModelViewSet):
    """Статьи — доступны без авторизации."""

    serializer_class = ArticleSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Article.objects.select_related("gene").order_by("-created_at")
        q = (self.request.query_params.get("q") or "").strip()
        cat = (self.request.query_params.get("category") or "").strip()
        if cat:
            qs = qs.filter(category=cat)
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(content__icontains=q))
        return qs


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"id": user.id, "username": user.username, "email": user.email},
            status=status.HTTP_201_CREATED,
        )


class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = login_user_service(
            request,
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if not user:
            return Response(
                {"detail": "Неверные учетные данные."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"id": user.id, "username": user.username, "role": get_user_role(user)},
            status=status.HTTP_200_OK,
        )


class PatientGenotypeViewSet(viewsets.ModelViewSet):
    serializer_class = UserGenotypeSerializer
    permission_classes = [IsPatientOrAdmin]

    def get_queryset(self):
        role = get_user_role(self.request.user)
        qs = UserGenotype.objects.select_related("gene_variant", "gene_variant__gene").all()
        if role != "admin":
            qs = qs.filter(user=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PatientVitaminTestViewSet(viewsets.ModelViewSet):
    serializer_class = VitaminTestResultSerializer
    permission_classes = [IsPatientOrAdmin]

    def get_queryset(self):
        role = get_user_role(self.request.user)
        qs = VitaminTestResult.objects.select_related("vitamin").all()
        if role != "admin":
            qs = qs.filter(user=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PatientInterpretationAPIView(APIView):
    permission_classes = [IsPatientOrAdmin]

    def get(self, request):
        target_user = request.user
        if get_user_role(request.user) == "admin":
            user_id = request.query_params.get("user_id")
            if user_id:
                target_user = get_object_or_404(User, pk=user_id)
        return Response(get_interpretation(target_user), status=status.HTTP_200_OK)


class PatientRecommendationsAPIView(APIView):
    permission_classes = [IsPatientOrAdmin]

    def get(self, request):
        target_user = request.user
        if get_user_role(request.user) == "admin":
            user_id = request.query_params.get("user_id")
            if user_id:
                target_user = get_object_or_404(User, pk=user_id)
        return Response(get_user_recommendations(target_user), status=status.HTTP_200_OK)


class PatientOwnProfileAPIView(APIView):
    """Профиль текущего пользователя (пациент / админ)."""

    permission_classes = [IsPatientOrAdmin]

    def get(self, request):
        if get_user_role(request.user) == "doctor":
            return Response(
                {"detail": "Профиль пациента в этом разделе недоступен для роли врача."},
                status=status.HTTP_403_FORBIDDEN,
            )
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        payload = {
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            **UserProfileSerializer(profile).data,
        }
        return Response(payload)

    def patch(self, request):
        if get_user_role(request.user) == "doctor":
            return Response(
                {"detail": "Профиль пациента в этом разделе недоступен для роли врача."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = PatientOwnProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = request.user
        if "first_name" in data:
            user.first_name = data["first_name"]
        if "last_name" in data:
            user.last_name = data["last_name"]
        user.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        for field in (
            "height",
            "weight",
            "gender",
            "birth_date",
            "activity_level",
            "diet_preferences",
            "goals_text",
        ):
            if field in data:
                setattr(profile, field, data[field])
        profile.save()

        return self.get(request)


class AdminGeneViewSet(viewsets.ModelViewSet):
    serializer_class = GeneSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        return Gene.objects.all()


class AdminGeneVariantViewSet(viewsets.ModelViewSet):
    serializer_class = GeneVariantSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        return GeneVariant.objects.select_related("gene").all()


class AdminRecommendationViewSet(viewsets.ModelViewSet):
    serializer_class = RecommendationSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        return Recommendation.objects.all()


class DoctorPatientsListAPIView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        doctor_patients = (
            DoctorPatient.objects.filter(doctor=request.user)
            .select_related("patient")
            .all()
        )
        patients = [dp.patient for dp in doctor_patients]
        data = PatientProfileSerializer(patients, many=True).data
        return Response(data, status=status.HTTP_200_OK)


class DoctorPatientProfileAPIView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request, patient_id: int):
        if not check_doctor_access(request.user.id, patient_id):
            return Response({"detail": "Нет доступа к этому пациенту."}, status=status.HTTP_403_FORBIDDEN)

        patient = get_object_or_404(User, pk=patient_id)

        genotypes = (
            UserGenotype.objects.filter(user_id=patient_id)
            .select_related("gene_variant", "gene_variant__gene")
            .all()
        )
        vitamin_tests = VitaminTestResult.objects.filter(user_id=patient_id).select_related("vitamin").all()

        payload = {
            "patient": PatientProfileSerializer(patient).data,
            "genotypes": UserGenotypeSerializer(genotypes, many=True, context={"request": request}).data,
            "vitamin_tests": VitaminTestResultSerializer(vitamin_tests, many=True).data,
        }
        return Response(payload, status=status.HTTP_200_OK)


class DoctorCommentCreateAPIView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request, patient_id: int):
        if not check_doctor_access(request.user.id, patient_id):
            return Response({"detail": "Нет доступа к этому пациенту."}, status=status.HTTP_403_FORBIDDEN)

        serializer = DoctorCommentSerializer(
            data=request.data,
            context={"request": request, "patient_id": patient_id},
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()
        return Response(DoctorCommentSerializer(comment, context={"request": request, "patient_id": patient_id}).data)


class DoctorConclusionCreateAPIView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request, patient_id: int):
        if not check_doctor_access(request.user.id, patient_id):
            return Response({"detail": "Нет доступа к этому пациенту."}, status=status.HTTP_403_FORBIDDEN)

        payload = {"text": request.data.get("text"), "status": "published", "genotype": None, "vitamin_test": None}
        serializer = DoctorCommentSerializer(
            data=payload,
            context={"request": request, "patient_id": patient_id},
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()
        return Response(DoctorCommentSerializer(comment, context={"request": request, "patient_id": patient_id}).data)


class DoctorCommentUpdateAPIView(APIView):
    permission_classes = [IsDoctor]

    def get_object(self, request, comment_id: int):
        comment = get_object_or_404(
            DoctorComment.objects.select_related("patient").all(),
            pk=comment_id,
            doctor_id=request.user.id,
        )
        if not check_doctor_access(request.user.id, comment.patient_id):
            return None
        return comment

    def put(self, request, comment_id: int):
        comment = self.get_object(request, comment_id)
        if comment is None:
            return Response({"detail": "Нет доступа."}, status=status.HTTP_403_FORBIDDEN)

        serializer = DoctorCommentSerializer(
            comment,
            data=request.data,
            partial=False,
            context={"request": request, "patient_id": comment.patient_id},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, comment_id: int):
        comment = self.get_object(request, comment_id)
        if comment is None:
            return Response({"detail": "Нет доступа."}, status=status.HTTP_403_FORBIDDEN)

        serializer = DoctorCommentSerializer(
            comment,
            data=request.data,
            partial=True,
            context={"request": request, "patient_id": comment.patient_id},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

