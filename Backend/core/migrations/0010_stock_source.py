from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_news_delayed_price_effect"),
    ]

    operations = [
        migrations.AddField(
            model_name="stock",
            name="source",
            field=models.CharField(
                choices=[("INTERNAL", "Internal"), ("ALPHA_VANTAGE", "Alpha Vantage")],
                db_index=True,
                default="INTERNAL",
                max_length=20,
            ),
        ),
    ]
