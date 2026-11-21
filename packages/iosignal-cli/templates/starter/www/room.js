// 주소의 ?cid=a,b 로 받은 장치마다 단독 카드(<iosignal-device-card>)를 놓습니다.
import '/components/iosignal-devices.js'

const ids = (new URLSearchParams(location.search).get('cid') ?? '').split(',').map(s => s.trim()).filter(Boolean)
const box = document.getElementById('cards')
if (!ids.length) box.textContent = '주소에 ?cid=… 를 붙이면 여기에 카드가 나옵니다.'
for (const cid of ids) {
  const card = document.createElement('iosignal-device-card')
  card.setAttribute('cid', cid)
  box.append(card)
}
