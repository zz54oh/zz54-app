/**
 * home.js — 最终修复版（解决设置子功能空白页）
 */
(function () {
  'use strict';

  try { localStorage.setItem('splashPledgeSigned_v3', '1'); } catch (e) { }

  const APP_PREFIX = 'CHAT_APP_V3_';
  const HUE_KEY = APP_PREFIX + 'home_theme_hue';
  const PAGE_BG_KEY = APP_PREFIX + 'home_page_bg';
  const HERO_BG_KEY = APP_PREFIX + 'home_hero_bg';
  const MOOD_KEY = APP_PREFIX + 'home_mood_data';
  const ICON_KEY = APP_PREFIX + 'home_custom_icons';
  const RECENT_EMOJI_KEY = 'home_recent_emojis';

  const PRESET_COLORS = [
    { name: '紫罗兰', h: 285 }, { name: '玫瑰粉', h: 340 }, { name: '樱花', h: 355 },
    { name: '天空', h: 210 }, { name: '薄荷', h: 155 }, { name: '蜜桃', h: 20 },
    { name: '星空', h: 240 }
  ];

  const FEATURES = [
    { id: 'chat', icon: 'fa-comment-dots', label: '聊天', bg: 'icon-bg-7' },
    { id: 'group', icon: 'fa-user-group', label: '群聊', bg: 'icon-bg-6' },
    { id: 'tarot', icon: 'fa-star-and-crescent', label: '塔罗', bg: 'icon-bg-12' },
    { id: 'envelope', icon: 'fa-envelope', label: '信箱', bg: 'icon-bg-4' },
  ];

  const MOOD_EMOJIS = ['😊', '😄', '🥰', '😌', '😴', '😢', '😭', '😠', '😰', '🤔', '😎', '🥳', '🤗', '😔', '😍', '🥺', '😤', '🌧️', '☀️', '⭐', '🌙', '🍃'];

  let isOnHome = true;
  let activeBackHandler = null;
  let customIcons = {};
  let recentEmojis = [];
  let currentContext = 'home';

  function setContext(ctx) { currentContext = ctx; }
  function getBackTarget() { return currentContext === 'settings' ? backToSettings : backToHome; }

  // ---------- 主题/背景持久化 ----------
  function applyHue(h) {
    document.documentElement.style.setProperty('--theme-h', h);
    try { if (window.localforage) localforage.setItem(HUE_KEY, h); localStorage.setItem(HUE_KEY, h); } catch (e) { }
  }

  function applyHomeFont(url) {
    if (!url || !url.trim()) {
      document.getElementById('home-screen').style.fontFamily = '';
      try { if (window.localforage) localforage.removeItem('home_custom_font'); } catch (e) { }
      return;
    }
    const fontName = 'HomeCustomFont_' + Date.now();
    const font = new FontFace(fontName, `url(${url})`);
    font.load().then(f => {
      document.fonts.add(f);
      document.getElementById('home-screen').style.fontFamily = `"${fontName}", sans-serif`;
      try { if (window.localforage) localforage.setItem('home_custom_font', url); } catch (e) { }
    }).catch(() => {
      if (typeof showNotification === 'function') showNotification('字体加载失败，请检查链接', 'error');
    });
  }

  function applyPageBg(dataUrl) {
    const bgEl = document.getElementById('home-bg-image');
    if (!bgEl) return;
    if (dataUrl) {
      bgEl.style.backgroundImage = `url(${dataUrl})`;
      bgEl.classList.add('loaded');
      document.getElementById('home-screen')?.classList.add('has-page-bg');
      try { if (window.localforage) localforage.setItem(PAGE_BG_KEY, dataUrl); } catch (e) { }
    } else {
      bgEl.style.backgroundImage = '';
      bgEl.classList.remove('loaded');
      document.getElementById('home-screen')?.classList.remove('has-page-bg');
      try { if (window.localforage) localforage.removeItem(PAGE_BG_KEY); } catch (e) { }
    }
  }

  function applyHeroBg(dataUrl) {
    const heroBg = document.querySelector('.home-hero-bg');
    if (!heroBg) return;
    if (dataUrl) {
      heroBg.style.setProperty('--hero-bg-img', `url(${dataUrl})`);
      heroBg.style.backgroundImage = `url(${dataUrl})`;
      heroBg.classList.add('has-img');
      try { if (window.localforage) localforage.setItem(HERO_BG_KEY, dataUrl); } catch (e) { }
    } else {
      heroBg.style.removeProperty('--hero-bg-img');
      heroBg.style.backgroundImage = '';
      heroBg.classList.remove('has-img');
      try { if (window.localforage) localforage.removeItem(HERO_BG_KEY); } catch (e) { }
    }
  }

  function applyHeroOpacity(val) {
    const hero = document.querySelector('.home-hero');
    if (!hero) return;
    const alpha = (val / 100) * 0.28;
    hero.style.background = `hsla(var(--theme-h), var(--theme-s), 99%, ${alpha})`;
    hero.style.backdropFilter = val < 15 ? 'none' : 'blur(40px)';
    hero.style.webkitBackdropFilter = val < 15 ? 'none' : 'blur(40px)';
    const heroBg = document.querySelector('.home-hero-bg');
    if (heroBg) heroBg.style.opacity = val / 100;
    try { if (window.localforage) localforage.setItem('home_hero_opacity', val); } catch (e) { }
  }

  async function loadStoredPrefs() {
    try {
      let h = null;
      if (window.localforage) h = await localforage.getItem(HUE_KEY);
      if (h === null) h = parseInt(localStorage.getItem(HUE_KEY) || '285', 10);
      if (!isNaN(h)) applyHue(h);
    } catch (e) { applyHue(285); }
    try {
      const sat = await localforage.getItem('home_theme_sat');
      if (sat) document.documentElement.style.setProperty('--theme-s', sat + '%');
    } catch (e) { }
    try {
      if (window.localforage) {
        const bg = await localforage.getItem(PAGE_BG_KEY);
        if (bg) applyPageBg(bg);
        const hbg = await localforage.getItem(HERO_BG_KEY);
        if (hbg) applyHeroBg(hbg);
        const icons = await localforage.getItem(ICON_KEY);
        const heroOp = await localforage.getItem('home_hero_opacity');
        const homeFont = await localforage.getItem('home_custom_font');
        if (homeFont) applyHomeFont(homeFont);
        if (heroOp !== null && heroOp !== undefined) applyHeroOpacity(heroOp);
        if (icons && typeof icons === 'object') {
          customIcons = icons;
          applyCustomIcons();
        }
      }
    } catch (e) { }
  }

  function applyCustomIcons() {
    // 1. 更新 8 个主功能图标（chat, tarot, envelope...）
    document.querySelectorAll('.home-feature').forEach(btn => {
      const fid = btn.dataset.feature;
      const iconWrap = btn.querySelector('.home-feature-icon');
      if (!iconWrap) return;
      if (customIcons[fid]) {
        iconWrap.innerHTML = `<img src="${customIcons[fid]}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
      } else {
        const f = FEATURES.find(x => x.id === fid);
        if (f) iconWrap.innerHTML = `<i class="fas ${f.icon}"></i>`;
      }
    });

    // 2. 更新 Dock 栏的“设置”和“主题”图标
    const dockSettings = document.getElementById('dock-settings');
    const dockTheme = document.getElementById('dock-theme');

    function updateDockIcon(btn, key, defaultIconClass) {
      if (!btn) return;
      const iconWrap = btn.querySelector('.home-feature-icon');
      if (!iconWrap) return;
      if (customIcons[key]) {
        iconWrap.innerHTML = `<img src="${customIcons[key]}" alt="" style="width:100%;height:100%;object-fit:cover;">`;
      } else {
        iconWrap.innerHTML = `<i class="fas ${defaultIconClass}"></i>`;
      }
    }

    updateDockIcon(dockSettings, 'dock-settings', 'fa-sliders');
    updateDockIcon(dockTheme, 'dock-theme', 'fa-palette');
  }

  // ---------- 主页 DOM ----------
  function buildHomeDOM() {
    const el = document.createElement('div');
    el.id = 'home-screen';
    const featuresHTML = FEATURES.map(f => `
      <button class="home-feature" data-feature="${f.id}">
        <div class="home-feature-icon ${f.bg}"><i class="fas ${f.icon}"></i></div>
        <span class="home-feature-label">${f.label}</span>
      </button>
    `).join('');
    el.innerHTML = `
      <div id="home-bg"><div id="home-bg-image"></div><div id="home-bg-overlay"></div></div>
      <div id="home-content">
        <div class="home-hero">
          <div class="home-hero-bg"></div><div class="home-hero-overlay"></div>
          <div class="home-hero-content">
            <div class="dual-profile">
              <div class="profile-side me">
                <div class="profile-avatar-ring"><div class="profile-avatar-img" id="home-my-avatar"><i class="fas fa-user"></i></div><div class="profile-online-dot"></div></div>
                <div class="profile-name" id="home-my-name">我</div><div class="profile-status" id="home-my-status">在线</div>
              </div>
              <div class="profile-divider"><i class="fas fa-heart"></i></div>
              <div class="profile-side partner">
                <div class="profile-avatar-ring"><div class="profile-avatar-img" id="home-partner-avatar"><i class="fas fa-user"></i></div><div class="profile-online-dot"></div></div>
                <div class="profile-name" id="home-partner-name">梦角</div><div class="profile-status" id="home-partner-status">在线</div>
              </div>
            </div>
            <div class="home-love-pill"><i class="fas fa-heart" style="color: var(--theme-primary-deep)"></i><span id="home-love-days">记录我们的故事</span></div>
          </div>
        </div>
        <div class="home-grid">${featuresHTML}</div>
        <div class="home-dock">
           <button class="home-dock-btn" id="dock-settings">
             <div class="home-feature-icon icon-bg-2"><i class="fas fa-sliders"></i></div>
             <span class="home-feature-label">设置</span>
           </button>
           <button class="home-dock-btn" id="dock-theme">
             <div class="home-feature-icon icon-bg-3"><i class="fas fa-palette"></i></div>
             <span class="home-feature-label">主题</span>
           </button>
        </div>
      </div>
    `;
    return el;
  }

  // ---------- 浮动返回按钮 ----------
  function ensureFloatingBackBtn() {
    if (document.getElementById('floating-back-home')) return;
    const btn = document.createElement('button');
    btn.id = 'floating-back-home';
    btn.innerHTML = '<i class="fas fa-house"></i>';
    btn.addEventListener('click', () => {
      backToHome();
    });
    document.body.appendChild(btn);
  }
  function showBackBtn(handler) { activeBackHandler = handler; document.getElementById('floating-back-home')?.classList.add('visible'); }
  function hideBackBtn() { activeBackHandler = null; document.getElementById('floating-back-home')?.classList.remove('visible'); }

  // ---------- 主页进出及上下文 ----------
  function enterFeatureMode() { document.body.classList.add('feature-mode'); }
  function exitFeatureMode() { document.body.classList.remove('feature-mode'); }

  function backToHome() {
    closeAllFeatureModals();
    const dgModal = document.getElementById('daily-greeting-modal');
    if (dgModal) dgModal.classList.add('hidden');
    ['settings-list-screen', 'mood-calendar-screen', 'icon-customize-screen'].forEach(id => {
      const s = document.getElementById(id);
      if (s) s.classList.remove('visible');
    });
    const themePanel = document.getElementById('home-theme-panel');
    if (themePanel) themePanel.remove();
    const moodPicker = document.getElementById('mood-emoji-picker');
    if (moodPicker) moodPicker.remove();
    exitFeatureMode();
    const home = document.getElementById('home-screen');
    if (home) {
      home.style.transition = 'none';
      home.classList.remove('hidden');
      requestAnimationFrame(() => {
        exitFeatureMode();
        setTimeout(() => { home.style.transition = ''; }, 50);
      });
    }
  }

  function backToSettings() {
    document.querySelectorAll('.modal').forEach(m => {
      m.style.display = 'none';
      if (m._hideTimeout) clearTimeout(m._hideTimeout);
    });
    buildSettingsScreen();
    const home = document.getElementById('home-screen');
    if (home) home.classList.add('hidden');
    if (!document.body.classList.contains('feature-mode')) enterFeatureMode();
    const sl = document.getElementById('settings-list-screen');
    if (sl) { sl.style.transition = 'none'; sl.classList.add('visible'); sl.offsetHeight; sl.style.transition = ''; }
    setContext('settings');
    showBackBtn(backToHome);
  }

  function closeAllFeatureModals() {
    const ids = ['custom-replies-modal', 'fortune-lenormand-modal', 'envelope-modal', 'mood-modal', 'group-chat-modal', 'settings-modal', 'appearance-modal', 'chat-modal', 'advanced-modal', 'data-modal', 'anniversary-modal', 'music-player-modal'];
    ids.forEach(id => {
      const m = document.getElementById(id);
      if (m) { m.classList.add('hidden'); m.style.display = 'none'; }
    });
  }

  function openModalById(id) {
    const m = document.getElementById(id);
    if (!m) return false;
    if (m._hideTimeout) clearTimeout(m._hideTimeout);
    m.classList.remove('hidden');
    m.style.display = 'flex';
    m.style.zIndex = '10001';
    const content = m.querySelector('.modal-content');
    if (content) {
      content.style.animation = 'none';
      if (modalId !== 'data-modal') content.style.opacity = '1';
      content.style.transform = 'translateY(0) scale(1)';
    }
    return true;
  }

  // ---------- 主页功能跳转 ----------
  function goToFeature(featureName) {
    if (featureName === 'chat') {
      const home = document.getElementById('home-screen');
      if (home) home.classList.add('hidden');
      isOnHome = false;
      setContext('home');
      showBackBtn(backToHome);
      if (window.switchChatMode) window.switchChatMode('single');
      exitFeatureMode();
      return;
    }
    if (featureName === 'mood') { openMoodCalendar(); return; }
    const home = document.getElementById('home-screen');
    if (home) home.classList.add('hidden');
    isOnHome = false;
    setContext('home');
    showBackBtn(backToHome);
    requestAnimationFrame(() => {
      const handlers = {
        tarot: () => {
          const m = document.getElementById('fortune-lenormand-modal');
          if (m) {
            m.style.animation = 'none';
            m.style.display = 'flex';
            m.classList.remove('hidden');
            m.querySelectorAll('*').forEach(el => { el.style.animation = 'none'; el.style.transition = 'none'; });
            const c = m.querySelector('.modal-content');
            if (c) { c.style.animation = 'none'; c.style.opacity = '1'; c.style.transform = 'none'; }
          }
          document.getElementById('close-fortune')?.style.setProperty('display', 'none', 'important');
          document.getElementById('close-lenormand')?.style.setProperty('display', 'none', 'important');
          document.getElementById('close-tarot-divination')?.style.setProperty('display', 'none', 'important');
          document.getElementById('close-divihistory')?.style.setProperty('display', 'none', 'important');
          document.getElementById('fortune-lenormand-function')?.click();
        },
        envelope: () => {
          const m = document.getElementById('envelope-modal');
          if (m) {
            m.classList.remove('hidden');
            m.style.animation = 'none';
            m.style.display = 'flex';  // 先设 flex，不等 showModal
            const c2 = m.querySelector('.modal-content');
            if (c2) { c2.style.transform = 'scale(1)'; c2.style.animation = 'none'; c2.style.transition = 'none'; c2.style.opacity = '1'; }
            m.querySelectorAll('*').forEach(el => { el.style.animation = 'none'; el.style.transition = 'none'; });
            const c = m.querySelector('.modal-content');
            if (c) { c.style.animation = 'none'; c.style.opacity = '1'; c.style.transform = 'none'; }
          }
          const closeBtn = document.getElementById('cancel-envelope');
          if (closeBtn && !closeBtn._homePatched) {
            closeBtn._homePatched = true;
            closeBtn.onclick = (e) => {
              e.stopPropagation();
              document.getElementById('envelope-modal').style.display = 'none';
              backToHome();
            };
          }
          document.getElementById('envelope-function')?.click();
        },
        library: () => {
          const m = document.getElementById('custom-replies-modal');
          if (m) { const c = m.querySelector('.modal-content'); if (c) { c.style.animation = 'none'; c.style.opacity = '1'; c.style.transform = 'none'; } }
          document.getElementById('custom-replies-function')?.click();
        },
        group: () => {
          const m = document.getElementById('group-chat-modal');
          if (m) {
            m.classList.remove('hidden');
            m.style.animation = 'none';
            const c = m.querySelector('.modal-content');
            if (c) { c.style.animation = 'none'; c.style.opacity = '1'; c.style.transform = 'none'; }
          }
          if (window.switchChatMode) window.switchChatMode('group');
          document.getElementById('group-chat-btn')?.click();
        },
        call: () => { if (window.callFeature?.startCall) window.callFeature.startCall(false); else document.querySelector('#collapsed-call-btn')?.click(); },
        music: () => document.getElementById('music-player-toggle')?.click()
      };
      if (handlers[featureName]) handlers[featureName]();
    });
  }

  // ---------- 主页数据同步 ----------
  function refreshHomeData() {
    syncOneSide('home-my-avatar', 'my-avatar');
    syncOneSide('home-partner-avatar', 'partner-avatar');
    syncText('home-my-name', 'my-name', '我');
    syncText('home-partner-name', 'partner-name', '梦角');
    syncStatus('home-my-status', '#my-status-text');
    syncStatus('home-partner-status', '#partner-status span');
    syncDays();
    applyCustomIcons();
  }
  function syncOneSide(targetId, sourceId) {
    const target = document.getElementById(targetId);
    const src = document.getElementById(sourceId);
    if (!target || !src) return;
    target.style.backgroundImage = '';
    const img = src.querySelector('img');
    if (img && img.src) { target.innerHTML = `<img src="${img.src}" alt="">`; return; }
    const bg = src.style.backgroundImage;
    if (bg && bg !== 'none' && bg !== '') { target.style.backgroundImage = bg; target.innerHTML = ''; return; }
    target.innerHTML = '<i class="fas fa-user"></i>';
  }
  function syncText(targetId, sourceId, fallback) {
    const t = document.getElementById(targetId);
    const s = document.getElementById(sourceId);
    if (t) t.textContent = (s?.textContent || fallback).trim();
  }
  function syncStatus(targetId, sourceSelector) {
    const t = document.getElementById(targetId);
    const s = document.querySelector(sourceSelector);
    if (t && s) t.textContent = (s.textContent || '在线').trim();
  }
  function syncDays() {
    const el = document.getElementById('home-love-days');
    if (!el) return;
    try {
      const anns = window._anniversaries;
      if (anns && anns.length > 0) {
        const love = anns.find(a => a.type === 'anniversary');
        if (love && love.date) {
          const diff = Math.floor((Date.now() - new Date(love.date)) / 86400000);
          if (!isNaN(diff) && diff >= 0) {
            el.innerHTML = `在一起第 <strong style="font-size:14px;">${diff + 1}</strong> 天`;
            return;
          }
        }
      }
    } catch (e) { }
    el.textContent = '记录我们的故事';
  }

  // ---------- 主题面板 ----------
  function openThemePanel() {
    if (document.getElementById('home-theme-panel')) return;
    const currentH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--theme-h') || '285');
    const swatchHTML = PRESET_COLORS.map(p => `<div class="theme-swatch ${p.h === currentH ? 'active' : ''}" style="background:hsl(${p.h},${p.s !== undefined ? p.s : 55}%,70%)" data-hue="${p.h}" title="${p.name}"></div>`).join('');
    const currentS = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--theme-s') || '35');
    const panel = document.createElement('div');
    panel.id = 'home-theme-panel';
    panel.innerHTML = `
      <div class="theme-panel-head"><span class="theme-panel-title"><i class="fas fa-palette"></i>主页外观</span><button class="theme-panel-close" id="theme-panel-close">&times;</button></div>
      <div class="theme-section-label">预设颜色</div><div class="theme-color-swatches">${swatchHTML}</div>
      <div class="theme-section-label">自定义色相</div><div class="theme-hue-row"><input type="range" id="theme-hue-slider" min="0" max="360" value="${currentH}"><div class="theme-hue-preview" id="theme-hue-preview" style="background:hsl(${currentH},55%,70%)"></div></div>
      <div class="theme-section-label">饱和度</div><div class="theme-hue-row"><input type="range" id="theme-sat-slider" min="0" max="100" value="${currentS}"><span id="theme-sat-value" style="font-size:12px">${currentS}%</span></div>
      <div class="theme-section-label">主页背景</div><div class="bg-upload-row"><input type="file" id="page-bg-input" accept="image/*" style="display:none"><button class="bg-upload-btn" id="page-bg-upload-btn"><i class="fas fa-cloud-arrow-up"></i> 上传主页背景</button><button class="bg-clear-btn" id="page-bg-clear-btn"><i class="fas fa-xmark"></i></button></div>
      <div class="theme-section-label">顶部卡片背景</div><div class="bg-upload-row"><input type="file" id="hero-bg-input" accept="image/*" style="display:none"><button class="bg-upload-btn" id="hero-bg-upload-btn"><i class="fas fa-cloud-arrow-up"></i> 上传卡片背景</button><button class="bg-clear-btn" id="hero-bg-clear-btn"><i class="fas fa-xmark"></i></button></div>
      <div class="theme-section-label">顶部卡片透明度</div>
      <div class="theme-hue-row">
        <input type="range" id="hero-opacity-slider" min="0" max="100" value="100">
        <span id="hero-opacity-value" style="font-size:12px">100%</span>
      </div>
      <div class="theme-section-label">主页字体</div>
      <div class="theme-hue-row" style="gap:6px;">
        <input type="text" id="home-font-url-input" placeholder="粘贴字体URL" 
          style="flex:1;padding:6px 8px;border:1px solid var(--border-color);border-radius:8px;background:var(--primary-bg);color:var(--text-primary);font-size:12px;outline:none;">
        <button id="home-font-apply-btn" style="padding:6px 10px;border-radius:8px;background:var(--accent-color);color:#fff;border:none;font-size:12px;cursor:pointer;">应用</button>
        <button id="home-font-reset-btn" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border-color);background:transparent;color:var(--text-secondary);font-size:12px;cursor:pointer;">重置</button>
      </div>
      <div class="theme-section-label">主页文字颜色</div><div class="theme-hue-row" style="gap:8px;"><button id="home-text-dark-btn" style="padding:6px 14px;border-radius:8px;background:#222;color:#fff;border:none;font-size:12px;cursor:pointer;">炭黑</button><button id="home-text-light-btn" style="padding:6px 14px;border-radius:8px;background:#fff;color:#222;border:1px solid #ddd;font-size:12px;cursor:pointer;">纯白</button><button id="home-text-reset-btn" style="padding:6px 14px;border-radius:8px;border:1px solid var(--border-color);background:transparent;color:var(--text-secondary);font-size:12px;cursor:pointer;">跟随主题</button></div>
      <div class="theme-section-label">主页设置</div><div class="bg-upload-row"><button class="bg-upload-btn" id="open-icon-customize-btn"><i class="fas fa-icons"></i> 自定义功能图标</button></div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('#theme-panel-close').addEventListener('click', () => panel.remove());
    panel.querySelectorAll('.theme-swatch').forEach(s => s.addEventListener('click', () => {
      const h = parseInt(s.dataset.hue); applyHue(h);
      panel.querySelectorAll('.theme-swatch').forEach(x => x.classList.remove('active')); s.classList.add('active');
      panel.querySelector('#theme-hue-slider').value = h;
      panel.querySelector('#theme-hue-preview').style.background = `hsl(${h},55%,70%)`;
    }));
    const hueSlider = panel.querySelector('#theme-hue-slider');
    hueSlider.addEventListener('input', () => { const h = parseInt(hueSlider.value); applyHue(h); panel.querySelector('#theme-hue-preview').style.background = `hsl(${h},55%,70%)`; panel.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active')); });
    const satSlider = panel.querySelector('#theme-sat-slider');
    const satVal = panel.querySelector('#theme-sat-value');
    satSlider.addEventListener('input', () => { const v = satSlider.value; document.documentElement.style.setProperty('--theme-s', v + '%'); satVal.textContent = v + '%'; localforage?.setItem('home_theme_sat', v); });
    function bindBgUpload(panel, inputSel, uploadSel, clearSel, applyFn) {
      const input = panel.querySelector(inputSel), upload = panel.querySelector(uploadSel), clear = panel.querySelector(clearSel);
      if (!input || !upload || !clear) return;
      upload.addEventListener('click', () => input.click());
      input.addEventListener('change', e => { const file = e.target.files[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { alert('图片不能超过5MB'); return; } const reader = new FileReader(); reader.onload = ev => applyFn(ev.target.result); reader.readAsDataURL(file); });
      clear.addEventListener('click', () => applyFn(null));
    }
    bindBgUpload(panel, '#page-bg-input', '#page-bg-upload-btn', '#page-bg-clear-btn', applyPageBg);
    bindBgUpload(panel, '#hero-bg-input', '#hero-bg-upload-btn', '#hero-bg-clear-btn', applyHeroBg);
    const heroOpSlider = panel.querySelector('#hero-opacity-slider');
    const heroOpVal = panel.querySelector('#hero-opacity-value');
    // 读取当前值
    localforage.getItem('home_hero_opacity').then(v => {
      if (v !== null && v !== undefined) {
        heroOpSlider.value = v;
        heroOpVal.textContent = v + '%';
      }
    }).catch(() => { });
    heroOpSlider.addEventListener('input', () => {
      const v = heroOpSlider.value;
      heroOpVal.textContent = v + '%';
      applyHeroOpacity(v);
    });
    const homeFontInput = panel.querySelector('#home-font-url-input');
    const homeFontApply = panel.querySelector('#home-font-apply-btn');
    const homeFontReset = panel.querySelector('#home-font-reset-btn');
    localforage.getItem('home_custom_font').then(v => { if (v && homeFontInput) homeFontInput.value = v; }).catch(() => { });
    homeFontApply.addEventListener('click', () => applyHomeFont(homeFontInput.value.trim()));
    homeFontReset.addEventListener('click', () => { homeFontInput.value = ''; applyHomeFont(''); });
    const homeTextDark = panel.querySelector('#home-text-dark-btn');
    const homeTextLight = panel.querySelector('#home-text-light-btn');
    const homeTextReset = panel.querySelector('#home-text-reset-btn');
    homeTextDark.addEventListener('click', () => { const hs = document.getElementById('home-screen'); if (hs) { hs.style.setProperty('--home-text', '#1a1a1a'); hs.style.setProperty('--home-text-shadow', 'none'); } localforage?.setItem('home_text_color', 'dark'); });
    homeTextLight.addEventListener('click', () => { const hs = document.getElementById('home-screen'); if (hs) { hs.style.setProperty('--home-text', '#ffffff'); hs.style.setProperty('--home-text-shadow', '0 1px 4px rgba(0,0,0,0.6)'); } localforage?.setItem('home_text_color', 'light'); });
    homeTextReset.addEventListener('click', () => { const hs = document.getElementById('home-screen'); if (hs) { hs.style.removeProperty('--home-text'); hs.style.removeProperty('--home-text-shadow'); } localforage?.setItem('home_text_color', 'auto'); });
    panel.querySelector('#open-icon-customize-btn').addEventListener('click', () => { panel.remove(); openIconCustomize(); });
    setTimeout(() => { const handler = (ev) => { if (!panel.contains(ev.target) && ev.target.id !== 'dock-theme') { panel.remove(); document.removeEventListener('click', handler); } }; document.addEventListener('click', handler); }, 100);
  }

  // ---------- 设置页面 ----------
  const SETTINGS_ITEMS = [
    {
      section: '聊天与外观', items: [
        { icon: 'fa-palette', bg: 'icon-bg-2', title: '外观配色', desc: '聊天界面主题内容、塔罗、信封等主题颜色自定义', action: 'theme' },
        { icon: 'fa-image', bg: 'icon-bg-5', title: '背景和字体', desc: '聊天背景图、字体大小', action: 'font-bg' },
        { icon: 'fa-comment', bg: 'icon-bg-7', title: '气泡和CSS', desc: '气泡样式、自定义CSS', action: 'bubble-css' },
        { icon: 'fa-user-circle', bg: 'icon-bg-3', title: '聊天头像', desc: '头像、头像框设置', action: 'avatar' },
        { icon: 'fa-comments', bg: 'icon-bg-6', title: '聊天设置', desc: '消息回执、时间戳、回复节奏、消息音效、昵称修改', action: 'chat-style' },
        { icon: 'fa-book-open', bg: 'icon-bg-1', title: '字卡回复库', desc: '字卡、表情、状态、拍一拍、公告自定义', action: 'library' },
        { icon: 'fa-icons', bg: 'icon-bg-9', title: '功能图标自定义', desc: '为每个功能上传自定义图标', action: 'icon-customize' }
      ]
    },
    {
      section: '高级功能', items: [
        { icon: 'fa-cloud-sun', bg: 'icon-bg-3', title: '心晴手帐', desc: '记录每日心情，回顾时光', action: 'mood' },
        { icon: 'fa-balance-scale', bg: 'icon-bg-10', title: '抉择', desc: '抛硬币、抽签，帮你做决定', action: 'decision' },
        { icon: 'fa-cake-candles', bg: 'icon-bg-7', title: '重要日', desc: '纪念日、倒数日提醒', action: 'anniversary' }
      ]
    },
    {
      section: '账户与数据', items: [
        { icon: 'fa-database', bg: 'icon-bg-10', title: '数据管理', desc: '导入/导出/清空', action: 'data' },
        { icon: 'fa-chart-bar', bg: 'icon-bg-10', title: '消息统计', desc: '聊天统计、词云、收藏搜索', action: 'stats' }
      ]
    }
  ];

  function buildSettingsScreen() {
    if (document.getElementById('settings-list-screen')) return;
    const el = document.createElement('div');
    el.id = 'settings-list-screen';
    const sectionsHTML = SETTINGS_ITEMS.map(sec => `
      <div class="settings-section-title">${sec.section}</div>
      <div class="settings-group">
        ${sec.items.map(it => `<button class="settings-row" data-action="${it.action}"><div class="settings-row-icon ${it.bg}"><i class="fas ${it.icon}"></i></div><div class="settings-row-info"><div class="settings-row-title">${it.title}</div><div class="settings-row-desc">${it.desc}</div></div><i class="fas fa-chevron-right settings-row-arrow"></i></button>`).join('')}
      </div>
    `).join('');
    el.innerHTML = `<div class="fs-header"><button class="fs-back-btn" id="settings-back-btn"><i class="fas fa-arrow-left"></i></button><span class="fs-title">设置</span></div><div class="fs-body">${sectionsHTML}</div>`;
    document.body.appendChild(el);
    el.querySelector('#settings-back-btn').addEventListener('click', backToHome);
    el.querySelectorAll('.settings-row').forEach(row => row.addEventListener('click', () => triggerSettingsAction(row.dataset.action)));
  }

  function openSettingsScreen() {
    buildSettingsScreen();
    const home = document.getElementById('home-screen');
    if (home) home.classList.add('hidden');
    const sl = document.getElementById('settings-list-screen');
    if (sl) { sl.style.transition = 'none'; sl.classList.add('visible'); sl.offsetHeight; sl.style.transition = ''; }
    enterFeatureMode();
    isOnHome = false;
    setContext('settings');
    showBackBtn(backToHome);
  }

  // ***** 核心修复：使用全局 showAppearancePanel 确保内容显示 *****
  // ========== 设置子功能面板显示（修复空白）==========
  function openAppearanceSubPanel(panel) {
    const modal = document.getElementById('appearance-modal');
    if (!modal) return;

    // 1. 强制移除所有内联 onclick 属性（避免旧事件冲突）
    const oldClose = document.getElementById('close-appearance');
    const oldBack = document.getElementById('back-appearance');
    if (oldClose) oldClose.removeAttribute('onclick');
    if (oldBack) oldBack.removeAttribute('onclick');

    // 2. 停止任何正在进行的动画/过渡，强制显示
    modal.style.cssText = 'display: flex !important; opacity: 1 !important; visibility: visible !important; z-index: 10001 !important; transform: scale(1) !important; animation: none !important; transition: none !important;';
    modal.classList.remove('hidden');

    // 3. 同样强制模态框内容容器
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.style.cssText = 'opacity: 1 !important; transform: scale(1) !important; animation: none !important; transition: none !important;';
    }

    // 4. 隐藏导航和画廊入口
    const navGrid = document.getElementById('appearance-nav-grid');
    const galleryBanner = document.getElementById('gallery-banner-entry');
    if (navGrid) navGrid.style.display = 'none';
    if (galleryBanner) galleryBanner.style.display = 'none';

    // 5. 显示面板容器
    const container = document.getElementById('appearance-panel-container');
    if (container) container.style.display = 'block';

    // 6. 子面板映射
    const panels = {
      'theme': 'appearance-panel-theme',
      'font-bg': 'appearance-panel-font',
      'bubble-css': 'appearance-panel-bubble',
      'avatar': 'appearance-panel-avatar'
    };
    const titles = {
      'theme': '主题配色',
      'font-bg': '背景 & 字体',
      'bubble-css': '气泡 & CSS',
      'avatar': '聊天头像'
    };
    const targetId = panels[panel];
    if (!targetId) return;

    // 7. 收集所有需要隐藏的面板 ID（确保一个不漏）
    const allPanelIds = [
      ...Object.values(panels),
      'appearance-panel-background',
      'appearance-panel-css'
    ];
    allPanelIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // 8. 根据 panel 类型决定要显示哪些子面板
    let panelsToShow = [];
    if (panel === 'font-bg') {
      panelsToShow = ['appearance-panel-font', 'appearance-panel-background'];
    } else if (panel === 'bubble-css') {
      panelsToShow = ['appearance-panel-bubble', 'appearance-panel-css'];
    } else {
      // 单一面板（theme, avatar 等）
      panelsToShow = [targetId];
    }

    // 9. 统一显示
    panelsToShow.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'block';
    });
    if (panel === 'avatar' && window.updateAvatarSettingsUI) window.updateAvatarSettingsUI();
    if (panel === 'font-bg') { const _fs = document.getElementById('font-size-slider'), _fv = document.getElementById('font-size-value'); if (_fs && settings && settings.fontSize) { _fs.value = settings.fontSize; if (_fv) _fv.textContent = settings.fontSize + 'px'; document.documentElement.style.setProperty('--font-size', settings.fontSize + 'px'); } if (typeof renderBackgroundGallery === 'function') renderBackgroundGallery(); }

    // 10. 重新绑定按钮（使用新的事件，完全取代旧的）
    const closeBtn = document.getElementById('close-appearance');
    const backBtn = document.getElementById('back-appearance');

    // 定义统一返回设置页的函数
    const returnToSettings = () => {
      modal.style.display = 'none';
      if (typeof backToSettings === 'function') backToSettings();
      else if (window.homeScreen && window.homeScreen.backToSettings) window.homeScreen.backToSettings();
      else backToHome();
    };

    // 移除所有已有的事件监听器（通过替换克隆节点是最干净的方式）
    if (closeBtn) {
      const newClose = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newClose, closeBtn);
      newClose.onclick = returnToSettings;
      // 隐藏关闭按钮（如你所需）
      newClose.style.display = 'none';
    }
    if (backBtn) {
      const newBack = backBtn.cloneNode(true);
      backBtn.parentNode.replaceChild(newBack, backBtn);
      newBack.onclick = returnToSettings;
    }

    console.log(`✅ 打开 ${panel} 面板，模态框已稳定显示`);
  }

  // ---------- 心情日历 ----------
  let moodData = {}, moodViewYear = 0, moodViewMonth = 0;
  async function loadMoodData() { try { if (window.localforage) { const d = await localforage.getItem(MOOD_KEY); if (d && typeof d === 'object') moodData = d; } } catch (e) { } }
  async function saveMoodData() { try { if (window.localforage) await localforage.setItem(MOOD_KEY, moodData); } catch (e) { } }
  function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function buildMoodCalendarScreen() {
    if (document.getElementById('mood-calendar-screen')) return;
    const el = document.createElement('div');
    el.id = 'mood-calendar-screen';
    el.innerHTML = `<div class="fs-header"><button class="fs-back-btn" id="mood-back-btn"><i class="fas fa-arrow-left"></i></button><span class="fs-title">心情日历</span></div><div class="fs-body"><div class="mood-calendar-wrap"><div class="mood-cal-head"><button class="mood-cal-nav" id="mood-prev"><i class="fas fa-chevron-left"></i></button><span class="mood-cal-month" id="mood-cal-month"></span><button class="mood-cal-nav" id="mood-next"><i class="fas fa-chevron-right"></i></button></div><div class="mood-weekdays">${['一', '二', '三', '四', '五', '六', '日'].map(d => `<div class="mood-weekday">${d}</div>`).join('')}</div><div class="mood-cal-grid" id="mood-cal-grid"></div></div></div>`;
    document.body.appendChild(el);
    el.querySelector('#mood-back-btn').addEventListener('click', () => getBackTarget()());
    el.querySelector('#mood-prev').addEventListener('click', () => { moodViewMonth--; if (moodViewMonth < 0) { moodViewMonth = 11; moodViewYear--; } renderMoodGrid(); });
    el.querySelector('#mood-next').addEventListener('click', () => { moodViewMonth++; if (moodViewMonth > 11) { moodViewMonth = 0; moodViewYear++; } renderMoodGrid(); });
  }
  function renderMoodGrid() {
    const monthEl = document.getElementById('mood-cal-month');
    const grid = document.getElementById('mood-cal-grid');
    if (!monthEl) return;
    monthEl.textContent = `${moodViewYear}年 ${moodViewMonth + 1}月`;
    const firstDay = new Date(moodViewYear, moodViewMonth, 1);
    let firstWeekday = firstDay.getDay(); firstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1;
    const daysInMonth = new Date(moodViewYear, moodViewMonth + 1, 0).getDate();
    const today = new Date(), todayKey = ymd(today);
    let html = '';
    for (let i = 0; i < firstWeekday; i++) html += '<div class="mood-cell empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(moodViewYear, moodViewMonth, d);
      const key = ymd(date);
      const mood = moodData[key];
      const isToday = key === todayKey;
      html += `<button class="mood-cell ${mood ? 'has-mood' : ''} ${isToday ? 'today' : ''}" data-date="${key}"><span class="mood-cell-day">${d}</span>${mood ? `<span class="mood-cell-emoji">${mood}</span>` : ''}</button>`;
    }
    grid.innerHTML = html;
    grid.querySelectorAll('.mood-cell[data-date]').forEach(c => c.addEventListener('click', () => openMoodEmojiPicker(c.dataset.date)));
  }
  function openMoodEmojiPicker(dateKey) {
    const existing = document.getElementById('mood-emoji-picker');
    if (existing) existing.remove();
    recentEmojis = JSON.parse(localStorage.getItem(RECENT_EMOJI_KEY) || '[]');
    const picker = document.createElement('div');
    picker.id = 'mood-emoji-picker';
    picker.className = 'mood-emoji-picker';
    const emojiHTML = MOOD_EMOJIS.map(e => `<button class="mood-emoji-btn" data-emoji="${e}">${e}</button>`).join('') + '<button class="mood-emoji-btn clear" data-emoji="">清除</button>';
    picker.innerHTML = `<div class="mood-emoji-picker-head"><span class="mood-emoji-picker-title">${dateKey} 今天心情如何？</span><button class="theme-panel-close" id="mood-picker-close">&times;</button></div>${recentEmojis.length ? `<div class="mood-emoji-picker-head" style="margin-top:0;">最近使用</div><div class="mood-emoji-grid" id="mood-recent-grid">${recentEmojis.map(e => `<button class="mood-emoji-btn" data-emoji="${e}">${e}</button>`).join('')}</div>` : ''}<div class="mood-emoji-grid">${emojiHTML}</div>`;
    document.body.appendChild(picker);
    picker.querySelector('#mood-picker-close').addEventListener('click', () => picker.remove());
    const bind = btn => btn.addEventListener('click', async () => {
      const e = btn.dataset.emoji;
      if (e) moodData[dateKey] = e; else delete moodData[dateKey];
      await saveMoodData();
      picker.remove();
      recentEmojis = [e, ...recentEmojis.filter(x => x !== e)].slice(0, 8);
      localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(recentEmojis));
      renderMoodGrid();
    });
    picker.querySelectorAll('.mood-emoji-btn').forEach(bind);
    const recentGrid = picker.querySelector('#mood-recent-grid');
    if (recentGrid) recentGrid.querySelectorAll('.mood-emoji-btn').forEach(bind);
  }
  function openMoodCalendar(fromSettings = false) {
    buildMoodCalendarScreen();
    const home = document.getElementById('home-screen');
    if (home) home.classList.add('hidden');
    enterFeatureMode();
    isOnHome = false;
    setContext(fromSettings ? 'settings' : 'home');
    if (!moodViewYear) { const now = new Date(); moodViewYear = now.getFullYear(); moodViewMonth = now.getMonth(); }
    renderMoodGrid();
    document.getElementById('mood-calendar-screen')?.classList.add('visible');
    showBackBtn(() => getBackTarget()());
  }

  // ---------- 图标自定义 ----------
  function buildIconCustomizeScreen(fromSettings = false) {
    const isFromSettings = fromSettings;
    if (document.getElementById('icon-customize-screen')) return;
    const el = document.createElement('div');
    el.id = 'icon-customize-screen';
    // 定义 Dock 按钮的自定义列表
    const dockItems = [
      { id: 'dock-settings', label: '设置', defaultIcon: 'fa-sliders' },
      { id: 'dock-theme', label: '主题', defaultIcon: 'fa-palette' }
    ];
    const featuresHTML = FEATURES.map(f => `<div class="icon-customize-item" data-feature="${f.id}">
    <div class="icon-customize-preview" data-preview="${f.id}">${customIcons[f.id] ? `<img src="${customIcons[f.id]}" alt="">` : `<i class="fas ${f.icon}"></i>`}</div>
    <div class="icon-customize-info">
        <div class="icon-customize-name">${f.label}</div>
        <div class="icon-customize-tip">点击上传自定义图标（建议正方形）</div>
    </div>
    <div class="icon-customize-actions">
        <input type="file" accept="image/*" style="display:none" data-file="${f.id}">
        <button class="icon-customize-btn" data-upload="${f.id}">上传</button>
        <button class="icon-customize-btn reset" data-reset="${f.id}">还原</button>
    </div>
</div>`).join('');
    const dockHTML = dockItems.map(item => `<div class="icon-customize-item" data-feature="${item.id}">
    <div class="icon-customize-preview" data-preview="${item.id}">${customIcons[item.id] ? `<img src="${customIcons[item.id]}" alt="">` : `<i class="fas ${item.defaultIcon}"></i>`}</div>
    <div class="icon-customize-info">
        <div class="icon-customize-name">${item.label}（Dock栏）</div>
        <div class="icon-customize-tip">点击上传自定义图标（建议正方形）</div>
    </div>
    <div class="icon-customize-actions">
        <input type="file" accept="image/*" style="display:none" data-file="${item.id}">
        <button class="icon-customize-btn" data-upload="${item.id}">上传</button>
        <button class="icon-customize-btn reset" data-reset="${item.id}">还原</button>
    </div>
</div>`).join('');
    const itemsHTML = featuresHTML + dockHTML;
    el.innerHTML = `<div class="fs-header"><button class="fs-back-btn" id="icon-back-btn"><i class="fas fa-arrow-left"></i></button><span class="fs-title">功能图标自定义</span></div><div class="fs-body"><div class="icon-customize-list">${itemsHTML}</div></div>`;
    document.body.appendChild(el);
    el.querySelector('#icon-back-btn').addEventListener('click', () => {
      const screen = document.getElementById('icon-customize-screen');
      if (screen) screen.classList.remove('visible');

      if (isFromSettings) {
        // 从设置页进入 -> 返回设置页
        backToSettings();
      } else {
        // 从主页进入 -> 直接返回主页，不走 backToHome 避免再次隐藏
        const homeScreen = document.getElementById('home-screen');
        if (homeScreen) {
          homeScreen.classList.remove('hidden');
          homeScreen.style.display = '';
          homeScreen.style.opacity = '';
        }
        document.body.classList.remove('feature-mode');
        refreshHomeData();
        setContext('home');
        hideBackBtn();
        // 清理残留面板
        const themePanel = document.getElementById('home-theme-panel');
        if (themePanel) themePanel.remove();
        const moodPicker = document.getElementById('mood-emoji-picker');
        if (moodPicker) moodPicker.remove();
        closeAllFeatureModals();
      }
    });
    el.querySelectorAll('[data-upload]').forEach(btn => btn.addEventListener('click', () => { const fid = btn.dataset.upload; el.querySelector(`[data-file="${fid}"]`).click(); }));
    el.querySelectorAll('[data-file]').forEach(input => input.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file || file.size > 2 * 1024 * 1024) { if (file) alert('图标不能超过2MB'); return; }
      const fid = input.dataset.file;
      const reader = new FileReader();
      reader.onload = async (ev) => { customIcons[fid] = ev.target.result; await localforage?.setItem(ICON_KEY, customIcons); const preview = el.querySelector(`[data-preview="${fid}"]`); if (preview) preview.innerHTML = `<img src="${customIcons[fid]}" alt="">`; applyCustomIcons(); };
      reader.readAsDataURL(file);
    }));
    el.querySelectorAll('[data-reset]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const fid = btn.dataset.reset;
        console.log(`还原图标: ${fid}`);
        delete customIcons[fid];
        if (window.localforage) await localforage.setItem(ICON_KEY, customIcons);

        // 方式1：通过父级 .icon-customize-item 查找 .icon-customize-preview
        const itemDiv = btn.closest('.icon-customize-item');
        const previewDiv = itemDiv ? itemDiv.querySelector('.icon-customize-preview') : null;

        if (previewDiv) {
          // 根据 fid 确定默认图标的 HTML
          let defaultHtml = '';
          const isFeature = FEATURES.some(f => f.id === fid);
          if (isFeature) {
            const f = FEATURES.find(f => f.id === fid);
            if (f) defaultHtml = `<i class="fas ${f.icon}"></i>`;
          } else {
            if (fid === 'dock-settings') defaultHtml = `<i class="fas fa-sliders"></i>`;
            else if (fid === 'dock-theme') defaultHtml = `<i class="fas fa-palette"></i>`;
            else defaultHtml = `<i class="fas fa-cog"></i>`;
          }
          previewDiv.innerHTML = defaultHtml;
          console.log(`预览已更新为默认图标: ${fid}`);
        } else {
          console.warn(`未找到预览元素: ${fid}`);
        }

        // 更新主页图标
        applyCustomIcons();
      });
    });
  }
  function openIconCustomize(fromSettings = false) {
    buildIconCustomizeScreen(fromSettings);
    const home = document.getElementById('home-screen');
    if (home) home.classList.add('hidden');
    if (!document.body.classList.contains('feature-mode')) enterFeatureMode();
    isOnHome = false;
    setContext(fromSettings ? 'settings' : 'home');
    const screen = document.getElementById('icon-customize-screen');
    if (screen) { screen.classList.remove('visible'); requestAnimationFrame(() => screen.classList.add('visible')); }
    showBackBtn(() => getBackTarget()());
  }

  // ---------- 辅助功能（爱心粒子等）----------
  function spawnHeartParticles(x, y) {
    const count = 12, hue = getComputedStyle(document.documentElement).getPropertyValue('--theme-h').trim();
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.textContent = '♥';
      p.style.cssText = `position:fixed; left:${x}px; top:${y}px; font-size:${10 + Math.random() * 16}px; color:hsl(${hue},65%,70%); pointer-events:none; z-index:9999; transform:translate(-50%,-50%);`;
      document.body.appendChild(p);
      const angle = Math.random() * 2 * Math.PI, dist = 40 + Math.random() * 70;
      p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist - 30}px)) scale(0.3)`, opacity: 0 }], { duration: 1200 + Math.random() * 800, easing: 'ease-out', fill: 'forwards' });
      p.addEventListener('finish', () => p.remove());
    }
  }

  function bindEvents() {
    document.querySelectorAll('.home-feature').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); goToFeature(btn.dataset.feature); }));
    document.getElementById('dock-settings')?.addEventListener('click', e => { e.stopPropagation(); openSettingsScreen(); });
    document.getElementById('dock-theme')?.addEventListener('click', e => { e.stopPropagation(); openThemePanel(); });
    document.querySelector('.profile-divider i')?.addEventListener('click', e => spawnHeartParticles(e.clientX, e.clientY));
    ['home-my-avatar', 'home-partner-avatar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('dblclick', e => { e.preventDefault(); el.classList.add('avatar-shake'); setTimeout(() => el.classList.remove('avatar-shake'), 600); spawnHeartParticles(e.clientX, e.clientY); });
    });
  }

  // ========== 设置页面跳转核心修复 ==========
  function triggerSettingsAction(action) {
    if (!action) return;

    // 隐藏设置列表屏幕
    const settingsScreen = document.getElementById('settings-list-screen');
    if (settingsScreen) settingsScreen.classList.remove('visible');

    // 隐藏主页（完全不可见）
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) homeScreen.classList.add('hidden');

    // 确保不在 feature-mode（避免干扰模态框）
    document.body.classList.remove('feature-mode');

    // 设置上下文和返回按钮
    setContext('settings');
    showBackBtn(backToSettings);

    switch (action) {
      // ========== 外观类：打开 appearance-modal 对应子面板 ==========
      case 'theme':
        openAppearanceSubPanel('theme');
        break;
      case 'font-bg':
        openAppearanceSubPanel('font-bg');
        break;
      case 'bubble-css':
        openAppearanceSubPanel('bubble-css');
        break;
      case 'avatar':
        openAppearanceSubPanel('avatar');
        break;
      case 'decision':
        // 打开抉择菜单（抛硬币/抽签）
        const decisionModal = document.getElementById('decision-menu-modal');
        if (decisionModal) {
          openModalWithSettingsBack('decision-menu-modal');
        } else {
          // 如果找不到模态框，尝试通过原有按钮触发
          const decisionBtn = document.getElementById('decision-function');
          if (decisionBtn) decisionBtn.click();
          else showNotification('抉择功能暂不可用', 'info');
        }
        break;

      // ========== 独立全屏功能 ==========
      case 'icon-customize':
        openIconCustomize(true);
        break;
      case 'mood':
        // 打开心晴手帐模态框（mood-modal），而不是全屏心情日历
        openModalWithSettingsBack('mood-modal');
        break;
      case 'library':
        openModalWithSettingsBack('custom-replies-modal');
        break;
      case 'tarot':
        openModalWithSettingsBack('fortune-lenormand-modal');
        break;
      case 'envelope':
        openModalWithSettingsBack('envelope-modal');
        break;
      case 'group':
        openModalWithSettingsBack('group-chat-modal');
        break;
      case 'call':
        if (window.callFeature?.startCall) window.callFeature.startCall(false);
        else document.querySelector('#collapsed-call-btn')?.click();
        break;
      case 'music':
        document.getElementById('music-player-toggle')?.click();
        break;

      // ========== 聊天设置 ==========
      case 'send-settings':
      case 'chat-style':
        openModalWithSettingsBack('chat-modal');
        setTimeout(() => { if (typeof setupAvatarFrameSettings === 'function') setupAvatarFrameSettings(); }, 300);
        break;

      // ========== 纪念日 ==========
      case 'anniversary':
        openModalWithSettingsBack('anniversary-modal');
        break;

      // ========== 个人资料 ==========
      case 'profile-me':
        openProfileEditor('me');
        break;
      case 'profile-partner':
        openProfileEditor('partner');
        break;

      // ========== 数据管理 ==========
      case 'stats':
        openModalWithSettingsBack('stats-modal');
        break;
      case 'data':
        openModalWithSettingsBack('data-modal');
        setTimeout(() => {
          const modal = document.getElementById('data-modal');
          if (!modal) return;

          // 重新绑定关闭按钮
          const closeBtn = document.getElementById('close-data');
          if (closeBtn) {
            const newBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newBtn, closeBtn);
            newBtn.onclick = (e) => {
              e.stopPropagation();
              modal.style.display = 'none';
              backToSettings();
            };
          }

          // 隐藏左上角箭头（假设箭头在 .d-topbar-left 内）
          const leftArea = modal.querySelector('.d-topbar-left');
          if (leftArea) leftArea.style.display = 'none';

          // 删除“重放新手引导”和“声明与致谢”
          const allRows = modal.querySelectorAll('.d-row-card, .db-body > div');
          allRows.forEach(row => {
            const text = row.innerText;
            if (text.includes('重放新手引导') || text.includes('声明与致谢')) {
              row.remove();
            }
          });

          // 简化存储用量
          const storageCard = modal.querySelector('.d-storage-card');
          if (storageCard) {
            const originalText = storageCard.innerText;
            const match = originalText.match(/\d+(?:\.\d+)?\s*[KMGT]?B/);
            if (match) {
              storageCard.innerHTML = `<div style="padding: 10px;">📦 已用存储：${match[0]}</div>`;
            }
          }
        }, 150);
        break;

      default:
        console.warn('未处理的设置动作:', action);
        backToSettings();
        break;
    }
  }

  // ---------- 辅助函数：打开任意模态框，并确保关闭后回到设置页 ----------
  function openModalForHome(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'flex';
    modal.style.transition = 'none';
    modal.style.animation = 'none';
    modal.classList.remove('hidden');
    modal.style.zIndex = '10001';
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.style.animation = 'none';
      content.style.opacity = '1';
      content.style.transform = 'translateY(0) scale(1)';
    }
    const allBtns = modal.querySelectorAll('.modal-btn, .env-close-btn, .close-btn, [onclick*="hideModal"]');
    allBtns.forEach(btn => {
      if (btn._patchedForHome) return;
      btn._patchedForHome = true;
      const oldClick = btn.onclick;
      btn.onclick = (e) => {
        e.stopPropagation();
        modal.style.display = 'none';
        backToHome();
        if (oldClick && typeof oldClick === 'function') {
          try { oldClick.call(btn, e); } catch (err) { console.warn(err); }
        }
      };
    });
  }

  function openModalWithSettingsBack(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`找不到模态框: ${modalId}`);
      backToSettings();
      return;
    }

    // 显示 modal
    modal.style.display = 'flex';
    modal.style.transition = 'none';
    modal.style.animation = 'none';
    modal.classList.remove('hidden');
    modal.style.zIndex = '10001';

    // 保证模态框内容可以滚动/交互（某些 modal 需要重置动画）
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.style.animation = 'none';
      if (modalId !== 'data-modal') content.style.opacity = '1';
      content.style.transform = 'translateY(0) scale(1)';
    }

    // 劫持模态框内所有“关闭/返回”类按钮，使其返回设置页而不退回主页
    const closeSelectors = [
      '#close-' + modalId.replace('-modal', ''),
      '.modal-btn-secondary:last-child',
      '.modal-btn:contains("关闭")',
      '.modal-btn:contains("取消")'
    ];
    // 这些modal内部按钮逻辑复杂，不整体劫持，只劫持close-开头的关闭按钮
    const noHijack = ["fortune-lenormand-modal"];
    const btnSelector = noHijack.includes(modalId)
      ? "[id]"
      : ".modal-btn, .env-close-btn, .close-btn, [onclick*=hideModal]";
    // 更可靠的方法：遍历所有可能关闭模态框的按钮
    const allBtns = noHijack.includes(modalId)
      ? modal.querySelectorAll('[id^="close-"]')
      : modal.querySelectorAll(".modal-btn, .env-close-btn, .close-btn");
    allBtns.forEach(btn => {
      // 避免重复绑定，标记已处理
      if (btn._settingsPatched) return;
      btn._settingsPatched = true;
      const oldClick = btn.onclick;
      btn.onclick = (e) => {
        e.stopPropagation();
        // 隐藏当前模态框
        modal.style.display = 'none';
        // 回到设置列表页
        backToSettings();
        // 如果原有点击事件存在且不是我们刚设置的，可以尝试执行原逻辑（但通常原事件也会隐藏 modal）
        if (oldClick && typeof oldClick === 'function') {
          try { oldClick.call(btn, e); } catch (e) { console.warn(e); }
        }
      };
    });

    // 特殊处理 back-appearance / close-appearance 等已绑定的情况，直接覆盖
    const backAppearance = document.getElementById('back-appearance');
    if (backAppearance) {
      backAppearance.onclick = (e) => {
        e.stopPropagation();
        modal.style.display = 'none';
        backToSettings();
      };
    }
    const closeAppearance = document.getElementById('close-appearance');
    if (closeAppearance) {
      closeAppearance.onclick = (e) => {
        e.stopPropagation();
        modal.style.display = 'none';
        backToSettings();
      };
    }
    // ========== 专门处理 data-modal ==========
    if (modalId === 'data-modal') {
      const closeX = document.getElementById('close-data');
      if (closeX) {
        const newClose = closeX.cloneNode(true);
        closeX.parentNode.replaceChild(newClose, closeX);
        newClose.onclick = (e) => {
          e.stopPropagation();
          modal.style.display = 'none';
          backToSettings();
        };
      }



      // 延迟隐藏箭头和删除条目（不会闪烁）
      setTimeout(() => {
        const backBtn = modal.querySelector('.dm-topbar-back');
        if (backBtn) backBtn.style.display = 'none';

        const tutorialRow = document.getElementById('replay-tutorial-btn-row');
        if (tutorialRow) tutorialRow.remove();
        const creditsRow = document.getElementById('open-credits-row');
        if (creditsRow) creditsRow.remove();
      }, 300);
    }
  }

  // 打开“我的/梦角”资料编辑器（昵称+头像）
  function openProfileEditor(target) {
    if (target === 'me') {
      // 触发原有编辑我的头像/昵称的交互（双击头像或点击编辑名称）
      const myAvatar = document.getElementById('my-avatar');
      // 同时弹出昵称编辑框（复用 edit-modal）
      setTimeout(() => {
        const editModal = document.getElementById('edit-modal');
        if (editModal) {
          const titleSpan = editModal.querySelector('#edit-modal-title');
          const nameInput = editModal.querySelector('#name-input');
          const saveBtn = editModal.querySelector('#save-name');
          if (titleSpan) titleSpan.textContent = '修改我的昵称';
          if (nameInput) {
            const currentName = document.getElementById('my-name')?.textContent || '我';
            nameInput.value = currentName;
            nameInput.oninput = () => { if (saveBtn) saveBtn.disabled = !nameInput.value.trim(); };
          }
          if (saveBtn) {
            saveBtn.onclick = () => {
              const newName = nameInput.value.trim();
              if (newName && typeof settings !== 'undefined') {
                settings.myName = newName;
                if (typeof throttledSaveData === 'function') throttledSaveData();
                if (typeof updateUI === 'function') updateUI();
                refreshHomeData();
                showNotification('我的昵称已更新', 'success');
              }
              editModal.style.display = 'none';
              backToSettings();   // 保存后返回设置页
            };
          }
          const cancelBtn = document.getElementById('cancel-edit');
          if (cancelBtn) {
            cancelBtn.onclick = () => {
              editModal.style.display = 'none';
              backToSettings();
            };
          }
          editModal.style.display = 'flex';
        }
      }, 50);
    } else if (target === 'partner') {
      // 编辑梦角资料
      const partnerAvatar = document.getElementById('partner-avatar');
      setTimeout(() => {
        const editModal = document.getElementById('edit-modal');
        if (editModal) {
          const titleSpan = editModal.querySelector('#edit-modal-title');
          const nameInput = editModal.querySelector('#name-input');
          const saveBtn = editModal.querySelector('#save-name');
          if (titleSpan) titleSpan.textContent = '修改梦角昵称';
          if (nameInput) {
            const currentName = document.getElementById('partner-name')?.textContent || '梦角';
            nameInput.value = currentName;
            nameInput.oninput = () => { if (saveBtn) saveBtn.disabled = !nameInput.value.trim(); };
          }
          if (saveBtn) {
            saveBtn.onclick = () => {
              const newName = nameInput.value.trim();
              if (newName && typeof settings !== 'undefined') {
                settings.partnerName = newName;
                if (typeof throttledSaveData === 'function') throttledSaveData();
                if (typeof updateUI === 'function') updateUI();
                refreshHomeData();
                showNotification('梦角昵称已更新', 'success');
              }
              editModal.style.display = 'none';
              backToSettings();
            };
          }
          const cancelBtn = document.getElementById('cancel-edit');
          if (cancelBtn) {
            cancelBtn.onclick = () => {
              editModal.style.display = 'none';
              backToSettings();
            };
          }
          editModal.style.display = 'flex';
        }
      }, 50);
    }
  }

  // 简单通知 (若全局无 showNotification 则备用)
  function showNotification(msg, type = 'info') {
    if (typeof window.showNotification === 'function') {
      window.showNotification(msg, type);
    } else {
      alert(msg);
    }
  }

  // ---------- PWA + 初始化 ----------
  function registerSW() { if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(e => console.warn(e))); }

  async function init() {
    const progressBar = document.createElement('div');
    progressBar.id = 'home-loading-bar';
    progressBar.style.cssText = 'position:fixed;top:0;left:0;height:2px;width:0;background:hsl(var(--theme-h),55%,65%);z-index:9999;transition:width0.3s;box-shadow:0 0 8px hsla(var(--theme-h),55%,65%,0.6)';
    document.body.appendChild(progressBar);
    progressBar.style.width = '60%';
    ['splash-declaration', 'welcome-animation'].forEach(id => { const e = document.getElementById(id); if (e) { e.style.display = 'none'; e.classList.add('hidden'); } });
    registerSW();
    const homeEl = buildHomeDOM();
    document.body.appendChild(homeEl);
    await loadStoredPrefs();
    ensureFloatingBackBtn();
    bindEvents();
    applyCustomIcons();
    setTimeout(() => { refreshHomeData(); isOnHome = true; }, 100);
    setupSyncObservers();
    progressBar.style.width = '100%';
    setTimeout(() => { progressBar.style.opacity = '0'; setTimeout(() => progressBar.remove(), 400); }, 200);
    document.addEventListener('visibilitychange', () => document.body.classList.toggle('pause-animations', document.hidden));
    // 全局劫持 showModal，禁用所有模态框入场动画
    (function hijackShowModal() {
      const originalShowModal = window.showModal;
      if (typeof originalShowModal !== 'function') return;
      window.showModal = function (modal) {
        if (modal) {
          modal.style.transition = 'none';
          modal.style.animation = 'none';
          const content = modal.querySelector('.modal-content');
          if (content) {
            content.style.animation = 'none';
            content.style.transition = 'none';
            content.style.transform = 'scale(1)';
            content.style.opacity = '1';
          }
          modal.querySelectorAll('*').forEach(el => {
            el.style.animation = 'none';
            el.style.transition = 'none';
          });
        }
        return originalShowModal.call(this, modal);
      };
    })();
  }

  function setupSyncObservers() {
    ['my-avatar', 'partner-avatar', 'my-name', 'partner-name'].forEach(id => {
      const el = document.getElementById(id);
      if (el) new MutationObserver(() => { if (isOnHome) refreshHomeData(); }).observe(el, { attributes: true, childList: true, subtree: true, characterData: true });
    });
  }
  window.backToSettings = backToSettings;
  window.homeScreen = { backToHome, backToSettings, goToFeature, refreshHomeData, openThemePanel, openSettingsScreen, openMoodCalendar, openIconCustomize };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

// 简单主题应用函数（如果全局不存在）
if (typeof window.applyThemeColor !== 'function') {
  window.applyThemeColor = function (theme) {
    const colors = {
      gold: { h: 45, s: 70 },
      blue: { h: 210, s: 70 },
      purple: { h: 270, s: 70 },
      green: { h: 120, s: 60 },
      pink: { h: 340, s: 70 },
      'black-white': { h: 0, s: 0 },
      pastel: { h: 0, s: 80 },
      sunset: { h: 25, s: 80 },
      forest: { h: 140, s: 50 },
      ocean: { h: 200, s: 70 }
    };
    const c = colors[theme];
    if (c) {
      document.documentElement.style.setProperty('--theme-h', c.h);
      document.documentElement.style.setProperty('--theme-s', c.s + '%');
      if (typeof applyHue === 'function') applyHue(c.h);
      if (typeof saveThemePreference === 'function') saveThemePreference();
    }
  };
}