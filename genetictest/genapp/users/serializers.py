from django.contrib.auth import get_user_model
from rest_framework import serializers

from genapp.models import UserProfile
from genapp.users.services import register_user

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=30)
    last_name = serializers.CharField(max_length=30)
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs.get("password1") != attrs.get("password2"):
            raise serializers.ValidationError({"password2": ["Пароли не совпадают."]})
        return attrs

    def create(self, validated_data):
        user = register_user(
            username=validated_data["username"],
            email=validated_data["email"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            password1=validated_data["password1"],
            password2=validated_data["password2"],
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "height",
            "weight",
            "gender",
            "birth_date",
            "activity_level",
            "diet_preferences",
            "goals_text",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class PatientOwnProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    height = serializers.IntegerField(required=False, allow_null=True, min_value=40, max_value=280)
    weight = serializers.IntegerField(required=False, allow_null=True, min_value=2, max_value=500)
    gender = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=16)
    birth_date = serializers.DateField(required=False, allow_null=True)
    activity_level = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=16)
    diet_preferences = serializers.CharField(required=False, allow_blank=True)
    goals_text = serializers.CharField(required=False, allow_blank=True)

    def validate_gender(self, value):
        if value in (None, ""):
            return ""
        if value not in ("male", "female"):
            raise serializers.ValidationError("Укажите male или female.")
        return value

    def validate_activity_level(self, value):
        if value in (None, ""):
            return ""
        if value not in ("low", "medium", "high"):
            raise serializers.ValidationError("Некорректный уровень активности.")
        return value


class PatientProfileSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "profile"]

    def get_profile(self, obj):
        try:
            profile = obj.userprofile
        except UserProfile.DoesNotExist:
            return None
        return UserProfileSerializer(profile).data

