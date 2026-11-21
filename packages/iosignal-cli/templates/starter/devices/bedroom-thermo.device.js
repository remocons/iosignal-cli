// 침실 온습도계: 명령이 없는 센서. 3초마다 새 값을 보냅니다.
export default {
  name: '온습도계:침실',
  type: 'thermo-hygrometer.1',
  state: { temp: '23.5', hum: '48' },
  view: { kind: 'thermo', temp: 'temp', hum: 'hum' },
  every: 3000,
  onTick(device) {
    const drift = (value, step, low, high) => Math.min(high, Math.max(low, value + (Math.random() - 0.5) * step))
    device.set({
      temp: drift(Number(device.state.temp), 0.6, 18, 30).toFixed(1),
      hum: String(Math.round(drift(Number(device.state.hum), 3, 30, 70))),
    })
  },
}
