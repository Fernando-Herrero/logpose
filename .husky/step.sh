# Git hooks no cargan tu shell: usar el Node del proyecto (mise), no el del sistema.
export PATH="$HOME/.local/share/mise/shims:$PATH"

# step "<nombre>" "<qué hacer si falla>" <comando…>: una línea si va bien; si falla, su salida y la pista.
step() {
  name=$1 hint=$2
  shift 2
  log=$(mktemp)
  start=$(date +%s)
  if "$@" >"$log" 2>&1; then
    echo "✓ $name ($(($(date +%s) - start)) s)"
    rm -f "$log"
  else
    cat "$log"
    rm -f "$log"
    echo "✗ $name: $hint"
    exit 1
  fi
}