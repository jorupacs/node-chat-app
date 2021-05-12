const path = require('path')
const http = require('http')
const express = require("express");
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/message')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express();
const server = http.createServer(app)
const io = socketio(server)

const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

const port = process.env.PORT || 3000

let count = 0

io.on('connection', (socket) => {
    console.log('New WebSocket Connection');

    

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({id: socket.id, ...options})

        if (error) {
            return callback(error)
        }

        socket.join(user.room)
        
        socket.emit('broadcastMessage', generateMessage('Admin', 'Welcome!'))
  
        // broadcast to everyone except to the connected client
        socket.broadcast.to(user.room).emit('broadcastMessage', generateMessage('Admin', `${user.username} has joined`))
        //io.to.emit -> send message to everyone in the room
        //socket.broadcast.to([room name]).emit -> send message to everyone expect the sender of the message

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()

        const user = getUser(socket.id)

        if (!user) {
            return callback('User does not exists!')
        }

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }
        
        io.to(user.room).emit('broadcastMessage', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (messageLoc, callback) => {
        const user = getUser(socket.id)

        if (!user) {
            return callback('User does not exists!')
        }

        callback()
        const url = `https://google.com/maps?q=${messageLoc.latitude},${messageLoc.longitude}`
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, url))
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('broadcastMessage', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
}) 

server.listen(port, () => {
    console.log("Server is up on port: " + port);
})