from rest_framework import serializers

from genapp.models import Vitamin, VitaminTestResult


class VitaminTestResultSerializer(serializers.ModelSerializer):
    status = serializers.ReadOnlyField()
    vitamin_name = serializers.CharField(source="vitamin.name", read_only=True)
    vitamin_unit_test = serializers.CharField(source="vitamin.unit_test", read_only=True)

    class Meta:
        model = VitaminTestResult
        fields = [
            "id",
            "vitamin",
            "vitamin_name",
            "vitamin_unit_test",
            "test_value",
            "test_date",
            "status",
        ]
        read_only_fields = ["id", "status", "vitamin_name", "vitamin_unit_test"]

    def validate_test_value(self, value):
        # Базовая валидация: числовое значение анализа.
        if value is None:
            raise serializers.ValidationError("Укажите значение анализа.")
        return value

