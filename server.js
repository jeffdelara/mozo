const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const port = 3000;

server.listen(port);

app.set('view engine', 'ejs');
app.use(express.static('public')); // use the static folder public


// ----------------------------------------------------------------------
// Static pages
app.get('/', (req, res) => {
    res.render('index'); // view index.ejs
});

app.get('/about', (req, res) => {
    res.render('static/about');
});

app.get('/contact', (req, res) => {
    res.render('static/contact');
});

// ----------------------------------------------------------------------
// Dynamic pages
app.get('/:room', (req, res) => {
    res.render('room', { roomId: req.params.room });
});


// ----------------------------------------------------------------------
// Socket
io.on('connection', socket => {
    console.log('connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});
