from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_profile_email_profile_password_news"),
    ]

    operations = [
        migrations.AddField(
            model_name="news",
            name="is_price_applied",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="news",
            name="ticks_until_effect",
            field=models.PositiveIntegerField(default=2),
        ),
    ]
