# IOSignal CLI

현재 npm 패키지 버전은 **7.1.0**이며 IOSignal 버전과 맞췄습니다. 서버·peer ping 처리와 CLI 로그 개선을 포함합니다.

iosignal-cli는 IOSignal 서버와 대화형 클라이언트를 실행하는 CLI입니다.

## 설치

Node.js 22.16.0 이상이 필요합니다.

```sh
npm install -g iosignal-cli
```

저장소에서 개발할 때는 다음 명령을 사용합니다.

```sh
npm ci
npm test
node bin/io-server.js --help
node bin/io-client.js --help
```

## 서버와 클라이언트 실행

```sh
io-server -l 7777                     # WebSocket 서버
io-server -L 8888                     # CongSocket(TCP) 서버
io-server -l 7777 -L 8888              # 두 전송 방식 함께 사용
io-client                            # ws://localhost:7777 연결
io-client -c                         # 공식 서버 wss://io.iosignal.net/ws 연결
io-client -c ws://localhost:7777
io-client -c cong://localhost:8888
```

`ios`는 `io-server`의 별칭이고, `io`와 `iosignal-cli`는 `io-client`의 별칭입니다.
`ioip`는 로컬 IPv4 주소를 출력하고, `io-keygen`은 인증용 ID와 키 후보를 생성합니다.
포트는 0~65535 정수이며, 0은 운영체제가 포트를 선택하도록 합니다.

서버의 `--timeout`은 heartbeat 및 연결 확인 주기입니다. 밀리초 단위이며 1000~2147483647 범위를 받습니다(기본 50000).
서버는 `-l`, `-L` 중 하나 이상을 지정해야 합니다. 클라이언트는 `-c` 옵션을 생략하면 `ws://localhost:7777`을 사용합니다.
`-c` 또는 `--connect`만 지정하고 주소를 생략하면 공식 서버 `wss://io.iosignal.net/ws`에 접속합니다.
`io-client -c -j demo`처럼 다른 옵션과 함께 사용할 수도 있습니다.

## 도움말과 서버 출력 옵션

```sh
io-client -h                    # 시작 옵션과 전체 대화형 명령
io-server -h                    # 서버 옵션과 실행 예제
io-client -V                    # CLI 및 IOSignal 버전
io-server -l 7777 -m 2 -s message
```

클라이언트 실행 중에는 `help`를 입력합니다. 명령 앞에 점(`.`)을 붙이지 않습니다.
기존 `.help`, `.sub`, `.pub` 같은 문법은 지원하지 않으며, 각각 `help`, `sub`, `pub`로 바꿔 입력하세요. 명령 이름은 대소문자를 구분합니다.
`-h`는 셸에서 프로그램을 실행할 때 쓰는 옵션이며, `help`는 실행 중 입력하는 명령입니다.

| 서버 옵션 | 설명 |
|---|---|
| `-m, --metric <mode>` | 0: 끔(기본), 1: 요약, 2: 연결 목록, 3: 채널 목록 |
| `-s, --show-message <mode>` | `none`(기본) 또는 `message`: 수신 메시지 로그 |
| `-f, --file-logger` | 현재 작업 디렉터리에 `connection.log`, `auth.log`, `attack.log` 기록 |
| `-a, --attach-services [list...]` | `reply`, `sudo`, `redis` 중 공백으로 구분하여 지정; 기본은 없음 |
| `-o, --show-options` | 초기 설정과 등록된 서비스 이름 출력 |

내장 서비스를 호출하려면 서버 시작 시 등록해야 합니다. 예를 들어 다음 서버에 클라이언트로 접속한 뒤 `call reply echo hello`를 입력합니다.

```sh
io-server -l 7777 --attach-services reply
```

## 인증

```sh
io-server -l 7777 --auth-file ./auth_file_sample/auth_file.json
io-client -i uno -k uno-key
```

인증 데이터 형식은 [JSON 예제](auth_file_sample/auth_file.json)와
[JavaScript 예제](auth_file_sample/auth_file.js)를 참고하세요.
JSON 파일은 `[id, key, cid, level]` 배열들의 목록이며, JavaScript 파일은 같은 목록을 `authInfo`로 named export합니다.
예제 파일 경로는 이 저장소를 내려받은 디렉터리를 기준으로 합니다. 전역 설치 후에는 준비한 인증 파일의 경로를 지정하세요.
명령 인자로 지정할 때는 `id.key.cid.level` 형식을 사용하고, 여러 항목은 쉼표로 구분합니다.

```sh
io-server -l 7777 --auth-param 'uno.uno-key.uno.1,admin.admin-key.admin.255'
io-client --auth-idKey uno.uno-key
```

클라이언트는 `-i`와 `-k`를 함께 사용하거나 `-a id.key`를 사용합니다. 둘 다 주어지면 완전한 `-i`/`-k` 쌍이 우선합니다.
서버 인증 옵션을 함께 지정하면 `--auth-file` → `--auth-param` → `--auth-redis` 순서로 하나만 선택됩니다.
인증 옵션이 없으면 인증 제공자를 설정하지 않습니다.

CLI는 시작 옵션에 포함된 인증 키를 출력하지 않습니다.
명령행 인자는 셸 이력이나 프로세스 목록에 남을 수 있으므로 서버 인증 정보는 파일 사용을 권장합니다.

## 구독과 발행

두 클라이언트를 실행한 뒤 첫 번째 클라이언트에서 구독합니다.

```text
sub demo
```

두 번째 클라이언트에서 발행합니다.

```text
pub demo hello world
```

`io-client -j demo` 또는 `io-client -j demo,alerts`로 시작 시 구독할 수도 있습니다.
`listen`과 `join`은 `subscribe`의 별칭이며, 공통 수신 핸들러로 출력합니다.
SDK의 `io.listen(tag, handler)`처럼 사용자 핸들러를 등록하는 명령은 아닙니다.
구독 목록은 재접속 시 복원되며 `unsub`로 제거합니다.
대화형 명령의 인자는 공백으로 나누며, 셸처럼 따옴표를 해석하지 않습니다.

| 명령 | 동작 |
|---|---|
| `help` | 전체 대화형 명령과 사용상 주의 표시 |
| `sub <tag>` / `subscribe` / `listen` / `join` | 구독, 여러 태그는 쉼표로 구분 |
| `unsub [tag]` | 지정 태그 구독 취소, 생략하면 전체 취소 |
| `pub <tag> [args...]` / `publish` | 메시지 발행 |
| `sig <tag> [args...]` / `signal` | 신호 전송 |
| `sig_bin <tag> <bytes>` | 0으로 채운 바이너리 전송, 0~1048576바이트; 서버 quota는 별도 적용 |
| `call <target> <command> [args...]` | 서비스 호출 |
| `sudo <command> [args...]` | sudo 서비스 호출; 서버 권한 필요 |
| `auth <id> <key>` / `login <id> <key>` | 자동 로그인용 인증 설정 / 서버 인증 challenge를 이용한 로그인 시도; 단일 `id.key` 인자도 가능 |
| `hide` / `show` | 수신 message 및 CID 메시지 숨김 / 표시; 제어·상태 메시지는 유지 |
| `id` / `ch` / `quota` | 현재 연결, 구독, quota 조회 |
| `ping [cid]` / `pong` / `pping <cid>` | 인자 없이 서버 ping · CID 지정 시 peer ping · pping은 별칭 |
| `echo [text]` / `iam [name]` | echo 요청 / 별명 조회·설정; text와 name은 한 토큰 |
| `encNo` / `encYes` / `encAuto` / `encMode` | 암호화 모드 변경 / 조회 |
| `close` / `open [url]` / `connect [url]` | 연결 닫기 / 재연결; `close` 후 자동 재접속할 수 있음 |
| `quit` / `exit` | 종료 |

`open`은 시작 시 선택한 전송 방식을 유지합니다. WS/TCP를 바꾸려면 클라이언트를 다시 실행하세요.
서버는 `Ctrl+C`로 종료하고, 클라이언트는 `exit`, `quit` 또는 `Ctrl+C`로 종료합니다.
`exit`는 클라이언트의 대화형 명령이며 서버에서는 사용할 수 없습니다.
CongSocket 재접속 주소는 `cong://host:port` 전체 형식으로 입력합니다.
`hide`는 상태나 명령 응답을 숨기지 않습니다. echo 및 일반 상태 출력은 TTY 터미널에서만 표시됩니다.

객체, 바이너리, 여러 payload 인자를 모두 표시합니다. 잘못된 대화형 입력은 오류를 출력하며 CLI는 계속 실행됩니다.

## Redis 인증과 서비스

실행 중인 Redis가 필요합니다. 기본 주소는 `localhost:6379`이며 환경변수로 변경할 수 있습니다.

```sh
REDIS_HOST=127.0.0.1 REDIS_PORT=6379 io-server -l 7777 --auth-redis
io-server -l 7777 --auth-redis --attach-services reply redis
```

Redis 연결이 완료된 뒤 서버를 시작하며, 연결 실패 시 오류와 종료 코드 1을 반환합니다.
연결 제한 시간은 5초이며 자동 재접속은 사용하지 않습니다. 서버 종료 시 Redis 연결도 닫습니다.

[Redis 인증 예제](test_auth_redis/)는 같은 환경변수를 사용합니다.

```sh
node test_auth_redis/redis_addAdmin.js admin admin-key admin
node test_auth_redis/redis_addMultipleDevice.js uno 1 10
node test_auth_redis/redis_add_get_device.js
node test_auth_redis/server-auth-redis.js
```

앞의 세 스크립트는 Redis에 예제 인증 데이터를 기록합니다. 다중 장치 예제는 ID와 같은 키를 생성합니다.
관리자·다중 장치 예제는 Redis `SAVE`도 호출합니다. 서버 예제의 기본 WebSocket 포트는 7777입니다.
단발성 예제는 작업 완료 후 Redis 연결을 닫고, 오류가 발생하면 종료 코드 1을 반환합니다.

## 테스트

`npm test`는 옵션 검증과 실제 로컬 WebSocket 통신을 검사합니다.
`IOSIGNAL_TEST_REDIS_SERVER`에 Redis 실행 파일을 지정하면 임시 Redis 인스턴스를 생성하여 인증 예제, 인증 키 출력 여부,
연결 실패 및 정상 종료까지 검증할 수 있습니다. 기존 Redis 데이터는 사용하지 않습니다.

```sh
IOSIGNAL_TEST_REDIS_SERVER=redis-server npm test
```

Server ping replies print `pong`; peer replies print `pong (<cid>)`. Peer requests use a direct `@ping` signal with one TEXT argument containing the sender CID. A responder sends `@pong` back with its own CID. CLI clients respond automatically, including while incoming messages are hidden. Unanswered requests time out after 3 seconds; disconnecting cancels pending requests.

## 대화형 로그 표시

대화형 프롬프트는 CID 대신 `›`를 사용합니다. 응답은 들여쓰고 수신 메시지,
연결 상태, 오류를 구분합니다. 시간은 기본적으로 숨기며 `--timestamps`로 표시합니다.
`NO_COLOR=1`로 색상을 끌 수 있습니다. 파이프 출력에는 장식이나 시간이 추가되지 않습니다.

`ping`은 서버에, `ping <cid>`는 상대 장치에 요청합니다. `pping <cid>`는 별칭입니다.
응답은 `pong` 또는 `pong (<cid>)`이며 3초 후 응답이 없으면 timeout을 표시합니다.
CLI는 수신한 peer ping에 자동 응답하며 `hide` 설정에도 응답합니다.
Node CLI는 기존 서버의 WebSocket 제어 PONG과 IOSignal PONG 패킷을 모두 처리합니다.
브라우저 CLI의 기본 ping에는 서버의 IOSignal PONG 패킷 응답이 필요합니다.
