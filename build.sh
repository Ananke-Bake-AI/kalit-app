#!/usr/bin/env bash
# build.sh — build all Kalit Studio targets and collect them under ./build/.
#
# Usage:
#   ./build.sh                # everything (desktop mwl + android + ios)
#   ./build.sh desktop        # mac+win+linux, arm64+x64
#   ./build.sh mobile         # android apk + ios simulator .app
#   ./build.sh android        # android debug apk
#   ./build.sh android-release  # signed release apk + aab (needs keystore)
#   ./build.sh ios            # ios simulator .app
#   ./build.sh mac|win|linux  # one desktop target
#
# All final artifacts land under $ROOT/build/:
#   build/desktop/{mac,win,linux}/...
#   build/android/app-debug.apk
#   build/ios/App.app  (+ install.sh helper)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP="$ROOT/apps/desktop"
MOBILE="$ROOT/apps/mobile"
IOS_DIR="$MOBILE/ios/App"
ANDROID_DIR="$MOBILE/android"

OUT="$ROOT/build"
OUT_DESKTOP="$OUT/desktop"
OUT_ANDROID="$OUT/android"
OUT_IOS="$OUT/ios"

# Toolchain env (mobile). Safe to re-export.
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}"
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/build-tools/34.0.0:$PATH"

step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
die()  { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; exit 1; }

mkdir -p "$OUT"

# ─── Install (once) ─────────────────────────────────────────
install_deps() {
  step "pnpm install (workspace)"
  cd "$ROOT"
  pnpm install --frozen-lockfile || pnpm install
  ok "deps installed"
}

# ─── Desktop (electron-builder) ─────────────────────────────
# Collect the redistributable files (.dmg/.exe/.AppImage/.deb/.zip) into
# build/desktop/<os>/. We skip the *-unpacked/ staging dirs since they're
# intermediate.
collect_desktop() {
  local src="$DESKTOP/release"
  [ -d "$src" ] || return 0
  mkdir -p "$OUT_DESKTOP/mac" "$OUT_DESKTOP/win" "$OUT_DESKTOP/linux"
  shopt -s nullglob
  # macOS
  for f in "$src"/*.dmg "$src"/*.dmg.blockmap "$src"/mac*.zip; do
    [ -e "$f" ] && cp -f "$f" "$OUT_DESKTOP/mac/"
  done
  # Windows
  for f in "$src"/*.exe "$src"/*.exe.blockmap; do
    [ -e "$f" ] && cp -f "$f" "$OUT_DESKTOP/win/"
  done
  # Linux
  for f in "$src"/*.AppImage "$src"/*.deb; do
    [ -e "$f" ] && cp -f "$f" "$OUT_DESKTOP/linux/"
  done
  # generic zips that electron-builder also emits per-arch
  for f in "$src"/*-arm64.zip "$src"/*-x64.zip; do
    [ -e "$f" ] && cp -f "$f" "$OUT_DESKTOP/mac/"
  done
  shopt -u nullglob
}

build_desktop_all() {
  step "Desktop: mac + win + linux (arm64 + x64)"
  cd "$DESKTOP"
  pnpm run build:all       # host arch (arm64 on this machine)
  pnpm run build:all:x64   # cross-arch x64
  collect_desktop
  ok "desktop → $OUT_DESKTOP/"
}

build_desktop_one() {
  local target="$1"  # mac|win|linux
  step "Desktop: $target"
  cd "$DESKTOP"
  pnpm run "build:$target"
  collect_desktop
  ok "desktop $target → $OUT_DESKTOP/$target/"
}

# ─── Mobile: Android APK ────────────────────────────────────
build_android() {
  step "Mobile: Capacitor sync (android)"
  cd "$MOBILE"
  pnpm run build
  npx cap sync android

  step "Mobile: Gradle assembleDebug"
  cd "$ANDROID_DIR"
  ./gradlew assembleDebug

  local apk="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
  [ -f "$apk" ] || die "APK not found at $apk"
  mkdir -p "$OUT_ANDROID"
  cp -f "$apk" "$OUT_ANDROID/app-debug.apk"
  ok "android apk → $OUT_ANDROID/app-debug.apk ($(du -h "$OUT_ANDROID/app-debug.apk" | cut -f1))"
}

# ─── Mobile: Android signed release (APK + AAB) ─────────────
# Requires android/keystore.properties or KALIT_KEYSTORE_* env vars.
build_android_release() {
  step "Mobile: Capacitor sync (android)"
  cd "$MOBILE"
  pnpm run build
  npx cap sync android

  if [ ! -f "$ANDROID_DIR/keystore.properties" ] && [ -z "${KALIT_KEYSTORE_FILE:-}" ]; then
    die "No signing config. Run apps/mobile/android/generate-keystore.sh first."
  fi

  step "Mobile: Gradle assembleRelease + bundleRelease"
  cd "$ANDROID_DIR"
  ./gradlew assembleRelease bundleRelease

  local apk="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
  local aab="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
  [ -f "$apk" ] || die "Release APK not found at $apk"
  [ -f "$aab" ] || die "Release AAB not found at $aab"
  mkdir -p "$OUT_ANDROID"
  cp -f "$apk" "$OUT_ANDROID/app-release.apk"
  cp -f "$aab" "$OUT_ANDROID/app-release.aab"
  ok "android release → $OUT_ANDROID/app-release.{apk,aab}"
}

# ─── Mobile: iOS simulator .app ─────────────────────────────
build_ios() {
  step "Mobile: Capacitor sync (ios)"
  cd "$MOBILE"
  pnpm run build

  # cap sync runs `xcodebuild clean` which refuses to delete ios/App/build
  # unless it's tagged as created by the build system. Tag or wipe it first.
  if [ -d "$IOS_DIR/build" ]; then
    xattr -w com.apple.xcode.CreatedByBuildSystem true "$IOS_DIR/build" 2>/dev/null \
      || rm -rf "$IOS_DIR/build"
  fi

  npx cap sync ios

  step "Mobile: xcodebuild (iphonesimulator, unsigned)"
  cd "$IOS_DIR"
  xcodebuild \
    -workspace App.xcworkspace \
    -scheme App \
    -configuration Debug \
    -sdk iphonesimulator \
    -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath ./build \
    CODE_SIGNING_ALLOWED=NO \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGN_IDENTITY="" \
    build | tail -20

  local app="$IOS_DIR/build/Build/Products/Debug-iphonesimulator/App.app"
  [ -d "$app" ] || die "App.app not found at $app"
  mkdir -p "$OUT_IOS"
  # Replace any prior copy, preserving bundle structure + signatures.
  rm -rf "$OUT_IOS/App.app"
  cp -R "$app" "$OUT_IOS/App.app"

  # Convenience installer: absolute path so user can run from anywhere.
  cat > "$OUT_IOS/install.sh" <<'SH'
#!/usr/bin/env bash
# Boot the default simulator and install/launch the bundled App.app.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$HERE/App.app"
[ -d "$APP" ] || { echo "App.app not found next to install.sh"; exit 1; }
xcrun simctl boot "iPhone 16" 2>/dev/null || true
open -a Simulator
xcrun simctl install booted "$APP"
xcrun simctl launch booted ai.kalit.studio
SH
  chmod +x "$OUT_IOS/install.sh"

  ok "ios sim → $OUT_IOS/App.app ($(du -sh "$OUT_IOS/App.app" | cut -f1))"
}

# ─── Dispatch ───────────────────────────────────────────────
target="${1:-all}"

case "$target" in
  all)
    install_deps
    build_desktop_all
    build_android
    build_ios
    ;;
  desktop)   install_deps; build_desktop_all ;;
  mobile)           install_deps; build_android; build_ios ;;
  mac|win|linux)    install_deps; build_desktop_one "$target" ;;
  android)          install_deps; build_android ;;
  android-release)  install_deps; build_android_release ;;
  ios)              install_deps; build_ios ;;
  *) die "unknown target: $target (expected all|desktop|mobile|mac|win|linux|android|android-release|ios)" ;;
esac

step "Summary (all outputs under $OUT/)"
[ -d "$OUT_DESKTOP" ] && find "$OUT_DESKTOP" -maxdepth 2 -type f | sed 's/^/  /'
[ -f "$OUT_ANDROID/app-debug.apk" ] && echo "  $OUT_ANDROID/app-debug.apk"
[ -d "$OUT_IOS/App.app" ] && echo "  $OUT_IOS/App.app  (run $OUT_IOS/install.sh)"

ok "all done"
