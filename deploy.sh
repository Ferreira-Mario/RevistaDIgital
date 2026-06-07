#!/bin/bash

# Evitar que continúe si ocurre algún error
set -e

# Asegurar que estamos en el directorio del script
cd "$(dirname "$0")"

VERSION_FILE="VERSION"

# Crear el archivo de versión si no existe
if [ ! -f "$VERSION_FILE" ]; then
  echo "1.0.0" > "$VERSION_FILE"
fi

# Leer la versión actual
CURRENT_VERSION=$(cat "$VERSION_FILE" | xargs)

# Separar la versión en partes (SemVer: major.minor.patch)
IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"

# Validar que los campos sean numéricos, si no, inicializar
if ! [[ "$major" =~ ^[0-9]+$ ]] || ! [[ "$minor" =~ ^[0-9]+$ ]] || ! [[ "$patch" =~ ^[0-9]+$ ]]; then
  major=1
  minor=0
  patch=0
fi

# Incrementar la parte patch de la versión
new_patch=$((patch + 1))
NEW_VERSION="$major.$minor.$new_patch"

echo "=============================================="
echo "🚀 Iniciando proceso de commit y subida..."
echo "📈 Incrementando versión: v$CURRENT_VERSION -> v$NEW_VERSION"
echo "=============================================="

# Guardar la nueva versión en el archivo
echo "$NEW_VERSION" > "$VERSION_FILE"

# Actualizar el cache-busting de shared.css en todos los archivos HTML
echo "🧹 Actualizando referencias de CSS en archivos HTML para evitar caché..."
for html_file in *.html; do
  if [ -f "$html_file" ]; then
    perl -pi -e "s/href=\"shared\.css(\?v=[^\"]*)?\"/href=\"shared.css?v=$NEW_VERSION\"/g" "$html_file"
  fi
done

# Obtener sufijo opcional de mensaje de commit
MSG_SUFFIX=""
if [ -n "$1" ]; then
  MSG_SUFFIX=" - $1"
fi

COMMIT_MSG="release: v$NEW_VERSION$MSG_SUFFIX"

# Ejecutar comandos de Git
echo "📦 Agregando cambios a Git..."
git add .

echo "💾 Creando commit: \"$COMMIT_MSG\"..."
git commit -m "$COMMIT_MSG"

echo "🏷️ Creando etiqueta de Git: v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Versión v$NEW_VERSION"

echo "⬆️ Subiendo cambios a GitHub (origin/main)..."
git push origin main

echo "⬆️ Subiendo etiquetas (tags)..."
git push origin --tags

echo "=============================================="
echo "🎉 ¡Todo listo! Versión v$NEW_VERSION subida correctamente."
echo "=============================================="
