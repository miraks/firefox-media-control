/* eslint-disable import/no-extraneous-dependencies, import/extensions, import/no-unresolved, import/prefer-default-export */

import { viewFor } from 'sdk/view/core'
import { getTabId } from 'sdk/tabs/utils'
import { PageMod } from 'sdk/page-mod'
import { Page } from 'sdk/page-worker'
import { ActionButton } from 'sdk/ui'

const symbols = {
  // ⏯
  playing: '❚❚',
  paused: '▶',
  prev: '⏪',
  next: '⏩'
}

const controls = [
  { name: 'prev', command: 'prev', content: symbols.prev },
  { name: 'playPause', command: 'toggle', content: symbols.paused },
  { name: 'next', command: 'next', content: symbols.next }
]

const controlColors = {
  default: '#6d6d6d',
  hovered: '#000000'
}

const controlStyles = {
  color: controlColors.default,
  pointerEvents: 'all',
  cursor: 'pointer',
  marginRight: '0.25em',
  transition: 'color 0.2s linear'
}

const tabs = {}
let socketPage = null
let playerPageMod = null

const addControls = (xulTab) => {
  const chromeDocument = xulTab.ownerDocument
  const tabContent = chromeDocument.getAnonymousElementByAttribute(xulTab, 'class', 'tab-content')
  const tab = tabs[getTabId(xulTab)]

  controls.forEach(({ name, command, content }) => {
    const control = chromeDocument.createElement('div')

    Object.assign(control.style, controlStyles)
    control.setAttribute('anonid', name)
    control.textContent = content

    tabContent.appendChild(control)
    tab[name] = control

    control.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || event.detail !== 1 || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return
      tab.lastActivity = new Date()
      tab.worker.port.emit('command', command)
      event.stopPropagation()
    })

    control.addEventListener('mouseover', () => {
      control.style.color = controlColors.hovered
    })

    control.addEventListener('mouseout', () => {
      control.style.color = controlColors.default
    })
  })
}

const removeControls = (tab) => {
  controls.forEach(({ name }) => { tab[name].remove() })
}

const addEventListeners = (xulTab) => {
  xulTab.addEventListener('TabMove', () => {
    addControls(xulTab)
  })
}

const changeStatus = (tab, status) => {
  tab.status = status
  tab.playPause.textContent = symbols[status]
}

const onPageModAttach = (worker) => {
  const sdkTab = worker.tab

  if (!sdkTab) {
    worker.destroy()
    return
  }

  const { id } = sdkTab
  const tab = { worker, status: 'paused', createdAt: new Date() }
  tabs[id] = tab

  const xulTab = viewFor(sdkTab)

  worker.port.once('init', () => {
    addControls(xulTab)
    addEventListeners(xulTab)
    worker.port.emit('status')
  })

  worker.port.on('status', (status) => {
    changeStatus(tab, status)
  })

  worker.port.once('disable', () => {
    worker.destroy()
  })

  worker.once('detach', () => {
    removeControls(tab)
    delete tabs[id]
  })
}

const currentTab = () => {
  const tbs = Object.values(tabs)

  if (tbs.length === 0) return

  const hasActivity = tbs.some(({ lastActivity }) => lastActivity)
  const key = hasActivity ? 'lastActivity' : 'createdAt'
  return tbs
    .filter((tab) => tab[key])
    .sort((tab1, tab2) => tab2[key] - tab1[key])[0]
}

const commandToCurrent = (command) => {
  const tab = currentTab()
  if (!tab) return
  tab.worker.port.emit('command', command)
}

const initSocket = () => {
  if (socketPage) socketPage.destroy()

  socketPage = Page({
    contentScriptFile: './socket.js',
    contentURL: './socket.html'
  })

  socketPage.port.on('message', ({ command }) => {
    commandToCurrent(command)
  })
}

const initPageMod = () => {
  if (playerPageMod) playerPageMod.destroy()

  playerPageMod = PageMod({
    include: [/https:\/\/soundcloud.com.*/, /https:\/\/play.google.com\/music\/.*/],
    attachTo: ['top', 'existing'],
    contentScriptFile: './player.js',
    onAttach: onPageModAttach
  })
}

const createButtons = () => {
  ActionButton({
    id: 'playPauseButton',
    label: 'Play / Pause',
    icon: './assets/play-pause.png',
    onClick: () => { commandToCurrent('toggle') }
  })
  ActionButton({
    id: 'prevButton',
    label: 'Prev',
    icon: './assets/prev.png',
    onClick: () => { commandToCurrent('prev') }
  })
  ActionButton({
    id: 'nextButton',
    label: 'Next',
    icon: './assets/next.png',
    onClick: () => { commandToCurrent('next') }
  })
}

export const main = () => {
  initSocket()
  initPageMod()
  createButtons()
}
