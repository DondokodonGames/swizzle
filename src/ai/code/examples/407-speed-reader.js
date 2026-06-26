// 407-speed-reader.js
// 速読 — 一瞬だけ表示される単語を素早く選択
// 操作: フラッシュ表示された単語を3択から選ぶ
// 成功: 10問正解  失敗: 3回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030610',
    panel:  '#0f172a',
    panelHi:'#1e293b',
    flash:  '#f0f9ff',
    flashGlow:'#7dd3fc',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    hint:   '#38bdf8'
  };

  var WORDS = [
    'りんご','バナナ','さくら','うみ','かぜ',
    'ねこ','いぬ','ほし','つき','そら',
    'はな','やま','かわ','みず','ひ',
    'くも','ゆき','あめ','かさ','てら',
    'ほん','かい','いえ','みち','まち'
  ];

  var FLASH_TIME = 0.4;  // seconds to show word

  var phase = 'flash';   // flash, choose, result
  var targetWord = '';
  var choices = [];
  var flashTimer = 0;
  var resultTimer = 0;
  var flashAlpha = 0;

  var correct = 0;
  var NEEDED = 10;
  var wrong = 0;
  var MAX_WRONG = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var resultText = '';

  var CHOICE_H = 180;
  var CHOICE_Y = H * 0.68;

  function pickUnique(exclude, arr) {
    var filtered = arr.filter(function(w) { return exclude.indexOf(w) === -1; });
    return filtered[Math.floor(Math.random()*filtered.length)];
  }

  function generateRound() {
    var speedBonus = Math.min(0.35, correct * 0.025);
    FLASH_TIME = Math.max(0.18, 0.4 - speedBonus);

    targetWord = WORDS[Math.floor(Math.random()*WORDS.length)];
    var correctPos = Math.floor(Math.random()*3);
    choices = [];
    var used = [targetWord];
    for (var ci = 0; ci < 3; ci++) {
      if (ci === correctPos) {
        choices.push(targetWord);
      } else {
        var w = pickUnique(used, WORDS);
        choices.push(w);
        used.push(w);
      }
    }
    flashTimer = FLASH_TIME;
    flashAlpha = 1.0;
    phase = 'flash';
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'choose') return;
    if (ty < CHOICE_Y || ty > CHOICE_Y + CHOICE_H*3) return;
    var idx = Math.floor((ty - CHOICE_Y) / CHOICE_H);
    if (idx < 0 || idx > 2) return;
    var chosen = choices[idx];
    if (chosen === targetWord) {
      correct++;
      flashCol = C.correct;
      flashAnim = 0.7;
      resultText = '正解！';
      game.audio.play('se_success', 0.5);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random()*Math.PI*2;
        particles.push({ x:W/2, y:H*0.5, vx:Math.cos(ang)*220, vy:Math.sin(ang)*220, life:0.6, col:C.correct });
      }
      if (correct >= NEEDED && !done) { done = true; setTimeout(function(){ game.end.success(correct*500+Math.ceil(timeLeft)*80); }, 700); return; }
    } else {
      wrong++;
      flashCol = C.wrong;
      flashAnim = 0.7;
      resultText = targetWord + ' だった！';
      game.audio.play('se_failure', 0.4);
      if (wrong >= MAX_WRONG && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 500); return; }
    }
    phase = 'result';
    resultTimer = 1.0;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;

    if (phase === 'flash') {
      flashTimer -= dt;
      flashAlpha = Math.max(0, flashTimer / FLASH_TIME);
      if (flashTimer <= 0) { phase = 'choose'; flashAlpha = 0; }
    }

    if (phase === 'result') {
      resultTimer -= dt;
      if (resultTimer <= 0) generateRound();
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    if (phase === 'flash') {
      // Flash word in center
      game.draw.circle(W/2, H*0.38, 260, C.flashGlow, flashAlpha*0.12);
      game.draw.circle(W/2, H*0.38, 180, C.flashGlow, flashAlpha*0.08);
      game.draw.text(targetWord, W/2, H*0.38+24, { size: 120, color: C.flash, bold: true });
      game.draw.text('読め！', W/2, H*0.58, { size: 52, color: C.flashGlow, bold: true });
    } else if (phase === 'choose') {
      game.draw.text('どれだった？', W/2, H*0.38, { size: 56, color: C.text, bold: true });
      game.draw.text('速度: ' + Math.round(FLASH_TIME*1000)+'ms', W/2, H*0.5, { size: 36, color: C.ui });

      // Choice buttons
      for (var ci2 = 0; ci2 < 3; ci2++) {
        var cy = CHOICE_Y + ci2*CHOICE_H + CHOICE_H/2;
        game.draw.rect(60, CHOICE_Y+ci2*CHOICE_H+8, W-120, CHOICE_H-16, C.panelHi, 0.9);
        game.draw.text(choices[ci2], W/2, cy+24, { size: 72, color: C.text, bold: true });
      }
    } else if (phase === 'result') {
      game.draw.text(resultText, W/2, H*0.42, { size: 64, color: flashCol, bold: true });
      game.draw.text(targetWord, W/2, H*0.55, { size: 80, color: C.flash, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim*0.12);

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9*p.life, p.col, p.life*0.8);
    }

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W/2-(MAX_WRONG-1)*44+wi*88, H*0.935, 18, wi < wrong ? C.wrong : C.panel, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.hint : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    generateRound();
  });
})(game);
