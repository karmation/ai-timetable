@echo off
ECHO Starting Backend Server...
start "AI Backend" cmd /k python timetable_generator.py

ECHO Starting Frontend with Live Server...
ECHO (You may need to install it first: npm install -g live-server)
start "Frontend" cmd /k live-server

ECHO Both servers are starting in new windows.
