#!/usr/bin/env bash
# Cambia el número de versión de todos los archivos JS/CSS para que los navegadores
# descarguen la versión nueva (evita ver la versión vieja por caché).
# Uso:  ./version.sh            (usa fecha y hora actual)
set -e
cd "$(dirname "$0")"
V=${1:-$(date +%Y%m%d%H%M)}
sed -i.bak -E "s#\?v=[A-Za-z0-9]+#?v=$V#g" index.html admin.html js/*.js && rm -f index.html.bak admin.html.bak js/*.js.bak
echo "Versión actualizada a $V"
