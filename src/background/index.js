const tabs = {}

const currentPort = () => {
  const comparator = ({ lastActivity: lastActivity1 }, { lastActivity: lastActivity2 }) => lastActivity2 - lastActivity1
  const [{ port }] = Object.values(tabs).sort(comparator)
  return port
}

const connectToTab = (tabId) => {
  const port = browser.tabs.connect(tabId)
  tabs[tabId] = {
    port,
    lastActivity: Date.now(),
    status: 'paused'
  }
  port.onDisconnect.addListener(() => {
    delete tabs[tabId]
  })
  port.onMessage.addListener(onPortMessage.bind(null, tabId))
}

const onPortMessage = (tabId, { type, data }) => {
  if (type === 'status') {
    tabs[tabId].lastActivity = Date.now()
    tabs[tabId].status = data.status
  }
}

const onRuntimeMessage = ({ type }, { tab }) => {
  if (type === 'connect') {
    connectToTab(tab.id)
  }
}

const onServerMessage = ({ command }) => {
  currentPort().postMessage({ type: 'command', data: { command } })
}

const onBrowserActionClick = () => {
  currentPort().postMessage({ type: 'command', data: { command: 'toggle' } })
}

browser.runtime.onMessage.addListener(onRuntimeMessage)

const serverPort = browser.runtime.connectNative('media_control_server')
serverPort.onMessage.addListener(onServerMessage)

browser.browserAction.onClicked.addListener(onBrowserActionClick)
