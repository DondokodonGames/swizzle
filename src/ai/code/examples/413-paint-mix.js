// 413-paint-mix.js
// 絵の具混合 — 原色を混ぜて目標の色を作る
// 操作: 3原色(赤/黄/青)をタップして配合し、目標色に近づける
// 成功: 8色完成  失敗: 3回大外れ or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0810',
    canvas2:'#1a1020',
    red:    '#ef4444',
    redHi:  '#fca5a5',
    yellow: '#eab308',
    yellowHi:'#fde047',
    blue:   '#3b82f6',
    blueHi: '#93c5fd',
    white:  '#f1f5f9',
    correct:'#22c55e',
    wrong:  '#ef4444',
    close:  '#f97316',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var rAmt = 0, yAmt = 0, bAmt = 0;  // 0-5 each
  var MAX_AMT = 5;

  // Target colors (r,y,b amounts)
  var TARGETS = [
    {r:3,y:0,b:0,name:'赤'},{r:0,y:3,b:0,name:'黄'},{r:0,y:0,b:3,name:'青'},
    {r:2,y:2,b:0,name:'橙'},{r:0,y:2,b:2,name:'緑'},{r:2,y:0,b:2,name:'紫'},
    {r:1,y:1,b:1,name:'茶'},{r:3,y:1,b:0,name:'朱'}
  ];
  var targetIdx = 0;
  var correct = 0;
  var NEEDED = 8;
  var wrong = 0;
  var MAX_WRONG = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var resultText = '';
  var mixAnim = 0;

  function getTarget() { return TARGETS[targetIdx % TARGETS.length]; }

  function amtToRGB(r, y, b) {
    // r=red, y=yellow(r+g), b=blue
    var rComp = Math.min(255, r * 50 + y * 30);
    var gComp = Math.min(255, y * 40);
    var bComp = Math.min(255, b * 55);
    return [rComp, gComp, bComp];
  }

  function rgbToHex(r, g, b) {
    return '#' + [r,g,b].map(function(v) { return Math.round(v).toString(16).padStart(2,'0'); }).join('');
  }

  function colorDistance(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt(Math.pow(r1-r2,2)+Math.pow(g1-g2,2)+Math.pow(b1-b2,2));
  }

  function submit() {
    var tgt = getTarget();
    var mixRGB = amtToRGB(rAmt, yAmt, bAmt);
    var tgtRGB = amtToRGB(tgt.r, tgt.y, tgt.b);
    var dist = colorDistance(mixRGB[0],mixRGB[1],mixRGB[2],tgtRGB[0],tgtRGB[1],tgtRGB[2]);

    if (dist < 40) {
      correct++;
      flashCol = C.correct;
      flashAnim = 0.8;
      resultText = '完璧！';
      game.audio.play('se_success', 0.6);
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random()*Math.PI*2;
        particles.push({ x:W/2, y:H*0.46, vx:Math.cos(ang)*200, vy:Math.sin(ang)*200, life:0.7, col:rgbToHex(mixRGB[0],mixRGB[1],mixRGB[2]) });
      }
      if (correct >= NEEDED && !done) { done = true; setTimeout(function(){ game.end.success(correct*500+Math.ceil(timeLeft)*80); }, 700); return; }
      targetIdx++;
    } else if (dist < 90) {
      flashCol = C.close;
      flashAnim = 0.6;
      resultText = '惜しい！';
      game.audio.play('se_failure', 0.2);
    } else {
      wrong++;
      flashCol = C.wrong;
      flashAnim = 0.7;
      resultText = 'かなり違う！';
      game.audio.play('se_failure', 0.4);
      if (wrong >= MAX_WRONG && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 500); return; }
    }
    rAmt = 0; yAmt = 0; bAmt = 0;
    mixAnim = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    // Three color buttons at bottom
    var btnY = H * 0.78;
    var btnH = 200;
    if (ty >= btnY && ty <= btnY + btnH) {
      if (tx < W/3) { rAmt = Math.min(MAX_AMT, rAmt+1); mixAnim = 0.3; game.audio.play('se_tap', 0.3); }
      else if (tx < W*2/3) { yAmt = Math.min(MAX_AMT, yAmt+1); mixAnim = 0.3; game.audio.play('se_tap', 0.3); }
      else { bAmt = Math.min(MAX_AMT, bAmt+1); mixAnim = 0.3; game.audio.play('se_tap', 0.3); }
      return;
    }
    // Submit button in middle
    if (ty > H*0.67 && ty < H*0.76 && tx > W/3 && tx < W*2/3) {
      if (rAmt + yAmt + bAmt > 0) submit();
    }
    // Reset
    if (ty > H*0.67 && ty < H*0.76 && (tx < W/4 || tx > W*3/4)) {
      rAmt = 0; yAmt = 0; bAmt = 0;
      mixAnim = 0;
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;
    if (mixAnim > 0) mixAnim -= dt * 3;

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.canvas2, 0.6);

    // Target color display
    var tgt = getTarget();
    var tgtRGB = amtToRGB(tgt.r, tgt.y, tgt.b);
    var tgtHex = rgbToHex(tgtRGB[0],tgtRGB[1],tgtRGB[2]);

    game.draw.text('目標:', W/2-200, H*0.2, { size: 44, color: C.text });
    game.draw.circle(W/2+60, H*0.2, 80, tgtHex, 0.9);
    game.draw.circle(W/2+60, H*0.2-28, 32, '#fff', 0.3);
    game.draw.text(tgt.name, W/2+60, H*0.26, { size: 36, color: C.text });

    // R/Y/B amounts display
    game.draw.text('R:'+rAmt+' Y:'+yAmt+' B:'+bAmt, W/2-80, H*0.34, { size: 44, color: C.ui });

    // Current mix preview
    var mixRGB2 = amtToRGB(rAmt, yAmt, bAmt);
    var mixHex2 = (rAmt+yAmt+bAmt) > 0 ? rgbToHex(mixRGB2[0],mixRGB2[1],mixRGB2[2]) : '#2a2040';
    game.draw.circle(W/2, H*0.46, 120, mixHex2, 0.9);
    game.draw.circle(W/2-36, H*0.46-40, 48, '#fff', 0.25);
    if (mixAnim > 0) game.draw.circle(W/2, H*0.46, 120+mixAnim*30, mixHex2, mixAnim*0.4);

    // Submit button
    game.draw.rect(W/3+20, H*0.67, W/3-40, H*0.09, '#1e293b', 0.9);
    game.draw.text('決定', W/2, H*0.72, { size: 52, color: C.correct, bold: true });
    // Reset button
    game.draw.rect(20, H*0.67, W/4-40, H*0.09, '#1e293b', 0.7);
    game.draw.text('リセット', W/8, H*0.72, { size: 36, color: C.ui });

    // Color buttons
    var btnY2 = H*0.78;
    var btnH2 = 200;
    var btnW = W/3;
    // Red
    game.draw.rect(0, btnY2, btnW, btnH2, C.red, 0.85);
    game.draw.text('赤', btnW/2, btnY2+btnH2/2+20, { size: 72, color: C.redHi, bold: true });
    // Yellow
    game.draw.rect(btnW, btnY2, btnW, btnH2, C.yellow, 0.85);
    game.draw.text('黄', btnW+btnW/2, btnY2+btnH2/2+20, { size: 72, color: '#fff', bold: true });
    // Blue
    game.draw.rect(btnW*2, btnY2, btnW, btnH2, C.blue, 0.85);
    game.draw.text('青', btnW*2+btnW/2, btnY2+btnH2/2+20, { size: 72, color: C.blueHi, bold: true });

    // Amount dots per color
    for (var di = 0; di < MAX_AMT; di++) {
      game.draw.circle(btnW/2 - (MAX_AMT-1)*16+di*32, btnY2+btnH2-24, 8, di < rAmt ? C.redHi : '#3a1010', 0.9);
      game.draw.circle(btnW+btnW/2-(MAX_AMT-1)*16+di*32, btnY2+btnH2-24, 8, di < yAmt ? C.yellowHi : '#3a2d00', 0.9);
      game.draw.circle(btnW*2+btnW/2-(MAX_AMT-1)*16+di*32, btnY2+btnH2-24, 8, di < bAmt ? C.blueHi : '#0a1a3a', 0.9);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim*0.1);
    if (flashAnim > 0.4) game.draw.text(resultText, W/2, H*0.58, { size: 56, color: flashCol, bold: true });

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10*p.life, p.col, p.life*0.8);
    }

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W/2-(MAX_WRONG-1)*40+wi*80, H*0.935, 16, wi < wrong ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.yellow : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
