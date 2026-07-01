// 098-card-flip-war.js
// カードウォー — 手札から1枚選び相手の1枚より強ければ勝ち、運と読みの勝負
// 操作: タップで手札のカードを選んでめくる
// 成功: 1勝  失敗: 相手が1勝 or 40秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'CARD WAR';
  var HOW_TO_PLAY = 'PICK A CARD TO BEAT THE RIVAL';
  var MAX_TIME = 40;
  var NEEDED = 1;           // 修正2: 5 → 1
  var NUM_CARDS = 3;
  var CARD_W = 220, CARD_H = 300, CARD_GAP = 40;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var playerHand, enemyCard, flipped, roundResult, roundTimer, pScore, eScore, timeLeft, done, feedback, pickedIdx, roundActive;
  var CARDS_X, PLAYER_Y = H * 0.62, ENEMY_Y = H * 0.28;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  var CARDS_TOTAL = NUM_CARDS * (CARD_W + CARD_GAP) - CARD_GAP;
  CARDS_X = (W - CARDS_TOTAL) / 2;

  function randCard() { return 2 + Math.floor(Math.random() * 13); }   // 2..14
  function startRound() { if (state !== S.PLAYING || done) return; enemyCard = randCard(); roundResult = null; roundActive = true; pickedIdx = -1; }
  function initGame() {
    playerHand = []; for (var i = 0; i < NUM_CARDS; i++) playerHand.push(randCard());
    flipped = [false, false, false]; pScore = 0; eScore = 0; timeLeft = MAX_TIME; done = false; feedback = 0; roundTimer = 0; startRound();
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    setTimeout(function() { state = S.RESULT; }, 900);
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function resolve(idx) {
    if (!roundActive || flipped[idx]) return;
    flipped[idx] = true; pickedIdx = idx; roundActive = false;
    var pv = playerHand[idx], ev = enemyCard;
    if (pv > ev) { roundResult = 'win'; pScore++; game.audio.play('se_tap', 1.0); }
    else if (pv < ev) { roundResult = 'lose'; eScore++; game.audio.play('se_failure', 0.6); }
    else { roundResult = 'tie'; game.audio.play('se_tap', 0.5); }
    feedback = 1.0; roundTimer = 1.2;
    if (pScore >= NEEDED) finish(true);
    else if (eScore >= NEEDED) finish(false);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || !roundActive) return;
    for (var ci = 0; ci < NUM_CARDS; ci++) {
      if (flipped[ci]) continue;
      var cx = CARDS_X + ci * (CARD_W + CARD_GAP);
      if (tx >= cx && tx <= cx + CARD_W && ty >= PLAYER_Y && ty <= PLAYER_Y + CARD_H) { resolve(ci); return; }
    }
  });

  function drawCard(x, y, val, faceUp, sel) {
    game.draw.rect(snap(x), snap(y), CARD_W, CARD_H, faceUp ? C.c : '#001a33');
    game.draw.rect(snap(x) + 8, snap(y) + 8, CARD_W - 16, CARD_H - 16, faceUp ? C.g : '#003366', faceUp ? 0.2 : 1);
    if (sel) game.draw.rect(snap(x) - 6, snap(y) - 6, CARD_W + 12, CARD_H + 12, C.d, 0.4);
    if (faceUp) txt(val === 14 ? 'A' : (val === 13 ? 'K' : (val === 12 ? 'Q' : (val === 11 ? 'J' : val + ''))), x + CARD_W / 2, y + CARD_H / 2, 100, '#001133');
    else { for (var py = y + 24; py < y + CARD_H - 24; py += 32) game.draw.rect(snap(x) + 24, snap(py), CARD_W - 48, 12, C.a, 0.6); }
  }

  // 世界観: カード決闘テーブル。相手の1枚に勝る手札を選び出す。
  function background() { game.draw.clear('#001100'); game.draw.rect(0, 300, W, H - 500, '#001a11'); txt('CARD TABLE', W / 2, 250, 34, C.b); }

  function drawScene() {
    txt('YOU ' + pScore, W * 0.25, H * 0.14, 44, C.f);
    txt('RIVAL ' + eScore, W * 0.75, H * 0.14, 44, C.g);
    if (roundResult !== null) drawCard(W / 2 - CARD_W / 2, ENEMY_Y, enemyCard, true, false);
    else { drawCard(W / 2 - CARD_W / 2, ENEMY_Y, 0, false, false); txt('?', W / 2, ENEMY_Y + CARD_H / 2, 90, C.g); }
    if (roundResult && feedback > 0) txt(roundResult === 'win' ? 'WIN!' : (roundResult === 'lose' ? 'LOSE' : 'TIE'), W / 2, H * 0.5, 88, roundResult === 'win' ? C.f : (roundResult === 'lose' ? C.e : C.d));
    for (var ci = 0; ci < NUM_CARDS; ci++) drawCard(CARDS_X + ci * (CARD_W + CARD_GAP), PLAYER_Y, playerHand[ci], flipped[ci], ci === pickedIdx);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!playerHand) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.1, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.05 + 90, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 60, C.g);
        txt('TAP TO START', W / 2, H * 0.97, 44, C.c);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'YOU WIN!' : 'YOU LOSE', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (roundTimer > 0) { roundTimer -= dt; if (roundTimer <= 0 && !done) { var left = flipped.filter(function(f) { return !f; }).length; if (left > 0) startRound(); } }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('FIRST TO ' + NEEDED + ' WINS', W / 2, 96, 40, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
