// 画面どうしのつなぎ。
// ふだんはサーバー経由（WebSocket）。同じブラウザで開いた画面には
// BroadcastChannel でも届けるので、サーバーが眠っていても手元では動く。
function createLink(opt){
  opt = opt || {};
  var ws = null;
  var timer = null;
  var bc = null;

  try{
    if('BroadcastChannel' in window) bc = new BroadcastChannel('athlee-lite');
  }catch(e){}
  if(bc){
    bc.onmessage = function(ev){ if(opt.onMessage) opt.onMessage(ev.data); };
  }

  function connect(){
    var url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/';
    try{ ws = new WebSocket(url); }
    catch(e){ retry(); return; }

    ws.onopen = function(){ if(opt.onOpen) opt.onOpen(); };
    ws.onclose = function(){
      ws = null;
      if(opt.onClose) opt.onClose();
      retry();
    };
    ws.onerror = function(){};
    ws.onmessage = function(e){
      var m = null;
      try{ m = JSON.parse(e.data); }catch(err){ return; }
      if(opt.onMessage) opt.onMessage(m);
    };
  }

  function retry(){
    clearTimeout(timer);
    timer = setTimeout(connect, 2000);
  }

  function send(obj){
    if(ws && ws.readyState === 1){
      try{ ws.send(JSON.stringify(obj)); }catch(e){}
    }
    if(bc){
      try{ bc.postMessage(obj); }catch(e){}
    }
  }

  return {
    connect: connect,
    send: send,
    isOpen: function(){ return !!(ws && ws.readyState === 1); }
  };
}
