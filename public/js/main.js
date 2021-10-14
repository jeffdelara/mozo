const videoGrid = document.querySelector('#video-grid');
var socket = io('/');
const peer = new Peer(undefined, {
    host: '/',
    port: '3001'
});
let peers = {};

// Todo: get user's name, emit to server
console.log('main.js', localStorage.getItem('name'));

if(!localStorage.getItem('name')) {
    window.location.replace('/create-name');
    localStorage.setItem('room', ROOMID);
}

peer.on('open', (id) => {
    socket.emit('join-room', ROOMID, id, localStorage.getItem('name'));
});

navigator.mediaDevices.getUserMedia({
    video: false, 
    audio: true
}).then(stream => {
    const video = document.createElement('video');
    video.muted = true;
    showVideo(video, stream);
    
    peer.on('call', (call) => {
        call.answer(stream);
        call.on('stream', (remoteStream) => {
            if(!peers[call.peer])
            {
                const video = document.createElement('video');
                video.id = call.peer;
                showVideo(video, remoteStream);
                peers[call.peer] = call;
            }
            
        });
    });

    socket.on('user-joined', (userId, name) => {
        notifyChat(name, 'has joined the chat.');
        const call = peer.call(userId, stream);

        const video = document.createElement('video');
        video.id = userId;
        
        call.on('stream', (remoteStream) => {
            showVideo(video, remoteStream);
        });

        call.on('close', () => {
            console.log('close');
            video.remove();
        });
    });
});

// notifies the chatroom of 
function notifyChat(name, message)
{
    console.log(`${name} ${message}`);
    const chatBox = document.getElementById('chat-content');
    const chatItem = document.createElement('div');
    chatItem.setAttribute('class', 'chat-item');
    chatItem.innerHTML = `
        <div class='muted'>${name} ${message}</div>
    `

    chatBox.append(chatItem);
}

function showVideo(video, stream)
{
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
        videoGrid.append(video);
    });
}

socket.on('user-disconnect', (userId, name) => {
    notifyChat(name, 'has disconnected.');
    const video = document.getElementById(userId);
    video.remove();
});
