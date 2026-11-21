// 로봇 팔: 관절 다섯 개와 LED를 가진 가상 장치. www/robot.html이 이 장치를 3D로 그리고 조종합니다.
// 공식 타입이 없으므로 자체 화면(schema → $panel)을 보내, 기본 장치 페이지(/)에서도 슬라이더로 다룰 수 있습니다.
//
// 상태 $state: base=0;shoulder=20;elbow=60;wrist=0;grip=40;mode=idle;led=#38bdf8
//   base     몸통 회전 -180~180°      shoulder 어깨 0(곧게)~90°   elbow 팔꿈치 0~135°
//   wrist    손목 회전 -90~90°        grip     집게 0(닫힘)~100(열림)
//   mode     idle | moving | wave | dance
// 명령: base=<도>, shoulder=, elbow=, wrist=, grip=, led=#rrggbb, home, wave, dance, stop
//
// 명령은 목표만 바꾸고, 관절은 onTick마다 목표 쪽으로 조금씩 움직이며 상태를 보냅니다(실제 모터처럼).

const JOINTS = {
  base: { min: -180, max: 180, speed: 9 },
  shoulder: { min: 0, max: 90, speed: 5 },
  elbow: { min: 0, max: 135, speed: 6 },
  wrist: { min: -90, max: 90, speed: 10 },
  grip: { min: 0, max: 100, speed: 12 },
}
const HOME = { base: 0, shoulder: 20, elbow: 60, wrist: 0, grip: 40 }
const WAVE = [
  { base: 0, shoulder: 10, elbow: 100, wrist: 0, grip: 100 },
  { wrist: 70 }, { wrist: -70 }, { wrist: 70 }, { wrist: -70 }, { wrist: 0 },
  HOME,
]
const DANCE = [
  { base: -60, shoulder: 45, elbow: 40, wrist: 60, grip: 100 },
  { base: 60, shoulder: 25, elbow: 110, wrist: -60, grip: 0 },
  { base: 150, shoulder: 70, elbow: 30, wrist: 90, grip: 100 },
  { base: -120, shoulder: 15, elbow: 90, wrist: -90, grip: 20 },
]
const COLOR = /^#[0-9a-fA-F]{6}$/

let target = { ...HOME }
let queue = []        // 이어서 할 자세들 (wave, dance)
let loop = false      // dance는 멈출 때까지 반복

const clamp = (name, value) => Math.min(JOINTS[name].max, Math.max(JOINTS[name].min, value))

function startSequence(poses, mode, repeat, device) {
  queue = poses.map(pose => ({ ...pose }))
  loop = repeat
  target = { ...target, ...queue.shift() }
  device.set({ mode })
}

export default {
  name: '로봇 팔:실험실',
  ui: 'home,wave,dance,stop', // 화면을 모르는 앱이 쓸 대체 버튼
  state: { ...Object.fromEntries(Object.entries(HOME).map(([k, v]) => [k, String(v)])), mode: 'idle', led: '#38bdf8' },
  view: { kind: 'text', key: 'mode' },
  schema: {
    schema: 1,
    title: '로봇 팔',
    icon: 'precision_manufacturing',
    controls: [
      { widget: 'buttons', label: '동작', key: 'mode', cmd: '{v}', options: [
        { label: '처음 자세', value: 'home' }, { label: '손 흔들기', value: 'wave' },
        { label: '춤', value: 'dance' }, { label: '멈춤', value: 'stop' },
      ] },
      { widget: 'slider', label: '몸통', key: 'base', min: -180, max: 180, step: 5, unit: '°' },
      { widget: 'slider', label: '어깨', key: 'shoulder', min: 0, max: 90, step: 1, unit: '°' },
      { widget: 'slider', label: '팔꿈치', key: 'elbow', min: 0, max: 135, step: 1, unit: '°' },
      { widget: 'slider', label: '손목', key: 'wrist', min: -90, max: 90, step: 5, unit: '°' },
      { widget: 'slider', label: '집게', key: 'grip', min: 0, max: 100, step: 5, unit: '%' },
      { widget: 'color', label: 'LED', key: 'led' },
      { widget: 'value', label: '상태', key: 'mode' },
    ],
  },
  every: 100,

  onReady(device) {
    target = Object.fromEntries(Object.keys(JOINTS).map(name => [name, Number(device.state[name])]))
    device.log('로봇 팔 준비, CID', device.cid)
  },

  // 모든 명령을 여기서 처리하고 true를 돌려줍니다. 실행기가 처리 뒤 $state를 한 번 보냅니다.
  onCommand(command, device) {
    const [key, value] = command.split('=')
    if (command === 'home') startSequence([HOME], 'moving', false, device)
    else if (command === 'wave') startSequence(WAVE, 'wave', false, device)
    else if (command === 'dance') startSequence(DANCE, 'dance', true, device)
    else if (command === 'stop') {
      queue = []
      loop = false
      target = Object.fromEntries(Object.keys(JOINTS).map(name => [name, Number(device.state[name])]))
      device.set({ mode: 'idle' })
    } else if (key === 'led' && COLOR.test(value ?? '')) device.set({ led: value.toLowerCase() })
    else if (JOINTS[key] && value !== undefined && Number.isFinite(Number(value))) {
      queue = [] // 손으로 움직이면 진행 중인 동작은 그만둡니다
      loop = false
      target[key] = clamp(key, Math.round(Number(value)))
      device.set({ mode: 'moving' })
    }
    return true
  },

  onTick(device) {
    const patch = {}
    let moving = false
    for (const [name, joint] of Object.entries(JOINTS)) {
      const now = Number(device.state[name])
      const goal = target[name]
      if (now === goal) continue
      const step = Math.sign(goal - now) * Math.min(joint.speed, Math.abs(goal - now))
      patch[name] = String(now + step)
      moving = true
    }
    if (moving) return device.set(patch)
    // 목표에 닿았으면 다음 자세로, 없으면 쉼
    if (!queue.length && loop) queue = DANCE.map(pose => ({ ...pose }))
    if (queue.length) target = { ...target, ...queue.shift() }
    else if (device.state.mode !== 'idle') device.set({ mode: 'idle' })
  },
}
