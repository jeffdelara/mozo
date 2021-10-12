const videoGrid = document.querySelector('#video-grid');
var socket = io('/');
const peer = new Peer(undefined, {
    host: '/',
    port: '3001'
});

let peers = {};

peer.on('open', (id) => {
    socket.emit('join-room', ROOMID, id);
});

navigator.mediaDevices.getUserMedia({
    video: true, 
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

    socket.on('user-joined', userId => {
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

function showVideo(video, stream)
{
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
        videoGrid.append(video);
    });
}

socket.on('user-disconnect', userId => {
    const video = document.getElementById(userId);
    video.remove();
});
