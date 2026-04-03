from django.urls import path

from . import views

urlpatterns = [
    path("", views.home_view, name="home"),
    path("register/", views.spa_hash_redirect, {"fragment": "register"}, name="register"),
    path("login/", views.spa_hash_redirect, {"fragment": "login"}, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("app/", views.spa_index_view, name="spa_index"),
    path("profile/", views.spa_hash_redirect, {"fragment": "dashboard"}, name="profile"),
    path("genotype-input/", views.spa_hash_redirect, {"fragment": "genotypes"}, name="genotype_input"),
    path("recommendations/", views.spa_hash_redirect, {"fragment": "recommendations"}, name="recommendations"),
    path("passport/", views.spa_hash_redirect, {"fragment": "passport"}, name="passport"),
    path("articles/", views.articles_view, name="articles"),
    path("vitamin-tests/", views.spa_hash_redirect, {"fragment": "vitamin-tests"}, name="vitamin_tests"),
    path(
        "vitamin-tests/delete/<int:pk>/",
        views.spa_hash_redirect,
        {"fragment": "vitamin-tests"},
        name="vitamin_test_delete",
    ),
]
