// /lib/io.js: io-server가 제공하는 브라우저용 IOSignal 클라이언트.
// 장치 규칙: 앱이 #search를 보내면 장치가 #notify <cid>로 답하고, <cid>@$name, $ui, $state를 보관해 둡니다.
import IO from '/lib/io.js'
import { parseName, parseUi } from '/shared/discovery.js'

const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
const io = new IO(url)
const devices = new Map() // cid -> { name, ui, state }
const $ = id => document.getElementById(id)
const MAX_LOG = 200

function log(text) {
  const box = $('log')
  const line = document.createElement('div')
  line.textContent = `${new Date().toLocaleTimeString()}  ${text}`
  box.prepend(line)
  if (box.childElementCount > MAX_LOG) box.replaceChildren(...[...box.children].slice(0, MAX_LOG))
}

function describeUi(text) {
  if (!text) return ''
  const ui = parseUi(text) // { type, ui: 버튼 목록, hasPanel, hasView }
  const buttons = ui.ui ?? ''
  return ui.type ? `${ui.type}${buttons ? ` · ${buttons}` : ''}` : buttons || text
}

function render() {
  const shown = [...devices]
  const rows = shown.map(([cid, d]) => {
    const name = parseName(d.name ?? '')
    const tr = document.createElement('tr')
    for (const text of [cid, `${name.name || '이름 없음'} (${name.group || '미분류'})`, describeUi(d.ui), d.state ?? '']) {
      const td = document.createElement('td')
      const code = document.createElement('code')
      code.textContent = text
      td.append(code)
      tr.append(td)
    }
    return tr
  })
  $('devices').replaceChildren(...rows)
  const current = $('target').value
  const options = shown.filter(([cid]) => !cid.startsWith('#'))
    .map(([cid, d]) => new Option(`${parseName(d.name ?? '').name || cid} (${cid})`, cid))
  $('target').replaceChildren(...options)
  if (options.some(option => option.value === current)) $('target').value = current
}

// 장치마다 묶음 이름 하나로 구독합니다: 실행 중에 생겼다 없어지는 구독은 io.link()로 붙이고
// io.unlinkAll(묶음 이름)으로 한 번에 뗍니다. io.listen()은 고정된 태그를 준비 코드에서 한 번 등록할 때 씁니다.
const scope = cid => `device:${cid}`

function follow(cid) {
  if (devices.has(cid)) return // #notify는 검색할 때마다 오므로, 이미 따라가는 장치면 아무것도 하지 않습니다
  const device = {}
  devices.set(cid, device)
  // 그룹(#ch)은 #ch$name, 장치는 <cid>@$name. 구독하면 서버가 보관한 마지막 값이 바로 옵니다.
  const tag = field => cid.startsWith('#') ? `${cid}$${field}` : `${cid}@$${field}`
  for (const field of ['name', 'ui', 'state']) {
    io.link(scope(cid), tag(field), (signalTag, value) => {
      if (devices.get(cid) !== device) return // 이미 정리한 장치
      const text = typeof value === 'string' ? value : String(value ?? '')
      log(`${signalTag} = ${text}`)
      if (field === 'state' && text === 'close') forget(cid) // 서버가 알린 장치 연결 끊김
      else device[field] = text
      render()
    })
  }
  render()
}

// 장치의 핸들러와 구독을 모두 뗍니다. 장치는 다시 접속하면 CID가 바뀔 수 있으므로 남겨 두지 않습니다.
// (그룹은 주인이 없어 close가 오지 않으므로 이 페이지의 연결이 끊길 때 정리됩니다.)
function forget(cid) {
  io.unlinkAll(scope(cid))
  devices.delete(cid)
}

io.on('ready', () => {
  $('status').textContent = `연결됨 · 내 CID ${io.cid}`
  io.signal('#search') // 다시 연결된 뒤에도 검색해서 장치를 새로 찾습니다
})
io.on('close', () => {
  // 이 페이지의 연결이 끊기면 알던 장치를 모두 잊습니다(다시 연결되면 검색으로 새로 찾음).
  for (const cid of [...devices.keys()]) forget(cid)
  render()
  $('status').textContent = '연결 끊김, 다시 연결 중…'
})
io.on('error', () => {})
io.listen('#notify', (tag, cid) => {
  if (typeof cid !== 'string' || !cid) return
  log(`#notify ${cid}`)
  follow(cid)
})

$('searchForm').addEventListener('submit', event => {
  event.preventDefault()
  io.signal('#search')
  log('#search')
})
$('commandForm').addEventListener('submit', event => {
  event.preventDefault()
  const cid = $('target').value
  const command = $('command').value.trim()
  if (!cid || !command) return
  io.signal(`${cid}@`, command)
  log(`→ ${cid}@ ${command}`)
})
