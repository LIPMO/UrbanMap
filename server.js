const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

app.use(express.static(__dirname))

let users = {}

io.on('connection', socket => {

  socket.on('join', user => {
    users[socket.id] = user
    io.emit('users', users)
  })

  socket.on('update', data => {
    if (users[socket.id]) {
      users[socket.id] = { ...users[socket.id], ...data }
      io.emit('users', users)
    }
  })

  socket.on('disconnect', () => {
    delete users[socket.id]
    io.emit('users', users)
  })
})

const PORT = process.env.PORT || 3000
http.listen(PORT, () => console.log("Serveur lancé sur", PORT))
