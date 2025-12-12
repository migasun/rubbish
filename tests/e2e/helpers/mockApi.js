export const lineFixtures = {
  '235024': {
    line: {
      arrival: { '#text': '1' },
      place: { '#text': '25.0330,121.5654' },
      points: {
        point: [
          {
            id: { '#text': '894299' },
            name: { '#text': '市府路口' },
            schedule: { '#text': '12:00' },
            arrival: { '#text': '12:03' },
            rank: { '#text': '1' },
            longitude: { '#text': '121.5654' },
            latitude: { '#text': '25.0330' },
            fixedPoint: { '#text': 'Y' }
          },
          {
            id: { '#text': '555000' },
            name: { '#text': '中央公園' },
            schedule: { '#text': '12:10' },
            arrival: { '#text': '12:15' },
            rank: { '#text': '2' },
            longitude: { '#text': '121.5670' },
            latitude: { '#text': '25.0350' },
            fixedPoint: { '#text': 'Y' }
          }
        ]
      }
    }
  },
  '235060': {
    line: {
      arrival: { '#text': '2' },
      place: { '#text': '25.0478,121.5319' },
      points: {
        point: [
          {
            id: { '#text': '995714' },
            name: { '#text': '北門站' },
            schedule: { '#text': '19:00' },
            arrival: { '#text': '19:05' },
            rank: { '#text': '1' },
            longitude: { '#text': '121.5319' },
            latitude: { '#text': '25.0478' },
            fixedPoint: { '#text': 'Y' }
          },
          {
            id: { '#text': '995715' },
            name: { '#text': '西門町' },
            schedule: { '#text': '19:10' },
            arrival: { '#text': '19:12' },
            rank: { '#text': '2' },
            longitude: { '#text': '121.5100' },
            latitude: { '#text': '25.0422' },
            fixedPoint: { '#text': 'Y' }
          }
        ]
      }
    }
  }
}

export async function registerLineMocks(page) {
  await page.route('**/?lineId=*', async route => {
    const url = new URL(route.request().url())
    const lineId = url.searchParams.get('lineId')
    const fixture = lineFixtures[lineId] || lineFixtures['235024']

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture)
    })
  })
}
