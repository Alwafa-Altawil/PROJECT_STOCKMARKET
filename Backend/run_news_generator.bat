@echo off
REM Batch script to run news generator every minute on Windows
REM Save this as run_news_generator.bat

setlocal enabledelayedexpansion

REM Change to the Backend directory
cd /d "C:\Users\2491777\Documents\GitHub\PROJECT_STOCKMARKET\Backend"

REM Activate virtual environment
call .\env\Scripts\activate.bat

REM Run the news generator command in an infinite loop
:loop
python manage.py generate_news
REM Wait 60 seconds before running again
timeout /t 60 /nobreak
goto loop

pause
