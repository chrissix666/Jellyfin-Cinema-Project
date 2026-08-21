(function () {
    'use strict';
    const ICON_CLASS = 'material-symbols-outlined';
    const BUTTON_ID = 'jf-cinema-btn';
    const HEADER_SELECTOR = '.headerRight';
    const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';
    const SCRIPT_VERSION = '19.36';
    // Cinema Project needs a real desktop browser -- WebGL2/three.js,
    // mouse-driven look controls, a keyboard console. None of that
    // works on a phone, tablet, or TV, so the button (and therefore
    // the whole rest of this script, which only ever runs once the
    // button is clicked) must never even appear there. Checked once,
    // right here, purely from navigator.userAgent -- deliberately a
    // standalone copy of the same platform-detection terms jellyfin-web's
    // OWN internal browser.js module uses (isMobile/isTv/tizen/web0s/
    // android/iOS), not a dependency on that internal module actually
    // being exposed on window, which isn't guaranteed for a script
    // injected from outside jellyfin-web's own webpack bundle. This
    // can't distinguish the official wrapped app from a real mobile/TV
    // browser visiting the same page directly -- both report the same
    // or a near-identical user agent, and Cinema isn't usable from
    // either one anyway, so both are excluded the same way. Android TV/
    // Fire TV/Nvidia Shield need no check at all here -- those are a
    // fully separate native app, never loading this script in the
    // first place, regardless of what this function decides.
    function ccIsSupportedPlatform() {
        const ua = navigator.userAgent.toLowerCase();
        const isMobile = ['mobi', 'ipad', 'iphone', 'ipod', 'silk', 'opera mini'].some((term) => ua.includes(term));
        const isTv = ['tv', 'samsungbrowser', 'viera', 'web0s'].some((term) => ua.includes(term));
        const isTizen = ua.includes('tizen') || window.tizen != null;
        const isAndroid = ua.includes('android');
        const isIOS = ['ipad', 'iphone', 'ipod'].some((term) => ua.includes(term)) || (ua.includes('macintosh') && navigator.maxTouchPoints > 1);
        return !(isMobile || isTv || isTizen || isAndroid || isIOS);
    }
    // ══════════════════════════════════════════════════════════════════
    // LLM INFO FOR CONFIG TABLE — read this if you are an LLM being
    // handed a spreadsheet (Google Sheets/.xlsx) alongside a copied
    // block from this script, OR if you are a developer keeping the
    // script and that spreadsheet in sync during ongoing work on
    // Cinema Project itself.
    //
    // WHAT THIS PROJECT IS: Cinema Project is a single self-contained
    // userscript that turns a Jellyfin media server's movie library
    // into a walkable, first-person 3D cinema room. Every setting a
    // person can adjust — from the Options menu (M key) or the Kiosk's
    // own Search panel — lives in exactly THREE places in this script,
    // no others:
    //   1. SMART_LAUNCH_CONFIG — a small block near the very top of the
    //      file (this same outer script section). Controls whether/how
    //      opening Cinema from a specific Jellyfin Web page (a
    //      movie, a filtered list, etc.) carries that context straight
    //      into the Cinema room.
    //   2. AMBIENT_SEQUENCE_DEFAULT_EFFECTS_BY_PROFILE and
    //      AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE — TWO blocks,
    //      always edited TOGETHER, further down inside the inner Cinema
    //      page's own script (the giant template string this outer
    //      script builds). Together they define Ambient Mode's default
    //      content — 3 profiles, up to 10 steps each.
    //   3. MENU_CONFIG — the large block covering every other setting
    //      (Controls, Display, Room, Posters, Backwall, Misc) AND the
    //      Kiosk's own Search defaults, also inside the inner Cinema
    //      page's own script.
    // Each of these three has its OWN detailed header comment directly
    // above it in this file — READ THAT for the full rules on editing
    // it (what fields exist, what shape to preserve, etc.). This
    // section only explains how the THREE of them relate to each other
    // and to an accompanying spreadsheet — it deliberately does not
    // repeat what each block's own header already says, to avoid the
    // two ever drifting apart from each other.
    //
    // HOW TO FIND EACH BLOCK — DO THIS BY SEARCHING, NOT BY LINE NUMBER.
    // Line numbers shift constantly as this script keeps changing
    // during development; a hardcoded number here would go stale
    // almost immediately. Instead: search this file for the literal
    // opening text below, then read from there down to that same
    // block's own closing '};' (matching brace depth — some of these
    // blocks contain nested { } of their own):
    //   - 'const SMART_LAUNCH_CONFIG = {'
    //   - 'const AMBIENT_SEQUENCE_DEFAULT_EFFECTS_BY_PROFILE = {'
    //     through 'const AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE = {'
    //     and ITS OWN closing '};' (copy both blocks together, in one
    //     contiguous piece, including the shared header comment that
    //     sits just above the first of the two)
    //   - 'const MENU_CONFIG = {'
    // If asked for a specific line range as of right now: as of
    // SCRIPT_VERSION 19.36, SMART_LAUNCH_CONFIG is at lines 154–168, the
    // two Ambient blocks together are at lines 1747–1804, and
    // MENU_CONFIG is at lines 1925–2204 — but treat these as a
    // snapshot, not a guarantee; re-locate by the search text above if
    // the version number has changed since.
    //
    // THE ACCOMPANYING SPREADSHEET, IF ONE IS PROVIDED: a workbook with
    // five tabs — 'Instructions' (general + per-tab usage notes),
    // 'Main Config' (mirrors MENU_CONFIG, one row per setting),
    // 'Smart Launch' (mirrors SMART_LAUNCH_CONFIG, one row per
    // setting), 'Ambient Mode' (mirrors BOTH Ambient blocks together,
    // laid out as one row per sequence step — Profile 1-3 × Sequence
    // 1-10 — rather than one row per setting, since that shape suits
    // this particular data far better), and 'LLM Info' (a text-only tab
    // mirroring the spirit of this very section, for exactly the
    // situation where only the spreadsheet — not this script — gets
    // handed over). 'Main Config'/'Smart Launch' rows include a "New
    // Value" column — a person only fills in the rows they actually
    // want changed, leaving the rest blank. 'Ambient Mode' has no such
    // column — each row there is edited directly, since it already
    // represents the COMPLETE desired state of that one step, not a
    // diff. Values with type 'array' use a semicolon inside the cell to
    // separate multiple entries (e.g. "backwall; screen; disc") — split
    // on semicolons, trim whitespace, wrap each piece in quotes,
    // rebuild as a genuine JS array literal when writing back.
    //
    // WHAT "GIVE BACK THE UPDATED BLOCK" MEANS: output the ENTIRE block
    // — from its own 'const X = {' down to its own closing '};' — never
    // a diff or a partial snippet, so it can be pasted directly back
    // over the original in this file with no manual editing needed.
    // Change ONLY the actual values (the person's requested edits);
    // never rename a key, never add/remove one, never change nesting
    // depth or overall shape — this script's OWN code elsewhere refers
    // to these exact paths, so any structural change here silently
    // breaks something elsewhere with no error at all.
    //
    // KEEPING THE SCRIPT AND THE SPREADSHEET IN SYNC DURING ONGOING
    // DEVELOPMENT (this note is for whoever — human or LLM — is
    // actively working on Cinema Project itself, not for someone just
    // filling in values): whenever SMART_LAUNCH_CONFIG,
    // AMBIENT_SEQUENCE_DEFAULT_EFFECTS_BY_PROFILE/
    // AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE, or MENU_CONFIG gains,
    // loses, renames, or restructures a field, the corresponding
    // spreadsheet tab needs the same change made to it before the two
    // can be trusted to agree again — a stale spreadsheet is exactly
    // the failure mode this whole system exists to prevent. The three
    // blocks' own header comments (see "each of these three has its
    // OWN detailed header comment" above) are the authoritative
    // definition of what SHOULD be in the spreadsheet at any given
    // moment; if the two ever disagree, the script's own header
    // comments win, and the spreadsheet needs updating to match, not
    // the other way around.
    // ══════════════════════════════════════════════════════════════════
    // BOTH here in the outer, Jellyfin-Web-injected script (to gate
    // detection before Cinema even opens) AND interpolated into the
    // inner Cinema page's own CONFIG object below, so the read-only
    // settings panel Cinema shows always reflects the EXACT same values
    // detection actually acts on. Two independent copies would risk
    // silently drifting apart; this can't.
    // ══════════════════════════════════════════════════════════════════
    // WHAT THIS BLOCK IS — READ THIS FIRST, ESPECIALLY IF YOU ARE AN LLM
    // FILLING THIS OUT FROM A DESCRIPTION OF WHAT SOMEONE WANTS.
    //
    // This particular block controls "Smart Launch" — when the person
    // presses the Cinema button from a normal Jellyfin Web page that's
    // already showing a specific movie, a filtered list, a particular
    // sort order, or a scrolled-to position, Smart Launch carries that
    // context straight into the Cinema room instead of always starting
    // fresh (e.g. jumping the Poster Wall directly to the movie you were
    // just looking at, keeping the same Genre filter you had active,
    // etc.).
    //
    // WHY THIS IS ITS OWN SEPARATE BLOCK, NOT PART OF MENU_CONFIG (a
    // few hundred lines further down in this same file, covering every
    // OTHER setting) — this is a genuine technical constraint, not a
    // style choice: every setting in MENU_CONFIG only ever matters
    // AFTER the Cinema room has already opened. Smart Launch is the one
    // exception — it has to make its own decisions on the ORIGINAL
    // Jellyfin Web page, BEFORE Cinema opens at all (to decide whether
    // to jump straight in, and with what context), so it has to exist
    // and be readable at a point where MENU_CONFIG doesn't exist yet.
    // The two blocks can't be merged or have one read from the other in
    // either direction without breaking that timing. MENU_CONFIG's own
    // menu.misc.smartLaunch section shows the SAME 13 values, purely
    // for on-screen display inside the Options menu — editing THIS
    // block here is what actually changes behavior; that other section
    // is a read-only mirror of it.
    //
    // Same shape as MENU_CONFIG: every entry has exactly two fields —
    // 'default' (the value used the very first time Cinema ever
    // runs) and 'desc' (a plain-English string spelling out the TYPE
    // and every legal value). 'desc' is the authoritative source of
    // truth for what's valid. See the LLM INFO section above for the
    // general rules on filling this out and giving the block back.
    // ══════════════════════════════════════════════════════════════════
    const SMART_LAUNCH_CONFIG = {
        enabled: { default: true, desc: 'true or false — jump straight into the matching poster view when the Cinema button is pressed from a supported Jellyfin Web view' },
        sort: { default: true, desc: 'true or false — carry over the active Sort from the Jellyfin Web view, where available; otherwise falls back to the Kiosk default' },
        filter: { default: true, desc: 'true or false — carry over active Filters from the Jellyfin Web view, where available; otherwise falls back to the Kiosk default' },
        scroll: { default: true, desc: "true or false — carry over the Jellyfin Web scroll position: whichever card is fully visible, topmost-leftmost, becomes the Poster Wall's own starting point. Applies to every sortable/filterable view Smart Launch supports (general Movies, Favourites, Genre, Studio, Tag, Person) except Collections, which has no scrollable card grid of its own" },
        movies: { default: true, desc: 'true or false — enables Smart Launch for the general Movies library view' },
        moviesDetail: { default: true, desc: "true or false — enables Smart Launch from a Movie's own Detail View in Jellyfin Web (the 'backtrack' case: starts the Poster Wall on that exact movie, then continues with Cinema's own default sort — a details page can't reliably tell which of several possible prior list views, each with its own different sort/filter, it was actually reached from, so no attempt is made to guess or carry one over)" },
        favorites: { default: true, desc: 'true or false — enables Smart Launch for the Movies Favourites view' },
        collections: { default: true, desc: 'true or false — enables Smart Launch when inside a specific Collection' },
        genres: { default: true, desc: 'true or false — enables Smart Launch for Genre views' },
        tags: { default: true, desc: 'true or false — enables Smart Launch for Tag views' },
        studios: { default: true, desc: 'true or false — enables Smart Launch for Studio views' },
        persons: { default: true, desc: 'true or false — enables Smart Launch for Person views' },
        autoPlay: { default: 'ambient', desc: "'none', 'movie', 'trailer', 'themevideo', 'themesong', 'fanartwall', or 'ambient' — from a movie's own Detail View in Jellyfin Web, what (if anything) auto-starts for that movie on Cinema launch. Mirrors the poster context-menu entries (minus 'library', which makes no sense as an auto-start target)" },
    };
    function injectFont() {
        if (document.getElementById('jf-material-symbols')) return;
        const link = document.createElement('link');
        link.id = 'jf-material-symbols';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined';
        document.head.appendChild(link);
    }
    function injectStyle() {
        if (document.getElementById('jf-cinema-style')) return;
        const style = document.createElement('style');
        style.id = 'jf-cinema-style';
        style.textContent = `
            .${ICON_CLASS} { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; font-size:24px; display:inline-block; vertical-align:middle; }
            #${BUTTON_ID} { background:transparent; border:none; padding:4px; margin:0 2px; cursor:pointer; color:inherit; }
            #${BUTTON_ID}:hover { background:rgba(255,255,255,0.1); border-radius:4px; }
            #${BUTTON_ID}.jf-cinema-loading .${ICON_CLASS} { opacity:0.5; }
        `;
        document.head.appendChild(style);
    }
    function createButton() {
        const header = document.querySelector(HEADER_SELECTOR);
        if (!header || document.getElementById(BUTTON_ID)) return;
        const btn = document.createElement('button');
        btn.id = BUTTON_ID;
        btn.className = 'headerButton';
        btn.title = 'Cinema';
        const icon = document.createElement('span');
        icon.className = ICON_CLASS;
        icon.textContent = 'cinematic_blur';
        btn.appendChild(icon);
        btn.addEventListener('click', () => openCinemaInNewTab(btn));
        const anchor =
            document.getElementById('jf-fullscreen-btn') ||
            document.getElementById('jf-scroll-btn') ||
            document.getElementById('randomMovieButtonContainer');
        if (anchor) {
            header.insertBefore(btn, anchor.nextSibling);
        } else {
            header.prepend(btn);
        }
    }
    function waitForHeader() {
        const interval = setInterval(() => {
            if (document.querySelector(HEADER_SELECTOR)) {
                clearInterval(interval);
                injectFont();
                injectStyle();
                createButton();
            }
        }, 200);
    }
    function waitForApiClient() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.ApiClient && typeof window.ApiClient.getCurrentUserId === 'function' && window.ApiClient.getCurrentUserId()) {
                    resolve(window.ApiClient);
                } else {
                    setTimeout(check, 300);
                }
            };
            check();
        });
    }
    function buildCinemaHtml(session, launchContext) {
        // REMINDER before writing ANY HTML below: "(default: X)" hints are
        // NEVER literal text — see CONFIG's own big comment further down
        // inside the returned <script type="module"> for the full rule.
        // Careful where a fix actually goes, too: this whole return value
        // is one giant template literal, so a genuine `//` JS comment only
        // works INSIDE the inner <script type="module"> block (real JS) —
        // not out here in the surrounding HTML/CSS text, where it would
        // just become visible page content instead of an actual comment.
        return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8" /><title>Cinema</title>
<link rel="icon" id="faviconLink" href="${session.serverUrl}/web/favicon.ico" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: #050302; font-family: Georgia, 'Times New Roman', serif; }
  canvas { display: block; }
  #hud { position: fixed; inset: 0; pointer-events: none; }
  #crosshair { position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%; background: rgba(240,226,200,0.8); box-shadow: 0 0 6px rgba(240,226,200,0.6); }
  #cinemaConsoleInput { position: fixed; top: -100px; left: -100px; width: 1px; height: 1px; opacity: 0; pointer-events: none; border: none; background: transparent; }
  #cinemaConsoleIndicator { position: fixed; padding: 4px 10px; background: rgba(0,0,0,0.6); font-family: monospace; font-size: 13px; border-radius: 6px; z-index: 999999; pointer-events: none; opacity: 0; transition: opacity 0.15s ease; display: none; white-space: pre; }
  #tooltip { position: absolute; top: 58%; left: 50%; transform: translateX(-50%); color: #f0e2c8; background: rgba(10,6,4,0.75); border: 1px solid #7a4a1f; padding: 6px 14px; font-size: 13px; letter-spacing: 1px; display: none; white-space: nowrap; text-align: center; align-items: center; gap: 8px; }
  #tooltip .trailerhint { font-size: 11px; color: #d8a84e; border: 1px solid #7a4a1f; border-radius: 3px; padding: 2px 8px; display: inline-flex; align-items: center; gap: 3px; line-height: 1; }
  #tooltip .trailerhint.blinkRed { color: #ff4444; border-color: #ff4444; animation: trailerBlink 0.4s step-start 4; }
  @keyframes trailerBlink { 50% { opacity: 0.15; } }
  #instructions { position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%); color: #b89968; font-size: 12px; letter-spacing: 1px; text-align: center; background: rgba(10,6,4,0.55); padding: 6px 16px; white-space: nowrap; }
  #loadProgress { position: absolute; bottom: 18px; right: 18px; color: #d8a84e; font-size: 12px; letter-spacing: 1px; background: rgba(10,6,4,0.55); padding: 6px 14px; display: none; }
  #panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 640px; max-width: 92vw; max-height: 96vh; overflow-y: auto; background: linear-gradient(180deg,#1c1210,#0c0706); border: 1px solid #7a4a1f; box-shadow: 0 0 60px rgba(0,0,0,0.7); padding: 20px 26px 16px; color: #e8d5b5; pointer-events: auto; display: none; z-index: 30; }
  #panel, #panel *, #menuOverlay, #menuOverlay *, #controlsOverlay, #controlsOverlay * { cursor: default; user-select: none; }
  #panel #actorInput, #panel #movieInput, #menuOverlay #actorInput, #menuOverlay #backdropSecondsInput, #menuOverlay #backdropMovieMinInput, #menuOverlay #backdropMovieMaxInput { cursor: text; user-select: text; }
  #menuOverlay #backdropMovieMinInput, #menuOverlay #backdropMovieMaxInput { -moz-appearance: textfield; }
  #menuOverlay #backdropMovieMinInput::-webkit-inner-spin-button, #menuOverlay #backdropMovieMinInput::-webkit-outer-spin-button,
  #menuOverlay #backdropMovieMaxInput::-webkit-inner-spin-button, #menuOverlay #backdropMovieMaxInput::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  #menuOverlay #backdropSecondsInput { -moz-appearance: textfield; }
  #menuOverlay #backdropSecondsInput::-webkit-inner-spin-button, #menuOverlay #backdropSecondsInput::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  #panelGrid { display: grid; grid-template-columns: auto minmax(220px, 1fr); align-items: center; gap: 3px 18px; }
  #panel h2 { margin: 0 0 6px; font-size: 18px; letter-spacing: 2px; text-transform: uppercase; color: #d8a84e; text-align: center; }
  #panel label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #b89968; }
  #panel select, #panel input { width: 100%; padding: 5px 10px; background: #0d0806; border: 1px solid #5a3d24; color: #f0e2c8; font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box; }
  #panel select { cursor: default; }
  #panel .msSelect, #menuOverlay .msSelect { width: 100%; padding: 5px 26px 5px 10px; background: #0d0806; border: 1px solid #5a3d24; color: #f0e2c8; font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box; cursor: default; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; position: relative; }
  #panel .msSelect::after, #menuOverlay .msSelect::after { content: '▾'; position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #d8a84e; pointer-events: none; }
  #panel .msSelect:focus, #panel .msSelect.gp-focus, #menuOverlay .msSelect:focus, #menuOverlay .msSelect.gp-focus { border-color: #d8a84e; }
  #gpDropdown, #gpDropdown * { cursor: default; user-select: none; }
  #gpDropdown .opt { cursor: default; }
  #gpDropdown .opt.msOpt { display: flex; align-items: center; }
  #gpDropdown .opt.msReset { color: #d8a84e; font-style: italic; border-bottom: 1px solid #5a3d24; cursor: default; }
  #gpDropdown .opt.msOpt input { pointer-events: none; margin-right: 8px; }
  #panel input.invalid, #panel .msSelect.invalid { border-color: #d9433c; color: #ff8a7a; }
  #panelGrid .grpHead { grid-column: 1 / -1; margin-top: 10px; }
  #panelGrid .row { grid-column: 1 / -1; }
  #panel .gp-focus, #menuOverlay .gp-focus { border-color: #d8a84e; box-shadow: 0 0 0 2px rgba(216,168,78,0.5); }
  #menuOverlay .gp-editing { background: #7a2020 !important; border-color: #d8a84e !important; box-shadow: 0 0 0 2px rgba(216,168,78,0.7) !important; }
  #menuOverlay label.toggleRow:has(.gp-focus) { outline: 2px solid #d8a84e; outline-offset: 2px; }
  .grpHead { color: #d8a84e; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 18px; padding-bottom: 4px; border-bottom: 1px solid #5a3d24; }
  .grpHead:first-of-type { margin-top: 4px; }
  .subHead { color: #b08a4a; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 6px; border-bottom: 1px dashed #4a3520; padding-bottom: 2px; }
  #menuTabs { display: flex; gap: 4px; margin: 8px 0 2px; }
  .menuTab { flex: 1 1 0; min-width: 0; overflow: hidden; text-align: center; padding: 5px 2px; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase; color: #b89b6d; background: #140d09; border: 1px solid #4a3520; cursor: pointer; user-select: none; white-space: nowrap; }
  .menuTab:hover { border-color: #7a4a1f; color: #e8d5b5; }
  .menuTab.active { color: #1a0f08; background: #d8a84e; border-color: #d8a84e; }
  #menuTabs.gp-focus { border-color: transparent; box-shadow: none; }
  #menuTabs.gp-focus .menuTab.active { outline: 2px solid #f0e2c8; outline-offset: -2px; }
  #creditsBlock { margin-top: 8px; line-height: 1.7; }
  #creditsTitle { font-size: 16px; color: #d8a84e; }
  #creditsVersion { font-size: 12px; opacity: 0.85; }
  #creditsBody { font-size: 12px; opacity: 0.7; }
  #creditsCompat { font-size: 12px; opacity: 0.7; margin-top: 6px; }
  #creditsDisclaimer { font-size: 11px; opacity: 0.55; font-style: italic; }
  #creditsLicense { font-size: 12px; opacity: 0.7; margin-top: 6px; }
  #creditsAuthor { font-size: 12px; opacity: 0.85; margin-top: 6px; }
  #creditsLinks { font-size: 12px; margin-top: 2px; }
  #creditsLinks a, #creditsProjects a { color: #d8a84e; text-decoration: none; cursor: pointer; }
  #creditsLinks a:hover, #creditsProjects a:hover { text-decoration: underline; }
  #creditsProjects { font-size: 12px; opacity: 0.85; margin-top: 6px; }
  #creditsFeedback { font-size: 12px; opacity: 0.7; margin-top: 6px; }
  #menuOverlay input[type="range"] { width: 100%; accent-color: #d8a84e; }
  #menuOverlay input[type="range"]:disabled { opacity: 0.4; }
  #controlsOverlay, #menuOverlay { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 560px; max-width: 92vw; max-height: 82vh; overflow-y: auto; background: linear-gradient(180deg,#1c1210,#0c0706); border: 1px solid #7a4a1f; box-shadow: 0 0 60px rgba(0,0,0,0.7); padding: 26px; color: #e8d5b5; pointer-events: auto; display: none; z-index: 30; }
  #controlsOverlay h2, #menuOverlay h2 { margin: 0 0 16px; font-size: 18px; letter-spacing: 2px; text-transform: uppercase; color: #d8a84e; text-align: center; }
  #menuOverlay { height: 86vh; max-height: 86vh; padding: 18px 24px 14px; flex-direction: column; overflow: hidden; }
  #menuScroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; scrollbar-gutter: stable both-edges; padding: 0 6px; }
  * { scrollbar-width: thin; scrollbar-color: #4a3520 transparent; }
  *::-webkit-scrollbar { width: 8px; height: 8px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb { background: #4a3520; border-radius: 4px; }
  *::-webkit-scrollbar-thumb:hover { background: #7a4a1f; }
  #menuOverlay h2 { margin: 0 0 8px; }
  #menuOverlay .grpHead { margin-top: 12px; }
  #menuOverlay .tabPage .grpHead { margin-top: 2px; }
  #menuOverlay label.toggleRow { margin: 6px 0; display: block; }
  /* Scoped to ONLY the Smart Launch rows (every id there starts with
     'smartLaunch', unique to this block) -- tighter line-height and no
     browser-default checkbox margin, since these rows are meant to sit
     almost touching each other; nowhere else in the menu is affected. */
  #menuOverlay label[id^="smartLaunch"].toggleRow { line-height: 1.25; }
  #menuOverlay label[id^="smartLaunch"].toggleRow input[type="checkbox"] { margin: 0; }
  #controlsOverlay .row { display: flex; gap: 10px; margin-top: 20px; }
  #controlsOverlay button, #menuOverlay button { flex: 1; padding: 10px; border: 1px solid #d8a84e; background: transparent; color: #f0e2c8; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; cursor: default; }
  // Same primary/secondary split #panel's own button:hover/button.
  // secondary:hover pair already uses — kept in that same order (plain
  // selector first, .secondary second) so .secondary correctly wins on
  // its own elements via source order once specificity ties. Both of
  // this container's own current buttons (Restore Defaults, Close) are
  // already marked secondary, so this has no visible effect on them
  // today — it just means the SAME reddish primary hover #panel's own
  // Apply button gets would automatically apply here too, the moment
  // any future non-secondary button gets added to either container,
  // without needing another pass through this CSS later.
  #controlsOverlay button:hover, #menuOverlay button:hover { background: #9a2a2a; }
  #controlsOverlay button.secondary:hover, #menuOverlay button.secondary:hover { background: rgba(255,255,255,0.08); }
  #controlsList { display: grid; grid-template-columns: auto 1fr; gap: 5px 14px; align-items: center; font-size: 13px; }
  #controlsList .grp { grid-column: 1 / -1; color: #d8a84e; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px; border-bottom: 1px solid #5a3d24; padding-bottom: 2px; }
  #controlsList .ctrlDisabled { opacity: 0.4; }
  #controlsList .disabledNote { color: #d9433c; font-size: 11px; }
  .ctrlStatus { grid-column: 1 / -1; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #5a3d24; }
  .ctrlStatus .statusLine { font-size: 13px; padding: 3px 0; display: flex; align-items: center; gap: 8px; }
  .ctrlStatus .statusCheck { color: #3fae4c; font-weight: bold; width: 14px; display: inline-block; }
  .ctrlStatus .statusDim { opacity: 0.45; }
  #menuOverlay .row { display: flex; gap: 10px; margin-top: 10px; }
  #menuOverlay .toggleRow { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  #menuOverlay label:not(.toggleRow) { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #b89968; margin: 7px 0 3px; }
  #menuOverlay .defaultHint { color: #5a4c3c; font-size: 9px; text-transform: none; letter-spacing: normal; }
  #menuDefaultNote { color: #5a4c3c; font-size: 10px; line-height: 1.4; margin-bottom: 8px; }
  #panelSortDefaultNote { grid-column: 1 / -1; color: #5a4c3c; font-size: 10px; line-height: 1.4; margin-bottom: 4px; }
  #menuOverlay select, #menuOverlay input[type="number"] { width: 100%; padding: 6px 10px; background: #0d0806; border: 1px solid #5a3d24; color: #f0e2c8; font-size: 13px; font-family: inherit; outline: none; }
  #menuOverlay select { cursor: default; }
  #menuOverlay input[type="range"] { width: 100%; accent-color: #d8a84e; margin: 2px 0 1px; }
  #menuOverlay input[type="range"]:disabled { opacity: 0.4; }
  #menuOverlay select:disabled, #menuOverlay input:disabled { opacity: 0.4; cursor: default; }
  #panel select:disabled, #panel input:disabled { opacity: 0.4; cursor: default; }
  #panel .msSelect.disabled { opacity: 0.4; }
  #menuOverlay label.disabled { opacity: 0.4; }
  #panel label.disabled { opacity: 0.4; }
  #menuOverlay button.secondary:disabled { opacity: 0.4; cursor: default; }
  #menuOverlay button.secondary:disabled:hover { background: transparent; }
  #gpDropdown { position: fixed; width: 260px; max-height: 240px; overflow-y: auto; background: #0d0806; border: 1px solid #d8a84e; box-shadow: 0 4px 20px rgba(0,0,0,0.6); z-index: 40; display: none; }
  #confirmDialog { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 60; display: none; background: linear-gradient(180deg,#1c1210,#0c0706); border: 1px solid #7a4a1f; box-shadow: 0 0 60px rgba(0,0,0,0.7); padding: 22px 26px; color: #e8d5b5; width: 320px; max-width: 90vw; text-align: center; cursor: default; user-select: none; }
  #confirmDialogText { font-size: 14px; margin-bottom: 18px; line-height: 1.4; }
  #confirmDialog .row { display: flex; gap: 10px; margin-top: 0; }
  #confirmDialog button { flex: 1; padding: 10px; border: 1px solid #d8a84e; background: #7a2020; color: #f0e2c8; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; cursor: default; }
  #confirmDialog button.secondary { background: transparent; }
  #gpDropdown .opt { padding: 8px 12px; color: #e8d5b5; font-size: 13px; overflow: hidden; white-space: nowrap; }
  #gpDropdown .opt:hover { background: #7a2020; color: #fff; }
  #gpDropdown .opt.disabled { opacity: 0.4; cursor: default; }
  #gpDropdown .opt.disabled:hover { background: none; }
  #gpDropdown .opt span { display: inline-block; }
  #gpDropdown .opt.scrolling span { animation: gpMarquee 4s linear infinite; padding-right: 40px; }
  @keyframes gpMarquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  #gpDropdown .opt.hi { background: #7a2020; color: #fff; }
  #panel select:focus, #panel input:focus { border-color: #d8a84e; }
  #panel .row { display: flex; gap: 10px; margin-top: 20px; }
  #panel .row.rowTight { margin-top: 8px; }
  #panel button { flex: 1; padding: 10px; border: 1px solid #d8a84e; background: #7a2020; color: #f0e2c8; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; cursor: default; }
  #panel button.secondary { background: transparent; }
  #panel button:hover { background: #9a2a2a; }
  #panel button.secondary:hover { background: rgba(255,255,255,0.08); }
</style></head>
<body>
<div id="hud">
  <div id="crosshair"></div>
  <input id="cinemaConsoleInput" type="text" tabindex="-1" autocomplete="off" />
  <div id="cinemaConsoleIndicator"></div>
  <div id="tooltip"></div>
  <div id="instructions">Loading movies from Jellyfin …</div>
  <div id="loadProgress"></div>
</div>
<div id="panel">
  <h2>Kiosk</h2>
  <div id="panelGrid">
  <div class="grpHead">Sort</div>
  <div id="panelSortDefaultNote">*Default sort values below aren't hardcoded — they define how Cinema starts.<br />Change them in config to set own preferred defaults on new Cinema startup</div>
  <label>Sort By</label>
  <select id="sortSelect">
    <option value="SortName">Name</option>
    <option value="Random">Random</option>
    <option value="CommunityRating">Community Rating</option>
    <option value="CriticRating">Critics Rating</option>
    <option value="DateCreated">Date Added</option>
    <option value="DatePlayed">Date Played</option>
    <option value="OfficialRating">Parental Rating</option>
    <option value="PlayCount">Play Count</option>
    <option value="PremiereDate">Release Date</option>
    <option value="Runtime">Runtime</option>
  </select>
  <label>Sort Order</label>
  <select id="sortDirSelect">
    <option value="Ascending">Ascending</option>
    <option value="Descending">Descending</option>
  </select>
  <label>Sort Wall</label>
  <select id="layoutSelect">
    <option value="alternating">Alternating (opposite walls)</option>
    <option value="sequential">Sequential (same direction)</option>
    <option value="sequential-wrap">Sequential (diagonal wrap)</option>
  </select>
  <label>Start Wall</label>
  <select id="startWallSelect">
    <option value="left-screen">Left, from Screen</option>
    <option value="left-backwall">Left, from Backwall</option>
    <option value="right-screen">Right, from Screen</option>
    <option value="right-backwall">Right, from Backwall</option>
  </select>
  <label id="repeatModeLabel">If Fewer Results</label>
  <select id="repeatModeSelect">
    <option value="repeat">Repeat</option>
    <option value="norepeat">Don't Repeat</option>
  </select>
  <label id="gapPositionLabel">Gap Position</label>
  <select id="gapPositionSelect">
    <option value="end">Gap at End</option>
    <option value="center">Center Evenly (single wall)</option>
    <option value="center-second">Center Evenly (second wall)</option>
    <option value="balanced">Balanced Split</option>
  </select>
  <div class="grpHead">Filter</div>
  <label id="msFiltersLabel">Filters</label>
  <div class="msSelect" id="msFilters" tabindex="0">All</div>
  <label id="msFeaturesLabel">Features</label>
  <div class="msSelect" id="msFeatures" tabindex="0">All</div>
  <label id="msGenresLabel">Genres</label>
  <div class="msSelect" id="msGenres" tabindex="0">All genres</div>
  <label id="msRatingsLabel">Parental Ratings</label>
  <div class="msSelect" id="msRatings" tabindex="0">All ratings</div>
  <label id="msTagsLabel">Tags</label>
  <div class="msSelect" id="msTags" tabindex="0">All tags</div>
  <label id="msVideoTypesLabel">Video Types</label>
  <div class="msSelect" id="msVideoTypes" tabindex="0">All</div>
  <label id="msYearsLabel">Years</label>
  <div class="msSelect" id="msYears" tabindex="0">All years</div>
  <label id="msStudiosLabel">Studio</label>
  <div class="msSelect" id="msStudios" tabindex="0">All studios</div>
  <label id="msCollectionsLabel">Collections</label>
  <div class="msSelect" id="msCollections" tabindex="0">All collections</div>
  <label id="actorLabel">Actor</label>
  <input id="actorInput" placeholder="e.g. Tom Hanks" />
  <label id="movieLabel">Movie</label>
  <input id="movieInput" placeholder="e.g. Forrest Gump" />
  <div class="row"><button class="secondary" id="panelResetAll">Reset All</button></div>
  <div class="row rowTight">
    <button class="secondary" id="panelClose">Close</button>
    <button id="panelApply">Apply</button>
  </div>
  </div>
</div>
<div id="controlsOverlay">
  <h2>Controls</h2>
  <div id="controlsList"></div>
  <div class="row"><button class="secondary" id="controlsCloseBtn">Close</button></div>
</div>
<div id="gpDropdown"></div>
<div id="confirmDialog">
  <div id="confirmDialogText"></div>
  <div class="row">
    <button id="confirmDialogOk">Reset Defaults</button>
    <button class="secondary" id="confirmDialogCancel">Cancel</button>
  </div>
</div>
<div id="menuOverlay">
  <h2>Menu</h2>
  <div id="menuDefaultNote">*Default values below aren't hardcoded — they define how Cinema starts.<br />Change them in config to set own preferred defaults on new Cinema startup</div>
  <div id="menuTabs">
    <div class="menuTab" data-tab="controls">Controls</div>
    <div class="menuTab" data-tab="display">Display</div>
    <div class="menuTab" data-tab="room">Room</div>
    <div class="menuTab" data-tab="posters">Posters</div>
    <div class="menuTab" data-tab="backwall">Backwall</div>
    <div class="menuTab" data-tab="misc">Misc</div>
    <div class="menuTab" data-tab="credits">Credits</div>
  </div>
  <div id="menuScroll">
  <div class="tabPage" id="tabPage_controls">
  <div class="grpHead">Controls</div>
  <div class="subHead" style="margin-top:4px">Movement</div>
  <label style="margin:4px 0 2px">Movement Speed <span class="defaultHint" id="movementSpeedDefaultHint"></span> — <span id="movementSpeedValue">4</span></label>
  <input type="range" id="movementSpeedSlider" min="1" max="10" step="1" value="4" />
  <label class="toggleRow" style="margin:3px 0"><input type="checkbox" id="autoSprintToggle" checked /> Always Sprint <span class="defaultHint" id="autoSprintDefaultHint"></span></label>
  <label class="toggleRow" style="margin:3px 0"><input type="checkbox" id="jumpEnableToggle" checked /> Enable Jump <span class="defaultHint" id="jumpEnableDefaultHint"></span></label>
  <label class="toggleRow" style="margin:3px 0"><input type="checkbox" id="crouchEnableToggle" checked /> Enable Crouch <span class="defaultHint" id="crouchEnableDefaultHint"></span></label>
  <label id="crouchModeLabel" style="margin:4px 0 2px">Crouch Mode</label>
  <select id="crouchModeSelect">
    <option value="hold">Hold</option>
    <option value="toggle">Toggle</option>
  </select>
  <div class="subHead" style="margin-top:4px">Controller</div>
  <label class="toggleRow" style="margin:3px 0"><input type="checkbox" id="controllerMovementToggle" checked /> Controller Movement <span class="defaultHint" id="controllerMovementDefaultHint"></span></label>
  <label id="controllerSelectLabel" style="margin:4px 0 2px">Active Controller</label>
  <select id="controllerSelect"><option value="">No Controller available</option></select>
  <label id="deadzoneLabel" style="margin:4px 0 2px">Stick Deadzone <span class="defaultHint" id="deadzoneDefaultHint"></span> — <span id="deadzoneValue">0.20</span></label>
  <input type="range" id="deadzoneSlider" min="0" max="10" step="1" value="4" />
  <label id="sensitivityLabel" style="margin:4px 0 2px">Look Sensitivity <span class="defaultHint" id="sensitivityDefaultHint"></span> — <span id="sensitivityValue">20%</span></label>
  <input type="range" id="sensitivitySlider" min="0" max="19" step="1" value="3" />
  <div class="subHead" style="margin-top:4px">Keyboard Navigation</div>
  <label class="toggleRow" style="margin:3px 0"><input type="checkbox" id="cinemaKeyboardEnabledToggle" checked /> Enable Keyboard Commands <span style="color:#5a4c3c; font-size:9px;">(ENTER key when there is no menu or interactive object)</span> <span class="defaultHint" id="cinemaKeyboardEnabledDefaultHint"></span></label>
  <label id="cinemaKeyboardColorLabel" style="margin:4px 0 2px">Indicator Color <span class="defaultHint" id="cinemaKeyboardColorDefaultHint"></span></label>
  <input type="text" id="cinemaKeyboardColorInput" value="#00ff41" />
  <label id="cinemaKeyboardPositionLabel" style="margin:4px 0 2px">Indicator Position</label>
  <select id="cinemaKeyboardPositionSelect">
    <option value="top-left">Top Left</option>
    <option value="top-right">Top Right</option>
    <option value="bottom-left">Bottom Left</option>
    <option value="bottom-right">Bottom Right</option>
    <option value="top-center">Top Center</option>
    <option value="center-center">Center</option>
    <option value="bottom-center">Bottom Center</option>
  </select>
  <label id="cinemaKeyboardIdleLabel" style="margin:4px 0 2px">Idle Timeout (seconds) <span class="defaultHint" id="cinemaKeyboardIdleDefaultHint"></span></label>
  <input type="number" id="cinemaKeyboardIdleInput" min="0.5" max="10" step="0.5" value="3.5" />
  </div>
  <div class="tabPage" id="tabPage_display">
  <div class="grpHead">Display</div>
  <label class="toggleRow"><input type="checkbox" id="hudToggle" /> Crosshair <span class="defaultHint" id="hudDefaultHint"></span></label>
  <label class="toggleRow"><input type="checkbox" id="controlsUiToggle" checked /> Controls &amp; UI Overlay <span class="defaultHint" id="controlsUiDefaultHint"></span></label>
  <label>Field of View <span class="defaultHint" id="fovDefaultHint"></span> — <span id="fovValue">65°</span></label>
  <input type="range" id="fovSlider" min="60" max="120" step="1" value="65" />
  <label>Room Brightness (Light Off) <span class="defaultHint" id="audienceBrightnessDefaultHint"></span> — <span id="audienceBrightnessValue">0</span></label>
  <input type="range" id="audienceBrightnessSlider" min="-10" max="10" step="1" value="0" />
  <label>Room Brightness (Light On) <span class="defaultHint" id="cinemaBrightnessDefaultHint"></span> — <span id="cinemaBrightnessValue">0</span></label>
  <input type="range" id="cinemaBrightnessSlider" min="-10" max="10" step="1" value="0" />
  <label>Front Wall Brightness (Light Off) <span class="defaultHint" id="frontWallBrightnessOffDefaultHint"></span> — <span id="frontWallBrightnessOffValue">1.00</span></label>
  <input type="range" id="frontWallBrightnessOffSlider" min="0" max="100" step="1" value="100" />
  <label>Front Wall Brightness (Light On) <span class="defaultHint" id="frontWallBrightnessOnDefaultHint"></span> — <span id="frontWallBrightnessOnValue">0.80</span></label>
  <input type="range" id="frontWallBrightnessOnSlider" min="0" max="100" step="1" value="80" />
  <label>Backwall Brightness (Light Off) <span class="defaultHint" id="backwallBrightnessOffDefaultHint"></span> — <span id="backwallBrightnessOffValue">0.45</span></label>
  <input type="range" id="backwallBrightnessOffSlider" min="0" max="100" step="1" value="45" />
  <label>Backwall Brightness (Light On) <span class="defaultHint" id="backwallBrightnessOnDefaultHint"></span> — <span id="backwallBrightnessOnValue">0.80</span></label>
  <input type="range" id="backwallBrightnessOnSlider" min="0" max="100" step="1" value="80" />
  <label>Poster Wall Brightness (Light Off) <span class="defaultHint" id="posterWallBrightnessOffDefaultHint"></span> — <span id="posterWallBrightnessOffValue">0.30</span></label>
  <input type="range" id="posterWallBrightnessOffSlider" min="0" max="100" step="1" value="30" />
  <label>Poster Wall Brightness (Light On) <span class="defaultHint" id="posterWallBrightnessOnDefaultHint"></span> — <span id="posterWallBrightnessOnValue">0.65</span></label>
  <input type="range" id="posterWallBrightnessOnSlider" min="0" max="100" step="1" value="65" />
  <label>Poster Light Brightness <span class="defaultHint" id="posterLightBrightnessDefaultHint"></span> — <span id="posterLightBrightnessValue">0.05</span></label>
  <input type="range" id="posterLightBrightnessSlider" min="0" max="100" step="1" value="5" />
  </div>
  <div class="tabPage" id="tabPage_room">
  <div class="grpHead">Room</div>
  <label>Room Design</label>
  <select id="roomDesignSelect">
    <option value="velvet">Velvet</option>
    <option value="starship">Starship</option>
    <option value="neon">Neon</option>
    <option value="cyber">Cyber</option>
    <option value="classic">Classic</option>
    <option value="lounge">Lounge</option>
  </select>
  <label>Cinema Room Size</label>
  <select id="roomSizeSelect">
    <option value="10" id="roomSizeOpt10">10 Posters</option>
    <option value="20" id="roomSizeOpt20">20 Posters</option>
    <option value="30" id="roomSizeOpt30">30 Posters</option>
  </select>
  <label id="roomScaleModeLabel">Room Scale Mode</label>
  <select id="roomScaleModeSelect">
    <option value="length">Length Only</option>
    <option value="full">Full Scale</option>
  </select>
  <label id="scaleMovementSpeedLabel" class="toggleRow"><input type="checkbox" id="scaleMovementSpeedToggle" /> Scale Movement Speed with Room Scale <span class="defaultHint" id="scaleMovementSpeedDefaultHint"></span></label>
  <label id="scalePlayerPositionLabel" class="toggleRow"><input type="checkbox" id="scalePlayerPositionToggle" /> Scale Player Position with Room Scale <span class="defaultHint" id="scalePlayerPositionDefaultHint"></span></label>
  <div class="subHead">Objects</div>
  <label class="toggleRow"><input type="checkbox" id="ropeBarrierToggle" checked /> Show Rope Barrier in Front of Screen <span class="defaultHint" id="ropeBarrierDefaultHint"></span></label>
  <label id="kioskShowModeLabel">Show Kiosk in Room</label>
  <select id="kioskShowModeSelect">
    <option value="off">Off</option>
    <option value="dynamic">Deploy Dynamically</option>
    <option value="always">Show Always</option>
  </select>
  <label class="toggleRow" id="kioskLogoToggleLabel"><input type="checkbox" id="kioskLogoToggle" checked /> Kiosk Rotating 3D Clearlogo <span class="defaultHint" id="kioskLogoDefaultHint"></span></label>
  <label id="kioskBrandingModeLabel">Cinema Logo</label>
  <select id="kioskBrandingModeSelect">
    <option value="off">Off</option>
    <option value="whenIdle">When Idle</option>
    <option value="whenIdleOrMissing">When Idle or Missing</option>
    <option value="always">Always (Override)</option>
  </select>
  <label id="kioskLogoSpeedLabel">Logo Rotation Speed <span class="defaultHint" id="kioskLogoSpeedValue"></span></label>
  <input type="range" id="kioskLogoSpeedSlider" min="0" max="5" step="1" />
  <label id="kioskLogoGlitchFreqLabel">Logo Glitch Frequency <span class="defaultHint" id="kioskLogoGlitchFreqValue"></span></label>
  <input type="range" id="kioskLogoGlitchFreqSlider" min="0" max="5" step="1" />
  <label id="kioskLogoGlitchIntensityLabel">Logo Glitch Intensity <span class="defaultHint" id="kioskLogoGlitchIntensityValue"></span></label>
  <input type="range" id="kioskLogoGlitchIntensitySlider" min="0" max="5" step="1" />
  </div>
  <div class="tabPage" id="tabPage_posters">
  <div class="grpHead">Posters</div>
  <label>Enabled Tabs</label>
  <div class="msSelect" id="msPosterMenuTabs" tabindex="0">All</div>
  <label class="toggleRow"><input type="checkbox" id="hideUnavailableToggle" /> Hide Unavailable Items <span class="defaultHint" id="hideUnavailableDefaultHint"></span></label>
  <label>Movie</label>
  <div class="msSelect" id="msEnvMovie" tabindex="0">All</div>
  <label id="volMovieLabel">Movie Volume <span class="defaultHint" id="volMovieDefaultHint"></span> — <span id="volMovieValue">100%</span></label>
  <input type="range" id="volMovieSlider" min="0" max="100" step="1" value="100" />
  <label class="toggleRow"><input type="checkbox" id="loopMovieToggle" /> Loop Movie <span class="defaultHint" id="loopMovieDefaultHint"></span></label>
  <label class="toggleRow" id="afterMovieThemeSongLabel"><input type="checkbox" id="afterMovieThemeSongToggle" /> Play Theme Song Afterwards <span class="defaultHint" id="afterMovieThemeSongDefaultHint"></span></label>
  <label class="toggleRow" id="afterMovieScreenArtLabel"><input type="checkbox" id="afterMovieScreenArtToggle" /> Show Front Screen Art Afterwards <span class="defaultHint" id="afterMovieScreenArtDefaultHint"></span></label>
  <label>Trailer</label>
  <div class="msSelect" id="msEnvTrailer" tabindex="0">All</div>
  <label id="volTrailerLabel">Trailer Volume <span class="defaultHint" id="volTrailerDefaultHint"></span> — <span id="volTrailerValue">100%</span></label>
  <input type="range" id="volTrailerSlider" min="0" max="100" step="1" value="100" />
  <label id="trailerPlaybackOrderLabel">Trailer Playback Order <span class="defaultHint" id="trailerPlaybackOrderDefaultHint"></span></label>
  <select id="trailerPlaybackOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label class="toggleRow"><input type="checkbox" id="loopTrailerToggle" /> Loop Trailer <span class="defaultHint" id="loopTrailerDefaultHint"></span></label>
  <label class="toggleRow" id="afterTrailerThemeSongLabel"><input type="checkbox" id="afterTrailerThemeSongToggle" /> Play Theme Song Afterwards <span class="defaultHint" id="afterTrailerThemeSongDefaultHint"></span></label>
  <label class="toggleRow" id="afterTrailerScreenArtLabel"><input type="checkbox" id="afterTrailerScreenArtToggle" /> Show Front Screen Art Afterwards <span class="defaultHint" id="afterTrailerScreenArtDefaultHint"></span></label>
  <label class="toggleRow"><input type="checkbox" id="replaceAudioTrailerToggle" /> Replace Audio with Theme Song <span class="defaultHint" id="replaceAudioTrailerDefaultHint"></span></label>
  <label id="trailerReplaceAudioOrderLabel">Replace Audio Order <span class="defaultHint" id="trailerReplaceAudioOrderDefaultHint"></span></label>
  <select id="trailerReplaceAudioOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="trailerReplaceAudioStartPositionLabel">Replace Audio Start Position <span class="defaultHint" id="trailerReplaceAudioStartPositionDefaultHint"></span></label>
  <select id="trailerReplaceAudioStartPositionSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="trailerReplaceAudioStartMinLabel">Random Start — Min % <span class="defaultHint" id="trailerReplaceAudioStartMinDefaultHint"></span></label>
  <input id="trailerReplaceAudioStartMinInput" type="number" min="0" max="100" step="1" value="0" />
  <label id="trailerReplaceAudioStartMaxLabel">Random Start — Max % <span class="defaultHint" id="trailerReplaceAudioStartMaxDefaultHint"></span></label>
  <input id="trailerReplaceAudioStartMaxInput" type="number" min="0" max="100" step="1" value="50" />
  <label id="noThemeSongFallbackTrailerLabel">If No Theme Song Available <span class="defaultHint" id="noThemeSongFallbackTrailerDefaultHint"></span></label>
  <select id="noThemeSongFallbackTrailerSelect">
    <option value="keep">Keep Original Audio</option>
    <option value="mute">Mute</option>
  </select>
  <label>Theme Video</label>
  <div class="msSelect" id="msEnvThemeVideo" tabindex="0">All</div>
  <label id="volThemeVideoLabel">Theme Video Volume <span class="defaultHint" id="volThemeVideoDefaultHint"></span> — <span id="volThemeVideoValue">100%</span></label>
  <input type="range" id="volThemeVideoSlider" min="0" max="100" step="1" value="100" />
  <label id="themeVideoPlaybackOrderLabel">Theme Video Playback Order <span class="defaultHint" id="themeVideoPlaybackOrderDefaultHint"></span></label>
  <select id="themeVideoPlaybackOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label class="toggleRow"><input type="checkbox" id="loopThemeVideoToggle" checked /> Loop Theme Video <span class="defaultHint" id="loopThemeVideoDefaultHint"></span></label>
  <label class="toggleRow" id="afterThemeVideoThemeSongLabel"><input type="checkbox" id="afterThemeVideoThemeSongToggle" /> Play Theme Song Afterwards <span class="defaultHint" id="afterThemeVideoThemeSongDefaultHint"></span></label>
  <label class="toggleRow" id="afterThemeVideoScreenArtLabel"><input type="checkbox" id="afterThemeVideoScreenArtToggle" /> Show Front Screen Art Afterwards <span class="defaultHint" id="afterThemeVideoScreenArtDefaultHint"></span></label>
  <label class="toggleRow"><input type="checkbox" id="replaceAudioThemeVideoToggle" /> Replace Audio with Theme Song <span class="defaultHint" id="replaceAudioThemeVideoDefaultHint"></span></label>
  <label id="themeVideoReplaceAudioOrderLabel">Replace Audio Order <span class="defaultHint" id="themeVideoReplaceAudioOrderDefaultHint"></span></label>
  <select id="themeVideoReplaceAudioOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="themeVideoReplaceAudioStartPositionLabel">Replace Audio Start Position <span class="defaultHint" id="themeVideoReplaceAudioStartPositionDefaultHint"></span></label>
  <select id="themeVideoReplaceAudioStartPositionSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="themeVideoReplaceAudioStartMinLabel">Random Start — Min % <span class="defaultHint" id="themeVideoReplaceAudioStartMinDefaultHint"></span></label>
  <input id="themeVideoReplaceAudioStartMinInput" type="number" min="0" max="100" step="1" value="0" />
  <label id="themeVideoReplaceAudioStartMaxLabel">Random Start — Max % <span class="defaultHint" id="themeVideoReplaceAudioStartMaxDefaultHint"></span></label>
  <input id="themeVideoReplaceAudioStartMaxInput" type="number" min="0" max="100" step="1" value="50" />
  <label id="noThemeSongFallbackThemeVideoLabel">If No Theme Song Available <span class="defaultHint" id="noThemeSongFallbackThemeVideoDefaultHint"></span></label>
  <select id="noThemeSongFallbackThemeVideoSelect">
    <option value="keep">Keep Original Audio</option>
    <option value="mute">Mute</option>
  </select>
  <label>Theme Song</label>
  <div class="msSelect" id="msEnvThemeSong" tabindex="0">All</div>
  <label id="volThemeSongLabel">Theme Song Volume <span class="defaultHint" id="volThemeSongDefaultHint"></span> — <span id="volThemeSongValue">100%</span></label>
  <input type="range" id="volThemeSongSlider" min="0" max="100" step="1" value="100" />
  <label class="toggleRow"><input type="checkbox" id="loopThemeSongToggle" checked /> Loop Theme Song <span class="defaultHint" id="loopThemeSongDefaultHint"></span></label>
  <label id="themeSongPlaybackOrderLabel">Theme Song Playback Order <span class="defaultHint" id="themeSongPlaybackOrderDefaultHint"></span></label>
  <select id="themeSongPlaybackOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="themeSongStartPositionLabel">Theme Song Start Position <span class="defaultHint" id="themeSongStartPositionDefaultHint"></span></label>
  <select id="themeSongStartPositionSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="themeSongStartMinLabel">Random Start — Min % <span class="defaultHint" id="themeSongStartMinDefaultHint"></span></label>
  <input id="themeSongStartMinInput" type="number" min="0" max="100" step="1" value="0" />
  <label id="themeSongStartMaxLabel">Random Start — Max % <span class="defaultHint" id="themeSongStartMaxDefaultHint"></span></label>
  <input id="themeSongStartMaxInput" type="number" min="0" max="100" step="1" value="50" />
  <label id="themeSongDelayedStartLabel">Theme Song Delayed Start (Seconds) <span class="defaultHint" id="themeSongDelayedStartDefaultHint"></span></label>
  <input id="themeSongDelayedStartInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="themeSongDelayedStartFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="themeSongDelayedStartFirstOnlyToggle" checked /> If More Than One Song, Delayed Start Affects Only First <span class="defaultHint" id="themeSongDelayedStartFirstOnlyDefaultHint"></span></label>
  <label id="themeSongFadeInLabel">Theme Song Fade In (Seconds) <span class="defaultHint" id="themeSongFadeInDefaultHint"></span></label>
  <input id="themeSongFadeInInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="themeSongFadeOutLabel">Theme Song Fade Out (Seconds) <span class="defaultHint" id="themeSongFadeOutDefaultHint"></span></label>
  <input id="themeSongFadeOutInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="themeSongFadeFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="themeSongFadeFirstOnlyToggle" /> If More Than One Song, Fade In / Fade Out Affects Only First <span class="defaultHint" id="themeSongFadeFirstOnlyDefaultHint"></span></label>
  <label>Fanart Wall</label>
  <div class="msSelect" id="msEnvFanartWall" tabindex="0">All</div>
  <div class="grpHead">Ambient Mode</div>
  <!-- Only ONE shared set of profile-level fields exists — switching
       the profile selector below RELOADS these (and every step block
       further down) from that profile's own stored data, rather than
       tripling the whole form for 3 separate profiles at once. The
       profile being edited IS the profile that plays; there's no
       separate "active" vs "editing" state. -->
  <label>Editing Profile</label>
  <select id="ambientProfileSelect">
    <option value="1">Profile 1</option>
    <option value="2">Profile 2</option>
    <option value="3">Profile 3</option>
  </select>
  <!-- Session edits aren't persisted at all (by design, see the loop
       toggle above and every step below) — a name typed here would be
       gone on the next reload regardless, so there's no live input for
       it; only the config-level default can actually give a profile a
       lasting name. -->
  <div class="defaultHint">Custom profile names can be set in the config.</div>
  <label class="toggleRow"><input type="checkbox" id="ambientProfileLoopToggle" /> Loop Whole Ambient Mode <span class="defaultHint" id="ambientProfileLoopDefaultHint"></span></label>
  <label>Number of Sequences</label>
  <select id="ambientSequenceCountSelect">
    <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
    <option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option>
  </select>
  
  <div class="ambientSequenceBlock" id="ambientSequenceBlock1">
  <div class="grpHead ambientSequenceHead">Sequence 1</div>
  <label>Poster Effect</label>
  <select id="ambientSequence1EffectSelect">
    <option value="movie">Movie</option>
    <option value="trailer">Trailer</option>
    <option value="themevideo">Theme Video</option>
    <option value="themesong">Theme Song</option>
    <option value="fanartwall">Fanart Wall</option>
  </select>
  <label id="ambientSequence1VolumeLabel">Volume <span class="defaultHint">(default: 100)</span> <span class="defaultHint" id="ambientSequence1VolumeValue"></span></label>
  <input type="range" id="ambientSequence1VolumeSlider" min="0" max="100" step="1" value="100" />
  <label id="ambientSequence1LoopLabel" class="toggleRow"><input type="checkbox" id="ambientSequence1LoopToggle" /> Loop (if media duration is shorter than sequence duration) <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence1DurationTypeLabel">Duration</label>
  <select id="ambientSequence1DurationTypeSelect">
    <option value="count" id="ambientSequence1DurationTypeCountOpt">Play N Times</option>
    <option value="time">Play For N Seconds</option>
  </select>
  <label id="ambientSequence1DurationValueLabel">Value <span class="defaultHint" id="ambientSequence1DurationValueDefaultHint"></span></label>
  <input id="ambientSequence1DurationValueInput" type="number" min="1" max="3600" step="1" value="1" />
  <label id="ambientSequence1PlaybackOrderLabel">Playback Order</label>
  <select id="ambientSequence1PlaybackOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="ambientSequence1MovieStartLabel">Movie Start</label>
  <select id="ambientSequence1MovieStartModeSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Position</option>
  </select>
  <label id="ambientSequence1MovieStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 10)</span></label>
  <input id="ambientSequence1MovieStartMinInput" type="number" min="0" max="100" step="1" value="10" />
  <label id="ambientSequence1MovieStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 90)</span></label>
  <input id="ambientSequence1MovieStartMaxInput" type="number" min="0" max="100" step="1" value="90" />
  <label id="ambientSequence1ThemeSongStartPositionLabel">Theme Song Start Position <span class="defaultHint">(default: From Beginning)</span></label>
  <select id="ambientSequence1ThemeSongStartPositionSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="ambientSequence1ThemeSongStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence1ThemeSongStartMinInput" type="number" min="0" max="100" step="1" value="0" />
  <label id="ambientSequence1ThemeSongStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 50)</span></label>
  <input id="ambientSequence1ThemeSongStartMaxInput" type="number" min="0" max="100" step="1" value="50" />
  <label id="ambientSequence1ThemeSongDelayedStartLabel">Theme Song Delayed Start (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence1ThemeSongDelayedStartInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence1ThemeSongDelayedStartFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence1ThemeSongDelayedStartFirstOnlyToggle" checked /> If More Than One Song, Delayed Start Affects Only First <span class="defaultHint">(default: on)</span></label>
  <label id="ambientSequence1ThemeSongFadeInLabel">Theme Song Fade In (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence1ThemeSongFadeInInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence1ThemeSongFadeOutLabel">Theme Song Fade Out (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence1ThemeSongFadeOutInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence1ThemeSongFadeFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence1ThemeSongFadeFirstOnlyToggle" /> If More Than One Song, Fade In / Fade Out Affects Only First <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence1ThemeSongEarlyEndLabel">Theme Song Early End (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence1ThemeSongEarlyEndInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence1ReplaceAudioLabel" class="toggleRow"><input type="checkbox" id="ambientSequence1ReplaceAudioToggle" /> Replace Audio with Theme Song <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence1ReplaceAudioOrderLabel">Replacement Song</label>
  <select id="ambientSequence1ReplaceAudioOrderSelect">
    <option value="first">Play First</option>
    <option value="random">Play One Random</option>
  </select>
  <label>Environment Effects</label>
  <div class="msSelect" id="ambientSequence1EnvSelect" tabindex="0">All</div>
  <label id="ambientSequence1FallbackLabel">Fallback (if this sequence can't play)</label>
  <select id="ambientSequence1FallbackSelect">
    <option value="skip">Skip This Step</option>
    <option value="empty">Empty (Effects Only)</option>
    <option value="movie">Fallback to Movie</option>
    <option value="trailer">Fallback to Trailer</option>
    <option value="themevideo">Fallback to Theme Video</option>
    <option value="themesong">Fallback to Theme Song</option>
    <option value="fanartwall">Fallback to Fanart Wall</option>
    <option value="previous">Fallback to Previous Step</option>
    
  </select>
  <label id="ambientSequence1FrontArtEarlyFadeLabel">Front Art Early Fade Out when next Sequence is Video (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence1FrontArtEarlyFadeInput" type="number" min="0" max="3600" step="1" value="0" />
  </div>
  <div class="ambientSequenceBlock" id="ambientSequenceBlock2">
  <div class="grpHead ambientSequenceHead">Sequence 2</div>
  <label>Poster Effect</label>
  <select id="ambientSequence2EffectSelect">
    <option value="movie">Movie</option>
    <option value="trailer">Trailer</option>
    <option value="themevideo">Theme Video</option>
    <option value="themesong">Theme Song</option>
    <option value="fanartwall">Fanart Wall</option>
  </select>
  <label id="ambientSequence2VolumeLabel">Volume <span class="defaultHint">(default: 100)</span> <span class="defaultHint" id="ambientSequence2VolumeValue"></span></label>
  <input type="range" id="ambientSequence2VolumeSlider" min="0" max="100" step="1" value="100" />
  <label id="ambientSequence2LoopLabel" class="toggleRow"><input type="checkbox" id="ambientSequence2LoopToggle" /> Loop (if media duration is shorter than sequence duration) <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence2DurationTypeLabel">Duration</label>
  <select id="ambientSequence2DurationTypeSelect">
    <option value="count" id="ambientSequence2DurationTypeCountOpt">Play N Times</option>
    <option value="time">Play For N Seconds</option>
  </select>
  <label id="ambientSequence2DurationValueLabel">Value <span class="defaultHint" id="ambientSequence2DurationValueDefaultHint"></span></label>
  <input id="ambientSequence2DurationValueInput" type="number" min="1" max="3600" step="1" value="1" />
  <label id="ambientSequence2PlaybackOrderLabel">Playback Order</label>
  <select id="ambientSequence2PlaybackOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="ambientSequence2MovieStartLabel">Movie Start</label>
  <select id="ambientSequence2MovieStartModeSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Position</option>
  </select>
  <label id="ambientSequence2MovieStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 10)</span></label>
  <input id="ambientSequence2MovieStartMinInput" type="number" min="0" max="100" step="1" value="10" />
  <label id="ambientSequence2MovieStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 90)</span></label>
  <input id="ambientSequence2MovieStartMaxInput" type="number" min="0" max="100" step="1" value="90" />
  <label id="ambientSequence2ThemeSongStartPositionLabel">Theme Song Start Position <span class="defaultHint">(default: From Beginning)</span></label>
  <select id="ambientSequence2ThemeSongStartPositionSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="ambientSequence2ThemeSongStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence2ThemeSongStartMinInput" type="number" min="0" max="100" step="1" value="0" />
  <label id="ambientSequence2ThemeSongStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 50)</span></label>
  <input id="ambientSequence2ThemeSongStartMaxInput" type="number" min="0" max="100" step="1" value="50" />
  <label id="ambientSequence2ThemeSongDelayedStartLabel">Theme Song Delayed Start (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence2ThemeSongDelayedStartInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence2ThemeSongDelayedStartFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence2ThemeSongDelayedStartFirstOnlyToggle" checked /> If More Than One Song, Delayed Start Affects Only First <span class="defaultHint">(default: on)</span></label>
  <label id="ambientSequence2ThemeSongFadeInLabel">Theme Song Fade In (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence2ThemeSongFadeInInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence2ThemeSongFadeOutLabel">Theme Song Fade Out (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence2ThemeSongFadeOutInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence2ThemeSongFadeFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence2ThemeSongFadeFirstOnlyToggle" /> If More Than One Song, Fade In / Fade Out Affects Only First <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence2ThemeSongEarlyEndLabel">Theme Song Early End (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence2ThemeSongEarlyEndInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence2ReplaceAudioLabel" class="toggleRow"><input type="checkbox" id="ambientSequence2ReplaceAudioToggle" /> Replace Audio with Theme Song <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence2ReplaceAudioOrderLabel">Replacement Song</label>
  <select id="ambientSequence2ReplaceAudioOrderSelect">
    <option value="first">Play First</option>
    <option value="random">Play One Random</option>
  </select>
  <label>Environment Effects</label>
  <div class="msSelect" id="ambientSequence2EnvSelect" tabindex="0">All</div>
  <label id="ambientSequence2FallbackLabel">Fallback (if this sequence can't play)</label>
  <select id="ambientSequence2FallbackSelect">
    <option value="skip">Skip This Step</option>
    <option value="empty">Empty (Effects Only)</option>
    <option value="movie">Fallback to Movie</option>
    <option value="trailer">Fallback to Trailer</option>
    <option value="themevideo">Fallback to Theme Video</option>
    <option value="themesong">Fallback to Theme Song</option>
    <option value="fanartwall">Fallback to Fanart Wall</option>
    <option value="previous">Fallback to Previous Step</option>
    <option value="sequence:1">Fallback to Sequence 1</option>
  </select>
  <label id="ambientSequence2FrontArtEarlyFadeLabel">Front Art Early Fade Out when next Sequence is Video (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence2FrontArtEarlyFadeInput" type="number" min="0" max="3600" step="1" value="0" />
  </div>
  <div class="ambientSequenceBlock" id="ambientSequenceBlock3">
  <div class="grpHead ambientSequenceHead">Sequence 3</div>
  <label>Poster Effect</label>
  <select id="ambientSequence3EffectSelect">
    <option value="movie">Movie</option>
    <option value="trailer">Trailer</option>
    <option value="themevideo">Theme Video</option>
    <option value="themesong">Theme Song</option>
    <option value="fanartwall">Fanart Wall</option>
  </select>
  <label id="ambientSequence3VolumeLabel">Volume <span class="defaultHint">(default: 100)</span> <span class="defaultHint" id="ambientSequence3VolumeValue"></span></label>
  <input type="range" id="ambientSequence3VolumeSlider" min="0" max="100" step="1" value="100" />
  <label id="ambientSequence3LoopLabel" class="toggleRow"><input type="checkbox" id="ambientSequence3LoopToggle" /> Loop (if media duration is shorter than sequence duration) <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence3DurationTypeLabel">Duration</label>
  <select id="ambientSequence3DurationTypeSelect">
    <option value="count" id="ambientSequence3DurationTypeCountOpt">Play N Times</option>
    <option value="time">Play For N Seconds</option>
  </select>
  <label id="ambientSequence3DurationValueLabel">Value <span class="defaultHint" id="ambientSequence3DurationValueDefaultHint"></span></label>
  <input id="ambientSequence3DurationValueInput" type="number" min="1" max="3600" step="1" value="1" />
  <label id="ambientSequence3PlaybackOrderLabel">Playback Order</label>
  <select id="ambientSequence3PlaybackOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="ambientSequence3MovieStartLabel">Movie Start</label>
  <select id="ambientSequence3MovieStartModeSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Position</option>
  </select>
  <label id="ambientSequence3MovieStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 10)</span></label>
  <input id="ambientSequence3MovieStartMinInput" type="number" min="0" max="100" step="1" value="10" />
  <label id="ambientSequence3MovieStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 90)</span></label>
  <input id="ambientSequence3MovieStartMaxInput" type="number" min="0" max="100" step="1" value="90" />
  <label id="ambientSequence3ThemeSongStartPositionLabel">Theme Song Start Position <span class="defaultHint">(default: From Beginning)</span></label>
  <select id="ambientSequence3ThemeSongStartPositionSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="ambientSequence3ThemeSongStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence3ThemeSongStartMinInput" type="number" min="0" max="100" step="1" value="0" />
  <label id="ambientSequence3ThemeSongStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 50)</span></label>
  <input id="ambientSequence3ThemeSongStartMaxInput" type="number" min="0" max="100" step="1" value="50" />
  <label id="ambientSequence3ThemeSongDelayedStartLabel">Theme Song Delayed Start (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence3ThemeSongDelayedStartInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence3ThemeSongDelayedStartFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence3ThemeSongDelayedStartFirstOnlyToggle" checked /> If More Than One Song, Delayed Start Affects Only First <span class="defaultHint">(default: on)</span></label>
  <label id="ambientSequence3ThemeSongFadeInLabel">Theme Song Fade In (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence3ThemeSongFadeInInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence3ThemeSongFadeOutLabel">Theme Song Fade Out (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence3ThemeSongFadeOutInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence3ThemeSongFadeFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence3ThemeSongFadeFirstOnlyToggle" /> If More Than One Song, Fade In / Fade Out Affects Only First <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence3ThemeSongEarlyEndLabel">Theme Song Early End (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence3ThemeSongEarlyEndInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence3ReplaceAudioLabel" class="toggleRow"><input type="checkbox" id="ambientSequence3ReplaceAudioToggle" /> Replace Audio with Theme Song <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence3ReplaceAudioOrderLabel">Replacement Song</label>
  <select id="ambientSequence3ReplaceAudioOrderSelect">
    <option value="first">Play First</option>
    <option value="random">Play One Random</option>
  </select>
  <label>Environment Effects</label>
  <div class="msSelect" id="ambientSequence3EnvSelect" tabindex="0">All</div>
  <label id="ambientSequence3FallbackLabel">Fallback (if this sequence can't play)</label>
  <select id="ambientSequence3FallbackSelect">
    <option value="skip">Skip This Step</option>
    <option value="empty">Empty (Effects Only)</option>
    <option value="movie">Fallback to Movie</option>
    <option value="trailer">Fallback to Trailer</option>
    <option value="themevideo">Fallback to Theme Video</option>
    <option value="themesong">Fallback to Theme Song</option>
    <option value="fanartwall">Fallback to Fanart Wall</option>
    <option value="previous">Fallback to Previous Step</option>
    <option value="sequence:1">Fallback to Sequence 1</option><option value="sequence:2">Fallback to Sequence 2</option>
  </select>
  <label id="ambientSequence3FrontArtEarlyFadeLabel">Front Art Early Fade Out when next Sequence is Video (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence3FrontArtEarlyFadeInput" type="number" min="0" max="3600" step="1" value="0" />
  </div>
  <div class="ambientSequenceBlock" id="ambientSequenceBlock4">
  <div class="grpHead ambientSequenceHead">Sequence 4</div>
  <label>Poster Effect</label>
  <select id="ambientSequence4EffectSelect">
    <option value="movie">Movie</option>
    <option value="trailer">Trailer</option>
    <option value="themevideo">Theme Video</option>
    <option value="themesong">Theme Song</option>
    <option value="fanartwall">Fanart Wall</option>
  </select>
  <label id="ambientSequence4VolumeLabel">Volume <span class="defaultHint">(default: 100)</span> <span class="defaultHint" id="ambientSequence4VolumeValue"></span></label>
  <input type="range" id="ambientSequence4VolumeSlider" min="0" max="100" step="1" value="100" />
  <label id="ambientSequence4LoopLabel" class="toggleRow"><input type="checkbox" id="ambientSequence4LoopToggle" /> Loop (if media duration is shorter than sequence duration) <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence4DurationTypeLabel">Duration</label>
  <select id="ambientSequence4DurationTypeSelect">
    <option value="count" id="ambientSequence4DurationTypeCountOpt">Play N Times</option>
    <option value="time">Play For N Seconds</option>
  </select>
  <label id="ambientSequence4DurationValueLabel">Value <span class="defaultHint" id="ambientSequence4DurationValueDefaultHint"></span></label>
  <input id="ambientSequence4DurationValueInput" type="number" min="1" max="3600" step="1" value="1" />
  <label id="ambientSequence4PlaybackOrderLabel">Playback Order</label>
  <select id="ambientSequence4PlaybackOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="ambientSequence4MovieStartLabel">Movie Start</label>
  <select id="ambientSequence4MovieStartModeSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Position</option>
  </select>
  <label id="ambientSequence4MovieStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 10)</span></label>
  <input id="ambientSequence4MovieStartMinInput" type="number" min="0" max="100" step="1" value="10" />
  <label id="ambientSequence4MovieStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 90)</span></label>
  <input id="ambientSequence4MovieStartMaxInput" type="number" min="0" max="100" step="1" value="90" />
  <label id="ambientSequence4ThemeSongStartPositionLabel">Theme Song Start Position <span class="defaultHint">(default: From Beginning)</span></label>
  <select id="ambientSequence4ThemeSongStartPositionSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="ambientSequence4ThemeSongStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence4ThemeSongStartMinInput" type="number" min="0" max="100" step="1" value="0" />
  <label id="ambientSequence4ThemeSongStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 50)</span></label>
  <input id="ambientSequence4ThemeSongStartMaxInput" type="number" min="0" max="100" step="1" value="50" />
  <label id="ambientSequence4ThemeSongDelayedStartLabel">Theme Song Delayed Start (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence4ThemeSongDelayedStartInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence4ThemeSongDelayedStartFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence4ThemeSongDelayedStartFirstOnlyToggle" checked /> If More Than One Song, Delayed Start Affects Only First <span class="defaultHint">(default: on)</span></label>
  <label id="ambientSequence4ThemeSongFadeInLabel">Theme Song Fade In (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence4ThemeSongFadeInInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence4ThemeSongFadeOutLabel">Theme Song Fade Out (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence4ThemeSongFadeOutInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence4ThemeSongFadeFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence4ThemeSongFadeFirstOnlyToggle" /> If More Than One Song, Fade In / Fade Out Affects Only First <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence4ThemeSongEarlyEndLabel">Theme Song Early End (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence4ThemeSongEarlyEndInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence4ReplaceAudioLabel" class="toggleRow"><input type="checkbox" id="ambientSequence4ReplaceAudioToggle" /> Replace Audio with Theme Song <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence4ReplaceAudioOrderLabel">Replacement Song</label>
  <select id="ambientSequence4ReplaceAudioOrderSelect">
    <option value="first">Play First</option>
    <option value="random">Play One Random</option>
  </select>
  <label>Environment Effects</label>
  <div class="msSelect" id="ambientSequence4EnvSelect" tabindex="0">All</div>
  <label id="ambientSequence4FallbackLabel">Fallback (if this sequence can't play)</label>
  <select id="ambientSequence4FallbackSelect">
    <option value="skip">Skip This Step</option>
    <option value="empty">Empty (Effects Only)</option>
    <option value="movie">Fallback to Movie</option>
    <option value="trailer">Fallback to Trailer</option>
    <option value="themevideo">Fallback to Theme Video</option>
    <option value="themesong">Fallback to Theme Song</option>
    <option value="fanartwall">Fallback to Fanart Wall</option>
    <option value="previous">Fallback to Previous Step</option>
    <option value="sequence:1">Fallback to Sequence 1</option><option value="sequence:2">Fallback to Sequence 2</option><option value="sequence:3">Fallback to Sequence 3</option>
  </select>
  <label id="ambientSequence4FrontArtEarlyFadeLabel">Front Art Early Fade Out when next Sequence is Video (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence4FrontArtEarlyFadeInput" type="number" min="0" max="3600" step="1" value="0" />
  </div>
  <div class="ambientSequenceBlock" id="ambientSequenceBlock5">
  <div class="grpHead ambientSequenceHead">Sequence 5</div>
  <label>Poster Effect</label>
  <select id="ambientSequence5EffectSelect">
    <option value="movie">Movie</option>
    <option value="trailer">Trailer</option>
    <option value="themevideo">Theme Video</option>
    <option value="themesong">Theme Song</option>
    <option value="fanartwall">Fanart Wall</option>
  </select>
  <label id="ambientSequence5VolumeLabel">Volume <span class="defaultHint">(default: 100)</span> <span class="defaultHint" id="ambientSequence5VolumeValue"></span></label>
  <input type="range" id="ambientSequence5VolumeSlider" min="0" max="100" step="1" value="100" />
  <label id="ambientSequence5LoopLabel" class="toggleRow"><input type="checkbox" id="ambientSequence5LoopToggle" /> Loop (if media duration is shorter than sequence duration) <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence5DurationTypeLabel">Duration</label>
  <select id="ambientSequence5DurationTypeSelect">
    <option value="count" id="ambientSequence5DurationTypeCountOpt">Play N Times</option>
    <option value="time">Play For N Seconds</option>
  </select>
  <label id="ambientSequence5DurationValueLabel">Value <span class="defaultHint" id="ambientSequence5DurationValueDefaultHint"></span></label>
  <input id="ambientSequence5DurationValueInput" type="number" min="1" max="3600" step="1" value="1" />
  <label id="ambientSequence5PlaybackOrderLabel">Playback Order</label>
  <select id="ambientSequence5PlaybackOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="ambientSequence5MovieStartLabel">Movie Start</label>
  <select id="ambientSequence5MovieStartModeSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Position</option>
  </select>
  <label id="ambientSequence5MovieStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 10)</span></label>
  <input id="ambientSequence5MovieStartMinInput" type="number" min="0" max="100" step="1" value="10" />
  <label id="ambientSequence5MovieStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 90)</span></label>
  <input id="ambientSequence5MovieStartMaxInput" type="number" min="0" max="100" step="1" value="90" />
  <label id="ambientSequence5ThemeSongStartPositionLabel">Theme Song Start Position <span class="defaultHint">(default: From Beginning)</span></label>
  <select id="ambientSequence5ThemeSongStartPositionSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="ambientSequence5ThemeSongStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence5ThemeSongStartMinInput" type="number" min="0" max="100" step="1" value="0" />
  <label id="ambientSequence5ThemeSongStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 50)</span></label>
  <input id="ambientSequence5ThemeSongStartMaxInput" type="number" min="0" max="100" step="1" value="50" />
  <label id="ambientSequence5ThemeSongDelayedStartLabel">Theme Song Delayed Start (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence5ThemeSongDelayedStartInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence5ThemeSongDelayedStartFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence5ThemeSongDelayedStartFirstOnlyToggle" checked /> If More Than One Song, Delayed Start Affects Only First <span class="defaultHint">(default: on)</span></label>
  <label id="ambientSequence5ThemeSongFadeInLabel">Theme Song Fade In (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence5ThemeSongFadeInInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence5ThemeSongFadeOutLabel">Theme Song Fade Out (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence5ThemeSongFadeOutInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence5ThemeSongFadeFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence5ThemeSongFadeFirstOnlyToggle" /> If More Than One Song, Fade In / Fade Out Affects Only First <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence5ThemeSongEarlyEndLabel">Theme Song Early End (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence5ThemeSongEarlyEndInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence5ReplaceAudioLabel" class="toggleRow"><input type="checkbox" id="ambientSequence5ReplaceAudioToggle" /> Replace Audio with Theme Song <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence5ReplaceAudioOrderLabel">Replacement Song</label>
  <select id="ambientSequence5ReplaceAudioOrderSelect">
    <option value="first">Play First</option>
    <option value="random">Play One Random</option>
  </select>
  <label>Environment Effects</label>
  <div class="msSelect" id="ambientSequence5EnvSelect" tabindex="0">All</div>
  <label id="ambientSequence5FallbackLabel">Fallback (if this sequence can't play)</label>
  <select id="ambientSequence5FallbackSelect">
    <option value="skip">Skip This Step</option>
    <option value="empty">Empty (Effects Only)</option>
    <option value="movie">Fallback to Movie</option>
    <option value="trailer">Fallback to Trailer</option>
    <option value="themevideo">Fallback to Theme Video</option>
    <option value="themesong">Fallback to Theme Song</option>
    <option value="fanartwall">Fallback to Fanart Wall</option>
    <option value="previous">Fallback to Previous Step</option>
    <option value="sequence:1">Fallback to Sequence 1</option><option value="sequence:2">Fallback to Sequence 2</option><option value="sequence:3">Fallback to Sequence 3</option><option value="sequence:4">Fallback to Sequence 4</option>
  </select>
  <label id="ambientSequence5FrontArtEarlyFadeLabel">Front Art Early Fade Out when next Sequence is Video (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence5FrontArtEarlyFadeInput" type="number" min="0" max="3600" step="1" value="0" />
  </div>
  <div class="ambientSequenceBlock" id="ambientSequenceBlock6">
  <div class="grpHead ambientSequenceHead">Sequence 6</div>
  <label>Poster Effect</label>
  <select id="ambientSequence6EffectSelect">
    <option value="movie">Movie</option>
    <option value="trailer">Trailer</option>
    <option value="themevideo">Theme Video</option>
    <option value="themesong">Theme Song</option>
    <option value="fanartwall">Fanart Wall</option>
  </select>
  <label id="ambientSequence6VolumeLabel">Volume <span class="defaultHint">(default: 100)</span> <span class="defaultHint" id="ambientSequence6VolumeValue"></span></label>
  <input type="range" id="ambientSequence6VolumeSlider" min="0" max="100" step="1" value="100" />
  <label id="ambientSequence6LoopLabel" class="toggleRow"><input type="checkbox" id="ambientSequence6LoopToggle" /> Loop (if media duration is shorter than sequence duration) <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence6DurationTypeLabel">Duration</label>
  <select id="ambientSequence6DurationTypeSelect">
    <option value="count" id="ambientSequence6DurationTypeCountOpt">Play N Times</option>
    <option value="time">Play For N Seconds</option>
  </select>
  <label id="ambientSequence6DurationValueLabel">Value <span class="defaultHint" id="ambientSequence6DurationValueDefaultHint"></span></label>
  <input id="ambientSequence6DurationValueInput" type="number" min="1" max="3600" step="1" value="1" />
  <label id="ambientSequence6PlaybackOrderLabel">Playback Order</label>
  <select id="ambientSequence6PlaybackOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="ambientSequence6MovieStartLabel">Movie Start</label>
  <select id="ambientSequence6MovieStartModeSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Position</option>
  </select>
  <label id="ambientSequence6MovieStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 10)</span></label>
  <input id="ambientSequence6MovieStartMinInput" type="number" min="0" max="100" step="1" value="10" />
  <label id="ambientSequence6MovieStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 90)</span></label>
  <input id="ambientSequence6MovieStartMaxInput" type="number" min="0" max="100" step="1" value="90" />
  <label id="ambientSequence6ThemeSongStartPositionLabel">Theme Song Start Position <span class="defaultHint">(default: From Beginning)</span></label>
  <select id="ambientSequence6ThemeSongStartPositionSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="ambientSequence6ThemeSongStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence6ThemeSongStartMinInput" type="number" min="0" max="100" step="1" value="0" />
  <label id="ambientSequence6ThemeSongStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 50)</span></label>
  <input id="ambientSequence6ThemeSongStartMaxInput" type="number" min="0" max="100" step="1" value="50" />
  <label id="ambientSequence6ThemeSongDelayedStartLabel">Theme Song Delayed Start (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence6ThemeSongDelayedStartInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence6ThemeSongDelayedStartFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence6ThemeSongDelayedStartFirstOnlyToggle" checked /> If More Than One Song, Delayed Start Affects Only First <span class="defaultHint">(default: on)</span></label>
  <label id="ambientSequence6ThemeSongFadeInLabel">Theme Song Fade In (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence6ThemeSongFadeInInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence6ThemeSongFadeOutLabel">Theme Song Fade Out (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence6ThemeSongFadeOutInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence6ThemeSongFadeFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence6ThemeSongFadeFirstOnlyToggle" /> If More Than One Song, Fade In / Fade Out Affects Only First <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence6ThemeSongEarlyEndLabel">Theme Song Early End (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence6ThemeSongEarlyEndInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence6ReplaceAudioLabel" class="toggleRow"><input type="checkbox" id="ambientSequence6ReplaceAudioToggle" /> Replace Audio with Theme Song <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence6ReplaceAudioOrderLabel">Replacement Song</label>
  <select id="ambientSequence6ReplaceAudioOrderSelect">
    <option value="first">Play First</option>
    <option value="random">Play One Random</option>
  </select>
  <label>Environment Effects</label>
  <div class="msSelect" id="ambientSequence6EnvSelect" tabindex="0">All</div>
  <label id="ambientSequence6FallbackLabel">Fallback (if this sequence can't play)</label>
  <select id="ambientSequence6FallbackSelect">
    <option value="skip">Skip This Step</option>
    <option value="empty">Empty (Effects Only)</option>
    <option value="movie">Fallback to Movie</option>
    <option value="trailer">Fallback to Trailer</option>
    <option value="themevideo">Fallback to Theme Video</option>
    <option value="themesong">Fallback to Theme Song</option>
    <option value="fanartwall">Fallback to Fanart Wall</option>
    <option value="previous">Fallback to Previous Step</option>
    <option value="sequence:1">Fallback to Sequence 1</option><option value="sequence:2">Fallback to Sequence 2</option><option value="sequence:3">Fallback to Sequence 3</option><option value="sequence:4">Fallback to Sequence 4</option><option value="sequence:5">Fallback to Sequence 5</option>
  </select>
  <label id="ambientSequence6FrontArtEarlyFadeLabel">Front Art Early Fade Out when next Sequence is Video (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence6FrontArtEarlyFadeInput" type="number" min="0" max="3600" step="1" value="0" />
  </div>
  <div class="ambientSequenceBlock" id="ambientSequenceBlock7">
  <div class="grpHead ambientSequenceHead">Sequence 7</div>
  <label>Poster Effect</label>
  <select id="ambientSequence7EffectSelect">
    <option value="movie">Movie</option>
    <option value="trailer">Trailer</option>
    <option value="themevideo">Theme Video</option>
    <option value="themesong">Theme Song</option>
    <option value="fanartwall">Fanart Wall</option>
  </select>
  <label id="ambientSequence7VolumeLabel">Volume <span class="defaultHint">(default: 100)</span> <span class="defaultHint" id="ambientSequence7VolumeValue"></span></label>
  <input type="range" id="ambientSequence7VolumeSlider" min="0" max="100" step="1" value="100" />
  <label id="ambientSequence7LoopLabel" class="toggleRow"><input type="checkbox" id="ambientSequence7LoopToggle" /> Loop (if media duration is shorter than sequence duration) <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence7DurationTypeLabel">Duration</label>
  <select id="ambientSequence7DurationTypeSelect">
    <option value="count" id="ambientSequence7DurationTypeCountOpt">Play N Times</option>
    <option value="time">Play For N Seconds</option>
  </select>
  <label id="ambientSequence7DurationValueLabel">Value <span class="defaultHint" id="ambientSequence7DurationValueDefaultHint"></span></label>
  <input id="ambientSequence7DurationValueInput" type="number" min="1" max="3600" step="1" value="1" />
  <label id="ambientSequence7PlaybackOrderLabel">Playback Order</label>
  <select id="ambientSequence7PlaybackOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="ambientSequence7MovieStartLabel">Movie Start</label>
  <select id="ambientSequence7MovieStartModeSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Position</option>
  </select>
  <label id="ambientSequence7MovieStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 10)</span></label>
  <input id="ambientSequence7MovieStartMinInput" type="number" min="0" max="100" step="1" value="10" />
  <label id="ambientSequence7MovieStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 90)</span></label>
  <input id="ambientSequence7MovieStartMaxInput" type="number" min="0" max="100" step="1" value="90" />
  <label id="ambientSequence7ThemeSongStartPositionLabel">Theme Song Start Position <span class="defaultHint">(default: From Beginning)</span></label>
  <select id="ambientSequence7ThemeSongStartPositionSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="ambientSequence7ThemeSongStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence7ThemeSongStartMinInput" type="number" min="0" max="100" step="1" value="0" />
  <label id="ambientSequence7ThemeSongStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 50)</span></label>
  <input id="ambientSequence7ThemeSongStartMaxInput" type="number" min="0" max="100" step="1" value="50" />
  <label id="ambientSequence7ThemeSongDelayedStartLabel">Theme Song Delayed Start (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence7ThemeSongDelayedStartInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence7ThemeSongDelayedStartFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence7ThemeSongDelayedStartFirstOnlyToggle" checked /> If More Than One Song, Delayed Start Affects Only First <span class="defaultHint">(default: on)</span></label>
  <label id="ambientSequence7ThemeSongFadeInLabel">Theme Song Fade In (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence7ThemeSongFadeInInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence7ThemeSongFadeOutLabel">Theme Song Fade Out (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence7ThemeSongFadeOutInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence7ThemeSongFadeFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence7ThemeSongFadeFirstOnlyToggle" /> If More Than One Song, Fade In / Fade Out Affects Only First <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence7ThemeSongEarlyEndLabel">Theme Song Early End (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence7ThemeSongEarlyEndInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence7ReplaceAudioLabel" class="toggleRow"><input type="checkbox" id="ambientSequence7ReplaceAudioToggle" /> Replace Audio with Theme Song <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence7ReplaceAudioOrderLabel">Replacement Song</label>
  <select id="ambientSequence7ReplaceAudioOrderSelect">
    <option value="first">Play First</option>
    <option value="random">Play One Random</option>
  </select>
  <label>Environment Effects</label>
  <div class="msSelect" id="ambientSequence7EnvSelect" tabindex="0">All</div>
  <label id="ambientSequence7FallbackLabel">Fallback (if this sequence can't play)</label>
  <select id="ambientSequence7FallbackSelect">
    <option value="skip">Skip This Step</option>
    <option value="empty">Empty (Effects Only)</option>
    <option value="movie">Fallback to Movie</option>
    <option value="trailer">Fallback to Trailer</option>
    <option value="themevideo">Fallback to Theme Video</option>
    <option value="themesong">Fallback to Theme Song</option>
    <option value="fanartwall">Fallback to Fanart Wall</option>
    <option value="previous">Fallback to Previous Step</option>
    <option value="sequence:1">Fallback to Sequence 1</option><option value="sequence:2">Fallback to Sequence 2</option><option value="sequence:3">Fallback to Sequence 3</option><option value="sequence:4">Fallback to Sequence 4</option><option value="sequence:5">Fallback to Sequence 5</option><option value="sequence:6">Fallback to Sequence 6</option>
  </select>
  <label id="ambientSequence7FrontArtEarlyFadeLabel">Front Art Early Fade Out when next Sequence is Video (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence7FrontArtEarlyFadeInput" type="number" min="0" max="3600" step="1" value="0" />
  </div>
  <div class="ambientSequenceBlock" id="ambientSequenceBlock8">
  <div class="grpHead ambientSequenceHead">Sequence 8</div>
  <label>Poster Effect</label>
  <select id="ambientSequence8EffectSelect">
    <option value="movie">Movie</option>
    <option value="trailer">Trailer</option>
    <option value="themevideo">Theme Video</option>
    <option value="themesong">Theme Song</option>
    <option value="fanartwall">Fanart Wall</option>
  </select>
  <label id="ambientSequence8VolumeLabel">Volume <span class="defaultHint">(default: 100)</span> <span class="defaultHint" id="ambientSequence8VolumeValue"></span></label>
  <input type="range" id="ambientSequence8VolumeSlider" min="0" max="100" step="1" value="100" />
  <label id="ambientSequence8LoopLabel" class="toggleRow"><input type="checkbox" id="ambientSequence8LoopToggle" /> Loop (if media duration is shorter than sequence duration) <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence8DurationTypeLabel">Duration</label>
  <select id="ambientSequence8DurationTypeSelect">
    <option value="count" id="ambientSequence8DurationTypeCountOpt">Play N Times</option>
    <option value="time">Play For N Seconds</option>
  </select>
  <label id="ambientSequence8DurationValueLabel">Value <span class="defaultHint" id="ambientSequence8DurationValueDefaultHint"></span></label>
  <input id="ambientSequence8DurationValueInput" type="number" min="1" max="3600" step="1" value="1" />
  <label id="ambientSequence8PlaybackOrderLabel">Playback Order</label>
  <select id="ambientSequence8PlaybackOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="ambientSequence8MovieStartLabel">Movie Start</label>
  <select id="ambientSequence8MovieStartModeSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Position</option>
  </select>
  <label id="ambientSequence8MovieStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 10)</span></label>
  <input id="ambientSequence8MovieStartMinInput" type="number" min="0" max="100" step="1" value="10" />
  <label id="ambientSequence8MovieStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 90)</span></label>
  <input id="ambientSequence8MovieStartMaxInput" type="number" min="0" max="100" step="1" value="90" />
  <label id="ambientSequence8ThemeSongStartPositionLabel">Theme Song Start Position <span class="defaultHint">(default: From Beginning)</span></label>
  <select id="ambientSequence8ThemeSongStartPositionSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="ambientSequence8ThemeSongStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence8ThemeSongStartMinInput" type="number" min="0" max="100" step="1" value="0" />
  <label id="ambientSequence8ThemeSongStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 50)</span></label>
  <input id="ambientSequence8ThemeSongStartMaxInput" type="number" min="0" max="100" step="1" value="50" />
  <label id="ambientSequence8ThemeSongDelayedStartLabel">Theme Song Delayed Start (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence8ThemeSongDelayedStartInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence8ThemeSongDelayedStartFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence8ThemeSongDelayedStartFirstOnlyToggle" checked /> If More Than One Song, Delayed Start Affects Only First <span class="defaultHint">(default: on)</span></label>
  <label id="ambientSequence8ThemeSongFadeInLabel">Theme Song Fade In (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence8ThemeSongFadeInInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence8ThemeSongFadeOutLabel">Theme Song Fade Out (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence8ThemeSongFadeOutInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence8ThemeSongFadeFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence8ThemeSongFadeFirstOnlyToggle" /> If More Than One Song, Fade In / Fade Out Affects Only First <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence8ThemeSongEarlyEndLabel">Theme Song Early End (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence8ThemeSongEarlyEndInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence8ReplaceAudioLabel" class="toggleRow"><input type="checkbox" id="ambientSequence8ReplaceAudioToggle" /> Replace Audio with Theme Song <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence8ReplaceAudioOrderLabel">Replacement Song</label>
  <select id="ambientSequence8ReplaceAudioOrderSelect">
    <option value="first">Play First</option>
    <option value="random">Play One Random</option>
  </select>
  <label>Environment Effects</label>
  <div class="msSelect" id="ambientSequence8EnvSelect" tabindex="0">All</div>
  <label id="ambientSequence8FallbackLabel">Fallback (if this sequence can't play)</label>
  <select id="ambientSequence8FallbackSelect">
    <option value="skip">Skip This Step</option>
    <option value="empty">Empty (Effects Only)</option>
    <option value="movie">Fallback to Movie</option>
    <option value="trailer">Fallback to Trailer</option>
    <option value="themevideo">Fallback to Theme Video</option>
    <option value="themesong">Fallback to Theme Song</option>
    <option value="fanartwall">Fallback to Fanart Wall</option>
    <option value="previous">Fallback to Previous Step</option>
    <option value="sequence:1">Fallback to Sequence 1</option><option value="sequence:2">Fallback to Sequence 2</option><option value="sequence:3">Fallback to Sequence 3</option><option value="sequence:4">Fallback to Sequence 4</option><option value="sequence:5">Fallback to Sequence 5</option><option value="sequence:6">Fallback to Sequence 6</option><option value="sequence:7">Fallback to Sequence 7</option>
  </select>
  <label id="ambientSequence8FrontArtEarlyFadeLabel">Front Art Early Fade Out when next Sequence is Video (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence8FrontArtEarlyFadeInput" type="number" min="0" max="3600" step="1" value="0" />
  </div>
  <div class="ambientSequenceBlock" id="ambientSequenceBlock9">
  <div class="grpHead ambientSequenceHead">Sequence 9</div>
  <label>Poster Effect</label>
  <select id="ambientSequence9EffectSelect">
    <option value="movie">Movie</option>
    <option value="trailer">Trailer</option>
    <option value="themevideo">Theme Video</option>
    <option value="themesong">Theme Song</option>
    <option value="fanartwall">Fanart Wall</option>
  </select>
  <label id="ambientSequence9VolumeLabel">Volume <span class="defaultHint">(default: 100)</span> <span class="defaultHint" id="ambientSequence9VolumeValue"></span></label>
  <input type="range" id="ambientSequence9VolumeSlider" min="0" max="100" step="1" value="100" />
  <label id="ambientSequence9LoopLabel" class="toggleRow"><input type="checkbox" id="ambientSequence9LoopToggle" /> Loop (if media duration is shorter than sequence duration) <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence9DurationTypeLabel">Duration</label>
  <select id="ambientSequence9DurationTypeSelect">
    <option value="count" id="ambientSequence9DurationTypeCountOpt">Play N Times</option>
    <option value="time">Play For N Seconds</option>
  </select>
  <label id="ambientSequence9DurationValueLabel">Value <span class="defaultHint" id="ambientSequence9DurationValueDefaultHint"></span></label>
  <input id="ambientSequence9DurationValueInput" type="number" min="1" max="3600" step="1" value="1" />
  <label id="ambientSequence9PlaybackOrderLabel">Playback Order</label>
  <select id="ambientSequence9PlaybackOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="ambientSequence9MovieStartLabel">Movie Start</label>
  <select id="ambientSequence9MovieStartModeSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Position</option>
  </select>
  <label id="ambientSequence9MovieStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 10)</span></label>
  <input id="ambientSequence9MovieStartMinInput" type="number" min="0" max="100" step="1" value="10" />
  <label id="ambientSequence9MovieStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 90)</span></label>
  <input id="ambientSequence9MovieStartMaxInput" type="number" min="0" max="100" step="1" value="90" />
  <label id="ambientSequence9ThemeSongStartPositionLabel">Theme Song Start Position <span class="defaultHint">(default: From Beginning)</span></label>
  <select id="ambientSequence9ThemeSongStartPositionSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="ambientSequence9ThemeSongStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence9ThemeSongStartMinInput" type="number" min="0" max="100" step="1" value="0" />
  <label id="ambientSequence9ThemeSongStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 50)</span></label>
  <input id="ambientSequence9ThemeSongStartMaxInput" type="number" min="0" max="100" step="1" value="50" />
  <label id="ambientSequence9ThemeSongDelayedStartLabel">Theme Song Delayed Start (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence9ThemeSongDelayedStartInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence9ThemeSongDelayedStartFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence9ThemeSongDelayedStartFirstOnlyToggle" checked /> If More Than One Song, Delayed Start Affects Only First <span class="defaultHint">(default: on)</span></label>
  <label id="ambientSequence9ThemeSongFadeInLabel">Theme Song Fade In (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence9ThemeSongFadeInInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence9ThemeSongFadeOutLabel">Theme Song Fade Out (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence9ThemeSongFadeOutInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence9ThemeSongFadeFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence9ThemeSongFadeFirstOnlyToggle" /> If More Than One Song, Fade In / Fade Out Affects Only First <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence9ThemeSongEarlyEndLabel">Theme Song Early End (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence9ThemeSongEarlyEndInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence9ReplaceAudioLabel" class="toggleRow"><input type="checkbox" id="ambientSequence9ReplaceAudioToggle" /> Replace Audio with Theme Song <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence9ReplaceAudioOrderLabel">Replacement Song</label>
  <select id="ambientSequence9ReplaceAudioOrderSelect">
    <option value="first">Play First</option>
    <option value="random">Play One Random</option>
  </select>
  <label>Environment Effects</label>
  <div class="msSelect" id="ambientSequence9EnvSelect" tabindex="0">All</div>
  <label id="ambientSequence9FallbackLabel">Fallback (if this sequence can't play)</label>
  <select id="ambientSequence9FallbackSelect">
    <option value="skip">Skip This Step</option>
    <option value="empty">Empty (Effects Only)</option>
    <option value="movie">Fallback to Movie</option>
    <option value="trailer">Fallback to Trailer</option>
    <option value="themevideo">Fallback to Theme Video</option>
    <option value="themesong">Fallback to Theme Song</option>
    <option value="fanartwall">Fallback to Fanart Wall</option>
    <option value="previous">Fallback to Previous Step</option>
    <option value="sequence:1">Fallback to Sequence 1</option><option value="sequence:2">Fallback to Sequence 2</option><option value="sequence:3">Fallback to Sequence 3</option><option value="sequence:4">Fallback to Sequence 4</option><option value="sequence:5">Fallback to Sequence 5</option><option value="sequence:6">Fallback to Sequence 6</option><option value="sequence:7">Fallback to Sequence 7</option><option value="sequence:8">Fallback to Sequence 8</option>
  </select>
  <label id="ambientSequence9FrontArtEarlyFadeLabel">Front Art Early Fade Out when next Sequence is Video (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence9FrontArtEarlyFadeInput" type="number" min="0" max="3600" step="1" value="0" />
  </div>
  <div class="ambientSequenceBlock" id="ambientSequenceBlock10">
  <div class="grpHead ambientSequenceHead">Sequence 10</div>
  <label>Poster Effect</label>
  <select id="ambientSequence10EffectSelect">
    <option value="movie">Movie</option>
    <option value="trailer">Trailer</option>
    <option value="themevideo">Theme Video</option>
    <option value="themesong">Theme Song</option>
    <option value="fanartwall">Fanart Wall</option>
  </select>
  <label id="ambientSequence10VolumeLabel">Volume <span class="defaultHint">(default: 100)</span> <span class="defaultHint" id="ambientSequence10VolumeValue"></span></label>
  <input type="range" id="ambientSequence10VolumeSlider" min="0" max="100" step="1" value="100" />
  <label id="ambientSequence10LoopLabel" class="toggleRow"><input type="checkbox" id="ambientSequence10LoopToggle" /> Loop (if media duration is shorter than sequence duration) <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence10DurationTypeLabel">Duration</label>
  <select id="ambientSequence10DurationTypeSelect">
    <option value="count" id="ambientSequence10DurationTypeCountOpt">Play N Times</option>
    <option value="time">Play For N Seconds</option>
  </select>
  <label id="ambientSequence10DurationValueLabel">Value <span class="defaultHint" id="ambientSequence10DurationValueDefaultHint"></span></label>
  <input id="ambientSequence10DurationValueInput" type="number" min="1" max="3600" step="1" value="1" />
  <label id="ambientSequence10PlaybackOrderLabel">Playback Order</label>
  <select id="ambientSequence10PlaybackOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="ambientSequence10MovieStartLabel">Movie Start</label>
  <select id="ambientSequence10MovieStartModeSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Position</option>
  </select>
  <label id="ambientSequence10MovieStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 10)</span></label>
  <input id="ambientSequence10MovieStartMinInput" type="number" min="0" max="100" step="1" value="10" />
  <label id="ambientSequence10MovieStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 90)</span></label>
  <input id="ambientSequence10MovieStartMaxInput" type="number" min="0" max="100" step="1" value="90" />
  <label id="ambientSequence10ThemeSongStartPositionLabel">Theme Song Start Position <span class="defaultHint">(default: From Beginning)</span></label>
  <select id="ambientSequence10ThemeSongStartPositionSelect">
    <option value="beginning">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="ambientSequence10ThemeSongStartMinLabel">Random Start — Min % <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence10ThemeSongStartMinInput" type="number" min="0" max="100" step="1" value="0" />
  <label id="ambientSequence10ThemeSongStartMaxLabel">Random Start — Max % <span class="defaultHint">(default: 50)</span></label>
  <input id="ambientSequence10ThemeSongStartMaxInput" type="number" min="0" max="100" step="1" value="50" />
  <label id="ambientSequence10ThemeSongDelayedStartLabel">Theme Song Delayed Start (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence10ThemeSongDelayedStartInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence10ThemeSongDelayedStartFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence10ThemeSongDelayedStartFirstOnlyToggle" checked /> If More Than One Song, Delayed Start Affects Only First <span class="defaultHint">(default: on)</span></label>
  <label id="ambientSequence10ThemeSongFadeInLabel">Theme Song Fade In (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence10ThemeSongFadeInInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence10ThemeSongFadeOutLabel">Theme Song Fade Out (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence10ThemeSongFadeOutInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence10ThemeSongFadeFirstOnlyLabel" class="toggleRow"><input type="checkbox" id="ambientSequence10ThemeSongFadeFirstOnlyToggle" /> If More Than One Song, Fade In / Fade Out Affects Only First <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence10ThemeSongEarlyEndLabel">Theme Song Early End (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence10ThemeSongEarlyEndInput" type="number" min="0" max="3600" step="1" value="0" />
  <label id="ambientSequence10ReplaceAudioLabel" class="toggleRow"><input type="checkbox" id="ambientSequence10ReplaceAudioToggle" /> Replace Audio with Theme Song <span class="defaultHint">(default: off)</span></label>
  <label id="ambientSequence10ReplaceAudioOrderLabel">Replacement Song</label>
  <select id="ambientSequence10ReplaceAudioOrderSelect">
    <option value="first">Play First</option>
    <option value="random">Play One Random</option>
  </select>
  <label>Environment Effects</label>
  <div class="msSelect" id="ambientSequence10EnvSelect" tabindex="0">All</div>
  <label id="ambientSequence10FallbackLabel">Fallback (if this sequence can't play)</label>
  <select id="ambientSequence10FallbackSelect">
    <option value="skip">Skip This Step</option>
    <option value="empty">Empty (Effects Only)</option>
    <option value="movie">Fallback to Movie</option>
    <option value="trailer">Fallback to Trailer</option>
    <option value="themevideo">Fallback to Theme Video</option>
    <option value="themesong">Fallback to Theme Song</option>
    <option value="fanartwall">Fallback to Fanart Wall</option>
    <option value="previous">Fallback to Previous Step</option>
    <option value="sequence:1">Fallback to Sequence 1</option><option value="sequence:2">Fallback to Sequence 2</option><option value="sequence:3">Fallback to Sequence 3</option><option value="sequence:4">Fallback to Sequence 4</option><option value="sequence:5">Fallback to Sequence 5</option><option value="sequence:6">Fallback to Sequence 6</option><option value="sequence:7">Fallback to Sequence 7</option><option value="sequence:8">Fallback to Sequence 8</option><option value="sequence:9">Fallback to Sequence 9</option>
  </select>
  <label id="ambientSequence10FrontArtEarlyFadeLabel">Front Art Early Fade Out when next Sequence is Video (Seconds) <span class="defaultHint">(default: 0)</span></label>
  <input id="ambientSequence10FrontArtEarlyFadeInput" type="number" min="0" max="3600" step="1" value="0" />
  </div>
  </div>
  <div class="tabPage" id="tabPage_backwall">
  <div class="grpHead">Backwall</div>
  <label>Back Wall Extra Backdrop</label>
  <select id="backdropLayoutSelect">
    <option value="off">Off</option>
    <option value="1x1">1x1</option>
    <option value="2x2">2x2</option>
  </select>
  <label id="backdropModeLabel">Mode</label>
  <select id="backdropModeSelect">
    <option value="static">Static</option>
    <option value="shuffle" selected>Shuffle</option>
  </select>
  <label id="backdropSecondsLabel">Shuffle Every (Seconds) <span class="defaultHint" id="backdropSecondsDefaultHint"></span></label>
  <input id="backdropSecondsInput" type="number" min="1" step="1" value="5" />
  <label id="backdropVideosEnabledLabel" class="toggleRow" style="margin-bottom:0"><input type="checkbox" id="backdropVideosEnabledToggle" /> Enable Videos on Backdrop Wall <span class="defaultHint" id="backdropVideosEnabledDefaultHint"></span></label>
  <label class="toggleRow"><input type="checkbox" id="backdropBalanceToggle" /> Balance Videos Across Sides <span class="defaultHint" id="backdropBalanceDefaultHint"></span></label>
  <label id="backdropOverscanLabel">Crop Black Bars (Overscan)</label>
  <select id="backdropOverscanModeSelect">
    <option value="off">Off</option>
    <option value="auto">Automatic Crop Black Bars (Overscan) (Experimental, Not Very Functional)</option>
    <option value="forced">Forced Crop Black Bars (Overscan)</option>
  </select>
  <label id="backdropTrailerTilesLabel">Trailer Tiles <span class="defaultHint" id="backdropTrailerTilesDefaultHint"></span></label>
  <select id="backdropTrailerTilesSelect">
    <option value="0">Off</option>
    <option value="1">1</option>
    <option value="2">2</option>
    <option value="3">3</option>
    <option value="4">4</option>
  </select>
  <label id="backdropTrailerOrderLabel">Trailer Playback Order <span class="defaultHint" id="backdropTrailerOrderDefaultHint"></span></label>
  <select id="backdropTrailerOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="backdropTrailerStartLabel">Trailer Start Position <span class="defaultHint" id="backdropTrailerStartDefaultHint"></span></label>
  <select id="backdropTrailerStartSelect">
    <option value="begin">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="backdropThemeVideoTilesLabel">Theme Video Tiles <span class="defaultHint" id="backdropThemeVideoTilesDefaultHint"></span></label>
  <select id="backdropThemeVideoTilesSelect">
    <option value="0">Off</option>
    <option value="1">1</option>
    <option value="2">2</option>
    <option value="3">3</option>
    <option value="4">4</option>
  </select>
  <label id="backdropThemeVideoOrderLabel">Theme Video Playback Order <span class="defaultHint" id="backdropThemeVideoOrderDefaultHint"></span></label>
  <select id="backdropThemeVideoOrderSelect">
    <option value="first">Play First</option>
    <option value="all">Play All in Order</option>
    <option value="random">Play One Random</option>
    <option value="shuffled">Play All Random</option>
  </select>
  <label id="backdropThemeVideoStartLabel">Theme Video Start Position <span class="defaultHint" id="backdropThemeVideoStartDefaultHint"></span></label>
  <select id="backdropThemeVideoStartSelect">
    <option value="begin">From Beginning</option>
    <option value="random">Random Timestamp</option>
  </select>
  <label id="backdropMovieTilesLabel">Movie Tiles <span class="defaultHint" id="backdropMovieTilesDefaultHint"></span></label>
  <select id="backdropMovieTilesSelect">
    <option value="0">Off</option>
    <option value="1">1</option>
    <option value="2">2</option>
    <option value="3">3</option>
    <option value="4">4</option>
  </select>
  <label id="backdropMovieMinLabel">Movie Random Start — Min % <span class="defaultHint" id="backdropMovieMinDefaultHint"></span></label>
  <input id="backdropMovieMinInput" type="number" min="0" max="100" step="1" value="10" />
  <label id="backdropMovieMaxLabel">Movie Random Start — Max % <span class="defaultHint" id="backdropMovieMaxDefaultHint"></span></label>
  <input id="backdropMovieMaxInput" type="number" min="0" max="100" step="1" value="90" />
  </div>
  <div class="tabPage" id="tabPage_misc">
  <div class="grpHead">Misc</div>
  <label>Browser Tab Icon</label>
  <select id="tabIconSelect">
    <option value="cinema">Cinema</option>
    <option value="vanilla">Jellyfin Vanilla</option>
  </select>
  <label>Library Item Opens In</label>
  <select id="libraryItemOpensInSelect">
    <option value="newtab">New Tab (opens item directly)</option>
    <option value="origintab">Original Tab (navigates only, no auto-switch)</option>
  </select>
  <div class="subHead">Smart Launch from Jellyfin Web</div>
  <div style="font-style: italic; opacity: 0.65; font-size: 12px; margin: 4px 0 8px;">Informational only — Smart Launch is decided in Jellyfin Web at launch time, not here. Edit the config defaults to change future launches.</div>
  <label id="smartLaunchEnabledLabel" class="toggleRow" style="padding:0; margin:0 0 0 0;"><input type="checkbox" id="smartLaunchEnabledToggle" /> Jump straight into the matching view <span class="defaultHint" id="smartLaunchEnabledDefaultHint"></span></label>
  <label id="smartLaunchSortLabel" class="toggleRow" style="padding:0; margin:5px 0 0 0;"><input type="checkbox" id="smartLaunchSortToggle" /> Carry over Sort <span class="defaultHint" id="smartLaunchSortDefaultHint"></span></label>
  <label id="smartLaunchFilterLabel" class="toggleRow" style="padding:0; margin:0 0 0 0;"><input type="checkbox" id="smartLaunchFilterToggle" /> Carry over Filters <span class="defaultHint" id="smartLaunchFilterDefaultHint"></span></label>
  <label id="smartLaunchScrollLabel" class="toggleRow" style="padding:0; margin:0 0 0 0;"><input type="checkbox" id="smartLaunchScrollToggle" /> Carry over Scroll Position (not for Movies detail view or Collections) <span class="defaultHint" id="smartLaunchScrollDefaultHint"></span></label>
  <label id="smartLaunchMoviesLabel" class="toggleRow" style="padding:0; margin:5px 0 0 0;"><input type="checkbox" id="smartLaunchMoviesToggle" /> Movies (general view) <span class="defaultHint" id="smartLaunchMoviesDefaultHint"></span></label>
  <label id="smartLaunchMoviesDetailLabel" class="toggleRow" style="padding:0; margin:0 0 0 0;"><input type="checkbox" id="smartLaunchMoviesDetailToggle" /> Movies (detail view) <span class="defaultHint" id="smartLaunchMoviesDetailDefaultHint"></span></label>
  <label id="smartLaunchFavoritesLabel" class="toggleRow" style="padding:0; margin:0 0 0 0;"><input type="checkbox" id="smartLaunchFavoritesToggle" /> Movies Favourites <span class="defaultHint" id="smartLaunchFavoritesDefaultHint"></span></label>
  <label id="smartLaunchCollectionsLabel" class="toggleRow" style="padding:0; margin:0 0 0 0;"><input type="checkbox" id="smartLaunchCollectionsToggle" /> Collections <span class="defaultHint" id="smartLaunchCollectionsDefaultHint"></span></label>
  <label id="smartLaunchGenresLabel" class="toggleRow" style="padding:0; margin:0 0 0 0;"><input type="checkbox" id="smartLaunchGenresToggle" /> Genres <span class="defaultHint" id="smartLaunchGenresDefaultHint"></span></label>
  <label id="smartLaunchTagsLabel" class="toggleRow" style="padding:0; margin:0 0 0 0;"><input type="checkbox" id="smartLaunchTagsToggle" /> Tags <span class="defaultHint" id="smartLaunchTagsDefaultHint"></span></label>
  <label id="smartLaunchStudiosLabel" class="toggleRow" style="padding:0; margin:0 0 0 0;"><input type="checkbox" id="smartLaunchStudiosToggle" /> Studios <span class="defaultHint" id="smartLaunchStudiosDefaultHint"></span></label>
  <label id="smartLaunchPersonsLabel" class="toggleRow" style="padding:0; margin:0 0 3px 0;"><input type="checkbox" id="smartLaunchPersonsToggle" /> Persons <span class="defaultHint" id="smartLaunchPersonsDefaultHint"></span></label>
  <label id="smartLaunchAutoPlayLabel">From a Movie's Detail View, Auto-Start</label>
  <div id="smartLaunchAutoPlayOptions" style="font-size:13px; padding:4px 0;"></div>
  </div>
  <div class="tabPage" id="tabPage_credits">
  <div class="grpHead">Credits</div>
  <div id="creditsBlock">
    <div id="creditsTitle">Cinema Project</div>
    <div id="creditsVersion">Version ${SCRIPT_VERSION}</div>
    <div id="creditsBody">Built with three.js &middot; Powered by Jellyfin</div>
    <div id="creditsCompat">Designed &amp; tested for Jellyfin Web 10.10.7 &middot; Chromium-based browsers</div>
    <div id="creditsDisclaimer">Not affiliated with or endorsed by Jellyfin</div>
    <div id="creditsLicense">License: MIT &mdash; forking and further development strongly encouraged</div>
    <div id="creditsAuthor">Author: chrissix666</div>
    <div id="creditsLinks">
      <a href="https://github.com/chrissix666" target="_blank" rel="noopener noreferrer">GitHub</a> &middot;
      <a href="https://www.reddit.com/user/chrissix666/" target="_blank" rel="noopener noreferrer">Reddit</a> &middot;
      <a href="https://www.youtube.com/@chrissix666" target="_blank" rel="noopener noreferrer">YouTube</a> &middot;
      <a href="https://www.twitch.tv/chrissix666" target="_blank" rel="noopener noreferrer">Twitch</a> &middot;
      <a href="https://discord.com/invite/YgaH97guzF" target="_blank" rel="noopener noreferrer">Discord</a> &middot;
      <a href="https://forum.kodi.tv/member.php?action=profile&amp;uid=402183" target="_blank" rel="noopener noreferrer">Kodi Community Forum</a>
    </div>
    <div id="creditsProjects">Projects:
      <a href="https://linktr.ee/JellyfinProjects" target="_blank" rel="noopener noreferrer">Jellyfin Projects</a> &middot;
      <a href="https://linktr.ee/KodiProjects" target="_blank" rel="noopener noreferrer">Kodi Projects</a>
    </div>
    <div id="creditsFeedback">Feedback and bug reports welcome</div>
  </div>
  </div>
  </div>
  <div class="row"><button class="secondary" id="menuResetAll">Restore Defaults</button></div>
  <div class="row"><button class="secondary" id="menuCloseBtn">Close</button></div>
</div>
<script type="module">
import * as THREE from '${THREE_CDN}';
(function () {
  'use strict';
  const session = ${JSON.stringify(session)};
  const launchContext = ${JSON.stringify(launchContext)};
  // Ambient Mode — a custom, sequence-based Poster Effect: 3 independent
  // profiles (only ever one "active" at a time — the active one IS the
  // one being edited, no separate active-vs-editing state), each up to
  // AMBIENT_MAX_SEQUENCES ordered steps. A default, single-step "step object"
  // is generated once below and reused to pre-fill every one of the
  // AMBIENT_MAX_SEQUENCES slots for all 3 profiles — only the first
  // ambientProfileNSequenceCount of those slots are actually used at runtime;
  // the rest sit inert in the config, ready if the count is ever raised.
  const AMBIENT_MAX_PROFILES = 3;
  const AMBIENT_MAX_SEQUENCES = 10;
  // ══════════════════════════════════════════════════════════════════
  // WHAT THESE TWO BLOCKS ARE — READ THIS FIRST, ESPECIALLY IF YOU ARE
  // AN LLM FILLING THIS OUT FROM A DESCRIPTION OF WHAT SOMEONE WANTS.
  //
  // These two blocks together define Ambient Mode's default content —
  // a screensaver-like feature that autonomously cycles through a
  // scripted sequence of effects (trailer clips, theme songs, a movie,
  // a plain backdrop wall) when idle. There are AMBIENT_MAX_PROFILES
  // (3) independent profiles, each with up to AMBIENT_MAX_SEQUENCES
  // (10) ordered steps ("sequences").
  //
  // This is a THIRD, SEPARATE pair of blocks from MENU_CONFIG and
  // SMART_LAUNCH_CONFIG (elsewhere in this file) — genuinely different
  // in shape, not just location: MENU_CONFIG/SMART_LAUNCH_CONFIG are
  // flat {default, desc} settings; these two are ARRAYS of raw values
  // (one array per profile number, indexed 0-9 for the 10 steps) with
  // no built-in 'desc' field of their own — the comments right beside
  // each value are the only explanation of what's legal, not a
  // structured field an LLM can just read off.
  //
  // HOW THE TWO BLOCKS RELATE:
  // - AMBIENT_SEQUENCE_DEFAULT_EFFECTS_BY_PROFILE (just below) says
  //   WHICH Poster Effect each of the 10 steps in each profile defaults
  //   to. Legal values: 'movie', 'trailer', 'themevideo', 'themesong',
  //   'fanartwall'. This is the ONLY field with its own per-step
  //   default here — every other field shares one common baseline
  //   (see ambientDefaultSequence()'s own 'base' object, a few dozen
  //   lines below both these blocks) unless overridden.
  // - AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE (right after it)
  //   holds everything else — duration, volume, environment effects,
  //   theme song timing, etc. — but ONLY for steps that need to differ
  //   from that shared baseline. A step with nothing listed here simply
  //   uses the baseline untouched; you do NOT need to repeat every
  //   field for every step. Each override object may contain any subset
  //   of: durationType ('count' or 'time'), durationValue (integer),
  //   volume (0-100), playbackOrder ('first'/'all'/'random'/'shuffled'),
  //   loop (true/false), replaceAudio (true/false), replaceAudioOrder
  //   (same 4 options as playbackOrder), movieStartMode ('beginning' or
  //   'random'), movieStartMin/movieStartMax (0-100, only used when
  //   movieStartMode is 'random'), themeSongDelayedStart/themeSongEarlyEnd/
  //   themeSongFadeIn/themeSongFadeOut (seconds, 0 = off), themeSongStartPosition
  //   ('beginning' or 'random'), themeSongStartMin/themeSongStartMax
  //   (0-100, only used when themeSongStartPosition is 'random'),
  //   themeSongDelayedStartFirstOnly/themeSongFadeFirstOnly (true/false),
  //   env (array of any subset of 'backwall','screen','disc','posterlight','dim'),
  //   fallback ('skip'/'empty'/'movie'/'trailer'/'themevideo'/'themesong'/
  //   'fanartwall'/'previous'/'sequence:N' where N is an earlier step
  //   number in the same profile), frontArtEarlyFadeSeconds (integer
  //   seconds, 0 = off). Every field here only actually matters for
  //   SOME effects (e.g. movieStartMode only for 'movie') — see the
  //   'base' object's own inline comments for exactly which.
  //
  // RULES FOR FILLING THIS OUT (whether you're an LLM or a person):
  // 1. Change ONLY values — the specific effect names, numbers,
  //    true/false, and array contents. Never rename a field (e.g.
  //    'durationValue'), never change which profile number (1/2/3)
  //    or step index (0-9, 0 being the FIRST step) something belongs
  //    to, never change the overall shape (arrays stay arrays, objects
  //    stay objects). The rest of the script refers to these exact
  //    field names — renaming anything here silently breaks it
  //    elsewhere, invisibly, with no error.
  // 2. Only AMBIENT_SEQUENCE_DEFAULT_EFFECTS_BY_PROFILE's own 10-item
  //    array per profile needs an entry for every index — steps beyond
  //    a profile's own configured count just sit inert, unused, ready
  //    if the count is ever raised, so still worth keeping filled in.
  //    AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE only needs entries
  //    for steps that genuinely differ from the shared baseline —
  //    don't add an override object for a step that's fine with
  //    defaults, and don't feel obligated to fill in every possible
  //    field within an override object that IS there.
  // 3. When done, output BOTH blocks in full — from each one's own
  //    'const AMBIENT_SEQUENCE_..._BY_PROFILE = {' down to its closing
  //    '};' — to be pasted back over the originals exactly.
  // ══════════════════════════════════════════════════════════════════
  // Each sequence's own OWN default Poster Effect — unlike every other
  // field on a sequence (which all share the exact same single default,
  // since there's no reason for those to differ), this one genuinely
  // needs its own per-sequence AND per-profile value. All three
  // profiles now come with a ready-to-use example the instant a person
  // first opens the menu — see AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE
  // just below for the rest of each step's own specifics (duration,
  // environment, theme song timing, etc.) beyond just which effect.
  const AMBIENT_SEQUENCE_DEFAULT_EFFECTS_BY_PROFILE = {
    // "Pre-Show" — room lights up briefly, dims, a moment of music,
    // one trailer, then a symmetric return to full light. A self-
    // contained "welcome, here's what's coming" ritual, not a loop.
    1: ['fanartwall', 'fanartwall', 'themesong', 'trailer', 'themesong', 'fanartwall', 'fanartwall', 'fanartwall', 'fanartwall', 'fanartwall'],
    // "Overture" — a full three-act build across all 10 slots: house
    // lights open and close the whole thing (steps 1 and 10, no dim,
    // nothing switched on) — matching how real cinemas dim BEFORE
    // trailers/ads even start, not just before the feature itself.
    // Between those two bookends: Setup (room lights down, effects
    // switch on one at a time), Confrontation (theme song, a trailer as
    // the peak, theme song again), Resolution (the same effects switch
    // back off symmetrically) — then the house lights return. Meant to
    // loop indefinitely as genuine background ambiance — never includes
    // a movie (see ambientProfile2Loop's own default below).
    2: ['fanartwall', 'fanartwall', 'fanartwall', 'fanartwall', 'themesong', 'trailer', 'themesong', 'fanartwall', 'fanartwall', 'fanartwall'],
    // "Feature Presentation" — the one profile allowed a movie: the
    // same welcome/dim/music/trailer build as Pre-Show, but continuing
    // into the movie itself instead of stopping short of it, then a
    // final return to light once it's over. The complete ritual.
    3: ['fanartwall', 'fanartwall', 'themesong', 'trailer', 'movie', 'fanartwall', 'fanartwall', 'fanartwall', 'fanartwall', 'fanartwall'],
  };
  // Per-(profile, step-index) overrides for every OTHER field beyond
  // just the effect — merged on top of ambientDefaultSequence's own
  // single shared baseline (see its own Object.assign call below).
  // Only steps that need to differ from that baseline are listed here;
  // an absent entry (including every unused slot past each profile's
  // own SequenceCount) just keeps the plain baseline untouched.
  const AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE = {
    1: [
      { durationValue: 4, env: ['backwall', 'screen', 'disc', 'posterlight'] }, // 1: lights up, brief
      { durationValue: 5, env: ['backwall', 'screen', 'disc', 'dim'] }, // 2: lights down, brief — poster light now off for this step too
      { durationType: 'time', durationValue: 45, themeSongDelayedStart: 3, themeSongFadeIn: 3, themeSongFadeOut: 3, themeSongEarlyEnd: 3, themeSongStartPosition: 'random', volume: 50, env: ['backwall', 'screen', 'disc', 'dim'], loop: true, playbackOrder: 'random', frontArtEarlyFadeSeconds: 5 }, // 3: ~45s — poster light now off for this step too
      { durationType: 'count', durationValue: 1, env: ['backwall', 'screen', 'disc', 'dim'] }, // 4: one trailer, by count not time — poster light now off for this step
      { durationType: 'time', durationValue: 30, themeSongDelayedStart: 2, themeSongFadeIn: 2, themeSongFadeOut: 2, themeSongEarlyEnd: 2, themeSongStartPosition: 'random', volume: 50, env: ['backwall', 'screen', 'disc'], loop: true, playbackOrder: 'random' }, // 5: second theme song moment
      { durationValue: 5, env: ['backwall', 'screen', 'disc', 'posterlight'] }, // 6: lights up, brief — shortened from 6s to 5s, backwall/disc back on for this step
    ],
    2: [
      { durationValue: 5, env: [] }, // 1: house lights, nothing switched on yet — mirrors step 10 exactly, the opening bookend
      { durationValue: 6, env: ['dim', 'backwall'] }, // 2: lights go down, backwall switches on — matches real cinemas dimming BEFORE trailers/ads start, not just before the feature
      { durationValue: 7, env: ['dim', 'backwall', 'screen'] }, // 3: + screen
      { durationValue: 8, env: ['dim', 'backwall', 'screen', 'disc'] }, // 4: + disc — fully built up
      { durationType: 'time', durationValue: 35, env: ['dim', 'backwall', 'screen', 'disc', 'posterlight'], themeSongFadeIn: 4, themeSongFadeOut: 3, volume: 60, playbackOrder: 'random', loop: true }, // 5: Confrontation begins — everything on
      { durationType: 'count', durationValue: 1, env: ['dim', 'backwall', 'screen', 'disc', 'posterlight'] }, // 6: the peak — one trailer, everything still on
      { durationType: 'time', durationValue: 30, env: ['dim', 'backwall', 'screen', 'disc', 'posterlight'], themeSongFadeIn: 3, themeSongFadeOut: 5, volume: 60, playbackOrder: 'random', loop: true }, // 7: Resolution begins — same fullness, longer fade OUT starts the wind-down feel
      { durationValue: 7, env: ['dim', 'backwall', 'screen'] }, // 8: − disc, − posterlight — mirrors step 3
      { durationValue: 6, env: ['dim', 'backwall'] }, // 9: − screen — mirrors step 2
      { durationValue: 5, env: [] }, // 10: house lights back up, nothing left switched on — mirrors step 1 exactly, the closing bookend
    ],
    3: [
      { durationValue: 8, env: ['backwall', 'screen', 'disc', 'posterlight'] }, // 1: lights up, brief
      { durationValue: 8, env: ['backwall', 'screen', 'disc', 'posterlight', 'dim'] }, // 2: lights down, brief
      { durationType: 'time', durationValue: 45, themeSongDelayedStart: 1, themeSongFadeIn: 3, themeSongFadeOut: 3, volume: 60, env: ['backwall', 'screen', 'disc', 'posterlight', 'dim'], playbackOrder: 'random' }, // 3: a shorter, snappier build than Pre-Show's own — same full environment as its dim neighbors, not a dip mid-arc
      { durationType: 'count', durationValue: 1, env: ['backwall', 'screen', 'disc', 'posterlight', 'dim'] }, // 4: one trailer — same reasoning as step 3
      { durationType: 'count', durationValue: 1, env: ['dim'], movieStartMode: 'beginning' }, // 5: the movie itself — nothing but dim, DELIBERATELY minimal (unlike steps 3/4, this isn't an arc-position issue: once the actual film is playing, nothing should compete with it for attention)
      { durationValue: 8, env: ['backwall', 'screen', 'disc', 'posterlight'] }, // 6: lights back up once it's over
    ],
  };
  // REMINDER: this function's own return value IS the true "(default: X)"
  // for every field on this exact profile+step — see CONFIG's own big
  // comment below for the full rule (no hardcoded default hints, ever).
  function ambientDefaultSequence(profileNum, index) {
    const perProfile = AMBIENT_SEQUENCE_DEFAULT_EFFECTS_BY_PROFILE[profileNum];
    const effect = (perProfile && perProfile[index]) || 'fanartwall';
    // A sequence whose default EFFECT is Fanart Wall gets 'time'/30
    // straight away, matching what the engine always treats it as
    // regardless (see durationType's own comment below) — a fresh
    // Fanart Wall sequence showing "1" here (count's own default, from
    // before this effect had its own real default at all) made no sense
    // once the count-vs-time choice for this effect stopped being
    // user-visible at all.
    const isFanartByDefault = effect === 'fanartwall';
    const base = {
      effect, // 'movie' | 'trailer' | 'themevideo' | 'themesong' | 'fanartwall'
      durationType: isFanartByDefault ? 'time' : 'count', // 'count' (play N times) | 'time' (play for N seconds — content shorter than that loops to fill it, content longer is cut off at the limit). 'fanartwall' has no "playthrough" of its own to count, so it's not just hidden in the menu — the ENGINE itself (playAmbientSequence's usesTimeDuration check) always treats a fanartwall sequence as time-based regardless of what's actually stored here, so a hand-edited config that leaves this set to 'count' for a fanartwall step still behaves correctly (durationValue read as seconds) instead of silently misbehaving.
      durationValue: isFanartByDefault ? 30 : 1,
      volume: 100, // has no effect for 'fanartwall' (no audio of its own) — hidden in the menu for that effect
      playbackOrder: 'first', // 'first' | 'all' | 'random' | 'shuffled' — same meaning as the equivalent standalone Poster Effect setting. Has no effect for 'movie' (there's only ever the one) or 'fanartwall' (nothing to order) — hidden in the menu for both.
      loop: true, // same meaning as the equivalent standalone Poster Effect's own Loop toggle. Has no effect for 'fanartwall' — hidden in the menu for that effect. Was false — a fresh step showing an unchecked box next to a "(default: off)" hint matched itself, but a genuinely fresh 'time'-duration step with content shorter than that window would otherwise just go quiet for the remainder, which is a worse default first-run experience than looping to actually fill the configured time.
      // afterThemeSong/afterScreenArt intentionally removed — they were
      // editable and persisted correctly, but applyAmbientSequenceState
      // ALWAYS forces the equivalent global "after X" chase toggles off
      // during Ambient playback regardless of any per-step value (that
      // chase logic would otherwise fight Ambient Mode's own step
      // advancement), so these two fields could never actually do
      // anything. Kept as dead menu items risked looking functional
      // when they categorically weren't.
      // replaceAudio: for 'trailer'/'themevideo' this mirrors the
      // equivalent standalone setting exactly (same underlying module
      // toggle, same channel-based song selection via replaceAudioOrder).
      // For 'movie' this is a genuinely NEW capability that only exists
      // here in Ambient Mode — the standalone Movie Poster Effect has no
      // audio-replacement concept at all, so nothing outside Ambient
      // Mode is touched by it. Has no effect for 'themesong' (replacing
      // a theme song's audio WITH a theme song doesn't mean anything)
      // or 'fanartwall' (no audio of its own) — hidden in the menu for
      // both.
      replaceAudio: false,
      replaceAudioOrder: 'first', // only used when replaceAudio is true, and only for 'trailer'/'themevideo' — 'movie' always just uses the first available theme song (no separate order picker; picking among replacement songs didn't seem worth a whole extra dropdown for a feature this new), hidden in the menu for 'movie'/'themesong'/'fanartwall'
      // Movie-only — mirrors the Backwall's own "Movie Random Start"
      // concept exactly (even reuses its computeMovieRandomStart
      // function), just scoped to this one step instead of the whole
      // backdrop wall. Hidden in the menu for every other effect.
      movieStartMode: 'beginning', // 'beginning' | 'random'
      movieStartMin: 10, // percent, only used when movieStartMode is 'random'
      movieStartMax: 90, // percent, only used when movieStartMode is 'random'
      // Theme Song-only — same underlying trim/fade mechanism as the
      // standalone Theme Song settings (themeSongDelayedStartSeconds
      // etc; see those CONFIG entries' own comment for the full
      // semantics), just scoped to this one step's own theme song
      // instead of the always-on standalone one. Ambient temporarily
      // overrides those same four module variables for the duration of
      // this step (see applyAmbientSequenceState), exactly the same way
      // it already does for volume/loop/playback order — the playback
      // function itself (tryPlayThemeSongForItem) neither knows nor
      // cares whether it was Ambient or the standalone setting that put
      // these values there. All four default to 0 (off).
      themeSongDelayedStart: 0,
      themeSongEarlyEnd: 0,
      themeSongFadeIn: 0,
      themeSongFadeOut: 0,
      // Start Position — same field, applies uniformly whether this
      // step's primary effect IS 'themesong', or a 'movie'/'trailer'/
      // 'themevideo' step has replaceAudio on (applyAmbientSequenceState
      // overrides ALL THREE of the underlying standalone Start Position
      // variables to this SAME value during the step, so whichever of
      // the several playback code paths actually ends up running picks
      // it up identically — one control per step covering every kind of
      // theme-song-audio that step could produce, not three separate
      // ones a person would otherwise have to keep in sync by hand).
      themeSongStartPosition: 'beginning', // 'beginning' or 'random'
      themeSongStartMin: 0, // percent, only used when 'random'
      themeSongStartMax: 50, // percent, only used when 'random'
      // Only meaningful with playbackOrder 'all'/'shuffled' (more than one
      // song can ever queue up) — grayed out otherwise, same as the
      // standalone versions of these two. Delayed Start's own default is
      // true (only the first song of the step gets the delay); Fade's is
      // false (Fade In/Out re-apply to every song the queue advances to)
      // — same reasoning and same two defaults as the standalone Theme
      // Song settings. Deliberately doesn't cover Early End — that's a
      // single fixed point relative to this WHOLE STEP's own time
      // window, not tied to any one song's start/end, so it already
      // applies consistently regardless of which song is playing.
      themeSongDelayedStartFirstOnly: true,
      themeSongFadeFirstOnly: false,
      env: ['backwall', 'screen', 'disc', 'posterlight', 'dim'], // this step's own Environment Effects — independent per step, no special-casing for any effect (including 'fanartwall', which has no content of its own — an empty env array here is a valid, if silent, step)
      // 'skip' | 'empty' | 'movie' | 'trailer' | 'themevideo' | 'themesong' | 'fanartwall' | 'previous' | 'sequence:N' (N = a strictly EARLIER step index in this same profile, 1-based)
      // Exactly ONE fallback level is ever attempted — if the fallback
      // itself also can't play (including 'previous' on step 1, which has
      // no previous step to fall back to), the step becomes 'empty'
      // rather than chaining further, which rules out fallback loops
      // entirely without needing a runtime guard/counter for it.
      // Has no effect for 'fanartwall' — that effect already IS
      // mechanically identical to Empty (see applyAmbientSequenceState's own
      // envKey fallback), so a real availability failure for it is
      // simply treated as Empty automatically, without a separate,
      // user-facing choice — hidden in the menu for that effect.
      fallback: 'empty',
      // Off (0) by default everywhere — matches exactly what Ambient
      // Mode already did before this feature existed at all, per its
      // own design: a value of 0 means peekAmbientNextIsVideo/the
      // count-based equivalent never even gets a reason to schedule the
      // extra fade timer (see playAmbientSequence's own showsFrontArt
      // check), so nothing about the ORIGINAL behavior changes for any
      // sequence that doesn't explicitly opt in with a nonzero value.
      frontArtEarlyFadeSeconds: 0,
    };
    // Per-(profile, step) overrides — see
    // AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE's own comment. Applied
    // on top of the shared baseline above; steps/profiles with nothing
    // listed just keep that baseline untouched.
    const overridesForProfile = AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE[profileNum];
    const overrides = overridesForProfile && overridesForProfile[index];
    return overrides ? Object.assign(base, overrides) : base;
  }
  function ambientDefaultSequences(profileNum) {
    return Array.from({ length: AMBIENT_MAX_SEQUENCES }, (unused, i) => ambientDefaultSequence(profileNum, i));
  }
  const MENU_CONFIG = {
    // ══════════════════════════════════════════════════════════════════
    // WHAT THIS BLOCK IS — READ THIS FIRST, ESPECIALLY IF YOU ARE AN LLM
    // FILLING THIS OUT FROM A DESCRIPTION OF WHAT SOMEONE WANTS.
    //
    // This block covers Cinema's walkable, first-person 3D room: a
    // poster wall you browse on foot, a kiosk you can approach to
    // search/filter/sort, picture-frame posters that play
    // trailers/theme songs/theme videos when interacted with, a
    // "Fanart Wall" ambient backdrop, and an "Ambient Mode" that
    // autonomously cycles through a scripted sequence of those effects
    // (like a screensaver) when idle. It is ONE giant file — this
    // MENU_CONFIG object is deliberately the ONLY part small enough
    // (a few hundred lines, not the whole ~13,000-line script) to hand
    // to an LLM on its own, without any other context, and get a
    // correctly filled-in result back.
    //
    // EVERYTHING configurable in Cinema Project lives in exactly ONE of two
    // places, and this single block now covers BOTH of them:
    //   kiosk — the physical Kiosk terminal's own Search panel defaults
    //           (Sort, Filter starting values, wall layout, etc.)
    //   menu  — every setting reachable from the Options menu (M key):
    //           Controls, Display, Room (further split into
    //           design/kiosk-branding), Posters (further split into
    //           general/movie/trailer/themeVideo/themeSong/ambientMode),
    //           Backwall, and Misc (further split out smartLaunch)
    // There is no third category — if it's not under kiosk, it's under
    // menu, and vice versa.
    //
    // Every LEAF entry (anywhere in either half) has exactly two fields
    // — 'default' (the value used the very first time Cinema ever
    // runs, before the person has changed anything) and 'desc' (a
    // plain-English string spelling out the TYPE and every legal value
    // — a quoted list of strings, a numeric range, true/false, etc.).
    // 'desc' is the authoritative source of truth for what's valid; if
    // choosing a new 'default', it MUST be a value 'desc' allows.
    //
    // RULES FOR FILLING THIS OUT (whether you're an LLM or a person):
    // 1. Change ONLY leaf 'default' values. Never rename a setting (the
    //    key, e.g. 'roomSize') or a container (e.g. 'kiosk', 'menu',
    //    'room', 'design'), never remove/add a setting or container,
    //    never change the nesting depth of anything. The rest of the
    //    script (thousands of lines you are NOT looking at) refers to
    //    these exact nested paths (e.g.
    //    MENU_CONFIG.menu.room.design.roomSize.default) — renaming or
    //    restructuring anything here silently breaks it elsewhere,
    //    invisibly, with no error.
    // 2. When done, the ENTIRE block — from 'const MENU_CONFIG = {' down
    //    to its closing '};' — should be pasted back over the original
    //    in the full script, replacing it exactly. Output the complete
    //    block, not a diff or a partial snippet, so this copy-paste
    //    works without any manual editing.
    // 3. If asked for something this file has no setting for at all
    //    (e.g. "add a new poster shape"), say so plainly rather than
    //    inventing a new key here — a new key with no corresponding
    //    code elsewhere in the script would do nothing.
    //
    // ONE GENUINE EXCEPTION TO RULE 1 ABOVE — the 13 'smartLaunchXxx'
    // entries under menu.misc.smartLaunch do NOT have a literal
    // 'default' value at all; each one instead uses a dollar-sign-brace
    // template interpolation reading a matching property off
    // SMART_LAUNCH_CONFIG. That is a real, deliberate template-literal
    // interpolation — this WHOLE MENU_CONFIG block sits inside a larger
    // outer template string, and SMART_LAUNCH_CONFIG is a separate
    // object defined once, earlier, in that outer script (kept as one
    // single source of truth on purpose, so Smart Launch's own
    // pre-launch detection and this settings panel's own display can
    // never silently drift apart from each other). Practically, that
    // means: changing a 'smartLaunchXxx' entry's own text HERE, in this
    // isolated block, has NO effect once pasted back — the
    // interpolation re-derives the same value from SMART_LAUNCH_CONFIG
    // regardless of what's written here. If asked to change one of
    // these 13, say plainly that it lives in SMART_LAUNCH_CONFIG
    // elsewhere in the script, not in this block, rather than editing it
    // here and implying the change will do anything. Every OTHER entry
    // in this file is a genuine, ordinary literal 'default' value,
    // editable exactly as Rule 1 describes.
    //
    // A SECOND, SEPARATE EXCEPTION — each Ambient profile's own
    // 'sequences' entry (menu.posters.ambientMode.profiles[N].sequences)
    // also has no literal 'default' value — it's the direct return
    // value of a genuine function call, ambientDefaultSequences(N),
    // evaluated fresh every single time this script runs. That function
    // reads AMBIENT_SEQUENCE_DEFAULT_EFFECTS_BY_PROFILE and
    // AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE (two separate blocks,
    // defined earlier, further up this same inner script — see their
    // own shared header comment) and builds the full 10-step array from
    // those two. Practically, that means: this 'sequences' entry's own
    // text HERE never needs to change no matter what someone wants
    // adjusted about Ambient Mode's actual step content — leave it
    // exactly as 'ambientDefaultSequences(N)' and make the real edit in
    // those two other blocks instead. The sibling 'sequenceCount' entry
    // right next to 'sequences' is NOT part of this exception, though —
    // it's a genuine, ordinary literal number, edited right here exactly
    // as Rule 1 describes.
    //
    // A KNOCK-ON EFFECT OF THE NESTED SHAPE, WORTH KNOWING — elsewhere
    // in the full script (NOT in this isolated block), a few generic
    // reusable UI-wiring helper functions take a setting's key name as
    // a plain string at their many call sites (e.g.
    // 'trailerPlaybackOrder') and look it up dynamically. Since a bare
    // string like that doesn't directly map to a top-level property of
    // a deeply nested object, a small flat lookup table (CONFIG_BY_KEY,
    // built once by walking this whole tree) exists right after this
    // block so those helpers keep working unchanged. That mechanism
    // lives entirely outside this isolated block too — nothing to do
    // differently here, just worth knowing it exists.
    // ══════════════════════════════════════════════════════════════════
    kiosk: {
      search: {
        sortBy: { default: 'PremiereDate', desc: "'SortName', 'Random', 'CommunityRating', 'CriticRating', 'DateCreated', 'DatePlayed', 'OfficialRating', 'PlayCount', 'PremiereDate', or 'Runtime'" },
        sortOrder: { default: 'Descending', desc: "'Ascending' or 'Descending'" },
        sortWall: { default: 'sequential-wrap', desc: "'alternating', 'sequential', or 'sequential-wrap'" },
        startWall: { default: 'left-backwall', desc: "'left-screen', 'left-backwall', 'right-screen', or 'right-backwall'" },
        repeatMode: { default: 'norepeat', desc: "'repeat' or 'norepeat'" },
        gapPosition: { default: 'balanced', desc: "'end', 'center', 'center-second', or 'balanced'" },
      },
 
    },
    menu: {
      controls: {
        movementSpeedScale: { default: 4, desc: 'Integer, 1 to 10 (1 = walking simulator, 10 = Half-Life ultra fast)' },
        autoSprint: { default: true, desc: 'true or false' },
        jumpEnabled: { default: true, desc: 'true or false' },
        crouchEnabled: { default: true, desc: 'true or false' },
        crouchMode: { default: 'hold', desc: "'hold' or 'toggle'" },
        controllerMovementEnabled: { default: true, desc: 'true or false' },
        gamepadDeadzone: { default: 0.20, desc: 'Decimal, 0.00 to 0.50 in steps of 0.05 (e.g. 0.00, 0.05, 0.10, ... 0.50)' },
        lookSensitivity: { default: 0.20, desc: 'Decimal, 0.05 to 1.00 in steps of 0.05 (5% to 100%)' },
        cinemaKeyboardEnabled: { default: true, desc: 'true or false' },
        cinemaKeyboardColor: { default: '#00ff41', desc: 'Any CSS hex color code' },
        cinemaKeyboardPosition: { default: 'top-center', desc: "'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'center-center', or 'bottom-center'" },
        cinemaKeyboardIdleSeconds: { default: 3.5, desc: 'Decimal seconds, in steps of 0.5 (0.5 to 10)' },
      },
      display: {
        showCrosshair: { default: false, desc: 'true or false' },
        showControlsUi: { default: true, desc: 'true or false' },
        fov: { default: 65, desc: 'Integer, 60 to 120 (degrees) — camera.fov, live (camera.updateProjectionMatrix() on change, no reload needed).' },
        audienceBrightness: { default: 0, desc: 'Integer, -10 to +10 (e.g. -10, -9, ... 0, ... 9, 10)' },
        cinemaBrightness: { default: 0, desc: 'Integer, -10 to +10 (e.g. -10, -9, ... 0, ... 9, 10)' },
        frontWallBrightnessOff: { default: 1.0, desc: "Decimal, 0.00 to 1.00 in steps of 0.01 — Front Wall (screen area artwork/video) brightness while the room's Dim Light is OFF." },
        frontWallBrightnessOn: { default: 0.80, desc: "Decimal, 0.00 to 1.00 in steps of 0.01 — Front Wall (screen area artwork/video) brightness while the room's Dim Light is ON." },
        backwallBrightnessOff: { default: 0.45, desc: "Decimal, 0.00 to 1.00 in steps of 0.01 — Backwall (fanart/video tiles) brightness while the room's Dim Light is OFF." },
        backwallBrightnessOn: { default: 0.80, desc: "Decimal, 0.00 to 1.00 in steps of 0.01 — Backwall (fanart/video tiles) brightness while the room's Dim Light is ON." },
        posterWallBrightnessOff: { default: 0.30, desc: "Decimal, 0.00 to 1.00 in steps of 0.01 — Poster Wall brightness while the room's Dim Light is OFF." },
        posterWallBrightnessOn: { default: 0.65, desc: "Decimal, 0.00 to 1.00 in steps of 0.01 — Poster Wall brightness while the room's Dim Light is ON." },
        posterLightBrightness: { default: 0.05, desc: 'Decimal, 0.00 to 1.00 in steps of 0.01 — Poster pin-light fixture and beam brightness. Fixed, does not change with Dim Light.' },
      },
      room: {
        design: {
          roomDesign: { default: 'velvet', desc: "'velvet', 'starship', 'neon', 'cyber', 'classic', or 'lounge' — the room's overall color/material palette (walls, floor, curtain, trim, kiosk, lighting mood). Room shape/geometry is identical across all of them; only what it's dressed in changes. Switchable live in the Options menu without a reload; not persisted across sessions — always starts at this default." },
          roomSize: { default: '10', desc: "'10', '20', or '30' (posters per wall)" },
          roomScaleMode: { default: 'full', desc: "'length' or 'full'" },
          scaleMovementSpeed: { default: true, desc: 'true or false' },
          scalePlayerPosition: { default: true, desc: "true or false — keeps the player at the same RELATIVE position in the room as it scales (Full Scale mode only); false keeps the player's world position fixed, as it was before this was introduced" },
          showRopeBarrier: { default: true, desc: 'true or false' },
        },
        kiosk: {
          kioskShowMode: { default: 'dynamic', desc: "'off' (no physical kiosk object in the room at all — K/X still opens the settings panel independently of this), 'dynamic' (rises on approach, retracts when you step away — unchanged from how the kiosk has always behaved), or 'always' (permanently fully risen, no proximity animation at all)." },
          kioskClearlogo3d: { default: true, desc: 'true or false' },
          kioskBrandingMode: { default: 'whenIdleOrMissing', desc: "'off', 'whenIdle', 'whenIdleOrMissing', or 'always' — controls ONLY the generic Jellyfin Cinema Project wordmark logo at the kiosk, entirely separate from kioskClearlogo3d above (which controls a MOVIE's own clearlogo). 'off': never. 'whenIdle': only while no poster action (Movie/Trailer/Theme Video/Theme Song/Fanart Wall/Ambient Mode — everything except Go to Library) is active. 'whenIdleOrMissing': same, PLUS a fallback to the Cinema logo while a poster action is active but that movie has no clearlogo of its own. 'always': the Cinema logo permanently, overriding even a movie's own clearlogo. Globally gated by kioskClearlogo3d — grayed out and inert whenever that's off." },
          kioskLogoSpeed: { default: '3', desc: "'0' (static) through '5' (fast)" },
          kioskLogoGlitchFreq: { default: '3', desc: "'0' (off) through '5' (constant)" },
          kioskLogoGlitchIntensity: { default: '3', desc: "'0' (off) through '5' (severe)" },
        },
      },
      posters: {
        general: {
          posterMenuTabs: { default: ['library', 'movie', 'trailer', 'themevideo', 'themesong', 'fanartwall', 'ambient'], desc: "Array of enabled poster context-menu entries out of: 'library', 'movie', 'trailer', 'themevideo', 'themesong', 'fanartwall', 'ambient'" },
          hideUnavailableItems: { default: false, desc: 'true or false — hides entries that are enabled above but unavailable for the given poster (e.g. no trailer, or a blocked container like .avi), instead of showing them greyed out' },
          envMovie: { default: ['backwall', 'screen', 'disc', 'posterlight', 'dim'], desc: "Array of enabled effects out of: 'backwall', 'screen', 'disc', 'posterlight', 'dim'" },
          envTrailer: { default: ['backwall', 'screen', 'disc', 'posterlight', 'dim'], desc: "Array of enabled effects out of: 'backwall', 'screen', 'disc', 'posterlight', 'dim'" },
          envThemeVideo: { default: ['backwall', 'screen', 'disc', 'posterlight', 'dim'], desc: "Array of enabled effects out of: 'backwall', 'screen', 'disc', 'posterlight', 'dim'" },
          envThemeSong: { default: ['backwall', 'screen', 'disc', 'posterlight', 'dim'], desc: "Array of enabled effects out of: 'backwall', 'screen', 'disc', 'posterlight', 'dim'" },
          envFanartWall: { default: ['backwall', 'screen', 'disc', 'posterlight', 'dim'], desc: "Array of enabled effects out of: 'backwall', 'screen', 'disc', 'posterlight', 'dim'" },
        },
        movie: {
          volMovie: { default: 100, desc: 'Integer, 0 to 100 (percent)' },
          loopMovie: { default: false, desc: 'true or false' },
          afterMovieThemeSong: { default: false, desc: 'true or false' },
          afterMovieScreenArt: { default: false, desc: 'true or false' },
        },
        trailer: {
          volTrailer: { default: 100, desc: 'Integer, 0 to 100 (percent)' },
          trailerPlaybackOrder: { default: 'first', desc: "'first', 'all', 'random', or 'shuffled'" },
          loopTrailer: { default: false, desc: 'true or false' },
          afterTrailerThemeSong: { default: false, desc: 'true or false' },
          afterTrailerScreenArt: { default: false, desc: 'true or false' },
          replaceAudioTrailer: { default: false, desc: 'true or false' },
          trailerReplaceAudioOrder: { default: 'first', desc: "'first', 'all', 'random', or 'shuffled'" },
          trailerReplaceAudioStartPosition: { default: 'beginning', desc: "'beginning' or 'random' — same meaning as themeSongStartPosition, scoped to Trailer's own Replace Audio track." },
          trailerReplaceAudioStartMin: { default: 0, desc: "Percent, 0 to 100. Only used when trailerReplaceAudioStartPosition is 'random'." },
          trailerReplaceAudioStartMax: { default: 50, desc: "Percent, 0 to 100. Only used when trailerReplaceAudioStartPosition is 'random'." },
          noThemeSongFallbackTrailer: { default: 'keep', desc: "'keep' or 'mute'" },
        },
        themeVideo: {
          volThemeVideo: { default: 100, desc: 'Integer, 0 to 100 (percent)' },
          themeVideoPlaybackOrder: { default: 'first', desc: "'first', 'all', 'random', or 'shuffled'" },
          loopThemeVideo: { default: true, desc: 'true or false' },
          afterThemeVideoThemeSong: { default: false, desc: 'true or false' },
          afterThemeVideoScreenArt: { default: false, desc: 'true or false' },
          replaceAudioThemeVideo: { default: false, desc: 'true or false' },
          themeVideoReplaceAudioOrder: { default: 'first', desc: "'first', 'all', 'random', or 'shuffled'" },
          themeVideoReplaceAudioStartPosition: { default: 'beginning', desc: "'beginning' or 'random' — same meaning as themeSongStartPosition, scoped to Theme Video's own Replace Audio track." },
          themeVideoReplaceAudioStartMin: { default: 0, desc: "Percent, 0 to 100. Only used when themeVideoReplaceAudioStartPosition is 'random'." },
          themeVideoReplaceAudioStartMax: { default: 50, desc: "Percent, 0 to 100. Only used when themeVideoReplaceAudioStartPosition is 'random'." },
          noThemeSongFallbackThemeVideo: { default: 'keep', desc: "'keep' or 'mute'" },
        },
        themeSong: {
          volThemeSong: { default: 60, desc: 'Integer, 0 to 100 (percent)' },
          themeSongPlaybackOrder: { default: 'first', desc: "'first', 'all', 'random', or 'shuffled'" },
          themeSongStartPosition: { default: 'beginning', desc: "'beginning' or 'random' — where in the song file playback begins each time. 'random' picks a fresh point within themeSongStartMin/Max on every playthrough (including every loop iteration)." },
          themeSongStartMin: { default: 0, desc: "Percent, 0 to 100. Only used when themeSongStartPosition is 'random' — the low end of the range a random start point is drawn from." },
          themeSongStartMax: { default: 50, desc: "Percent, 0 to 100. Only used when themeSongStartPosition is 'random' — the high end of the range a random start point is drawn from. Defaults to 50 (not 90, unlike Movie's own Random Start) so a song can't randomly land right near its own end with barely anything left to hear." },
          themeSongDelayedStartFirstOnly: { default: true, desc: "true or false — only meaningful with a Playback Order that can queue more than one song ('all'/'shuffled'; grayed out otherwise, since with exactly one song ever played there's no 'first vs. every' distinction to make). true (default): Delayed Start only ever applies to the very first song of a session — every song reached afterward by advancing through the queue starts immediately, with no delay. false: Delayed Start re-applies to EVERY song the queue advances to, not just the first." },
          themeSongFadeFirstOnly: { default: false, desc: "true or false — same meaning as themeSongDelayedStartFirstOnly, for Fade In and Fade Out together (grouped under one toggle rather than two separate ones). Deliberately does NOT cover Early End — that's a single fixed point relative to the whole Ambient step's own time window, not something tied to any one song's own start/end, so there's no meaningful 'first song only vs. every song' distinction to make for it; it already applies consistently regardless of which song happens to be playing. false (default): Fade In/Out re-apply to every song the queue advances to. true: only the very first song of a session gets faded in/out; every later song in the rotation just plays and ends plainly." },
          themeSongDelayedStartSeconds: { default: 0, desc: 'Seconds to skip from the start of the file before playback becomes audible. 0 = off.' },
          themeSongFadeInSeconds: { default: 0, desc: 'Seconds to smoothly ramp volume up from 0 at the start of each playthrough (after Delayed Start, if any). 0 = off (starts at full volume immediately).' },
          themeSongFadeOutSeconds: { default: 0, desc: 'Seconds to smoothly ramp volume down to 0 before the end of each playthrough (before Early End, if any). 0 = off (stays at full volume until the end).' },
          loopThemeSong: { default: true, desc: 'true or false' },
        },
        ambientMode: {
          ambientActiveProfile: { default: '1', desc: "'1', '2', or '3' — which Ambient Mode profile plays when Ambient Mode is triggered from a poster. Also the one shown in the Ambient Mode menu tab — there's no separate 'editing' vs 'active' state, the one being edited IS the one that will play." },
          profiles: {
            1: {
              name: { default: 'Pre-Show', desc: "Optional custom label for Profile 1, shown in the menu as 'Profile 1 - <name>'. Empty shows just 'Profile 1'. Defaults to 'Pre-Show' as a ready-to-test example." },
              loop: { default: false, desc: 'true: once the last configured step finishes, the whole sequence restarts from step 1 and repeats until manually stopped. false: once the last step finishes, Ambient Mode ends on its own and the room returns to the normal idle state — lights up, no environment effects, exactly as if nothing were locked at all.' },
              sequenceCount: { default: 6, desc: '1 to ' + AMBIENT_MAX_SEQUENCES + " — how many of ambientProfile1Sequences' entries are actually used and shown in the menu; the rest sit inert, ready if this is raised later. Defaults to 6 to match the 6 sequences that come with a specific default Poster Effect of their own (see AMBIENT_SEQUENCE_DEFAULT_EFFECTS) — a ready-to-test example profile out of the box." },
              sequences: { default: ambientDefaultSequences(1), desc: 'Array of ' + AMBIENT_MAX_SEQUENCES + ' step objects for Profile 1 (only the first ambientProfile1SequenceCount are actually used) — see ambientDefaultSequence() for the shape of one step.' },
            },
            2: {
              name: { default: 'Overture', desc: "Optional custom label for Profile 2, shown in the menu as 'Profile 2 - <name>'. Empty shows just 'Profile 2'. Defaults to 'Overture' as a ready-to-test example — a full three-act mood build across all 10 slots, meant to loop indefinitely as background ambiance (see ambientProfile2Loop's own default)." },
              loop: { default: true, desc: "Same as ambientProfile1Loop, for Profile 2. Defaults to true — Profile 2's own default sequence ('Overture') is built as genuine background ambiance, meant to keep cycling through its build-up/peak/wind-down arc rather than stopping once through." },
              sequenceCount: { default: 10, desc: "Same as ambientProfile1SequenceCount, for Profile 2. Defaults to 10 (the maximum) — Profile 2's own default sequence ('Overture') deliberately uses every available slot for its three-act build." },
              sequences: { default: ambientDefaultSequences(2), desc: 'Array of ' + AMBIENT_MAX_SEQUENCES + " step objects for Profile 2 (only the first ambientProfile2SequenceCount are actually used) — independent of Profile 1's own specific defaults, see AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE for this profile's own." },
            },
            3: {
              name: { default: 'Feature Presentation', desc: "Optional custom label for Profile 3, shown in the menu as 'Profile 3 - <name>'. Empty shows just 'Profile 3'. Defaults to 'Feature Presentation' as a ready-to-test example — the one profile whose default sequence includes an actual movie." },
              loop: { default: false, desc: 'Same as ambientProfile1Loop, for Profile 3.' },
              sequenceCount: { default: 6, desc: "Same as ambientProfile1SequenceCount, for Profile 3. Defaults to 6, matching Profile 3's own default sequence ('Feature Presentation')." },
              sequences: { default: ambientDefaultSequences(3), desc: 'Array of ' + AMBIENT_MAX_SEQUENCES + " step objects for Profile 3 (only the first ambientProfile3SequenceCount are actually used) — independent of the other two profiles, see AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE for this profile's own." },
            },
          },
        },
      },
      backwall: {
        backdropLayout: { default: '2x2', desc: "'off', '1x1', or '2x2'" },
        backdropMode: { default: 'shuffle', desc: "'static' or 'shuffle'" },
        backdropShuffleSeconds: { default: 5, desc: 'Positive integer (seconds), e.g. 5' },
        backdropOverscanMode: { default: 'forced', desc: "'off' | 'auto' | 'forced'" },
        backdropVideosEnabled: { default: true, desc: 'true or false' },
        backdropBalanceVideos: { default: true, desc: 'true or false' },
        backdropTrailerTiles: { default: '2', desc: "'0' (off) through '4'" },
        backdropTrailerOrder: { default: 'shuffled', desc: "'first', 'all', 'random', or 'shuffled'" },
        backdropTrailerStart: { default: 'random', desc: "'begin' or 'random'" },
        backdropThemeVideoTiles: { default: '0', desc: "'0' (off) through '4'" },
        backdropThemeVideoOrder: { default: 'shuffled', desc: "'first', 'all', 'random', or 'shuffled'" },
        backdropThemeVideoStart: { default: 'random', desc: "'begin' or 'random'" },
        backdropMovieTiles: { default: '2', desc: "'0' (off) through '4'" },
        backdropMovieMinPct: { default: 10, desc: 'Integer, 0 to 100 (percent)' },
        backdropMovieMaxPct: { default: 90, desc: 'Integer, 0 to 100 (percent)' },
      },
      misc: {
        tabIcon: { default: 'cinema', desc: "'cinema' or 'vanilla'" },
        libraryItemOpensIn: { default: 'newtab', desc: "'newtab' or 'origintab' — newtab opens the library item directly in a new browser tab; origintab navigates the original Jellyfin tab to the item, but does not switch focus to it automatically (you need to switch tabs manually)" },
        smartLaunch: {
          smartLaunchEnabled: { default: ${SMART_LAUNCH_CONFIG.enabled.default}, desc: 'true or false — jump straight into the matching poster view when the Cinema button is pressed from a supported Jellyfin Web view' },
          smartLaunchSort: { default: ${SMART_LAUNCH_CONFIG.sort.default}, desc: 'true or false — carry over the active Sort from the Jellyfin Web view, where available; otherwise falls back to the Kiosk default' },
          smartLaunchFilter: { default: ${SMART_LAUNCH_CONFIG.filter.default}, desc: 'true or false — carry over active Filters from the Jellyfin Web view, where available; otherwise falls back to the Kiosk default' },
          smartLaunchScroll: { default: ${SMART_LAUNCH_CONFIG.scroll.default}, desc: "true or false — carry over the Jellyfin Web scroll position: whichever card is fully visible, topmost-leftmost, becomes the Poster Wall's own starting point. Applies to every sortable/filterable view Smart Launch supports (general Movies, Favourites, Genre, Studio, Tag, Person) except Collections, which has no scrollable card grid of its own" },
          smartLaunchMovies: { default: ${SMART_LAUNCH_CONFIG.movies.default}, desc: 'true or false — enables Smart Launch for the general Movies library view' },
          smartLaunchMoviesDetail: { default: ${SMART_LAUNCH_CONFIG.moviesDetail.default}, desc: "true or false — enables Smart Launch from a Movie's own Detail View in Jellyfin Web (the 'backtrack' case: starts the Poster Wall on that exact movie, then continues with Cinema's own default sort — a details page can't reliably tell which of several possible prior list views, each with its own different sort/filter, it was actually reached from, so no attempt is made to guess or carry one over)" },
          smartLaunchFavorites: { default: ${SMART_LAUNCH_CONFIG.favorites.default}, desc: 'true or false — enables Smart Launch for the Movies Favourites view' },
          smartLaunchCollections: { default: ${SMART_LAUNCH_CONFIG.collections.default}, desc: 'true or false — enables Smart Launch when inside a specific Collection' },
          smartLaunchGenres: { default: ${SMART_LAUNCH_CONFIG.genres.default}, desc: 'true or false — enables Smart Launch for Genre views' },
          smartLaunchTags: { default: ${SMART_LAUNCH_CONFIG.tags.default}, desc: 'true or false — enables Smart Launch for Tag views' },
          smartLaunchStudios: { default: ${SMART_LAUNCH_CONFIG.studios.default}, desc: 'true or false — enables Smart Launch for Studio views' },
          smartLaunchPersons: { default: ${SMART_LAUNCH_CONFIG.persons.default}, desc: 'true or false — enables Smart Launch for Person views' },
          smartLaunchAutoPlay: { default: '${SMART_LAUNCH_CONFIG.autoPlay.default}', desc: "'none', 'movie', 'trailer', 'themevideo', 'themesong', 'fanartwall', or 'ambient' — from a movie's own Detail View in Jellyfin Web, what (if anything) auto-starts for that movie on Cinema launch. Mirrors the poster context-menu entries (minus 'library', which makes no sense as an auto-start target)" },
        },
      },
 
    },
  };
  // CONFIG_BY_KEY — see MENU_CONFIG's own header comment for the full
  // explanation of why this flat lookup table exists and what it's for.
  // A handful of generic, reusable UI-wiring helper functions (further
  // down: markDefaultOption's own callers, setBoolDefaultHint's own
  // callers, etc.) take a setting's KEY NAME as a plain string parameter
  // at their many different call sites, then look up CONFIG[thatKey]
  // themselves — this worked naturally back when CONFIG was flat, but
  // breaks now that it's nested (a string like 'trailerPlaybackOrder'
  // no longer IS a direct top-level property of CONFIG on its own).
  // Rather than hunting down and rewriting every one of those many call
  // sites to pass a full nested path instead, this single flat lookup
  // table is built once, right here, by walking the whole nested CONFIG
  // tree — so CONFIG_BY_KEY['trailerPlaybackOrder'] finds the exact same
  // {default, desc} object MENU_CONFIG.menu.posters.trailer.trailerPlaybackOrder
  // does (both point at the SAME object in memory, not a copy — editing
  // one is indistinguishable from editing the other). Every one of
  // those generic helpers reads through THIS table instead of CONFIG
  // directly now.
  const CONFIG_BY_KEY = {};
  (function flattenConfigByKey(node) {
    for (const k in node) {
      const v = node[k];
      if (v && typeof v === 'object' && 'default' in v && 'desc' in v) {
        CONFIG_BY_KEY[k] = v;
      } else if (v && typeof v === 'object') {
        flattenConfigByKey(v);
      }
    }
  })(MENU_CONFIG);


  // ══════════════════════════════════════════════════════════════════
  // CONSOLIDATED RUNTIME SETTINGS — every one of these reads its own
  // saved value (or MENU_CONFIG's own default, the first time ever) via
  // loadSetting/loadBoolSetting. Moved here, right after MENU_CONFIG,
  // from wherever each used to sit scattered near its
  // own feature elsewhere in the file — purely a readability/
  // discoverability change, nothing here is new and no VALUE, key
  // name, or behavior was altered. A handful of settings could NOT
  // safely move here and stay at their original spot instead: a few
  // that assign directly into an HTML element's own .value (that
  // element doesn't exist yet this early in the file) and a few that
  // live inside a per-profile loading FUNCTION (they don't run at
  // this top-level point at all, only when that function is called).
  // ══════════════════════════════════════════════════════════════════
  let GAMEPAD_DEADZONE = parseFloat(loadSetting('gamepadDeadzone', MENU_CONFIG.menu.controls.gamepadDeadzone.default));
  let lookSensitivityMultiplier = parseFloat(loadSetting('lookSensitivity', MENU_CONFIG.menu.controls.lookSensitivity.default));
  let volMovie = parseInt(loadSetting('volMovie', MENU_CONFIG.menu.posters.movie.volMovie.default), 10);
  let volTrailer = parseInt(loadSetting('volTrailer', MENU_CONFIG.menu.posters.trailer.volTrailer.default), 10);
  let volThemeVideo = parseInt(loadSetting('volThemeVideo', MENU_CONFIG.menu.posters.themeVideo.volThemeVideo.default), 10);
  let volThemeSong = parseInt(loadSetting('volThemeSong', MENU_CONFIG.menu.posters.themeSong.volThemeSong.default), 10);
  let loopMovie = loadBoolSetting('loopMovie', MENU_CONFIG.menu.posters.movie.loopMovie.default);
  let loopTrailer = loadBoolSetting('loopTrailer', MENU_CONFIG.menu.posters.trailer.loopTrailer.default);
  let loopThemeVideo = loadBoolSetting('loopThemeVideo', MENU_CONFIG.menu.posters.themeVideo.loopThemeVideo.default);
  let loopThemeSong = loadBoolSetting('loopThemeSong', MENU_CONFIG.menu.posters.themeSong.loopThemeSong.default);
  let afterMovieThemeSong = loadBoolSetting('afterMovieThemeSong', MENU_CONFIG.menu.posters.movie.afterMovieThemeSong.default);
  let afterMovieScreenArt = loadBoolSetting('afterMovieScreenArt', MENU_CONFIG.menu.posters.movie.afterMovieScreenArt.default);
  let afterTrailerThemeSong = loadBoolSetting('afterTrailerThemeSong', MENU_CONFIG.menu.posters.trailer.afterTrailerThemeSong.default);
  let afterTrailerScreenArt = loadBoolSetting('afterTrailerScreenArt', MENU_CONFIG.menu.posters.trailer.afterTrailerScreenArt.default);
  let afterThemeVideoThemeSong = loadBoolSetting('afterThemeVideoThemeSong', MENU_CONFIG.menu.posters.themeVideo.afterThemeVideoThemeSong.default);
  let afterThemeVideoScreenArt = loadBoolSetting('afterThemeVideoScreenArt', MENU_CONFIG.menu.posters.themeVideo.afterThemeVideoScreenArt.default);
  let replaceAudioTrailer = loadBoolSetting('replaceAudioTrailer', MENU_CONFIG.menu.posters.trailer.replaceAudioTrailer.default);
  let noThemeSongFallbackTrailer = loadSetting('noThemeSongFallbackTrailer', MENU_CONFIG.menu.posters.trailer.noThemeSongFallbackTrailer.default);
  let replaceAudioThemeVideo = loadBoolSetting('replaceAudioThemeVideo', MENU_CONFIG.menu.posters.themeVideo.replaceAudioThemeVideo.default);
  let noThemeSongFallbackThemeVideo = loadSetting('noThemeSongFallbackThemeVideo', MENU_CONFIG.menu.posters.themeVideo.noThemeSongFallbackThemeVideo.default);
  let trailerPlaybackOrder = loadSetting('trailerPlaybackOrder', MENU_CONFIG.menu.posters.trailer.trailerPlaybackOrder.default);
  let trailerReplaceAudioOrder = loadSetting('trailerReplaceAudioOrder', MENU_CONFIG.menu.posters.trailer.trailerReplaceAudioOrder.default);
  let trailerReplaceAudioStartPosition = loadSetting('trailerReplaceAudioStartPosition', MENU_CONFIG.menu.posters.trailer.trailerReplaceAudioStartPosition.default);
  let trailerReplaceAudioStartMin = parseInt(loadSetting('trailerReplaceAudioStartMin', String(MENU_CONFIG.menu.posters.trailer.trailerReplaceAudioStartMin.default)), 10) || 0;
  let trailerReplaceAudioStartMax = parseInt(loadSetting('trailerReplaceAudioStartMax', String(MENU_CONFIG.menu.posters.trailer.trailerReplaceAudioStartMax.default)), 10) || 0;
  let themeVideoPlaybackOrder = loadSetting('themeVideoPlaybackOrder', MENU_CONFIG.menu.posters.themeVideo.themeVideoPlaybackOrder.default);
  let themeVideoReplaceAudioOrder = loadSetting('themeVideoReplaceAudioOrder', MENU_CONFIG.menu.posters.themeVideo.themeVideoReplaceAudioOrder.default);
  let themeVideoReplaceAudioStartPosition = loadSetting('themeVideoReplaceAudioStartPosition', MENU_CONFIG.menu.posters.themeVideo.themeVideoReplaceAudioStartPosition.default);
  let themeVideoReplaceAudioStartMin = parseInt(loadSetting('themeVideoReplaceAudioStartMin', String(MENU_CONFIG.menu.posters.themeVideo.themeVideoReplaceAudioStartMin.default)), 10) || 0;
  let themeVideoReplaceAudioStartMax = parseInt(loadSetting('themeVideoReplaceAudioStartMax', String(MENU_CONFIG.menu.posters.themeVideo.themeVideoReplaceAudioStartMax.default)), 10) || 0;
  let themeSongPlaybackOrder = loadSetting('themeSongPlaybackOrder', MENU_CONFIG.menu.posters.themeSong.themeSongPlaybackOrder.default);
  let themeSongStartPosition = loadSetting('themeSongStartPosition', MENU_CONFIG.menu.posters.themeSong.themeSongStartPosition.default);
  let themeSongStartMin = parseInt(loadSetting('themeSongStartMin', String(MENU_CONFIG.menu.posters.themeSong.themeSongStartMin.default)), 10) || 0;
  let themeSongStartMax = parseInt(loadSetting('themeSongStartMax', String(MENU_CONFIG.menu.posters.themeSong.themeSongStartMax.default)), 10) || 0;
  let themeSongDelayedStartFirstOnly = loadBoolSetting('themeSongDelayedStartFirstOnly', MENU_CONFIG.menu.posters.themeSong.themeSongDelayedStartFirstOnly.default);
  let themeSongFadeFirstOnly = loadBoolSetting('themeSongFadeFirstOnly', MENU_CONFIG.menu.posters.themeSong.themeSongFadeFirstOnly.default);
  let themeSongDelayedStartSeconds = parseInt(loadSetting('themeSongDelayedStartSeconds', String(MENU_CONFIG.menu.posters.themeSong.themeSongDelayedStartSeconds.default)), 10) || 0;
  let themeSongFadeInSeconds = parseInt(loadSetting('themeSongFadeInSeconds', String(MENU_CONFIG.menu.posters.themeSong.themeSongFadeInSeconds.default)), 10) || 0;
  let themeSongFadeOutSeconds = parseInt(loadSetting('themeSongFadeOutSeconds', String(MENU_CONFIG.menu.posters.themeSong.themeSongFadeOutSeconds.default)), 10) || 0;
  let autoSprint = loadBoolSetting('autoSprint', MENU_CONFIG.menu.controls.autoSprint.default);
  let cinemaKeyboardEnabled = loadBoolSetting('cinemaKeyboardEnabled', MENU_CONFIG.menu.controls.cinemaKeyboardEnabled.default);
  let cinemaKeyboardColor = loadSetting('cinemaKeyboardColor', MENU_CONFIG.menu.controls.cinemaKeyboardColor.default);
  let cinemaKeyboardPosition = loadSetting('cinemaKeyboardPosition', MENU_CONFIG.menu.controls.cinemaKeyboardPosition.default);
  let cinemaKeyboardIdleSeconds = parseFloat(loadSetting('cinemaKeyboardIdleSeconds', String(MENU_CONFIG.menu.controls.cinemaKeyboardIdleSeconds.default))) || MENU_CONFIG.menu.controls.cinemaKeyboardIdleSeconds.default;
  let activeMenuTab = loadSetting('menuActiveTab', 'controls');
  let movementSpeedScale = parseInt(loadSetting('movementSpeedScale', MENU_CONFIG.menu.controls.movementSpeedScale.default), 10);
  const showCrosshairInitial = loadBoolSetting('showCrosshair', MENU_CONFIG.menu.display.showCrosshair.default);
  const showControlsUiInitial = loadBoolSetting('showControlsUi', MENU_CONFIG.menu.display.showControlsUi.default);
  let jumpEnabled = loadBoolSetting('jumpEnabled', MENU_CONFIG.menu.controls.jumpEnabled.default);
  let kioskShowMode = loadSetting('kioskShowMode', MENU_CONFIG.menu.room.kiosk.kioskShowMode.default);
  let showRopeBarrier = loadBoolSetting('showRopeBarrier', MENU_CONFIG.menu.room.design.showRopeBarrier.default);
  let kioskClearlogo3d = loadBoolSetting('kioskClearlogo3d', MENU_CONFIG.menu.room.kiosk.kioskClearlogo3d.default);
  let kioskLogoSpeed = loadSetting('kioskLogoSpeed', MENU_CONFIG.menu.room.kiosk.kioskLogoSpeed.default);
  let kioskLogoGlitchFreq = loadSetting('kioskLogoGlitchFreq', MENU_CONFIG.menu.room.kiosk.kioskLogoGlitchFreq.default);
  let kioskLogoGlitchIntensity = loadSetting('kioskLogoGlitchIntensity', MENU_CONFIG.menu.room.kiosk.kioskLogoGlitchIntensity.default);
  let kioskBrandingMode = loadSetting('kioskBrandingMode', MENU_CONFIG.menu.room.kiosk.kioskBrandingMode.default);
  let cinemaBrightnessAdj = parseInt(loadSetting('cinemaBrightness', MENU_CONFIG.menu.display.cinemaBrightness.default), 10);
  let audienceBrightnessAdj = parseInt(loadSetting('audienceBrightness', MENU_CONFIG.menu.display.audienceBrightness.default), 10);
  let frontWallBrightnessOffVal = parseFloat(loadSetting('frontWallBrightnessOff', MENU_CONFIG.menu.display.frontWallBrightnessOff.default));
  let frontWallBrightnessOnVal = parseFloat(loadSetting('frontWallBrightnessOn', MENU_CONFIG.menu.display.frontWallBrightnessOn.default));
  let backwallBrightnessOffVal = parseFloat(loadSetting('backwallBrightnessOff', MENU_CONFIG.menu.display.backwallBrightnessOff.default));
  let backwallBrightnessOnVal = parseFloat(loadSetting('backwallBrightnessOn', MENU_CONFIG.menu.display.backwallBrightnessOn.default));
  let posterWallBrightnessOffVal = parseFloat(loadSetting('posterWallBrightnessOff', MENU_CONFIG.menu.display.posterWallBrightnessOff.default));
  let posterWallBrightnessOnVal = parseFloat(loadSetting('posterWallBrightnessOn', MENU_CONFIG.menu.display.posterWallBrightnessOn.default));
  let posterLightBrightnessVal = parseFloat(loadSetting('posterLightBrightness', MENU_CONFIG.menu.display.posterLightBrightness.default));
  let fovAdj = parseInt(loadSetting('fov', MENU_CONFIG.menu.display.fov.default), 10);
  let controllerMovementEnabled = loadBoolSetting('controllerMovementEnabled', MENU_CONFIG.menu.controls.controllerMovementEnabled.default);
  let selectedGamepadId = loadSetting('selectedGamepadId', null);
  let backdropVideosEnabled = loadBoolSetting('backdropVideosEnabled', MENU_CONFIG.menu.backwall.backdropVideosEnabled.default);
  let backdropOverscanMode = loadSetting('backdropOverscanMode', MENU_CONFIG.menu.backwall.backdropOverscanMode.default);
  let backdropBalanceVideos = loadBoolSetting('backdropBalanceVideos', MENU_CONFIG.menu.backwall.backdropBalanceVideos.default);
  let backdropTrailerTiles = loadSetting('backdropTrailerTiles', MENU_CONFIG.menu.backwall.backdropTrailerTiles.default);
  let backdropThemeVideoTiles = loadSetting('backdropThemeVideoTiles', MENU_CONFIG.menu.backwall.backdropThemeVideoTiles.default);
  let backdropMovieTiles = loadSetting('backdropMovieTiles', MENU_CONFIG.menu.backwall.backdropMovieTiles.default);
  let backdropTrailerOrder = loadSetting('backdropTrailerOrder', MENU_CONFIG.menu.backwall.backdropTrailerOrder.default);
  let backdropTrailerStart = loadSetting('backdropTrailerStart', MENU_CONFIG.menu.backwall.backdropTrailerStart.default);
  let backdropThemeVideoOrder = loadSetting('backdropThemeVideoOrder', MENU_CONFIG.menu.backwall.backdropThemeVideoOrder.default);
  let backdropThemeVideoStart = loadSetting('backdropThemeVideoStart', MENU_CONFIG.menu.backwall.backdropThemeVideoStart.default);
  let libraryItemOpensIn = loadSetting('libraryItemOpensIn', MENU_CONFIG.menu.misc.libraryItemOpensIn.default);
  let hideUnavailableItems = loadBoolSetting('hideUnavailableItems', MENU_CONFIG.menu.posters.general.hideUnavailableItems.default);
  let ambientEditingProfile = Math.min(AMBIENT_MAX_PROFILES, Math.max(1, parseInt(loadSetting('ambientActiveProfile', MENU_CONFIG.menu.posters.ambientMode.ambientActiveProfile.default), 10) || 1));
  let crouchEnabled = loadBoolSetting('crouchEnabled', MENU_CONFIG.menu.controls.crouchEnabled.default);
  let crouchMode = loadSetting('crouchMode', MENU_CONFIG.menu.controls.crouchMode.default);
  const CINEMA_ICON_SVG = '<svg width="800px" height="800px" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="jfGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#914ea6"/><stop offset="100%" stop-color="#008bbb"/></linearGradient></defs><path d="M943.227049 859.580082v87.435297h-434.682901c98.144922 0 188.745153-32.544473 261.506665-87.435297h173.176236z" fill="url(#jfGrad)" /><path d="M508.544148 77.681546c240.055446 0 434.682901 194.595486 434.682901 434.650932 0 141.910524-67.998127 267.900471-173.176236 347.247604-72.761512 54.890825-163.361743 87.435297-261.506665 87.435297-240.055446 0-434.650932-194.595486-434.650932-434.682901 0-240.055446 194.595486-434.650932 434.650932-434.650932z m276.372264 278.098592c0-53.548125-43.413943-96.930099-96.962068-96.930099-53.516156 0-96.930099 43.381974-96.930099 96.930099s43.413943 96.962068 96.930099 96.962068c53.548125 0 96.962068-43.413943 96.962068-96.962068z m0 337.81674c0-53.548125-43.413943-96.962068-96.962068-96.962068-53.516156 0-96.930099 43.413943-96.930099 96.962068 0 53.516156 43.413943 96.930099 96.930099 96.930099 53.548125 0 96.962068-43.413943 96.962068-96.930099z m-223.335643-168.924355c0-23.465268-19.053542-42.486841-42.51881-42.48684s-42.486841 19.021573-42.486841 42.48684c0 23.497237 19.021573 42.51881 42.486841 42.51881s42.51881-19.021573 42.51881-42.51881z m-114.481097-168.892385c0-53.548125-43.381974-96.930099-96.930099-96.930099s-96.930099 43.381974-96.930099 96.930099 43.381974 96.962068 96.930099 96.962068 96.930099-43.413943 96.930099-96.962068z m0 337.81674c0-53.548125-43.381974-96.962068-96.930099-96.962068s-96.930099 43.413943-96.930099 96.962068c0 53.516156 43.381974 96.930099 96.930099 96.930099s96.930099-43.413943 96.930099-96.930099z" fill="url(#jfGrad)" /><path d="M508.544148 969.3937c-252.00547 0-457.029253-205.036571-457.029253-457.061222 0-252.008667 205.023783-457.029253 457.029253-457.029253 252.024651 0 457.061222 205.020586 457.061222 457.029253 0 144.74298-66.364509 277.820461-182.076414 365.111898-79.740352 60.152927-174.829034 91.949324-274.984808 91.949324z m0-869.333833c-227.328575 0-412.272611 184.944035-412.272611 412.272611 0 227.347757 184.944035 412.30458 412.272611 412.30458 90.350873 0 176.117386-28.67622 248.028522-82.92127 104.398064-78.758902 164.276058-198.812201 164.276058-329.38331 0-227.328575-184.96002-412.272611-412.30458-412.272611z" fill="url(#jfGrad)" /><path d="M340.578864 465.529818c-65.78587 0-119.30842-53.535338-119.30842-119.340389 0-65.78587 53.52255-119.30842 119.30842-119.30842 65.789067 0 119.30842 53.52255 119.30842 119.30842 0 65.805051-53.519353 119.340389-119.30842 119.340389z m0-193.892167c-41.105779 0-74.551778 33.442802-74.551778 74.551778 0 41.12496 33.442802 74.583747 74.551778 74.583747s74.551778-33.458787 74.551778-74.583747c0-41.108976-33.442802-74.551778-74.551778-74.551778zM678.363635 465.529818c-65.78587 0-119.30842-53.535338-119.30842-119.340389 0-65.78587 53.52255-119.30842 119.30842-119.30842 65.805051 0 119.340389 53.52255 119.340389 119.30842 0 65.805051-53.535338 119.340389-119.340389 119.340389z m0-193.892167c-41.105779 0-74.551778 33.442802-74.551778 74.551778 0 41.12496 33.445999 74.583747 74.551778 74.583747 41.12496 0 74.583747-33.458787 74.583747-74.583747 0-41.108976-33.458787-74.551778-74.583747-74.551778zM340.578864 803.314589c-65.78587 0-119.30842-53.52255-119.30842-119.30842 0-65.805051 53.52255-119.340389 119.30842-119.340389 65.789067 0 119.30842 53.535338 119.30842 119.340389 0 65.78587-53.519353 119.30842-119.30842 119.30842z m0-193.892167c-41.105779 0-74.551778 33.458787-74.551778 74.583747 0 41.105779 33.442802 74.551778 74.551778 74.551778s74.551778-33.445999 74.551778-74.551778c0-41.128157-33.442802-74.583747-74.551778-74.583747zM678.363635 803.314589c-65.78587 0-119.30842-53.52255-119.30842-119.30842 0-65.805051 53.52255-119.340389 119.30842-119.340389 65.805051 0 119.340389 53.535338 119.340389 119.340389 0 65.78587-53.535338 119.30842-119.340389 119.30842z m0-193.892167c-41.105779 0-74.551778 33.458787-74.551778 74.583747 0 41.105779 33.445999 74.551778 74.551778 74.551778 41.12496 0 74.583747-33.445999 74.583747-74.551778 0-41.128157-33.458787-74.583747-74.583747-74.583747zM509.47125 579.978945c-35.766951 0-64.865162-29.110999-64.865162-64.897131 0-35.766951 29.098211-64.865162 64.865162-64.865161 35.782935 0 64.897131 29.098211 64.897131 64.865161 0 35.782935-29.114196 64.897131-64.897131 64.897131z m0-85.00565a20.134095 20.134095 0 0 0-20.10852 20.108519c0 11.106041 9.02166 20.140489 20.10852 20.140489 11.106041 0 20.140489-9.034448 20.140489-20.140489 0-11.08686-9.034448-20.10852-20.140489-20.108519zM943.227049 969.3937h-434.682901a22.378321 22.378321 0 1 1 0-44.756642h434.682901a22.378321 22.378321 0 1 1 0 44.756642zM943.227049 881.958403h-173.176236a22.378321 22.378321 0 1 1 0-44.756642h173.176236a22.378321 22.378321 0 1 1 0 44.756642z" fill="url(#jfGrad)" /></svg>';
  const CINEMA_ICON_DATA_URL = 'data:image/svg+xml,' + encodeURIComponent(CINEMA_ICON_SVG);
  async function jfGet(path, params) {
    const url = new URL(session.serverUrl + path);
    Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== '') url.searchParams.set(k, v); });
    const res = await fetch(url, { headers: { 'X-Emby-Token': session.accessToken } });
    if (!res.ok) throw new Error('Jellyfin request failed (HTTP ' + res.status + ').');
    return res.json();
  }
  async function jfDelete(path, params) {
    const url = new URL(session.serverUrl + path);
    Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== '') url.searchParams.set(k, v); });
    try { await fetch(url, { method: 'DELETE', headers: { 'X-Emby-Token': session.accessToken } }); } catch (err) { /* best-effort — a failed kill just means the old transcode keeps running harmlessly in the background */ }
  }
  // A single, stable id for Cinema's own movie playback across its whole
  // runtime — not per-request. Sent as PlaySessionId on every /stream.mp4
  // request AND used to explicitly kill the previous transcode job
  // (DELETE /Videos/ActiveEncodings) before requesting a new position —
  // see playMovieOnScreen's own comment for why this is required at all
  // (Jellyfin's own transcode job lookup ignores the request URL's own
  // query string, including StartTimeTicks, once a job already exists).
  // Mutable, NOT a single fixed id for Cinema's whole runtime — a FRESH
  // one is generated for every playMovieOnScreen restart (see there).
  // Reusing the SAME id across successive, differently-positioned
  // requests (resume, then later chapter/percent) appears to make
  // Jellyfin treat them as continuations of one ongoing playback rather
  // than independent requests each with their own explicit position —
  // observed directly: resume alone worked correctly, but a SUBSEQUENT
  // chapter/percent request reusing the SAME id kept landing back on
  // the earlier resume position instead of its own. A fresh id per
  // restart matches how a real client's own playSessionId scopes to a
  // single playback start, not to the whole app session.
  let cinemaPlaySessionId = 'cinema-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const trailerBlockedCache = {};
  async function checkTrailerAvailability(itemId) {
    if (trailerAvailabilityCache[itemId] === true) return !trailerBlockedCache[itemId];
    try {
      const trailers = await jfGet('/Users/' + session.userId + '/Items/' + itemId + '/LocalTrailers', { Fields: 'Container,Path' });
      const trailer = trailers && trailers[0];
      const has = !!trailer;
      if (has) {
        trailerAvailabilityCache[itemId] = true;
        trailerBlockedCache[itemId] = isBlockedMediaForPoster(trailer);
      }
      return has && !trailerBlockedCache[itemId];
    } catch (err) {
      return true;
    }
  }
  // Confirmed straight from Jellyfin Web's own movies.js sort menu
  // definitions (its General Movies Library view — the closest match to
  // what Cinema itself represents, "browse the whole library", rather
  // than any one Genre/Studio/Person sub-view, which use a shorter
  // tie-break chain of their own). Every option ties on Name then Year
  // when the primary field is equal — Random gets no expansion, there's
  // nothing meaningful to tie-break within a shuffle. This mirrors
  // exactly what Smart Launch ALREADY does automatically (by reading
  // Jellyfin Web's own stored compound value directly) — the Kiosk's own
  // manual dropdown previously sent only the bare single field, with no
  // secondary sort at all, leaving ties in an arbitrary server order.
  const KIOSK_SORT_TIEBREAK = {
    SortName: 'SortName,ProductionYear',
    Random: 'Random',
    CommunityRating: 'CommunityRating,SortName,ProductionYear',
    CriticRating: 'CriticRating,SortName,ProductionYear',
    DateCreated: 'DateCreated,SortName,ProductionYear',
    DatePlayed: 'DatePlayed,SortName,ProductionYear',
    OfficialRating: 'OfficialRating,SortName,ProductionYear',
    PlayCount: 'PlayCount,SortName,ProductionYear',
    PremiereDate: 'PremiereDate,SortName,ProductionYear',
    Runtime: 'Runtime,SortName,ProductionYear',
  };
  // Batch size for fetchMovies' own paginated loading — small enough
  // that each individual request stays fast/light and progress feels
  // genuinely incremental, large enough not to need hundreds of round
  // trips for a big library. Jellyfin's own API guidance explicitly
  // recommends startIndex+limit for exactly this ("Always use startIndex
  // and limit parameters when querying large datasets") — the earlier,
  // single unbounded request went directly against that.
  const MOVIE_FETCH_BATCH_SIZE = 200;
  async function fetchMovies(opts, onProgress) {
    opts = opts || {};
    let [sortBy, sortOrder] = (opts.sort || 'SortName:Ascending').split(':');
    // Only expands a BARE single field (the Kiosk's own manual dropdown
    // sends just "OfficialRating") — an already-compound value (Smart
    // Launch passing through Jellyfin Web's own stored multi-field sort
    // verbatim) is left completely untouched, so it's never
    // double-expanded or overridden.
    if (sortBy && !sortBy.includes(',') && KIOSK_SORT_TIEBREAK[sortBy]) sortBy = KIOSK_SORT_TIEBREAK[sortBy];
    const hasCollections = opts.collectionIdsList && opts.collectionIdsList.length;
    // Fetches the FULL sorted/filtered set, but in BATCHES rather than
    // one single unbounded request — Poster Page navigation
    // (stepPosterPage) still needs the whole list available locally to
    // slice from afterward, that hasn't changed, only HOW it gets there.
    // A single huge unbounded request left the person watching an
    // indefinite "Loading movies…" with zero feedback, and (per
    // Jellyfin's own guidance above) wasn't the right way to query a
    // large library in the first place. onProgress(loadedSoFar, total),
    // called after each batch, drives the visible loading counter —
    // completely optional, callers that don't care just omit it.
    const params = {
      IncludeItemTypes: 'Movie',
      Recursive: 'true',
      SortBy: sortBy,
      SortOrder: sortOrder,
      Fields: 'PrimaryImageAspectRatio',
    };
    if (opts.genresList && opts.genresList.length) params.Genres = opts.genresList.join('|');
    if (opts.ratingsList && opts.ratingsList.length) params.OfficialRatings = opts.ratingsList.join('|');
    if (opts.tagsList && opts.tagsList.length) params.Tags = opts.tagsList.join('|');
    if (opts.yearsList && opts.yearsList.length) params.Years = opts.yearsList.join(',');
    if (opts.filtersList && opts.filtersList.length) params.Filters = opts.filtersList.join(',');
    if (opts.featuresList && opts.featuresList.length) opts.featuresList.forEach((f) => { params[f] = 'true'; });
    if (opts.videoTypesList && opts.videoTypesList.length) {
      opts.videoTypesList.forEach((vt) => {
        if (vt.param === 'VideoTypes') params.VideoTypes = params.VideoTypes ? params.VideoTypes + ',' + vt.paramValue : vt.paramValue;
        else params[vt.param] = vt.paramValue;
      });
    }
    if (opts.studiosList && opts.studiosList.length) params.Studios = opts.studiosList.join('|');
    if (opts.personId) params.PersonIds = opts.personId;
    let items = [];
    let startIndex = 0;
    let total = null;
    for (;;) {
      const batchParams = Object.assign({}, params, { StartIndex: String(startIndex), Limit: String(MOVIE_FETCH_BATCH_SIZE) });
      const data = await jfGet('/Users/' + session.userId + '/Items', batchParams);
      const batchItems = data.Items || [];
      items = items.concat(batchItems);
      if (total === null) total = (typeof data.TotalRecordCount === 'number') ? data.TotalRecordCount : items.length;
      if (onProgress) onProgress(items.length, total);
      startIndex += batchItems.length;
      // Stops once the known total is covered, OR the server handed
      // back fewer than a full batch (there's genuinely nothing left,
      // regardless of what TotalRecordCount claims) — documented
      // Jellyfin bugs exist where TotalRecordCount is off by a handful
      // under certain filter combinations, so relying on it ALONE to
      // decide "keep going" could loop forever chasing a count that's
      // never quite reached; a short batch is an unambiguous, always-
      // correct stop signal regardless of what the count said.
      if (batchItems.length < MOVIE_FETCH_BATCH_SIZE || startIndex >= total) break;
    }
    items = items.filter((item) => item.ImageTags && item.ImageTags.Primary);
    if (hasCollections) {
      // Union of members across all selected collections (OR), then
      // intersect with the already correctly-sorted "other filters" list —
      // removing non-members preserves that order, no re-sort needed.
      const memberIdSets = await Promise.all(opts.collectionIdsList.map(fetchCollectionMovieIds));
      const memberIds = new Set(memberIdSets.flat());
      items = items.filter((item) => memberIds.has(item.Id));
    }
    // No truncation here — the full list is exactly what's wanted, for
    // both Smart Launch's own target search AND Poster Page navigation's
    // own slicing. loadMovies/the panel Apply handler are responsible
    // for slicing down to whatever's actually shown at any one time.
    return items;
  }
  const FILTERS_OPTIONS = [
    { value: 'IsPlayed', label: 'Played' },
    { value: 'IsUnplayed', label: 'Unplayed' },
    { value: 'IsResumable', label: 'Continue Watching' },
    { value: 'IsFavorite', label: 'Favorite' },
  ];
  const FEATURES_OPTIONS = [
    { value: 'HasSubtitles', label: 'Subtitles' },
    { value: 'HasTrailer', label: 'Trailers' },
    { value: 'HasSpecialFeature', label: 'Extras' },
    { value: 'HasThemeSong', label: 'Theme Songs' },
    { value: 'HasThemeVideo', label: 'Theme Videos' },
  ];
  const VIDEOTYPE_OPTIONS = [
    { value: 'hd', label: 'HD', param: 'IsHD', paramValue: 'true' },
    { value: 'sd', label: 'SD', param: 'IsHD', paramValue: 'false' },
    { value: '4k', label: '4K', param: 'Is4K', paramValue: 'true' },
    { value: '3d', label: '3D', param: 'Is3D', paramValue: 'true' },
    { value: 'bluray', label: 'Blu-ray', param: 'VideoTypes', paramValue: 'BluRay' },
    { value: 'dvd', label: 'DVD', param: 'VideoTypes', paramValue: 'Dvd' },
  ];
  const ENV_OPTIONS = [
    { value: 'backwall', label: 'Backwall Art' },
    { value: 'screen', label: 'Screen Art' },
    { value: 'disc', label: 'Disc Art' },
    { value: 'posterlight', label: 'Poster Light' },
    { value: 'dim', label: 'Dim Room' },
  ];
  const POSTER_MENU_OPTIONS = [
    { value: 'library', label: 'Go to Library' },
    { value: 'movie', label: 'Movie' },
    { value: 'trailer', label: 'Trailer' },
    { value: 'themevideo', label: 'Theme Video' },
    { value: 'themesong', label: 'Theme Song' },
    { value: 'fanartwall', label: 'Fanart Wall' },
    { value: 'ambient', label: 'Ambient Mode' },
  ];
  const multiSelectState = {
    Filters: [], Features: [], Genres: [], OfficialRatings: [], Tags: [], VideoTypes: [], Years: [], Studios: [], Collections: [],
    EnvMovie: MENU_CONFIG.menu.posters.general.envMovie.default.slice(), EnvTrailer: MENU_CONFIG.menu.posters.general.envTrailer.default.slice(), EnvThemeVideo: MENU_CONFIG.menu.posters.general.envThemeVideo.default.slice(),
    EnvThemeSong: MENU_CONFIG.menu.posters.general.envThemeSong.default.slice(), EnvFanartWall: MENU_CONFIG.menu.posters.general.envFanartWall.default.slice(),
    PosterMenuTabs: MENU_CONFIG.menu.posters.general.posterMenuTabs.default.slice(),
  };
  let msDynamicOptions = { Genres: [], OfficialRatings: [], Tags: [], Years: [], Studios: [], Collections: [] };
  const MULTI_SELECT_FIELDS = {
    msFilters: { key: 'Filters', label: 'filters', title: 'Filters', getOptions: () => FILTERS_OPTIONS },
    msFeatures: { key: 'Features', label: 'features', title: 'Features', getOptions: () => FEATURES_OPTIONS },
    msGenres: { key: 'Genres', label: 'genres', title: 'Genres', getOptions: () => msDynamicOptions.Genres },
    msRatings: { key: 'OfficialRatings', label: 'ratings', title: 'Parental Ratings', getOptions: () => msDynamicOptions.OfficialRatings },
    msTags: { key: 'Tags', label: 'tags', title: 'Tags', getOptions: () => msDynamicOptions.Tags },
    msVideoTypes: { key: 'VideoTypes', label: 'video types', title: 'Video Types', getOptions: () => VIDEOTYPE_OPTIONS },
    msYears: { key: 'Years', label: 'years', title: 'Years', getOptions: () => msDynamicOptions.Years },
    msStudios: { key: 'Studios', label: 'studios', title: 'Studios', getOptions: () => msDynamicOptions.Studios },
    msCollections: { key: 'Collections', label: 'collections', title: 'Collections', getOptions: () => msDynamicOptions.Collections },
    msEnvMovie: { key: 'EnvMovie', label: 'effects', title: 'Movie Environment Effects', getOptions: () => ENV_OPTIONS, emptyMeansAll: false, settingKey: 'envMovie' },
    msEnvTrailer: { key: 'EnvTrailer', label: 'effects', title: 'Trailer Environment Effects', getOptions: () => ENV_OPTIONS, emptyMeansAll: false, settingKey: 'envTrailer' },
    msEnvThemeVideo: { key: 'EnvThemeVideo', label: 'effects', title: 'Theme Video Environment Effects', getOptions: () => ENV_OPTIONS, emptyMeansAll: false, settingKey: 'envThemeVideo' },
    msEnvThemeSong: { key: 'EnvThemeSong', label: 'effects', title: 'Theme Song Environment Effects', getOptions: () => ENV_OPTIONS, emptyMeansAll: false, settingKey: 'envThemeSong' },
    msEnvFanartWall: { key: 'EnvFanartWall', label: 'effects', title: 'Fanart Wall Environment Effects', getOptions: () => ENV_OPTIONS, emptyMeansAll: false, settingKey: 'envFanartWall' },
    // msEnvAmbient removed — see the note beside envAmbient's removal
    // from CONFIG above; Ambient Mode's environment effects are chosen
    // per sequence step now, not as one fixed global combination.
    msPosterMenuTabs: { key: 'PosterMenuTabs', label: 'tabs', title: 'Poster Menu Tabs', getOptions: () => POSTER_MENU_OPTIONS, emptyMeansAll: false, settingKey: 'posterMenuTabs' },
  };
  // 10 more entries, one per Ambient sequence — added programmatically
  // rather than written out by hand, generated the same way the rest of
  // the per-sequence menu is. Unlike every field above, these have NO
  // settingKey of their own: their real persistence is the sequence
  // object itself (part of the single combined ambientProfileNSequences
  // JSON blob), synced both ways via loadAmbientSequenceIntoUI (which
  // primes multiSelectState from sequence.env before this ever opens)
  // and onChange below (which writes back out through the exact same
  // saveAmbientSequence(n) every other field on a sequence already uses
  // — never its own separate, disconnected sessionStorage entry).
  for (let n = 1; n <= AMBIENT_MAX_SEQUENCES; n++) {
    MULTI_SELECT_FIELDS['ambientSequence' + n + 'EnvSelect'] = {
      key: 'AmbientSeq' + n + 'Env',
      label: 'effects',
      title: 'Sequence ' + n + ' Environment Effects',
      // 'screen' ("Screen Art"/Front Art) is grayed out — but its
      // checked state left untouched — whenever this sequence's own
      // Poster Effect is movie/trailer/themevideo: playMovieOnScreen/
      // startTrailer/playThemeVideoOnScreen all take over the screen
      // material directly and unconditionally (screenMatForceBlack,
      // hiding the fallback image) WITHOUT ever checking envEnabled
      // ('screen') at all — confirmed, the only place that env key is
      // read is showNoTrailerDisplay, which only ever runs when NO
      // video effect is active. So the checkbox genuinely has zero
      // effect while a video effect is selected — greying it out here
      // just makes that visible instead of misleadingly implying
      // something is happening. Left checked (not force-cleared) so
      // switching back to a non-video effect for this same step
      // restores whatever the person had it set to before, rather than
      // silently discarding that choice.
      getOptions: () => {
        const isVideoEffect = ['movie', 'trailer', 'themevideo'].includes(ambientSequenceEl(n, 'EffectSelect').value);
        return ENV_OPTIONS.map((o) => (o.value === 'screen' && isVideoEffect) ? Object.assign({}, o, { disabled: true, disabledHint: 'video effect already controls the screen' }) : o);
      },
      emptyMeansAll: false,
      getDefault: () => ['backwall', 'screen', 'disc', 'posterlight', 'dim'],
      onChange: () => { saveAmbientSequence(n); updateAmbientSequenceFieldVisibility(n); },
    };
    multiSelectState['AmbientSeq' + n + 'Env'] = ['backwall', 'screen', 'disc', 'posterlight', 'dim'];
  }
  Object.keys(MULTI_SELECT_FIELDS).forEach((fieldId) => {
    const cfg = MULTI_SELECT_FIELDS[fieldId];
    if (!cfg.settingKey) return;
    const saved = loadSetting(cfg.settingKey, null);
    if (saved !== null) {
      try { multiSelectState[cfg.key] = JSON.parse(saved); } catch (err) {}
    }
  });
  // getDefault (optional): an explicit function returning the reset/
  // "(default: on)" comparison array, for fields with no CONFIG-backed
  // settingKey of their own to fall back to (e.g. Ambient's per-sequence
  // Environment Effects — their real default lives on the sequence
  // object itself, not in CONFIG). Falls back to the original
  // CONFIG[cfg.settingKey].default lookup when omitted, so every one of
  // the existing fields keeps behaving exactly as before.
  function msFieldDefault(cfg) {
    if (cfg.getDefault) return cfg.getDefault();
    return CONFIG_BY_KEY[cfg.settingKey].default;
  }
  function msSummaryText(fieldId) {
    const cfg = MULTI_SELECT_FIELDS[fieldId];
    const sel = multiSelectState[cfg.key];
    if (cfg.emptyMeansAll === false) {
      return cfg.title;
    }
    if (!sel.length) return 'All ' + cfg.label;
    const opts = cfg.getOptions();
    if (sel.length <= 2) return sel.map((v) => ((opts.find((o) => o.value === v) || {}).label || v)).join(', ');
    return sel.length + ' selected';
  }
  function updateMsSummary(fieldId) {
    document.getElementById(fieldId).textContent = msSummaryText(fieldId);
  }
  function updateAllMsSummaries() {
    Object.keys(MULTI_SELECT_FIELDS).forEach(updateMsSummary);
  }
  // Movie search (movieInput) is mutually exclusive with every OTHER
  // Kiosk panel filter, Actor included — searching by movie title only
  // ever makes sense against the whole library (that one title, found
  // wherever it is), not narrowed by genre/year/actor/etc. at the same
  // time. Whichever side the person just touched wins: using it clears
  // and grays out every field on the OTHER side, until that side is
  // itself cleared again. Sort is deliberately untouched by any of this
  // — it stays usable either way (movie search only fixes the FIRST
  // slot; the rest of the poster wall still follows Sort, same as
  // always).
  const PANEL_FILTER_MS_KEYS = ['Filters', 'Features', 'Genres', 'OfficialRatings', 'Tags', 'VideoTypes', 'Years', 'Studios', 'Collections'];
  function anyPanelFilterActive() {
    return PANEL_FILTER_MS_KEYS.some((k) => multiSelectState[k] && multiSelectState[k].length > 0) || document.getElementById('actorInput').value.trim().length > 0;
  }
  function applyFilterMovieExclusionVisuals() {
    const movieActive = document.getElementById('movieInput').value.trim().length > 0;
    const filtersActive = anyPanelFilterActive();
    const disableFilters = movieActive;
    const disableMovie = filtersActive;
    Object.keys(MULTI_SELECT_FIELDS).forEach((fieldId) => {
      const cfg = MULTI_SELECT_FIELDS[fieldId];
      if (!PANEL_FILTER_MS_KEYS.includes(cfg.key)) return; // only the Kiosk panel's own 9 — leaves any OTHER multiselect elsewhere in the app (e.g. Environment Effects) untouched
      const el = document.getElementById(fieldId);
      if (!el) return;
      el.disabled = disableFilters; // not a native <select>, but isRowDisabled (keyboard nav skip) and this field's own click handler both already just check this same property generically
      el.classList.toggle('disabled', disableFilters);
      const labelEl = document.getElementById(fieldId + 'Label');
      if (labelEl) labelEl.classList.toggle('disabled', disableFilters);
    });
    const actorInputEl = document.getElementById('actorInput');
    actorInputEl.disabled = disableFilters;
    const actorLabelEl = document.getElementById('actorLabel');
    if (actorLabelEl) actorLabelEl.classList.toggle('disabled', disableFilters);
    const movieInputEl = document.getElementById('movieInput');
    movieInputEl.disabled = disableMovie;
    const movieLabelEl = document.getElementById('movieLabel');
    if (movieLabelEl) movieLabelEl.classList.toggle('disabled', disableMovie);
  }
  // source: 'movie' when movieInput itself just changed, anything else
  // (including omitted) when some OTHER filter (a multiselect or Actor)
  // just changed — decides which side's values get cleared, if either.
  function updateFilterMovieExclusion(source) {
    if (source === 'movie') {
      if (document.getElementById('movieInput').value.trim().length > 0) {
        PANEL_FILTER_MS_KEYS.forEach((k) => { multiSelectState[k] = []; });
        updateAllMsSummaries();
        document.getElementById('actorInput').value = '';
        acSelectedPersonId = '';
      }
    } else if (anyPanelFilterActive()) {
      document.getElementById('movieInput').value = '';
      acSelectedMovieId = '';
    }
    applyFilterMovieExclusionVisuals();
  }
  let msOpenFieldId = null;
  let msNavIndex = 0;
  function resetMsField() {
    const cfg = MULTI_SELECT_FIELDS[msOpenFieldId];
    multiSelectState[cfg.key] = cfg.emptyMeansAll === false ? msFieldDefault(cfg).slice() : [];
    if (cfg.settingKey) saveSetting(cfg.settingKey, JSON.stringify(multiSelectState[cfg.key]));
    if (cfg.onChange) cfg.onChange();
    updateMsSummary(msOpenFieldId);
    closeMsDropdown();
    updateFilterMovieExclusion('filter');
  }
  function renderMsOptions() {
    const cfg = MULTI_SELECT_FIELDS[msOpenFieldId];
    const opts = cfg.getOptions();
    const sel = multiSelectState[cfg.key];
    gpDropdownEl.innerHTML = '';
    const resetDiv = document.createElement('div');
    resetDiv.className = 'opt msReset' + (msNavIndex === 0 ? ' hi' : '');
    resetDiv.textContent = 'Reset ' + cfg.title;
    resetDiv.addEventListener('click', () => { msNavIndex = 0; resetMsField(); });
    gpDropdownEl.appendChild(resetDiv);
    if (!opts.length) {
      const empty = document.createElement('div');
      empty.className = 'opt';
      empty.textContent = '(none available)';
      gpDropdownEl.appendChild(empty);
      return;
    }
    opts.forEach((opt, i) => {
      const div = document.createElement('div');
      div.className = 'opt msOpt' + (i + 1 === msNavIndex ? ' hi' : '') + (opt.disabled ? ' disabled' : '');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = sel.includes(opt.value);
      cb.disabled = !!opt.disabled;
      const span = document.createElement('span');
      span.textContent = opt.label + (cfg.emptyMeansAll === false ? (msFieldDefault(cfg).includes(opt.value) ? ' (default: on)' : ' (default: off)') : '') + (opt.disabled && opt.disabledHint ? ' (' + opt.disabledHint + ')' : '');
      div.appendChild(cb);
      div.appendChild(span);
      if (!opt.disabled) div.addEventListener('click', () => { msNavIndex = i + 1; toggleMsOption(opt.value); });
      gpDropdownEl.appendChild(div);
    });
  }
  function toggleMsOption(value) {
    const cfg = MULTI_SELECT_FIELDS[msOpenFieldId];
    const sel = multiSelectState[cfg.key];
    const idx = sel.indexOf(value);
    if (idx === -1) sel.push(value); else sel.splice(idx, 1);
    if (cfg.settingKey) saveSetting(cfg.settingKey, JSON.stringify(sel));
    if (cfg.onChange) cfg.onChange();
    renderMsOptions();
    updateMsSummary(msOpenFieldId);
    updateFilterMovieExclusion('filter');
  }
  function positionDropdownNear(el) {
    const rect = el.getBoundingClientRect();
    const dropdownMaxHeight = 240;
    const margin = 4;
    gpDropdownEl.style.left = rect.left + 'px';
    gpDropdownEl.style.width = rect.width + 'px';
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < dropdownMaxHeight + margin && spaceAbove > spaceBelow) {
      gpDropdownEl.style.top = '';
      gpDropdownEl.style.bottom = (window.innerHeight - rect.top + margin) + 'px';
    } else {
      gpDropdownEl.style.bottom = '';
      gpDropdownEl.style.top = (rect.bottom + margin) + 'px';
    }
  }
  function openMsDropdown(fieldId) {
    msOpenFieldId = fieldId;
    msNavIndex = 0;
    const el = document.getElementById(fieldId);
    positionDropdownNear(el);
    renderMsOptions();
    gpDropdownEl.style.display = 'block';
  }
  function closeMsDropdown() {
    gpDropdownEl.style.display = 'none';
    msOpenFieldId = null;
  }
  let kbDropHoldStart = 0;
  function kbDropStep(e) {
    // Keyboard auto-repeat acceleration for open dropdown lists — same
    // feel as the gamepad path (1 -> 3 -> 10 with hold time).
    if (!e.repeat) { kbDropHoldStart = performance.now(); return 1; }
    return dropdownStepSize(performance.now() - kbDropHoldStart);
  }
  function moveMsNav(delta, isFreshPress) {
    const cfg = MULTI_SELECT_FIELDS[msOpenFieldId];
    const opts = cfg.getOptions();
    const last = opts.length;
    let next = msNavIndex + delta;
    // Wrap-around only on a deliberate fresh press AT the edge; held
    // auto-scroll stops hard at the ends — release and press again to jump.
    if (next < 0) next = (isFreshPress && msNavIndex === 0) ? last : 0;
    else if (next > last) next = (isFreshPress && msNavIndex === last) ? 0 : last;
    msNavIndex = next;
    renderMsOptions();
    const hi = gpDropdownEl.querySelector('.hi');
    if (hi) hi.scrollIntoView({ block: 'nearest' });
  }
  Object.keys(MULTI_SELECT_FIELDS).forEach((fieldId) => {
    const triggerEl = document.getElementById(fieldId);
    triggerEl.addEventListener('click', () => {
      if (triggerEl.disabled) return;
      if (msOpenFieldId === fieldId) { closeMsDropdown(); return; }
      openMsDropdown(fieldId);
    });
    triggerEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (msOpenFieldId === fieldId) closeMsDropdown();
    });
  });
  document.getElementById('gpDropdown').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (msOpenFieldId) closeMsDropdown();
  });
  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (msOpenFieldId && !gpDropdownEl.contains(e.target) && e.target.id !== msOpenFieldId) {
      closeMsDropdown();
    }
    if (acOpen && !gpDropdownEl.contains(e.target) && e.target.id !== 'actorInput' && e.target.id !== 'movieInput') {
      acClose();
    }
    if (navEditing && !gpDropdownEl.contains(e.target) && (!e.target || e.target.tagName !== 'SELECT')) {
      navEditing = false;
      const rows = panelEl.style.display === 'block' ? panelRows : menuRows;
      const row = rows[navFocusIndex];
      const el = row && document.getElementById(row.id);
      if (el) el.selectedIndex = gpDropdownOriginalIndex;
      closeGpDropdown();
    }
  });
  async function fetchFilterOptions() {
    const [filters, studios, collections] = await Promise.all([
      jfGet('/Items/Filters', { userId: session.userId, IncludeItemTypes: 'Movie', Recursive: 'true' }),
      jfGet('/Studios', { userId: session.userId, IncludeItemTypes: 'Movie', Recursive: 'true' }),
      // No dedicated "/Collections" list endpoint exists (unlike /Studios) —
      // BoxSets are fetched via the generic Items endpoint, same underlying
      // mechanism the official Jellyfin web client uses to list them.
      jfGet('/Items', { userId: session.userId, IncludeItemTypes: 'BoxSet', Recursive: 'true', SortBy: 'SortName' }).catch(() => ({ Items: [] })),
    ]);
    const asStrings = (arr) => (arr || []).map((v) => (typeof v === 'string' ? v : v.Name)).sort();
    return {
      genres: asStrings(filters.Genres),
      tags: asStrings(filters.Tags),
      ratings: asStrings(filters.OfficialRatings),
      years: (filters.Years || []).slice().sort((a, b) => b - a),
      studios: (studios.Items || []).map((s) => s.Name).sort(),
      collections: (collections.Items || []).map((c) => ({ id: c.Id, name: c.Name })).sort((a, b) => a.name.localeCompare(b.name)),
    };
  }
  // Fetches the member movie ids for one BoxSet. Only its own children (not
  // recursive into nested folders) — matches how Jellyfin itself resolves
  // collection membership.
  async function fetchCollectionMovieIds(collectionId) {
    try {
      const data = await jfGet('/Users/' + session.userId + '/Items', { ParentId: collectionId, IncludeItemTypes: 'Movie', Recursive: 'true', Fields: '' });
      return (data.Items || []).map((i) => i.Id);
    } catch (err) {
      return [];
    }
  }
  async function findPersonId(name) {
    if (!name) return '';
    const data = await jfGet('/Persons', { searchTerm: name, userId: session.userId, IncludeItemTypes: 'Movie', Limit: '20' });
    const lower = name.toLowerCase();
    const match = (data.Items || []).find((p) => p.Name && p.Name.toLowerCase().startsWith(lower));
    return match ? match.Id : '';
  }
  // Same idea as findPersonId, but for a movie TITLE — and deliberately
  // "contains" (includes), not "starts with". People search NEEDS
  // startsWith as its own extra client-side filter on top of whatever
  // Jellyfin's own searchTerm already returns (confirmed against a real
  // server — searchTerm alone wasn't reliable there), but that's a
  // property of THAT search, not a rule Movie search has to inherit —
  // here, matching anywhere in the title is exactly what's wanted.
  async function findMovieId(name) {
    if (!name) return '';
    const data = await jfGet('/Users/' + session.userId + '/Items', { searchTerm: name, IncludeItemTypes: 'Movie', Recursive: 'true', Limit: '20' });
    const lower = name.toLowerCase();
    const match = (data.Items || []).find((m) => m.Name && m.Name.toLowerCase().includes(lower));
    return match ? match.Id : '';
  }
  let acOpen = false;
  let acResults = [];
  let acNavIndex = 0;
  // Tracks whether the person has actually navigated (arrow keys/
  // gamepad d-pad) since the CURRENT set of results appeared — acNavIndex
  // itself defaults to 0 on every fresh render (so Enter without any
  // navigation still sensibly confirms the top match, same as a normal
  // search box), but that default alone shouldn't make the first result
  // LOOK selected/hovered before the person did anything at all — this
  // is a custom-built dropdown, not a native one, so unlike a real
  // <select> there's no browser-native convention forcing that. Real
  // mouse hover is untouched by any of this — it's pure CSS (:hover),
  // driven by actual cursor position, nothing to do with this flag or
  // acNavIndex at all.
  let acKeyboardNavigated = false;
  let acSelectedPersonId = '';
  let acSelectedMovieId = '';
  // Which field currently owns the ONE shared dropdown element — Actor
  // and Movie can't both be showing results at once (only one field can
  // ever be focused/typing at a time), so a single shared piece of state
  // is enough; no need to duplicate acOpen/acResults/acNavIndex per field.
  let acMode = 'person';
  let acDebounceTimer = null;
  function acClose() {
    acOpen = false;
    acResults = [];
    document.getElementById('gpDropdown').style.display = 'none';
  }
  function acRender() {
    const el = document.getElementById('gpDropdown');
    el.innerHTML = '';
    acResults.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = 'opt' + (i === acNavIndex && acKeyboardNavigated ? ' hi' : '');
      div.textContent = p.Name;
      div.addEventListener('click', () => { acNavIndex = i; acSelect(); });
      el.appendChild(div);
    });
  }
  function acOpenDropdown() {
    acOpen = true;
    const inputEl = document.getElementById(acMode === 'movie' ? 'movieInput' : 'actorInput');
    const rect = inputEl.getBoundingClientRect();
    const el = document.getElementById('gpDropdown');
    el.style.left = rect.left + 'px';
    el.style.top = (rect.bottom + 4) + 'px';
    el.style.width = rect.width + 'px';
    el.style.display = 'block';
  }
  function acMoveNav(delta) {
    if (!acResults.length) return;
    acKeyboardNavigated = true;
    acNavIndex = Math.max(0, Math.min(acResults.length - 1, acNavIndex + delta));
    acRender();
  }
  function acSelect() {
    const p = acResults[acNavIndex];
    if (!p) return;
    const inputEl = document.getElementById(acMode === 'movie' ? 'movieInput' : 'actorInput');
    if (acMode === 'movie') acSelectedMovieId = p.Id;
    else acSelectedPersonId = p.Id;
    inputEl.value = p.Name;
    inputEl.classList.remove('invalid');
    acClose();
    updateFilterMovieExclusion(acMode === 'movie' ? 'movie' : 'filter');
  }
  async function acSearch(term, mode) {
    acMode = mode;
    try {
      let data;
      const lower = term.toLowerCase();
      if (mode === 'movie') {
        data = await jfGet('/Users/' + session.userId + '/Items', { searchTerm: term, IncludeItemTypes: 'Movie', Recursive: 'true', Limit: '30' });
      } else {
        data = await jfGet('/Persons', { searchTerm: term, userId: session.userId, IncludeItemTypes: 'Movie', Limit: '30' });
      }
      const matchFn = mode === 'movie' ? (n) => n.includes(lower) : (n) => n.startsWith(lower);
      acResults = (data.Items || []).filter((p) => p.Name && matchFn(p.Name.toLowerCase())).slice(0, 8);
      if (!acResults.length) { acClose(); return; }
      acNavIndex = 0;
      acKeyboardNavigated = false;
      acRender();
      acOpenDropdown();
    } catch (err) { acClose(); }
  }
  function posterUrl(item, maxHeight) {
    const tag = item.ImageTags.Primary;
    return session.serverUrl + '/Items/' + item.Id + '/Images/Primary?maxHeight=' + (maxHeight || 600) + '&quality=90&tag=' + tag + '&api_key=' + session.accessToken;
  }
  function detailUrl(item) {
    return session.serverUrl + '/web/#/details?id=' + item.Id;
  }
  function loadSetting(key, fallback) {
    const v = sessionStorage.getItem('jfCinema_' + key);
    return v === null ? fallback : v;
  }
  function loadBoolSetting(key, fallback) {
    const v = sessionStorage.getItem('jfCinema_' + key);
    return v === null ? fallback : v === 'true';
  }
  function saveSetting(key, val) {
    sessionStorage.setItem('jfCinema_' + key, String(val));
  }
  function markDefaultOption(selectEl, defaultValue) {
    Array.from(selectEl.options).forEach((opt) => {
      if (opt.value === String(defaultValue)) opt.textContent += ' (default)';
    });
  }
  // Unlike markDefaultOption above (meant for a ONE-TIME startup call with
  // a fixed, never-changing value), this strips any previous marker
  // before adding the new one — safe to call repeatedly with a
  // DIFFERENT defaultValue each time, which Ambient's own per-profile,
  // per-step true defaults need (see updateAmbientSequenceDefaultHints).
  function updateDefaultOptionMarker(selectEl, defaultValue) {
    Array.from(selectEl.options).forEach((opt) => {
      opt.textContent = opt.textContent.replace(/ \(default\)$/, '');
      if (opt.value === String(defaultValue)) opt.textContent += ' (default)';
    });
  }
  // This trio (markDefaultOption/updateDefaultOptionMarker/setBoolDefaultHint)
  // plus every wireXxx helper below are THE mechanism for the absolute
  // rule in CONFIG's own big comment: every "(default: X)" hint and every
  // "(default)" option marker gets populated by calling one of these,
  // never by typing the value into the HTML directly. Adding a new
  // setting with a visible default → reuse one of these, don't improvise.
  function setBoolDefaultHint(hintEl, defaultValue) {
    if (hintEl) hintEl.textContent = '(default: ' + (defaultValue ? 'on' : 'off') + ')';
  }
  // ---- Room Design themes — colors/textures only, room SHAPE/geometry ----
  // ---- never changes between themes, only what it's dressed in ----
  // Six palettes: our own original look ('velvet', the DEFAULT) plus five
  // more built from the person's own reference photos/descriptions
  // (Starship, Neon, Cyber, Classic, Lounge). Every theme fills the exact
  // same set of slots so applyRoomTheme() never has to special-case a
  // missing field. 'velvet' intentionally reproduces the PRE-existing
  // hardcoded values exactly, so picking it (the default) looks
  // byte-identical to how the room always looked before this system
  // existed.
  const ROOM_THEMES = {
    velvet: {
      label: 'Velvet',
      carpetPattern: 'diamond', wainscotPattern: 'wood', curtainPattern: 'pleat',
      carpetBase: '#3a0f14', carpetStripe: '#5c1a20', carpetDiamond: '#c9974a',
      wainscotBase: '#2a1810', wainscotBand: 'rgba(84,54,32,0.5)',
      curtainStops: ['#4a0d12', '#7a1a1f', '#4a0d12'], curtainLine: 'rgba(0,0,0,0.25)',
      posterWallColor: 0x241210, wallColor: 0x241210, ceilingColor: 0x0e0806,
      trimColor: 0xc9974a, trimMetalness: 0.7, trimRoughness: 0.3,
      fogColor: 0x0f0705, fogDensity: 0.004,
      ropeColor: 0x6a0f14,
      kioskBodyColor: 0x241210, kioskTopColor: 0x1a2a2a, kioskTopEmissive: 0x2fa0a0,
      kioskLightColor: 0x4fd0d0, kioskSpotColor: 0xffe0b0,
      marqueeColor: 0xffdca0,
      hemiSky: 0xffe6c2, hemiGround: 0x2a1710, ambientColor: 0x4a2c1c, screenLightColor: 0xffb066,
    },
    starship: {
      label: 'Starship',
      carpetPattern: 'chevron', wainscotPattern: 'panel', curtainPattern: 'diagonal',
      carpetBase: '#1c1e21', carpetStripe: '#26282c', carpetDiamond: '#6fd7ff',
      wainscotBase: '#1c1e21', wainscotBand: 'rgba(60,64,72,0.55)',
      curtainStops: ['#202226', '#33363c', '#202226'], curtainLine: 'rgba(255,120,40,0.3)',
      posterWallColor: 0x363242, wallColor: 0x202225, ceilingColor: 0x16171a,
      trimColor: 0x8a8f99, trimMetalness: 0.85, trimRoughness: 0.25,
      fogColor: 0x0a0c10, fogDensity: 0.0045,
      ropeColor: 0xd9601a,
      kioskBodyColor: 0x202225, kioskTopColor: 0x142430, kioskTopEmissive: 0x3fd0ff,
      kioskLightColor: 0x3fd0ff, kioskSpotColor: 0xcfe8ff,
      marqueeColor: 0xff8a3c,
      hemiSky: 0x6fa0c0, hemiGround: 0x1a1c20, ambientColor: 0x2a3038, screenLightColor: 0xff7a33,
    },
    neon: {
      label: 'Neon',
      carpetPattern: 'grid', wainscotPattern: 'flat', curtainPattern: 'jagged',
      carpetBase: '#0a0a0c', carpetStripe: '#141416', carpetDiamond: '#ff2fd1',
      wainscotBase: '#0a0a0c', wainscotBand: 'rgba(30,30,34,0.5)',
      curtainStops: ['#050505', '#111111', '#050505'], curtainLine: 'rgba(255,47,209,0.35)',
      posterWallColor: 0x0b0b0d, wallColor: 0x08080a, ceilingColor: 0x050506,
      trimColor: 0x2fe0ff, trimMetalness: 0.6, trimRoughness: 0.2,
      fogColor: 0x0c0610, fogDensity: 0.0035,
      ropeColor: 0x39ff6a,
      kioskBodyColor: 0x0b0b0d, kioskTopColor: 0x120018, kioskTopEmissive: 0xff2fd1,
      kioskLightColor: 0x2fe0ff, kioskSpotColor: 0xff2fd1,
      marqueeColor: 0x2fe0ff,
      hemiSky: 0x6a2fff, hemiGround: 0x000000, ambientColor: 0x1a0a24, screenLightColor: 0x39d6ff,
    },
    cyber: {
      label: 'Cyber',
      carpetPattern: 'hex', wainscotPattern: 'circuit', curtainPattern: 'thinGrid',
      carpetBase: '#0d1230', carpetStripe: '#141c40', carpetDiamond: '#35e6ff',
      wainscotBase: '#0a0d20', wainscotBand: 'rgba(40,50,90,0.5)',
      curtainStops: ['#0a0d24', '#17204a', '#0a0d24'], curtainLine: 'rgba(122,77,255,0.3)',
      posterWallColor: 0x10142c, wallColor: 0x0c0f24, ceilingColor: 0x07091a,
      trimColor: 0x7a4dff, trimMetalness: 0.8, trimRoughness: 0.2,
      fogColor: 0x080a1c, fogDensity: 0.004,
      ropeColor: 0x35e6ff,
      kioskBodyColor: 0x10142c, kioskTopColor: 0x0a1a30, kioskTopEmissive: 0x35e6ff,
      kioskLightColor: 0x35e6ff, kioskSpotColor: 0xd8ccff,
      marqueeColor: 0x8fe8ff,
      hemiSky: 0x4a6aff, hemiGround: 0x05060f, ambientColor: 0x161c3c, screenLightColor: 0x5fc8ff,
    },
    classic: {
      label: 'Classic',
      // Committed to ONE dominant color — gold/bronze — rather than the
      // earlier mix of deep red carpet/rope alongside gold trim. Velvet
      // already owns red; sitting a saturated red directly next to warm
      // gold lighting was reading as a muddy, faintly greenish/olive
      // clash in the rendered room rather than two colors coexisting
      // cleanly. Red is removed entirely here (carpet, rope — the only
      // two places that had it) in favor of the same warm bronze/gold the
      // rest of the palette already leaned on, so nothing competes.
      carpetPattern: 'scallop', wainscotPattern: 'richWood', curtainPattern: 'denseFold',
      carpetBase: '#3a2408', carpetStripe: '#5a3810', carpetDiamond: '#f0c060',
      wainscotBase: '#3a2210', wainscotBand: 'rgba(150,104,44,0.55)',
      curtainStops: ['#8a6018', '#e0b048', '#8a6018'], curtainLine: 'rgba(90,60,10,0.3)',
      posterWallColor: 0x462a12, wallColor: 0x38240e, ceilingColor: 0x2c1c0a,
      trimColor: 0xf0c060, trimMetalness: 0.9, trimRoughness: 0.15,
      fogColor: 0x241a08, fogDensity: 0.0038,
      ropeColor: 0xb4842c,
      kioskBodyColor: 0x462a12, kioskTopColor: 0x342206, kioskTopEmissive: 0xf0c060,
      kioskLightColor: 0xffe090, kioskSpotColor: 0xfff0c0,
      marqueeColor: 0xffedc0,
      hemiSky: 0xfff0c0, hemiGround: 0x422c10, ambientColor: 0x6e4a20, screenLightColor: 0xffd890,
    },
    lounge: {
      label: 'Lounge',
      carpetPattern: 'weave', wainscotPattern: 'brushed', curtainPattern: 'minimal',
      carpetBase: '#2a2724', carpetStripe: '#363330', carpetDiamond: '#c9a06a',
      wainscotBase: '#2a1d14', wainscotBand: 'rgba(70,50,32,0.45)',
      curtainStops: ['#1c140e', '#2e2016', '#1c140e'], curtainLine: 'rgba(0,0,0,0.2)',
      posterWallColor: 0x232220, wallColor: 0x2e2d2c, ceilingColor: 0x141312,
      trimColor: 0x5a5854, trimMetalness: 0.6, trimRoughness: 0.4,
      fogColor: 0x0e0e10, fogDensity: 0.0035,
      ropeColor: 0x3a5a7a,
      kioskBodyColor: 0x2a1d14, kioskTopColor: 0x1a2830, kioskTopEmissive: 0x4a8ac0,
      kioskLightColor: 0xd8a860, kioskSpotColor: 0xe8c090,
      marqueeColor: 0xd8a860,
      hemiSky: 0x8090a0, hemiGround: 0x201c18, ambientColor: 0x38342e, screenLightColor: 0xb0906a,
    },
  };
  const ROOM_DESIGN_KEYS = Object.keys(ROOM_THEMES);
  let ACTIVE_ROOM_DESIGN = ROOM_THEMES[MENU_CONFIG.menu.room.design.roomDesign.default] ? MENU_CONFIG.menu.room.design.roomDesign.default : 'velvet';
  const ROOM_DEPTH_BY_SIZE = { '10': 34, '20': 60, '30': 86 };
  const FULL_SCALE_BY_SIZE = { '10': 1.0, '20': 1.4, '30': 1.8 };
  const savedRoomSize = sessionStorage.getItem('jfCinemaRoomSize');
  const savedScaleMode = sessionStorage.getItem('jfCinemaRoomScaleMode');
  const savedScaleMovementSpeed = sessionStorage.getItem('jfCinemaScaleMovementSpeed');
  const savedScalePlayerPosition = sessionStorage.getItem('jfCinemaScalePlayerPosition');
  const ACTIVE_ROOM_SIZE = savedRoomSize || MENU_CONFIG.menu.room.design.roomSize.default;
  const ACTIVE_SCALE_MODE = savedScaleMode || MENU_CONFIG.menu.room.design.roomScaleMode.default;
  const ACTIVE_SCALE_MOVEMENT_SPEED = savedScaleMovementSpeed !== null ? savedScaleMovementSpeed === 'true' : MENU_CONFIG.menu.room.design.scaleMovementSpeed.default;
  const ACTIVE_SCALE_PLAYER_POSITION = savedScalePlayerPosition !== null ? savedScalePlayerPosition === 'true' : MENU_CONFIG.menu.room.design.scalePlayerPosition.default;
  const ROOM_WIDTH_HEIGHT_SCALE = ACTIVE_SCALE_MODE === 'full' ? FULL_SCALE_BY_SIZE[ACTIVE_ROOM_SIZE] : 1.0;
  let ROOM_WIDTH = 24 * ROOM_WIDTH_HEIGHT_SCALE, ROOM_DEPTH = ROOM_DEPTH_BY_SIZE[ACTIVE_ROOM_SIZE], ROOM_HEIGHT = 7.2 * ROOM_WIDTH_HEIGHT_SCALE;
  // ---- Live room-size animation state (Step 1: shell geometry + movement
  // bounds only — posters/backwall/kiosk-lighting/screen follow in later
  // steps, per plan). Driven by a TEST-only select in the menu (never
  // saved). 3 seconds per size step, both directions, all three
  // dimensions moving together — matches the discussed "dream stretch".
  const ROOM_SIZE_STEPS = ['10', '20', '30'];
  const ROOM_SIZE_STEP_MS = 3000;
  let roomAnimActive = false;
  let roomAnimFromW = ROOM_WIDTH, roomAnimFromD = ROOM_DEPTH, roomAnimFromH = ROOM_HEIGHT;
  let roomAnimToW = ROOM_WIDTH, roomAnimToD = ROOM_DEPTH, roomAnimToH = ROOM_HEIGHT;
  let roomAnimElapsedMs = 0, roomAnimDurationMs = 0;
  function targetRoomDims(sizeKey) {
    // Reads the LIVE scale-mode setting (not the frozen ACTIVE_SCALE_MODE
    // constant from page load) — the dropdown can change without a
    // reload now, and a resize must honor whatever it currently says.
    const liveMode = (typeof roomScaleModeSelect !== 'undefined' && roomScaleModeSelect) ? roomScaleModeSelect.value : ACTIVE_SCALE_MODE;
    const scale = liveMode === 'full' ? FULL_SCALE_BY_SIZE[sizeKey] : 1.0;
    return { w: 24 * scale, d: ROOM_DEPTH_BY_SIZE[sizeKey], h: 7.2 * scale };
  }
  function startRoomResizeAnimation(targetKey) {
    // Locked while a resize is already in flight — no new request is
    // accepted until the current one fully completes (roomAnimActive
    // only goes false once easedT reaches 1). Returns whether the
    // request was actually accepted, so callers can avoid updating a
    // dropdown's displayed value (or persisting it) for a change that
    // never actually happened.
    if (roomAnimActive) return false;
    const target = targetRoomDims(targetKey);
    if (target.w === ROOM_WIDTH && target.d === ROOM_DEPTH && target.h === ROOM_HEIGHT) return false;
    const fromIdx = ROOM_SIZE_STEPS.indexOf(currentRoomSizeKey());
    const toIdx = ROOM_SIZE_STEPS.indexOf(targetKey);
    const steps = fromIdx >= 0 && toIdx >= 0 ? Math.abs(toIdx - fromIdx) : 1;
    roomAnimFromW = ROOM_WIDTH; roomAnimFromD = ROOM_DEPTH; roomAnimFromH = ROOM_HEIGHT;
    roomAnimToW = target.w; roomAnimToD = target.d; roomAnimToH = target.h;
    roomAnimElapsedMs = 0;
    roomAnimDurationMs = Math.max(1, steps) * ROOM_SIZE_STEP_MS;
    roomAnimActive = true;
    if (typeof syncPosterCountForResize === 'function') syncPosterCountForResize(target.d);
    return true;
  }
  function currentRoomSizeKey() {
    // Best-effort match of the live dims back to a known step (for
    // duration counting only — falls back to '20' if mid-flight/unknown).
    for (const k of ROOM_SIZE_STEPS) { if (ROOM_DEPTH_BY_SIZE[k] === roomAnimToD) return k; }
    return '20';
  }
  // Shared by the keyboard shortcut (-/+) and the gamepad shortcut
  // (D-Pad up/down) — dir -1 = shrink one step, +1 = enlarge one step.
  // startRoomResizeAnimation itself already rejects a new request
  // outright while one is still mid-flight (roomAnimActive) or already
  // at the requested size, so nothing extra is needed here to prevent
  // stacking/interrupting an in-progress resize — this just does the
  // step-index math and the same UI/persistence bookkeeping the old
  // per-key blocks each used to duplicate. ALSO rejects outright while
  // a Poster Page switch is still fading (pageChangeActive) — both
  // ultimately call applyPosterDiff on the exact same poster groups
  // (syncPosterCountForResize does, for a resize), and each has its OWN
  // independent per-frame driver (updateRoomResizeAnimation's own loop
  // vs. runPosterPageFadeAnimation's own rAF loop) — running both at
  // once would have them fight over the same materials' opacity every
  // frame. Same reasoning applies in stepPosterPage, the other way
  // around.
  function stepRoomSize(dir) {
    if (pageChangeActive) return;
    const idx = ROOM_SIZE_STEPS.indexOf(currentRoomSizeKey());
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= ROOM_SIZE_STEPS.length) return;
    const k = ROOM_SIZE_STEPS[nextIdx];
    if (startRoomResizeAnimation(k)) {
      roomSizeSelect.value = k;
      sessionStorage.setItem('jfCinemaRoomSize', k);
      updateRoomSizeMenuState();
    }
  }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function updateRoomResizeAnimation(dtSec) {
    if (!roomAnimActive) return;
    // Progress is accumulated from the SAME per-frame dt the rest of the
    // engine already uses for movement/physics (clamped to 0.1s per frame
    // at the call site) — NOT from raw elapsed wall-clock time. A stall
    // (heavy image decode, GPU hiccup, GC pause — exactly what a big
    // grow, loading many new poster textures + rebuilding the backwall
    // at once, can cause) used to make the next frame's real-time delta
    // huge, jumping "t" far forward in one step and materializing several
    // chained posters all at once instead of one by one. Now a stall just
    // makes the whole animation take a bit longer in real time — it can
    // never skip ahead.
    roomAnimElapsedMs += Math.min(dtSec, 0.1) * 1000;
    const t = Math.min(1, roomAnimElapsedMs / roomAnimDurationMs);
    const e = easeInOutCubic(t);
    const oldRoomWidth = ROOM_WIDTH, oldRoomDepth = ROOM_DEPTH;
    ROOM_WIDTH = roomAnimFromW + (roomAnimToW - roomAnimFromW) * e;
    ROOM_DEPTH = roomAnimFromD + (roomAnimToD - roomAnimFromD) * e;
    // Keep the player at the same RELATIVE position in the room as it
    // resizes — Full Scale mode only, per explicit request (Length Only
    // never repositions the player). Since the room always scales
    // symmetrically around the kiosk-centered origin, a plain
    // multiplicative factor does exactly what's wanted on its own:
    // standing exactly at the origin (x=0, z=0) never moves at all
    // (anything times 0 is 0), and standing anywhere else tracks
    // proportionally with the walls around it — the wall can never push
    // through the player, because the player scales with it.
    if (typeof scalePlayerPositionEnabled !== 'undefined' && scalePlayerPositionEnabled
      && typeof roomScaleModeSelect !== 'undefined' && roomScaleModeSelect && roomScaleModeSelect.value === 'full'
      && oldRoomWidth > 0 && oldRoomDepth > 0) {
      camera.position.x *= ROOM_WIDTH / oldRoomWidth;
      camera.position.z *= ROOM_DEPTH / oldRoomDepth;
    }
    ROOM_HEIGHT = roomAnimFromH + (roomAnimToH - roomAnimFromH) * e;
    room.updateRoomShellTransform();
    refreshScreenContentFit();
    updatePosterWallPositions();
    if (typeof updatePosterFrameChains === 'function') updatePosterFrameChains(e);
    if (typeof updateBackdropGeometryLive === 'function' && room.backdropGroup) updateBackdropGeometryLive(t >= 1);
    if (typeof updateKioskLightConeHeight === 'function') updateKioskLightConeHeight();
    if (t >= 1) roomAnimActive = false;
  }
  // Shared by resize (targetDepth) and page slicing (current ROOM_DEPTH)
  // — the one formula both need, instead of two copies drifting apart.
  function slotsForDepth(depth) {
    return Math.max(0, Math.floor((depth - 10) / 2.6) + 1) * 2;
  }
  // Always sized for the LARGEST possible room (30-preset depth), not the
  // ACTIVE size at page load — the room can now grow live without a
  // reload, and we want every movie a growth could ever need already
  // fetched from the start, so resizing never has to wait on the server;
  // the resize-chain just draws from a pool that was always big enough.
  const MAX_TOTAL_POSTER_SLOTS = slotsForDepth(ROOM_DEPTH_BY_SIZE['30']);
  const TOTAL_POSTER_SLOTS = slotsForDepth(ROOM_DEPTH);
  // Poster Page navigation — posterPageStartIndex is the library index
  // (into lastLoadedMovies, already sorted/filtered) the CURRENTLY
  // DISPLAYED page begins at. Deliberately an INDEX, not an abstract
  // "page number" — a page NUMBER only means anything relative to a
  // fixed page size, but page size changes with room size (bigger room
  // = more slots = bigger pages), so "page 3" at one size covers a
  // completely different range of the library than "page 3" at another.
  // An index anchored to the underlying list stays meaningful across a
  // resize; a page number wouldn't. pageChangeActive mirrors
  // roomAnimActive's own "reject a new request while one is still
  // settling" role, for the exact same reason (see stepRoomSize's own
  // comment) — a page switch here means fading a whole wall's worth of
  // posters, not an instant swap.
  let posterPageStartIndex = 0;
  // Set (to a real library index, not necessarily 0) by the Movie Search
  // branch of panelApply, moments before this same handler's own shared
  // tail reads and immediately clears it again — see that tail's own
  // comment for why. null the rest of the time.
  let moviePageStartOverride = null;
  let pageChangeActive = false;
  // Poster fade chains (fadeIn/fadeOut, driven by updatePosterFrameChains)
  // were originally only ever driven by the ROOM-RESIZE animation's own
  // per-frame progress (see updateRoomResizeAnimation calling
  // updatePosterFrameChains(e) with ITS OWN eased progress) — there was
  // never a reason for an independent driver before, since nothing else
  // ever started a chain. Poster Page switching needs the exact same
  // fade, but with NO room-resize happening at all, so it needs its own
  // small, self-contained progress loop instead of borrowing someone
  // else's. 900ms — snappy enough not to feel sluggish when quickly
  // flipping through several pages in a row, slow enough that arrivals/
  // departures still read as a fade rather than a flicker.
  const POSTER_PAGE_FADE_MS = 900;
  // Fade duration for a SAME-position poster texture swap (ordinary page
  // flip, same movie count/layout — see applyPosterDiff's own long
  // comment on why this is a separate, poster-only fade instead of the
  // frame+light despawn/respawn dance every OTHER arrival/departure
  // uses) — each direction (out, then in) gets this many ms, so a full
  // swap takes twice this. Deliberately shorter than POSTER_PAGE_FADE_MS
  // — this is JUST the artwork crossfading in place, not a poster
  // physically arriving/leaving, so it reads better snappier.
  const POSTER_TEXTURE_SWAP_FADE_MS = 220;
  let textureSwappingPosters = [];
  function carpetTexture(theme) {
    const size = 256;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = theme.carpetBase; ctx.fillRect(0, 0, size, size);
    const pattern = theme.carpetPattern || 'diamond';
    if (pattern === 'diamond') {
      // Velvet — the original pattern, untouched: diagonal stripes with a
      // grid of small diamonds.
      ctx.strokeStyle = theme.carpetStripe; ctx.lineWidth = 6;
      for (let i = -size; i < size * 2; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke(); }
      ctx.fillStyle = theme.carpetDiamond;
      for (let gx = 16; gx < size; gx += 64) for (let gy = 16; gy < size; gy += 64) {
        ctx.beginPath();
        ctx.moveTo(gx, gy - 6); ctx.lineTo(gx + 6, gy); ctx.lineTo(gx, gy + 6); ctx.lineTo(gx - 6, gy);
        ctx.closePath(); ctx.fill();
      }
    } else if (pattern === 'scallop') {
      // Classic — rows of overlapping fan/sunburst arcs with a gold dot at
      // each join, the Art-Deco motif from the reference photos. Denser
      // and more ornate than Velvet's plain diamond grid on purpose.
      // Grid step MUST evenly divide the canvas size (256) — 32 does
      // (8 full repeats), unlike the previous 28 (256/28 = 9.14…), which
      // left a visible seam every time the texture wrapped: the last,
      // cropped arc at one tile's edge never lined up with the first arc
      // of the next tile.
      const step = 32, r = step / 2;
      ctx.strokeStyle = theme.carpetStripe; ctx.lineWidth = 2.5;
      for (let gy = 0; gy <= size; gy += step) {
        for (let gx = -r; gx <= size + r; gx += step) {
          ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI, false); ctx.stroke();
        }
      }
      ctx.fillStyle = theme.carpetDiamond;
      for (let gy = 0; gy <= size; gy += step) for (let gx = -r; gx <= size + r; gx += step) {
        ctx.beginPath(); ctx.arc(gx, gy, 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (pattern === 'chevron') {
      // Starship — sharp zigzag panel seams with small rivet dots at every
      // joint, reading as riveted hull paneling underfoot. Step 32 (not
      // the original 40) divides the 256px canvas evenly (8 repeats) —
      // same seam-at-the-wrap issue as Classic's scallop pattern, fixed
      // the same way.
      const step = 32;
      ctx.strokeStyle = theme.carpetStripe; ctx.lineWidth = 4;
      for (let i = -size; i < size * 2; i += step) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size / 2, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i + size, 0); ctx.lineTo(i + size / 2, size); ctx.stroke();
      }
      ctx.fillStyle = theme.carpetDiamond;
      for (let gx = 16; gx < size; gx += step) for (let gy = 16; gy < size; gy += step) {
        ctx.beginPath(); ctx.arc(gx, gy, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (pattern === 'grid') {
      // Neon — a plain crossing grid of straight lines with a bright dot
      // at every intersection, echoing the crossing neon tubes on the
      // walls/ceiling rather than any carpet-like motif at all.
      ctx.strokeStyle = theme.carpetStripe; ctx.lineWidth = 2;
      for (let i = 0; i <= size; i += 32) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
      }
      ctx.fillStyle = theme.carpetDiamond;
      for (let gx = 0; gx <= size; gx += 32) for (let gy = 0; gy <= size; gy += 32) {
        ctx.beginPath(); ctx.arc(gx, gy, 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (pattern === 'hex') {
      // Cyber — a honeycomb of hexagon outlines with a glowing node at
      // each center, a circuit-board/microchip feel underfoot. hexW/hexH
      // (32/32, not the original r*1.75/r*1.5 ≈ 31.5/27) are both clean
      // divisors of the 256px canvas (8 rows/cols each, an EVEN row
      // count so the alternating row offset also lines back up at the
      // wrap) — the true regular-hexagon proportions gave the same
      // seam-at-the-wrap problem as the other two patterns above, so the
      // hexagon is very slightly stretched (rx/ry instead of one shared
      // radius) in exchange for tiling perfectly seamlessly, which
      // matters far more at a glance than the exact hexagon proportions.
      const hexW = 32, hexH = 32, rx = hexW / 1.75, ry = hexH / 1.5;
      ctx.strokeStyle = theme.carpetStripe; ctx.lineWidth = 2;
      for (let row = -1; row < size / hexH + 2; row++) {
        for (let col = -1; col < size / hexW + 2; col++) {
          const cx2 = col * hexW + (row % 2 ? hexW / 2 : 0), cy2 = row * hexH;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const ang = (Math.PI / 3) * k, px = cx2 + rx * Math.cos(ang), py = cy2 + ry * Math.sin(ang);
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.stroke();
          ctx.fillStyle = theme.carpetDiamond;
          ctx.beginPath(); ctx.arc(cx2, cy2, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (pattern === 'weave') {
      // Lounge — a subtle, low-contrast herringbone weave, deliberately
      // quiet and understated (no bright accent dots at all) to match the
      // calm, minimal lounge mood.
      ctx.strokeStyle = theme.carpetStripe; ctx.lineWidth = 3;
      for (let gy = -16; gy < size + 16; gy += 16) {
        const dir = (Math.round(gy / 16) % 2 === 0) ? 1 : -1;
        for (let gx = -16; gx < size + 16; gx += 16) {
          ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 16 * dir, gy + 16); ctx.stroke();
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(ROOM_WIDTH / 3, ROOM_DEPTH / 3); tex.anisotropy = 8;
    return tex;
  }
  function woodTexture(theme) {
    const w = 256, h = 256;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = theme.wainscotBase; ctx.fillRect(0, 0, w, h);
    const pattern = theme.wainscotPattern || 'wood';
    if (pattern === 'wood') {
      // Velvet — the original horizontal wood-grain bands, untouched.
      for (let i = 0; i < 10; i++) { ctx.fillStyle = theme.wainscotBand; ctx.fillRect(0, i * (h / 10), w, h / 10 - 3); }
    } else if (pattern === 'richWood') {
      // Classic — twice the band density of Velvet's plain wood, plus a
      // thin gold pinstripe at every seam — richer, more polished panelling.
      for (let i = 0; i < 20; i++) { ctx.fillStyle = theme.wainscotBand; ctx.fillRect(0, i * (h / 20), w, h / 20 - 2); }
      ctx.strokeStyle = 'rgba(255,220,140,0.35)'; ctx.lineWidth = 1;
      for (let i = 0; i <= 20; i++) { ctx.beginPath(); ctx.moveTo(0, i * (h / 20)); ctx.lineTo(w, i * (h / 20)); ctx.stroke(); }
    } else if (pattern === 'panel') {
      // Starship — VERTICAL metal panel seams with small rivets, not
      // horizontal wood bands at all — reads as bolted hull plating.
      for (let i = 0; i < 6; i++) { ctx.fillStyle = theme.wainscotBand; ctx.fillRect(i * (w / 6), 0, w / 6 - 4, h); }
      ctx.fillStyle = 'rgba(200,210,220,0.4)';
      for (let i = 0; i < 6; i++) for (let ry = 12; ry < h; ry += 40) {
        ctx.beginPath(); ctx.arc(i * (w / 6) + 4, ry, 2, 0, Math.PI * 2); ctx.fill();
      }
    } else if (pattern === 'flat') {
      // Neon — almost no visible pattern at all, just a faint hint of
      // banding, keeping the black as close to a true void as possible.
      for (let i = 0; i < 4; i++) { ctx.fillStyle = theme.wainscotBand; ctx.fillRect(0, i * (h / 4), w, h / 4 - 6); }
    } else if (pattern === 'circuit') {
      // Cyber — a thin rectilinear circuit-trace grid instead of any wood
      // or metal banding.
      ctx.strokeStyle = theme.wainscotBand; ctx.lineWidth = 2;
      for (let x = 0; x <= w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y <= h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    } else if (pattern === 'brushed') {
      // Lounge — subtle, irregular vertical brushed-texture streaks
      // rather than a repeating banded pattern.
      ctx.strokeStyle = theme.wainscotBand; ctx.lineWidth = 1;
      for (let x = 4; x < w; x += 7) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (Math.sin(x) * 3), h); ctx.stroke(); }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(ROOM_DEPTH / 4, 1);
    return tex;
  }
  function curtainTexture(theme) {
    const w = 128, h = 128;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, theme.curtainStops[0]);
    grad.addColorStop(0.5, theme.curtainStops[1]);
    grad.addColorStop(1, theme.curtainStops[2]);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    const pattern = theme.curtainPattern || 'pleat';
    ctx.strokeStyle = theme.curtainLine;
    if (pattern === 'pleat') {
      // Velvet — the original straight vertical folds, untouched.
      ctx.lineWidth = 3;
      for (let x = 0; x < w; x += 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    } else if (pattern === 'denseFold') {
      // Classic — noticeably tighter, more numerous pleats than Velvet —
      // a heavier, more luxurious drape.
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    } else if (pattern === 'diagonal') {
      // Starship — diagonal accent lines instead of straight vertical
      // folds, like angled hull plating rather than fabric.
      ctx.lineWidth = 2;
      for (let x = -h; x < w + h; x += 12) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke(); }
    } else if (pattern === 'jagged') {
      // Neon — irregular jagged accent streaks, matching the "shattered
      // prism" neon-line aesthetic rather than any real fold pattern.
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 14) {
        ctx.beginPath(); ctx.moveTo(x, 0);
        ctx.lineTo(x + 5, h * 0.3); ctx.lineTo(x - 3, h * 0.6); ctx.lineTo(x + 4, h);
        ctx.stroke();
      }
    } else if (pattern === 'thinGrid') {
      // Cyber — a fine crossing grid instead of vertical folds, matching
      // the circuit-board wall/wainscot motif.
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y <= h; y += 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    } else if (pattern === 'minimal') {
      // Lounge — a handful of very faint, widely-spaced lines, almost
      // unbroken fabric, matching the calm/understated mood.
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }
  let ropeBarrierGroup = null;
  let roomThemeRefs = {}; // populated fresh by buildCinema/buildKiosk each build, consumed by applyRoomTheme for live swaps
  function buildCinema(scene) {
    const theme = ROOM_THEMES[ACTIVE_ROOM_DESIGN];
    const dimLights = [];
    const dimEmissiveMats = [];
    scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);
    roomThemeRefs.fog = scene.fog;
    const unitPlane = new THREE.PlaneGeometry(1, 1);
    const unitBox = new THREE.BoxGeometry(1, 1, 1);
    const floor = new THREE.Mesh(unitPlane, new THREE.MeshStandardMaterial({ map: carpetTexture(theme), roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);
    // Floor is laid out ONCE at the LARGEST possible size and never
    // touched again — walls of any smaller room always sit strictly
    // within this footprint (hidden by the walls from inside), so the
    // carpet tiling never has to be recomputed live. Recomputing repeat
    // continuously (as every other shell surface does) made the pattern
    // visibly "swim" underfoot during a resize — a real, distinct problem
    // from geometric position, which was already correct/centered.
    // Always sized for the true worst case (full-scale at the largest
    // preset), NOT the scale mode active at page load — that mode can now
    // change live via the menu, so the floor must already cover whatever
    // it could ever grow into, regardless of which mode is picked later.
    const MAX_ROOM_WIDTH = 24 * FULL_SCALE_BY_SIZE['30'];
    const MAX_ROOM_DEPTH = ROOM_DEPTH_BY_SIZE['30'];
    floor.scale.set(MAX_ROOM_WIDTH, MAX_ROOM_DEPTH, 1);
    floor.material.map.repeat.set(MAX_ROOM_WIDTH / 3, MAX_ROOM_DEPTH / 3);
    roomThemeRefs.floorMat = floor.material;
    const ceiling = new THREE.Mesh(unitPlane, new THREE.MeshStandardMaterial({ color: theme.ceilingColor, roughness: 1 }));
    ceiling.rotation.x = Math.PI / 2; scene.add(ceiling);
    roomThemeRefs.ceilingMat = ceiling.material;
    // Poster walls (left/right, where the posters actually hang) and the
    // general wall (front/back — screen wall + entrance wall, plus the
    // ceiling, which shares this same palette) are TWO separate materials
    // now — previously all four walls shared one, but a Room Design theme
    // can reasonably want the wall framing the posters to differ from the
    // one behind the screen.
    const posterWallMat = new THREE.MeshStandardMaterial({ color: theme.posterWallColor, roughness: 0.85 });
    const wallMat = new THREE.MeshStandardMaterial({ color: theme.wallColor, roughness: 0.85 });
    const wainscotMat = new THREE.MeshStandardMaterial({ map: woodTexture(theme), roughness: 0.7 });
    const trimMat = new THREE.MeshStandardMaterial({ color: theme.trimColor, metalness: theme.trimMetalness, roughness: theme.trimRoughness });
    roomThemeRefs.posterWallMat = posterWallMat; roomThemeRefs.wallMat = wallMat;
    roomThemeRefs.wainscotMat = wainscotMat; roomThemeRefs.trimMat = trimMat;
    function makeWall(ry, mat) {
      const wall = new THREE.Mesh(unitPlane, mat);
      wall.rotation.y = ry || 0; scene.add(wall);
      return wall;
    }
    const wallFront = makeWall(0, wallMat), wallBack = makeWall(Math.PI, wallMat);
    const wallLeft = makeWall(Math.PI / 2, posterWallMat), wallRight = makeWall(-Math.PI / 2, posterWallMat);
    const wainscots = [-1, 1].map((side) => {
      const wainscot = new THREE.Mesh(unitPlane, wainscotMat);
      wainscot.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      scene.add(wainscot);
      return { mesh: wainscot, side };
    });
    const trims = [-1, 1].map((side) => {
      const trim = new THREE.Mesh(unitBox, trimMat);
      scene.add(trim);
      return { mesh: trim, side };
    });
    const curtainTex = curtainTexture(theme);
    const curtainMat = new THREE.MeshStandardMaterial({ map: curtainTex, roughness: 0.85, side: THREE.DoubleSide });
    roomThemeRefs.curtainMat = curtainMat;
    const curtains = [-1, 1].map((side) => {
      const curtain = new THREE.Mesh(unitPlane, curtainMat);
      scene.add(curtain);
      return { mesh: curtain, side };
    });
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x767680, emissive: 0x45454e, emissiveIntensity: 0.6 });
    const screenGlow = new THREE.Mesh(unitPlane, screenMat);
    scene.add(screenGlow);
    const screenFrame = new THREE.Mesh(unitBox, trimMat);
    scene.add(screenFrame);
    let screenW = 0, screenH = 0; // recomputed live below; exposed on the returned room object
    const ropeMat = new THREE.MeshStandardMaterial({ color: theme.ropeColor, roughness: 0.4 });
    roomThemeRefs.ropeMat = ropeMat;
    const postMat = trimMat;
    ropeBarrierGroup = new THREE.Group();
    for (let x = -3; x <= 3; x += 2) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 12), postMat);
      post.position.set(x, 0.45, 3.5); ropeBarrierGroup.add(post);
      if (x < 3) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(x, 0.85, 3.5),
          new THREE.Vector3(x + 1, 0.65, 3.5),
          new THREE.Vector3(x + 2, 0.85, 3.5),
        ]);
        ropeBarrierGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.04, 8, false), ropeMat));
      }
    }
    // Local Z of the barrier's own children already encodes "+3.5 from a
    // screen wall at Z=-BASE_DEPTH/2" — the group itself is positioned so
    // that offset always lands 3.5 units in front of the CURRENT (possibly
    // animated) screen wall, whatever depth that is right now.
    ropeBarrierGroup.visible = showRopeBarrier;
    scene.add(ropeBarrierGroup);
    const hemiLight = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, 1.1);
    scene.add(hemiLight); dimLights.push(hemiLight);
    const ambientLight = new THREE.AmbientLight(theme.ambientColor, 0.4);
    scene.add(ambientLight); dimLights.push(ambientLight);
    const screenLight = new THREE.PointLight(theme.screenLightColor, 1.3, 18, 2);
    scene.add(screenLight); dimLights.push(screenLight);
    roomThemeRefs.hemiLight = hemiLight; roomThemeRefs.ambientLight = ambientLight; roomThemeRefs.screenLight = screenLight;
    function updateRoomShellTransform() {
      const liveScale = ROOM_WIDTH / 24; // ROOM_WIDTH is always 24*scaleFactor by construction
      ceiling.scale.set(ROOM_WIDTH, ROOM_DEPTH, 1);
      ceiling.position.y = ROOM_HEIGHT;
      wallFront.scale.set(ROOM_WIDTH, ROOM_HEIGHT, 1); wallFront.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
      wallBack.scale.set(ROOM_WIDTH, ROOM_HEIGHT, 1); wallBack.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
      wallLeft.scale.set(ROOM_DEPTH, ROOM_HEIGHT, 1); wallLeft.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
      wallRight.scale.set(ROOM_DEPTH, ROOM_HEIGHT, 1); wallRight.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
      wainscots.forEach(({ mesh, side }) => {
        mesh.scale.set(ROOM_DEPTH, 1.6, 1);
        mesh.position.set(side * (ROOM_WIDTH / 2 - 0.02), 0.8, 0);
      });
      trims.forEach(({ mesh, side }) => {
        mesh.scale.set(0.06, 0.08, ROOM_DEPTH);
        mesh.position.set(side * (ROOM_WIDTH / 2 - 0.03), 1.62, 0);
      });
      screenW = 15.2 * liveScale; screenH = ROOM_HEIGHT;
      curtainTex.repeat.set(liveScale, 1);
      curtains.forEach(({ mesh, side }) => {
        mesh.scale.set(3.6 * liveScale, ROOM_HEIGHT, 1);
        mesh.position.set(side * (screenW / 2 + 1.8 * liveScale), ROOM_HEIGHT / 2, -ROOM_DEPTH / 2 + 0.1);
      });
      screenGlow.scale.set(screenW, screenH, 1);
      screenGlow.position.set(0, screenH / 2, -ROOM_DEPTH / 2 + 0.12);
      screenFrame.scale.set(screenW + 0.3, screenH + 0.3, 0.08);
      screenFrame.position.set(0, screenH / 2, -ROOM_DEPTH / 2 + 0.02);
      ropeBarrierGroup.position.z = -ROOM_DEPTH / 2; // group origin tracks the (possibly animated) screen wall; children keep their fixed +3.5 offset
      screenLight.position.set(0, 3.6, -ROOM_DEPTH / 2 + 2);
      const marqueeLiveScale = ROOM_WIDTH / 24;
      marquee.scale.set(6.4 * marqueeLiveScale, 3.2 * marqueeLiveScale, 1);
      // Vertikal zentriert in derselben verfuegbaren Flaeche ueber den
      // Backwall-Kacheln wie das echte Film-Logo dort (siehe dessen
      // eigene "mainH + boxH/2 + 0.2"-Formel, was rechnerisch exakt der
      // Mittelpunkt zwischen Kachel-Oberkante (mainH) und Decke
      // (ROOM_HEIGHT) ist). mainH selbst haengt nur von ROOM_WIDTH ab
      // (CELL_W = ROOM_WIDTH/6, CELL_H = CELL_W*9/16, mainH = CELL_H*2 =
      // 0.1875 * ROOM_WIDTH) -- hier direkt nachgerechnet, da die
      // eigentlichen CELL_W/CELL_H-Variablen an dieser Stelle (Raum-
      // Setup, nicht Film-spezifischer Rueckwand-Aufbau) nicht existieren.
      const marqueeMainH = ROOM_WIDTH * 0.1875;
      const marqueeCenterY = (marqueeMainH + ROOM_HEIGHT) / 2;
      marquee.position.set(0, marqueeCenterY, ROOM_DEPTH / 2 - 0.1);
      marqueeLight.position.set(0, marqueeCenterY, ROOM_DEPTH / 2 - 1.2);
      if (typeof updateCeilingRigs === 'function') updateCeilingRigs();
    }
    function roundedRectShape(w, h, r) {
      const shape = new THREE.Shape();
      const x = -w / 2, y = -h / 2;
      shape.moveTo(x + r, y);
      shape.lineTo(x + w - r, y);
      shape.quadraticCurveTo(x + w, y, x + w, y + r);
      shape.lineTo(x + w, y + h - r);
      shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      shape.lineTo(x + r, y + h);
      shape.quadraticCurveTo(x, y + h, x, y + h - r);
      shape.lineTo(x, y + r);
      shape.quadraticCurveTo(x, y, x + r, y);
      return shape;
    }
    const panelShape = roundedRectShape(0.9, 0.5, 0.08);
    const panelGeo = new THREE.ExtrudeGeometry(panelShape, { depth: 0.04, bevelEnabled: false });
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x2a1a12, emissive: 0xffcf9e, emissiveIntensity: 0.9, roughness: 0.4 });
    dimEmissiveMats.push(panelMat);
    const ceilingLightGroup = new THREE.Group();
    const colX = ROOM_WIDTH * 0.3;
    const posterStartZ = -ROOM_DEPTH / 2 + 8;
    const posterEndZ = ROOM_DEPTH / 2 - 2;
    const lightOffset = 2.6;
    const rowSpacing = 9.4;
    const rowSpan = (posterEndZ - lightOffset) - (posterStartZ + lightOffset);
    const numRows = Math.max(3, Math.round(rowSpan / rowSpacing) + 1);
    const lightZs = [];
    for (let i = 0; i < numRows; i++) {
      const t = numRows === 1 ? 0.5 : i / (numRows - 1);
      lightZs.push((posterStartZ + lightOffset) + t * rowSpan);
    }
    [-1, 1].forEach((col) => {
      lightZs.forEach((z, rowIdx) => {
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
        panel.position.set(col * colX, ROOM_HEIGHT - 0.05, z);
        panel.userData = { __ceilPanel: true, __col: col };
        ceilingLightGroup.add(panel);
        const panelLight = new THREE.PointLight(0xffcf9e, 0.55, 9, 2);
        panelLight.position.set(col * colX, ROOM_HEIGHT - 0.3, z);
        panelLight.userData = { __ceilLight: true, __col: col };
        ceilingLightGroup.add(panelLight);
        dimLights.push(panelLight);
      });
    });
    scene.add(ceilingLightGroup);
    const kioskFixtureMat = new THREE.MeshStandardMaterial({ color: 0x2a1a12, emissive: 0xffe0b0, emissiveIntensity: 0.8 });
    dimEmissiveMats.push(kioskFixtureMat);
    const kioskFixture = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 24), kioskFixtureMat);
    kioskFixture.position.set(0, ROOM_HEIGHT - 0.05, 0);
    scene.add(kioskFixture);
    const kioskSpot = new THREE.SpotLight(theme.kioskSpotColor, 1.1, 12, Math.PI / 7, 0.4, 1.5);
    kioskSpot.position.set(0, ROOM_HEIGHT - 0.1, 0);
    roomThemeRefs.kioskSpot = kioskSpot;
    function updateCeilingRigs() {
      // Ceiling-mounted fixtures (poster ceiling-light strip + the kiosk's
      // overhead fixture/spot) must stay attached to a moving ceiling —
      // the kiosk TABLE itself lives at the fixed floor-level anchor and
      // is untouched by this.
      kioskFixture.position.y = ROOM_HEIGHT - 0.05;
      kioskSpot.position.y = ROOM_HEIGHT - 0.1;
      const liveColX = ROOM_WIDTH * 0.3;
      ceilingLightGroup.children.forEach((child) => {
        if (!child.userData) return;
        if (child.userData.__ceilPanel) { child.position.y = ROOM_HEIGHT - 0.05; child.position.x = child.userData.__col * liveColX; }
        else if (child.userData.__ceilLight) { child.position.y = ROOM_HEIGHT - 0.3; child.position.x = child.userData.__col * liveColX; }
      });
    }
    const kioskSpotTarget = new THREE.Object3D();
    kioskSpotTarget.position.set(0, 0, 0);
    scene.add(kioskSpotTarget);
    kioskSpot.target = kioskSpotTarget;
    scene.add(kioskSpot);
    dimLights.push(kioskSpot);
    const marqueeCanvas = document.createElement('canvas');
    marqueeCanvas.width = 1536; marqueeCanvas.height = 768;
    const mctx = marqueeCanvas.getContext('2d');
    // UNIFIED pipeline, same as the kiosk's own colored+contoured branch:
    // text and film reel composed as ONE combined artwork, filled with the
    // real gradient, then given ONE shared black contour traced along the
    // actual combined silhouette (not a box) so text and icon read with
    // consistent edge definition against the backdrop wall.
    function drawMarqueeText(iconImgReady) {
      mctx.clearRect(0, 0, 1536, 768);
      const art = document.createElement('canvas');
      art.width = 1536; art.height = 768;
      const actx = art.getContext('2d');
      actx.font = '700 207px Georgia';
      actx.textAlign = 'center'; actx.textBaseline = 'middle';
      if ('letterSpacing' in actx) actx.letterSpacing = '4px';
      actx.fillStyle = '#ffffff';
      actx.fillText('Cinema', 1057.1, 293.0);
      actx.fillText('Project', 1057.1, 483.0);
      const iconSize = 560;
      const iconX = 60, iconY = 384 - iconSize / 2;
      if (iconImgReady) {
        actx.imageSmoothingEnabled = true;
        actx.imageSmoothingQuality = 'high';
        actx.drawImage(iconImgReady, iconX, iconY, iconSize, iconSize);
      }
      actx.globalCompositeOperation = 'source-in';
      const textGrad = actx.createLinearGradient(0, 0, 1536, 0);
      textGrad.addColorStop(0, '#5c2f6b');
      textGrad.addColorStop(1, '#005570');
      actx.fillStyle = textGrad;
      actx.fillRect(0, 0, art.width, art.height);
      if (iconImgReady) {
        const strokeR = 5;
        const outline = document.createElement('canvas');
        outline.width = 1536; outline.height = 768;
        const octx = outline.getContext('2d');
        const ringSteps = 16;
        for (let s = 0; s < ringSteps; s++) {
          const ang = (s / ringSteps) * Math.PI * 2;
          octx.drawImage(art, Math.cos(ang) * strokeR, Math.sin(ang) * strokeR);
        }
        octx.globalCompositeOperation = 'source-in';
        octx.fillStyle = '#000000';
        octx.fillRect(0, 0, outline.width, outline.height);
        mctx.drawImage(outline, 0, 0);
      }
      mctx.drawImage(art, 0, 0);
    }
    drawMarqueeText(null);
    const marqueeIconImg = new Image();
    marqueeIconImg.onload = () => {
      drawMarqueeText(marqueeIconImg);
      marqueeTex.needsUpdate = true;
    };
    marqueeIconImg.src = CINEMA_ICON_DATA_URL;
    const marqueeTex = new THREE.CanvasTexture(marqueeCanvas);
    marqueeTex.colorSpace = THREE.SRGBColorSpace;
    marqueeTex.anisotropy = 8;
    const marquee = new THREE.Mesh(unitPlane, new THREE.MeshBasicMaterial({ map: marqueeTex, transparent: true, depthWrite: false }));
    marquee.rotation.y = Math.PI;
    scene.add(marquee);
    const marqueeLight = new THREE.PointLight(theme.marqueeColor, 0.8, 8, 2);
    scene.add(marqueeLight);
    dimLights.push(marqueeLight);
    roomThemeRefs.marqueeLight = marqueeLight;
    const backdropGroup = new THREE.Group();
    scene.add(backdropGroup);
    // ROOM_WIDTH/DEPTH/HEIGHT/screenW/screenH are exposed as LIVE getters
    // (not frozen values) so any code reading room.ROOM_WIDTH later always
    // sees the current animated size — the movement-bounds clamp relies on
    // this to track a resize in progress without any extra wiring.
    // Deferred to here (not right after definition): updateRoomShellTransform
    // also drives updateCeilingRigs(), which touches kioskFixture/kioskSpot/
    // ceilingLightGroup — all declared LATER in this same function body.
    // Calling it before those consts initialize would hit their TDZ.
    // Safe here: buildCinema runs fully synchronously and nothing renders
    // until the animation loop starts afterward, so this transient gap
    // between mesh creation and first layout is never actually visible.
    updateRoomShellTransform();
    return {
      get ROOM_WIDTH() { return ROOM_WIDTH; },
      get ROOM_DEPTH() { return ROOM_DEPTH; },
      get ROOM_HEIGHT() { return ROOM_HEIGHT; },
      get screenW() { return screenW; },
      get screenH() { return screenH; },
      screenMat, dimLights, dimEmissiveMats, kioskSpot,
      marqueeMesh: marquee, marqueeMat: marquee.material, marqueeTex, backdropGroup,
      updateRoomShellTransform,
    };
  }
  function softCircleTexture() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }
  function buildKiosk(scene, room) {
    const theme = ROOM_THEMES[ACTIVE_ROOM_DESIGN];
    const indicatorMat = new THREE.MeshBasicMaterial({
      color: 0xfff2c0, map: softCircleTexture(), transparent: true, opacity: 0.35,
      depthWrite: false, side: THREE.DoubleSide,
    });
    const indicator = new THREE.Mesh(new THREE.CircleGeometry(KIOSK_DISC_RADIUS, 48), indicatorMat);
    indicator.rotation.x = -Math.PI / 2;
    indicator.position.set(0, 0.006, 0);
    scene.add(indicator);
    const group = new THREE.Group();
    group.position.set(0, -1.3, 0);
    const bodyMat = new THREE.MeshStandardMaterial({ color: theme.kioskBodyColor, roughness: 0.6 });
    const trimMat = new THREE.MeshStandardMaterial({ color: theme.trimColor, metalness: theme.trimMetalness, roughness: theme.trimRoughness });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.1, 64), bodyMat);
    body.position.y = 0.55; group.add(body);
    const topMat = new THREE.MeshStandardMaterial({ color: theme.kioskTopColor, emissive: theme.kioskTopEmissive, emissiveIntensity: 0.5 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 64), topMat);
    top.position.y = 1.13; group.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 8, 16), trimMat);
    rim.rotation.x = Math.PI / 2; rim.position.y = 1.13; group.add(rim);
    const light = new THREE.PointLight(theme.kioskLightColor, 0.6, 3, 2);
    light.position.y = 1.3; group.add(light);
    roomThemeRefs.kioskBodyMat = bodyMat; roomThemeRefs.kioskTrimMat = trimMat;
    roomThemeRefs.kioskTopMat = topMat; roomThemeRefs.kioskLight = light;
    scene.add(group);
    top.userData = { type: 'kiosk' };
    // Invisible, much larger interaction proxy: the visible teal disc is
    // tiny and low, so a precise downward look was required. This wider,
    // taller cylinder (still parented in the group, so it rises/sinks with
    // the table) lets the player enter just by looking generally toward
    // the kiosk instead of needing to aim exactly at the small disc.
    const interactionProxy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 1.7, 16),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    interactionProxy.position.y = 0.95;
    interactionProxy.userData = { type: 'kiosk' };
    group.add(interactionProxy);
    return { top, group, indicatorMat, interactionProxy };
  }
  // Live-swaps every colored/textured surface over to a different Room
  // Design theme, entirely in place — no reload, no rebuilding any
  // geometry. Every material/light this touches was stashed into
  // roomThemeRefs by buildCinema/buildKiosk at construction time.
  // Canvas-based textures (carpet, wainscot, curtain) are regenerated
  // fresh and swapped in; the OLD texture is disposed right after so a
  // few theme changes in a row can't leak GPU memory. Each regenerated
  // texture keeps whatever .repeat the outgoing one had — that already
  // reflects the room's CURRENT actual size (it's kept correct through
  // any live resize independently of this), so re-deriving it here from
  // scratch would risk drifting out of sync with a resize that happened
  // after construction.
  function applyRoomTheme(key) {
    const theme = ROOM_THEMES[key];
    if (!theme || !roomThemeRefs.floorMat) return; // room not built yet, or an unknown key — never half-apply
    ACTIVE_ROOM_DESIGN = key;
    function swapCanvasTex(mat, makeTex) {
      const old = mat.map;
      const tex = makeTex(theme);
      if (old) { tex.repeat.copy(old.repeat); tex.wrapS = old.wrapS; tex.wrapT = old.wrapT; if (old.anisotropy) tex.anisotropy = old.anisotropy; }
      mat.map = tex;
      mat.needsUpdate = true;
      if (old) old.dispose();
    }
    swapCanvasTex(roomThemeRefs.floorMat, carpetTexture);
    swapCanvasTex(roomThemeRefs.wainscotMat, woodTexture);
    swapCanvasTex(roomThemeRefs.curtainMat, curtainTexture);
    roomThemeRefs.ceilingMat.color.setHex(theme.ceilingColor);
    roomThemeRefs.posterWallMat.color.setHex(theme.posterWallColor);
    roomThemeRefs.wallMat.color.setHex(theme.wallColor);
    [roomThemeRefs.trimMat, roomThemeRefs.kioskTrimMat].forEach((m) => {
      m.color.setHex(theme.trimColor); m.metalness = theme.trimMetalness; m.roughness = theme.trimRoughness; m.needsUpdate = true;
    });
    roomThemeRefs.ropeMat.color.setHex(theme.ropeColor);
    roomThemeRefs.fog.color.setHex(theme.fogColor);
    roomThemeRefs.fog.density = theme.fogDensity;
    roomThemeRefs.kioskBodyMat.color.setHex(theme.kioskBodyColor);
    roomThemeRefs.kioskTopMat.color.setHex(theme.kioskTopColor);
    roomThemeRefs.kioskTopMat.emissive.setHex(theme.kioskTopEmissive);
    roomThemeRefs.kioskTopMat.needsUpdate = true;
    roomThemeRefs.kioskLight.color.setHex(theme.kioskLightColor);
    roomThemeRefs.kioskSpot.color.setHex(theme.kioskSpotColor);
    roomThemeRefs.marqueeLight.color.setHex(theme.marqueeColor);
    roomThemeRefs.hemiLight.color.setHex(theme.hemiSky);
    roomThemeRefs.hemiLight.groundColor.setHex(theme.hemiGround);
    roomThemeRefs.ambientLight.color.setHex(theme.ambientColor);
    roomThemeRefs.screenLight.color.setHex(theme.screenLightColor);
  }
  const posterTextureCache = {}; // movie Id -> loaded THREE.Texture, kept for the whole session
  // Every poster frame/plane is EXACTLY the same size, always (fixed
  // constants below, never derived from room size) — sharing ONE
  // geometry across all ~60 posters instead of building a fresh,
  // byte-identical one per poster (per resize, since placePosters is
  // called fresh on every resize) is a real reduction in GPU memory and
  // per-frame overhead, with zero visual or behavioral difference.
  const POSTER_FRAME_W = 1.5, POSTER_FRAME_H = 2.25, POSTER_FRAME_MARGIN = 0.08;
  // ---- DEBUG label helper (testing aid, for the 10-mode resize work) ----
  // A small canvas-texture plane showing a number, attached directly as
  // a regular (non-billboard) child so it rotates WITH its parent group
  // and faces the same direction the poster/frame already does — not a
  // THREE.Sprite, since a Sprite always billboards toward the camera
  // regardless of the group's own rotation, which would look wrong
  // sitting flush against a rotated poster.
  function makeDebugLabel(text, width, height, bgColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    mesh.userData.__debugCanvas = canvas;
    mesh.userData.__debugCtx = ctx;
    mesh.userData.__debugTex = tex;
    mesh.userData.__debugBg = bgColor;
    updateDebugLabel(mesh, text);
    return mesh;
  }
  function updateDebugLabel(mesh, text) {
    const ctx = mesh.userData.__debugCtx;
    const canvas = mesh.userData.__debugCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = mesh.userData.__debugBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), canvas.width / 2, canvas.height / 2);
    mesh.userData.__debugTex.needsUpdate = true;
  }
  const posterFrameGeometry = new THREE.BoxGeometry(POSTER_FRAME_W + POSTER_FRAME_MARGIN * 2, POSTER_FRAME_H + POSTER_FRAME_MARGIN * 2, 0.06);
  const posterPlaneGeometry = new THREE.PlaneGeometry(POSTER_FRAME_W, POSTER_FRAME_H);
  function placePosters(scene, movies, room, container, opts) {
    opts = opts || {};
    const layout = opts.layout || 'alternating';
    const repeatMode = opts.repeatMode || 'repeat';
    const gapPosition = opts.gapPosition || 'end';
    const startWall = opts.startWall || 'left-screen';
    const [startSideStr, startEndStr] = startWall.split('-');
    const fromBackwall = startEndStr === 'backwall';
    const texLoader = new THREE.TextureLoader();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xc9974a, metalness: 0.7, roughness: 0.3 });
    const placeholderMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const clickable = [];
    const lights = [];
    const spacing = 2.6, startZ = -room.ROOM_DEPTH / 2 + 8, endZ = room.ROOM_DEPTH / 2 - 2, wallX = room.ROOM_WIDTH / 2 - 0.09, y = 1.9;
    const slotsPerWall = Math.max(0, Math.floor((endZ - startZ) / spacing) + 1);
    const slotCount = slotsPerWall * 2;
    if (!movies.length || !slotCount) return { clickable, lights };
    const n = movies.length;
    const firstSide = startSideStr === 'right' ? 1 : -1;
    const secondSide = -firstSide;
    const assignments = [];
    function placeSideList(arr, side, center, seqBase) {
      const offset = center ? Math.floor((slotsPerWall - arr.length) / 2) : 0;
      arr.forEach((item, idx) => assignments.push({ item, side, localSlot: offset + idx, seqIndex: seqBase === undefined ? undefined : seqBase + idx }));
    }
    const centerSingle = repeatMode === 'norepeat' && gapPosition === 'center';
    const centerSecond = repeatMode === 'norepeat' && gapPosition === 'center-second';
    const balanced = repeatMode === 'norepeat' && gapPosition === 'balanced';
    const anyCenterVariant = centerSingle || centerSecond || balanced;
    if (layout === 'sequential' || layout === 'sequential-wrap') {
      // Single-wall-only makes sense in NOREPEAT mode when there's
      // genuinely nothing more to show (n distinct movies, no point
      // spreading them thin across both walls). In REPEAT mode there's
      // always enough content to fill BOTH walls to capacity by cycling
      // — "few distinct movies" must not collapse it onto one wall,
      // leaving the other empty regardless of how many movies exist.
      if (repeatMode === 'norepeat' && n <= slotsPerWall) {
        const arr = movies.slice(0, n);
        placeSideList(arr, firstSide, anyCenterVariant, 0);
      } else if (balanced) {
        const total = Math.min(n, slotCount);
        const firstCount = Math.ceil(total / 2);
        placeSideList(movies.slice(0, firstCount), firstSide, true, 0);
        placeSideList(movies.slice(firstCount, total), secondSide, true, firstCount);
      } else {
        const total = repeatMode === 'norepeat' ? Math.min(n, slotCount) : slotCount;
        const firstArr = [], secondArr = [];
        for (let i = 0; i < total; i++) {
          (i < slotsPerWall ? firstArr : secondArr).push(movies[i % n]);
        }
        placeSideList(firstArr, firstSide, false, 0);
        placeSideList(secondArr, secondSide, centerSecond, slotsPerWall);
      }
    } else {
      const total = repeatMode === 'norepeat' ? Math.min(n, slotCount) : slotCount;
      const firstArr = [], secondArr = [];
      for (let i = 0; i < total; i++) {
        (i % 2 === 0 ? firstArr : secondArr).push(movies[i % n]);
      }
      placeSideList(firstArr, firstSide, anyCenterVariant);
      placeSideList(secondArr, secondSide, anyCenterVariant);
    }
    function zForSlot(localSlot, side) {
      let useBackwall = fromBackwall;
      if (layout === 'sequential-wrap' && side === secondSide) useBackwall = !fromBackwall;
      return useBackwall ? (endZ - localSlot * spacing) : (startZ + localSlot * spacing);
    }
    assignments.forEach(({ item, side, localSlot, seqIndex }) => {
      if (localSlot < 0 || localSlot >= slotsPerWall) return;
      const z = zForSlot(localSlot, side);
      if (z < startZ - 0.01 || z > endZ + 0.01) return;
      const group = new THREE.Group();
      group.position.set(side * wallX, y, z);
      group.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      const useBackwallForSlot = layout === 'sequential-wrap' && side === secondSide ? !fromBackwall : fromBackwall;
      group.userData.__wallSide = side;
      group.userData.__localSlot = localSlot;
      group.userData.__useBackwall = useBackwallForSlot;
      // A STABLE, wall-independent rank — this movie's own position in
      // the sorted movies list, unaffected by resize (only which
      // wall/slot currently maps to a given rank changes). Populated
      // ONLY for Sequential/Sequential-wrap/Balanced (undefined for
      // Alternating, whose i%2 wall assignment is already stable across
      // resize on its own and doesn't need this). This is what lets
      // syncPosterCountForResize find a poster's TRUE neighbor — even
      // one that has crossed to the other wall because a capacity
      // threshold moved — instead of guessing from whatever happens to
      // be nearby on whichever wall it currently lands on.
      group.userData.__seqIndex = seqIndex;
      // Includes the movie's own Id, not just the physical slot — a
      // resize can legitimately redistribute WHICH movie lands on which
      // wall/slot (capacity-dependent decisions like single-wall-vs-
      // split, sequential-wrap thresholds — see syncPosterCountForResize's
      // own comment), so a position-only key ("side|slot") could match
      // between an old and a new placement even when the movie showing
      // there actually changed — the old poster then wrongly stayed put
      // instead of being replaced, while the movie that SHOULD have been
      // there got spawned as an extra, duplicate poster elsewhere. Keying
      // by movie+position together means "same key" genuinely means
      // "same poster", so a redistribution now correctly despawns the
      // outdated slot and spawns the right one — a poster that moves to
      // a different wall on resize gets a clean despawn+respawn there
      // (no slide animation, since none exists for that case) rather
      // than showing the wrong film or a duplicate.
      group.userData.__slotKey = side + '|' + localSlot + '|' + item.Id;
      group.add(new THREE.Mesh(posterFrameGeometry, frameMat));
      const poster = new THREE.Mesh(posterPlaneGeometry, placeholderMat.clone());
      poster.position.z = 0.035;
      poster.userData = { type: 'poster', item, url: detailUrl(item) };
      group.add(poster);
      clickable.push(poster);
      function applyPosterTexture(tex) {
        // Update the EXISTING material's properties instead of replacing
        // the object outright. A resize-chain poster's material was
        // cloned and set to opacity 0 by makeGroupFadeable BEFORE this
        // texture finishes loading (texture load is a real network round
        // trip, always slower than that synchronous setup) — replacing
        // the whole material object here would silently discard that
        // invisible/faded state and snap the artwork to full opacity the
        // instant its texture arrives, regardless of whether the poster
        // has even reached its position yet.
        poster.material.map = tex;
        poster.material.needsUpdate = true;
      }
      // A movie's poster texture, once loaded, is kept for the whole
      // session and reused INSTANTLY (synchronously, no network) for any
      // later appearance of the same movie — a real resize can always
      // recompute the fully correct distribution for its own target
      // depth from scratch without paying a loading cost for content
      // that's already been seen once.
      if (posterTextureCache[item.Id]) {
        applyPosterTexture(posterTextureCache[item.Id]);
      } else {
        texLoader.load(posterUrl(item), (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          posterTextureCache[item.Id] = tex;
          applyPosterTexture(tex);
        }, undefined, () => {});
      }
      const beamShape = new THREE.Shape();
      // Narrow end matches the fixture's own actual radius (0.05, same as
      // the CylinderGeometry below) instead of being noticeably wider
      // than the lamp it's supposed to originate from.
      // Wide (bottom) end now stops at local y=0.155 (group-space
      // y=1.205 = (POSTER_FRAME_H + POSTER_FRAME_MARGIN*2)/2) — the
      // frame's own TRUE OUTER edge, not the poster artwork's inner
      // content edge (1.125, an earlier attempt) and not overlapping
      // into it at all (1.0, the original, pre-fix behavior). No
      // rendering trick (depth position, renderOrder, depthTest) ever
      // reliably fixed the bleed-through this overlap caused during a
      // spawn/despawn fade, no matter which one was tried — removing the
      // geometric overlap at its root is what actually settles it,
      // regardless of anything else going on with materials/blending at
      // that moment. Angled wider (unchanged endpoints, steeper spread
      // over a shorter vertical run) to reach the exact SAME ±0.62 width
      // at this new, higher stopping point that it used to only reach
      // much further down — same "impact footprint" the person is used
      // to seeing, just arriving at a point that never overlaps anything
      // solid to begin with.
      beamShape.moveTo(-0.05, 0.55);
      beamShape.lineTo(0.05, 0.55);
      beamShape.lineTo(0.62, 0.155);
      beamShape.lineTo(-0.62, 0.155);
      beamShape.closePath();
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xffdca0, transparent: true, opacity: 0.1,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(new THREE.ShapeGeometry(beamShape), beamMat);
      beam.position.set(0, 1.05, 0.033);
      group.add(beam);
      const fixture = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0xffdca0, emissiveIntensity: 0.3 })
      );
      fixture.rotation.x = Math.PI / 2;
      fixture.position.set(0, 1.58, 0.05);
      group.add(fixture);
      const lightEntry = { mat: beamMat, itemId: item.Id, __ownerGroup: group, fixtureMat: fixture.material };
      lights.push(lightEntry);
      group.userData.__lightEntry = lightEntry; // precise removal by identity, not itemId (repeat mode can reuse the same movie)
      // DEBUG (testing aid): slot number ABOVE the light fixture (red
      // background — the SLOT, a purely geometric/positional number,
      // independent of which movie currently sits there), and the
      // movie's own stable seqIndex rank directly OVER the artwork
      // (blue background — undefined for Alternating, shown as "-").
      // Hidden by default now — toggled on/off via 'P', a hidden
      // diagnostic feature not exposed in any settings UI (see the
      // keydown handler near the bottom of this file).
      const slotLabel = makeDebugLabel(localSlot + 1, 0.7, 0.35, 'rgba(140,20,20,0.85)'); // +1 for display only — everything internal stays 0-based, this is purely so the numbers read naturally starting at 1
      slotLabel.position.set(0, 1.95, 0.06);
      slotLabel.visible = false;
      group.add(slotLabel);
      group.userData.__slotLabel = slotLabel;
      const seqLabel = makeDebugLabel(seqIndex === undefined ? '-' : seqIndex + 1, 0.7, 0.35, 'rgba(20,50,140,0.85)'); // +1 for display only, same reasoning as the slot label above
      seqLabel.position.set(0, 0, 0.045);
      seqLabel.visible = false;
      seqLabel.userData.__isSeqLabel = true;
      group.add(seqLabel);
      container.add(group);
    });
    return { clickable, lights };
  }
  const trailerVideo = document.createElement('video');
  trailerVideo.muted = false;
  trailerVideo.playsInline = true;
  trailerVideo.style.display = 'none';
  document.body.appendChild(trailerVideo);
  const trailerTexture = new THREE.VideoTexture(trailerVideo);
  trailerTexture.colorSpace = THREE.SRGBColorSpace;
  // Shared by both Backwall and the poster context menu, back to the
  // original, working behavior: a plain blocklist with only .avi
  // excluded (the one confirmed culprit for Xvid/DivX rips that decode
  // audio but never a picture). Everything else, including formats we
  // can't identify at all (no Container, no usable file extension), is
  // allowed through — an unrecognizable format is not the same thing as
  // a confirmed bad one, and defaulting to "block" there was what
  // silently broke Backwall trailers and poster trailers/theme videos
  // alike (their API responses don't reliably carry Container/Path the
  // way a plain movie item does).
  const POSTER_BLOCKED_CONTAINERS = ['avi'];
  function isBlockedMediaForPoster(mediaObj) {
    if (!mediaObj) return false;
    const container = (mediaObj.Container || '').toLowerCase();
    if (container) return POSTER_BLOCKED_CONTAINERS.includes(container);
    const path = (mediaObj.Path || (mediaObj.MediaSources && mediaObj.MediaSources[0] && mediaObj.MediaSources[0].Path) || '').toLowerCase();
    const dotIdx = path.lastIndexOf('.');
    if (dotIdx < 0) return false;
    return POSTER_BLOCKED_CONTAINERS.includes(path.slice(dotIdx + 1));
  }
  const backdropLoader = new THREE.TextureLoader();
  function computeRandomStart(durationSec, timerSec, mode) {
    if (mode !== 'random' || !durationSec || durationSec <= 0) return 0;
    const maxStart = Math.max(0, durationSec - timerSec);
    return maxStart > 0 ? Math.random() * maxStart : 0;
  }
  function computeMovieRandomStart(durationSec, timerSec, minPct, maxPct) {
    if (!durationSec || durationSec <= 0) return 0;
    let minSec = durationSec * (Math.min(minPct, maxPct) / 100);
    let maxSec = durationSec * (Math.max(minPct, maxPct) / 100);
    maxSec = Math.min(maxSec, Math.max(minSec, durationSec - timerSec));
    if (maxSec <= minSec) return Math.min(minSec, Math.max(0, durationSec - timerSec));
    return minSec + Math.random() * (maxSec - minSec);
  }
  async function resolveBackdropVideoSrc(sentinelInstance, fullItem, timerSeconds) {
    // Instances are 'v:trailer#1', 'v:trailer#2', ... — strip the instance
    // suffix; the base type decides which media to resolve. Instances of
    // one type share the type's playback-order channel, so two trailer
    // tiles draw CONSECUTIVE files from the same queue.
    const sentinel = sentinelInstance.split('#')[0];
    // Client-side jump strategy: request the file with static=true so
    // Jellyfin serves it untouched (browser then knows the real duration
    // and can seek freely via range requests), start playback normally,
    // then jump to a fresh random timestamp once metadata is loaded.
    // Server-side StartTimeTicks proved unreliable: for already
    // browser-compatible files (mp4 — most trailers/theme videos here) the
    // server can pass the file through from byte 0 and skip the parameter
    // entirely, which produced the "always the same sequence from the
    // start" symptom. The fallbackSrc (remux path WITH StartTimeTicks) is
    // used only if the static file fails to play — e.g. mkv movies whose
    // codecs the browser can't decode directly; the remux path demonstrably
    // applies the seek server-side there.
    if (sentinel === 'v:trailer') {
      try {
        const trailers = await jfGet('/Users/' + session.userId + '/Items/' + fullItem.Id + '/LocalTrailers', { Fields: 'Container,Path' });
        const allowed = (trailers || []).filter((t) => !isBlockedMediaForPoster(t));
        if (!allowed.length) { console.log('[BackdropWall] v:trailer requested for "' + fullItem.Name + '" — no usable local trailer found, tile falls back to image.'); return null; }
        const chosen = resumeOrStartChannel(backdropTrailerChannel, allowed, backdropTrailerOrder);
        if (!chosen) return null;
        console.log('[BackdropWall] TRAILER — parent movie: "' + fullItem.Name + '" — trailer item: "' + chosen.Name + '" (id ' + chosen.Id + ') — start mode "' + backdropTrailerStart + '" — order "' + backdropTrailerOrder + '"');
        return {
          src: session.serverUrl + '/Videos/' + chosen.Id + '/stream?static=true&api_key=' + session.accessToken,
          mediaId: chosen.Id,
          startMode: backdropTrailerStart,
          label: 'TRAILER "' + chosen.Name + '"'
        };
      } catch (err) { return null; }
    }
    if (sentinel === 'v:themevideo') {
      try {
        const data = await jfGet('/Items/' + fullItem.Id + '/ThemeVideos', { userId: session.userId, Fields: 'Container,Path' });
        const allowed = (data.Items || []).filter((v) => !isBlockedMediaForPoster(v));
        if (!allowed.length) { console.log('[BackdropWall] v:themevideo requested for "' + fullItem.Name + '" — no usable theme video found, tile falls back to image.'); return null; }
        const chosen = resumeOrStartChannel(backdropThemeVideoChannel, allowed, backdropThemeVideoOrder);
        if (!chosen) return null;
        console.log('[BackdropWall] THEME VIDEO — parent movie: "' + fullItem.Name + '" — theme video item: "' + chosen.Name + '" (id ' + chosen.Id + ') — start mode "' + backdropThemeVideoStart + '" — order "' + backdropThemeVideoOrder + '"');
        return {
          src: session.serverUrl + '/Videos/' + chosen.Id + '/stream?static=true&api_key=' + session.accessToken,
          mediaId: chosen.Id,
          startMode: backdropThemeVideoStart,
          label: 'THEME VIDEO "' + chosen.Name + '"'
        };
      } catch (err) { return null; }
    }
    if (sentinel === 'v:movie') {
      const blocked = await checkMovieBlocked(fullItem.Id).catch(() => false);
      if (blocked) return null;
      console.log('[BackdropWall] MOVIE — "' + fullItem.Name + '" (id ' + fullItem.Id + ') — min%=' + backdropMovieMinInput.value + ' max%=' + backdropMovieMaxInput.value);
      return {
        src: session.serverUrl + '/Videos/' + fullItem.Id + '/stream?static=true&api_key=' + session.accessToken,
        mediaId: fullItem.Id,
        startMode: 'movie',
        label: 'MOVIE "' + fullItem.Name + '"'
      };
    }
    return null;
  }
  // ---- Letterbox/pillarbox detection & overscan crop (backwall videos) ----
  // See the full method description further below, right above
  // sampleLetterboxBySeeking — this comment used to duplicate an older,
  // outdated description of the detection approach that no longer
  // matched the actual (line-probe + variance) implementation; removed
  // to avoid two diverging explanations of the same system. Results are
  // cached per media id so repeats re-apply instantly without re-sampling.
  // per media id so repeats re-apply instantly without re-sampling.
  const letterboxCache = {};
  const backdropVideoAvailCache = {};
  const lbCanvas = document.createElement('canvas');
  lbCanvas.width = 64;
  lbCanvas.height = 36;
  const lbCtx = lbCanvas.getContext('2d', { willReadFrequently: true });
  // ---- Letterbox/pillarbox detection, following established practice ----
  // (ffmpeg's cropdetect + academic black-bar-detection literature), not
  // an ad-hoc tuned heuristic:
  //   1. A STRICT black threshold (~24-30/255 is the real-world norm —
  //      ffmpeg's own default is 24). A genuine bar is truly black, not
  //      medium gray; a loose threshold is what let dark-but-textured
  //      scenes get misread as bars in earlier attempts.
  //   2. Brightness ALONE is explicitly called out as unreliable in the
  //      literature (US6340992: "not reliable in dark image scenes...
  //      may falsely detect letterboxing in non-letterboxed scenes").
  //      The missing signal is VARIANCE: a real bar is not just dark, it
  //      is FLAT — near-zero pixel-to-pixel variation. A dark movie
  //      scene, even at a similar average brightness, still has texture
  //      (some variance). Requiring BOTH low brightness AND low variance
  //      is what actually distinguishes a bar from a dark scene.
  //   3. Multiple probe ZONES per side (not one continuous line), each
  //      independently evaluated and combined via median — the
  //      established way (US6947097) to stay correct even when a
  //      watermark/logo/subtitle sits inside part of the bar.
  //   4. The per-pixel TIME-MAXIMUM across several temporal samples,
  //      exactly matching cropdetect's own "shrink the crop if content
  //      shows up in a later frame, never the other way" philosophy —
  //      content seen in ANY sample is real content, not a bar.
  const LUMA_BLACK_LIMIT = 24; // back to ffmpeg's own default — the earlier 38 (loosened "per explicit request") was letting real dark scenes get misread as bars often enough to be visible as an increasing number of wrongly-cropped tiles the longer the wall ran
  const MAX_VARIANCE = 150; // back to the original, tighter value — the earlier 250 opened the door too far toward genuine scene texture being accepted as a "flat enough" bar
  // Consecutive-run tolerance for lineDepth below — a well-established
  // technique against single-pixel noise in black-bar detection (see
  // e.g. US20130100349A1's discussion of noisy bounding-region samples,
  // and the general "minimum run/cluster length" approach used
  // throughout black-bar and object-in-noise detection literature).
  // Deliberately does NOT touch LUMA_BLACK_LIMIT itself, which has
  // already been tuned back and forth twice in this file's own history
  // (see that constant's own comment) — loosening the THRESHOLD again
  // would just trade one failure mode for the other. This targets a
  // different weakness: real, compressed streaming video routinely has
  // isolated compression-artifact pixels inside an otherwise genuinely
  // black bar that briefly exceed even a correctly-set threshold. The
  // old scan stopped at the very FIRST such pixel, collapsing an
  // obvious, deep bar down to almost nothing the instant one stray
  // pixel appeared — a plausible explanation for "there are clearly
  // bars but nothing gets cropped".
  const NOISE_RUN_TOLERANCE = 2;
  // Evaluates ONE captured frame (a Float32Array of per-pixel luma,
  // rows x cols) against the same established detection logic used
  // before: strict brightness threshold, 3 probe lines per side with
  // median (robust against a watermark/subtitle inside a bar), depths
  // paired symmetrically (whichever side found more evidence wins for
  // both), then each side's resulting strip validated for FLATNESS
  // (variance) — a real bar is not just dark, it's uniform; a dark
  // movie scene at a similar brightness still has texture.
  function evaluateFrame(pix, rows, cols) {
    // Scans forward from the edge, same as before, but no longer stops
    // at the very first pixel over the threshold — an isolated
    // compression-noise pixel (or two) is tolerated and skipped over, on
    // the working assumption that it's still inside the bar; only once
    // NOISE_RUN_TOLERANCE+1 pixels in a row are over the threshold does
    // this conclude real content has actually started. The returned
    // depth is up to and including the LAST pixel that was still part of
    // a confirmed-black run — a lone noise pixel right at the boundary
    // doesn't get counted as part of the bar itself, only tolerated as
    // something to look past.
    function lineDepth(length, pixelAt) {
      let lastBlack = -1;
      let run = 0;
      let d = 0;
      while (d < length) {
        if (pixelAt(d) <= LUMA_BLACK_LIMIT) { lastBlack = d; run = 0; }
        else { run++; if (run > NOISE_RUN_TOLERANCE) break; }
        d++;
      }
      return lastBlack + 1;
    }
    function median3(a, b, c) {
      return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    }
    function variance(values) {
      if (!values.length) return 0;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length;
    }
    // Checks the FLATNESS of a strip at its actual physical location —
    // 'top' checks rows 0..depth, 'bottom' checks the LAST depth rows,
    // etc. Each side is validated against its own real pixels, never a
    // mismatched region borrowed from the opposite side.
    function validateStrip(depth, side) {
      if (depth <= 0) return 0;
      const values = [];
      if (side === 'top') { for (let r = 0; r < depth; r++) for (let c = 0; c < cols; c++) values.push(pix[r * cols + c]); }
      else if (side === 'bottom') { for (let r = rows - depth; r < rows; r++) for (let c = 0; c < cols; c++) values.push(pix[r * cols + c]); }
      else if (side === 'left') { for (let c = 0; c < depth; c++) for (let r = 0; r < rows; r++) values.push(pix[r * cols + c]); }
      else { for (let c = cols - depth; c < cols; c++) for (let r = 0; r < rows; r++) values.push(pix[r * cols + c]); }
      return variance(values) <= MAX_VARIANCE ? depth : 0;
    }
    const colPositions = [Math.round(cols * 0.25), Math.round(cols * 0.5), Math.round(cols * 0.75)];
    const rowPositions = [Math.round(rows * 0.25), Math.round(rows * 0.5), Math.round(rows * 0.75)];
    const topDepths = colPositions.map((c) => lineDepth(rows, (d) => pix[d * cols + c]));
    const bottomDepths = colPositions.map((c) => lineDepth(rows, (d) => pix[(rows - 1 - d) * cols + c]));
    const leftDepths = rowPositions.map((r) => lineDepth(cols, (d) => pix[r * cols + d]));
    const rightDepths = rowPositions.map((r) => lineDepth(cols, (d) => pix[r * cols + (cols - 1 - d)]));
    const topRaw = median3(topDepths[0], topDepths[1], topDepths[2]);
    const bottomRaw = median3(bottomDepths[0], bottomDepths[1], bottomDepths[2]);
    const leftRaw = median3(leftDepths[0], leftDepths[1], leftDepths[2]);
    const rightRaw = median3(rightDepths[0], rightDepths[1], rightDepths[2]);
    // Each side is validated INDEPENDENTLY, at its own real location —
    // some trailer providers burn a logo/text into only ONE bar (top or
    // bottom, not both). If the OTHER side is a genuinely clean, flat
    // bar, that alone is enough to establish the crop, applied
    // symmetrically to both sides — a contaminated side no longer drags
    // down (or invalidates) an otherwise-clean opposite side.
    const topValidated = validateStrip(topRaw, 'top');
    const bottomValidated = validateStrip(bottomRaw, 'bottom');
    const leftValidated = validateStrip(leftRaw, 'left');
    const rightValidated = validateStrip(rightRaw, 'right');
    const tbDepth = Math.max(topValidated, bottomValidated);
    const lrDepth = Math.max(leftValidated, rightValidated);
    const topFrac = tbDepth / rows, bottomFrac = topFrac;
    const leftFrac = lrDepth / cols, rightFrac = leftFrac;
    let overallMax = 0;
    for (let p = 0; p < rows * cols; p++) { if (pix[p] > overallMax) overallMax = pix[p]; }
    const confident = overallMax > 18; // back to the original, less trigger-happy value — the earlier 14 leaned toward cropping "when in doubt", which combined with the loosened thresholds above to compound the false-positive rate
    const res = { top: topFrac, bottom: bottomFrac, left: leftFrac, right: rightFrac };
    const foundBar = res.top > 0 || res.bottom > 0 || res.left > 0 || res.right > 0;
    return { res, foundBar, confident };
  }
  // ---- Seek-based sampling: looks INTO the video at 25/50/75% of its ----
  // ---- runtime, on a hidden probe element — never opens/plays the ----
  // ---- tile's own visible player ----
  // Deliberately skips 0% and 100% — a fade-to/from-black at either end
  // would otherwise be indistinguishable from a real bar. Checks each
  // checkpoint in order and stops at the FIRST one that finds a genuine
  // bar (a trailer-provider intro at 25% with no bars, followed by the
  // real Scope-format trailer content later, is exactly the case this is
  // for) — only checks further if the earlier checkpoint(s) found
  // nothing. Runs on an entirely separate, invisible <video> using the
  // same source URL, so it never interferes with (or waits for) the
  // actual tile's own playback.
  const LETTERBOX_CHECKPOINTS = [0.25, 0.5, 0.75];
  function sampleLetterboxBySeeking(videoUrl, mediaId, onDone) {
    if (letterboxCache[mediaId]) { onDone(letterboxCache[mediaId]); return; }
    const rows = 36, cols = 64;
    const probe = document.createElement('video');
    probe.muted = true; probe.volume = 0; probe.playsInline = true; probe.crossOrigin = 'anonymous';
    probe.preload = 'auto';
    let settled = false;
    let idx = 0;
    // "confirmed" distinguishes a genuine, trustworthy answer from merely
    // giving up. A real bar found IS confirmed; so is "checked all three
    // checkpoints and there truly was nothing" — both are safe to cache,
    // sparing a bar-less video from re-running this whole probe every
    // single time it repeats. An ERROR, a stalled/unreachable video, an
    // unknown duration, or a canvas/draw failure is NOT confirmed —
    // caching one of THOSE as "no crop" would wrongly and permanently
    // lock in a result that was never actually checked, purely because
    // this one attempt happened to fail (network hiccup, momentarily
    // unavailable stream, etc.) — a later, healthier attempt deserves
    // the chance to get a real answer instead of reusing a bad guess
    // forever.
    function finish(res, confirmed) {
      if (settled) return;
      settled = true;
      if (confirmed) letterboxCache[mediaId] = res;
      try { probe.pause(); probe.removeAttribute('src'); probe.load(); } catch (err) {}
      onDone(res);
    }
    function trySeek() {
      if (settled) return;
      if (idx >= LETTERBOX_CHECKPOINTS.length) { finish({ top: 0, bottom: 0, left: 0, right: 0 }, true); return; }
      if (!probe.duration || !isFinite(probe.duration)) { finish({ top: 0, bottom: 0, left: 0, right: 0 }, false); return; }
      probe.currentTime = probe.duration * LETTERBOX_CHECKPOINTS[idx];
    }
    probe.addEventListener('loadedmetadata', trySeek);
    probe.addEventListener('seeked', () => {
      if (settled) return;
      // One extra tick — 'seeked' can fire an instant before the frame is
      // actually drawable in some browsers.
      requestAnimationFrame(() => {
        if (settled) return;
        try {
          lbCtx.drawImage(probe, 0, 0, cols, rows);
          const d = lbCtx.getImageData(0, 0, cols, rows).data;
          const pix = new Float32Array(rows * cols);
          for (let p = 0; p < rows * cols; p++) {
            const i = p * 4;
            pix[p] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
          }
          const { res, foundBar, confident } = evaluateFrame(pix, rows, cols);
          if (foundBar && confident) { finish(res, true); return; }
        } catch (err) { finish({ top: 0, bottom: 0, left: 0, right: 0 }, false); return; }
        idx++;
        trySeek();
      });
    });
    probe.addEventListener('error', () => finish({ top: 0, bottom: 0, left: 0, right: 0 }, false));
    // Safety net: metadata/seek events can occasionally never fire at all
    // (unreachable stream, exotic codec) — never leave a caller waiting
    // forever.
    setTimeout(() => finish({ top: 0, bottom: 0, left: 0, right: 0 }, false), 4200); // must stay comfortably UNDER the outer 5s cap so this is what actually gives up, not the outer safety net
    probe.src = videoUrl;
  }
  // Widest cinema aspect ratio still in real, if rare, use today (Ultra
  // Panavision 70 — Ben-Hur, The Hateful Eight) — the worst-case Scope
  // format a crop should ever assume it's looking at. Anything the
  // detector reports beyond what THIS format alone would need is
  // treated as a misdetection, not a genuinely wider bar — no real
  // theatrical release goes past this.
  const WORST_CASE_SCOPE_RATIO = 2.76;
  // Narrowest format still common enough to matter for the OTHER axis
  // (pillarboxed 4:3/Academy content sitting inside a widescreen frame)
  // — the mirror-image safety bound for left/right bars.
  const NARROWEST_REALISTIC_RATIO = 4 / 3;
  // 'forced' overscan mode's own crop — deliberately assumes EVERY video
  // is letterboxed at exactly the widest realistic theatrical Scope
  // ratio (WORST_CASE_SCOPE_RATIO), with no per-video detection at all.
  // Same underlying math as the safety floor a few lines below (indeed,
  // reuses the same constant) — just applied unconditionally up front
  // instead of as a ceiling on top of a separately-detected value.
  function computeForcedScopeCrop(planeW, planeH) {
    const planeAspect = planeW / planeH;
    const contentV = Math.min(1, planeAspect / WORST_CASE_SCOPE_RATIO);
    const barFrac = (1 - contentV) / 2;
    return { top: barFrac, bottom: barFrac, left: 0, right: 0 };
  }
  function fitCoverCropped(tex, planeW, planeH, topFrac, bottomFrac, leftFrac, rightFrac) {
    const img = tex.image;
    const vw = img.videoWidth || img.width, vh = img.videoHeight || img.height;
    if (!vw || !vh) return;
    topFrac = topFrac || 0;
    bottomFrac = bottomFrac || 0;
    leftFrac = leftFrac || 0;
    rightFrac = rightFrac || 0;
    // Cover-fit the plane using only the content sub-rectangle between the
    // detected bars (both axes); degenerates to the old vertical-only math
    // when left/right are 0.
    // Hard safety floor, derived from an actual cinema-format bound
    // rather than an arbitrary round number: no matter what the detector
    // computed, never crop away more than the WIDEST real Scope release
    // (2.76:1) would ever require, and mirrored for the narrowest common
    // pillarboxed release (4:3) on the other axis. The previous flat 50%
    // floor was far looser than either of these real bounds (2.76:1
    // letterboxing only ever needs ~17.8% removed per side, this allowed
    // up to 25% before even engaging) — loose enough that a genuine
    // misdetection could still shrink the remaining content down to a
    // sliver that reads as solid noise/black once stretched to fill the
    // tile, which is almost certainly what was actually happening in the
    // reported "video is playing but the tile is black" cases: turning
    // Overscan off (skipping this crop entirely) made the video visible
    // again, and the crop math is the only thing that toggle changes.
    const planeAspect = planeW / planeH;
    const minContentV = Math.min(1, planeAspect / WORST_CASE_SCOPE_RATIO);
    const minContentH = Math.min(1, NARROWEST_REALISTIC_RATIO / planeAspect);
    const contentV = Math.max(minContentV, 1 - topFrac - bottomFrac);
    const contentH = Math.max(minContentH, 1 - leftFrac - rightFrac);
    const contentAspect = (vw * contentH) / (vh * contentV);
    let rx, ry;
    if (contentAspect > planeAspect) { ry = contentV; rx = contentH * (planeAspect / contentAspect); }
    else { rx = contentH; ry = contentV * (contentAspect / planeAspect); }
    tex.repeat.set(rx, ry);
    tex.offset.set(leftFrac + (contentH - rx) / 2, bottomFrac + (contentV - ry) / 2);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
  }
  function applyVideoFit(info) {
    if (!info || !info.videoTex || !info.videoEl) return;
    // 'auto' uses whatever this specific video's own sampled detection
    // found (or nothing, if none has come back yet); 'forced' always
    // uses the same fixed worst-case-Scope crop regardless of the
    // video's own content, computed fresh here rather than stored on
    // the element at all (it's a pure function of the tile's own w/h,
    // never the video itself, so there's nothing to cache per-video);
    // 'off' never crops.
    let crop = { top: 0, bottom: 0, left: 0, right: 0 };
    if (backdropOverscanMode === 'auto' && info.videoEl.__jfCrop) crop = info.videoEl.__jfCrop;
    else if (backdropOverscanMode === 'forced') crop = computeForcedScopeCrop(info.w, info.h);
    fitCoverCropped(info.videoTex, info.w, info.h, crop.top, crop.bottom, crop.left, crop.right);
  }
  function loadVideoIntoTile(info, sentinel, fullItem, timerSeconds) {
    const baseType = sentinel.split('#')[0];
    const shouldLoop = baseType === 'v:trailer' || baseType === 'v:themevideo';
    const videoEl = document.createElement('video');
    videoEl.muted = true;
    videoEl.volume = 0;
    videoEl.playsInline = true;
    videoEl.crossOrigin = 'anonymous';
    info.videoEl = videoEl;
    let currentResolved = null;
    let usedFallbackForCurrentSrc = false;
    let loadSeq = 0; // incremented per source attempt; watchdogs abort when stale
    let suppressErrors = false; // true only during element teardown between sources
    function replaceTileWithImage(reason) {
      const o = currentOwner();
      if (!o || o.idx !== sentinel) return;
      console.warn('[BackdropWall] ' + (currentResolved ? currentResolved.label : sentinel) + ' — not playable (' + reason + '), replacing tile with an image so the wall keeps no gaps.');
      const imgs = backdropDedupeCache[fullItem.Id] || [];
      if (!imgs.length) return;
      const pick = imgs[Math.floor(Math.random() * imgs.length)];
      // A failing video that was still loading on a hidden BACK layer gets
      // its image directly there (the crossfade then reveals the image);
      // a failing FRONT video goes through the normal crossfade swap.
      if (o.__pending) pendingFallbackToImage(o, pick);
      else fadeSwapTile(o, pick);
    }
    // Playback watchdog: some files fail WITHOUT ever firing an 'error'
    // event (they load metadata but never produce frames, or stall
    // forever). Two-phase check per load attempt: after 7s the video must
    // have decodable frames; 3s later the position must actually have
    // advanced. Anything else counts as dead and the tile falls back to an
    // image — goal: the wall never keeps black holes.
    function startPlaybackWatchdog() {
      const mySeq = loadSeq;
      setTimeout(() => {
        if (loadSeq !== mySeq) return;
        const o = currentOwner();
        if (!o || o.idx !== sentinel) return;
        if (videoEl.readyState < 2) { replaceTileWithImage('no frames after 7s'); return; }
        const t1 = videoEl.currentTime;
        setTimeout(() => {
          if (loadSeq !== mySeq) return;
          const o2 = currentOwner();
          if (!o2 || o2.idx !== sentinel) return;
          if (videoEl.currentTime <= t1 + 0.1) { replaceTileWithImage('playback stalled'); return; }
          // Catches the "audio decodes fine, video track never does"
          // failure mode (a bad/unsupported video codec inside an
          // otherwise-playable container) — currentTime keeps advancing
          // from the audio track alone, so the stall check above never
          // trips, and the tile would otherwise sit there completely
          // black (with sound) forever. videoWidth/videoHeight stay 0
          // for as long as not a single video frame has ever actually
          // been decoded.
          if (!videoEl.videoWidth || !videoEl.videoHeight) { replaceTileWithImage('audio plays but no video frame ever decoded'); return; }
        }, 3000);
      }, 7000);
    }
    // fadeSwapPair can hand this videoEl off to a *different* gridTileInfo
    // entry later (swapping .videoEl/.videoTex/.idx together between two
    // tiles). Looking up the current owner by reference — instead of
    // trusting the "info" this closure was created with — keeps ended/
    // loadedmetadata handling correct for whichever tile actually owns this
    // element now, rather than silently going stale after such a swap.
    function currentOwner() {
      return gridTileInfo.find((t) => t.videoEl === videoEl) || pendingSwapInfos.find((t) => t.videoEl === videoEl) || null;
    }
    function computeClientStart() {
      if (!currentResolved) return 0;
      const durationSec = isFinite(videoEl.duration) ? videoEl.duration : 0;
      if (!durationSec) return 0;
      if (currentResolved.startMode === 'movie') {
        return computeMovieRandomStart(durationSec, timerSeconds, +backdropMovieMinInput.value, +backdropMovieMaxInput.value);
      }
      return computeRandomStart(durationSec, timerSeconds, currentResolved.startMode);
    }
    videoEl.addEventListener('loadedmetadata', () => {
      const owner = currentOwner();
      if (!owner || owner.idx !== sentinel) return;
      // Fresh client-side random jump on EVERY source load (initial tile
      // assignment and every ended-triggered repeat alike) — the browser's
      // own duration is authoritative here, no server metadata needed.
      const startTime = computeClientStart();
      if (startTime > 0) {
        try { videoEl.currentTime = startTime; } catch (err) {}
        console.log('[BackdropWall] ' + (currentResolved ? currentResolved.label : sentinel) + ' — browser duration ' + (isFinite(videoEl.duration) ? videoEl.duration.toFixed(1) : '?') + 's — jumping to ' + startTime.toFixed(1) + 's' + (usedFallbackForCurrentSrc ? ' (remux fallback)' : ''));
      } else {
        console.log('[BackdropWall] ' + (currentResolved ? currentResolved.label : sentinel) + ' — browser duration ' + (isFinite(videoEl.duration) ? videoEl.duration.toFixed(1) : '?') + 's — starting from beginning' + (usedFallbackForCurrentSrc ? ' (remux fallback)' : ''));
      }
      if (!owner.videoTex) {
        videoEl.width = videoEl.videoWidth;
        videoEl.height = videoEl.videoHeight;
        const tex = new THREE.VideoTexture(videoEl);
        tex.colorSpace = THREE.SRGBColorSpace;
        owner.mat.map = tex;
        owner.mat.needsUpdate = true;
        owner.videoTex = tex;
      }
      // Re-fit on EVERY load, not only the very first — a looping tile
      // (loadFreshSegment, re-triggered via the 'ended' listener below)
      // reuses this SAME videoTex for each new segment/media, but this
      // whole block used to return early the instant videoTex already
      // existed, so the fit was only ever computed once per tile's
      // entire lifetime. The crop VALUE itself was always being looked
      // up and stored correctly on videoEl.__jfCrop by loadFreshSegment
      // — what was missing was actually re-applying it here on every
      // subsequent load, which is exactly why a tile kept showing
      // whatever crop its very first video had, regardless of which
      // (possibly quite differently letterboxed) video was playing on
      // it since.
      applyVideoFit(owner);
    });
    videoEl.addEventListener('error', () => {
      // Static (untouched) file failed to play — codec the browser can't
      // decode directly (e.g. some mkv movies). Fall back once per source
      // to the server remux path, where the random start is applied
      // server-side via StartTimeTicks (demonstrably honored there because
      // remuxing forces the seek through ffmpeg).
      if (suppressErrors) return;
      const owner = currentOwner();
      if (!owner || owner.idx !== sentinel || !currentResolved) return;
      if (usedFallbackForCurrentSrc) {
        // The remux fallback itself failed too — previously this second
        // error was swallowed silently, leaving a black tile (the observed
        // stubborn-mkv case). Treat it like unavailable material.
        replaceTileWithImage('remux fallback errored');
        return;
      }
      usedFallbackForCurrentSrc = true;
      loadSeq++;
      startPlaybackWatchdog();
      let fb = session.serverUrl + '/Videos/' + currentResolved.mediaId + '/stream.mp4?api_key=' + session.accessToken;
      // Best-effort server-side random start for the fallback: duration is
      // unknown client-side here, so reuse the Jellyfin-known runtime of
      // the movie item when available (only the movie case has it on hand).
      if (currentResolved.startMode === 'movie' && fullItem.RunTimeTicks) {
        const durationSec = fullItem.RunTimeTicks / 10000000;
        const startSec = computeMovieRandomStart(durationSec, timerSeconds, +backdropMovieMinInput.value, +backdropMovieMaxInput.value);
        if (startSec > 0) fb += '&StartTimeTicks=' + Math.round(startSec * 10000000);
      }
      console.warn('[BackdropWall] ' + currentResolved.label + ' — static file not playable in browser, switching to remux fallback.');
      videoEl.src = fb;
      videoEl.play().catch(() => {});
    });
    function loadFreshSegment() {
      const owner = currentOwner();
      if (!owner || owner.idx !== sentinel) return;
      resolveBackdropVideoSrc(sentinel, fullItem, timerSeconds).then((resolved) => {
        const owner2 = currentOwner();
        if (!owner2 || owner2.idx !== sentinel) return;
        if (!resolved) {
          // Instance can't play (all files avi/missing despite pre-check —
          // race or mid-session change): behave like "Off" for this tile
          // and show an image instead of leaving it black.
          const imgs = backdropDedupeCache[fullItem.Id] || [];
          if (imgs.length) {
            const pick = imgs[Math.floor(Math.random() * imgs.length)];
            if (owner2.__pending) pendingFallbackToImage(owner2, pick);
            else fadeSwapTile(owner2, pick);
          }
          return;
        }
        // Single deterministic path for EVERY playback occasion (initial
        // tile assignment, same-file repeat, order-driven file switch):
        // fully unload the element (remove src + load() resets it to a
        // pristine state), then attach the source fresh. Per spec this
        // forces a genuine new load even when the URL is identical, so
        // loadedmetadata — where the fresh random jump lives — is
        // guaranteed to fire again. HTTP cache may still serve the bytes
        // (fast); the ELEMENT reset is what forces the reload, not the
        // network. The suppress flag keeps the codec-fallback error
        // handler from reacting to teardown noise.
        suppressErrors = true;
        try { videoEl.pause(); videoEl.removeAttribute('src'); videoEl.load(); } catch (err) {}
        currentResolved = resolved;
        usedFallbackForCurrentSrc = false;
        suppressErrors = false;
        loadSeq++;
        videoEl.__jfMediaId = resolved.mediaId;
        videoEl.__jfCrop = letterboxCache[resolved.mediaId] || null;
        videoEl.src = resolved.src;
        videoEl.load();
        videoEl.play().catch(() => {});
        startPlaybackWatchdog();
        // Crop-known state only — PURE flag, no visibility side effects.
        // The two-layer crossfade (fadeSwapTile's readiness poll) already
        // gates its own reveal on "!pending.videoEl.__jfAwaitingCrop", so
        // this used to ALSO flip opacity directly here, and the two
        // mechanisms raced: whichever fired first won, and for an initial
        // appearance (front still near-invisible, waiting its staged
        // turn) this old direct reveal could show the back layer's video
        // right through the still-transparent front — no black ever seen.
        // Now this block only ever sets/clears the flag; the crossfade's
        // own poll is the single, sole place that decides visibility.
        // Detection is only ever relevant for 'auto' — 'off' has nothing
        // to crop, 'forced' already knows its crop without sampling
        // anything (see applyVideoFit/computeForcedScopeCrop), so both
        // count as "already known", same as a video 'auto' has already
        // sampled before.
        const cropKnownAtLoad = backdropOverscanMode !== 'auto' || !!videoEl.__jfCrop;
        if (!cropKnownAtLoad) {
          videoEl.__jfAwaitingCrop = resolved.mediaId;
          // Safety timeout: a stalled detection can never block the
          // crossfade forever — clear the flag after this regardless,
          // playing the tile WITHOUT any crop rather than making the
          // person wait indefinitely. Hard 5s cap per explicit request —
          // the probe's own internal give-up (4.2s) normally fires
          // first; this is the final backstop in case even that somehow
          // doesn't resolve.
          setTimeout(() => {
            if (videoEl.__jfMediaId === resolved.mediaId && videoEl.__jfAwaitingCrop === resolved.mediaId) {
              videoEl.__jfAwaitingCrop = null;
            }
          }, 5000);
          // Runs on a separate, invisible probe element using the same
          // source URL — starts immediately, doesn't wait for the tile's
          // own visible video to reach 'playing' at all, since the two
          // are now completely independent.
          sampleLetterboxBySeeking(resolved.src, resolved.mediaId, (res) => {
            if (videoEl.__jfMediaId !== resolved.mediaId) return;
            videoEl.__jfCrop = res;
            const o = currentOwner();
            if (o) applyVideoFit(o);
            if (videoEl.__jfAwaitingCrop === resolved.mediaId) videoEl.__jfAwaitingCrop = null;
          });
        } else {
          videoEl.__jfAwaitingCrop = null;
        }
      });
    }
    if (shouldLoop) videoEl.addEventListener('ended', loadFreshSegment);
    loadFreshSegment();
  }
  function disposeTileVideo(info) {
    if (!info) return;
    if (info.videoEl) {
      try { info.videoEl.pause(); info.videoEl.removeAttribute('src'); info.videoEl.load(); } catch (err) {}
      info.videoEl = null;
    }
    if (info.videoTex) {
      info.videoTex.dispose();
      info.videoTex = null;
    }
  }
  const KIOSK_DISC_RADIUS = 3.2;
  let discPivot = null;
  // Tracks specifically whether the CURRENT discPivot is genuine disc
  // art (true) as opposed to the dark fallback circle or nothing at all
  // (false in both those cases) — the warm-white floor indicator's own
  // per-frame target (in animate()) checks this to hide itself while
  // real disc art is showing, so the two don't visibly blend into each
  // other. Kept as its own separate flag rather than inferred from
  // discPivot alone, since discPivot being non-null already means EITHER
  // real disc art OR the fallback circle — same object shape, no way to
  // tell them apart just by looking at discPivot itself.
  let realDiscArtActive = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 1.7, 10);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  document.body.insertBefore(renderer.domElement, document.getElementById('hud'));
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  let isLocked = false;
  let cinemaConsoleActive = false;
  let cinemaConsoleIdleTimer = null;
  let cinemaConsoleMuted = false;
  let cinemaConsolePrevVolTrailer = 1;
  let cinemaConsolePrevVolThemeSong = 1;
  let pendingPrimaryAction = false;
  let pendingSecondaryAction = false;
  let pendingActionTimestamp = 0;
  const PENDING_ACTION_MAX_AGE_MS = 2000;
  const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  function requestPointerLockDeferred() {
    // A relock requested too soon after an Escape-driven release is commonly rejected —
    // this appears to be time-based, not tied to the exact gesture, so retry a few times.
    let attempts = 0;
    const tryLock = () => {
      if (isLocked) return;
      try { renderer.domElement.requestPointerLock(); } catch (err) {}
      attempts++;
      if (attempts < 8 && !isLocked) setTimeout(tryLock, 200);
    };
    setTimeout(tryLock, 0);
  }
  const MOUSE_SENSITIVITY = 0.0022, PITCH_LIMIT = Math.PI / 2 - 0.05;
  const instructionsEl = document.getElementById('instructions');
  const tooltipEl = document.getElementById('tooltip');
  const panelEl = document.getElementById('panel');
  const cinemaConsoleInputEl = document.getElementById('cinemaConsoleInput');
  const cinemaConsoleIndicatorEl = document.getElementById('cinemaConsoleIndicator');
  // Position lookup for the indicator — mirrors the seven corner options
  // from the original script's own CONFIG.indicatorCorner, applied here
  // via direct inline style assignment (position is user-configurable at
  // runtime through the Controls tab, so this can't be a static CSS rule).
  const CINEMA_CONSOLE_POSITIONS = {
    'top-left': { top: '12px', left: '12px', right: '', bottom: '', transform: '' },
    'top-right': { top: '12px', right: '12px', left: '', bottom: '', transform: '' },
    'bottom-left': { bottom: '12px', left: '12px', top: '', right: '', transform: '' },
    'bottom-right': { bottom: '12px', right: '12px', top: '', left: '', transform: '' },
    'top-center': { top: '6vh', left: '50%', right: '', bottom: '', transform: 'translateX(-50%)' },
    'center-center': { top: '50%', left: '50%', right: '', bottom: '', transform: 'translate(-50%, -50%)' },
    'bottom-center': { bottom: '6vh', left: '50%', right: '', top: '', transform: 'translateX(-50%)' },
  };
  function applyCinemaConsoleIndicatorStyle() {
    cinemaConsoleIndicatorEl.style.color = cinemaKeyboardColor;
    const c = CINEMA_CONSOLE_POSITIONS[cinemaKeyboardPosition] || CINEMA_CONSOLE_POSITIONS['top-center'];
    cinemaConsoleIndicatorEl.style.top = c.top;
    cinemaConsoleIndicatorEl.style.left = c.left;
    cinemaConsoleIndicatorEl.style.right = c.right;
    cinemaConsoleIndicatorEl.style.bottom = c.bottom;
    cinemaConsoleIndicatorEl.style.transform = c.transform;
  }
  function resetCinemaConsoleIdleTimer() {
    if (cinemaConsoleIdleTimer) clearTimeout(cinemaConsoleIdleTimer);
    cinemaConsoleIdleTimer = setTimeout(deactivateCinemaConsole, cinemaKeyboardIdleSeconds * 1000);
  }
  // Enter in the room activates the console (see primaryAction's own
  // fallthrough branch for the exact free-state conditions). Deliberately
  // no Escape-driven cancel here — Escape forces a browser-level
  // Pointer Lock release regardless of what our own code does, which
  // reads as being kicked out of the 3D room entirely. Only two ways
  // out: Enter with a real/empty command (see the isTyping handler
  // below), or the idle timer above.
  function activateCinemaConsole() {
    if (!cinemaKeyboardEnabled || cinemaConsoleActive) return;
    cinemaConsoleActive = true;
    cinemaConsoleInputEl.value = '';
    if (document.pointerLockElement) document.exitPointerLock();
    cinemaConsoleInputEl.focus();
    applyCinemaConsoleIndicatorStyle();
    cinemaConsoleIndicatorEl.textContent = ' ';
    cinemaConsoleIndicatorEl.style.display = 'block';
    requestAnimationFrame(() => { cinemaConsoleIndicatorEl.style.opacity = '1'; });
    resetCinemaConsoleIdleTimer();
    instructionsEl.innerHTML = baseInstructions();
  }
  function deactivateCinemaConsole() {
    if (cinemaConsoleIdleTimer) { clearTimeout(cinemaConsoleIdleTimer); cinemaConsoleIdleTimer = null; }
    cinemaConsoleActive = false;
    cinemaConsoleInputEl.value = '';
    cinemaConsoleInputEl.blur();
    cinemaConsoleIndicatorEl.style.opacity = '0';
    setTimeout(() => { if (!cinemaConsoleActive) cinemaConsoleIndicatorEl.style.display = 'none'; }, 200);
    requestPointerLockDeferred();
    instructionsEl.innerHTML = baseInstructions();
  }
  // Keeps the visible indicator in sync with what's actually been typed —
  // the input element itself is invisible (opacity: 0), so this text is
  // the ONLY feedback the person gets while typing. Uses the native
  // 'input' event rather than reading the value from inside the keydown
  // handler: keydown fires BEFORE the browser inserts the new character
  // into the field, so a value read there would always be one keystroke
  // stale (and would miss non-keydown changes like paste entirely).
  // A trailing space keeps the indicator's own background bubble from
  // collapsing to zero width while the field is empty, matching its
  // appearance right after activation.
  cinemaConsoleInputEl.addEventListener('input', () => {
    cinemaConsoleIndicatorEl.textContent = cinemaConsoleInputEl.value || ' ';
  });
  // ==================== Cinema Console — full command vocabulary ====================
  // Word lists, directly from the planning doc (Tippbare-Befehle-Vormerkung.md,
  // Punkt 1-16). Title matching uses ccFindMovieMatch/ccResolveUniqueTitleMatch,
  // the full three-stage stripParenChars/year-disambiguation algorithm
  // ported from the original reference script (see that function's own
  // comment further down).
  const CC_SORT_FIELDS = {
    random: 'Random', name: 'SortName',
    'community rating': 'CommunityRating', 'critics rating': 'CriticRating', 'critic rating': 'CriticRating',
    'date added': 'DateCreated', 'date played': 'DatePlayed', 'parental rating': 'OfficialRating',
    'play count': 'PlayCount', 'release date': 'PremiereDate', runtime: 'Runtime',
  };
  const CC_WALL_SORTWALL = { alternating: 'alternating', alternate: 'alternating', sequential: 'sequential', sequence: 'sequential', wrap: 'sequential-wrap', wraparound: 'sequential-wrap', 'sequential wrap': 'sequential-wrap' };
  const CC_WALL_STARTWALL = { 'left screen': 'left-screen', 'left backwall': 'left-backwall', 'left back': 'left-backwall', 'right screen': 'right-screen', 'right backwall': 'right-backwall', 'right back': 'right-backwall' };
  const CC_WALL_REPEATMODE = { repeat: 'repeat', loop: 'repeat', 'no repeat': 'norepeat', norepeat: 'norepeat', once: 'norepeat' };
  const CC_WALL_GAPPOSITION = { end: 'end', 'gap end': 'end', center: 'center', centered: 'center', middle: 'center', 'second center': 'center-second', 'center second': 'center-second', balanced: 'balanced', spread: 'balanced', even: 'balanced' };
  const CC_FILTER_CATEGORY_WORDS = { genre: 'genre', genres: 'genre', year: 'year', years: 'year', tag: 'tag', tags: 'tag', rating: 'rating', ratings: 'rating', feature: 'feature', features: 'feature', filter: 'filtergeneral', filters: 'filtergeneral', 'video type': 'videotype', 'video types': 'videotype', studio: 'studio', studios: 'studio', network: 'studio', networks: 'studio', person: 'person', persons: 'person', actor: 'person', actors: 'person', actress: 'person', actresses: 'person', people: 'person', peoples: 'person', celebrity: 'person', celeb: 'person' };
  const CC_FEATURE_VALUES = { subtitle: 'HasSubtitles', subtitles: 'HasSubtitles', trailer: 'HasTrailer', trailers: 'HasTrailer', 'special feature': 'HasSpecialFeature', 'special features': 'HasSpecialFeature', extra: 'HasSpecialFeature', extras: 'HasSpecialFeature', 'theme song': 'HasThemeSong', 'theme songs': 'HasThemeSong', 'theme video': 'HasThemeVideo', 'theme videos': 'HasThemeVideo' };
  const CC_GENERALFILTER_VALUES = { played: 'IsPlayed', unplayed: 'IsUnplayed', resumable: 'IsResumable', continue: 'IsResumable', 'continue watching': 'IsResumable', favorite: 'IsFavorite', favorites: 'IsFavorite', favourite: 'IsFavorite', favourites: 'IsFavorite', fav: 'IsFavorite' };
  const CC_VIDEOTYPE_VALUES = { hd: { param: 'IsHD', paramValue: 'true' }, sd: { param: 'IsHD', paramValue: 'false' }, '4k': { param: 'Is4K', paramValue: 'true' }, '3d': { param: 'Is3D', paramValue: 'true' }, bd: { param: 'VideoTypes', paramValue: 'BluRay' }, bluray: { param: 'VideoTypes', paramValue: 'BluRay' }, 'blu-ray': { param: 'VideoTypes', paramValue: 'BluRay' }, dvd: { param: 'VideoTypes', paramValue: 'Dvd' } };
  const CC_COLLECTION_WORDS = ['collection', 'anthology', 'saga', 'set', 'filmreihe', 'colecao', 'coleccion', 'collectie', 'collezione', 'kolekcja', 'kolekce', 'kolekcia', 'kolekcija', 'zbirka', 'colectie', 'gyujtemeny', 'kokoelma', 'samling', 'koleksiyon'];
  const CC_EFFECT_WORDS = {
    library: 'library', movie: 'movie', trailer: 'trailer',
    themevideo: 'themevideo', 'theme video': 'themevideo', 'video theme': 'themevideo', backdrop: 'themevideo',
    themesong: 'themesong', 'theme song': 'themesong', 'song theme': 'themesong', song: 'themesong', ost: 'themesong', soundtrack: 'themesong', 'main theme': 'themesong', theme: 'themesong', video: 'themesong',
    fanartwall: 'fanartwall', fanart: 'fanartwall', 'fanart wall': 'fanartwall', 'wall fanart': 'fanartwall',
    ambient: 'ambient', ambiente: 'ambient', 'ambiente mode': 'ambient', 'ambient mode': 'ambient',
  };
  const CC_MOVIE_EFFECTS_ALL = ['movie', 'trailer', 'themevideo', 'themesong', 'fanartwall', 'ambient']; // library deliberately excluded from random-effect selection
  const CC_PLAY_FAMILY = { play: 'play', start: 'play', resume: 'resume', replay: 'replay' };
  // Longest-match-first phrase table, built once. Each entry consumes a
  // known number of words starting at the scan cursor; unmatched words
  // fall through untouched (title words, free-text filter values, names).
  function ccBuildPhraseTable() {
    const table = [];
    const add = (dict, kind) => Object.keys(dict).forEach((phrase) => table.push({ words: phrase.split(' '), kind, value: dict[phrase] }));
    add(CC_SORT_FIELDS, 'sortfield');
    add(CC_WALL_SORTWALL, 'sortwall');
    add(CC_WALL_STARTWALL, 'startwall');
    add(CC_WALL_REPEATMODE, 'repeatmode');
    add(CC_WALL_GAPPOSITION, 'gapposition');
    add(CC_FILTER_CATEGORY_WORDS, 'filtercat');
    add(CC_FEATURE_VALUES, 'featureval');
    add(CC_GENERALFILTER_VALUES, 'generalfilterval');
    add(CC_VIDEOTYPE_VALUES, 'videotypeval');
    add(CC_EFFECT_WORDS, 'effect');
    add(CC_PLAY_FAMILY, 'playfamily');
    CC_COLLECTION_WORDS.forEach((w) => table.push({ words: w.split(' '), kind: 'collectionword', value: true }));
    table.sort((a, b) => b.words.length - a.words.length);
    return table;
  }
  const CC_PHRASE_TABLE = ccBuildPhraseTable();
  // Ported from the original reference script's own titleCase — used as
  // a FALLBACK only now (see ccResolveCategoryDisplayValue below), for
  // the rare case a typed genre/tag doesn't appear in the server's own
  // already-loaded option list at all (e.g. a brand-new one added after
  // Cinema started, before the next options refresh).
  // Looks up the typed (lowercased) genre/tag value against the
  // server's own already-loaded option list (msDynamicOptions, fetched
  // once at Cinema startup via fetchFilterOptions) and returns its
  // EXACT stored casing when found — "Star Trek films" (irregular,
  // lowercase "films") is returned exactly as stored, regardless of
  // how irregular the casing is. No match at all — genuinely doesn't
  // exist in the library, or a typo — returns null; the caller drops
  // the value entirely rather than guessing a possibly-wrong casing
  // and silently sending it to Jellyfin's own Genres/Tags filter
  // anyway (which would just as silently return zero movies, but
  // without ever making clear the value wasn't actually recognized).
  // Matches the same "no match = no-op" rule the title search already
  // follows elsewhere in this file, rather than introducing a second,
  // inconsistent kind of "best guess" behavior just for this one case.
  function ccResolveCategoryDisplayValue(target, typedValue) {
    const options = target === 'genre' ? msDynamicOptions.Genres : target === 'tag' ? msDynamicOptions.Tags : target === 'studio' ? msDynamicOptions.Studios : null;
    if (!options) return null;
    const lower = typedValue.toLowerCase();
    const found = options.find((o) => o.value && o.value.toLowerCase() === lower);
    return found ? found.value : null;
  }
  // Pushes whatever's been accumulating in state.pendingCategoryValue
  // (a comma-terminated or boundary-terminated genre/tag value, possibly
  // multiple words — "science fiction") into the right list, then clears
  // the buffer. Called right before currentValueTarget changes to
  // anything else, and once more after the whole scan loop ends, so a
  // trailing value with nothing after it still makes it in. A value
  // that doesn't resolve to any real, known genre/tag is silently
  // dropped here — see ccResolveCategoryDisplayValue's own comment.
  function ccFlushPendingCategoryValue(state, target) {
    if (!state.pendingCategoryValue) return;
    if (target === 'genre') {
      const resolved = ccResolveCategoryDisplayValue('genre', state.pendingCategoryValue);
      if (resolved) state.genresList.push(resolved);
    } else if (target === 'tag') {
      const resolved = ccResolveCategoryDisplayValue('tag', state.pendingCategoryValue);
      if (resolved) state.tagsList.push(resolved);
    } else if (target === 'studio') {
      const resolved = ccResolveCategoryDisplayValue('studio', state.pendingCategoryValue);
      if (resolved) state.studiosList.push(resolved);
    }
    state.pendingCategoryValue = '';
  }
  function ccMatchAt(tokens, i, kinds) {
    for (const entry of CC_PHRASE_TABLE) {
      if (kinds && !kinds.includes(entry.kind)) continue;
      if (i + entry.words.length > tokens.length) continue;
      let ok = true;
      for (let j = 0; j < entry.words.length; j++) { if (tokens[i + j] !== entry.words[j]) { ok = false; break; } }
      if (ok) return { entry, len: entry.words.length };
    }
    return null;
  }
  async function ccApplyFilterReload(opts, ctx) {
    const movieInputEl2 = document.getElementById('movieInput');
    if (movieInputEl2) { movieInputEl2.value = ''; acSelectedMovieId = ''; }
    await loadMovies(opts);
    await applySmartLaunchToKioskUi(opts, ctx || {});
    updateAllMsSummaries();
    const layoutSelectEl = document.getElementById('layoutSelect');
    const startWallSelectEl = document.getElementById('startWallSelect');
    const repeatModeSelectEl = document.getElementById('repeatModeSelect');
    const gapPositionSelectEl = document.getElementById('gapPositionSelect');
    if (opts.layout && layoutSelectEl) layoutSelectEl.value = opts.layout;
    if (opts.startWall && startWallSelectEl) startWallSelectEl.value = opts.startWall;
    if (opts.repeatMode && repeatModeSelectEl) repeatModeSelectEl.value = opts.repeatMode;
    if (opts.gapPosition && gapPositionSelectEl) gapPositionSelectEl.value = opts.gapPosition;
  }
  function ccCurrentWallOpts() {
    return {
      layout: document.getElementById('layoutSelect').value,
      startWall: document.getElementById('startWallSelect').value,
      repeatMode: document.getElementById('repeatModeSelect').value,
      gapPosition: document.getElementById('gapPositionSelect').value,
    };
  }
  async function ccResolveRandomEffect(item) {
    // Same four checks prepareAndOpenContextMenu already runs, reused
    // here so a random pick never lands on a genuinely unavailable
    // effect. fanartwall/ambient are never checked anywhere in the
    // existing code (confirmed always available), so they're included
    // unconditionally.
    const [movieBlocked, trailerOk, themeSongOk, themeVideoOk] = await Promise.all([
      checkMovieBlocked(item.Id), checkTrailerAvailability(item.Id), checkThemeSongAvailability(item.Id), checkThemeVideoAvailability(item.Id),
    ]);
    const avail = { movie: !movieBlocked, trailer: trailerOk, themesong: themeSongOk, themevideo: themeVideoOk };
    const pool = CC_MOVIE_EFFECTS_ALL.filter((eff) => avail[eff] !== false);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  // The old client-side "seek on an ALREADY-loaded video" approach
  // (ccApplySeekRobust / ccApplySeekPercentRobust, and the ccSeekChapterOnItem
  // / ccSeekResumeOnItem / ccSeekPercentOnVideo wrappers built on top of
  // them) was removed here. It never actually worked reliably: a client-
  // side currentTime seek has nothing to jump to on a transcoded,
  // real-time, one-directional stream that was never told to start
  // anywhere else — exactly why chapter/percent/resume silently landed
  // back at the beginning regardless of how many events the seek attempt
  // was retried against. Every caller now goes through playMovieOnScreen
  // with a seekIntent instead — a real restart with the target embedded
  // as StartTimeTicks in the SAME initial request — both for the
  // with-title dispatch (ccPlayMovieWithSeekIntent) and the bare,
  // no-title form (see the bare-command block further down). See
  // playMovieOnScreen's own comment for the full reasoning.
  // Resolve-only — return the target seconds without applying anything;
  // both callers embed the result as StartTimeTicks themselves. null =
  // nothing to seek to (matches the doc's own "invalid command does
  // nothing" rule for the caller).
  async function ccResolveChapterSeconds(itemId, chapterNum, chapterName, wantRandom) {
    try {
      const data = await jfGet('/Users/' + session.userId + '/Items/' + itemId, { Fields: 'Chapters' });
      const chapters = data.Chapters || [];
      if (!chapters.length) return null;
      let target = null;
      if (wantRandom) target = chapters[Math.floor(Math.random() * chapters.length)];
      else if (chapterNum) target = chapters[chapterNum - 1];
      else if (chapterName) {
        const lower = chapterName.toLowerCase();
        target = chapters.find((c) => c.Name && c.Name.toLowerCase().includes(lower));
      }
      if (!target) return null;
      return (target.StartPositionTicks || 0) / 10000000;
    } catch (err) { return null; }
  }
  async function ccResolveResumeSeconds(itemId) {
    try {
      const data = await jfGet('/Users/' + session.userId + '/Items/' + itemId, { Fields: 'UserData' });
      const ticks = data.UserData && data.UserData.PlaybackPositionTicks;
      if (!ticks) return null;
      return ticks / 10000000;
    } catch (err) { return null; }
  }
  // Ported directly from the original reference script (JellyfinKeyboardLibraryNavigation.js,
  // normalizeBase/squash/stripParenChars/stripTrailingBracketGroup/
  // stripSubtitleAfterSeparator/resolveUniqueTitleMatch) — same algorithm,
  // unchanged, just working against our own {Name, OriginalTitle,
  // ProductionYear} movie objects instead of the original's DOM-driven ones.
  function ccNormalizeBase(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/\\s+[-–—]\\s+/g, ' ')
      .replace(/:\\s+/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();
  }
  function ccSquash(str) { return ccNormalizeBase(str).replace(/\\s+/g, ''); }
  function ccStripParenChars(str) { return (str || '').replace(/[()]/g, ''); }
  function ccStripTrailingBracketGroup(str) { return (str || '').replace(/\\s*\\([^()]*\\)\\s*$/, '').trim(); }
  function ccStripSubtitleAfterSeparator(str) {
    const s = str || '';
    const match = s.match(/:\\s+|\\s+[-–—]\\s+/);
    if (!match) return s.trim();
    return s.slice(0, match.index).trim();
  }
  function ccResolveUniqueTitleMatch(items, title) {
    const target = ccSquash(ccStripParenChars(title));
    const stage1 = items.filter((i) => {
      const nameMatches = ccSquash(ccStripParenChars(i.Name)) === target;
      const origMatches = i.OriginalTitle && ccSquash(ccStripParenChars(i.OriginalTitle)) === target;
      return nameMatches || origMatches;
    });
    if (stage1.length === 1) return stage1[0];
    if (stage1.length > 1) return null;
    const targetNoBracket = ccSquash(ccStripParenChars(ccStripTrailingBracketGroup(title)));
    const stage2 = items.filter((i) => {
      const nameMatches = ccSquash(ccStripParenChars(ccStripTrailingBracketGroup(i.Name))) === targetNoBracket;
      const origMatches = i.OriginalTitle && ccSquash(ccStripParenChars(ccStripTrailingBracketGroup(i.OriginalTitle))) === targetNoBracket;
      return nameMatches || origMatches;
    });
    if (stage2.length === 1) return stage2[0];
    const targetNoSubtitle = ccSquash(ccStripParenChars(ccStripSubtitleAfterSeparator(title)));
    const stage3 = items.filter((i) => {
      const nameMatches = ccSquash(ccStripParenChars(ccStripSubtitleAfterSeparator(i.Name))) === targetNoSubtitle;
      const origMatches = i.OriginalTitle && ccSquash(ccStripParenChars(ccStripSubtitleAfterSeparator(i.OriginalTitle))) === targetNoSubtitle;
      return nameMatches || origMatches;
    });
    if (stage3.length === 1) return stage3[0];
    return null;
  }
  // Jellyfin's own server-side search (searchTerm) is a plain SQL-based
  // lookup, not a fuzzy/tolerant search engine (confirmed indirectly —
  // third-party search plugins specifically describe registering "with
  // higher priority than the built-in SQL search provider") — it can
  // fail to return a candidate at all when the typed phrase omits the
  // title's own punctuation (":"/"-"), EVEN THOUGH our own downstream
  // normalizeBase/squash/3-stage matching (ccResolveUniqueTitleMatch)
  // is fully punctuation-tolerant by design. That downstream logic can
  // only work with whatever candidates the server actually returns —
  // if the server's own search already excluded the right movie, no
  // amount of client-side normalization afterward can recover it.
  async function ccSearchMovieItems(searchTerm) {
    const data = await jfGet('/Users/' + session.userId + '/Items', { searchTerm, IncludeItemTypes: 'Movie', Recursive: 'true', Limit: '50' }).catch(() => ({ Items: [] }));
    return data.Items || [];
  }
  async function ccFindMovieMatch(titleText, yearHint) {
    let items = await ccSearchMovieItems(titleText);
    let filtered = yearHint ? items.filter((it) => String(it.ProductionYear) === String(yearHint)) : items;
    let result = ccResolveUniqueTitleMatch(filtered, titleText);
    if (result) return result;
    // Fallback tier 1: retry with just the single most distinctive word
    // from the typed text (longest word, skipping trivial leading
    // articles) instead of the full phrase — a punctuation-agnostic
    // anchor that gives Jellyfin's own search something simple and
    // unambiguous to match against, widening the candidate pool for the
    // SAME downstream matching logic to then narrow back down precisely.
    const STOPWORDS = ['the', 'a', 'an', 'of', 'and'];
    const words = titleText.split(' ').filter((w) => w && !STOPWORDS.includes(w));
    let anchor = null;
    if (words.length) {
      anchor = words.reduce((longest, w) => (w.length > longest.length ? w : longest), words[0]);
      if (anchor !== titleText) {
        items = await ccSearchMovieItems(anchor);
        filtered = yearHint ? items.filter((it) => String(it.ProductionYear) === String(yearHint)) : items;
        result = ccResolveUniqueTitleMatch(filtered, titleText);
        if (result) return result;
      }
    }
    // Fallback tier 2 (last resort): fetch the ENTIRE library, no search
    // term at all, exactly matching the original reference script's own
    // final fallback (resolveTitle's own fetchAllOfType call, tried only
    // after its own searchItemsBroad attempts came up empty). No search
    // term can ever be FULLY guaranteed to satisfy a literal, non-fuzzy
    // server-side search for every possible typed phrasing — this is
    // the only tier that's unconditionally reliable, at the cost of a
    // real network cost proportional to library size. Reuses fetchMovies
    // (the same batched, complete-library fetch the poster wall itself
    // uses) rather than a separate implementation.
    items = await fetchMovies({}).catch(() => []);
    filtered = yearHint ? items.filter((it) => String(it.ProductionYear) === String(yearHint)) : items;
    return ccResolveUniqueTitleMatch(filtered, titleText);
  }
  function ccTriggerEffectOnItem(item, effectWord) {
    contextMenuItem = item;
    contextMenuUrl = detailUrl(item);
    return executeContextMenuAction(effectWord);
  }
  // Resolves the position-family target (percent/chapter/resume, if any)
  // BEFORE calling playMovieOnScreen, so it can be passed straight
  // through as seekIntent — a real restart with the target embedded as
  // StartTimeTicks from the start (see playMovieOnScreen's own comment
  // for why that's the only reliable approach). Only called for the
  // 'movie' effect specifically — percent/chapter/resume/replay are
  // documented as movie-only, so every OTHER effect (trailer,
  // themevideo, ...) just calls ccTriggerEffectOnItem directly and skips
  // this whole resolution step.
  async function ccPlayMovieWithSeekIntent(item, state) {
    const sourcesPresent = [
      state.percentValue !== null || state.percentIsRandom,
      state.chapterNum !== null || !!state.chapterName || state.chapterIsRandom,
      state.playFamily === 'resume',
      state.playFamily === 'replay',
    ].filter(Boolean).length;
    let seekIntent = null;
    if (sourcesPresent <= 1) {
      if (state.percentValue !== null) seekIntent = { type: 'percent', value: state.percentValue };
      else if (state.percentIsRandom) seekIntent = { type: 'percent', value: Math.floor(Math.random() * 100) };
      else if (state.chapterNum !== null || state.chapterName || state.chapterIsRandom) {
        const seconds = await ccResolveChapterSeconds(item.Id, state.chapterNum, state.chapterName, state.chapterIsRandom);
        if (seconds !== null) seekIntent = { type: 'seconds', value: seconds };
      } else if (state.playFamily === 'resume') {
        const seconds = await ccResolveResumeSeconds(item.Id);
        if (seconds !== null) seekIntent = { type: 'seconds', value: seconds };
      }
      // 'replay' and bare 'play' both mean "from the start" — seekIntent
      // stays null, playMovieOnScreen already starts at 0 regardless.
    }
    contextMenuItem = item;
    contextMenuUrl = detailUrl(item);
    await playMovieOnScreen(item, false, seekIntent);
  }
  // ---- Exact, standalone phrases: no combination with anything else ----
  async function ccTryExactCommand(text) {
    if (/^(next\\s+page|page\\s+next|forward\\s+page|page\\s+forward|next|forward)$/.test(text)) { stepPosterPage(1); return true; }
    if (/^(previous\\s+page|prev\\s+page|page\\s+previous|page\\s+prev|back\\s+page|page\\s+back|previous|prev)$/.test(text)) { stepPosterPage(-1); return true; }
    let mm = text.match(/^(\\d{1,4})\\s*(?:page|pages)?\\s*next$/) || text.match(/^next\\s*(\\d{1,4})\\s*(?:page|pages)?$/);
    if (mm) { const n = Math.min(9999, Math.max(1, parseInt(mm[1], 10))); for (let k = 0; k < n; k++) stepPosterPage(1); return true; }
    if (/^(page\\s+last|last\\s+page|last|end)$/.test(text)) { stepPosterPage(1e9); return true; }
    if (/^(page\\s+first|first\\s+page|first|begin)$/.test(text)) { stepPosterPage(-1e9); return true; }
    if (/^(enlarge|increase)$/.test(text)) { const idx = ROOM_SIZE_STEPS.indexOf(currentRoomSizeKey()); if (idx >= 0 && idx < ROOM_SIZE_STEPS.length - 1) startRoomResizeAnimation(ROOM_SIZE_STEPS[idx + 1]); return true; }
    if (/^(reduce|decrease|shrink)$/.test(text)) { const idx = ROOM_SIZE_STEPS.indexOf(currentRoomSizeKey()); if (idx > 0) startRoomResizeAnimation(ROOM_SIZE_STEPS[idx - 1]); return true; }
    if (text === 'stop') { stopAmbientMode(); stopAllPlayback(); return true; }
    if (text === 'kiosk') { openPanel(); return true; }
    if (text === 'options') { toggleMenuOverlay(); return true; }
    if (text === 'controls') { toggleControlsOverlay(); return true; }
    if (text === 'fullscreen') { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); return true; }
    if (text === 'window' || text === 'windowed') { if (document.fullscreenElement) document.exitFullscreen(); return true; }
    if (/^(on|light|light on|lights on|bright|brighten|illuminate)$/.test(text)) { setDim(false); return true; }
    if (/^(off|dark|darken|light off|dim)$/.test(text)) { setDim(true); return true; }
    if (text === 'home') {
      const btn = document.getElementById('panelResetAll');
      if (btn) btn.click();
      await ccApplyFilterReload({ sort: MENU_CONFIG.kiosk.search.sortBy.default + ':' + MENU_CONFIG.kiosk.search.sortOrder.default, layout: MENU_CONFIG.kiosk.search.sortWall.default, startWall: MENU_CONFIG.kiosk.search.startWall.default, repeatMode: MENU_CONFIG.kiosk.search.repeatMode.default, gapPosition: MENU_CONFIG.kiosk.search.gapPosition.default });
      return true;
    }
    if (/^(mute|sound off)$/.test(text)) {
      if (!cinemaConsoleMuted) { cinemaConsolePrevVolTrailer = trailerVideo.volume; cinemaConsolePrevVolThemeSong = themeSongAudio ? themeSongAudio.volume : 1; }
      trailerVideo.volume = 0; if (themeSongAudio) themeSongAudio.volume = 0;
      cinemaConsoleMuted = true;
      return true;
    }
    if (/^(unmute|sound on)$/.test(text)) {
      if (cinemaConsoleMuted) { trailerVideo.volume = cinemaConsolePrevVolTrailer; if (themeSongAudio) themeSongAudio.volume = cinemaConsolePrevVolThemeSong; cinemaConsoleMuted = false; }
      return true;
    }
    return false;
  }
  async function executeCinemaConsoleCommand(raw) {
    const text = (raw || '').trim().toLowerCase().replace(/\\s+/g, ' ');
    if (!text) return;
    if (await ccTryExactCommand(text)) return;
    // ---- Bare (no-title) actions on whatever is currently playing ----
    const bareCurrentItem = activeEnvState && trailerItemId ? lastLoadedMovies.find((m) => m.Id === trailerItemId) || { Id: trailerItemId } : null;
    // Percent/chapter/resume/replay are documented as movie-only (see the
    // planning doc's own section 9 — trailer/theme video/fanart wall/
    // ambient have no meaningful "resume" concept) — this guard actually
    // enforces that for the bare (no-title) form too, matching what the
    // WITH-title dispatch already restricts by construction (effectToUse
    // === 'movie' is the only path that ever builds a seekIntent there).
    const bareCurrentItemIsMovie = activeVideoState === 'movie';
    {
      const bm = text.match(/^(\\d{1,3})\\s*%$/) || text.match(/^(\\d{1,3})\\s*percent$/);
      // All four seek forms below RESTART the movie via playMovieOnScreen
      // with the target embedded as StartTimeTicks from the very first
      // request, exactly like the WITH-title dispatch (ccPlayMovieWithSeekIntent)
      // — a plain client-side currentTime seek on the ALREADY-playing
      // stream (the old approach here) doesn't actually work: it's the
      // SAME transcoded, one-directional stream either way, so it has
      // the identical "nothing to jump to" limitation that made
      // chapter/percent/resume silently land back at the start when
      // used WITH a title, before that got fixed. Restarting is a
      // real reload (fresh fetch, backdrop mosaic rebuild, brief
      // "Loading movie…" flash) rather than an instant in-place jump —
      // a real behavior change from before, but the only version of
      // this that's actually reliable.
      if (bm && bareCurrentItem && bareCurrentItemIsMovie) {
        const v = parseInt(bm[1], 10);
        await playMovieOnScreen(bareCurrentItem, false, { type: 'percent', value: v === 100 ? 99 : v });
        return;
      }
      if ((text === 'random%' || text === 'random percent') && bareCurrentItem && bareCurrentItemIsMovie) {
        await playMovieOnScreen(bareCurrentItem, false, { type: 'percent', value: Math.floor(Math.random() * 100) });
        return;
      }
      const cm = text.match(/^chapter\\s+(\\d{1,3})$/);
      if (cm && bareCurrentItem && bareCurrentItemIsMovie) {
        const seconds = await ccResolveChapterSeconds(bareCurrentItem.Id, parseInt(cm[1], 10), null, false);
        if (seconds !== null) await playMovieOnScreen(bareCurrentItem, false, { type: 'seconds', value: seconds });
        return;
      }
      if ((text === 'chapter random' || text === 'random chapter') && bareCurrentItem && bareCurrentItemIsMovie) {
        const seconds = await ccResolveChapterSeconds(bareCurrentItem.Id, null, null, true);
        if (seconds !== null) await playMovieOnScreen(bareCurrentItem, false, { type: 'seconds', value: seconds });
        return;
      }
      if (text === 'resume' && bareCurrentItem && bareCurrentItemIsMovie) {
        const seconds = await ccResolveResumeSeconds(bareCurrentItem.Id);
        if (seconds !== null) await playMovieOnScreen(bareCurrentItem, false, { type: 'seconds', value: seconds });
        return;
      }
      if (text === 'replay' && bareCurrentItem && bareCurrentItemIsMovie) {
        // Genuinely restarts from the true beginning now, rather than
        // assuming "already at the start" — that assumption broke the
        // moment THIS SAME movie could have been playing from a
        // resume/chapter/percent offset in the first place.
        await playMovieOnScreen(bareCurrentItem, false, null);
        return;
      }
      const effMatch = CC_EFFECT_WORDS[text];
      if (effMatch && bareCurrentItem) { ccTriggerEffectOnItem(bareCurrentItem, effMatch); return; }
      if ((text === 'random poster effect' || text === 'random effect' || text === 'random play effect' || text === 'play random effect') && bareCurrentItem) {
        const chosen = await ccResolveRandomEffect(bareCurrentItem);
        if (chosen) ccTriggerEffectOnItem(bareCurrentItem, chosen);
        return;
      }
    }
    // ---- General tokenized parser ----
    // FOR THE README — CONSOLE FILTER/SORT COMBINATION RULES (design
    // finalized in this session; documents the behavior for whoever
    // writes end-user-facing docs later, so this doesn't have to be
    // re-derived from the code):
    //
    // FILTERS (genre/year/tag/rating/feature/filter/videotype/studio/
    // person/collection) are NON-ADDITIVE across separate commands.
    // Typing "genre action" then, as a SEPARATE later command, "tag
    // christmas" does NOT combine into genre+tag together — the second
    // command replaces the filter state of the first outright, both in
    // the actual movie list AND in the Kiosk panel's own display
    // (they're always kept in exact 1:1 sync). To combine several
    // filters, type them together in ONE command: "genre action tag
    // christmas" sets both at once. For anything more layered than a
    // single typed command comfortably covers, use the Kiosk panel's
    // own filter UI directly instead — it has no such restriction.
    //
    // SORT (all six of Sort By/Sort Order/Sort Wall/Start Wall/Repeat
    // Mode/Gap Position) stays ADDITIVE, unchanged — a command that
    // sets one of these without repeating the others leaves whatever's
    // currently active for the rest untouched, exactly as before this
    // change. A command that mentions NO filter category at all (a
    // pure sort/wall command, e.g. "name descending" or "sort random")
    // also leaves every FILTER untouched — sort-only commands were
    // never meant to disturb filters in the first place.
    //
    // RANDOM is the one deliberate exception to "sort field = no
    // special meaning of its own": typing bare "random" is NOT treated
    // as a combinable sort field the way every other sort value is —
    // it's its own standalone action meaning "reset to the whole
    // library and pick something random", following the SAME
    // non-additive rule filters themselves now follow (whatever
    // filters were active from an earlier, separate command are
    // dropped). It still combines completely normally with filters
    // typed in the SAME command ("random genre action" correctly picks
    // randomly from Action movies, not the whole library). To make
    // "random" behave as a genuine, combinable SORT field instead —
    // additive with whatever's already active, exactly like "name" or
    // "runtime" — type "sort random" explicitly; the word "sort"
    // immediately before it is what opts into that different meaning.
    // This is the ONLY sort value where the word "sort" actually
    // changes behavior — for the other nine (name/community rating/
    // critics rating/date added/date played/parental rating/play
    // count/release date/runtime) and all Sort Wall/Start Wall/Repeat
    // Mode/Gap Position values, "sort"/"wall" are always purely
    // optional filler words with no effect either way.
    //
    // RESET is unaffected by any of this — "reset genre"/"reset tag
    // rating"/bare "reset" (full clear) all still work exactly as
    // before, and multiple categories can still be reset together in
    // one command.
    const tokens = text.split(' ');
    const state = {
      genresList: [], yearsList: [], tagsList: [], ratingsList: [], featuresList: [], filtersList: [], videoTypesList: [], studiosList: [],
      personQuery: '', collectionQuery: '',
      sortByField: null, sortOrderDir: null,
      wallLayout: null, wallStart: null, wallRepeat: null, wallGap: null,
      isRandom: false, randomWantsPage: false, wantsRandomEffect: false,
      sawReset: false, resetCategoriesTouched: [],
      effectWord: null, playFamily: null,
      percentValue: null, percentIsRandom: false,
      chapterNum: null, chapterName: null, chapterIsRandom: false,
      titleWords: [], titleYear: null, pendingCategoryValue: '',
    };
    let currentValueTarget = 'title';
    let sawAnySpecial = false;
    let i = 0;
    while (i < tokens.length) {
      const tok = tokens[i];
      if (/^\\d{1,3}%$/.test(tok)) { const v = parseInt(tok, 10); state.percentValue = v === 100 ? 99 : v; sawAnySpecial = true; i += 1; ccFlushPendingCategoryValue(state, currentValueTarget); currentValueTarget = 'title'; continue; }
      if (/^\\d{1,3}$/.test(tok) && (tokens[i + 1] === '%' || tokens[i + 1] === 'percent')) { const v = parseInt(tok, 10); state.percentValue = v === 100 ? 99 : v; sawAnySpecial = true; i += 2; ccFlushPendingCategoryValue(state, currentValueTarget); currentValueTarget = 'title'; continue; }
      if (tok === 'random%' || (tok === 'random' && (tokens[i + 1] === '%' || tokens[i + 1] === 'percent'))) { state.percentIsRandom = true; sawAnySpecial = true; i += (tok === 'random%' ? 1 : 2); continue; }
      if (tok === 'chapter') {
        i += 1; sawAnySpecial = true;
        if (tokens[i] === 'random') { state.chapterIsRandom = true; i += 1; }
        else if (/^\\d{1,3}$/.test(tokens[i] || '')) { state.chapterNum = parseInt(tokens[i], 10); i += 1; }
        else { ccFlushPendingCategoryValue(state, currentValueTarget); currentValueTarget = 'chaptername'; }
        continue;
      }
      // "sort random" is checked FIRST, ahead of every bare "random"
      // special case below — typing the word "sort" right before
      // "random" is the one deliberate way to make random behave as a
      // genuine, combinable sort field (additive with whatever filters
      // are already active, exactly like "name"/"runtime"/any other
      // sort field) instead of bare "random"'s own, DIFFERENT meaning
      // (see its own comment further down): a full reset to the whole
      // library. Mirrors the exact same flush/currentValueTarget reset
      // the general sortfield phrase-table match itself does.
      if (tok === 'sort' && tokens[i + 1] === 'random') { ccFlushPendingCategoryValue(state, currentValueTarget); currentValueTarget = 'title'; state.sortByField = 'Random'; sawAnySpecial = true; i += 2; continue; }
      if (tok === 'random' && tokens[i + 1] === 'chapter') { state.chapterIsRandom = true; sawAnySpecial = true; i += 2; continue; }
      if (tok === 'random' && tokens[i + 1] === 'poster' && tokens[i + 2] === 'effect') { state.wantsRandomEffect = true; state.isRandom = true; sawAnySpecial = true; i += 3; continue; }
      if (tok === 'random' && tokens[i + 1] === 'effect') { state.wantsRandomEffect = true; state.isRandom = true; sawAnySpecial = true; i += 2; continue; }
      if (tok === 'random' && tokens[i + 1] === 'page') { state.randomWantsPage = true; sawAnySpecial = true; i += 2; continue; }
      if (tok === 'page' && tokens[i + 1] === 'random') { state.randomWantsPage = true; sawAnySpecial = true; i += 2; continue; }
      // Bare "random" — deliberately NOT a combinable sort field the
      // way "sort random" is (see that check just above). Combines
      // normally with any filter ALSO typed in this same command
      // (random genre action -> random pick from Action movies, same
      // non-additive-filter treatment every other branch now gets) —
      // but with NOTHING else filter-related in the command, it's a
      // deliberate full reset to the whole library, not "keep whatever
      // was already active", the way a bare sort-only command like
      // "name descending" would. No special-casing actually needed for
      // that distinction in the random dispatch branch itself further
      // down — always reading state's own lists directly (never
      // falling back to multiSelectState) naturally produces exactly
      // this: whatever's in state IS this command's own filters,
      // empty or not.
      if (tok === 'random') { state.isRandom = true; sawAnySpecial = true; i += 1; continue; }
      if (tok === 'reset') {
        state.sawReset = true; sawAnySpecial = true; i += 1;
        if (tokens[i] === 'filters' || tokens[i] === 'filter') i += 1;
        continue;
      }
      if (tok === 'sort' || tok === 'wall') { sawAnySpecial = true; i += 1; continue; }
      if (tok === 'ascending') { state.sortOrderDir = 'Ascending'; sawAnySpecial = true; i += 1; continue; }
      if (tok === 'descending') { state.sortOrderDir = 'Descending'; sawAnySpecial = true; i += 1; continue; }
      // Two passes, deliberately: featureval/generalfilterval/videotypeval
      // only make sense right after their OWN category word (e.g.
      // "feature trailer") — but the same word can ALSO be a genuine
      // effect word ("matrix trailer") or other kind entirely. A single
      // pass would find whichever entry happens to sit first in the
      // table (insertion order) and, if its context doesn't apply,
      // simply give up rather than trying the OTHER valid meaning — so
      // the context-restricted kinds are tried first and only kept if
      // they actually fit; otherwise a second pass excludes them,
      // letting the real match (effect, sortfield, etc.) surface.
      let m = ccMatchAt(tokens, i, ['sortfield', 'sortwall', 'startwall', 'repeatmode', 'gapposition', 'filtercat', 'featureval', 'generalfilterval', 'videotypeval', 'effect', 'playfamily', 'collectionword']);
      if (m && m.entry.kind === 'featureval' && currentValueTarget !== 'feature') m = ccMatchAt(tokens, i, ['sortfield', 'sortwall', 'startwall', 'repeatmode', 'gapposition', 'filtercat', 'effect', 'playfamily', 'collectionword']);
      else if (m && m.entry.kind === 'generalfilterval' && currentValueTarget !== 'filtergeneral') m = ccMatchAt(tokens, i, ['sortfield', 'sortwall', 'startwall', 'repeatmode', 'gapposition', 'filtercat', 'effect', 'playfamily', 'collectionword']);
      else if (m && m.entry.kind === 'videotypeval' && currentValueTarget !== 'videotype') m = ccMatchAt(tokens, i, ['sortfield', 'sortwall', 'startwall', 'repeatmode', 'gapposition', 'filtercat', 'effect', 'playfamily', 'collectionword']);
      // A filtercat match for the exact SAME category currently being
      // accumulated (genre/tag/studio only — the three word-accumulating
      // categories) is suppressed here and falls through to plain word
      // accumulation instead — confirmed necessary directly: many real
      // studio names literally contain the word "studios" ("Marvel
      // Studios", "Universal Studios", "Walt Disney Studios"), which is
      // ALSO our own studio/studios category keyword. Without this, the
      // word "Studios" mid-name kept re-triggering category-switching
      // instead of being treated as part of the value, discarding
      // everything typed before it. Re-specifying a DIFFERENT category
      // mid-value (e.g. "studio a24 genre horror") is unaffected —
      // this only suppresses the exact same category repeating itself.
      else if (m && m.entry.kind === 'filtercat' && m.entry.value === currentValueTarget && (currentValueTarget === 'genre' || currentValueTarget === 'tag' || currentValueTarget === 'studio')) m = ccMatchAt(tokens, i, ['sortfield', 'sortwall', 'startwall', 'repeatmode', 'gapposition', 'featureval', 'generalfilterval', 'videotypeval', 'effect', 'playfamily', 'collectionword']);
      if (m) {
        const { entry, len } = m;
        if (entry.kind === 'sortfield') { state.sortByField = entry.value; sawAnySpecial = true; i += len; ccFlushPendingCategoryValue(state, currentValueTarget); currentValueTarget = 'title'; continue; }
        if (entry.kind === 'sortwall') { state.wallLayout = entry.value; sawAnySpecial = true; i += len; continue; }
        if (entry.kind === 'startwall') { state.wallStart = entry.value; sawAnySpecial = true; i += len; continue; }
        if (entry.kind === 'repeatmode') { state.wallRepeat = entry.value; sawAnySpecial = true; i += len; continue; }
        if (entry.kind === 'gapposition') { state.wallGap = entry.value; sawAnySpecial = true; i += len; continue; }
        if (entry.kind === 'filtercat') { ccFlushPendingCategoryValue(state, currentValueTarget); currentValueTarget = entry.value; sawAnySpecial = true; if (state.sawReset) state.resetCategoriesTouched.push(entry.value); i += len; continue; }
        if (entry.kind === 'featureval' && currentValueTarget === 'feature') { state.featuresList.push(entry.value); i += len; continue; }
        if (entry.kind === 'generalfilterval' && currentValueTarget === 'filtergeneral') { state.filtersList.push(entry.value); i += len; continue; }
        if (entry.kind === 'videotypeval' && currentValueTarget === 'videotype') { state.videoTypesList.push(entry.value); i += len; continue; }
        if (entry.kind === 'effect') { state.effectWord = entry.value; sawAnySpecial = true; i += len; ccFlushPendingCategoryValue(state, currentValueTarget); currentValueTarget = 'title'; continue; }
        if (entry.kind === 'playfamily') { state.playFamily = entry.value; sawAnySpecial = true; i += len; continue; }
        if (entry.kind === 'collectionword') { state.collectionQuery = state.titleWords.join(' ').trim(); state.titleWords = []; sawAnySpecial = true; i += len; ccFlushPendingCategoryValue(state, currentValueTarget); currentValueTarget = 'title'; continue; }
      }
      if (/^\\d{4}$/.test(tok) && currentValueTarget === 'year') { state.yearsList.push(tok); i += 1; continue; }
      if (/^\\d{4}$/.test(tok) && currentValueTarget === 'title' && !state.titleYear) { state.titleYear = tok; i += 1; continue; }
      // Comma-separated multi-value support for genre/tag/studio, added
      // so a genuinely multi-word name ("science fiction", "marvel
      // studios") and several separate single-word values ("action,
      // war") can both be typed unambiguously — words accumulate into
      // one pending value until a comma (ends the CURRENT value, stays
      // in the same category) or any other recognized boundary (another
      // filtercat keyword, a special token, or end of input — all
      // already handled by the continue statements above, which flush
      // first) ends the whole chain. tag/genre/studio share this exact
      // same accumulation logic; rating is deliberately excluded
      // (official ratings are always a single token — "R", "PG-13" — a
      // comma there would only ever be a typo).
      if (currentValueTarget === 'genre' || currentValueTarget === 'tag' || currentValueTarget === 'studio') {
        if (tok === ',' || tok.endsWith(',')) {
          const word = tok === ',' ? '' : tok.slice(0, -1);
          if (word) state.pendingCategoryValue = (state.pendingCategoryValue ? state.pendingCategoryValue + ' ' : '') + word;
          ccFlushPendingCategoryValue(state, currentValueTarget);
        } else {
          state.pendingCategoryValue = (state.pendingCategoryValue ? state.pendingCategoryValue + ' ' : '') + tok;
        }
        i += 1;
        continue;
      }
      if (currentValueTarget === 'rating') state.ratingsList.push(tok.toUpperCase());
      else if (currentValueTarget === 'person') state.personQuery = (state.personQuery ? state.personQuery + ' ' : '') + tok;
      else if (currentValueTarget === 'chaptername') state.chapterName = (state.chapterName ? state.chapterName + ' ' : '') + tok;
      else state.titleWords.push(tok);
      i += 1;
    }
    ccFlushPendingCategoryValue(state, currentValueTarget); // trailing value with nothing after it, e.g. "filter genre war"
    const titleText = state.titleWords.join(' ').trim();
    // ---- Person resolution (async, only if a person query was actually
    // captured) — moved ahead of the Collection branch below, which
    // previously always ran BEFORE this and could therefore never
    // combine with a newly-typed person filter at all ("collection X
    // person Y" silently dropped the person half). Now shared by every
    // branch that needs it, including Collection. ----
    let personId = null;
    if (state.personQuery) personId = await findPersonId(state.personQuery).catch(() => '');
    // ---- Collection: pure filter, no effect combination (doc's own rule) ----
    if (state.collectionQuery) {
      const collections = await jfGet('/Users/' + session.userId + '/Items', { IncludeItemTypes: 'BoxSet', Recursive: 'true', searchTerm: state.collectionQuery, Limit: '5' }).catch(() => ({ Items: [] }));
      const col = (collections.Items || [])[0];
      if (col) {
        // Non-additive now (see this whole dispatch's own top-level
        // design note) — every filter category reads straight from
        // state, never falling back to multiSelectState, since setting
        // a collection is itself a filter-changing command and clears
        // everything not ALSO mentioned in this same command. Sort
        // stays additive, reading the live dropdown values when not
        // set here, same as it always has.
        const currentWallForCollection = ccCurrentWallOpts();
        const opts = Object.assign({
          sort: (state.sortByField || document.getElementById('sortSelect').value) + ':' + (state.sortOrderDir || document.getElementById('sortDirSelect').value),
          genresList: state.genresList,
          ratingsList: state.ratingsList,
          tagsList: state.tagsList,
          yearsList: state.yearsList,
          filtersList: state.filtersList,
          featuresList: state.featuresList,
          videoTypesList: state.videoTypesList,
          studiosList: state.studiosList,
          collectionIdsList: [col.Id],
          personId: personId || undefined,
          layout: state.wallLayout || currentWallForCollection.layout, startWall: state.wallStart || currentWallForCollection.startWall, repeatMode: state.wallRepeat || currentWallForCollection.repeatMode, gapPosition: state.wallGap || currentWallForCollection.gapPosition,
        }, {});
        if (!personId) { document.getElementById('actorInput').value = ''; acSelectedPersonId = ''; }
        await ccApplyFilterReload(opts, { kind: personId ? 'person' : undefined });
      }
      return;
    }
    // ---- Reset filters: bare/no-category-mentioned = full clear; any
    // category mentioned during the reset tail = partial (only those
    // categories/values touched, everything else on the wall untouched) ----
    if (state.sawReset) {
      if (!state.resetCategoriesTouched.length) {
        // Mirrors panelResetAll's own click handler (which correctly
        // clears multiSelectState directly, not via opts) rather than
        // relying on applySmartLaunchToKioskUi's opts-based sync the
        // way every other branch does — that sync only ever fires per
        // field when opts.THAT_FIELD is present at all (even an empty
        // array counts), and a full reset's own opts here intentionally
        // carries none of these fields, so every one of those sync
        // conditions would silently never fire. Confirmed directly: a
        // bare "reset" correctly cleared the actual movie list (opts
        // omits every filter, so the query itself was always right),
        // but left the Kiosk panel still showing the previous filters
        // as active — a display-only mismatch, not a data loss, but a
        // mismatch all the same.
        PANEL_FILTER_MS_KEYS.forEach((key) => { multiSelectState[key] = []; });
        document.getElementById('actorInput').value = '';
        acSelectedPersonId = '';
        const opts = Object.assign({ sort: document.getElementById('sortSelect').value + ':' + document.getElementById('sortDirSelect').value }, ccCurrentWallOpts());
        await ccApplyFilterReload(opts, {});
        return;
      }
      const CC_RESET_KEY_BY_CAT = { genre: 'Genres', year: 'Years', tag: 'Tags', rating: 'OfficialRatings', feature: 'Features', filtergeneral: 'Filters', videotype: 'VideoTypes', studio: 'Studios' };
      // videotype needs its stored SHORT CODE (VIDEOTYPE_OPTIONS' own
      // "value", e.g. "hd"/"bluray") to match what multiSelectState.VideoTypes
      // actually holds — state.videoTypesList itself only carries the
      // {param, paramValue} pair (several typed aliases like bd/bluray/
      // blu-ray all collapse to the SAME pair), so it's mapped back here
      // via VIDEOTYPE_OPTIONS rather than compared directly.
      const videoTypeShortCodesToRemove = state.videoTypesList.map((vt) => {
        const opt = VIDEOTYPE_OPTIONS.find((o) => o.param === vt.param && o.paramValue === vt.paramValue);
        return opt ? opt.value : null;
      }).filter(Boolean);
      const CC_RESET_LIST_BY_CAT = { genre: state.genresList, year: state.yearsList, tag: state.tagsList, rating: state.ratingsList, feature: state.featuresList, filtergeneral: state.filtersList, videotype: videoTypeShortCodesToRemove, studio: state.studiosList };
      const touchedUnique = Array.from(new Set(state.resetCategoriesTouched));
      touchedUnique.forEach((cat) => {
        if (cat === 'person') { document.getElementById('actorInput').value = ''; acSelectedPersonId = ''; return; }
        const key = CC_RESET_KEY_BY_CAT[cat];
        if (!key) return;
        const valuesToRemove = CC_RESET_LIST_BY_CAT[cat];
        if (!valuesToRemove || !valuesToRemove.length) { multiSelectState[key] = []; return; } // category mentioned, no specific value = clear whole category
        const valuesToRemoveLower = valuesToRemove.map((v) => String(v).toLowerCase());
        multiSelectState[key] = (multiSelectState[key] || []).filter((v) => !valuesToRemoveLower.includes(String(v).toLowerCase()));
      });
      // collectionIdsList still included unconditionally here — unlike
      // studio (now a real resettable category via the loop above, same
      // as genre/tag/etc), collection has no "reset collection" keyword
      // at all (it's set via its own dedicated branch further below,
      // never resettable piecemeal the same way) — so its multiSelectState
      // value is never touched by the loop above and must be passed
      // through as-is, exactly like sort/wall settings are.
      const opts = Object.assign({
        sort: document.getElementById('sortSelect').value + ':' + document.getElementById('sortDirSelect').value,
        genresList: multiSelectState.Genres, ratingsList: multiSelectState.OfficialRatings, tagsList: multiSelectState.Tags, yearsList: multiSelectState.Years,
        filtersList: multiSelectState.Filters, featuresList: multiSelectState.Features,
        videoTypesList: VIDEOTYPE_OPTIONS.filter((o) => multiSelectState.VideoTypes.includes(o.value)),
        collectionIdsList: multiSelectState.Collections,
        studiosList: multiSelectState.Studios,
        personId: acSelectedPersonId || undefined,
      }, ccCurrentWallOpts());
      await ccApplyFilterReload(opts, {});
      return;
    }
    // ---- Random movie selection (Punkt 6): filter/person allowed, sort forced to Random ----
    if (state.isRandom && !titleText) {
      const currentWallForRandom = ccCurrentWallOpts();
      // Fully non-additive now (see this whole dispatch's own top-level
      // design note) — bare "random" is a deliberate full reset to the
      // whole library, not "keep whatever filters were already active".
      // Reading state's own lists directly, always, with no fallback to
      // multiSelectState, naturally covers both halves of that at once:
      // "random genre action" (state.genresList has entries this same
      // command) correctly narrows to Action movies, while bare
      // "random" alone (every state list empty) correctly clears back
      // to nothing filtered at all — the SAME code path, no extra
      // branching needed for the distinction.
      const opts = Object.assign({
        sort: 'Random:Ascending',
        genresList: state.genresList,
        ratingsList: state.ratingsList,
        tagsList: state.tagsList,
        yearsList: state.yearsList,
        filtersList: state.filtersList,
        featuresList: state.featuresList,
        videoTypesList: state.videoTypesList,
        collectionIdsList: [],
        studiosList: state.studiosList,
        personId: personId || undefined,
        layout: state.wallLayout || currentWallForRandom.layout, startWall: state.wallStart || currentWallForRandom.startWall, repeatMode: state.wallRepeat || currentWallForRandom.repeatMode, gapPosition: state.wallGap || currentWallForRandom.gapPosition,
      }, {});
      if (!personId) { document.getElementById('actorInput').value = ''; acSelectedPersonId = ''; }
      if (state.randomWantsPage) {
        // Direct jump to a random page's own start bounds — reuses the
        // exact same pageSize/bounds math stepPosterPage itself uses,
        // but computes an arbitrary target directly rather than
        // stepping one page at a time (stepPosterPage's own dir is
        // always ±1, not built for a direct jump).
        if (lastLoadedMovies.length && !pageChangeActive && !roomAnimActive) {
          const pageSize = slotsForDepth(ROOM_DEPTH);
          if (pageSize) {
            const totalLen = lastLoadedMovies.length;
            const pageCount = Math.max(1, Math.ceil(totalLen / pageSize));
            const randomPageIdx = Math.floor(Math.random() * pageCount);
            const bounds = getPosterPageBounds(randomPageIdx * pageSize, pageSize, totalLen);
            posterPageStartIndex = bounds.start;
            switchPosterPage(lastLoadedMovies.slice(bounds.start, bounds.end));
          }
        }
        return;
      }
      await ccApplyFilterReload(opts, { kind: personId ? 'person' : undefined });
      if (state.effectWord || state.wantsRandomEffect || state.percentValue !== null || state.percentIsRandom || state.chapterNum !== null || state.chapterName || state.chapterIsRandom || state.playFamily) {
        const item = (lastLoadedMovies || [])[0];
        if (item) {
          let effectToUse = state.effectWord;
          if (state.wantsRandomEffect) effectToUse = await ccResolveRandomEffect(item);
          if (!effectToUse && state.playFamily) effectToUse = 'movie';
          if (effectToUse === 'movie') await ccPlayMovieWithSeekIntent(item, state);
          else if (effectToUse) await ccTriggerEffectOnItem(item, effectToUse);
          // Percent/chapter/resume/replay are documented as movie-only
          // (planning doc section 9) — no ccApplyPositionFamily call for
          // any OTHER effect (trailer/themevideo/...) here, matching
          // that; applying a movie's own chapter timestamps to whatever
          // non-movie content just started playing wouldn't mean
          // anything coherent anyway.
        }
      }
      return;
    }
    // ---- Plain filter/sort (no random, no title): Punkt 3/4 ----
    if (!titleText && (sawAnySpecial || state.genresList.length || state.yearsList.length || state.tagsList.length || state.ratingsList.length || state.featuresList.length || state.filtersList.length || state.videoTypesList.length || state.studiosList.length || personId)) {
      const currentWallForFilter = ccCurrentWallOpts();
      // NON-ADDITIVE CONSOLE FILTERS (design change): a command either
      // mentions at least one filter category (genre/year/tag/rating/
      // feature/filter/videotype/studio/person — collection has its
      // own dedicated branch above and counts there instead) or it
      // doesn't. If it DOES, every filter category reads straight from
      // state — even the ones this SPECIFIC command didn't mention,
      // which come out as an empty array/undefined and correctly CLEAR
      // that category rather than preserving it. "genre action" then
      // "tag christmas" no longer combines into genre+tag together —
      // the second command replaces the first outright, matching the
      // console's own new "type everything you want active in ONE
      // command, or use the Kiosk panel for anything more layered"
      // design. If the command has NO filter category at all — a pure
      // sort/wall command like "name descending" or "sort random" —
      // every filter category instead falls back to whatever's
      // currently active (multiSelectState), exactly as before,
      // because a sort-only command was never meant to touch filters
      // in the first place. Sort itself (all six of its own
      // categories — By/Order/Wall/StartWall/Repeat/Gap) is UNCHANGED
      // by any of this and stays additive either way, always falling
      // back to the live dropdown/current-wall values when not set by
      // this command — random becoming a filter-like category (see
      // "sort random" vs bare "random" above) never touches sort's own
      // additive behavior.
      const hasAnyFilterWord = state.genresList.length || state.yearsList.length || state.tagsList.length || state.ratingsList.length || state.featuresList.length || state.filtersList.length || state.videoTypesList.length || state.studiosList.length || state.personQuery;
      const opts = Object.assign({
        sort: (state.sortByField || document.getElementById('sortSelect').value) + ':' + (state.sortOrderDir || document.getElementById('sortDirSelect').value),
        genresList: hasAnyFilterWord ? state.genresList : multiSelectState.Genres,
        ratingsList: hasAnyFilterWord ? state.ratingsList : multiSelectState.OfficialRatings,
        tagsList: hasAnyFilterWord ? state.tagsList : multiSelectState.Tags,
        yearsList: hasAnyFilterWord ? state.yearsList : multiSelectState.Years,
        filtersList: hasAnyFilterWord ? state.filtersList : multiSelectState.Filters,
        featuresList: hasAnyFilterWord ? state.featuresList : multiSelectState.Features,
        videoTypesList: hasAnyFilterWord ? state.videoTypesList : VIDEOTYPE_OPTIONS.filter((o) => multiSelectState.VideoTypes.includes(o.value)),
        collectionIdsList: hasAnyFilterWord ? [] : multiSelectState.Collections,
        studiosList: hasAnyFilterWord ? state.studiosList : multiSelectState.Studios,
        personId: hasAnyFilterWord ? (personId || undefined) : (personId || acSelectedPersonId || undefined),
        layout: state.wallLayout || currentWallForFilter.layout, startWall: state.wallStart || currentWallForFilter.startWall, repeatMode: state.wallRepeat || currentWallForFilter.repeatMode, gapPosition: state.wallGap || currentWallForFilter.gapPosition,
      }, {});
      if (hasAnyFilterWord && !personId) { document.getElementById('actorInput').value = ''; acSelectedPersonId = ''; }
      await ccApplyFilterReload(opts, { kind: (personId || (!hasAnyFilterWord && acSelectedPersonId)) ? 'person' : undefined });
      return;
    }
    // ---- Title search (Punkt 10), with optional effect/percent/chapter/resume/replay ----
    if (titleText) {
      const matched = await ccFindMovieMatch(titleText, state.titleYear).catch(() => null);
      const movieId = matched ? matched.Id : '';
      if (!movieId) return; // no unique match — silent no-op, matches doc's own rule
      const opts = Object.assign({ sort: document.getElementById('sortSelect').value + ':' + document.getElementById('sortDirSelect').value }, ccCurrentWallOpts());
      let movies;
      try { movies = await fetchMovies(opts, updateLoadProgress); } catch (err) { movies = []; }
      updateLoadProgress(0, 0);
      if (!movies.length) return;
      const movieIndex = movies.findIndex((m) => m.Id === movieId);
      moviePageStartOverride = movieIndex >= 0 ? movieIndex : 0;
      movieSearchHighlightId = movieId;
      // ccApplyFilterReload's OWN internal housekeeping unconditionally
      // clears movieInput/acSelectedMovieId (correct for its OTHER
      // callers — filter/random/reset all want a stale movie selection
      // wiped) — but here we WANT to populate exactly that field, so it
      // must run AFTER the reload settles, not before, or the reload's
      // own clear immediately erases what we just set. The movies list
      // just fetched above is passed straight through via
      // __preloadedMovies too, so the reload's own loadMovies() call
      // reuses it instead of fetching the exact same thing a second
      // time.
      opts.__preloadedMovies = movies;
      await ccApplyFilterReload(opts, {});
      const movieInputEl2 = document.getElementById('movieInput');
      if (movieInputEl2) { movieInputEl2.value = matched.Name; acSelectedMovieId = movieId; }
      updateFilterMovieExclusion('movie');
      const item = movies[movieIndex >= 0 ? movieIndex : 0];
      let effectToUse = state.effectWord;
      if (!effectToUse && state.playFamily) effectToUse = 'movie';
      if (effectToUse === 'movie') {
        await ccPlayMovieWithSeekIntent(item, state);
      } else if (effectToUse) {
        await ccTriggerEffectOnItem(item, effectToUse);
        // Percent/chapter/resume/replay are documented as movie-only —
        // see the random-dispatch path's own identical comment above.
      }
      return;
    }
    // Nothing recognized at all — intentional no-op (doc's own rule).
  }
  document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === renderer.domElement;
    if (isLocked && (pendingPrimaryAction || pendingSecondaryAction)) {
      const doPrimary = pendingPrimaryAction;
      const doSecondary = pendingSecondaryAction;
      const isFresh = (nowMs() - pendingActionTimestamp) < PENDING_ACTION_MAX_AGE_MS;
      pendingPrimaryAction = false;
      pendingSecondaryAction = false;
      if (isFresh) {
        if (doPrimary) primaryAction(false);
        else if (doSecondary) secondaryAction();
      }
    }
    if (!isLocked && panelEl.style.display !== 'block') {
      instructionsEl.innerHTML = baseInstructions();
      tooltipEl.style.display = 'none';
    }
  });
  document.addEventListener('mousemove', (e) => {
    if (!isLocked) return;
    // Chrome's own Pointer Lock implementation has a long-documented,
    // still-unfixed bug (three.js issue #12757, and others) where it
    // occasionally dispatches a mousemove with a spurious, wildly wrong
    // movementX/movementY — commonly in the 300-400px range — with NO
    // actual physical mouse movement behind it at all. A single such
    // event landing right as someone clicks a context-menu button spins
    // the camera away from the target BEFORE primaryAction's own raycast
    // runs, which reads as exactly the reported symptom: the click is
    // always genuinely registered (the menu always closes, one way or
    // another — see primaryAction's own hit/miss branches), but the
    // raycast that decides WHICH button was clicked sometimes answers
    // wrong, or -1, for a click that was actually aimed correctly.
    // Genuine mouse movement, even a fast deliberate flick, essentially
    // never produces a single event anywhere near this large regardless
    // of DPI/polling rate — 150px is comfortably above real movement and
    // comfortably below the bug's own observed range, so this rejects
    // the spurious jump outright rather than applying it to the camera,
    // instead of trying to compensate for it after the fact.
    const MAX_PLAUSIBLE_MOUSE_DELTA = 150;
    if (Math.abs(e.movementX) > MAX_PLAUSIBLE_MOUSE_DELTA || Math.abs(e.movementY) > MAX_PLAUSIBLE_MOUSE_DELTA) return;
    camera.rotation.y -= e.movementX * MOUSE_SENSITIVITY;
    camera.rotation.x -= e.movementY * MOUSE_SENSITIVITY;
    camera.rotation.x = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, camera.rotation.x));
  });
  // Mouse wheel — Poster Page switching. Handles both notched wheels
  // (one deltaY per detent, typically ~100-162 depending on browser/OS)
  // and free-spinning ones (many small deltaY events per physical
  // rotation) with the same accumulate-then-fire approach Microsoft's
  // own WPF docs recommend for exactly this kind of device variance:
  // add incoming deltas together until a chosen threshold is crossed,
  // THEN act — rather than reacting to every single event, which would
  // fire many times per spin on a free wheel but feels right on a
  // notched one.
  //
  // Deliberately NOT a plain time-based debounce ("ignore events for
  // Xms after the last one") — Swiper.js hit a real bug with exactly
  // that approach: a continuous fast scroll keeps resetting the debounce
  // timer with every new event, so it can NEVER actually elapse while
  // scrolling continues, and the slider gets stuck not reacting at all
  // until the person stops entirely. The lock here instead follows the
  // ACTION (pageChangeActive, set by switchPosterPage, cleared once its
  // own fade genuinely finishes) — a fast continuous scroll just keeps
  // accumulating into wheelPageAccum harmlessly while a page switch is
  // still settling, rather than fighting a timer that never expires.
  let wheelPageAccum = 0;
  let wheelPageLastEventAt = 0;
  // Raised from an earlier, too-low 100 — one typical notched-wheel
  // click alone (commonly 100-162, per researched deltaY conventions)
  // was already enough to fire immediately, which read as "too
  // sensitive". ~2 typical clicks' worth now, so a single click no
  // longer fires on its own — a bit more deliberate turning is needed,
  // matching the request for a less hair-trigger feel.
  const WHEEL_POSTER_PAGE_THRESHOLD = 280;
  // A genuine deadzone — distinct from the threshold above. Individual
  // events below this are dropped entirely, not even accumulated,
  // filtering out the barely-there signals a very light touch or a
  // slightly-too-sensitive wheel can send, which the accumulate-only
  // approach used to still count toward the threshold eventually.
  const WHEEL_POSTER_PAGE_DEADZONE = 8;
  const WHEEL_POSTER_PAGE_IDLE_RESET_MS = 500; // a silent gap this long starts a fresh accumulation, so two separate weak nudges don't add up into an unexpected trigger
  document.addEventListener('wheel', (e) => {
    if (!isLocked) return;
    const now = nowMs();
    if (now - wheelPageLastEventAt > WHEEL_POSTER_PAGE_IDLE_RESET_MS) wheelPageAccum = 0;
    wheelPageLastEventAt = now;
    if (pageChangeActive) return; // still accepted as "the gesture continues", just not accumulated while a switch is already in flight
    if (Math.abs(e.deltaY) < WHEEL_POSTER_PAGE_DEADZONE) return;
    wheelPageAccum += e.deltaY;
    if (Math.abs(wheelPageAccum) >= WHEEL_POSTER_PAGE_THRESHOLD) {
      stepPosterPage(wheelPageAccum > 0 ? 1 : -1);
      wheelPageAccum = 0;
    }
  }, { passive: true });
  const move = { forward: false, back: false, left: false, right: false, sprint: false };
  const EYE_HEIGHT = 1.7, GRAVITY = 18, JUMP_SPEED = 6.2, CROUCH_OFFSET = 0.5;
  const MAX_LOOK_SPEED = 12.0;
  let verticalVelocity = 0, isGrounded = true;
  let isCrouching = false, crouchLevel = 0;
  let keyboardCrouch = false, gamepadCrouch = false, toggleCrouchActive = false;
  let suppressGamepadCrouch = false;
  let justConfirmedTextField = false;
  function handleOverlayKeyboard(rows, closeFn, e) {
    if (msOpenFieldId) {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { moveMsNav(-kbDropStep(e), !e.repeat); e.preventDefault(); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { moveMsNav(kbDropStep(e), !e.repeat); e.preventDefault(); }
      else if (e.code === 'Enter' || e.code === 'KeyE') {
        if (msNavIndex === 0) { resetMsField(); }
        else {
          const opts = MULTI_SELECT_FIELDS[msOpenFieldId].getOptions();
          if (opts[msNavIndex - 1]) toggleMsOption(opts[msNavIndex - 1].value);
        }
      } else if (e.code === 'Escape') { closeMsDropdown(); navEditing = false; }
      return;
    }
    if (rows === panelRows && e.code === 'KeyK') { closeFn(); requestPointerLockDeferred(); return; }
    if (navEditing) {
      const row = rows[navFocusIndex];
      const el = document.getElementById(row.id);
      if (row.type === 'number') {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          const minV = el.min !== '' ? +el.min : -Infinity;
          el.value = Math.max(minV, +el.value + (+el.step || 1));
          el.dispatchEvent(new Event('input'));
          e.preventDefault();
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          const minV = el.min !== '' ? +el.min : -Infinity;
          el.value = Math.max(minV, +el.value - (+el.step || 1));
          el.dispatchEvent(new Event('input'));
          e.preventDefault();
        } else if (e.code === 'Enter' || e.code === 'KeyE' || e.code === 'Escape') {
          navEditing = false;
          el.classList.remove('gp-editing');
          // Commit via 'change' so keyboard/controller adjustments run the
          // same save + immediate-rebuild path as typed values — without
          // this the adjusted value was visible but never saved or applied.
          el.dispatchEvent(new Event('change'));
        }
        return;
      }
      if (row.type === 'slider') {
        // Horizontal control only — a slider is a horizontal thing;
        // vertical input stays reserved for list navigation.
        const adj = (d) => { el.value = Math.max(+el.min, Math.min(+el.max, +el.value + d)); el.dispatchEvent(new Event('input')); };
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') { adj(-1); e.preventDefault(); }
        else if (e.code === 'ArrowRight' || e.code === 'KeyD') { adj(1); e.preventDefault(); }
        else if (e.code === 'Enter' || e.code === 'KeyE' || e.code === 'Escape') { navEditing = false; el.classList.remove('gp-editing'); el.dispatchEvent(new Event('change')); }
        return;
      }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { moveGpDropdown(el, -kbDropStep(e), !e.repeat); e.preventDefault(); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { moveGpDropdown(el, kbDropStep(e), !e.repeat); e.preventDefault(); }
      else if (e.code === 'Enter' || e.code === 'KeyE') { navEditing = false; closeGpDropdown(); el.dispatchEvent(new Event('change')); }
      else if (e.code === 'Escape') { navEditing = false; el.selectedIndex = gpDropdownOriginalIndex; closeGpDropdown(); }
      return;
    }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { const edge = navMoveFocus(rows, -1, !e.repeat); updateNavFocusVisual(rows, edge); e.preventDefault(); }
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') { const edge = navMoveFocus(rows, 1, !e.repeat); updateNavFocusVisual(rows, edge); e.preventDefault(); }
    else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'KeyD') {
      const row = rows[navFocusIndex];
      const isLeft = e.code === 'ArrowLeft' || e.code === 'KeyA';
      if (row.type === 'buttonRow') { navButtonRowFocus = isLeft ? 0 : 1; updateNavFocusVisual(rows); }
      else if (rows === menuRows) {
        // Tabbed menu: outside edit mode, left/right switches tabs.
        // Sliders are adjusted only after explicitly entering them
        // (Enter/E), exactly like number fields — one rule everywhere,
        // no accidental value changes while browsing.
        stepMenuTab(isLeft ? -1 : 1);
      } else if (row.type === 'slider') {
        const el = document.getElementById(row.id);
        const dir = isLeft ? -1 : 1;
        el.value = Math.max(+el.min, Math.min(+el.max, +el.value + dir));
        el.dispatchEvent(new Event('input'));
      }
      e.preventDefault();
    } else if (e.code === 'Enter' || e.code === 'KeyE') {
      if (justConfirmedTextField) {
        justConfirmedTextField = false;
        const applyBtn = document.getElementById('panelApply');
        if (applyBtn) applyBtn.click();
        return;
      }
      const row = rows[navFocusIndex];
      const el = document.getElementById(row.id);
      if (row.type === 'select') { navEditing = true; openGpDropdown(el); }
      else if (row.type === 'multiselect') { navEditing = true; openMsDropdown(row.id); }
      else if (row.type === 'number' || row.type === 'slider') { navEditing = true; el.classList.add('gp-editing'); }
      else if (row.type === 'text') el.focus();
      else if (row.type === 'checkbox') { el.checked = !el.checked; el.dispatchEvent(new Event('change')); }
      else if (row.type === 'button') el.click();
      else if (row.type === 'buttonRow') document.getElementById(row.ids[navButtonRowFocus]).click();
    } else if (e.code === 'Escape') {
      closeFn();
    }
  }
  document.addEventListener('keydown', (e) => {
    if (confirmDialogEl.style.display === 'block') {
      if (e.code === 'Escape') hideConfirmDialog();
      else if (e.code === 'Enter' || e.code === 'KeyE') { const action = confirmDialogAction; hideConfirmDialog(); if (action) action(); }
      return;
    }
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.id === 'actorInput' || activeEl.id === 'movieInput' || activeEl.id === 'backdropSecondsInput' || activeEl.id === 'backdropMovieMinInput' || activeEl.id === 'backdropMovieMaxInput' || activeEl.id === 'cinemaConsoleInput');
    if (isTyping && activeEl.id === 'cinemaConsoleInput') {
      // Deliberately separate from the generic isTyping branch below —
      // that one only ever calls activeEl.blur() on Enter (fine for a
      // plain text field meant to be confirmed once), never executes
      // anything or re-requests pointer lock. Our console needs both,
      // so it gets its own handling here, checked first.
      if (e.code === 'Enter') {
        executeCinemaConsoleCommand(cinemaConsoleInputEl.value);
        deactivateCinemaConsole();
      } else {
        resetCinemaConsoleIdleTimer();
        // Let the native input handle the actual character (typing,
        // Backspace, arrow-key caret movement, etc.) — nothing else to
        // do here beyond feeding the idle timer on every keystroke.
      }
      return;
    }
    if (isTyping) {
      const isActorField = activeEl.id === 'actorInput';
      const isMovieField = activeEl.id === 'movieInput';
      const isAutocompleteField = isActorField || isMovieField;
      if (isAutocompleteField && e.code === 'ArrowDown' && acOpen) { acMoveNav(1); e.preventDefault(); return; }
      if (isAutocompleteField && e.code === 'ArrowUp' && acOpen) { acMoveNav(-1); e.preventDefault(); return; }
      if (e.code === 'Enter') {
        if (isAutocompleteField && acOpen) { acSelect(); return; }
        activeEl.blur();
        if (isAutocompleteField) justConfirmedTextField = true;
      } else if (e.code === 'Escape') {
        if (isAutocompleteField && acOpen) { acClose(); return; }
        activeEl.blur();
      }
      return;
    }
    if (panelEl.style.display === 'block') { handleOverlayKeyboard(panelRows, closePanel, e); return; }
    if (menuOverlayEl.style.display === 'flex') {
      if (e.code === 'KeyC') { toggleControlsOverlay(); return; }
      if (e.code === 'KeyM') { closeMenuOverlay(); requestPointerLockDeferred(); return; }
      handleOverlayKeyboard(menuRows, closeMenuOverlay, e);
      return;
    }
    if (controlsOverlayEl.style.display === 'block') {
      if (e.code === 'KeyM') { toggleMenuOverlay(); return; }
      if (e.code === 'KeyC') {
        controlsOverlayEl.style.display = 'none';
        requestPointerLockDeferred();
        instructionsEl.innerHTML = baseInstructions();
        return;
      }
      if (e.code === 'Escape') {
        controlsOverlayEl.style.display = 'none';
        instructionsEl.innerHTML = baseInstructions();
        return;
      }
      return;
    }
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': move.forward = true; break;
      case 'KeyS': case 'ArrowDown': move.back = true; break;
      case 'KeyA': case 'ArrowLeft': move.left = true; break;
      case 'KeyD': case 'ArrowRight': move.right = true; break;
      case 'ShiftLeft': case 'ShiftRight': move.sprint = true; break;
      case 'ControlLeft': case 'ControlRight':
        if (crouchMode === 'toggle') { if (!e.repeat) toggleCrouchActive = !toggleCrouchActive; }
        else keyboardCrouch = true;
        break;
      case 'Backspace':
        // Ambient Mode's own timers/async chain (ambientRunning, the
        // pending step-advance timer) live entirely OUTSIDE
        // stopAllPlayback's own reach — calling only that left Ambient
        // running unattended in the background, silently able to
        // resurface moments after Backspace was pressed once its
        // already-scheduled next step fired. stopAmbientMode() is a
        // no-op when nothing's running (safe to always call), and
        // itself calls stopAllPlayback() as its own last step — but
        // stopAllPlayback() is ALSO called directly here regardless, so
        // the plain non-Ambient case (nothing running in Ambient at
        // all) still gets its usual full stop even though
        // stopAmbientMode() did nothing for it.
        stopAmbientMode();
        stopAllPlayback();
        e.preventDefault();
        break;
      case 'KeyE':
        if (isLocked) primaryAction(false);
        break;
      case 'Enter':
        if (isLocked) primaryAction(true);
        break;
      case 'KeyC':
        toggleControlsOverlay();
        break;
      case 'KeyM':
        toggleMenuOverlay();
        break;
      case 'KeyF':
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
        break;
      case 'KeyK':
        openPanel();
        break;
      case 'Escape':
        if (contextMenuOpen) {
          closeContextMenu();
        } else if (contextMenuOpening) {
          contextMenuRequestId++;
          contextMenuOpening = false;
        }
        break;
      case 'Space':
        if (!e.repeat && jumpEnabled && isGrounded) { verticalVelocity = JUMP_SPEED; isGrounded = false; }
        e.preventDefault();
        break;
      // 'Slash'/'BracketRight' added as extra alternates alongside the
      // ANSI-standard 'Minus'/'Equal' — confirmed against a real keyboard
      // where -/+ physically sit at those OTHER positions instead
      // (logged via a live e.code/e.key probe: '-' produced code
      // 'Slash', '+' produced code 'BracketRight'). e.code reports the
      // PHYSICAL key regardless of the OS's active layout, by design —
      // it's the right thing to check here, but that only helps when
      // -/+ actually sit at the ANSI-standard positions to begin with;
      // this specific layout genuinely puts them somewhere else
      // entirely, not just relabeled. Both codes were confirmed unused
      // anywhere else in this file first — no ambiguity with some other
      // shortcut on a layout where they'd mean something different.
      case 'Minus': case 'NumpadSubtract': case 'Slash':
        stepRoomSize(-1);
        break;
      case 'Equal': case 'NumpadAdd': case 'BracketRight':
        stepRoomSize(1);
        break;
      case 'Comma': case 'PageUp':
        stepPosterPage(-1);
        break;
      case 'Period': case 'PageDown':
        stepPosterPage(1);
        break;
    }
  });
  document.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': move.forward = false; break;
      case 'KeyS': case 'ArrowDown': move.back = false; break;
      case 'KeyA': case 'ArrowLeft': move.left = false; break;
      case 'KeyD': case 'ArrowRight': move.right = false; break;
      case 'ShiftLeft': case 'ShiftRight': move.sprint = false; break;
      case 'ControlLeft': case 'ControlRight': if (crouchMode !== 'toggle') keyboardCrouch = false; break;
    }
  });
  let clickablePosters = [];
  let lastLoadedMovies = [], lastLoadedOpts = {};
  const POSTER_SPACING = 2.6;
  function updatePosterWallPositions() {
    // Every existing poster's X (width) and Z (depth) tracked live from
    // its own stored slot info — works for any layout mode, since the
    // formula mirrors placePosters' own zForSlot exactly. Posters
    // currently materializing in or despawning (see below) are excluded
    // here; their own tween owns position for the duration.
    postersGroup.children.forEach((group) => {
      const u = group.userData;
      if (!u || u.__wallSide === undefined || u.__chainKind) return;
      const wallX = room.ROOM_WIDTH / 2 - 0.09;
      const startZ = -room.ROOM_DEPTH / 2 + 8, endZ = room.ROOM_DEPTH / 2 - 2;
      group.position.x = u.__wallSide * wallX;
      group.position.z = u.__useBackwall ? (endZ - u.__localSlot * POSTER_SPACING) : (startZ + u.__localSlot * POSTER_SPACING);
    });
  }
  // ---- Poster count follows room depth during a resize ("Versuch A") ----
  // At animation start, the REAL target-size poster layout is computed
  // immediately (real content, no placeholders). Slots that already
  // existed keep their current movie undisturbed and simply glide to
  // their new live position via updatePosterWallPositions above. Slots
  // that are genuinely NEW spawn as a real, already-loaded poster at the
  // position of an existing neighbor and tween to their own live target
  // over the same duration as the wall — visually "duplicating and
  // sliding into place". Slots that no longer fit when shrinking tween
  // the other way (toward a surviving neighbor) and are removed once the
  // animation completes. Scope: fully general across layout modes, since
  // it reuses placePosters' own assignment logic rather than reimplementing it.
  function slotLivePos(side, localSlot, useBackwall) {
    // Same formula placePosters itself uses for a slot's position, but
    // evaluated fresh against the CURRENT (possibly mid-animation) room
    // dimensions — a pure function of numbers, no mesh needed.
    const wallX = room.ROOM_WIDTH / 2 - 0.09;
    const startZ = -room.ROOM_DEPTH / 2 + 8, endZ = room.ROOM_DEPTH / 2 - 2;
    return { x: side * wallX, z: useBackwall ? (endZ - localSlot * POSTER_SPACING) : (startZ + localSlot * POSTER_SPACING) };
  }
  function makeGroupFadeable(g) {
    // frameMat is SHARED across every poster built in the same
    // placePosters call — fading it in-place would fade every other
    // poster's frame too. Clone it just for this one materializing group
    // so its opacity can move independently.
    const origBeamMat = g.userData.__lightEntry ? g.userData.__lightEntry.mat : null;
    const origFixtureMat = g.userData.__lightEntry ? g.userData.__lightEntry.fixtureMat : null;
    g.children.forEach((child) => {
      if (child.material) {
        const wasBeam = origBeamMat && child.material === origBeamMat;
        const wasFixture = origFixtureMat && child.material === origFixtureMat;
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0;
        // A new poster spawns EXACTLY coincident with its predecessor's
        // geometry (same position, same size) for at least one frame —
        // two overlapping opaque surfaces fighting over the depth buffer
        // is a textbook cause of a brief flicker, even while the new one
        // is invisible in COLOR (depth writes happen regardless of
        // opacity by default). Disabling depth-write for the whole
        // fade-managed lifetime avoids that fight entirely.
        child.material.depthWrite = false;
        // The beam's opacity is ALSO driven every frame by the separate
        // posterLights pin-light system (trailer dimming) via its own
        // stored .mat reference — repoint that to the clone we just made,
        // or that system keeps animating an orphaned, invisible material
        // while the real (visible) one sits stuck wherever OUR fade last
        // left it. This was the "fully filled instead of a soft shimmer"
        // bug on every duplicated poster's light. The fixture material
        // needs the exact same repointing now too (previously only the
        // beam got this treatment) — setFrameLightOpacity now also
        // drives the fixture's own emissiveIntensity during chain fades,
        // via this same lightEntry.fixtureMat reference.
        if (wasBeam) g.userData.__lightEntry.mat = child.material;
        if (wasFixture) g.userData.__lightEntry.fixtureMat = child.material;
      }
    });
  }
  function syncPosterCountForResize(targetDepth) {
    // The FULL distribution (which movie goes on which wall, single-wall
    // vs. split, centering) is recomputed FROM SCRATCH for the target
    // depth on every resize — exactly matching what an independent reload
    // at that size would show, honoring "If Fewer Results" / Gap Position
    // / sequential-mode thresholds correctly (those decisions depend on
    // the REAL capacity at the target size, not some fixed maximum). What
    // stays cheap: any movie already shown once has its poster texture in
    // posterTextureCache and loads instantly (no network) on every
    // subsequent appearance — so this recomputation is correct AND fast.
    if (!lastLoadedMovies.length || !postersGroup) return;
    const targetRoomStub = { ROOM_WIDTH: room.ROOM_WIDTH, ROOM_DEPTH: targetDepth };
    // Re-slices from the CURRENT page's own start index at the NEW
    // room's capacity, not the full library — a resize changes how many
    // posters fit, so it also changes where the current page's own end
    // (and therefore the next page's own start) falls, but the anchor
    // point itself (which movie the page currently BEGINS at) stays
    // exactly where it was. Runs the SAME end-of-library anchoring as a
    // genuine page switch, so growing the room while already on the
    // library's last (possibly overlap-anchored) page still shows a
    // full wall ending at the true last movie, not a partially-empty one.
    const newPageSize = slotsForDepth(targetDepth);
    const bounds = getPosterPageBounds(posterPageStartIndex, newPageSize, lastLoadedMovies.length);
    posterPageStartIndex = bounds.start;
    applyPosterDiff(lastLoadedMovies.slice(bounds.start, bounds.end), targetRoomStub);
  }
  // Given a desired start index, a page size, and the total library
  // length, returns the ACTUAL {start, end} to display — normally just
  // {start, start+pageSize}, but pulled back so the page still ends
  // exactly at the last movie whenever start+pageSize would overshoot
  // the library's own end (rather than showing a partially-empty page).
  // Shared by every caller that needs to turn "I want to start around
  // index X" into "here's the real, always-full slice to show" —
  // stepPosterPage, syncPosterCountForResize, and the initial load.
  function getPosterPageBounds(desiredStart, pageSize, totalLen) {
    const end = Math.min(totalLen, Math.max(0, desiredStart) + pageSize);
    const start = Math.max(0, end - pageSize);
    return { start, end };
  }
  // Shared by syncPosterCountForResize (room-resize: same movie LIST,
  // different room depth) and switchPosterPage (page switching: same
  // room depth, different movie SLICE) — both boil down to "recompute
  // the full placement for a target {movies, room}, then reconcile
  // against whatever's currently on the wall": anything whose slot+movie
  // combination already exists survives untouched (or, if it was mid
  // fade-OUT from a just-reversed previous change, gets restored to full
  // instead of being allowed to vanish); anything with no match in the
  // new target fades out; anything in the new target with no existing
  // match fades in. All arrivals/departures are a plain opacity fade at
  // each poster's own FINAL position, all at once, no staggering.
  //
  // SIMPLE detection: a poster whose movie+slot combination doesn't
  // exist in the new target is surplus (however that happened —
  // genuine removal OR its movie now belongs at a DIFFERENT slot due
  // to Sequential-wrap/Balanced renumbering, no distinction made); a
  // target combination with no existing match is new (genuine growth
  // OR a renumbered movie's new slot). This used to be one of TEN
  // switchable strategies (compared live with 'P' across many
  // sessions) — several attempts at treating renumbering as its own
  // distinct case (sliding together, position-based content swaps,
  // etc.) each introduced their own new bugs without ever being worth
  // the added complexity, so this simplest version is what's kept.
  function applyPosterDiff(targetMovies, targetRoomForPlacement, allowTextureSwap) {
    if (!targetMovies.length || !postersGroup) return;
    const throwaway = new THREE.Group();
    placePosters(scene, targetMovies, targetRoomForPlacement, throwaway, lastLoadedOpts);
    const existingByKey = {};
    postersGroup.children.forEach((g) => { if (g.userData && g.userData.__slotKey) existingByKey[g.userData.__slotKey] = g; });
    // Position-only lookup — deliberately SEPARATE from existingByKey
    // (which is keyed by side+slot+movie together) and only ever built
    // when the caller opts in via allowTextureSwap. ONLY switchPosterPage
    // (a genuine, same-room, same-layout page flip) passes true —
    // syncPosterCountForResize never does, since a resize recomputes the
    // FULL distribution from scratch and a given movie's own side/slot
    // CAN legitimately shift there (see __slotKey's own long comment on
    // exactly why movie+position are kept together as one key normally)
    // — matching by position alone during a resize risks the same
    // wrong-poster-stays-put bug that comment already describes.
    const existingByPosition = {};
    if (allowTextureSwap) {
      postersGroup.children.forEach((g) => {
        const u = g.userData;
        if (u && u.__wallSide !== undefined && u.__localSlot !== undefined && !u.__chainKind) {
          existingByPosition[u.__wallSide + '|' + u.__localSlot] = g;
        }
      });
    }
    const targetKeys = {};
    const claimedForSwap = new Set();
    const newGroupsBySide = {};
    throwaway.children.slice().forEach((g) => {
      const key = g.userData.__slotKey;
      targetKeys[key] = true;
      if (existingByKey[key]) {
        // A rapid direction reversal mid-animation could have this slot
        // still mid-retraction/mid-fade from a PREVIOUS shrink — since
        // it's confirmed to survive now, cancel that and let it settle
        // back to full visibility instead of vanishing anyway.
        const eg = existingByKey[key];
        if (eg.userData.__chainKind === 'fadeOut') {
          delete eg.userData.__chainKind; delete eg.userData.__chainIndex; delete eg.userData.__chainN;
          setFrameLightOpacity(eg, 1);
          setPosterOpacity(eg, 1);
          eg.children.forEach((child) => { if (child.material) child.material.depthWrite = true; });
        }
        disposePosterGroup(g);
        return; // slot already real — keep the existing one untouched
      }
      // Same physical position (side+slot) already holds a DIFFERENT
      // movie, and nothing about the room/layout changed to make that
      // position itself appear/disappear — this is an ordinary page
      // flip's own "new film in the same spot" case, not a genuine
      // arrival. The frame and light never moved and were never asked
      // to — only the poster ARTWORK itself needs to change, via
      // beginPosterTextureSwap below (a fade confined entirely to the
      // poster mesh's own material), so this never touches
      // setFrameLightOpacity/makeGroupFadeable at all. Confirmed
      // directly this was the actual source of the reported flicker:
      // every ordinary page flip previously ran EVERY poster through
      // the full despawn+respawn fade dance purely because __slotKey
      // includes the movie's own Id, making a same-spot movie swap
      // look identical to a genuine arrival/departure to the diff logic
      // above — even though the frame/light physically never moved.
      if (allowTextureSwap) {
        const posKey = g.userData.__wallSide + '|' + g.userData.__localSlot;
        const existingAtPosition = existingByPosition[posKey];
        if (existingAtPosition && !claimedForSwap.has(existingAtPosition)) {
          claimedForSwap.add(existingAtPosition);
          beginPosterTextureSwap(existingAtPosition, g, key);
          disposePosterGroup(g);
          return;
        }
      }
      (newGroupsBySide[g.userData.__wallSide] = newGroupsBySide[g.userData.__wallSide] || []).push(g);
    });
    // ---- Arrivals (growth) — plain fade in, at each poster's own ----
    // ---- final position, all at once, no staggering ----
    Object.keys(newGroupsBySide).forEach((sideKey) => {
      const list = newGroupsBySide[+sideKey];
      list.forEach((g) => {
        throwaway.remove(g);
        postersGroup.add(g);
        g.userData.__chainKind = 'fadeIn';
        g.userData.__chainIndex = 0;
        g.userData.__chainN = 1;
        g.userData.__revealed = false;
        makeGroupFadeable(g);
      });
    });
    // ---- Departures (shrink) — plain fade out, at each poster's own ----
    // ---- position, all at once, no staggering ----
    const surplusBySide = {};
    const redirectedFromFadeIn = new Set();
    postersGroup.children.forEach((g) => {
      const u = g.userData;
      const key = u && u.__slotKey;
      if (!key || targetKeys[key] || u.__chainKind === 'fadeOut') return;
      if (u.__chainKind === 'fadeIn') {
        // Interrupted mid-arrival — this poster was still fading IN
        // (materials already independently cloned by its own earlier
        // makeGroupFadeable call, sitting at whatever partial opacity
        // it had reached) when a fresh page change redirected it
        // straight to departing instead, typically from paging quickly
        // enough that the previous transition hadn't finished settling
        // yet. Tracked separately below so it skips the re-clone-and-
        // force-to-full treatment every GENUINE new departure gets.
        delete u.__chainIndex; delete u.__chainN; delete u.__revealed;
        redirectedFromFadeIn.add(g);
      }
      (surplusBySide[u.__wallSide] = surplusBySide[u.__wallSide] || []).push(g);
    });
    Object.keys(surplusBySide).forEach((sideKey) => {
      surplusBySide[sideKey].forEach((g) => {
        g.userData.__chainKind = 'fadeOut';
        g.userData.__chainIndex = 0;
        g.userData.__chainN = 1;
        if (redirectedFromFadeIn.has(g)) {
          // Confirmed directly: re-running makeGroupFadeable here (as
          // every OTHER departure below does) re-clones this poster's
          // ALREADY-independent materials — a clone of whatever partial
          // opacity the interrupted fade-in had reached — then forces
          // that fresh clone to 0, only to immediately force it BACK to
          // full via setFrameLightOpacity(g, 1) a moment later, all
          // synchronously before the next frame ever renders. The net
          // visible result on the very next painted frame: a poster
          // that a moment ago was partway through fading in (partial
          // brightness) suddenly reads as fully bright, then fades back
          // out from there — a real flash/flicker, not merely a
          // theoretical one. Its materials are ALREADY its own
          // independent clones from its ORIGINAL fadeIn setup (never
          // shared with any other poster), so none of that re-cloning
          // or forced full-opacity jump is needed at all here — the
          // fadeOut chain's own per-frame formula (opacity = 1 - local)
          // takes over cleanly starting next frame, continuing from
          // whatever opacity this poster's materials already carry
          // rather than snapping through 0 and full first.
          return;
        }
        makeGroupFadeable(g);
        // setFrameLightOpacity/setPosterOpacity, not a flat opacity=1
        // across every child (see their own comments) — the beam-light
        // material is intentionally very faint (~0.1 base, additive-
        // blended); a flat 1 pushed it to full unscaled brightness for
        // one frame.
        setFrameLightOpacity(g, 1);
        setPosterOpacity(g, 1);
      });
    });
  }
  // Starts an in-place poster texture swap on an EXISTING group whose
  // frame/light never move at all — see applyPosterDiff's own call site
  // for the full reasoning on why this exists. existingGroup is the
  // real, on-wall group staying put; targetGroup is the (about to be
  // disposed) throwaway group placePosters built for the NEW movie at
  // this same position, used only to read its poster/lightEntry data.
  function beginPosterTextureSwap(existingGroup, targetGroup, newSlotKey) {
    const newPosterChild = targetGroup.children.find((c) => c.userData && c.userData.type === 'poster');
    const oldPosterChild = existingGroup.children.find((c) => c.userData && c.userData.type === 'poster');
    if (!newPosterChild || !oldPosterChild || !oldPosterChild.material) return;
    // Updated synchronously, right now — not deferred until the fade
    // finishes — so this group's TRUE current identity (which movie it
    // now represents) is correct immediately for anything that reads it
    // in the meantime: a second rapid page flip landing mid-swap, or
    // (critically) the poster-light pin-lighting system, which matches
    // purely by lightEntry.itemId against whatever's currently playing.
    existingGroup.userData.__slotKey = newSlotKey;
    if (existingGroup.userData.__lightEntry && targetGroup.userData.__lightEntry) {
      existingGroup.userData.__lightEntry.itemId = targetGroup.userData.__lightEntry.itemId;
    }
    oldPosterChild.userData.url = newPosterChild.userData.url; // context-menu/detail-link target updated immediately too
    oldPosterChild.material.transparent = true; // placeholderMat's own clone isn't transparent by default — opacity has no visual effect at all until this is set
    existingGroup.userData.__chainKind = 'textureSwap';
    existingGroup.userData.__swapStart = performance.now();
    existingGroup.userData.__swapNewItem = newPosterChild.userData.item;
    existingGroup.userData.__swapNewUrl = newPosterChild.userData.url;
    existingGroup.userData.__swapTexApplied = false;
    existingGroup.userData.__swapTexRequested = false;
    textureSwappingPosters.push(existingGroup);
  }
  // Runs every frame, completely independent of pageChangeActive/
  // runPosterPageFadeAnimation's own timer — a texture swap's own
  // duration has nothing to do with the page's own fade timing, and (for
  // a movie whose poster hasn't been seen yet this session) genuinely
  // depends on an async texture load that could easily outlast the
  // page's own fade window entirely, so it can never be safely driven by
  // that shared, page-scoped animation.
  function updatePosterTextureSwaps() {
    if (!textureSwappingPosters.length) return;
    textureSwappingPosters = textureSwappingPosters.filter((g) => {
      const u = g.userData;
      if (u.__chainKind !== 'textureSwap') return false; // redirected elsewhere since (e.g. this exact slot became a genuine departure) — stop tracking, whatever claimed it now owns its fade
      const posterChild = g.children.find((c) => c.userData && c.userData.type === 'poster');
      if (!posterChild || !posterChild.material) { delete u.__chainKind; return false; }
      if (!u.__swapTexApplied) {
        // Phase 1: fading the OLD artwork out.
        const elapsed = performance.now() - u.__swapStart;
        posterChild.material.opacity = Math.max(0, 1 - elapsed / POSTER_TEXTURE_SWAP_FADE_MS);
        if (elapsed >= POSTER_TEXTURE_SWAP_FADE_MS && !u.__swapTexRequested) {
          u.__swapTexRequested = true;
          posterChild.userData.item = u.__swapNewItem;
          const itemId = u.__swapNewItem.Id;
          const applyTex = (tex) => {
            posterChild.material.map = tex;
            posterChild.material.needsUpdate = true;
            u.__swapTexApplied = true;
            u.__swapFadeInStart = performance.now();
          };
          // Same session-lifetime cache every OTHER poster texture load
          // already uses — a movie shown once anywhere earlier in the
          // session swaps back in instantly here too, no network wait.
          if (posterTextureCache[itemId]) {
            applyTex(posterTextureCache[itemId]);
          } else {
            const swapTexLoader = new THREE.TextureLoader();
            swapTexLoader.load(posterUrl(u.__swapNewItem), (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              posterTextureCache[itemId] = tex;
              applyTex(tex);
            }, undefined, () => {
              // Load failed — still resolve the swap (fade back in on
              // whatever the material currently holds) rather than
              // leaving this poster invisible/stuck forever.
              u.__swapTexApplied = true;
              u.__swapFadeInStart = performance.now();
            });
          }
        }
        return true;
      }
      // Phase 2: fading the NEW artwork in — held at fully invisible
      // (see above) for however long the texture genuinely took to
      // arrive, rather than fading in on a fixed clock regardless of
      // whether the real image was actually ready yet.
      const fadeInElapsed = performance.now() - u.__swapFadeInStart;
      posterChild.material.opacity = Math.min(1, fadeInElapsed / POSTER_TEXTURE_SWAP_FADE_MS);
      if (fadeInElapsed >= POSTER_TEXTURE_SWAP_FADE_MS) {
        posterChild.material.opacity = 1;
        delete u.__chainKind; delete u.__swapStart; delete u.__swapNewItem; delete u.__swapNewUrl;
        delete u.__swapTexApplied; delete u.__swapTexRequested; delete u.__swapFadeInStart;
        return false;
      }
      return true;
    });
  }
  // Independent rAF-driven progress for updatePosterFrameChains — see
  // POSTER_PAGE_FADE_MS's own comment on why this needs its own timer
  // rather than borrowing the room-resize animation's. pageChangeActive
  // stays true for the whole run; switchPosterPage sets it before
  // calling this, this clears it once the fade genuinely completes.
  function runPosterPageFadeAnimation() {
    const start = performance.now();
    function step() {
      const t = Math.min(1, (performance.now() - start) / POSTER_PAGE_FADE_MS);
      updatePosterFrameChains(easeInOutCubic(t));
      if (t < 1) requestAnimationFrame(step);
      else pageChangeActive = false;
    }
    requestAnimationFrame(step);
  }
  // The actual page-switch — applies the diff for the given slice, then
  // drives its own fade to completion. Callers (stepPosterPage, initial
  // load) are responsible for having already validated the slice is
  // actually different/worth switching to; this itself doesn't re-check.
  function switchPosterPage(pageMovies) {
    pageChangeActive = true;
    applyPosterDiff(pageMovies, room, true);
    runPosterPageFadeAnimation();
    // Same reasoning as loadMovies' own identical loop — scoped to only
    // the posters actually landing on THIS page, not the whole library.
    pageMovies.forEach((m) => { checkTrailerAvailability(m.Id); checkMovieBlocked(m.Id); });
  }
  // Public entry point — keyboard/wheel/gamepad all call this. dir -1 =
  // previous page, +1 = next. Mirrors stepRoomSize's own shape closely
  // (reject outright while one is still in flight, reject outright at
  // either genuine edge, no wraparound) — see stepRoomSize's own
  // comment for why that's the right call here too, not queuing. ALSO
  // rejects outright while a room resize is still animating
  // (roomAnimActive) — see stepRoomSize's own comment on the reverse
  // case for why the two need to stay mutually exclusive, not just each
  // self-exclusive.
  function stepPosterPage(dir) {
    if (pageChangeActive || roomAnimActive) return;
    if (!lastLoadedMovies.length) return;
    const pageSize = slotsForDepth(ROOM_DEPTH);
    if (!pageSize) return;
    const totalLen = lastLoadedMovies.length;
    // "Already at this genuine edge" — mirrors real scrolling: nothing
    // happens, no wraparound to the opposite end. The current page's
    // own bounds (not just posterPageStartIndex on its own) decide this,
    // since an end-anchored last page can have a start index that isn't
    // a clean multiple of pageSize.
    const current = getPosterPageBounds(posterPageStartIndex, pageSize, totalLen);
    if (dir > 0 && current.end >= totalLen) return;
    if (dir < 0 && current.start <= 0) return;
    const desiredStart = current.start + dir * pageSize;
    const bounds = getPosterPageBounds(desiredStart, pageSize, totalLen);
    if (bounds.start === current.start && bounds.end === current.end) return; // nothing actually changes
    posterPageStartIndex = bounds.start;
    switchPosterPage(lastLoadedMovies.slice(bounds.start, bounds.end));
  }
  function disposePosterGroup(g) {
    // The frame box and poster plane geometries are SHARED across every
    // poster (posterFrameGeometry / posterPlaneGeometry — same size,
    // always) — disposing one on teardown would break every OTHER poster
    // still using it, so those two are explicitly skipped here. Only the
    // beam light's shape geometry is genuinely unique per poster and
    // still needs disposal. The POSTER PLANE'S texture is deliberately
    // NEVER disposed either — it lives in posterTextureCache, shared and
    // reused for any future appearance of the same movie; disposing it
    // here would silently break that cache for everyone else relying on it.
    g.traverse((obj) => {
      if (obj.geometry && obj.geometry !== posterFrameGeometry && obj.geometry !== posterPlaneGeometry) obj.geometry.dispose();
      if (obj.material) {
        // A DEBUG label's CanvasTexture is unique per label (never
        // shared, unlike the poster's own artwork texture) — dispose()
        // on the material does NOT automatically dispose the texture it
        // references, so it's done explicitly here or it leaks on every
        // resize that tears down and rebuilds labels.
        if (obj.userData && obj.userData.__debugTex) obj.userData.__debugTex.dispose();
        obj.material.dispose();
      }
    });
  }
  // ══════════════════════════════════════════════════════════════════
  // READ THIS BEFORE TOUCHING ANYTHING POSTER-LIGHT-RELATED. This one
  // small feature (a fixture + a beam of light above each poster) has
  // been quietly, repeatedly broken across many separate sessions —
  // never by one big mistake, always by a small, plausible-looking
  // change that overlooked one of the several INDEPENDENT systems that
  // all touch these same two materials. Documented here, at length, on
  // purpose, specifically so the next change doesn't repeat one of
  // these:
  //
  //   1. lightEntry.base = NaN — an early version of the per-frame
  //      dimming loop read a per-lightEntry .base field that was never
  //      actually SET anywhere in the file. Always undefined, so
  //      v * dimTarget silently evaluated to NaN on every single fade
  //      — broke every poster's light during ordinary paging AND room
  //      resize alike, for who knows how long before it was noticed.
  //   2. The fixture (Lämpchen) never respected pin-light dimming at
  //      all, for a long stretch — always sat at the same brightness
  //      regardless of which poster was actually "the one" playing a
  //      trailer. Only the beam (Schein) dimmed; the fixture stayed
  //      lit for every poster, active or not.
  //   3. The "Poster Light" Environment Effect toggle had its logic
  //      backwards for a while — OFF meant "stop dimming, show
  //      everyone normally" instead of the intended "turn everything
  //      off except the active poster". ON and OFF ended up looking
  //      nearly identical the entire time anything was playing
  //      (effectively always), which read as "the toggle does nothing".
  //   4. ambientFocusActive stays true for an ENTIRE Ambient Mode run,
  //      including steps (fanartwall, themesong) that never tie to any
  //      one specific poster at all. Code that used this flag alone as
  //      "something is genuinely pinned right now" made every poster
  //      go dark during those steps — trailerItemId itself, not just
  //      the broader activity flags, is what actually decides whether
  //      a SPECIFIC poster should be singled out.
  //   5. stopTrailer nulled trailerItemId/activeEnvState/etc
  //      unconditionally, even during an Ambient Mode step-to-step
  //      transition where new content was already known to be arriving
  //      moments later. The async gap before that new content's own
  //      re-assignment landed was long enough to render several real
  //      frames with "nothing pinned" — a visible flash to normal
  //      brightness and back, on transitions that should have looked
  //      completely seamless (see stopTrailer's own comment for the
  //      fix: these four now only reset on a GENUINE stop).
  //   6. Even with #5 fixed, a step transition's own
  //      ambientActiveRestore() (restoring the PREVIOUS step's env key
  //      back to whatever the person's own, entirely unrelated Kiosk
  //      panel had it set to) ran before activeEnvState itself got
  //      updated to the NEW step's key — meaning envEnabled() briefly
  //      read that restored, unrelated value for the whole stretch
  //      until the new content function's own LATER assignment caught
  //      up. Fixed by having applyAmbientSequenceState move
  //      activeEnvState synchronously, in the same breath as the
  //      env array itself, rather than leaving it for later.
  //   7. Paging quickly enough to interrupt a poster still mid-fade-IN,
  //      redirecting it straight to fade-OUT instead, re-cloned its
  //      ALREADY-independent materials and force-set them to full
  //      opacity before the fade-out could even begin — a poster
  //      partway through fading in would flash to full brightness,
  //      then fade back out, all within a couple frames. Fixed by
  //      tracking redirected posters separately so they skip the
  //      re-clone-and-force-to-full treatment entirely (see
  //      applyPosterDiff's own "Departures" section).
  //
  // The common thread: this feature is driven by state from several
  // genuinely independent places at once (the steady-state per-frame
  // loop, chain-driven spawn/despawn fades, Ambient Mode's own step
  // transitions, the Environment Effects toggle, the Brightness
  // slider) — a change that looks correct from ONE of those angles has
  // repeatedly turned out to silently break another. Before shipping
  // any future poster-light change: check it against ALL of the
  // scenarios above, not just the one that prompted the change.
  // ══════════════════════════════════════════════════════════════════
  // Frame/light and the poster's OWN artwork texture are now controlled
  // by two INDEPENDENT systems (fast wall-coupled timing vs. a separate,
  // readiness-only sequential queue) — split into two functions so
  // neither can ever accidentally touch the other's material.
  // The fixture (Lämpchen) and the beam (Schein) are genuinely
  // different now, by design (confirmed directly, after two earlier
  // wrong guesses at what "coupled" was supposed to mean here):
  //  - The fixture (affectedByEnvEffect=false) is simply always lit —
  //    a constant ambient light tied only to the Poster Light
  //    Brightness slider (see setFrameLightOpacity/the per-frame loop,
  //    which both scale it by the same 6x ratio as the beam), never
  //    affected by the Environment Effect toggle, never dimmed for a
  //    non-active poster either. It ALWAYS returns the plain slider
  //    value, full stop — the two checks below are both skipped for it.
  //  - The beam (affectedByEnvEffect=true): the CURRENTLY active
  //    poster (trailer/theme video/ambient focus's own item) is
  //    ALWAYS lit too, regardless of the toggle — but every OTHER
  //    poster's beam depends entirely on the "Poster Light"
  //    Environment Effect toggle: ON lights them all up exactly like
  //    the active one, OFF leaves them dark. This is the actual
  //    simple on/off shape the OTHER four Environment Effects already
  //    have (backwall/screen/disc/dim) — the earlier, far more
  //    convoluted version kept dimming non-active posters even with
  //    the toggle ON, so ON and OFF looked nearly identical the entire
  //    time anything was playing (effectively always), which is
  //    exactly the reported "lights always go off regardless of the
  //    toggle" bug.
  //  - Kiosk Movie Search's own found poster: always lit, overrides
  //    everything else, for both.
  function ccPosterLightTarget(itemId, affectedByEnvEffect) {
    if (itemId === movieSearchHighlightId) return posterLightBrightnessVal;
    if (!affectedByEnvEffect) return posterLightBrightnessVal; // the fixture — always lit, nothing below applies to it at all
    // trailerItemId itself — not just the broader trailerActive/
    // ambientFocusActive flags — decides whether there's actually a
    // SPECIFIC poster to single out right now. ambientFocusActive
    // stays true for the entire Ambient Mode sequence regardless of
    // which individual step is currently active.
    const isActivePoster = posterPinLightEnabled && (trailerActive || ambientFocusActive) && itemId === trailerItemId;
    if (isActivePoster) return posterLightBrightnessVal;
    return envEnabled('posterlight') ? posterLightBrightnessVal : 0;
  }
  function setFrameLightOpacity(g, v) {
    // The beam-light material is intentionally always faint, scaled by
    // the shared Poster Light Brightness slider (posterLightBrightnessVal
    // — the SAME live variable the general per-frame pin-light loop
    // reads, further down in this file) rather than a flat 0..1 fade
    // like the frame gets — a uniform fade would push it far brighter
    // than the slider's own setting intends. The poster mesh is
    // deliberately skipped here.
    const lightEntry = g.userData.__lightEntry;
    // A poster arriving/leaving mid-resize is driven ENTIRELY by this
    // function (the per-frame trailer-dimming loop explicitly skips any
    // light still owned by an active chain — see its own comment on
    // that). Uses the exact same ccPosterLightTarget the steady-state
    // loop uses — separately for beam vs fixture (see that function's
    // own comment on why they're not identical) — so a chain-owned
    // light (AND its fixture — previously never touched here at all,
    // staying at whatever brightness it last had) reaches the SAME
    // correct end state that loop would have put it in, not a fixed
    // "always full" one.
    const beamDimTarget = lightEntry ? ccPosterLightTarget(lightEntry.itemId, true) : null;
    const fixtureDimTarget = lightEntry ? ccPosterLightTarget(lightEntry.itemId, false) : null;
    g.children.forEach((child) => {
      if (!child.material) return;
      if (child.userData && child.userData.type === 'poster') return; // artwork is NOT this function's concern
      if (lightEntry && child.material === lightEntry.mat) child.material.opacity = v * beamDimTarget;
      else if (lightEntry && child.material === lightEntry.fixtureMat) { child.material.opacity = v; child.material.emissiveIntensity = v * fixtureDimTarget * 6; }
      else child.material.opacity = v;
    });
  }
  function setPosterOpacity(g, v) {
    const poster = g.children.find((c) => c.userData && c.userData.type === 'poster');
    if (poster && poster.material) poster.material.opacity = v;
  }
  // ---- Unified poster spawn/despawn: frame, light, slot AND artwork ----
  // ---- move and fade in/out TOGETHER, purely on wall-paced timing ----
  // Everything belonging to one poster (frame, beam light, and the slot
  // surface itself — whatever is currently on it, placeholder or real
  // artwork) is driven by ONE synchronized system, tied to the wall's own
  // resize speed (divided into N equal windows per side, exactly as
  // originally built — 3 seconds per room-size step). None of it waits
  // on the texture: a poster appears and travels on schedule regardless.
  // If the real artwork is still loading when its turn comes, the slot
  // simply shows its dark placeholder for now — the real image swaps
  // onto that SAME already-visible, already-moving slot the instant
  function updatePosterFrameChains(easedT) {
    postersGroup.children.slice().forEach((g) => {
      const u = g.userData;
      if (u.__chainKind === 'fadeIn') {
        // Always chainN=1 now — plain, simultaneous fade, no staggering.
        if (!u.__revealed) {
          u.__revealed = true;
          clickablePosters.push(...g.children.filter((c) => c.userData && c.userData.type === 'poster'));
          if (u.__lightEntry) posterLights.push(u.__lightEntry);
        }
        const local = Math.max(0, Math.min(1, easedT));
        const own = slotLivePos(u.__wallSide, u.__localSlot, u.__useBackwall);
        g.position.x = own.x; g.position.z = own.z; // never moves — position is its own final spot from frame one
        setFrameLightOpacity(g, local);
        setPosterOpacity(g, local);
        if (local >= 1) {
          setFrameLightOpacity(g, 1); setPosterOpacity(g, 1);
          const beamMat = u.__lightEntry ? u.__lightEntry.mat : null;
          g.children.forEach((child) => {
            if (child.material && child.material !== beamMat) { child.material.depthWrite = true; child.material.transparent = false; }
          });
          delete u.__chainKind; delete u.__chainIndex; delete u.__chainN; delete u.__revealed;
        }
      } else if (u.__chainKind === 'fadeOut') {
        const local = Math.max(0, Math.min(1, easedT));
        const own = slotLivePos(u.__wallSide, u.__localSlot, u.__useBackwall);
        g.position.x = own.x; g.position.z = own.z; // never moves — fades out exactly where it already is
        const opacity = 1 - local;
        setFrameLightOpacity(g, opacity);
        setPosterOpacity(g, opacity);
        if (local >= 1) {
          postersGroup.remove(g);
          clickablePosters = clickablePosters.filter((c) => !g.children.includes(c));
          if (u.__lightEntry) posterLights = posterLights.filter((e) => e !== u.__lightEntry);
          disposePosterGroup(g);
        }
      }
    });
  }
  // ---- Locked-in poster resize behavior (hidden debug toggle only) ----
  // Settled after extensive comparison across many candidates — this is
  // the ONE behavior kept: a poster fades in/out at its own final
  // position, never slides, no position movement at all. Uses the
  // SIMPLE detection this whole area started from: a slot with no
  // exact existing match is new (arriving), one with no target match is
  // surplus (departing) — no separate renumbering/position-based
  // distinction (several attempts at that kept introducing their own
  // new bugs — duplicated frames, orphaned "ghost" posters — without
  // ever being worth the added complexity). Both arrivals and
  // departures fade the same way: all at once, no staggering, no
  // per-poster chain. This used to be one of TEN switchable strategies
  // (compared live with 'P'); once settled on, the other nine and the
  // whole switching mechanism were removed. 'P' is now repurposed
  // (below) as a hidden diagnostic toggle for the debug slot/rank
  // number labels built alongside this — intentionally undocumented in
  // any settings/controls UI, kept only so a future session can turn
  // them back on without rebuilding them if this area ever needs
  // revisiting.
  let debugLabelsVisible = false;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'p' && e.key !== 'P') return;
    if (msOpenFieldId || navEditing || cinemaConsoleActive) return; // don't steal the key while typing/editing a setting
    debugLabelsVisible = !debugLabelsVisible;
    postersGroup.children.forEach((g) => {
      if (g.userData.__slotLabel) g.userData.__slotLabel.visible = debugLabelsVisible;
      g.children.forEach((c) => { if (c !== g.userData.__slotLabel && c.userData && c.userData.__isSeqLabel) c.visible = debugLabelsVisible; });
    });
  });
  let posterLights = [];
  let kioskTop = null;
  let kioskInteractionProxy = null;
  let kioskGroup = null;
  let kioskLevel = 0;
  let kioskWantsUp = false;
  let kioskLogoGlitched = false;
  // Star-Wars-hologram twitches, decoupled from rotation: scheduled in
  // glitches-per-minute with randomized gaps (0.5x-1.5x the mean interval)
  // so no metronomic pattern emerges. All three aspects are 6-step scales
  // (0-5); step 3 equals the previously shipped behavior.
  let kioskLogoNextTwitchAt = 0;
  let kioskLogoTwitchUntil = 0;
  const KIOSK_LOGO_SPEED_RPM = [0, 2, 3, 5, 8, 12];
  const KIOSK_LOGO_GLITCH_PER_MIN = [0, 2, 4, 8, 15, 30];
  const KIOSK_LOGO_GLITCH_FLICK = [0, 0.12, 0.22, 0.35, 0.55, 0.85];
  const KIOSK_LOGO_GLITCH_OFFSET = [0, 0.008, 0.018, 0.03, 0.05, 0.08];
  const KIOSK_LOGO_GLITCH_SLICES = [0, 1, 1, 2, 2, 3];
  const KIOSK_LOGO_GLITCH_MS = [0, 150, 200, 250, 300, 400];
  const KIOSK_LOGO_MAX_OPACITY = 0.75; // TEST: back to the original value.
  // The kiosk logo is built from several thin, slightly z-offset layers
  // (see assembleKioskLogo's own 'layers' constant, kept in sync with this
  // one) stacked for a holographic parallax look. Stacking N semi-
  // transparent layers on top of each other does NOT add their opacity —
  // it compounds toward full opacity much faster (1-(1-a)^N), so setting
  // each layer's own opacity directly to KIOSK_LOGO_MAX_OPACITY made the
  // whole stack render at NEAR-FULL opacity regardless of how "subtle"
  // that single number looked on its own — the actual, sole cause of the
  // kiosk logo staying stubbornly bright no matter what this constant was
  // set to. kioskLogoPerLayerOpacity() below converts a genuinely-desired
  // CUMULATIVE opacity into the correct PER-LAYER value that, once all
  // KIOSK_LOGO_LAYERS layers are stacked, actually compounds back to it.
  const KIOSK_LOGO_LAYERS = 24; // TEST: back to the original count, to
  // compare against the dense/near-solid look the person remembers from
  // before any of this session's changes.
  function kioskLogoPerLayerOpacity(desiredCumulative) {
    return 1 - Math.pow(1 - desiredCumulative, 1 / KIOSK_LOGO_LAYERS);
  }
  // Table top cylinder radius is 0.42 -> inner diameter 0.84. Both the
  // idle branding AND movie clearlogos are capped to this width so the
  // hologram never overhangs the table.
  const KIOSK_LOGO_MAX_WIDTH = 0.84;
  // Rotating 3D clearlogo floating above the kiosk table. "3D" via the
  // layer-stack trick: ~24 paper-thin copies of the logo plane spread over
  // a few cm of depth read as a solid extruded body from any angle, work
  // with ANY png silhouette (incl. holes) and cost next to nothing.
  let kioskLogoGroup = null;
  let kioskLogoMats = [];
  let kioskLogoItemId = null;
  let kioskLogoReady = false;
  let kioskLogoFade = 0;
  function disposeKioskLogo() {
    if (kioskLogoGroup) {
      if (kioskLogoGroup.parent) kioskLogoGroup.parent.remove(kioskLogoGroup);
      kioskLogoGroup.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      kioskLogoMats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    }
    kioskLogoGroup = null;
    kioskLogoMats = [];
    kioskLogoReady = false;
    kioskLogoFade = 0;
  }
  // Renders the EXACT marquee artwork (icon + "Cinema / Project" wordmark,
  // same canvas size, coordinates, gradient, glow) onto its own canvas for
  // the idle 3D branding — 1:1 the wall look, merely downscaled in world
  // size. Calls back once the icon image has loaded.
  // dark: true -> the kiosk hologram's own muted dark blue-gray palette
  // (a floating hologram reads as dim/monochrome, the wall sign stays a
  // vivid marquee). dark: false (the one actually used) -> the SAME
  // gradient colors as the wall, but composed through the identical
  // silhouette+contour pipeline as the dark branch below, so the kiosk
  // still reads with the crisp "Rahmen" (edge outline) look — colored,
  // not monochrome, but with the same tight dark stroke traced along the
  // actual letter/icon edges (like Word's "Schattierung"/emboss), not a
  // box around the whole thing.
  function makeCinemaBrandingCanvas(onReady, dark) {
    const canvas = document.createElement('canvas');
    canvas.width = 1536; canvas.height = 768;
    const ctx = canvas.getContext('2d');
    const iconSize = 560;
    const iconX = 60, iconY = 384 - iconSize / 2;
    const DARK_FILL = '#001b26'; // darkest tone of Jellyfin's official blue (#00A4DC)
    const DARK_STROKE = '#000000';
    const iconImg = new Image();
    iconImg.onload = () => {
      if (!dark) {
        // Colored, contoured kiosk rendering — same UNIFIED
        // silhouette+contour pipeline as the dark branch below (see its
        // own comment for the four numbered steps), except step 2 fills
        // with the real wall-style gradient instead of one flat dark
        // tone, and the gradient itself is a shade darker than the
        // wall's own so the kiosk hologram doesn't read as too bright.
        const art = document.createElement('canvas');
        art.width = 1536; art.height = 768;
        const actx = art.getContext('2d');
        actx.font = '700 207px Georgia';
        actx.textAlign = 'center'; actx.textBaseline = 'middle';
        if ('letterSpacing' in actx) actx.letterSpacing = '4px';
        actx.fillStyle = '#ffffff';
        actx.fillText('Cinema', 1057.1, 293.0);
        actx.fillText('Project', 1057.1, 483.0);
        actx.imageSmoothingEnabled = true;
        actx.imageSmoothingQuality = 'high';
        actx.drawImage(iconImg, iconX, iconY, iconSize, iconSize);
        actx.globalCompositeOperation = 'source-in';
        const kioskGrad = actx.createLinearGradient(0, 0, 1536, 0);
        kioskGrad.addColorStop(0, '#4f2a5c');
        kioskGrad.addColorStop(1, '#004459');
        actx.fillStyle = kioskGrad;
        actx.fillRect(0, 0, art.width, art.height);
        const strokeRBright = 5;
        const outlineBright = document.createElement('canvas');
        outlineBright.width = 1536; outlineBright.height = 768;
        const octxBright = outlineBright.getContext('2d');
        const ringStepsBright = 16;
        for (let s = 0; s < ringStepsBright; s++) {
          const ang = (s / ringStepsBright) * Math.PI * 2;
          octxBright.drawImage(art, Math.cos(ang) * strokeRBright, Math.sin(ang) * strokeRBright);
        }
        octxBright.globalCompositeOperation = 'source-in';
        octxBright.fillStyle = '#000000';
        octxBright.fillRect(0, 0, outlineBright.width, outlineBright.height);
        ctx.clearRect(0, 0, 1536, 768);
        ctx.drawImage(outlineBright, 0, 0);
        ctx.drawImage(art, 0, 0);
        onReady(canvas);
        return;
      }
      // UNIFIED pipeline: text and film reel are composed as ONE artwork
      // and then run through IDENTICAL fill + contour steps — they cannot
      // end up looking different, because there is only one path.
      // Step 1 — artwork silhouette (text + icon together):
      const art = document.createElement('canvas');
      art.width = 1536; art.height = 768;
      const actx = art.getContext('2d');
      actx.font = '700 207px Georgia';
      actx.textAlign = 'center'; actx.textBaseline = 'middle';
      if ('letterSpacing' in actx) actx.letterSpacing = '4px';
      actx.fillStyle = '#ffffff';
      actx.fillText('Cinema', 1057.1, 293.0);
      actx.fillText('Project', 1057.1, 483.0);
      actx.imageSmoothingEnabled = true;
      actx.imageSmoothingQuality = 'high';
      actx.drawImage(iconImg, iconX, iconY, iconSize, iconSize);
      // Step 2 — ONE uniform fill color across the whole artwork:
      actx.globalCompositeOperation = 'source-in';
      actx.fillStyle = DARK_FILL;
      actx.fillRect(0, 0, art.width, art.height);
      // Step 3 — ONE uniform black contour around the whole artwork
      // (ring-stamp of the combined silhouette):
      const strokeR = 6;
      const outline = document.createElement('canvas');
      outline.width = 1536; outline.height = 768;
      const octx = outline.getContext('2d');
      const ringSteps = 16;
      for (let s = 0; s < ringSteps; s++) {
        const ang = (s / ringSteps) * Math.PI * 2;
        octx.drawImage(art, Math.cos(ang) * strokeR, Math.sin(ang) * strokeR);
      }
      octx.globalCompositeOperation = 'source-in';
      octx.fillStyle = DARK_STROKE;
      octx.fillRect(0, 0, outline.width, outline.height);
      // Step 4 — compose: contour below, artwork on top.
      ctx.clearRect(0, 0, 1536, 768);
      ctx.drawImage(outline, 0, 0);
      ctx.drawImage(art, 0, 0);
      onReady(canvas);
    };
    iconImg.onerror = () => onReady(canvas);
    iconImg.src = CINEMA_ICON_DATA_URL;
  }
  function buildKioskLogo(fullItem, branding) {
    disposeKioskLogo();
    kioskLogoItemId = branding ? 'branding' : (fullItem ? fullItem.Id : null);
    if (!kioskGroup) return;
    const myKey = kioskLogoItemId;
    if (branding) {
      // Idle state (no movie selected): the marquee artwork 1:1 — icon plus
      // "Cinema / Project" wordmark, same layout/spacing/aspect as on the
      // wall, just downscaled.
      makeCinemaBrandingCanvas((canvas) => {
        if (kioskLogoItemId !== myKey || !kioskGroup) return;
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        assembleKioskLogo(tex, canvas.width, canvas.height, KIOSK_LOGO_MAX_WIDTH);
      }, false);
      return;
    }
    if (!fullItem || !fullItem.ImageTags || !fullItem.ImageTags.Logo) return;
    const url = session.serverUrl + '/Items/' + fullItem.Id + '/Images/Logo?tag=' + fullItem.ImageTags.Logo + '&api_key=' + session.accessToken;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(url, (tex) => {
      if (kioskLogoItemId !== myKey || !kioskGroup) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      const iw = tex.image.width, ih = tex.image.height;
      if (!iw || !ih) return;
      assembleKioskLogo(tex, iw, ih, KIOSK_LOGO_MAX_WIDTH);
    }, undefined, () => {});
  }
  function assembleKioskLogo(tex, iw, ih, targetWidth) {
    const width = targetWidth;
    const height = width * (ih / iw);
    const depth = 0.04; // back to the original thickness/depth of the
    // holographic stack — a tighter 0.012 was tried to fight perceived
    // blur, but the color/contour/alphaTest changes turned out to be
    // what actually fixed that; the thinner depth just removed the
    // "thickness" look that was wanted, so it's reverted here.
    const layers = KIOSK_LOGO_LAYERS;
    const group = new THREE.Group();
    const geo = new THREE.PlaneGeometry(width, height);
    for (let i = 0; i < layers; i++) {
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, alphaTest: 0.15, depthWrite: false, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geo, mat);
      m.position.z = -depth / 2 + (i / (layers - 1)) * depth;
      group.add(m);
      kioskLogoMats.push(mat);
    }
    // Floating above the table top (local y 1.13) with a small air gap;
    // parented to kioskGroup so it rises/sinks together with the table.
    group.position.set(0, 1.13 + 0.16 + height / 2, 0);
    group.visible = false;
    kioskGroup.add(group);
    kioskLogoGroup = group;
    kioskLogoReady = true;
  }
  let currentHoverItem = null;
  let hoveredInteractable = null;
  let themeSongAudio = null;
  let themeSongAudioItemId = null;
  let themeSongAudioContext = null;
  // ambientStartMovieReplaceAudio's own 'loop' is a plain function
  // parameter, gone by the time a later 'ended' event fires — persisted
  // here so handleThemeSongAudioEnded can still read it when deciding
  // whether to re-randomize-and-replay a single (queue-less) track.
  let ambientMovieReplaceLoopFlag = false;
  function createPlaybackChannel() {
    return { items: [], queue: [], index: 0, mode: 'first' };
  }
  const trailerChannel = createPlaybackChannel();
  const themeSongChannel = createPlaybackChannel();
  const themeVideoChannel = createPlaybackChannel();
  const trailerReplaceChannel = createPlaybackChannel();
  const themeVideoReplaceChannel = createPlaybackChannel();
  const backdropTrailerChannel = createPlaybackChannel();
  const backdropThemeVideoChannel = createPlaybackChannel();
  function buildOrderedQueue(items, mode) {
    if (!items || !items.length) return [];
    if (mode === 'all') return items.slice();
    if (mode === 'random') return [items[Math.floor(Math.random() * items.length)]];
    if (mode === 'shuffled') return shuffle(items);
    return items.slice(0, 1);
  }
  function startChannel(channel, items, mode) {
    channel.items = items || [];
    channel.mode = mode;
    channel.queue = buildOrderedQueue(channel.items, mode);
    channel.index = 0;
    return channel.queue[0];
  }
  // Every load previously called startChannel(), which resets the queue to
  // position 0 — so with several trailers/theme videos, "Play All in Order"
  // never advanced past the first file and "Play First"/"Play One Random"
  // were indistinguishable. This keeps the channel's position across loads:
  // same item set + same mode → advance (looping); anything changed →
  // genuine restart.
  function sameChannelItems(channel, items) {
    if (!channel.items || channel.items.length !== items.length) return false;
    for (let i = 0; i < items.length; i++) {
      if (channel.items[i].Id !== items[i].Id) return false;
    }
    return true;
  }
  function resumeOrStartChannel(channel, items, mode) {
    if (channel.queue && channel.queue.length && channel.mode === mode && sameChannelItems(channel, items)) {
      return advanceChannel(channel, true);
    }
    return startChannel(channel, items, mode);
  }
  function advanceChannel(channel, loopOn) {
    channel.index++;
    if (channel.index < channel.queue.length) return channel.queue[channel.index];
    if (!loopOn) return null;
    channel.queue = channel.mode === 'shuffled' ? shuffle(channel.items) : buildOrderedQueue(channel.items, channel.mode);
    channel.index = 0;
    return channel.queue[0];
  }
  // Re-renders the bottom hint line the moment playback state changes, so
  // "stop playback" appears/disappears immediately instead of waiting for
  // the next unrelated re-render trigger (hover change, menu toggle, ...).
  function refreshInstructions() {
    instructionsEl.innerHTML = baseInstructions();
  }
  // Shared by every place theme song audio gets started (the standalone
  // Theme Song effect, Trailer/Theme Video's own Replace Audio, and
  // Ambient Mode's Movie Replace Audio) — sets audio.currentTime to a
  // random point within [minPct, maxPct] of the file's own duration, or
  // simply leaves it at the caller's own already-set position (0, by
  // convention) if random start isn't wanted or the duration isn't
  // resolvable yet. Waits for 'loadedmetadata' itself if needed, so
  // every caller can just fire-and-forget this immediately after
  // setting .src, before calling .play(). myGeneration is checked
  // against the SAME shared themeSongPlaythroughGeneration counter every
  // one of those four call sites already bumps on its own — a stale
  // callback from a playthrough that's since been superseded can never
  // act on the wrong audio.
  function applyThemeSongStartPosition(audio, position, minPct, maxPct, myGeneration) {
    if (position !== 'random') return;
    const setRandomPosition = () => {
      if (myGeneration !== themeSongPlaythroughGeneration) return;
      const duration = audio.duration;
      if (!isFinite(duration) || duration <= 0) return; // leaves it at 0 — a quiet, non-broken fallback rather than a failure
      const lo = Math.max(0, Math.min(100, minPct)) / 100;
      const hi = Math.max(0, Math.min(100, maxPct)) / 100;
      const from = Math.min(lo, hi), to = Math.max(lo, hi);
      audio.currentTime = duration * (from + Math.random() * (to - from));
    };
    if (audio.readyState >= 1) setRandomPosition();
    else audio.addEventListener('loadedmetadata', setRandomPosition, { once: true });
  }
  function ensureThemeSongAudio() {
    if (!themeSongAudio) {
      themeSongAudio = document.createElement('audio');
      document.body.appendChild(themeSongAudio);
      themeSongAudio.addEventListener('ended', handleThemeSongAudioEnded);
      themeSongAudio.addEventListener('play', refreshInstructions);
      themeSongAudio.addEventListener('pause', refreshInstructions);
    }
    return themeSongAudio;
  }
  // Cancels every pending Theme Song trim/fade timer — called at the
  // start of every fresh playthrough (own or a completely different
  // context, like a movie's replacement audio) so a timer left over
  // from whatever was playing before can never fire against new audio.
  function clearThemeSongTimers() {
    if (themeSongDelayTimer) { clearTimeout(themeSongDelayTimer); themeSongDelayTimer = null; }
    if (themeSongFadeTimer) { clearInterval(themeSongFadeTimer); themeSongFadeTimer = null; }
    if (themeSongFadeOutTimer) { clearTimeout(themeSongFadeOutTimer); themeSongFadeOutTimer = null; }
    if (themeSongEndTimer) { clearTimeout(themeSongEndTimer); themeSongEndTimer = null; }
  }
  // Smoothly ramps themeSongAudio's OWN volume from wherever it
  // currently sits to targetVolume over "seconds", using a plain
  // setInterval — NOT requestAnimationFrame, so it keeps running at a
  // steady rate even while the tab/window is backgrounded (rAF-driven
  // work is throttled or fully suspended in that case; a timer is not).
  // 50ms steps (20/sec) — smooth enough to not read as a stepped
  // "zipper" effect, coarse enough to be cheap and not require a
  // dedicated audio API. seconds <= 0 jumps straight to the target,
  // same as the setting meaning "off" everywhere else in this feature.
  //
  // The ramp itself is interpolated LINEARLY IN DECIBELS between start
  // and target, not linearly in the raw amplitude .volume actually
  // expects — standard audio-engineering best practice for music fades.
  // Human hearing perceives loudness logarithmically, so a straight
  // linear-amplitude ramp sounds like it rushes through most of the
  // actual perceived change right at one end and drags at the other; a
  // linear-in-dB ramp (equivalently, an exponential curve in raw
  // amplitude) sounds smooth and even-paced throughout, which is why
  // it's the standard recommendation for music specifically (voice/SFX
  // fades are short enough that plain linear is usually fine either
  // way). FLOOR_DB stands in for "silence" — true 0 amplitude has no
  // finite dB value (log(0) is -Infinity), so both ends of the ramp
  // are clamped to this floor instead whenever they'd otherwise hit
  // true zero, keeping the whole curve well-defined throughout.
  const THEME_SONG_FADE_FLOOR_DB = -60;
  function ratioToDb(ratio) {
    return ratio > 0.000001 ? 20 * Math.log10(ratio) : THEME_SONG_FADE_FLOOR_DB;
  }
  function dbToRatio(db) {
    return Math.pow(10, db / 20);
  }
  function fadeThemeSongTo(targetVolume, seconds, onDone) {
    if (themeSongFadeTimer) { clearInterval(themeSongFadeTimer); themeSongFadeTimer = null; }
    if (!themeSongAudio) { if (onDone) onDone(); return; }
    if (seconds <= 0) { themeSongAudio.volume = targetVolume; if (onDone) onDone(); return; }
    const startDb = ratioToDb(themeSongAudio.volume);
    const targetDb = ratioToDb(targetVolume);
    const stepMs = 50;
    const totalSteps = Math.max(1, Math.round((seconds * 1000) / stepMs));
    let step = 0;
    themeSongFadeTimer = setInterval(() => {
      step++;
      const p = Math.min(1, step / totalSteps);
      if (themeSongAudio) {
        // Snaps to the EXACT target on the final step rather than
        // whatever dbToRatio(targetDb) rounds to — targetVolume itself
        // may be a value ratioToDb/dbToRatio can't perfectly round-trip
        // (most obviously 0, which ratioToDb already floors rather than
        // computing), so the ramp's own math is only ever trusted for
        // the steps strictly BEFORE the last one.
        themeSongAudio.volume = p >= 1 ? targetVolume : Math.max(0, Math.min(1, dbToRatio(startDb + (targetDb - startDb) * p)));
      }
      if (p >= 1) {
        clearInterval(themeSongFadeTimer);
        themeSongFadeTimer = null;
        if (onDone) onDone();
      }
    }, stepMs);
  }
  // Maps themeSongAudioContext (already tracked at every one of the six
  // places that start theme song audio) to the Start Position settings
  // that should apply. 'ambientMovieReplace' has no standalone setting
  // of its own to fall back to (Movie Replace Audio only exists inside
  // Ambient Mode) — it shares themeSongStartPosition's own three
  // variables, which Ambient's own per-step override already points at
  // the step's own value during playback (see applyAmbientSequenceState),
  // same as how the OTHER two contexts already get temporarily
  // overridden by an Ambient step of their own kind.
  function getThemeSongStartPositionFor(context) {
    if (context === 'trailerReplace') return { position: trailerReplaceAudioStartPosition, min: trailerReplaceAudioStartMin, max: trailerReplaceAudioStartMax };
    if (context === 'themevideoReplace') return { position: themeVideoReplaceAudioStartPosition, min: themeVideoReplaceAudioStartMin, max: themeVideoReplaceAudioStartMax };
    return { position: themeSongStartPosition, min: themeSongStartMin, max: themeSongStartMax };
  }
  // Applies (or skips, per themeSongDelayedStartFirstOnly/themeSongFadeFirstOnly)
  // Delayed Start / Fade In / Fade Out+Early End to a song reached via
  // multi-song queue advancement in the standalone Theme Song context —
  // mirrors tryPlayThemeSongForItem's own beginLoopIteration/startPlaythrough
  // trim mechanics for the very FIRST song, reused here so LATER songs in
  // the same rotation can optionally get identical treatment. Deliberately
  // does NOT touch Early End/Fade Out for a 'time'-windowed Ambient step
  // (themeSongSequenceWindowSeconds > 0) — those are already scheduled
  // ONCE, relative to the whole step's own true start, by the very first
  // song's own startPlaythrough call, and that timer keeps firing
  // correctly at its originally-computed absolute moment regardless of
  // which song happens to be playing when it does (swapThemeSongAudioSource
  // never clears it) — there is no per-song "end" to re-apply there, only
  // ever one true end for the whole step. Only the standalone/'count'-
  // duration case (no such window exists) ties Fade Out/Early End to each
  // song's OWN file duration, which genuinely differs song to song and so
  // is worth re-computing here when the toggle allows it.
  function playThemeSongQueueTransition(mediaItem) {
    themeSongAudio.src = session.serverUrl + '/Audio/' + mediaItem.Id + '/stream?static=true&api_key=' + session.accessToken;
    themeSongAudio.currentTime = 0;
    const myGeneration = themeSongPlaythroughGeneration;
    applyThemeSongStartPosition(themeSongAudio, themeSongStartPosition, themeSongStartMin, themeSongStartMax, myGeneration);
    const targetVolume = volThemeSong / 100;
    const applyDelay = !themeSongDelayedStartFirstOnly && themeSongDelayedStartSeconds > 0;
    const applyFadeIn = !themeSongFadeFirstOnly && themeSongFadeInSeconds > 0;
    const applyEndGroup = !themeSongFadeFirstOnly && themeSongSequenceWindowSeconds === 0 && (themeSongFadeOutSeconds > 0 || themeSongEarlyEndSeconds > 0);
    const startPlaying = () => {
      if (myGeneration !== themeSongPlaythroughGeneration) return;
      themeSongAudio.volume = applyFadeIn ? 0 : targetVolume;
      themeSongAudio.play().catch(() => {});
      if (applyFadeIn) fadeThemeSongTo(targetVolume, themeSongFadeInSeconds);
      if (applyEndGroup) {
        const onMeta = () => {
          if (myGeneration !== themeSongPlaythroughGeneration) return;
          const duration = themeSongAudio.duration;
          if (!isFinite(duration)) return; // gracefully gives up on this song's own Fade Out/Early End rather than doing nothing forever — Delayed Start/Fade In above already ran regardless
          const nowT = themeSongAudio.currentTime;
          const effectiveEnd = Math.max(0, duration - Math.max(0, themeSongEarlyEndSeconds));
          const fadeOutStart = Math.max(0, effectiveEnd - Math.max(0, themeSongFadeOutSeconds));
          if (themeSongFadeOutSeconds > 0 && fadeOutStart > nowT) {
            themeSongFadeOutTimer = setTimeout(() => {
              if (myGeneration !== themeSongPlaythroughGeneration) return;
              fadeThemeSongTo(0, themeSongFadeOutSeconds);
            }, (fadeOutStart - nowT) * 1000);
          }
          if (effectiveEnd > nowT) {
            themeSongEndTimer = setTimeout(() => {
              if (myGeneration !== themeSongPlaythroughGeneration) return;
              themeSongAudio.pause();
              // .pause() alone never fires 'ended' — the natural trigger
              // handleThemeSongAudioEnded normally relies on to advance
              // the queue — so it's called directly here instead,
              // exactly as if the song HAD ended naturally at this point.
              handleThemeSongAudioEnded();
            }, (effectiveEnd - nowT) * 1000);
          }
        };
        if (themeSongAudio.readyState >= 1) onMeta();
        else themeSongAudio.addEventListener('loadedmetadata', onMeta, { once: true });
      }
    };
    if (applyDelay) {
      themeSongAudio.volume = 0;
      themeSongDelayTimer = setTimeout(startPlaying, themeSongDelayedStartSeconds * 1000);
    } else {
      startPlaying();
    }
  }
  function swapThemeSongAudioSource(mediaItem) {
    if (themeSongAudioContext === 'themesong' && (!themeSongDelayedStartFirstOnly || !themeSongFadeFirstOnly)) {
      playThemeSongQueueTransition(mediaItem);
      return;
    }
    themeSongAudio.src = session.serverUrl + '/Audio/' + mediaItem.Id + '/stream?static=true&api_key=' + session.accessToken;
    themeSongAudio.currentTime = 0;
    const sp = getThemeSongStartPositionFor(themeSongAudioContext);
    applyThemeSongStartPosition(themeSongAudio, sp.position, sp.min, sp.max, themeSongPlaythroughGeneration);
    themeSongAudio.play().catch(() => {});
  }
  function handleThemeSongAudioEnded() {
    let channel = null, loopOn = false;
    if (themeSongAudioContext === 'themesong') { channel = themeSongChannel; loopOn = loopThemeSong; }
    else if (themeSongAudioContext === 'trailerReplace') { channel = trailerReplaceChannel; loopOn = loopTrailer; }
    else if (themeSongAudioContext === 'themevideoReplace') { channel = themeVideoReplaceChannel; loopOn = loopThemeVideo; }
    else if (themeSongAudioContext === 'ambientMovieReplace') { loopOn = ambientMovieReplaceLoopFlag; }
    if (channel && channel.queue.length > 1) {
      const next = advanceChannel(channel, loopOn);
      if (next) swapThemeSongAudioSource(next);
      return;
    }
    // Single track (or ambientMovieReplace, which never has a channel
    // at all) — native .loop already handles a plain repeat on its own
    // in every other case; this branch is only ever reached because
    // native loop was DELIBERATELY disabled for exactly this track
    // (see the three call sites' own matching comment), specifically so
    // 'ended' would keep firing and a fresh random position could be
    // picked each time, instead of the same one repeating forever.
    // 'themesong' is deliberately excluded — that context already has
    // its own, more capable re-randomize-on-loop handling built into
    // tryPlayThemeSongForItem's own dedicated 'ended' listener (added
    // fresh per playthrough); running this generic version ON TOP of
    // that would double-fire against the very same event.
    if (themeSongAudioContext === 'themesong' || !loopOn) return;
    const sp = getThemeSongStartPositionFor(themeSongAudioContext);
    if (sp.position !== 'random') return; // shouldn't normally be reached otherwise, but a safe no-op guard
    const myGeneration = themeSongPlaythroughGeneration;
    themeSongAudio.currentTime = 0;
    applyThemeSongStartPosition(themeSongAudio, sp.position, sp.min, sp.max, myGeneration);
    themeSongAudio.play().catch(() => {});
  }
  async function playNextQueuedVideo(mediaItem) {
    actionRequestId++;
    const myRequestId = actionRequestId;
    trailerVideo.src = session.serverUrl + '/Videos/' + mediaItem.Id + '/stream.mp4?api_key=' + session.accessToken;
    trailerVideo.currentTime = 0;
    try {
      await trailerVideo.play();
    } catch (playErr) {
      trailerVideo.muted = true;
      try { await trailerVideo.play(); } catch (playErr2) { return; }
    }
    if (myRequestId !== actionRequestId) return;
    if (trailerVideo.videoWidth) showVideoOnScreen();
    else trailerVideo.addEventListener('loadedmetadata', showVideoOnScreen, { once: true });
  }
  async function tryPlayThemeSongForItem(item, allowSkipIfUnchanged) {
    const itemId = item.Id;
    actionRequestId++;
    const myRequestId = actionRequestId;
    try {
      const data = await jfGet('/Items/' + itemId + '/ThemeSongs', { userId: session.userId });
      if (myRequestId !== actionRequestId) return true;
      const song = startChannel(themeSongChannel, data.Items || [], themeSongPlaybackOrder);
      if (!song) return false;
      const switchingTrailer = trailerActive;
      stopTrailer(switchingTrailer, allowSkipIfUnchanged);
      trailerItemId = itemId;
      if (fanartWallActive) fanartWallItemId = itemId;
      if (themeSongAudio && !themeSongAudio.paused) themeSongAudio.pause();
      ensureThemeSongAudio();
      clearThemeSongTimers();
      const myGeneration = ++themeSongPlaythroughGeneration;
      const shouldLoop = themeSongChannel.queue.length <= 1 ? loopThemeSong : false;
      // Delayed Start/Early End/Fade In/Fade Out all default to 0 (off)
      // — the overwhelmingly common case, where this collapses back to
      // exactly the original, un-trimmed behavior (native .loop handles
      // repeats on its own, volume is set once and never touched again).
      // 'random' Start Position is ALSO folded into trimActive, not just
      // the original four — native .loop (the 'else' branch below) just
      // seeks back to 0 and continues with no JS involved, so a random
      // position picked once would repeat identically on every loop
      // iteration rather than being freshly re-picked each time, same
      // as the docs for this setting promise. Forcing the full
      // beginLoopIteration path (with its own 'ended' listener driving
      // each new iteration) is what makes re-randomizing on every loop
      // actually possible.
      const trimActive = themeSongDelayedStartSeconds > 0 || themeSongEarlyEndSeconds > 0 || themeSongFadeInSeconds > 0 || themeSongFadeOutSeconds > 0 || themeSongStartPosition === 'random';
      themeSongAudio.loop = trimActive ? false : shouldLoop;
      const targetVolume = volThemeSong / 100;
      themeSongAudio.src = session.serverUrl + '/Audio/' + song.Id + '/stream?static=true&api_key=' + session.accessToken;
      themeSongAudioItemId = itemId;
      themeSongAudioContext = 'themesong';
      if (trimActive) {
        // Every one of the four settings below is driven by a plain
        // setTimeout/setInterval, not the render loop — see
        // clearThemeSongTimers/fadeThemeSongTo's own comments for why.
        // myGeneration is checked at the top of every one of these
        // closures so a timer from a playthrough that's since been
        // superseded (different item, manual stop, Ambient moving on)
        // can never act on the wrong audio.
        // Captured ONCE, right before the very first beginLoopIteration()
        // call below — NOT re-captured inside beginLoopIteration itself,
        // which runs again on every loop iteration. Early End/Fade Out
        // for a 'time'-windowed Ambient step (themeSongSequenceWindowSeconds
        // > 0) are meant to land relative to the WHOLE STEP's own
        // configured seconds (see themeSongSequenceWindowSeconds's own
        // comment — "relative to when the SEQUENCE's own time runs out,
        // not the song's own true length"), not reset back to "N seconds
        // from right now" on every single loop iteration a short song
        // needs to fill that window. Genuinely nothing to do with — and
        // completely unaffected by — this same Start Position work; a
        // real, independent bug that surfaced while reasoning through a
        // scenario for it.
        const sequenceStartTime = performance.now();
        const beginLoopIteration = () => {
          if (myGeneration !== themeSongPlaythroughGeneration) return;
          themeSongAudio.currentTime = 0;
          applyThemeSongStartPosition(themeSongAudio, themeSongStartPosition, themeSongStartMin, themeSongStartMax, myGeneration);
          if (themeSongDelayedStartSeconds > 0) {
            themeSongAudio.volume = 0;
            themeSongDelayTimer = setTimeout(startPlaythrough, themeSongDelayedStartSeconds * 1000);
          } else {
            startPlaythrough();
          }
        };
        const startPlaythrough = () => {
          if (myGeneration !== themeSongPlaythroughGeneration) return;
          themeSongAudio.volume = themeSongFadeInSeconds > 0 ? 0 : targetVolume;
          themeSongAudio.play().catch(() => {});
          if (themeSongFadeInSeconds > 0) fadeThemeSongTo(targetVolume, themeSongFadeInSeconds);
          // Covers "Delayed Start and/or Fade In only" (Early End and
          // Fade Out both 0) — native 'ended' still fires normally in
          // that case (nothing below ever stops it early), and this is
          // the only thing that makes looping restart WITH the delay
          // re-applied each time, which plain .loop (disabled above)
          // can't do on its own.
          themeSongAudio.addEventListener('ended', () => {
            if (myGeneration !== themeSongPlaythroughGeneration) return;
            if (shouldLoop) beginLoopIteration();
          }, { once: true });
          if (themeSongEarlyEndSeconds > 0 || themeSongFadeOutSeconds > 0) {
            // Shared by both branches below — computes fadeOutStart/
            // effectiveEnd from whatever "window" (in seconds) applies,
            // then schedules the two setTimeouts relative to nowT
            // (seconds already elapsed within that window).
            const scheduleFromWindow = (windowSeconds, nowT) => {
              const effectiveEnd = Math.max(0, windowSeconds - Math.max(0, themeSongEarlyEndSeconds));
              const fadeOutStart = Math.max(0, effectiveEnd - Math.max(0, themeSongFadeOutSeconds));
              if (themeSongFadeOutSeconds > 0 && fadeOutStart > nowT) {
                themeSongFadeOutTimer = setTimeout(() => {
                  if (myGeneration !== themeSongPlaythroughGeneration) return;
                  fadeThemeSongTo(0, themeSongFadeOutSeconds);
                }, (fadeOutStart - nowT) * 1000);
              }
              if (effectiveEnd > nowT) {
                themeSongEndTimer = setTimeout(() => {
                  if (myGeneration !== themeSongPlaythroughGeneration) return;
                  themeSongAudio.pause();
                  if (shouldLoop) beginLoopIteration();
                }, (effectiveEnd - nowT) * 1000);
              }
            };
            if (themeSongSequenceWindowSeconds > 0) {
              // Ambient, Duration Type 'time' — the window is this
              // step's OWN configured Seconds value, known immediately,
              // with no need to wait on the song file's own metadata at
              // all. Early End/Fade Out apply relative to when the
              // SEQUENCE's own time runs out, not the song's own true
              // length — matching what the sequence's own duration
              // timer is ALSO about to enforce regardless, rather than
              // leaving a silent gap between an audio-duration-based
              // early stop and the sequence itself running on
              // separately until its own, unrelated timer fires.
              // nowT is elapsed time since the WHOLE STEP's own true
              // start (sequenceStartTime, captured once above) — NOT
              // since this particular startPlaythrough call. A short
              // song looping several times to fill a long window would
              // otherwise have this re-computed as "0 seconds in" on
              // every single loop, scheduling Early End/Fade Out ever
              // further past the window's real boundary each time,
              // rather than correctly counting down toward it.
              scheduleFromWindow(themeSongSequenceWindowSeconds, (performance.now() - sequenceStartTime) / 1000);
            } else {
              // Standalone, or Ambient with a 'count' ("play N times")
              // duration — no fixed window exists to reference, so this
              // falls back to the song file's OWN metadata duration,
              // same as before.
              const onMeta = () => {
                if (myGeneration !== themeSongPlaythroughGeneration) return;
                const duration = themeSongAudio.duration;
                // Duration never resolved (or resolved to something
                // unusable) — gracefully give up on Early End/Fade Out
                // for this one playthrough rather than silently doing
                // nothing forever; Delayed Start/Fade In already ran
                // regardless, and the native 'ended' listener above
                // still handles looping correctly on its own.
                if (!isFinite(duration)) return;
                scheduleFromWindow(duration, themeSongAudio.currentTime);
              };
              if (themeSongAudio.readyState >= 1) onMeta();
              else themeSongAudio.addEventListener('loadedmetadata', onMeta, { once: true });
            }
          }
        };
        beginLoopIteration();
      } else {
        themeSongAudio.volume = targetVolume;
        themeSongAudio.currentTime = 0;
        themeSongAudio.play().catch(() => {});
      }
      activeEnvState = 'EnvThemeSong';
      const fullItem = await jfGet('/Users/' + session.userId + '/Items/' + itemId, {});
      if (myRequestId !== actionRequestId) return true;
      showNoTrailerDisplay(item, fullItem, 'themesong', allowSkipIfUnchanged);
      return true;
    } catch (err) { return false; }
  }
  const CONTEXT_MENU_ACTIONS = [
    { label: 'Go to Library', action: 'library', checkKey: null },
    { label: 'Movie', action: 'movie', checkKey: 'movie' },
    { label: 'Trailer', action: 'trailer', checkKey: 'trailer' },
    { label: 'Theme Video', action: 'themevideo', checkKey: 'themevideo' },
    { label: 'Theme Song', action: 'themesong', checkKey: 'themesong' },
    { label: 'Fanart Wall', action: 'fanartwall', checkKey: null },
    { label: 'Ambient Mode', action: 'ambient', checkKey: null },
  ];
  const themeSongAvailabilityCache = {};
  const themeVideoAvailabilityCache = {};
  async function checkThemeSongAvailability(itemId) {
    if (themeSongAvailabilityCache[itemId] === true) return true;
    try {
      const data = await jfGet('/Items/' + itemId + '/ThemeSongs', { userId: session.userId });
      const has = !!(data.Items && data.Items.length);
      if (has) themeSongAvailabilityCache[itemId] = true;
      return has;
    } catch (err) { return true; }
  }
  const themeVideoBlockedCache = {};
  async function checkThemeVideoAvailability(itemId) {
    if (themeVideoAvailabilityCache[itemId] === true) return !themeVideoBlockedCache[itemId];
    try {
      const data = await jfGet('/Items/' + itemId + '/ThemeVideos', { userId: session.userId, Fields: 'Container,Path' });
      const video = data.Items && data.Items[0];
      const has = !!video;
      if (has) {
        themeVideoAvailabilityCache[itemId] = true;
        themeVideoBlockedCache[itemId] = isBlockedMediaForPoster(video);
      }
      return has && !themeVideoBlockedCache[itemId];
    } catch (err) { return true; }
  }
  const movieBlockedCache = {};
  async function checkMovieBlocked(itemId) {
    if (movieBlockedCache[itemId] !== undefined) return movieBlockedCache[itemId];
    try {
      const data = await jfGet('/Users/' + session.userId + '/Items/' + itemId, { Fields: 'Container,Path' });
      const blocked = isBlockedMediaForPoster(data);
      movieBlockedCache[itemId] = blocked;
      return blocked;
    } catch (err) {
      return false;
    }
  }
  let fanartWallActive = false;
  let fanartWallItemId = null;
  let fanartWallActivationId = 0;
  let contextMenuOpen = false;
  let contextMenuClosing = false;
  let contextMenuOpening = false;
  let contextMenuRequestId = 0;
  let contextMenuAnimT = 0;
  let contextMenuGroup = null;
  let contextMenuPosterMesh = null;
  let contextMenuButtons = [];
  let contextMenuVisibleActions = [];
  // ============================================================
  // 17.421 fix for the multi-WEEK, multi-ITERATION "poster effect
  // click unreliable" bug
  // ============================================================
  // This variable is THE fix. It is the ONLY thing primaryAction() may
  // ever read to decide which context-menu button a click confirms.
  // NEVER let primaryAction() call raycastContextMenuButtonIndex() (or
  // any other fresh raycast) DIRECTLY on click again — that was the bug,
  // for weeks, across many failed iterations, before the person
  // themselves finally pinned down the actual mechanism. Full story, so
  // this is never accidentally reintroduced by "simplifying" the click
  // handler back to "just raycast on click, it's simpler":
  //   The person kept reporting: the context menu visibly closes on
  //   every click (so the click itself is NEVER lost/ignored), but the
  //   selected action sometimes just doesn't start. Several earlier
  //   fixes (deferring the click by a frame, filtering out spurious
  //   large Pointer-Lock mousemove jumps — both still genuinely correct
  //   and worth keeping) narrowed it down but didn't fully solve it. The
  //   actual root cause: this whole file had TWO SEPARATE raycasts
  //   answering "what's the crosshair on" — one running every frame
  //   (below, in animate()) purely to drive the VISIBLE highlight, and a
  //   SECOND, independent one that primaryAction() used to run itself,
  //   fresh, at the exact instant of the click. The per-frame one is
  //   deliberately "sticky" (see its own comment further down) — it only
  //   ever ADVANCES the highlight on a genuine hit, never clears it back
  //   on a momentary miss, so the highlight doesn't flicker during
  //   ordinary sub-frame aim wobble. That stickiness means a button
  //   could stay VISIBLY highlighted for a frame or several after the
  //   crosshair had actually drifted off it. A click computing its OWN
  //   fresh answer at that exact instant could — correctly, honestly,
  //   for that literal instant — get -1 or a DIFFERENT button, even
  //   though the person was looking at a highlighted button moments
  //   before clicking, and had every reason to trust what was on screen.
  //   Two truths that could disagree, and only one of them was ever
  //   visible to the person. The fix: there is only ONE truth now. The
  //   per-frame raycast is the ONLY raycast; this variable is its ONLY
  //   output; primaryAction() reads ONLY this variable. What is shown as
  //   hovered IS, by construction, what a click confirms — full stop,
  //   no way for the two to disagree ever again.
  let contextMenuFocusIndex = 0;
  let contextMenuItem = null;
  let contextMenuUrl = null;
  let contextMenuAvailability = {};
  let contextMenuFlashUntil = 0;
  let contextMenuFlashIndex = -1;
  let contextMenuFlashColor = 'red'; // currently the only flash color in use — see updateContextMenuFocusVisual's own comment for why a second (green) one didn't stick around
  const POSTER_BASE_EMISSIVE = 0.35;
  function makeCtxButtonTexture(text, focused, disabled, flashColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 114;
    const ctx = canvas.getContext('2d');
    let bg, fg;
    if (flashColor === 'red') { bg = 'rgba(178,42,32,0.95)'; fg = '#ffffff'; }
    else if (focused) { bg = disabled ? 'rgba(122,102,64,0.85)' : 'rgba(216,168,78,0.95)'; fg = disabled ? '#3a3226' : '#1a1008'; }
    else { bg = disabled ? 'rgba(28,24,20,0.75)' : 'rgba(15,10,8,0.88)'; fg = disabled ? '#5a5044' : '#f0e2c8'; }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = flashColor === 'red' ? '#ff6a5a' : '#d8a84e';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    ctx.fillStyle = fg;
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    return new THREE.CanvasTexture(canvas);
  }
  function updateContextMenuFocusVisual() {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    contextMenuButtons.forEach((mesh, i) => {
      const cfg = contextMenuVisibleActions[i];
      const disabled = cfg.checkKey ? contextMenuAvailability[cfg.checkKey] === false : false;
      // Red flash for "you clicked a disabled option" — a genuinely
      // useful confirmation, since the menu stays open afterward and
      // this is the only feedback that the click WAS received but
      // rejected. A green "click genuinely registered" flash was tried
      // here too, briefly, but the menu closes immediately on a
      // successful click either way — there was never actually time to
      // see it, so it added nothing and was removed again.
      const isFlashing = i === contextMenuFlashIndex && now < contextMenuFlashUntil;
      const flashColor = isFlashing ? contextMenuFlashColor : null;
      if (mesh.material.map) mesh.material.map.dispose();
      mesh.material.map = makeCtxButtonTexture(cfg.label, i === contextMenuFocusIndex, disabled, flashColor);
      mesh.material.needsUpdate = true;
    });
  }
  function closeContextMenuImmediate() {
    if (contextMenuGroup && contextMenuGroup.parent) contextMenuGroup.parent.remove(contextMenuGroup);
    contextMenuButtons.forEach((mesh) => { if (mesh.material.map) mesh.material.map.dispose(); mesh.material.dispose(); mesh.geometry.dispose(); });
    contextMenuGroup = null;
    contextMenuButtons = [];
    contextMenuVisibleActions = [];
    contextMenuPosterMesh = null;
    contextMenuItem = null;
    contextMenuUrl = null;
    contextMenuOpen = false;
    contextMenuClosing = false;
    contextMenuAnimT = 0;
  }
  function openContextMenu(posterMesh, item, url) {
    if (contextMenuOpen || contextMenuClosing) closeContextMenuImmediate();
    contextMenuOpen = true;
    contextMenuClosing = false;
    contextMenuPosterMesh = posterMesh;
    contextMenuItem = item;
    contextMenuUrl = url;
    const group = posterMesh.parent;
    contextMenuGroup = new THREE.Group();
    contextMenuGroup.position.set(0, 0, 0.045);
    contextMenuGroup.scale.setScalar(0.001);
    contextMenuVisibleActions = CONTEXT_MENU_ACTIONS.filter((cfg) => {
      if (!multiSelectState.PosterMenuTabs.includes(cfg.action)) return false;
      if (hideUnavailableItems && cfg.checkKey && contextMenuAvailability[cfg.checkKey] === false) return false;
      return true;
    });
    const btnW = 0.85, btnH = 0.19, gap = 0.04;
    const totalH = contextMenuVisibleActions.length * btnH + (contextMenuVisibleActions.length - 1) * gap;
    contextMenuButtons = contextMenuVisibleActions.map((cfg, i) => {
      const disabled = cfg.checkKey ? contextMenuAvailability[cfg.checkKey] === false : false;
      const tex = makeCtxButtonTexture(cfg.label, i === 0, disabled, false);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthTest: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(btnW, btnH), mat);
      mesh.renderOrder = 10;
      mesh.position.set(0, totalH / 2 - btnH / 2 - i * (btnH + gap), 0);
      mesh.userData = { type: 'ctxbtn', action: cfg.action };
      contextMenuGroup.add(mesh);
      return mesh;
    });
    group.add(contextMenuGroup);
    contextMenuFocusIndex = 0;
    contextMenuFlashIndex = -1;
    contextMenuFlashUntil = 0;
    instructionsEl.innerHTML = baseInstructions();
  }
  async function prepareAndOpenContextMenu(posterMesh, item, url) {
    contextMenuRequestId++;
    const myMenuRequestId = contextMenuRequestId;
    contextMenuOpening = true;
    try {
      const [movieBlocked, trailerOk, themeSongOk, themeVideoOk] = await Promise.all([
        checkMovieBlocked(item.Id),
        checkTrailerAvailability(item.Id),
        checkThemeSongAvailability(item.Id),
        checkThemeVideoAvailability(item.Id),
      ]);
      if (myMenuRequestId !== contextMenuRequestId) return;
      contextMenuAvailability = { movie: !movieBlocked, trailer: trailerOk, themesong: themeSongOk, themevideo: themeVideoOk };
      openContextMenu(posterMesh, item, url);
    } catch (err) {
      if (myMenuRequestId !== contextMenuRequestId) return;
      contextMenuAvailability = {};
      openContextMenu(posterMesh, item, url);
    } finally {
      if (myMenuRequestId === contextMenuRequestId) contextMenuOpening = false;
    }
  }
  function closeContextMenu() {
    if (!contextMenuOpen) return;
    contextMenuOpen = false;
    contextMenuClosing = true;
    instructionsEl.innerHTML = baseInstructions();
  }
  function openLibraryUrl(url) {
    if (libraryItemOpensIn === 'origintab' && window.opener && !window.opener.closed) {
      window.opener.location.href = url;
    } else {
      window.open(url, '_blank');
    }
  }
  async function playMovieOnScreen(item, allowSkipIfUnchanged, seekIntent) {
    if (themeSongAudio && !themeSongAudio.paused) themeSongAudio.pause();
    // Any pending theme-song timer (Delayed Start / Fade In / Fade
    // Out / Early End) from an EARLIER step must not be allowed to
    // fire late against whatever THIS step actually is — pause()
    // alone only stops what's audibly playing right now, it doesn't
    // touch anything still WAITING to run. Same fix, same reasoning,
    // as stopAllPlayback's own clearThemeSongTimers call already has
    // — this function just never had its own copy of it.
    clearThemeSongTimers();
    themeSongPlaythroughGeneration++;
    themeSongReplacingActive = false;
    actionRequestId++;
    const myRequestId = actionRequestId;
    const switchingTrailer = trailerActive;
    stopTrailer(switchingTrailer, allowSkipIfUnchanged);
    trailerItemId = item.Id;
    if (fanartWallActive) fanartWallItemId = item.Id;
    tooltipEl.innerHTML = item.Name + '<div class="trailerhint">Loading movie …</div>';
    try {
      const fullItem = await jfGet('/Users/' + session.userId + '/Items/' + item.Id, {});
      if (myRequestId !== actionRequestId) return;
      // Always the transcoded endpoint (matches the ORIGINAL, pre-console
      // behavior exactly for the no-seekIntent case) rather than
      // requesting with static=true — static=true was tried first (see
      // git history) but reintroduces a DIFFERENT, worse failure mode:
      // Jellyfin serves the file completely untouched then, so a source
      // whose video codec the browser can decode but whose AUDIO codec
      // it can't (common for some mkv releases — DTS/TrueHD/certain AC3
      // variants) plays picture with silently NO SOUND and no error
      // event at all to react to, since the browser doesn't consider a
      // single unplayable track a fatal error. The transcoded endpoint
      // doesn't have this risk — Jellyfin always transcodes audio to a
      // browser-compatible codec there, exactly why the ORIGINAL script
      // (before today's whole StartTimeTicks investigation) used it
      // unconditionally and never had a sound complaint.
      // StartTimeTicks embedded directly in the SAME initial request
      // instead, when a seek target exists — Jellyfin's own server
      // source (VideosController.GetVideoStream) only reads
      // StartTimeTicks for the transcode branch, using it to seek ffmpeg
      // itself before encoding starts (confirmed reliable — the Backdrop
      // Wall's own fallback path already relies on exactly this). A
      // client-side currentTime seek AFTER an already-started transcode
      // has nothing to jump to (the stream is a real-time, one-
      // directional output from wherever encoding began) — which is
      // exactly why chapter/percent/resume previously always silently
      // landed back at the beginning regardless of how the seek itself
      // was retried. Percent's own seconds aren't known yet at this
      // point (it needs a duration, and the browser hasn't loaded
      // anything to measure one from) — computed here instead from
      // fullItem's own Jellyfin-reported RunTimeTicks, the same
      // approach the Backdrop Wall's own fallback already uses for its
      // one comparable case (percent-based movie start).
      //
      // DeviceId/PlaySessionId sent on every request now (previously
      // absent entirely) AND the previous transcode job explicitly
      // killed before restarting with a new seekIntent — confirmed
      // necessary directly in Jellyfin's own server source
      // (TranscodingJobHelper.GetTranscodingJob(path, type)): it matches
      // an ALREADY-RUNNING job purely by output path and type, NOT by
      // the request's own query string. Without killing it first, a
      // second request for the SAME item — even with a different
      // StartTimeTicks — just kept getting served from the OLD,
      // already-running, position-0 job, which is exactly why
      // resume/chapter/percent silently landed back at the start every
      // time despite the request URL itself being entirely correct.
      // Real Jellyfin clients (jellyfin-web itself included) do this
      // same DELETE /Videos/ActiveEncodings call before every playback
      // parameter change — confirmed directly in a real jellyfin-web
      // network log.
      if (session.deviceId) {
        await jfDelete('/Videos/ActiveEncodings', { deviceId: session.deviceId, PlaySessionId: cinemaPlaySessionId });
      }
      // Re-checked here too, not just after the fullItem fetch above —
      // the kill call is ITS OWN additional async step, and without
      // this check a command superseded by a NEWER one WHILE its own
      // kill was still in flight would still go on to overwrite
      // trailerVideo.src (and cinemaPlaySessionId) with its own now-
      // stale values right after, clobbering whatever the newer,
      // already-correct command had just set — exactly the kind of
      // "works most of the time, not always" flakiness that shows up
      // specifically when commands are typed in quick succession.
      if (myRequestId !== actionRequestId) return;
      // Fresh id for THIS restart, now that the previous one's job has
      // been killed above — see the variable's own comment for why
      // reusing one fixed id across successive requests was itself
      // the cause of chapter/percent landing on an earlier resume
      // position instead of their own.
      cinemaPlaySessionId = 'cinema-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      let src = session.serverUrl + '/Videos/' + item.Id + '/stream.mp4?api_key=' + session.accessToken + '&PlaySessionId=' + cinemaPlaySessionId;
      if (session.deviceId) src += '&DeviceId=' + encodeURIComponent(session.deviceId);
      let seekSeconds = 0;
      if (seekIntent) {
        seekSeconds = seekIntent.type === 'percent'
          ? (fullItem.RunTimeTicks ? (fullItem.RunTimeTicks / 10000000) * (seekIntent.value / 100) : 0)
          : seekIntent.value;
        if (seekSeconds > 0) src += '&StartTimeTicks=' + Math.round(seekSeconds * 10000000);
      }
      // Media Fragments URI (#t=seconds) appended last, after every query
      // parameter (fragments always come last in a URL) — this is a
      // SEPARATE, purely browser-native mechanism from StartTimeTicks,
      // confirmed directly in jellyfin-web's own htmlVideoPlayer source
      // (setCurrentSrc): it ALWAYS appends this fragment in ADDITION to
      // whatever server-side positioning the stream URL itself already
      // has. Fragments are never sent to the server at all (pure HTTP
      // spec) — the browser's own media pipeline applies it directly,
      // independent of anything server-side. The real client relies on
      // BOTH together, not StartTimeTicks alone.
      if (seekSeconds > 0) src += '#t=' + seekSeconds;
      trailerVideo.src = src;
      // Only force position 0 for the ordinary "play" case — when
      // seekIntent set StartTimeTicks above, the stream is ALREADY
      // positioned correctly server-side; unconditionally resetting
      // currentTime to 0 right here (the old, pre-seekIntent behavior)
      // fought against that every time, which is exactly why resume/
      // chapter/percent always silently landed back at the start again
      // despite the URL itself being correct.
      if (!seekIntent) trailerVideo.currentTime = 0;
      trailerVideoVolumeTarget = volMovie / 100;
      trailerVideo.loop = loopMovie;
      trailerVideo.muted = false;
      let soundBlocked = false;
      try {
        await trailerVideo.play();
      } catch (playErr) {
        soundBlocked = true;
        trailerVideo.muted = true;
        try {
          await trailerVideo.play();
        } catch (playErr2) {
          tooltipEl.innerHTML = item.Name + '<div class="trailerhint">Playback blocked</div>';
          trailerItemId = null;
          if (switchingTrailer) setDim(false);
          return;
        }
      }
      if (myRequestId !== actionRequestId) return;
      room.screenMat.map = null;
      room.screenMat.emissiveMap = null;
      screenMatForceBlack = true;
      if (fallbackImageMesh) fallbackImageTargetOpacity = 0;
      // Video is genuinely taking over the screen right here — the
      // previously-shown Front Art (if any) no longer reflects what's
      // actually visible, so showNoTrailerDisplay's own skip-if-
      // unchanged check must not be allowed to think otherwise later.
      // Without this, Ambient Mode's own lightweight step-to-step
      // transitions (stopTrailer called with allowSkipIfUnchanged=true,
      // which deliberately skips ITS OWN reset of this same key) left a
      // stale match whenever the NEXT step wanted Front Art again for
      // the same item/screen-state a PREVIOUS Front Art display once
      // used — the wall went black (video's own fallback-hide, right
      // above) and simply stayed that way, since the reload got wrongly
      // skipped as "nothing changed".
      screenArtLastShownKey = null;
      if (trailerVideo.videoWidth) showVideoOnScreen();
      else trailerVideo.addEventListener('loadedmetadata', showVideoOnScreen, { once: true });
      if (screenLogoMesh) screenLogoTargetOpacity = 0;
      activeEnvState = 'EnvMovie';
      buildBackdropMosaic(fullItem, allowSkipIfUnchanged);
      setDim(envEnabled('dim'));
      trailerActive = true; refreshInstructions();
      activeVideoState = 'movie';
      activeVideoItem = item;
      isStaticDisplay = false;
      instructionsEl.innerHTML = baseInstructions();
      tooltipEl.innerHTML = item.Name + '<div class="trailerhint">' + (soundBlocked ? 'Playing muted — ' : 'Playing — ') + stopLabel() + ' to stop</div>';
    } catch (err) {
      console.error('[Cinema]', err);
      tooltipEl.innerHTML = item.Name + '<div class="trailerhint">Error — see console</div>';
      trailerItemId = null;
      if (switchingTrailer) setDim(false);
    }
  }
  async function playThemeVideoOnScreen(item, allowSkipIfUnchanged) {
    if (themeSongAudio && !themeSongAudio.paused) themeSongAudio.pause();
    // Any pending theme-song timer (Delayed Start / Fade In / Fade
    // Out / Early End) from an EARLIER step must not be allowed to
    // fire late against whatever THIS step actually is — pause()
    // alone only stops what's audibly playing right now, it doesn't
    // touch anything still WAITING to run. Same fix, same reasoning,
    // as stopAllPlayback's own clearThemeSongTimers call already has
    // — this function just never had its own copy of it.
    clearThemeSongTimers();
    themeSongPlaythroughGeneration++;
    themeSongReplacingActive = false;
    actionRequestId++;
    const myRequestId = actionRequestId;
    const switchingTrailer = trailerActive;
    stopTrailer(switchingTrailer, allowSkipIfUnchanged);
    trailerItemId = item.Id;
    if (fanartWallActive) fanartWallItemId = item.Id;
    tooltipEl.innerHTML = item.Name + '<div class="trailerhint">Loading theme video …</div>';
    try {
      const [data, fullItem, themeSongData] = await Promise.all([
        jfGet('/Items/' + item.Id + '/ThemeVideos', { userId: session.userId }),
        jfGet('/Users/' + session.userId + '/Items/' + item.Id, {}),
        replaceAudioThemeVideo ? jfGet('/Items/' + item.Id + '/ThemeSongs', { userId: session.userId }).catch(() => null) : Promise.resolve(null),
      ]);
      if (myRequestId !== actionRequestId) return;
      const video = startChannel(themeVideoChannel, data.Items || [], themeVideoPlaybackOrder);
      if (!video) {
        tooltipEl.innerHTML = item.Name + '<div class="trailerhint">No theme video available</div>';
        trailerItemId = null;
        if (switchingTrailer) setDim(false);
        return;
      }
      const replaceSong = startChannel(themeVideoReplaceChannel, (themeSongData && themeSongData.Items) || [], themeVideoReplaceAudioOrder);
      const src = session.serverUrl + '/Videos/' + video.Id + '/stream.mp4?api_key=' + session.accessToken;
      trailerVideo.src = src;
      trailerVideo.currentTime = 0;
      trailerVideo.loop = themeVideoChannel.queue.length <= 1 ? loopThemeVideo : false;
      let soundBlocked = false;
      let usingReplaceThemeSong = false;
      if (replaceAudioThemeVideo && replaceSong) {
        usingReplaceThemeSong = true;
        trailerVideoVolumeTarget = volThemeVideo / 100;
        trailerVideo.muted = true;
        try { await trailerVideo.play(); } catch (playErr) {
          tooltipEl.innerHTML = item.Name + '<div class="trailerhint">Playback blocked</div>';
          trailerItemId = null;
          if (switchingTrailer) setDim(false);
          return;
        }
      } else {
        const forcedMute = replaceAudioThemeVideo && noThemeSongFallbackThemeVideo === 'mute';
        trailerVideoVolumeTarget = volThemeVideo / 100;
        trailerVideo.muted = forcedMute;
        try {
          await trailerVideo.play();
        } catch (playErr) {
          soundBlocked = true;
          trailerVideo.muted = true;
          try {
            await trailerVideo.play();
          } catch (playErr2) {
            tooltipEl.innerHTML = item.Name + '<div class="trailerhint">Playback blocked</div>';
            trailerItemId = null;
            if (switchingTrailer) setDim(false);
            return;
          }
        }
        if (forcedMute) soundBlocked = true;
      }
      if (myRequestId !== actionRequestId) return;
      if (usingReplaceThemeSong) {
        ensureThemeSongAudio();
        themeSongAudio.volume = volThemeVideo / 100;
        // Native .loop disabled whenever Start Position is 'random' —
        // see ambientStartMovieReplaceAudio's own comment for why.
        themeSongAudio.loop = (themeVideoReplaceChannel.queue.length <= 1 && themeVideoReplaceAudioStartPosition !== 'random') ? loopThemeVideo : false;
        themeSongAudio.src = session.serverUrl + '/Audio/' + replaceSong.Id + '/stream?static=true&api_key=' + session.accessToken;
        themeSongAudio.currentTime = 0;
        themeSongAudioItemId = item.Id;
        themeSongAudioContext = 'themevideoReplace';
        // Same reasoning as the other two replace-audio paths' own
        // reset (movie's and trailer's) — independent of
        // tryPlayThemeSongForItem, so any pending trim/fade timers from
        // an earlier genuine Theme Song step must not fire against this
        // completely unrelated replacement track. Bumping the
        // generation counter (not just clearing the timers) also
        // invalidates anything already IN FLIGHT (e.g. a 'loadedmetadata'
        // listener that hasn't fired yet) via its own generation check.
        clearThemeSongTimers();
        themeSongPlaythroughGeneration++;
        applyThemeSongStartPosition(themeSongAudio, themeVideoReplaceAudioStartPosition, themeVideoReplaceAudioStartMin, themeVideoReplaceAudioStartMax, themeSongPlaythroughGeneration);
        themeSongAudio.play().catch(() => {});
        themeSongReplacingActive = true;
      }
      room.screenMat.map = null;
      room.screenMat.emissiveMap = null;
      screenMatForceBlack = true;
      if (fallbackImageMesh) fallbackImageTargetOpacity = 0;
      // Video is genuinely taking over the screen right here — the
      // previously-shown Front Art (if any) no longer reflects what's
      // actually visible, so showNoTrailerDisplay's own skip-if-
      // unchanged check must not be allowed to think otherwise later.
      // Without this, Ambient Mode's own lightweight step-to-step
      // transitions (stopTrailer called with allowSkipIfUnchanged=true,
      // which deliberately skips ITS OWN reset of this same key) left a
      // stale match whenever the NEXT step wanted Front Art again for
      // the same item/screen-state a PREVIOUS Front Art display once
      // used — the wall went black (video's own fallback-hide, right
      // above) and simply stayed that way, since the reload got wrongly
      // skipped as "nothing changed".
      screenArtLastShownKey = null;
      if (trailerVideo.videoWidth) showVideoOnScreen();
      else trailerVideo.addEventListener('loadedmetadata', showVideoOnScreen, { once: true });
      if (screenLogoMesh) screenLogoTargetOpacity = 0;
      activeEnvState = 'EnvThemeVideo';
      buildBackdropMosaic(fullItem, allowSkipIfUnchanged);
      setDim(envEnabled('dim'));
      trailerActive = true; refreshInstructions();
      activeVideoState = 'themevideo';
      activeVideoItem = item;
      isStaticDisplay = false;
      instructionsEl.innerHTML = baseInstructions();
      const statusMsg = usingReplaceThemeSong ? 'Playing (theme song audio) — ' + stopLabel() + ' to stop' : (soundBlocked ? 'Playing muted — ' : 'Playing — ') + stopLabel() + ' to stop';
      tooltipEl.innerHTML = item.Name + '<div class="trailerhint">' + statusMsg + '</div>';
    } catch (err) {
      console.error('[Cinema]', err);
      tooltipEl.innerHTML = item.Name + '<div class="trailerhint">Error — see console</div>';
      trailerItemId = null;
      if (switchingTrailer) setDim(false);
    }
  }
  function refreshFanartWallIfActive(item) {
    if (!fanartWallActive) return;
    fanartWallItemId = item.Id;
    jfGet('/Users/' + session.userId + '/Items/' + item.Id, {}).then((fullItem) => buildBackdropMosaic(fullItem)).catch(() => {});
  }
  async function toggleFanartWall(item, allowSkipIfUnchanged) {
    if (fanartWallActive && fanartWallItemId === item.Id) {
      actionRequestId++;
      fanartWallActive = false;
      fanartWallItemId = null;
      if (activeEnvState === 'EnvFanartWall') stopTrailer();
      return;
    }
    if (themeSongAudio && !themeSongAudio.paused) themeSongAudio.pause();
    // Same fix, same reasoning, as the identical addition in
    // playMovieOnScreen/playThemeVideoOnScreen/startTrailer — an
    // earlier step's own pending theme-song timer must not survive into
    // this one and fire late against it.
    clearThemeSongTimers();
    themeSongPlaythroughGeneration++;
    actionRequestId++;
    const myRequestId = actionRequestId;
    fanartWallActive = true;
    fanartWallItemId = item.Id;
    fanartWallActivationId = myRequestId;
    try {
      const fullItem = await jfGet('/Users/' + session.userId + '/Items/' + item.Id, {});
      if (myRequestId !== actionRequestId) {
        if (fanartWallActivationId === myRequestId) { fanartWallActive = false; fanartWallItemId = null; }
        return;
      }
      const switchingTrailer = trailerActive;
      stopTrailer(switchingTrailer, allowSkipIfUnchanged);
      trailerItemId = item.Id;
      activeEnvState = 'EnvFanartWall';
      showNoTrailerDisplay(item, fullItem, 'fanart', allowSkipIfUnchanged);
    } catch (err) {
      if (fanartWallActivationId === myRequestId) { fanartWallActive = false; fanartWallItemId = null; }
    }
  }
  // ---- Ambient Mode: the sequence-playback engine ----
  // Ambient Mode is itself just another Poster Effect — triggered and
  // stopped exactly like Movie/Trailer/etc (see executeContextMenuAction
  // below). It steps through the ACTIVE profile's own configured steps,
  // each of which reuses the FIVE EXISTING content functions
  // (playMovieOnScreen/startTrailer/playThemeVideoOnScreen/
  // tryPlayThemeSongForItem/toggleFanartWall) completely unmodified —
  // rather than reimplementing playback, this only ever borrows/restores
  // the module-level state those functions themselves already read
  // (env effects via multiSelectState, volume, and the "after X" auto-
  // chase toggles) for the DURATION of one step, so nothing here can
  // silently drift out of sync with how those five already behave
  // outside of Ambient Mode.
  const AMBIENT_ENV_KEY_BY_EFFECT = { movie: 'EnvMovie', trailer: 'EnvTrailer', themevideo: 'EnvThemeVideo', themesong: 'EnvThemeSong', fanartwall: 'EnvFanartWall' };
  let ambientRunning = false;
  // Deliberately its OWN variable, never derived from trailerActive —
  // stopTrailer unconditionally resets trailerActive on EVERY Ambient
  // step transition, by design (other things — instructions text,
  // tooltip, the "stop playback" hint — correctly need that same reset).
  // Anything meant to represent "is Ambient Mode's own poster still the
  // active focus" for the WHOLE session instead needs a variable that
  // ISN'T touched by that same per-step reset — this one is set only in
  // startAmbientMode/stopAmbientMode, nowhere else, so it stays constant
  // across every step within one Ambient run regardless of which
  // individual step happens to involve literal video playback.
  let ambientFocusActive = false;
  // Target for trailerVideo.volume — the per-frame lerp below (same
  // "keep approaching, never wait on a timer" pattern dimLevel itself
  // uses) reads this every frame and nudges the real .volume toward it,
  // instead of the previous direct trailerVideo.volume = X assignment
  // jumping there instantly. Matters most for Ambient Mode: adjacent
  // steps with genuinely different volumes (e.g. a movie step at 100
  // next to a Theme Song step at 60) used to produce an audible pop at
  // the exact moment of the step transition; this crossfades instead,
  // and — because it's a continuous per-frame approach with no fixed
  // duration to wait out — can never be caught mid-fade and cut off the
  // way a setTimeout-based fade could be if another transition arrives
  // before it finishes. Independent of .muted (mute silences instantly
  // regardless of this value, exactly as before — the two properties
  // are orthogonal in the browser's own video element).
  let trailerVideoVolumeTarget = 1;
  let ambientItemId = null; // which poster's sequence is currently running, for the same-poster-toggles-off vs different-poster-seamlessly-switches distinction in startAmbientMode
  let ambientRequestId = 0; // bumped on every stop/restart — any in-flight async step checks this before acting, exactly like actionRequestId elsewhere
  let ambientSequenceTimer = null;
  // A SEPARATE, additional timer alongside ambientSequenceTimer — fires
  // 1s before the step's own normal end, ONLY when this step is
  // genuinely showing Front Art (effect isn't itself movie/trailer/
  // themevideo, and 'screen' env is on) AND the step immediately
  // following it resolves to a video effect (see
  // peekAmbientNextIsVideo). Gives the fallback image's own fade a
  // 1-second head start into that specific transition, without touching
  // the step's own overall duration/advance timing at all — purely a
  // second, independent trigger for fallbackImageTargetOpacity, cleared
  // alongside the main timer by clearAmbientSequenceTimer so it can
  // never fire after the step it belongs to has already ended some
  // other way (a manual stop, an unrelated re-trigger, etc).
  let ambientFrontWallEarlyFadeTimer = null;
  let ambientSequenceEndedHandler = null; // the current step's OWN one-shot 'ended' listener, if any, so it can be torn down cleanly
  let ambientSequenceErrorHandler = null; // this step's OWN 'error' listener (count-based duration's safety net for a failed playthrough), torn down alongside ambientSequenceEndedHandler
  let ambientActiveRestore = null; // the CURRENT step's restore function (undoes applyAmbientSequenceState's temporary module-state swaps) — held module-wide so a MANUAL stop mid-step can still run it. Without this, restore only ever lived inside the step's own timer/listener callbacks, which stopAmbientMode tears down BEFORE they fire — leaving volume/loop/playbackOrder/replaceAudio/afterX/env permanently stuck on that step's values for the rest of the session after any manual stop or switch to another action.
  let ambientGlobalHandlersDetached = false; // whether handleVideoEnded/handleThemeSongAudioEnded are CURRENTLY detached for the step in progress — set by whichever of the time-based/count-based branches below detached them, read by clearAmbientSequenceTimer to know whether they need reattaching
  // The {effect, env} of whatever is CURRENTLY genuinely playing/applied
  // — null whenever nothing is (including right after a stop/restart).
  // Compared against each newly-resolved sequence in playAmbientSequence
  // to decide whether a transition can skip the disruptive part
  // (content re-trigger, which is what actually tears down and rebuilds
  // the backdrop wall) entirely — see ambientSameAppliedState's own
  // comment for the exact, deliberately narrow scope of when that's
  // safe to do.
  let ambientLastApplied = null;
  // True only when EVERY aspect of "what's actually visibly/audibly
  // happening" would stay identical — content type, the exact set of
  // Environment Effects (order-independent), and every other setting
  // that could change what's actually playing (volume, loop, playback
  // order, replace-audio). Deliberately a FULL match, not just
  // effect+env: applyAmbientSequenceState is the only thing that
  // correctly captures a "restore to true pre-Ambient values" backup —
  // calling it a second time mid-streak (to merely nudge one differing
  // value) before the FIRST restore ever ran would silently overwrite
  // that backup with already-Ambient-modified values, permanently
  // losing the real originals. Requiring a full match instead means a
  // "skip" transition never needs to change anything at all — it only
  // ever needs to re-arm the NEXT sequence's own duration config against
  // whatever's already correctly playing, never partially reapply.
  function ambientSameAppliedState(prev, next) {
    if (!prev || prev.effect !== next.effect) return false;
    if (prev.volume !== next.volume || prev.loop !== next.loop || prev.playbackOrder !== next.playbackOrder) return false;
    if (prev.replaceAudio !== next.replaceAudio || prev.replaceAudioOrder !== next.replaceAudioOrder) return false;
    const a = prev.env.slice().sort(), b = next.env.slice().sort();
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  function detachGlobalEndedHandlers() {
    if (ambientGlobalHandlersDetached) return;
    // themeSongAudio is created LAZILY on the first-ever theme song play
    // of the session (see ensureThemeSongAudio) — it can still be null
    // here if none has played yet; ensuring it exists first (idempotent)
    // avoids a TypeError, and matters beyond that too: creating it NOW
    // means its normal global handler exists to be detached, so it can't
    // slip in attached later mid-step.
    ensureThemeSongAudio();
    trailerVideo.removeEventListener('ended', handleVideoEnded);
    themeSongAudio.removeEventListener('ended', handleThemeSongAudioEnded);
    ambientGlobalHandlersDetached = true;
  }
  async function ambientEffectAvailable(effect, itemId, fullItem) {
    if (effect === 'movie') return !(await checkMovieBlocked(itemId));
    if (effect === 'trailer') return await checkTrailerAvailability(itemId);
    if (effect === 'themevideo') return await checkThemeVideoAvailability(itemId);
    if (effect === 'themesong') return await checkThemeSongAvailability(itemId);
    if (effect === 'fanartwall') return !!(fullItem.BackdropImageTags && fullItem.BackdropImageTags.length);
    return false;
  }
  // Resolves ONE step down to { effect, settings } — effect is null for
  // a genuine "Empty" (including a fallback that itself couldn't play,
  // which always lands here rather than chaining any further, per the
  // "exactly one fallback level" rule). settings is normally the step's
  // own object, EXCEPT for 'previous'/'sequence:N' fallbacks, which hand
  // over that OTHER step's complete settings (duration/volume/env too,
  // not just which content plays) — a direct-effect fallback (e.g.
  // falling back to 'themesong') keeps using the ORIGINAL step's own
  // duration/volume/env throughout, only the content choice changes.
  // Peeks at what the step immediately after startIndex will resolve to,
  // WITHOUT actually playing anything or touching any module state —
  // purely a read-ahead for ambientFrontWallEarlyFadeTimer's own
  // scheduling decision. Mirrors advance()'s own nextIndex/loop-wraparound
  // logic exactly, and — since a genuine 'skip' step never actually
  // shows anything, immediately cascading to the one after it in real
  // playback — follows that same cascade here too, rather than
  // incorrectly treating 'skip' itself as "the next step". Capped at
  // profile.sequenceCount iterations so a pathological config (every
  // step set to 'skip', chaining into itself via looping) can't spin
  // forever; returns false (same as "no video coming next") if that cap
  // is ever hit, rather than hanging.
  async function peekAmbientNextIsVideo(profile, itemId, fullItem, startIndex, myRunId) {
    let idx = startIndex;
    for (let i = 0; i < profile.sequenceCount; i++) {
      if (idx >= profile.sequenceCount) {
        if (!profile.loop) return false;
        idx = 0;
      }
      if (myRunId !== ambientRequestId) return false;
      const resolved = await resolveAmbientSequence(profile, idx, itemId, fullItem);
      if (myRunId !== ambientRequestId) return false;
      if (resolved.effect === 'skip') { idx += 1; continue; }
      return resolved.effect === 'movie' || resolved.effect === 'trailer' || resolved.effect === 'themevideo';
    }
    return false;
  }
  // Count-based counterpart to the time-based Front Wall early-fade
  // logic inline in playAmbientSequence — a count-based step (N natural
  // end-to-end playthroughs, no fixed time window at all) can ALSO be
  // showing Front Art (only 'themesong' realistically, since 'movie'/
  // 'trailer'/'themevideo' already exclude themselves via showsFrontArt
  // below), and needs the exact same "give the fade a head start into a
  // following video step" treatment — just anchored to the FINAL play's
  // own real duration instead of a fixed step-level durationValue, since
  // count-based steps don't have one.
  // Called once for whichever trigger turns out to BE that final play —
  // either the very first (a step with durationValue===1, itself
  // immediately the only/last one) or a later re-trigger inside
  // ambientSequenceEndedHandler, once remaining counts down to exactly
  // one more play to go. triggeredAt is performance.now() captured as
  // close as possible to that specific triggerAmbientEffect call — the
  // SAME "measure real elapsed time, don't assume zero" principle the
  // time-based version already uses, applied here against the actual
  // audio element's own duration/readyState instead of a known
  // durationValue.
  function scheduleFrontWallEarlyFadeForFinalThemeSongPlay(resolved, effectiveSettings, profile, itemId, fullItem, index, myRunId, myStepId, triggeredAt) {
    // 0 (the shared baseline default — see ambientDefaultSequence's own
    // comment) means this feature is off for this step entirely, same
    // as if it had never been built — no peek, no timer, nothing.
    const showsFrontArt = effectiveSettings.frontArtEarlyFadeSeconds > 0 && resolved.effect !== 'movie' && resolved.effect !== 'trailer' && resolved.effect !== 'themevideo' && effectiveSettings.env.includes('screen');
    if (!showsFrontArt) return;
    peekAmbientNextIsVideo(profile, itemId, fullItem, index + 1, myRunId).then((nextIsVideo) => {
      if (!nextIsVideo || myRunId !== ambientRequestId || ambientStepId !== myStepId) return;
      const scheduleFromMetadata = () => {
        if (myRunId !== ambientRequestId || ambientStepId !== myStepId) return;
        const duration = themeSongAudio.duration;
        if (!isFinite(duration) || duration <= 0) return;
        // themeSongDelayedStartSeconds — read live, not from
        // effectiveSettings — is exactly the same module variable
        // applyAmbientSequenceState already set for this step (Start
        // Position's own comment explains the same "one step value
        // covers every playback path" reasoning); tryPlayThemeSongForItem
        // reads this SAME variable to actually wait out the delay before
        // ever calling .play(), so using it here keeps this calculation
        // anchored to the exact same number the real playback is using,
        // not a second, potentially-diverging copy of it. Fade
        // In/Fade Out/Early End are deliberately NOT part of this sum —
        // they only affect volume or (for a genuinely time-boxed step)
        // an artificial cutoff, neither changes when this particular
        // play's audio naturally, actually ends.
        const elapsedMs = performance.now() - triggeredAt;
        const totalMs = (themeSongDelayedStartSeconds + duration - effectiveSettings.frontArtEarlyFadeSeconds) * 1000;
        const earlyMs = Math.max(0, totalMs - elapsedMs);
        ambientFrontWallEarlyFadeTimer = setTimeout(() => {
          ambientFrontWallEarlyFadeTimer = null;
          if (myRunId !== ambientRequestId || ambientStepId !== myStepId) return;
          if (fallbackImageMesh) fallbackImageTargetOpacity = 0;
          if (screenLogoMesh) screenLogoTargetOpacity = 0;
        }, earlyMs);
      };
      if (themeSongAudio.readyState >= 1 && isFinite(themeSongAudio.duration) && themeSongAudio.duration > 0) scheduleFromMetadata();
      else themeSongAudio.addEventListener('loadedmetadata', scheduleFromMetadata, { once: true });
    });
  }
  async function resolveAmbientSequence(profile, index, itemId, fullItem) {
    const sequence = profile.sequences[index];
    if (await ambientEffectAvailable(sequence.effect, itemId, fullItem)) return { effect: sequence.effect, settings: sequence };
    const fb = sequence.fallback;
    if (fb === 'skip') return { effect: 'skip', settings: sequence };
    if (fb === 'empty') return { effect: null, settings: sequence };
    if (fb === 'previous') {
      if (index === 0) return { effect: null, settings: sequence };
      const prevSequence = profile.sequences[index - 1];
      if (await ambientEffectAvailable(prevSequence.effect, itemId, fullItem)) return { effect: prevSequence.effect, settings: prevSequence };
      return { effect: null, settings: sequence };
    }
    if (fb.indexOf('sequence:') === 0) {
      const n = parseInt(fb.slice('sequence:'.length), 10);
      const targetSequence = profile.sequences[n - 1];
      if (targetSequence && await ambientEffectAvailable(targetSequence.effect, itemId, fullItem)) return { effect: targetSequence.effect, settings: targetSequence };
      return { effect: null, settings: sequence };
    }
    // fb is itself a plain content type — same sequence, different content.
    if (await ambientEffectAvailable(fb, itemId, fullItem)) return { effect: fb, settings: sequence };
    return { effect: null, settings: sequence };
  }
  // Backs up every piece of module-level state a step is about to
  // temporarily repurpose, applies the step's own values, and returns a
  // single restore function — always called in a try/finally-shaped flow
  // below so a step can never leave the room's "normal" settings
  // (outside of Ambient Mode) permanently altered, even if it's
  // interrupted mid-step by a manual stop.
  function applyAmbientSequenceState(effect, settings) {
    // Empty (effect === null) isn't in this map — mechanically it's
    // handled identically to Fanart Wall (see triggerAmbientEffect
    // below, which routes both through the same code), so its
    // environment effects need to land on that exact same key too.
    // Without this fallback, a genuine Empty step — whose entire point
    // IS "apply my own environment effects, nothing else" — would
    // silently apply NO environment effects at all, leaving whatever
    // the previous step happened to set still active instead.
    const envKey = AMBIENT_ENV_KEY_BY_EFFECT[effect] || 'EnvFanartWall';
    const backup = {
      envKey, envVal: envKey ? multiSelectState[envKey] : undefined,
      volMovie, volTrailer, volThemeVideo, volThemeSong,
      loopMovie, loopTrailer, loopThemeVideo, loopThemeSong,
      afterMovieThemeSong, afterMovieScreenArt, afterTrailerThemeSong, afterTrailerScreenArt, afterThemeVideoThemeSong, afterThemeVideoScreenArt,
      trailerPlaybackOrder, themeVideoPlaybackOrder, themeSongPlaybackOrder,
      replaceAudioTrailer, trailerReplaceAudioOrder, replaceAudioThemeVideo, themeVideoReplaceAudioOrder,
      themeSongDelayedStartSeconds, themeSongEarlyEndSeconds, themeSongFadeInSeconds, themeSongFadeOutSeconds, themeSongSequenceWindowSeconds,
      themeSongDelayedStartFirstOnly, themeSongFadeFirstOnly,
      themeSongStartPosition, themeSongStartMin, themeSongStartMax,
      trailerReplaceAudioStartPosition, trailerReplaceAudioStartMin, trailerReplaceAudioStartMax,
      themeVideoReplaceAudioStartPosition, themeVideoReplaceAudioStartMin, themeVideoReplaceAudioStartMax,
    };
    if (envKey) multiSelectState[envKey] = settings.env.slice();
    // activeEnvState itself moves to the new key HERE too, synchronously
    // alongside multiSelectState[envKey] above — not left for whichever
    // content function (startTrailer etc.) eventually sets it later,
    // after that function's own async fetch. Confirmed necessary
    // directly: ambientActiveRestore() (called by this function's own
    // caller, right before this call) resets the PREVIOUS step's own
    // envKey back to whatever the person's own Kiosk panel had it set
    // to before Ambient Mode ever touched it — genuinely unrelated to
    // either the previous OR the new Ambient step's own configured
    // Environment Effects. With activeEnvState still pointing at that
    // OLD key for the whole stretch until the new content function's
    // own later assignment, envEnabled() (checked every single frame by
    // Poster Light) read that restored, unrelated value the entire
    // time — if the person's own normal Kiosk env selection happened to
    // include Poster Light, this surfaced as exactly the reported bug:
    // a brief, spurious flash to "on" between two ambient steps that
    // both actually wanted it off, timed to right when a new step
    // (e.g. a Trailer) starts.
    activeEnvState = envKey;
    // Start Position — ONE value on the step overrides all THREE
    // underlying standalone settings identically, unconditionally
    // (unlike the effect-specific blocks below), since a 'movie'/
    // 'trailer'/'themevideo' step could ALSO be using Replace Audio, not
    // just a genuine 'themesong' step — whichever of the several
    // playback code paths this step's own content actually runs
    // through, it reads its own matching one of these three, all
    // already carrying this same step's own value.
    themeSongStartPosition = settings.themeSongStartPosition; themeSongStartMin = settings.themeSongStartMin; themeSongStartMax = settings.themeSongStartMax;
    trailerReplaceAudioStartPosition = settings.themeSongStartPosition; trailerReplaceAudioStartMin = settings.themeSongStartMin; trailerReplaceAudioStartMax = settings.themeSongStartMax;
    themeVideoReplaceAudioStartPosition = settings.themeSongStartPosition; themeVideoReplaceAudioStartMin = settings.themeSongStartMin; themeVideoReplaceAudioStartMax = settings.themeSongStartMax;
    // 'movie' and 'fanartwall' have no independent Playback Order or
    // Replace-Audio concept of their own — a movie IS one specific file,
    // and Fanart Wall has no queued media at all — so neither backs up
    // nor overrides those two module variables; only the three effect
    // types that CAN have several available items to choose among, or
    // audio worth replacing, do.
    // Movie's own volume is forced to 0 whenever this step wants to
    // replace its audio — settings.volume in that case is meant for the
    // REPLACEMENT theme song (passed separately to
    // ambientStartMovieReplaceAudio below in playAmbientSequence), not the
    // movie's own native audio. This was originally assumed to happen
    // "for free" simply by virtue of forcing volMovie at all — that
    // assumption was wrong: forcing it to settings.volume (a normal,
    // non-zero value) would have left the movie's own audio playing
    // right alongside the replacement track, not silenced.
    if (effect === 'movie') { volMovie = settings.replaceAudio ? 0 : settings.volume; loopMovie = settings.loop; }
    else if (effect === 'trailer') {
      volTrailer = settings.volume; loopTrailer = settings.loop; trailerPlaybackOrder = settings.playbackOrder;
      replaceAudioTrailer = settings.replaceAudio; trailerReplaceAudioOrder = settings.replaceAudioOrder;
    } else if (effect === 'themevideo') {
      volThemeVideo = settings.volume; loopThemeVideo = settings.loop; themeVideoPlaybackOrder = settings.playbackOrder;
      replaceAudioThemeVideo = settings.replaceAudio; themeVideoReplaceAudioOrder = settings.replaceAudioOrder;
    } else if (effect === 'themesong') {
      volThemeSong = settings.volume; loopThemeSong = settings.loop; themeSongPlaybackOrder = settings.playbackOrder;
      themeSongDelayedStartSeconds = settings.themeSongDelayedStart; themeSongEarlyEndSeconds = settings.themeSongEarlyEnd;
      themeSongFadeInSeconds = settings.themeSongFadeIn; themeSongFadeOutSeconds = settings.themeSongFadeOut;
      themeSongDelayedStartFirstOnly = settings.themeSongDelayedStartFirstOnly; themeSongFadeFirstOnly = settings.themeSongFadeFirstOnly;
      // Only meaningful for a fixed-length ('time') sequence — 'count'
      // ("play N times") has no fixed window to reference at all, so
      // Early End/Fade Out fall back to the song file's own duration in
      // that case, same as standalone.
      themeSongSequenceWindowSeconds = settings.durationType === 'time' ? settings.durationValue : 0;
    }
    // The existing "after X, play Theme Song / show Screen Art" auto-
    // chase toggles are ALWAYS suppressed during an Ambient step,
    // regardless of their own normal setting — Ambient Mode's own
    // sequence, not that chase logic, decides what happens once this
    // step's content ends.
    afterMovieThemeSong = false; afterMovieScreenArt = false;
    afterTrailerThemeSong = false; afterTrailerScreenArt = false;
    afterThemeVideoThemeSong = false; afterThemeVideoScreenArt = false;
    return () => {
      if (backup.envKey) multiSelectState[backup.envKey] = backup.envVal;
      volMovie = backup.volMovie; volTrailer = backup.volTrailer; volThemeVideo = backup.volThemeVideo; volThemeSong = backup.volThemeSong;
      loopMovie = backup.loopMovie; loopTrailer = backup.loopTrailer; loopThemeVideo = backup.loopThemeVideo; loopThemeSong = backup.loopThemeSong;
      afterMovieThemeSong = backup.afterMovieThemeSong; afterMovieScreenArt = backup.afterMovieScreenArt;
      afterTrailerThemeSong = backup.afterTrailerThemeSong; afterTrailerScreenArt = backup.afterTrailerScreenArt;
      afterThemeVideoThemeSong = backup.afterThemeVideoThemeSong; afterThemeVideoScreenArt = backup.afterThemeVideoScreenArt;
      trailerPlaybackOrder = backup.trailerPlaybackOrder; themeVideoPlaybackOrder = backup.themeVideoPlaybackOrder; themeSongPlaybackOrder = backup.themeSongPlaybackOrder;
      replaceAudioTrailer = backup.replaceAudioTrailer; trailerReplaceAudioOrder = backup.trailerReplaceAudioOrder;
      replaceAudioThemeVideo = backup.replaceAudioThemeVideo; themeVideoReplaceAudioOrder = backup.themeVideoReplaceAudioOrder;
      themeSongDelayedStartSeconds = backup.themeSongDelayedStartSeconds; themeSongEarlyEndSeconds = backup.themeSongEarlyEndSeconds;
      themeSongFadeInSeconds = backup.themeSongFadeInSeconds; themeSongFadeOutSeconds = backup.themeSongFadeOutSeconds;
      themeSongSequenceWindowSeconds = backup.themeSongSequenceWindowSeconds;
      themeSongDelayedStartFirstOnly = backup.themeSongDelayedStartFirstOnly; themeSongFadeFirstOnly = backup.themeSongFadeFirstOnly;
      themeSongStartPosition = backup.themeSongStartPosition; themeSongStartMin = backup.themeSongStartMin; themeSongStartMax = backup.themeSongStartMax;
      trailerReplaceAudioStartPosition = backup.trailerReplaceAudioStartPosition; trailerReplaceAudioStartMin = backup.trailerReplaceAudioStartMin; trailerReplaceAudioStartMax = backup.trailerReplaceAudioStartMax;
      themeVideoReplaceAudioStartPosition = backup.themeVideoReplaceAudioStartPosition; themeVideoReplaceAudioStartMin = backup.themeVideoReplaceAudioStartMin; themeVideoReplaceAudioStartMax = backup.themeVideoReplaceAudioStartMax;
    };
  }
  function triggerAmbientEffect(effect, item) {
    // true unconditionally on every one of these — Ambient Mode ALWAYS
    // wants a same-movie, same-backwall-state transition to leave the
    // wall alone regardless of why this got called again (a genuinely
    // different content type included, which is exactly the case this
    // was added for — see buildBackdropMosaic's own comment on the
    // narrow scope of this check). No OTHER caller anywhere else in the
    // script passes this at all, so nothing outside Ambient Mode is
    // affected by it existing.
    if (effect === 'movie') playMovieOnScreen(item, true);
    else if (effect === 'trailer') startTrailer(item, true);
    else if (effect === 'themevideo') playThemeVideoOnScreen(item, true);
    else if (effect === 'themesong') tryPlayThemeSongForItem(item, true);
    else { fanartWallActive = false; toggleFanartWall(item, true); } // covers 'fanartwall' AND null/Empty alike — both are just "no dedicated content, environment effects only". fanartWallActive is force-reset first since toggleFanartWall TOGGLES — without this, a second consecutive fanartwall/Empty step for the same item would incorrectly turn it OFF instead of re-applying with this step's own settings.
  }
  function clearAmbientSequenceTimer() {
    if (ambientSequenceTimer) { clearTimeout(ambientSequenceTimer); ambientSequenceTimer = null; }
    if (ambientFrontWallEarlyFadeTimer) { clearTimeout(ambientFrontWallEarlyFadeTimer); ambientFrontWallEarlyFadeTimer = null; }
    if (ambientSequenceEndedHandler) {
      trailerVideo.removeEventListener('ended', ambientSequenceEndedHandler);
      themeSongAudio.removeEventListener('ended', ambientSequenceEndedHandler);
      ambientSequenceEndedHandler = null;
    }
    if (ambientSequenceErrorHandler) {
      trailerVideo.removeEventListener('error', ambientSequenceErrorHandler);
      themeSongAudio.removeEventListener('error', ambientSequenceErrorHandler);
      ambientSequenceErrorHandler = null;
    }
    // Restore the pre-existing global 'ended' handlers, whichever branch
    // of playAmbientSequence detached them (see detachGlobalEndedHandlers) —
    // handleVideoEnded, left attached during a step, would call
    // stopTrailer() unconditionally the instant content naturally ends
    // (since the "after X" chase toggles are, correctly, forced off
    // during Ambient Mode — see applyAmbientSequenceState — which makes
    // handleVideoEnded's own "nothing else to do" branch fire), tearing
    // the whole step down before this file's own re-trigger/advance
    // logic, or its OWN duration timer, ever gets to run.
    if (ambientGlobalHandlersDetached) {
      trailerVideo.addEventListener('ended', handleVideoEnded);
      themeSongAudio.addEventListener('ended', handleThemeSongAudioEnded);
      ambientGlobalHandlersDetached = false;
    }
  }
  function stopAmbientMode() {
    if (!ambientRunning) return;
    ambientRequestId++;
    ambientRunning = false;
    ambientFocusActive = false;
    ambientItemId = null;
    ambientLastApplied = null;
    clearAmbientSequenceTimer();
    // Undo the current step's temporary module-state swaps FIRST — see
    // ambientActiveRestore's own comment; this is the only path that
    // reaches a mid-step stop.
    if (ambientActiveRestore) { ambientActiveRestore(); ambientActiveRestore = null; }
    // stopAllPlayback, not just stopTrailer: stopTrailer alone neither
    // resets fanartWallActive (a stale true would make the NEXT normal
    // Fanart Wall click on that same poster read as a toggle-OFF) nor
    // pauses a standalone theme song (only the replace-audio variant) —
    // a running Theme Song step would simply keep playing right through
    // a manual stop otherwise.
    stopAllPlayback();
  }
  // Movie-only, genuinely new Ambient capability — jumps to a random
  // point in the movie once its duration is known, exactly mirroring
  // the Backwall's own "Movie Random Start" (same computeMovieRandomStart
  // function, same min/max-percent shape), just scoped to this one
  // step's own playback instead of a backdrop tile. Never touches
  // playMovieOnScreen itself — purely an ADDITIONAL seek performed after
  // it, entirely from the outside.
  function ambientApplyMovieRandomStart(item, minPct, maxPct, myRunId) {
    function doSeek() {
      // Stale-guarded against BOTH an entirely different Ambient run
      // (myRunId) AND this same run having since moved on from this
      // particular movie (trailerItemId/activeVideoState) — metadata
      // can take a moment to load, plenty of time for either to change.
      if (myRunId !== ambientRequestId || trailerItemId !== item.Id || activeVideoState !== 'movie') return;
      const durationSec = trailerVideo.duration;
      if (!durationSec || !isFinite(durationSec)) return;
      try { trailerVideo.currentTime = computeMovieRandomStart(durationSec, 0, minPct, maxPct); } catch (err) {}
    }
    if (trailerVideo.readyState >= 1 && isFinite(trailerVideo.duration) && trailerVideo.duration > 0) doSeek();
    else trailerVideo.addEventListener('loadedmetadata', doSeek, { once: true });
  }
  // Movie-only, genuinely new Ambient capability — see the long comment
  // beside 'replaceAudio' in ambientDefaultSequence() for why this exists
  // only here and not as a standalone Movie Poster Effect setting.
  // Silencing the movie's own audio needs NO code here at all — that's
  // already handled "for free" by applyAmbientSequenceState forcing volMovie
  // to the step's volume as normal, combined with the step's OWN
  // replaceAudio flag simply never being read by playMovieOnScreen (it
  // has no such concept) — so this only has to layer a SEPARATE audio
  // track on top, exactly like the trailer/theme-video replace-audio
  // mechanism already does with its own two elements playing in sync.
  // Always picks the first available theme song — no separate order
  // picker for this one, unlike trailer/theme-video's own replace-audio
  // (see replaceAudioOrder's own comment on that).
  async function ambientStartMovieReplaceAudio(item, volume, loop, myRunId) {
    try {
      const themeSongData = await jfGet('/Items/' + item.Id + '/ThemeSongs', { userId: session.userId });
      if (myRunId !== ambientRequestId || trailerItemId !== item.Id || activeVideoState !== 'movie') return;
      const song = themeSongData && themeSongData.Items && themeSongData.Items[0];
      if (!song) return; // no theme song to replace with — the movie already plays silently (volMovie forced to 0 above) regardless, so this is a quiet, non-broken degradation rather than a failure
      ensureThemeSongAudio();
      themeSongAudio.volume = volume / 100;
      // Native .loop is disabled whenever Start Position is 'random' —
      // same reasoning as trimActive elsewhere: a looping element never
      // fires 'ended' at all, so a random position picked once would
      // repeat identically forever instead of being freshly re-picked
      // each time. handleThemeSongAudioEnded's own single-track branch
      // takes over the actual re-randomize-and-replay in that case.
      const wantsRandomStart = themeSongStartPosition === 'random';
      themeSongAudio.loop = wantsRandomStart ? false : loop;
      ambientMovieReplaceLoopFlag = loop;
      themeSongAudio.src = session.serverUrl + '/Audio/' + song.Id + '/stream?static=true&api_key=' + session.accessToken;
      themeSongAudio.currentTime = 0;
      themeSongAudioItemId = item.Id;
      themeSongAudioContext = 'ambientMovieReplace';
      // Explicitly cleared, not just left alone — this plays
      // themeSongAudio directly, entirely independent of
      // tryPlayThemeSongForItem (the only place that ever schedules
      // these), so any pending trim/fade timers from an EARLIER genuine
      // Theme Song step must not fire against this completely unrelated
      // replacement track. Bumping the generation counter also
      // invalidates anything already in flight.
      clearThemeSongTimers();
      themeSongPlaythroughGeneration++;
      applyThemeSongStartPosition(themeSongAudio, themeSongStartPosition, themeSongStartMin, themeSongStartMax, themeSongPlaythroughGeneration);
      themeSongAudio.play().catch(() => {});
    } catch (err) {}
  }
  // Incremented once per playAmbientSequence invocation (right at its
  // own top) — a single, reliable "which step is this" marker used by
  // ANY async work started during a step (both the time-based and
  // count-based Front Wall early-fade checks below) to recognize once
  // it resolves whether the step it was started for is still the
  // current one. Deliberately its own thing rather than reusing
  // ambientSequenceTimer for this (an earlier version of the time-based
  // check did) — ambientSequenceTimer isn't assigned until partway
  // through the function, AFTER the very first triggerAmbientEffect
  // call for a step; a count-based step whose duration is exactly 1
  // needs a valid marker to capture at THAT point already, well before
  // ambientSequenceTimer itself would exist for this step at all.
  let ambientStepId = 0;
  async function playAmbientSequence(item, itemId, profile, index, myRunId) {
    if (myRunId !== ambientRequestId) return;
    const myStepId = ++ambientStepId;
    const fullItem = await jfGet('/Users/' + session.userId + '/Items/' + itemId, {});
    if (myRunId !== ambientRequestId) return;
    const resolved = await resolveAmbientSequence(profile, index, itemId, fullItem);
    if (myRunId !== ambientRequestId) return;
    const advance = () => {
      if (myRunId !== ambientRequestId) return;
      clearAmbientSequenceTimer();
      const nextIndex = index + 1;
      if (nextIndex < profile.sequenceCount) { playAmbientSequence(item, itemId, profile, nextIndex, myRunId); return; }
      if (profile.loop) { playAmbientSequence(item, itemId, profile, 0, myRunId); return; }
      stopAmbientMode();
    };
    if (resolved.effect === 'skip') { advance(); return; }
    const settings = resolved.settings;
    // Count-based duration re-triggers the SAME content type N separate
    // times via this file's OWN 'ended' listener below — but trailer/
    // theme video/theme song already have their OWN independent
    // multi-item queue-advance behavior (their "Play All"/"Play All
    // Random" Playback Order), which listens on the exact same 'ended'
    // event. Left alone, BOTH would react to one single 'ended' firing:
    // the existing queue-advance would start playing the next queued
    // item, and then this step's own listener would immediately
    // interrupt THAT by re-triggering a fresh, unrelated playthrough —
    // a real race, not just a redundant no-op. Forcing a single-item
    // Playback Order specifically for a count-based step sidesteps this
    // entirely: there's never more than one item queued, so the
    // existing queue-advance always finds nothing to do and stays
    // silent, leaving this step's own listener as the only thing
    // reacting. Time-based steps are NOT touched by this — they never
    // attach a competing listener in the first place (see below), so
    // the step's own configured Playback Order (including "Play All"/
    // "Play All Random") is free to apply normally there.
    // Count-based steps additionally force loop OFF regardless of the
    // step's own Loop setting: the count mechanism waits for natural
    // 'ended' firings, but a step-level Loop would be written into the
    // module loop toggle and end up as the native video.loop property —
    // under which 'ended' NEVER fires at all, so the play counter would
    // never tick and the step would hang forever. "Play N times" and
    // "loop endlessly" contradict each other anyway; N times wins here.
    // Time-based steps keep their Loop untouched — there it's exactly
    // what makes shorter-than-the-set-time content fill the full time.
    const effectiveSettings = (settings.durationType === 'count' && (resolved.effect === 'movie' || resolved.effect === 'trailer' || resolved.effect === 'themevideo' || resolved.effect === 'themesong'))
      ? { ...settings, loop: false, playbackOrder: (settings.playbackOrder === 'all' || settings.playbackOrder === 'shuffled') ? 'first' : settings.playbackOrder }
      : { ...settings };
    // Sanitized ONCE here, at the single point every consumer below
    // reads from (both the time-based setTimeout and the count-based
    // "remaining" counter) — durationValue normally can't be anything
    // but a clamped positive integer (the menu enforces that on save),
    // but a hand-edited config is a real, reachable way for it to
    // arrive as a non-numeric string or 0/negative instead. Math.max(1,
    // x) alone does NOT catch this — Math.max(1, NaN) is itself NaN,
    // which would make a count-based step's "remaining <= 0" check
    // false forever (hanging the step permanently) and a time-based
    // step's setTimeout delay NaN (which HTML5 coerces to firing almost
    // immediately, cutting the step absurdly short) — parseInt(...) ||
    // 1 mirrors the exact same fallback saveAmbientSequence already uses
    // when writing a fresh value FROM the menu, just applied again here
    // so a value that reached this point some OTHER way is covered too.
    // effectiveSettings is ALWAYS its own fresh copy (both branches
    // above spread settings into a new object) specifically so this
    // assignment can never mutate the real, persisted step object that
    // "settings"/resolved.settings still points to.
    effectiveSettings.durationValue = Math.max(1, parseInt(effectiveSettings.durationValue, 10) || 1);
    const appliedSnapshot = { effect: resolved.effect, env: effectiveSettings.env.slice(), volume: effectiveSettings.volume, loop: effectiveSettings.loop, playbackOrder: effectiveSettings.playbackOrder, replaceAudio: effectiveSettings.replaceAudio, replaceAudioOrder: effectiveSettings.replaceAudioOrder };
    const canSkipRetrigger = resolved.effect !== null && ambientSameAppliedState(ambientLastApplied, appliedSnapshot);
    if (canSkipRetrigger) {
      // Nothing about what's actually playing needs to change at all —
      // the disruptive re-trigger (which is what tears the backdrop wall
      // down and rebuilds it, and would restart the video/audio from the
      // top for no real reason) is skipped entirely. ambientActiveRestore
      // is deliberately left exactly as it already was, UNTOUCHED — it
      // still correctly points at whichever EARLIER sequence's own
      // applyAmbientSequenceState call is the one actually holding the
      // true pre-Ambient backup for this whole unbroken streak of
      // identical sequences. Restoring it is explicitly NOT this
      // sequence's job — see the comment beside the "genuinely
      // different state" branch below for why that decision was moved
      // there instead.
    } else {
      // A genuinely different state is about to take over. Whatever the
      // PREVIOUS streak (if any — there may be none yet, e.g. this is
      // the very first sequence) had applied gets undone HERE, right
      // before establishing the new one — NOT inside restoreThenAdvance
      // below, which used to run unconditionally at the end of every
      // single sequence regardless of whether the next one continued
      // the exact same streak. That was a real bug: it would have
      // restored the true pre-Ambient values back FAR too early, the
      // instant the first sequence in a same-state streak finished,
      // rather than only once the whole streak actually ends.
      if (ambientActiveRestore) {
        // Only relevant for a movie sequence that was replacing its own
        // audio — themeSongAudio.pause() is always safe to call even
        // when nothing of the sort was active (e.g. already paused)
        // since Ambient Mode fully owns room/audio state for as long as
        // it's running.
        if (ambientLastApplied && ambientLastApplied.effect === 'movie' && ambientLastApplied.replaceAudio) { try { themeSongAudio.pause(); } catch (err) {} }
        ambientActiveRestore();
      }
      ambientActiveRestore = applyAmbientSequenceState(resolved.effect, effectiveSettings);
      ambientLastApplied = appliedSnapshot;
    }
    const restoreThenAdvance = () => { advance(); };
    if (!canSkipRetrigger) {
      const firstTriggeredAt = performance.now();
      triggerAmbientEffect(resolved.effect, item);
      if (myRunId !== ambientRequestId) { ambientActiveRestore(); ambientActiveRestore = null; return; }
      // Count-based Front Wall early-fade, N=1 case: this very first
      // trigger IS also the only/final one (a later re-trigger inside
      // ambientSequenceEndedHandler never happens at all when there's
      // only one play total) — checked with the SAME "not usesTimeDuration"
      // condition that branch itself uses further down, computed inline
      // here since usesTimeDuration itself isn't assigned until after
      // this point.
      const isCountBased = settings.durationType !== 'time' && resolved.effect !== 'fanartwall' && resolved.effect !== null;
      if (isCountBased && effectiveSettings.durationValue === 1) {
        scheduleFrontWallEarlyFadeForFinalThemeSongPlay(resolved, effectiveSettings, profile, itemId, fullItem, index, myRunId, myStepId, firstTriggeredAt);
      }
      if (resolved.effect === 'movie') {
        // Both of these are genuinely NEW, Ambient-only capabilities (see
        // the long comments beside movieStartMode/replaceAudio in
        // ambientDefaultSequence()) — neither touches playMovieOnScreen
        // itself, both work purely by piggybacking on module state that
        // function already reads (trailerVideo directly for the seek;
        // volMovie, already forced to 0 by applyAmbientSequenceState above
        // whenever replaceAudio is on, silences the movie's own audio
        // "for free" with no separate muting step needed here at all).
        if (effectiveSettings.movieStartMode === 'random') ambientApplyMovieRandomStart(item, effectiveSettings.movieStartMin, effectiveSettings.movieStartMax, myRunId);
        if (effectiveSettings.replaceAudio) ambientStartMovieReplaceAudio(item, effectiveSettings.volume, effectiveSettings.loop, myRunId);
      }
    }
    // Fanart Wall (and Empty/null, which is mechanically the same thing
    // — see applyAmbientSequenceState's own envKey fallback) has no
    // "playthrough" of its own to count at all — deciding this by EFFECT
    // here, not by trusting whatever durationType happens to be STORED,
    // means a hand-edited config that set fanartwall + 'count' can't
    // silently misbehave (the old code fell through to a bare 50ms
    // instant-tick fallback in that case, completely ignoring whatever
    // durationValue was configured) — the value is always read as
    // seconds for this effect, full stop, regardless of what durationType
    // says.
    const usesTimeDuration = settings.durationType === 'time' || resolved.effect === 'fanartwall' || resolved.effect === null;
    if (usesTimeDuration) {
      // Detached here too (not just in the count-based branch below) —
      // if this step's Loop is OFF and its content happens to be
      // SHORTER than the configured time, it naturally fires 'ended'
      // before this timer does; with Loop ON, the native video.loop
      // property (set in applyAmbientSequenceState) makes the browser loop
      // it internally and 'ended' never fires at all, so detaching here
      // is harmless in that case — only ever relevant, but always safe.
      detachGlobalEndedHandlers();
      // Longer-than-the-set-time content is simply cut off once this
      // timer fires — moving on regardless of whether it actually
      // finished.
      ambientSequenceTimer = setTimeout(restoreThenAdvance, effectiveSettings.durationValue * 1000);
      // Front Wall's own early-fade head start — see
      // ambientFrontWallEarlyFadeTimer's own comment for the full
      // reasoning. Only even worth checking when THIS step is genuinely
      // showing Front Art itself (not a video effect, and 'screen' env
      // on) AND the per-sequence Front Art Early Fade Out field is
      // nonzero — 0 (the shared baseline default) means this feature is
      // off for this step entirely, same as before it existed at all.
      // Fire-and-forget: the peek runs in the background while the rest
      // of this step proceeds completely normally either way; it only
      // ever ADDS the extra timer if/when it resolves, never blocks or
      // delays anything else.
      const showsFrontArt = effectiveSettings.frontArtEarlyFadeSeconds > 0 && resolved.effect !== 'movie' && resolved.effect !== 'trailer' && resolved.effect !== 'themevideo' && effectiveSettings.env.includes('screen');
      if (showsFrontArt) {
        // Step start, T=0 — the SAME reference point ambientSequenceTimer
        // itself just counted from a line up. peekAmbientNextIsVideo does
        // real async work of its own (ambientEffectAvailable's own
        // network-backed checks, potentially several in a row if it has
        // to cascade past a 'skip'), which takes a genuinely
        // non-negligible, variable amount of real time to resolve — a
        // FRESH (durationValue - frontArtEarlyFadeSeconds)s count
        // starting only once THAT finished (an earlier version of this
        // fix) landed measurably late, or — on a short step — sometimes
        // not at all, since the "is this step even still current" guard
        // below would already correctly see the step had moved on by
        // the time it fired. Measuring elapsed real time and
        // subtracting it keeps this synchronized against the step's own
        // true start, exactly like the main timer already is,
        // regardless of how long the peek itself happened to take.
        const frontWallStepStartedAt = performance.now();
        peekAmbientNextIsVideo(profile, itemId, fullItem, index + 1, myRunId).then((nextIsVideo) => {
          // Both staleness checks matter here, for different reasons:
          // myRunId covers a whole different Ambient run (a different
          // item, or Ambient stopped and restarted) having started in
          // the meantime; comparing against myStepId/ambientStepId
          // covers this SAME run having already moved past this step
          // some other way (a re-trigger, an early manual advance) by
          // the time this async peek finally resolves — either one
          // means scheduling this extra timer now would target a step
          // that isn't even the current one anymore.
          if (!nextIsVideo || myRunId !== ambientRequestId || ambientStepId !== myStepId) return;
          const elapsedMs = performance.now() - frontWallStepStartedAt;
          const earlyMs = Math.max(0, (effectiveSettings.durationValue - effectiveSettings.frontArtEarlyFadeSeconds) * 1000 - elapsedMs);
          ambientFrontWallEarlyFadeTimer = setTimeout(() => {
            ambientFrontWallEarlyFadeTimer = null;
            if (myRunId !== ambientRequestId || ambientStepId !== myStepId) return;
            if (fallbackImageMesh) fallbackImageTargetOpacity = 0;
            if (screenLogoMesh) screenLogoTargetOpacity = 0;
          }, earlyMs);
        });
      }
    } else {
      // Count-based: wait for exactly N natural end-to-end playthroughs.
      // Only ever reached for movie/trailer/themevideo/themesong now —
      // fanartwall/Empty are already routed into the time-based branch
      // above unconditionally, so this doesn't need its own fallback
      // for "some other effect" anymore.
      let remaining = effectiveSettings.durationValue;
      detachGlobalEndedHandlers();
      // el read only AFTER the detach above — that call also lazily
      // CREATES themeSongAudio if no theme song has played yet this
      // session (it starts as null); grabbing it any earlier would
      // capture null and crash on el.addEventListener below.
      const el = resolved.effect === 'themesong' ? themeSongAudio : trailerVideo;
      ambientSequenceEndedHandler = () => {
        if (myRunId !== ambientRequestId) return; // defensive — clearAmbientSequenceTimer already removes this listener on stop/restart, so this shouldn't be reachable stale, but costs nothing to guard anyway
        remaining--;
        if (remaining <= 0) { restoreThenAdvance(); return; }
        // Re-trigger the SAME content again for the next of the N plays.
        const retriggeredAt = performance.now();
        triggerAmbientEffect(resolved.effect, item);
        // remaining === 1 here means THIS retrigger is the last of the N
        // plays — same N=1 case handled right after the very first
        // trigger, above, just reached via a later replay instead.
        if (remaining === 1) {
          scheduleFrontWallEarlyFadeForFinalThemeSongPlay(resolved, effectiveSettings, profile, itemId, fullItem, index, myRunId, myStepId, retriggeredAt);
        }
      };
      // Count-based duration has no OTHER time bound — unlike the
      // time-based branch above, nothing here ever fires if playback
      // technically starts but then fails partway (network hiccup,
      // transient server/transcode error) without ever reaching a
      // natural end. checkTrailerAvailability/etc only confirmed the
      // content EXISTS, not that this specific playback attempt will
      // succeed. Without a safety net, a single failed attempt hangs
      // the ENTIRE Ambient sequence on this one step forever. 'error'
      // reacts immediately to an actual playback failure; the 6-hour
      // backstop timer is a last resort for the rarer case where
      // nothing fires at all (a request that neither completes nor
      // errors) — deliberately far longer than any realistic single
      // playthrough so it can never cut off legitimately long content.
      ambientSequenceErrorHandler = () => { if (myRunId === ambientRequestId) restoreThenAdvance(); };
      el.addEventListener('error', ambientSequenceErrorHandler);
      ambientSequenceTimer = setTimeout(() => { if (myRunId === ambientRequestId) restoreThenAdvance(); }, 6 * 60 * 60 * 1000);
      el.addEventListener('ended', ambientSequenceEndedHandler);
    }
  }
  function startAmbientMode(item) {
    // Pressing it on a DIFFERENT poster while one is already running
    // seamlessly switches straight to the new one in a single press
    // (stops the old one, starts the new one, no second press needed).
    // Pressing it again on the SAME poster fully RESTARTS the sequence
    // from Sequence 1 — NOT a toggle-off like every other Poster Effect.
    // Ambient's own accumulated state (which step is active, its
    // temporary env/volume overrides, pending timers) made a second
    // trigger on the same item behave inconsistently when it was
    // treated as a plain stop, which read as buggy rather than as the
    // clean fresh restart a repeat trigger is actually meant to give.
    if (ambientRunning) stopAmbientMode();
    const profileNum = ambientEditingProfile;
    const profile = ambientData[profileNum];
    if (!profile || profile.sequenceCount < 1) return;
    // Guaranteed clean slate for the very FIRST sequence's own content
    // display, regardless of what happened to this same item BEFORE
    // Ambient Mode was ever asked to run — not just "whatever the last
    // Ambient run left behind" (stopAmbientMode already handles that
    // fully via stopAllPlayback/stopTrailer's own teardown). Both of
    // these track "is the CURRENTLY VISIBLE content already exactly
    // this?" purely by a fullItem.Id + env-state key — a genuine visual
    // reset can happen through some OTHER path (closing this exact same
    // item's own config menu without an explicit stop in between, a
    // manual toggle earlier in the session, etc.) that leaves the KEY
    // stale even though nothing is actually showing anymore. Sequence
    // 1's own trigger, moments after this, passes allowSkipIfUnchanged
    // as always — without invalidating both keys here first, a stale
    // match would silently skip loading the real content while the
    // wall's own plain background color/dim state (which isn't gated by
    // either key) still updated normally, exactly the "wall goes black
    // but Front Art never appears" bug this fixes.
    backdropLastBuiltKey = null;
    screenArtLastShownKey = null;
    ambientRequestId++;
    const myRunId = ambientRequestId;
    ambientRunning = true;
    ambientFocusActive = true;
    ambientItemId = item.Id;
    playAmbientSequence(item, item.Id, profile, 0, myRunId);
  }
  function executeContextMenuAction(action) {
    const item = contextMenuItem, url = contextMenuUrl;
    closeContextMenu();
    if (!item) return;
    // Kiosk Movie Search's own "keep this poster's light on regardless
    // of light/effect state, so I can spot it immediately" only lasts
    // until SOME poster effect gets deliberately activated somewhere —
    // any one, not just this exact poster (see the per-frame posterLights
    // loop's own comment, in animate(), for the actual override). Cleared here,
    // unconditionally, before branching on WHICH action — it's the one
    // spot every poster effect trigger already funnels through.
    movieSearchHighlightId = null;
    // Any action OTHER than Ambient Mode itself always stops a running
    // Ambient sequence first — its own step-advancement timer/listener
    // would otherwise keep running unattended in the background,
    // eventually firing and yanking control away from whatever the
    // person just started manually. Ambient Mode's own trigger handles
    // stopping (or seamlessly switching) itself, in startAmbientMode.
    if (action !== 'ambient') stopAmbientMode();
    if (action === 'trailer') return startTrailer(item);
    else if (action === 'movie') return playMovieOnScreen(item);
    else if (action === 'library') { openLibraryUrl(url); refreshFanartWallIfActive(item); }
    else if (action === 'themesong') return tryPlayThemeSongForItem(item);
    else if (action === 'themevideo') return playThemeVideoOnScreen(item);
    else if (action === 'fanartwall') toggleFanartWall(item);
    else if (action === 'ambient') startAmbientMode(item);
  }
  // Kiosk Movie Search's own found-movie poster ID, kept lit at its full
  // natural brightness regardless of dimLevel/posterlight/pin-light state
  // — see the per-frame posterLights loop's own comment (inside
  // animate()) for the actual override, and executeContextMenuAction's
  // own comment for where this gets cleared again.
  let movieSearchHighlightId = null;
  let trailerActive = false;
  let isStaticDisplay = false;
  let screenLogoMesh = null;
  const trailerAvailabilityCache = {};
  // Only meaningful once a Playback Order that can queue more than one
  // song is active — see updateThemeSongFirstOnlySubState, which grays
  // both out otherwise (kept visible-but-inert rather than hidden, same
  // convention as every other conditionally-relevant field in this menu).
  // No longer a standalone-configurable setting — Early End made sense
  // for Ambient Mode (where a step has its own outer sequence duration
  // to stay cleanly within) but not for the standalone Theme Song
  // effect, which just plays through or loops on its own. Hardcoded to
  // 0 (off) here rather than loaded from any saved setting — Ambient
  // still fully owns and restores this variable around its own
  // per-sequence value exactly as before (see applyAmbientSequenceState),
  // this only removes the STANDALONE path that used to also feed into
  // the very same shared module variable.
  let themeSongEarlyEndSeconds = 0;
  // Ambient-only, never loaded from any setting — set (and restored)
  // exclusively by applyAmbientSequenceState, exactly like the four
  // trim/fade values above, but with a different purpose: when an
  // Ambient step's own Duration Type is 'time' (a fixed number of
  // seconds, known upfront — NOT the audio file's own metadata
  // duration, which needs an async 'loadedmetadata' round-trip to even
  // discover), Early End and Fade Out apply relative to THIS window
  // instead of the song file's own length. 0 means "not applicable" —
  // standalone playback (never set) and Ambient's own 'count'-based
  // durations (no fixed time window to reference at all) both fall
  // back to the original file-duration-based scheduling further down.
  let themeSongSequenceWindowSeconds = 0;
  // Delayed Start/Early End/Fade In/Fade Out are all driven by real
  // setTimeout/setInterval timers now, NOT the requestAnimationFrame-based
  // render loop (animate()) they originally lived in — rAF is throttled
  // or fully suspended by the browser whenever the tab/window isn't the
  // active, visible one, which a background cinema display very
  // plausibly is for long stretches. A plain timer keeps running
  // regardless (browsers only clamp its MINIMUM interval in a
  // backgrounded tab, they don't suspend it outright), which is exactly
  // why base playback (a one-time .play()/.volume call, no per-frame
  // dependency at all) kept working fine while all four of these
  // silently never did.
  let themeSongDelayTimer = null; // setTimeout: waiting out Delayed Start before .play() is even called
  let themeSongFadeTimer = null; // setInterval: an in-progress Fade In or Fade Out ramp
  let themeSongFadeOutTimer = null; // setTimeout: waiting to START a Fade Out ramp
  let themeSongEndTimer = null; // setTimeout: Early End's own stop/loop-restart point
  // Bumped every time a NEW theme song playthrough begins (Delayed Start
  // requested or not) — every scheduled timer/listener below closes over
  // the value it was started with and checks it against the CURRENT one
  // before doing anything, so a stale timer from a playthrough that's
  // since been superseded (a different item locked, Ambient moved on,
  // manual stop) can never act on the wrong audio.
  let themeSongPlaythroughGeneration = 0;
  let themeSongReplacingActive = false;
  let activeVideoState = null;
  let activeVideoItem = null;
  let activeEnvState = null;
  let actionRequestId = 0;
  function envEnabled(effect) {
    if (!activeEnvState) return true;
    const sel = multiSelectState[activeEnvState];
    return !sel || sel.includes(effect);
  }
  let trailerItemId = null;
  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  // A few pixels of tolerance around the exact crosshair center — only
  // for CLICK-TRIGGERED raycasts (raycastTarget/raycastPosterHit), not
  // the continuous per-frame hover check, so hover itself stays exactly
  // as precise as it always was. Genuinely fixing every possible cause
  // of an occasional missed click isn't practical from here (aiming
  // precision, network/render hitches, and more could all contribute),
  // but this adds real redundancy for the single most common one:
  // aiming that's a hair off-center of a small or distant poster. Five
  // points — dead center first (always tried, always wins if it hits
  // something), then a small diamond of four offsets around it, only
  // consulted if center itself comes up empty.
  const CLICK_RAYCAST_OFFSETS = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.015, 0), new THREE.Vector2(-0.015, 0),
    new THREE.Vector2(0, 0.015), new THREE.Vector2(0, -0.015),
  ];
  // Shared by raycastTarget/raycastPosterHit — tries each offset in
  // turn, returns the full hit (not just userData or just the object)
  // from the first one that lands on something within range, so both
  // callers can pull whichever piece they each actually need from it.
  function raycastPosterHitRedundant() {
    camera.updateMatrixWorld(true);
    for (const offset of CLICK_RAYCAST_OFFSETS) {
      raycaster.setFromCamera(offset, camera);
      const hits = raycaster.intersectObjects(clickablePosters);
      if (hits.length > 0 && hits[0].distance < 3.5) return hits[0];
    }
    return null;
  }
  let dimTarget = 0;
  let dimLevel = 0;
  // Shared "how bright is the room right now" factor (0 = fully dim, 1 =
  // fully lit) — the single source every ambient-lit visual effect reads
  // from, so they're all guaranteed to move in lockstep with the room's
  // real lighting (and therefore with each other) rather than each
  // computing its own slightly-different version of the same idea.
  // Originally only wallBlend used this inline; the floor indicator used
  // to be driven by trailerActive instead, which — unlike dimLevel —
  // resets on every Ambient Mode step transition regardless of whether
  // the room's actual light state changed at all, causing it to visibly
  // flicker in step with content type (video-playing steps vs. not)
  // rather than with the light. dimLevel itself doesn't have that
  // problem: adjacent Ambient steps deliberately sharing the same 'dim'
  // Environment Effect (see AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE's
  // own profile content) already means it never has a reason to jump
  // between them, seamless by construction rather than by any special-
  // casing here.
  function roomBrightnessFactor() {
    return 1 - dimLevel;
  }
  function setDim(active) {
    dimTarget = active ? 1 : 0;
  }
  // "Front Wall" (screenMat, the plain wall material behind/around the
  // actual video mesh — visible whenever nothing is playing a video, or
  // there's no map on it) switches between BLACK/off (0x000000/
  // 0x000000/intensity 0) and GREY/lit (0x767680/0x45454e/intensity
  // 0.6). Video playing or Front Art actively showing always force it
  // fully black, unconditionally — screenMatForceBlack, set true by
  // those call sites, drives that instantly (matches how it always
  // worked; no transition was ever wanted going INTO that state).
  // Everywhere else (nothing forcing it), it's driven DIRECTLY by
  // dimLevel itself — the exact same variable the room's own lighting
  // uses, not a separate independently-timed fade — so the wall and the
  // light it's sitting in are GUARANTEED to move in lockstep, by
  // construction, rather than by two different lerp rates hopefully
  // looking similar. This replaces an earlier version that gave
  // screenMat its own dedicated target + rate-4 lerp — visually
  // reasonable on its own, but never actually tied to what the room's
  // general lighting was doing, which is what was asked for.
  let screenMatForceBlack = false;
  // Smoothly tracks screenMatForceBlack itself (0 = not forced, 1 =
  // fully forced) — entering/leaving forced-black used to be an instant
  // snap; this fades it too, at the same rate as everything else on
  // this wall, while the dim-driven portion (wallBlend's own comment,
  // further down) stays untouched and still perfectly in sync with the
  // room lighting.
  let screenMatForceBlackLevel = 0;
  const SCREEN_MAT_LIT_COLOR = new THREE.Color(0x767680);
  const SCREEN_MAT_LIT_EMISSIVE = new THREE.Color(0x45454e);
  const SCREEN_MAT_BLACK_COLOR = new THREE.Color(0x000000);
  // Jellyfin Cinema Project logo+wordmark on the backdrop wall (marqueeMesh) —
  // used to snap between fully shown and fully hidden via a plain
  // .visible = true/false toggle, no transition at all. Now driven by
  // opacity instead, faded via the animate() loop below — .visible
  // itself stays permanently true from here on (nothing else in this
  // file ever reads it, only ever writes it, so there's nothing that
  // depended on it going false), with opacity 0 doing the actual
  // "hidden" job instead. Starts at 1, matching the material's own true
  // creation-time default (no explicit opacity set on it, so THREE's
  // own default of 1 applies) — same reasoning as screenMat's own
  // earlier startup-mismatch bug: the target here has to agree with
  // reality from frame one, not fight its way there from a wrong
  // assumed starting point.
  let marqueeTargetOpacity = 1;
  // Only the REAPPEAR side of this gets a delay (see stopAllPlayback's
  // own use below) -- disappearing (target set to 0, e.g. when backwall
  // tiles take over) stays instant, as before. Standard clear-before-
  // reschedule pattern, same as themeSongDelayTimer/ambientSequenceTimer
  // elsewhere in this file.
  let marqueeReappearTimer = null;
  // Front Art's two possible meshes (fallbackImageMesh: the actual
  // backdrop/thumb/poster image; screenLogoMesh: the small title logo
  // shown alongside a Backdrop-sourced image specifically) — same
  // .visible-stays-permanently-true-once-created, opacity-does-the-
  // real-hiding treatment as the marquee above, for the same reason
  // (neither is ever READ for .visible as a MEANINGFUL check outside
  // refreshScreenContentFit's own cheap re-fit guard, which staying
  // permanently true just means it re-fits a little more often than
  // strictly necessary — harmless). Both start at 0 rather than
  // needing a marquee-style "must match the material's own creation
  // value" concern — unlike marquee, these two don't exist at all until
  // the moment they're first created WITH a real target already about
  // to be set moments later, so there's no window where a wrong
  // default could ever be visible.
  let fallbackImageTargetOpacity = 0;
  let screenLogoTargetOpacity = 0;
  function fitCover(tex, planeW, planeH) {
    const iw = tex.image.width, ih = tex.image.height;
    const imgAspect = iw / ih, boxAspect = planeW / planeH;
    if (imgAspect > boxAspect) {
      const scale = boxAspect / imgAspect;
      tex.repeat.set(scale, 1);
      tex.offset.set((1 - scale) / 2, 0);
    } else {
      const scale = imgAspect / boxAspect;
      tex.repeat.set(1, scale);
      tex.offset.set(0, (1 - scale) / 2);
    }
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function stopAllPlayback() {
    actionRequestId++;
    stopTrailer();
    if (themeSongAudio && !themeSongAudio.paused) themeSongAudio.pause();
    themeSongAudioContext = null;
    themeSongChannel.queue = [];
    trailerReplaceChannel.queue = [];
    themeVideoReplaceChannel.queue = [];
    fanartWallActive = false;
    fanartWallItemId = null;
    // Moved here from stopTrailer's own general teardown — this is the
    // ONE place that only ever runs on a genuine, final stop (never on
    // an ordinary content switch, where the incoming content's own
    // buildBackdropMosaic/showNoTrailerDisplay correctly decides this
    // instead, moments later). Setting it unconditionally inside
    // stopTrailer used to run on EVERY teardown regardless of whether
    // new content was about to follow, briefly showing the marquee
    // (with its own ~1s fade) before the new content's own logic set it
    // back — a visible flash-then-hide on ordinary poster/menu
    // switches that never should have shown it at all.
    room.marqueeMesh.visible = true;
    // A 1-second delay before the marquee actually fades back in here
    // specifically (a genuine, final stop — Escape, or a poster effect
    // simply finishing on its own) — reappearing instantly read as too
    // abrupt/jarring right after stopping something. Disappearing stays
    // immediate; only this direction is delayed.
    if (marqueeReappearTimer) clearTimeout(marqueeReappearTimer);
    marqueeReappearTimer = setTimeout(() => {
      marqueeReappearTimer = null;
      marqueeTargetOpacity = 1;
    }, 1000);
    // Cancels any theme song timer STILL PENDING — most importantly
    // Delayed Start, which hasn't called .play() yet at all by design
    // (it's deliberately silent, waiting out its own delay), so the
    // .pause() call two lines up does nothing for it: there's no
    // playback yet FOR it to pause. Without this, a stop reached while
    // a Delayed Start (or a scheduled Fade Out/Early End) was still
    // counting down left that timer completely unaffected — it fired
    // later regardless, starting audio seemingly out of nowhere well
    // after everything visibly looked stopped. Bumping the generation
    // counter on top of clearing the timers themselves also invalidates
    // any already-in-flight closure (e.g. one waiting on
    // 'loadedmetadata') that hasn't fired yet.
    clearThemeSongTimers();
    themeSongPlaythroughGeneration++;
  }
  function stopTrailer(keepDim, allowSkipIfUnchanged) {
    trailerVideo.pause();
    if (!trailerActive) return;
    if (themeSongReplacingActive && themeSongAudio) themeSongAudio.pause();
    themeSongReplacingActive = false;
    // Everything in this block is pure VISUAL teardown — tearing the
    // backdrop wall down, resetting the screen material, hiding every
    // screen-content mesh, killing the dim animation target. Skipped
    // outright when a caller explicitly opts in (currently only Ambient
    // Mode's own content-switch calls do) — this used to run
    // UNCONDITIONALLY as the very first thing every one of the five
    // content functions did, which meant the skip-if-unchanged checks
    // inside buildBackdropMosaic/showNoTrailerDisplay (further down in
    // each of those same functions, called moments later) were
    // pointless in practice: by the time they ran, everything they'd
    // have decided to LEAVE alone had already been torn down right
    // here. Safe to skip in full: whichever of these pieces genuinely
    // DOES need to change gets torn down and rebuilt by buildBackdropMosaic/
    // showNoTrailerDisplay's own existing, unconditional-when-actually-
    // rebuilding logic anyway — this was always a redundant SECOND
    // teardown of the same things, not the only one.
    if (!allowSkipIfUnchanged) {
      room.screenMat.map = null;
      room.screenMat.emissiveMap = null;
      if (!keepDim) screenMatForceBlack = false;
      // Marquee is now handled at the two genuine endpoints only —
      // stopAllPlayback (a real, final stop) sets it to show, and
      // buildBackdropMosaic/showNoTrailerDisplay's own existing logic
      // decides it correctly on every content switch. Unconditionally
      // showing it right here, before either of those has a chance to
      // run, used to create a brief flash-then-hide-again window on
      // ordinary content switches — a real stop no longer needs this
      // line either, since stopAllPlayback (which calls this function)
      // now sets it directly, itself, once, at the point that's
      // actually final.
      // Whatever's currently on the backdrop wall fades out first, same
      // 400ms treatment as buildBackdropMosaic's own rebuild-time fade
      // — this used to clear the group INSTANTLY here instead, with no
      // transition at all. That went unnoticed for content SWITCHES
      // (buildBackdropMosaic runs again moments later regardless,
      // supplying its own fade on the way back up), but this teardown
      // is the ONLY thing that ever touches the backdrop group on a
      // genuine full STOP — nothing calls buildBackdropMosaic again
      // afterward to fade it out properly. The wall/disc art used to
      // visibly snap away instantly while the screen material and the
      // room lighting were both still gradually fading at the same
      // moment, reading as an out-of-sync, jarring transition even
      // though each individual piece was smooth on its own.
      const myStopBuildId = ++backdropBuildId;
      const finishBackdropTeardown = () => {
        if (myStopBuildId !== backdropBuildId) return; // a newer build/teardown has since taken over the wall
        room.backdropGroup.clear();
        currentBackdropMode = null;
        discPivot = null;
        realDiscArtActive = false;
        gridTileInfo = [];
        bgFadeList = [];
      };
      // Cleared HERE, immediately — not deferred until finishBackdropTeardown
      // actually runs — so that ANY buildBackdropMosaic call arriving
      // before the 400ms fade completes (e.g. Ambient Mode immediately
      // restarting on the very same item, same backwall/disc settings)
      // correctly sees no matching key and rebuilds for real, rather than
      // reading the still-fresh OLD key as "nothing changed" and wrongly
      // skipping — which would leave the wall permanently empty once this
      // fade-out's own delayed clear ran a moment later with nothing
      // rebuilt behind it. buildKey itself can't be recomputed here (no
      // fullItem/envEnabled context available in this function), so this
      // just invalidates the stored key outright instead.
      backdropLastBuiltKey = null;
      stopBackdropShuffle();
      gridTileInfo.forEach((info) => { abortPendingSwap(info); disposeTileVideo(info); });
      if (bgFadeList.length || gridTileInfo.length) {
        bgFadeList.forEach((mat) => { mat.__fadeTarget = 0; });
        gridTileInfo.forEach((info) => { if (info.mat) info.mat.__fadeTarget = 0; });
        // 1500ms, not the material fade's own default rate's exact
        // theoretical completion point — the per-frame lerp
        // (mat.__fadeRate || 3, documented elsewhere as "~1s perceived
        // fade") asymptotically approaches 0 but mathematically never
        // truly reaches it, and every material here doesn't necessarily
        // share the exact same rate (disc art's own materials use the
        // same default 3 as regular tiles, but nothing guarantees that
        // stays true forever). Cutting the wait at a flat 400ms — well
        // under half of what a rate-3 fade actually needs to become
        // visually negligible — was the actual bug: everything LOOKED
        // like it had a fade, but was still meaningfully visible
        // (~15-30% opacity) at the exact moment this fired and yanked
        // it away outright, reading as a sudden vanish partway through
        // its own fade rather than a completed one. 1500ms comfortably
        // clears a rate-3 fade's own ~1s with a small margin, while
        // still being short enough not to read as a sluggish stop.
        setTimeout(finishBackdropTeardown, 1500);
      } else {
        finishBackdropTeardown();
      }
      if (screenLogoMesh) screenLogoTargetOpacity = 0;
      if (fallbackImageMesh) fallbackImageTargetOpacity = 0;
      if (videoScreenMesh) videoScreenMesh.visible = false;
      // Same reasoning as backdropLastBuiltKey just above — hiding these
      // meshes here without also invalidating the key they're tracked
      // under left showNoTrailerDisplay's own skip check thinking
      // nothing had changed on an immediate restart with the same
      // item/screen settings, so it never re-showed them.
      screenArtLastShownKey = null;
      if (!keepDim) setDim(false);
    }
    isStaticDisplay = false;
    trailerActive = false;
    refreshInstructions();
    // Only nulled on a GENUINE stop (allowSkipIfUnchanged false/absent)
    // — not on an Ambient Mode content-switch (allowSkipIfUnchanged
    // true), where new content is already known to be arriving
    // immediately after this same call returns. Unlike trailerActive
    // just above (which correctly resets unconditionally — see its own
    // comment a few dozen lines up on why other things genuinely need
    // that), these four staying at their PREVIOUS values for the brief
    // async gap between this call and the new content's own eventual
    // re-assignment is exactly what keeps them meaningful throughout
    // that gap instead of misleadingly reading as "nothing at all is
    // active" for a moment. Confirmed directly: this gap (this
    // function's own trailerItemId=null, through the new content's own
    // later jfGet-await-then-reassign) was long enough to render
    // several real frames — every OTHER poster's Poster Light beam,
    // which reads trailerItemId every single frame (unlike backwall/
    // screen/disc/dim, which only ever get read once per genuine
    // rebuild, always well after the new step's own state has already
    // been re-established), would flash back to full brightness for
    // that whole stretch before dimming again once the new item's ID
    // landed — even on an Ambient Mode step-to-step transition whose
    // Poster Light setting never actually changed at all.
    if (!allowSkipIfUnchanged) {
      trailerItemId = null;
      activeVideoState = null;
      activeVideoItem = null;
      activeEnvState = null;
    }
    trailerChannel.queue = [];
    themeVideoChannel.queue = [];
    instructionsEl.innerHTML = baseInstructions();
  }
  let gridTileInfo = [];
  let backdropGeomFrameCounter = 0;
  function updateBackdropGeometryLive(atFinalFrame) {
    // Called every frame during a room resize. Every tile and logo mesh
    // that carries a __liveGeom formula (set at creation, one per shape —
    // main/single/grid/inner tiles, film-title logo, fallback logo) gets
    // its scale+position recomputed fresh from the CURRENT room width/
    // depth/height — pure geometry, no content reload. Anything WITHOUT
    // the marker (the floor disc-art pivot, most notably) is left alone.
    //
    // The texture crop refit (fitCover / applyVideoFit) is the one PART
    // of this that's more than trivial number-crunching — it touches
    // texture properties on every tile's material, on top of whatever
    // video decode + shuffle/crossfade/glitch work is already running the
    // same frame. Geometry (scale/position) stays every-frame — that part
    // is cheap and needs to be exact for smooth motion. The crop refit
    // only needs to be "good enough" during the animation and exactly
    // right once settled, so it's throttled to every 3rd frame while
    // moving, and forced on the FINAL frame so the end result is precise.
    const cw = room.ROOM_WIDTH / 6;
    const z = room.ROOM_DEPTH / 2 - 0.08;
    backdropGeomFrameCounter++;
    const doRefit = atFinalFrame || (backdropGeomFrameCounter % 3 === 0);
    const infoByMesh = new Map();
    gridTileInfo.forEach((t) => infoByMesh.set(t.mesh, t));
    room.backdropGroup.children.forEach((child) => {
      const fn = child.userData && child.userData.__liveGeom;
      if (!fn) return;
      const g = fn(cw, z, room.ROOM_WIDTH, room.ROOM_HEIGHT);
      child.scale.set(g.w, g.h, 1);
      child.position.set(g.x, g.y, g.z !== undefined ? g.z : z);
      const info = infoByMesh.get(child);
      if (info) {
        info.w = g.w; info.h = g.h;
        // The crossfade BACK layer (if a video/image swap happens to be
        // mid-flight during this same resize) previously froze at
        // whatever size/position it was created with — visible as a
        // brief "glitches in at the wrong spot" moment right as its
        // crossfade completes and the front takes over. It shares the
        // front's geometry/quaternion, so the same scale+position (plus
        // the tiny fixed "behind" offset ensureBackLayer uses) keeps it
        // correctly in sync throughout, not just at creation time.
        if (info.backMesh && info.backMesh.parent) {
          info.backMesh.scale.set(g.w, g.h, 1);
          info.backMesh.position.set(g.x, g.y, g.z !== undefined ? g.z : z);
          const behind = new THREE.Vector3(0, 0, -1).applyQuaternion(child.quaternion).multiplyScalar(0.004);
          info.backMesh.position.add(behind);
        }
        if (!doRefit) return;
        if (info.mat.map) fitCover(info.mat.map, g.w, g.h);
        if (info.videoEl && info.videoTex) applyVideoFit(info);
        // The back (crossfade) layer, if a swap happens to be mid-flight
        // during this same resize, is intentionally NOT live-resized here
        // — a narrow, rare overlap; it simply catches up once its own
        // crossfade completes and takes over the front's (already live)
        // dimensions at handoff.
      }
    });
  }
  let bgFadeList = [];
  let backdropShuffleTimers = [];
  let currentFullItem = null;
  let currentBackdropMode = null;
  const leftBag = { arr: [] };
  const rightBag = { arr: [] };
  const backdropDedupeCache = {};
  const HASH_MATCH_THRESHOLD = 6;
  function loadImageEl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
  function computeDHash(img) {
    const w = 9, h = 8;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const gray = [];
    for (let i = 0; i < data.length; i += 4) gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    let hash = '';
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w - 1; col++) hash += gray[row * w + col] > gray[row * w + col + 1] ? '1' : '0';
    }
    return hash;
  }
  function hammingDistance(a, b) {
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    return d;
  }
  async function getDedupedBackdropIndices(fullItem, count, tags) {
    if (backdropDedupeCache[fullItem.Id]) return backdropDedupeCache[fullItem.Id];
    async function hashOf(idx) {
      try {
        const url = session.serverUrl + '/Items/' + fullItem.Id + '/Images/Backdrop/' + idx + '?tag=' + tags[idx] + '&api_key=' + session.accessToken;
        const img = await loadImageEl(url);
        return computeDHash(img);
      } catch (err) {
        return null;
      }
    }
    const hashes = await Promise.all(Array.from({ length: count }, (_, i) => hashOf(i)));
    const mainHash = hashes[0];
    const keptHashes = [];
    const result = [];
    for (let i = 1; i < count; i++) {
      const h = hashes[i];
      if (h === null) { result.push(i); keptHashes.push(null); continue; }
      if (mainHash && hammingDistance(h, mainHash) <= HASH_MATCH_THRESHOLD) continue;
      const dup = keptHashes.some((kh) => kh !== null && hammingDistance(h, kh) <= HASH_MATCH_THRESHOLD);
      if (dup) continue;
      result.push(i);
      keptHashes.push(h);
    }
    backdropDedupeCache[fullItem.Id] = result;
    return result;
  }
  function isVideoEntry(v) {
    return typeof v === 'string' && v.indexOf('v:') === 0;
  }
  function buildSide(preferPool, fallbackPool) {
    const chosen = [];
    shuffle(preferPool).forEach((v) => { if (chosen.length < 4 && !chosen.includes(v)) chosen.push(v); });
    if (chosen.length < 4) {
      shuffle(fallbackPool).forEach((v) => { if (chosen.length < 4 && !chosen.includes(v)) chosen.push(v); });
    }
    return chosen;
  }
  // Places a side's entries onto local grid positions 0..3. Videos land on
  // RANDOM positions each build — balance governs only the left/right
  // split, not in-side placement, so video tiles keep moving around
  // instead of being locked to fixed diagonal spots.
  function arrangeSidePositions(vids, imgs) {
    const out = [null, null, null, null];
    let order;
    if (vids.length === 2) {
      // Exactly two videos on a side start on a RANDOM diagonal (0+3 or
      // 1+2) — rolled fresh per build, so nothing is locked to fixed
      // positions. 1/3/4 videos place freely (a full diagonal is either
      // trivial or mathematically impossible there).
      const diag = Math.random() < 0.5 ? [0, 3] : [1, 2];
      order = shuffle(diag).concat(shuffle([0, 1, 2, 3].filter((p) => !diag.includes(p))));
    } else {
      order = shuffle([0, 1, 2, 3]);
    }
    const vq = vids.slice();
    for (const p of order) { if (!vq.length) break; out[p] = vq.shift(); }
    const iq = imgs.slice();
    for (let p = 0; p < 4; p++) if (out[p] === null) out[p] = iq.length ? iq.shift() : null;
    return out;
  }
  function interleaveVideoTypes(vids) {
    // Initial build only: with 2-3 active video types, round-robin across
    // the types (each type keeps its own shuffled order) so the alternating
    // left/right filling mixes types across the sides instead of ending up
    // with e.g. all movies left and all trailers right. Later shuffles are
    // pure random again.
    const groups = {};
    vids.forEach((v) => { const t = v.split('#')[0]; (groups[t] = groups[t] || []).push(v); });
    const keys = shuffle(Object.keys(groups));
    if (keys.length <= 1) return vids;
    const out = [];
    let added = true;
    for (let i = 0; added; i++) {
      added = false;
      keys.forEach((k) => { if (groups[k][i] !== undefined) { out.push(groups[k][i]); added = true; } });
    }
    return out;
  }
  function distributeVideoTypes(vids, capPerSide) {
    // Per-type left/right alternation: every type with 2+ instances is
    // guaranteed on BOTH sides (capacity permitting) while total counts
    // stay balanced. The starting side flips per type so equal type
    // counts don't all begin on the same side. This replaces the old
    // interleave-then-alternate combo, whose two regular patterns
    // cancelled each other out deterministically (all trailers left,
    // all movies right — the exact clustering it was meant to prevent).
    const groups = {};
    vids.forEach((v) => { const t = v.split('#')[0]; (groups[t] = groups[t] || []).push(v); });
    const keys = shuffle(Object.keys(groups));
    const vL = [], vR = [];
    let startLeft = Math.random() < 0.5;
    keys.forEach((k) => {
      let toLeft = startLeft;
      groups[k].forEach((v) => {
        const primary = toLeft ? vL : vR;
        const secondary = toLeft ? vR : vL;
        if (primary.length < capPerSide) primary.push(v);
        else if (secondary.length < capPerSide) secondary.push(v);
        toLeft = !toLeft;
      });
      startLeft = !startLeft;
    });
    return { vL: vL, vR: vR };
  }
  function fixTypeClustering(left, right) {
    // Non-balance random path: if pure chance produced "all of type X left,
    // all of type Y right", swap one video pair to break the clustering.
    const typeOf = (v) => v.split('#')[0];
    const lv = left.filter((v) => v !== null && isVideoEntry(v));
    const rv = right.filter((v) => v !== null && isVideoEntry(v));
    if (lv.length < 2 || rv.length < 2) return;
    const lTypes = {}; lv.forEach((v) => { lTypes[typeOf(v)] = 1; });
    const rTypes = {}; rv.forEach((v) => { rTypes[typeOf(v)] = 1; });
    const lk = Object.keys(lTypes), rk = Object.keys(rTypes);
    if (lk.length === 1 && rk.length === 1 && lk[0] !== rk[0]) {
      const li = left.indexOf(lv[0]);
      const ri = right.indexOf(rv[0]);
      const tmp = left[li]; left[li] = right[ri]; right[ri] = tmp;
    }
  }
  function pickTwoSideGrids(others, layout) {
    const n = others.length;
    if (layout === 'off' || n <= 1) return null;
    if (layout === '1x1') {
      const s = shuffle(others);
      if (backdropBalanceVideos) {
        const vids = interleaveVideoTypes(s.filter(isVideoEntry));
        if (vids.length >= 2) return { mode: 'single', left: vids[0], right: vids[1] };
        if (vids.length === 1) {
          const img = s.find((v) => !isVideoEntry(v));
          if (img !== undefined) return { mode: 'single', left: vids[0], right: img };
        }
      }
      return { mode: 'single', left: s[0], right: s[1] };
    }
    // 2x2 material tiers: with too little material for a respectable full
    // wall, fall back to ONLY the two columns adjacent to the center (2
    // tiles per side, outer edges stay empty); with next to nothing (0-1
    // entries) the walls stay empty entirely and only the center remains.
    // A full 8-tile wall requires at least 4 distinct entries AND a way to
    // fill the rest (at least one image to duplicate, or 8+ videos —
    // video instances are never duplicated beyond their configured count).
    const allVids = others.filter(isVideoEntry);
    const allImgs = others.filter((v) => !isVideoEntry(v));
    const fullPossible = n >= 4 && (allImgs.length >= 1 || allVids.length >= 8);
    if (!fullPossible) {
      const imgs = shuffle(allImgs);
      const dist = distributeVideoTypes(shuffle(allVids), 2);
      const vL = dist.vL, vR = dist.vR;
      const needL = 2 - vL.length, needR = 2 - vR.length;
      const iL = imgs.slice(0, needL);
      const iR = imgs.slice(needL, needL + needR);
      let dupPool = iL.concat(iR).length ? iL.concat(iR) : imgs;
      while (iR.length < needR && dupPool.length) iR.push(dupPool[iR.length % dupPool.length]);
      dupPool = iR.concat(iL).length ? iR.concat(iL) : imgs;
      while (iL.length < needL && dupPool.length) iL.push(dupPool[iL.length % dupPool.length]);
      function padTwo(v, i) {
        const out = v.concat(i);
        while (out.length < 2) out.push(null);
        return shuffle(out);
      }
      return { mode: 'inner', left: padTwo(vL, iL), right: padTwo(vR, iR) };
    }
    if (backdropBalanceVideos) {
      const imgs = shuffle(others.filter((v) => !isVideoEntry(v)));
      const dist = distributeVideoTypes(shuffle(others.filter(isVideoEntry)), 4);
      const vL = dist.vL, vR = dist.vR;
      const needL = 4 - vL.length, needR = 4 - vR.length;
      const iL = imgs.slice(0, needL);
      const iR = imgs.slice(needL, needL + needR);
      // Too few unique images: duplicate across sides first (an image may
      // appear once left AND once right before ever twice on one side).
      let dupPool = iL.concat(iR).length ? iL.concat(iR) : imgs;
      while (iR.length < needR && dupPool.length) iR.push(dupPool[iR.length % dupPool.length]);
      dupPool = iR.concat(iL).length ? iR.concat(iL) : imgs;
      while (iL.length < needL && dupPool.length) iL.push(dupPool[iL.length % dupPool.length]);
      return {
        mode: 'grid',
        left: arrangeSidePositions(vL, iL),
        right: arrangeSidePositions(vR, iR)
      };
    }
    const left = shuffle(others).slice(0, 4);
    if (n >= 8) {
      const remaining = others.filter((v) => !left.includes(v));
      const right = shuffle(remaining).slice(0, 4);
      fixTypeClustering(left, right);
      return { mode: 'grid', left, right };
    }
    const remaining = others.filter((v) => !left.includes(v));
    // Image-only fallback: video instances must never be duplicated by the
    // side-filling logic — their count is governed solely by the tile
    // dropdowns.
    const right = buildSide(remaining, left.filter((v) => !isVideoEntry(v)));
    while (right.length < 4) right.push(null); // too few fillable entries -> explicit empty tile, never undefined
    fixTypeClustering(left, right);
    return { mode: 'grid', left, right };
  }
  // Shared unit geometry, reused by every backdrop tile — matches the
  // room shell's technique. Never disposed (lives for the whole session);
  // tiles carry their size purely via .scale, which lets width-driven
  // resizing update them live without rebuilding any geometry.
  const backdropUnitPlane = new THREE.PlaneGeometry(1, 1);
  let backdropBuildId = 0;
  // Tracks the {item, backwall-enabled, disc-enabled} combination the
  // wall was LAST actually rebuilt for — read only when a caller
  // explicitly opts into the skip-if-unchanged check below
  // (allowSkipIfUnchanged); every OTHER existing caller in the whole
  // script (settings changes, refreshFanartWallIfActive, the normal
  // non-Ambient poster click flow) never passes that flag and keeps
  // rebuilding unconditionally on every call, exactly as before this
  // was added — this is purely additive.
  let backdropLastBuiltKey = null;
  // Same purpose as backdropLastBuiltKey above, but for the separate
  // screen-art reload inside showNoTrailerDisplay (themesong/fanart
  // wall/no-trailer-fallback screen background) — a different mesh,
  // different function, tracked independently.
  let screenArtLastShownKey = null;
  // Staged-reveal scheduler state (initial mosaic builds with videos only):
  // per side an ordered pending list; a tile is revealed once its content
  // is READY and >= 1s has passed since that side's last ACTUAL reveal —
  // the rhythm is measured between real appearances, so slow loaders can
  // never make successors pop in too quickly. Loading itself always starts
  // immediately; only the SHOWING is metered. A stuck tile never blocks
  // its successors (lowest ready rank wins), it just joins in later.
  const stagedReveal = { active: false, left: null, right: null };
  async function buildBackdropMosaic(fullItem, allowSkipIfUnchanged) {
    // Deliberately narrow: ONLY considered when a caller explicitly asks
    // for it (currently only Ambient Mode's own trigger path does — see
    // triggerAmbientEffect) — comparing just the movie and BOTH effects
    // this one function actually builds (backwall tiles AND the disc
    // art mesh, both live inside here — see the 'disc' branch further
    // down), nothing else. A content-type change (movie -> trailer, say)
    // still calls this function fully — that's still driven by the
    // reused, unmodified content function itself and is out of scope
    // here — but if THIS specific combination is identical to the last
    // successful build regardless of why this got called again, tearing
    // the whole wall down and rebuilding it (every tile fades to black
    // and reloads from scratch) is genuinely pointless and skipped
    // outright. Both effects have to match, not just one — disc alone
    // changing while backwall stays the same still needs a real rebuild
    // (and vice versa), so neither is checked in isolation.
    const buildKey = fullItem.Id + ':' + envEnabled('backwall') + ':' + envEnabled('disc');
    if (allowSkipIfUnchanged && buildKey === backdropLastBuiltKey) return;
    backdropLastBuiltKey = buildKey;
    const myBuildId = ++backdropBuildId;
    // Fades whatever's CURRENTLY showing out first, instead of the old
    // instant hard cut (room.backdropGroup.clear() used to run
    // immediately, right here) — reuses the exact same per-frame lerp
    // machinery that already fades freshly-added tiles IN (bgFadeList/
    // gridTileInfo's own __fadeTarget), just aimed at 0 first this time,
    // and waited out before anything is actually torn down. Most
    // noticeable for the Backwall/Disc Environment Effects being turned
    // off with nothing else about the transition changing, but applies
    // uniformly to every rebuild — a genuine content change fading the
    // old tiles out and the new ones in reads just as smoothly, not
    // worse.
    if (bgFadeList.length || gridTileInfo.length) {
      bgFadeList.forEach((mat) => { mat.__fadeTarget = 0; });
      gridTileInfo.forEach((info) => { if (info.mat) info.mat.__fadeTarget = 0; });
      // 1500ms — same reasoning as stopTrailer's own identical fade-out
      // wait (see its own comment): the default fade rate (3, "~1s
      // perceived fade") needs close to a full second to become
      // visually negligible, so the previous 400ms cut every fade off
      // partway through, still meaningfully visible, reading as a
      // sudden vanish rather than a completed fade.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // A NEWER build request superseded this one while the fade-out was
      // still running — that one owns the wall now; bowing out here
      // avoids two builds both racing to clear/rebuild the same group.
      if (myBuildId !== backdropBuildId) return;
    }
    stagedReveal.active = false;
    stagedReveal.left = null;
    stagedReveal.right = null;
    gridTileInfo.forEach((info) => { abortPendingSwap(info); disposeTileVideo(info); });
    room.backdropGroup.clear();
    discPivot = null;
    realDiscArtActive = false;
    gridTileInfo = [];
    bgFadeList = [];
    currentFullItem = fullItem;
    const backdropTags = fullItem.BackdropImageTags || [];
    const count = backdropTags.length;
    const GAP = 0.08;
    const CELL_W = room.ROOM_WIDTH / 6;
    const CELL_H = CELL_W * 9 / 16;
    const z = room.ROOM_DEPTH / 2 - 0.08;
    function backdropUrl(idx) {
      return session.serverUrl + '/Items/' + fullItem.Id + '/Images/Backdrop/' + idx + '?tag=' + backdropTags[idx] + '&api_key=' + session.accessToken;
    }
    function addTile(x, y, w, h, idx, trackForShuffle, liveGeom) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0 });
      const tile = new THREE.Mesh(backdropUnitPlane, mat);
      tile.scale.set(w, h, 1);
      tile.position.set(x, y, z);
      tile.rotation.y = Math.PI;
      tile.userData.__liveGeom = liveGeom || null;
      room.backdropGroup.add(tile);
      bgFadeList.push(mat);
      const info = { mat, w, h, idx, videoEl: null, videoTex: null, mesh: tile, backMesh: null, backMat: null, __pendingSwap: null };
      if (trackForShuffle) gridTileInfo.push(info);
      if (trackForShuffle && stagedReveal.active && idx !== null) {
        const sideSeq = stagedReveal[x < 0 ? 'left' : 'right'];
        const stagedIsVid = typeof idx === 'string' && idx.indexOf('v:') === 0;
        sideSeq.pending.push({ mat, rank: stagedIsVid ? 1000 + (sideSeq.vid++) : (sideSeq.img++) });
        mat.__stagedHold = true;
      }
      if (idx === null) { mat.__fadeTarget = 1; return; }
      if (typeof idx === 'string' && idx.indexOf('v:') === 0) {
        mat.__fadeTarget = 1; // quick fade to a solid black tile (map stays null)
        fadeSwapTile(info, idx); // video loads hidden on the back layer; crossfades in once truly ready
        return;
      }
      backdropLoader.load(backdropUrl(idx), (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        fitCover(tex, w, h);
        mat.map = tex;
        mat.needsUpdate = true;
        mat.__fadeTarget = 1;
      }, undefined, () => { mat.__fadeTarget = 1; });
    }
    if (envEnabled('backwall')) {
      // Only faded out here, inside the branch that's actually about to
      // build real tiles onto the wall — moved out of the unconditional
      // spot this used to sit in (right at this function's own start,
      // before either branch below was even decided) specifically so
      // the OTHER branch (backwall genuinely OFF) can leave it exactly
      // as it is instead. .visible itself stays true permanently now
      // (see marqueeTargetOpacity's own comment) — opacity 0 does the
      // actual hiding, smoothly, instead of an instant .visible=false.
      room.marqueeMesh.visible = true;
      marqueeTargetOpacity = 0;
      const mainW = CELL_W * 2, mainH = CELL_H * 2;
      addTile(0, mainH / 2, mainW - GAP, mainH - GAP, count ? 0 : null, false, (cw, cz) => {
        const ch = cw * 9 / 16;
        return { x: 0, y: ch, w: cw * 2 - GAP, h: ch * 2 - GAP };
      });
      if (fullItem.ImageTags && fullItem.ImageTags.Logo) {
        const logoUrl = session.serverUrl + '/Items/' + fullItem.Id + '/Images/Logo?tag=' + fullItem.ImageTags.Logo + '&api_key=' + session.accessToken;
        backdropLoader.load(logoUrl, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          const iw = tex.image.width, ih = tex.image.height;
          const boxW = mainW - 0.4, boxH = room.ROOM_HEIGHT - mainH - 0.4;
          const imgAspect = iw / ih, boxAspect = boxW / boxH;
          let w, h;
          if (imgAspect > boxAspect) { w = boxW; h = boxW / imgAspect; } else { h = boxH; w = boxH * imgAspect; }
          const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 });
          const logoMesh = new THREE.Mesh(backdropUnitPlane, mat);
          logoMesh.scale.set(w, h, 1);
          logoMesh.position.set(0, mainH + boxH / 2 + 0.2, z + 0.01);
          logoMesh.rotation.y = Math.PI;
          logoMesh.userData.__liveGeom = (cw, cz, liveRoomW, liveRoomH) => {
            const ch = cw * 9 / 16;
            const lMainH = ch * 2;
            const lBoxW = cw * 2 - 0.4, lBoxH = liveRoomH - lMainH - 0.4;
            const lBoxAspect = lBoxW / lBoxH;
            let lw, lh;
            if (imgAspect > lBoxAspect) { lw = lBoxW; lh = lBoxW / imgAspect; } else { lh = lBoxH; lw = lBoxH * imgAspect; }
            return { x: 0, y: lMainH + lBoxH / 2 + 0.2, z: cz + 0.01, w: lw, h: lh };
          };
          room.backdropGroup.add(logoMesh);
          bgFadeList.push(mat);
          mat.__fadeTarget = 1;
        }, undefined, () => {});
      }
      const backdropLayout = document.getElementById('backdropLayoutSelect').value;
      // IMPORTANT: getDedupedBackdropIndices caches its result by reference,
      // keyed on the movie's id. Pushing sentinel strings directly onto that
      // array would permanently pollute the cache with whatever video types
      // happened to be checked at the time — and since every setting change
      // now rebuilds the wall immediately, repeated builds for the same
      // movie would keep re-returning that same poisoned array, silently
      // accumulating 'v:trailer'/'v:themevideo'/'v:movie' entries from
      // earlier checkbox states that no longer reflect the current settings.
      // .slice() makes a fresh copy so the cache only ever holds plain
      // fanart-image indices, never sentinels.
      const others = (count > 1 ? await getDedupedBackdropIndices(fullItem, count, backdropTags) : []).slice();
      if (myBuildId !== backdropBuildId) return;
      // Availability pre-check (cached per movie): a type whose material is
      // entirely missing or avi-blocked behaves exactly like "Off" — its
      // instances never enter the pool, so images take those slots instead
      // of leaving black tiles.
      if (!backdropVideoAvailCache[fullItem.Id]) {
        const avail = { trailer: false, theme: false, movie: false };
        try {
          // Always probe ALL three types for the cache (regardless of the
          // current tile counts) — otherwise raising a dropdown from 0
          // later would hit a stale "unavailable" verdict for this movie.
          const [trailers, themeData, movieBlocked] = await Promise.all([
            jfGet('/Users/' + session.userId + '/Items/' + fullItem.Id + '/LocalTrailers', { Fields: 'Container,Path' }).catch(() => []),
            jfGet('/Items/' + fullItem.Id + '/ThemeVideos', { userId: session.userId, Fields: 'Container,Path' }).catch(() => ({ Items: [] })),
            checkMovieBlocked(fullItem.Id).catch(() => true)
          ]);
          avail.trailer = (trailers || []).some((t) => !isBlockedMediaForPoster(t));
          avail.theme = ((themeData && themeData.Items) || []).some((v) => !isBlockedMediaForPoster(v));
          avail.movie = !movieBlocked;
        } catch (err) {}
        backdropVideoAvailCache[fullItem.Id] = avail;
      }
      if (myBuildId !== backdropBuildId) return;
      const vidAvail = backdropVideoAvailCache[fullItem.Id];
      if (backdropVideosEnabled && document.getElementById('backdropModeSelect').value === 'shuffle') {
        // Per-type tile counts: N numbered instances per type enter the
        // pool ('v:trailer#1', 'v:trailer#2', ...). Each instance resolves
        // independently (file via the type's shared playback-order channel,
        // own random timestamp) — acting as a "max" when more files than
        // instances exist and as a duplicator when fewer do.
        if (vidAvail.trailer) for (let i = 1; i <= +backdropTrailerTiles; i++) others.push('v:trailer#' + i);
        if (vidAvail.theme) for (let i = 1; i <= +backdropThemeVideoTiles; i++) others.push('v:themevideo#' + i);
        if (vidAvail.movie) for (let i = 1; i <= +backdropMovieTiles; i++) others.push('v:movie#' + i);
      }
      console.log('[BackdropWall] Pool for "' + fullItem.Name + '": ' + JSON.stringify(others) + ' (Trailer=' + backdropTrailerTiles + ', ThemeVideo=' + backdropThemeVideoTiles + ', Movie=' + backdropMovieTiles + ')');
      const sideGrids = pickTwoSideGrids(others, backdropLayout);
      if (sideGrids) {
        const leftArr = sideGrids.mode === 'single' ? [sideGrids.left] : sideGrids.left;
        const rightArr = sideGrids.mode === 'single' ? [sideGrids.right] : sideGrids.right;
        const totalVids = leftArr.concat(rightArr).filter((e) => e !== null && isVideoEntry(e)).length;
        if (totalVids > 0) {
          stagedReveal.left = { pending: [], nextAllowedAt: 0, img: 0, vid: 0 };
          stagedReveal.right = { pending: [], nextAllowedAt: 0, img: 0, vid: 0 };
          stagedReveal.active = true;
        }
      }
      currentBackdropMode = sideGrids ? sideGrids.mode : null;
      leftBag.arr = [];
      rightBag.arr = [];
      if (sideGrids && sideGrids.mode === 'single') {
        const bigW = CELL_W * 2 - GAP, bigH = CELL_H * 2 - GAP;
        [-1, 1].forEach((side, sideIdx) => {
          const x = side * (room.ROOM_WIDTH / 2 - CELL_W);
          addTile(x, CELL_H, bigW, bigH, sideIdx === 0 ? sideGrids.left : sideGrids.right, true, (cw, cz, liveRoomW) => {
            const ch = cw * 9 / 16;
            return { x: side * (liveRoomW / 2 - cw), y: ch, w: cw * 2 - GAP, h: ch * 2 - GAP };
          });
        });
        startBackdropShuffle(fullItem, count, others, 'single');
      } else if (sideGrids && sideGrids.mode === 'grid') {
        [-1, 1].forEach((side, sideIdx) => {
          const grid = sideIdx === 0 ? sideGrids.left : sideGrids.right;
          for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 2; c++) {
              const x = side * (room.ROOM_WIDTH / 2 - CELL_W / 2 - c * CELL_W);
              const y = CELL_H / 2 + r * CELL_H;
              addTile(x, y, CELL_W - GAP, CELL_H - GAP, grid[r * 2 + c], true, (cw, cz, liveRoomW) => {
                const ch = cw * 9 / 16;
                return { x: side * (liveRoomW / 2 - cw / 2 - c * cw), y: ch / 2 + r * ch, w: cw - GAP, h: ch - GAP };
              });
            }
          }
        });
        startBackdropShuffle(fullItem, count, others, 'grid');
      } else if (sideGrids && sideGrids.mode === 'inner') {
        // Low-material tier: only the column adjacent to the center on
        // each side (2 tiles per side, c=1), outer edges stay empty.
        [-1, 1].forEach((side, sideIdx) => {
          const pair = sideIdx === 0 ? sideGrids.left : sideGrids.right;
          for (let r = 0; r < 2; r++) {
            const x = side * (room.ROOM_WIDTH / 2 - CELL_W / 2 - CELL_W);
            const y = CELL_H / 2 + r * CELL_H;
            addTile(x, y, CELL_W - GAP, CELL_H - GAP, pair[r], true, (cw, cz, liveRoomW) => {
              const ch = cw * 9 / 16;
              return { x: side * (liveRoomW / 2 - cw / 2 - cw), y: ch / 2 + r * ch, w: cw - GAP, h: ch - GAP };
            });
          }
        });
        startBackdropShuffle(fullItem, count, others, 'inner');
      }
    } else {
      // Backwall genuinely OFF (not "no backdrop images available" —
      // that case is handled INSIDE the branch above instead, as a
      // plain empty tile via addTile's own idx=null path). This used to
      // build a reduced icon-only logo tile here — but that competed
      // with (or duplicated) the real idle marquee rather than matching
      // it, so it's gone. Explicitly RESTORED here, not just assumed to
      // already be — a transition FROM a moment ago where backwall WAS
      // enabled (which fades it out, see the other branch) would
      // otherwise leave it stuck faded-out even now that backwall is
      // off, since nothing else in this specific branch ever touches it
      // on its own.
      room.marqueeMesh.visible = true;
      marqueeTargetOpacity = 1;
    }
    if (showDiscArt && envEnabled('disc') && fullItem.ImageTags && fullItem.ImageTags.Disc) {
      const discUrl = session.serverUrl + '/Items/' + fullItem.Id + '/Images/Disc?tag=' + fullItem.ImageTags.Disc + '&api_key=' + session.accessToken;
      backdropLoader.load(discUrl, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        // Starts at 0, not the final 0.5, and gets faded IN via bgFadeList
        // — same treatment every other backdrop material already gets.
        // This material previously wasn't tracked in bgFadeList AT ALL,
        // meaning it had no fade-OUT either: room.backdropGroup.clear()
        // (whether from a genuine stop or a rebuild) removed it outright,
        // regardless of whatever fade-out timing the REST of the wall
        // was using at that exact moment — reading as disc art vanishing
        // instantly while everything else around it faded smoothly.
        const discMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0, roughness: 0.4, side: THREE.DoubleSide, depthWrite: false });
        const discMesh = new THREE.Mesh(new THREE.CircleGeometry(KIOSK_DISC_RADIUS, 64), discMat);
        discMesh.rotation.x = -Math.PI / 2;
        const pivot = new THREE.Group();
        pivot.position.set(0, 0.02, 0);
        pivot.add(discMesh);
        room.backdropGroup.add(pivot);
        discPivot = pivot;
        realDiscArtActive = true;
        bgFadeList.push(discMat);
        discMat.__fadeTarget = 0.5;
      }, undefined, () => {});
    } else if (!envEnabled('dim')) {
      // No real disc art available/enabled AND the room is genuinely
      // BRIGHT (dim off) — this step's own "bright" state — the dark
      // fallback circle below exists to visually mark an empty disc-art
      // slot, but it sits at almost the exact same spot as the kiosk's
      // own always-present, always-bright floor indicator (buildKiosk's
      // own "indicator" mesh) and visually darkens it — reading as a
      // shadow sitting right where genuine idle (nothing locked at all,
      // this whole function never even runs) shows nothing but that
      // bright indicator, unobstructed. Left alone (discPivot stays
      // null, nothing added here) specifically in this bright case so
      // the floor matches that same true-idle look — the dark
      // placeholder still applies normally whenever dim is ON, same as
      // before. Checks envEnabled('dim') directly now, not
      // envEnabled('posterlight') (an earlier version's own mistake) —
      // the two are genuinely independent, mixable Environment Effects
      // (real Ambient profiles enable both 'dim' AND 'posterlight'
      // together on the same step), so posterlight being on was never a
      // reliable stand-in for "the room is actually bright" — dim is
      // the one env key that actually drives room brightness (dimLevel)
      // everywhere else in this file. Skipping the fallback based on the
      // wrong key meant a dim+posterlight step with no real disc art
      // showed literally nothing at all — no fallback, no disc art,
      // just an empty floor — exactly the reported bug.
      realDiscArtActive = false;
    } else {
      // Same fade-in-via-bgFadeList treatment as the real disc art
      // above, for the same reason — this used to appear (and later
      // disappear) instantly, out of step with the rest of the wall.
      const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x2a251e, map: softCircleTexture(), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      const fallbackMesh = new THREE.Mesh(new THREE.CircleGeometry(KIOSK_DISC_RADIUS, 48), fallbackMat);
      fallbackMesh.rotation.x = -Math.PI / 2;
      const pivot = new THREE.Group();
      pivot.position.set(0, 0.02, 0);
      pivot.add(fallbackMesh);
      room.backdropGroup.add(pivot);
      discPivot = pivot;
      realDiscArtActive = false;
      bgFadeList.push(fallbackMat);
      fallbackMat.__fadeTarget = 0.75;
    }
  }
  function stopBackdropShuffle() {
    backdropShuffleTimers.forEach((id) => clearTimeout(id));
    backdropShuffleTimers = [];
  }
  function drawFromBag(bagRef, pool, sideExcludeVals, globalExcludeVals) {
    if (bagRef.arr.length === 0) bagRef.arr = shuffle(pool);
    let idx = bagRef.arr.findIndex((v) => !globalExcludeVals.includes(v));
    if (idx === -1) idx = bagRef.arr.findIndex((v) => !sideExcludeVals.includes(v));
    if (idx === -1) idx = 0;
    return bagRef.arr.splice(idx, 1)[0];
  }
  // ---- Two-layer crossfade tile swaps ----
  // The old single-layer swap (fade out -> swap texture -> fade in) had an
  // unavoidable moment where the tile showed an UNFINISHED surface: images
  // still loading, videos without decoded frames or mid random-jump — the
  // observed pop/flicker, which no amount of fading on ONE layer can fix.
  // New model, uniform for every combination (img->img, img->video,
  // video->img, video->video): the incoming content is prepared on a
  // hidden BACK layer 4mm behind the tile and must prove real readiness
  // (image decoded / video delivering frames with its bar-crop decided)
  // before anything visible happens. Only then the front fades out over
  // ~1s, revealing the already-running content beneath. Afterwards the
  // finished content is handed to the front material in one atomic step
  // (same texture object -> pixel-identical, invisible), keeping
  // gridTileInfo pointed at the same material so all other systems
  // (staged reveal, pair swaps, watchdog owner lookups) work unchanged.
  // If the new content never becomes ready, the old tile simply stays.
  const pendingSwapInfos = [];
  function abortPendingSwap(info) {
    const p = info.__pendingSwap;
    if (p) {
      info.__pendingSwap = null;
      if (p.__readyTimer) clearInterval(p.__readyTimer);
      const i = pendingSwapInfos.indexOf(p);
      if (i >= 0) pendingSwapInfos.splice(i, 1);
      disposeTileVideo(p);
      p.mat.map = null;
      p.mat.opacity = 0;
      p.mat.__fadeTarget = 0;
      p.mat.needsUpdate = true;
    }
    // Separate from __pendingSwap above — this is fadeSwapPair's own
    // in-flight direct tile-to-tile exchange (see its own comment for
    // why it needs this at all). Cancels the shared setTimeout outright
    // (unlike __pendingSwap's own teardown above, which just lets its
    // interval's own next tick notice and quietly no-op — this one has
    // no such polling tick to rely on, so an explicit clearTimeout is
    // the only way to stop it from firing at all) and clears the marker
    // on BOTH tiles in the pair, not just whichever one this call was
    // for — abortPendingSwap is only ever called with one info at a
    // time, but a stale marker left on the OTHER tile would make it
    // permanently unrecognized as "this exchange it was part of already
    // ended" by any code checking that marker later.
    if (info.__pendingPairSwap) {
      const token = info.__pendingPairSwap;
      clearTimeout(token.timerId);
      token.infoA.__pendingPairSwap = null;
      token.infoB.__pendingPairSwap = null;
    }
  }
  function ensureBackLayer(info) {
    if (info.backMesh && info.backMesh.parent) return;
    const mat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(info.mesh.geometry, mat);
    mesh.position.copy(info.mesh.position);
    mesh.quaternion.copy(info.mesh.quaternion);
    // The front tile shares a UNIT (1x1) geometry and carries its actual
    // size via .scale — the back layer must copy that too, or it starts
    // out as a literal 1x1 plane (small and square) until the crossfade
    // completes and the front's correctly-scaled content takes over.
    mesh.scale.copy(info.mesh.scale);
    const behind = new THREE.Vector3(0, 0, -1).applyQuaternion(info.mesh.quaternion).multiplyScalar(0.004);
    mesh.position.add(behind);
    info.mesh.parent.add(mesh);
    bgFadeList.push(mat);
    info.backMesh = mesh;
    info.backMat = mat;
  }
  function pendingFallbackToImage(p, imgIdx) {
    disposeTileVideo(p);
    p.idx = imgIdx;
    const url = session.serverUrl + '/Items/' + currentFullItem.Id + '/Images/Backdrop/' + imgIdx + '?tag=' + currentFullItem.BackdropImageTags[imgIdx] + '&api_key=' + session.accessToken;
    backdropLoader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      fitCover(tex, p.w, p.h);
      p.mat.map = tex;
      p.mat.needsUpdate = true;
      p.__ready = true;
    }, undefined, () => {});
  }
  function fadeSwapTile(info, newIdx, isRetryAfterFailure) {
    // Whether this tile has EVER shown anything before this call — a
    // brand new tile's info.idx starts out null/undefined and only ever
    // becomes something else once a swap actually succeeds.
    const wasEmpty = info.idx === null || info.idx === undefined;
    abortPendingSwap(info);
    if (newIdx === null) { info.idx = null; info.mat.__fadeTarget = 1; return; }
    ensureBackLayer(info);
    const pending = { mat: info.backMat, w: info.w, h: info.h, idx: newIdx, videoEl: null, videoTex: null, __pending: true, __ready: false, __born: performance.now(), __readyTimer: 0 };
    info.__pendingSwap = pending;
    pendingSwapInfos.push(pending);
    pending.mat.opacity = 0;
    pending.mat.__fadeTarget = 0; // stays out of sight while loading
    if (typeof newIdx === 'string' && newIdx.indexOf('v:') === 0) {
      const timerSeconds = Math.max(1, parseInt(document.getElementById('backdropSecondsInput').value, 10) || 5);
      loadVideoIntoTile(pending, newIdx, currentFullItem, timerSeconds);
    } else {
      const url = session.serverUrl + '/Items/' + currentFullItem.Id + '/Images/Backdrop/' + newIdx + '?tag=' + currentFullItem.BackdropImageTags[newIdx] + '&api_key=' + session.accessToken;
      backdropLoader.load(url, (tex) => {
        if (info.__pendingSwap !== pending) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        fitCover(tex, pending.w, pending.h);
        pending.mat.map = tex;
        pending.mat.needsUpdate = true;
        pending.__ready = true;
      }, undefined, () => { /* image failed -> give up silently, old tile stays */ });
    }
    pending.__readyTimer = setInterval(() => {
      if (info.__pendingSwap !== pending) { clearInterval(pending.__readyTimer); return; }
      const videoReady = pending.videoTex && pending.videoEl && pending.videoEl.readyState >= 2 && !pending.videoEl.__jfAwaitingCrop;
      // Require the front to have ACTUALLY reached visible black (not just
      // "allowed to fade in") before starting the reveal — otherwise a
      // video that finishes loading right around when its staged turn
      // arrives can flip the fade target back to 0 before opacity ever
      // climbed above ~0, so no black is ever seen and the swap pops in
      // abruptly after the fixed handoff delay. This closes that race.
      if ((pending.__ready || videoReady) && !info.mat.__stagedHold && info.mat.opacity >= 0.9) {
        clearInterval(pending.__readyTimer);
        beginTileCrossfade(info, pending);
      } else if (performance.now() - pending.__born > 15000) {
        clearInterval(pending.__readyTimer);
        abortPendingSwap(info); // never show anything broken — the old content stays
        // "The old content stays" only actually holds true for a tile
        // that HAD something before — for a tile's very first-ever
        // assignment there IS no old content to fall back to, so
        // giving up here left it stuck at its raw, near-black initial
        // placeholder state indefinitely (ensureBackLayer's own default
        // material color, never replaced by anything). One retry with a
        // DIFFERENT image (never the same one that just failed) instead
        // of just giving up — capped at a single retry (the isRetryAfterFailure
        // flag) so a genuinely broken item/connection can't loop forever.
        if (wasEmpty && !isRetryAfterFailure && currentFullItem) {
          const imgs = (backdropDedupeCache[currentFullItem.Id] || []).filter((i) => i !== newIdx);
          if (imgs.length) {
            const retryIdx = imgs[Math.floor(Math.random() * imgs.length)];
            fadeSwapTile(info, retryIdx, true);
          }
        }
      }
    }, 150);
  }
  function beginTileCrossfade(info, pending) {
    pending.mat.opacity = 1; // fully visible behind the still-opaque front
    pending.mat.__fadeTarget = 1;
    info.mat.__fadeRate = 3; // ~1s perceived fade
    info.mat.__fadeTarget = 0;
    // 1500ms, not the original 1300ms — same reasoning as the wall/disc
    // art fade timing fix elsewhere: rate 3 leaves ~1.8% opacity still
    // visible at 1300ms, small but not the fully-invisible swap point
    // this is meant to wait for. 1500ms brings that comfortably under
    // 1%, consistent with every other fade-then-swap wait in this file.
    setTimeout(() => {
      if (info.__pendingSwap !== pending) return;
      info.__pendingSwap = null;
      const i = pendingSwapInfos.indexOf(pending);
      if (i >= 0) pendingSwapInfos.splice(i, 1);
      disposeTileVideo(info); // old front video (if any) dies only AFTER the fade
      info.idx = pending.idx;
      info.videoEl = pending.videoEl;
      info.videoTex = pending.videoTex;
      pending.videoEl = null;
      pending.videoTex = null;
      info.mat.map = pending.mat.map;
      // Videos ALWAYS arrive via this exact copy (fadeSwapTile routes
      // every 'v:' index through the pending/back-layer path, never the
      // direct addTile load above). No explicit color reset needed here
      // any more -- the per-frame bgFadeList loop below now applies the
      // correct dim-based tint to any material with a real .map, every
      // frame, so whatever color this material already carries gets
      // corrected immediately regardless of how content arrived.
      info.mat.needsUpdate = true;
      info.mat.opacity = 1;
      info.mat.__fadeTarget = 1;
      // Re-fit against the CURRENT, live tile dimensions — not the
      // possibly-stale ones this content was originally fitted for.
      // The pending (back) layer's own fit is deliberately never kept
      // live during a room resize while it's still loading (see
      // updateBackdropGeometryLive's own comment on that) — its zoom/
      // crop was baked in ONCE, at whatever size was current the
      // instant loading began. If the room was resized any time between
      // then and now, that baked-in fit no longer matches this tile's
      // actual current shape at all — the texture keeps sampling as if
      // for the OLD size while the plane's own geometry has already
      // moved on to the new one, reading as a wrong, off-center zoom.
      // This is the one guaranteed moment the mismatch can be caught
      // and corrected: right as content actually becomes visible.
      if (typeof info.idx === 'string' && info.idx.indexOf('v:') === 0) {
        applyVideoFit(info);
      } else if (info.mat.map) {
        fitCover(info.mat.map, info.w, info.h);
      }
      pending.mat.map = null;
      pending.mat.opacity = 0;
      pending.mat.__fadeTarget = 0;
      pending.mat.needsUpdate = true;
    }, 1500);
  }
  function fadeSwapPair(infoA, infoB) {
    abortPendingSwap(infoA);
    abortPendingSwap(infoB);
    infoA.mat.__fadeTarget = 0;
    infoB.mat.__fadeTarget = 0;
    // Unlike beginTileCrossfade's own delayed completion (which checks
    // info.__pendingSwap against the specific "pending" object it
    // belongs to before proceeding) or finishBackdropTeardown's delayed
    // call (checked against its own build ID), this deferred completion
    // used to have NO staleness check of any kind, and never stored its
    // own setTimeout ID anywhere either — meaning it couldn't be
    // cancelled OR recognize a stale fire on its own. If an Ambient step
    // change (or any other backdrop teardown/rebuild) landed inside this
    // same 1500ms window, this callback still fired regardless and
    // mutated two tiles that may no longer even belong to the current
    // scene — a genuine, real-world-reachable bug given the ongoing
    // shuffle timer that triggers this keeps running independent of
    // Ambient's own step timing. token ties both tiles together so
    // abortPendingSwap (already called on every tile during any
    // teardown) can find and cancel this from EITHER side, and the
    // staleness check below additionally covers the (much narrower)
    // remaining window between the timer firing and abortPendingSwap
    // actually having run.
    const token = { infoA, infoB, timerId: null };
    infoA.__pendingPairSwap = token;
    infoB.__pendingPairSwap = token;
    // 1500ms, not the original 420ms — that left ~28% opacity still
    // clearly visible on BOTH tiles at the moment their content
    // actually swapped, reading as a visible flicker/pop mid-fade
    // rather than a clean swap once genuinely faded out. Same fix as
    // beginTileCrossfade/the wall-and-disc-art fade timing above.
    token.timerId = setTimeout(() => {
      if (infoA.__pendingPairSwap !== token || infoB.__pendingPairSwap !== token) return;
      infoA.__pendingPairSwap = null;
      infoB.__pendingPairSwap = null;
      const idxA = infoA.idx, idxB = infoB.idx;
      const mapA = infoA.mat.map, mapB = infoB.mat.map;
      const videoElA = infoA.videoEl, videoElB = infoB.videoEl;
      const videoTexA = infoA.videoTex, videoTexB = infoB.videoTex;
      infoA.idx = idxB; infoA.mat.map = mapB; infoA.mat.needsUpdate = true;
      infoA.videoEl = videoElB; infoA.videoTex = videoTexB;
      infoB.idx = idxA; infoB.mat.map = mapA; infoB.mat.needsUpdate = true;
      infoB.videoEl = videoElA; infoB.videoTex = videoTexA;
      // Re-fit each tile's now-swapped content against ITS OWN current
      // dimensions — content fitted for tile A's own shape doesn't
      // necessarily still fit correctly once it's showing on tile B
      // instead (same underlying mismatch as beginTileCrossfade's own
      // re-fit, just from swapping between two tiles instead of a
      // resize happening mid-load).
      [infoA, infoB].forEach((info) => {
        if (typeof info.idx === 'string' && info.idx.indexOf('v:') === 0) {
          applyVideoFit(info);
        } else if (info.mat.map) {
          fitCover(info.mat.map, info.w, info.h);
        }
      });
      infoA.mat.__fadeTarget = 1;
      infoB.mat.__fadeTarget = 1;
    }, 1500);
  }
  function scheduleNextTick(fn, seconds) {
    const jitterMs = seconds * 1000 * (0.95 + Math.random() * 0.1);
    const id = setTimeout(() => {
      if (trailerActive && currentFullItem) fn();
      scheduleNextTick(fn, seconds);
    }, jitterMs);
    backdropShuffleTimers.push(id);
  }
  function doSingleTick(sideIdx, others) {
    if (gridTileInfo.length < 2) return;
    const info = gridTileInfo[sideIdx];
    const otherInfo = gridTileInfo[sideIdx === 0 ? 1 : 0];
    const bag = sideIdx === 0 ? leftBag : rightBag;
    const newIdx = drawFromBag(bag, others, [otherInfo.idx], [otherInfo.idx]);
    fadeSwapTile(info, newIdx);
  }
  function doGridSideTick(sideIdx, others) {
    if (gridTileInfo.length < 4 || gridTileInfo.length % 2 !== 0) return;
    const sideSize = gridTileInfo.length / 2;
    const sideStart = sideIdx === 0 ? 0 : sideSize;
    const otherStart = sideIdx === 0 ? sideSize : 0;
    const sideTiles = gridTileInfo.slice(sideStart, sideStart + sideSize);
    const otherTiles = gridTileInfo.slice(otherStart, otherStart + sideSize);
    const sideUsed = sideTiles.map((t) => t.idx);
    const globalUsed = gridTileInfo.map((t) => t.idx);
    const bag = sideIdx === 0 ? leftBag : rightBag;
    let newIdx = drawFromBag(bag, others, sideUsed, globalUsed);
    const diagonalOf = sideSize === 4 ? [3, 2, 1, 0] : [1, 0];
    const allPositions = Array.from({ length: sideSize }, (_, i) => i);
    const myVids = sideTiles.filter((t) => isVideoEntry(t.idx)).length;
    const otherVids = otherTiles.filter((t) => isVideoEntry(t.idx)).length;
    let forceNetZero = false;
    if (backdropBalanceVideos && isVideoEntry(newIdx) && myVids > otherVids) {
      // HARD side quota: the sides may never differ by more than one
      // video. This side already leads, so redirect the draw to an image
      // (the video instance goes back into the bag and stays available
      // for the other side). No image available -> place the video onto a
      // tile that already shows one (net-zero, never worsens the split).
      let imgPos = bag.arr.findIndex((v) => !isVideoEntry(v) && !globalUsed.includes(v));
      if (imgPos === -1) imgPos = bag.arr.findIndex((v) => !isVideoEntry(v) && !sideUsed.includes(v));
      if (imgPos === -1) imgPos = bag.arr.findIndex((v) => !isVideoEntry(v));
      if (imgPos !== -1) {
        bag.arr.push(newIdx);
        newIdx = bag.arr.splice(imgPos, 1)[0];
      } else {
        forceNetZero = true;
      }
    }
    const matchPos = sideTiles.findIndex((t) => t.idx === newIdx);
    let targetLocal;
    if (matchPos !== -1) {
      targetLocal = diagonalOf[matchPos];
    } else {
      let candidates = allPositions.filter((p) => sideTiles[p].idx !== newIdx);
      if (forceNetZero) {
        const vidCandidates = candidates.filter((p) => isVideoEntry(sideTiles[p].idx));
        if (vidCandidates.length) candidates = vidCandidates;
      } else if (backdropBalanceVideos && isVideoEntry(newIdx)) {
        // SOFT anchor diagonal: exactly one other video on this side ->
        // prefer its diagonal partner position. The anchor itself keeps
        // wandering over time, so the preferred diagonal wanders with it
        // (0+3 one moment, 1+2 the next) — diagonal look without a lock.
        const vidPositions = allPositions.filter((p) => isVideoEntry(sideTiles[p].idx));
        if (vidPositions.length === 1 && sideSize === 4) {
          const want = diagonalOf[vidPositions[0]];
          if (candidates.includes(want)) candidates = [want];
        }
      } else if (backdropBalanceVideos && !isVideoEntry(newIdx) && myVids > 0 && otherVids > myVids) {
        // An image draw must not eat one of this side's videos while the
        // OTHER side leads — that would push the split past the quota.
        // Prefer replacing a non-video tile instead.
        const imgCandidates = candidates.filter((p) => !isVideoEntry(sideTiles[p].idx));
        if (imgCandidates.length) candidates = imgCandidates;
      }
      targetLocal = candidates[Math.floor(Math.random() * candidates.length)];
    }
    fadeSwapTile(gridTileInfo[sideStart + targetLocal], newIdx);
  }
  function doSwapTick(sideIdx) {
    if (gridTileInfo.length < 8) return;
    const sideStart = sideIdx === 0 ? 0 : 4;
    const positions = shuffle([0, 1, 2, 3]).slice(0, 2);
    const a = gridTileInfo[sideStart + positions[0]];
    const b = gridTileInfo[sideStart + positions[1]];
    const aVid = typeof a.idx === 'string' && a.idx.indexOf('v:') === 0;
    const bVid = typeof b.idx === 'string' && b.idx.indexOf('v:') === 0;
    // Swap-only mode (pool of exactly 4) never re-resolves tiles — a video
    // segment picked once at build time would keep its original random
    // timestamp forever, merely moving between tiles. Re-resolve video
    // tiles instead of pair-swapping so each pick rolls a fresh timestamp.
    if (aVid || bVid) {
      if (aVid) fadeSwapTile(a, a.idx);
      if (bVid) fadeSwapTile(b, b.idx);
      return;
    }
    fadeSwapPair(a, b);
  }
  let nextShuffleSide = 0;
  function startBackdropShuffle(fullItem, count, others, mode) {
    stopBackdropShuffle();
    const shuffleMode = document.getElementById('backdropModeSelect').value;
    if (shuffleMode !== 'shuffle' || !others || others.length <= 1) return;
    const seconds = Math.max(1, parseInt(document.getElementById('backdropSecondsInput').value, 10) || 5);
    const n = others.length;
    nextShuffleSide = 0;
    scheduleNextTick(() => {
      const sideIdx = nextShuffleSide;
      nextShuffleSide = 1 - nextShuffleSide;
      if (mode === 'single') doSingleTick(sideIdx, others);
      else if (mode === 'grid' && n === 4) doSwapTick(sideIdx);
      else doGridSideTick(sideIdx, others);
    }, seconds);
  }
  async function startTrailer(item, allowSkipIfUnchanged) {
    if (themeSongAudio && !themeSongAudio.paused) themeSongAudio.pause();
    // Any pending theme-song timer (Delayed Start / Fade In / Fade
    // Out / Early End) from an EARLIER step must not be allowed to
    // fire late against whatever THIS step actually is — pause()
    // alone only stops what's audibly playing right now, it doesn't
    // touch anything still WAITING to run. Same fix, same reasoning,
    // as stopAllPlayback's own clearThemeSongTimers call already has
    // — this function just never had its own copy of it.
    clearThemeSongTimers();
    themeSongPlaythroughGeneration++;
    themeSongReplacingActive = false;
    actionRequestId++;
    const myRequestId = actionRequestId;
    const switchingTrailer = trailerActive;
    stopTrailer(switchingTrailer, allowSkipIfUnchanged);
    trailerItemId = item.Id;
    if (fanartWallActive) fanartWallItemId = item.Id;
    tooltipEl.innerHTML = item.Name + '<div class="trailerhint">Looking for trailer …</div>';
    try {
      const fullItemPromise = jfGet('/Users/' + session.userId + '/Items/' + item.Id, {});
      const themeSongPromise = replaceAudioTrailer ? jfGet('/Items/' + item.Id + '/ThemeSongs', { userId: session.userId }).catch(() => null) : Promise.resolve(null);
      const trailers = await jfGet('/Users/' + session.userId + '/Items/' + item.Id + '/LocalTrailers', {});
      if (trailers && trailers.length) trailerAvailabilityCache[item.Id] = true;
      const fullItem = await fullItemPromise;
      const themeSongData = await themeSongPromise;
      const replaceSong = startChannel(trailerReplaceChannel, (themeSongData && themeSongData.Items) || [], trailerReplaceAudioOrder);
      if (myRequestId !== actionRequestId) return;
      if (!trailers || !trailers.length) {
        activeEnvState = 'EnvTrailer';
        showNoTrailerDisplay(item, fullItem, 'notrailer', allowSkipIfUnchanged);
        return;
      }
      const chosenTrailer = startChannel(trailerChannel, trailers, trailerPlaybackOrder);
      const src = session.serverUrl + '/Videos/' + chosenTrailer.Id + '/stream.mp4?api_key=' + session.accessToken;
      trailerVideo.src = src;
      trailerVideo.currentTime = 0;
      trailerVideo.loop = trailerChannel.queue.length <= 1 ? loopTrailer : false;
      let soundBlocked = false;
      let usingReplaceThemeSong = false;
      if (replaceAudioTrailer && replaceSong) {
        usingReplaceThemeSong = true;
        trailerVideoVolumeTarget = volTrailer / 100;
        trailerVideo.muted = true;
        try { await trailerVideo.play(); } catch (playErr) {
          console.error('[Cinema] trailer play blocked entirely', playErr);
          tooltipEl.innerHTML = item.Name + '<div class="trailerhint">Playback blocked</div>';
          trailerItemId = null;
          if (switchingTrailer) setDim(false);
          return;
        }
      } else {
        const forcedMute = replaceAudioTrailer && noThemeSongFallbackTrailer === 'mute';
        trailerVideoVolumeTarget = volTrailer / 100;
        trailerVideo.muted = forcedMute;
        try {
          await trailerVideo.play();
        } catch (playErr) {
          console.warn('[Cinema] playback with sound blocked, retrying muted', playErr);
          soundBlocked = true;
          trailerVideo.muted = true;
          try {
            await trailerVideo.play();
          } catch (playErr2) {
            console.error('[Cinema] trailer play blocked entirely', playErr2);
            tooltipEl.innerHTML = item.Name + '<div class="trailerhint">Playback blocked</div>';
            trailerItemId = null;
            if (switchingTrailer) setDim(false);
            return;
          }
        }
        if (forcedMute) soundBlocked = true;
      }
      if (myRequestId !== actionRequestId) return;
      if (usingReplaceThemeSong) {
        ensureThemeSongAudio();
        themeSongAudio.volume = volTrailer / 100;
        // Native .loop disabled whenever Start Position is 'random' —
        // see ambientStartMovieReplaceAudio's own comment for why.
        themeSongAudio.loop = (trailerReplaceChannel.queue.length <= 1 && trailerReplaceAudioStartPosition !== 'random') ? loopTrailer : false;
        themeSongAudio.src = session.serverUrl + '/Audio/' + replaceSong.Id + '/stream?static=true&api_key=' + session.accessToken;
        themeSongAudio.currentTime = 0;
        themeSongAudioItemId = item.Id;
        themeSongAudioContext = 'trailerReplace';
        // Same reasoning as ambientStartMovieReplaceAudio's own reset —
        // this is ALSO an independent themeSongAudio playthrough outside
        // tryPlayThemeSongForItem, so any pending trim/fade timers from
        // an earlier genuine Theme Song step must not fire against it.
        clearThemeSongTimers();
        themeSongPlaythroughGeneration++;
        applyThemeSongStartPosition(themeSongAudio, trailerReplaceAudioStartPosition, trailerReplaceAudioStartMin, trailerReplaceAudioStartMax, themeSongPlaythroughGeneration);
        themeSongAudio.play().catch(() => {});
        themeSongReplacingActive = true;
      }
      room.screenMat.map = null;
      room.screenMat.emissiveMap = null;
      screenMatForceBlack = true;
      if (fallbackImageMesh) fallbackImageTargetOpacity = 0;
      // Video is genuinely taking over the screen right here — the
      // previously-shown Front Art (if any) no longer reflects what's
      // actually visible, so showNoTrailerDisplay's own skip-if-
      // unchanged check must not be allowed to think otherwise later.
      // Without this, Ambient Mode's own lightweight step-to-step
      // transitions (stopTrailer called with allowSkipIfUnchanged=true,
      // which deliberately skips ITS OWN reset of this same key) left a
      // stale match whenever the NEXT step wanted Front Art again for
      // the same item/screen-state a PREVIOUS Front Art display once
      // used — the wall went black (video's own fallback-hide, right
      // above) and simply stayed that way, since the reload got wrongly
      // skipped as "nothing changed".
      screenArtLastShownKey = null;
      if (trailerVideo.videoWidth) showVideoOnScreen();
      else trailerVideo.addEventListener('loadedmetadata', showVideoOnScreen, { once: true });
      if (screenLogoMesh) screenLogoTargetOpacity = 0;
      activeEnvState = 'EnvTrailer';
      buildBackdropMosaic(fullItem, allowSkipIfUnchanged);
      setDim(envEnabled('dim'));
      trailerActive = true; refreshInstructions();
      activeVideoState = 'trailer';
      activeVideoItem = item;
      isStaticDisplay = false;
      instructionsEl.innerHTML = baseInstructions();
      const statusMsg = usingReplaceThemeSong ? 'Playing (theme song audio) — ' + stopLabel() + ' to stop' : (soundBlocked ? 'Playing muted — ' : 'Playing — ') + stopLabel() + ' to stop';
      tooltipEl.innerHTML = item.Name + '<div class="trailerhint">' + statusMsg + '</div>';
    } catch (err) {
      console.error('[Cinema]', err);
      tooltipEl.innerHTML = item.Name + '<div class="trailerhint">Error — see console</div>';
      trailerItemId = null;
      if (switchingTrailer) setDim(false);
    }
  }
  function showScreenLogo(fullItem, logoTag) {
    const url = session.serverUrl + '/Items/' + fullItem.Id + '/Images/Logo?tag=' + logoTag + '&api_key=' + session.accessToken;
    backdropLoader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const iw = tex.image.width, ih = tex.image.height;
      const maxW = room.screenW * 0.4, maxH = room.screenH * 0.3;
      const aspect = iw / ih;
      let w = maxW, h = maxW / aspect;
      if (h > maxH) { h = maxH; w = maxH * aspect; }
      if (!screenLogoMesh) {
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
        screenLogoMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        screenLogoMesh.renderOrder = 10;
        scene.add(screenLogoMesh);
      } else {
        screenLogoMesh.material.map = tex;
        screenLogoMesh.material.needsUpdate = true;
      }
      screenLogoMesh.scale.set(w, h, 1);
      screenLogoMesh.position.set(0, room.screenH / 2, -room.ROOM_DEPTH / 2 + 0.13);
      screenLogoMesh.visible = true;
      screenLogoTargetOpacity = 1;
    }, undefined, () => {});
  }
  let fallbackImageMesh = null;
  let videoScreenMesh = null;
  function showVideoOnScreen() {
    const vw = trailerVideo.videoWidth, vh = trailerVideo.videoHeight;
    if (!vw || !vh) return;
    const imgAspect = vw / vh, boxAspect = room.screenW / room.screenH;
    let w, h;
    if (imgAspect > boxAspect) { w = room.screenW; h = room.screenW / imgAspect; } else { h = room.screenH; w = room.screenH * imgAspect; }
    if (!videoScreenMesh) {
      const mat = new THREE.MeshBasicMaterial({ map: trailerTexture });
      videoScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      scene.add(videoScreenMesh);
    }
    videoScreenMesh.scale.set(w, h, 1);
    videoScreenMesh.position.set(0, room.screenH / 2, -room.ROOM_DEPTH / 2 + 0.13);
    videoScreenMesh.visible = true;
  }
  function refreshScreenContentFit() {
    // Called every frame WHILE a resize animation runs, so the currently
    // visible screen content (video / fallback image / title logo) grows
    // or shrinks together with the wall in real time — not just whenever
    // the next media event happens to re-fit it.
    if (videoScreenMesh && videoScreenMesh.visible) showVideoOnScreen();
    if (fallbackImageMesh && fallbackImageMesh.visible && fallbackImageMesh.material.map && fallbackImageMesh.material.map.image) {
      const img = fallbackImageMesh.material.map.image;
      const imgAspect = img.width / img.height, boxAspect = room.screenW / room.screenH;
      let w, h;
      if (imgAspect > boxAspect) { w = room.screenW; h = room.screenW / imgAspect; } else { h = room.screenH; w = room.screenH * imgAspect; }
      fallbackImageMesh.scale.set(w, h, 1);
      fallbackImageMesh.position.set(0, room.screenH / 2, -room.ROOM_DEPTH / 2 + 0.13);
    }
    if (screenLogoMesh && screenLogoMesh.visible && screenLogoMesh.material.map && screenLogoMesh.material.map.image) {
      const img = screenLogoMesh.material.map.image;
      const maxW = room.screenW * 0.4, maxH = room.screenH * 0.3;
      const aspect = img.width / img.height;
      let w = maxW, h = maxW / aspect;
      if (h > maxH) { h = maxH; w = maxH * aspect; }
      screenLogoMesh.scale.set(w, h, 1);
      screenLogoMesh.position.set(0, room.screenH / 2, -room.ROOM_DEPTH / 2 + 0.13);
    }
  }
  function showFallbackImage(tex) {
    const iw = tex.image.width, ih = tex.image.height;
    const imgAspect = iw / ih, boxAspect = room.screenW / room.screenH;
    let w, h;
    if (imgAspect > boxAspect) { w = room.screenW; h = room.screenW / imgAspect; } else { h = room.screenH; w = room.screenH * imgAspect; }
    if (!fallbackImageMesh) {
      // transparent:true added — this material previously had no
      // opacity support at all, meaning it could only ever be fully
      // shown or fully hidden via .visible, with no way to fade.
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
      fallbackImageMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      scene.add(fallbackImageMesh);
    } else {
      fallbackImageMesh.material.map = tex;
      fallbackImageMesh.material.needsUpdate = true;
    }
    fallbackImageMesh.scale.set(w, h, 1);
    fallbackImageMesh.position.set(0, room.screenH / 2, -room.ROOM_DEPTH / 2 + 0.13);
    fallbackImageMesh.visible = true;
    fallbackImageTargetOpacity = 1;
  }
  function showNoTrailerDisplay(item, fullItem, mode, allowSkipIfUnchanged) {
    if (mode === 'notrailer') {
      tooltipEl.innerHTML = item.Name + '<div class="trailerhint blinkRed">No trailer available</div>';
      setTimeout(() => {
        if (trailerItemId === item.Id) {
          tooltipEl.innerHTML = item.Name + '<div class="trailerhint">Showing artwork — ' + stopLabel() + ' to stop</div>';
        }
      }, 1600);
    } else {
      const modeLabel = mode === 'themesong' ? 'Playing theme song' : mode === 'fanart' ? 'Fanart wall' : 'Showing artwork';
      tooltipEl.innerHTML = item.Name + '<div class="trailerhint">' + modeLabel + ' — ' + stopLabel() + ' to stop</div>';
    }
    room.screenMat.map = null;
    room.screenMat.emissiveMap = null;
    // Front Art actively showing forces black unconditionally, same as
    // video (screenMatForceBlack=true, no dim-level involvement at
    // all). NOT forced (false) whenever Front Art is off — that's
    // exactly the case that should now be governed by dimLevel itself
    // in the per-frame blend below, matching "Dim on -> black, Dim off
    // -> grey" from the same underlying variable the room lighting
    // uses, rather than checking envEnabled('dim') as a static
    // yes/no here.
    screenMatForceBlack = envEnabled('screen');
    if (videoScreenMesh) videoScreenMesh.visible = false;
    // Same narrow, opt-in skip as buildBackdropMosaic above — only ever
    // considered when a caller explicitly passes allowSkipIfUnchanged
    // (currently only Ambient Mode). What's WRAPPED below is what
    // actually fetches and swaps a texture (a real network round-trip
    // plus a material swap) — skipped outright if it would just reload
    // the exact same image onto the exact same mesh it's already
    // showing. The background-color/emissive lines just above are
    // cheap, instant material-property assignments with no visible
    // flicker of their own even when redundant (same class as setDim),
    // so those still always run regardless — only the expensive reload
    // is guarded. Wrapped in an if, NOT an early return — the rest of
    // this function (buildBackdropMosaic's own independent check, dim,
    // the trailerActive/instructions bookkeeping) still has to run every
    // single time regardless of whether screen art specifically needed
    // touching this time.
    const screenArtKey = fullItem.Id + ':' + envEnabled('screen');
    const skipScreenArt = allowSkipIfUnchanged && screenArtKey === screenArtLastShownKey;
    if (!skipScreenArt) {
      screenArtLastShownKey = screenArtKey;
      if (envEnabled('screen')) {
        const thumbTag = fullItem.ImageTags && fullItem.ImageTags.Thumb;
        const backdropTag = fullItem.BackdropImageTags && fullItem.BackdropImageTags[0];
        const posterTag = fullItem.ImageTags && fullItem.ImageTags.Primary;
        const logoTag = fullItem.ImageTags && fullItem.ImageTags.Logo;
        if (thumbTag) {
          const url = session.serverUrl + '/Items/' + fullItem.Id + '/Images/Thumb?tag=' + thumbTag + '&api_key=' + session.accessToken;
          backdropLoader.load(url, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            showFallbackImage(tex);
          }, undefined, () => {});
          if (screenLogoMesh) screenLogoTargetOpacity = 0;
        } else if (backdropTag) {
          const url = session.serverUrl + '/Items/' + fullItem.Id + '/Images/Backdrop/0?tag=' + backdropTag + '&api_key=' + session.accessToken;
          backdropLoader.load(url, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            showFallbackImage(tex);
          }, undefined, () => {});
          if (logoTag) showScreenLogo(fullItem, logoTag);
          else if (screenLogoMesh) screenLogoTargetOpacity = 0;
        } else if (posterTag) {
          const url = session.serverUrl + '/Items/' + fullItem.Id + '/Images/Primary?tag=' + posterTag + '&api_key=' + session.accessToken;
          backdropLoader.load(url, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            showFallbackImage(tex);
          }, undefined, () => {});
          if (screenLogoMesh) screenLogoTargetOpacity = 0;
        } else {
          if (fallbackImageMesh) fallbackImageTargetOpacity = 0;
          if (screenLogoMesh) screenLogoTargetOpacity = 0;
        }
      } else {
        if (fallbackImageMesh) fallbackImageTargetOpacity = 0;
        if (screenLogoMesh) screenLogoTargetOpacity = 0;
      }
    }
    buildBackdropMosaic(fullItem, allowSkipIfUnchanged);
    setDim(envEnabled('dim'));
    trailerActive = true; refreshInstructions();
    isStaticDisplay = true;
    instructionsEl.innerHTML = baseInstructions();
  }
  async function handleVideoEnded() {
    const state = activeVideoState;
    const item = activeVideoItem;
    if (state === 'trailer' || state === 'themevideo') {
      const channel = state === 'trailer' ? trailerChannel : themeVideoChannel;
      const loopOn = state === 'trailer' ? loopTrailer : loopThemeVideo;
      if (channel.queue.length > 1) {
        const nextMedia = advanceChannel(channel, loopOn);
        if (nextMedia) { playNextQueuedVideo(nextMedia); return; }
      }
    }
    const inheritedEnvState = state === 'movie' ? 'EnvMovie' : state === 'trailer' ? 'EnvTrailer' : 'EnvThemeVideo';
    let wantThemeSong = false, wantScreenArt = false;
    if (state === 'movie') { wantThemeSong = afterMovieThemeSong; wantScreenArt = afterMovieScreenArt; }
    else if (state === 'trailer') { wantThemeSong = afterTrailerThemeSong; wantScreenArt = afterTrailerScreenArt; }
    else if (state === 'themevideo') { wantThemeSong = afterThemeVideoThemeSong; wantScreenArt = afterThemeVideoScreenArt; }
    if (!item || (!wantThemeSong && !wantScreenArt)) { stopTrailer(); return; }
    if (wantThemeSong) {
      const themeSongStarted = await tryPlayThemeSongForItem(item);
      if (themeSongStarted) return;
      if (!wantScreenArt) { stopTrailer(); return; }
    }
    actionRequestId++;
    const myRequestId = actionRequestId;
    const switchingTrailer = trailerActive;
    stopTrailer(switchingTrailer);
    try {
      const fullItem = await jfGet('/Users/' + session.userId + '/Items/' + item.Id, {});
      if (myRequestId !== actionRequestId) return;
      activeEnvState = inheritedEnvState;
      showNoTrailerDisplay(item, fullItem, 'screenart');
    } catch (err) {}
  }
  trailerVideo.addEventListener('ended', handleVideoEnded);
  trailerVideo.addEventListener('error', () => {
    console.error('[Cinema] video element error', trailerVideo.error);
  });
  const panelRows = [
    { id: 'sortSelect', type: 'select' },
    { id: 'sortDirSelect', type: 'select' },
    { id: 'layoutSelect', type: 'select' },
    { id: 'startWallSelect', type: 'select' },
    { id: 'repeatModeSelect', type: 'select' },
    { id: 'gapPositionSelect', type: 'select' },
    { id: 'msFilters', type: 'multiselect' },
    { id: 'msFeatures', type: 'multiselect' },
    { id: 'msGenres', type: 'multiselect' },
    { id: 'msRatings', type: 'multiselect' },
    { id: 'msTags', type: 'multiselect' },
    { id: 'msVideoTypes', type: 'multiselect' },
    { id: 'msYears', type: 'multiselect' },
    { id: 'msStudios', type: 'multiselect' },
    { id: 'msCollections', type: 'multiselect' },
    { id: 'actorInput', type: 'text' },
    { id: 'movieInput', type: 'text' },
    { id: 'panelResetAll', type: 'button' },
    { id: 'buttonRow', type: 'buttonRow', ids: ['panelClose', 'panelApply'], defaultSub: 1 },
  ];
  const menuRows = [
    { id: 'menuTabs', type: 'tabbar' },
    { id: 'movementSpeedSlider', type: 'slider' },
    { id: 'autoSprintToggle', type: 'checkbox' },
    { id: 'jumpEnableToggle', type: 'checkbox' },
    { id: 'crouchEnableToggle', type: 'checkbox' },
    { id: 'crouchModeSelect', type: 'select' },
    { id: 'controllerMovementToggle', type: 'checkbox' },
    { id: 'controllerSelect', type: 'select' },
    { id: 'deadzoneSlider', type: 'slider' },
    { id: 'sensitivitySlider', type: 'slider' },
    { id: 'cinemaKeyboardEnabledToggle', type: 'checkbox' },
    { id: 'cinemaKeyboardColorInput', type: 'text' },
    { id: 'cinemaKeyboardPositionSelect', type: 'select' },
    { id: 'cinemaKeyboardIdleInput', type: 'number' },
    { id: 'hudToggle', type: 'checkbox' },
    { id: 'controlsUiToggle', type: 'checkbox' },
    { id: 'fovSlider', type: 'slider' },
    { id: 'audienceBrightnessSlider', type: 'slider' },
    { id: 'cinemaBrightnessSlider', type: 'slider' },
    { id: 'frontWallBrightnessOffSlider', type: 'slider' },
    { id: 'frontWallBrightnessOnSlider', type: 'slider' },
    { id: 'backwallBrightnessOffSlider', type: 'slider' },
    { id: 'backwallBrightnessOnSlider', type: 'slider' },
    { id: 'posterWallBrightnessOffSlider', type: 'slider' },
    { id: 'posterWallBrightnessOnSlider', type: 'slider' },
    { id: 'posterLightBrightnessSlider', type: 'slider' },
    { id: 'roomDesignSelect', type: 'select' },
    { id: 'roomSizeSelect', type: 'select' },
    { id: 'roomScaleModeSelect', type: 'select' },
    { id: 'scaleMovementSpeedToggle', type: 'checkbox' },
    { id: 'scalePlayerPositionToggle', type: 'checkbox' },
    { id: 'ropeBarrierToggle', type: 'checkbox' },
    { id: 'kioskShowModeSelect', type: 'select' },
    { id: 'kioskLogoToggle', type: 'checkbox' },
    { id: 'kioskBrandingModeSelect', type: 'select' },
    { id: 'kioskLogoSpeedSlider', type: 'slider' },
    { id: 'kioskLogoGlitchFreqSlider', type: 'slider' },
    { id: 'kioskLogoGlitchIntensitySlider', type: 'slider' },
    { id: 'msPosterMenuTabs', type: 'multiselect' },
    { id: 'hideUnavailableToggle', type: 'checkbox' },
    { id: 'msEnvMovie', type: 'multiselect' },
    { id: 'volMovieSlider', type: 'slider' },
    { id: 'loopMovieToggle', type: 'checkbox' },
    { id: 'afterMovieThemeSongToggle', type: 'checkbox' },
    { id: 'afterMovieScreenArtToggle', type: 'checkbox' },
    { id: 'msEnvTrailer', type: 'multiselect' },
    { id: 'volTrailerSlider', type: 'slider' },
    { id: 'trailerPlaybackOrderSelect', type: 'select' },
    { id: 'loopTrailerToggle', type: 'checkbox' },
    { id: 'afterTrailerThemeSongToggle', type: 'checkbox' },
    { id: 'afterTrailerScreenArtToggle', type: 'checkbox' },
    { id: 'replaceAudioTrailerToggle', type: 'checkbox' },
    { id: 'trailerReplaceAudioOrderSelect', type: 'select' },
    { id: 'trailerReplaceAudioStartPositionSelect', type: 'select' },
    { id: 'trailerReplaceAudioStartMinInput', type: 'number' },
    { id: 'trailerReplaceAudioStartMaxInput', type: 'number' },
    { id: 'noThemeSongFallbackTrailerSelect', type: 'select' },
    { id: 'msEnvThemeVideo', type: 'multiselect' },
    { id: 'volThemeVideoSlider', type: 'slider' },
    { id: 'themeVideoPlaybackOrderSelect', type: 'select' },
    { id: 'loopThemeVideoToggle', type: 'checkbox' },
    { id: 'afterThemeVideoThemeSongToggle', type: 'checkbox' },
    { id: 'afterThemeVideoScreenArtToggle', type: 'checkbox' },
    { id: 'replaceAudioThemeVideoToggle', type: 'checkbox' },
    { id: 'themeVideoReplaceAudioOrderSelect', type: 'select' },
    { id: 'themeVideoReplaceAudioStartPositionSelect', type: 'select' },
    { id: 'themeVideoReplaceAudioStartMinInput', type: 'number' },
    { id: 'themeVideoReplaceAudioStartMaxInput', type: 'number' },
    { id: 'noThemeSongFallbackThemeVideoSelect', type: 'select' },
    { id: 'msEnvThemeSong', type: 'multiselect' },
    { id: 'volThemeSongSlider', type: 'slider' },
    { id: 'loopThemeSongToggle', type: 'checkbox' },
    { id: 'themeSongPlaybackOrderSelect', type: 'select' },
    { id: 'themeSongStartPositionSelect', type: 'select' },
    { id: 'themeSongStartMinInput', type: 'number' },
    { id: 'themeSongStartMaxInput', type: 'number' },
    { id: 'themeSongDelayedStartInput', type: 'number' },
    { id: 'themeSongDelayedStartFirstOnlyToggle', type: 'checkbox' },
    { id: 'themeSongFadeInInput', type: 'number' },
    { id: 'themeSongFadeOutInput', type: 'number' },
    { id: 'themeSongFadeFirstOnlyToggle', type: 'checkbox' },
    { id: 'msEnvFanartWall', type: 'multiselect' },
    { id: 'ambientProfileSelect', type: 'select' },
       { id: 'ambientProfileLoopToggle', type: 'checkbox' },
    { id: 'ambientSequenceCountSelect', type: 'select' },
    { id: 'ambientSequence1EffectSelect', type: 'select' },
    { id: 'ambientSequence1VolumeSlider', type: 'slider' },
    { id: 'ambientSequence1LoopToggle', type: 'checkbox' },
    { id: 'ambientSequence1DurationTypeSelect', type: 'select' },
    { id: 'ambientSequence1DurationValueInput', type: 'number' },
    { id: 'ambientSequence1PlaybackOrderSelect', type: 'select' },
    { id: 'ambientSequence1MovieStartModeSelect', type: 'select' },
    { id: 'ambientSequence1MovieStartMinInput', type: 'number' },
    { id: 'ambientSequence1MovieStartMaxInput', type: 'number' },
    { id: 'ambientSequence1ThemeSongStartPositionSelect', type: 'select' },
    { id: 'ambientSequence1ThemeSongStartMinInput', type: 'number' },
    { id: 'ambientSequence1ThemeSongStartMaxInput', type: 'number' },
    { id: 'ambientSequence1ThemeSongDelayedStartInput', type: 'number' },
    { id: 'ambientSequence1ThemeSongDelayedStartFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence1ThemeSongFadeInInput', type: 'number' },
    { id: 'ambientSequence1ThemeSongFadeOutInput', type: 'number' },
    { id: 'ambientSequence1ThemeSongFadeFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence1ThemeSongEarlyEndInput', type: 'number' },
    { id: 'ambientSequence1ReplaceAudioToggle', type: 'checkbox' },
    { id: 'ambientSequence1ReplaceAudioOrderSelect', type: 'select' },
    { id: 'ambientSequence1EnvSelect', type: 'multiselect' },
    { id: 'ambientSequence1FallbackSelect', type: 'select' },
    { id: 'ambientSequence2EffectSelect', type: 'select' },
    { id: 'ambientSequence2VolumeSlider', type: 'slider' },
    { id: 'ambientSequence2LoopToggle', type: 'checkbox' },
    { id: 'ambientSequence2DurationTypeSelect', type: 'select' },
    { id: 'ambientSequence2DurationValueInput', type: 'number' },
    { id: 'ambientSequence2PlaybackOrderSelect', type: 'select' },
    { id: 'ambientSequence2MovieStartModeSelect', type: 'select' },
    { id: 'ambientSequence2MovieStartMinInput', type: 'number' },
    { id: 'ambientSequence2MovieStartMaxInput', type: 'number' },
    { id: 'ambientSequence2ThemeSongStartPositionSelect', type: 'select' },
    { id: 'ambientSequence2ThemeSongStartMinInput', type: 'number' },
    { id: 'ambientSequence2ThemeSongStartMaxInput', type: 'number' },
    { id: 'ambientSequence2ThemeSongDelayedStartInput', type: 'number' },
    { id: 'ambientSequence2ThemeSongDelayedStartFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence2ThemeSongFadeInInput', type: 'number' },
    { id: 'ambientSequence2ThemeSongFadeOutInput', type: 'number' },
    { id: 'ambientSequence2ThemeSongFadeFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence2ThemeSongEarlyEndInput', type: 'number' },
    { id: 'ambientSequence2ReplaceAudioToggle', type: 'checkbox' },
    { id: 'ambientSequence2ReplaceAudioOrderSelect', type: 'select' },
    { id: 'ambientSequence2EnvSelect', type: 'multiselect' },
    { id: 'ambientSequence2FallbackSelect', type: 'select' },
    { id: 'ambientSequence3EffectSelect', type: 'select' },
    { id: 'ambientSequence3VolumeSlider', type: 'slider' },
    { id: 'ambientSequence3LoopToggle', type: 'checkbox' },
    { id: 'ambientSequence3DurationTypeSelect', type: 'select' },
    { id: 'ambientSequence3DurationValueInput', type: 'number' },
    { id: 'ambientSequence3PlaybackOrderSelect', type: 'select' },
    { id: 'ambientSequence3MovieStartModeSelect', type: 'select' },
    { id: 'ambientSequence3MovieStartMinInput', type: 'number' },
    { id: 'ambientSequence3MovieStartMaxInput', type: 'number' },
    { id: 'ambientSequence3ThemeSongStartPositionSelect', type: 'select' },
    { id: 'ambientSequence3ThemeSongStartMinInput', type: 'number' },
    { id: 'ambientSequence3ThemeSongStartMaxInput', type: 'number' },
    { id: 'ambientSequence3ThemeSongDelayedStartInput', type: 'number' },
    { id: 'ambientSequence3ThemeSongDelayedStartFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence3ThemeSongFadeInInput', type: 'number' },
    { id: 'ambientSequence3ThemeSongFadeOutInput', type: 'number' },
    { id: 'ambientSequence3ThemeSongFadeFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence3ThemeSongEarlyEndInput', type: 'number' },
    { id: 'ambientSequence3ReplaceAudioToggle', type: 'checkbox' },
    { id: 'ambientSequence3ReplaceAudioOrderSelect', type: 'select' },
    { id: 'ambientSequence3EnvSelect', type: 'multiselect' },
    { id: 'ambientSequence3FallbackSelect', type: 'select' },
    { id: 'ambientSequence4EffectSelect', type: 'select' },
    { id: 'ambientSequence4VolumeSlider', type: 'slider' },
    { id: 'ambientSequence4LoopToggle', type: 'checkbox' },
    { id: 'ambientSequence4DurationTypeSelect', type: 'select' },
    { id: 'ambientSequence4DurationValueInput', type: 'number' },
    { id: 'ambientSequence4PlaybackOrderSelect', type: 'select' },
    { id: 'ambientSequence4MovieStartModeSelect', type: 'select' },
    { id: 'ambientSequence4MovieStartMinInput', type: 'number' },
    { id: 'ambientSequence4MovieStartMaxInput', type: 'number' },
    { id: 'ambientSequence4ThemeSongStartPositionSelect', type: 'select' },
    { id: 'ambientSequence4ThemeSongStartMinInput', type: 'number' },
    { id: 'ambientSequence4ThemeSongStartMaxInput', type: 'number' },
    { id: 'ambientSequence4ThemeSongDelayedStartInput', type: 'number' },
    { id: 'ambientSequence4ThemeSongDelayedStartFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence4ThemeSongFadeInInput', type: 'number' },
    { id: 'ambientSequence4ThemeSongFadeOutInput', type: 'number' },
    { id: 'ambientSequence4ThemeSongFadeFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence4ThemeSongEarlyEndInput', type: 'number' },
    { id: 'ambientSequence4ReplaceAudioToggle', type: 'checkbox' },
    { id: 'ambientSequence4ReplaceAudioOrderSelect', type: 'select' },
    { id: 'ambientSequence4EnvSelect', type: 'multiselect' },
    { id: 'ambientSequence4FallbackSelect', type: 'select' },
    { id: 'ambientSequence5EffectSelect', type: 'select' },
    { id: 'ambientSequence5VolumeSlider', type: 'slider' },
    { id: 'ambientSequence5LoopToggle', type: 'checkbox' },
    { id: 'ambientSequence5DurationTypeSelect', type: 'select' },
    { id: 'ambientSequence5DurationValueInput', type: 'number' },
    { id: 'ambientSequence5PlaybackOrderSelect', type: 'select' },
    { id: 'ambientSequence5MovieStartModeSelect', type: 'select' },
    { id: 'ambientSequence5MovieStartMinInput', type: 'number' },
    { id: 'ambientSequence5MovieStartMaxInput', type: 'number' },
    { id: 'ambientSequence5ThemeSongStartPositionSelect', type: 'select' },
    { id: 'ambientSequence5ThemeSongStartMinInput', type: 'number' },
    { id: 'ambientSequence5ThemeSongStartMaxInput', type: 'number' },
    { id: 'ambientSequence5ThemeSongDelayedStartInput', type: 'number' },
    { id: 'ambientSequence5ThemeSongDelayedStartFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence5ThemeSongFadeInInput', type: 'number' },
    { id: 'ambientSequence5ThemeSongFadeOutInput', type: 'number' },
    { id: 'ambientSequence5ThemeSongFadeFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence5ThemeSongEarlyEndInput', type: 'number' },
    { id: 'ambientSequence5ReplaceAudioToggle', type: 'checkbox' },
    { id: 'ambientSequence5ReplaceAudioOrderSelect', type: 'select' },
    { id: 'ambientSequence5EnvSelect', type: 'multiselect' },
    { id: 'ambientSequence5FallbackSelect', type: 'select' },
    { id: 'ambientSequence6EffectSelect', type: 'select' },
    { id: 'ambientSequence6VolumeSlider', type: 'slider' },
    { id: 'ambientSequence6LoopToggle', type: 'checkbox' },
    { id: 'ambientSequence6DurationTypeSelect', type: 'select' },
    { id: 'ambientSequence6DurationValueInput', type: 'number' },
    { id: 'ambientSequence6PlaybackOrderSelect', type: 'select' },
    { id: 'ambientSequence6MovieStartModeSelect', type: 'select' },
    { id: 'ambientSequence6MovieStartMinInput', type: 'number' },
    { id: 'ambientSequence6MovieStartMaxInput', type: 'number' },
    { id: 'ambientSequence6ThemeSongStartPositionSelect', type: 'select' },
    { id: 'ambientSequence6ThemeSongStartMinInput', type: 'number' },
    { id: 'ambientSequence6ThemeSongStartMaxInput', type: 'number' },
    { id: 'ambientSequence6ThemeSongDelayedStartInput', type: 'number' },
    { id: 'ambientSequence6ThemeSongDelayedStartFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence6ThemeSongFadeInInput', type: 'number' },
    { id: 'ambientSequence6ThemeSongFadeOutInput', type: 'number' },
    { id: 'ambientSequence6ThemeSongFadeFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence6ThemeSongEarlyEndInput', type: 'number' },
    { id: 'ambientSequence6ReplaceAudioToggle', type: 'checkbox' },
    { id: 'ambientSequence6ReplaceAudioOrderSelect', type: 'select' },
    { id: 'ambientSequence6EnvSelect', type: 'multiselect' },
    { id: 'ambientSequence6FallbackSelect', type: 'select' },
    { id: 'ambientSequence7EffectSelect', type: 'select' },
    { id: 'ambientSequence7VolumeSlider', type: 'slider' },
    { id: 'ambientSequence7LoopToggle', type: 'checkbox' },
    { id: 'ambientSequence7DurationTypeSelect', type: 'select' },
    { id: 'ambientSequence7DurationValueInput', type: 'number' },
    { id: 'ambientSequence7PlaybackOrderSelect', type: 'select' },
    { id: 'ambientSequence7MovieStartModeSelect', type: 'select' },
    { id: 'ambientSequence7MovieStartMinInput', type: 'number' },
    { id: 'ambientSequence7MovieStartMaxInput', type: 'number' },
    { id: 'ambientSequence7ThemeSongStartPositionSelect', type: 'select' },
    { id: 'ambientSequence7ThemeSongStartMinInput', type: 'number' },
    { id: 'ambientSequence7ThemeSongStartMaxInput', type: 'number' },
    { id: 'ambientSequence7ThemeSongDelayedStartInput', type: 'number' },
    { id: 'ambientSequence7ThemeSongDelayedStartFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence7ThemeSongFadeInInput', type: 'number' },
    { id: 'ambientSequence7ThemeSongFadeOutInput', type: 'number' },
    { id: 'ambientSequence7ThemeSongFadeFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence7ThemeSongEarlyEndInput', type: 'number' },
    { id: 'ambientSequence7ReplaceAudioToggle', type: 'checkbox' },
    { id: 'ambientSequence7ReplaceAudioOrderSelect', type: 'select' },
    { id: 'ambientSequence7EnvSelect', type: 'multiselect' },
    { id: 'ambientSequence7FallbackSelect', type: 'select' },
    { id: 'ambientSequence8EffectSelect', type: 'select' },
    { id: 'ambientSequence8VolumeSlider', type: 'slider' },
    { id: 'ambientSequence8LoopToggle', type: 'checkbox' },
    { id: 'ambientSequence8DurationTypeSelect', type: 'select' },
    { id: 'ambientSequence8DurationValueInput', type: 'number' },
    { id: 'ambientSequence8PlaybackOrderSelect', type: 'select' },
    { id: 'ambientSequence8MovieStartModeSelect', type: 'select' },
    { id: 'ambientSequence8MovieStartMinInput', type: 'number' },
    { id: 'ambientSequence8MovieStartMaxInput', type: 'number' },
    { id: 'ambientSequence8ThemeSongStartPositionSelect', type: 'select' },
    { id: 'ambientSequence8ThemeSongStartMinInput', type: 'number' },
    { id: 'ambientSequence8ThemeSongStartMaxInput', type: 'number' },
    { id: 'ambientSequence8ThemeSongDelayedStartInput', type: 'number' },
    { id: 'ambientSequence8ThemeSongDelayedStartFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence8ThemeSongFadeInInput', type: 'number' },
    { id: 'ambientSequence8ThemeSongFadeOutInput', type: 'number' },
    { id: 'ambientSequence8ThemeSongFadeFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence8ThemeSongEarlyEndInput', type: 'number' },
    { id: 'ambientSequence8ReplaceAudioToggle', type: 'checkbox' },
    { id: 'ambientSequence8ReplaceAudioOrderSelect', type: 'select' },
    { id: 'ambientSequence8EnvSelect', type: 'multiselect' },
    { id: 'ambientSequence8FallbackSelect', type: 'select' },
    { id: 'ambientSequence9EffectSelect', type: 'select' },
    { id: 'ambientSequence9VolumeSlider', type: 'slider' },
    { id: 'ambientSequence9LoopToggle', type: 'checkbox' },
    { id: 'ambientSequence9DurationTypeSelect', type: 'select' },
    { id: 'ambientSequence9DurationValueInput', type: 'number' },
    { id: 'ambientSequence9PlaybackOrderSelect', type: 'select' },
    { id: 'ambientSequence9MovieStartModeSelect', type: 'select' },
    { id: 'ambientSequence9MovieStartMinInput', type: 'number' },
    { id: 'ambientSequence9MovieStartMaxInput', type: 'number' },
    { id: 'ambientSequence9ThemeSongStartPositionSelect', type: 'select' },
    { id: 'ambientSequence9ThemeSongStartMinInput', type: 'number' },
    { id: 'ambientSequence9ThemeSongStartMaxInput', type: 'number' },
    { id: 'ambientSequence9ThemeSongDelayedStartInput', type: 'number' },
    { id: 'ambientSequence9ThemeSongDelayedStartFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence9ThemeSongFadeInInput', type: 'number' },
    { id: 'ambientSequence9ThemeSongFadeOutInput', type: 'number' },
    { id: 'ambientSequence9ThemeSongFadeFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence9ThemeSongEarlyEndInput', type: 'number' },
    { id: 'ambientSequence9ReplaceAudioToggle', type: 'checkbox' },
    { id: 'ambientSequence9ReplaceAudioOrderSelect', type: 'select' },
    { id: 'ambientSequence9EnvSelect', type: 'multiselect' },
    { id: 'ambientSequence9FallbackSelect', type: 'select' },
    { id: 'ambientSequence10EffectSelect', type: 'select' },
    { id: 'ambientSequence10VolumeSlider', type: 'slider' },
    { id: 'ambientSequence10LoopToggle', type: 'checkbox' },
    { id: 'ambientSequence10DurationTypeSelect', type: 'select' },
    { id: 'ambientSequence10DurationValueInput', type: 'number' },
    { id: 'ambientSequence10PlaybackOrderSelect', type: 'select' },
    { id: 'ambientSequence10MovieStartModeSelect', type: 'select' },
    { id: 'ambientSequence10MovieStartMinInput', type: 'number' },
    { id: 'ambientSequence10MovieStartMaxInput', type: 'number' },
    { id: 'ambientSequence10ThemeSongStartPositionSelect', type: 'select' },
    { id: 'ambientSequence10ThemeSongStartMinInput', type: 'number' },
    { id: 'ambientSequence10ThemeSongStartMaxInput', type: 'number' },
    { id: 'ambientSequence10ThemeSongDelayedStartInput', type: 'number' },
    { id: 'ambientSequence10ThemeSongDelayedStartFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence10ThemeSongFadeInInput', type: 'number' },
    { id: 'ambientSequence10ThemeSongFadeOutInput', type: 'number' },
    { id: 'ambientSequence10ThemeSongFadeFirstOnlyToggle', type: 'checkbox' },
    { id: 'ambientSequence10ThemeSongEarlyEndInput', type: 'number' },
    { id: 'ambientSequence10ReplaceAudioToggle', type: 'checkbox' },
    { id: 'ambientSequence10ReplaceAudioOrderSelect', type: 'select' },
    { id: 'ambientSequence10EnvSelect', type: 'multiselect' },
    { id: 'ambientSequence10FallbackSelect', type: 'select' },
    { id: 'backdropLayoutSelect', type: 'select' },
    { id: 'backdropModeSelect', type: 'select' },
    { id: 'backdropSecondsInput', type: 'number' },
    { id: 'backdropVideosEnabledToggle', type: 'checkbox' },
    { id: 'backdropBalanceToggle', type: 'checkbox' },
    { id: 'backdropOverscanModeSelect', type: 'select' },
    { id: 'backdropTrailerTilesSelect', type: 'select' },
    { id: 'backdropTrailerOrderSelect', type: 'select' },
    { id: 'backdropTrailerStartSelect', type: 'select' },
    { id: 'backdropThemeVideoTilesSelect', type: 'select' },
    { id: 'backdropThemeVideoOrderSelect', type: 'select' },
    { id: 'backdropThemeVideoStartSelect', type: 'select' },
    { id: 'backdropMovieTilesSelect', type: 'select' },
    { id: 'backdropMovieMinInput', type: 'number' },
    { id: 'backdropMovieMaxInput', type: 'number' },
    { id: 'tabIconSelect', type: 'select' },
    { id: 'libraryItemOpensInSelect', type: 'select' },
    { id: 'menuResetAll', type: 'button' },
    { id: 'menuCloseBtn', type: 'button' },
  ];
  function wireSelectMouseOverride(rows) {
    rows.forEach((row, idx) => {
      if (row.type !== 'select') return;
      const el = document.getElementById(row.id);
      if (!el) return;
      el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        if (navEditing && navFocusIndex === idx) {
          navEditing = false;
          el.selectedIndex = gpDropdownOriginalIndex;
          closeGpDropdown();
          return;
        }
        navFocusIndex = idx;
        navEditing = true;
        updateNavFocusVisual(rows);
        openGpDropdown(el);
      });
    });
  }
  function getHoverTargets(el) {
    const targets = [el];
    const wrapLabel = el.closest('label');
    if (wrapLabel && wrapLabel !== el && !targets.includes(wrapLabel)) targets.push(wrapLabel);
    const prev = el.previousElementSibling;
    if (prev && prev.tagName === 'LABEL' && !targets.includes(prev)) targets.push(prev);
    return targets;
  }
  let lastRealMouseMoveTime = 0;
  document.addEventListener('mousemove', () => { lastRealMouseMoveTime = nowMs(); });
  function isGenuineHover() {
    return (nowMs() - lastRealMouseMoveTime) < 60;
  }
  function wireRowMouseHighlight(rows) {
    rows.forEach((row, idx) => {
      if (row.type === 'buttonRow') {
        row.ids.forEach((id, subI) => {
          const el = document.getElementById(id);
          if (!el) return;
          el.addEventListener('mouseenter', () => {
            if (!isGenuineHover() || navEditing || msOpenFieldId) return;
            navFocusIndex = idx;
            navButtonRowFocus = subI;
            updateNavFocusVisual(rows, undefined, true);
          });
        });
        return;
      }
      const el = document.getElementById(row.id);
      if (!el) return;
      getHoverTargets(el).forEach((target) => {
        target.addEventListener('mouseenter', () => {
          if (!isGenuineHover() || navEditing || msOpenFieldId) return;
          navFocusIndex = idx;
          updateNavFocusVisual(rows, undefined, true);
        });
      });
    });
  }
  let navFocusIndex = 0;
  let navEditing = false;
  let navButtonRowFocus = 0;
  let navBoundaryLock = null; // declared here (not next to navMoveFocus) because setMenuTab writes it during module init
  function repositionOpenDropdown() {
    if (navEditing) {
      const rows = panelEl.style.display === 'block' ? panelRows : menuRows;
      const row = rows[navFocusIndex];
      if (row && row.type === 'select') {
        const el = document.getElementById(row.id);
        if (el) positionDropdownNear(el);
      }
    } else if (msOpenFieldId) {
      const el = document.getElementById(msOpenFieldId);
      if (el) positionDropdownNear(el);
    }
  }
  wireSelectMouseOverride(panelRows);
  wireSelectMouseOverride(menuRows);
  wireRowMouseHighlight(panelRows);
  wireRowMouseHighlight(menuRows);
  function isRowDisabled(row) {
    if (row.type === 'buttonRow') return false;
    const el = document.getElementById(row.id);
    return !!(el && el.disabled);
  }
  function updateNavFocusVisual(rows, forceEdge, skipScroll) {
    let focusedEl = null;
    rows.forEach((r, i) => {
      if (r.type === 'buttonRow') {
        r.ids.forEach((id, subI) => {
          const el = document.getElementById(id);
          const isFocus = i === navFocusIndex && subI === navButtonRowFocus;
          if (el) el.classList.toggle('gp-focus', isFocus);
          if (isFocus) focusedEl = el;
        });
        return;
      }
      const el = document.getElementById(r.id);
      const isFocus = i === navFocusIndex;
      if (el) el.classList.toggle('gp-focus', isFocus);
      if (isFocus) focusedEl = el;
    });
    // Pure mouse hover (wireRowMouseHighlight) passes skipScroll=true —
    // just moving the cursor over a row should only draw the focus ring,
    // never force the panel to jump anywhere. Auto-scrolling here only
    // makes sense for keyboard/gamepad navigation, where there's no
    // wheel to scroll with and "scroll the focused row into view" is the
    // only way to ever see it; a mouse already sees whatever it's
    // hovering, since that's physically where the cursor already is.
    if (focusedEl && !skipScroll) {
      if (rows === menuRows) {
        // Tab pages: reaching the FIRST content row of the active tab (or
        // the tab bar itself) scrolls fully to the top, so the chapter
        // heading and the label above the first control become visible —
        // matching what the mouse wheel can reach. The LAST tab row
        // scrolls fully down; everything in between keeps the minimal
        // 'nearest' scrolling. (Footer buttons live outside the scroll
        // area and never need scrolling.)
        let firstContent = -1, lastContent = -1;
        for (let i = 0; i < rows.length; i++) {
          if (MENU_ROW_TAB[rows[i].id] === activeMenuTab) { if (firstContent < 0) firstContent = i; lastContent = i; }
        }
        if (navFocusIndex === firstContent || rows[navFocusIndex].id === 'menuTabs') menuScrollEl.scrollTop = 0;
        else if (navFocusIndex === lastContent) menuScrollEl.scrollTop = menuScrollEl.scrollHeight;
        else focusedEl.scrollIntoView({ block: 'nearest' });
      } else if (forceEdge) {
        const container = focusedEl.closest('#menuScroll, #menuOverlay, #panel, #controlsOverlay');
        if (container) {
          container.scrollTop = forceEdge === 'start' ? 0 : container.scrollHeight;
        } else {
          focusedEl.scrollIntoView({ block: forceEdge });
        }
      } else {
        focusedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }
  function updatePanelFocusVisual() { updateNavFocusVisual(panelRows); }
  function updateMenuFocusVisual() { updateNavFocusVisual(menuRows); }
  function positionOverlayVertically(el) {
    if (instructionsEl.style.display === 'none') {
      el.style.top = '50%';
    } else {
      const rect = instructionsEl.getBoundingClientRect();
      el.style.top = (rect.top / 2) + 'px';
    }
  }
  function openPanel() {
    closeContextMenu();
    if (document.pointerLockElement) document.exitPointerLock();
    positionOverlayVertically(panelEl);
    panelEl.style.display = 'block';
    navFocusIndex = 0;
    navEditing = false;
    justConfirmedTextField = false;
    navBoundaryLock = null;
    navButtonRowFocus = panelRows[panelRows.length - 1].defaultSub || 0;
    // Safety net for state that can land in multiSelectState/actorInput
    // WITHOUT going through toggleMsOption/resetMsField/the input events
    // above — Smart Launch's own applySmartLaunchToKioskUi populates
    // these directly at startup, before the panel has ever been opened
    // once to pick this up on its own.
    applyFilterMovieExclusionVisuals();
    updatePanelFocusVisual();
    instructionsEl.innerHTML = baseInstructions();
  }
  // Resolves any open in-menu editing state (select dropdown or number
  // field) before an overlay closes. Without this, closing the overlay
  // directly (M key, C key) while a dropdown was open left the native
  // select showing a hover/arrow-moved value that was never committed via
  // 'change' — so the DISPLAYED value permanently drifted from the internal
  // variable and the saved setting. From then on the menu showed one thing
  // while the code used another: the exact "my settings are not applied"
  // symptom. Selects get their original value restored (cancel semantics,
  // matching Escape/B); number fields get committed via 'change' so
  // keyboard/controller adjustments are saved like typed ones.
  function resolveOpenNavEditing(rows) {
    if (!navEditing) return;
    const row = rows[navFocusIndex];
    const el = row && document.getElementById(row.id);
    if (el) {
      if (row.type === 'select') el.selectedIndex = gpDropdownOriginalIndex;
      else if (row.type === 'number' || row.type === 'slider') { el.classList.remove('gp-editing'); el.dispatchEvent(new Event('change')); }
    }
    navEditing = false;
    closeGpDropdown();
  }
  function closePanel() {
    panelEl.style.display = 'none';
    resolveOpenNavEditing(panelRows);
    navEditing = false;
    justConfirmedTextField = false;
    closeGpDropdown();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    instructionsEl.innerHTML = baseInstructions();
  }
  document.getElementById('panelClose').addEventListener('click', () => { closePanel(); requestPointerLockDeferred(); });
  const sortSelect = document.getElementById('sortSelect');
  const sortDirSelect = document.getElementById('sortDirSelect');
  const layoutSelect = document.getElementById('layoutSelect');
  const startWallSelect = document.getElementById('startWallSelect');
  sortSelect.value = MENU_CONFIG.kiosk.search.sortBy.default;
  sortDirSelect.value = MENU_CONFIG.kiosk.search.sortOrder.default;
  layoutSelect.value = MENU_CONFIG.kiosk.search.sortWall.default;
  startWallSelect.value = MENU_CONFIG.kiosk.search.startWall.default;
  markDefaultOption(sortSelect, MENU_CONFIG.kiosk.search.sortBy.default);
  markDefaultOption(sortDirSelect, MENU_CONFIG.kiosk.search.sortOrder.default);
  markDefaultOption(layoutSelect, MENU_CONFIG.kiosk.search.sortWall.default);
  markDefaultOption(startWallSelect, MENU_CONFIG.kiosk.search.startWall.default);
  const repeatModeSelect = document.getElementById('repeatModeSelect');
  const gapPositionSelect = document.getElementById('gapPositionSelect');
  repeatModeSelect.value = MENU_CONFIG.kiosk.search.repeatMode.default;
  gapPositionSelect.value = MENU_CONFIG.kiosk.search.gapPosition.default;
  markDefaultOption(repeatModeSelect, MENU_CONFIG.kiosk.search.repeatMode.default);
  markDefaultOption(gapPositionSelect, MENU_CONFIG.kiosk.search.gapPosition.default);
  function updateGapPositionState() {
    const enabled = repeatModeSelect.value === 'norepeat';
    gapPositionSelect.disabled = !enabled;
    document.getElementById('gapPositionLabel').classList.toggle('disabled', !enabled);
  }
  repeatModeSelect.addEventListener('change', updateGapPositionState);
  updateGapPositionState();
  document.getElementById('panelResetAll').addEventListener('click', () => {
    sortSelect.value = MENU_CONFIG.kiosk.search.sortBy.default;
    sortDirSelect.value = MENU_CONFIG.kiosk.search.sortOrder.default;
    layoutSelect.value = MENU_CONFIG.kiosk.search.sortWall.default;
    startWallSelect.value = MENU_CONFIG.kiosk.search.startWall.default;
    repeatModeSelect.value = MENU_CONFIG.kiosk.search.repeatMode.default;
    gapPositionSelect.value = MENU_CONFIG.kiosk.search.gapPosition.default;
    updateGapPositionState();
    Object.values(MULTI_SELECT_FIELDS).forEach((cfg) => { if (cfg.emptyMeansAll !== false) multiSelectState[cfg.key] = []; });
    updateAllMsSummaries();
    document.getElementById('actorInput').value = '';
    acSelectedPersonId = '';
    document.getElementById('movieInput').value = '';
    acSelectedMovieId = '';
    acClose();
    updateFilterMovieExclusion();
  });
  const controlsOverlayEl = document.getElementById('controlsOverlay');
  const menuOverlayEl = document.getElementById('menuOverlay');
  panelEl.addEventListener('scroll', repositionOpenDropdown);
  const menuScrollEl = document.getElementById('menuScroll');
  menuScrollEl.addEventListener('scroll', repositionOpenDropdown);
  // ===== Tabbed options menu =====
  const MENU_TABS = ['controls', 'display', 'room', 'posters', 'backwall', 'misc', 'credits'];
  // Declared here, early, alongside MENU_TABS itself -- setMenuTab()
  // (which reads this via updateResetButtonState) gets invoked once
  // during initial menu setup, well before the reset-related function
  // definitions further down would otherwise be reached; a later const
  // there would throw (temporal dead zone) on that very first call.
  const TABS_WITH_RESET = ['controls', 'display', 'room', 'misc', 'backwall', 'posters'];
  // Auto-registration for the five shared per-control wiring helpers
  // (wireLoopToggle, wireOrderSelect, wireVolumeSlider,
  // wireThemeSongStartPercent, wireThemeSongTrimSeconds) further down --
  // each one, as a side effect of being called, pushes its own "set to
  // default + fire the real event" closure in here, keyed by tab (via
  // MENU_ROW_TAB, already known at that point). Posters tab's reset
  // leans on this heavily since the vast majority of its ~50 non-
  // Ambient-Sequence fields already go through one of these five.
  const RESET_REGISTRY = {};
  function registerReset(id, fn) {
    const tab = MENU_ROW_TAB[id];
    if (!tab) return;
    (RESET_REGISTRY[tab] = RESET_REGISTRY[tab] || []).push(fn);
  }
  function runRegisteredResets(tab) {
    (RESET_REGISTRY[tab] || []).forEach((fn) => fn());
  }
  const MENU_ROW_TAB = {};
  (function () {
    const assign = (tab, ids) => ids.forEach((id) => { MENU_ROW_TAB[id] = tab; });
    assign('controls', ['movementSpeedSlider', 'autoSprintToggle', 'jumpEnableToggle', 'crouchEnableToggle', 'crouchModeSelect', 'controllerMovementToggle', 'controllerSelect', 'deadzoneSlider', 'sensitivitySlider', 'cinemaKeyboardEnabledToggle', 'cinemaKeyboardColorInput', 'cinemaKeyboardPositionSelect', 'cinemaKeyboardIdleInput']);
    assign('display', ['hudToggle', 'controlsUiToggle', 'fovSlider', 'audienceBrightnessSlider', 'cinemaBrightnessSlider', 'frontWallBrightnessOffSlider', 'frontWallBrightnessOnSlider', 'backwallBrightnessOffSlider', 'backwallBrightnessOnSlider', 'posterWallBrightnessOffSlider', 'posterWallBrightnessOnSlider', 'posterLightBrightnessSlider']);
    assign('room', ['roomDesignSelect', 'roomSizeSelect', 'roomScaleModeSelect', 'scaleMovementSpeedToggle', 'scalePlayerPositionToggle', 'ropeBarrierToggle', 'kioskShowModeSelect', 'kioskLogoToggle', 'kioskBrandingModeSelect', 'kioskLogoSpeedSlider', 'kioskLogoGlitchFreqSlider', 'kioskLogoGlitchIntensitySlider']);
    assign('posters', ['msPosterMenuTabs', 'hideUnavailableToggle', 'msEnvMovie', 'volMovieSlider', 'loopMovieToggle', 'afterMovieThemeSongToggle', 'afterMovieScreenArtToggle', 'msEnvTrailer', 'volTrailerSlider', 'trailerPlaybackOrderSelect', 'loopTrailerToggle', 'afterTrailerThemeSongToggle', 'afterTrailerScreenArtToggle', 'replaceAudioTrailerToggle', 'trailerReplaceAudioOrderSelect', 'trailerReplaceAudioStartPositionSelect', 'trailerReplaceAudioStartMinInput', 'trailerReplaceAudioStartMaxInput', 'noThemeSongFallbackTrailerSelect', 'msEnvThemeVideo', 'volThemeVideoSlider', 'themeVideoPlaybackOrderSelect', 'loopThemeVideoToggle', 'afterThemeVideoThemeSongToggle', 'afterThemeVideoScreenArtToggle', 'replaceAudioThemeVideoToggle', 'themeVideoReplaceAudioOrderSelect', 'themeVideoReplaceAudioStartPositionSelect', 'themeVideoReplaceAudioStartMinInput', 'themeVideoReplaceAudioStartMaxInput', 'noThemeSongFallbackThemeVideoSelect', 'msEnvThemeSong', 'volThemeSongSlider', 'loopThemeSongToggle', 'themeSongPlaybackOrderSelect', 'themeSongStartPositionSelect', 'themeSongStartMinInput', 'themeSongStartMaxInput', 'themeSongDelayedStartInput', 'themeSongDelayedStartFirstOnlyToggle', 'themeSongFadeInInput', 'themeSongFadeOutInput', 'themeSongFadeFirstOnlyToggle', 'msEnvFanartWall', 'ambientProfileSelect', 'ambientProfileLoopToggle', 'ambientSequenceCountSelect', 'ambientSequence1EffectSelect', 'ambientSequence1DurationTypeSelect', 'ambientSequence1DurationValueInput', 'ambientSequence1VolumeSlider', 'ambientSequence1LoopToggle', 'ambientSequence1PlaybackOrderSelect', 'ambientSequence1MovieStartModeSelect', 'ambientSequence1MovieStartMinInput', 'ambientSequence1MovieStartMaxInput', 'ambientSequence1ThemeSongStartPositionSelect', 'ambientSequence1ThemeSongStartMinInput', 'ambientSequence1ThemeSongStartMaxInput', 'ambientSequence1ThemeSongDelayedStartInput', 'ambientSequence1ThemeSongDelayedStartFirstOnlyToggle', 'ambientSequence1ThemeSongFadeInInput', 'ambientSequence1ThemeSongFadeOutInput', 'ambientSequence1ThemeSongFadeFirstOnlyToggle', 'ambientSequence1ThemeSongEarlyEndInput', 'ambientSequence1ReplaceAudioToggle', 'ambientSequence1ReplaceAudioOrderSelect', 'ambientSequence1EnvSelect', 'ambientSequence1FallbackSelect', 'ambientSequence1FrontArtEarlyFadeInput', 'ambientSequence2EffectSelect', 'ambientSequence2DurationTypeSelect', 'ambientSequence2DurationValueInput', 'ambientSequence2VolumeSlider', 'ambientSequence2LoopToggle', 'ambientSequence2PlaybackOrderSelect', 'ambientSequence2MovieStartModeSelect', 'ambientSequence2MovieStartMinInput', 'ambientSequence2MovieStartMaxInput', 'ambientSequence2ThemeSongStartPositionSelect', 'ambientSequence2ThemeSongStartMinInput', 'ambientSequence2ThemeSongStartMaxInput', 'ambientSequence2ThemeSongDelayedStartInput', 'ambientSequence2ThemeSongDelayedStartFirstOnlyToggle', 'ambientSequence2ThemeSongFadeInInput', 'ambientSequence2ThemeSongFadeOutInput', 'ambientSequence2ThemeSongFadeFirstOnlyToggle', 'ambientSequence2ThemeSongEarlyEndInput', 'ambientSequence2ReplaceAudioToggle', 'ambientSequence2ReplaceAudioOrderSelect', 'ambientSequence2EnvSelect', 'ambientSequence2FallbackSelect', 'ambientSequence2FrontArtEarlyFadeInput', 'ambientSequence3EffectSelect', 'ambientSequence3DurationTypeSelect', 'ambientSequence3DurationValueInput', 'ambientSequence3VolumeSlider', 'ambientSequence3LoopToggle', 'ambientSequence3PlaybackOrderSelect', 'ambientSequence3MovieStartModeSelect', 'ambientSequence3MovieStartMinInput', 'ambientSequence3MovieStartMaxInput', 'ambientSequence3ThemeSongStartPositionSelect', 'ambientSequence3ThemeSongStartMinInput', 'ambientSequence3ThemeSongStartMaxInput', 'ambientSequence3ThemeSongDelayedStartInput', 'ambientSequence3ThemeSongDelayedStartFirstOnlyToggle', 'ambientSequence3ThemeSongFadeInInput', 'ambientSequence3ThemeSongFadeOutInput', 'ambientSequence3ThemeSongFadeFirstOnlyToggle', 'ambientSequence3ThemeSongEarlyEndInput', 'ambientSequence3ReplaceAudioToggle', 'ambientSequence3ReplaceAudioOrderSelect', 'ambientSequence3EnvSelect', 'ambientSequence3FallbackSelect', 'ambientSequence3FrontArtEarlyFadeInput', 'ambientSequence4EffectSelect', 'ambientSequence4DurationTypeSelect', 'ambientSequence4DurationValueInput', 'ambientSequence4VolumeSlider', 'ambientSequence4LoopToggle', 'ambientSequence4PlaybackOrderSelect', 'ambientSequence4MovieStartModeSelect', 'ambientSequence4MovieStartMinInput', 'ambientSequence4MovieStartMaxInput', 'ambientSequence4ThemeSongStartPositionSelect', 'ambientSequence4ThemeSongStartMinInput', 'ambientSequence4ThemeSongStartMaxInput', 'ambientSequence4ThemeSongDelayedStartInput', 'ambientSequence4ThemeSongDelayedStartFirstOnlyToggle', 'ambientSequence4ThemeSongFadeInInput', 'ambientSequence4ThemeSongFadeOutInput', 'ambientSequence4ThemeSongFadeFirstOnlyToggle', 'ambientSequence4ThemeSongEarlyEndInput', 'ambientSequence4ReplaceAudioToggle', 'ambientSequence4ReplaceAudioOrderSelect', 'ambientSequence4EnvSelect', 'ambientSequence4FallbackSelect', 'ambientSequence4FrontArtEarlyFadeInput', 'ambientSequence5EffectSelect', 'ambientSequence5DurationTypeSelect', 'ambientSequence5DurationValueInput', 'ambientSequence5VolumeSlider', 'ambientSequence5LoopToggle', 'ambientSequence5PlaybackOrderSelect', 'ambientSequence5MovieStartModeSelect', 'ambientSequence5MovieStartMinInput', 'ambientSequence5MovieStartMaxInput', 'ambientSequence5ThemeSongStartPositionSelect', 'ambientSequence5ThemeSongStartMinInput', 'ambientSequence5ThemeSongStartMaxInput', 'ambientSequence5ThemeSongDelayedStartInput', 'ambientSequence5ThemeSongDelayedStartFirstOnlyToggle', 'ambientSequence5ThemeSongFadeInInput', 'ambientSequence5ThemeSongFadeOutInput', 'ambientSequence5ThemeSongFadeFirstOnlyToggle', 'ambientSequence5ThemeSongEarlyEndInput', 'ambientSequence5ReplaceAudioToggle', 'ambientSequence5ReplaceAudioOrderSelect', 'ambientSequence5EnvSelect', 'ambientSequence5FallbackSelect', 'ambientSequence5FrontArtEarlyFadeInput', 'ambientSequence6EffectSelect', 'ambientSequence6DurationTypeSelect', 'ambientSequence6DurationValueInput', 'ambientSequence6VolumeSlider', 'ambientSequence6LoopToggle', 'ambientSequence6PlaybackOrderSelect', 'ambientSequence6MovieStartModeSelect', 'ambientSequence6MovieStartMinInput', 'ambientSequence6MovieStartMaxInput', 'ambientSequence6ThemeSongStartPositionSelect', 'ambientSequence6ThemeSongStartMinInput', 'ambientSequence6ThemeSongStartMaxInput', 'ambientSequence6ThemeSongDelayedStartInput', 'ambientSequence6ThemeSongDelayedStartFirstOnlyToggle', 'ambientSequence6ThemeSongFadeInInput', 'ambientSequence6ThemeSongFadeOutInput', 'ambientSequence6ThemeSongFadeFirstOnlyToggle', 'ambientSequence6ThemeSongEarlyEndInput', 'ambientSequence6ReplaceAudioToggle', 'ambientSequence6ReplaceAudioOrderSelect', 'ambientSequence6EnvSelect', 'ambientSequence6FallbackSelect', 'ambientSequence6FrontArtEarlyFadeInput', 'ambientSequence7EffectSelect', 'ambientSequence7DurationTypeSelect', 'ambientSequence7DurationValueInput', 'ambientSequence7VolumeSlider', 'ambientSequence7LoopToggle', 'ambientSequence7PlaybackOrderSelect', 'ambientSequence7MovieStartModeSelect', 'ambientSequence7MovieStartMinInput', 'ambientSequence7MovieStartMaxInput', 'ambientSequence7ThemeSongStartPositionSelect', 'ambientSequence7ThemeSongStartMinInput', 'ambientSequence7ThemeSongStartMaxInput', 'ambientSequence7ThemeSongDelayedStartInput', 'ambientSequence7ThemeSongDelayedStartFirstOnlyToggle', 'ambientSequence7ThemeSongFadeInInput', 'ambientSequence7ThemeSongFadeOutInput', 'ambientSequence7ThemeSongFadeFirstOnlyToggle', 'ambientSequence7ThemeSongEarlyEndInput', 'ambientSequence7ReplaceAudioToggle', 'ambientSequence7ReplaceAudioOrderSelect', 'ambientSequence7EnvSelect', 'ambientSequence7FallbackSelect', 'ambientSequence7FrontArtEarlyFadeInput', 'ambientSequence8EffectSelect', 'ambientSequence8DurationTypeSelect', 'ambientSequence8DurationValueInput', 'ambientSequence8VolumeSlider', 'ambientSequence8LoopToggle', 'ambientSequence8PlaybackOrderSelect', 'ambientSequence8MovieStartModeSelect', 'ambientSequence8MovieStartMinInput', 'ambientSequence8MovieStartMaxInput', 'ambientSequence8ThemeSongStartPositionSelect', 'ambientSequence8ThemeSongStartMinInput', 'ambientSequence8ThemeSongStartMaxInput', 'ambientSequence8ThemeSongDelayedStartInput', 'ambientSequence8ThemeSongDelayedStartFirstOnlyToggle', 'ambientSequence8ThemeSongFadeInInput', 'ambientSequence8ThemeSongFadeOutInput', 'ambientSequence8ThemeSongFadeFirstOnlyToggle', 'ambientSequence8ThemeSongEarlyEndInput', 'ambientSequence8ReplaceAudioToggle', 'ambientSequence8ReplaceAudioOrderSelect', 'ambientSequence8EnvSelect', 'ambientSequence8FallbackSelect', 'ambientSequence8FrontArtEarlyFadeInput', 'ambientSequence9EffectSelect', 'ambientSequence9DurationTypeSelect', 'ambientSequence9DurationValueInput', 'ambientSequence9VolumeSlider', 'ambientSequence9LoopToggle', 'ambientSequence9PlaybackOrderSelect', 'ambientSequence9MovieStartModeSelect', 'ambientSequence9MovieStartMinInput', 'ambientSequence9MovieStartMaxInput', 'ambientSequence9ThemeSongStartPositionSelect', 'ambientSequence9ThemeSongStartMinInput', 'ambientSequence9ThemeSongStartMaxInput', 'ambientSequence9ThemeSongDelayedStartInput', 'ambientSequence9ThemeSongDelayedStartFirstOnlyToggle', 'ambientSequence9ThemeSongFadeInInput', 'ambientSequence9ThemeSongFadeOutInput', 'ambientSequence9ThemeSongFadeFirstOnlyToggle', 'ambientSequence9ThemeSongEarlyEndInput', 'ambientSequence9ReplaceAudioToggle', 'ambientSequence9ReplaceAudioOrderSelect', 'ambientSequence9EnvSelect', 'ambientSequence9FallbackSelect', 'ambientSequence9FrontArtEarlyFadeInput', 'ambientSequence10EffectSelect', 'ambientSequence10DurationTypeSelect', 'ambientSequence10DurationValueInput', 'ambientSequence10VolumeSlider', 'ambientSequence10LoopToggle', 'ambientSequence10PlaybackOrderSelect', 'ambientSequence10MovieStartModeSelect', 'ambientSequence10MovieStartMinInput', 'ambientSequence10MovieStartMaxInput', 'ambientSequence10ThemeSongStartPositionSelect', 'ambientSequence10ThemeSongStartMinInput', 'ambientSequence10ThemeSongStartMaxInput', 'ambientSequence10ThemeSongDelayedStartInput', 'ambientSequence10ThemeSongDelayedStartFirstOnlyToggle', 'ambientSequence10ThemeSongFadeInInput', 'ambientSequence10ThemeSongFadeOutInput', 'ambientSequence10ThemeSongFadeFirstOnlyToggle', 'ambientSequence10ThemeSongEarlyEndInput', 'ambientSequence10ReplaceAudioToggle', 'ambientSequence10ReplaceAudioOrderSelect', 'ambientSequence10EnvSelect', 'ambientSequence10FallbackSelect', 'ambientSequence10FrontArtEarlyFadeInput']);
    assign('backwall', ['backdropLayoutSelect', 'backdropModeSelect', 'backdropSecondsInput', 'backdropVideosEnabledToggle', 'backdropBalanceToggle', 'backdropOverscanModeSelect', 'backdropTrailerTilesSelect', 'backdropTrailerOrderSelect', 'backdropTrailerStartSelect', 'backdropThemeVideoTilesSelect', 'backdropThemeVideoOrderSelect', 'backdropThemeVideoStartSelect', 'backdropMovieTilesSelect', 'backdropMovieMinInput', 'backdropMovieMaxInput']);
    // Smart Launch's ten checkboxes are deliberately NOT registered here
    // (unlike every other menu control) — they're informational-only and
    // permanently disabled, so they should behave like plain text/an
    // image for hover, focus, and gamepad/keyboard row navigation: no
    // highlight ring, and navigation skips straight past them to
    // whatever's above/below, exactly like smartLaunchAutoPlayOptions
    // already does. Any FUTURE interactive setting placed below this
    // block should keep being reachable without having to step through
    // ten dead rows first.
    assign('misc', ['tabIconSelect', 'libraryItemOpensInSelect']);
    assign('*', ['menuTabs', 'menuResetAll', 'menuCloseBtn']);
  })();
  if (MENU_TABS.indexOf(activeMenuTab) < 0) activeMenuTab = 'controls';
  function menuRowInActiveTab(row) {
    const t = MENU_ROW_TAB[row.id];
    return t === undefined || t === '*' || t === activeMenuTab;
  }
  function firstMenuRowIndexForTab() {
    for (let i = 0; i < menuRows.length; i++) {
      if (MENU_ROW_TAB[menuRows[i].id] === activeMenuTab && !isRowDisabled(menuRows[i])) return i;
    }
    return 0;
  }
  function setMenuTab(tab) {
    if (MENU_TABS.indexOf(tab) < 0) return;
    // Commit any in-progress edit BEFORE switching — a tab switch counts
    // as leaving the field, same rule as closing the menu (17.74 fix).
    resolveOpenNavEditing(menuRows);
    activeMenuTab = tab;
    saveSetting('menuActiveTab', tab);
    MENU_TABS.forEach((t) => {
      const page = document.getElementById('tabPage_' + t);
      if (page) page.style.display = t === tab ? '' : 'none';
    });
    document.querySelectorAll('#menuTabs .menuTab').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });
    updateResetButtonState();
    const keepFocusOnBar = menuRows[navFocusIndex] && menuRows[navFocusIndex].id === 'menuTabs';
    navFocusIndex = keepFocusOnBar ? 0 : firstMenuRowIndexForTab();
    navButtonRowFocus = 0;
    navBoundaryLock = null;
    if (menuOverlayEl.style.display === 'flex') {
      menuScrollEl.scrollTop = 0;
      updateNavFocusVisual(menuRows);
      instructionsEl.innerHTML = baseInstructions();
    }
  }
  function stepMenuTab(dir) {
    const i = MENU_TABS.indexOf(activeMenuTab);
    setMenuTab(MENU_TABS[(i + dir + MENU_TABS.length) % MENU_TABS.length]);
  }
  document.querySelectorAll('#menuTabs .menuTab').forEach((btn) => {
    btn.addEventListener('click', () => setMenuTab(btn.getAttribute('data-tab')));
  });
  setMenuTab(activeMenuTab);
  const MOVEMENT_SPEED_CURVE = { 1: 0.25, 2: 0.4, 3: 0.65, 4: 1.0, 5: 1.3, 6: 1.6, 7: 2.0, 8: 2.5, 9: 3.0, 10: 3.6 };
  const movementSpeedSlider = document.getElementById('movementSpeedSlider');
  const movementSpeedValueEl = document.getElementById('movementSpeedValue');
  movementSpeedSlider.value = movementSpeedScale;
  movementSpeedValueEl.textContent = movementSpeedScale;
  document.getElementById('movementSpeedDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.controls.movementSpeedScale.default + ')';
  movementSpeedSlider.addEventListener('input', () => {
    movementSpeedScale = parseInt(movementSpeedSlider.value, 10);
    movementSpeedValueEl.textContent = movementSpeedScale;
    saveSetting('movementSpeedScale', movementSpeedScale);
  });
  const autoSprintToggle = document.getElementById('autoSprintToggle');
  setBoolDefaultHint(document.getElementById('autoSprintDefaultHint'), MENU_CONFIG.menu.controls.autoSprint.default);
  function closeMenuOverlay() {
    menuOverlayEl.style.display = 'none';
    resolveOpenNavEditing(menuRows);
    navEditing = false;
    closeGpDropdown();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    instructionsEl.innerHTML = baseInstructions();
  }
  function buildControlsList() {
    const jumpOff = !jumpEnabled;
    const noCtrl = !controllerMovementEnabled || !gpConnected;
    let statusHtml = '<div class="ctrlStatus">';
    statusHtml += '<div class="statusLine"><span class="statusCheck">✓</span> Keyboard and Mouse Controls Active</div>';
    if (controllerMovementEnabled && gpConnected) {
      statusHtml += '<div class="statusLine"><span class="statusCheck">✓</span> Controller Controls Enabled &amp; Active</div>';
    } else if (controllerMovementEnabled && !gpConnected) {
      statusHtml += '<div class="statusLine statusDim"><span class="statusCheck"></span> Controller Controls Enabled but Not Active</div>';
    } else {
      statusHtml += '<div class="statusLine statusDim"><span class="statusCheck"></span> Controller Controls Disabled</div>';
    }
    statusHtml += '</div>';
    function twoLineKbRow(line1Html, line2Html, gpHtml, gpDisabled) {
      const gpIcon = gpDisabled ? '<span class="ctrlDisabled">' + gpHtml + '</span>' : gpHtml;
      return '<div style="display:flex;align-items:center;gap:10px;">'
        + '<div style="display:flex;flex-direction:column;gap:4px;">'
        + '<div>' + line1Html + '</div>'
        + '<div>' + line2Html + '</div>'
        + '</div>'
        + '<div>' + gpIcon + '</div>'
        + '</div>';
    }
    const wasdIcons = svgKey('W') + svgKey('A') + svgKey('S') + svgKey('D');
    // row = [kbIcon, gpIcon, label, rowFullyDisabled, gpIconOnlyDisabled]
    const rows = [
      ['grp', 'Movement'],
      [twoLineKbRow(wasdIcons, KB_ARROWS, GP_STICK_L, noCtrl), '', 'Move', false, false],
    ];
    rows.push([svgKey('Shift'), GP_L3, 'Sprint', autoSprint, noCtrl]);
    rows.push([svgKey('Space'), GP_A, 'Jump', !jumpEnabled, noCtrl]);
    rows.push([svgKey('Ctrl'), GP_B, 'Crouch', !crouchEnabled, noCtrl]);
    rows.push(
      ['grp', 'Interaction'],
      [svgKey('E') + ' / ' + svgKey('Enter') + ' / ' + svgMouse('left'), GP_A, 'Use / Interact', false, noCtrl],
      [svgMouse('right'), GP_B, 'Cancel Menu', false, noCtrl],
      [svgKey('Backspace'), GP_Y, 'Stop Playback', false, noCtrl],
      ['grp', 'Shortcuts'],
      [svgKey('C'), GP_VIEW, 'Toggle This Controls List', false, noCtrl],
      [svgKey('M'), GP_MENU, 'Toggle Menu', false, noCtrl],
      [svgKey('K'), GP_X, 'Toggle Kiosk'],
      [svgKey('F'), GP_R3, 'Toggle Fullscreen'],
      [svgKey('−') + svgKey('+'), GP_DPAD_UD, 'Shrink / Enlarge Room'],
      [svgKey(',') + svgKey('.') + svgKey('PgUp') + svgKey('PgDn') + MOUSE_WHEEL_ICON, GP_DPAD_LR, 'Previous / Next Poster Page'],
      ['grp', 'Menu Navigation'],
      [twoLineKbRow(KB_ARROWS, wasdIcons, GP_DPAD + ' ' + GP_STICK_L, noCtrl), '', 'Navigate Fields / Switch Tabs in Menu', false, false],
      [svgKey('E') + ' / ' + svgKey('Enter') + ' / ' + svgMouse('left'), GP_A, 'Enter Field / Confirm', false, noCtrl],
      [svgMouse('right'), GP_B, 'Back / Close', false, noCtrl],
      [twoLineKbRow(svgKey('A') + svgKey('D'), svgKey('←') + svgKey('→'), GP_DPAD_LR + ' ' + GP_STICK_L + ' ' + GP_LB + GP_RB, noCtrl), '', 'Switch Tabs in Menu', false, noCtrl]
    );
    const list = document.getElementById('controlsList');
    list.innerHTML = statusHtml + rows.map((r) => {
      if (r[0] === 'grp') return '<div class="grp">' + r[1] + '</div>';
      const rowOff = !!r[3];
      const gpOff = !!r[4];
      const rowCls = rowOff ? ' class="ctrlDisabled"' : '';
      let colHtml = r[0];
      if (r[1]) colHtml += ' &nbsp; ' + ((gpOff && !rowOff) ? '<span class="ctrlDisabled">' + r[1] + '</span>' : r[1]);
      return '<div' + rowCls + '>' + colHtml + '</div><div' + rowCls + '>' + r[2] + '</div>';
    }).join('');
  }
  function toggleControlsOverlay() {
    const opening = controlsOverlayEl.style.display !== 'block';
    // Resolve any open dropdown/number editing BEFORE hiding — this path
    // bypasses closeMenuOverlay/closePanel, so without this the same
    // display-vs-saved-value drift could sneak in via the C key.
    if (menuOverlayEl.style.display === 'flex') resolveOpenNavEditing(menuRows);
    else if (panelEl.style.display === 'block') resolveOpenNavEditing(panelRows);
    menuOverlayEl.style.display = 'none';
    panelEl.style.display = 'none';
    if (opening) {
      buildControlsList();
      if (document.pointerLockElement) document.exitPointerLock();
      positionOverlayVertically(controlsOverlayEl);
      controlsOverlayEl.style.display = 'block';
    } else {
      controlsOverlayEl.style.display = 'none';
      requestPointerLockDeferred();
    }
    instructionsEl.innerHTML = baseInstructions();
  }
  function toggleMenuOverlay() {
    const opening = menuOverlayEl.style.display !== 'flex';
    if (panelEl.style.display === 'block') resolveOpenNavEditing(panelRows);
    controlsOverlayEl.style.display = 'none';
    panelEl.style.display = 'none';
    if (opening) {
      autoSprintToggle.checked = autoSprint;
      updateBackdropMenuState();
      populateControllerSelect();
      navEditing = false;
      setMenuTab(activeMenuTab);
      updateMenuFocusVisual();
      if (document.pointerLockElement) document.exitPointerLock();
      positionOverlayVertically(menuOverlayEl);
      menuOverlayEl.style.display = 'flex';
      menuScrollEl.scrollTop = 0;
      instructionsEl.innerHTML = baseInstructions();
    } else {
      closeMenuOverlay();
      requestPointerLockDeferred();
    }
  }
  document.getElementById('controlsCloseBtn').addEventListener('click', () => {
    controlsOverlayEl.style.display = 'none';
    requestPointerLockDeferred();
    instructionsEl.innerHTML = baseInstructions();
  });
  const confirmDialogEl = document.getElementById('confirmDialog');
  const confirmDialogTextEl = document.getElementById('confirmDialogText');
  let confirmDialogAction = null;
  function showConfirmDialog(text, onConfirm) {
    confirmDialogTextEl.textContent = text;
    confirmDialogAction = onConfirm;
    confirmDialogEl.style.display = 'block';
  }
  function hideConfirmDialog() {
    confirmDialogEl.style.display = 'none';
    confirmDialogAction = null;
  }
  document.getElementById('confirmDialogCancel').addEventListener('click', () => { hideConfirmDialog(); });
  document.getElementById('confirmDialogOk').addEventListener('click', () => {
    const action = confirmDialogAction;
    hideConfirmDialog();
    if (action) action();
  });
  function fireInput(el) { el.dispatchEvent(new Event('input', { bubbles: true })); }
  function fireChange(el) { el.dispatchEvent(new Event('change', { bubbles: true })); }
  function resetControlsTab() {
    const movementSpeedSlider = document.getElementById('movementSpeedSlider');
    movementSpeedSlider.value = MENU_CONFIG.menu.controls.movementSpeedScale.default;
    fireInput(movementSpeedSlider);
    const autoSprintToggle = document.getElementById('autoSprintToggle');
    autoSprintToggle.checked = MENU_CONFIG.menu.controls.autoSprint.default;
    fireChange(autoSprintToggle);
    const jumpEnableToggle = document.getElementById('jumpEnableToggle');
    jumpEnableToggle.checked = MENU_CONFIG.menu.controls.jumpEnabled.default;
    fireChange(jumpEnableToggle);
    const crouchEnableToggle = document.getElementById('crouchEnableToggle');
    crouchEnableToggle.checked = MENU_CONFIG.menu.controls.crouchEnabled.default;
    fireChange(crouchEnableToggle);
    const crouchModeSelect = document.getElementById('crouchModeSelect');
    crouchModeSelect.value = MENU_CONFIG.menu.controls.crouchMode.default;
    fireChange(crouchModeSelect);
    const controllerMovementToggle = document.getElementById('controllerMovementToggle');
    controllerMovementToggle.checked = MENU_CONFIG.menu.controls.controllerMovementEnabled.default;
    fireChange(controllerMovementToggle);
    const deadzoneSlider = document.getElementById('deadzoneSlider');
    deadzoneSlider.value = Math.round(MENU_CONFIG.menu.controls.gamepadDeadzone.default / 0.05);
    fireInput(deadzoneSlider);
    const sensitivitySlider = document.getElementById('sensitivitySlider');
    sensitivitySlider.value = Math.round(MENU_CONFIG.menu.controls.lookSensitivity.default / 0.05) - 1;
    fireInput(sensitivitySlider);
    const cinemaKeyboardEnabledToggle = document.getElementById('cinemaKeyboardEnabledToggle');
    cinemaKeyboardEnabledToggle.checked = MENU_CONFIG.menu.controls.cinemaKeyboardEnabled.default;
    fireChange(cinemaKeyboardEnabledToggle);
    const cinemaKeyboardColorInput = document.getElementById('cinemaKeyboardColorInput');
    cinemaKeyboardColorInput.value = MENU_CONFIG.menu.controls.cinemaKeyboardColor.default;
    fireChange(cinemaKeyboardColorInput);
    const cinemaKeyboardPositionSelect = document.getElementById('cinemaKeyboardPositionSelect');
    cinemaKeyboardPositionSelect.value = MENU_CONFIG.menu.controls.cinemaKeyboardPosition.default;
    fireChange(cinemaKeyboardPositionSelect);
    const cinemaKeyboardIdleInput = document.getElementById('cinemaKeyboardIdleInput');
    cinemaKeyboardIdleInput.value = MENU_CONFIG.menu.controls.cinemaKeyboardIdleSeconds.default;
    fireChange(cinemaKeyboardIdleInput);
  }
  function resetDisplayTab() {
    const hudToggle = document.getElementById('hudToggle');
    hudToggle.checked = MENU_CONFIG.menu.display.showCrosshair.default;
    fireChange(hudToggle);
    const controlsUiToggle = document.getElementById('controlsUiToggle');
    controlsUiToggle.checked = MENU_CONFIG.menu.display.showControlsUi.default;
    fireChange(controlsUiToggle);
    const fovSlider = document.getElementById('fovSlider');
    fovSlider.value = MENU_CONFIG.menu.display.fov.default;
    fireInput(fovSlider);
    const audienceBrightnessSlider = document.getElementById('audienceBrightnessSlider');
    audienceBrightnessSlider.value = MENU_CONFIG.menu.display.audienceBrightness.default;
    fireInput(audienceBrightnessSlider);
    const cinemaBrightnessSlider = document.getElementById('cinemaBrightnessSlider');
    cinemaBrightnessSlider.value = MENU_CONFIG.menu.display.cinemaBrightness.default;
    fireInput(cinemaBrightnessSlider);
    ['frontWallBrightnessOff', 'frontWallBrightnessOn', 'backwallBrightnessOff', 'backwallBrightnessOn', 'posterWallBrightnessOff', 'posterWallBrightnessOn', 'posterLightBrightness'].forEach((key) => {
      const slider = document.getElementById(key + 'Slider');
      slider.value = Math.round(MENU_CONFIG.menu.display[key].default * 100);
      fireInput(slider);
    });
  }
  function resetRoomTab() {
    const roomDesignSelect = document.getElementById('roomDesignSelect');
    roomDesignSelect.value = MENU_CONFIG.menu.room.design.roomDesign.default;
    fireChange(roomDesignSelect);
    const roomSizeSelect = document.getElementById('roomSizeSelect');
    roomSizeSelect.value = MENU_CONFIG.menu.room.design.roomSize.default;
    fireChange(roomSizeSelect);
    const roomScaleModeSelect = document.getElementById('roomScaleModeSelect');
    roomScaleModeSelect.value = MENU_CONFIG.menu.room.design.roomScaleMode.default;
    fireChange(roomScaleModeSelect);
    const scaleMovementSpeedToggle = document.getElementById('scaleMovementSpeedToggle');
    scaleMovementSpeedToggle.checked = MENU_CONFIG.menu.room.design.scaleMovementSpeed.default;
    fireChange(scaleMovementSpeedToggle);
    const scalePlayerPositionToggle = document.getElementById('scalePlayerPositionToggle');
    scalePlayerPositionToggle.checked = MENU_CONFIG.menu.room.design.scalePlayerPosition.default;
    fireChange(scalePlayerPositionToggle);
    const ropeBarrierToggle = document.getElementById('ropeBarrierToggle');
    ropeBarrierToggle.checked = MENU_CONFIG.menu.room.design.showRopeBarrier.default;
    fireChange(ropeBarrierToggle);
    const kioskShowModeSelect = document.getElementById('kioskShowModeSelect');
    kioskShowModeSelect.value = MENU_CONFIG.menu.room.kiosk.kioskShowMode.default;
    fireChange(kioskShowModeSelect);
    const kioskLogoToggle = document.getElementById('kioskLogoToggle');
    kioskLogoToggle.checked = MENU_CONFIG.menu.room.kiosk.kioskClearlogo3d.default;
    fireChange(kioskLogoToggle);
    const kioskBrandingModeSelect = document.getElementById('kioskBrandingModeSelect');
    kioskBrandingModeSelect.value = MENU_CONFIG.menu.room.kiosk.kioskBrandingMode.default;
    fireChange(kioskBrandingModeSelect);
    const kioskLogoSpeedSlider = document.getElementById('kioskLogoSpeedSlider');
    kioskLogoSpeedSlider.value = MENU_CONFIG.menu.room.kiosk.kioskLogoSpeed.default;
    fireInput(kioskLogoSpeedSlider);
    const kioskLogoGlitchFreqSlider = document.getElementById('kioskLogoGlitchFreqSlider');
    kioskLogoGlitchFreqSlider.value = MENU_CONFIG.menu.room.kiosk.kioskLogoGlitchFreq.default;
    fireInput(kioskLogoGlitchFreqSlider);
    const kioskLogoGlitchIntensitySlider = document.getElementById('kioskLogoGlitchIntensitySlider');
    kioskLogoGlitchIntensitySlider.value = MENU_CONFIG.menu.room.kiosk.kioskLogoGlitchIntensity.default;
    fireInput(kioskLogoGlitchIntensitySlider);
  }
  function resetMiscTab() {
    const tabIconSelect = document.getElementById('tabIconSelect');
    tabIconSelect.value = MENU_CONFIG.menu.misc.tabIcon.default;
    fireChange(tabIconSelect);
    const libraryItemOpensInSelect = document.getElementById('libraryItemOpensInSelect');
    libraryItemOpensInSelect.value = MENU_CONFIG.menu.misc.libraryItemOpensIn.default;
    fireChange(libraryItemOpensInSelect);
  }
  function resetMultiSelectField(fieldId) {
    const cfg = MULTI_SELECT_FIELDS[fieldId];
    multiSelectState[cfg.key] = cfg.emptyMeansAll === false ? msFieldDefault(cfg).slice() : [];
    if (cfg.settingKey) saveSetting(cfg.settingKey, JSON.stringify(multiSelectState[cfg.key]));
    if (cfg.onChange) cfg.onChange();
    updateMsSummary(fieldId);
  }
  function resetPostersTab() {
    // Covers every field already wired through one of the five shared
    // helpers above (wireLoopToggle/wireOrderSelect/wireVolumeSlider/
    // wireThemeSongStartPercent/wireThemeSongTrimSeconds) -- the large
    // majority of this tab's own ~50 non-Ambient-Sequence fields.
    runRegisteredResets('posters');
    // Multi-selects: msPosterMenuTabs + the five effect-specific
    // Environment Effects fields (msEnvMovie/Trailer/ThemeVideo/
    // ThemeSong/FanartWall). Ambient's OWN per-sequence EnvSelect fields
    // are handled below instead, as part of resetting each sequence's
    // whole data object.
    ['msPosterMenuTabs', 'msEnvMovie', 'msEnvTrailer', 'msEnvThemeVideo', 'msEnvThemeSong', 'msEnvFanartWall'].forEach(resetMultiSelectField);
    // Remaining fields not covered by any shared helper or multi-select.
    const hideUnavailableToggle = document.getElementById('hideUnavailableToggle');
    hideUnavailableToggle.checked = CONFIG_BY_KEY.hideUnavailableItems.default;
    fireChange(hideUnavailableToggle);
    const noThemeSongFallbackTrailerSelect = document.getElementById('noThemeSongFallbackTrailerSelect');
    noThemeSongFallbackTrailerSelect.value = CONFIG_BY_KEY.noThemeSongFallbackTrailer.default;
    fireChange(noThemeSongFallbackTrailerSelect);
    const noThemeSongFallbackThemeVideoSelect = document.getElementById('noThemeSongFallbackThemeVideoSelect');
    noThemeSongFallbackThemeVideoSelect.value = CONFIG_BY_KEY.noThemeSongFallbackThemeVideo.default;
    fireChange(noThemeSongFallbackThemeVideoSelect);
    const themeSongDelayedStartFirstOnlyToggle = document.getElementById('themeSongDelayedStartFirstOnlyToggle');
    themeSongDelayedStartFirstOnlyToggle.checked = CONFIG_BY_KEY.themeSongDelayedStartFirstOnly.default;
    fireChange(themeSongDelayedStartFirstOnlyToggle);
    const themeSongFadeFirstOnlyToggle = document.getElementById('themeSongFadeFirstOnlyToggle');
    themeSongFadeFirstOnlyToggle.checked = CONFIG_BY_KEY.themeSongFadeFirstOnly.default;
    fireChange(themeSongFadeFirstOnlyToggle);
    // Ambient Mode's profile-level settings (loop, sequence count) --
    // both vary PER PROFILE (see MENU_CONFIG's own per-profile defaults)
    // for the CURRENTLY EDITED profile only. ambientProfileSelect itself
    // (which profile you're currently looking at) is navigation, not a
    // value with a meaningful "default" -- left untouched, same as
    // msPosterMenuTabs' own tab-bar would be if it weren't already a
    // real multi-select setting above.
    const profileDefaults = MENU_CONFIG.menu.posters.ambientMode.profiles[ambientEditingProfile];
    const ambientProfileLoopToggle = document.getElementById('ambientProfileLoopToggle');
    ambientProfileLoopToggle.checked = profileDefaults.loop.default;
    fireChange(ambientProfileLoopToggle);
    const ambientSequenceCountSelect = document.getElementById('ambientSequenceCountSelect');
    ambientSequenceCountSelect.value = String(profileDefaults.sequenceCount.default);
    fireChange(ambientSequenceCountSelect);
    // All ten Ambient Sequences at once -- reset the CURRENTLY EDITED
    // profile's underlying sequence data to its defaults, then reuse the
    // exact same load/save round-trip every other sequence edit already
    // goes through (loadAmbientSequenceIntoUI sets every field AND its
    // own EnvSelect multi-select's summary text; saveAmbientSequence
    // persists it). Far more reliable than hand-writing ~230 individual
    // field resets, and guaranteed to stay in sync with however a
    // sequence's shape evolves in the future.
    const defaults = ambientDefaultSequences(ambientEditingProfile);
    for (let n = 1; n <= AMBIENT_MAX_SEQUENCES; n++) {
      ambientData[ambientEditingProfile].sequences[n - 1] = JSON.parse(JSON.stringify(defaults[n - 1]));
      loadAmbientSequenceIntoUI(n);
      saveAmbientSequence(n);
    }
  }
  function resetBackwallTab() {
    const backdropLayoutSelect = document.getElementById('backdropLayoutSelect');
    backdropLayoutSelect.value = MENU_CONFIG.menu.backwall.backdropLayout.default;
    fireChange(backdropLayoutSelect);
    const backdropModeSelect = document.getElementById('backdropModeSelect');
    backdropModeSelect.value = MENU_CONFIG.menu.backwall.backdropMode.default;
    fireChange(backdropModeSelect);
    const backdropSecondsInput = document.getElementById('backdropSecondsInput');
    backdropSecondsInput.value = MENU_CONFIG.menu.backwall.backdropShuffleSeconds.default;
    fireChange(backdropSecondsInput);
    const backdropVideosEnabledToggle = document.getElementById('backdropVideosEnabledToggle');
    backdropVideosEnabledToggle.checked = MENU_CONFIG.menu.backwall.backdropVideosEnabled.default;
    fireChange(backdropVideosEnabledToggle);
    const backdropBalanceToggle = document.getElementById('backdropBalanceToggle');
    backdropBalanceToggle.checked = CONFIG_BY_KEY.backdropBalanceVideos.default;
    fireChange(backdropBalanceToggle);
    const backdropOverscanModeSelect = document.getElementById('backdropOverscanModeSelect');
    backdropOverscanModeSelect.value = MENU_CONFIG.menu.backwall.backdropOverscanMode.default;
    fireChange(backdropOverscanModeSelect);
    const backdropTrailerTilesSelect = document.getElementById('backdropTrailerTilesSelect');
    backdropTrailerTilesSelect.value = CONFIG_BY_KEY.backdropTrailerTiles.default;
    fireChange(backdropTrailerTilesSelect);
    const backdropTrailerOrderSelect = document.getElementById('backdropTrailerOrderSelect');
    backdropTrailerOrderSelect.value = CONFIG_BY_KEY.backdropTrailerOrder.default;
    fireChange(backdropTrailerOrderSelect);
    const backdropTrailerStartSelect = document.getElementById('backdropTrailerStartSelect');
    backdropTrailerStartSelect.value = CONFIG_BY_KEY.backdropTrailerStart.default;
    fireChange(backdropTrailerStartSelect);
    const backdropThemeVideoTilesSelect = document.getElementById('backdropThemeVideoTilesSelect');
    backdropThemeVideoTilesSelect.value = CONFIG_BY_KEY.backdropThemeVideoTiles.default;
    fireChange(backdropThemeVideoTilesSelect);
    const backdropThemeVideoOrderSelect = document.getElementById('backdropThemeVideoOrderSelect');
    backdropThemeVideoOrderSelect.value = CONFIG_BY_KEY.backdropThemeVideoOrder.default;
    fireChange(backdropThemeVideoOrderSelect);
    const backdropThemeVideoStartSelect = document.getElementById('backdropThemeVideoStartSelect');
    backdropThemeVideoStartSelect.value = CONFIG_BY_KEY.backdropThemeVideoStart.default;
    fireChange(backdropThemeVideoStartSelect);
    const backdropMovieTilesSelect = document.getElementById('backdropMovieTilesSelect');
    backdropMovieTilesSelect.value = CONFIG_BY_KEY.backdropMovieTiles.default;
    fireChange(backdropMovieTilesSelect);
    const backdropMovieMinInput = document.getElementById('backdropMovieMinInput');
    backdropMovieMinInput.value = MENU_CONFIG.menu.backwall.backdropMovieMinPct.default;
    fireChange(backdropMovieMinInput);
    const backdropMovieMaxInput = document.getElementById('backdropMovieMaxInput');
    backdropMovieMaxInput.value = MENU_CONFIG.menu.backwall.backdropMovieMaxPct.default;
    fireChange(backdropMovieMaxInput);
  }
  // Credits tab has no options at all -- Restore Defaults stays
  // disabled there (see updateResetButtonState below); every other tab
  // now has a working reset.
  function resetTabToDefaults(tab) {
    if (tab === 'controls') resetControlsTab();
    else if (tab === 'display') resetDisplayTab();
    else if (tab === 'room') resetRoomTab();
    else if (tab === 'misc') resetMiscTab();
    else if (tab === 'backwall') resetBackwallTab();
    else if (tab === 'posters') resetPostersTab();
  }
  function updateResetButtonState() {
    const btn = document.getElementById('menuResetAll');
    btn.disabled = TABS_WITH_RESET.indexOf(activeMenuTab) < 0;
  }
  updateResetButtonState();
  document.getElementById('menuResetAll').addEventListener('click', () => {
    if (activeMenuTab === 'credits') return; // button is disabled here anyway, but guard regardless
    const tabLabel = document.querySelector('#menuTabs .menuTab[data-tab="' + activeMenuTab + '"]');
    const label = tabLabel ? tabLabel.textContent : activeMenuTab;
    showConfirmDialog('Are you sure to reset the ' + label + ' tab to default settings?', () => {
      resetTabToDefaults(activeMenuTab);
    });
  });
  document.getElementById('menuCloseBtn').addEventListener('click', () => { closeMenuOverlay(); requestPointerLockDeferred(); });
  autoSprintToggle.addEventListener('change', () => { autoSprint = autoSprintToggle.checked; saveSetting('autoSprint', autoSprint); });
  const hudToggle = document.getElementById('hudToggle');
  setBoolDefaultHint(document.getElementById('hudDefaultHint'), MENU_CONFIG.menu.display.showCrosshair.default);
  hudToggle.checked = showCrosshairInitial;
  document.getElementById('crosshair').style.display = showCrosshairInitial ? 'block' : 'none';
  hudToggle.addEventListener('change', () => {
    document.getElementById('crosshair').style.display = hudToggle.checked ? 'block' : 'none';
    saveSetting('showCrosshair', hudToggle.checked);
  });
  const controlsUiToggle = document.getElementById('controlsUiToggle');
  setBoolDefaultHint(document.getElementById('controlsUiDefaultHint'), MENU_CONFIG.menu.display.showControlsUi.default);
  controlsUiToggle.checked = showControlsUiInitial;
  instructionsEl.style.display = showControlsUiInitial ? 'block' : 'none';
  controlsUiToggle.addEventListener('change', () => {
    instructionsEl.style.display = controlsUiToggle.checked ? 'block' : 'none';
    saveSetting('showControlsUi', controlsUiToggle.checked);
  });
  setBoolDefaultHint(document.getElementById('jumpEnableDefaultHint'), MENU_CONFIG.menu.controls.jumpEnabled.default);
  let posterPinLightEnabled = true;
  // 'off' (no physical kiosk in the room — K/X still opens the panel
  // independently, see the setting's own CONFIG description), 'dynamic'
  // (unchanged — rises on approach, retracts when you step away), or
  // 'always' (permanently fully risen). Live-updating, same as
  // showRopeBarrier just below — no reload needed. 'off' works by
  // forcing kioskLevel's own target to 0 and never letting it rise
  // (see its own per-frame update further down) rather than removing
  // the kiosk from the scene outright — same physical object, just
  // permanently held retracted+invisible (kioskGroup.position.y at its
  // own hidden value) and excluded from kioskZoneInteractable's own
  // proximity check, so walking to where it WOULD be can't accidentally
  // open the panel via an invisible zone.
  const kioskShowModeSelect = document.getElementById('kioskShowModeSelect');
  kioskShowModeSelect.value = kioskShowMode;
  markDefaultOption(kioskShowModeSelect, MENU_CONFIG.menu.room.kiosk.kioskShowMode.default);
  kioskShowModeSelect.addEventListener('change', () => {
    kioskShowMode = kioskShowModeSelect.value;
    saveSetting('kioskShowMode', kioskShowMode);
    updateKioskLogoSettingState();
  });
  setBoolDefaultHint(document.getElementById('ropeBarrierDefaultHint'), MENU_CONFIG.menu.room.design.showRopeBarrier.default);
  const ropeBarrierToggle = document.getElementById('ropeBarrierToggle');
  ropeBarrierToggle.checked = showRopeBarrier;
  ropeBarrierToggle.addEventListener('change', () => {
    showRopeBarrier = ropeBarrierToggle.checked;
    saveSetting('showRopeBarrier', showRopeBarrier);
    if (ropeBarrierGroup) ropeBarrierGroup.visible = showRopeBarrier;
  });
  setBoolDefaultHint(document.getElementById('kioskLogoDefaultHint'), MENU_CONFIG.menu.room.kiosk.kioskClearlogo3d.default);
  wireLoopToggle('kioskLogoToggle', () => kioskClearlogo3d, (v) => { kioskClearlogo3d = v; updateKioskLogoSettingState(); }, 'kioskClearlogo3d');
  const KIOSK_LOGO_SPEED_NAMES = ['Static', 'Very Slow', 'Slow', 'Normal', 'Brisk', 'Fast'];
  const KIOSK_LOGO_FREQ_NAMES = ['Off', 'Rare', 'Sporadic', 'Occasional', 'Frequent', 'Constant'];
  const KIOSK_LOGO_INTENSITY_NAMES = ['Off', 'Minimal', 'Light', 'Medium', 'Strong', 'Severe'];
  // Sliders: live effect on 'input' (no rebuild needed — the animate loop
  // reads the variables every frame), value label shows the step's name,
  // "(default)" marker mirrors the select convention.
  function wireKioskLogoSlider(sliderId, valueId, names, defaultVal, get, set) {
    const el = document.getElementById(sliderId);
    const valueEl = document.getElementById(valueId);
    function refreshLabel() {
      const v = +el.value;
      valueEl.textContent = v + ' \u2013 ' + names[v] + (String(v) === defaultVal ? ' (default)' : '');
    }
    el.value = get();
    refreshLabel();
    const commit = () => { set(el.value); refreshLabel(); };
    el.addEventListener('input', commit);
    el.addEventListener('change', commit);
    return refreshLabel;
  }
  wireKioskLogoSlider('kioskLogoSpeedSlider', 'kioskLogoSpeedValue', KIOSK_LOGO_SPEED_NAMES, MENU_CONFIG.menu.room.kiosk.kioskLogoSpeed.default,
    () => kioskLogoSpeed, (v) => { kioskLogoSpeed = v; saveSetting('kioskLogoSpeed', v); });
  wireKioskLogoSlider('kioskLogoGlitchFreqSlider', 'kioskLogoGlitchFreqValue', KIOSK_LOGO_FREQ_NAMES, MENU_CONFIG.menu.room.kiosk.kioskLogoGlitchFreq.default,
    () => kioskLogoGlitchFreq, (v) => { kioskLogoGlitchFreq = v; saveSetting('kioskLogoGlitchFreq', v); kioskLogoNextTwitchAt = 0; });
  wireKioskLogoSlider('kioskLogoGlitchIntensitySlider', 'kioskLogoGlitchIntensityValue', KIOSK_LOGO_INTENSITY_NAMES, MENU_CONFIG.menu.room.kiosk.kioskLogoGlitchIntensity.default,
    () => kioskLogoGlitchIntensity, (v) => { kioskLogoGlitchIntensity = v; saveSetting('kioskLogoGlitchIntensity', v); });
  const kioskBrandingModeSelect = document.getElementById('kioskBrandingModeSelect');
  kioskBrandingModeSelect.value = kioskBrandingMode;
  markDefaultOption(kioskBrandingModeSelect, MENU_CONFIG.menu.room.kiosk.kioskBrandingMode.default);
  kioskBrandingModeSelect.addEventListener('change', () => {
    kioskBrandingMode = kioskBrandingModeSelect.value;
    saveSetting('kioskBrandingMode', kioskBrandingMode);
  });
  // Grayed out (not hidden) while the clearlogo checkbox is off.
  function updateKioskLogoSettingState() {
    // Grayed out either because the clearlogo toggle itself is off, OR
    // because there's no physical kiosk in the room at all right now
    // (kioskShowMode 'off') — neither the toggle NOR anything it gates
    // means anything without a kiosk to actually show a logo on.
    const kioskExists = kioskShowMode !== 'off';
    document.getElementById('kioskLogoToggle').disabled = !kioskExists;
    document.getElementById('kioskLogoToggleLabel').classList.toggle('disabled', !kioskExists);
    const on = kioskClearlogo3d && kioskExists;
    ['kioskLogoSpeedSlider', 'kioskLogoGlitchFreqSlider', 'kioskLogoGlitchIntensitySlider', 'kioskBrandingModeSelect'].forEach((id) => {
      document.getElementById(id).disabled = !on;
    });
    ['kioskLogoSpeedLabel', 'kioskLogoGlitchFreqLabel', 'kioskLogoGlitchIntensityLabel', 'kioskBrandingModeLabel'].forEach((id) => {
      document.getElementById(id).classList.toggle('disabled', !on);
    });
  }
  updateKioskLogoSettingState();
  let showDiscArt = true;
  const cinemaBrightnessSlider = document.getElementById('cinemaBrightnessSlider');
  const cinemaBrightnessValueEl = document.getElementById('cinemaBrightnessValue');
  document.getElementById('cinemaBrightnessDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.display.cinemaBrightness.default + ')';
  cinemaBrightnessSlider.value = cinemaBrightnessAdj;
  cinemaBrightnessValueEl.textContent = cinemaBrightnessAdj;
  cinemaBrightnessSlider.addEventListener('input', () => {
    cinemaBrightnessAdj = parseInt(cinemaBrightnessSlider.value, 10);
    cinemaBrightnessValueEl.textContent = cinemaBrightnessAdj;
    saveSetting('cinemaBrightness', cinemaBrightnessAdj);
  });
  const audienceBrightnessSlider = document.getElementById('audienceBrightnessSlider');
  const audienceBrightnessValueEl = document.getElementById('audienceBrightnessValue');
  document.getElementById('audienceBrightnessDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.display.audienceBrightness.default + ')';
  audienceBrightnessSlider.value = audienceBrightnessAdj;
  audienceBrightnessValueEl.textContent = audienceBrightnessAdj;
  audienceBrightnessSlider.addEventListener('input', () => {
    audienceBrightnessAdj = parseInt(audienceBrightnessSlider.value, 10);
    audienceBrightnessValueEl.textContent = audienceBrightnessAdj;
    saveSetting('audienceBrightness', audienceBrightnessAdj);
  });
  // Front Wall / Backwall / Poster Wall / Poster Light brightness sliders
  // -- all six paired ones share the same 0-100 (percent) HTML range,
  // mapped to a 0.00-1.00 decimal value in JS (matching gamepadDeadzone's
  // own established scale-and-divide pattern elsewhere in this file).
  // wireBrightnessSlider0to1 sets up one such slider: reads/writes the
  // given setting key, updates the given variable via setter, and
  // displays two-decimal text.
  function wireBrightnessSlider0to1(sliderId, valueElId, hintId, settingKey, configEntry, setter) {
    const slider = document.getElementById(sliderId);
    const valueEl = document.getElementById(valueElId);
    document.getElementById(hintId).textContent = '(default: ' + configEntry.default.toFixed(2) + ')';
    const initial = setter.get();
    slider.value = Math.round(initial * 100);
    valueEl.textContent = initial.toFixed(2);
    slider.addEventListener('input', () => {
      const v = parseInt(slider.value, 10) / 100;
      setter.set(v);
      valueEl.textContent = v.toFixed(2);
      saveSetting(settingKey, v);
    });
  }
  wireBrightnessSlider0to1('frontWallBrightnessOffSlider', 'frontWallBrightnessOffValue', 'frontWallBrightnessOffDefaultHint', 'frontWallBrightnessOff', MENU_CONFIG.menu.display.frontWallBrightnessOff, { get: () => frontWallBrightnessOffVal, set: (v) => { frontWallBrightnessOffVal = v; } });
  wireBrightnessSlider0to1('frontWallBrightnessOnSlider', 'frontWallBrightnessOnValue', 'frontWallBrightnessOnDefaultHint', 'frontWallBrightnessOn', MENU_CONFIG.menu.display.frontWallBrightnessOn, { get: () => frontWallBrightnessOnVal, set: (v) => { frontWallBrightnessOnVal = v; } });
  wireBrightnessSlider0to1('backwallBrightnessOffSlider', 'backwallBrightnessOffValue', 'backwallBrightnessOffDefaultHint', 'backwallBrightnessOff', MENU_CONFIG.menu.display.backwallBrightnessOff, { get: () => backwallBrightnessOffVal, set: (v) => { backwallBrightnessOffVal = v; } });
  wireBrightnessSlider0to1('backwallBrightnessOnSlider', 'backwallBrightnessOnValue', 'backwallBrightnessOnDefaultHint', 'backwallBrightnessOn', MENU_CONFIG.menu.display.backwallBrightnessOn, { get: () => backwallBrightnessOnVal, set: (v) => { backwallBrightnessOnVal = v; } });
  wireBrightnessSlider0to1('posterWallBrightnessOffSlider', 'posterWallBrightnessOffValue', 'posterWallBrightnessOffDefaultHint', 'posterWallBrightnessOff', MENU_CONFIG.menu.display.posterWallBrightnessOff, { get: () => posterWallBrightnessOffVal, set: (v) => { posterWallBrightnessOffVal = v; } });
  wireBrightnessSlider0to1('posterWallBrightnessOnSlider', 'posterWallBrightnessOnValue', 'posterWallBrightnessOnDefaultHint', 'posterWallBrightnessOn', MENU_CONFIG.menu.display.posterWallBrightnessOn, { get: () => posterWallBrightnessOnVal, set: (v) => { posterWallBrightnessOnVal = v; } });
  wireBrightnessSlider0to1('posterLightBrightnessSlider', 'posterLightBrightnessValue', 'posterLightBrightnessDefaultHint', 'posterLightBrightness', MENU_CONFIG.menu.display.posterLightBrightness, { get: () => posterLightBrightnessVal, set: (v) => { posterLightBrightnessVal = v; } });
  const fovSlider = document.getElementById('fovSlider');
  const fovValueEl = document.getElementById('fovValue');
  document.getElementById('fovDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.display.fov.default + '°)';
  fovSlider.value = fovAdj;
  fovValueEl.textContent = fovAdj + '°';
  camera.fov = fovAdj;
  camera.updateProjectionMatrix();
  fovSlider.addEventListener('input', () => {
    fovAdj = parseInt(fovSlider.value, 10);
    fovValueEl.textContent = fovAdj + '°';
    saveSetting('fov', fovAdj);
    // Live, no reload — same as any other camera property, THREE.js
    // just needs its projection matrix rebuilt after fov changes for
    // the new value to actually take visual effect.
    camera.fov = fovAdj;
    camera.updateProjectionMatrix();
  });
  const jumpEnableToggle = document.getElementById('jumpEnableToggle');
  jumpEnableToggle.checked = jumpEnabled;
  jumpEnableToggle.addEventListener('change', () => { jumpEnabled = jumpEnableToggle.checked; saveSetting('jumpEnabled', jumpEnabled); });
  const controllerMovementToggle = document.getElementById('controllerMovementToggle');
  const controllerSelect = document.getElementById('controllerSelect');
  controllerMovementToggle.checked = controllerMovementEnabled;
  setBoolDefaultHint(document.getElementById('controllerMovementDefaultHint'), MENU_CONFIG.menu.controls.controllerMovementEnabled.default);
  function populateControllerSelect() {
    const pads = (navigator.getGamepads ? navigator.getGamepads() : []) || [];
    const valid = Array.from(pads).filter((p) => p && p.buttons && p.buttons.length > 0);
    controllerSelect.innerHTML = '';
    if (!valid.length) {
      const opt = document.createElement('option');
      opt.value = ''; opt.textContent = 'No Controller available';
      controllerSelect.appendChild(opt);
      controllerSelect.disabled = true;
      return;
    }
    valid.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.id;
      if (p.id === selectedGamepadId) opt.selected = true;
      controllerSelect.appendChild(opt);
    });
    controllerSelect.disabled = !controllerMovementToggle.checked;
    if (!selectedGamepadId) selectedGamepadId = valid[0].id;
  }
  function updateControllerMenuState() {
    const disabled = !controllerMovementToggle.checked || controllerSelect.options.length === 1 && !controllerSelect.options[0].value;
    controllerSelect.disabled = disabled;
    document.getElementById('controllerSelectLabel').classList.toggle('disabled', !controllerMovementToggle.checked);
    deadzoneSlider.disabled = !controllerMovementToggle.checked;
    sensitivitySlider.disabled = !controllerMovementToggle.checked;
    document.getElementById('deadzoneLabel').classList.toggle('disabled', !controllerMovementToggle.checked);
    document.getElementById('sensitivityLabel').classList.toggle('disabled', !controllerMovementToggle.checked);
  }
  controllerMovementToggle.addEventListener('change', () => {
    controllerMovementEnabled = controllerMovementToggle.checked;
    updateControllerMenuState();
    saveSetting('controllerMovementEnabled', controllerMovementEnabled);
  });
  controllerSelect.addEventListener('change', () => { selectedGamepadId = controllerSelect.value || null; saveSetting('selectedGamepadId', selectedGamepadId || ''); });
  const deadzoneSlider = document.getElementById('deadzoneSlider');
  const deadzoneValueEl = document.getElementById('deadzoneValue');
  deadzoneSlider.value = Math.round(GAMEPAD_DEADZONE / 0.05);
  document.getElementById('deadzoneDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.controls.gamepadDeadzone.default.toFixed(2) + ')';
  function applyDeadzoneSlider() {
    GAMEPAD_DEADZONE = parseInt(deadzoneSlider.value, 10) * 0.05;
    deadzoneValueEl.textContent = GAMEPAD_DEADZONE.toFixed(2);
    saveSetting('gamepadDeadzone', GAMEPAD_DEADZONE);
  }
  deadzoneSlider.addEventListener('input', applyDeadzoneSlider);
  applyDeadzoneSlider();
  const sensitivitySlider = document.getElementById('sensitivitySlider');
  const sensitivityValueEl = document.getElementById('sensitivityValue');
  sensitivitySlider.value = Math.round(lookSensitivityMultiplier / 0.05) - 1;
  document.getElementById('sensitivityDefaultHint').textContent = '(default: ' + Math.round(MENU_CONFIG.menu.controls.lookSensitivity.default * 100) + '%)';
  function applySensitivitySlider() {
    lookSensitivityMultiplier = (parseInt(sensitivitySlider.value, 10) + 1) * 0.05;
    sensitivityValueEl.textContent = Math.round(lookSensitivityMultiplier * 100) + '%';
    saveSetting('lookSensitivity', lookSensitivityMultiplier);
  }
  sensitivitySlider.addEventListener('input', applySensitivitySlider);
  applySensitivitySlider();
  function wireVolumeSlider(sliderId, valueId, get, set, settingKey) {
    const slider = document.getElementById(sliderId);
    const valueEl = document.getElementById(valueId);
    slider.value = get();
    valueEl.textContent = get() + '%';
    slider.addEventListener('input', () => {
      const v = parseInt(slider.value, 10);
      set(v);
      valueEl.textContent = v + '%';
      saveSetting(settingKey, v);
    });
    registerReset(sliderId, () => { slider.value = CONFIG_BY_KEY[settingKey].default; fireInput(slider); });
  }
  wireVolumeSlider('volMovieSlider', 'volMovieValue', () => volMovie, (v) => { volMovie = v; }, 'volMovie');
  wireVolumeSlider('volTrailerSlider', 'volTrailerValue', () => volTrailer, (v) => { volTrailer = v; }, 'volTrailer');
  wireVolumeSlider('volThemeVideoSlider', 'volThemeVideoValue', () => volThemeVideo, (v) => { volThemeVideo = v; }, 'volThemeVideo');
  wireVolumeSlider('volThemeSongSlider', 'volThemeSongValue', () => volThemeSong, (v) => { volThemeSong = v; if (themeSongAudio && !themeSongReplacingActive) themeSongAudio.volume = v / 100; }, 'volThemeSong');
  function wireOrderSelect(selectId, get, set, settingKey) {
    const select = document.getElementById(selectId);
    select.value = get();
    markDefaultOption(select, CONFIG_BY_KEY[settingKey].default);
    select.addEventListener('change', () => {
      set(select.value);
      saveSetting(settingKey, select.value);
    });
    registerReset(selectId, () => { select.value = CONFIG_BY_KEY[settingKey].default; fireChange(select); });
  }
  wireOrderSelect('trailerPlaybackOrderSelect', () => trailerPlaybackOrder, (v) => { trailerPlaybackOrder = v; }, 'trailerPlaybackOrder');
  wireOrderSelect('trailerReplaceAudioOrderSelect', () => trailerReplaceAudioOrder, (v) => { trailerReplaceAudioOrder = v; }, 'trailerReplaceAudioOrder');
  wireOrderSelect('themeVideoPlaybackOrderSelect', () => themeVideoPlaybackOrder, (v) => { themeVideoPlaybackOrder = v; }, 'themeVideoPlaybackOrder');
  wireOrderSelect('themeVideoReplaceAudioOrderSelect', () => themeVideoReplaceAudioOrder, (v) => { themeVideoReplaceAudioOrder = v; }, 'themeVideoReplaceAudioOrder');
  wireOrderSelect('themeSongPlaybackOrderSelect', () => themeSongPlaybackOrder, (v) => { themeSongPlaybackOrder = v; }, 'themeSongPlaybackOrder');
  // Start Position — 'beginning' or 'random', for the three contexts
  // that can start theme song audio (standalone Theme Song itself,
  // Trailer's own Replace Audio, Theme Video's own Replace Audio).
  // wireOrderSelect handles load/save/markDefaultOption identically to
  // the Playback/Replace-Audio Order selects above — only the extra
  // gray-out call in each 'set' callback is specific to these three.
  wireOrderSelect('trailerReplaceAudioStartPositionSelect', () => trailerReplaceAudioStartPosition, (v) => { trailerReplaceAudioStartPosition = v; updateReplaceAudioSubState(); }, 'trailerReplaceAudioStartPosition');
  wireOrderSelect('themeVideoReplaceAudioStartPositionSelect', () => themeVideoReplaceAudioStartPosition, (v) => { themeVideoReplaceAudioStartPosition = v; updateReplaceAudioSubState(); }, 'themeVideoReplaceAudioStartPosition');
  wireOrderSelect('themeSongStartPositionSelect', () => themeSongStartPosition, (v) => { themeSongStartPosition = v; updateThemeSongStartPositionSubState('themeSongStartPositionSelect', 'themeSongStartMinInput', 'themeSongStartMinLabel', 'themeSongStartMaxInput', 'themeSongStartMaxLabel', true); }, 'themeSongStartPosition');
  // Min/Max % — plain 0-100 percent inputs, no defaultHint element of
  // their own to update (the HTML hardcodes "(default: N)" directly,
  // same simpler pattern the brightness sliders already use — these
  // values are fixed constants, never worth varying per environment the
  // way Config-driven defaults elsewhere are).
  function wireThemeSongStartPercent(inputId, get, set, settingKey) {
    const input = document.getElementById(inputId);
    input.value = get();
    const hintEl = document.getElementById(inputId.replace('Input', 'DefaultHint'));
    if (hintEl) hintEl.textContent = '(default: ' + CONFIG_BY_KEY[settingKey].default + ')';
    input.addEventListener('change', () => {
      const v = Math.max(0, Math.min(100, parseInt(input.value, 10) || 0));
      input.value = v;
      set(v);
      saveSetting(settingKey, v);
    });
    registerReset(inputId, () => { input.value = CONFIG_BY_KEY[settingKey].default; fireChange(input); });
  }
  wireThemeSongStartPercent('trailerReplaceAudioStartMinInput', () => trailerReplaceAudioStartMin, (v) => { trailerReplaceAudioStartMin = v; }, 'trailerReplaceAudioStartMin');
  wireThemeSongStartPercent('trailerReplaceAudioStartMaxInput', () => trailerReplaceAudioStartMax, (v) => { trailerReplaceAudioStartMax = v; }, 'trailerReplaceAudioStartMax');
  wireThemeSongStartPercent('themeVideoReplaceAudioStartMinInput', () => themeVideoReplaceAudioStartMin, (v) => { themeVideoReplaceAudioStartMin = v; }, 'themeVideoReplaceAudioStartMin');
  wireThemeSongStartPercent('themeVideoReplaceAudioStartMaxInput', () => themeVideoReplaceAudioStartMax, (v) => { themeVideoReplaceAudioStartMax = v; }, 'themeVideoReplaceAudioStartMax');
  wireThemeSongStartPercent('themeSongStartMinInput', () => themeSongStartMin, (v) => { themeSongStartMin = v; }, 'themeSongStartMin');
  wireThemeSongStartPercent('themeSongStartMaxInput', () => themeSongStartMax, (v) => { themeSongStartMax = v; }, 'themeSongStartMax');
  // Active only when Playback Order can actually queue more than one
  // song ('all'/'shuffled') — with 'first'/'random' exactly one song is
  // EVER played per session, so "first song only vs. every song" isn't
  // a real distinction to make; grayed out (not hidden) in that case,
  // same convention as every other conditionally-relevant field here.
  function updateThemeSongFirstOnlySubState() {
    const canQueueMultiple = document.getElementById('themeSongPlaybackOrderSelect').value === 'all' || document.getElementById('themeSongPlaybackOrderSelect').value === 'shuffled';
    ['themeSongDelayedStartFirstOnlyToggle', 'themeSongFadeFirstOnlyToggle'].forEach((id) => {
      document.getElementById(id).disabled = !canQueueMultiple;
    });
    ['themeSongDelayedStartFirstOnlyLabel', 'themeSongFadeFirstOnlyLabel'].forEach((id) => {
      document.getElementById(id).classList.toggle('disabled', !canQueueMultiple);
    });
  }
  const themeSongDelayedStartFirstOnlyToggle = document.getElementById('themeSongDelayedStartFirstOnlyToggle');
  themeSongDelayedStartFirstOnlyToggle.checked = themeSongDelayedStartFirstOnly;
  setBoolDefaultHint(document.getElementById('themeSongDelayedStartFirstOnlyDefaultHint'), MENU_CONFIG.menu.posters.themeSong.themeSongDelayedStartFirstOnly.default);
  themeSongDelayedStartFirstOnlyToggle.addEventListener('change', () => {
    themeSongDelayedStartFirstOnly = themeSongDelayedStartFirstOnlyToggle.checked;
    saveSetting('themeSongDelayedStartFirstOnly', themeSongDelayedStartFirstOnly);
  });
  const themeSongFadeFirstOnlyToggle = document.getElementById('themeSongFadeFirstOnlyToggle');
  themeSongFadeFirstOnlyToggle.checked = themeSongFadeFirstOnly;
  setBoolDefaultHint(document.getElementById('themeSongFadeFirstOnlyDefaultHint'), MENU_CONFIG.menu.posters.themeSong.themeSongFadeFirstOnly.default);
  themeSongFadeFirstOnlyToggle.addEventListener('change', () => {
    themeSongFadeFirstOnly = themeSongFadeFirstOnlyToggle.checked;
    saveSetting('themeSongFadeFirstOnly', themeSongFadeFirstOnly);
  });
  document.getElementById('themeSongPlaybackOrderSelect').addEventListener('change', updateThemeSongFirstOnlySubState);
  updateThemeSongFirstOnlySubState();
  function wireLoopToggle(toggleId, get, set, settingKey) {
    const toggle = document.getElementById(toggleId);
    toggle.checked = get();
    toggle.addEventListener('change', () => {
      set(toggle.checked);
      saveSetting(settingKey, toggle.checked);
    });
    registerReset(toggleId, () => { toggle.checked = CONFIG_BY_KEY[settingKey].default; fireChange(toggle); });
  }
  function updateAfterOptionsDisabled(loopToggleId, pairs) {
    const loopChecked = document.getElementById(loopToggleId).checked;
    pairs.forEach(([toggleId, labelId]) => {
      const toggle = document.getElementById(toggleId);
      const label = document.getElementById(labelId);
      toggle.disabled = loopChecked;
      label.classList.toggle('disabled', loopChecked);
    });
  }
  const MOVIE_AFTER_PAIRS = [['afterMovieThemeSongToggle', 'afterMovieThemeSongLabel'], ['afterMovieScreenArtToggle', 'afterMovieScreenArtLabel']];
  const TRAILER_AFTER_PAIRS = [['afterTrailerThemeSongToggle', 'afterTrailerThemeSongLabel'], ['afterTrailerScreenArtToggle', 'afterTrailerScreenArtLabel']];
  const THEMEVIDEO_AFTER_PAIRS = [['afterThemeVideoThemeSongToggle', 'afterThemeVideoThemeSongLabel'], ['afterThemeVideoScreenArtToggle', 'afterThemeVideoScreenArtLabel']];
  wireLoopToggle('loopMovieToggle', () => loopMovie, (v) => { loopMovie = v; updateAfterOptionsDisabled('loopMovieToggle', MOVIE_AFTER_PAIRS); }, 'loopMovie');
  wireLoopToggle('loopTrailerToggle', () => loopTrailer, (v) => { loopTrailer = v; updateAfterOptionsDisabled('loopTrailerToggle', TRAILER_AFTER_PAIRS); }, 'loopTrailer');
  wireLoopToggle('loopThemeVideoToggle', () => loopThemeVideo, (v) => { loopThemeVideo = v; updateAfterOptionsDisabled('loopThemeVideoToggle', THEMEVIDEO_AFTER_PAIRS); }, 'loopThemeVideo');
  wireLoopToggle('loopThemeSongToggle', () => loopThemeSong, (v) => { loopThemeSong = v; if (themeSongAudio && !themeSongReplacingActive) themeSongAudio.loop = v; }, 'loopThemeSong');
  // Shared by all four Theme Song trim/fade number fields below — same
  // clamp-to-non-negative-integer shape every one of them needs, just
  // wired to its own module variable/settingKey/element.
  function wireThemeSongTrimSeconds(inputId, get, set, settingKey) {
    const input = document.getElementById(inputId);
    input.value = get();
    document.getElementById(inputId.replace('Input', 'DefaultHint')).textContent = '(default: ' + CONFIG_BY_KEY[settingKey].default + ')';
    input.addEventListener('change', () => {
      const v = Math.max(0, parseInt(input.value, 10) || 0);
      input.value = v;
      set(v);
      saveSetting(settingKey, v);
    });
    registerReset(inputId, () => { input.value = CONFIG_BY_KEY[settingKey].default; fireChange(input); });
  }
  wireThemeSongTrimSeconds('themeSongFadeInInput', () => themeSongFadeInSeconds, (v) => { themeSongFadeInSeconds = v; }, 'themeSongFadeInSeconds');
  wireThemeSongTrimSeconds('themeSongFadeOutInput', () => themeSongFadeOutSeconds, (v) => { themeSongFadeOutSeconds = v; }, 'themeSongFadeOutSeconds');
  wireThemeSongTrimSeconds('themeSongDelayedStartInput', () => themeSongDelayedStartSeconds, (v) => { themeSongDelayedStartSeconds = v; }, 'themeSongDelayedStartSeconds');
  wireLoopToggle('afterMovieThemeSongToggle', () => afterMovieThemeSong, (v) => { afterMovieThemeSong = v; }, 'afterMovieThemeSong');
  wireLoopToggle('afterMovieScreenArtToggle', () => afterMovieScreenArt, (v) => { afterMovieScreenArt = v; }, 'afterMovieScreenArt');
  wireLoopToggle('afterTrailerThemeSongToggle', () => afterTrailerThemeSong, (v) => { afterTrailerThemeSong = v; }, 'afterTrailerThemeSong');
  wireLoopToggle('afterTrailerScreenArtToggle', () => afterTrailerScreenArt, (v) => { afterTrailerScreenArt = v; }, 'afterTrailerScreenArt');
  wireLoopToggle('afterThemeVideoThemeSongToggle', () => afterThemeVideoThemeSong, (v) => { afterThemeVideoThemeSong = v; }, 'afterThemeVideoThemeSong');
  wireLoopToggle('afterThemeVideoScreenArtToggle', () => afterThemeVideoScreenArt, (v) => { afterThemeVideoScreenArt = v; }, 'afterThemeVideoScreenArt');
  // Sub-options of "Replace Audio with Theme Song" are grayed out (not
  // hidden) while their own block's checkbox is off — per block
  // independently, matching the backdrop section's convention. Start
  // Position's own Min/Max % fields are grayed out under a SECOND,
  // independent condition on top of that — only meaningful once Start
  // Position ITSELF is 'random', regardless of whether the parent
  // Replace Audio block is otherwise on.
  function updateReplaceAudioSubState() {
    const pairs = [
      [replaceAudioTrailer, 'trailerReplaceAudioOrderSelect', 'trailerReplaceAudioOrderLabel', 'trailerReplaceAudioStartPositionSelect', 'trailerReplaceAudioStartPositionLabel', 'noThemeSongFallbackTrailerSelect', 'noThemeSongFallbackTrailerLabel'],
      [replaceAudioThemeVideo, 'themeVideoReplaceAudioOrderSelect', 'themeVideoReplaceAudioOrderLabel', 'themeVideoReplaceAudioStartPositionSelect', 'themeVideoReplaceAudioStartPositionLabel', 'noThemeSongFallbackThemeVideoSelect', 'noThemeSongFallbackThemeVideoLabel']
    ];
    pairs.forEach((p) => {
      const on = p[0];
      for (let i = 1; i < p.length; i++) {
        const el = document.getElementById(p[i]);
        if (!el) continue;
        if (el.tagName === 'SELECT') el.disabled = !on;
        else el.classList.toggle('disabled', !on);
      }
    });
    updateThemeSongStartPositionSubState('trailerReplaceAudioStartPositionSelect', 'trailerReplaceAudioStartMinInput', 'trailerReplaceAudioStartMinLabel', 'trailerReplaceAudioStartMaxInput', 'trailerReplaceAudioStartMaxLabel', replaceAudioTrailer);
    updateThemeSongStartPositionSubState('themeVideoReplaceAudioStartPositionSelect', 'themeVideoReplaceAudioStartMinInput', 'themeVideoReplaceAudioStartMinLabel', 'themeVideoReplaceAudioStartMaxInput', 'themeVideoReplaceAudioStartMaxLabel', replaceAudioThemeVideo);
  }
  // Shared by all three Start Position contexts (standalone Theme Song,
  // Trailer's own Replace Audio, Theme Video's own Replace Audio) — the
  // Min/Max % fields only matter once Start Position is ITSELF set to
  // 'random'; parentOn additionally folds in the containing block's own
  // on/off state where one exists (Trailer/Theme Video's Replace Audio
  // toggle) — true unconditionally for the standalone Theme Song case,
  // which has no such parent toggle of its own.
  function updateThemeSongStartPositionSubState(selectId, minInputId, minLabelId, maxInputId, maxLabelId, parentOn) {
    const isRandom = document.getElementById(selectId).value === 'random';
    const on = parentOn && isRandom;
    document.getElementById(minInputId).disabled = !on;
    document.getElementById(maxInputId).disabled = !on;
    document.getElementById(minLabelId).classList.toggle('disabled', !on);
    document.getElementById(maxLabelId).classList.toggle('disabled', !on);
  }
  wireLoopToggle('replaceAudioTrailerToggle', () => replaceAudioTrailer, (v) => { replaceAudioTrailer = v; updateReplaceAudioSubState(); }, 'replaceAudioTrailer');
  wireLoopToggle('replaceAudioThemeVideoToggle', () => replaceAudioThemeVideo, (v) => { replaceAudioThemeVideo = v; updateReplaceAudioSubState(); }, 'replaceAudioThemeVideo');
  updateReplaceAudioSubState();
  updateThemeSongStartPositionSubState('themeSongStartPositionSelect', 'themeSongStartMinInput', 'themeSongStartMinLabel', 'themeSongStartMaxInput', 'themeSongStartMaxLabel', true);
  const noThemeSongFallbackTrailerSelect = document.getElementById('noThemeSongFallbackTrailerSelect');
  noThemeSongFallbackTrailerSelect.value = noThemeSongFallbackTrailer;
  markDefaultOption(noThemeSongFallbackTrailerSelect, MENU_CONFIG.menu.posters.trailer.noThemeSongFallbackTrailer.default);
  noThemeSongFallbackTrailerSelect.addEventListener('change', () => {
    noThemeSongFallbackTrailer = noThemeSongFallbackTrailerSelect.value;
    saveSetting('noThemeSongFallbackTrailer', noThemeSongFallbackTrailer);
  });
  const noThemeSongFallbackThemeVideoSelect = document.getElementById('noThemeSongFallbackThemeVideoSelect');
  noThemeSongFallbackThemeVideoSelect.value = noThemeSongFallbackThemeVideo;
  markDefaultOption(noThemeSongFallbackThemeVideoSelect, MENU_CONFIG.menu.posters.themeVideo.noThemeSongFallbackThemeVideo.default);
  noThemeSongFallbackThemeVideoSelect.addEventListener('change', () => {
    noThemeSongFallbackThemeVideo = noThemeSongFallbackThemeVideoSelect.value;
    saveSetting('noThemeSongFallbackThemeVideo', noThemeSongFallbackThemeVideo);
  });
  updateAfterOptionsDisabled('loopMovieToggle', MOVIE_AFTER_PAIRS);
  updateAfterOptionsDisabled('loopTrailerToggle', TRAILER_AFTER_PAIRS);
  updateAfterOptionsDisabled('loopThemeVideoToggle', THEMEVIDEO_AFTER_PAIRS);
  setBoolDefaultHint(document.getElementById('loopMovieDefaultHint'), MENU_CONFIG.menu.posters.movie.loopMovie.default);
  setBoolDefaultHint(document.getElementById('loopTrailerDefaultHint'), MENU_CONFIG.menu.posters.trailer.loopTrailer.default);
  setBoolDefaultHint(document.getElementById('loopThemeVideoDefaultHint'), MENU_CONFIG.menu.posters.themeVideo.loopThemeVideo.default);
  setBoolDefaultHint(document.getElementById('loopThemeSongDefaultHint'), MENU_CONFIG.menu.posters.themeSong.loopThemeSong.default);
  setBoolDefaultHint(document.getElementById('afterMovieThemeSongDefaultHint'), MENU_CONFIG.menu.posters.movie.afterMovieThemeSong.default);
  setBoolDefaultHint(document.getElementById('afterMovieScreenArtDefaultHint'), MENU_CONFIG.menu.posters.movie.afterMovieScreenArt.default);
  setBoolDefaultHint(document.getElementById('afterTrailerThemeSongDefaultHint'), MENU_CONFIG.menu.posters.trailer.afterTrailerThemeSong.default);
  setBoolDefaultHint(document.getElementById('afterTrailerScreenArtDefaultHint'), MENU_CONFIG.menu.posters.trailer.afterTrailerScreenArt.default);
  setBoolDefaultHint(document.getElementById('afterThemeVideoThemeSongDefaultHint'), MENU_CONFIG.menu.posters.themeVideo.afterThemeVideoThemeSong.default);
  setBoolDefaultHint(document.getElementById('afterThemeVideoScreenArtDefaultHint'), MENU_CONFIG.menu.posters.themeVideo.afterThemeVideoScreenArt.default);
  setBoolDefaultHint(document.getElementById('replaceAudioTrailerDefaultHint'), MENU_CONFIG.menu.posters.trailer.replaceAudioTrailer.default);
  setBoolDefaultHint(document.getElementById('replaceAudioThemeVideoDefaultHint'), MENU_CONFIG.menu.posters.themeVideo.replaceAudioThemeVideo.default);
  document.getElementById('volMovieDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.posters.movie.volMovie.default + '%)';
  document.getElementById('volTrailerDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.posters.trailer.volTrailer.default + '%)';
  document.getElementById('volThemeVideoDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.posters.themeVideo.volThemeVideo.default + '%)';
  document.getElementById('volThemeSongDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.posters.themeSong.volThemeSong.default + '%)';
  document.getElementById('noThemeSongFallbackTrailerDefaultHint').textContent = MENU_CONFIG.menu.posters.trailer.noThemeSongFallbackTrailer.default === 'keep' ? '(default: keep original audio)' : '(default: mute)';
  document.getElementById('noThemeSongFallbackThemeVideoDefaultHint').textContent = MENU_CONFIG.menu.posters.themeVideo.noThemeSongFallbackThemeVideo.default === 'keep' ? '(default: keep original audio)' : '(default: mute)';
  updateControllerMenuState();
  const backdropLayoutSelect = document.getElementById('backdropLayoutSelect');
  const backdropModeSelect = document.getElementById('backdropModeSelect');
  const backdropSecondsInput = document.getElementById('backdropSecondsInput');
  backdropLayoutSelect.value = loadSetting('backdropLayout', MENU_CONFIG.menu.backwall.backdropLayout.default);
  backdropModeSelect.value = loadSetting('backdropMode', MENU_CONFIG.menu.backwall.backdropMode.default);
  backdropSecondsInput.value = loadSetting('backdropShuffleSeconds', MENU_CONFIG.menu.backwall.backdropShuffleSeconds.default);
  markDefaultOption(backdropLayoutSelect, MENU_CONFIG.menu.backwall.backdropLayout.default);
  markDefaultOption(backdropModeSelect, MENU_CONFIG.menu.backwall.backdropMode.default);
  document.getElementById('backdropSecondsDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.backwall.backdropShuffleSeconds.default + ')';
  setBoolDefaultHint(document.getElementById('backdropVideosEnabledDefaultHint'), MENU_CONFIG.menu.backwall.backdropVideosEnabled.default);
  wireLoopToggle('backdropVideosEnabledToggle', () => backdropVideosEnabled, (v) => { backdropVideosEnabled = v; updateBackdropMenuState(); if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem); }, 'backdropVideosEnabled');
  const backdropOverscanModeSelect = document.getElementById('backdropOverscanModeSelect');
  backdropOverscanModeSelect.value = backdropOverscanMode;
  markDefaultOption(backdropOverscanModeSelect, MENU_CONFIG.menu.backwall.backdropOverscanMode.default);
  // Live A/B: switching re-fits the CURRENTLY RUNNING video tiles in
  // place — no rebuild, so the effect is visible instantly on the same
  // footage, exactly like the old toggle did.
  backdropOverscanModeSelect.addEventListener('change', () => {
    backdropOverscanMode = backdropOverscanModeSelect.value;
    saveSetting('backdropOverscanMode', backdropOverscanMode);
    gridTileInfo.forEach((t) => {
      applyVideoFit(t);
      // A tile still WAITING on 'auto' detection when the mode is
      // switched away from 'auto' entirely has nothing left to wait
      // for — release it immediately instead of leaving it stuck until
      // the unrelated safety timeout eventually clears it on its own.
      if (backdropOverscanMode !== 'auto' && t.videoEl && t.videoEl.__jfAwaitingCrop) {
        t.videoEl.__jfAwaitingCrop = null;
        t.mat.__fadeRate = 25;
        t.mat.__fadeTarget = 1;
      }
    });
  });
  setBoolDefaultHint(document.getElementById('backdropBalanceDefaultHint'), MENU_CONFIG.menu.backwall.backdropBalanceVideos.default);
  wireLoopToggle('backdropBalanceToggle', () => backdropBalanceVideos, (v) => { backdropBalanceVideos = v; if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem); }, 'backdropBalanceVideos');
  wireOrderSelect('backdropTrailerTilesSelect', () => backdropTrailerTiles, (v) => { backdropTrailerTiles = v; updateBackdropMenuState(); if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem); }, 'backdropTrailerTiles');
  wireOrderSelect('backdropThemeVideoTilesSelect', () => backdropThemeVideoTiles, (v) => { backdropThemeVideoTiles = v; updateBackdropMenuState(); if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem); }, 'backdropThemeVideoTiles');
  wireOrderSelect('backdropMovieTilesSelect', () => backdropMovieTiles, (v) => { backdropMovieTiles = v; updateBackdropMenuState(); if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem); }, 'backdropMovieTiles');
  const backdropMovieMinInput = document.getElementById('backdropMovieMinInput');
  const backdropMovieMaxInput = document.getElementById('backdropMovieMaxInput');
  backdropMovieMinInput.value = loadSetting('backdropMovieMinPct', MENU_CONFIG.menu.backwall.backdropMovieMinPct.default);
  backdropMovieMaxInput.value = loadSetting('backdropMovieMaxPct', MENU_CONFIG.menu.backwall.backdropMovieMaxPct.default);
  document.getElementById('backdropMovieMinDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.backwall.backdropMovieMinPct.default + '%)';
  document.getElementById('backdropMovieMaxDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.backwall.backdropMovieMaxPct.default + '%)';
  wireOrderSelect('backdropTrailerOrderSelect', () => backdropTrailerOrder, (v) => { backdropTrailerOrder = v; if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem); }, 'backdropTrailerOrder');
  wireOrderSelect('backdropTrailerStartSelect', () => backdropTrailerStart, (v) => { backdropTrailerStart = v; if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem); }, 'backdropTrailerStart');
  wireOrderSelect('backdropThemeVideoOrderSelect', () => backdropThemeVideoOrder, (v) => { backdropThemeVideoOrder = v; if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem); }, 'backdropThemeVideoOrder');
  wireOrderSelect('backdropThemeVideoStartSelect', () => backdropThemeVideoStart, (v) => { backdropThemeVideoStart = v; if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem); }, 'backdropThemeVideoStart');
  backdropMovieMinInput.addEventListener('change', () => {
    let v = Math.max(0, Math.min(100, parseInt(backdropMovieMinInput.value, 10) || 0));
    if (v > +backdropMovieMaxInput.value) v = +backdropMovieMaxInput.value;
    backdropMovieMinInput.value = v;
    saveSetting('backdropMovieMinPct', v);
    if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem);
  });
  backdropMovieMaxInput.addEventListener('change', () => {
    let v = Math.max(0, Math.min(100, parseInt(backdropMovieMaxInput.value, 10) || 0));
    if (v < +backdropMovieMinInput.value) v = +backdropMovieMinInput.value;
    backdropMovieMaxInput.value = v;
    saveSetting('backdropMovieMaxPct', v);
    if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem);
  });
  const tabIconSelect = document.getElementById('tabIconSelect');
  const faviconLink = document.getElementById('faviconLink');
  const vanillaFaviconHref = faviconLink.href;
  function applyTabIcon() {
    faviconLink.href = tabIconSelect.value === 'cinema' ? CINEMA_ICON_DATA_URL : vanillaFaviconHref;
    saveSetting('tabIcon', tabIconSelect.value);
  }
  tabIconSelect.value = loadSetting('tabIcon', MENU_CONFIG.menu.misc.tabIcon.default);
  markDefaultOption(tabIconSelect, MENU_CONFIG.menu.misc.tabIcon.default);
  applyTabIcon();
  tabIconSelect.addEventListener('change', applyTabIcon);
  const libraryItemOpensInSelect = document.getElementById('libraryItemOpensInSelect');
  libraryItemOpensInSelect.value = libraryItemOpensIn;
  markDefaultOption(libraryItemOpensInSelect, MENU_CONFIG.menu.misc.libraryItemOpensIn.default);
  libraryItemOpensInSelect.addEventListener('change', () => {
    libraryItemOpensIn = libraryItemOpensInSelect.value;
    saveSetting('libraryItemOpensIn', libraryItemOpensIn);
  });
  // Smart Launch from Jellyfin Web — display-only, permanently grayed
  // out, regardless of the master toggle's own value. Smart Launch is
  // decided in Jellyfin Web itself, at the moment the button is
  // clicked — before this Cinema session even exists — so letting the
  // person "change" it here would silently do nothing (any edit here
  // only lives in this session's storage, which has no bearing on how
  // the NEXT Cinema launch gets built). These simply reflect the
  // current config default, with no save-on-change wiring at all —
  // there is nothing to save.
  const SMART_LAUNCH_ALL_KEYS = ['smartLaunchEnabled', 'smartLaunchSort', 'smartLaunchFilter', 'smartLaunchScroll', 'smartLaunchMovies', 'smartLaunchMoviesDetail',
    'smartLaunchFavorites', 'smartLaunchCollections', 'smartLaunchGenres', 'smartLaunchTags', 'smartLaunchStudios', 'smartLaunchPersons'];
  SMART_LAUNCH_ALL_KEYS.forEach((key) => {
    const toggle = document.getElementById(key + 'Toggle');
    const label = document.getElementById(key + 'Label');
    toggle.checked = CONFIG_BY_KEY[key].default;
    toggle.disabled = true;
    label.classList.add('disabled');
    setBoolDefaultHint(document.getElementById(key + 'DefaultHint'), CONFIG_BY_KEY[key].default);
  });
  // A dropdown here would be misleading — a DISABLED <select> hides its
  // other options from view in most browsers, so the person could never
  // actually see what the alternatives even are. This lists every
  // possible value directly, with the one currently active (from
  // config) visually picked out — genuinely informational, not a
  // form control pretending to be interactive.
  // Mirrors the poster context-menu entries (posterMenuTabs), minus
  // 'library' — jumping to Jellyfin Web's own library page makes no
  // sense as something to auto-start FROM there.
  const SMART_LAUNCH_AUTOPLAY_OPTIONS = [
    { value: 'none', label: 'Nothing (just show posters)' },
    { value: 'movie', label: 'Movie' },
    { value: 'trailer', label: 'Trailer' },
    { value: 'themevideo', label: 'Theme Video' },
    { value: 'themesong', label: 'Theme Song' },
    { value: 'fanartwall', label: 'Fanart Wall' },
    { value: 'ambient', label: 'Ambient Mode' },
  ];
  const smartLaunchAutoPlayOptionsEl = document.getElementById('smartLaunchAutoPlayOptions');
  smartLaunchAutoPlayOptionsEl.innerHTML = SMART_LAUNCH_AUTOPLAY_OPTIONS.map((opt) => {
    const active = opt.value === MENU_CONFIG.menu.misc.smartLaunch.smartLaunchAutoPlay.default;
    const style = active
      ? 'color:#d8a84e; font-weight:600;'
      : 'color:#7a6650;';
    const defaultTag = active ? ' <span class="defaultHint">(default)</span>' : '';
    return '<div style="' + style + ' padding:1px 0;">' + (active ? '● ' : '○ ') + opt.label + defaultTag + '</div>';
  }).join('');
  const hideUnavailableToggle = document.getElementById('hideUnavailableToggle');
  hideUnavailableToggle.checked = hideUnavailableItems;
  setBoolDefaultHint(document.getElementById('hideUnavailableDefaultHint'), MENU_CONFIG.menu.posters.general.hideUnavailableItems.default);
  hideUnavailableToggle.addEventListener('change', () => {
    hideUnavailableItems = hideUnavailableToggle.checked;
    saveSetting('hideUnavailableItems', hideUnavailableItems);
  });
  // ---- Ambient Mode: profile-level state ----
  // Only ONE in-memory copy of each profile's data exists, keyed by
  // profile number — loaded once here from sessionStorage (falling back
  // to the CONFIG default) so switching the editing profile in the menu
  // never has to re-fetch anything, just swap which key of this object
  // the shared UI fields read from/write to.
  function loadAmbientProfileData(n) {
    return {
      name: loadSetting('ambientProfile' + n + 'Name', MENU_CONFIG.menu.posters.ambientMode.profiles[n].name.default),
      loop: loadBoolSetting('ambientProfile' + n + 'Loop', MENU_CONFIG.menu.posters.ambientMode.profiles[n].loop.default),
      sequenceCount: parseInt(loadSetting('ambientProfile' + n + 'SequenceCount', String(MENU_CONFIG.menu.posters.ambientMode.profiles[n].sequenceCount.default)), 10),
      // Normalized defensively: the config IS the intended persistence
      // layer here (session edits are deliberately throwaway), and a
      // hand-edited ambientProfileNSequences can plausibly arrive shorter
      // than AMBIENT_MAX_SEQUENCES or with individual fields omitted —
      // either would crash the UI loader on startup (sequences[n-1].effect
      // on undefined) or the engine later (sequence.env.indexOf on
      // undefined). Every slot is padded to a full default sequence and
      // every provided sequence merged OVER a default, so partial hand
      // edits stay valid instead of being all-or-nothing.
      sequences: (() => {
        let raw;
        try { raw = JSON.parse(loadSetting('ambientProfile' + n + 'Sequences', JSON.stringify(MENU_CONFIG.menu.posters.ambientMode.profiles[n].sequences.default))); } catch (err) { raw = []; }
        if (!Array.isArray(raw)) raw = [];
        return Array.from({ length: AMBIENT_MAX_SEQUENCES }, (unused, i) => Object.assign(ambientDefaultSequence(n, i), raw[i] || {}));
      })(),
    };
  }
  const ambientData = { 1: loadAmbientProfileData(1), 2: loadAmbientProfileData(2), 3: loadAmbientProfileData(3) };
  // The profile being edited IS the active one — a single number, not two
  // separate pieces of state, per explicit design decision.
  // Clamped to the valid 1-3 range — sessionStorage is freely editable
  // via devtools, and this value gets used completely unguarded a few
  // lines below (ambientData[ambientEditingProfile].name, during the
  // synchronous initial menu setup) — an out-of-range value there would
  // throw immediately and could take down the whole menu's setup, not
  // just Ambient Mode.
  const ambientProfileSelect = document.getElementById('ambientProfileSelect');
  // Reflects any custom profile name directly in the dropdown's own
  // option text — "Profile 1" normally, or "Profile 1 - Pre-Show" once
  // a name is set. There's no in-menu input for this (see the hint text
  // above, right where that field used to be) — the ONLY way a name
  // ever gets set is via the config, so this is the ONE place that
  // actually needs to reflect it; nothing else in the menu shows it.
  // Must run BEFORE markDefaultOption below, which appends its own
  // " (default)" suffix onto whatever text is already there — reversing
  // the order would put the name after that suffix instead of before it.
  Array.from(ambientProfileSelect.options).forEach((opt) => {
    const n = parseInt(opt.value, 10);
    const name = ambientData[n] && ambientData[n].name;
    opt.textContent = 'Profile ' + n + (name ? ' - ' + name : '');
  });
  markDefaultOption(ambientProfileSelect, MENU_CONFIG.menu.posters.ambientMode.ambientActiveProfile.default);
  const ambientProfileLoopToggle = document.getElementById('ambientProfileLoopToggle');
  const ambientSequenceCountSelect = document.getElementById('ambientSequenceCountSelect');
  // Number of Sequences is the one place, unlike every other field
  // shared across the 10 sequence blocks, where the DEFAULT itself
  // genuinely differs per profile (Profile 1's is 6, to match its own
  // 6 pre-filled example sequences; Profiles 2/3 are still 1, an empty
  // slate) — so the "(default)" marking can't just be set once like the
  // other dropdowns, it has to be re-applied every time the edited
  // profile changes. Strips any stale marking left over from whichever
  // profile was being edited a moment ago before applying the current
  // one's own — markDefaultOption itself only ever ADDS a marking, never
  // removes a previous one, so re-running it blindly across profile
  // switches would otherwise leave two options marked "(default)" at
  // once.
  function markAmbientSequenceCountDefault() {
    const defaultValue = MENU_CONFIG.menu.posters.ambientMode.profiles[ambientEditingProfile].sequenceCount.default;
    Array.from(ambientSequenceCountSelect.options).forEach((opt) => {
      opt.textContent = opt.textContent.replace(' (default)', '');
    });
    markDefaultOption(ambientSequenceCountSelect, defaultValue);
  }
  // Populates the shared fields from whichever profile is now being
  // edited. Called once at startup and again every time the profile
  // selector itself changes — never touches ambientData, only reads it.
  function loadAmbientProfileIntoUI() {
    const p = ambientData[ambientEditingProfile];
    ambientProfileSelect.value = String(ambientEditingProfile);
    ambientProfileLoopToggle.checked = p.loop;
    ambientSequenceCountSelect.value = String(p.sequenceCount);
    markAmbientSequenceCountDefault();
    markAmbientSequenceEffectDefaults();
    markAmbientProfileLoopDefault();
    for (let n = 1; n <= AMBIENT_MAX_SEQUENCES; n++) loadAmbientSequenceIntoUI(n);
    updateAmbientSequenceVisibility();
  }
  // Every field name used by BOTH loadAmbientSequenceIntoUI/saveAmbientSequence
  // below and updateAmbientSequenceVisibility further down — kept as one
  // shared list so the three can never quietly drift out of sync with
  // each other (e.g. a field wired for saving but never actually
  // enabled/disabled by the visibility toggle).
  const AMBIENT_SEQUENCE_FIELD_SUFFIXES = [
    'EffectSelect', 'DurationTypeSelect', 'DurationValueInput', 'VolumeSlider', 'PlaybackOrderSelect',
    'LoopToggle', 'MovieStartModeSelect', 'MovieStartMinInput', 'MovieStartMaxInput',
    'ThemeSongDelayedStartInput', 'ThemeSongEarlyEndInput', 'ThemeSongFadeInInput', 'ThemeSongFadeOutInput',
    'ThemeSongStartPositionSelect', 'ThemeSongStartMinInput', 'ThemeSongStartMaxInput',
    'ThemeSongDelayedStartFirstOnlyToggle', 'ThemeSongFadeFirstOnlyToggle',
    'ReplaceAudioToggle', 'ReplaceAudioOrderSelect',
    'EnvSelect', 'FallbackSelect', 'FrontArtEarlyFadeInput',
  ];
  function ambientSequenceEl(n, suffix) {
    const el = document.getElementById('ambientSequence' + n + suffix);
    // Should be unreachable — the HTML and this script always ship
    // together — but a bare null here would otherwise surface as an
    // opaque "Cannot read properties of null" with no indication of
    // WHICH field went missing, should a future edit ever desync them.
    if (!el) console.error('[AmbientMode] missing menu element: ambientSequence' + n + suffix);
    return el;
  }
  // Every dropdown across all 10 sequences marked with its OWN default
  // option — same "(default)" convention used throughout the rest of
  // the menu. Every field EXCEPT the Poster Effect itself is identical
  // for every sequence AND every profile (they all share the one
  // ambientDefaultSequence() shape for these five), so those values are
  // simply the literal defaults from that function, marked once here and
  // never revisited. Poster Effect is handled separately, further down
  // (markAmbientSequenceEffectDefaults) — its own default genuinely
  // differs both per sequence AND per profile, so a one-time static
  // marking here would be wrong the moment the edited profile changes.
  for (let n = 1; n <= AMBIENT_MAX_SEQUENCES; n++) {
    markDefaultOption(ambientSequenceEl(n, 'DurationTypeSelect'), 'count');
    markDefaultOption(ambientSequenceEl(n, 'PlaybackOrderSelect'), 'first');
    markDefaultOption(ambientSequenceEl(n, 'MovieStartModeSelect'), 'beginning');
    markDefaultOption(ambientSequenceEl(n, 'ReplaceAudioOrderSelect'), 'first');
    markDefaultOption(ambientSequenceEl(n, 'ThemeSongStartPositionSelect'), 'beginning');
    markDefaultOption(ambientSequenceEl(n, 'FallbackSelect'), 'empty');
  }
  // Poster Effect's own default marking — see the comment on the loop
  // just above for why this one, alone, needs to be re-run on every
  // profile switch rather than marked once at startup: Profile 1 has 6
  // sequences each with their own specific default effect, Profiles 2
  // and 3 default every sequence to Fanart Wall instead — three fully
  // independent starting points, not one shared shape silently reused.
  // Same stale-marking-removal approach as markAmbientSequenceCountDefault:
  // markDefaultOption only ever ADDS a marking, so every option is
  // stripped back to its plain label first, then the CURRENT profile's
  // own correct one re-marked, every time this runs.
  function markAmbientSequenceEffectDefaults() {
    const perProfile = AMBIENT_SEQUENCE_DEFAULT_EFFECTS_BY_PROFILE[ambientEditingProfile];
    for (let n = 1; n <= AMBIENT_MAX_SEQUENCES; n++) {
      const el = ambientSequenceEl(n, 'EffectSelect');
      Array.from(el.options).forEach((opt) => { opt.textContent = opt.textContent.replace(' (default)', ''); });
      markDefaultOption(el, (perProfile && perProfile[n - 1]) || 'fanartwall');
    }
  }
  // The one field whose OWN default genuinely depends on another field's
  // current value — count's natural default is 1 (play once), time's is
  // 30 (a reasonable ambient dwell length) — sensibly different enough
  // that a single fixed "(default: N)" hint would be actively misleading
  // for whichever mode it wasn't written for. Both the hint text AND the
  // prefill itself (see the DurationTypeSelect change handler further
  // down) switch together, in lockstep, whenever the mode changes.
  function ambientDefaultDurationValueFor(durationType) {
    return durationType === 'time' ? 30 : 1;
  }
  function updateAmbientDurationValueHint(n) {
    const hintEl = document.getElementById('ambientSequence' + n + 'DurationValueDefaultHint');
    if (hintEl) hintEl.textContent = '(default: ' + ambientDefaultDurationValueFor(ambientSequenceEl(n, 'DurationTypeSelect').value) + ')';
  }
  // See CONFIG's own big comment for the absolute rule this exists to
  // satisfy: no hardcoded "(default: X)" text, anywhere, ever.
  // Ambient Mode's own "default" for every one of these fields is NOT a
  // single fixed value the way a normal app setting's is — it's whatever
  // ambientDefaultSequence(profile, index) resolves to for THIS EXACT
  // profile+step combination, AFTER folding in that profile's own
  // AMBIENT_SEQUENCE_FIELD_OVERRIDES_BY_PROFILE entry (Profile 1 Step 3's
  // Theme Song step, for instance, has its OWN pre-configured Delayed
  // Start/Fade/Early End/Start Position — THOSE are its real defaults,
  // not the generic blank-sequence baseline). Every "(default: X)" hint
  // and every dropdown's inline "(default)" marker in this whole section
  // needs to reflect THAT — recomputed fresh on every load, since
  // switching profile or sequence changes which step's true default is
  // even being looked at.
  function updateAmbientSequenceDefaultHints(n) {
    const d = ambientDefaultSequence(ambientEditingProfile, n - 1);
    const hint = (labelSuffix, text) => {
      const label = document.getElementById('ambientSequence' + n + labelSuffix);
      const span = label && label.querySelector('.defaultHint');
      if (span) span.textContent = '(default: ' + text + ')';
    };
    hint('VolumeLabel', d.volume);
    hint('MovieStartMinLabel', d.movieStartMin);
    hint('MovieStartMaxLabel', d.movieStartMax);
    hint('ThemeSongStartPositionLabel', d.themeSongStartPosition === 'random' ? 'Random Timestamp' : 'From Beginning');
    hint('ThemeSongStartMinLabel', d.themeSongStartMin);
    hint('ThemeSongStartMaxLabel', d.themeSongStartMax);
    hint('ThemeSongDelayedStartLabel', d.themeSongDelayedStart);
    hint('ThemeSongFadeInLabel', d.themeSongFadeIn);
    hint('ThemeSongFadeOutLabel', d.themeSongFadeOut);
    hint('ThemeSongEarlyEndLabel', d.themeSongEarlyEnd);
    hint('LoopLabel', d.loop ? 'on' : 'off');
    hint('ThemeSongDelayedStartFirstOnlyLabel', d.themeSongDelayedStartFirstOnly ? 'on' : 'off');
    hint('ThemeSongFadeFirstOnlyLabel', d.themeSongFadeFirstOnly ? 'on' : 'off');
    hint('ReplaceAudioLabel', d.replaceAudio ? 'on' : 'off');
    hint('FrontArtEarlyFadeLabel', d.frontArtEarlyFadeSeconds);
    updateDefaultOptionMarker(ambientSequenceEl(n, 'PlaybackOrderSelect'), d.playbackOrder);
    updateDefaultOptionMarker(ambientSequenceEl(n, 'MovieStartModeSelect'), d.movieStartMode);
    updateDefaultOptionMarker(ambientSequenceEl(n, 'ThemeSongStartPositionSelect'), d.themeSongStartPosition);
    updateDefaultOptionMarker(ambientSequenceEl(n, 'ReplaceAudioOrderSelect'), d.replaceAudioOrder);
    updateDefaultOptionMarker(ambientSequenceEl(n, 'FallbackSelect'), d.fallback);
  }
  function loadAmbientSequenceIntoUI(n) {
    const sequence = ambientData[ambientEditingProfile].sequences[n - 1];
    ambientSequenceEl(n, 'EffectSelect').value = sequence.effect;
    ambientSequenceEl(n, 'DurationTypeSelect').value = sequence.durationType;
    ambientSequenceEl(n, 'DurationValueInput').value = sequence.durationValue;
    ambientSequenceEl(n, 'VolumeSlider').value = sequence.volume;
    const volLabel = document.getElementById('ambientSequence' + n + 'VolumeValue');
    if (volLabel) volLabel.textContent = sequence.volume + '%';
    ambientSequenceEl(n, 'PlaybackOrderSelect').value = sequence.playbackOrder;
    ambientSequenceEl(n, 'LoopToggle').checked = sequence.loop;
    ambientSequenceEl(n, 'MovieStartModeSelect').value = sequence.movieStartMode;
    ambientSequenceEl(n, 'MovieStartMinInput').value = sequence.movieStartMin;
    ambientSequenceEl(n, 'MovieStartMaxInput').value = sequence.movieStartMax;
    ambientSequenceEl(n, 'ThemeSongDelayedStartInput').value = sequence.themeSongDelayedStart;
    ambientSequenceEl(n, 'ThemeSongEarlyEndInput').value = sequence.themeSongEarlyEnd;
    ambientSequenceEl(n, 'ThemeSongFadeInInput').value = sequence.themeSongFadeIn;
    ambientSequenceEl(n, 'ThemeSongFadeOutInput').value = sequence.themeSongFadeOut;
    ambientSequenceEl(n, 'ThemeSongStartPositionSelect').value = sequence.themeSongStartPosition;
    ambientSequenceEl(n, 'ThemeSongStartMinInput').value = sequence.themeSongStartMin;
    ambientSequenceEl(n, 'ThemeSongStartMaxInput').value = sequence.themeSongStartMax;
    ambientSequenceEl(n, 'ThemeSongDelayedStartFirstOnlyToggle').checked = sequence.themeSongDelayedStartFirstOnly;
    ambientSequenceEl(n, 'ThemeSongFadeFirstOnlyToggle').checked = sequence.themeSongFadeFirstOnly;
    ambientSequenceEl(n, 'ReplaceAudioToggle').checked = sequence.replaceAudio;
    ambientSequenceEl(n, 'ReplaceAudioOrderSelect').value = sequence.replaceAudioOrder;
    multiSelectState['AmbientSeq' + n + 'Env'] = sequence.env.slice();
    updateMsSummary('ambientSequence' + n + 'EnvSelect');
    ambientSequenceEl(n, 'FallbackSelect').value = sequence.fallback;
    ambientSequenceEl(n, 'FrontArtEarlyFadeInput').value = sequence.frontArtEarlyFadeSeconds;
    updateAmbientDurationValueHint(n);
    updateAmbientSequenceDefaultHints(n);
    updateAmbientSequenceFieldVisibility(n);
  }
  // Reads the CURRENT dom state of sequence n back into ambientData and
  // persists it — called from every one of that sequence's own field
  // change handlers, always re-saving the WHOLE sequence object rather
  // than a single field, since ambientProfileNSequences is stored as one
  // combined JSON blob per profile, not per individual field.
  function saveAmbientSequence(n) {
    const sequence = ambientData[ambientEditingProfile].sequences[n - 1];
    sequence.effect = ambientSequenceEl(n, 'EffectSelect').value;
    sequence.durationType = ambientSequenceEl(n, 'DurationTypeSelect').value;
    sequence.durationValue = Math.max(1, parseInt(ambientSequenceEl(n, 'DurationValueInput').value, 10) || 1);
    ambientSequenceEl(n, 'DurationValueInput').value = sequence.durationValue;
    sequence.volume = parseInt(ambientSequenceEl(n, 'VolumeSlider').value, 10);
    const volLabel = document.getElementById('ambientSequence' + n + 'VolumeValue');
    if (volLabel) volLabel.textContent = sequence.volume + '%';
    sequence.playbackOrder = ambientSequenceEl(n, 'PlaybackOrderSelect').value;
    sequence.loop = ambientSequenceEl(n, 'LoopToggle').checked;
    sequence.movieStartMode = ambientSequenceEl(n, 'MovieStartModeSelect').value;
    sequence.movieStartMin = Math.max(0, Math.min(100, parseInt(ambientSequenceEl(n, 'MovieStartMinInput').value, 10) || 0));
    sequence.movieStartMax = Math.max(0, Math.min(100, parseInt(ambientSequenceEl(n, 'MovieStartMaxInput').value, 10) || 0));
    ambientSequenceEl(n, 'MovieStartMinInput').value = sequence.movieStartMin;
    ambientSequenceEl(n, 'MovieStartMaxInput').value = sequence.movieStartMax;
    sequence.themeSongDelayedStart = Math.max(0, parseInt(ambientSequenceEl(n, 'ThemeSongDelayedStartInput').value, 10) || 0);
    sequence.themeSongEarlyEnd = Math.max(0, parseInt(ambientSequenceEl(n, 'ThemeSongEarlyEndInput').value, 10) || 0);
    sequence.themeSongFadeIn = Math.max(0, parseInt(ambientSequenceEl(n, 'ThemeSongFadeInInput').value, 10) || 0);
    sequence.themeSongFadeOut = Math.max(0, parseInt(ambientSequenceEl(n, 'ThemeSongFadeOutInput').value, 10) || 0);
    ambientSequenceEl(n, 'ThemeSongDelayedStartInput').value = sequence.themeSongDelayedStart;
    ambientSequenceEl(n, 'ThemeSongEarlyEndInput').value = sequence.themeSongEarlyEnd;
    ambientSequenceEl(n, 'ThemeSongFadeInInput').value = sequence.themeSongFadeIn;
    ambientSequenceEl(n, 'ThemeSongFadeOutInput').value = sequence.themeSongFadeOut;
    sequence.themeSongStartPosition = ambientSequenceEl(n, 'ThemeSongStartPositionSelect').value;
    sequence.themeSongStartMin = Math.max(0, Math.min(100, parseInt(ambientSequenceEl(n, 'ThemeSongStartMinInput').value, 10) || 0));
    sequence.themeSongStartMax = Math.max(0, Math.min(100, parseInt(ambientSequenceEl(n, 'ThemeSongStartMaxInput').value, 10) || 0));
    ambientSequenceEl(n, 'ThemeSongStartMinInput').value = sequence.themeSongStartMin;
    ambientSequenceEl(n, 'ThemeSongStartMaxInput').value = sequence.themeSongStartMax;
    sequence.themeSongDelayedStartFirstOnly = ambientSequenceEl(n, 'ThemeSongDelayedStartFirstOnlyToggle').checked;
    sequence.themeSongFadeFirstOnly = ambientSequenceEl(n, 'ThemeSongFadeFirstOnlyToggle').checked;
    sequence.replaceAudio = ambientSequenceEl(n, 'ReplaceAudioToggle').checked;
    sequence.replaceAudioOrder = ambientSequenceEl(n, 'ReplaceAudioOrderSelect').value;
    sequence.env = multiSelectState['AmbientSeq' + n + 'Env'].slice();
    sequence.fallback = ambientSequenceEl(n, 'FallbackSelect').value;
    sequence.frontArtEarlyFadeSeconds = Math.max(0, parseInt(ambientSequenceEl(n, 'FrontArtEarlyFadeInput').value, 10) || 0);
    ambientSequenceEl(n, 'FrontArtEarlyFadeInput').value = sequence.frontArtEarlyFadeSeconds;
    saveSetting('ambientProfile' + ambientEditingProfile + 'Sequences', JSON.stringify(ambientData[ambientEditingProfile].sequences));
  }
  // Which of the conditionally-relevant fields make sense for each
  // Poster Effect — see the long comments beside the matching fields in
  // ambientDefaultSequence() for WHY each is excluded where it is.
  // 'trailer'/'themevideo' both show everything; used as the fallback
  // shape for any effect not explicitly listed (defensive only — every
  // real effect value IS listed).
  const AMBIENT_EFFECT_FIELDS = {
    movie: { volume: true, playbackOrder: false, loop: true, movieStart: true, themeSongTrim: false, replaceAudio: true, replaceAudioOrderEver: false, fallback: true, allowCount: true, durationTypeSelectable: true },
    trailer: { volume: true, playbackOrder: true, loop: true, movieStart: false, themeSongTrim: false, replaceAudio: true, replaceAudioOrderEver: true, fallback: true, allowCount: true, durationTypeSelectable: true },
    themevideo: { volume: true, playbackOrder: true, loop: true, movieStart: false, themeSongTrim: false, replaceAudio: true, replaceAudioOrderEver: true, fallback: true, allowCount: true, durationTypeSelectable: true },
    themesong: { volume: true, playbackOrder: true, loop: true, movieStart: false, themeSongTrim: true, replaceAudio: false, replaceAudioOrderEver: false, fallback: true, allowCount: true, durationTypeSelectable: true },
    // durationTypeSelectable: false — Fanart Wall has no "playthrough" of
    // its own to count (see allowCount's own reasoning), which leaves
    // "Play For N Seconds" the only choice a Duration Type dropdown could
    // ever actually offer here. A dropdown with exactly one selectable
    // option isn't a real choice — it's hidden outright rather than
    // shown disabled-down-to-one-option, and Value's own meaning is
    // unambiguous once it's the only duration-related control left.
    fanartwall: { volume: false, playbackOrder: false, loop: false, movieStart: false, themeSongTrim: false, replaceAudio: false, replaceAudioOrderEver: false, fallback: false, allowCount: false, durationTypeSelectable: false },
  };
  // A hidden field is ALSO disabled (not just visually hidden) — the
  // keyboard/controller navigation only ever checks .disabled, never
  // CSS visibility, to decide what to skip (see updateAmbientSequenceVisibility's
  // own comment on this same point, one layer up at the whole-step level).
  function toggleAmbientField(el, visible) {
    if (!el) return;
    el.style.display = visible ? '' : 'none';
    el.disabled = !visible;
  }
  // Shows/hides/enables exactly the fields relevant to step n's
  // CURRENTLY selected Poster Effect — called whenever a step's own
  // Effect changes, whenever Movie Start Mode or Replace Audio change
  // (both of which reveal a further sub-field only when "on"), and once
  // whenever the step is freshly loaded into the UI. Deliberately does
  // NOT touch step-count-based (whole block) visibility — that's a
  // SEPARATE, outer layer handled by updateAmbientSequenceVisibility, which
  // calls this for every step it leaves visible.
  function updateAmbientSequenceFieldVisibility(n) {
    const effect = ambientSequenceEl(n, 'EffectSelect').value;
    const cfg = AMBIENT_EFFECT_FIELDS[effect] || AMBIENT_EFFECT_FIELDS.trailer;
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'DurationTypeLabel'), cfg.durationTypeSelectable);
    toggleAmbientField(ambientSequenceEl(n, 'DurationTypeSelect'), cfg.durationTypeSelectable);
    const countOpt = document.getElementById('ambientSequence' + n + 'DurationTypeCountOpt');
    if (countOpt) countOpt.disabled = !cfg.allowCount;
    // Fanart Wall has no "playthrough" of its own to count — force onto
    // 'time' the instant it's selected while 'count' was still chosen,
    // both in the visible dropdown and (via saveAmbientSequence, called
    // right after) in the persisted sequence itself. Also prefills the
    // Value field with time's own default (30) and refreshes the
    // "(default: N)" hint — exactly what DurationTypeSelect's own
    // 'change' listener already does for a genuine user-driven switch,
    // but THIS assignment is a silent, programmatic .value= set that
    // never fires a real 'change' event on its own, so that listener
    // never runs for it — without this, switching straight from Movie/
    // Trailer/etc to Fanart Wall left both the Value field and its hint
    // stuck on whatever 'count' mode had last shown (typically "1"),
    // even though the sequence was now genuinely running in 'time' mode
    // underneath. Moved to run FIRST in this function, before anything
    // below reads DurationTypeSelect's own value (loopUsable, next) —
    // it used to run at the very end, meaning every read further up
    // saw the STALE pre-forced value for this one pass; that happened
    // to never matter in practice (every effect with allowCount:false
    // also has loop:false, so loopUsable was false regardless of which
    // value it read) but was fragile, not actually correct, and would
    // have broken silently the moment a future effect combined
    // allowCount:false with loop:true.
    if (!cfg.allowCount && ambientSequenceEl(n, 'DurationTypeSelect').value === 'count') {
      ambientSequenceEl(n, 'DurationTypeSelect').value = 'time';
      ambientSequenceEl(n, 'DurationValueInput').value = ambientDefaultDurationValueFor('time');
      updateAmbientDurationValueHint(n);
      saveAmbientSequence(n);
    }
    // "Value" only makes sense as a label while the Duration Type
    // dropdown right above it is actually visible and offering a real
    // choice — once that's hidden (Fanart Wall, see durationTypeSelectable's
    // own comment), the field always means seconds and nothing else, so
    // it says so directly instead of the now-ambiguous generic "Value".
    // The trailing default-hint span (which shows "(default: N)",
    // already correctly tracking whichever mode is actually in effect —
    // see updateAmbientDurationValueHint) is preserved across the swap,
    // not replaced — only the leading text changes.
    const durationValueLabelEl = document.getElementById('ambientSequence' + n + 'DurationValueLabel');
    if (durationValueLabelEl) {
      const hintSpan = durationValueLabelEl.querySelector('.defaultHint');
      durationValueLabelEl.textContent = cfg.durationTypeSelectable ? 'Value ' : 'Duration (Seconds) ';
      if (hintSpan) durationValueLabelEl.appendChild(hintSpan);
    }
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'VolumeLabel'), cfg.volume);
    toggleAmbientField(ambientSequenceEl(n, 'VolumeSlider'), cfg.volume);
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'PlaybackOrderLabel'), cfg.playbackOrder);
    toggleAmbientField(ambientSequenceEl(n, 'PlaybackOrderSelect'), cfg.playbackOrder);
    // Loop is shown/hidden by effect relevance same as everything else
    // above — but even where it IS relevant, it only means anything
    // for a "Play For N Seconds" sequence (looping to fill the time);
    // "Play N Times" has nothing for it to loop within, so it's greyed
    // out (disabled but left VISIBLE, not hidden — a hidden control
    // gives no hint such an option even exists) rather than hidden
    // whenever durationType is 'count'. Reads DurationTypeSelect's value
    // AFTER the force-to-'time' block above has already run for this
    // same pass, so it's always the true, current value here now.
    const loopLabelEl = document.getElementById('ambientSequence' + n + 'LoopLabel');
    const loopToggleEl = ambientSequenceEl(n, 'LoopToggle');
    if (loopLabelEl) loopLabelEl.style.display = cfg.loop ? '' : 'none';
    const loopUsable = cfg.loop && ambientSequenceEl(n, 'DurationTypeSelect').value === 'time';
    loopToggleEl.disabled = !loopUsable;
    if (loopLabelEl) loopLabelEl.classList.toggle('disabled', cfg.loop && !loopUsable);
    const randomStart = cfg.movieStart && ambientSequenceEl(n, 'MovieStartModeSelect').value === 'random';
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'MovieStartLabel'), cfg.movieStart);
    toggleAmbientField(ambientSequenceEl(n, 'MovieStartModeSelect'), cfg.movieStart);
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'MovieStartMinLabel'), randomStart);
    toggleAmbientField(ambientSequenceEl(n, 'MovieStartMinInput'), randomStart);
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'MovieStartMaxLabel'), randomStart);
    toggleAmbientField(ambientSequenceEl(n, 'MovieStartMaxInput'), randomStart);
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'ThemeSongDelayedStartLabel'), cfg.themeSongTrim);
    toggleAmbientField(ambientSequenceEl(n, 'ThemeSongDelayedStartInput'), cfg.themeSongTrim);
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'ThemeSongEarlyEndLabel'), cfg.themeSongTrim);
    toggleAmbientField(ambientSequenceEl(n, 'ThemeSongEarlyEndInput'), cfg.themeSongTrim);
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'ThemeSongFadeInLabel'), cfg.themeSongTrim);
    toggleAmbientField(ambientSequenceEl(n, 'ThemeSongFadeInInput'), cfg.themeSongTrim);
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'ThemeSongFadeOutLabel'), cfg.themeSongTrim);
    toggleAmbientField(ambientSequenceEl(n, 'ThemeSongFadeOutInput'), cfg.themeSongTrim);
    // Start Position is visible under a WIDER condition than the other
    // four trim fields above — those only ever apply to the primary
    // 'themesong' effect (applyAmbientSequenceState only sets the trim
    // module variables inside its 'themesong' branch), so hiding them
    // for movie/trailer/themevideo correctly matches what the backend
    // actually does with them. Start Position is DIFFERENT: it's
    // applied UNCONDITIONALLY for every effect (see
    // applyAmbientSequenceState's own comment — one step value overrides
    // all three underlying Start Position settings regardless of effect,
    // so whichever of Replace Audio's several playback paths a movie/
    // trailer/themevideo step ends up using still picks it up). Gating
    // this field's visibility on cfg.themeSongTrim alone would hide the
    // one control needed to actually SET a non-default value for
    // exactly the case the backend already supports — a real UI/backend
    // mismatch, not just an unused control.
    const showStartPosition = cfg.themeSongTrim || (cfg.replaceAudio && ambientSequenceEl(n, 'ReplaceAudioToggle').checked);
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'ThemeSongStartPositionLabel'), showStartPosition);
    toggleAmbientField(ambientSequenceEl(n, 'ThemeSongStartPositionSelect'), showStartPosition);
    const themeSongRandomStart = showStartPosition && ambientSequenceEl(n, 'ThemeSongStartPositionSelect').value === 'random';
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'ThemeSongStartMinLabel'), themeSongRandomStart);
    toggleAmbientField(ambientSequenceEl(n, 'ThemeSongStartMinInput'), themeSongRandomStart);
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'ThemeSongStartMaxLabel'), themeSongRandomStart);
    toggleAmbientField(ambientSequenceEl(n, 'ThemeSongStartMaxInput'), themeSongRandomStart);
    // Visible under the same condition as Start Position above (part of
    // the same theme-song-audio cluster) — but additionally grayed out
    // unless MORE than one song could ever actually queue up. That's
    // ONLY possible for the primary 'themesong' effect itself (its own
    // Playback Order offers 'all'/'shuffled'); Ambient's Replace Audio
    // Order (used by movie/trailer/themevideo instead) only ever offers
    // 'first'/'random' — never more than one song — so these two stay
    // permanently grayed for every effect except 'themesong' itself.
    const canQueueMultipleThemeSongs = effect === 'themesong' && (ambientSequenceEl(n, 'PlaybackOrderSelect').value === 'all' || ambientSequenceEl(n, 'PlaybackOrderSelect').value === 'shuffled');
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'ThemeSongDelayedStartFirstOnlyLabel'), showStartPosition);
    const delayedStartFirstOnlyToggle = ambientSequenceEl(n, 'ThemeSongDelayedStartFirstOnlyToggle');
    delayedStartFirstOnlyToggle.style.display = showStartPosition ? '' : 'none';
    delayedStartFirstOnlyToggle.disabled = !(showStartPosition && canQueueMultipleThemeSongs);
    document.getElementById('ambientSequence' + n + 'ThemeSongDelayedStartFirstOnlyLabel').classList.toggle('disabled', showStartPosition && !canQueueMultipleThemeSongs);
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'ThemeSongFadeFirstOnlyLabel'), showStartPosition);
    const fadeFirstOnlyToggle = ambientSequenceEl(n, 'ThemeSongFadeFirstOnlyToggle');
    fadeFirstOnlyToggle.style.display = showStartPosition ? '' : 'none';
    fadeFirstOnlyToggle.disabled = !(showStartPosition && canQueueMultipleThemeSongs);
    document.getElementById('ambientSequence' + n + 'ThemeSongFadeFirstOnlyLabel').classList.toggle('disabled', showStartPosition && !canQueueMultipleThemeSongs);
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'ReplaceAudioLabel'), cfg.replaceAudio);
    toggleAmbientField(ambientSequenceEl(n, 'ReplaceAudioToggle'), cfg.replaceAudio);
    const showReplaceOrder = cfg.replaceAudioOrderEver && ambientSequenceEl(n, 'ReplaceAudioToggle').checked;
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'ReplaceAudioOrderLabel'), showReplaceOrder);
    toggleAmbientField(ambientSequenceEl(n, 'ReplaceAudioOrderSelect'), showReplaceOrder);
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'FallbackLabel'), cfg.fallback);
    toggleAmbientField(ambientSequenceEl(n, 'FallbackSelect'), cfg.fallback);
    // Gated by TWO things, not just one: whether this sequence's own
    // Environment Effects actually include 'screen' (unchanged from
    // when this field was first built), PLUS — added once 17.415 grayed
    // 'screen' out for movie/trailer/themevideo, since Front Art has no
    // way to be genuinely showing while a video effect already owns the
    // screen (confirmed: playMovieOnScreen/startTrailer/
    // playThemeVideoOnScreen never check envEnabled('screen') at all,
    // showNoTrailerDisplay is the only reader and only ever runs when
    // no video effect is active) — that this sequence's own Poster
    // Effect isn't itself one of those three. Without this second half,
    // switching a step's Effect to Movie while 'screen' was still
    // checked from an earlier, non-video Effect left this input visibly
    // editable despite being provably inert the runtime already treats
    // it as (scheduleFrontWallEarlyFadeForFinalThemeSongPlay's own
    // showsFrontArt check, and the time-based branch's identical one,
    // both already exclude these same three effects) — a real menu/
    // runtime mismatch, the same class of thing Start Position's own
    // comment elsewhere in this function warns against leaving open.
    // Still deliberately NOT gated on what the NEXT sequence resolves
    // to — see this field's own original reasoning, unchanged.
    const isVideoEffect = ['movie', 'trailer', 'themevideo'].includes(effect);
    const showFrontArtEarlyFade = !isVideoEffect && multiSelectState['AmbientSeq' + n + 'Env'].includes('screen');
    toggleAmbientField(document.getElementById('ambientSequence' + n + 'FrontArtEarlyFadeLabel'), showFrontArtEarlyFade);
    toggleAmbientField(ambientSequenceEl(n, 'FrontArtEarlyFadeInput'), showFrontArtEarlyFade);
    // Falling back to the very same Poster Effect that just failed makes
    // no sense (e.g. Theme Song's own fallback set to "Fallback to
    // Theme Song") — the list itself stays the same for every sequence
    // (so its shape/order never shifts around), but the ONE option that
    // matches this sequence's own current effect is greyed out, same
    // visible-but-inert treatment as Loop above. If that option happened
    // to be the one already selected, it's bumped to 'empty' — a
    // silently-stuck-on-a-now-invalid-choice fallback would otherwise
    // never surface as a problem until it's actually needed.
    const fallbackSelect = ambientSequenceEl(n, 'FallbackSelect');
    ['movie', 'trailer', 'themevideo', 'themesong', 'fanartwall'].forEach((val) => {
      const opt = fallbackSelect.querySelector('option[value="' + val + '"]');
      if (opt) opt.disabled = (val === effect);
    });
    if (fallbackSelect.value === effect) {
      fallbackSelect.value = 'empty';
      saveAmbientSequence(n);
    }
  }
  for (let n = 1; n <= AMBIENT_MAX_SEQUENCES; n++) {
    AMBIENT_SEQUENCE_FIELD_SUFFIXES.forEach((suffix) => {
      const el = ambientSequenceEl(n, suffix);
      el.addEventListener(suffix === 'VolumeSlider' ? 'input' : 'change', () => saveAmbientSequence(n));
    });
    // These three specifically can change which OTHER fields are even
    // relevant (a different Poster Effect, revealing/hiding the random-
    // start sub-fields, revealing/hiding the replacement-song sub-field)
    // — re-run the visibility pass right after each saves.
    ['EffectSelect', 'DurationTypeSelect', 'MovieStartModeSelect', 'PlaybackOrderSelect', 'ThemeSongStartPositionSelect', 'ReplaceAudioToggle'].forEach((suffix) => {
      ambientSequenceEl(n, suffix).addEventListener('change', () => updateAmbientSequenceFieldVisibility(n));
    });
    // Prefills the Value field with whichever mode's OWN sensible
    // default (1 for count, 30 for time — see ambientDefaultDurationValueFor's
    // own comment) the instant the mode itself changes, and updates the
    // "(default: N)" hint alongside it — both switch together, in
    // lockstep. Runs (and re-saves) AFTER the generic listener above
    // already saved the mode change on its own with the OLD value still
    // in place — this corrects that in a second pass rather than trying
    // to race ahead of it.
    ambientSequenceEl(n, 'DurationTypeSelect').addEventListener('change', () => {
      ambientSequenceEl(n, 'DurationValueInput').value = ambientDefaultDurationValueFor(ambientSequenceEl(n, 'DurationTypeSelect').value);
      updateAmbientDurationValueHint(n);
      saveAmbientSequence(n);
    });
  }
  // Only as many step blocks as ambientProfileNSequenceCount are actually
  // shown — CSS display for the visual hide, PLUS every field inside a
  // hidden block explicitly .disabled, since the keyboard/controller
  // navigation only ever checks .disabled (never CSS visibility) to
  // decide what to skip. Steps that DO stay visible additionally get
  // their per-effect field relevance re-applied (updateAmbientSequenceFieldVisibility) —
  // without this, switching PROFILES could leave a step showing (enabled
  // and navigable) fields that don't actually apply to whatever Poster
  // Effect THAT profile's step happens to be set to.
  function updateAmbientSequenceVisibility() {
    const count = ambientData[ambientEditingProfile].sequenceCount;
    for (let n = 1; n <= AMBIENT_MAX_SEQUENCES; n++) {
      const visible = n <= count;
      const block = document.getElementById('ambientSequenceBlock' + n);
      if (block) block.style.display = visible ? '' : 'none';
      if (visible) {
        AMBIENT_SEQUENCE_FIELD_SUFFIXES.forEach((suffix) => { ambientSequenceEl(n, suffix).disabled = false; });
        updateAmbientSequenceFieldVisibility(n);
      } else {
        AMBIENT_SEQUENCE_FIELD_SUFFIXES.forEach((suffix) => { ambientSequenceEl(n, suffix).disabled = true; });
      }
    }
  }
  // Same profile-independence principle as markAmbientSequenceCountDefault/
  // markAmbientSequenceEffectDefaults above — even though all three
  // profiles happen to share the same Loop default (false) today, a
  // static one-time hint here would silently stop being correct the
  // moment that ever changes for just one profile. Re-run on every
  // profile switch instead, exactly like the other two.
  function markAmbientProfileLoopDefault() {
    setBoolDefaultHint(document.getElementById('ambientProfileLoopDefaultHint'), MENU_CONFIG.menu.posters.ambientMode.profiles[ambientEditingProfile].loop.default);
  }
  ambientProfileSelect.addEventListener('change', () => {
    ambientEditingProfile = parseInt(ambientProfileSelect.value, 10);
    saveSetting('ambientActiveProfile', ambientEditingProfile);
    loadAmbientProfileIntoUI();
  });
  ambientProfileLoopToggle.addEventListener('change', () => {
    const p = ambientData[ambientEditingProfile];
    p.loop = ambientProfileLoopToggle.checked;
    saveSetting('ambientProfile' + ambientEditingProfile + 'Loop', p.loop);
  });
  ambientSequenceCountSelect.addEventListener('change', () => {
    const p = ambientData[ambientEditingProfile];
    p.sequenceCount = parseInt(ambientSequenceCountSelect.value, 10);
    saveSetting('ambientProfile' + ambientEditingProfile + 'SequenceCount', p.sequenceCount);
    updateAmbientSequenceVisibility();
  });
  loadAmbientProfileIntoUI();
  const roomDesignSelect = document.getElementById('roomDesignSelect');
  roomDesignSelect.value = ACTIVE_ROOM_DESIGN;
  markDefaultOption(roomDesignSelect, MENU_CONFIG.menu.room.design.roomDesign.default);
  // Live-applies immediately, entirely in place — no reload. Deliberately
  // NOT saved anywhere (no sessionStorage, unlike Room Size/Scale Mode
  // just below): every fresh launch always starts at the configured
  // default again, per explicit request.
  roomDesignSelect.addEventListener('change', () => { applyRoomTheme(roomDesignSelect.value); });
  const roomSizeSelect = document.getElementById('roomSizeSelect');
  const roomScaleModeSelect = document.getElementById('roomScaleModeSelect');
  const scaleMovementSpeedToggle = document.getElementById('scaleMovementSpeedToggle');
  const scalePlayerPositionToggle = document.getElementById('scalePlayerPositionToggle');
  roomSizeSelect.value = ACTIVE_ROOM_SIZE;
  roomScaleModeSelect.value = ACTIVE_SCALE_MODE;
  markDefaultOption(roomSizeSelect, MENU_CONFIG.menu.room.design.roomSize.default);
  markDefaultOption(roomScaleModeSelect, MENU_CONFIG.menu.room.design.roomScaleMode.default);
  setBoolDefaultHint(document.getElementById('scaleMovementSpeedDefaultHint'), MENU_CONFIG.menu.room.design.scaleMovementSpeed.default);
  setBoolDefaultHint(document.getElementById('scalePlayerPositionDefaultHint'), MENU_CONFIG.menu.room.design.scalePlayerPosition.default);
  let scaleMovementSpeedEnabled = ACTIVE_SCALE_MOVEMENT_SPEED;
  scaleMovementSpeedToggle.checked = scaleMovementSpeedEnabled;
  scaleMovementSpeedToggle.addEventListener('change', () => {
    scaleMovementSpeedEnabled = scaleMovementSpeedToggle.checked;
    sessionStorage.setItem('jfCinemaScaleMovementSpeed', String(scaleMovementSpeedEnabled));
  });
  let scalePlayerPositionEnabled = ACTIVE_SCALE_PLAYER_POSITION;
  scalePlayerPositionToggle.checked = scalePlayerPositionEnabled;
  scalePlayerPositionToggle.addEventListener('change', () => {
    scalePlayerPositionEnabled = scalePlayerPositionToggle.checked;
    sessionStorage.setItem('jfCinemaScalePlayerPosition', String(scalePlayerPositionEnabled));
  });
  function updateRoomSizeMenuState() {
    const scaleModeEnabled = roomSizeSelect.value !== '10';
    roomScaleModeSelect.disabled = !scaleModeEnabled;
    document.getElementById('roomScaleModeLabel').classList.toggle('disabled', !scaleModeEnabled);
    const speedScaleEnabled = scaleModeEnabled && roomScaleModeSelect.value === 'full';
    scaleMovementSpeedToggle.disabled = !speedScaleEnabled;
    document.getElementById('scaleMovementSpeedLabel').classList.toggle('disabled', !speedScaleEnabled);
    scalePlayerPositionToggle.disabled = !speedScaleEnabled;
    document.getElementById('scalePlayerPositionLabel').classList.toggle('disabled', !speedScaleEnabled);
  }
  updateRoomSizeMenuState();
  // Room size (and scale mode) now resize LIVE — no more reload. Changing
  // either persists to sessionStorage (so a real page reload later still
  // starts at the last choice, same as before) and immediately starts the
  // same chained shell+poster resize animation the test control used to
  // trigger, just wired to the real setting instead of a separate one.
  let lastAppliedScaleMode = ACTIVE_SCALE_MODE; // tracks the LIVE, currently-in-effect mode — not the page-load default, so a locked-out revert restores the right value even after earlier successful changes
  roomSizeSelect.addEventListener('change', () => {
    const requested = roomSizeSelect.value;
    if (!startRoomResizeAnimation(requested)) {
      // Locked (a resize is already running) — revert the dropdown back
      // to whatever size is actually still active, so it never silently
      // shows a change that didn't really happen.
      roomSizeSelect.value = currentRoomSizeKey();
      updateRoomSizeMenuState();
      return;
    }
    updateRoomSizeMenuState();
    sessionStorage.setItem('jfCinemaRoomSize', requested);
  });
  roomScaleModeSelect.addEventListener('change', () => {
    const requested = roomScaleModeSelect.value;
    if (!startRoomResizeAnimation(roomSizeSelect.value)) {
      roomScaleModeSelect.value = lastAppliedScaleMode; // revert to the last LIVE value, not the page-load default
      updateRoomSizeMenuState();
      return;
    }
    lastAppliedScaleMode = requested;
    updateRoomSizeMenuState();
    sessionStorage.setItem('jfCinemaRoomScaleMode', requested);
  });
  function updateBackdropMenuState() {
    const enabled = backdropLayoutSelect.value !== 'off';
    backdropModeSelect.disabled = !enabled;
    document.getElementById('backdropModeLabel').classList.toggle('disabled', !enabled);
    const shuffleOn = enabled && backdropModeSelect.value === 'shuffle';
    backdropSecondsInput.disabled = !shuffleOn;
    document.getElementById('backdropSecondsLabel').classList.toggle('disabled', !shuffleOn);
    document.getElementById('backdropVideosEnabledToggle').disabled = !shuffleOn;
    document.getElementById('backdropVideosEnabledLabel').classList.toggle('disabled', !shuffleOn);
    // Every video-specific setting below (Overscan mode through the
    // per-type tile counts and their own order/start/random-range
    // sub-fields) is additionally gated on the master switch — greyed
    // out in full the instant it's off, on top of (not instead of) the
    // existing shuffleOn gate they already had.
    const videosOn = shuffleOn && backdropVideosEnabled;
    document.getElementById('backdropOverscanModeSelect').disabled = !videosOn;
    document.getElementById('backdropOverscanLabel').classList.toggle('disabled', !videosOn);
    document.getElementById('backdropBalanceToggle').disabled = !videosOn;
    document.getElementById('backdropTrailerTilesSelect').disabled = !videosOn;
    document.getElementById('backdropTrailerTilesLabel').classList.toggle('disabled', !videosOn);
    document.getElementById('backdropThemeVideoTilesSelect').disabled = !videosOn;
    document.getElementById('backdropThemeVideoTilesLabel').classList.toggle('disabled', !videosOn);
    document.getElementById('backdropMovieTilesSelect').disabled = !videosOn;
    document.getElementById('backdropMovieTilesLabel').classList.toggle('disabled', !videosOn);
    const trailerOn = videosOn && +backdropTrailerTiles > 0;
    document.getElementById('backdropTrailerOrderSelect').disabled = !trailerOn;
    document.getElementById('backdropTrailerOrderLabel').classList.toggle('disabled', !trailerOn);
    document.getElementById('backdropTrailerStartSelect').disabled = !trailerOn;
    document.getElementById('backdropTrailerStartLabel').classList.toggle('disabled', !trailerOn);
    const themeVideoOn = videosOn && +backdropThemeVideoTiles > 0;
    document.getElementById('backdropThemeVideoOrderSelect').disabled = !themeVideoOn;
    document.getElementById('backdropThemeVideoOrderLabel').classList.toggle('disabled', !themeVideoOn);
    document.getElementById('backdropThemeVideoStartSelect').disabled = !themeVideoOn;
    document.getElementById('backdropThemeVideoStartLabel').classList.toggle('disabled', !themeVideoOn);
    const movieOn = videosOn && +backdropMovieTiles > 0;
    backdropMovieMinInput.disabled = !movieOn;
    document.getElementById('backdropMovieMinLabel').classList.toggle('disabled', !movieOn);
    backdropMovieMaxInput.disabled = !movieOn;
    document.getElementById('backdropMovieMaxLabel').classList.toggle('disabled', !movieOn);
  }
  backdropLayoutSelect.addEventListener('change', () => {
    updateBackdropMenuState();
    saveSetting('backdropLayout', backdropLayoutSelect.value);
    if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem);
  });
  backdropModeSelect.addEventListener('change', () => {
    updateBackdropMenuState();
    saveSetting('backdropMode', backdropModeSelect.value);
    // Full rebuild (like every other backdrop setting handler) instead of
    // restarting the shuffle with the raw dedupe cache: that cache holds
    // image indices only — no 'v:' video sentinels — so restarting from it
    // silently dropped all videos from the rotation, and for movies whose
    // cache was never populated (single-backdrop items) the pool was
    // undefined and the rotation stopped entirely.
    if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem);
  });
  backdropSecondsInput.addEventListener('change', () => {
    saveSetting('backdropShuffleSeconds', backdropSecondsInput.value);
    if (trailerActive && currentFullItem) buildBackdropMosaic(currentFullItem);
  });
  updateBackdropMenuState();
  const crouchEnableToggle = document.getElementById('crouchEnableToggle');
  const crouchModeSelect = document.getElementById('crouchModeSelect');
  crouchEnableToggle.checked = crouchEnabled;
  crouchModeSelect.value = crouchMode;
  setBoolDefaultHint(document.getElementById('crouchEnableDefaultHint'), MENU_CONFIG.menu.controls.crouchEnabled.default);
  markDefaultOption(crouchModeSelect, MENU_CONFIG.menu.controls.crouchMode.default);
  function updateCrouchMenuState() {
    crouchModeSelect.disabled = !crouchEnableToggle.checked;
    document.getElementById('crouchModeLabel').classList.toggle('disabled', !crouchEnableToggle.checked);
  }
  crouchEnableToggle.addEventListener('change', () => {
    crouchEnabled = crouchEnableToggle.checked;
    if (!crouchEnabled) { keyboardCrouch = false; gamepadCrouch = false; toggleCrouchActive = false; }
    updateCrouchMenuState();
    saveSetting('crouchEnabled', crouchEnabled);
  });
  crouchModeSelect.addEventListener('change', () => {
    crouchMode = crouchModeSelect.value;
    keyboardCrouch = false; gamepadCrouch = false; toggleCrouchActive = false;
    saveSetting('crouchMode', crouchMode);
  });
  updateCrouchMenuState();
  const cinemaKeyboardEnabledToggle = document.getElementById('cinemaKeyboardEnabledToggle');
  const cinemaKeyboardColorInput = document.getElementById('cinemaKeyboardColorInput');
  const cinemaKeyboardPositionSelect = document.getElementById('cinemaKeyboardPositionSelect');
  const cinemaKeyboardIdleInput = document.getElementById('cinemaKeyboardIdleInput');
  cinemaKeyboardEnabledToggle.checked = cinemaKeyboardEnabled;
  cinemaKeyboardColorInput.value = cinemaKeyboardColor;
  cinemaKeyboardPositionSelect.value = cinemaKeyboardPosition;
  cinemaKeyboardIdleInput.value = cinemaKeyboardIdleSeconds;
  setBoolDefaultHint(document.getElementById('cinemaKeyboardEnabledDefaultHint'), MENU_CONFIG.menu.controls.cinemaKeyboardEnabled.default);
  document.getElementById('cinemaKeyboardColorDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.controls.cinemaKeyboardColor.default + ')';
  document.getElementById('cinemaKeyboardIdleDefaultHint').textContent = '(default: ' + MENU_CONFIG.menu.controls.cinemaKeyboardIdleSeconds.default + ')';
  markDefaultOption(cinemaKeyboardPositionSelect, MENU_CONFIG.menu.controls.cinemaKeyboardPosition.default);
  cinemaKeyboardEnabledToggle.addEventListener('change', () => {
    cinemaKeyboardEnabled = cinemaKeyboardEnabledToggle.checked;
    // Defensive only — in practice unreachable, since this checkbox
    // lives inside the Options menu, which already requires releasing
    // pointer lock to open, and our console requires the OPPOSITE
    // (isLocked) to activate in the first place. The two states can
    // never coexist, but this costs nothing to keep as a safety net.
    if (!cinemaKeyboardEnabled && cinemaConsoleActive) deactivateCinemaConsole();
    saveSetting('cinemaKeyboardEnabled', cinemaKeyboardEnabled);
  });
  cinemaKeyboardColorInput.addEventListener('change', () => {
    cinemaKeyboardColor = cinemaKeyboardColorInput.value.trim() || MENU_CONFIG.menu.controls.cinemaKeyboardColor.default;
    saveSetting('cinemaKeyboardColor', cinemaKeyboardColor);
  });
  cinemaKeyboardPositionSelect.addEventListener('change', () => {
    cinemaKeyboardPosition = cinemaKeyboardPositionSelect.value;
    saveSetting('cinemaKeyboardPosition', cinemaKeyboardPosition);
  });
  cinemaKeyboardIdleInput.addEventListener('change', () => {
    cinemaKeyboardIdleSeconds = parseFloat(cinemaKeyboardIdleInput.value) || MENU_CONFIG.menu.controls.cinemaKeyboardIdleSeconds.default;
    saveSetting('cinemaKeyboardIdleSeconds', cinemaKeyboardIdleSeconds);
  });
  const gpAxes = { x: 0, y: 0 };
  let inputMode = 'kbm';
  function setInputMode(mode) {
    if (inputMode === mode) return;
    inputMode = mode;
    if (isLocked || panelEl.style.display !== 'block') instructionsEl.innerHTML = baseInstructions();
  }
  function svgButton(letter, color) {
    return '<svg width="16" height="16" viewBox="0 0 16 16" style="vertical-align:-3px;margin:0 2px;"><circle cx="8" cy="8" r="7" fill="' + color + '" stroke="#00000055" stroke-width="1"/><text x="8" y="11.5" font-size="9" font-family="Arial,sans-serif" font-weight="bold" text-anchor="middle" fill="#fff">' + letter + '</text></svg>';
  }
  function svgKey(label) {
    const w = 14 + label.length * 6;
    return '<svg width="' + w + '" height="16" viewBox="0 0 ' + w + ' 16" style="vertical-align:-3px;margin:0 2px;"><rect x="0.5" y="0.5" width="' + (w - 1) + '" height="15" rx="3" fill="#2a1a12" stroke="#c9974a" stroke-width="1"/><text x="' + (w / 2) + '" y="11" font-size="8.5" font-family="Arial,sans-serif" text-anchor="middle" fill="#f0e2c8">' + label + '</text></svg>';
  }
  function svgKeySmall(label) {
    const w = 7 + label.length * 4;
    return '<svg width="' + w + '" height="10.5" viewBox="0 0 ' + w + ' 10.5" style="vertical-align:-1.5px;margin:0 1px;display:inline-block;"><rect x="0.5" y="0.5" width="' + (w - 1) + '" height="9.5" rx="2.2" fill="#2a1a12" stroke="#c9974a" stroke-width="0.75"/><text x="' + (w / 2) + '" y="7.5" font-size="5.5" font-family="Arial,sans-serif" text-anchor="middle" fill="#f0e2c8">' + label + '</text></svg>';
  }
  function svgMouse(side) {
    const leftFill = side === 'left' ? '#d8a84e' : '#3a2a1c';
    const rightFill = side === 'right' ? '#d8a84e' : '#3a2a1c';
    return '<svg width="14" height="18" viewBox="0 0 14 18" style="vertical-align:-4px;margin:0 2px;">'
      + '<path d="M7 1 C3 1 1 3.5 1 7 V12 C1 15.5 3.5 17 7 17 C10.5 17 13 15.5 13 12 V7 C13 3.5 10.5 1 7 1 Z" fill="#2a1a12" stroke="#c9974a" stroke-width="1"/>'
      + '<path d="M7 1.4 V7.3 H1.3 C1.6 3.9 3.7 1.4 7 1.4 Z" fill="' + leftFill + '"/>'
      + '<path d="M7 1.4 V7.3 H12.7 C12.4 3.9 10.3 1.4 7 1.4 Z" fill="' + rightFill + '"/>'
      + '</svg>';
  }
  function svgStick() {
    return '<svg width="16" height="16" viewBox="0 0 16 16" style="vertical-align:-3px;margin:0 2px;"><circle cx="8" cy="8" r="7" fill="#2a1a12" stroke="#c9974a" stroke-width="1"/><circle cx="8" cy="8" r="3.5" fill="#c9974a"/></svg>';
  }
  const GP_A = svgButton('A', '#3fae4c');
  const GP_B = svgButton('B', '#d9433c');
  const GP_X = svgButton('X', '#2d6fc4');
  const GP_LB = svgButton('LB', '#8a6d3b');
  const GP_RB = svgButton('RB', '#8a6d3b');
  const GP_Y = svgButton('Y', '#d8a84e');
  const KB_ARROWS = svgKey('↑') + svgKey('←') + svgKey('↓') + svgKey('→');
  const MENU_NAV_INDICATOR = '<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:0;gap:1px;">'
    + '<span style="line-height:0;">' + svgKeySmall('W') + svgKeySmall('A') + svgKeySmall('S') + svgKeySmall('D') + '</span>'
    + '<span style="line-height:0;">' + svgKeySmall('↑') + svgKeySmall('←') + svgKeySmall('↓') + svgKeySmall('→') + '</span>'
    + '</span>';
  const GP_STICK_L = svgStick();
  const GP_L3 = '<svg width="16" height="16" viewBox="0 0 16 16" style="vertical-align:-3px;margin:0 2px;"><circle cx="8" cy="8" r="7" fill="#2a1a12" stroke="#c9974a" stroke-width="1"/><circle cx="8" cy="8" r="3.2" fill="#c9974a"/><text x="8" y="10.6" font-size="5" font-family="Arial,sans-serif" font-weight="bold" text-anchor="middle" fill="#2a1a12">L</text><path d="M8 1.6 L6.6 3.4 L9.4 3.4 Z" fill="#f0e2c8"/><path d="M8 14.4 L6.6 12.6 L9.4 12.6 Z" fill="#f0e2c8"/><path d="M1.6 8 L3.4 6.6 L3.4 9.4 Z" fill="#f0e2c8"/><path d="M14.4 8 L12.6 6.6 L12.6 9.4 Z" fill="#f0e2c8"/></svg>';
  // "Clicked stick" glyph (same 4-direction click-triangle motif as
  // L3), now with an L/R letter in the center hub — the plain circle
  // used before this was too easy to confuse between the two, since
  // nothing else distinguished which stick was meant.
  const GP_R3 = '<svg width="16" height="16" viewBox="0 0 16 16" style="vertical-align:-3px;margin:0 2px;"><circle cx="8" cy="8" r="7" fill="#2a1a12" stroke="#c9974a" stroke-width="1"/><circle cx="8" cy="8" r="3.2" fill="#c9974a"/><text x="8" y="10.6" font-size="5" font-family="Arial,sans-serif" font-weight="bold" text-anchor="middle" fill="#2a1a12">R</text><path d="M8 1.6 L6.6 3.4 L9.4 3.4 Z" fill="#f0e2c8"/><path d="M8 14.4 L6.6 12.6 L9.4 12.6 Z" fill="#f0e2c8"/><path d="M1.6 8 L3.4 6.6 L3.4 9.4 Z" fill="#f0e2c8"/><path d="M14.4 8 L12.6 6.6 L12.6 9.4 Z" fill="#f0e2c8"/></svg>';
  const GP_DPAD = '<svg width="16" height="16" viewBox="0 0 16 16" style="vertical-align:-3px;margin:0 2px;"><rect x="6" y="1" width="4" height="14" rx="1" fill="#c9974a"/><rect x="1" y="6" width="14" height="4" rx="1" fill="#c9974a"/></svg>';
  // Same full cross as GP_DPAD, but only one axis lit — the OTHER axis
  // stays as a dim outline purely for context ("this is the D-Pad"),
  // not implying it also does something here. Room Size and Poster Page
  // switching each only use one axis of the same physical pad, and the
  // full, both-axes-bright GP_DPAD would wrongly suggest all four
  // directions are relevant to either.
  const GP_DPAD_LR = '<svg width="16" height="16" viewBox="0 0 16 16" style="vertical-align:-3px;margin:0 2px;"><rect x="6" y="1" width="4" height="14" rx="1" fill="#5a4126"/><rect x="1" y="6" width="14" height="4" rx="1" fill="#c9974a"/></svg>';
  const GP_DPAD_UD = '<svg width="16" height="16" viewBox="0 0 16 16" style="vertical-align:-3px;margin:0 2px;"><rect x="6" y="1" width="4" height="14" rx="1" fill="#c9974a"/><rect x="1" y="6" width="14" height="4" rx="1" fill="#5a4126"/></svg>';
  // A simple mouse-wheel glyph, matching svgMouse's own outline style —
  // a plain circle inside the body indicates the wheel itself, no
  // attempt to depict scroll direction (the label text carries that).
  const MOUSE_WHEEL_ICON = '<svg width="14" height="18" viewBox="0 0 14 18" style="vertical-align:-4px;margin:0 2px;"><path d="M7 1 C3 1 1 3.5 1 7 V12 C1 15.5 3.5 17 7 17 C10.5 17 13 15.5 13 12 V7 C13 3.5 10.5 1 7 1 Z" fill="#2a1a12" stroke="#c9974a" stroke-width="1"/><rect x="5.5" y="5" width="3" height="5" rx="1.5" fill="#c9974a"/></svg>';
  const GP_MENU = '<svg width="16" height="16" viewBox="0 0 16 16" style="vertical-align:-3px;margin:0 2px;"><circle cx="8" cy="8" r="7" fill="#2a1a12" stroke="#c9974a" stroke-width="1"/><rect x="4" y="5" width="8" height="1.4" rx="0.7" fill="#f0e2c8"/><rect x="4" y="7.3" width="8" height="1.4" rx="0.7" fill="#f0e2c8"/><rect x="4" y="9.6" width="8" height="1.4" rx="0.7" fill="#f0e2c8"/></svg>';
  const GP_VIEW = '<svg width="16" height="16" viewBox="0 0 16 16" style="vertical-align:-3px;margin:0 2px;"><circle cx="8" cy="8" r="7" fill="#2a1a12" stroke="#c9974a" stroke-width="1"/><rect x="4.5" y="4.5" width="5" height="5" rx="0.8" fill="none" stroke="#f0e2c8" stroke-width="1.2"/><rect x="7" y="7" width="5" height="5" rx="0.8" fill="#2a1a12" stroke="#f0e2c8" stroke-width="1.2"/></svg>';
  function baseInstructions() {
    if (cinemaConsoleActive) {
      // Keyboard-only by design — the gamepad's own primary-action button
      // never reaches this state to begin with (see primaryAction's own
      // fallthrough branch), so no gamepad phrasing is needed here.
      return svgKey('Enter') + ' confirm · ' + svgKey('Backspace') + ' delete';
    }
    if (contextMenuOpen) {
      return inputMode === 'gamepad'
        ? GP_A + ' select · ' + GP_B + ' cancel'
        : svgKey('E') + ' / ' + svgKey('Enter') + ' / ' + svgMouse('left') + ' select · ' + svgMouse('right') + ' cancel';
    }
    if (panelEl.style.display === 'block' || menuOverlayEl.style.display === 'flex') {
      const isTabbedMenu = menuOverlayEl.style.display === 'flex';
      if (inputMode === 'gamepad') {
        return GP_DPAD + ' ' + GP_STICK_L + ' navigate · ' + (isTabbedMenu ? GP_DPAD_LR + ' ' + GP_STICK_L + ' ' + GP_LB + ' ' + GP_RB + ' navigate tabs · ' : '') + GP_A + ' select · ' + GP_B + ' back';
      }
      return MENU_NAV_INDICATOR + (isTabbedMenu ? ' navigate page/tabs · ' : ' navigate · ') + svgKey('E') + ' / ' + svgKey('Enter') + ' / ' + svgMouse('left') + ' select · ' + svgMouse('right') + ' back';
    }
    if (controlsOverlayEl.style.display === 'block') {
      return inputMode === 'gamepad'
        ? GP_B + ' back'
        : svgMouse('right') + ' back';
    }
    const stopLabelText = ambientRunning ? 'Stop Ambient Mode'
      : activeEnvState === 'EnvMovie' ? 'Stop Movie'
      : activeEnvState === 'EnvTrailer' ? 'Stop Trailer'
      : activeEnvState === 'EnvThemeVideo' ? 'Stop Theme Video'
      : activeEnvState === 'EnvThemeSong' ? 'Stop Theme Song'
      : activeEnvState === 'EnvFanartWall' ? 'Stop Fanart Wall'
      : 'Stop Playback';
    const anyPlaybackActive = ambientRunning || trailerActive || (themeSongAudio && !themeSongAudio.paused);
    let controls;
    if (inputMode === 'gamepad') {
      const parts = [svgStick() + ' move', svgStick() + ' look'];
      if (!autoSprint) parts.push(GP_L3 + ' sprint');
      if (hoveredInteractable) {
        parts.push(GP_A + ' menu');
        if (crouchEnabled) parts.push(GP_B + ' crouch');
      } else {
        if (jumpEnabled) parts.push(GP_A + ' jump');
        if (crouchEnabled) parts.push(GP_B + ' crouch');
      }
      if (anyPlaybackActive) parts.push(GP_Y + ' ' + stopLabelText.replace(/ /g, '&nbsp;'));
      controls = parts.join(' · ');
    } else {
      const parts = [svgKey('W') + svgKey('A') + svgKey('S') + svgKey('D') + ' move'];
      if (!autoSprint) parts.push(svgKey('Shift') + ' sprint');
      if (crouchEnabled) parts.push(svgKey('Ctrl') + ' crouch');
      if (jumpEnabled) parts.push(svgKey('Space') + ' jump');
      parts.push(svgMouse('left') + ' menu');
      if (anyPlaybackActive) parts.push(svgKey('Backspace') + ' ' + stopLabelText.replace(/ /g, '&nbsp;'));
      controls = parts.join(' · ');
    }
    const shortcuts = inputMode === 'gamepad'
      ? GP_VIEW + ' Controls · ' + GP_MENU + ' Menu · ' + GP_X + ' Kiosk'
      : svgKey('C') + ' Controls · ' + svgKey('M') + ' Menu · ' + svgKey('K') + ' Kiosk';
    return shortcuts + ' · ' + controls;
  }
  function primaryLabel() {
    return inputMode === 'gamepad' ? GP_A : svgMouse('left');
  }
  function stopLabel() {
    return inputMode === 'gamepad' ? GP_B : svgKey('Backspace');
  }
  document.addEventListener('mousemove', () => setInputMode('kbm'));
  document.addEventListener('mousedown', () => setInputMode('kbm'));
  document.addEventListener('keydown', (e) => {
    if (e.code.indexOf('Key') === 0 || e.code === 'Space' || e.code.indexOf('Arrow') === 0 || e.code.indexOf('Shift') === 0) setInputMode('kbm');
  });
  let gpSprint = false;
  let gpConnected = false;
  const gpPrevButtons = {};
  function pollGamepad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    if (selectedGamepadId) {
      for (let i = 0; i < pads.length; i++) {
        if (pads[i] && pads[i].id === selectedGamepadId && pads[i].buttons.length > 0) { gp = pads[i]; break; }
      }
    }
    if (!gp) {
      for (let i = 0; i < pads.length; i++) {
        if (pads[i] && pads[i].buttons.length > 0 && pads[i].mapping === 'standard') { gp = pads[i]; break; }
      }
    }
    if (!gp) {
      for (let i = 0; i < pads.length; i++) {
        if (pads[i] && pads[i].buttons.length > 0) { gp = pads[i]; break; }
      }
    }
    gpAxes.x = 0; gpAxes.y = 0;
    gpConnected = !!gp;
    if (!gp) return;
    const lx = Math.abs(gp.axes[0]) > GAMEPAD_DEADZONE ? gp.axes[0] : 0;
    const ly = Math.abs(gp.axes[1]) > GAMEPAD_DEADZONE ? gp.axes[1] : 0;
    const rx = Math.abs(gp.axes[2]) > GAMEPAD_DEADZONE ? gp.axes[2] : 0;
    const ry = Math.abs(gp.axes[3]) > GAMEPAD_DEADZONE ? gp.axes[3] : 0;
    gpAxes.x = lx; gpAxes.y = ly;
    const anyButtonPressed = gp.buttons.some((b) => b && b.pressed);
    if (lx || ly || rx || ry || anyButtonPressed) setInputMode('gamepad');
    if (confirmDialogEl.style.display === 'block') {
      const aNow = gp.buttons[0] && gp.buttons[0].pressed;
      if (aNow && !gpPrevButtons[0]) { const action = confirmDialogAction; hideConfirmDialog(); if (action) action(); }
      gpPrevButtons[0] = aNow;
      const bNow = gp.buttons[1] && gp.buttons[1].pressed;
      if (bNow && !gpPrevButtons[1]) { hideConfirmDialog(); }
      gpPrevButtons[1] = bNow;
      return;
    }
    if (panelEl.style.display === 'block') {
      handleOverlayGamepad(panelRows, closePanel, gp, ly);
      return;
    }
    if (menuOverlayEl.style.display === 'flex') {
      const btnM = (i) => gp.buttons[i] && gp.buttons[i].pressed;
      const viewNow = btnM(8);
      if (viewNow && !gpPrevButtons[8]) {
        gpPrevButtons[8] = viewNow;
        toggleControlsOverlay();
        return;
      }
      gpPrevButtons[8] = viewNow;
      const menuNow = btnM(9);
      if (menuNow && !gpPrevButtons[9]) {
        gpPrevButtons[9] = menuNow;
        closeMenuOverlay();
        return;
      }
      gpPrevButtons[9] = menuNow;
      handleOverlayGamepad(menuRows, closeMenuOverlay, gp, ly);
      return;
    }
    if (controlsOverlayEl.style.display === 'block') {
      const btnC = (i) => gp.buttons[i] && gp.buttons[i].pressed;
      const closeNow = btnC(1) || btnC(8);
      if (closeNow && !gpPrevButtons.ctrlClose) {
        controlsOverlayEl.style.display = 'none';
        if (btnC(1)) suppressGamepadCrouch = true;
        instructionsEl.innerHTML = baseInstructions();
      }
      gpPrevButtons.ctrlClose = closeNow;
      const menuNow = btnC(9);
      if (menuNow && !gpPrevButtons[9]) {
        gpPrevButtons[9] = menuNow;
        toggleMenuOverlay();
        return;
      }
      gpPrevButtons[9] = menuNow;
      return;
    }
    const btn = (i) => gp.buttons[i] && gp.buttons[i].pressed;
    if (controllerMovementEnabled) {
      camera.rotation.y -= rx * MAX_LOOK_SPEED * lookSensitivityMultiplier * dt;
      camera.rotation.x -= ry * MAX_LOOK_SPEED * lookSensitivityMultiplier * dt;
      camera.rotation.x = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, camera.rotation.x));
      gpSprint = btn(10);
      const aNow = btn(0);
      if (aNow && !gpPrevButtons[0]) {
        if (contextMenuOpen || raycastTarget() || kioskZoneInteractable()) primaryAction(false);
        else if (jumpEnabled && isGrounded) { verticalVelocity = JUMP_SPEED; isGrounded = false; }
      }
      gpPrevButtons[0] = aNow;
      const bHeldNow = btn(1);
      if (contextMenuOpen) {
        if (bHeldNow && !gpPrevButtons.crouchB) { suppressGamepadCrouch = true; secondaryAction(); }
        gpPrevButtons.crouchB = bHeldNow;
        gamepadCrouch = false;
      } else if (suppressGamepadCrouch) {
        if (!bHeldNow) suppressGamepadCrouch = false;
        gamepadCrouch = false;
        gpPrevButtons.crouchB = bHeldNow;
      } else if (crouchMode === 'toggle') {
        if (bHeldNow && !gpPrevButtons.crouchB) toggleCrouchActive = !toggleCrouchActive;
        gpPrevButtons.crouchB = bHeldNow;
      } else {
        gamepadCrouch = bHeldNow;
      }
      const yNow = btn(3);
      if (yNow && !gpPrevButtons[3]) {
        // Same reasoning as Backspace's own fix above — Ambient Mode's
        // own background timer chain needs stopAmbientMode() itself,
        // not just stopAllPlayback().
        stopAmbientMode();
        stopAllPlayback();
      }
      gpPrevButtons[3] = yNow;
      // D-Pad up/down — step room size (moved off LB/RB, which is now
      // free). D-Pad left/right — step Poster Page. Free here for the
      // same reason LB/RB was: this whole block only runs when the
      // Options menu is NOT open (that branch returns early further up
      // and handles D-Pad itself, for field/row navigation, via
      // handleOverlayGamepad) — no possibility of the two meanings
      // colliding in the same frame.
      const dpadUpNow = btn(12), dpadDownNow = btn(13), dpadLeftNow = btn(14), dpadRightNow = btn(15);
      if (dpadUpNow && !gpPrevButtons[12]) stepRoomSize(1);
      if (dpadDownNow && !gpPrevButtons[13]) stepRoomSize(-1);
      if (dpadLeftNow && !gpPrevButtons[14]) stepPosterPage(-1);
      if (dpadRightNow && !gpPrevButtons[15]) stepPosterPage(1);
      gpPrevButtons[12] = dpadUpNow;
      gpPrevButtons[13] = dpadDownNow;
      gpPrevButtons[14] = dpadLeftNow;
      gpPrevButtons[15] = dpadRightNow;
      // X — same action as the K keyboard shortcut.
      const xNow = btn(2);
      if (xNow && !gpPrevButtons[2]) openPanel();
      gpPrevButtons[2] = xNow;
      // R3 (right stick click) — same action as the F keyboard shortcut.
      const r3Now = btn(11);
      if (r3Now && !gpPrevButtons[11]) {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
      gpPrevButtons[11] = r3Now;
    } else {
      gamepadCrouch = false;
    }
    const menuBtnNow = btn(9);
    if (menuBtnNow && !gpPrevButtons[9]) toggleMenuOverlay();
    gpPrevButtons[9] = menuBtnNow;
    const viewBtnNow = btn(8);
    if (viewBtnNow && !gpPrevButtons[8]) toggleControlsOverlay();
    gpPrevButtons[8] = viewBtnNow;
  }
  function navMoveFocus(rows, dir, isFreshPress) {
    // Tab-aware: only rows of the active tab (plus global buttons) count;
    // edges are the first/last selectable row of that subset, so the
    // boundary lock keeps working per tab. Panel rows are unaffected
    // (menuRowInActiveTab returns true for ids without a tab mapping).
    let first = -1, last = -1;
    for (let i = 0; i < rows.length; i++) {
      if (menuRowInActiveTab(rows[i])) { if (first < 0) first = i; last = i; }
    }
    if (first < 0) return null;
    const wantEdge = dir < 0 ? 'start' : 'end';
    const currentlyAtWantedEdge = (dir < 0 && navFocusIndex === first) || (dir > 0 && navFocusIndex === last);
    if (currentlyAtWantedEdge) {
      if (navBoundaryLock === wantEdge && isFreshPress) {
        navBoundaryLock = null;
      } else {
        navBoundaryLock = wantEdge;
        return wantEdge;
      }
    } else {
      navBoundaryLock = null;
    }
    let idx = navFocusIndex;
    for (let i = 0; i < rows.length; i++) {
      idx = (idx + dir + rows.length) % rows.length;
      if (menuRowInActiveTab(rows[idx]) && !isRowDisabled(rows[idx])) break;
    }
    navFocusIndex = idx;
    navButtonRowFocus = rows[navFocusIndex].defaultSub || 0;
    if (idx === first) return 'start';
    if (idx === last) return 'end';
    return null;
  }
  const navRepeatState = {};
  function navRepeat(key, active, fn) {
    const st = navRepeatState[key] || (navRepeatState[key] = { held: false, next: 0, startTime: 0 });
    if (!active) { st.held = false; return; }
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (!st.held) {
      st.held = true;
      st.startTime = now;
      st.next = now + 380;
      fn(true, 0);
      return;
    }
    if (now >= st.next) {
      const heldMs = now - st.startTime;
      const interval = Math.max(18, 260 * Math.pow(0.32, heldMs / 1000));
      st.next = now + interval;
      fn(false, heldMs);
    }
  }
  function handleOverlayGamepad(rows, closeFn, gp, stickY) {
    const btn = (i) => gp.buttons[i] && gp.buttons[i].pressed;
    const activeEl = document.activeElement;
    const isTypingField = activeEl && (activeEl.id === 'actorInput' || activeEl.id === 'movieInput' || activeEl.id === 'backdropSecondsInput' || activeEl.id === 'backdropMovieMinInput' || activeEl.id === 'backdropMovieMaxInput');
    if (isTypingField) {
      if ((activeEl.id === 'actorInput' || activeEl.id === 'movieInput') && acOpen) {
        const dUp = btn(12), dDown = btn(13);
        navRepeat('acUp', dUp, () => acMoveNav(-1));
        navRepeat('acDown', dDown, () => acMoveNav(1));
        const aNow = btn(0);
        if (aNow && !gpPrevButtons[0]) acSelect();
        gpPrevButtons[0] = aNow;
        const bNow = btn(1);
        if (bNow && !gpPrevButtons[1]) acClose();
        gpPrevButtons[1] = bNow;
        return;
      }
      const aNow = btn(0);
      if (aNow && !gpPrevButtons[0]) activeEl.blur();
      gpPrevButtons[0] = aNow;
      const bNow = btn(1);
      if (bNow && !gpPrevButtons[1]) activeEl.blur();
      gpPrevButtons[1] = bNow;
      return;
    }
    const dpadUp = btn(12), dpadDown = btn(13);
    const upNow = dpadUp || stickY < -0.5;
    const downNow = dpadDown || stickY > 0.5;
    if (msOpenFieldId) {
      navRepeat('msUp', upNow, (fresh, heldMs) => moveMsNav(-(fresh ? 1 : dropdownStepSize(heldMs)), fresh));
      navRepeat('msDown', downNow, (fresh, heldMs) => moveMsNav(fresh ? 1 : dropdownStepSize(heldMs), fresh));
      const aNow = btn(0);
      if (aNow && !gpPrevButtons[0]) {
        if (msNavIndex === 0) { resetMsField(); }
        else {
          const opts = MULTI_SELECT_FIELDS[msOpenFieldId].getOptions();
          if (opts[msNavIndex - 1]) toggleMsOption(opts[msNavIndex - 1].value);
        }
      }
      gpPrevButtons[0] = aNow;
      const bNow = btn(1);
      if (bNow && !gpPrevButtons[1]) { closeMsDropdown(); navEditing = false; }
      gpPrevButtons[1] = bNow;
      return;
    }
    if (navEditing) {
      const row = rows[navFocusIndex];
      const el = document.getElementById(row.id);
      if (row.type === 'number') {
        // Restored acceleration (dropdownStepSize) — up/down IS the
        // "vertical scroll" category, meant to stay accelerated; it was
        // 'slider' (left/right, "horizontal") that needed the plain
        // +1/-1 treatment instead, not this. Keyboard's own up/down for
        // this same field type never had acceleration to begin with —
        // that asymmetry (keyboard plain, gamepad accelerated) is
        // pre-existing and untouched here, not something this was ever
        // meant to fix.
        navRepeat('navUp', upNow, (fresh, heldMs) => {
          const step = fresh ? 1 : dropdownStepSize(heldMs);
          const minV = el.min !== '' ? +el.min : -Infinity;
          el.value = Math.max(minV, +el.value + step);
          el.dispatchEvent(new Event('input'));
        });
        navRepeat('navDown', downNow, (fresh, heldMs) => {
          const step = fresh ? 1 : dropdownStepSize(heldMs);
          const minV = el.min !== '' ? +el.min : -Infinity;
          el.value = Math.max(minV, +el.value - step);
          el.dispatchEvent(new Event('input'));
        });
        const aNow = btn(0);
        if (aNow && !gpPrevButtons[0]) { navEditing = false; el.classList.remove('gp-editing'); el.dispatchEvent(new Event('change')); }
        gpPrevButtons[0] = aNow;
        const bNow = btn(1);
        if (bNow && !gpPrevButtons[1]) { navEditing = false; el.classList.remove('gp-editing'); el.dispatchEvent(new Event('change')); }
        gpPrevButtons[1] = bNow;
        return;
      }
      if (row.type === 'slider') {
        // Plain +1/-1 per repeat tick, no dropdownStepSize acceleration
        // — left/right IS the "horizontal, sliding" category, meant to
        // stay unaccelerated; sliders here are always small, tightly-
        // bounded ranges (0-10, 0-5, 60-120), unlike a dropdown list
        // that can run to dozens of entries — a fast accelerating climb
        // was never actually useful here, just made it easy to
        // overshoot a small range by feel.
        const adj = (d) => { el.value = Math.max(+el.min, Math.min(+el.max, +el.value + d)); el.dispatchEvent(new Event('input')); };
        const dpadL = btn(14), dpadR = btn(15);
        const decNow = dpadL || gpAxes.x < -0.5;
        const incNow = dpadR || gpAxes.x > 0.5;
        navRepeat('sliderDec', decNow, () => adj(-1));
        navRepeat('sliderInc', incNow, () => adj(1));
        const aN = btn(0);
        if (aN && !gpPrevButtons[0]) { navEditing = false; el.classList.remove('gp-editing'); el.dispatchEvent(new Event('change')); }
        gpPrevButtons[0] = aN;
        const bN = btn(1);
        if (bN && !gpPrevButtons[1]) { navEditing = false; el.classList.remove('gp-editing'); el.dispatchEvent(new Event('change')); }
        gpPrevButtons[1] = bN;
        return;
      }
      navRepeat('dropUp', upNow, (fresh, heldMs) => moveGpDropdown(el, -(fresh ? 1 : dropdownStepSize(heldMs)), fresh));
      navRepeat('dropDown', downNow, (fresh, heldMs) => moveGpDropdown(el, fresh ? 1 : dropdownStepSize(heldMs), fresh));
      const aNow = btn(0);
      if (aNow && !gpPrevButtons[0]) { navEditing = false; closeGpDropdown(); el.dispatchEvent(new Event('change')); }
      gpPrevButtons[0] = aNow;
      const bNow = btn(1);
      if (bNow && !gpPrevButtons[1]) { navEditing = false; el.selectedIndex = gpDropdownOriginalIndex; closeGpDropdown(); }
      gpPrevButtons[1] = bNow;
      return;
    }
    const dpadLeft = btn(14), dpadRight = btn(15);
    const leftNow = dpadLeft || gpAxes.x < -0.5;
    const rightNow = dpadRight || gpAxes.x > 0.5;
    const currentRow = rows[navFocusIndex];
    navRepeat('navUp', upNow, (fresh) => { const edge = navMoveFocus(rows, -1, fresh); updateNavFocusVisual(rows, edge); });
    navRepeat('navDown', downNow, (fresh) => { const edge = navMoveFocus(rows, 1, fresh); updateNavFocusVisual(rows, edge); });
    if (currentRow.type === 'buttonRow') {
      navRepeat('navLeft', leftNow, () => { navButtonRowFocus = 0; updateNavFocusVisual(rows); });
      navRepeat('navRight', rightNow, () => { navButtonRowFocus = 1; updateNavFocusVisual(rows); });
    } else if (rows === menuRows) {
      // D-Pad/stick left-right now switches tabs from ANYWHERE within
      // the Options menu, not just while the tab bar row itself is
      // focused — safe because this whole function only ever reaches
      // here when navEditing is false (a slider/number/dropdown that's
      // actively been entered returns early from its own dedicated
      // block above, before this point, and reclaims left/right for
      // itself while active). LB/RB remain a second, always-available
      // way to do the exact same thing.
      navRepeat('navLeft', leftNow, () => stepMenuTab(-1));
      navRepeat('navRight', rightNow, () => stepMenuTab(1));
    } else if (currentRow.type === 'slider') {
      const el = document.getElementById(currentRow.id);
      navRepeat('navLeft', leftNow, () => { el.value = Math.max(+el.min, +el.value - 1); el.dispatchEvent(new Event('input')); });
      navRepeat('navRight', rightNow, () => { el.value = Math.min(+el.max, +el.value + 1); el.dispatchEvent(new Event('input')); });
    } else {
      navRepeatState.navLeft = navRepeatState.navRight = undefined;
    }
    const aNow = btn(0);
    if (aNow && !gpPrevButtons[0]) {
      const row = rows[navFocusIndex];
      const el = document.getElementById(row.id);
      if (row.type === 'select') { navEditing = true; openGpDropdown(el); }
      else if (row.type === 'multiselect') { navEditing = true; openMsDropdown(row.id); }
      else if (row.type === 'number' || row.type === 'slider') { navEditing = true; el.classList.add('gp-editing'); }
      else if (row.type === 'text') el.focus();
      else if (row.type === 'checkbox') { el.checked = !el.checked; el.dispatchEvent(new Event('change')); }
      else if (row.type === 'button') el.click();
      else if (row.type === 'buttonRow') document.getElementById(row.ids[navButtonRowFocus]).click();
    }
    gpPrevButtons[0] = aNow;
    const bNow = btn(1);
    if (bNow && !gpPrevButtons[1]) { suppressGamepadCrouch = true; closeFn(); }
    gpPrevButtons[1] = bNow;
    if (rows === menuRows) {
      const lbNow = btn(4), rbNow = btn(5);
      if (lbNow && !gpPrevButtons[4]) stepMenuTab(-1);
      if (rbNow && !gpPrevButtons[5]) stepMenuTab(1);
      gpPrevButtons[4] = lbNow;
      gpPrevButtons[5] = rbNow;
    }
  }
  const gpDropdownEl = document.getElementById('gpDropdown');
  let gpDropdownOriginalIndex = 0;
  function openGpDropdown(selectEl) {
    gpDropdownOriginalIndex = selectEl.selectedIndex;
    positionDropdownNear(selectEl);
    gpDropdownEl.innerHTML = '';
    Array.from(selectEl.options).forEach((opt, i) => {
      const div = document.createElement('div');
      // This custom-rendered list is what people actually interact with
      // for EVERY 'select' field, on every input method — the native
      // <select> popup (which WOULD automatically greyed-out/un-clickable
      // a disabled <option> on its own) is never shown at all. Without
      // this check, disabling an option (e.g. Ambient's own Fallback
      // dropdown greying out "fall back to the same effect that just
      // failed") had no actual effect here — the option still rendered
      // as a perfectly normal, selectable row.
      div.className = 'opt' + (i === selectEl.selectedIndex ? ' hi' : '') + (opt.disabled ? ' disabled' : '');
      const span = document.createElement('span');
      span.textContent = opt.textContent;
      div.appendChild(span);
      if (opt.disabled) {
        div.style.opacity = '0.4';
        div.style.pointerEvents = 'none';
      } else {
        div.addEventListener('click', () => {
          selectEl.selectedIndex = i;
          navEditing = false;
          closeGpDropdown();
          selectEl.dispatchEvent(new Event('change'));
        });
        div.addEventListener('mouseenter', () => {
          selectEl.selectedIndex = i;
          gpDropdownEl.querySelectorAll('.opt').forEach((o) => o.classList.remove('hi'));
          div.classList.add('hi');
        });
      }
      gpDropdownEl.appendChild(div);
    });
    gpDropdownEl.style.display = 'block';
    requestAnimationFrame(() => {
      gpDropdownEl.querySelectorAll('.opt').forEach((div) => {
        const span = div.querySelector('span');
        if (span.scrollWidth > div.clientWidth) {
          span.textContent = span.textContent + '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0' + span.textContent;
          div.classList.add('scrolling');
        }
      });
    });
    const hi = gpDropdownEl.querySelector('.hi');
    if (hi) hi.scrollIntoView({ block: 'nearest' });
  }
  function closeGpDropdown() {
    gpDropdownEl.style.display = 'none';
  }
  function dropdownStepSize(heldMs) {
    // Tuned starting point, not a derived "correct" value — no source
    // found gives one for this specific case (small settings lists,
    // gamepad hold-repeat); this is a deliberate first guess in the
    // researched direction (later onset, gentler ceiling), expected to
    // get refined further against real testing, same as the mouse
    // wheel threshold/deadzone was.
    if (heldMs > 3000) return 7;
    if (heldMs > 2200) return 3;
    return 1;
  }
  function moveGpDropdown(selectEl, delta, isFreshPress) {
    const last = selectEl.options.length - 1;
    if (last < 0) return;
    const cur = selectEl.selectedIndex;
    let next = cur + delta;
    // Same fresh-press wrap semantics as moveMsNav (one rule everywhere).
    if (next < 0) next = (isFreshPress && cur === 0) ? last : 0;
    else if (next > last) next = (isFreshPress && cur === last) ? 0 : last;
    // Step past any disabled option(s), continuing in the SAME direction
    // of travel — a disabled option needs to be exactly as unreachable
    // via keyboard/gamepad as it already is via a direct click (see
    // openGpDropdown's own comment on why that's checked there at all;
    // this is the second, independent way to land on one that needed
    // the same guard). guard caps the loop so a pathological
    // all-disabled list can't spin forever.
    const step = delta >= 0 ? 1 : -1;
    let guard = selectEl.options.length + 1;
    while (selectEl.options[next] && selectEl.options[next].disabled && guard-- > 0) {
      next += step;
      if (next < 0) next = last;
      else if (next > last) next = 0;
    }
    selectEl.selectedIndex = next;
    const opts = gpDropdownEl.querySelectorAll('.opt');
    opts.forEach((o, i) => o.classList.toggle('hi', i === selectEl.selectedIndex));
    const hi = gpDropdownEl.querySelector('.hi');
    if (hi) hi.scrollIntoView({ block: 'nearest' });
  }
  const kioskConeDir = new THREE.Vector3();
  function kioskZoneInteractable() {
    // Proximity check is now EXPLICIT (distance vs. KIOSK_DISC_RADIUS —
    // the same radius the per-frame deployment logic itself uses), kept
    // ALONGSIDE the original kioskLevel check rather than replacing it.
    // kioskLevel alone worked fine as an implicit proximity proxy for
    // 'dynamic' (it only ever rises when actually nearby) AND had the
    // nice side effect of making you wait for the visible rise
    // animation to actually finish before interaction opens up — that
    // second part is worth keeping. But in 'always' mode kioskLevel is
    // FORCED high permanently regardless of distance (see
    // kioskShowMode's own comment), so on its own it stopped meaning
    // "nearby" at all there: simply LOOKING at a permanently-risen
    // kiosk from clear across the room used to satisfy it. The explicit
    // distance check below closes that gap for 'always' while changing
    // nothing about 'dynamic's own existing feel (kioskLevel there was
    // already effectively distance-gated to begin with). The generous
    // view cone (~±70°) still applies on top — you just must not be
    // looking clearly AWAY from the kiosk. Standing right on top of it
    // always counts.
    if (kioskShowMode === 'off' || !kioskGroup || kioskLevel <= 0.9) return false;
    const vx = kioskGroup.position.x - camera.position.x;
    const vz = kioskGroup.position.z - camera.position.z;
    const vlen = Math.sqrt(vx * vx + vz * vz);
    if (vlen >= KIOSK_DISC_RADIUS) return false;
    if (vlen < 0.2) return true;
    camera.getWorldDirection(kioskConeDir);
    const flen = Math.sqrt(kioskConeDir.x * kioskConeDir.x + kioskConeDir.z * kioskConeDir.z) || 1;
    const dot = (vx / vlen) * (kioskConeDir.x / flen) + (vz / vlen) * (kioskConeDir.z / flen);
    return dot > 0.34; // cos ~70° — intuitive, not fiddly
  }
  function raycastTarget() {
    // Forces the camera's world matrix to reflect its OWN latest
    // rotation right now, rather than whatever it was as of the last
    // render() call — mousemove sets camera.rotation directly, entirely
    // independent of the render loop's own timing, so a click landing
    // between two rendered frames could otherwise raycast against a
    // fractionally stale aim direction: visually already aimed
    // correctly, but the raycaster still using the previous frame's
    // transform. The continuous per-frame HOVER check further down
    // doesn't need this (it's already naturally in sync, running every
    // frame within the same loop that renders) — only this
    // click-triggered, one-shot raycast (and primaryAction's own direct
    // call to the same shared helper) does.
    const hit = raycastPosterHitRedundant();
    return hit ? hit.object.userData : null;
  }
  function raycastContextMenuButtonIndex() {
    // 17.421 note — this function itself is fine and correct;
    // what matters is WHO is allowed to call it. Today, exactly ONE
    // caller: the per-frame update in animate(), which stores the
    // result in contextMenuFocusIndex. primaryAction() must NEVER call
    // this directly on click — that was the multi-week "poster effect
    // click unreliable" bug. See contextMenuFocusIndex's own comment for
    // the full story. If you're adding a new caller here, stop and ask
    // whether contextMenuFocusIndex should be read instead.
    if (!contextMenuButtons.length || !contextMenuGroup) return -1;
    const savedScale = contextMenuGroup.scale.x;
    contextMenuGroup.scale.setScalar(1);
    contextMenuGroup.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(center, camera);
    const hits = raycaster.intersectObjects(contextMenuButtons);
    contextMenuGroup.scale.setScalar(savedScale);
    contextMenuGroup.updateMatrixWorld(true);
    if (hits.length > 0) return contextMenuButtons.indexOf(hits[0].object);
    return -1;
  }
  function primaryAction(allowConsoleActivation) {
    if (contextMenuOpen) {
      // 17.421 fix — see contextMenuFocusIndex's own huge
      // comment for the full multi-week story. Short version, repeated
      // here because this is the single most important line in this
      // whole function: DO NOT call raycastContextMenuButtonIndex()
      // (or any other fresh raycast) here. Ever. Read
      // contextMenuFocusIndex — the SAME state the per-frame loop
      // (in animate()) already keeps updated and that the visible
      // highlight itself is driven from — rather than doing its own,
      // separate raycastContextMenuButtonIndex() call here. A fresh
      // raycast at exactly this instant could disagree with what's
      // actually on screen: that per-frame update only ever MOVES focus
      // forward on a genuine hit, never clears it back on a momentary
      // miss (so the highlight doesn't flicker off during brief,
      // sub-frame aim wobble) — meaning a button could still be VISIBLY
      // highlighted for a frame or two after the crosshair drifted
      // slightly off it, and a click computing its own independent
      // answer right then could correctly, honestly get -1 for that
      // exact instant while the person was looking at a highlighted
      // button moments before clicking. Reading the same field the
      // display uses instead removes that whole class of mismatch by
      // construction: whatever is ACTUALLY shown as hovered is
      // guaranteed to be exactly what a click confirms, full stop.
      const idx = contextMenuFocusIndex;
      if (idx >= 0) {
        const cfg = contextMenuVisibleActions[idx];
        const disabled = cfg.checkKey ? contextMenuAvailability[cfg.checkKey] === false : false;
        if (disabled) {
          contextMenuFlashIndex = idx;
          contextMenuFlashColor = 'red';
          contextMenuFlashUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 400;
          updateContextMenuFocusVisual();
          return;
        }
        executeContextMenuAction(cfg.action);
      } else closeContextMenu();
      return;
    }
    const hit = raycastPosterHitRedundant();
    if (hit && hit.object.userData && hit.object.userData.type === 'poster') {
      prepareAndOpenContextMenu(hit.object, hit.object.userData.item, hit.object.userData.url);
      return;
    }
    // Aimed hits always win; the kiosk is the proximity fallback.
    if (kioskZoneInteractable()) { openPanel(); return; }
    // Nothing else claimed this Enter press — exactly the free state the
    // console is designed to slot into (see the planning doc's own
    // architecture section). Gamepad's own primary-action button never
    // reaches this branch to begin with (it only calls primaryAction()
    // when one of the checks above is already true). Genuinely
    // keyboard-Enter-only requires this explicit flag, though — without
    // it, the VERY FIRST mouse click that engages Pointer Lock in the
    // first place ALSO replays as a primaryAction() call (see the
    // pointerlockchange listener's own pendingPrimaryAction handling),
    // which used to activate the console on nothing more than a
    // person's first click into the room, before they'd touched a key
    // at all.
    if (allowConsoleActivation) activateCinemaConsole();
  }
  function secondaryAction() {
    if (contextMenuOpen) { closeContextMenu(); return; }
    if (panelEl.style.display === 'block' || menuOverlayEl.style.display === 'flex') {
      if (msOpenFieldId) { closeMsDropdown(); navEditing = false; return; }
      if (acOpen) { acClose(); return; }
      if (navEditing) {
        navEditing = false;
        const rows = panelEl.style.display === 'block' ? panelRows : menuRows;
        const el = document.getElementById(rows[navFocusIndex].id);
        if (el) el.selectedIndex = gpDropdownOriginalIndex;
        closeGpDropdown();
        return;
      }
      if (panelEl.style.display === 'block') closePanel();
      else closeMenuOverlay();
      requestPointerLockDeferred();
      return;
    }
    if (controlsOverlayEl.style.display === 'block') {
      controlsOverlayEl.style.display = 'none';
      requestPointerLockDeferred();
      instructionsEl.innerHTML = baseInstructions();
      return;
    }
  }
  document.addEventListener('contextmenu', (e) => {
    const anyOverlayOpen = panelEl.style.display === 'block' || menuOverlayEl.style.display === 'flex' || controlsOverlayEl.style.display === 'block' || cinemaConsoleActive;
    if (anyOverlayOpen && !(e.target && (e.target.id === 'actorInput' || e.target.id === 'movieInput'))) e.preventDefault();
  });
  document.addEventListener('mousedown', (e) => {
    if (confirmDialogEl.style.display === 'block') {
      if (!confirmDialogEl.contains(e.target)) hideConfirmDialog();
      return;
    }
    if (e.button === 2 && e.target && (e.target.id === 'actorInput' || e.target.id === 'movieInput')) return;
    const insideUiSurface = e.button === 0 && (
      (panelEl.style.display === 'block' && panelEl.contains(e.target)) ||
      (menuOverlayEl.style.display === 'flex' && menuOverlayEl.contains(e.target)) ||
      (controlsOverlayEl.style.display === 'block' && controlsOverlayEl.contains(e.target)) ||
      gpDropdownEl.contains(e.target));
    if (insideUiSurface) return;
    const anyOverlayOpenMD = panelEl.style.display === 'block' || menuOverlayEl.style.display === 'flex' || controlsOverlayEl.style.display === 'block' || cinemaConsoleActive;
    if (e.button === 2 && anyOverlayOpenMD) { secondaryAction(); return; }
    if (panelEl.style.display === 'block' && e.button === 0) {
      closePanel();
      requestPointerLockDeferred();
      return;
    }
    if (menuOverlayEl.style.display === 'flex' && e.button === 0) {
      closeMenuOverlay();
      requestPointerLockDeferred();
      return;
    }
    if (controlsOverlayEl.style.display === 'block' && e.button === 0) {
      controlsOverlayEl.style.display = 'none';
      requestPointerLockDeferred();
      instructionsEl.innerHTML = baseInstructions();
      return;
    }
    if (!isLocked) {
      if (e.button === 0) pendingPrimaryAction = true;
      else if (e.button === 2) pendingSecondaryAction = true;
      pendingActionTimestamp = nowMs();
      requestPointerLockDeferred();
      return;
    }
    // Deferred by exactly one frame — NOT called synchronously inside
    // this handler. Aiming with a mouse sets camera.rotation directly
    // on 'mousemove' (see that listener's own comment), and the very
    // last such adjustment right before a click can still be in-flight
    // relative to this 'mousedown' firing — the two are separate,
    // independently-dispatched events, so there's no guarantee the
    // final aim update has been fully applied yet at this exact moment.
    // Keyboard confirmation (Enter/E) never has this race at all —
    // aiming was already finished, settled, via the mouse SEPARATELY
    // before the key press — which is exactly the reliability gap this
    // closes. requestAnimationFrame costs at most ~16ms, imperceptible
    // as input lag, and guarantees at least one full render tick (and
    // therefore any pending camera update) has actually landed before
    // the raycast this eventually triggers actually runs.
    // requestAnimationFrame(primaryAction) directly (without the arrow
    // wrapper) would pass rAF's own callback argument — a timestamp,
    // always a large truthy number — straight through as primaryAction's
    // OWN first parameter (allowConsoleActivation), silently making
    // every left click open the console exactly like Enter does. This
    // is a plain mouse click; only the Enter key is ever allowed to
    // activate the console (see primaryAction's own comment on this).
    if (e.button === 0) requestAnimationFrame(() => primaryAction(false));
    else if (e.button === 2) secondaryAction();
  });
  const room = buildCinema(scene);
  // Subtle volumetric-style light shaft from the ceiling fixture down onto
  // the kiosk disc (WebGL fake-volumetric: additive gradient cone — the
  // WebGPU VolumeNodeMaterial approach isn't available in this build).
  // Radii: 0.22 matches the ceiling fixture, KIOSK_DISC_RADIUS matches the
  // disc art exactly. Only visible in dark mode, driven by dimLevel.
  // Soft smoke/noise texture (value noise on a small canvas, upscaled with
  // smoothing -> wispy blobs, tiling seamlessly via RepeatWrapping).
  const lightConeNoiseTex = (() => {
    const small = document.createElement('canvas');
    small.width = 16; small.height = 16;
    const sctx = small.getContext('2d');
    const img = sctx.createImageData(16, 16);
    for (let i = 0; i < 16 * 16; i++) {
      const v = 90 + Math.floor(Math.random() * 165);
      img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    sctx.putImageData(img, 0, 0);
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    // Draw twice with offset wrap so the upscale smoothing tiles cleanly.
    ctx.drawImage(small, 0, 0, 128, 128);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(small, -64, -64, 128, 128);
    ctx.drawImage(small, 64, 64, 128, 128);
    ctx.drawImage(small, -64, 64, 128, 128);
    ctx.drawImage(small, 64, -64, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  })();
  // Fresnel-faded volumetric-style shaft: the silhouette (faces seen
  // edge-on) dissolves to nothing, so there is NO visible geometric edge —
  // brightness peaks when looking through the middle of the cone, exactly
  // like a real light shaft in haze. Two slowly drifting noise samples add
  // the foggy/smoky wisps. DoubleSide + additive means front and back
  // surfaces stack up, which reads as genuine depth/thickness.
  const kioskLightConeMat = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xffe0b0) },
      uNoise: { value: lightConeNoiseTex }
    },
    vertexShader: [
      'varying vec3 vNormal;',
      'varying vec3 vViewPos;',
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  vNormal = normalMatrix * normal;',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  vViewPos = -mv.xyz;',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join(' '),
    fragmentShader: [
      'uniform float uOpacity;',
      'uniform float uTime;',
      'uniform vec3 uColor;',
      'uniform sampler2D uNoise;',
      'varying vec3 vNormal;',
      'varying vec3 vViewPos;',
      'varying vec2 vUv;',
      'void main() {',
      '  float facing = abs(dot(normalize(vNormal), normalize(vViewPos)));',
      '  float edgeSoft = pow(facing, 2.6);',
      '  float vertical = pow(clamp(vUv.y, 0.0, 1.0), 1.15);',
      '  float topFade = smoothstep(1.0, 0.92, vUv.y);',
      '  float n1 = texture2D(uNoise, vUv * vec2(2.0, 1.2) + vec2(uTime * 0.010, -uTime * 0.030)).r;',
      '  float n2 = texture2D(uNoise, vUv * vec2(3.5, 2.0) + vec2(-uTime * 0.017, -uTime * 0.052)).r;',
      '  float smoke = 0.30 + 0.45 * (n1 * n2 * 1.6);',
      '  float alpha = uOpacity * edgeSoft * vertical * topFade * smoke;',
      '  gl_FragColor = vec4(uColor, alpha);',
      '}'
    ].join(' '),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  // Built once at the height active at load time; the actual live height
  // is achieved by scaling along Y only (radii at top/bottom stay exactly
  // as designed — only the beam's reach changes, matching a real light
  // cone stretching to a moved ceiling, not widening/narrowing).
  const KIOSK_LIGHT_CONE_BASE_HEIGHT = room.ROOM_HEIGHT - 0.12;
  const kioskLightCone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, KIOSK_DISC_RADIUS, KIOSK_LIGHT_CONE_BASE_HEIGHT, 48, 1, true),
    kioskLightConeMat
  );
  kioskLightCone.position.set(0, KIOSK_LIGHT_CONE_BASE_HEIGHT / 2 + 0.02, 0);
  kioskLightCone.renderOrder = 3;
  kioskLightCone.visible = false;
  scene.add(kioskLightCone);
  function updateKioskLightConeHeight() {
    const liveHeight = room.ROOM_HEIGHT - 0.12;
    kioskLightCone.scale.y = liveHeight / KIOSK_LIGHT_CONE_BASE_HEIGHT;
    kioskLightCone.position.y = liveHeight / 2 + 0.02;
  }
  window.__jfDebug = { room, trailerTexture, trailerVideo };
  const kioskObj = buildKiosk(scene, room);
  kioskTop = kioskObj.top;
  kioskGroup = kioskObj.group;
  kioskInteractionProxy = kioskObj.interactionProxy;
  const kioskIndicatorMat = kioskObj.indicatorMat;
  const postersGroup = new THREE.Group();
  scene.add(postersGroup);
  const forwardVec = new THREE.Vector3(), rightVec = new THREE.Vector3();
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    updateRoomResizeAnimation(dt);
    if (discPivot) discPivot.rotation.y += dt * 0.8;
    if (stagedReveal.active) {
      const stagedNow = performance.now();
      ['left', 'right'].forEach((sideKey) => {
        const side = stagedReveal[sideKey];
        if (!side || !side.pending.length || stagedNow < side.nextAllowedAt) return;
        let bestI = -1;
        for (let i = 0; i < side.pending.length; i++) {
          if (side.pending[i].mat.__fadeTarget === 1 && (bestI < 0 || side.pending[i].rank < side.pending[bestI].rank)) bestI = i;
        }
        if (bestI < 0) return; // nothing ready on this side yet — wait, don't burn the slot
        side.pending.splice(bestI, 1)[0].mat.__stagedHold = false;
        side.nextAllowedAt = stagedNow + 1000;
      });
      if ((!stagedReveal.left || !stagedReveal.left.pending.length) && (!stagedReveal.right || !stagedReveal.right.pending.length)) stagedReveal.active = false;
    }
    gridTileInfo.forEach((info) => {
      if (info.mat.__fadeTarget === undefined) return;
      if (info.mat.__stagedHold && info.mat.__fadeTarget > 0) return;
      info.mat.opacity = THREE.MathUtils.lerp(info.mat.opacity, info.mat.__fadeTarget, Math.min(1, dt * 4));
    });
    bgFadeList.forEach((mat) => {
      if (mat.__fadeTarget === undefined) return;
      if (mat.__stagedHold && mat.__fadeTarget > 0) return;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, mat.__fadeTarget, Math.min(1, dt * (mat.__fadeRate || 3)));
      // Backwall: 0.45 bei Deckenlicht AUS (dauerhaft etwas entschaerft,
      // wie gewuenscht), heller Richtung 0.80 bei Deckenlicht AN.
      // Direkt am Material selbst statt
      // einer separaten Ebene -- passt sich automatisch exakt an jede
      // Kachelgroesse an, kein Ueberdecken angrenzender Flaechen. Nur
      // Kacheln MIT bereits geladener Textur bekommen den Grauton --
      // sonst wuerde auch der dunkle Platzhalter faelschlich aufgehellt.
      if (mat.map) {
        const backwallBrightness = THREE.MathUtils.lerp(backwallBrightnessOffVal, backwallBrightnessOnVal, roomBrightnessFactor());
        mat.color.setScalar(backwallBrightness);
      }
    });
    updatePosterTextureSwaps();
    posterLights.forEach((pl) => {
      // A poster currently mid-resize-chain (spawning or despawning) has
      // its light's opacity fully owned by updatePosterFrameChains for
      // the duration — this per-frame trailer-dimming lerp was fighting
      // it for the same property every frame, causing a visible flicker
      // (most noticeable on shrink, where the fade is fast and abrupt).
      if (pl.__ownerGroup && pl.__ownerGroup.userData.__chainKind) return;
      // Kiosk Movie Search's own found poster stays lit at its natural
      // brightness no matter what — checked FIRST, ahead of every other
      // rule below (dim, pin-light dimming-others-out, all of it) —
      // specifically so it's still visible glancing across the room even
      // while walking toward it, before the movie's own light would
      // otherwise have turned on naturally. Cleared the moment ANY
      // poster effect gets activated anywhere (see
      // executeContextMenuAction's own comment) — from that point on,
      // this check simply never matches again, and normal behavior
      // (including this exact poster's own light turning on for real,
      // if that's what got activated) takes back over with nothing left
      // to override.
      // Beam and fixture use genuinely different targets now — the
      // fixture is always lit, a pure function of the Poster Light
      // Brightness slider, untouched by either the Environment Effect
      // toggle or which poster is currently "the one" (see
      // ccPosterLightTarget's own comment for the full breakdown). The
      // beam is the only one that dims for non-active posters and
      // responds to the toggle. Same 6x ratio as before (0.3 fixture :
      // 0.05 beam at the slider's own default).
      const beamTarget = ccPosterLightTarget(pl.itemId, true);
      const fixtureTarget = ccPosterLightTarget(pl.itemId, false);
      pl.mat.opacity = THREE.MathUtils.lerp(pl.mat.opacity, beamTarget, Math.min(1, dt * 3));
      if (pl.fixtureMat) pl.fixtureMat.emissiveIntensity = THREE.MathUtils.lerp(pl.fixtureMat.emissiveIntensity, fixtureTarget * 6, Math.min(1, dt * 3));
    });
    // Posterwand-Helligkeit folgt dem Deckenlicht direkt (reflektierende
    // Flaeche, kein eigenes Leuchten) -- 64% bei Deckenlicht AN, 36% bei
    // Deckenlicht AUS. MeshBasicMaterial.color multipliziert direkt mit
    // der Textur, daher reicht ein einfacher Grauwert-Skalar.
    const posterWallBrightness = THREE.MathUtils.lerp(posterWallBrightnessOnVal, posterWallBrightnessOffVal, dimLevel);
    clickablePosters.forEach((p) => {
      // Nur Poster MIT bereits geladener Textur bekommen den dynamischen
      // Grauton -- ohne diese Pruefung wurde auch der dunkle Platzhalter
      // (vor dem Laden) faelschlich grau statt schwarz eingefaerbt.
      if (p.material && p.material.color && p.material.map) p.material.color.setScalar(posterWallBrightness);
    });
    // Hides the shimmer outright while genuine disc art is showing (NOT
    // the dark fallback circle — that one already correctly leaves the
    // indicator visible/unobstructed under it, see its own comment) —
    // otherwise the semi-transparent disc art (its own opacity only
    // ever reaches 0.5) let the warm-white glow show through underneath
    // it, visibly blending the two together instead of reading as one
    // clean picture.
    kioskIndicatorMat.opacity = THREE.MathUtils.lerp(kioskIndicatorMat.opacity, realDiscArtActive ? 0 : 0.35 * roomBrightnessFactor(), Math.min(1, dt * 3));
    // Same "no fixed duration to wait out, so it can never be caught
    // mid-fade and cut off" reasoning as dimLevel/kioskIndicatorMat
    // above — see trailerVideoVolumeTarget's own comment.
    trailerVideo.volume = THREE.MathUtils.lerp(trailerVideo.volume, trailerVideoVolumeTarget, Math.min(1, dt * 3));
    if (contextMenuOpen && !contextMenuClosing) {
      contextMenuAnimT = Math.min(1, contextMenuAnimT + dt / 0.2);
    } else if (contextMenuClosing) {
      contextMenuAnimT = Math.max(0, contextMenuAnimT - dt / 0.15);
      if (contextMenuAnimT <= 0) closeContextMenuImmediate();
    }
    if (contextMenuGroup) {
      contextMenuGroup.scale.setScalar(Math.max(0.001, contextMenuAnimT));
      contextMenuButtons.forEach((mesh) => { mesh.material.opacity = contextMenuAnimT; });
    }
    if (contextMenuPosterMesh && contextMenuPosterMesh.material) {
      const dimTarget = contextMenuOpen ? POSTER_BASE_EMISSIVE * 0.15 : POSTER_BASE_EMISSIVE;
      contextMenuPosterMesh.material.emissiveIntensity = THREE.MathUtils.lerp(contextMenuPosterMesh.material.emissiveIntensity, dimTarget, Math.min(1, dt * 8));
    }
    if (kioskGroup) {
      // 'off': target is always 0, never rises (see kioskShowMode's own
      // comment — kioskZoneInteractable is ALSO gated on this mode
      // directly, so even if something briefly nudged kioskLevel here,
      // the panel couldn't accidentally open from it). 'always':
      // target is always 1, permanently risen — reuses the exact same
      // lerp as 'dynamic' rather than snapping instantly, since
      // converging toward a constant target settles there quickly on
      // its own and then just stays, with no separate code path needed.
      // 'dynamic': unchanged proximity-based behavior.
      let targetLevel;
      if (kioskShowMode === 'off') {
        targetLevel = 0;
      } else if (kioskShowMode === 'always') {
        targetLevel = 1;
      } else {
        const dx = camera.position.x - kioskGroup.position.x;
        const dz = camera.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const KIOSK_DETECT_RADIUS = KIOSK_DISC_RADIUS;
        targetLevel = dist < KIOSK_DETECT_RADIUS ? 1 : 0;
      }
      kioskWantsUp = targetLevel === 1;
      kioskLevel = THREE.MathUtils.lerp(kioskLevel, targetLevel, Math.min(1, dt * 5));
      kioskGroup.position.y = THREE.MathUtils.lerp(-1.3, 0, kioskLevel);
    }
    // 3D clearlogo: exists only while a movie session is active; rotation
    // runs permanently (so it is ALREADY spinning when it appears), but the
    // fade-in is gated on the table being FULLY raised.
    // "posterActive" is the shared "a poster action is active" state used
    // throughout this whole feature — Movie/Trailer/Theme Video/Theme
    // Song/Fanart Wall all set trailerActive true; only "Go to Library"
    // leaves it false. Ambient Mode is folded in via ambientFocusActive
    // instead of trailerActive itself — stopTrailer unconditionally
    // resets trailerActive on every Ambient step transition (by design,
    // for the other things that correctly need that same reset), which
    // used to make this same logo/branding state flicker in step with
    // content type (video-playing steps vs. not) rather than staying
    // constant for Ambient's own WHOLE run the way it's meant to.
    const posterActive = (trailerActive || ambientFocusActive) && currentFullItem;
    const itemHasLogo = posterActive && !!(currentFullItem.ImageTags && currentFullItem.ImageTags.Logo);
    // A movie's OWN clearlogo — unaffected by kioskBrandingMode, which
    // governs only the generic Cinema wordmark, EXCEPT 'always' mode,
    // which explicitly overrides even a movie's own logo per its name.
    const kioskLogoItem = (kioskClearlogo3d && posterActive && itemHasLogo && kioskBrandingMode !== 'always') ? currentFullItem : null;
    let showBranding = false;
    if (kioskClearlogo3d) {
      if (kioskBrandingMode === 'always') showBranding = true;
      else if (kioskBrandingMode === 'whenIdle') showBranding = !posterActive;
      else if (kioskBrandingMode === 'whenIdleOrMissing') showBranding = !posterActive || !itemHasLogo;
      // 'off' leaves showBranding false.
    }
    const kioskLogoBranding = showBranding && !kioskLogoItem; // a valid movie logo always wins over branding when both would otherwise apply
    const kioskLogoDesiredKey = kioskLogoItem ? kioskLogoItem.Id : (kioskLogoBranding ? 'branding' : null);
    if (kioskLogoDesiredKey !== kioskLogoItemId) buildKioskLogo(kioskLogoItem, kioskLogoBranding);
    if (kioskLogoGroup) {
      const kioskLogoRpm = KIOSK_LOGO_SPEED_RPM[+kioskLogoSpeed];
      if (kioskLogoRpm > 0) {
        kioskLogoGroup.rotation.y += dt * (kioskLogoRpm * Math.PI * 2 / 60);
      } else {
        // Static: glide smoothly back to the screen-facing home orientation
        // (nearest equivalent angle, so it takes the short way around)
        // instead of freezing at whatever mid-spin angle it happened to be.
        const current = kioskLogoGroup.rotation.y;
        const target = Math.round(current / (Math.PI * 2)) * Math.PI * 2;
        kioskLogoGroup.rotation.y = THREE.MathUtils.lerp(current, target, Math.min(1, dt * 5));
      }
      // Fade-in only once the table is FULLY raised; fade-out starts the
      // moment the table WANTS to lower (player left the disc area), not
      // only when it has arrived at the bottom.
      const logoTarget = (kioskLogoReady && kioskLogoDesiredKey && kioskWantsUp && kioskLevel > 0.985) ? KIOSK_LOGO_MAX_OPACITY : 0;
      // Asymmetric: gentle fade-in, near-instant fade-out (~0.15s) so the
      // logo is gone before the descending table visibly moves.
      kioskLogoFade = THREE.MathUtils.lerp(kioskLogoFade, logoTarget, Math.min(1, dt * (logoTarget > 0 ? 4 : 14)));
      kioskLogoGroup.visible = kioskLogoFade > 0.01;
      // STATE 1 — transition flicker: original intensity/behavior, tied
      // purely to the fade actually being IN MOTION. Normalizing fade to a
      // 0..1 range (dividing by the resting opacity) before applying the
      // parabola is the fix over the old version — that one measured
      // against 1.0 while the resting value is really 0.75, so it never
      // reached exactly zero and kept flickering forever at rest. Same
      // shape/strength as before, now correctly reaching zero once
      // settled — nothing left over into state 2.
      const normFade = KIOSK_LOGO_MAX_OPACITY > 0 ? kioskLogoFade / KIOSK_LOGO_MAX_OPACITY : 0;
      const transFlicker = normFade * (1 - normFade) * 4;
      const nowMs = performance.now();
      const glitchFreqPerMin = KIOSK_LOGO_GLITCH_PER_MIN[+kioskLogoGlitchFreq];
      const glitchIntensity = +kioskLogoGlitchIntensity;
      let inTwitch = false;
      if (glitchFreqPerMin > 0 && glitchIntensity > 0 && kioskLogoFade > KIOSK_LOGO_MAX_OPACITY * 0.98) {
        const meanGapMs = 60000 / glitchFreqPerMin;
        if (kioskLogoNextTwitchAt === 0) {
          kioskLogoNextTwitchAt = nowMs + meanGapMs * (0.5 + Math.random());
        } else if (nowMs >= kioskLogoNextTwitchAt) {
          kioskLogoTwitchUntil = nowMs + KIOSK_LOGO_GLITCH_MS[glitchIntensity];
          kioskLogoNextTwitchAt = nowMs + meanGapMs * (0.5 + Math.random());
        }
        inTwitch = nowMs < kioskLogoTwitchUntil;
      }
      let holoOpacity = kioskLogoFade;
      if (transFlicker > 0.01) {
        const nowS = nowMs * 0.001;
        const flick = 1 - transFlicker * 0.4 * (0.5 + 0.5 * Math.sin(nowS * 41.0) * Math.sin(nowS * 7.7));
        holoOpacity *= Math.max(0.1, flick);
        if (Math.random() < 0.08) holoOpacity *= 0.35;
        const kids = kioskLogoGroup.children;
        for (let i = 0; i < kids.length; i++) kids[i].position.x = 0;
        const glitchCount = Math.random() < 0.6 ? 2 : 1;
        for (let g = 0; g < glitchCount; g++) {
          const k = kids[Math.floor(Math.random() * kids.length)];
          if (k) k.position.x = (Math.random() - 0.5) * 0.05 * transFlicker;
        }
        kioskLogoGlitched = true;
      } else if (inTwitch) {
        const nowS = nowMs * 0.001;
        const flick = 1 - KIOSK_LOGO_GLITCH_FLICK[glitchIntensity] * (0.5 + 0.5 * Math.sin(nowS * 41.0) * Math.sin(nowS * 7.7));
        holoOpacity *= Math.max(0.05, flick);
        const kids = kioskLogoGroup.children;
        for (let i = 0; i < kids.length; i++) kids[i].position.x = 0;
        for (let g = 0; g < KIOSK_LOGO_GLITCH_SLICES[glitchIntensity]; g++) {
          const k = kids[Math.floor(Math.random() * kids.length)];
          if (k) k.position.x = (Math.random() - 0.5) * KIOSK_LOGO_GLITCH_OFFSET[glitchIntensity];
        }
        kioskLogoGlitched = true;
      } else if (kioskLogoGlitched) {
        const kids = kioskLogoGroup.children;
        for (let i = 0; i < kids.length; i++) kids[i].position.x = 0;
        kioskLogoGlitched = false;
      }
      // TEST: direct assignment, WITHOUT the per-layer compounding
      // correction -- this recreates the original (mathematically
      // "wrong" for 24 stacked layers, but visually denser) behavior.
      for (let i = 0; i < kioskLogoMats.length; i++) kioskLogoMats[i].opacity = holoOpacity;
    }
    dimLevel = THREE.MathUtils.lerp(dimLevel, dimTarget, Math.min(1, dt * 2.2));
    room.dimLights.forEach((light) => {
      if (light.__baseIntensity === undefined) light.__baseIntensity = light.intensity;
      light.intensity = THREE.MathUtils.lerp(light.__baseIntensity * Math.pow(1.15, audienceBrightnessAdj), light.__baseIntensity * 0.12 * Math.pow(1.15, cinemaBrightnessAdj), dimLevel);
    });
    room.dimEmissiveMats.forEach((mat) => {
      if (mat.__baseEmissiveIntensity === undefined) mat.__baseEmissiveIntensity = mat.emissiveIntensity;
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.__baseEmissiveIntensity * Math.pow(1.15, audienceBrightnessAdj), mat.__baseEmissiveIntensity * 0.06 * Math.pow(1.15, cinemaBrightnessAdj), dimLevel);
    });
    // Front Wall — driven DIRECTLY by dimLevel (the exact same value
    // the room's own lighting above uses), not a separate independently
    // -timed fade of its own, whenever nothing is forcing it black.
    // wallBlend of 0 = fully black, 1 = fully lit/grey. Forced black
    // (video playing, Front Art actively showing) now ALSO fades in/out
    // smoothly instead of snapping — screenMatForceBlackLevel rises
    // toward 1 as a multiplier that scales the dim-driven portion down
    // toward 0 (black) while active, and falls back toward 0 (letting
    // dimLevel drive it again) once nothing forces it anymore. Coming
    // OUT of forced-black was already smooth even before this (dimLevel
    // itself hasn't necessarily reached its own target yet at that
    // exact moment), and still is — this only adds the missing other
    // half, going INTO forced-black.
    screenMatForceBlackLevel = THREE.MathUtils.lerp(screenMatForceBlackLevel, screenMatForceBlack ? 1 : 0, Math.min(1, dt * 3));
    const wallBlend = roomBrightnessFactor() * (1 - screenMatForceBlackLevel);
    room.screenMat.color.copy(SCREEN_MAT_BLACK_COLOR).lerp(SCREEN_MAT_LIT_COLOR, wallBlend);
    room.screenMat.emissive.copy(SCREEN_MAT_BLACK_COLOR).lerp(SCREEN_MAT_LIT_EMISSIVE, wallBlend);
    room.screenMat.emissiveIntensity = wallBlend * 0.6;
    room.screenMat.needsUpdate = true;
    // Jellyfin Cinema Project logo+wordmark — same "~1s perceived fade" rate (3)
    // as the backdrop wall's own materials, for a consistent feel
    // across everything on this same wall.
    room.marqueeMat.opacity = THREE.MathUtils.lerp(room.marqueeMat.opacity, marqueeTargetOpacity, Math.min(1, dt * 3));
    room.marqueeMat.needsUpdate = true;
    // Front Art — same rate-3 treatment as everything else on this
    // wall now. Both null until first actually shown once, hence the
    // guards.
    // Bleibt bei Deckenlicht AUS auf voller Farbe (1.0, kein
    // zusaetzlicher dauerhafter Abzug wie bei der Backwall), wird bei
    // Deckenlicht AN Richtung 0.80 aufgehellt (Schleier-Effekt).
    const frontWallBrightness = THREE.MathUtils.lerp(frontWallBrightnessOffVal, frontWallBrightnessOnVal, roomBrightnessFactor());
    if (fallbackImageMesh) {
      fallbackImageMesh.material.opacity = THREE.MathUtils.lerp(fallbackImageMesh.material.opacity, fallbackImageTargetOpacity, Math.min(1, dt * 3));
      fallbackImageMesh.material.color.setScalar(frontWallBrightness);
      fallbackImageMesh.material.needsUpdate = true;
    }
    if (screenLogoMesh) {
      screenLogoMesh.material.opacity = THREE.MathUtils.lerp(screenLogoMesh.material.opacity, screenLogoTargetOpacity, Math.min(1, dt * 3));
      screenLogoMesh.material.color.setScalar(frontWallBrightness);
      screenLogoMesh.material.needsUpdate = true;
    }
    if (videoScreenMesh) {
      videoScreenMesh.material.color.setScalar(frontWallBrightness);
      videoScreenMesh.material.needsUpdate = true;
    }
    // Ceiling-to-disc light shaft: previously only visible in dark mode
    // (tied to dimLevel). Now also shown whenever the ceiling light is on
    // at normal brightness (dimLevel low) — effectively always visible at
    // the same subtle strength, since the fixture is on in both states.
    // Time drives the slow smoke drift.
    kioskLightConeMat.uniforms.uOpacity.value = THREE.MathUtils.lerp(0.02, 0.05, roomBrightnessFactor());
    kioskLightConeMat.uniforms.uTime.value = performance.now() * 0.001;
    kioskLightCone.visible = true;
    pollGamepad(dt);
    isCrouching = crouchEnabled && (crouchMode === 'toggle' ? toggleCrouchActive : (keyboardCrouch || gamepadCrouch));
    crouchLevel = THREE.MathUtils.lerp(crouchLevel, isCrouching ? 1 : 0, Math.min(1, dt * 8));
    const groundHeight = EYE_HEIGHT - crouchLevel * CROUCH_OFFSET;
    if (panelEl.style.display !== 'block' && menuOverlayEl.style.display !== 'flex' && controlsOverlayEl.style.display !== 'block' && !cinemaConsoleActive) {
      // Both ACTIVE_SCALE_MODE and ROOM_WIDTH_HEIGHT_SCALE are frozen at
      // page-load time — since the room now resizes live (no reload),
      // this must read the LIVE scale-mode setting and the LIVE room
      // width instead, or movement speed silently stops tracking any
      // resize that happens after the initial load.
      const speedScaleFactor = (scaleMovementSpeedEnabled && roomScaleModeSelect.value === 'full') ? (ROOM_WIDTH / 24) : 1;
      const speed = ((move.sprint || gpSprint || autoSprint) ? 7.5 : 4.2) * (isCrouching ? 0.5 : 1) * speedScaleFactor * (MOVEMENT_SPEED_CURVE[movementSpeedScale] || 1);
      forwardVec.set(0, 0, -1).applyQuaternion(camera.quaternion); forwardVec.y = 0; forwardVec.normalize();
      rightVec.set(1, 0, 0).applyQuaternion(camera.quaternion); rightVec.y = 0; rightVec.normalize();
      let forwardAmt = controllerMovementEnabled ? gpAxes.y * -1 : 0;
      let strafeAmt = controllerMovementEnabled ? gpAxes.x : 0;
      if (move.forward) forwardAmt += 1;
      if (move.back) forwardAmt -= 1;
      if (move.right) strafeAmt += 1;
      if (move.left) strafeAmt -= 1;
      const mag = Math.hypot(forwardAmt, strafeAmt);
      if (mag > 1) { forwardAmt /= mag; strafeAmt /= mag; }
      const step = new THREE.Vector3();
      step.add(forwardVec.clone().multiplyScalar(forwardAmt));
      step.add(rightVec.clone().multiplyScalar(strafeAmt));
      if (step.lengthSq() > 0) { step.normalize().multiplyScalar(Math.min(1, mag) * speed * dt); camera.position.add(step); }
      verticalVelocity -= GRAVITY * dt;
      camera.position.y += verticalVelocity * dt;
      if (camera.position.y <= groundHeight) { camera.position.y = groundHeight; verticalVelocity = 0; isGrounded = true; }
      const margin = 0.6;
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -room.ROOM_WIDTH / 2 + margin, room.ROOM_WIDTH / 2 - margin);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -room.ROOM_DEPTH / 2 + margin, room.ROOM_DEPTH / 2 - margin);
      if (contextMenuOpen) {
        const idx = raycastContextMenuButtonIndex();
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        let needsRefresh = false;
        if (idx >= 0 && idx !== contextMenuFocusIndex) {
          contextMenuFocusIndex = idx;
          needsRefresh = true;
        }
        if (contextMenuFlashIndex >= 0 && now >= contextMenuFlashUntil) {
          contextMenuFlashIndex = -1;
          needsRefresh = true;
        }
        if (needsRefresh) updateContextMenuFocusVisual();
        tooltipEl.style.display = 'none';
      } else {
        raycaster.setFromCamera(center, camera);
        const hits = raycaster.intersectObjects(clickablePosters);
        let newHoveredInteractable = null;
        if (hits.length > 0 && hits[0].distance < 3.5) {
          const data = hits[0].object.userData;
          tooltipEl.style.display = 'inline-flex';
          currentHoverItem = data.item;
          tooltipEl.innerHTML = data.item.Name + '<div class="trailerhint">' + primaryLabel() + ' menu</div>';
          newHoveredInteractable = 'poster';
        } else if (kioskZoneInteractable()) {
          // Aimed hits always win; the kiosk is the proximity fallback —
          // near the raised table and not looking clearly away = usable.
          currentHoverItem = null;
          tooltipEl.style.display = 'inline-flex';
          tooltipEl.innerHTML = primaryLabel() + ' enter Kiosk';
          newHoveredInteractable = 'kiosk';
        } else {
          currentHoverItem = null;
          tooltipEl.style.display = 'none';
        }
        if (newHoveredInteractable !== hoveredInteractable) {
          hoveredInteractable = newHoveredInteractable;
          instructionsEl.innerHTML = baseInstructions();
        }
      }
    }
    renderer.render(scene, camera);
  }
  animate();
  // Rotates an already-sorted movie list so a specific movie becomes the
  // FIRST one, with everything before it moved to the end — a circular
  // shift, not a re-sort. The existing sort order (and therefore
  // placePosters' own layout logic — sortWall, startWall, gapPosition,
  // all untouched) stays exactly as computed; only WHICH element is
  // treated as "first" changes. If the target movie isn't in the
  // fetched list at all (deleted, filtered out, fetch limit cut it off),
  // the list is returned completely unchanged — a missing start point is
  // never worse than the plain, unrotated default.
  function rotateMoviesToStart(movies, startItemId) {
    if (!startItemId) return movies;
    const idx = movies.findIndex((m) => m.Id === startItemId);
    if (idx <= 0) return movies;
    return movies.slice(idx).concat(movies.slice(0, idx));
  }
  // Drives the bottom-right "X / Y" counter during fetchMovies' own
  // batched loading — hides itself once the count reaches (or, given
  // Jellyfin's own documented TotalRecordCount-off-by-a-few edge cases,
  // reasonably exceeds) the known total, so it can't get stuck showing
  // forever even if that count was ever slightly off.
  function updateLoadProgress(loaded, total) {
    const el = document.getElementById('loadProgress');
    if (!total || loaded >= total) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.textContent = loaded + ' / ' + total;
  }
  function loadMovies(opts) {
    // Reuses an ALREADY-fetched list when the caller supplies one (see
    // the console's own title-search dispatch, which needs the list a
    // moment earlier anyway to compute the found movie's page position
    // — without this, every title-search command fetched the whole
    // library twice in a row for no reason). Every other existing
    // caller never sets this field, so they're unaffected and still
    // fetch fresh exactly as before.
    const moviesPromise = (opts && opts.__preloadedMovies) ? Promise.resolve(opts.__preloadedMovies) : fetchMovies(opts, updateLoadProgress);
    return moviesPromise.then((movies) => {
      updateLoadProgress(0, 0); // safety net — always ends hidden, regardless of the last batch's own exact numbers
      if (opts && opts.smartLaunchStartItemId) {
        // Rotates the target to the front of the FULL list — no
        // truncation anymore (fetchMovies always returns everything
        // now), so Poster Page navigation still has the complete,
        // correctly-ordered library to slice from afterward. Page 0
        // (posterPageStartIndex = 0, set below) naturally starts AT the
        // rotated target either way.
        movies = rotateMoviesToStart(movies, opts.smartLaunchStartItemId);
      }
      closeContextMenuImmediate();
      postersGroup.children.forEach((old) => disposePosterGroup(old)); // dispose the PREVIOUS movie's posters (textures are cache-shared and untouched by this)
      postersGroup.clear();
      lastLoadedMovies = movies; lastLoadedOpts = opts;
      // Mirrors the panelApply click handler's own identical pattern
      // (its own "Movie Search" branch, further down in this same
      // file) — moviePageStartOverride, when set, points at a specific
      // movie's TRUE position in the sorted library (Kiosk Movie
      // Search / the console's own title search) rather than the
      // usual "always page 1" default every other caller relies on.
      // Consumed (reset to null) immediately after reading, so it only
      // ever affects the ONE load it was set for.
      const desiredStart = moviePageStartOverride !== null ? moviePageStartOverride : 0;
      moviePageStartOverride = null;
      const pageBounds = getPosterPageBounds(desiredStart, slotsForDepth(ROOM_DEPTH), movies.length);
      posterPageStartIndex = pageBounds.start;
      const pageMovies = movies.slice(pageBounds.start, pageBounds.end);
      const result = placePosters(scene, pageMovies, room, postersGroup, opts);
      clickablePosters = result.clickable;
      posterLights = result.lights;
      refreshInstructions(); // not the '!isLocked' guard version — this is the always-update call for a genuine state change (loading just finished / a new set of movies just replaced the old one), the same pattern already used everywhere else in this file for exactly that
      // Scoped to the currently DISPLAYED page, not the whole library —
      // these are per-poster context-menu-availability checks (enables/
      // disables Movie/Trailer/etc in that poster's own menu), only ever
      // meaningful for posters someone can actually see and click right
      // now. Checking every movie in a large library up front would be
      // pure wasted network traffic for the ones sitting on pages
      // nobody's opened yet — see switchPosterPage's own identical loop
      // for the same reasoning, run again there for whichever page gets
      // switched to.
      pageMovies.forEach((m) => { checkTrailerAvailability(m.Id); checkMovieBlocked(m.Id); });
      // Smart Launch auto-start: only meaningful together with a start
      // point (there is no single "the" movie to act on for a plain
      // library launch) — reuses the EXACT same execution path a manual
      // poster-menu click already goes through (contextMenuItem +
      // executeContextMenuAction), so this behaves identically to the
      // person actually choosing that option themselves, not a separate,
      // possibly-diverging code path. Searches the FULL list, not just
      // the displayed page — harmless either way (the target is always
      // on page 0 after rotation above), but correct even if that ever
      // stopped being true for some future reason.
      if (opts && opts.smartLaunchStartItemId && opts.smartLaunchAutoPlay && opts.smartLaunchAutoPlay !== 'none') {
        const target = movies.find((m) => m.Id === opts.smartLaunchStartItemId);
        if (target) {
          contextMenuItem = target;
          contextMenuUrl = null;
          executeContextMenuAction(opts.smartLaunchAutoPlay);
        }
      }
    }).catch((err) => {
      updateLoadProgress(0, 0); // a mid-batch failure shouldn't leave the counter stuck showing
      console.error('Cinema: failed to load movies —', err);
    });
  }
  fetchFilterOptions().then((options) => {
    msDynamicOptions.Genres = options.genres.map((g) => ({ value: g, label: g }));
    msDynamicOptions.OfficialRatings = options.ratings.map((r) => ({ value: r, label: r }));
    msDynamicOptions.Tags = options.tags.map((t) => ({ value: t, label: t }));
    msDynamicOptions.Years = options.years.map((y) => ({ value: String(y), label: String(y) }));
    msDynamicOptions.Studios = options.studios.map((s) => ({ value: s, label: s }));
    msDynamicOptions.Collections = options.collections.map((c) => ({ value: c.id, label: c.name }));
    updateAllMsSummaries();
  }).catch(() => {});
  document.getElementById('panelApply').addEventListener('click', async () => {
    const applyBtn = document.getElementById('panelApply');
    const movieInput = document.getElementById('movieInput');
    const movieName = movieInput.value.trim();
    let movies, opts;
    if (movieName) {
      // Movie search — mutually exclusive with every other filter (see
      // updateFilterMovieExclusion), so opts deliberately carries NONE of
      // them: the fetch below is Sort-only, against the WHOLE library.
      // Deliberately NOT rotated to the front (an earlier version did,
      // via rotateMoviesToStart) — that made the found movie always
      // land on slot 1, but wrapped everything BEFORE it in sort order
      // to the very end, which meant Previous Page from there had
      // nothing to show (already "page 1" by construction) even though
      // the rest of the untouched library — there's no active filter
      // narrowing it — genuinely still exists on either side. Landing
      // the movie at its own TRUE position in the sorted library instead
      // keeps Previous/Next Page both meaningfully pageable in both
      // directions, same as any other unfiltered browse.
      let movieId = acSelectedMovieId;
      if (!movieId) movieId = await findMovieId(movieName).catch(() => '');
      if (!movieId) {
        flashNoMatch(movieInput);
        return;
      }
      opts = {
        sort: document.getElementById('sortSelect').value + ':' + document.getElementById('sortDirSelect').value,
        layout: document.getElementById('layoutSelect').value,
        startWall: document.getElementById('startWallSelect').value,
        repeatMode: document.getElementById('repeatModeSelect').value,
        gapPosition: document.getElementById('gapPositionSelect').value,
      };
      applyBtn.disabled = true;
      try {
        movies = await fetchMovies(opts, updateLoadProgress);
      } catch (err) {
        movies = [];
      }
      updateLoadProgress(0, 0);
      applyBtn.disabled = false;
      if (!movies.length) {
        flashNoMatch(movieInput);
        return;
      }
      const movieIndex = movies.findIndex((m) => m.Id === movieId);
      // Genuinely shouldn't happen (movieId just came from THIS SAME
      // fetch's own candidate set moments ago) — falls back to page 1
      // rather than silently doing nothing if it somehow ever does.
      moviePageStartOverride = movieIndex >= 0 ? movieIndex : 0;
      movieSearchHighlightId = movieId;
      movieInput.classList.remove('invalid');
    } else {
      const actorInput = document.getElementById('actorInput');
      const actorName = actorInput.value.trim();
      let personId = acSelectedPersonId;
      if (!personId && actorName) {
        personId = await findPersonId(actorName).catch(() => '');
      }
      if (actorName && !personId) {
        flashNoMatch(actorInput);
        return;
      }
      opts = {
        sort: document.getElementById('sortSelect').value + ':' + document.getElementById('sortDirSelect').value,
        genresList: multiSelectState.Genres,
        ratingsList: multiSelectState.OfficialRatings,
        tagsList: multiSelectState.Tags,
        yearsList: multiSelectState.Years,
        filtersList: multiSelectState.Filters,
        featuresList: multiSelectState.Features,
        videoTypesList: multiSelectState.VideoTypes.map((v) => VIDEOTYPE_OPTIONS.find((o) => o.value === v)).filter(Boolean),
        studiosList: multiSelectState.Studios,
        collectionIdsList: multiSelectState.Collections,
        personId: personId,
        layout: document.getElementById('layoutSelect').value,
        startWall: document.getElementById('startWallSelect').value,
        repeatMode: document.getElementById('repeatModeSelect').value,
        gapPosition: document.getElementById('gapPositionSelect').value,
      };
      applyBtn.disabled = true;
      try {
        movies = await fetchMovies(opts, updateLoadProgress);
      } catch (err) {
        movies = [];
      }
      updateLoadProgress(0, 0); // safety net, same reasoning as loadMovies' own identical line
      applyBtn.disabled = false;
      if (!movies.length) {
        const activeMsFields = Object.keys(MULTI_SELECT_FIELDS).filter((id) => multiSelectState[MULTI_SELECT_FIELDS[id].key].length > 0);
        activeMsFields.forEach(flashNoMatchMs);
        return;
      }
      actorInput.classList.remove('invalid');
    }
    closePanel();
    requestPointerLockDeferred();
    closeContextMenuImmediate();
    postersGroup.children.forEach((old) => disposePosterGroup(old)); // dispose the PREVIOUS movie's posters (textures are cache-shared and untouched by this)
    postersGroup.clear();
    lastLoadedMovies = movies; lastLoadedOpts = opts;
    // A changed filter/sort means the whole ordering is different —
    // whatever page you were previously on has no real correspondence
    // in the new list, so this always resets back to the start rather
    // than trying to preserve a position that wouldn't mean anything
    // anymore. Movie Search is the one exception: moviePageStartOverride
    // (set moments ago, right above) points at the found movie's own
    // TRUE position in the sorted library instead of page 1 — reset to
    // null right after being read here, so every OTHER apply (a normal
    // filter/actor search) goes back to the usual "always page 1" rule.
    const desiredStart = moviePageStartOverride !== null ? moviePageStartOverride : 0;
    moviePageStartOverride = null;
    const pageBounds = getPosterPageBounds(desiredStart, slotsForDepth(ROOM_DEPTH), movies.length);
    posterPageStartIndex = pageBounds.start;
    const pageMovies = movies.slice(pageBounds.start, pageBounds.end);
    const result = placePosters(scene, pageMovies, room, postersGroup, opts);
    clickablePosters = result.clickable;
    posterLights = result.lights;
    refreshInstructions(); // not the '!isLocked' guard version — this is the always-update call for a genuine state change (loading just finished / a new set of movies just replaced the old one), the same pattern already used everywhere else in this file for exactly that
  });
  function flashNoMatch(el) {
    const original = el.value;
    el.classList.add('invalid');
    el.value = 'No match';
    setTimeout(() => { el.value = original; }, 900);
  }
  function flashNoMatchMs(fieldId) {
    const el = document.getElementById(fieldId);
    el.classList.add('invalid');
    setTimeout(() => { el.classList.remove('invalid'); }, 900);
  }
  document.getElementById('actorInput').addEventListener('input', () => {
    const actorInputEl = document.getElementById('actorInput');
    actorInputEl.classList.remove('invalid');
    acSelectedPersonId = '';
    updateFilterMovieExclusion('filter');
    clearTimeout(acDebounceTimer);
    const term = actorInputEl.value.trim();
    if (term.length < 1) { acClose(); return; }
    acDebounceTimer = setTimeout(() => acSearch(term, 'person'), 300);
  });
  document.getElementById('movieInput').addEventListener('input', () => {
    const movieInputEl = document.getElementById('movieInput');
    movieInputEl.classList.remove('invalid');
    acSelectedMovieId = '';
    updateFilterMovieExclusion('movie');
    clearTimeout(acDebounceTimer);
    const term = movieInputEl.value.trim();
    if (term.length < 1) { acClose(); return; }
    acDebounceTimer = setTimeout(() => acSearch(term, 'movie'), 300);
  });
  // ---- Smart Launch, applied ----
  // Turns the detected launchContext into the SAME opts object the
  // existing "Load Movies" flow already understands (genresList,
  // studiosList, tagsList, personId, filtersList) — no new filtering
  // mechanism, just feeding the ones that already work. Genre/Studio
  // only give us an ID from the URL, but the Kiosk's own filter system
  // expects NAMES (it matches against Jellyfin's Genres/Studios query
  // params by name) — so those two need one extra lookup first. Tag and
  // Person already work directly: a Jellyfin tag URL param IS the tag's
  // actual name, and the Kiosk already accepts a raw person ID as-is.
  // Any failure (network hiccup, since-deleted genre, etc.) falls back
  // to an empty object — Cinema starts with its normal default view
  // rather than getting stuck, exactly like launchContext being absent.
  function mergeUnique(base, extra) {
    if (!extra || !extra.length) return base;
    const set = new Set(base || []);
    extra.forEach((v) => set.add(v));
    return Array.from(set);
  }
  async function buildSmartLaunchOpts() {
    if (!launchContext || !launchContext.kind) return {};
    let baseOpts = {};
    try {
      if (launchContext.kind === 'genre') {
        const data = await jfGet('/Users/' + session.userId + '/Items/' + launchContext.id, {});
        baseOpts = data && data.Name ? { genresList: [data.Name] } : {};
      } else if (launchContext.kind === 'studio') {
        const data = await jfGet('/Users/' + session.userId + '/Items/' + launchContext.id, {});
        baseOpts = data && data.Name ? { studiosList: [data.Name] } : {};
      } else if (launchContext.kind === 'tag') {
        baseOpts = launchContext.tag ? { tagsList: [launchContext.tag] } : {};
      } else if (launchContext.kind === 'person') {
        baseOpts = launchContext.id ? { personId: launchContext.id } : {};
      } else if (launchContext.kind === 'favorites') {
        baseOpts = { filtersList: ['IsFavorite'] };
      } else if (launchContext.kind === 'collection') {
        // fetchCollectionMovieIds already expects a raw BoxSet id
        // directly — no name lookup needed here, unlike Genre/Studio.
        baseOpts = launchContext.id ? { collectionIdsList: [launchContext.id] } : {};
      }
      // 'movies' (general library view) and 'moviesDetail' (a movie's own
      // detail page, backtracking to the general library with just that
      // movie as the starting point — see startItemId below) both have
      // no base filter of their own at all — the plain default already
      // IS the general library.
    } catch (err) {
      baseOpts = {};
    }
    // Sort/Filter carry-over layers ON TOP of whatever the kind itself
    // already set — e.g. a Genre view that ALSO had extra Years/Ratings
    // filters applied within it. Array-based filters are merged
    // (deduplicated), never simply overwritten, so a kind-specific
    // filter (like the resolved Genre name itself) is never silently
    // dropped by an overlapping extra filter of the same type.
    if (launchContext.sortBy) baseOpts.sort = launchContext.sortBy + ':' + (launchContext.sortOrder || 'Ascending');
    if (launchContext.extraGenres) baseOpts.genresList = mergeUnique(baseOpts.genresList, launchContext.extraGenres);
    if (launchContext.extraTags) baseOpts.tagsList = mergeUnique(baseOpts.tagsList, launchContext.extraTags);
    if (launchContext.extraYears) baseOpts.yearsList = mergeUnique(baseOpts.yearsList, launchContext.extraYears);
    if (launchContext.extraRatings) baseOpts.ratingsList = mergeUnique(baseOpts.ratingsList, launchContext.extraRatings);
    if (launchContext.extraFilters) baseOpts.filtersList = mergeUnique(baseOpts.filtersList, launchContext.extraFilters);
    if (launchContext.extraFeatures) baseOpts.featuresList = mergeUnique(baseOpts.featuresList, launchContext.extraFeatures);
    if (launchContext.extraVideoTypes) {
        // fetchMovies expects videoTypesList as the FULL option objects
        // (matching VIDEOTYPE_OPTIONS' own {value,label,param,paramValue}
        // shape), not plain value strings — launchContext only carries
        // the plain tokens ('hd','4k',...), so they're looked up here
        // the exact same way the manual "Load Movies" button already
        // does for its own selections.
        const resolvedVideoTypes = launchContext.extraVideoTypes
            .map((v) => VIDEOTYPE_OPTIONS.find((o) => o.value === v))
            .filter(Boolean);
        if (resolvedVideoTypes.length) {
            const existingValues = new Set((baseOpts.videoTypesList || []).map((o) => o.value));
            resolvedVideoTypes.forEach((o) => { if (!existingValues.has(o.value)) { existingValues.add(o.value); (baseOpts.videoTypesList = baseOpts.videoTypesList || []).push(o); } });
        }
    }
    // Populated by either the library scroll-position case or the
    // movie-detail-page backtrack case — loadMovies rotates the Wall to
    // start there once fetched.
    if (launchContext.startItemId) baseOpts.smartLaunchStartItemId = launchContext.startItemId;
    if (launchContext.autoPlay) baseOpts.smartLaunchAutoPlay = launchContext.autoPlay;
    return baseOpts;
  }
  // Mirrors whatever Smart Launch resolved back into the Kiosk's OWN
  // settings state (multiSelectState) and its sort/direction dropdowns —
  // not just silently applied to the one fetch. Opening the settings
  // panel afterwards should show exactly what's currently active
  // (msSummaryText reads multiSelectState fresh every time it's called,
  // so no extra refresh trigger is needed here — just set the state).
  // Person is the one exception: the Kiosk's own UI for it is a plain
  // text search field (actorInput) + a resolved id (acSelectedPersonId),
  // not a multi-select — so it needs its own resolved NAME, via the same
  // kind of lookup Genre/Studio already do.
  async function applySmartLaunchToKioskUi(opts, ctx) {
    if (opts.genresList) multiSelectState.Genres = opts.genresList.slice();
    if (opts.studiosList) multiSelectState.Studios = opts.studiosList.slice();
    if (opts.tagsList) multiSelectState.Tags = opts.tagsList.slice();
    // Collections' own multi-select stores IDs as its value (unlike
    // Genre/Studio/Tag, where value and label are simply the same
    // string) — msDynamicOptions.Collections already pairs each id with
    // its display name (populated by fetchFilterOptions elsewhere), so
    // mirroring the id straight into multiSelectState here is already
    // enough for the summary text to resolve and show the real name,
    // exactly like any other dropdown — no separate name lookup needed,
    // unlike Person below (whose own UI is a plain text field with no
    // such id/label pairing to fall back on).
    if (opts.collectionIdsList) multiSelectState.Collections = opts.collectionIdsList.slice();
    if (opts.yearsList) multiSelectState.Years = opts.yearsList.slice();
    if (opts.ratingsList) multiSelectState.OfficialRatings = opts.ratingsList.slice();
    if (opts.filtersList) multiSelectState.Filters = opts.filtersList.slice();
    if (opts.featuresList) multiSelectState.Features = opts.featuresList.slice();
    if (opts.videoTypesList) multiSelectState.VideoTypes = opts.videoTypesList.map((o) => o.value);
    if (opts.sort) {
      const [sortByVal, sortOrderVal] = opts.sort.split(':');
      const sortSelectEl = document.getElementById('sortSelect');
      const sortDirSelectEl = document.getElementById('sortDirSelect');
      // Jellyfin Web stores COMPOUND sort keys (e.g.
      // "PremiereDate,SortName,ProductionYear" from movies.js, or
      // "ProductionYear,PremiereDate,SortName" for Genre/Studio/Person/
      // Tag's own "Release Date" option — confirmed straight from
      // list.js's sort menu definitions) — the FIRST field isn't always
      // one Cinema's own dropdown actually has (it has "PremiereDate"
      // but not "ProductionYear"). The real fetch (buildSmartLaunchOpts,
      // elsewhere) still gets the FULL compound value regardless —
      // Jellyfin's own API handles that correctly either way — this
      // only concerns which single field the DROPDOWN can show. Rather
      // than always taking the first segment, this walks the segments in
      // order and uses the first one that's actually a real option in
      // Cinema's own sortSelect — falling back to the first segment only
      // if literally none of them match anything (dropdown just stays at
      // its previous value, same as before).
      let primarySortBy = sortByVal;
      if (sortByVal && sortSelectEl) {
        const validSortValues = Array.from(sortSelectEl.options).map((o) => o.value);
        const segments = sortByVal.split(',');
        primarySortBy = segments.find((seg) => validSortValues.includes(seg)) || segments[0];
      }
      if (primarySortBy && sortSelectEl) sortSelectEl.value = primarySortBy;
      if (sortOrderVal && sortDirSelectEl) sortDirSelectEl.value = sortOrderVal;
    }
    if (opts.personId && ctx && ctx.kind === 'person') {
      try {
        const data = await jfGet('/Users/' + session.userId + '/Items/' + opts.personId, {});
        if (data && data.Name) {
          acSelectedPersonId = opts.personId;
          const actorInputEl = document.getElementById('actorInput');
          if (actorInputEl) actorInputEl.value = data.Name;
        }
      } catch (err) { /* Kiosk UI just won't show a name — the fetch itself already has the id regardless */ }
    }
  }
  (async () => {
    const smartOpts = await buildSmartLaunchOpts();
    await applySmartLaunchToKioskUi(smartOpts, launchContext);
    loadMovies({
      sort: MENU_CONFIG.kiosk.search.sortBy.default + ':' + MENU_CONFIG.kiosk.search.sortOrder.default,
      layout: MENU_CONFIG.kiosk.search.sortWall.default,
      startWall: MENU_CONFIG.kiosk.search.startWall.default,
      repeatMode: MENU_CONFIG.kiosk.search.repeatMode.default,
      gapPosition: MENU_CONFIG.kiosk.search.gapPosition.default,
      ...smartOpts,
    });
  })();
})();
<\/script>
</body></html>`;
    }
    // ---- Smart Launch: detect the current Jellyfin Web view ---- 
    // The simple cases (Genre/Studio/Tag/Person-list/Favorites/Movies)
    // resolve purely from the URL hash, no network call at all.
    // Collection/Person/Movie detail pages need one lookup to know which
    // of the three a '#/details?id=X' page actually is. Sort/Filter
    // carry-over (further below) is its own separate, best-effort step.
    // Maps each detectable "kind" to the SMART_LAUNCH_CONFIG key that
    // must be true for it to be allowed through — kept as one small
    // table instead of an if/else per kind, so adding a new kind later
    // (Collections, Persons-detail-page, etc.) only needs one new entry
    // here, not a repeated enabled-check scattered through the function.
    const SMART_LAUNCH_KIND_TO_CATEGORY = {
        genre: 'genres',
        studio: 'studios',
        tag: 'tags',
        person: 'persons',
        favorites: 'favorites',
        movies: 'movies',
        moviesDetail: 'moviesDetail',
        collection: 'collections',
    };
    // Detail-View cases (Collection/Person/Movie, all sharing the
    // '#/details?id=X' shape) need one extra lookup — there's no
    // query-string signal at all for which of the three a details page
    // is actually showing. This is why detection is async: the simple,
    // URL-only cases still resolve instantly with no network round trip;
    // only a details-page URL needs one.
    // Finds whichever movie card is topmost-leftmost among the ones
    // actually visible in the current browser viewport — Jellyfin Web
    // marks each library card with '.card[data-id]' (confirmed from the
    // existing keyboard-navigation reference script), so this needs no
    // guessing at selectors. Only cards genuinely on-screen count (a
    // negative or off-bottom position is excluded) — this deliberately
    // reads "where the person is currently looking", not just "the
    // first card in DOM order", which could be scrolled far out of view.
    function detectTopLeftVisibleCard() {
        // FULLY visible only — a card whose edge is cut off by the
        // viewport (scrolled halfway out at the top, or partially
        // hidden behind a sticky header) does NOT count, even if it
        // would otherwise be the topmost-left one. Only genuinely
        // whole, uncropped cards are eligible.
        const cards = Array.from(document.querySelectorAll('.card[data-id]'));
        let best = null, bestTop = Infinity, bestLeft = Infinity;
        for (const card of cards) {
            // Jellyfin Web's OWN base .card class isn't exclusive to
            // media items — its tab buttons and (per live testing) some
            // other, narrow UI elements carry the exact same class,
            // just without ever being a real poster card. Confirmed
            // straight from Jellyfin Web's own card.scss: a genuine
            // media card always nests a .cardBox wrapping a
            // .cardImageContainer — this is the real structural
            // signature every actual poster card has, that a stray tab/
            // nav element sharing the base class never does. Checked
            // FIRST, before any geometry at all, since it's the
            // cheapest and most decisive filter.
            if (!card.querySelector('.cardBox') || !card.querySelector('.cardImageContainer')) continue;
            const rect = card.getBoundingClientRect();
            // Jellyfin Web virtualizes large grids — cards scrolled well
            // out of view are often still present in the DOM but
            // display:none'd rather than removed, which collapses their
            // rect to (0,0,0,0). Without this check that zero-rect reads
            // as "fully visible at the very top-left corner" (0 is
            // neither negative nor past either boundary) and can win
            // over the genuinely visible card it's being compared
            // against — explaining an inconsistent pick between runs,
            // since WHICH cards happen to be virtualized at any given
            // moment varies with scroll history.
            if (rect.width === 0 || rect.height === 0) continue; // collapsed/hidden — not actually visible at all
            if (rect.top < 0 || rect.bottom > window.innerHeight) continue; // cropped top/bottom — not fully visible
            if (rect.left < 0 || rect.right > window.innerWidth) continue; // cropped left/right — not fully visible
            // Being geometrically within the window's own dimensions
            // isn't the same as being genuinely ON SCREEN for the
            // person looking at it — Jellyfin Web has a fixed header
            // (search bar, this very button) sitting ON TOP of the
            // scrolling content, so a card can sit at a small, in-bounds
            // top coordinate and STILL be entirely hidden behind that
            // header. Whatever card happens to land closest to the top
            // of the page after any given scroll is exactly the one
            // most likely to be covered this way — consistently
            // producing "the very first movie" (or whichever one always
            // ends up nearest the top) regardless of where the person
            // actually scrolled to. Verified properly here: ask the
            // browser directly which element is really topmost AT that
            // screen coordinate, rather than trusting raw geometry.
            const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
            const elAtCenter = document.elementFromPoint(cx, cy);
            if (!elAtCenter || !(elAtCenter === card || card.contains(elAtCenter))) continue; // covered by something else at its own center — not really visible
            if (rect.top < bestTop - 1 || (Math.abs(rect.top - bestTop) <= 1 && rect.left < bestLeft)) {
                best = card; bestTop = rect.top; bestLeft = rect.left;
            }
        }
        return best ? best.getAttribute('data-id') : null;
    }
    async function detectSmartLaunchContext(apiClient) {
        // The master switch — if it's off, Smart Launch is completely
        // inert, regardless of what any individual category checkbox
        // says. Checked FIRST, before any URL parsing (or network call)
        // even happens.
        if (!SMART_LAUNCH_CONFIG.enabled.default) return null;
        const hash = window.location.hash || '';
        const queryString = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
        const params = new URLSearchParams(queryString);
        const genreId = params.get('genreId');
        const studioId = params.get('studioId');
        const tag = params.get('tag');
        const personId = params.get('personId');
        const type = params.get('type');
        const isFavorite = params.get('IsFavorite') || params.get('isFavorite');
        const collectionType = params.get('collectionType');
        const detailsId = params.get('id');
        let result = null;
        if (genreId) result = { kind: 'genre', id: genreId };
        else if (studioId) result = { kind: 'studio', id: studioId };
        else if (tag) result = { kind: 'tag', tag: tag };
        else if (personId && type === 'Movie') result = { kind: 'person', id: personId };
        else if (isFavorite === 'true' && type === 'Movie') result = { kind: 'favorites' };
        else if (/collectionType=movies\b/i.test(hash) || collectionType === 'movies') {
            result = { kind: 'movies' };
        }
        // Scroll-position starting point — whichever card is currently
        // FULLY visible, topmost-leftmost, on screen becomes the Poster
        // Wall's own starting point, resuming roughly where scrolling
        // left off rather than always restarting from the first item.
        // Applies to every one of the sortable/filterable, genuinely
        // scrollable card-grid views above (genre/studio/tag/person-
        // movies/favorites/movies) — NOT the pure Person profile page or
        // Collection detail page below, since neither is a scrollable
        // movie grid to begin with, and NOT the movie-detail "backtrack"
        // case further down, which already has its own specific
        // starting movie for a different reason entirely.
        if (result && SMART_LAUNCH_CONFIG.scroll.default) {
            // No artificial delay here — an earlier attempt added one
            // (up to a flat 3 seconds) suspecting a timing/repositioning
            // race, but the REAL cause turned out to be something else
            // entirely (fetchMovies' own display limit silently cutting
            // off the target movie in large libraries — fixed
            // separately, see fetchMovies/loadMovies). The delay was
            // never actually the fix; it's removed now that the true
            // cause is addressed directly.
            const startId = detectTopLeftVisibleCard();
            if (startId) result.startItemId = startId;
        }
        if (!result && /^#\/details\b/i.test(hash) && detailsId) {
            // Collection, Person, and Movie detail pages all resolve
            // here — the Movie branch below is the "backtrack" case:
            // steps back to the general library view with this movie as
            // the Wall's own starting point (see further down).
            // A raw REST call, not an unconfirmed ApiClient convenience
            // method — same /Users/{userId}/Items/{id} shape already
            // proven to work everywhere else this script talks to
            // Jellyfin, built from the same serverAddress/accessToken
            // pieces session itself already uses just above.
            try {
                const userId = apiClient.getCurrentUserId();
                const url = apiClient.serverAddress() + '/Users/' + userId + '/Items/' + detailsId + '?api_key=' + apiClient.accessToken();
                const res = await fetch(url);
                const item = res.ok ? await res.json() : null;
                if (item && item.Type === 'BoxSet') result = { kind: 'collection', id: detailsId };
                else if (item && item.Type === 'Person') result = { kind: 'person', id: detailsId };
                else if (item && item.Type === 'Movie') {
                    // The backtrack case: a movie's OWN detail page steps
                    // back to the general library view, with this movie
                    // itself as the Wall's own starting point. Deliberately
                    // its OWN distinct kind, NOT the plain 'movies' one —
                    // a details page has no reliable way to know which of
                    // several possible prior list views (each potentially
                    // sorted/filtered differently) it was actually reached
                    // from, so no attempt is made to guess or carry one
                    // over (that's what SORT_FILTER_ELIGIBLE further down
                    // gates on kind for — 'moviesDetail' is deliberately
                    // NOT in that list). Continues with Cinema's own
                    // default sort instead, same as a plain fresh launch.
                    result = { kind: 'moviesDetail', startItemId: detailsId };
                    // Only meaningful alongside startItemId (a fresh
                    // library launch has no single movie to act on) —
                    // Cinema checks this ONLY once it has actually
                    // rotated the Wall to this exact movie.
                    if (SMART_LAUNCH_CONFIG.autoPlay.default && SMART_LAUNCH_CONFIG.autoPlay.default !== 'none') {
                        result.autoPlay = SMART_LAUNCH_CONFIG.autoPlay.default;
                    }
                }
            } catch (err) { result = null; }
        }
        if (!result) return null;
        // A detected kind whose OWN category checkbox is off is treated
        // exactly like no detection at all — Cinema falls back to its
        // normal default start, not a half-applied Smart Launch.
        const categoryKey = SMART_LAUNCH_KIND_TO_CATEGORY[result.kind];
        if (categoryKey && !SMART_LAUNCH_CONFIG[categoryKey].default) return null;
        // ---- Sort/Filter carry-over — only for the list.html-style ----
        // ---- kinds that actually HAVE a sort/filter context at all ----
        // 'collection' and 'person' (detail-page variant) come from a
        // details page, not a list view — there is nothing to carry over
        // for those, so they're deliberately skipped here.
        const SORT_FILTER_ELIGIBLE = { genre: true, studio: true, tag: true, favorites: true, movies: true, person: true };
        if (SORT_FILTER_ELIGIBLE[result.kind]) {
            // Confirmed against Jellyfin Web's own source, cross-checked
            // on BOTH master and release-10.10.z (matches the person's
            // actual server version) — identical in both: sort/filter
            // state for a library view is saved to localStorage under
            //   {userId}-{topParentId}-{mode}          -> sort, JSON {SortBy, SortOrder}
            //   {userId}-{topParentId}-{mode}-filter    -> filters, JSON {Genres, Years, ...}
            // Filters are NEVER synced to the server at all (explicit
            // enableOnServer=false in userSettings.js) — a server-side
            // lookup could never have found them, whatever shape it took.
            // The exact literal 'mode' string per view/tab isn't
            // confirmed (that lives in router/tab config we haven't
            // seen) — rather than guess specific literals, this scans
            // every localStorage key with the right {userId}-{topParentId}-
            // prefix and uses the first one that actually parses to
            // sort/filter data, whatever its mode suffix turns out to be.
            const topParentId = params.get('parentId') || params.get('topParentId');
            const userId = apiClient.getCurrentUserId();
            function readExactLsQuerySettings(mode) {
                try {
                    const base = userId + '-' + topParentId + '-' + mode;
                    const sortRaw = localStorage.getItem(base);
                    const filterRaw = localStorage.getItem(base + '-filter');
                    return {
                        sortObj: sortRaw ? JSON.parse(sortRaw) : null,
                        filterObj: filterRaw ? JSON.parse(filterRaw) : null,
                    };
                } catch (err) { return { sortObj: null, filterObj: null }; }
            }
            // Only used as a LAST resort for the general Movies view,
            // whose exact mode literal isn't confirmed — deliberately
            // excludes any key ending in '-favorites' so a scan run
            // while actually viewing Movies never accidentally picks up
            // the person's separately-stored Favorites sort/filter
            // instead (both live under the same topParentId, differing
            // only by mode suffix).
            function scanLsQuerySettingsExcluding(excludeModes) {
                if (!topParentId) return { sortObj: null, filterObj: null };
                const prefix = userId + '-' + topParentId + '-';
                try {
                    for (let i = 0; i < localStorage.length; i++) {
                        const storageKey = localStorage.key(i);
                        if (!storageKey || !storageKey.startsWith(prefix) || storageKey.endsWith('-filter') || storageKey.endsWith('-view')) continue;
                        if (excludeModes.some((m) => storageKey === prefix + m)) continue;
                        let sortObj = null;
                        try { sortObj = JSON.parse(localStorage.getItem(storageKey)); } catch (err) { continue; }
                        if (!sortObj || !sortObj.SortBy) continue;
                        let filterObj = null;
                        try { filterObj = JSON.parse(localStorage.getItem(storageKey + '-filter')); } catch (err) { /* fine, filters just stay empty */ }
                        return { sortObj, filterObj };
                    }
                } catch (err) { /* localStorage unavailable in this shape */ }
                return { sortObj: null, filterObj: null };
            }
            // Shared by Favorites AND Genre/Studio/Person/Tag — confirmed
            // against list.js's own ItemsView.getSettingsKey(): a
            // list.html-style view's storage key is built from literal
            // WORD FRAGMENTS ('items', the type, then a flag word per
            // active filter like 'Genre'/'Studio'/'Person'/'IsFavorite'),
            // not the library id — e.g. the Favorites URL the person
            // actually tested with (list.html?type=Movie&IsFavorite=true,
            // no parentId at all) resolves to "items-Movie-IsFavorite".
            // ALL genres (or all favorites-views) sharing ONE key is
            // Jellyfin Web's own design, not a bug here. Sort is two
            // PLAIN string keys (getSortValuesLegacy: '-sortby' /
            // '-sortorder'), not one JSON blob. Tags have no dedicated
            // flag at all — type=tag itself is what differentiates them.
            function computeListJsSettingsKey(kind) {
                const typeParam = params.get('type');
                const keyParts = ['items'];
                if (typeParam) keyParts.push(typeParam);
                else if (topParentId) keyParts.push(topParentId);
                if (params.get('IsFavorite')) keyParts.push('IsFavorite');
                if (kind === 'genre') keyParts.push('Genre');
                if (kind === 'studio') keyParts.push('Studio');
                if (kind === 'person') keyParts.push('Person');
                if (topParentId) keyParts.push('Folder');
                return keyParts.join('-');
            }
            function readListJsQuerySettings(kind) {
                const settingsKey = computeListJsSettingsKey(kind);
                const out = { sortObj: null, filterObj: null };
                try {
                    const sortByRaw = localStorage.getItem(userId + '-' + settingsKey + '-sortby');
                    const sortOrderRaw = localStorage.getItem(userId + '-' + settingsKey + '-sortorder');
                    if (sortByRaw) out.sortObj = { SortBy: sortByRaw, SortOrder: sortOrderRaw === 'Descending' ? 'Descending' : 'Ascending' };
                    // list.js stores each filter as its OWN flat key
                    // ('{key}-filter-IsPlayed', '{key}-filter-HasSubtitles',
                    // etc — confirmed directly from list.js's own
                    // getFilterQuery-style reads), unlike Movies/Favorites'
                    // single combined 'Filters' string. Synthesized here
                    // into the SAME shape movies.js's JSON blob already
                    // uses (a joined Filters string, plus the individual
                    // Has*/Is*/VideoTypes fields) so the rest of this
                    // function can treat both sources identically,
                    // regardless of which one actually supplied them.
                    const gf = (field) => localStorage.getItem(userId + '-' + settingsKey + '-filter-' + field);
                    const filterObj = {};
                    const combinedFilters = ['IsPlayed', 'IsUnplayed', 'IsResumable', 'IsFavorite'].filter((f) => gf(f) === 'true');
                    if (combinedFilters.length) filterObj.Filters = combinedFilters.join(',');
                    ['HasSubtitles', 'HasTrailer', 'HasSpecialFeature', 'HasThemeSong', 'HasThemeVideo', 'IsHD', 'IsSD', 'Is4K', 'Is3D'].forEach((field) => {
                        const raw = gf(field);
                        if (raw != null) filterObj[field] = raw === 'true';
                    });
                    const rawVideoTypes = gf('VideoTypes');
                    if (rawVideoTypes) filterObj.VideoTypes = rawVideoTypes;
                    const rawGenreIds = gf('GenreIds');
                    if (rawGenreIds) filterObj.Genres = rawGenreIds;
                    out.filterObj = Object.keys(filterObj).length ? filterObj : null;
                } catch (err) { /* localStorage unavailable in this shape */ }
                return out;
            }
            let lsResult = { sortObj: null, filterObj: null };
            if (result.kind === 'favorites') {
                // The confirmed real URL routes through list.js, not the
                // Movies-tab mechanism — tried first. The old exact
                // 'favorites' mode lookup (movies.js-style JSON blob)
                // stays as a fallback in case some OTHER navigation path
                // to Favorites goes through the Movies tab instead.
                lsResult = readListJsQuerySettings('favorites');
                if (!lsResult.sortObj && !lsResult.filterObj && topParentId) {
                    lsResult = readExactLsQuerySettings('favorites');
                }
            } else if (topParentId && result.kind === 'movies') {
                for (const mode of ['movies', 'all', '']) {
                    const attempt = readExactLsQuerySettings(mode);
                    if (attempt.sortObj || attempt.filterObj) { lsResult = attempt; break; }
                }
                if (!lsResult.sortObj && !lsResult.filterObj) {
                    lsResult = scanLsQuerySettingsExcluding(['favorites']);
                }
            } else if (result.kind === 'genre' || result.kind === 'studio' || result.kind === 'tag' || result.kind === 'person') {
                lsResult = readListJsQuerySettings(result.kind);
            }
            if (SMART_LAUNCH_CONFIG.sort.default && lsResult.sortObj && lsResult.sortObj.SortBy) {
                result.sortBy = lsResult.sortObj.SortBy;
                if (lsResult.sortObj.SortOrder) result.sortOrder = lsResult.sortObj.SortOrder;
            }
            if (SMART_LAUNCH_CONFIG.filter.default) {
                const lsFilters = lsResult.filterObj || {};
                // localStorage values are strings straight from the API
                // query object (e.g. Genres: "Action|Comedy") — same
                // pipe/comma conventions as the URL-based fallback below,
                // so the same splitting logic applies either way.
                const extraGenres = lsFilters.Genres || params.get('Genres');
                const extraTags = lsFilters.Tags || params.get('Tags');
                const extraYears = lsFilters.Years || params.get('Years');
                const extraRatings = lsFilters.OfficialRatings || params.get('OfficialRatings');
                const extraFilters = lsFilters.Filters || params.get('Filters');
                if (extraGenres) result.extraGenres = String(extraGenres).split('|').filter(Boolean);
                if (extraTags) result.extraTags = String(extraTags).split('|').filter(Boolean);
                if (extraYears) result.extraYears = String(extraYears).split(',').filter(Boolean);
                if (extraRatings) result.extraRatings = String(extraRatings).split('|').filter(Boolean);
                if (extraFilters) result.extraFilters = String(extraFilters).split(',').filter(Boolean);
                // Features (Cinema's FEATURES_OPTIONS) — direct 1:1 field
                // names, both storage shapes agree on these exact names.
                const extraFeatures = ['HasSubtitles', 'HasTrailer', 'HasSpecialFeature', 'HasThemeSong', 'HasThemeVideo']
                    .filter((f) => lsFilters[f] === true || lsFilters[f] === 'true');
                if (extraFeatures.length) result.extraFeatures = extraFeatures;
                // Video type (Cinema's VIDEOTYPE_OPTIONS) — Jellyfin
                // splits this across separate IsHD/Is4K/Is3D booleans
                // plus a VideoTypes string (BluRay/Dvd), Cinema instead
                // uses single combined tokens ('hd','sd','4k','3d',
                // 'bluray','dvd') — translated here, not a direct field
                // rename. IsSD is a GENUINELY SEPARATE field from IsHD
                // (confirmed: userSettings.js's own allowedFilterSettings
                // lists 'IsSD' and 'IsHD' as two distinct entries) — SD
                // was previously (wrongly) INFERRED from IsHD being
                // false, which doesn't mean "SD requested" at all, just
                // "HD not requested". Reading the real IsSD field
                // directly replaces that guess with the actual signal.
                // Same rule as every other boolean filter here — only an
                // explicit true means anything; false/absent mean "no
                // preference", not "the opposite".
                const extraVideoTypes = [];
                if (lsFilters.IsHD === true || lsFilters.IsHD === 'true') extraVideoTypes.push('hd');
                if (lsFilters.IsSD === true || lsFilters.IsSD === 'true') extraVideoTypes.push('sd');
                if (lsFilters.Is4K === true || lsFilters.Is4K === 'true') extraVideoTypes.push('4k');
                if (lsFilters.Is3D === true || lsFilters.Is3D === 'true') extraVideoTypes.push('3d');
                if (lsFilters.VideoTypes) {
                    const vt = String(lsFilters.VideoTypes);
                    if (vt.includes('BluRay')) extraVideoTypes.push('bluray');
                    if (vt.includes('Dvd')) extraVideoTypes.push('dvd');
                }
                if (extraVideoTypes.length) result.extraVideoTypes = extraVideoTypes;
            }
        }
        return result;
    }
    async function openCinemaInNewTab(btn) {
        btn.classList.add('jf-cinema-loading');
        try {
            const apiClient = await waitForApiClient();
            const session = {
                serverUrl: apiClient.serverAddress(),
                accessToken: apiClient.accessToken(),
                userId: apiClient.getCurrentUserId(),
                // Real, server-recognized device id — needed so Cinema's
                // own movie playback can explicitly kill its OWN
                // previous transcode job (DELETE /Videos/ActiveEncodings)
                // before requesting a different start position. Without
                // it, Jellyfin's own transcode job lookup matches purely
                // by output path/type (confirmed in the server's own
                // TranscodingJobHelper.GetTranscodingJob source) and
                // keeps feeding the OLD, already-running job — which is
                // exactly why resume/chapter/percent silently kept
                // landing back at the start regardless of the request
                // URL's own StartTimeTicks being correct.
                deviceId: apiClient.deviceId(),
            };
            const launchContext = await detectSmartLaunchContext(apiClient);
            const html = buildCinemaHtml(session, launchContext);
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error('[Cinema]', err);
            alert('Cinema could not be opened: ' + err.message);
        } finally {
            btn.classList.remove('jf-cinema-loading');
        }
    }
    if (ccIsSupportedPlatform()) waitForHeader();
})();
