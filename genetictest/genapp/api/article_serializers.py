from rest_framework import serializers

from genapp.models import Article


class ArticleSerializer(serializers.ModelSerializer):
    gene_symbol = serializers.CharField(source="gene.symbol", read_only=True, allow_null=True)

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "content",
            "created_at",
            "category",
            "source_url",
            "author",
            "gene",
            "gene_symbol",
        ]
