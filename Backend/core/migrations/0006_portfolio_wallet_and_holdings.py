from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def move_positions_to_holdings(apps, schema_editor):
    Portfolio = apps.get_model("core", "Portfolio")
    PortfolioHolding = apps.get_model("core", "PortfolioHolding")

    portfolio_rows = list(
        Portfolio.objects.all().order_by("user_id", "id")
    )
    keeper_by_user = {}

    for row in portfolio_rows:
        keeper = keeper_by_user.get(row.user_id)
        if keeper is None:
            keeper = row
            keeper_by_user[row.user_id] = keeper

        PortfolioHolding.objects.create(
            portfolio_id=keeper.id,
            stock_id=row.stock_id,
            quantity=row.quantity,
            average_buy_price=row.average_buy_price,
        )

        if row.id != keeper.id:
            row.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0005_alter_transaction_options_alter_portfolio_updated_at_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PortfolioHolding",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("quantity", models.PositiveIntegerField(default=0)),
                ("average_buy_price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "portfolio",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="holdings",
                        to="core.portfolio",
                    ),
                ),
                (
                    "stock",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="holdings",
                        to="core.stock",
                    ),
                ),
            ],
        ),
        migrations.RunPython(move_positions_to_holdings, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="portfolio",
            name="user",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="portfolio",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterUniqueTogether(
            name="portfolio",
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name="portfolio",
            name="stock",
        ),
        migrations.RemoveField(
            model_name="portfolio",
            name="quantity",
        ),
        migrations.RemoveField(
            model_name="portfolio",
            name="average_buy_price",
        ),
        migrations.AddField(
            model_name="portfolio",
            name="stocks",
            field=models.ManyToManyField(
                related_name="portfolios",
                through="core.PortfolioHolding",
                to="core.stock",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="portfolioholding",
            unique_together={("portfolio", "stock")},
        ),
    ]
