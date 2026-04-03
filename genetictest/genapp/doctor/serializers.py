from django.contrib.auth import get_user_model
from rest_framework import serializers

from genapp.models import DoctorComment, DoctorCommentHistory, UserGenotype, VitaminTestResult

User = get_user_model()


class DoctorCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorComment
        fields = [
            "id",
            "genotype",
            "vitamin_test",
            "text",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        # Комментарий может относиться к одному из типов.
        genotype = attrs.get("genotype", getattr(self.instance, "genotype", None))
        vitamin_test = attrs.get("vitamin_test", getattr(self.instance, "vitamin_test", None))

        if genotype and vitamin_test:
            raise serializers.ValidationError("Комментарий может относиться только к одному объекту: генотипу или анализу витамина.")

        patient_id = self.context.get("patient_id")
        if patient_id is None:
            return attrs

        # Проверяем принадлежность связанного объекта пациенту (чтобы врач не комментировал чужие данные).
        if genotype and genotype.user_id != patient_id:
            raise serializers.ValidationError("Выбранный генотип не принадлежит указанному пациенту.")

        if vitamin_test and vitamin_test.user_id != patient_id:
            raise serializers.ValidationError("Выбранный анализ витамина не принадлежит указанному пациенту.")

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        patient_id = self.context["patient_id"]
        doctor = request.user

        return DoctorComment.objects.create(
            doctor=doctor,
            patient_id=patient_id,
            **validated_data,
        )

    def update(self, instance, validated_data):
        request = self.context["request"]

        old_text = instance.text
        old_status = instance.status
        old_genotype_id = instance.genotype_id
        old_vitamin_test_id = instance.vitamin_test_id

        new_text = validated_data.get("text", old_text)
        new_status = validated_data.get("status", old_status)
        new_genotype = validated_data.get("genotype", instance.genotype)
        new_vitamin_test = validated_data.get("vitamin_test", instance.vitamin_test)
        new_genotype_id = getattr(new_genotype, "id", None) if new_genotype else None
        new_vitamin_test_id = getattr(new_vitamin_test, "id", None) if new_vitamin_test else None

        # Сохраняем историю до фактического применения изменений.
        if (
            new_text != old_text
            or new_status != old_status
            or new_genotype_id != old_genotype_id
            or new_vitamin_test_id != old_vitamin_test_id
        ):
            DoctorCommentHistory.objects.create(
                comment=instance,
                edited_by=request.user,
                previous_text=old_text,
                previous_status=old_status,
                previous_genotype_id=old_genotype_id,
                previous_vitamin_test_id=old_vitamin_test_id,
            )

        return super().update(instance, validated_data)


class DoctorCommentHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorCommentHistory
        fields = [
            "id",
            "previous_text",
            "previous_status",
            "previous_genotype_id",
            "previous_vitamin_test_id",
            "edited_at",
            "edited_by_id",
        ]

