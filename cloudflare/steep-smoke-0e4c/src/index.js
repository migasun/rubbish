// 監聽 Cloudflare 的 fetch 事件
addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request));
});

// 處理進入的請求並轉向垃圾車 API
async function handleRequest(request) {
	const { searchParams } = new URL(request.url);
	const isLine24 = searchParams.has('line24');
	const isLine60 = searchParams.has('line60');
	let url = '';
	if (isLine24) {
		url = 'https://crd-rubbish.epd.ntpc.gov.tw/dispProject/api/line-status.ashx?lineid=235024';
	}
	if (isLine60) {
		url = 'https://crd-rubbish.epd.ntpc.gov.tw/dispProject/api/line-status.ashx?lineid=235060';
	}
	// 未帶任何參數時回傳錯誤
	if (!url) {
		return new Response('Missing query', { status: 400 });
	}

	// 取得 XML 資料並轉成 JSON
	const resp = await fetch(url);
	const xml = await resp.text();
	const doc = new DOMParser().parseFromString(xml, 'application/xml');
	const json = xmlToJson(doc);
	const body = JSON.stringify({ line: json });
	return new Response(body, {
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		}
	});
}

// 將 XML 轉為 JavaScript 物件
function xmlToJson(node) {
	const result = {};
	if (node.nodeType === 3) {
		return node.nodeValue.trim();
	}
	if (node.attributes && node.attributes.length > 0) {
		result['@attributes'] = {};
		for (const attr of node.attributes) {
			result['@attributes'][attr.name] = attr.value;
		}
	}
	for (const child of node.childNodes) {
		const value = xmlToJson(child);
		const name = child.nodeName;
		if (value === '') continue;
		if (result[name]) {
			if (!Array.isArray(result[name])) {
				result[name] = [result[name]];
			}
			result[name].push(value);
		} else {
			result[name] = value;
		}
	}
	return result;
}
