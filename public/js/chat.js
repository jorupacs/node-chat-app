const socket = io()

// Elements
const $messageForm = document.querySelector("#message-form")
const $messageFormInput = $messageForm.querySelector("input")
const $messageFormButton = $messageForm.querySelector("button")
const $sendLocationButton = document.querySelector("#send-location")
const $messages = document.querySelector("#messages")

// Templates
const messageTemplate = document.querySelector("#message-template").innerHTML
const locationTemplate = document.querySelector("#location-template").innerHTML
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML

// Options
const { username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true})

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // Visible height
    const visibleHeight = $messages.offsetHeight

    //Height of message container
    const containerHeight = $messages.scrollHeight

    //How far have I scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

socket.on('locationMessage', (message) => {
    //console.log(url);
    const html = Mustache.render(locationTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('broadcastMessage', (message) => {
    //console.log(message);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({room, users}) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })

    document.querySelector("#sidebar").innerHTML = html
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()

    const message = $messageFormInput.value

    if (message !== '') {
        $messageFormButton.disabled = true
        socket.emit('sendMessage', message, (error) => {
            $messageFormButton.disabled = false
            $messageFormInput.value = ''
            $messageFormInput.focus()
            if (error){
                console.log(error);
            }

            console.log('The message delivered!');
        })
    }
})

$sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser')
    }

    $sendLocationButton.disabled = true
    navigator.geolocation.getCurrentPosition((position) => {
        
        socket.emit("sendLocation", {
            longitude: position.coords.longitude, 
            latitude: position.coords.latitude
        }, () => {
            $sendLocationButton.disabled = false
            console.log('Location shared!');
        })
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert (error)
        location.href = '/'
    }
})