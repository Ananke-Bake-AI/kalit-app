#!/usr/bin/env bash
# Generate a release keystore for signed Android builds.
#
# Writes:
#   android/keystore/kalit-release.jks
#   android/keystore.properties   (read by app/build.gradle signingConfigs.release)
#
# Both are gitignored. Back them up somewhere safe — losing the keystore means
# you can never publish updates under the same applicationId.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYSTORE_DIR="$HERE/keystore"
KEYSTORE_FILE="$KEYSTORE_DIR/kalit-release.jks"
PROPS_FILE="$HERE/keystore.properties"

# macOS ships without a JDK by default. Prefer the Homebrew JDK we use for
# Android builds; fall back to whatever is already on PATH.
if ! command -v keytool >/dev/null 2>&1; then
  for jdk in \
    "${JAVA_HOME:-}/bin" \
    "/opt/homebrew/opt/openjdk@21/bin" \
    "/opt/homebrew/opt/openjdk@17/bin" \
    "/opt/homebrew/opt/openjdk/bin" \
    "/usr/local/opt/openjdk/bin"; do
    if [ -x "$jdk/keytool" ]; then
      export PATH="$jdk:$PATH"
      break
    fi
  done
fi

if ! command -v keytool >/dev/null 2>&1; then
  echo "✗ keytool not found."
  echo "  Install the JDK with:  brew install openjdk@21"
  echo "  Or set JAVA_HOME to point at an existing JDK before running this script."
  exit 1
fi

mkdir -p "$KEYSTORE_DIR"

if [ -f "$KEYSTORE_FILE" ]; then
  echo "Keystore already exists at $KEYSTORE_FILE — aborting so we don't overwrite it."
  echo "If you really want to regenerate, delete it first."
  exit 1
fi

echo "▶ Generating release keystore (RSA 2048, 25 years)"
read -r -s -p "Keystore password (used for both store and key): " PASSWORD
echo

keytool -genkey -v \
  -keystore "$KEYSTORE_FILE" \
  -alias kalit-release \
  -keyalg RSA -keysize 2048 -validity 9125 \
  -storepass "$PASSWORD" -keypass "$PASSWORD" \
  -dname "CN=Kalit Studio, OU=Kalit, O=Kalit, L=Paris, ST=Ile-de-France, C=FR"

cat > "$PROPS_FILE" <<EOF
storeFile=keystore/kalit-release.jks
storePassword=$PASSWORD
keyAlias=kalit-release
keyPassword=$PASSWORD
EOF

chmod 600 "$PROPS_FILE" "$KEYSTORE_FILE"

echo
echo "✓ keystore → $KEYSTORE_FILE"
echo "✓ props    → $PROPS_FILE"
echo
echo "Back up both files somewhere safe (1Password / secure archive)."
echo "To build a signed release APK/AAB:"
echo "  cd android && ./gradlew assembleRelease       # APK"
echo "  cd android && ./gradlew bundleRelease         # AAB for Play Store"
