/* global self, document, window, MutationObserver */

const configs = [
  {
    url: /play\.google\.com\/music/,
    playPauseSelector: '#player-bar-play-pause',
    prevSelector: '#player-bar-rewind',
    nextSelector: '#player-bar-forward',
    playingClass: 'playing'
  },
  {
    url: /soundcloud\.com/,
    playPauseSelector: '.playControls .playControls__play',
    prevSelector: '.playControls .playControls__prev',
    nextSelector: '.playControls .playControls__next',
    playingClass: 'playing'
  }
]

const state = {
  status: 'paused',
  config: null,
  waitControlsTimerId: null,
  statusObserver: null
}

const getPlayPauseEl = () =>
  document.querySelector(state.config.playPauseSelector)

const getPrevEl = () =>
  document.querySelector(state.config.prevSelector)

const getNextEl = () =>
  document.querySelector(state.config.nextSelector)

const isPlaying = () =>
  getPlayPauseEl().classList.contains(state.config.playingClass)

const prepare = () =>
  findConfig().then(waitForControls)

const findConfig = () =>
  new Promise((resolve, reject) => {
    const location = window.location.toString()
    state.config = configs.find(({ url }) => url.test(location))
    if (!state.config) return reject()
    resolve()
  })

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

const getStatus = () =>
  isPlaying() ? 'playing' : 'paused'

const changeStatus = (newStatus) => {
  if (state.status === newStatus) return
  state.status = newStatus
  emitStatus()
}

const emitStatus = () => {
  self.port.emit('status', state.status)
}

const emitDisable = () => {
  self.port.emit('disable')
}

const disable = () => {
  if (state.waitControlsTimerId) clearInterval(state.waitControlsTimerId)
  if (state.statusObserver) state.statusObserver.disconnect()
}

const processCommand = (command) => {
  switch (command) {
    case 'toggle':
      getPlayPauseEl().click()
      break
    case 'prev':
      getPrevEl().click()
      break
    case 'next':
      getNextEl().click()
      break
    default:
      break
  }
}

const init = () => {
  setupStatusObserver()
  self.port.on('status', emitStatus)
  self.port.on('command', processCommand)
  self.port.emit('init')
}

const attach = () => {
  self.port.on('disable', disable)
  prepare().then(init).catch(emitDisable)
}

attach()
