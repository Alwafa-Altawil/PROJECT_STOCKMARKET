from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0003_alter_portfolio_quantity"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="profile",
            name="balance",
            field=models.DecimalField(decimal_places=2, default=10000, max_digits=12),
        ),
        migrations.AddField(
            model_name="profile",
            name="starting_balance",
            field=models.DecimalField(decimal_places=2, default=10000, max_digits=12),
        ),
        migrations.AddField(
            model_name="profile",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, null=True),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="portfolio",
            name="quantity",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="portfolio",
            name="average_buy_price",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name="portfolio",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, null=True),
            preserve_default=False,
        ),
        migrations.AlterUniqueTogether(
            name="portfolio",
            unique_together={("user", "stock")},
        ),
        migrations.AlterField(
            model_name="stock",
            name="symbol",
            field=models.CharField(max_length=10, unique=True),
        ),
        migrations.AlterField(
            model_name="stock",
            name="price",
            field=models.DecimalField(decimal_places=2, max_digits=12),
        ),
        migrations.AddField(
            model_name="stock",
            name="name",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="stock",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="stock",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, null=True),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="transaction",
            name="quantity",
            field=models.PositiveIntegerField(),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="price",
            field=models.DecimalField(decimal_places=2, max_digits=12),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="type",
            field=models.CharField(
                choices=[("BUY", "Buy"), ("SELL", "Sell")], max_length=4
            ),
        ),
        migrations.AddField(
            model_name="transaction",
            name="notional",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.CreateModel(
            name="StockPrice",
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
                ("close", models.DecimalField(decimal_places=2, max_digits=12)),
                ("recorded_at", models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                (
                    "stock",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="price_history",
                        to="core.stock",
                    ),
                ),
            ],
            options={"ordering": ["-recorded_at"]},
        ),
        migrations.CreateModel(
            name="Forecast",
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
                ("horizon_days", models.PositiveIntegerField(default=30)),
                ("paths", models.PositiveIntegerField(default=5000)),
                ("drift", models.FloatField(default=0)),
                ("volatility", models.FloatField(default=0)),
                ("percentile_5", models.DecimalField(decimal_places=2, max_digits=12)),
                ("median", models.DecimalField(decimal_places=2, max_digits=12)),
                ("percentile_95", models.DecimalField(decimal_places=2, max_digits=12)),
                ("probability_up", models.FloatField(default=0)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                (
                    "stock",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, to="core.stock"
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
