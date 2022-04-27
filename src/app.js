import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import MongoStore from 'connect-mongo';
import productosRouter from './routes/routes.js';
import { Server } from 'socket.io';


const app = express();
const PORT = process.env.PORT||8080;
const server = app.listen(PORT, () => console.log((`Listening on PORT ${PORT}`)));

const io = new Server(server);

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use('/api',productosRouter);
app.use(cookieParser());

app.use(session({
    store:MongoStore.create({
        mongoUrl: `mongodb+srv://jimenez1917:dajiru17@cluster0.vfuad.mongodb.net/mySessions?retryWrites=true&w=majority`,
        ttl:10
    }),
    secret:'mongosecretcoderfeliz2022',
    resave:false,
    saveUninitialized:false,
}))

app.get('/', (req,res) => {
    let cookie = req.cookies;
    if(cookie.nombre)  {
        res.redirect('/content');
    }
    res.sendFile('login.html', {
        root: './views'
      });
})

app.post('/login', (req,res) =>{
    let nombre = req.body.nombre
    res.cookie('nombre',nombre);
    res.redirect('/content');
})

app.get('/content', (req,res) => {
    let cookie;
    if (req.cookies) {cookie = req.cookies}
    if(!cookie.nombre)  {
        res.redirect('/login');
    }
    res.sendFile('index.html', {
        root: './views'
      });
});

app.post('/logout',(req,res) => {
    res.clearCookie('nombre');
    res.sendFile('logout.html', {
        root: './views'
      });
})


app.use(express.static('public'));

io.on('connection', (socket) => {
    socket.on('newMessage', (data) => {
        io.emit('refreshChat',data);
    })
    socket.on('newProduct', (data) =>{
        io.emit('refreshProducts',data);
    })
})