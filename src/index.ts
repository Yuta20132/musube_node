import express from 'express';
import http from 'http';
import { getCurrentTime } from './services/timeService';
import userRoute from './routes/users';
import threadRoute from './routes/threads';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

const WS_PORT = 8080;

// カスタムCORS設定
const corsOptions = {
  origin: '*', // 許可するオリジン
  methods: 'GET,POST', // 許可するHTTPメソッド
  allowedHeaders: 'Content-Type,Authorization' // 許可するヘッダー
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Hello World!\n');
});

app.use("/users", userRoute);
app.use("/threads", threadRoute);

server.listen(WS_PORT, () => {
  console.log(`Server started on http://localhost:${WS_PORT}`);
});

// async function main() {
//   try {
//     const currentTime = await getCurrentTime();
//     console.log('Current time:', currentTime);
//   } catch (err) {
//     console.error('Error getting current time', err);
//   }
  
// } 

//main();