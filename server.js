const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidv4 } = require('uuid');
const port = 3000;

server.listen(port);

app.set('view engine', 'ejs');
app.use(express.static('public')); // use the static folder public

// ----------------------------------------------------------------------
// Dynamic pages

app.get('/', (req, res) => {
    res.render('index'); // view index.ejs
});

app.get('/create-name', (req, res) => {
    res.render('user');
});

app.post('/create-room', (req, res) => {
    const roomId = uuidv4();
    res.redirect(`/${roomId}`);
});

app.get('/rooms', (req, res) => {
    res.json(getActiveRooms(io));
});

app.get('/:room', (req, res) => {
    const roomId = req.params.room;
    res.render('room', { roomId: roomId });
});

// ----------------------------------------------------------------------
// Socket
io.on('connection', socket => {
    
    let _userId = null;
    let _roomId = null; 

    socket.on('join-room', (roomId, userId, name) => {
        socket.name = name;
        _userId = userId;
        _roomId = roomId;
        console.log({roomId, userId});
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', userId, name);
    });

    socket.on('chat-message', (name, message) => {
        io.to(_roomId).emit('chat-broadcast', name, message);
        console.log({name, message, _roomId});
    });

    socket.on('disconnect', () => {
        socket.to(_roomId).emit('user-disconnect', _userId, socket.name);
        console.log('user disconnected');
    });
});


// ----------------------------------------------------------------------
// Static pages

app.get('/about', (req, res) => {
    res.render('static/about');
});

app.get('/contact', (req, res) => {
    res.render('static/contact');
});


// ----------------------------------------------------------------------
//  Function utils
function getActiveRooms(io)
{
    // create an array of all the (potential) rooms 
    const arrayOfIds = Array.from(io.sockets.adapter.rooms);
    // filter if each id does not have a duplicated on the other array since the rooms are those unique id only
    const filteredIds = arrayOfIds.filter(room => !room[1].has(room[0]));
    // get only the first items
    const rooms = filteredIds.map(i => i[0]);
    return rooms;
}
