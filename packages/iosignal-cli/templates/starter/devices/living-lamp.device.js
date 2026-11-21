// 거실 조명: 공식 타입 rgb-light.1을 쓰므로 on, off, toggle, level=, color= 명령을 실행기가 알아서 처리합니다.
export default {
  name: '거실 조명:거실',
  type: 'rgb-light.1',
  ui: 'on,off,toggle',
  state: { on: '1', level: '70', color: '#ffb000' },
  view: { kind: 'bulb', on: 'on', level: 'level', color: 'color' },
}
