#!/bin/sh
# Starts io-server. With arguments they are passed on unchanged (docker run <image> -l 7777 ...).
# Without arguments:
#   -l 7777 -L 55488 --web                  WebSocket + device control page, CongSocket for Arduino
#   --site /data/www                        when the folder exists (the image has the starter pages)
#   --devices ... --no-devices-watch        virtual devices from /data/devices, chosen by IOSIGNAL_DEVICES:
#       (not set)  the robot arm and the RGB lamp of the starter set, so the robot page and the device
#                  panel have something to show; a mounted folder without these files runs nothing
#       1          every *.device.js / *.device.mjs / *.device.json file there (your own folder too)
#       0          none
#   --dashboard --dashboard-access token    when IOSIGNAL_DASHBOARD_TOKEN is set (8+ characters)
# Virtual devices look like real ones to the apps of the same home channel (the LAN of this host).
set -eu

if [ "$#" -gt 0 ]; then
  exec io-server "$@"
fi

set -- -l 7777 -L 55488 --web

if [ -d /data/www ]; then
  set -- "$@" --site /data/www
fi

DEVICES=/data/devices
devices=""
case "${IOSIGNAL_DEVICES:-}" in
  0) ;;
  1)
    if [ -d "$DEVICES" ] && find "$DEVICES" -maxdepth 1 \( -name '*.device.js' -o -name '*.device.mjs' -o -name '*.device.json' \) | grep -q .; then
      devices=$DEVICES
    fi ;;
  "")
    for name in robot-arm.device.js living-lamp.device.js; do
      [ -f "$DEVICES/$name" ] && devices="$devices $DEVICES/$name"
    done ;;
  *) echo "IOSIGNAL_DEVICES must be 0 or 1 (or unset for the robot arm and the lamp)" >&2; exit 2 ;;
esac
if [ -n "$devices" ]; then
  # shellcheck disable=SC2086 # the paths have no spaces
  set -- "$@" --devices $devices --no-devices-watch
fi

if [ -n "${IOSIGNAL_DASHBOARD_TOKEN:-}" ]; then
  set -- "$@" --dashboard --dashboard-access token
fi

echo "io-server $*"
exec io-server "$@"
