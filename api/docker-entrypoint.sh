#!/bin/sh
set -e

echo "⏳ Applying database migrations..."
node_modules/.bin/prisma migrate deploy

echo "🚀 Starting CampusCafe API..."
exec node dist/server.js
