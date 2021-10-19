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
let screenStream = null; 
let isScreenSharing = false;
let camStream = null;
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
    localStorage.setItem('userId', id);
});

// -------------------------------------------------------------------------------
// For streaming::
// get permission to use video and audio
navigator.mediaDevices.getUserMedia({
    video: true, 
    audio: true
}).then(stream => {
    currentStream = stream;
    camStream = stream;
    const video = document.createElement('video');
    video.muted = true;
    showVideo(video, stream);
    
    // when im the one joining, other users will call me 
    // so this is my answer
    peer.on('call', (call) => {
        currentCall = call;
        const callerName = call.metadata.chatName;

        call.answer(currentStream);
        call.on('stream', (remoteStream) => {
            if(!peers[call.peer])
            {
                const video = document.createElement('video');
                // video.id = call.peer;
                video.id = call.metadata.callerId;
                showVideo(video, remoteStream, callerName);
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
        // call new user with my chatName
        const callerId = localStorage.getItem('userId');
        const call = peer.call(userId, currentStream, { metadata: { chatName: chatName, callerId: callerId} });

        call.on('stream', (remoteStream) => {
            if(!peers[call.peer]) {
                const video = document.createElement('video');
                video.id = userId;

                showVideo(video, remoteStream, name);
                peers[call.peer] = call;

                if(isScreenSharing) {
                    replaceStream(screenStream);
                    const callerId = localStorage.getItem('userId');
                    setTimeout(function(){
                        socket.emit('start-screenshare', {roomId: ROOMID, userId: callerId, chatName: chatName});
                    }, 1000);
                    
                }
            }
            
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

function replaceStream(newStream)
{
    // Replace current stream with display media
    const myPeers = Object.keys(peers);
    if(myPeers.length > 0) {
        
        const replaceCamPromise = new Promise( (resolve, reject) => {
            for(peerId of myPeers) {
                peers[peerId].peerConnection.getSenders().map( sender => {
                    if(sender.track.kind === newStream.getVideoTracks()[0].kind) {
                        resolve(sender.replaceTrack(newStream.getVideoTracks()[0]));
                    }
                });
            }
        });

        replaceCamPromise
            .then((msg) => {
                console.log(msg);
            })
            .catch(err => console.log(err));
    } 

}

function startScreenShare()
{
    const options = {
        video : { cursor: "always" },
        audio: true
    };
    navigator.mediaDevices.getDisplayMedia(options)
        .then(displayStream => {
            isScreenSharing = true;
            screenStream = displayStream;

            displayStream.getVideoTracks()[0].addEventListener('ended', () => {
                stopScreenShare();
            });

            // Replace current stream with display media
            const myPeers = Object.keys(peers);
            if(myPeers.length > 0) {
                
                replaceStream(displayStream);
                toggleCamera();
                toggleScreenShareButton('ON');

                // tell the others that I'm screensharing
                const userId = localStorage.getItem('userId');
                socket.emit('start-screenshare', {roomId: ROOMID, userId: userId, chatName: chatName});
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
                if(sender.track.kind === currentStream.getVideoTracks()[0].kind) {
                    resolve(sender.replaceTrack(currentStream.getVideoTracks()[0]))
                }
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

    const userId = localStorage.getItem('userId');
    socket.emit('end-screenshare', {roomId: ROOMID, userId: userId, chatName: chatName});
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

function showVideo(video, stream, chatName = 'You')
{
    video.srcObject = stream;
    const div = document.createElement('div');
    div.innerHTML = `<span>${chatName}</span>`;
    div.classList.add('vid-container');

    video.addEventListener('loadedmetadata', () => {
        div.append(video);
        videoGrid.append(div);
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
    const video = document.getElementById(userId).parentNode;
    video.remove();
});


// -------------------------------------------------------------------------------
// Socket events 

function changeVideoForScreenShare(userId, type)
{
    const videos = document.querySelectorAll('#video-grid video');
    videos.forEach(vid => {
        if(type === 'start') {
            vid.classList.add('mini');
        } else if(type === 'end') {
            vid.classList.remove('mini');
        }
    });

    const screenSharingUser = document.getElementById(userId);
    if(type === 'start') {
        screenSharingUser.classList.add('screensharing');
    } else if(type === 'end') {
        screenSharingUser.classList.remove('screensharing');
    }
}

// When a peer started to share screen
socket.on('screenshare-broadcast-start', (chatName, userId) => {
    linkNotif(`${chatName} is screensharing.`);
    changeVideoForScreenShare(userId, 'start');
});

socket.on('screenshare-broadcast-end', (chatName, userId) => {
    linkNotif(`${chatName} ended screen share.`);
    changeVideoForScreenShare(userId, 'end');
});
