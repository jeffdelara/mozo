const videoGrid = document.querySelector('#video-grid');
var socket = io('/');
const peer = new Peer(undefined, {
    host: '/',
    port: '3001'
});
let peers = {};

// Todo: get user's name, emit to server
if(!localStorage.getItem('name')) {
    window.location.replace('/create-name');
    localStorage.setItem('room', ROOMID);
}

let chatName = localStorage.getItem('name');

peer.on('open', (id) => {
    socket.emit('join-room', ROOMID, id, chatName);
});

// -------------------------------------------------------------------------------
// For streaming::
// get permission to use video and audio
navigator.mediaDevices.getUserMedia({
    video: false, 
    audio: true
}).then(stream => {
    const video = document.createElement('video');
    video.muted = true;
    showVideo(video, stream);
    
    // when im the one joining, other users will call me 
    // so this is my answer
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

    // when a new user join, call him
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

// -------------------------------------------------------------------------------
//  Utility functions
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

function addToChat(name, message)
{
    const chatBox = document.getElementById('chat-content');
    const chatItem = document.createElement('div');
    chatItem.setAttribute('class', 'chat-item');
    chatItem.innerHTML = `
        <div><b>${name}:</b> ${message}</div>
    `

    chatBox.append(chatItem);
    chatBox.scrollTo(0, chatBox.scrollHeight);
}

function sendChat(name, message)
{
    socket.emit('chat-message', name, message);
}

// -------------------------------------------------------------------------------
// Chatting
const chatInput = document.getElementById('chat-input-box');
chatInput.addEventListener('keydown', (event) => {
    if(event.key === 'Enter') {
        event.preventDefault();
        const message = chatInput.value;
        const name = chatName;
        console.log({message, name});
        sendChat(name, message);
        chatInput.value = '';
    }
});

socket.on('chat-broadcast', (name, message) => {
    addToChat(name, message);
});

// -------------------------------------------------------------------------------
// When user disconnects
socket.on('user-disconnect', (userId, name) => {
    notifyChat(name, 'has disconnected.');
    const video = document.getElementById(userId);
    video.remove();
});
