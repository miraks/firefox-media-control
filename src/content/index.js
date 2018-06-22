const configs = [
  {
    url: /play\.google\.com\/music/,
    playPauseSelector: '#player-bar-play-pause',
    prevSelector: '#player-bar-rewind',
    nextSelector: '#player-bar-forward',
    isPlaying: (el) => el.classList.contains('playing')
  },
  {
    url: /music\.youtube\.com/,
    playPauseSelector: 'ytmusic-player-bar .play-pause-button',
    prevSelector: 'ytmusic-player-bar .previous-button',
    nextSelector: 'ytmusic-player-bar .next-button',
    isPlaying: (el) => el.icon === 'miniplayer:pause'
  },
  {
    url: /soundcloud\.com/,
    playPauseSelector: '.playControls .playControls__play',
    prevSelector: '.playControls .playControls__prev',
    nextSelector: '.playControls .playControls__next',
    isPlaying: (el) => el.classList.contains('playing')
  }
]

const state = {
  port: null,
  status: 'paused',
  config: null,
  waitControlsTimerId: null,
  statusObserver: null
}

const getPlayPauseEl = () => document.querySelector(state.config.playPauseSelector)

const getPrevEl = () => document.querySelector(state.config.prevSelector)

const getNextEl = () => document.querySelector(state.config.nextSelector)

const isPlaying = () => state.config.isPlaying(getPlayPauseEl())

const findConfig = () => {
  const location = window.location.toString()
  return configs.find(({ url }) => url.test(location))
}

const waitForControls = () =>
  new Promise((resolve, reject) => {
    const maxAttempts = 100
    let attempts = 0

    state.waitControlsTimerId = setInterval(() => {
      const el = getPlayPauseEl()

      if (el) {
        clearInterval(state.waitControlsTimerId)
        return resolve(el)
      }

      attempts += 1
      if (attempts >= maxAttempts) reject()
    }, 500)
  })

const setupStatusObserver = () => {
  state.statusObserver = new MutationObserver(() => {
    changeStatus(getStatus())
  })
  const el = getPlayPauseEl()
  state.statusObserver.observe(el, { attributes: true, attributeFilter: ['class'] })
}

const getStatus = () => (isPlaying() ? 'playing' : 'paused')

const changeStatus = (newStatus) => {
  if (state.status === newStatus) return
  state.status = newStatus
  sendStatus()
}

const processCommand = ({ command }) => {
  if (command === 'toggle') {
    getPlayPauseEl().click()
  } else if (command === 'prev') {
    getPrevEl().click()
  } else if (command === 'next') {
    getNextEl().click()
  }
}

const sendStatus = () => {
  state.port.postMessage({ type: 'status', data: { status: getStatus() } })
}

const onMessage = ({ type, data }) => {
  if (type === 'command') {
    processCommand(data)
  } else if (type === 'status') {
    sendStatus()
  }
}

const onConnection = (port) => {
  state.port = port
  port.onMessage.addListener(onMessage)
}

const init = async () => {
  const config = findConfig()
  if (!config) return
  state.config = config
  await waitForControls()
  setupStatusObserver()
  browser.runtime.onConnect.addListener(onConnection)
  browser.runtime.sendMessage({ type: 'connect' })
}

init()
