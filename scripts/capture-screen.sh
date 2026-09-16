#!/usr/bin/env bash

set -euo pipefail

route="${1:?Provide an Expo Router path, for example /dashboard?role=coach&tab=home}"
output="${2:?Provide an output PNG path}"
expo_url="${HEATSENSE_EXPO_URL:-exp://127.0.0.1:8082/--}"

mkdir -p "$(dirname "$output")"
xcrun simctl openurl booted "${expo_url}${route}"
sleep 3
xcrun simctl io booted screenshot "$output"
