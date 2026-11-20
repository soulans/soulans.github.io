/* ==========================================================================
 * 玖音接单排单表 · 展示端逻辑
 * 纯渲染：所有数据已由 exe 端生成并展平到 window.JIUYIN_DATA，
 * 本文件不做任何计算/请求，只负责把数据画出来并做日期切换。
 * 支持 file:// 直接双击打开（数据通过 <script> 注入，无 fetch/CORS）。
 * ========================================================================== */
(function () {
  'use strict';

  var DATA = window.JIUYIN_DATA || { title: '玖音接单排单表', exhibitions: [], generatedAt: '' };
  var EXS = Array.isArray(DATA.exhibitions) ? DATA.exhibitions : [];
  var APP = document.getElementById('app');
  var lastDetailDate = null;      // 从单日进入平铺前正在看的那天，返回时回到它

  /* ---------- 工具 ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** 生成 CSS url()：必须用单引号，若用双引号会截断外层的 style="..." 属性 */
  function cssUrl(s) {
    return "url('" + String(s).replace(/['\\]/g, '\\$&').replace(/[\r\n]/g, '') + "')";
  }

  function tagClass(i) { return ['', 't2', 't3', 't4'][i % 4]; }

  function tagsHTML(tags, limit) {
    var list = (tags || []).slice(0, limit || 99);
    if (!list.length) return '<span class="tag">待公布</span>';
    return list.map(function (t, i) {
      return '<span class="tag ' + tagClass(i) + '">' + esc(t) + '</span>';
    }).join('');
  }

  function coverHTML(cover, cls) {
    if (cover) {
      return '<img class="' + (cls || 'cover') + '" src="' + esc(cover) +
        '" alt="漫展头图" loading="lazy">';
    }
    return '<div class="cover-fallback">玖音 · 档期一览</div>';
  }

  function fmtGenerated(s) {
    if (!s) return '';
    var d = new Date(s);
    if (isNaN(d.getTime())) return '';
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /** 品牌信息：标题 / 副标题 / 方形图标 / 顶部 logo 全部来自编辑端设置 */
  function brand() { return DATA.brand || {}; }

  function markHTML() {
    var m = brand().mark || '';
    return '<span class="brand-mark' + (m ? ' has-img' : '') + '" aria-hidden="true">' +
      (m ? '<img src="' + esc(m) + '" alt="">' : '✦') + '</span>';
  }

  function shell(inner, wide) {
    var b = brand();
    var sub = b.subtitle == null ? '漫展档期一览 · 点击查看每日可预约时间' : b.subtitle;
    return '<header class="topbar"><div class="topbar-inner">' +
      '<div class="brand">' + markHTML() +
      '<div><h1 class="title">' + esc(b.title || DATA.title || '玖音接单排单表') + '</h1>' +
      (sub ? '<p class="subtitle">' + esc(sub) + '</p>' : '') + '</div></div>' +
      '</div></header><main class="wrap' + (wide ? ' wrap-wide' : '') + '">' + inner +
      '<p class="foot">最近更新 ' +
      esc(fmtGenerated(DATA.generatedAt) || '—') + '</p></main>';
  }

  /* ---------- 首页 ---------- */

  function daysCount(ex) { return (ex.dates || []).length; }
  function freeCount(ex) {
    return (ex.dates || []).reduce(function (n, d) {
      return n + ((d.stats && d.stats.free) || 0);
    }, 0);
  }

  function cardHTML(ex) {
    var n = daysCount(ex), f = freeCount(ex);
    return '<article class="card" data-act="open" data-id="' + esc(ex.id) +
      '" role="link" tabindex="0" aria-label="查看 ' + esc(ex.name) + ' 排期">' +
      '<div class="cover-wrap">' + coverHTML(ex.cover) +
      '<div class="cover-shade"></div>' +
      '<div class="cover-badge">✦ ' + esc(ex.timeText || '档期待定') + '</div></div>' +
      '<div class="card-body">' +
      '<h3 class="card-title">' + esc(ex.name) + '</h3>' +
      '<div class="meta-row"><span class="ico">◷</span><span>' +
      esc(ex.timeText || '时间待定') + '</span></div>' +
      '<div class="meta-row"><span class="ico">⌖</span><span>' +
      esc(ex.location || '地点待定') + '</span></div>' +
      '<div class="tags">' + tagsHTML(ex.statusTags) + '</div>' +
      '<div class="card-foot"><span>' + n + ' 个可约日 · ' + f + ' 个空闲档</span>' +
      '<span class="go">查看排期 <span class="arrow">→</span></span></div>' +
      '</div></article>';
  }

  function renderHome() {
    var inner = '<div class="sec-head"><h2><span class="bar"></span>漫展档期</h2></div>';
    if (!EXS.length) {
      inner += '<div class="empty"><span class="big">◌</span>暂无漫展档期，请等待桌面端生成内容。</div>';
    } else {
      inner += '<div class="grid">' + EXS.map(cardHTML).join('') + '</div>';
    }
    APP.innerHTML = shell(inner);
    window.scrollTo(0, 0);
  }

  /* ---------- 详情 ---------- */

  function infoHTML(k, v) {
    if (v == null || String(v).trim() === '') return '';
    return '<span class="info"><span class="k">' + esc(k) + '</span>' +
      '<span class="v">' + esc(v) + '</span></span>';
  }

  function slotHTML(s) {
    var hasBg = !!s.bg;
    var infos = infoHTML('CN', s.cn) + infoHTML('IP', s.ip) + infoHTML('角色', s.role);
    var state = s.free
      ? '<span class="state free"><i></i>空闲 · 可预约</span>'
      : '<span class="state busy"><i></i>已排单</span>';
    // 取景：--fx/--fy 是图片中心落在卡片里的位置（百分比），--fz 是相对卡片高度的放大倍数
    var fx = s.fx == null ? 62 : +s.fx;
    var fy = s.fy == null ? 50 : +s.fy;
    var fz = s.fz == null ? 2 : +s.fz;
    var src = hasBg ? esc(s.bg) : '';
    var bgLayer = hasBg
      ? '<div class="slot-bg" style="--fx:' + fx + '%;--fy:' + fy + '%;--fz:' + fz + '">' +
        '<img class="slot-blur" src="' + src + '" alt="" aria-hidden="true">' +
        '<img class="slot-photo" src="' + src + '" alt="" aria-hidden="true">' +
        '<i class="slot-scrim"></i></div>'
      : '';
    return '<div class="slot' + (hasBg ? ' has-bg' : '') + (s.free ? '' : ' is-busy') + '">' +
      bgLayer +
      '<div class="slot-inner">' +
      '<div class="slot-time">' +
      '<div class="t1">' + esc(s.time) + '</div>' +
      '<div class="t2">至 ' + esc(s.end) + '</div></div>' +
      '<div class="slot-main">' + state + (infos ? '<div class="infos">' + infos + '</div>' : '') +
      '</div><div class="slot-rail' + (s.free ? '' : ' busy') + '"></div>' +
      '</div></div>';
  }

  /* ---------- 顶部导航（返回入口 / 品牌 logo） ---------- */

  /** 品牌 logo：点它等同「返回漫展列表」。没设 logo 时整块不渲染（不显示，也不塞文字占位） */
  function brandHTML(cls) {
    var logo = brand().logo || '';
    if (!logo) return '';
    var name = brand().title || '玖音';
    return '<a class="brand-link' + (cls ? ' ' + cls : '') + '" data-act="home"' +
      ' role="button" tabindex="0" aria-label="' + esc(name) + ' · 返回漫展列表" title="返回漫展列表">' +
      '<img class="brand-logo" src="' + esc(logo) + '" alt="' + esc(name) + '"></a>';
  }

  /**
   * 顶部导航条：先「返回漫展列表」，平铺页再跟一个「单日查看」。
   * logo 由各页面自己安排位置（详情页在导航左侧，平铺页在标题条右侧）。
   */
  function navHTML(showSingle, showBrand, days) {
    return '<nav class="topnav' + (days ? ' board-nav' : '') + '"' +
      (days ? ' style="--days:' + Math.max(1, days) + '"' : '') + '>' +
      (showBrand ? brandHTML() : '') +
      '<a class="back" data-act="home" role="button" tabindex="0">← 返回漫展列表</a>' +
      (showSingle ? '<button class="back-single" data-act="single">← 单日查看</button>' : '') +
      '</nav>';
  }

  /* ---------- 标题条（单日 / 平铺共用）：封面 + 名称 + 档期 + 品牌 logo ---------- */

  /** 点封面（或鼠标悬浮）看宣传图：hover 弹预览，点击开全屏灯箱 */
  function barInner(ex, days) {
    var tags = (ex.statusTags || []).slice(0, 1);
    return '<button class="bh-cover-wrap" type="button" data-act="cover"' +
      ' aria-label="查看 ' + esc(ex.name) + ' 的宣传图" title="看宣传图">' +
      coverHTML(ex.cover, 'bh-cover') +
      '<span class="cover-pop">' + coverHTML(ex.cover, 'cover-pop-img') + '</span>' +
      '</button>' +
      '<div class="board-heading"><h2>' + esc(ex.name) +
      (tags.length ? '<span class="bh-tags">' + tagsHTML(tags, 1) + '</span>' : '') + '</h2>' +
      '<span class="bh-meta">' + esc(ex.timeText || '时间待定') + ' · ' +
      esc(ex.location || '地点待定') + ' · 共 ' + days + ' 天</span></div>' +
      brandHTML('bar-brand');
  }

  /* ---------- 宣传图灯箱 ---------- */

  function coverBox() {
    var el = document.getElementById('jyLightbox');
    if (!el) {
      el = document.createElement('div');
      el.id = 'jyLightbox';
      el.className = 'lightbox';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.innerHTML = '<button class="lb-x" type="button" aria-label="关闭">×</button>' +
        '<img alt="">';
      el.addEventListener('click', closeCover);
      document.body.appendChild(el);
    }
    return el;
  }

  function openCover(src, name) {
    if (!src) return;
    var el = coverBox();
    var im = el.querySelector('img');
    im.src = src;
    im.alt = (name || '漫展') + ' 宣传图';
    el.classList.add('on');
    document.body.classList.add('lb-open');
  }

  function closeCover() {
    var el = document.getElementById('jyLightbox');
    if (!el) return;
    el.classList.remove('on');
    document.body.classList.remove('lb-open');
  }

  function renderDetail(ex, dateIndex) {
    var dates = ex.dates || [];
    var idx = Math.max(0, Math.min(dates.length - 1, dateIndex | 0));
    // 单日页也用平铺页那条紧凑标题条（不再铺一整屏大图），封面可看宣传图
    // 标题条 + 日期条一起塞进 .board-sticky：下滚时整块钉在窗口顶部，和平铺页同一套逻辑
    var head = navHTML(false, false) +
      '<div class="board-sticky detail-sticky" id="boardSticky" style="--days:' +
      Math.max(1, dates.length) + '">' +
      '<section class="board-bar detail-bar">' + barInner(ex, dates.length) + '</section>';

    if (!dates.length) {
      APP.innerHTML = shell(head + '</div><div class="empty" style="margin-top:20px">' +
        '<span class="big">◌</span>该漫展暂未配置可预约日期</div>');
      return;
    }
    lastDetailDate = dates[idx].date;

    var d = dates[idx];
    var st = d.stats || { total: (d.slots || []).length, free: 0, booked: 0 };
    var pct = st.total ? Math.round(st.free / st.total * 100) : 0;

    // 只把「日期切换」留在置顶区，统计条随正文滚走：置顶厚度与平铺页一致
    var daytop = '<div class="daybar-top">' +
      '<button class="day-nav" data-act="prev" data-i="' + idx + '"' +
      (idx <= 0 ? ' disabled' : '') + ' aria-label="上一天">‹</button>' +
      '<div class="day-dots">' + dates.map(function (x, i) {
        return '<button class="day-dot' + (i === idx ? ' on' : '') + '" data-act="day" data-i="' + i +
          '" title="' + esc(x.date) + '" aria-label="' + esc(x.date) + '">' +
          esc(x.label) + '<small>' + esc(x.weekday) + '</small></button>';
      }).join('') + '</div>' +
      '<button class="board-btn" data-act="board" title="全部平铺：把 ' + dates.length +
      ' 天并排铺开，可左右滑动查看" aria-label="全部平铺查看">⊞</button>' +
      '<button class="day-nav" data-act="next" data-i="' + idx + '"' +
      (idx >= dates.length - 1 ? ' disabled' : '') + ' aria-label="下一天">›</button>' +
      '</div>' +
      '</div>';   // 闭合 .board-sticky：统计条与时段列表都在它外面，正常滚动

    var summary = '<div class="summary detail-summary"><span class="num">空闲 <b>' + st.free + '</b> / 共 ' + st.total + ' 档' +
      '　已排 <b class="busy">' + st.booked + '</b></span>' +
      '<div class="prog"><i style="width:' + pct + '%"></i></div>' +
      '<div class="legend"><span><i style="background:#0f9d76"></i>空闲可约</span>' +
      '<span><i style="background:#d63384"></i>已排单</span></div></div>';

    var slots = (d.slots || []).length
      ? '<div class="slots">' + d.slots.map(function (s) { return slotHTML(s); }).join('') + '</div>'
      : '<div class="empty" style="margin-top:18px"><span class="big">◌</span>该日期暂无时间段</div>';

    APP.innerHTML = shell(head + daytop + summary + slots);
    // 让当前选中的日期在横滑条中保持可见（多日期时尤为重要）
    var onDot = APP.querySelector ? APP.querySelector('.day-dot.on') : null;
    if (onDot && onDot.scrollIntoView) {
      try { onDot.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { /* noop */ }
    }
    // 与平铺页同一套悬浮逻辑：只钉住，日期条随标题条常显
    STICKY.wrap = APP.querySelector ? APP.querySelector('.board-sticky') : null;
    STICKY.head = null; STICKY.board = null;
    if (STICKY.wrap) { bindSticky(); stickyTick(); }
  }

  /* ---------- 全档期平铺（所有日期并排，可左右滑动） ---------- */

  var BOARD = { dragging: false, moved: false, x0: 0, y0: 0, left0: 0, top0: 0, pid: null };

  /* 看板悬浮：标题条 sticky 置顶，下面的日期列头条跟着看板横向同步。
     看板本身是横向滚动容器，列头在里面 sticky 不住纵轴，所以另做一条克隆条。 */
  var STICKY = { wrap: null, head: null, board: null, bound: false };

  /** 悬浮日期条跟随看板横向位置：整行位移（不做滚动容器，永远不会有滚动条） */
  function syncHead() {
    var b = STICKY.board, hb = STICKY.head;
    if (!b || !hb || !hb.style || !hb.style.setProperty) return;
    hb.style.setProperty('--sx', (-b.scrollLeft) + 'px');
  }

  function stickyTick() {
    var wrap = STICKY.wrap;
    if (!wrap || !wrap.isConnected) return;
    var wr = wrap.getBoundingClientRect();
    wrap.classList.toggle('stuck', wr.top <= 0.5);
    // 单日页没有看板：标题条 + 日期条整块钉顶，不需要克隆列头条
    var b = STICKY.board, hb = STICKY.head;
    if (!b || !hb) return;
    var br = b.getBoundingClientRect();
    // 真正的列头被标题条盖住时，才浮出日期条；滚回顶部会自动收起
    wrap.classList.toggle('show-heads', br.top < wr.bottom - 6);
    syncHead();
  }

  function bindSticky() {
    if (STICKY.bound) return;
    STICKY.bound = true;
    window.addEventListener('scroll', stickyTick, { passive: true });
    window.addEventListener('resize', stickyTick);
  }

  /** 列头（日期 + 空闲数 + 进度）：看板里和悬浮日期条共用同一份结构，两边永远一致 */
  function colHeadHTML(d, i, clone) {
    var st = d.stats || { total: (d.slots || []).length, free: 0, booked: 0 };
    var pct = st.total ? Math.round(st.free / st.total * 100) : 0;
    return '<button class="board-col-head' + (clone ? ' hb-head' : '') + '" data-act="day" data-i="' + i +
      '" title="点这里单独查看 ' + esc(d.date) + '"' + (clone ? ' tabindex="-1"' : '') + '>' +
      '<span class="bch-top"><span class="bch-date"><b>' + esc(d.label) +
      '</b><small>' + esc(d.weekday) + '</small></span>' +
      '<span class="bch-stat">空闲 <b>' + st.free + '</b> / ' + st.total + '</span></span>' +
      '<span class="prog"><i style="width:' + pct + '%"></i></span></button>';
  }

  /** 点 ‹ › 或按 ← →：横向滚过一列 */
  function boardStep(dir) {
    var b = APP.querySelector ? APP.querySelector('.board') : null;
    if (!b) return;
    var col = b.querySelector ? b.querySelector('.board-col') : null;
    var w = (col && col.getBoundingClientRect ? col.getBoundingClientRect().width : 260) + 14;
    if (typeof b.scrollBy === 'function') {
      try { b.scrollBy({ left: dir * w, behavior: 'smooth' }); }
      catch (err) { b.scrollLeft += dir * w; }
    } else if ('scrollLeft' in b) {
      b.scrollLeft += dir * w;
    }
  }

  /** 手动滑动：鼠标按住拖动（左右滑看更多天，上下拖滚动整页）/ Shift+滚轮；触摸交给浏览器原生惯性滚动 */
  function initBoard() {
    var b = APP.querySelector ? APP.querySelector('.board') : null;
    if (!b || !b.addEventListener) return;

    function pageTop() {
      return (typeof window.pageYOffset === 'number' ? window.pageYOffset : 0) ||
        (document.documentElement && document.documentElement.scrollTop) || 0;
    }

    b.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      if (e.target.closest && e.target.closest('button,a,[data-act]')) return;
      BOARD.dragging = true; BOARD.moved = false;
      BOARD.x0 = e.clientX; BOARD.y0 = e.clientY;
      BOARD.left0 = b.scrollLeft; BOARD.top0 = pageTop(); BOARD.pid = e.pointerId;
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    });
    b.addEventListener('pointermove', function (e) {
      if (!BOARD.dragging) return;
      var dx = e.clientX - BOARD.x0;
      var dy = e.clientY - BOARD.y0;
      if (!BOARD.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      BOARD.moved = true;
      b.classList.add('dragging');
      b.scrollLeft = BOARD.left0 - dx;
      // 上下拖动 = 拖动画布本身：整页跟着走，看板再长也能一把拉到底
      if (dy && typeof window.scrollTo === 'function') {
        window.scrollTo(0, Math.max(0, BOARD.top0 - dy));
      }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    function endDrag() {
      if (!BOARD.dragging) return;
      BOARD.dragging = false;
      b.classList.remove('dragging');
      try { b.releasePointerCapture(BOARD.pid); } catch (err) { /* noop */ }
      BOARD.pid = null;
    }
    b.addEventListener('pointerup', endDrag);
    b.addEventListener('pointercancel', endDrag);
    b.addEventListener('wheel', function (e) {
      if (!e.shiftKey || !e.deltaY) return;
      b.scrollLeft += e.deltaY;
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    /* 悬浮日期条：横向位置始终和看板一致（整行位移，本身不滚动，也就没有滚动条） */
    var wrap = APP.querySelector('.board-sticky');
    var hb = APP.querySelector('.headbar');
    if (wrap && hb) {
      b.addEventListener('scroll', syncHead, { passive: true });
      STICKY.wrap = wrap; STICKY.head = hb; STICKY.board = b;
      bindSticky();
      stickyTick();
    }

    // 卡片两行排版：tag 顺序不变，先尽量填满第二行，放不下的前缀留在第一行
    initSlotRows();
  }

  /* ---------- 平铺卡两行排版 ---------- */

  /* 规则：tag 的先后顺序永远不动（CN → IP → 角色），只决定从哪一个开始换到第二行。
     做法：先尽量把**末尾**的 tag 摆进第二行（第二行优先吃饱），剩下的前缀留在第一行、跟在状态后面；
     于是从上往下读仍是 CN → IP → 角色。
     DOM 顺序完全不变，只把末尾 k 个包进 .slot-line（flex:0 0 100% 自动落到第二行）。 */
  var SLOTROWS = { bound: false, t: null };

  /** 还原成「一行到底」的结构，并按原始顺序排好（每次重排都从干净状态开始） */
  function slotGroups(main) {
    var infos = main.querySelector ? main.querySelector('.infos') : null;
    if (!infos) return null;
    var line = infos.querySelector('.slot-line');
    if (line) {
      while (line.firstChild) infos.insertBefore(line.firstChild, line);
      infos.removeChild(line);
    }
    var chips = [].slice.call(infos.querySelectorAll('.info'));
    for (var i = 0; i < chips.length; i++) {
      if (chips[i].__oi == null) chips[i].__oi = i;
    }
    chips.sort(function (a, b) { return a.__oi - b.__oi; });
    for (var j = 0; j < chips.length; j++) infos.appendChild(chips[j]);
    return { infos: infos, chips: chips };
  }

  /** 第一步：还原结构 + 关掉收缩与换行（只写不读，攒到最后一起量） */
  function prepareSlotRow(main) {
    var g = slotGroups(main);
    if (!g || g.chips.length < 2) return null;
    var chips = g.chips;
    main.style.flexWrap = 'nowrap';
    for (var i = 0; i < chips.length; i++) chips[i].style.flex = '0 0 auto';
    return { main: main, infos: g.infos, chips: chips, state: main.querySelector('.state') };
  }

  /** 第二步：算分组并落 DOM（所有卡片先量完再统一改，避免一张一张触发重排） */
  function applySlotRow(job) {
    var main = job.main, chips = job.chips, infos = job.infos;
    var widths = job.widths, gap = job.gap;
    main.style.flexWrap = '';
    for (var r = 0; r < chips.length; r++) chips[r].style.flex = '';

    var avail = job.avail, stateW = job.stateW, hasState = !!job.state;
    var n = chips.length;
    function sumPrefix(cnt) { var s = 0; for (var x = 0; x < cnt; x++) s += widths[x]; return s; }
    function sumSuffix(cnt) { var s = 0; for (var x = n - cnt; x < n; x++) s += widths[x]; return s; }
    function lineW(total, cnt) { return total + gap * Math.max(0, cnt - 1); }

    var all = lineW(stateW + sumPrefix(n), n + (hasState ? 1 : 0));
    if (all <= avail + 0.5) return;   // 一行放得下：保持原样

    // 挑「换行点」：k = 末尾几个 tag 放第二行（顺序不变），
    // 两行都放得下为前提，取两行长度最接近的那个（避免一行挤爆、一行空荡）
    var k = 0, bestDiff = Infinity;
    for (var t = n; t >= 1; t--) {
      var row2 = lineW(sumSuffix(t), t);
      var rest = n - t;
      var row1 = lineW(stateW + sumPrefix(rest), rest + (hasState ? 1 : 0));
      if (row2 > avail + 0.5 || row1 > avail + 0.5) continue;
      var diff = Math.abs(row1 - row2);
      if (diff < bestDiff - 0.5) { bestDiff = diff; k = t; }
    }
    if (!k) return;   // 怎么摆都放不下：交给原来的自然换行

    // 顺序不动：只把末尾 k 个 tag 包进第二行，前面的照旧留在状态后面
    var line = document.createElement('div');
    line.className = 'slot-line';
    line.style.gap = job.rowGap + 'px ' + gap + 'px';
    for (var q = n - k; q < n; q++) line.appendChild(chips[q]);
    infos.appendChild(line);
    main.__packed = true;
  }

  function layoutSlotRows() {
    if (!APP.querySelectorAll) return;
    var mains = APP.querySelectorAll('.board .slot-main');
    var jobs = [], i, j;
    for (i = 0; i < mains.length; i++) {
      var job = prepareSlotRow(mains[i]);
      if (job) jobs.push(job);
    }
    // 统一量：中间不写样式，整页只重排一次
    for (j = 0; j < jobs.length; j++) {
      var jb = jobs[j], cs = getComputedStyle(jb.main);
      jb.widths = [];
      for (i = 0; i < jb.chips.length; i++) jb.widths.push(jb.chips[i].getBoundingClientRect().width);
      jb.stateW = jb.state ? jb.state.getBoundingClientRect().width : 0;
      jb.avail = jb.main.clientWidth;
      jb.gap = parseFloat(cs.columnGap) || 0;
      jb.rowGap = parseFloat(cs.rowGap) || 0;
    }
    for (j = 0; j < jobs.length; j++) applySlotRow(jobs[j]);
    // 兜底：两行还是超高（字体 / 缩放异常）就退回自然换行
    for (j = 0; j < jobs.length; j++) {
      var m = jobs[j].main;
      if (m.__packed && m.scrollHeight > m.clientHeight + 1) {
        m.__packed = false;
        slotGroups(m);
      }
    }
  }

  /** 立刻量一遍（避免首帧闪动）；字体就绪与窗口变化时再重排（只绑定一次） */
  function initSlotRows() {
    layoutSlotRows();
    if (SLOTROWS.bound) return;
    SLOTROWS.bound = true;
    window.addEventListener('resize', function () {
      if (SLOTROWS.t) clearTimeout(SLOTROWS.t);
      SLOTROWS.t = setTimeout(layoutSlotRows, 120);
    });
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(function () { layoutSlotRows(); });
    }
  }

  function renderBoard(ex) {
    var dates = ex.dates || [];
    // 导航按钮跟着看板一起收窄居中，左边缘与标题条、首列对齐
    var hero = navHTML(true, false, dates.length || 1);
    // 平铺页把大图换成紧凑标题条：首屏直接就是看板，不用先滚过一整屏头图
    // 标题条塞进 .board-sticky：往下滚时钉在窗口顶部，日期列头浮在它下面
    var bar = '<div class="board-sticky" id="boardSticky" style="--days:' + Math.max(1, dates.length) + '">' +
      '<section class="board-bar">' + barInner(ex, dates.length) + '</section>';

    if (!dates.length) {
      APP.innerHTML = shell(hero + bar + '</div>' +
        '<div class="empty" style="margin-top:18px"><span class="big">◌</span>该漫展暂未配置可预约日期</div>');
      return;
    }

    var cols = dates.map(function (d, i) {
      var body = (d.slots || []).length
        ? d.slots.map(function (s) { return slotHTML(s); }).join('')
        : '<div class="board-empty">该日暂无时间段</div>';
      return '<article class="board-col">' + colHeadHTML(d, i) +
        '<div class="board-col-body">' + body + '</div></article>';
    }).join('');

    // 悬浮日期条：与看板列宽、间距完全一致，横向位移跟随看板 scrollLeft
    bar += '<div class="headbar" id="boardHeadBar" aria-label="各日期"><div class="headbar-row">' +
      dates.map(function (d, i) {
        return '<div class="hb-col">' + colHeadHTML(d, i, true) + '</div>';
      }).join('') + '</div></div></div>';

    APP.innerHTML = shell(hero + bar +
      '<section class="board"><div class="board-grid">' + cols + '</div></section>', true);
    initBoard();
    window.scrollTo(0, 0);
  }

  /* ---------- 路由 ---------- */

  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    if (parts[0] !== 'ex' || !parts[1]) return { view: 'home' };
    var id = decodeURIComponent(parts[1]);
    var ex = EXS.filter(function (e) { return e.id === id; })[0];
    if (!ex) return { view: 'home' };
    if (parts[2] === 'all') return { view: 'board', ex: ex, i: 0 };
    var di = 0;
    if (parts[2]) {
      var found = (ex.dates || []).map(function (d) { return d.date; })
        .indexOf(decodeURIComponent(parts[2]));
      if (found >= 0) di = found;
    }
    return { view: 'detail', ex: ex, i: di };
  }

  function render() {
    var r = parseHash();
    if (r.view === 'detail') renderDetail(r.ex, r.i);
    else if (r.view === 'board') renderBoard(r.ex);
    else renderHome();
    document.title = (r.view === 'home' ? '' : r.ex.name + ' · ') +
      (brand().title || DATA.title || '玖音接单排单表');
  }

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  /* ---------- 事件（委托） ---------- */

  APP.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'home') { go('#/'); return; }
    // 首页点卡片：按工程设置决定落在「单日查看」还是「全部平铺」
    if (act === 'open') {
      var openId = el.getAttribute('data-id');
      go('#/ex/' + encodeURIComponent(openId) + (DATA.defaultView === 'board' ? '/all' : ''));
      return;
    }
    var r = parseHash();
    if (r.view === 'home') return;
    var dates = r.ex.dates || [];

    if (act === 'cover') {
      var wrap = el.closest ? el.closest('.bh-cover-wrap') : el;
      var im = wrap && wrap.querySelector ? wrap.querySelector('.bh-cover') : null;
      openCover(im && (im.currentSrc || im.src), r.ex.name);
      return;
    }
    if (act === 'board') { go('#/ex/' + encodeURIComponent(r.ex.id) + '/all'); return; }
    if (act === 'single') {
      var back = lastDetailDate || (dates[0] && dates[0].date);
      go('#/ex/' + encodeURIComponent(r.ex.id) + (back ? '/' + encodeURIComponent(back) : ''));
      return;
    }

    var i = +el.getAttribute('data-i');
    var target = act === 'prev' ? i - 1 : act === 'next' ? i + 1 : i;
    target = Math.max(0, Math.min(dates.length - 1, target));
    if (dates[target]) {
      go('#/ex/' + encodeURIComponent(r.ex.id) + '/' + encodeURIComponent(dates[target].date));
      var on = APP.querySelector('.day-dot.on');
      if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  });

  APP.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest('[data-act]');
    if (el && (el.tagName === 'ARTICLE' || el.tagName === 'A')) {
      e.preventDefault(); el.click();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      // 灯箱优先：开着的时候 Esc 只关灯箱，不跳页
      if (document.body.classList.contains('lb-open')) { closeCover(); return; }
      var rb = parseHash();
      if (rb.view === 'board') {
        var datesB = rb.ex.dates || [];
        var backD = lastDetailDate || (datesB[0] && datesB[0].date);
        go('#/ex/' + encodeURIComponent(rb.ex.id) + (backD ? '/' + encodeURIComponent(backD) : ''));
      }
      return;
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var r = parseHash();
    var step = e.key === 'ArrowRight' ? 1 : -1;
    if (r.view === 'board') { e.preventDefault(); boardStep(step); return; }
    if (r.view !== 'detail') return;
    var dates = r.ex.dates || [];
    var t = r.i + step;
    if (t < 0 || t >= dates.length) return;
    e.preventDefault();
    go('#/ex/' + encodeURIComponent(r.ex.id) + '/' + encodeURIComponent(dates[t].date));
  });

  window.addEventListener('hashchange', render);
  render();
})();
