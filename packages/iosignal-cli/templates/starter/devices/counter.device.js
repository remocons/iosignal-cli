// 직접 만든 장치: 공식 타입 없이 버튼 목록(ui)과 글자 그림(view)만 씁니다.
// 명령: start, stop, reset, step=<숫자>. onCommand가 true를 돌려주면 실행기의 기본 처리를 건너뜁니다.
// 명령을 처리한 뒤에는 값이 그대로여도 상태를 보내야 앱의 대기 표시가 풀립니다(device.publish()).
export default {
  name: '카운터:실험',
  ui: 'start,stop,reset,step=1,step=10',
  state: { run: '1', count: '0', step: '1' },
  view: { kind: 'text', key: 'count' },
  every: 1000,
  onReady(device) {
    device.log('카운터 시작, CID', device.cid)
  },
  onCommand(command, device) {
    if (command === 'start') device.set({ run: '1' })
    else if (command === 'stop') device.set({ run: '0' })
    else if (command === 'reset') device.set({ count: '0' })
    else if (/^step=\d{1,4}$/.test(command)) device.set({ step: command.slice(5) })
    else device.publish() // 모르는 명령도 상태로 답합니다
    return true
  },
  onTick(device) {
    if (device.state.run !== '1') return
    device.set({ count: String(Number(device.state.count) + Number(device.state.step)) })
  },
}
