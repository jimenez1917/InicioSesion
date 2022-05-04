const mongoose = require('mongoose');
const express = require('express');
const session = require("express-session");
const MongoStore = require('connect-mongo');
const path = require('path');
const passport = require('passport');
const LocalStrategy=require('passport-local').Strategy;
const User = require('./models/User.js');
const cookieParser = require('cookie-parser')
const productosRouter= require('./routes/routes')
const {Server}= require('socket.io');
const bcrypt=require('bcrypt')


const app = express();
const PORT = process.env.PORT||8080;
const server = app.listen(PORT, () => console.log((`Listening on PORT ${PORT}`)));

const io = new Server(server);

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use('/api',productosRouter);
app.use(cookieParser());

mongoose.connect(`mongodb+srv://jimenez1917:dajiru17@cluster0.vfuad.mongodb.net/passport?retryWrites=true&w=majority`,{
    useNewUrlParser:true,
    useUnifiedTopology:true
},err=>{
    if(err) throw new Error(err);
    console.log('Mongo Connected')
})
app.use(session({
    store:MongoStore.create({
        mongoUrl: `mongodb+srv://jimenez1917:dajiru17@cluster0.vfuad.mongodb.net/passport?retryWrites=true&w=majority`,
        ttl:10000
    }),
    secret:'mongosecretcoderfeliz2022',
    resave:false,
    saveUninitialized:false,
    // cookie:{
    //     secure:false, //http o https
    //     maxAge: 30
    // }
}))

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user,done)=>{
    return done(null, user.id)
})

passport.deserializeUser((id, done)=>{
    User.findById(id,(err,user)=>{
        return done(err,user)
    })
})

const createHash = (password)=>{
    return bcrypt.hashSync(
        password,
        bcrypt.genSaltSync(10)
    )
}
passport.use('registro', new LocalStrategy(
    {
        passReqToCallback: true
    },
    (req,username,password,done)=>{
        User.findOne({username:username},(err,user)=>{
            if(err) return done(err)
            if(user) return done(null, false, {message:"user already exists"});
            const newUser = {
                name: req.body.name,
                username: username,
                password: createHash(password)
            }
            User.create(newUser, (err,userCreated)=>{
                if(err) return done(err);
                return done(null,userCreated)
            })
        })
    }
))

passport.use('login', new LocalStrategy(
    {
        passReqToCallback: true
    },
    (req, username, password, done)=>{
        console.log('strategy')
        User.findOne({username:username},(err,userFound)=>{
            if(err) return done(err);
            //validamos si el usuario no existe
            if(!userFound) return done(null, false, {message:"user does not exists"})
            //si encuentra el usuario, verificamos la contrasena
            if(!bcrypt.compare(password, userFound.password)){
                return done(null, false,{message:"invalid password"})
            }
            //abrir la sesion con el userFound
            req.session.user = {username: userFound.username}
            done(null, userFound);
        })
    }
))

app.get('/', (req,res) => {
    let cookie = req.cookies;
    if(cookie.nombre)  {
        res.redirect('/content');
    }
    res.sendFile('login.html', {
        root: './views'
      });
})
app.get('/signup',(req,res)=>{
    res.sendFile('singup.html',{
        root: './views'
    })
})
app.post('/signupForm',passport.authenticate('registro',
    {
        failureRedirect:'/signup'
    }),
    (req,res)=>{
        res.redirect('/perfil');
})
app.post("/loginForm",passport.authenticate('login',{
    failureRedirect:'/login'
}),(req,res)=>{
    res.redirect('/content')
})



app.get('/login',(req,res)=>{
    if(req.isAuthenticated()) return res.redirect('/content')
    res.sendFile('login.html',{
        root:'./views'
    })
})
const isActiveSession = (req,res,next)=>{
    if(req.session.user){
        next();
    } else{
        res.send(
            `<p>No autorizado</p></br><a href="/login">Iniciar sesion</a>`
        )
    }
}
app.get('/content',isActiveSession, (req,res)=>{
    console.log(res);
    res.sendFile('/index.html')
})
app.get('/prueba',(req,res)=>{
    console.log(new LocalStrategy(
        {
            passReqToCallback: true
        },
        (req, username, password, done)=>{
            User.findOne({username:username},(err,userFound)=>{
                if(err) return done(err);
                //validamos si el usuario no existe
                if(!userFound) return done(null, false, {message:"user does not exists"})
                //si encuentra el usuario, verificamos la contrasena
                if(!bcrypt.compare(password, userFound.password)){
                    return done(null, false,{message:"invalid password"})
                }
                //abrir la sesion con el userFound
                req.session.user = {username: userFound.username}
                done(null, userFound);
            })
        }
    ));
})



////////////////////////////////



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