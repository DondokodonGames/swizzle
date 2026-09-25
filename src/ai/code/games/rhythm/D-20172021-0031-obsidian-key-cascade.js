// D-20172021-0031-obsidian-key-cascade.js
// オブシディアン・キー・カスケード — 落ちてくる黒鍵を、判定窓に入った瞬間に正しいレーンでタップして演奏する
// 操作: 3レーンを落ちてくる黒鍵を、判定窓(発光ライン)に重なった瞬間そのレーンをタップする
// 終わり: 規定回数(7回)連続で正しく叩けば成功。窓を外す/違うレーンを叩けば失敗
// @mechanic: timing_window
// @theme: nightstage_obsidian_key_cascade
// 世界観: 無人の夜舞台にひとり残った鍵盤奏者が、宙から降り続ける黒鍵を判定ラインで正確に捉え、一曲を弾ききる
// 残るもの: 正誤(CLEAR/GAME OVER) + 連続で捉えた鍵の数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 光沢のある黒鍵、強いハイライトと影で厚みを出す
  var C = {
    bg: '#2a2018', bg2: '#150f0a', stage: '#3a2c1e', laneLine: '#5a4632',
    key: '#191411', keyGloss: '#4a3a2c', keyHi: '#6a5642',
    windowOn: '#ffd76a', good: '#57e08c', bad: '#ff4d5e', gold: '#ffd76a', white: '#f3e6cf', ink: '#120c08',
  };

  var GAME_TITLE = 'KEY CASCADE';
  var TOTAL = 7;
  var LANE_X = [W * 0.28, W * 0.5, W * 0.72];
  var SPAWN_Y = H * 0.22;
  var HIT_Y = H * 0.76;
  var TRAVEL = 1.05;
  var SPEED = (HIT_Y - SPAWN_Y) / TRAVEL;
  var WIN_PX = 78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, done, endWait, finished;
  var ready, hitStop, shake;
  var keyLane, keyY, active, resolved;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PIANIST = ['.###.', '#####', '.#.#.', '.###.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffd76a', pulse * 0.4);
    for (var l = 0; l < 3; l++) {
      game.draw.rect(LANE_X[l] - 80, H * 0.18, 160, H * 0.66, C.stage, 0.55);
      game.draw.rect(LANE_X[l] - 80, H * 0.18, 160, 4, C.laneLine, 0.6);
    }
    game.draw.sprite(PIANIST, { '#': C.keyHi }, W * 0.5, H * 0.86, 14, { anchor: 'center' });
  }

  function newKey() {
    keyLane = Math.floor(Math.random() * 3);
    keyY = SPAWN_Y;
    active = true; resolved = false;
  }

  function initGame() {
    hits = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newKey();
  }

  function drawWindow() {
    game.draw.rect(LANE_X[keyLane] - 80, HIT_Y - WIN_PX, 160, WIN_PX * 2, C.windowOn, 0.16 + 0.08 * Math.sin(game.time.elapsed * 6));
    game.draw.line(LANE_X[keyLane] - 80, HIT_Y, LANE_X[keyLane] + 80, HIT_Y, C.windowOn, 6);
  }

  function drawKey() {
    if (!active) return;
    game.draw.rect(LANE_X[keyLane] - 58, keyY - 34, 116, 68, C.keyGloss);
    game.draw.rect(LANE_X[keyLane] - 58, keyY - 34, 116, 68, C.key, 0.75);
    game.draw.rect(LANE_X[keyLane] - 50, keyY - 28, 100, 10, C.keyHi, 0.6);
  }

  function pass(x, y) {
    resolved = true; active = false; hits++;
    hitStop = 0.08;
    game.feedback.good(x, y, { text: 'HIT', color: C.good });
    game.audio.play('se_good', 0.3);
    if (hits === 4) game.fx.popup('あと' + (TOTAL - hits) + '!', W * 0.5, H * 0.3, { color: C.gold, size: 36 });
    if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
    newKey();
  }

  function fail(x, y) {
    resolved = true; active = false;
    hitStop = 0.32; shake = 0.28;
    ok = false; finished = true;
    game.feedback.bad(x, y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished || resolved || !active) return;
    var lane = Math.abs(x - LANE_X[0]) < Math.abs(x - LANE_X[1]) && Math.abs(x - LANE_X[0]) < Math.abs(x - LANE_X[2]) ? 0
      : (Math.abs(x - LANE_X[1]) < Math.abs(x - LANE_X[2]) ? 1 : 2);
    var inWindow = keyY > HIT_Y - WIN_PX && keyY < HIT_Y + WIN_PX;
    game.audio.play('se_tap', 0.05);
    if (inWindow && lane === keyLane) pass(LANE_X[keyLane], HIT_Y);
    else if (inWindow) fail(LANE_X[lane], HIT_Y);
    // 判定窓の外(早すぎるタップ)は無反応のse_tapのみで継続
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: LANE_X[1], gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.5;
    if (cyc < dt || demo.t <= dt) newKey();
    if (active) {
      keyY = SPAWN_Y + Math.min(1, cyc / TRAVEL) * (HIT_Y - SPAWN_Y);
      demo.gx = LANE_X[keyLane]; demo.gy = H * 0.85; demo.press = false;
      if (keyY >= HIT_Y - 10 && active) {
        active = false; demo.press = true;
        game.feedback.good(LANE_X[keyLane], HIT_Y, { text: 'HIT', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (keyLane === undefined) initGame();
      bg();
      stepDemo(dt);
      if (active) { drawWindow(); drawKey(); }
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '鍵!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (active) {
        keyY += SPEED * dt;
        if (keyY > HIT_Y + WIN_PX && !resolved) fail(LANE_X[keyLane], HIT_Y);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished && active) { drawWindow(); drawKey(); }

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.25], ['C4', 0.25], ['E4', 0.25], ['A4', 0.5]], { tempo: 132, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
