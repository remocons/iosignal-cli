// 거실 선풍기: 공식 타입 fan.1. 켜져 있으면 2초마다 바람 세기를 조금씩 바꿔 봅니다(onTick).
export default {
  name: '거실 선풍기:거실',
  type: 'fan.1',
  state: { on: '0', speed: '3' },
  view: { kind: 'fan', on: 'on', speed: 'speed' },
  every: 2000,
  onTick(device) {
    if (device.state.on !== '1') return
    const speed = Math.min(5, Math.max(1, Number(device.state.speed) + (Math.random() < 0.5 ? -1 : 1)))
    device.set({ speed: String(speed) })
  },
}
