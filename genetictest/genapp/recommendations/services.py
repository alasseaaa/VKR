from collections import defaultdict

from genapp.models import (
    GeneVariantRecommendation,
    Recommendation,
    UserGenotype,
    UserRecommendation,
)


def _get_user_variant_ids(user):
    return list(
        UserGenotype.objects.filter(user=user).values_list("gene_variant_id", flat=True).distinct()
    )


def get_interpretation(user):
    """
    Интерпретирует генотип пользователя через связанные рекомендации.

    Возвращает JSON-подобный dict:
    {
      "categories": {
        "<category>": {
          "label": "...",
          "recommendations": [
             {"id":..., "title":..., "description":..., "genes":[...]}
          ]
        }
      }
    }
    """
    variant_ids = _get_user_variant_ids(user)

    if not variant_ids:
        return {"categories": {}}

    recommendations = (
        Recommendation.objects.filter(genevariantrecommendation__gene_variant_id__in=variant_ids)
        .distinct()
        .all()
    )

    rec_ids = list(recommendations.values_list("id", flat=True))

    # Собираем, какие гены/генотипы пользователя привели к каждой рекомендации.
    links_qs = (
        GeneVariantRecommendation.objects.filter(recommendation_id__in=rec_ids, gene_variant_id__in=variant_ids)
        .select_related("gene_variant__gene", "gene_variant")
    )

    rec_to_genes = defaultdict(set)  # rec_id -> set("GENE:GT")
    for link in links_qs:
        gene = link.gene_variant.gene
        rec_to_genes[link.recommendation_id].add(f"{gene.symbol}:{link.gene_variant.genotype}")

    grouped = {}
    for rec in recommendations:
        if rec.category not in grouped:
            grouped[rec.category] = {"label": rec.get_category_display(), "recommendations": []}

        grouped[rec.category]["recommendations"].append(
            {
                "id": rec.id,
                "title": rec.title,
                "description": rec.description,
                "genes": sorted(rec_to_genes.get(rec.id, [])),
            }
        )

    return {"categories": grouped}


def get_user_recommendations(user):
    """
    Рекомендации для пациента + статус из UserRecommendation (если он задан).
    """
    interpretation = get_interpretation(user)
    if not interpretation["categories"]:
        return interpretation

    # Вытаскиваем все recommendation_id из результата, чтобы загрузить статусы одним запросом.
    rec_ids = []
    for cat in interpretation["categories"].values():
        for rec in cat["recommendations"]:
            rec_ids.append(rec["id"])

    status_map = dict(
        UserRecommendation.objects.filter(user=user, recommendation_id__in=rec_ids).values_list(
            "recommendation_id", "status"
        )
    )

    for cat in interpretation["categories"].values():
        for rec in cat["recommendations"]:
            rec["user_status"] = status_map.get(rec["id"])

    return interpretation

