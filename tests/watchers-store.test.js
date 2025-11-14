import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { useWatchersStore } from '../src/stores/watchers.js'

const defaultLine24 = { id: '235024', label: '中午清运路线', defaultHomeId: 894299 }
const defaultLine60 = { id: '235060', label: '晚上清运路线', defaultHomeId: 995714 }

function createStore() {
  setActivePinia(createPinia())
  return useWatchersStore()
}

test('initialises with the default watchers', () => {
  const store = createStore()

  assert.strictEqual(store.watchers.length, 2)
  assert.deepStrictEqual(store.watchers[0], { lineParam: 'line24', homeId: 894299, label: '中午' })
  assert.deepStrictEqual(store.watchers[1], { lineParam: 'line60', homeId: 995714, label: '晚上' })
})

test('adds a watcher with the provided data', () => {
  const store = createStore()

  store.addWatcher('line24', 123456, '測試')

  assert.strictEqual(store.watchers.length, 3)
  assert.deepStrictEqual(store.watchers[2], { lineParam: 'line24', homeId: 123456, label: '測試' })
})

test('defaults the label to an empty string when omitted', () => {
  const store = createStore()

  store.addWatcher('line24', 567890)

  assert.deepStrictEqual(store.watchers.at(-1), { lineParam: 'line24', homeId: 567890, label: '' })
})

test('ignores removal of default watchers and removes dynamic ones', () => {
  const store = createStore()

  store.removeWatcher(0)
  assert.strictEqual(store.watchers.length, 2)

  store.addWatcher('line24', 123456, '測試')
  store.removeWatcher(2)

  assert.strictEqual(store.watchers.length, 2)
  assert.deepStrictEqual(store.watchers.at(-1), { lineParam: 'line60', homeId: 995714, label: '晚上' })
})

test('updates watcher home id when the line param matches', () => {
  const store = createStore()

  store.updateWatcher('line24', 777777)

  assert.deepStrictEqual(store.watchers[0], { lineParam: 'line24', homeId: 777777, label: '中午' })
})

test('stores available points for each line', () => {
  const store = createStore()

  const points = [{ id: 1 }, { id: 2 }]
  store.setAvailablePoints('line24', points)

  assert.deepStrictEqual(store.availablePoints.line24, points)
})

test('returns and updates line configuration', () => {
  const store = createStore()

  assert.deepStrictEqual(store.getLineConfig('line24'), defaultLine24)
  assert.deepStrictEqual(store.getLineConfig('line60'), defaultLine60)

  store.updateLineConfig('line24', { label: '自定義路線', extra: true })

  assert.deepStrictEqual(store.getLineConfig('line24'), {
    ...defaultLine24,
    label: '自定義路線',
    extra: true
  })
})

test('creates a new line configuration when one does not exist', () => {
  const store = createStore()

  store.updateLineConfig('line99', { id: 'line99', label: '新路線', defaultHomeId: 123 })

  assert.deepStrictEqual(store.getLineConfig('line99'), {
    id: 'line99',
    label: '新路線',
    defaultHomeId: 123
  })
})
