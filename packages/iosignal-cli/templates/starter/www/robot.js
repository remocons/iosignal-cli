// 로봇 팔 조종 페이지.
// 1) 장치 찾기: #search → #notify <cid>, 상태에 shoulder·elbow 키가 있는 장치를 로봇으로 봅니다.
// 2) 조종: <cid>@ 로 명령(elbow=90, wave …)을 보냅니다.
// 3) 그리기: 장치가 보내는 <cid>@$state를 3D 모델에 부드럽게 따라가게 합니다.
import IO from '/lib/io.js'
import { parseName } from '/shared/discovery.js'
import { parseState } from '/shared/state.js'

const $ = id => document.getElementById(id)
const JOINTS = [
  { key: 'base', label: '몸통', min: -180, max: 180, step: 5, unit: '°' },
  { key: 'shoulder', label: '어깨', min: 0, max: 90, step: 1, unit: '°' },
  { key: 'elbow', label: '팔꿈치', min: 0, max: 135, step: 1, unit: '°' },
  { key: 'wrist', label: '손목', min: -90, max: 90, step: 5, unit: '°' },
  { key: 'grip', label: '집게', min: 0, max: 100, step: 5, unit: '%' },
]
const MODE_TEXT = { idle: '쉬는 중', moving: '움직이는 중', wave: '손 흔드는 중', dance: '춤추는 중' }

// ---- 연결과 장치 찾기 ----------------------------------------------------------------

const io = new IO(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`)
const devices = new Map() // cid -> { name, state }
let current = new URLSearchParams(location.search).get('cid') // ?cid= 로 고를 수도 있음
let state = {}             // 고른 로봇의 마지막 상태

const isRobot = d => d.state && 'shoulder' in d.state && 'elbow' in d.state
const scope = cid => `robot:${cid}`

function follow(cid) {
  if (cid.startsWith('#') || devices.has(cid)) return // 그룹은 로봇이 아님, 이미 따라가는 장치
  const device = {}
  devices.set(cid, device)
  io.link(scope(cid), `${cid}@$name`, (tag, text) => { device.name = String(text); renderDevices() })
  io.link(scope(cid), `${cid}@$state`, (tag, text) => {
    if (devices.get(cid) !== device) return
    if (text === 'close') return forget(cid)
    device.state = parseState(String(text))
    if (cid === current) applyState(device.state)
    renderDevices()
  })
}

function forget(cid) {
  io.unlinkAll(scope(cid))
  devices.delete(cid)
  if (cid === current) current = null
  renderDevices()
}

function renderDevices() {
  const robots = [...devices].filter(([, d]) => isRobot(d))
  if (!current || !devices.has(current) || !isRobot(devices.get(current))) {
    current = robots[0]?.[0] ?? null
    if (current) applyState(devices.get(current).state)
  }
  const select = $('device')
  select.replaceChildren(...robots.map(([cid, d]) => new Option(`${parseName(d.name ?? '').name || '로봇'} (${cid})`, cid)))
  if (current) select.value = current
  if (!robots.length) setMode(null)
}

io.listen('#notify', (tag, cid) => { if (typeof cid === 'string' && cid) follow(cid) })
io.on('ready', () => {
  $('link').textContent = `연결됨 · ${io.cid}`
  io.signal('#search')
})
io.on('close', () => {
  for (const cid of [...devices.keys()]) forget(cid)
  $('link').textContent = '연결 끊김, 다시 연결 중…'
})
io.on('error', () => {})

$('device').addEventListener('change', event => {
  current = event.target.value
  applyState(devices.get(current)?.state ?? {})
})

function send(command) {
  if (current && io.getStateName() === 'ready') io.signal(`${current}@`, command)
}

// ---- 조종 패널 -----------------------------------------------------------------------

const sliders = new Map() // key -> { input, output, row, touchedAt }

for (const joint of JOINTS) {
  const row = document.createElement('label')
  row.className = 'joint'
  const name = document.createElement('span')
  name.textContent = joint.label
  const input = Object.assign(document.createElement('input'), { type: 'range', min: joint.min, max: joint.max, step: joint.step, value: 0 })
  input.setAttribute('aria-label', joint.label)
  const output = document.createElement('output')
  row.append(name, input, output)
  $('joints').append(row)
  const slider = { joint, input, output, row, touchedAt: 0, timer: null }
  sliders.set(joint.key, slider)
  // 끄는 동안 120ms마다 한 번만 보냅니다. 놓으면 마지막 값을 한 번 더 보냅니다.
  input.addEventListener('input', () => {
    slider.touchedAt = Date.now()
    output.textContent = input.value + joint.unit
    if (!slider.timer) slider.timer = setTimeout(() => { slider.timer = null; send(`${joint.key}=${input.value}`) }, 120)
  })
  input.addEventListener('change', () => send(`${joint.key}=${input.value}`))
}

document.querySelectorAll('[data-cmd]').forEach(button => button.addEventListener('click', () => send(button.dataset.cmd)))
document.querySelectorAll('[data-led]').forEach(button => button.addEventListener('click', () => send(`led=${button.dataset.led}`)))
$('led').addEventListener('change', event => send(`led=${event.target.value}`))

function setMode(mode) {
  $('mode').textContent = mode === null ? '로봇 장치를 찾는 중… (devices/robot-arm.device.js)' : MODE_TEXT[mode] ?? mode
  document.querySelectorAll('[data-cmd]').forEach(b => b.classList.toggle('active', b.dataset.cmd === mode))
}

function applyState(next) {
  state = next ?? {}
  for (const [key, slider] of sliders) {
    const value = Number(state[key])
    if (!Number.isFinite(value)) continue
    // 사람이 막 움직인 슬라이더는 잠깐 그대로 둡니다(장치가 따라오는 중).
    if (Date.now() - slider.touchedAt > 800) slider.input.value = value
    slider.output.textContent = value + slider.joint.unit
    slider.row.classList.toggle('moving', Number(slider.input.value) !== value)
  }
  if (/^#[0-9a-f]{6}$/i.test(state.led ?? '')) $('led').value = state.led
  setMode(state.mode ?? 'idle')
}

// 키보드: 지금 상태에서 조금씩 바꿉니다.
const KEYS = { ArrowLeft: ['base', -10], ArrowRight: ['base', 10], ArrowUp: ['shoulder', -5], ArrowDown: ['shoulder', 5],
  w: ['elbow', -5], s: ['elbow', 5], a: ['wrist', -10], d: ['wrist', 10] }
window.addEventListener('keydown', event => {
  if (event.target.closest('input, select, textarea') || event.metaKey || event.ctrlKey || event.altKey) return
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
  if (key === 'h') return send('home')
  if (key === ' ') { event.preventDefault(); return send(`grip=${Number(state.grip) > 50 ? 0 : 100}`) }
  const move = KEYS[key]
  if (!move) return
  event.preventDefault()
  const slider = sliders.get(move[0])
  const value = Math.min(slider.joint.max, Math.max(slider.joint.min, Number(slider.input.value) + move[1]))
  slider.input.value = value
  slider.input.dispatchEvent(new Event('input'))
})

// ---- 3D (three.js) -------------------------------------------------------------------

startScene().catch(error => {
  const note = $('scene-note')
  note.hidden = false
  note.textContent = `3D를 불러오지 못했습니다(three.js는 인터넷에서 받습니다). 조종은 오른쪽에서 그대로 할 수 있습니다. ${error.message}`
})

async function startScene() {
  const THREE = await import('three')
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js')
  const canvas = $('scene')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(4.2, 3.4, 4.6)
  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 1.3, 0)
  controls.enableDamping = true
  controls.minDistance = 3
  controls.maxDistance = 12
  controls.maxPolarAngle = Math.PI * 0.49

  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 1.2))
  const sun = new THREE.DirectionalLight(0xffffff, 2)
  sun.position.set(4, 8, 3)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  scene.add(sun)

  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  const grid = new THREE.PolarGridHelper(4, 12, 6, 64, 0x334155, 0x334155)
  grid.position.y = 0.002
  scene.add(grid)

  const metal = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.4, roughness: 0.35 })
  const accent = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.2, roughness: 0.4 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.5 })
  const ledMaterial = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 2 })
  const mesh = (geometry, material, y = 0) => {
    const m = new THREE.Mesh(geometry, material)
    m.position.y = y
    m.castShadow = true
    m.receiveShadow = true
    return m
  }

  // 관절마다 빈 그룹(pivot)을 두고 그 안에 다음 부분을 넣습니다. pivot을 돌리면 그 아래가 함께 돕니다.
  const pedestal = mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.25, 48), dark, 0.125)
  scene.add(pedestal)
  const base = new THREE.Group()                     // base: Y축 회전
  base.position.y = 0.25
  scene.add(base)
  base.add(mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.35, 48), metal, 0.175))
  const led = mesh(new THREE.TorusGeometry(0.58, 0.035, 12, 64), ledMaterial, 0.2)
  led.rotation.x = Math.PI / 2
  base.add(led)
  const ledLight = new THREE.PointLight(0x38bdf8, 2, 3)
  ledLight.position.y = 0.4
  base.add(ledLight)

  const shoulder = new THREE.Group()                 // shoulder: 앞으로 숙이기(Z축)
  shoulder.position.y = 0.6
  base.add(shoulder)
  const joint1 = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.5, 32), accent)
  joint1.rotation.x = Math.PI / 2
  shoulder.add(joint1)
  shoulder.add(mesh(new THREE.BoxGeometry(0.32, 1.4, 0.32), metal, 0.7))

  const elbow = new THREE.Group()                    // elbow: 접기(Z축)
  elbow.position.y = 1.4
  shoulder.add(elbow)
  const joint2 = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 32), accent)
  joint2.rotation.x = Math.PI / 2
  elbow.add(joint2)
  elbow.add(mesh(new THREE.BoxGeometry(0.24, 1.1, 0.24), metal, 0.55))

  const wrist = new THREE.Group()                    // wrist: 팔 축으로 비틀기(Y축)
  wrist.position.y = 1.1
  elbow.add(wrist)
  wrist.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 32), dark, 0.09))
  wrist.add(mesh(new THREE.BoxGeometry(0.5, 0.1, 0.18), accent, 0.22))
  const fingerGeometry = new THREE.BoxGeometry(0.06, 0.32, 0.14)
  const fingerL = mesh(fingerGeometry, metal, 0.43)
  const fingerR = mesh(fingerGeometry, metal, 0.43)
  wrist.add(fingerL, fingerR)

  // 화면에 보이는 각도: 장치 상태 쪽으로 매 프레임 조금씩 다가갑니다(상태는 0.1초마다 오므로 부드럽게).
  const shown = { base: 0, shoulder: 20, elbow: 60, wrist: 0, grip: 40 }
  const ledColor = new THREE.Color(0x38bdf8)
  const deg = Math.PI / 180

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // 세로로 긴 화면(휴대폰)에서는 시야를 넓혀 팔 끝이 잘리지 않게 합니다.
    camera.fov = Math.min(80, 45 * Math.max(1, 1.2 / camera.aspect))
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(resize).observe(canvas)
  resize()

  let last = performance.now()
  renderer.setAnimationLoop(now => {
    const k = 1 - Math.exp(-(now - last) / 90) // 프레임 속도와 상관없이 같은 빠르기
    last = now
    for (const key of Object.keys(shown)) {
      const goal = Number(state[key])
      if (Number.isFinite(goal)) shown[key] += (goal - shown[key]) * k
    }
    base.rotation.y = shown.base * deg
    shoulder.rotation.z = -shown.shoulder * deg
    elbow.rotation.z = -shown.elbow * deg
    wrist.rotation.y = shown.wrist * deg
    const open = 0.05 + shown.grip / 100 * 0.14
    fingerL.position.x = -open
    fingerR.position.x = open
    if (/^#[0-9a-f]{6}$/i.test(state.led ?? '')) ledColor.lerp(new THREE.Color(state.led), k)
    ledMaterial.color.copy(ledColor)
    ledMaterial.emissive.copy(ledColor)
    ledLight.color.copy(ledColor)
    ledMaterial.emissiveIntensity = state.mode === 'idle' || !state.mode ? 1.2 : 1.6 + Math.sin(now / 120) * 0.8
    controls.update()
    renderer.render(scene, camera)
  })
}
