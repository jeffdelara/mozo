// const Peer = require("peerjs");

const videoGrid = document.querySelector('#video-grid');
var socket = io('/');
// const peer = new Peer(undefined, {
//     host: '/',
//     port: '3001'
// });
const peer = new Peer(undefined);
let peers = {};
let currentStream = null;
let camAndAudioStream = null;
let currentCall = null;

// Todo: get user's name, emit to server
if(!localStorage.getItem('name')) {
    window.location.replace('/create-name');
    localStorage.setItem('room', ROOMID);
}

let chatName = localStorage.getItem('name');

peer.on('open', (id) => {
    socket.emit('join-room', ROOMID, id, chatName);
    localStorage.setItem('room', ROOMID);
});

// -------------------------------------------------------------------------------
// For streaming::
// get permission to use video and audio
navigator.mediaDevices.getUserMedia({
    video: true, 
    audio: true
}).then(stream => {
    currentStream = stream;
    camAndAudioStream = stream;
    const video = document.createElement('video');
    video.muted = true;
    showVideo(video, stream);
    
    // when im the one joining, other users will call me 
    // so this is my answer
    peer.on('call', (call) => {
        currentCall = call;

        call.answer(currentStream);
        call.on('stream', (remoteStream) => {
            console.log('STREAM');
            if(!peers[call.peer])
            {
                const video = document.createElement('video');
                video.id = call.peer;
                showVideo(video, remoteStream);
                peers[call.peer] = call;
            }
        });

        currentCall.ontrack = function(event) {
            console.log('Track', event);
        }
    });

    // when a new user join, call him
    socket.on('user-joined', (userId, name) => {
        notifyChat(name, 'has joined the chat.');
        const call = peer.call(userId, currentStream);

        if(!peers[call.peer]) {
            peers[call.peer] = call;
        }

        const video = document.createElement('video');
        video.id = userId;
        
        call.on('stream', (remoteStream) => {
            showVideo(video, remoteStream);
        });

        call.on('close', () => {
            console.log('close');
            peer.destroy();
            video.remove();
        });
    });
});

// -------------------------------------------------------------------------------
//  Utility functions

function startScreenShare()
{
    const options = {
        video : { cursor: "always" },
        audio: true
    };
    navigator.mediaDevices.getDisplayMedia(options)
        .then(displayStream => {

            displayStream.getVideoTracks()[0].addEventListener('ended', () => {
                stopScreenShare();
            });

            // Replace current stream with display media
            const myPeers = Object.keys(peers);
            if(myPeers.length > 0) {
                const replaceCamPromise = new Promise( (resolve, reject) => {
                    for(peerId of myPeers) {
                        peers[peerId].peerConnection.getSenders().map( sender => {
                            resolve(sender.replaceTrack(displayStream.getVideoTracks()[0]));
                        });
                    }
                });
    
                replaceCamPromise
                    .then((msg) => {
                        console.log(msg);
                    })
                    .catch(err => console.log(err));
    
                toggleCamera();
                toggleScreenShareButton('ON');
            } 

            else {
                linkNotif('No peers to share screen with.');
            }
        })
        .catch(err => {
            toggleScreenShareButton('OFF');
        });
}

function stopScreenShare()
{
    const myPeers = Object.keys(peers);
    const replaceScreenPromise = new Promise((resolve, reject) => {
        for(peerId of myPeers) {
            peers[peerId].peerConnection.getSenders().map(sender => {
                resolve(sender.replaceTrack(currentStream.getVideoTracks()[0]))
            });
        }
    });

    replaceScreenPromise
        .then(msg => {
            console.log(msg);
        })
        .catch(err => console.log(err));
    
    toggleCamera();
    toggleScreenShareButton('OFF');
}

function toggleCamera()
{
    const vid = currentStream.getVideoTracks();
    vid[0].enabled = !vid[0].enabled;
    return vid[0].enabled;
}

function toggleAudio()
{
    const audio = currentStream.getAudioTracks();
    audio[0].enabled = !audio[0].enabled;
    return audio[0].enabled;
}

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
    chatBox.scrollTo(0, chatBox.scrollHeight);
}

function showVideo(video, stream)
{
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        videoGrid.append(video);
        video.play();
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
