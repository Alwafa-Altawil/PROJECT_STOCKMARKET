from django.db import migrations, models


def create_missing_portfolios(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Portfolio = apps.get_model("core", "Portfolio")
    existing_user_ids = set(Portfolio.objects.values_list("user_id", flat=True))

    to_create = []
    for user_id in User.objects.values_list("id", flat=True):
        if user_id not in existing_user_ids:
            to_create.append(Portfolio(user_id=user_id))

    if to_create:
        Portfolio.objects.bulk_create(to_create)


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0006_portfolio_wallet_and_holdings"),
    ]

    operations = [
        migrations.AlterField(
            model_name="profile",
            name="balance",
            field=models.DecimalField(decimal_places=2, default=100000, max_digits=12),
        ),
        migrations.AlterField(
            model_name="profile",
            name="starting_balance",
            field=models.DecimalField(decimal_places=2, default=100000, max_digits=12),
        ),
        migrations.RunPython(create_missing_portfolios, migrations.RunPython.noop),
    ]
