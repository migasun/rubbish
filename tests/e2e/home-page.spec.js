import { test, expect } from '@playwright/test'
import { registerLineMocks, lineFixtures } from './helpers/mockApi.js'

test.beforeEach(async ({ page }) => {
  await registerLineMocks(page)
})

test('renders mocked route data and exposes detailed station info', async ({ page }) => {
  await page.goto('/')

  const noonPanel = page.locator('.route-panel').first()
  await expect(noonPanel.getByText('市府路口')).toBeVisible()
  await expect(noonPanel.getByText('12:03', { exact: false })).toBeVisible()

  const expandButton = noonPanel.getByRole('button', { name: '查看所有站點' })
  await expandButton.click()

  await expect(noonPanel.getByRole('button', { name: '垃圾車位置' })).toBeVisible()
  await expect(noonPanel.getByText('🚏 所有站點')).toBeVisible()
})

test('updates drawer watchers when selecting a new home point', async ({ page }) => {
  await page.goto('/')

  const drawerButton = page.getByRole('button', { name: 'Menu' })
  await drawerButton.click()

  const drawer = page.locator('.q-drawer')
  await expect(drawer).toBeVisible()

  const noonSelect = drawer.getByLabel('中午清運路線監看點')
  await noonSelect.click()
  await page.getByRole('option', { name: /中央公園/ }).click()

  const updatedId = lineFixtures['235024'].line.points.point[1].id['#text']
  await expect(drawer.getByText(`ID: ${updatedId}`)).toBeVisible()
})
