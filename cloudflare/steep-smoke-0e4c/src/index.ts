export default {
  async fetch(request: Request): Promise<Response> {
    return handleRequest(request);
  },
};

async function handleRequest(request: Request): Promise<Response> {
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
  if (!url) {
    return new Response('Missing query', { status: 400 });
  }

  const resp = await fetch(url);
  const xml = await resp.text();
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const json = xmlToJson(doc);
  const body = JSON.stringify({ line: json });
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function xmlToJson(node: Node): any {
  const result: any = {};
  if (node.nodeType === 3) {
    return node.nodeValue ? node.nodeValue.trim() : '';
  }
  if ((node as Element).attributes && (node as Element).attributes.length > 0) {
    result['@attributes'] = {} as Record<string, string>;
    for (const attr of Array.from((node as Element).attributes)) {
      result['@attributes'][attr.name] = attr.value;
    }
  }
  for (const child of Array.from(node.childNodes)) {
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
