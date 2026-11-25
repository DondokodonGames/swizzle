// K-GBA-0026-arena-guard-stance.js
// 構え見切り — 増えていく攻撃の型を見切り、下段はしゃがみ、上段は跳んで正しく受け流す
// 操作: 相手の予告(足元が光れば下段、頭上が光れば上段)を見て、下段はホールド、上段はスワイプ上でかわす
// 終わり: 規定数(8回)を正しく見切れば成功。3回誤ればGAME OVER
// @mechanic: judge
// @theme: arena_guard_stance
// 世界観: 円形闘技場の中央に立つ守り手。相手の繰り出す型が増えるたび、下段の払いはしゃがみ、上段の払いは跳躍で見切り抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 見切れた回数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 地面に横帯の遠近グラデ、水平線を強調
  var C = {
    sky1: '#241030', sky2: '#3a1848', horizon: '#5a2860',
    floorA: '#20101c', floorB: '#2c1626',
    fighter: '#f0d060', low: '#ff5a5a', high: '#5ac8ff',
    good: '#4de0a0', bad: '#ff5468', gold: '#ffd54d', white: '#f4f2ff', ink: '#0a0610',
  };

  var GAME_TITLE = 'GUARD STANCE';
  var TOTAL = 8;
  var MAX_MISS = 3;
  var CX = W * 0.5, CY = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cleared, missed, done, endWait, finished, ready, hitStop, shake;
  var atk, round, crouch, jump, jumpT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FIGHTER_STAND = ['.##.', '####', '.##.', '#.#.'];
  var FIGHTER_CROUCH = ['####', '#.#.'];
  var FIGHTER_JUMP = ['.##.', '####', '#..#'];

  function bg() {
    game.draw.gradient(0, CY, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, CY - 4, W, 8, C.horizon);
    var bands = 10;
    for (var i = 0; i < bands; i++) {
      var yy = CY + Math.pow(i / bands, 1.6) * (H - CY);
      var hh = (H - CY) / bands + 4;
      game.draw.rect(0, yy, W, hh, i % 2 === 0 ? C.floorA : C.floorB);
    }
  }

  function attackTypes(n) {
    // 型が増えるほど選択肢が増える(下段のみ→下段/上段→フェイント込み)。ここではlow/highの2択を維持しつつ間隔短縮で難度を上げる
    return Math.random() < 0.5 ? 'low' : 'high';
  }

  function newAttack() {
    return { kind: attackTypes(round), t: 0, dur: Math.max(0.85, 1.15 - round * 0.035), resolved: false };
  }

  function initGame() {
    cleared = 0; missed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; crouch = 0; jump = 0; jumpT = 0;
    atk = newAttack();
  }

  function resolve(action) {
    if (!atk || atk.resolved || ready > 0 || done || finished) return;
    atk.resolved = true;
    var correct = (action === atk.kind);
    hitStop = correct ? 0.12 : 0.35;
    if (correct) {
      cleared++;
      game.feedback.good(CX, CY, { text: 'GUARD', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (cleared === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 220, { color: C.gold, size: 40 });
    } else {
      missed++;
      game.feedback.bad(CX, CY, { text: 'HIT' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    if (!correct && missed >= MAX_MISS) { ok = false; finished = true; finish(); return; }
    if (cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    atk = newAttack();
  }

  function doCrouch() {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.15);
    crouch = 0.22;
    resolve('low');
  }
  function doJump() {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.15);
    jump = 0.3; jumpT = 0;
    resolve('high');
  }

  game.onHold(function() { doCrouch(); });
  game.onSwipe(function(dir) { if (dir === 'up') doJump(); else if (state === S.PLAYING) game.audio.play('se_tap', 0.1); });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawAttack(k) {
    if (!k) return;
    var p = Math.min(1, k.t / k.dur);
    if (p > 0.35) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) {
        if (k.kind === 'low') game.draw.rect(CX - 160, CY + 120, 320, 16, C.low, 0.8);
        else game.draw.rect(CX - 160, CY - 200, 320, 16, C.high, 0.8);
      }
    }
    var reach = 260 * p;
    game.draw.line(CX + reach, k.kind === 'low' ? CY + 100 : CY - 100, CX + 40, k.kind === 'low' ? CY + 110 : CY - 90, k.kind === 'low' ? C.low : C.high, 12);
  }

  function drawFighter() {
    var jy = jump > 0 ? -Math.sin(Math.min(1, jumpT / 0.3) * Math.PI) * 140 : 0;
    var spr = crouch > 0 ? FIGHTER_CROUCH : (jump > 0 ? FIGHTER_JUMP : FIGHTER_STAND);
    game.draw.sprite(spr, { '#': C.fighter }, CX - 300, CY - 20 + jy, 24, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX - 300, gy: H * 0.72, press: false, k: null, act: 'low' };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.k) { demo.k = newAttack(); demo.k.dur = 0.95; demo.k.kind = demo.act; demo.act = demo.act === 'low' ? 'high' : 'low'; round = 0; }
    demo.k.t += dt;
    atk = demo.k;
    if (crouch > 0) crouch -= dt;
    if (jump > 0) { jumpT += dt; jump -= dt; if (jump <= 0) jumpT = 0; }
    var p = demo.k.t / demo.k.dur;
    if (p > 0.55 && p < 0.7 && !demo.k.telegraphed) {
      demo.k.telegraphed = true;
      if (demo.k.kind === 'low') { crouch = 0.3; demo.gy = H * 0.8; demo.press = true; }
      else { jump = 0.3; jumpT = 0; demo.gy = H * 0.6; demo.press = true; }
      game.feedback.good(CX, CY, { text: 'GUARD', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (p >= 1) { demo.k = null; demo.press = false; demo.gy = H * 0.72; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawFighter();
      drawAttack(atk);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
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
      drawFighter();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL, missed: missed }); else game.end.failure({ cleared: cleared, total: TOTAL, missed: missed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      atk.t += dt;
      if (atk.t / atk.dur >= 1 && !atk.resolved) {
        atk.resolved = true;
        missed++;
        hitStop = 0.35;
        game.feedback.bad(CX, CY, { text: 'HIT' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        if (missed >= MAX_MISS) { ok = false; finished = true; finish(); }
        else { round++; atk = newAttack(); }
      }
    }
    if (crouch > 0) crouch -= dt;
    if (jump > 0) { jumpT += dt; jump -= dt; if (jump <= 0) jumpT = 0; }
    if (shake > 0) shake -= dt;

    bg();
    drawFighter();
    if (!finished) drawAttack(atk);

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cleared / TOTAL), 16, C.gold);
    for (var i = 0; i < MAX_MISS; i++) {
      game.draw.circle(W - 100 - i * 46, 200, 12, i < missed ? C.bad : C.ink, i < missed ? 1 : 0.4);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.3], ['C3', 0.3], ['G3', 0.3], ['E3', 0.6]], { tempo: 145, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
