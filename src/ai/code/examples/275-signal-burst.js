// 275-signal-burst.js
// シグナルバースト — 中継塔をタップでONにして電源から全基地へ信号を繋ぐ配線パズル
// 操作: 中継塔をタップして経路を作る
// 成功: 3基地すべてに送信  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、通信網） ──
  var C = { bg:'#030a08', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#123a12', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SIGNAL BURST';
  var HOW_TO_PLAY = 'TAP RELAYS TO ROUTE POWER TO ALL BASES';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 8 → 3
  var CX = snap(W / 2), CY = snap(H * 0.46), TOP = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var nodes, signals, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha) { var len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / 12)); for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + (x2 - x1) * i / n) - 3, snap(y1 + (y2 - y1) * i / n) - 3, 6, 6, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a0a');
  }

  function background() { game.draw.clear(C.bg); }

  function buildLevel() {
    nodes = []; signals = [];
    nodes.push({ x: CX, y: CY, type: 'source', active: true, powered: true });
    var relays = 4;
    for (var ri = 0; ri < relays; ri++) { var a = ri / relays * Math.PI * 2 + 0.4, d = 200 + Math.random() * 120; nodes.push({ x: snap(CX + Math.cos(a) * d), y: snap(CY + Math.sin(a) * d * 0.8), type: 'relay', active: false, powered: false }); }
    for (var bi = 0; bi < NEEDED; bi++) { var a2 = bi / NEEDED * Math.PI * 2 + 0.9, d2 = 360; nodes.push({ x: snap(Math.max(120, Math.min(W - 120, CX + Math.cos(a2) * d2))), y: snap(Math.max(TOP + 80, Math.min(H - 260, CY + Math.sin(a2) * d2 * 0.7))), type: 'base', active: false, powered: false }); }
    for (var ni = 0; ni < nodes.length; ni++) {
      nodes[ni].conn = []; var ds = [];
      for (var nj = 0; nj < nodes.length; nj++) { if (ni === nj) continue; ds.push({ idx: nj, d: Math.hypot(nodes[ni].x - nodes[nj].x, nodes[ni].y - nodes[nj].y) }); }
      ds.sort(function(a, b) { return a.d - b.d; });
      var mc = nodes[ni].type === 'relay' ? 3 : 2;
      for (var k = 0; k < Math.min(mc, ds.length); k++) if (ds[k].d < 420) nodes[ni].conn.push(ds[k].idx);
    }
    propagate();
  }

  function propagate() {
    for (var i = 0; i < nodes.length; i++) if (nodes[i].type !== 'source') nodes[i].powered = false;
    var changed = true;
    while (changed) { changed = false; for (var ni = 0; ni < nodes.length; ni++) { if (!nodes[ni].powered) continue; for (var ci = 0; ci < nodes[ni].conn.length; ci++) { var t = nodes[nodes[ni].conn[ci]]; if ((t.type === 'relay' && t.active) || t.type === 'base') { if (!t.powered) { t.powered = true; changed = true; } } } } }
  }

  function poweredBases() { var n = 0; for (var i = 0; i < nodes.length; i++) if (nodes[i].type === 'base' && nodes[i].powered) n++; return n; }

  function initGame() { buildLevel(); timeLeft = MAX_TIME; done = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 120) : poweredBases() * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawNode(n) {
    if (n.type === 'source') { pc(n.x, n.y, 34, C.c, 0.9); }
    else if (n.type === 'relay') { game.draw.rect(snap(n.x) - 30, snap(n.y) - 30, 60, 60, n.active ? (n.powered ? C.b : C.e) : '#12203a', 0.9); txt(n.active ? 'ON' : 'OFF', n.x, n.y + 8, 26, '#000'); }
    else { pc(n.x, n.y, 32, n.powered ? C.b : '#12203a', 0.9); txt('B', n.x, n.y + 10, 28, n.powered ? '#000' : C.e); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var ni = 0; ni < nodes.length; ni++) { var n = nodes[ni]; if (n.type !== 'relay') continue; if ((x - n.x) * (x - n.x) + (y - n.y) * (y - n.y) < 50 * 50) { n.active = !n.active; propagate(); game.audio.play('se_tap', 0.3); if (poweredBases() >= NEEDED) { finish(true); return; } break; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!nodes) initGame(); background(); drawLinks(); for (var i = 0; i < nodes.length; i++) drawNode(nodes[i]);
      txt(GAME_TITLE, W / 2, H * 0.12, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.18, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL ONLINE!' : 'SIGNAL LOST', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }

    background(); drawLinks(); for (var ni = 0; ni < nodes.length; ni++) drawNode(nodes[ni]);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('BASES ' + poweredBases() + ' / ' + NEEDED, W / 2, 168, 46, C.b);
    scanlines();
  });

  function drawLinks() { for (var ni = 0; ni < nodes.length; ni++) for (var ci = 0; ci < nodes[ni].conn.length; ci++) { var nj = nodes[ni].conn[ci]; var on = nodes[ni].powered && nodes[nj].powered; pline(nodes[ni].x, nodes[ni].y, nodes[nj].x, nodes[nj].y, on ? C.b : C.d, on ? 0.9 : 0.5); } }

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
