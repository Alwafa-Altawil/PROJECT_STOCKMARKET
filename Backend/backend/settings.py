from pathlib import Path
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-$&e&is-8!p8pv4_bg55p8sn)%f7ublzfit1uhdn@s+951g4l=$'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = [] #vide , local


# Application definition

INSTALLED_APPS = [ #applications de django installées dans le projet qui peuvent etre utilisées pour nous aider 
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
 # applications autres que django 
    'api.apps.ApiConfig', 
    'rest_framework', 
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'core.apps.CoreConfig',
]

MIDDLEWARE = [ # composantes qui prennent les requests pour des changements spécifiques
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOWED_ORIGINS = [ #origines autorisées pour le frontend
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]


CORS_ALLOW_CREDENTIALS = True

ROOT_URLCONF = 'backend.urls' #fichier principal des urls

TEMPLATES = [ # templates utilisés pour les pages web
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application' #wsgi pour les applications web 


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = { #configuration de la base de données
    'default': {
        'ENGINE': 'django.db.backends.sqlite3', #database sqlite3 
        'NAME': BASE_DIR / 'db.sqlite3',


    }
}


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [ #règles à suivre pour la création d'un mot de passe pour un utilisateur
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator', #vérifie si mot de passe est similaire à l'utilisateur
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', #vérifie si mot de passe est au moins 8 caractères
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator', #vérifie si mot de passe est courant
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator', #vérifie si mot de passe est numérique
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us' #langue par défaut

TIME_ZONE = 'UTC' #temps par défaut

USE_I18N = True 

USE_TZ = True 


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'

REST_FRAMEWORK = { #configuration de la gestion des permissions
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication', #authentification par token
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated', 
    ),
}

SIMPLE_JWT = { #configuration des tokens
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15), #temps de validité du token
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7), #temps de validité du token de rafraîchissement
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
