const express=require('express');
const  Mongoose = require('mongoose');
const app=express();
const ejsMate = require('ejs-mate');
const User=require('./models/user');
const path = require('path');
const expressSanitizer=require("express-sanitizer");
const flash = require('connect-flash');
const session= require('express-session');
const passport= require('passport');
const LocalStrategy=require('passport-local');
var nodemailer = require('nodemailer');

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))
app.use(express.urlencoded({extended:true}));
var bodyParser=require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer()); 
app.use(express.static("public"));
app.use(express.static("uploads"));

const MongoDBStore = require("connect-mongo")(session);
const dbUrl='mongodb+srv://abhi-dev007:abhi@2001@cluster0.90pcq.mongodb.net/Algoschool1?retryWrites=true&w=majority';
Mongoose.connect(dbUrl,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex:true })
    .then(() =>{
        console.log("mongo open")
    })
    .catch(err =>{
        console.log("Oh no! mongo connection error!!")
        console.log(err)
    })

const mcqSchema=new Mongoose.Schema({
    topic: {type:String},
    question: [{
        ques: {type: String},
        options:{
            op1: {type: String},
            op2: {type: String},
            op3: {type: String},
            op4: {type: String}
        },
        correct:{type: Number},
        pdfs:{
            expl:{type: String},
            link1: {type: String},
            link2: {type: String},
            link3: {type: String}
        }
    }]
});

const mcq=Mongoose.model("mcq",mcqSchema);

const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

const store = new MongoDBStore({
    url: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
})

const sessionConfig = {
    store,
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


    const ExpressError=class ExpressError extends Error {
        constructor(message, statusCode) {
            super();
            this.message = message;
            this.statusCode = statusCode;
        }
    }
const catchAsync=func => {
    return (req, res, next) => {
        func(req, res, next).catch(next);
    }
}
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

var transporter = nodemailer.createTransport({
    service: 'gmail',               //name of email provider
    auth: {
        user: 'abhishekpandpandey@gmail.com',       // sender's gmail id
        pass: '8175902880'     // sender password
    }
});

app.get('/',(req,res) => {
    if(!req.isAuthenticated()){
        req.flash('error', 'login to get to know more about Algoschool');
        res.render('index');
    }else{
    res.render('index');
    }
})

app.get('/register', (req,res) => {
    res.render('register');
})

app.post('/register', catchAsync(async (req,res)=>{
    try{
        const {email,username,password} = req.body;
        const user= new User({email,username});
        const registeredUser= await User.register(user,password);
        // console.log(user.email);
        req.login(registeredUser,err=>{
            if(err) return next(err);
            var mailOptions = {
                from: 'abhishekpandpandey@gmail.com',                   // sender's gmail
                to: user.email,                  // receiver's gmail
                subject: 'Sending Email using Node.js',     //subject
                text: 'That was easy!'                      //message Description
            };
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
            req.flash('success','Welcome to AlgoSchool');
            res.redirect('/');
        });
    }catch(e){
        req.flash('error','Something Wrong! Try again');
        res.redirect('/register');
    }
}));

app.get('/login', (req,res)=>{
    res.render('login');
})

app.post('/login', passport.authenticate('local',{failureFlash: true, failureRedirect:'/login'}), (req,res)=>{
    req.flash('success','welcome back!');
    res.redirect('/');
})

app.get('/logout',(req,res)=>{
    req.logout();
    req.flash('success','GoodBye!')
    res.redirect('/');
})

app.get("/mcq_post",function(req,res){
    res.render("mcq_post.ejs");
});

app.post("/mcq",function(req,res){
    console.log(req.body.topic);
    mcq.findOne({topic:req.body.topic},function(err,mcq1){
        if(mcq1){
            mcq1.question.push({
                ques: req.body.ques,
                options:{
                    op1:req.body.option1,
                    op2:req.body.option2,
                    op3:req.body.option3,
                    op4:req.body.option4
                },
                correct: req.body.correctoption,
                pdfs:{
                    expl: req.body.expl,
                    link1: req.body.link1,
                    link2: req.body.link2,
                    link3: req.body.link3
                }
            })
            mcq1.save();
            res.redirect("/mcq_display");
        }
        else if(!mcq1){
            mcq.create({
                topic: req.body.topic,
                question:{
                    ques: req.body.ques,
                    options:{
                        op1:req.body.option1,
                        op2:req.body.option2,
                        op3:req.body.option3,
                        op4:req.body.option4
                    },
                    correct: req.body.correctoption,
                    pdfs:{
                        expl: req.body.expl,
                        link1: req.body.link1,
                        link2: req.body.link2,
                        link3: req.body.link3
                    }
                }
            }, function(err,m){
                if(err)
                console.log(err);
                else res.redirect("/mcq_display");
            })
        }
        else res.redirect("/mcq_display");
    });
        
        // else res.redirect("https://www.google.com");
    
})

app.get("/mcq_display",function(req,res){
    if(!req.isAuthenticated()){
        req.flash('error', 'login to get to know more about Algoschool');
    }
    mcq.find({},function(err,mcq){
        if(err) console.log(err);
        else            
            res.render("mcq_display.ejs",{mcq:mcq});
        })   
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('err', { err });
})

app.listen(process.env.PORT||27017,() =>{
     console.log("server has started");
 })