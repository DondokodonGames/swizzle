// J-N6424-0017-current-floor-trial.js
// カレントフロア・トライアル — 床を這う低電流と頭上を薙ぐ高アーク電流を見極め、上スワイプで跳び下スワイプでかわす体感トライアル
// 操作: 低い床電流には上スワイプで跳び越え、頭上のアーク電流には下スワイプでかわす。合図を見て逆方向へ払うと感電
// 終わり: 規定回数を感電せずかわし切れば成功。誤った方向のスワイプ/反応漏れで1回でも感電すると失格
// @mechanic: swipe_direction
// @theme: current_floor_trial
// 世界観: 試験場の被験体となった曲芸師が、床を這う低電流と頭上を薙ぐ高アーク電流を見極め、上下のスワイプだけで規定回数かわし切る度胸試しに挑む
// 残るもの: 正誤(CLEAR/GAME OVER) + かわした回数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 4階調(黄緑寄り)、残像・低コントラスト・画面枠
  var C = {
    bg: '#c8d888', bg2: '#8ca858', frame: '#3a4a28', floor: '#5a6a3a',
    hero: '#243418', heroLine: '#0e1608', low: '#e0d858', low2: '#b8b028',
    high: '#e0d858', warn: '#3a4a28', good: '#243418', bad: '#243418',
    gold: '#0e1608', ink: '#0e1608', panel: '#a8b868',
  };

  var GAME_TITLE = 'CURRENT TRIAL';
  var MAX_TIME = 12;
  var NEEDED = 6;
  var WARN_T = 0.6;
  var ACTIVE_T = 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HERO_STAND = ['.##.', '####', '.##.', '#..#'];
  var HERO_JUMP = ['.##.', '####', '####', '....'];
  var HERO_DUCK = ['....', '####', '####', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, 14, C.frame, 1); game.draw.rect(0, H - 14, W, 14, C.frame, 1);
    game.draw.rect(0, 0, 14, H, C.frame, 1); game.draw.rect(W - 14, 0, 14, H, C.frame, 1);
    var pulse = 0.04 + 0.03 * Math.sin(game.time.elapsed * 1.4);
    game.draw.rect(0, 0, W, H, C.frame, pulse * 0.15);
  }

  var dodged, phase, phaseT, kind, action, spawnGap, done, endWait, finished, ready, hitStop, shake, milestoneAt;

  function initGame() {
    dodged = 0; phase = 'idle'; phaseT = 0.5; kind = null; action = null;
    spawnGap = 0.5; milestoneAt = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function shocked() {
    ok = false; finished = true; hitStop = 0.35; shake = 0.3;
    game.feedback.bad(W * 0.5, H * 0.55, { text: 'MISS' });
    game.fx.flash(C.frame, 0.2);
    game.audio.play('se_bad', 0.45);
    finish();
  }

  function succeedDodge() {
    dodged++;
    action = kind;
    game.feedback.good(W * 0.5, H * 0.55, { color: C.good, size: 16 });
    game.audio.play('se_jump', 0.25);
    var m = Math.floor(dodged / (NEEDED / 3));
    if (m > milestoneAt && m < 3) {
      milestoneAt = m;
      game.fx.popup('NICE', W * 0.5, H * 0.35, { color: C.gold, size: 30 });
      game.audio.play('se_milestone', 0.25);
    }
    phase = 'idle'; phaseT = 0.4 + game.random(0, 0.2); kind = null;
    if (dodged >= NEEDED) {
      ok = true; finished = true; hitStop = 0.2;
      game.feedback.good(W * 0.5, H * 0.55, { text: 'CLEAR', color: C.good });
      game.fx.burst(W * 0.5, H * 0.55, { color: C.gold, count: 22, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onSwipe(function(dir) {
    if (state === S.ATTRACT) return;
    if (state === S.RESULT) return;
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.1);
    var want = kind === 'low' ? 'up' : kind === 'high' ? 'down' : null;
    if (want && (phase === 'warn' || phase === 'active')) {
      if (dir === want) { action = kind; succeedDodge(); }
      else shocked();
    } else {
      game.feedback.bad(W * 0.5, H * 0.55, { text: 'MISS' });
    }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function stepTrial(dt) {
    if (phase === 'idle') {
      spawnGap -= dt;
      if (spawnGap <= 0) {
        kind = game.random(0, 1) < 0.5 ? 'low' : 'high';
        phase = 'warn'; phaseT = WARN_T;
        game.audio.play('se_tap', 0.15);
      }
    } else if (phase === 'warn') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'active'; phaseT = ACTIVE_T; }
    } else if (phase === 'active') {
      phaseT -= dt;
      if (phaseT <= 0) { shocked(); }
    }
    if (!finished && game.time.elapsed >= MAX_TIME) {
      ok = false; finished = true; hitStop = 0.2; shake = 0.15;
      game.feedback.bad(W * 0.5, H * 0.55, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      finish();
    }
  }

  function drawScene() {
    game.draw.rect(W * 0.2, H * 0.66, W * 0.6, 20, C.floor, 1);
    var heroSprite = action === 'low' ? HERO_JUMP : action === 'high' ? HERO_DUCK : HERO_STAND;
    if (kind === 'low' && (phase === 'warn' || phase === 'active')) {
      var a = phase === 'active' ? 0.85 : (0.35 + 0.35 * Math.sin(game.time.elapsed * 14));
      game.draw.rect(W * 0.2, H * 0.6, W * 0.6, 16, C.low, a);
    }
    if (kind === 'high' && (phase === 'warn' || phase === 'active')) {
      var a2 = phase === 'active' ? 0.85 : (0.35 + 0.35 * Math.sin(game.time.elapsed * 14));
      game.draw.rect(W * 0.2, H * 0.4, W * 0.6, 16, C.high, a2);
      game.draw.line(W * 0.5, H * 0.4, W * 0.5, H * 0.56, C.high, 6);
    }
    game.draw.sprite(heroSprite, { '#': C.hero }, W * 0.5, H * 0.55, 16, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: false, dir: 'up' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.2;
    if (cyc < dt || demo.t <= dt) initGame();
    stepTrial(dt);
    if ((phase === 'warn' || phase === 'active') && kind && !demo.press) {
      demo.press = true;
      demo.dir = kind === 'low' ? 'up' : 'down';
      demo.gx = W * 0.5; demo.gy = demo.dir === 'up' ? H * 0.66 : H * 0.4;
      succeedDodge();
    } else if (phase === 'idle') {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dodged === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 20, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 34, C.ink);
      else txt('INSERT COIN', W / 2, H * 0.92, 24, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 42, C.ink);
      txt(dodged + ' / ' + NEEDED, W / 2, H * 0.14, 26, C.ink);
      if (!ok) txt('あと' + Math.max(1, NEEDED - dodged) + '回!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 22, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dodged, { dodged: dodged, needed: NEEDED });
        else game.end.failure({ dodged: dodged, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepTrial(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();
    txt(dodged + ' / ' + NEEDED, W / 2, H * 0.06, 26, C.ink);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 16, C.panel, 1);
    game.draw.rect(60, 150, barW * Math.max(0, 1 - game.time.elapsed / MAX_TIME), 16, C.frame);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.48, 52, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.15], ['D4', 0.15], ['E4', 0.15], ['G4', 0.3]], { tempo: 158, wave: 'square', volume: 0.045, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
