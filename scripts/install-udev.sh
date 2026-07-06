#!/usr/bin/env bash
# Installs udev rules for Redragon SH68F90A keyboards (USB + wireless dongle).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RULES_SRC="$ROOT/backend/config/99-redragon.rules"
RULES_DST="/etc/udev/rules.d/99-redragon.rules"

if [[ ! -f "$RULES_SRC" ]]; then
  echo "Erro: arquivo de regras não encontrado em $RULES_SRC" >&2
  exit 1
fi

echo "Instalando regras udev para teclado Redragon..."
sudo cp "$RULES_SRC" "$RULES_DST"
sudo udevadm control --reload-rules
sudo udevadm trigger

echo ""
echo "✓ Regras instaladas em $RULES_DST"
echo "  Desconecte e reconecte o cabo USB (ou o dongle wireless) do teclado."
