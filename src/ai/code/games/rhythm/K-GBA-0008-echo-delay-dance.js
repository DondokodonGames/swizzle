// K-GBA-0008-echo-delay-dance.js
// エコーディレイダンス — 相方が踏んだマスを見て、一拍遅れて同じマスを踏む
// 操作: 相方が光らせたマスを覚え、次の拍で同じマスをタップして一拍遅れでなぞる
// 終わり: 12拍分すべて一拍遅れで正しくなぞれば成功。違うマス/拍を外せば失敗
// @mechanic: memory_sequence
// @theme: mirror_dance_floor
// 世界観: 疑似3Dのダンスフロア。相方が踏んだ4マスの足跡を覚え、自分は必ず一拍遅れて同じマスをなぞり返す
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃った拍数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 疑似遠近の格子床、遠くほど暗く小さく、鮮やかな床タイルの差し色
  var C = {
    bg: '#0a1830', bg2: '#050c1c', floor: '#182848', floorEdge: '#2a4068',
    tileA: '#ff5a8a', tileB: '#5ad0ff', tileC: '#ffd400', tileD: '#5aff9a',
    good: '#3dff8a', bad: '#ff3d5a', gold: '#ffe600', white: '#eef6ff', ink: '#040810',
  };
  var TILE_COL = [C.tileA, C.tileB, C.tileC, C.tileD];

  var GAME_TITLE = 'ECHO DELAY';
  var LEN = 12;
  var BEAT = 0.85;
  var WIN = 0.24;
  var CX = W * 0.5, CY = H * 0.5, RAD = 260;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var matched, done, endWait, finished, ready, hitStop, shake, beatIdx, resolvedThis, SEQ;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function tilePos(i) {
    var a = -Math.PI / 2 + i * (Math.PI / 2);
    return { x: CX + Math.cos(a) * RAD, y: CY + Math.sin(a) * RAD * 0.62 };
  }

  var PARTNER = ['.##.', '####', '.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * (0.2 + i * 0.1), W, 2, C.floorEdge, 0.4);
  }

  function makeSeq() {
    var s = [];
    for (var i = 0; i < LEN; i++) s.push(Math.floor(Math.random() * 4));
    return s;
  }

  function beatTime(i) { return 0.8 + i * BEAT; }

  function initGame() {
    matched = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; beatIdx = 1; resolvedThis = false;
    SEQ = makeSeq();
  }

  function failEcho(x, y) {
    hitStop = 0.32;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function successEcho(x, y) {
    matched++;
    hitStop = 0.08;
    game.feedback.good(x, y, { text: 'GOOD', color: C.good });
    game.fx.burst(x, y, { color: C.gold, count: 12, speed: 280 });
    game.audio.play('se_good', 0.35);
    if (matched === Math.ceil((LEN - 1) / 2)) game.fx.popup('HALFWAY!', CX, CY - 300, { color: C.gold, size: 40 });
    if (matched >= LEN - 1) { ok = true; finished = true; finish(); return; }
    beatIdx++;
    resolvedThis = false;
  }

  function tryTap(x, y) {
    if (ready > 0 || done || finished || resolvedThis) return;
    var t = game.time.elapsed - beatTime(beatIdx);
    if (Math.abs(t) > WIN) return;
    var need = SEQ[beatIdx - 1];
    var pos = tilePos(need);
    var dist = Math.hypot(x - pos.x, y - pos.y);
    resolvedThis = true;
    if (dist <= 110) successEcho(pos.x, pos.y);
    else failEcho(x, y);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawTiles(curLit, echoLit) {
    for (var i = 0; i < 4; i++) {
      var p = tilePos(i);
      var a = (i === curLit) ? 0.9 : (i === echoLit ? 0.5 : 0.22);
      game.draw.circle(p.x, p.y, 100, TILE_COL[i], a);
    }
    if (curLit != null) {
      var pp = tilePos(curLit);
      game.draw.sprite(PARTNER, { '#': C.white }, pp.x, pp.y - 60, 16, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false, idx: 1, seq: [0, 1, 2, 3, 1, 0] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (BEAT * 6);
    if (cyc < dt || demo.t <= dt) { demo.idx = 1; demo.pressedThis = false; matched = 0; }
    var curI = Math.min(demo.seq.length - 1, Math.floor(cyc / BEAT));
    var curLit = demo.seq[curI];
    var echoLit = curI > 0 ? demo.seq[curI - 1] : null;
    var bt = beatTime(demo.idx <= curI ? demo.idx : curI);
    var tt = cyc - demo.idx * BEAT;
    if (tt > -0.06 && tt < 0.06 && demo.idx <= demo.seq.length - 1 && !demo.pressedThis) {
      demo.pressedThis = true;
      var pos = tilePos(demo.seq[demo.idx - 1]);
      demo.gx = pos.x; demo.gy = pos.y; demo.press = true;
      game.feedback.good(pos.x, pos.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.25);
      matched++;
    } else if (tt < -0.06) {
      demo.press = false;
    }
    if (tt > 0.3) { demo.idx = Math.min(demo.seq.length, demo.idx + 1); demo.pressedThis = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      var cyc2 = demo.t % (BEAT * 6);
      var curI2 = Math.min(demo.seq.length - 1, Math.floor(cyc2 / BEAT));
      drawTiles(demo.seq[curI2], curI2 > 0 ? demo.seq[curI2 - 1] : null);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTiles(null, null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(matched + ' / ' + (LEN - 1), W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + ((LEN - 1) - matched) + '拍!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(matched, { matched: matched, total: LEN - 1 });
        else game.end.failure({ matched: matched, total: LEN - 1 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      var t = game.time.elapsed - beatTime(beatIdx);
      if (t > WIN && !resolvedThis) { resolvedThis = true; failEcho(CX, CY); }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) {
      var curLit = beatIdx < LEN ? SEQ[beatIdx] : null;
      var echoLit = SEQ[beatIdx - 1];
      drawTiles(curLit, echoLit);
    }

    txt(matched + ' / ' + (LEN - 1), W / 2, H * 0.08, 30, C.white);
    game.draw.rect(60, 170, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 170, (W - 120) * (matched / (LEN - 1)), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.3], ['A4', 0.3], ['C5', 0.3], ['F5', 0.3]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
