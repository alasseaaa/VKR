from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from genapp.models import DoctorPatient, InPersonAppointment

User = get_user_model()


class PatientLinkedDoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]


class InPersonAppointmentReadSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = InPersonAppointment
        fields = [
            "id",
            "patient",
            "doctor",
            "doctor_name",
            "patient_name",
            "requested_start",
            "confirmed_start",
            "patient_note",
            "doctor_message",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_doctor_name(self, obj):
        d = obj.doctor
        n = f"{d.first_name or ''} {d.last_name or ''}".strip()
        return n or d.username

    def get_patient_name(self, obj):
        p = obj.patient
        n = f"{p.first_name or ''} {p.last_name or ''}".strip()
        return n or p.username


class InPersonAppointmentCreateSerializer(serializers.ModelSerializer):
    doctor = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = InPersonAppointment
        fields = ["doctor", "requested_start", "patient_note"]

    def validate_requested_start(self, value):
        if timezone.is_naive(value):
            value = timezone.make_aware(value, timezone.get_current_timezone())
        if value < timezone.now():
            raise serializers.ValidationError("Выберите дату и время в будущем.")
        return value

    def validate(self, attrs):
        patient = self.context["request"].user
        doctor = attrs["doctor"]
        if not DoctorPatient.objects.filter(patient=patient, doctor=doctor).exists():
            raise serializers.ValidationError({"doctor": "Этот врач не закреплён за вами."})
        return attrs

    def create(self, validated_data):
        return InPersonAppointment.objects.create(patient=self.context["request"].user, **validated_data)
