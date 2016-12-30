/* global self, WebSocket */

const port = 37581

let socket = null

const connect = () => {
  if (socket) socket.close()

  socket = new WebSocket(`ws://localhost:${port}`)

  socket.addEventListener('message', ({ data }) => {
    self.port.emit('message', JSON.parse(data))
  })
}

connect()
