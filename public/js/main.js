var socket = io();
const peer = new Peer(undefined, {
    host: '/',
    port: '3001'
});

peer.on('open', (id) => {
    console.log(id);
    socket.emit('join-room', ROOMID, id);
});

socket.on('user-joined', userId => {
    console.log(`A user with id of ${userId} has joined the room.`);
});
