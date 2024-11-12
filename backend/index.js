const express = require('express');//express 객체 초기화 하기 위해 필요
const mongoose = require('mongoose');
// const dotenv = require('dotenv').config();
const jwt = require('jsonwebtoken');//JWT(json web token)
const cors = require('cors');//cors 오류 해결하기 위해
const User = require('./models/User');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const Message = require('./models/Message');
const ws = require('ws');
var url = require('url');
const axios = require('axios');

// dotenv.config();
require('dotenv').config({ path: './.env.local' });
// dotenv.config({ path: './.env.production' }); //배포 시 적용
mongoose.connect(process.env.MONGO_URL);
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL,
}));

app.get('/test', (req, res) => {
  res.json('test ok');
});

app.get('/profile', (req, res) => {
  const token = req.cookies?.token;
  if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          res.json(userData);
      });
  }
  else {
      res.status(401).json('no token');
  }
})

const GOOGLE_CLIENT_URL = process.env.GOOGLE_CLIENT_URL;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URL = process.env.CLIENT_URL;

const getToken = async(code) =>{
  try{
    const tokenApi = await
    axios.post(`https://oauth2.googleapis.com/token?code=${code}&client_id=${GOOGLE_CLIENT_URL}&client_secret=${GOOGLE_CLIENT_SECRET}&redirect_uri=${REDIRECT_URL}&grant_type=authorization_code`);
    const accessToken = tokenApi.data.access_token;
    console.log(accessToken);
    return accessToken;
  } catch (err) {
    return err;
  }
};

const getInfo = async(token) => {
  try{
    const resp = await
    axios.get(`https://www.googleapis.com/oauth2/v2/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
      },
    );
    console.log(resp);
    return resp;
  } catch (err) {
    return err;
  }
}

//설정한 리다이렉트 페이지로 이동시 처리할 로직
app.post("/oauth2", async(req, res) => {
  const {authorizationCode} = req.body;
  console.log("Code:", authorizationCode);
  if(authorizationCode){
    console.log('Get Code!');
    const token = await getToken(authorizationCode);
    console.log(token);
    const resp = await getInfo(token);
    console.log(resp.data);
  }
  res.send("Okay");
});


app.post('/register', async (req, res) => {
const {username, password} = req.body;
try {
  const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
  const createdUser = await User.create({
    username: username, 
    password: hashedPassword
  });
  jwt.sign({userId: createdUser._id, username}, jwtSecret, {}, (err, token) => 
  {
    if (err) throw err;
    res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json({
      id: createdUser._id,
      username
    });
  });
} catch(err) {
  res.status(500).json('error');
}
});

app.post('/login', async(req, res) => {
  const{username, password} = req.body;
  const foundUser = await User.findOne({username});
  if(foundUser){
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if(passOk){
      jwt.sign({userId:foundUser._id, username}, jwtSecret, {}, (err, token) => 
    {
        res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json({
          id: foundUser._id,
          username
        });
      });
    }
  }
});

async function getUserDataFromRequest(req){
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if(token){
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    }
    else {
      reject('no token');
    }
  })
}

app.get('/messages/:userId', async (req, res) => {
  const {userId} = req.params;
  const userData = await getUserDataFromRequest(req);
  const ourUserId = userData.userId;
  const messages = await Message.find({
    sender: {$in: [userId, ourUserId]},
    recipient: {$in: [userId, ourUserId]},
  }).sort({createdAt: 1});
  res.json(messages);
})

app.get('/people', async (req, res) => {
  const users = await User.find({}, {'_id':1, username:1});
  res.json(users);
});

// 소캣 API 시작
const server = app.listen(process.env.PORT);
const wss = new ws.WebSocketServer({server});
wss.on('connection', (connection, req) =>{

  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach(client => {
      client.send(JSON.stringify({
        online: [...wss.clients].map(c => ({
          userId: c.userId,
          username: c.username
        }))
      }));
    });
  }

  connection.isAlive = true;
  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      connection.terminate();
      notifyAboutOnlinePeople();
    }, 1000);
  }, 5000);

  connection.on('pong', () => {
    clearTimeout(connection.deathTimer);
  });

  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies.split(';').find(str =>
      str.trim().startsWith('token='));
      if (tokenCookieString){
        const token = tokenCookieString.split('=')[1];
        if(token){
          jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if (err) throw err;
            const {userId, username} = userData;
            connection.userId = userId;
            connection.username = username;
          })
        }
      }
  }

  // 메시지 보내기
  connection.on('message', async (message) => {
    const messageData = JSON.parse(message.toString()).message;
    const {recipient, text} = messageData;
    if(recipient && text) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
      });
      [...wss.clients]
      .filter(c => c.userId === recipient)
      .forEach(c => c.send(JSON.stringify({
        text,
        sender: connection.userId,
        recipient,
        _id: messageDoc._id,
      })));
    }
  });
  notifyAboutOnlinePeople();
});