"""Background tasks for news generation."""

from django.core.management.base import BaseCommand
from core.news_generator import generate_all_news


class Command(BaseCommand):
    help = "Generate news for all active stocks"

    def handle(self, *args, **options):
        """Generate news for all active stocks."""
        try:
            news_created = generate_all_news()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully created {len(news_created)} news items"
                )
            )
            for news in news_created:
                self.stdout.write(f"  - {news.stock.symbol}: {news.headline}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error generating news: {e}"))
