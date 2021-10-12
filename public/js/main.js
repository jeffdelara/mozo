const videoGrid = document.querySelector('#video-grid');
var socket = io('/');
const peer = new Peer(undefined, {
    host: '/',
    port: '3001'
});
let counterAnswer = 0;
let counterCall = 0;
let peers = {};

peer.on('open', (id) => {
    socket.emit('join-room', ROOMID, id);
});

navigator.mediaDevices.getUserMedia({
    video: true, 
    audio: true
}).then(stream => {
    const video = document.createElement('video');
    showVideo(video, stream);
    
    peer.on('call', (call) => {
        call.answer(stream);
        call.on('stream', (remoteStream) => {
            if(!peers[call.peer])
            {
                const video = document.createElement('video');
                video.id = call.peer;
                // showVideo(video, remoteStream);
                video.style.border = '5px solid green';
                video.muted = true; // mute us but not others
                video.srcObject = remoteStream;

                // once video loaded
                video.addEventListener('loadedmetadata', () => {
                    video.play();
                });
                videoGrid.append(video);
                peers[call.peer] = call;
            }
            
        });
    });

    socket.on('user-joined', userId => {
        console.log(userId);
        const call = peer.call(userId, stream);
        const video = document.createElement('video');
        counterCall++;
        console.log({counterCall});
        call.on('stream', (remoteStream) => {
            video.muted = true; // mute us but not others
            video.id = userId;
            video.style.border = '5px solid red';
            video.srcObject = remoteStream;

            // once video loaded
            video.addEventListener('loadedmetadata', () => {
                video.play();
                videoGrid.append(video);
            });
        });

        call.on('close', () => {
            console.log('close');
            video.remove();
        });
    });
});

function connectToNewUser(userId, stream)
{
    
}

function showVideo(video, stream)
{
    video.muted = true; // mute us but not others
    video.srcObject = stream;
    video.style.border = '5px solid blue';
    // once video loaded
    video.addEventListener('loadedmetadata', () => {
        video.play();
        videoGrid.append(video);
    });
}

socket.on('user-disconnect', userId => {
    console.log(`Disconnected: ${userId}` );
    const video = document.getElementById(userId);
    video.remove();
});
