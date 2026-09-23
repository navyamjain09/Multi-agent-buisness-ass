#!/bin/sh
exec gunicorn --bind=0.0.0.0:${PORT:-8000} --workers=2 --timeout=120 --worker-class=uvicorn.workers.UvicornWorker app.main:app
