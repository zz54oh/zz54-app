/**
 * home.js — 主页系统（重写版 v3）
 * - 双头像 Hero 卡（我 + 梦角）
 * - 4 列紧凑图标网格 + iOS 风格 Dock
 * - body.feature-mode 切换：进入功能时隐藏聊天 UI
 * - 主页背景 / Hero 背景分别上传
 * - 心情日历全屏页（emoji 选择器）
 * - 图标自定义全屏页
 * - 浮动返回主页按钮
 * - 自动跳过引言 / 欢迎动画
 * - PWA Service Worker 注册
 */

(function () {
  'use strict';

  /* ============================================================
     0. 立即跳过引言（在 onboarding.js 检查之前）
  ============================================================ */
  try {
    localStorage.setItem('splashPledgeSigned_v3', '1');
  } catch (e) { }

  /* ============================================================
     1. 常量与状态
  ============================================================ */
  const APP_PREFIX = 'CHAT_APP_V3_';
  const HUE_KEY = APP_PREFIX + 'home_theme_hue';
  const PAGE_BG_KEY = APP_PREFIX + 'home_page_bg';
  const HERO_BG_KEY = APP_PREFIX + 'home_hero_bg';
  const MOOD_KEY = APP_PREFIX + 'home_mood_data';
  const ICON_KEY = APP_PREFIX + 'home_custom_icons';
  const RECENT_EMOJI_KEY = 'home_recent_emojis';

  const PRESET_COLORS = [
    { name: '紫罗兰', h: 285 },
    { name: '玫瑰粉', h: 340 },
    { name: '樱花', h: 355 },
    { name: '天空', h: 210 },
    { name: '薄荷', h: 155 },
    { name: '蜜桃', h: 20 },
    { name: '星空', h: 240 },
    { name: '灰', h: 220, s: 8 },
  ];

  const FEATURES = [
    { id: 'chat', icon: 'fa-comment-dots', label: '聊天', bg: 'icon-bg-7' },
    { id: 'tarot', icon: 'fa-star-and-crescent', label: '塔罗占卜', bg: 'icon-bg-12' },
    { id: 'envelope', icon: 'fa-envelope', label: '信箱', bg: 'icon-bg-4' },
    { id: 'library', icon: 'fa-book-open', label: '字卡库', bg: 'icon-bg-1' },
    { id: 'mood', icon: 'fa-cloud-sun', label: '心情', bg: 'icon-bg-3' },
    { id: 'group', icon: 'fa-user-group', label: '群聊', bg: 'icon-bg-6' },
    { id: 'call', icon: 'fa-video', label: '通话', bg: 'icon-bg-11' },
    { id: 'music', icon: 'fa-music', label: '音乐', bg: 'icon-bg-8' },
  ];

  const MOOD_EMOJIS = ['😊', '😄', '🥰', '😌', '😴', '😢', '😭', '😠', '😰', '🤔', '😎', '🥳', '🤗', '😔', '😍', '🥺', '😤', '🌧️', '☀️', '⭐', '🌙', '🍃'];

  let isOnHome = true;
  let activeBackHandler = null;
  let customIcons = {}; // { featureId: dataUrl }
  let recentEmojis = [];

  /* ============================================================
     2. 主题色 / 背景 / 自定义图标 持久化
  ============================================================ */
  function applyHue(h) {
    document.documentElement.style.setProperty('--theme-h', h);
    try {
      if (window.localforage) localforage.setItem(HUE_KEY, h);
      localStorage.setItem(HUE_KEY, h);
    } catch (e) { }
  }

  function applyPageBg(dataUrl) {
    const bgEl = document.getElementById('home-bg-image');
    if (!bgEl) return;
    if (dataUrl) {
      bgEl.style.backgroundImage = `url(${dataUrl})`;
      bgEl.classList.add('loaded');
      try { if (window.localforage) localforage.setItem(PAGE_BG_KEY, dataUrl); } catch (e) { }
    } else {
      bgEl.style.backgroundImage = '';
      bgEl.classList.remove('loaded');
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

  async function loadStoredPrefs() {
    // 主题色
    try {
      let h = null;
      if (window.localforage) h = await localforage.getItem(HUE_KEY);
      if (h === null || h === undefined) h = parseInt(localStorage.getItem(HUE_KEY) || '285', 10);
      if (!isNaN(h)) applyHue(h);
    } catch (e) { applyHue(285); }

    // 饱和度
    try {
      const sat = await localforage.getItem('home_theme_sat');
      if (sat) document.documentElement.style.setProperty('--theme-s', sat + '%');
    } catch (e) { }

    // 页面背景
    try {
      if (window.localforage) {
        const bg = await localforage.getItem(PAGE_BG_KEY);
        if (bg) applyPageBg(bg);
      }
    } catch (e) { }

    // Hero 背景
    try {
      if (window.localforage) {
        const hbg = await localforage.getItem(HERO_BG_KEY);
        if (hbg) applyHeroBg(hbg);
      }
    } catch (e) { }

    // 自定义图标
    try {
      if (window.localforage) {
        const icons = await localforage.getItem(ICON_KEY);
        if (icons && typeof icons === 'object') {
          customIcons = icons;
          applyCustomIcons();
        }
      }
    } catch (e) { }
  }

  function applyCustomIcons() {
    document.querySelectorAll('.home-feature').forEach(btn => {
      const fid = btn.dataset.feature;
      const iconWrap = btn.querySelector('.home-feature-icon');
      if (!iconWrap) return;
      if (customIcons[fid]) {
        iconWrap.innerHTML = `<img src="${customIcons[fid]}" alt="">`;
      } else {
        const f = FEATURES.find(x => x.id === fid);
        if (f) iconWrap.innerHTML = `<i class="fas ${f.icon}"></i>`;
      }
    });
  }

  /* ============================================================
     3. 主页 DOM 构建
  ============================================================ */
  function buildHomeDOM() {
    const el = document.createElement('div');
    el.id = 'home-screen';

    const featuresHTML = FEATURES.map(f => `
      <button class="home-feature" data-feature="${f.id}">
        <div class="home-feature-icon ${f.bg}">
          <i class="fas ${f.icon}"></i>
        </div>
        <span class="home-feature-label">${f.label}</span>
      </button>
    `).join('');

    el.innerHTML = `
      <div id="home-bg">
        <div id="home-bg-image"></div>
        <div id="home-bg-overlay"></div>
      </div>

      <div id="home-content">

        <!-- 顶部 Hero 卡片：双头像 -->
        <div class="home-hero">
          <div class="home-hero-bg"></div>
          <div class="home-hero-overlay"></div>
          <div class="home-hero-content">
            <div class="dual-profile">

              <div class="profile-side me">
                <div class="profile-avatar-ring">
                  <div class="profile-avatar-img" id="home-my-avatar">
                    <i class="fas fa-user"></i>
                  </div>
                  <div class="profile-online-dot"></div>
                </div>
                <div class="profile-name" id="home-my-name">我</div>
                <div class="profile-status" id="home-my-status">在线</div>
              </div>

              <div class="profile-divider">
                <i class="fas fa-heart"></i>
              </div>

              <div class="profile-side partner">
                <div class="profile-avatar-ring">
                  <div class="profile-avatar-img" id="home-partner-avatar">
                    <i class="fas fa-user"></i>
                  </div>
                  <div class="profile-online-dot"></div>
                </div>
                <div class="profile-name" id="home-partner-name">梦角</div>
                <div class="profile-status" id="home-partner-status">在线</div>
              </div>

            </div>

            <div class="home-love-pill">
              <i class="fas fa-heart"></i>
              <span id="home-love-days">记录我们的故事</span>
            </div>
          </div>
        </div>

        <!-- 4 列功能图标网格 -->
        <div class="home-grid">${featuresHTML}</div>

        <!-- iOS 风格 Dock -->
        <div class="home-dock">
          <button class="home-dock-btn" id="dock-settings">
            <i class="fas fa-sliders"></i>
            <span>设置</span>
          </button>
          <button class="home-dock-btn" id="dock-theme">
            <i class="fas fa-palette"></i>
            <span>主题</span>
          </button>
        </div>

      </div>
    `;
    return el;
  }

  /* ============================================================
     4. 浮动返回主页按钮
  ============================================================ */
  function ensureFloatingBackBtn() {
    if (document.getElementById('floating-back-home')) return;
    const btn = document.createElement('button');
    btn.id = 'floating-back-home';
    btn.title = '返回主页';
    btn.innerHTML = '<i class="fas fa-house"></i>';
    btn.addEventListener('click', () => {
      if (typeof activeBackHandler === 'function') {
        try { activeBackHandler(); return; } catch (e) { }
      }
      backToHome();
    });
    document.body.appendChild(btn);
  }

  function showBackBtn(handler) {
    activeBackHandler = handler || null;
    const btn = document.getElementById('floating-back-home');
    if (btn) btn.classList.add('visible');
  }

  function hideBackBtn() {
    activeBackHandler = null;
    const btn = document.getElementById('floating-back-home');
    if (btn) btn.classList.remove('visible');
  }

  /* ============================================================
     5. 进入功能 / 返回主页（含 feature-mode 切换）
  ============================================================ */
  function enterFeatureMode() {
    document.body.classList.add('feature-mode');
  }

  function exitFeatureMode() {
    document.body.classList.remove('feature-mode');
  }

  function leaveHomeForChat() {
    exitFeatureMode();   // 确保聊天 UI 恢复显示
    const home = document.getElementById('home-screen');
    if (!home) return;
    home.classList.add('home-screen-exit');
    setTimeout(() => {
      home.classList.add('hidden');
      home.classList.remove('home-screen-exit');
    }, 220);
    isOnHome = false;
    showBackBtn(backToHome);
  }

  function leaveHomeForFeature() {
    const home = document.getElementById('home-screen');
    if (!home) return;
    home.classList.add('home-screen-exit');
    home.addEventListener('animationend', function handler() {
      home.removeEventListener('animationend', handler);
      home.classList.add('hidden');
      home.classList.remove('home-screen-exit');
    }, { once: true });
    enterFeatureMode();
    isOnHome = false;
    showBackBtn(backToHome);
    exitFeatureMode();
  }

  function backToHome() {
    closeAllFeatureModals();

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
      home.classList.remove('hidden');
      home.classList.add('home-screen-enter');
      setTimeout(() => home.classList.remove('home-screen-enter'), 240);
    }

    refreshHomeData();
    isOnHome = true;
    hideBackBtn();
  }

  function closeAllFeatureModals() {
    const modalIds = [
      'custom-replies-modal', 'fortune-lenormand-modal', 'envelope-modal',
      'mood-modal', 'group-chat-modal', 'settings-modal',
      'appearance-modal', 'chat-modal', 'advanced-modal', 'data-modal',
      'anniversary-modal', 'music-player-modal'
    ];
    modalIds.forEach(id => {
      const m = document.getElementById(id);
      if (m) {
        m.classList.add('hidden');
        m.style.display = 'none';
      }
    });
  }

  function openModalById(id) {
    const m = document.getElementById(id);
    if (!m) return false;
    if (m._hideTimeout) { clearTimeout(m._hideTimeout); m._hideTimeout = null; }
    m.classList.remove('hidden');
    m.style.setProperty('display', 'flex', 'important');
    m.style.setProperty('z-index', '10001', 'important');
    const content = m.querySelector('.modal-content');
    if (content) {
      content.style.setProperty('animation', 'none', 'important');
      content.style.setProperty('opacity', '1', 'important');
      content.style.setProperty('transform', 'translateY(0) scale(1)', 'important');
      content.style.setProperty('transition', 'none', 'important');
    }
    return true;
  }

  /* ============================================================
     6. 跳转到具体功能
  ============================================================ */
  function goToFeature(featureName) {
    if (featureName === 'chat') {
      leaveHomeForChat();
      return;
    }
    if (featureName === 'mood') {
      openMoodCalendar();
      return;
    }

    // 隐藏主页，但不进 feature-mode——modal 必须在正常聊天环境下才能显示
    const home = document.getElementById('home-screen');
    if (home) home.classList.add('hidden');
    isOnHome = false;
    showBackBtn(backToHome);

    // 直接 click 原来功能按钮，走 listeners.js 已有的完整路径
    setTimeout(() => {
      // 给关闭按钮追加"回主页"钩子
      const closeIds = {
        tarot:    ['close-fortune', 'close-lenormand'],
        envelope: ['cancel-envelope'],
        library:  ['close-custom-replies'],
        group:    ['close-group-chat'],
      };
      (closeIds[featureName] || []).forEach(id => {
        const btn = document.getElementById(id);
        if (btn && !btn._homeHooked) {
          btn._homeHooked = true;
          btn.addEventListener('click', () => {
            setTimeout(backToHome, 300); // 等 hideModal 动画结束再回主页
          });
        }
      });

      switch (featureName) {
        case 'tarot':
          document.getElementById('fortune-lenormand-function')?.click();
          break;
        case 'envelope':
          document.getElementById('envelope-function')?.click();
          break;
        case 'library':
          document.getElementById('custom-replies-function')?.click();
          break;
        case 'group':
          document.getElementById('group-chat-btn')?.click();
          break;
        case 'call':
          if (window.callFeature?.startCall) window.callFeature.startCall(false);
          else document.querySelector('#collapsed-call-btn')?.click();
          break;
        case 'music':
          document.getElementById('music-player-toggle')?.click();
          break;
      }
    }, 100);
  }

  /* ============================================================
     7. 数据同步（双头像/名字/天数）
  ============================================================ */
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
    if (img && img.src) {
      target.innerHTML = `<img src="${img.src}" alt="">`;
      return;
    }
    const bg = src.style.backgroundImage;
    if (bg && bg !== 'none' && bg !== '') {
      target.style.backgroundImage = bg;
      target.innerHTML = '';
      return;
    }
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
      const loveDate = window.settings?.loveStartDate;
      if (loveDate) {
        const start = new Date(loveDate);
        const diff = Math.floor((Date.now() - start) / 86400000);
        if (!isNaN(diff) && diff >= 0) {
          el.textContent = `在一起第 ${diff + 1} 天`;
          return;
        }
      }
    } catch (e) { }
    const annDays = document.getElementById('anniversary-days');
    if (annDays && annDays.textContent && annDays.textContent !== '0') {
      el.textContent = `在一起第 ${annDays.textContent} 天`;
    } else {
      el.textContent = '记录我们的故事';
    }
  }

  /* ============================================================
     8. 主题面板（含双背景上传 + 饱和度滑块）
  ============================================================ */
  function openThemePanel() {
    const existing = document.getElementById('home-theme-panel');
    if (existing) { existing.remove(); return; }

    const currentH = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--theme-h') || '285'
    );

    const swatchHTML = PRESET_COLORS.map(p => `
      <div class="theme-swatch ${p.h === currentH ? 'active' : ''}"
           style="background: hsl(${p.h}, ${p.s !== undefined ? p.s : 55}%, 70%);"
           data-hue="${p.h}" title="${p.name}"></div>
    `).join('');

    const currentS = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--theme-s') || '35'
    );

    const panel = document.createElement('div');
    panel.id = 'home-theme-panel';
    panel.innerHTML = `
      <div class="theme-panel-head">
        <span class="theme-panel-title"><i class="fas fa-palette"></i>主题外观</span>
        <button class="theme-panel-close" id="theme-panel-close">&times;</button>
      </div>

      <div class="theme-section-label">预设颜色</div>
      <div class="theme-color-swatches">${swatchHTML}</div>

      <div class="theme-section-label">自定义色相</div>
      <div class="theme-hue-row">
        <input type="range" id="theme-hue-slider" min="0" max="360" value="${currentH}">
        <div class="theme-hue-preview" id="theme-hue-preview"
             style="background: hsl(${currentH},55%,70%);"></div>
      </div>

      <div class="theme-section-label">饱和度</div>
      <div class="theme-hue-row">
        <input type="range" id="theme-sat-slider" min="1" max="50" value="${currentS}">
        <span id="theme-sat-value" style="font-size:12px;color:var(--home-text-sub);min-width:32px;">${currentS}%</span>
      </div>

      <div class="theme-section-label">主页背景</div>
      <div class="bg-upload-row">
        <input type="file" id="page-bg-input" accept="image/*" style="display:none">
        <button class="bg-upload-btn" id="page-bg-upload-btn">
          <i class="fas fa-cloud-arrow-up"></i> 上传主页背景
        </button>
        <button class="bg-clear-btn" id="page-bg-clear-btn" title="清除">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <div class="theme-section-label">顶部卡片背景</div>
      <div class="bg-upload-row">
        <input type="file" id="hero-bg-input" accept="image/*" style="display:none">
        <button class="bg-upload-btn" id="hero-bg-upload-btn">
          <i class="fas fa-cloud-arrow-up"></i> 上传卡片背景
        </button>
        <button class="bg-clear-btn" id="hero-bg-clear-btn" title="清除">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <div class="theme-section-label">主页设置</div>
      <div class="bg-upload-row">
        <button class="bg-upload-btn" id="open-icon-customize-btn">
          <i class="fas fa-icons"></i> 自定义功能图标
        </button>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('#theme-panel-close').addEventListener('click', () => panel.remove());

    // 色板
    panel.querySelectorAll('.theme-swatch').forEach(s => {
      s.addEventListener('click', () => {
        const h = parseInt(s.dataset.hue);
        applyHue(h);
        panel.querySelectorAll('.theme-swatch').forEach(x => x.classList.remove('active'));
        s.classList.add('active');
        const slider = panel.querySelector('#theme-hue-slider');
        const prev = panel.querySelector('#theme-hue-preview');
        if (slider) slider.value = h;
        if (prev) prev.style.background = `hsl(${h},55%,70%)`;
      });
    });

    // 色相滑条
    const slider = panel.querySelector('#theme-hue-slider');
    const preview = panel.querySelector('#theme-hue-preview');
    slider.addEventListener('input', () => {
      const h = parseInt(slider.value);
      applyHue(h);
      preview.style.background = `hsl(${h},55%,70%)`;
      panel.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
    });

    // 饱和度滑块
    const satSlider = panel.querySelector('#theme-sat-slider');
    const satValue = panel.querySelector('#theme-sat-value');
    if (satSlider && satValue) {
      // 修改点：扩大范围到 0-100，并正确拼接 %
      satSlider.min = 0;
      satSlider.max = 100;
      satSlider.value = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--theme-s')) || 35;

      const updateSat = () => {
        const val = satSlider.value;
        document.documentElement.style.setProperty('--theme-s', val + '%');   // 关键：必须是 val + '%'
        satValue.textContent = val + '%';
        try { if (window.localforage) localforage.setItem('home_theme_sat', val); } catch (e) { }
      };
      satSlider.addEventListener('input', updateSat);
      updateSat();
    }

    // 主页背景
    bindBgUpload(panel, '#page-bg-input', '#page-bg-upload-btn', '#page-bg-clear-btn', applyPageBg);
    // Hero 背景
    bindBgUpload(panel, '#hero-bg-input', '#hero-bg-upload-btn', '#hero-bg-clear-btn', applyHeroBg);

    // 图标自定义入口
    panel.querySelector('#open-icon-customize-btn').addEventListener('click', () => {
      panel.remove();
      openIconCustomize();
    });

    // 点外部关闭
    setTimeout(() => {
      const handler = (ev) => {
        if (!panel.contains(ev.target) && ev.target.id !== 'dock-theme') {
          panel.remove();
          document.removeEventListener('click', handler);
        }
      };
      document.addEventListener('click', handler);
    }, 100);
  }

  function bindBgUpload(panel, inputSel, uploadSel, clearSel, applyFn) {
    const input = panel.querySelector(inputSel);
    const uploadBtn = panel.querySelector(uploadSel);
    const clearBtn = panel.querySelector(clearSel);
    if (!input || !uploadBtn || !clearBtn) return;
    uploadBtn.addEventListener('click', () => input.click());
    input.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { alert('图片不能超过 5MB'); return; }
      const reader = new FileReader();
      reader.onload = ev => applyFn(ev.target.result);
      reader.readAsDataURL(file);
    });
    clearBtn.addEventListener('click', () => applyFn(null));
  }

  /* ============================================================
     9. 设置全屏页
  ============================================================ */
  const SETTINGS_ITEMS = [
    {
      section: '聊天与外观',
      items: [
        { icon: 'fa-palette',     bg: 'icon-bg-2', title: '主题配色',   desc: '颜色方案、自定义编辑器',   action: 'theme' },
        { icon: 'fa-image',       bg: 'icon-bg-5', title: '背景和字体', desc: '聊天背景图、字体大小', action: 'font-bg' },
        { icon: 'fa-comment',     bg: 'icon-bg-7', title: '气泡和CSS',  desc: '气泡样式、自定义CSS',   action: 'bubble-css' },
        { icon: 'fa-user-circle', bg: 'icon-bg-3', title: '聊天头像',   desc: '头像、头像框设置',       action: 'avatar' },
        { icon: 'fa-comments',    bg: 'icon-bg-6', title: '聊天设置',   desc: '消息气泡、回执、输入框', action: 'chat-style' },
        { icon: 'fa-book-open',   bg: 'icon-bg-1', title: '字卡回复库', desc: '字卡、表情、拍一拍',   action: 'library' },
        { icon: 'fa-icons',       bg: 'icon-bg-9', title: '功能图标自定义', desc: '为每个功能上传自定义图标', action: 'icon-customize' },
      ]
    },
    {
      section: '内容与互动',
      items: [
        { icon: 'fa-star-and-crescent', bg: 'icon-bg-12', title: '塔罗占卜', desc: '梦占模式、抽牌设置', action: 'tarot' },
        { icon: 'fa-envelope-open-text', bg: 'icon-bg-4', title: '信封投递', desc: '写信给梦角、延迟回信', action: 'envelope' },
        { icon: 'fa-cloud-sun', bg: 'icon-bg-3', title: '心情追踪', desc: '日历记录每日心情', action: 'mood' },
        { icon: 'fa-user-group', bg: 'icon-bg-6', title: '群聊功能', desc: '多人聊天模式', action: 'group' },
        { icon: 'fa-video', bg: 'icon-bg-11', title: '通话与视频', desc: '虚拟通话框', action: 'call' },
        { icon: 'fa-music', bg: 'icon-bg-8', title: '音乐播放器', desc: '上传音频、播放控制', action: 'music' },
      ]
    },
    {
      section: '发送与回复',
      items: [
        { icon: 'fa-paper-plane', bg: 'icon-bg-9', title: '发送设置', desc: '回复比例、频率、等待时间', action: 'send-settings' },
        { icon: 'fa-cake-candles', bg: 'icon-bg-7', title: '纪念日', desc: '添加纪念日提醒', action: 'anniversary' },
      ]
    },
    {
      section: '账户与数据',
      items: [
        { icon: 'fa-user-pen', bg: 'icon-bg-2', title: '我的头像与昵称', desc: '修改我的形象', action: 'profile-me' },
        { icon: 'fa-user-astronaut', bg: 'icon-bg-12', title: '梦角头像与昵称', desc: '修改梦角的形象', action: 'profile-partner' },
        { icon: 'fa-database', bg: 'icon-bg-10', title: '数据管理', desc: '导入/导出/清空', action: 'data' },
      ]
    },
  ];

  function buildSettingsScreen() {
    if (document.getElementById('settings-list-screen')) return;
    const el = document.createElement('div');
    el.id = 'settings-list-screen';

    const sectionsHTML = SETTINGS_ITEMS.map(sec => `
      <div class="settings-section-title">${sec.section}</div>
      <div class="settings-group">
        ${sec.items.map(it => `
          <button class="settings-row" data-action="${it.action}">
            <div class="settings-row-icon ${it.bg}"><i class="fas ${it.icon}"></i></div>
            <div class="settings-row-info">
              <div class="settings-row-title">${it.title}</div>
              <div class="settings-row-desc">${it.desc}</div>
            </div>
            <i class="fas fa-chevron-right settings-row-arrow"></i>
          </button>
        `).join('')}
      </div>
    `).join('');

    el.innerHTML = `
      <div class="fs-header">
        <button class="fs-back-btn" id="settings-back-btn">
          <i class="fas fa-arrow-left"></i>
        </button>
        <span class="fs-title">设置</span>
      </div>
      <div class="fs-body">${sectionsHTML}</div>
    `;

    document.body.appendChild(el);

    el.querySelector('#settings-back-btn').addEventListener('click', backToHome);

    el.querySelectorAll('.settings-row').forEach(row => {
      row.addEventListener('click', () => {
        triggerSettingsAction(row.dataset.action);
      });
    });
  }

  function openSettingsScreen() {
    buildSettingsScreen();
    const home = document.getElementById('home-screen');
    if (home) home.classList.add('hidden');
    enterFeatureMode();
    isOnHome = false;
    document.getElementById('settings-list-screen')?.classList.add('visible');
    showBackBtn(backToHome);
  }


  // 从设置页打开 modal，临时覆盖关闭按钮让它回设置页而不是别处
  function openModalFromSettings(modalId, closeBtnIds, hideCloseBtnIds) {
    const m = document.getElementById(modalId);
    if (!m) return;
    showModal(m);
    // 隐藏不需要的关闭按钮
    (hideCloseBtnIds || []).forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = 'none';
    });
    (closeBtnIds || []).forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const orig = btn.onclick;
      btn.onclick = (e) => {
        e.stopImmediatePropagation();

        m.style.display = 'none';
        if (m._hideTimeout) { clearTimeout(m._hideTimeout); m._hideTimeout = null; }
        // 恢复关闭按钮显示
        (hideCloseBtnIds || []).forEach(hid => {
          const hbtn = document.getElementById(hid);
          if (hbtn) hbtn.style.display = '';
        });
        btn.onclick = orig;
        window.homeScreen.backToSettings();
      };
    });
  }

  function openAppearancePanel(panel) {
    openModalFromSettings('appearance-modal', ['back-appearance'], ['close-appearance']);
    setTimeout(() => {
      const navGrid = document.getElementById('appearance-nav-grid');
      const galleryBanner = document.getElementById('gallery-banner-entry');
      if (navGrid) navGrid.style.display = 'none';
      if (galleryBanner) galleryBanner.style.display = 'none';
      if (typeof showAppearancePanel === 'function') showAppearancePanel(panel);
      else window.showAppearancePanel?.(panel);
    }, 50);
  }


  function backToSettings() {
    // 直接隐藏所有 modal，不 exitFeatureMode（避免聊天界面闪烁）
    document.querySelectorAll('.modal').forEach(m => {
      m.style.display = 'none';
      if (m._hideTimeout) { clearTimeout(m._hideTimeout); m._hideTimeout = null; }
    });
    // 直接显示设置列表，不走 exit/enter feature-mode 的来回
    buildSettingsScreen();
    const home = document.getElementById('home-screen');
    if (home) home.classList.add('hidden');
    // feature-mode 一直保持激活，不需要重新进入
    document.getElementById('settings-list-screen')?.classList.add('visible');
    showBackBtn(backToHome);
  }

  function triggerSettingsAction(action) {
    const settingsEl = document.getElementById('settings-list-screen');
    if (settingsEl) settingsEl.classList.remove('visible');

    // 退出 feature-mode 前先手动隐藏聊天区域，防止闪烁
    ['header','.main-chat-area','.input-area-wrapper','#typing-indicator-wrapper'].forEach(sel => {
      const el = sel.startsWith('#') || sel.startsWith('.')
        ? document.querySelector(sel)
        : document.querySelector('.' + sel);
      if (el) el.style.display = 'none';
    });
    exitFeatureMode();

    setTimeout(() => {
      // openModalFromSettings：打开 modal 并覆盖关闭按钮让它回设置页
      const oMS = (id, btns) => openModalFromSettings(id, btns);
      switch (action) {
        case 'appearance':     oMS('appearance-modal', ['back-appearance'], ['close-appearance']); break;
        case 'theme':          openAppearancePanel('theme'); break;
        case 'font-bg':        openAppearancePanel('font-bg'); break;
        case 'bubble-css':     openAppearancePanel('bubble-css'); break;
        case 'avatar':         openAppearancePanel('avatar'); break;
        case 'chat-style':     oMS('chat-modal', ['back-chat'], ['close-chat']); break;
        case 'background':     openAppearancePanel('font-bg'); break;
        case 'icon-customize': openIconCustomize(); return;
        case 'library':        oMS('custom-replies-modal', ['close-custom-replies']); break;
        case 'tarot':          oMS('fortune-lenormand-modal', ['close-fortune','close-lenormand']); break;
        case 'envelope':       oMS('envelope-modal', ['cancel-envelope']); break;
        case 'mood':           openMoodCalendar(); return;
        case 'group':          oMS('group-chat-modal', ['close-group-chat']); break;
        case 'call':           if (window.callFeature?.startCall) window.callFeature.startCall(false); break;
        case 'music':          oMS('music-player-modal', []); break;
        case 'send-settings':  oMS('advanced-modal', ['back-advanced']); break;
        case 'anniversary':    oMS('anniversary-modal', ['close-anniversary']); break;
        case 'profile-me':     oMS('chat-modal', ['back-chat'], ['close-chat']); break;
        case 'profile-partner':oMS('chat-modal', ['back-chat'], ['close-chat']); break;
        case 'data':           oMS('data-modal', ['back-data']); break;
        default: break;
      }
      // 给对应关闭按钮挂回主页钩子

      showBackBtn(backToSettings);
    }, 200);
  }

  /* ============================================================
     10. 心情日历全屏页（含最近使用）
  ============================================================ */
  let moodData = {}; // { 'YYYY-MM-DD': '😊' }
  let moodViewYear = 0;
  let moodViewMonth = 0; // 0-11

  async function loadMoodData() {
    try {
      if (window.localforage) {
        const d = await localforage.getItem(MOOD_KEY);
        if (d && typeof d === 'object') moodData = d;
      }
    } catch (e) { }
  }

  async function saveMoodData() {
    try {
      if (window.localforage) await localforage.setItem(MOOD_KEY, moodData);
    } catch (e) { }
  }

  function ymd(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function buildMoodCalendarScreen() {
    let el = document.getElementById('mood-calendar-screen');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'mood-calendar-screen';
    el.innerHTML = `
      <div class="fs-header">
        <button class="fs-back-btn" id="mood-back-btn">
          <i class="fas fa-arrow-left"></i>
        </button>
        <span class="fs-title">心情日历</span>
      </div>
      <div class="fs-body">
        <div class="mood-calendar-wrap">
          <div class="mood-cal-head">
            <button class="mood-cal-nav" id="mood-prev"><i class="fas fa-chevron-left"></i></button>
            <span class="mood-cal-month" id="mood-cal-month">2026年 5月</span>
            <button class="mood-cal-nav" id="mood-next"><i class="fas fa-chevron-right"></i></button>
          </div>
          <div class="mood-weekdays">
            ${['一', '二', '三', '四', '五', '六', '日'].map(d => `<div class="mood-weekday">${d}</div>`).join('')}
          </div>
          <div class="mood-cal-grid" id="mood-cal-grid"></div>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    el.querySelector('#mood-back-btn').addEventListener('click', backToHome);
    el.querySelector('#mood-prev').addEventListener('click', () => {
      moodViewMonth--;
      if (moodViewMonth < 0) { moodViewMonth = 11; moodViewYear--; }
      renderMoodGrid();
    });
    el.querySelector('#mood-next').addEventListener('click', () => {
      moodViewMonth++;
      if (moodViewMonth > 11) { moodViewMonth = 0; moodViewYear++; }
      renderMoodGrid();
    });

    return el;
  }

  function renderMoodGrid() {
    const monthEl = document.getElementById('mood-cal-month');
    const grid = document.getElementById('mood-cal-grid');
    if (!monthEl || !grid) return;

    monthEl.textContent = `${moodViewYear}年 ${moodViewMonth + 1}月`;

    const firstDay = new Date(moodViewYear, moodViewMonth, 1);
    let firstWeekday = firstDay.getDay(); // 0=Sun
    firstWeekday = firstWeekday === 0 ? 6 : firstWeekday - 1; // 转为 0=Mon

    const daysInMonth = new Date(moodViewYear, moodViewMonth + 1, 0).getDate();
    const today = new Date();
    const todayKey = ymd(today);

    let html = '';
    for (let i = 0; i < firstWeekday; i++) html += '<div class="mood-cell empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(moodViewYear, moodViewMonth, d);
      const key = ymd(date);
      const mood = moodData[key];
      const isToday = key === todayKey;
      html += `
        <button class="mood-cell ${mood ? 'has-mood' : ''} ${isToday ? 'today' : ''}" data-date="${key}">
          <span class="mood-cell-day">${d}</span>
          ${mood ? `<span class="mood-cell-emoji">${mood}</span>` : ''}
        </button>
      `;
    }
    grid.innerHTML = html;

    grid.querySelectorAll('.mood-cell[data-date]').forEach(c => {
      c.addEventListener('click', () => openMoodEmojiPicker(c.dataset.date));
    });
  }

  function openMoodEmojiPicker(dateKey) {
    const existing = document.getElementById('mood-emoji-picker');
    if (existing) existing.remove();
    recentEmojis = JSON.parse(localStorage.getItem(RECENT_EMOJI_KEY) || '[]');

    const picker = document.createElement('div');
    picker.id = 'mood-emoji-picker';
    picker.className = 'mood-emoji-picker';

    const emojiHTML = MOOD_EMOJIS.map(e =>
      `<button class="mood-emoji-btn" data-emoji="${e}">${e}</button>`
    ).join('') + `<button class="mood-emoji-btn clear" data-emoji="">清除</button>`;

    picker.innerHTML = `
      <div class="mood-emoji-picker-head">
        <span class="mood-emoji-picker-title">${dateKey} 今天心情如何？</span>
        <button class="theme-panel-close" id="mood-picker-close">&times;</button>
      </div>
      ${recentEmojis.length ? `
      <div class="mood-emoji-picker-head" style="margin-top:0;">最近使用</div>
      <div class="mood-emoji-grid" id="mood-recent-grid">
        ${recentEmojis.map(e => `<button class="mood-emoji-btn" data-emoji="${e}">${e}</button>`).join('')}
      </div>
      ` : ''}
      <div class="mood-emoji-grid">${emojiHTML}</div>
    `;

    document.body.appendChild(picker);

    picker.querySelector('#mood-picker-close').addEventListener('click', () => picker.remove());

    function bindEmoji(btn) {
      btn.addEventListener('click', async () => {
        const e = btn.dataset.emoji;
        if (e) moodData[dateKey] = e;
        else delete moodData[dateKey];
        await saveMoodData();
        picker.remove();
        // 更新最近使用
        recentEmojis = [e, ...recentEmojis.filter(x => x !== e)].slice(0, 8);
        localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(recentEmojis));
        renderMoodGrid();
      });
    }
    picker.querySelectorAll('.mood-emoji-btn').forEach(bindEmoji);
    const recentGrid = picker.querySelector('#mood-recent-grid');
    if (recentGrid) recentGrid.querySelectorAll('.mood-emoji-btn').forEach(bindEmoji);
  }

  function openMoodCalendar() {
    buildMoodCalendarScreen();
    const home = document.getElementById('home-screen');
    if (home) home.classList.add('hidden');
    enterFeatureMode();
    isOnHome = false;

    if (!moodViewYear) {
      const now = new Date();
      moodViewYear = now.getFullYear();
      moodViewMonth = now.getMonth();
    }
    renderMoodGrid();

    document.getElementById('mood-calendar-screen')?.classList.add('visible');
    showBackBtn(backToHome);
  }

  /* ============================================================
     11. 图标自定义全屏页
  ============================================================ */
  function buildIconCustomizeScreen() {
    let el = document.getElementById('icon-customize-screen');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'icon-customize-screen';

    const itemsHTML = FEATURES.map(f => `
      <div class="icon-customize-item" data-feature="${f.id}">
        <div class="icon-customize-preview" data-preview="${f.id}">
          ${customIcons[f.id]
        ? `<img src="${customIcons[f.id]}" alt="">`
        : `<i class="fas ${f.icon}"></i>`}
        </div>
        <div class="icon-customize-info">
          <div class="icon-customize-name">${f.label}</div>
          <div class="icon-customize-tip">点击上传自定义图标（建议正方形）</div>
        </div>
        <div class="icon-customize-actions">
          <input type="file" accept="image/*" style="display:none" data-file="${f.id}">
          <button class="icon-customize-btn" data-upload="${f.id}">上传</button>
          <button class="icon-customize-btn reset" data-reset="${f.id}">还原</button>
        </div>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="fs-header">
        <button class="fs-back-btn" id="icon-back-btn">
          <i class="fas fa-arrow-left"></i>
        </button>
        <span class="fs-title">功能图标自定义</span>
      </div>
      <div class="fs-body">
        <div class="icon-customize-list">${itemsHTML}</div>
      </div>
    `;

    document.body.appendChild(el);

    el.querySelector('#icon-back-btn').addEventListener('click', backToHome);

    el.querySelectorAll('[data-upload]').forEach(btn => {
      btn.addEventListener('click', () => {
        const fid = btn.dataset.upload;
        el.querySelector(`[data-file="${fid}"]`)?.click();
      });
    });

    el.querySelectorAll('[data-file]').forEach(input => {
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert('图标不能超过 2MB'); return; }
        const fid = input.dataset.file;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          customIcons[fid] = ev.target.result;
          try { if (window.localforage) await localforage.setItem(ICON_KEY, customIcons); } catch (err) { }
          const preview = el.querySelector(`[data-preview="${fid}"]`);
          if (preview) preview.innerHTML = `<img src="${customIcons[fid]}" alt="">`;
          applyCustomIcons();
        };
        reader.readAsDataURL(file);
      });
    });

    el.querySelectorAll('[data-reset]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const fid = btn.dataset.reset;
        delete customIcons[fid];
        try { if (window.localforage) await localforage.setItem(ICON_KEY, customIcons); } catch (e) { }
        const preview = el.querySelector(`[data-preview="${fid}"]`);
        const f = FEATURES.find(x => x.id === fid);
        if (preview && f) preview.innerHTML = `<i class="fas ${f.icon}"></i>`;
        applyCustomIcons();
      });
    });

    return el;
  }

  function openIconCustomize() {
    const old = document.getElementById('icon-customize-screen');
    if (old) old.remove();
    buildIconCustomizeScreen();

    const home = document.getElementById('home-screen');
    if (home) home.classList.add('hidden');
    enterFeatureMode();
    isOnHome = false;

    document.getElementById('icon-customize-screen')?.classList.add('visible');
    showBackBtn(backToHome);
  }

  /* ============================================================
     12. 事件绑定（含爱心粒子、双击震动）
  ============================================================ */
  function spawnHeartParticles(x, y) {
    const count = 12;
    const container = document.body;
    const hue = getComputedStyle(document.documentElement).getPropertyValue('--theme-h').trim();
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('span');
      particle.textContent = '♥';
      particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        font-size: ${10 + Math.random() * 16}px;
        color: hsl(${hue}, 65%, 70%);
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
      `;
      container.appendChild(particle);
      const angle = Math.random() * 2 * Math.PI;
      const dist = 40 + Math.random() * 70;
      particle.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist - 30}px)) scale(0.3)`, opacity: 0 }
      ], {
        duration: 1200 + Math.random() * 800,
        easing: 'ease-out',
        fill: 'forwards'
      });
      particle.addEventListener('finish', () => particle.remove());
    }
  }

  function bindEvents() {
    document.querySelectorAll('.home-feature').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        goToFeature(btn.dataset.feature);
      });
    });

    document.getElementById('dock-settings')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openSettingsScreen();
    });
    document.getElementById('dock-theme')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openThemePanel();
    });

    // 爱心粒子效果（点击爱心分隔符）
    const heartDivider = document.querySelector('.profile-divider i');
    if (heartDivider) {
      heartDivider.addEventListener('click', (e) => {
        spawnHeartParticles(e.clientX, e.clientY);
      });
    }

    // 双击头像震动
    ['home-my-avatar', 'home-partner-avatar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('dblclick', (e) => {
          e.preventDefault();
          el.classList.add('avatar-shake');
          setTimeout(() => el.classList.remove('avatar-shake'), 600);
          spawnHeartParticles(e.clientX, e.clientY);
        });
      }
    });
  }

  /* ============================================================
     13. PWA Service Worker 注册
  ============================================================ */
  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then(() => console.log('[PWA] SW 注册成功'))
          .catch(e => console.warn('[PWA] SW 注册失败:', e));
      });
    }
  }

  /* ============================================================
     14. 初始化（含进度条、暂停动画）
  ============================================================ */
  async function init() {
    // 加载进度条
    const progressBar = document.createElement('div');
    progressBar.id = 'home-loading-bar';
    progressBar.style.cssText = `
      position: fixed; top: 0; left: 0; height: 2px; width: 0;
      background: hsl(var(--theme-h), 55%, 65%); z-index: 9999;
      transition: width 0.3s ease;
      box-shadow: 0 0 8px hsla(var(--theme-h), 55%, 65%, 0.6);
    `;
    document.body.appendChild(progressBar);
    progressBar.style.width = '60%';

    // 立即隐藏前置引言/欢迎动画
    ['splash-declaration', 'welcome-animation'].forEach(id => {
      const e = document.getElementById(id);
      if (e) { e.style.display = 'none'; e.classList.add('hidden'); }
    });

    await loadStoredPrefs();
    await loadMoodData();
    registerSW();

    const homeEl = buildHomeDOM();
    document.body.appendChild(homeEl);

    ensureFloatingBackBtn();
    bindEvents();
    applyCustomIcons();

    // 直接显示主页（不等欢迎动画）
    setTimeout(() => {
      refreshHomeData();
      isOnHome = true;
    }, 100);

    // 监听头像/昵称变化（聊天页修改后同步到主页）
    setupSyncObservers();

    // WhatsApp 风格 + 按钮菜单
    setupChatPlusMenu();

    // 进度条完成
    progressBar.style.width = '100%';
    setTimeout(() => {
      progressBar.style.opacity = '0';
      progressBar.style.transition = 'opacity 0.4s';
      setTimeout(() => progressBar.remove(), 400);
    }, 200);

    // 页面隐藏时暂停动画
    document.addEventListener('visibilitychange', () => {
      document.body.classList.toggle('pause-animations', document.hidden);
    });
  }

  /* ============================================================
     14a. WhatsApp 风格 + 按钮菜单
  ============================================================ */
  const CHAT_PLUS_ITEMS = [
    { id: 'poke', icon: 'fa-hand-sparkles', label: '拍一拍', bg: 'icon-bg-1' },
    { id: 'call', icon: 'fa-video', label: '视频通话', bg: 'icon-bg-11' },
    { id: 'chat-cfg', icon: 'fa-comment', label: '聊天设置', bg: 'icon-bg-7' },
    { id: 'data', icon: 'fa-database', label: '数据管理', bg: 'icon-bg-10' },
    { id: 'appear', icon: 'fa-paintbrush', label: '外观功能', bg: 'icon-bg-2' },
    { id: 'session', icon: 'fa-comments', label: '会话管理', bg: 'icon-bg-12' },
  ];

  function setupChatPlusMenu() {
    const inputArea = document.querySelector('.input-area');
    if (!inputArea) return;
    if (document.getElementById('chat-plus-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'chat-plus-btn';
    btn.title = '更多功能';
    btn.innerHTML = '<i class="fas fa-plus"></i>';

    const messageInput = document.getElementById('message-input');
    if (messageInput && messageInput.parentNode === inputArea) {
      inputArea.insertBefore(btn, messageInput);
    } else {
      inputArea.appendChild(btn);
    }

    const menu = document.createElement('div');
    menu.id = 'chat-plus-menu';
    menu.innerHTML = `
      <div class="chat-plus-grid">
        ${CHAT_PLUS_ITEMS.map(it => `
          <button class="chat-plus-item" data-plus="${it.id}">
            <div class="chat-plus-icon ${it.bg}"><i class="fas ${it.icon}"></i></div>
            <span class="chat-plus-label">${it.label}</span>
          </button>
        `).join('')}
      </div>
    `;
    document.body.appendChild(menu);

    function closeMenu() {
      menu.classList.remove('visible');
      btn.classList.remove('open');
    }
    function openMenu() {
      menu.classList.add('visible');
      btn.classList.add('open');
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menu.classList.contains('visible')) closeMenu();
      else openMenu();
    });

    menu.querySelectorAll('.chat-plus-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        triggerChatPlusAction(item.dataset.plus);
      });
    });

    document.addEventListener('click', (ev) => {
      if (!menu.classList.contains('visible')) return;
      if (menu.contains(ev.target) || btn.contains(ev.target)) return;
      closeMenu();
    });
  }

  function triggerChatPlusAction(action) {
    switch (action) {
      case 'poke':
        if (!tryOpen(['#combo-btn'])) {
          tryOpen(['poke-modal']);
        }
        setTimeout(() => {
          const pokeTab = document.querySelector('.combo-tab-btn[data-tab="poke"]');
          if (pokeTab) pokeTab.click();
        }, 80);
        break;
      case 'call':
        tryOpen([
          () => window.callFeature?.startCall?.(false),
          '#collapsed-call-btn'
        ]);
        break;
      case 'chat-cfg':
        tryOpen(['chat-modal', '#settings-btn']);
        break;
      case 'data':
        openModalById('data-modal');
        break;
      case 'appear':
        openModalById('appearance-modal');
        break;
      case 'session':
        tryOpen(['#session-manager-btn']);
        break;
    }
  }

  function setupSyncObservers() {
    const targets = ['my-avatar', 'partner-avatar', 'my-name', 'partner-name'];
    targets.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new MutationObserver(() => {
        if (isOnHome) refreshHomeData();
      });
      obs.observe(el, { attributes: true, childList: true, subtree: true, characterData: true });
    });
  }

  // 暴露 API
  window.homeScreen = {
    backToHome,
    backToSettings,
    goToFeature,
    refreshHomeData,
    openThemePanel,
    openSettingsScreen,
    openMoodCalendar,
    openIconCustomize,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();