# IOSignal 서버 Docker 이미지

[한국어](README.md) | [English](README.en.md)

npm에 배포된 [iosignal-cli](../packages/iosignal-cli/README.md)의 `io-server`를 담은 이미지입니다(iosignal-cli 10.0.0, iosignal 10.0.0). 버전은 `package.json`과 `package-lock.json`에 정확히 고정합니다.

이미지 이름: `ghcr.io/remocons/iosignal` (태그 `10.0.0`, `10.0`, `10`, `latest`, `10.0.0-core10.0.0`. 9.x 태그도 남아 있음: 10.0.0과 로그인 호환이 아님)
플랫폼: `linux/amd64`, `linux/arm64`, `linux/arm/v7`(라즈베리파이 32비트 OS), `linux/arm/v6`(라즈베리파이 Zero·1)

## 실행

### 인자 없이

```bash
docker run --rm -p 7777:7777 -p 55488:55488 ghcr.io/remocons/iosignal
```

`http://localhost:7777/`(장치 제어 페이지)와 `http://localhost:7777/site/`(예제 페이지)를 엽니다. 실제로 실행한 명령은 로그 첫 줄에 `io-server …`로 남습니다.

| 기능 | 기본 | 바꾸기 |
|---|---|---|
| WebSocket 7777, 장치 제어 페이지 `/` | 켜짐 | 인자로 직접 |
| CongSocket 55488 (Arduino) | 켜짐. IOSignal Arduino의 기본 포트라 보드는 서버 주소만 이 컴퓨터로 바꾸면 됨 | 인자로 직접 |
| 사용자 페이지 `/site/` | 켜짐. 이미지에 예제 페이지(장치 패널, 신호 보기, 3D 로봇 팔)가 들어 있음 | `-v ./www:/data/www:ro`로 내 페이지 |
| 대시보드 `/dashboard` | 꺼짐 | `-e IOSIGNAL_DASHBOARD_TOKEN=<8자 이상>`이면 토큰 접근으로 켜짐(페이지가 토큰을 물음) |
| 가상 장치 | **로봇 팔과 RGB 조명 두 개만** 실행. 로봇 페이지와 장치 패널에 바로 보일 것이 있도록. 이미지에는 예제 장치 6개(조명, 선풍기, 온습도계, 펌프, 카운터, 로봇 팔)가 들어 있음 | `-e IOSIGNAL_DEVICES=1`이면 `/data/devices`의 장치 전부, `0`이면 없음. 내 장치는 `-v ./devices:/data/devices:ro`와 `IOSIGNAL_DEVICES=1` |

```bash
docker run --rm -p 7777:7777 -p 55488:55488 -e IOSIGNAL_DASHBOARD_TOKEN=change-me-please ghcr.io/remocons/iosignal
docker run --rm -p 7777:7777 -p 55488:55488 -e IOSIGNAL_DEVICES=1 ghcr.io/remocons/iosignal      # 예제 가상 장치 6개 전부
docker run --rm -p 7777:7777 -p 55488:55488 -e IOSIGNAL_DEVICES=0 ghcr.io/remocons/iosignal      # 가상 장치 없이(운영)
docker run --rm -p 7777:7777 -p 55488:55488 -v ./www:/data/www:ro ghcr.io/remocons/iosignal
```

- **가상 장치는 기본으로 두 개만:** 가상 장치는 같은 홈채널의 모든 앱에 진짜 장치처럼 나타납니다(같은 LAN과 이 호스트의 앱에만 보이고 인터넷 사용자에게는 보이지 않음). 처음 쓰는 사람이 로봇 페이지와 장치 패널을 바로 써 볼 수 있도록 로봇 팔과 조명만 켜고, 운영 서버에서는 `IOSIGNAL_DEVICES=0`으로 끕니다.
- `/data/devices`에 내 폴더를 마운트하면 `IOSIGNAL_DEVICES=1`을 함께 줍니다. 주지 않으면 그 폴더에서 `robot-arm.device.js`, `living-lamp.device.js`만 찾습니다.
- 토큰 없이 대시보드를 공개(`open`)하려면 인자로 `--dashboard`를 직접 줍니다. 그 포트에 닿는 누구나 서버 상태를 보므로 LAN에서만 씁니다.
- `/data` 전체를 마운트하면 이미지의 예제 폴더가 가려집니다. 그 안에 `www`나 장치 파일이 없으면 그 기능은 꺼진 채로 시작합니다.
- 로그인, 서비스(`reply`, `redis`), TLS(wss)는 기본으로 켜지지 않습니다. 아래처럼 인자로 켭니다.

### 인자를 줄 때

인자를 하나라도 주면 그대로 `io-server`에 넘기고 위 기본값은 쓰지 않습니다(`--web` 등도 함께 적습니다). 옵션은 `docker run --rm ghcr.io/remocons/iosignal --help`와 [CLI 서버 문서](https://docs.iosignal.net/docs/server/cli-server/)에 있습니다.

```bash
docker run --rm -p 7777:7777 -v ./auth.json:/data/auth.json:ro ghcr.io/remocons/iosignal -l 7777 --web -d /data/auth.json -M
docker run --rm -p 7777:7777 ghcr.io/remocons/iosignal -l 7777 --web --site /data/www --dashboard
docker run --rm -v "$PWD:/data" --entrypoint io-init ghcr.io/remocons/iosignal my-home     # 예제 폴더를 호스트에 만들기
```

- 작업 폴더는 `/data`입니다(`-f` 로그 파일, 인증 파일 마운트). 컨테이너는 `node` 사용자로 실행합니다.
- 헬스체크는 WebSocket 포트의 `GET /healthz`입니다. 7777이 아닌 포트를 쓰면 `-e HEALTH_PORT=<포트>`도 줍니다.
- `-k`, `-e` 값은 `docker inspect`에 보이므로 운영에서는 인증 파일(`-d`)이나 Redis(`-r`)를 씁니다.
- 컨테이너를 다시 시작하면 보관 값과 구독은 사라집니다(메모리에만 있음). 장치는 다시 접속하며 자기 값을 다시 보냅니다.
- 서버 앞에 프록시를 두면 접속 주소와 홈채널을 위해 `--trust-proxy`를 확인합니다.

### compose 예제

- [`compose/basic.yaml`](compose/basic.yaml): 인자 없는 기본 실행, 환경 변수와 마운트 예
- [`compose/redis.yaml`](compose/redis.yaml): Redis 인증과 서비스
- [`compose/tls.yaml`](compose/tls.yaml): Caddy로 wss, 회원 전용(페이지가 ID·키를 받음)

## 빌드와 테스트

Docker buildx와 containerd 이미지 저장소(여러 플랫폼을 함께 불러올 때)가 필요합니다.

```bash
./build.sh                               # 이 컴퓨터의 플랫폼만, 로컬로
PLATFORMS=all ./build.sh                 # 4개 플랫폼, 로컬로
./test/smoke.sh                          # 이 컴퓨터의 플랫폼으로 시험
PLATFORM=linux/arm/v7 ./test/smoke.sh    # 다른 플랫폼을 에뮬레이션으로 시험
```

- `node_modules`는 순수 JavaScript라서 빌드하는 컴퓨터에서 한 번 설치하고 각 플랫폼 이미지에 복사합니다. 선택 의존성(네이티브 모듈)은 넣지 않습니다.
- 베이스 이미지: amd64·arm64·arm/v6은 `node:22-alpine`, arm/v7은 `node:22-bookworm-slim`(Alpine 32비트 ARM Node가 에뮬레이션에서 시작하지 않았음).
- 헬스체크는 Alpine의 `wget`을 쓰고, 없으면(Debian) `node`로 확인합니다. 검사마다 `node`를 띄우면 라즈베리파이 Zero에서 수 초가 걸리기 때문입니다.
- 스모크 테스트(21개): 헬스체크, WebSocket 익명 호출과 로그인, CongSocket 호출, 웹 페이지, 가상 장치 응답, `node` 사용자, SIGTERM 종료, 그리고 인자 없는 실행 세 경우(아무것도 주지 않음: 로봇 팔과 조명 / `IOSIGNAL_DEVICES=0`: 없음 / 대시보드 토큰과 `IOSIGNAL_DEVICES=1`: 6개)와 잘못된 `IOSIGNAL_DEVICES` 값 거부.

## 공개하기 (관리자)

1. GitHub 토큰에 패키지 권한: `gh auth refresh -h github.com -s write:packages`
2. 로그인: `gh auth token | docker login ghcr.io -u remocons --password-stdin`
3. 플랫폼마다 `./test/smoke.sh`를 통과시킨 뒤 `PUSH=1 ./build.sh`. 4개 플랫폼을 한 이미지 인덱스로 올리고 위 태그를 붙이며, 설명과 원본 저장소 연결을 인덱스 주석(annotation)으로 넣습니다.
4. 처음 올린 패키지는 비공개입니다. GitHub의 패키지 설정에서 Public으로 바꿉니다.
5. 로그인하지 않은 다른 컴퓨터에서 `docker run --rm ghcr.io/remocons/iosignal --version`으로 확인합니다.

`PUSH=1 IMAGE=localhost:5055/iosignal ./build.sh`로 로컬 레지스트리에 먼저 시험할 수 있습니다(macOS는 5000번을 AirPlay가 씀).

## 버전 올리기

1. `package.json`의 `iosignal-cli`, `iosignal` 버전을 바꿉니다.
2. `npm install --package-lock-only`
3. `PLATFORMS=all ./build.sh`, 플랫폼마다 `./test/smoke.sh`

## 검증 기록

- 2026-11-24, 10.0.0: 4개 플랫폼 모두 스모크 테스트 21개 통과(10.0.0 키 로그인 포함)(arm64는 Apple silicon에서, amd64·arm/v7·arm/v6은 에뮬레이션). 로그인·암호화가 Ascon(boho 3)으로 바뀌어 9.x 클라이언트는 이 이미지에 익명으로만 접속합니다.
- 2026-11-21, 9.23.1: 4개 플랫폼 모두 스모크 테스트 21개 통과(기본으로 로봇 팔과 조명)(arm64는 Apple silicon에서, amd64·arm/v7·arm/v6은 에뮬레이션). `PUSH=1`을 로컬 레지스트리로 시험(플랫폼 4개, 태그 5개, 인덱스 주석, 다시 받아 실행).
- 실물 라즈베리파이(특히 Zero, arm/v6)에서는 아직 확인하지 않았습니다.
