export default {
  async fetch(request: Request): Promise<Response> {
    return handleRequest(request);
  },
};

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const { searchParams } = new URL(request.url);
  const line24Id = searchParams.get('line24');
  const line60Id = searchParams.get('line60');
  const lineId = searchParams.get('lineId'); // 新增通用 lineId 參數

  const isLine24 = line24Id !== null;
  const isLine60 = line60Id !== null;
  const hasLineId = lineId !== null;

  console.log('Request params', { line24Id, line60Id, lineId });

  let url = '';
  let targetLineId = '';

  // 優先處理通用 lineId 參數
  if (hasLineId) {
    targetLineId = lineId;
  } else if (isLine24) {
    targetLineId = '235024'; // 預設的 line24 ID
  } else if (isLine60) {
    targetLineId = '235060'; // 預設的 line60 ID
  }

  if (targetLineId) {
    url = `https://crd-rubbish.epd.ntpc.gov.tw/dispProject/api/line-status.ashx?lineid=${targetLineId}`;
  }

  if (!url) {
    return new Response('Missing query parameter. Use ?lineId=XXXXX or ?line24=1 or ?line60=1', {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    console.log('Fetching from', url);
    const resp = await fetch(url);
    const xml = await resp.text();
    console.log('Fetched XML size', xml.length);
    const doc = parseXml(xml);
    const json = xmlToJson(doc);
    const body = JSON.stringify({ line: json });
    return new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('Request failed', err);
    return new Response('Failed to fetch data', {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

interface SimpleNode {
  nodeType: number;
  nodeName: string;
  nodeValue?: string;
  childNodes: SimpleNode[];
  attributes?: { name: string; value: string }[];
}

function parseXml(xml: string): any {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(xml, 'application/xml');
  }

  const stack: SimpleNode[] = [];
  const root: SimpleNode = {
    nodeType: 1,
    nodeName: 'root',
    childNodes: [],
  };
  stack.push(root);

  const tokenRe = /<[^>]+>|[^<]+/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(xml))) {
    const token = match[0];
    if (token.startsWith('<?')) {
      continue;
    }
    if (token.startsWith('</')) {
      stack.pop();
      continue;
    }
    if (token.startsWith('<')) {
      const selfClose = token.endsWith('/>');
      const inner = token.slice(1, selfClose ? -2 : -1).trim();
      const [tagName] = inner.split(/\s+/);
      const attrRe = /([\w:-]+)="([^"]*)"/g;
      const attrs: { name: string; value: string }[] = [];
      let m: RegExpExecArray | null;
      while ((m = attrRe.exec(inner))) {
        attrs.push({ name: m[1], value: m[2] });
      }
      const node: SimpleNode = { nodeType: 1, nodeName: tagName, childNodes: [] };
      if (attrs.length) node.attributes = attrs;
      stack[stack.length - 1].childNodes.push(node);
      if (!selfClose) stack.push(node);
      continue;
    }
    const text = token.trim();
    if (text) {
      stack[stack.length - 1].childNodes.push({
        nodeType: 3,
        nodeName: '#text',
        nodeValue: text,
        childNodes: [],
      });
    }
  }

  return root.childNodes[0];
}

function xmlToJson(node: any): any {
  const result: any = {};
  if (node.nodeType === 3) {
    return node.nodeValue ? node.nodeValue.trim() : '';
  }
  const attrs = (node as any).attributes;
  if (attrs && attrs.length > 0) {
    result['@attributes'] = {} as Record<string, string>;
    for (const attr of Array.from(attrs)) {
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
