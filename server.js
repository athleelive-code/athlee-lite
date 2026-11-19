// AthleeLive Lite — 中継サーバー
// やることは2つだけ。
//   1. public/ のページを配る
//   2. つながっている画面どうしで、受け取ったメッセージをそのまま配り直す
const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

// 最後の状態を預かっておく。
// オーバーレイをあとから開いても、今の試合の続きが出るようにするため。
// 12時間より古いものは「前の試合」とみなして配らない。
let lastState = null;
let lastStateAt = 0;
const TTL = 12 * 60 * 60 * 1000;

function fresh() {
  return lastState && (Date.now() - lastStateAt) < TTL;
}

wss.on('connection', (ws) => {
  // つないだ直後に、今の状態を渡す
  if (fresh()) ws.send(lastState);

  ws.on('message', (data) => {
    const text = data.toString();
    try {
      const m = JSON.parse(text);
      // 試合の状態（コントローラーから）は預かる
      if (m && m.t === 'state') {
        lastState = text;
        lastStateAt = Date.now();
      }
      // 「今の状態をください」には、その場で預かっているものを返す
      if (m && m.t === 'hello' && fresh()) {
        ws.send(lastState);
      }
    } catch (e) {}

    // ほかの画面へそのまま流す
    wss.clients.forEach((c) => {
      if (c !== ws && c.readyState === 1) c.send(text);
    });
  });
});

// 無言の接続が切られないように、30秒ごとに ping を送る
setInterval(() => {
  wss.clients.forEach((c) => {
    if (c.readyState === 1) { try { c.ping(); } catch (e) {} }
  });
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('AthleeLive Lite — http://localhost:' + PORT));
