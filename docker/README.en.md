# IOSignal server Docker image

[한국어](README.md) | [English](README.en.md)

An image with `io-server` from the published [iosignal-cli](../packages/iosignal-cli/README.en.md) (iosignal-cli 10.0.0, iosignal 10.0.0). The versions are pinned exactly in `package.json` and `package-lock.json`.

Image: `ghcr.io/remocons/iosignal` (tags `10.0.0`, `10.0`, `10`, `latest`, `10.0.0-core10.0.0`. The 9.x tags stay: they cannot log in with 10.0.0 clients)
Platforms: `linux/amd64`, `linux/arm64`, `linux/arm/v7` (Raspberry Pi with a 32-bit OS), `linux/arm/v6` (Raspberry Pi Zero, 1)

## Run

### Without arguments

```bash
docker run --rm -p 7777:7777 -p 55488:55488 ghcr.io/remocons/iosignal
```

Open `http://localhost:7777/` (device control page) and `http://localhost:7777/site/` (example pages). The command actually run is logged first as `io-server …`.

| Feature | Default | Change it |
| --- | --- | --- |
| WebSocket 7777, device control page `/` | On | With arguments |
| CongSocket 55488 (Arduino) | On. It is the IOSignal Arduino default port, so a board only needs this computer's address as its server | With arguments |
| Your pages at `/site/` | On. The image holds example pages (device panel, signals, 3D robot arm) | `-v ./www:/data/www:ro` for your own |
| Dashboard `/dashboard` | Off | `-e IOSIGNAL_DASHBOARD_TOKEN=<8+ characters>` turns it on with token access (the page asks for the token) |
| Virtual devices | **Only the robot arm and the RGB lamp**, so the robot page and the device panel have something to show at once. The image holds six example devices (lamp, fan, thermo-hygrometer, pump, counter, robot arm) | `-e IOSIGNAL_DEVICES=1` runs every device in `/data/devices`, `0` none. For your own, `-v ./devices:/data/devices:ro` with `IOSIGNAL_DEVICES=1` |

```bash
docker run --rm -p 7777:7777 -p 55488:55488 -e IOSIGNAL_DASHBOARD_TOKEN=change-me-please ghcr.io/remocons/iosignal
docker run --rm -p 7777:7777 -p 55488:55488 -e IOSIGNAL_DEVICES=1 ghcr.io/remocons/iosignal      # all six example devices
docker run --rm -p 7777:7777 -p 55488:55488 -e IOSIGNAL_DEVICES=0 ghcr.io/remocons/iosignal      # no virtual devices (production)
docker run --rm -p 7777:7777 -p 55488:55488 -v ./www:/data/www:ro ghcr.io/remocons/iosignal
```

- **Only two virtual devices by default:** virtual devices look like real ones to every app in the same home channel (only apps on the same LAN or this host see them, not users from the internet). The robot arm and the lamp run so a first-time user can try the robot page and the device panel at once; on a production server turn them off with `IOSIGNAL_DEVICES=0`.
- With your own folder mounted on `/data/devices`, also pass `IOSIGNAL_DEVICES=1`; otherwise only `robot-arm.device.js` and `living-lamp.device.js` are looked for there.
- For an open dashboard without a token, pass `--dashboard` as an argument. Anyone who reaches the port sees the server status, so use it on a LAN only.
- Mounting all of `/data` hides the example folders; a feature whose folder or device files are missing then starts off.
- Logins, services (`reply`, `redis`) and TLS (wss) are not on by default; turn them on with arguments as below.

### With arguments

Any argument is passed to `io-server` as it is and the defaults above are not used (add `--web` and the rest yourself). The options are in `docker run --rm ghcr.io/remocons/iosignal --help` and the [CLI server docs](https://docs.iosignal.net/en/docs/server/cli-server/).

```bash
docker run --rm -p 7777:7777 -v ./auth.json:/data/auth.json:ro ghcr.io/remocons/iosignal -l 7777 --web -d /data/auth.json -M
docker run --rm -p 7777:7777 ghcr.io/remocons/iosignal -l 7777 --web --site /data/www --dashboard
docker run --rm -v "$PWD:/data" --entrypoint io-init ghcr.io/remocons/iosignal my-home     # create the example folder on the host
```

- The working directory is `/data` (`-f` log files, mounted auth files). The container runs as the `node` user.
- The health check is `GET /healthz` on the WebSocket port. On a port other than 7777, also pass `-e HEALTH_PORT=<port>`.
- `-k` and `-e` values show in `docker inspect`; in production use an auth file (`-d`) or Redis (`-r`).
- Retained values and subscriptions live in memory and are gone after a restart; devices send their values again when they reconnect.
- Behind a proxy, check `--trust-proxy` for client addresses and home channels.

### Compose examples

- [`compose/basic.yaml`](compose/basic.yaml): the default start, with environment and mount examples
- [`compose/redis.yaml`](compose/redis.yaml): Redis authentication and services
- [`compose/tls.yaml`](compose/tls.yaml): wss with Caddy, members only (the page asks for an ID and key)

## Build and test

Needs Docker buildx and, to load several platforms at once, the containerd image store.

```bash
./build.sh                               # this computer's platform, loaded locally
PLATFORMS=all ./build.sh                 # four platforms, loaded locally
./test/smoke.sh                          # test this computer's platform
PLATFORM=linux/arm/v7 ./test/smoke.sh    # test another platform under emulation
```

- `node_modules` is plain JavaScript: it is installed once on the build machine and copied into every platform's image. Optional (native) dependencies are left out.
- Base images: `node:22-alpine` for amd64, arm64 and arm/v6; `node:22-bookworm-slim` for arm/v7 (Alpine's 32-bit ARM Node did not start under emulation).
- The health check uses Alpine's `wget`, or `node` where there is none (Debian): starting `node` for every check takes seconds on a Raspberry Pi Zero.
- Smoke test (21 checks): health check, anonymous WebSocket call and login, CongSocket call, web pages, a virtual device answering, the `node` user, SIGTERM stop, three starts without arguments (nothing set: robot arm and lamp / `IOSIGNAL_DEVICES=0`: none / a dashboard token with `IOSIGNAL_DEVICES=1`: six), and a wrong `IOSIGNAL_DEVICES` value refused.

## Publish (maintainers)

1. Package permission for the GitHub token: `gh auth refresh -h github.com -s write:packages`
2. Log in: `gh auth token | docker login ghcr.io -u remocons --password-stdin`
3. Pass `./test/smoke.sh` on every platform, then `PUSH=1 ./build.sh`. It pushes the four platforms as one image index with the tags above, and puts the description and source repository in index annotations.
4. A newly pushed package is private: make it public in the GitHub package settings.
5. Check from another computer that is not logged in: `docker run --rm ghcr.io/remocons/iosignal --version`.

Try `PUSH=1 IMAGE=localhost:5055/iosignal ./build.sh` against a local registry first (macOS uses port 5000 for AirPlay).

## Raise the versions

1. Change `iosignal-cli` and `iosignal` in `package.json`.
2. `npm install --package-lock-only`
3. `PLATFORMS=all ./build.sh`, then `./test/smoke.sh` per platform

## Verification

- 2026-11-24, 10.0.0: all four platforms pass the 21 smoke checks, the 10.0.0 key login included (arm64 on Apple silicon; amd64, arm/v7 and arm/v6 under emulation). Login and encryption moved to Ascon (boho 3), so 9.x clients connect to this image only anonymously.
- 2026-11-21, 9.23.1: all four platforms pass the 21 smoke checks (robot arm and lamp by default) (arm64 on Apple silicon; amd64, arm/v7 and arm/v6 under emulation). `PUSH=1` tried against a local registry (four platforms, five tags, index annotations, pulled back and run).
- Not yet checked on real Raspberry Pi boards (especially the Zero, arm/v6).
