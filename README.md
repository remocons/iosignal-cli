# IOSignal CLI

[한국어](README.md) | [English](README.en.md)

[IOSignal](https://iosignal.net) 명령줄 도구 두 개를 함께 두는 저장소입니다. npm 패키지는 각각 따로 설치합니다.

| 패키지 | 폴더 | 내용 |
| --- | --- | --- |
| [iosignal-cli](https://www.npmjs.com/package/iosignal-cli) | [packages/iosignal-cli](packages/iosignal-cli/README.md) | IOSignal 서버(`io-server`)와 대화형 클라이언트(`io-client`), 키 생성(`io-keygen`), IP 확인(`ioip`), 가상 장치(`io-device`), 시작용 폴더(`io-init`) |
| [remocon](https://www.npmjs.com/package/remocon) | [packages/remocon](packages/remocon/README.md) | 한 번 보내기, 줄 입력, 키 입력, 대화형 모드를 갖춘 명령 전송 CLI(`remocon`, `remote`) |

```sh
npm install -g iosignal-cli
npm install -g remocon
```

io-server는 Docker 이미지(`ghcr.io/remocons/iosignal`)로도 실행할 수 있습니다. 빌드와 사용법은 [docker/](docker/README.md)에 있습니다.

## 개발

Node.js 22.16 이상이 필요합니다. npm workspaces를 씁니다.

```sh
npm ci
npm test              # 공유 파일 확인과 두 패키지의 시험
npm run sync:shared   # shared/ → packages/*/lib/ 복사
```

두 CLI가 함께 쓰는 파일(`ping.js`, `ping-line.js`, `log.js`)은 `shared/`가 원본입니다. 배포되는 패키지가 각자 사본을 갖도록 `npm run sync:shared`가 각 패키지의 `lib/`로 복사하며, `npm test`와 배포(`prepack`) 때도 실행됩니다. 사본이 원본과 다르면 시험이 실패합니다.

배포는 패키지별로 합니다: `npm publish -w iosignal-cli`, `npm publish -w remocon`.

## 라이선스

MIT
