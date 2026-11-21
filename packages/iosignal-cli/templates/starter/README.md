# io-server 시작용 폴더

io-server의 직접 만든 페이지(`--site`)와 가상 장치(`--devices`)를 바로 시험해 볼 수 있는 폴더입니다. `io-init`이 만들었고, 마음대로 고쳐 쓰면 됩니다.

```sh
npm install
npm start
```

`http://localhost:7777/site/`를 엽니다(포트는 `io-init --port`로 정한 값). 자세한 것은 아래 [실행](#실행)에 있습니다.

```
./
├─ www/                      --site 로 제공 (/site/)
│  ├─ index.html             장치 패널 전체: <iosignal-devices>
│  ├─ room.html, room.js     분류 하나(category="거실")와 장치 카드 하나씩(<iosignal-device-card cid>)
│  ├─ signals.html, .js      컴포넌트 없이 /lib/io.js 로 찾기·명령 보내기
│  ├─ robot.html, .js, .css  로봇 팔을 3D(three.js)로 그리고 슬라이더·버튼·키보드로 조종
│  └─ style.css
└─ devices/                  --devices 로 실행 (파일 하나 = 장치 하나)
   ├─ living-lamp.device.js     거실 조명   공식 타입 rgb-light.1
   ├─ living-fan.device.js      거실 선풍기 공식 타입 fan.1, onTick
   ├─ bedroom-thermo.device.js  온습도계    센서, 3초마다 값 변경
   ├─ pump.device.json          펌프 제어   JSON, 버튼 목록과 relays 그림
   ├─ counter.device.js         카운터      타입 없이 직접 만든 장치, onCommand
   └─ robot-arm.device.js       로봇 팔     관절 5개와 LED, 자체 화면($panel), 목표로 천천히 움직임
```

### 로봇 팔 (`robot.html`)

`devices/robot-arm.device.js`는 관절 다섯 개(몸통, 어깨, 팔꿈치, 손목, 집게)와 LED를 가진 가상 장치입니다. 명령은 목표만 바꾸고, 관절은 0.1초마다 목표 쪽으로 조금씩 움직이며 `$state`를 보냅니다.

| 명령 | 뜻 |
|---|---|
| `base=<도>`, `shoulder=`, `elbow=`, `wrist=`, `grip=` | 관절 목표 (범위를 넘으면 잘림) |
| `led=#rrggbb` | LED 색 |
| `home`, `wave`, `dance`, `stop` | 처음 자세, 손 흔들기, 춤(멈출 때까지 반복), 멈춤 |

- `robot.html`은 상태에 `shoulder`, `elbow`가 있는 장치를 로봇으로 찾아 3D로 그립니다. 여러 대면 위에서 고르고, `robot.html?cid=…`로 정할 수도 있습니다.
- 키보드로도 움직입니다: ←→ 몸통, ↑↓ 어깨, W/S 팔꿈치, A/D 손목, Space 집게, H 처음 자세.
- 3D는 three.js를 CDN(jsdelivr, 0.170.0)에서 받습니다. 인터넷이 없으면 3D만 빠지고 조종은 그대로 됩니다.
- 장치가 자체 화면(`schema`)을 보내므로 기본 장치 페이지(`/`)에서도 슬라이더로 다룰 수 있습니다.

## 실행

`npm start`는 `package.json`의 다음 명령을 실행합니다. 이 폴더의 `node_modules`에 설치된 iosignal-cli를 쓰므로 전역 설치가 필요 없습니다.

```sh
io-server -l 7777 --web --site ./www --devices ./devices --dashboard
```

| 스크립트 | 하는 일 |
|---|---|
| `npm start` | 서버와 페이지, 가상 장치를 함께 띄움 |
| `npm run devices` | 이미 떠 있는 서버(`ws://localhost:7777`)에 가상 장치만 띄움, 파일을 고치면 다시 시작 |

| 주소 | 내용 |
|---|---|
| `http://localhost:7777/` | 내장 장치 제어 페이지 |
| `http://localhost:7777/site/` | 이 폴더의 `www/` |
| `http://localhost:7777/dashboard` | 서버 상태, 가상 장치 표 |

같은 LAN의 휴대폰에서는 `localhost` 대신 `ioip`로 나온 주소를 씁니다. `/site/`를 첫 화면으로 하려면 `--home site`를 더합니다.

서버 없이 다른 브로커에 장치만 띄울 때는 다음처럼 실행합니다.

```sh
npx io-device ./devices -c ws://192.168.0.24:7777 -w
```

## 고쳐 쓰기

- **장치:** `devices/`에 `이름.device.js`나 `이름.device.json`을 더하면 서버가 알아서 띄웁니다. 파일을 고치면 그 장치만 다시 시작합니다.
  - `name`: `이름:분류`
  - `type`: 공식 타입(https://docs.iosignal.net/docs/devices/types). 아니면 `ui`의 버튼 목록이나 `schema`의 화면을 씁니다.
  - `state`, `view`: 처음 상태와 그림
  - `onCommand`가 `true`를 돌려주면 기본 처리(on/off/toggle/key=value)를 건너뜁니다. 직접 처리할 때는 `device.set()`이나 `device.publish()`로 반드시 상태를 보냅니다.
  - `channel: '#lab'`은 그룹 구성원, `auth: 'id.key'`는 로그인입니다. 형식 전체는 `io-device --help`에서 볼 수 있습니다.
- **페이지:** `www/`의 HTML은 서버가 주는 `/components/`, `/shared/`, `/types/`, `/lib/io.js`를 불러 씁니다. 다른 주소의 서버에 붙이려면 `<iosignal-devices url="ws://host:7777/ws" types="http://host:7777/types/">`처럼 적습니다.
  - 회원 전용 서버(`-M`)라면 `<iosignal-devices login>`을 씁니다.
  - 다른 사이트에서 이 서버의 파일을 불러가려면 서버에 `--cors`를 줍니다.
- 장치 코드는 서버와 같은 권한으로 실행됩니다. 믿을 수 있는 파일만 넣으세요.
