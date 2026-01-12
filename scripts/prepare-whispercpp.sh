#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
THIRD_PARTY_DIR="$ROOT_DIR/third_party"
WHISPER_DIR="$THIRD_PARTY_DIR/whisper.cpp"
WHISPER_REF="v1.8.1"
RESOURCE_DIR="$ROOT_DIR/src-tauri/resources/whisper"
MODEL_DIR="$RESOURCE_DIR/models"
MODEL_NAME="ggml-base.en.bin"
MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}"

if [ "${TAURI_ENV_PLATFORM:-}" != "" ] && [ "${TAURI_ENV_PLATFORM}" != "linux" ]; then
  echo "Skipping whisper.cpp build for platform: ${TAURI_ENV_PLATFORM}"
  exit 0
fi

if [ "${TAURI_ENV_PLATFORM:-}" = "" ] && [ "$(uname -s)" != "Linux" ]; then
  echo "Skipping whisper.cpp build on non-Linux host"
  exit 0
fi

if [ -x "$RESOURCE_DIR/whisper-server" ] && [ -f "$MODEL_DIR/$MODEL_NAME" ]; then
  echo "whisper.cpp server and model already prepared."
  exit 0
fi

if ! command -v cmake >/dev/null 2>&1; then
  echo "cmake is required to build whisper.cpp." >&2
  exit 1
fi

if ! command -v pkg-config >/dev/null 2>&1; then
  echo "pkg-config is required to detect ffmpeg libraries." >&2
  exit 1
fi

if ! pkg-config --exists libavcodec libavformat libavutil; then
  echo "ffmpeg development libraries are required (libavcodec/libavformat/libavutil)." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to download the whisper model." >&2
  exit 1
fi

mkdir -p "$THIRD_PARTY_DIR"

if [ ! -d "$WHISPER_DIR/.git" ]; then
  git clone https://github.com/ggml-org/whisper.cpp.git "$WHISPER_DIR"
fi

cd "$WHISPER_DIR"

git fetch --tags --quiet

git checkout "$WHISPER_REF" --quiet

git submodule update --init --recursive --quiet

cmake -B build -DWHISPER_FFMPEG=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build -j"$(nproc)"

BIN_CANDIDATES=(
  "build/bin/whisper-whisper-server"
  "build/bin/whisper-server"
  "build/bin/server"
)

SERVER_BIN=""
for candidate in "${BIN_CANDIDATES[@]}"; do
  if [ -f "$candidate" ]; then
    SERVER_BIN="$candidate"
    break
  fi
done

if [ -z "$SERVER_BIN" ]; then
  echo "Could not find whisper server binary in build output." >&2
  exit 1
fi

mkdir -p "$RESOURCE_DIR"
cp "$SERVER_BIN" "$RESOURCE_DIR/whisper-server"
chmod +x "$RESOURCE_DIR/whisper-server"

mkdir -p "$MODEL_DIR"
if [ ! -f "$MODEL_DIR/$MODEL_NAME" ]; then
  curl -L "$MODEL_URL" -o "$MODEL_DIR/$MODEL_NAME"
fi

printf "Prepared whisper.cpp server and model at %s\n" "$RESOURCE_DIR"
