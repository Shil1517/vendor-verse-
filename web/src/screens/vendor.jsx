import { UsageMeter } from './p1-depth.jsx'
import { createContext, Fragment, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Package, CalendarCheck, FileText, IndianRupee, Plus, AlertTriangle, ChevronRight, Store, ShieldCheck, Clock, MessageCircle, Truck, Check, X, Briefcase, Building2,
  Upload, Wallet, BarChart3, Star, Settings, LogOut, MapPin, Boxes, CalendarClock, Crown, Download, Trash2, ImagePlus, Phone, TrendingUp, BadgeCheck, Minus, Info,
  LayoutDashboard, PanelLeftClose, PanelLeftOpen, Search, ChevronLeft, ChevronDown, Sun, Moon, UsersRound, MessageSquare, PackageCheck, UserRound,
} from 'lucide-react'
import { useApp } from '../store.jsx'
import { useNav } from '../nav.jsx'
import { authService } from '../services/authService.js'
import { CATS, cat, listing as findListing, calcPrice, VENDOR_TX, PAYOUTS, SLOTS, ME } from '../data.jsx'
import {
  Screen, Card, Section, Button, Thumb, Chips, Segmented, Sheet, Dialog, Input, Select, Toggle, Badge, Rating, Banner, EmptyState, Stat, KV, fmt, cx,
  Pill, IconBtn, StatusBadge, ListRow, Group, Timeline, Avatar, DocTile, Stepper, BarChart, HBar, Spark, Checkbox, Meta, SOFT, DemoPhonePePayment,
} from '../ui.jsx'
import { NotifBell } from './shared.jsx'
import { ThemeToggle } from '../components/ThemeToggle.jsx'
import { useTheme } from '../hooks/useTheme.jsx'
import { useCompany } from './biz-screens.jsx'
import { companyDone } from '../bizdata.js'

export const useMyVendor = () => {
  const { me, vendors } = useApp()
  return vendors.find((v) => v.id === me.vendorId) || null
}
const VendorWorkspaceContext = createContext(false)

const VX_CSS = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@500;600;700&display=swap');
.vx-shell { --bg:#f2fbf8; --ink:#0c2a26; --muted:#5f8279; --soft:#35625a; --line:rgba(16,150,120,.16); --glass:rgba(255,255,255,.7); --glass2:rgba(255,255,255,.9); --mint:#12b48f; --sky:#1796d6; --violet:#6a5ae0; --gold:#d89a1d; --coral:#ff7a5c; --grad:linear-gradient(135deg,#27d9ae,#0fa98a); --r-lg:30px; --r-md:24px; --ease:cubic-bezier(.2,.8,.2,1); --sw:264px; --shellbg:linear-gradient(160deg,#fafffd 0%,#eafaf4 50%,#dff6ee 100%); --orb1:#9be8d0; --orb2:#b8f0e4; --side1:rgba(255,255,255,.88); --side2:rgba(255,255,255,.62); --hi:#fff; --g85:rgba(255,255,255,.85); --g70:rgba(255,255,255,.7); --rowh:#fff; --panel1:rgba(255,255,255,.72); --panel2:rgba(255,255,255,.4); --card1:rgba(255,255,255,.95); --card2:rgba(255,255,255,.7); --cardbd:rgba(255,255,255,.9); --btnl:#fff; --btnlh:#f4fffb; --h1a:#0c2a26; --h1b:#1b6b58; --tip:#0c2a26; --tipink:#fff; --track:rgba(18,150,120,.12); --dotfill:#fff; position:relative; isolation:isolate; overflow:hidden; display:grid; grid-template-columns:var(--sw) minmax(0,1fr); gap:16px; height:100vh; padding:16px; font-family:'Plus Jakarta Sans',system-ui,sans-serif; color:var(--ink); background:var(--shellbg); transition:grid-template-columns .55s var(--ease); -webkit-font-smoothing:antialiased; }
.vx-shell.is-collapsed { --sw:76px; }
.vx-shell::before, .vx-shell::after { content:""; position:absolute; z-index:-1; border-radius:50%; filter:blur(90px); pointer-events:none; animation:vx-drift 22s ease-in-out infinite alternate; }
.vx-shell::before { width:640px; height:640px; left:-120px; top:-160px; background:radial-gradient(circle,var(--orb1),transparent 65%); opacity:.8; }
.vx-shell::after { width:720px; height:720px; right:-180px; bottom:-220px; background:radial-gradient(circle,var(--orb2),transparent 65%); opacity:.9; animation-delay:-8s; }
@keyframes vx-drift { to { transform: translate(70px,50px) scale(1.12); } }
.vx-shell button { font:inherit; cursor:pointer; }
.vx-shell :focus-visible { outline:2px solid var(--mint); outline-offset:2px; }
.vx-side { display:flex; flex-direction:column; padding:18px 12px 14px; min-height:0; overflow-x:hidden; overflow-y:auto; background:linear-gradient(180deg,var(--side1),var(--side2)); border:1px solid var(--line); border-radius:var(--r-lg); backdrop-filter:blur(28px) saturate(150%); -webkit-backdrop-filter:blur(28px) saturate(150%); box-shadow:inset 0 1px 0 var(--hi), 0 24px 50px rgba(20,120,95,.12); }
.vx-brand { display:flex; align-items:center; gap:11px; padding:2px 8px 10px; transition:padding .5s var(--ease), gap .5s var(--ease); }
.vx-logo { flex:none; width:40px; height:40px; border-radius:14px; display:grid; place-items:center; background:var(--grad); color:#fff; font:800 20px Sora, sans-serif; box-shadow: 0 8px 22px rgba(18,180,143,.35); transition:transform .45s var(--ease); }
.vx-logo:hover { transform: rotate(14deg) scale(1.08); }
.vx-bt { display:flex; flex-direction:column; gap:2px; }
.vx-bt b { display:block; font:700 13.5px Sora, sans-serif; }
.vx-bt small { font-size:10.5px; color:var(--muted); }
.vx-nav { position:relative; display:flex; flex-direction:column; }
.vx-group { font-size:10px; font-weight:700; letter-spacing:.03em; color:var(--muted); opacity:.85; padding:16px 12px 6px; white-space:nowrap; overflow:hidden; transition:padding .5s var(--ease), font-size .4s, color .3s; }
.vx-pill { position:absolute; left:0; right:0; top:0; z-index:0; border-radius:14px; opacity:0; pointer-events:none; background:var(--grad); box-shadow:0 10px 24px rgba(18,180,143,.35); transition:transform .55s var(--ease), height .45s var(--ease), opacity .3s; }
.vx-nav-item { position:relative; z-index:1; display:flex; align-items:center; gap:11px; width:100%; padding:10px 12px; border-radius:14px; border:0; background:none; text-align:left; white-space:nowrap; font-size:12.5px; font-weight:600; color:var(--soft); transition:background .2s, color .25s, padding .5s var(--ease), gap .5s var(--ease); }
.vx-nav-item:hover { background:rgba(18,180,143,.09); color:var(--ink); }
.vx-nav-item svg { flex:none; opacity:.8; transition:transform .3s var(--ease), color .3s; }
.vx-nav-item:hover svg { transform: scale(1.15); }
.vx-nav-item.is-active, .vx-nav-item.is-active:hover { background:none; color:#fff; }
.vx-nav-item.is-active svg { opacity:1; color:#fff; }
.vx-lbl { display:inline-block; max-width:170px; overflow:hidden; white-space:nowrap; transition:max-width .5s var(--ease), opacity .3s; }
.vx-badge { margin-left:auto; min-width:20px; height:20px; padding:0 6px; border-radius:10px; display:grid; place-items:center; font-size:10px; font-weight:700; background:rgba(18,180,143,.14); color:#0b7d63; }
.is-active .vx-badge { background:#fff; }
.vx-plan { margin:auto 4px 0; padding:14px; border-radius:18px; white-space:nowrap; overflow:hidden; background:rgba(18,180,143,.08); border:1px solid var(--line); font-size:11px; font-weight:600; transition:padding .5s var(--ease); }
.vx-plan > div { display:flex; justify-content:space-between; gap:8px; margin-bottom:9px; color:var(--soft); max-height:30px; transition:max-height .4s var(--ease), opacity .3s, margin .4s; }
.vx-bar { height:6px; border-radius:3px; background:rgba(18,180,143,.15); overflow:hidden; }
.vx-bar i { display:block; height:100%; border-radius:3px; background:var(--grad); }
.vx-biz { display:flex; align-items:center; gap:10px; margin:10px 4px 0; padding:8px; border-radius:16px; white-space:nowrap; overflow:hidden; }
.vx-biz b { display:block; max-width:140px; overflow:hidden; text-overflow:ellipsis; font-size:12px; }
.vx-biz small { font-size:10px; color:var(--muted); }
.vx-logout { margin-top:6px; }
.vx-logout:hover { background:rgba(255,122,92,.14); color:#d4492b; }
.vx-toggle { position:absolute; z-index:6; top:40px; left:calc(var(--sw) + 10px); width:28px; height:28px; border-radius:50%; display:grid; place-items:center; border:1px solid var(--line); color:var(--soft); background:var(--glass2); box-shadow:0 6px 16px rgba(0,0,0,.12); backdrop-filter:blur(10px); transition:left .55s var(--ease), transform .25s ease; }
.vx-toggle:hover { transform:translateX(2px); }
.vx-main { min-width:0; display:flex; flex-direction:column; gap:16px; min-height:0; }
.vx-top { display:flex; align-items:center; gap:12px; min-height:72px; padding:12px 20px 10px; border-radius:28px; background:rgba(255,255,255,.55); border:1px solid rgba(16,150,120,.12); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); box-shadow:0 20px 40px rgba(10,70,62,.08); }
.vx-search { position:relative; display:flex; align-items:center; flex:1 1 auto; min-width:0; border-radius:16px; background:rgba(255,255,255,.8); border:1px solid rgba(20,120,95,.08); padding:0 16px; height:48px; transition:border-color .2s ease, box-shadow .2s ease, background .2s ease; }
.vx-search input { width:100%; border:0; background:transparent; color:var(--ink); font:600 13px 'Plus Jakarta Sans',sans-serif; }
.vx-search input::placeholder { color:var(--muted); }
.vx-search:focus-within { border-color:rgba(18,180,143,.38); box-shadow:0 0 0 4px rgba(18,180,143,.12); }
.vx-theme-toggle { position:relative; width:44px; height:44px; border-radius:50%; display:grid; place-items:center; background:rgba(255,255,255,.9); border:1px solid var(--line); color:var(--soft); cursor:pointer; transition:all .25s var(--ease); }
.vx-theme-toggle:hover { background:var(--mint); color:#fff; transform:scale(1.08); border-color:var(--mint); }
.vx-theme-toggle .sun, .vx-theme-toggle .moon { position:absolute; opacity:0; transform:scale(.65); transition:opacity .25s ease, transform .25s ease; }
.vx-theme-toggle .sun { opacity:1; }
[data-theme='dark'] .vx-theme-toggle .sun { opacity:0; }
[data-theme='dark'] .vx-theme-toggle .moon { opacity:1; transform:scale(1); }
[data-theme='light'] .vx-theme-toggle .sun { opacity:1; transform:scale(1); }
[data-theme='light'] .vx-theme-toggle .moon { opacity:0; }
.vx-ico { width:44px; height:44px; border-radius:50%; display:grid; place-items:center; background:rgba(255,255,255,.82); border:1px solid var(--line); }
.vx-me { display:flex; align-items:center; gap:10px; min-width:0; padding:7px 10px 7px 8px; border-radius:16px; background:rgba(255,255,255,.82); border:1px solid var(--line); }
.vx-av { width:32px; height:32px; border-radius:12px; display:grid; place-items:center; background:var(--grad); color:#fff; font:800 11px Sora,sans-serif; }
.vx-me b { display:block; font-size:12px; }
.vx-me small { display:block; font-size:10px; color:var(--muted); }
.vx-panel { display:flex; flex-direction:column; gap:16px; min-height:0; padding:0 4px 4px; }
.vx-card { position:relative; border:1px solid var(--line); border-radius:26px; background:linear-gradient(180deg,rgba(255,255,255,.82),rgba(255,255,255,.72)); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); box-shadow: 0 18px 40px rgba(20,120,95,.08); }
.vx-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:4px 6px 0; }
.vx-head h1 { margin:0; font:800 32px/1.1 Sora, sans-serif; letter-spacing:-.04em; }
.vx-sub { margin:8px 0 0; font-size:12px; color:var(--muted); }
.vx-head-actions { display:flex; align-items:center; gap:10px; }
.vx-verified { display:inline-flex; align-items:center; gap:6px; padding:9px 12px; border:1px solid rgba(18,180,143,.18); border-radius:999px; background:rgba(18,180,143,.08); color:#0d7d67; font-size:11px; font-weight:800; }
.vx-grid2 { display:grid; grid-template-columns:2fr 1fr; gap:16px; }
.vx-chart-card, .vx-listing-mix, .vx-attention, .vx-quick-card { padding:18px 18px 16px; }
.vx-top-row { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px; }
.vx-top-row h3, .vx-quick-card h3, .vx-attention h3 { margin:0; font:700 17px Sora, sans-serif; }
.s { margin:5px 0 0; font-size:11px; color:var(--muted); }
.vx-seg { display:inline-flex; padding:4px; border-radius:12px; background:rgba(18,180,143,.08); border:1px solid var(--line); }
.vx-seg button { border:0; background:transparent; color:var(--soft); padding:7px 10px; border-radius:10px; font-size:11px; font-weight:700; }
.vx-seg button.on { background:#fff; color:var(--ink); box-shadow:0 4px 12px rgba(15,96,78,.08); }
.vx-wave-chart { width:100%; height:210px; }
.vx-wave-chart .vx-chart-line { fill:none; stroke:var(--mint); stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }
.vx-wave-chart .vx-chart-area { fill:url(#vx-chart-fill); }
.vx-wave-chart text { font-size:9px; fill:var(--muted); font-weight:700; }
.vx-chart-point .dot { fill:#fff; stroke:var(--mint); stroke-width:2; }
.vx-chart-point .hit { fill:transparent; }
.vx-donutwrap { position:relative; display:grid; place-items:center; margin:14px 0 16px; }
.vx-donutwrap svg { width:170px; height:170px; transform:rotate(-90deg); }
.vx-donutwrap circle { fill:none; stroke-width:12; }
.vx-donut-track { stroke:rgba(18,180,143,.14); }
.vx-dmid { position:absolute; text-align:center; }
.vx-dmid b { display:block; font:700 22px Sora, sans-serif; }
.vx-dmid small { font-size:10px; color:var(--muted); }
.vx-legend { display:grid; grid-template-columns:1fr 1fr; gap:6px 10px; font-size:11px; font-weight:600; }
.vx-legend > div { display:flex; align-items:center; gap:8px; }
.vx-legend i { width:9px; height:9px; border-radius:50%; }
.vx-legend b { margin-left:auto; color:var(--soft); }
.vx-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
.vx-stat { display:flex; flex-direction:column; min-height:150px; overflow:hidden; text-align:left; cursor:pointer; transition:transform .35s var(--ease), box-shadow .35s var(--ease); color:inherit; padding:16px; }
.vx-stat:hover { transform:translateY(-4px); box-shadow:0 22px 44px rgba(20,120,95,.2); }
.vx-stat .ic { width:38px; height:38px; border-radius:13px; display:grid; place-items:center; margin-bottom:auto; background:rgba(18,180,143,.12); color:var(--mint); }
.vx-stat:nth-child(4n+2) .ic { color:var(--sky); } .vx-stat:nth-child(4n+3) .ic { color:var(--violet); } .vx-stat:nth-child(4n) .ic { color:var(--gold); }
.vx-stat b { margin-top:16px; font:700 30px/1 Sora, sans-serif; letter-spacing:-.03em; }
.vx-stat small { margin-top:8px; font-size:12px; font-weight:700; }
.vx-stat span { margin-top:3px; font-size:10.5px; color:var(--muted); }
.vx-rows { display:flex; flex-direction:column; gap:8px; margin-top:14px; }
.vx-row { display:flex; align-items:center; gap:12px; width:100%; padding:12px 14px; border:1px solid var(--line); border-radius:18px; background:var(--g70); text-align:left; color:inherit; transition:transform .25s var(--ease), background .2s; }
.vx-row:hover { transform:translateX(3px); background:var(--rowh); }
.vx-row .ri { flex:none; width:36px; height:36px; border-radius:12px; display:grid; place-items:center; }
.vx-row .ri.amber { background:rgba(255,190,70,.2); color:#8a5d05; }
.vx-row .ri.violet { background:rgba(106,90,224,.14); color:#5445c9; }
.vx-row .ri.rose { background:rgba(255,122,92,.16); color:#d4492b; }
.vx-row .rt { flex:1; min-width:0; }
.vx-row .rt b { display:block; font-size:12.5px; }
.vx-row .rt small { display:block; margin-top:2px; font-size:11px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.vx-row > svg { color:var(--muted); }
.vx-empty { padding:28px; text-align:center; font-size:13px; font-weight:600; color:var(--muted); }
.vx-quick { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:16px; }
.vx-quick button { display:flex; flex-direction:column; align-items:center; gap:8px; padding:14px 8px; border:1px solid var(--line); border-radius:20px; background:var(--g85); font-size:11.5px; font-weight:700; color:var(--ink); transition:transform .25s var(--ease), box-shadow .25s; }
.vx-quick button:hover { transform:translateY(-3px); box-shadow:0 14px 28px rgba(20,120,95,.15); }
.vx-quick span { display:grid; place-items:center; width:38px; height:38px; border-radius:13px; background:rgba(18,180,143,.12); color:var(--mint); }
.vx-shell[data-theme='dark'] { color-scheme:dark; --bg:#06151a; --ink:#e6f7f2; --muted:#84a8a0; --soft:#b4d2ca; --line:rgba(90,230,190,.16); --glass:rgba(255,255,255,.06); --glass2:rgba(255,255,255,.1); --mint:#2ee6b6; --sky:#4cc4ff; --violet:#9a8cff; --gold:#f2b84b; --shellbg:linear-gradient(160deg,#04121a 0%,#06202a 55%,#082a30 100%); --orb1:#0f7a66; --orb2:#0c5a78; --side1:rgba(22,48,56,.82); --side2:rgba(12,30,38,.6); --hi:rgba(255,255,255,.07); --g85:rgba(255,255,255,.06); --g70:rgba(255,255,255,.045); --rowh:rgba(255,255,255,.1); --panel1:rgba(14,36,44,.66); --panel2:rgba(8,24,32,.4); --card1:rgba(255,255,255,.09); --card2:rgba(255,255,255,.03); --cardbd:rgba(255,255,255,.08); --btnl:rgba(255,255,255,.07); --btnlh:rgba(255,255,255,.13); --h1a:#f0fffb; --h1b:#6ee7c4; --tip:#e6f7f2; --tipink:#06151a; --track:rgba(255,255,255,.08); --dotfill:#0a2229; }
.vx-shell[data-theme='dark'] .vx-side { background:linear-gradient(180deg, rgba(15,35,30,.92), rgba(10,25,22,.88)); box-shadow: inset 0 1px 0 var(--hi), 0 24px 50px rgba(0,0,0,.4); }
.vx-shell[data-theme='dark'] .vx-toggle, .vx-shell[data-theme='dark'] .vx-ico, .vx-shell[data-theme='dark'] .vx-me, .vx-shell[data-theme='dark'] .vx-search, .vx-shell[data-theme='dark'] .vx-top { background:rgba(15,35,30,.9); }
.vx-shell[data-theme='dark'] .vx-theme-toggle { background:rgba(15,35,30,.9); color:var(--mint); }
.vx-shell[data-theme='dark'] .vx-theme-toggle:hover { background:var(--mint); color:#fff; }
.vx-shell[data-theme='dark'] .vx-card { background:linear-gradient(160deg, rgba(15,35,30,.95), rgba(10,25,22,.85)); border-color: rgba(18,180,143,.15); box-shadow:0 0 0 1px rgba(18,180,143,.1), 0 16px 36px rgba(0,0,0,.3); }
.vx-shell[data-theme='dark'] .vx-top { border-color: rgba(18,180,143,.12); }
.vx-shell[data-theme='dark'] .vx-row { background:rgba(15,35,30,.8); border-color:var(--line); }
 .vx-shell[data-theme='dark'] .vx-row:hover { background:rgba(15,35,30,.95); }
.vx-shell[data-theme='dark'] .vx-verified { color:#8ff5d9; }
.vx-shell[data-theme='dark'] .vx-theme-toggle .sun { opacity:0; }
.vx-shell[data-theme='dark'] .vx-theme-toggle .moon { opacity:1; }
.vx-shell, .vx-side, .vx-top, .vx-card, .vx-btn, .vx-theme-toggle { transition:background .3s ease, color .3s ease, border-color .3s ease, box-shadow .3s ease; }

.vx-perf-shell { display:flex; flex-direction:column; gap:18px; padding-top:6px; }
.vx-perf-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:4px; }
.vx-perf-kicker { display:inline-flex; align-items:center; gap:6px; margin:0 0 6px; color:#0d8d74; font-size:10px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
.vx-perf-header h2 { margin:0; color:var(--ink); font-size:clamp(22px,2.5vw,30px); letter-spacing:-.04em; }
.vx-perf-pill { display:inline-flex; align-items:center; gap:7px; padding:8px 12px; border:1px solid rgba(18,180,143,.18); border-radius:999px; background:rgba(18,180,143,.08); color:#0b7d63; font-size:11px; font-weight:800; }
.vx-perf-grid { display:grid; gap:14px; }
.stats-grid { grid-template-columns:repeat(4, minmax(0, 1fr)); }
.wide-grid { grid-template-columns:minmax(0,1.55fr) minmax(260px,.95fr); }
.lower-grid { grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr); }
.vx-perf-stat { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:12px; min-height:110px; padding:16px 18px; }
.vx-perf-ic { display:grid; place-items:center; width:42px; height:42px; border-radius:14px; }
.vx-perf-ic.amber { background:rgba(245,171,41,.14); color:#ad6d09; }
.vx-perf-ic.mint { background:rgba(18,180,143,.14); color:#0d8d74; }
.vx-perf-ic.violet { background:rgba(106,90,224,.12); color:#5641d5; }
.vx-perf-ic.sky { background:rgba(23,150,214,.12); color:#0f74ad; }
.vx-perf-stat-text { display:grid; gap:2px; }
.vx-perf-stat b { font-size:clamp(20px,2vw,28px); letter-spacing:-.04em; }
.vx-perf-stat span { color:var(--muted); font-size:11px; font-weight:700; text-transform:none; }
.vx-perf-stat small { color:#0e8a68; font-size:10px; font-weight:800; }
.vx-perf-card { min-height:220px; }
.vx-perf-card .vx-top-row { margin-bottom:10px; }
.vx-perf-card h3 { margin:0; font-size:15px; font-weight:800; }
.vx-perf-card .s { margin-top:3px; }
.vx-analytics-line { display:block; width:100%; height:220px; margin-top:12px; }
.vx-analytics-grid { stroke:rgba(19,118,98,.15); stroke-width:1; stroke-dasharray:5 6; }
.vx-analytics-area { fill:url(#vxAnalyticsFill); }
.vx-analytics-curve { fill:none; stroke:#12b48f; stroke-width:3.5; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:1000; stroke-dashoffset:1000; animation:vx-line-draw 1.6s ease forwards; }
.vx-chart-point .vx-point-hit { fill:transparent; }
.vx-chart-point .vx-point-dot { fill:#fff; stroke:#12b48f; stroke-width:3; filter:drop-shadow(0 8px 16px rgba(18,180,143,.18)); }
.vx-analytics-line text { fill:var(--muted); font-size:10px; font-weight:700; }
.vx-conversion-list { display:flex; flex-direction:column; gap:14px; margin-top:18px; }
.vx-conversion-row { display:grid; gap:8px; }
.vx-conversion-meta { display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:12px; color:var(--soft); }
.vx-conversion-meta b { color:var(--ink); }
.vx-conversion-bar { position:relative; height:10px; overflow:hidden; border-radius:999px; background:rgba(18,180,143,.12); }
.vx-conversion-bar i { display:block; height:100%; border-radius:inherit; }
.vx-conversion-bar i.mint { background:linear-gradient(90deg,#2ad9a4,#08a484); }
.vx-conversion-bar i.sky { background:linear-gradient(90deg,#46c7ff,#1a95df); }
.vx-conversion-bar i.violet { background:linear-gradient(90deg,#7e73ff,#5d51d9); }
.vx-ranked-list { display:flex; flex-direction:column; gap:12px; margin-top:18px; }
.vx-ranked-row { display:grid; grid-template-columns:auto minmax(0,1fr) minmax(100px,1.2fr); align-items:center; gap:10px; }
.vx-rank-index { display:grid; place-items:center; width:24px; height:24px; border-radius:8px; background:rgba(18,180,143,.12); color:#0c7d63; font-size:11px; font-weight:800; }
.vx-rank-meta { display:grid; gap:2px; min-width:0; }
.vx-rank-meta span { overflow:hidden; color:var(--ink); font-size:12px; font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
.vx-rank-meta small { color:var(--muted); font-size:10.5px; }
.vx-rank-bar { position:relative; height:8px; border-radius:999px; overflow:hidden; background:rgba(18,180,143,.12); }
.vx-rank-bar i { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#31d5a2,#0f9d7f); }
.vx-quality-wrap { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-top:18px; }
.vx-ring-wrap { position:relative; width:160px; height:160px; }
.vx-ring-wrap svg { width:100%; height:100%; transform:rotate(-90deg); }
.vx-ring-track { fill:none; stroke:rgba(18,180,143,.12); stroke-width:10; }
.vx-ring-value { fill:none; stroke:#12b48f; stroke-width:10; stroke-linecap:round; transition:stroke-dashoffset .8s ease; }
.vx-ring-label { position:absolute; inset:0; display:grid; place-items:center; text-align:center; }
.vx-ring-label b { font-size:28px; letter-spacing:-.04em; }
.vx-ring-label small { display:block; margin-top:-2px; color:var(--muted); font-size:10px; font-weight:700; }
.vx-mini-bars { flex:1; display:flex; flex-direction:column; gap:12px; }
.vx-mini-bar-row { display:grid; grid-template-columns:32px 1fr; align-items:center; gap:8px; font-size:11px; color:var(--muted); font-weight:700; }
.vx-mini-bar { position:relative; height:8px; border-radius:999px; overflow:hidden; background:rgba(18,180,143,.12); }
.vx-mini-bar i { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#22ce9a,#0fa98a); }
@keyframes vx-line-draw { to { stroke-dashoffset:0; } }
@media (max-width: 980px) { .stats-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); } .wide-grid, .lower-grid { grid-template-columns:1fr; } }
@media (max-width: 640px) { .stats-grid { grid-template-columns:1fr; } .vx-perf-header { align-items:flex-start; flex-direction:column; } .vx-quality-wrap { flex-direction:column; } }
.vx-shell {
  --ink:#0c2a26; --muted:#5f8279; --soft:#35625a; --line:rgba(16,150,120,.16);
  --glass:rgba(255,255,255,.7); --glass2:rgba(255,255,255,.9);
  --mint:#12b48f; --sky:#1796d6; --violet:#6a5ae0; --gold:#d89a1d; --coral:#ff7a5c;
  --grad:linear-gradient(135deg,#27d9ae,#0fa98a); --r-lg:30px; --r-md:24px;
  --sw:264px; --shellbg:linear-gradient(160deg,#fafffd 0%,#eafaf4 50%,#dff6ee 100%);
  --orb1:#9be8d0; --orb2:#b8f0e4; --side1:rgba(255,255,255,.88); --side2:rgba(255,255,255,.62);
  position:relative; isolation:isolate; display:grid; grid-template-columns:var(--sw) minmax(0,1fr);
  gap:16px; width:100%; height:100%; min-height:0; max-height:100%; overflow:hidden;
  padding:16px; background:var(--shellbg); color:var(--ink);
  transition:grid-template-columns .55s var(--ease), background .3s ease;
}
.vv-vendor-workspace-route > .vv-vendor-workspace.vx-shell {
  display:grid; grid-template-columns:var(--sw) minmax(0,1fr); flex-direction:initial;
}
.vx-shell.is-collapsed { --sw:76px; }
.vx-shell::before,.vx-shell::after {
  content:""; position:absolute; z-index:-1; border-radius:50%; filter:blur(90px);
  pointer-events:none; animation:vx-drift 22s ease-in-out infinite alternate;
}
.vx-shell::before { width:640px; height:640px; left:-120px; top:-160px; background:radial-gradient(circle,var(--orb1),transparent 65%); opacity:.8; }
.vx-shell::after { width:720px; height:720px; right:-180px; bottom:-220px; background:radial-gradient(circle,var(--orb2),transparent 65%); opacity:.9; animation-delay:-8s; }
.vx-main { position:relative; z-index:1; min-width:0; min-height:0; gap:14px; }
.vx-side {
  position:relative; z-index:1; box-sizing:border-box; width:100%; min-width:0; min-height:0; height:100%; padding:14px 10px 10px;
  overflow-x:hidden; overflow-y:auto; scrollbar-width:none;
  border:1px solid var(--line); border-radius:var(--r-lg);
  background:linear-gradient(180deg,var(--side1),var(--side2));
  box-shadow:inset 0 1px 0 #fff,0 24px 50px rgba(20,120,95,.12);
  backdrop-filter:blur(28px) saturate(150%); -webkit-backdrop-filter:blur(28px) saturate(150%);
}
.vx-side::-webkit-scrollbar { display:none; }
.vx-logo,.vx-av { background:var(--grad); box-shadow:0 8px 22px rgba(18,180,143,.25); }
.vx-brand { flex:none; padding:2px 8px 8px; }
.vx-nav { gap:2px; }
.vx-group { padding:8px 12px 3px; color:var(--muted); font-size:10px; font-weight:700; letter-spacing:.03em; text-transform:none; }
.vx-pill { border-radius:14px; background:var(--grad); box-shadow:0 10px 24px rgba(18,180,143,.35); }
.vx-nav-item { min-height:36px; padding:8px 12px; border-radius:12px; color:var(--soft); }
.vx-nav-item { box-sizing:border-box; }
.vx-lbl { min-width:0; overflow:hidden; text-overflow:ellipsis; }
.vx-nav-item:hover { background:rgba(18,180,143,.09); color:var(--ink); }
.vx-nav-item.is-active,.vx-nav-item.is-active:hover { background:transparent; color:#fff; }
.vx-nav-item svg { width:18px; height:18px; opacity:1; }
.vx-plan { border-color:var(--line); border-radius:16px; padding:11px; background:rgba(18,180,143,.08); }
.vx-plan > div { white-space:normal; }
.vx-biz { margin-top:6px; padding:6px; border:1px solid transparent; }
.vx-biz:hover { border-color:var(--line); background:rgba(18,180,143,.08); }
.vx-toggle {
  position:relative; top:auto; left:auto; z-index:2; flex:0 0 auto; width:36px; height:36px;
  display:grid; place-items:center; border-radius:50%; border-color:var(--line); color:var(--soft);
  background:var(--glass2); box-shadow:0 6px 16px rgba(0,0,0,.12); backdrop-filter:blur(10px);
  transition:transform .25s var(--ease),background .2s,color .2s;
}
.vx-toggle:hover { transform:scale(1.08); background:var(--mint); color:#fff; }
.vx-shell.is-collapsed .vx-toggle svg { transform:rotate(180deg); }
.vx-shell.is-collapsed .vx-side { align-items:stretch; padding-inline:8px; }
.vx-shell.is-collapsed .vx-brand { justify-content:center; padding-inline:0; }
.vx-shell.is-collapsed .vx-bt,
.vx-shell.is-collapsed .vx-group,
.vx-shell.is-collapsed .vx-lbl,
.vx-shell.is-collapsed .vx-plan > div,
.vx-shell.is-collapsed .vx-biz > div { display:none; }
.vx-shell.is-collapsed .vx-nav-item { justify-content:center; padding-inline:0; }
.vx-shell.is-collapsed .vx-biz { justify-content:center; margin-inline:0; padding-inline:0; }
.vx-shell.is-collapsed .vx-plan { margin-inline:0; padding:8px; }
.vx-shell.is-collapsed .vx-logout { margin-top:auto; }
.vx-top {
  flex:0 0 auto; min-height:72px; gap:10px; padding:12px 20px 10px;
  border:1px solid var(--line); border-radius:28px; background:rgba(255,255,255,.55);
  box-shadow:0 20px 40px rgba(10,70,62,.08); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px);
}
.vx-toggle { width:36px; height:36px; }
.vx-search { height:48px; border-color:var(--line); border-radius:24px; background:rgba(255,255,255,.85); }
.vx-search:focus-within { border-color:rgba(18,180,143,.6); box-shadow:0 0 0 4px rgba(18,180,143,.15); }
.vx-theme-toggle,.vx-ico { width:44px; height:44px; flex:0 0 auto; border-radius:50%; background:rgba(255,255,255,.85); border-color:var(--line); }
.vx-me { min-width:0; border-color:var(--line); border-radius:26px; background:rgba(255,255,255,.85); }
.vx-me > div:last-child { min-width:0; }
.vx-me b { max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.vx-panel {
  flex:1 1 0%; min-height:0; gap:16px; padding:30px 28px 36px; overflow:auto;
  border:1px solid var(--line); border-radius:var(--r-lg);
  background:linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,.4));
  box-shadow:inset 0 1px 0 #fff; backdrop-filter:blur(26px);
}
.vx-panel::-webkit-scrollbar { width:8px; }
.vx-panel::-webkit-scrollbar-thumb { background:rgba(18,180,143,.3); border-radius:4px; }
.vx-panel > * { min-width:0; min-height:0; }
.vx-panel > *, .vx-panel > * > * { background:transparent !important; }
.vx-card { border:1px solid rgba(255,255,255,.9); border-radius:var(--r-md); background:linear-gradient(160deg,rgba(255,255,255,.95),rgba(255,255,255,.7)); box-shadow:0 0 0 1px rgba(18,180,143,.08),0 16px 36px rgba(20,120,95,.1); backdrop-filter:blur(14px); }
.vx-head { align-items:flex-end; gap:16px; margin-bottom:24px; }
.vx-head h1 { color:var(--ink); font:700 32px/1.1 Sora,sans-serif; letter-spacing:-.03em; }
.vx-sub,.s { color:var(--muted); }
.vx-grid2 { grid-template-columns:minmax(0,1.86fr) minmax(290px,1fr); gap:20px; }
.vx-grid2.b { gap:20px; margin-top:20px; }
.vx-chart-card,.vx-listing-mix,.vx-attention,.vx-quick-card { padding:22px; }
.vx-chart-card,.vx-listing-mix { min-height:0; }
.vx-chart-card { display:flex; flex-direction:column; }
.vx-chart-card .vv-vendor-wave-chart { flex:1; min-height:0; }
.vx-stats { gap:16px; margin-top:20px; }
.vx-stat { min-width:0; min-height:146px; padding:18px; border-radius:18px; }
.vx-stat b { font-size:28px; }
.vx-rows { gap:10px; }
.vx-row { border-radius:14px; }
.vx-quick { gap:12px; }
.vx-quick button { min-width:0; border-radius:14px; background:#f8fbf9; }
.vx-shell[data-theme='dark'] {
  --ink:#e8f5f2; --muted:#8fa9a3; --soft:#b0c9c3; --line:rgba(18,180,143,.2);
  --glass:rgba(15,35,30,.7); --glass2:rgba(20,45,38,.9);
  --mint:#1dd9ab; --grad:linear-gradient(135deg,#1dd9ab,#12b48f);
  --shellbg:linear-gradient(160deg,#0d211d 0%,#0a1a17 50%,#071310 100%);
  --orb1:rgba(18,180,143,.15); --orb2:rgba(18,180,143,.12);
  --side1:rgba(15,35,30,.92); --side2:rgba(10,25,22,.88);
}
.vx-shell[data-theme='dark'] .vx-toggle { background:var(--glass2); }
.vx-shell[data-theme='dark'] .vx-side,
.vx-shell[data-theme='dark'] .vx-top,
.vx-shell[data-theme='dark'] .vx-card { border-color:var(--line); background:linear-gradient(160deg,rgba(15,35,30,.95),rgba(10,25,22,.85)); box-shadow:0 0 0 1px rgba(18,180,143,.1),0 16px 36px rgba(0,0,0,.3); }
.vx-shell[data-theme='dark'] .vx-search,
.vx-shell[data-theme='dark'] .vx-theme-toggle,
.vx-shell[data-theme='dark'] .vx-ico,
.vx-shell[data-theme='dark'] .vx-me,
.vx-shell[data-theme='dark'] .vx-quick button { border-color:var(--line); background:rgba(15,35,30,.9); }
.vx-shell[data-theme='dark'] .vx-head h1,
.vx-shell[data-theme='dark'] .vx-nav-item,
.vx-shell[data-theme='dark'] .vx-card h3,
.vx-shell[data-theme='dark'] .vx-stat { color:var(--ink); }
.vx-shell[data-theme='dark'] .vx-vendor-nav .vx-nav-item.is-active { color:#fff; }
.vx-shell[data-theme='dark'] .vx-plan { border-color:var(--line); background:#10251e; }
.vx-shell[data-theme='dark'] .vx-panel {
  border-color:var(--line);
  background:linear-gradient(180deg,rgba(13,31,27,.94),rgba(9,24,21,.9));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
}
.vx-shell[data-theme='dark'] .vx-panel .vv-screen-layout,
.vx-shell[data-theme='dark'] .vx-panel .vv-screen-scroll {
  background-color:#10211d !important;
  color:#e5f3ef;
}
.vx-shell[data-theme='dark'] .vx-panel [class~="bg-white"],
.vx-shell[data-theme='dark'] .vx-panel [class~="bg-white/95"],
.vx-shell[data-theme='dark'] .vx-panel [class~="bg-white/90"],
.vx-shell[data-theme='dark'] .vx-panel [class~="bg-ink-50"],
.vx-shell[data-theme='dark'] .vx-panel [class~="bg-ink-100"] {
  background-color:#172c26 !important;
  color:#e5f3ef;
}
.vx-shell[data-theme='dark'] .vx-panel [class~="text-ink-900"],
.vx-shell[data-theme='dark'] .vx-panel [class~="text-ink-800"],
.vx-shell[data-theme='dark'] .vx-panel [class~="text-ink-700"],
.vx-shell[data-theme='dark'] .vx-panel [class~="text-ink-600"] { color:#e0eee9 !important; }
.vx-shell[data-theme='dark'] .vx-panel [class~="text-ink-500"],
.vx-shell[data-theme='dark'] .vx-panel [class~="text-ink-400"] { color:#a5bbb4 !important; }
.vx-shell[data-theme='dark'] .vx-panel [class~="border-ink-100"],
.vx-shell[data-theme='dark'] .vx-panel [class~="ring-ink-100"],
.vx-shell[data-theme='dark'] .vx-panel [class~="ring-ink-100/80"] { border-color:rgba(75,190,158,.22) !important; }
.vx-shell[data-theme='dark'] .vx-panel input:not([type="checkbox"]):not([type="radio"]),
.vx-shell[data-theme='dark'] .vx-panel select,
.vx-shell[data-theme='dark'] .vx-panel textarea {
  border-color:rgba(75,190,158,.24) !important;
  background-color:#12231f !important;
  color:#e5f3ef !important;
}
.vx-mobile-scrim { display:none; }
@media (max-width:1100px) and (min-width:681px) {
  .vx-shell { gap:16px; }
  .vx-shell.is-collapsed .vx-side { align-items:stretch; padding-inline:8px; }
  .vx-shell.is-collapsed .vx-brand { justify-content:center; padding-inline:0; }
  .vx-shell.is-collapsed .vx-bt,
  .vx-shell.is-collapsed .vx-group,
  .vx-shell.is-collapsed .vx-lbl,
  .vx-shell.is-collapsed .vx-plan > div,
  .vx-shell.is-collapsed .vx-biz > div { display:none; }
  .vx-shell.is-collapsed .vx-nav-item { justify-content:center; padding-inline:0; }
  .vx-shell.is-collapsed .vx-biz { justify-content:center; margin-inline:0; padding-inline:0; }
  .vx-shell.is-collapsed .vx-plan { margin-inline:0; padding:8px; }
  .vx-shell.is-collapsed .vx-logout { margin-top:auto; }
}
@media (max-width:900px) {
  .vx-grid2,.vx-grid2.b { grid-template-columns:minmax(0,1fr); }
  .vx-chart-card,.vx-listing-mix { min-height:0; }
  .vx-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media (max-width:680px) {
  .vv-vendor-workspace-route > .vv-vendor-workspace.vx-shell {
    display:block; grid-template-columns:minmax(0,1fr); height:100%; min-height:0;
    max-height:100%; padding:0; overflow:hidden;
  }
  .vx-shell { display:block; padding:0; }
  .vx-side {
    position:absolute; inset:12px auto 12px 12px; z-index:22;
    width:min(280px,calc(100vw - 56px)); height:auto; max-height:none;
    transform:translateX(calc(-100% - 16px)); visibility:hidden;
    border-radius:18px; box-shadow:0 20px 60px rgba(12,44,37,.22);
    transition:transform .28s var(--ease),visibility .28s;
  }
  .vx-shell.is-mobile-open .vx-side { transform:translateX(0); visibility:visible; }
  .vx-shell.is-mobile-open .vx-mobile-scrim {
    position:absolute; inset:0; z-index:21; display:block;
    border:0; background:rgba(13,36,31,.38); backdrop-filter:blur(2px);
  }
  .vx-shell.is-collapsed .vx-side { align-items:stretch; padding:20px 12px 14px; }
  .vx-shell.is-collapsed .vx-bt,
  .vx-shell.is-collapsed .vx-group,
  .vx-shell.is-collapsed .vx-lbl,
  .vx-shell.is-collapsed .vx-plan > div,
  .vx-shell.is-collapsed .vx-biz > div { display:initial; }
  .vx-shell.is-collapsed .vx-bt { display:flex; }
  .vx-shell.is-collapsed .vx-group { display:block; }
  .vx-shell.is-collapsed .vx-lbl { display:inline-block; }
  .vx-shell.is-collapsed .vx-plan > div { display:flex; }
  .vx-shell.is-collapsed .vx-biz > div { display:block; }
  .vx-shell.is-collapsed .vx-brand { justify-content:flex-start; padding:2px 6px 18px; }
  .vx-shell.is-collapsed .vx-nav-item { justify-content:flex-start; padding:10px 11px; }
  .vx-shell.is-collapsed .vx-biz { justify-content:flex-start; margin:10px 4px 0; padding:8px; }
  .vx-shell.is-collapsed .vx-plan { margin:auto 4px 0; padding:14px; }
  .vx-shell.is-collapsed .vx-logout { margin-top:6px; }
  .vx-main { width:100%; height:100%; gap:0; }
  .vx-top {
    min-height:72px; height:72px; flex-basis:72px; gap:7px;
    padding:10px 12px; border-radius:0 0 16px 16px;
  }
  .vx-toggle { width:34px; height:34px; }
  .vx-toggle svg { transform:none !important; }
  .vx-search { height:42px; padding-inline:10px; border-radius:11px; }
  .vx-search > svg { width:15px; flex:0 0 auto; }
  .vx-search input { font-size:11px; }
  .vx-theme-toggle,.vx-ico { width:36px; height:36px; border-radius:11px; }
  .vx-me { padding:3px; border:0; background:transparent; }
  .vx-me > div:last-child { display:none; }
  .vx-av { width:34px; height:34px; }
  .vx-panel { height:calc(100% - 72px); padding:22px 16px 28px; overflow:auto; border-radius:0; }
  .vx-dash { padding:22px 16px 28px !important; }
  .vx-head { align-items:flex-start; }
  .vx-head-actions { width:auto; }
  .vx-head-actions .vx-verified { display:none; }
  .vx-stats { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
  .vx-stat { min-height:132px; padding:15px; }
  .vx-chart-card,.vx-listing-mix,.vx-attention,.vx-quick-card { padding:18px; }
  .vx-seg { max-width:100%; }
}
@media (max-width:420px) {
  .vx-top { gap:5px; padding-right:8px; padding-left:50px; }
  .vx-search { padding-inline:8px; }
  .vx-search input { font-size:10px; }
  .vx-theme-toggle,.vx-ico { width:34px; height:34px; }
  .vx-head { flex-wrap:wrap; }
  .vx-head-actions { width:100%; justify-content:flex-end; }
  .vx-stats { gap:9px; }
  .vx-stat { min-height:126px; }
  .vx-stat b { font-size:24px; }
}
@media (prefers-reduced-motion:reduce) {
  .vx-shell *, .vx-shell *::before, .vx-shell *::after {
    scroll-behavior:auto !important; animation:none !important; transition:none !important;
  }
}

.vv-vendor-workspace-route:not(.vv-business-workspace-route) > .vv-vendor-workspace.vx-shell:not([data-theme='dark']) {
  --sw:192px;
  --ink:#0f172a;
  --muted:#64748b;
  --soft:#475569;
  --line:#e2e8f0;
  --mint:#1e40af;
  --sky:#2563eb;
  --grad:linear-gradient(135deg,#1e40af,#2563eb);
  --shellbg:#f8f9ff;
  --side1:#fff;
  --side2:#fff;
  --r-lg:8px;
  --r-md:8px;
  gap:0;
  padding:0;
  background:#f8f9ff;
  color:var(--ink);
  font-family:Inter,system-ui,sans-serif;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark'])::before,
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark'])::after { display:none; }
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-main { gap:0; }
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-side {
  padding:14px 8px 10px;
  border:0;
  border-right:1px solid #e2e8f0;
  border-radius:0;
  background:#fff;
  box-shadow:none;
  backdrop-filter:none;
  -webkit-backdrop-filter:none;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-brand {
  margin-bottom:8px;
  padding:2px 6px 12px;
  border-bottom:1px solid #f1f5f9;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-logo,
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-av {
  border-radius:4px;
  box-shadow:none;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-group {
  padding:12px 8px 5px;
  color:#64748b;
  font-size:9px;
  font-weight:600;
  letter-spacing:.06em;
  text-transform:uppercase;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-pill { display:none; }
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-nav-item {
  min-height:32px;
  padding:7px 8px;
  border-radius:4px;
  color:#475569;
  font-size:12px;
  font-weight:500;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-nav-item:hover { background:#f1f5f9; color:#0f172a; }
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-nav-item.is-active,
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-nav-item.is-active:hover {
  background:#eef2ff;
  color:#1e40af;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-nav-item.is-active svg { color:#1e40af; }
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-plan {
  padding:10px;
  border:1px solid #e2e8f0;
  border-radius:6px;
  background:#f8fafc;
  font-size:10px;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-plan > div { color:#475569; }
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-bar { background:#e2e8f0; }
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-biz { border-radius:4px; }
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-top {
  min-height:48px;
  height:48px;
  flex-basis:48px;
  gap:10px;
  padding:6px 16px;
  border:0;
  border-bottom:1px solid #e2e8f0;
  border-radius:0;
  background:#fff;
  box-shadow:none;
  backdrop-filter:none;
  -webkit-backdrop-filter:none;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-toggle {
  width:28px;
  height:28px;
  border-color:transparent;
  border-radius:4px;
  background:transparent;
  box-shadow:none;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-search {
  flex:0 1 290px;
  height:32px;
  padding:0 10px;
  border:1px solid #e2e8f0;
  border-radius:4px;
  background:#f8f9ff;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-search input {
  color:#0f172a;
  font:500 12px Inter,system-ui,sans-serif;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-search:focus-within {
  border-color:#2563eb;
  box-shadow:0 0 0 2px rgba(37,99,235,.14);
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-theme-toggle,
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-ico {
  width:32px;
  height:32px;
  border-color:transparent;
  border-radius:4px;
  background:transparent;
  color:#64748b;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-theme-toggle:hover { background:#f1f5f9; color:#1e40af; transform:none; }
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-me {
  padding:3px 6px;
  border:0;
  border-radius:4px;
  background:transparent;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-panel {
  gap:16px;
  padding:24px;
  border:0;
  border-radius:0;
  background:#f8f9ff;
  box-shadow:none;
  backdrop-filter:none;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-dash { padding:0 !important; }
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-panel > .vx-dash > .vx-hero {
  min-height:0;
  padding:20px;
  border:1px solid #e2e8f0;
  border-radius:8px;
  background:#fff !important;
  box-shadow:0 1px 2px rgba(15,23,42,.03);
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-hero-art { display:none; }
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-hero h1 {
  color:#0f172a;
  font:600 24px/1.25 Inter,system-ui,sans-serif;
  letter-spacing:-.02em;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-card {
  border:1px solid #e2e8f0;
  border-radius:8px;
  background:#fff;
  box-shadow:0 1px 2px rgba(15,23,42,.03);
  backdrop-filter:none;
  -webkit-backdrop-filter:none;
}
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-stat:hover { transform:translateY(-2px); box-shadow:0 4px 10px rgba(15,23,42,.06); }
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-top-row h3,
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-quick-card h3,
.vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-attention h3 { font-family:Inter,system-ui,sans-serif; }
@media (max-width:680px) {
  .vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-side {
    border:1px solid #e2e8f0;
    border-radius:8px;
    box-shadow:0 10px 24px rgba(15,23,42,.12);
  }
  .vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-top {
    min-height:56px;
    height:56px;
    flex-basis:56px;
    gap:6px;
    padding:8px 10px 8px 48px;
  }
  .vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-toggle { width:32px; height:32px; }
  .vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-search { flex:1 1 120px; width:auto; }
  .vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-theme-toggle,
  .vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-ico { width:32px; height:32px; }
  .vv-vendor-workspace-route:not(.vv-business-workspace-route) .vv-vendor-workspace.vx-shell:not([data-theme='dark']) .vx-panel {
    height:calc(100% - 56px);
    padding:16px 12px 24px;
  }
}
`

const VENDOR_NAV = [
  ['Overview', [[LayoutDashboard, 'Dashboard', 'v_dash'], [BarChart3, 'Analytics', 'v_perf']]],
  ['Business operations', [[Package, 'My listings', 'v_listings'], [Store, 'Supplier shop', 'v_explore'], [FileText, 'Quote requests', 'v_work'], [Package, 'Purchase orders', 'v_orders']]],
  ['Communication & trust', [[MessageCircle, 'Messages', 'messages'], [Star, 'Reviews & ratings', 'v_reviews'], [ShieldCheck, 'Verification', 'v_verify']]],
  ['Account & preferences', [[Settings, 'Business profile', 'v_profile'], [Store, 'Settings & more', 'v_more']]],
]

function VendorSidebar({ active, vendor, collapsed, onNavigate }) {
  const nav = useNav()
  const { setMe, me, threads, listings, settings } = useApp()
  const businessSupplier = me.role === 'business'
  const unread = (threads?.vendor || []).reduce((sum, thread) => sum + thread.unread, 0)
  const plan = settings?.plans?.find((item) => item.name === vendor?.plan)
  const used = listings.filter((item) => item.vendorId === me.vendorId).length
  const limit = Number(plan?.listings) || 0
  const navRef = useRef(null)
  const [pill, setPill] = useState(null)

  useLayoutEffect(() => {
    const activeElement = navRef.current?.querySelector('.is-active')
    setPill(activeElement ? { y: activeElement.offsetTop, h: activeElement.offsetHeight } : null)
  }, [active, collapsed, businessSupplier])

  const logout = () => {
    setMe({ role: null, loggedIn: false, guest: false, vendorId: 'v-me', name: '' })
    nav.reset('c_home')
  }

  const label = (text) => (businessSupplier && text === 'Quote requests' ? 'Vendor RFQs' : businessSupplier && text.startsWith('Reviews') ? 'Buyer reviews' : text)

  return (
    <aside className="vx-side">
      <div className="vx-brand"><span className="vx-logo">V</span><div className="vx-bt"><b>VendorVerse</b><small>{businessSupplier ? 'Supplier workspace' : 'Vendor workspace'}</small></div></div>
      <div className="vx-biz">
        <Thumb tone={vendor?.tone || 'teal'} icon={vendor ? cat(vendor.cat).icon : Store} size={38} round="rounded-xl" />
        <div><b>{businessSupplier ? me.businessName || 'Business / Company' : vendor?.name || 'Your business'}</b><small>{businessSupplier ? 'Supplier workspace' : vendor?.status === 'approved' ? 'Verified vendor' : 'Vendor workspace'}</small></div>
      </div>
      <nav id="vendor-workspace-navigation" className="vx-nav" ref={navRef} aria-label={businessSupplier ? 'Business supplier workspace' : 'Vendor workspace'}>
        <span className="vx-pill" aria-hidden="true" style={pill ? { transform: `translateY(${pill.y}px)`, height: pill.h, opacity: 1 } : undefined} />
        {VENDOR_NAV.map(([group, items]) => (
          <Fragment key={group}>
            <div className="vx-group">{group}</div>
            {items.map(([I, text, id]) => (
              <button type="button" key={id} title={collapsed ? label(text) : undefined} aria-label={collapsed ? id === 'messages' && unread > 0 ? `${label(text)}, ${unread} unread` : label(text) : undefined} aria-current={active === id ? 'page' : undefined} className={cx('vx-nav-item', active === id && 'is-active')} onClick={() => { nav.go(id); onNavigate?.() }}>
                <I size={17} /><span className="vx-lbl">{label(text)}</span>
                {id === 'messages' && unread > 0 && <span className="vx-badge">{unread}</span>}
              </button>
            ))}
          </Fragment>
        ))}
      </nav>
      <div className="vx-plan">
        <div><span>{vendor?.plan ? `${vendor.plan} plan` : 'No active plan'}</span><span>{limit ? `${used} of ${limit} listings` : `${used} listings`}</span></div>
        <div className="vx-bar"><i style={{ width: `${limit ? Math.min(100, (used / limit) * 100) : 0}%` }} /></div>
      </div>
      <button type="button" className="vx-nav-item vx-logout" title={collapsed ? 'Log out' : undefined} onClick={logout}><LogOut size={17} /><span className="vx-lbl">Log out</span></button>
    </aside>
  )
}

function BusinessSidebar({ active, collapsed, onNavigate }) {
  const nav = useNav()
  const { me, setMe, threads } = useApp()
  const { company } = useCompany()
  const progress = companyDone(company)
  const unread = (threads?.business || []).reduce((sum, thread) => sum + thread.unread, 0)
  const items = [
    [LayoutDashboard, 'Home', 'b_home'],
    [Building2, 'Company profile', 'b_company'],
    [Boxes, 'Services for vendors', 'b_services'],
    [MessageCircle, 'Vendor enquiries', 'b_messages'],
    [Settings, 'More', 'b_more'],
  ]
  const logout = () => {
    setMe({ role: null, loggedIn: false, guest: false, vendorId: 'v-me', name: '' })
    nav.reset('c_home')
  }

  return (
    <aside className="vx-side">
      <div className="vx-brand"><span className="vx-logo">V</span><div className="vx-bt"><b>VendorVerse</b><small>Business workspace</small></div></div>
      <nav id="business-workspace-navigation" className="vx-nav" aria-label="Business workspace">
        <div className="vx-group">Workspace</div>
        {items.map(([Icon, label, id]) => (
          <button type="button" key={id} title={collapsed ? label : undefined} aria-current={active === id ? 'page' : undefined} className={cx('vx-nav-item', active === id && 'is-active')} onClick={() => { nav.reset(id); onNavigate?.() }}>
            <Icon size={17} /><span className="vx-lbl">{label}</span>
            {id === 'b_messages' && unread > 0 && <span className="vx-badge">{unread}</span>}
          </button>
        ))}
      </nav>
      <div className="vx-plan">
        <div><span>Profile</span><span>{progress}% complete</span></div>
        <div className="vx-bar"><i style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="vx-biz">
        <Thumb tone="teal" icon={Building2} size={38} round="rounded-xl" />
        <div><b>{company.brand || company.legal || me.businessName || 'Your company'}</b><small>Business account</small></div>
      </div>
      <button type="button" className="vx-nav-item vx-logout" title={collapsed ? 'Log out' : undefined} onClick={logout}><LogOut size={17} /><span className="vx-lbl">Log out</span></button>
    </aside>
  )
}

export function VendorWorkspace({ children, variant = 'vendor', header }) {
  const nested = useContext(VendorWorkspaceContext)
  if (nested) return children
  const nav = useNav()
  const { me, lang, setLang } = useApp()
  const businessSupplier = me.role === 'business'
  const topNavItems = VENDOR_NAV.flatMap(([, items]) => items)
  const topNavLabel = (text) => (businessSupplier && text === 'Quote requests' ? 'Vendor RFQs' : businessSupplier && text.startsWith('Reviews') ? 'Buyer reviews' : text)
  const vendorRecord = useMyVendor()
  const vendor = variant === 'vendor' ? vendorRecord : null
  const { theme } = useTheme()
  const collapseAt = variant === 'vendor' ? 760 : 1100
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= collapseAt)
  const [mobile, setMobile] = useState(() => window.innerWidth <= 680)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 680
      setMobile(isMobile)
      setMobileOpen(false)
      setCollapsed(window.innerWidth <= collapseAt)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [collapseAt])
  const toggleWorkspace = () => mobile
    ? setMobileOpen((open) => !open)
    : setCollapsed((value) => !value)

  return (
    <VendorWorkspaceContext.Provider value={true}>
      <div className={cx('vx-shell vv-vendor-workspace', collapsed && 'is-collapsed', mobileOpen && 'is-mobile-open')} data-theme={theme}>
        <style>{VX_CSS}</style>
        {mobile && <button type="button" className="vx-mobile-scrim" aria-label="Close workspace menu" onClick={() => setMobileOpen(false)} />}
        {variant === 'business'
          ? <BusinessSidebar active={nav.id} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
          : <VendorSidebar active={nav.id} vendor={vendor} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />}
        <section className="vx-main">
          {variant === 'business' && header
            ? header({ onWorkspaceToggle: toggleWorkspace, mobile, mobileOpen, collapsed })
            : <header className="vx-top">
              <button type="button" className="vx-toggle" aria-controls="vendor-workspace-navigation" aria-label={mobile ? mobileOpen ? 'Close workspace menu' : 'Open workspace menu' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={mobile ? !mobileOpen : !collapsed} onClick={toggleWorkspace}>
                {mobile ? mobileOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} /> : <ChevronLeft size={15} />}
              </button>
              {variant === 'vendor' && <nav className="vx-top-nav" aria-label="Vendor workspace shortcuts">
                {topNavItems.map(([Icon, text, id]) => (
                  <button type="button" key={id} title={topNavLabel(text)} aria-label={topNavLabel(text)} aria-current={nav.id === id ? 'page' : undefined} className={cx('vx-top-nav-item', nav.id === id && 'is-active')} onClick={() => nav.go(id)}>
                    <Icon size={15} aria-hidden="true" /><span>{topNavLabel(text)}</span>
                  </button>
                ))}
              </nav>}
              <label className="vx-search"><Search size={16} /><input placeholder="Search listings, quote requests, messagesâ€¦" aria-label="Search" /></label>
              <ThemeToggle className="vx-theme-toggle" />
              <div className="vx-ico"><NotifBell role="vendor" /></div>
              <button type="button" className="vx-locale" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} aria-label="Switch language">{lang === 'en' ? 'EN | हिन्दी' : 'हि | EN'} <ChevronDown size={12} /></button>
              <div className="vx-me"><div className="vx-av">{(me.name || 'V').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div><b>{me.name || 'Vendor'}</b><small>Owner</small></div></div>
            </header>}
          <main className="vx-panel">{children}</main>
        </section>
      </div>
    </VendorWorkspaceContext.Provider>
  )
}

function VendorTrendChart({ data }) {
  const width = 600, height = 210, left = 34, right = 14, topPad = 22, bottom = 28
  const max = Math.max(10, Math.ceil(Math.max(...data.map((point) => point.value)) / 10) * 10)
  const x = (index) => left + index * (width - left - right) / Math.max(1, data.length - 1)
  const y = (value) => topPad + (1 - value / max) * (height - topPad - bottom)
  const barWidth = Math.min(34, (width - left - right) / Math.max(1, data.length) * .42)
  const line = data.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.value)}`).join(' ')
  const area = `${line} L${x(data.length - 1)},${height - bottom} L${x(0)},${height - bottom} Z`
  return <svg className="vv-vendor-wave-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Customer enquiries trend"><defs><linearGradient id="vv-vendor-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12b48f" stopOpacity=".38"/><stop offset="1" stopColor="#12b48f" stopOpacity="0"/></linearGradient></defs>{[0,.33,.66,1].map((fraction) => <g key={fraction}><line x1={left} x2={width-right} y1={y(max*fraction)} y2={y(max*fraction)}/><text x="0" y={y(max*fraction)+3}>{Math.round(max*fraction)}</text></g>)}<path className="vv-vendor-chart-area" d={area}/>{data.map((point,index)=><rect key={`bar-${point.label}`} className="vv-vendor-chart-column" x={x(index)-barWidth/2} y={y(point.value)} width={barWidth} height={height-bottom-y(point.value)} rx={barWidth/2} aria-hidden="true"/>)}<path className="vv-vendor-chart-line" d={line}/><path className="vv-vendor-chart-sweep" d={line} pathLength="1" aria-hidden="true"/>{data.map((point,index)=><g className="vv-vendor-chart-point" key={point.label}><circle className="hit" cx={x(index)} cy={y(point.value)} r="15"/><circle className="dot" cx={x(index)} cy={y(point.value)} r="4"/><text x={x(index)} y={height-6} textAnchor="middle">{point.label}</text><title>{point.label}: {point.value}</title></g>)}</svg>
}

/* ================= BUSINESS SUPPLIER ONBOARDING ================= */
export function BusinessOnboarding() {
  const nav = useNav()
  const { me, vendors, setMe, notify, toast } = useApp()
  const v = vendors.find((x) => x.id === me.vendorId)
  const [step, setStep] = useState(0)
  const [source, setSource] = useState('vendor')
  const [consent, setConsent] = useState(false)
  const [errs, setErrs] = useState({})
  const [f, setF] = useState({ name: me.businessName || v?.name || '', type: 'manufacturer_supplier', cat: v?.cat || 'build', gstin: v?.gstin || '', email: v?.email || '', phone: v?.phone || '', areas: v?.areas || ['Jaipur'], moq: '', lead: '', certifications: '' })
  const update = (key) => (event) => { setF({ ...f, [key]: event?.target ? event.target.value : event }); setErrs({ ...errs, [key]: '' }) }
  const chooseSource = (value) => {
    setSource(value)
    if (value === 'vendor') setF({ ...f, name: v?.name || f.name, gstin: v?.gstin || f.gstin, email: v?.email || f.email, phone: v?.phone || f.phone, areas: v?.areas || f.areas })
  }
  const next = () => {
    const e = {}
    if (step === 0) { if (f.name.trim().length < 3) e.name = 'Enter a business/company name'; if (!f.cat) e.cat = 'Select a primary category' }
    if (step === 1) { if (!f.areas.length) e.areas = 'Select at least one delivery area'; if (!f.lead.trim()) e.lead = 'Enter an indicative lead time' }
    if (step === 2) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid business email'; if (!consent) e.consent = 'Confirm the supplier details before continuing' }
    setErrs(e)
    if (Object.keys(e).length) return
    if (step < 2) return setStep(step + 1)
    setMe({ ...me, role: 'business', businessWorkspace: true, businessName: f.name.trim(), businessSetup: { ...f, detailSource: source, createdAt: new Date().toISOString() }, vendorOwnerName: me.vendorOwnerName || me.name, name: f.name.trim(), buyerMode: false })
    notify('admin', 'Business supplier workspace created', `${f.name.trim()} is ready to receive vendor RFQs.`, 'onboarding')
    toast('Business supplier workspace created')
    nav.reset('v_dash')
  }
  return (
    <VendorWorkspace>
      <Screen title="Business supplier onboarding" subtitle={`Step ${step + 1} of 3`} back={step > 0} footer={<div className="flex gap-2">{step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}<Button className="flex-1" size="lg" onClick={next}>{step === 2 ? 'Create business workspace' : 'Continue'}</Button></div>}>
        <Stepper steps={['Business details', 'Supplier coverage', 'Verification']} current={step} />
        {step === 0 && <div className="space-y-4"><Select label="Select details source" value={source} onChange={(e) => chooseSource(e.target.value)} options={[{ value: 'vendor', label: 'Use details from my vendor profile' }, { value: 'manual', label: 'Enter business details manually' }]} /><Banner tone="blue">Your vendor profile details are used only to prefill this form. You can edit the business details before creating the workspace.</Banner><Input label="Business / company name" required value={f.name} onChange={update('name')} error={errs.name} /><Segmented value={f.type} onChange={update('type')} options={[{ id: 'manufacturer_supplier', label: 'Manufacturer / supplier' }, { id: 'service_provider', label: 'Service provider' }]} /><Select label="Primary supplier category" value={f.cat} onChange={update('cat')} options={CATS.map((c) => ({ value: c.id, label: c.name }))} />{errs.cat && <p className="text-xs font-medium text-red-600">{errs.cat}</p>}</div>}
        {step === 1 && <div className="space-y-4"><div><p className="mb-2 text-[13px] font-semibold text-ink-700">Delivery / service coverage</p><Chips scroll={false} multi value={f.areas} onChange={(areas) => { setF({ ...f, areas }); setErrs({ ...errs, areas: '' }) }} options={['Jaipur', 'Delhi NCR', 'Ajmer', 'Sikar', 'Jodhpur', 'Kota', 'North India', 'International']} />{errs.areas && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.areas}</p>}</div><div className="flex gap-3"><Input label="MOQ / minimum batch (optional)" placeholder="e.g. 20 units" value={f.moq} onChange={update('moq')} /><Input label="Typical lead time" required placeholder="e.g. 7 days" value={f.lead} onChange={update('lead')} error={errs.lead} /></div><Input label="Certifications / capabilities" textarea rows={3} placeholder="ISO, GST, product certifications, installation or delivery capabilities" value={f.certifications} onChange={update('certifications')} /></div>}
        {step === 2 && <div className="space-y-4"><Input label="GSTIN / registration number" value={f.gstin} onChange={update('gstin')} /><Input label="Business email" required type="email" value={f.email} onChange={update('email')} error={errs.email} /><Input label="Business phone" value={f.phone} onChange={update('phone')} /><Card><Checkbox checked={consent} onChange={(value) => { setConsent(value); setErrs({ ...errs, consent: '' }) }}>I confirm these supplier details are accurate and can be shared with vendor buyers for RFQs and purchase orders.</Checkbox>{errs.consent && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.consent}</p>}</Card><Banner tone="amber" title="Supplier workspace demo">Your verified vendor identity remains the account owner. This creates a separate supplier workspace view for receiving vendor procurement requests.</Banner></div>}
      </Screen>
    </VendorWorkspace>
  )
}

/* ================= DASHBOARD ================= */

/* ================= REGISTRATION WIZARD ================= */
const DOCS = ['GST Registration Certificate', 'PAN Card', 'Shop & Establishment Licence', 'Cancelled Cheque / Bank Proof']
const VERIFICATION_LEVEL_OPTIONS = ['L1', 'L2', 'L3'].map((level) => ({ value: level, label: level }))

async function loadRemoteVerification(vendorId) {
  const [documents, verifications] = await Promise.all([
    authService.listVendorDocuments(vendorId),
    authService.listVendorVerifications(vendorId),
  ])
  if (!documents.ok) return documents
  if (!verifications.ok) return verifications
  return { ok: true, documents: documents.documents, verifications: verifications.verifications }
}

function RemoteVendorVerification({ vendor }) {
  const [documents, setDocuments] = useState([])
  const [verifications, setVerifications] = useState([])
  const [pendingFiles, setPendingFiles] = useState([])
  const [level, setLevel] = useState('L1')
  const [documentType, setDocumentType] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = async () => {
    const result = await loadRemoteVerification(vendor.id)
    if (!result.ok) { setError(result.message); return false }
    setDocuments(result.documents)
    setVerifications(result.verifications)
    setError('')
    return true
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    loadRemoteVerification(vendor.id).then((result) => {
      if (!active) return
      if (!result.ok) setError(result.message)
      else { setDocuments(result.documents); setVerifications(result.verifications); setError('') }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [vendor.id])

  const registerFile = async (file) => {
    const result = await authService.registerVendorDocument(vendor.id, { fileId: file.fileId, documentType: file.documentType })
    if (!result.ok) { setError(result.message); return false }
    setPendingFiles((items) => items.filter((item) => item.fileId !== file.fileId))
    await refresh()
    return true
  }

  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true); setError('')
    const result = await authService.uploadVendorEvidence(file)
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    const pending = { fileId: result.file.id, fileName: file.name, documentType: documentType.trim() || file.name }
    if (result.file.scanStatus === 'clean') await registerFile(pending)
    else if (['infected', 'failed'].includes(result.file.scanStatus)) setError('The evidence file did not pass the security scan. Choose a different file.')
    else setPendingFiles((items) => [...items, pending])
  }

  const checkScan = async (file) => {
    setBusy(true); setError('')
    const result = await authService.getFile(file.fileId)
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    if (result.file.scanStatus === 'clean') await registerFile(file)
    else if (['infected', 'failed'].includes(result.file.scanStatus)) {
      setPendingFiles((items) => items.filter((item) => item.fileId !== file.fileId))
      setError('The evidence file did not pass the security scan. Choose a different file.')
    } else setError('The security scan is still in progress. Check again later.')
  }

  const submit = async () => {
    setBusy(true); setError('')
    const result = await authService.submitVendorVerification(vendor.id, { level, documentIds: documents.map((document) => document.id) })
    setBusy(false)
    if (!result.ok) { setError(result.message); return }
    await refresh()
  }

  const latest = verifications[0]
  const statusLabels = { submitted: 'Submitted — awaiting review', in_review: 'In review', info_requested: 'More information requested', approved: 'Approved', rejected: 'Rejected', expired: 'Expired', revoked: 'Revoked' }

  return (
    <Screen title="Verification" footer={<Button full size="lg" disabled={busy || loading} onClick={submit}>Submit {level} for review</Button>}>
      <Banner tone="blue">Upload evidence below, then submit an L1–L3 verification request. Files are attached only after the security scan passes.</Banner>
      {error && <Banner tone="red" title="Verification request failed">{error}</Banner>}
      <Card><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-ink-400">Current status</p><p className="mt-1 text-sm font-bold">{latest ? statusLabels[latest.status] || latest.status : 'Not submitted'}</p></div>{latest && <Badge tone={latest.status === 'approved' ? 'green' : latest.status === 'rejected' || latest.status === 'revoked' ? 'red' : latest.status === 'info_requested' ? 'amber' : 'blue'}>{latest.level}</Badge>}</div>{latest?.reason && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{latest.reason}</p>}{latest?.expiresAt && <p className="mt-2 text-xs text-ink-500">Expires {new Date(latest.expiresAt).toLocaleDateString()}</p>}</Card>
      <Section title="Evidence documents">
        <Input label="Evidence label" value={documentType} onChange={(event) => setDocumentType(event.target.value)} placeholder="e.g. Business registration" />
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-white px-4 py-4 text-sm font-semibold text-brand-700">
          <Upload size={17} />{busy ? 'Uploading or checking scan…' : 'Choose evidence file'}
          <input type="file" className="sr-only" disabled={busy} onChange={upload} />
        </label>
        {pendingFiles.map((file) => <Card key={file.fileId} className="mt-2 !p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{file.fileName}</p><p className="text-xs text-ink-500">Security scan pending</p></div><Button size="sm" variant="secondary" disabled={busy} onClick={() => checkScan(file)}>Check</Button></div></Card>)}
        {loading && <p className="mt-3 text-sm text-ink-500">Loading verification records…</p>}
        {!loading && documents.length === 0 && <p className="mt-3 text-sm text-ink-500">No evidence documents registered yet.</p>}
        <div className="mt-3 space-y-2">{documents.map((document) => <Card key={document.id} className="!p-3"><p className="text-sm font-semibold">{document.documentType}</p><p className="mt-1 text-xs text-ink-500">Uploaded {new Date(document.submittedAt).toLocaleString()}</p></Card>)}</div>
      </Section>
      <Select label="Verification level" value={level} onChange={(event) => setLevel(event.target.value)} options={VERIFICATION_LEVEL_OPTIONS} />
      <Section title="Submission history">
        {verifications.length === 0 && <p className="text-sm text-ink-500">No verification requests yet.</p>}
        <div className="space-y-2">{verifications.map((verification) => <Card key={verification.id} className="!p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{verification.level} · {statusLabels[verification.status] || verification.status}</p><Badge tone="gray">{new Date(verification.submittedAt).toLocaleDateString()}</Badge></div>{verification.reason && <p className="mt-2 text-sm text-ink-600">{verification.reason}</p>}</Card>)}</div>
      </Section>
    </Screen>
  )
}

export function VendorRegister({ params = {} }) {
  const nav = useNav()
  const { me, setMe, vendors, setVendors, notify, toast, stamp } = useApp()
  const existing = me.role === 'vendor' ? vendors.find((v) => v.id === me.vendorId) : null
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ name: params.name || me.biz || existing?.name || '', owner: me.name || '', vendorType: params.vendorType || existing?.vendorType || 'service_provider', cat: params.cat || 'elec', gstin: '', pan: '', email: '', years: '2020', areas: ['Jaipur'], branches: ['Main outlet â€” Jaipur'], certifications: '' })
  const [br, setBr] = useState('')
  const [docs, setDocs] = useState({})
  const [consent, setConsent] = useState(false)
  const [errs, setErrs] = useState({})
  const [paying, setPaying] = useState(null)
  const [paidPlan, setPaidPlan] = useState(null)
  const [busy, setBusy] = useState(false)
  const created = useRef(false)
  const set = (k) => (e) => { setF({ ...f, [k]: e?.target ? e.target.value : e }); setErrs({ ...errs, [k]: '' }) }
  const validate = () => {
    const e = {}
    if (step === 0) {
      if (f.name.trim().length < 3) e.name = 'Enter your business name'
      if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(f.gstin.toUpperCase())) e.gstin = 'Enter a valid 15-character GSTIN (e.g. 08ABCPS1234F1Z5)'
      if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(f.pan.toUpperCase())) e.pan = 'Enter a valid PAN (e.g. ABCPS1234F)'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid business email'
    }
    if (step === 1) { if (!f.areas.length) e.areas = 'Select at least one service area'; if (!f.branches.length) e.branches = 'Add at least one branch / outlet' }
    if (step === 2 && !authService.isRemote) { const miss = DOCS.filter((d) => !docs[d]); if (miss.length) e.docs = `${miss.length} required document${miss.length > 1 ? 's' : ''} missing` }
    if (step === 3 && !consent) e.consent = 'Please confirm to submit'
    setErrs(e)
    return Object.keys(e).length === 0
  }
  const next = async () => {
    if (!validate()) return
    if (step < 3) return setStep(step + 1)
    let vendorId = 'v-new'
    if (authService.isRemote && !created.current) {
      setBusy(true)
      const businessType = params.businessType || (f.vendorType === 'manufacturer_supplier' ? 'MANUFACTURER' : 'SERVICE_PROVIDER')
      const result = await authService.createVendor({ registrationCountry: params.country || 'IN', businessType, legalName: f.name.trim() })
      setBusy(false)
      if (!result.ok) return toast(result.message, 'warn')
      if (!result.vendor?.id) return toast('Vendor was created without an ID; reload and contact support before continuing.', 'warn')
      vendorId = result.vendor.id
      created.current = true
    }
    const rec = { id: vendorId, name: f.name, owner: f.owner, vendorType: f.vendorType, cat: f.cat, city: f.areas[0], areas: f.areas, branches: f.branches.length, rating: 0, reviews: 0, status: authService.isRemote ? 'pending' : 'submitted', tone: cat(f.cat).tone, since: +f.years, gstin: f.gstin.toUpperCase(), phone: me.phone || '+91 98290 00099', email: f.email, plan: 'Starter', certifications: f.certifications, docs: authService.isRemote ? [] : DOCS.map((d) => ({ name: d, status: 'pending' })), history: authService.isRemote ? [] : [{ s: 'submitted', at: stamp(), by: f.owner }] }
    setVendors((vs) => [rec, ...vs.filter((x) => x.id !== vendorId && x.id !== 'v-new')])
    const fromCustomer = me.role === 'customer'
    setMe({ ...me, role: fromCustomer ? 'vendor' : me.role, loggedIn: true, guest: false, vendorId, vendorName: f.name, customerName: fromCustomer ? me.name : me.customerName, hasVendorAccount: true, buyerMode: false })
    if (authService.isRemote) toast('Vendor profile created — upload evidence and submit verification')
    else { notify('admin', 'Vendor awaiting review', `${f.name} submitted for verification.`, 'onboarding'); toast('Submitted for verification') }
    nav.reset(fromCustomer ? 'v_dash' : 'v_verify')
  }
  return (
    <Screen title="Vendor registration" subtitle={`Step ${step + 1} of 4`} back={step > 0} right={step === 0 ? null : null} footer={<div className="flex gap-2">{step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}<Button className="flex-1" size="lg" disabled={busy} onClick={next}>{busy ? 'Creating profile…' : step === 3 ? authService.isRemote ? 'Create vendor profile' : 'Submit for verification' : 'Continue'}</Button></div>}>
      <Stepper steps={['Business', 'Locations', 'Documents', 'Review']} current={step} />
      {step === 0 && (
        <div className="space-y-4">
          <Input label="Business name" required value={f.name} onChange={set('name')} error={errs.name} />
          <Input label="Owner / authorised person" value={f.owner} onChange={set('owner')} />
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Vendor type</p><Segmented value={f.vendorType} onChange={set('vendorType')} options={[{ id: 'service_provider', label: 'Service provider' }, { id: 'manufacturer_supplier', label: 'Manufacturer / supplier' }]} /><p className="mt-1.5 text-xs text-ink-500">This changes the evidence and catalogue journey shown after approval.</p></div>
          <Select label="Primary category" value={f.cat} onChange={set('cat')} options={CATS.map((c) => ({ value: c.id, label: c.name }))} />
          <Input label="GSTIN" required placeholder="08ABCPS1234F1Z5" maxLength={15} value={f.gstin} onChange={(e) => set('gstin')(e.target.value.toUpperCase())} error={errs.gstin} />
          <Input label="PAN" required placeholder="ABCPS1234F" maxLength={10} value={f.pan} onChange={(e) => set('pan')(e.target.value.toUpperCase())} error={errs.pan} />
          <Input label="Business email" required type="email" value={f.email} onChange={set('email')} error={errs.email} />
          <Input label={f.vendorType === 'manufacturer_supplier' ? 'Product certifications / standards' : 'Service licences / certifications'} value={f.certifications} onChange={set('certifications')} placeholder={f.vendorType === 'manufacturer_supplier' ? 'e.g. ISO, BIS, export certificates' : 'e.g. trade licence, safety certification'} />
          <Select label="Operating since" value={f.years} onChange={set('years')} options={Array.from({ length: 15 }, (_, i) => String(2026 - i))} />
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Service areas</p><Chips scroll={false} multi value={f.areas} onChange={set('areas')} options={['Jaipur', 'Delhi NCR', 'Ajmer', 'Sikar', 'Jodhpur', 'Kota']} />{errs.areas && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.areas}</p>}</div>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-700">Branches / outlets</p>
            <div className="space-y-2">{f.branches.map((b) => <div key={b} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-inset ring-ink-200"><MapPin size={17} className="text-brand-600" /><span className="flex-1 text-sm font-medium">{b}</span><button aria-label="Remove" onClick={() => setF({ ...f, branches: f.branches.filter((x) => x !== b) })}><X size={17} className="text-ink-400" /></button></div>)}</div>
            <div className="mt-2 flex gap-2"><input value={br} onChange={(e) => setBr(e.target.value)} placeholder="Add branch address" className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /><Button variant="soft" onClick={() => { if (br.trim()) { setF({ ...f, branches: [...f.branches, br.trim()] }); setBr('') } }}>Add</Button></div>
            {errs.branches && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.branches}</p>}
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          {authService.isRemote
            ? <Banner tone="blue">Evidence files are uploaded from the verification screen after your vendor profile is created. No evidence is submitted in this mock registration step.</Banner>
            : <><Banner tone="blue">Upload clear PDF or photo copies. Documents are stored securely and visible only to verification staff.</Banner>
              {DOCS.map((d) => <DocTile key={d} name={d} status={docs[d] ? 'pending' : 'missing'} onAction={() => setDocs({ ...docs, [d]: !docs[d] })} actionLabel={docs[d] ? 'Remove' : 'Upload'} note={docs[d] ? 'Uploaded · awaiting review' : 'Required'} />)}
              {errs.docs && <p className="text-xs font-medium text-red-600">{errs.docs}</p>}</>}
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <Card><KV rows={ [['Business', f.name], ['Vendor type', f.vendorType === 'manufacturer_supplier' ? 'Manufacturer / supplier' : 'Service provider'], ['Category', cat(f.cat).name], ['GSTIN', f.gstin.toUpperCase()], ['PAN', f.pan.toUpperCase()], ['Coverage', f.areas.join(', ')], ['Branches', f.branches.length], ['Certifications', f.certifications || 'To be reviewed'], ['Documents', authService.isRemote ? 'Upload from verification after profile creation' : `${Object.values(docs).filter(Boolean).length}/4 uploaded`]]} /></Card>
          <Banner tone="amber" title="What happens next">Super Admin reviews your application and will approve, reject with a reason, or request more information. You will not be shown as Verified until approved.</Banner>
          <div><Checkbox checked={consent} onChange={(v) => { setConsent(v); setErrs({}) }}>I confirm the details are accurate and consent to VendorVerse verifying my documents.</Checkbox>{errs.consent && <p className="mt-1 text-xs font-medium text-red-600">{errs.consent}</p>}</div>
        </div>
      )}
    </Screen>
  )
}

/* ================= VERIFICATION STATUS ================= */
export function VendorVerify() {
  const nav = useNav()
  const v = useMyVendor()
  const { patchVendor, notify, toast, stamp, settings } = useApp()
  const [fixed, setFixed] = useState({})
  const [paying, setPaying] = useState(null)
  const [paidPlan, setPaidPlan] = useState(null)
  if (!v) return <VendorWorkspace><Screen title="Verification"><EmptyState icon={ShieldCheck} title="No application yet" action={<Button onClick={() => nav.go('v_register')}>Start registration</Button>} /></Screen></VendorWorkspace>
  if (authService.isRemote) return <VendorWorkspace><RemoteVendorVerification vendor={v} /></VendorWorkspace>
  const meta = {
    submitted: ['blue', 'Under review', 'We usually respond within 1â€“2 business days.'],
    info: ['amber', 'More information needed', 'Please correct the items below and resubmit.'],
    rejected: ['red', 'Application rejected', 'You can correct the issues and resubmit.'],
    approved: ['green', 'Verified vendor', 'Your business is shown as Verified to customers.'],
    suspended: ['red', 'Account suspended', 'Contact support for assistance.'],
  }[v.status] || ['gray', v.status, '']
  const last = v.history[v.history.length - 1]
  const needsFix = ['info', 'rejected'].includes(v.status)
  const resubmit = () => {
    patchVendor(v.id, (x) => ({ status: 'submitted', docs: x.docs.map((d) => (fixed[d.name] ? { ...d, status: 'pending', note: undefined } : d)), history: [...x.history, { s: 'submitted', at: stamp(), by: x.owner, note: 'Corrected and resubmitted' }] }))
    notify('admin', 'Vendor resubmitted', `${v.name} corrected their application.`, 'onboarding')
    toast('Resubmitted for review')
  }
  const bad = v.docs.filter((d) => ['rejected', 'missing'].includes(d.status))
  return (
    <VendorWorkspace>
    <Screen title="Verification" footer={needsFix ? <Button full size="lg" disabled={bad.some((d) => !fixed[d.name])} onClick={resubmit}>Resubmit for review</Button> : null}>
      <DemoPhonePePayment open={!!paying} amount={paying?.price} title={`${paying?.name || ''} subscription`} onClose={() => setPaying(null)} onSuccess={() => { patchVendor(v.id, { plan: paying.name }); setPaidPlan(paying); setPaying(null) }} />
      <div className="vv-vendor-verify-body">
      <Card className={cx('!p-5 text-center', { green: 'bg-emerald-50', blue: 'bg-sky-50', amber: 'bg-amber-50', red: 'bg-red-50' }[meta[0]])}>
        <div className={cx('mx-auto grid size-16 place-items-center rounded-full bg-white shadow', { green: 'text-emerald-600', blue: 'text-sky-600', amber: 'text-amber-600', red: 'text-red-600' }[meta[0]])}>{v.status === 'approved' ? <BadgeCheck size={36} /> : v.status === 'submitted' ? <Clock size={34} /> : <AlertTriangle size={34} />}</div>
        <h2 className="mt-3 text-lg font-extrabold">{meta[1]}</h2>
        <p className="mt-1 text-sm text-ink-600">{meta[2]}</p>
        {needsFix && last?.note && <div className="mt-3 rounded-xl bg-white p-3 text-left text-sm"><p className="text-xs font-bold uppercase text-ink-400">Reviewer note</p><p className="mt-0.5 font-medium text-ink-800">{last.note}</p></div>}
      </Card>
      <Section title="Documents">
        <div className="space-y-2">
          {v.docs.map((d) => {
            const fix = ['rejected', 'missing'].includes(d.status)
            return <DocTile key={d.name} name={d.name} status={fixed[d.name] ? 'pending' : d.status} note={fixed[d.name] ? 'New file uploaded' : d.note} onAction={fix && needsFix ? () => setFixed({ ...fixed, [d.name]: !fixed[d.name] }) : undefined} actionLabel={fixed[d.name] ? 'Undo' : 'Re-upload'} />
          })}
        </div>
      </Section>
      <Section title="Status history"><Card><Timeline steps={v.history.map((h, i) => ({ label: { submitted: 'Submitted for review', info: 'More information requested', approved: 'Approved', rejected: 'Rejected' }[h.s] || h.s, at: `${h.at} Â· ${h.by}`, note: h.note, done: i < v.history.length - 1 || h.s === 'approved', current: i === v.history.length - 1 && h.s !== 'approved' }))} /></Card></Section>
      <Section title="Subscription plans"><div className="grid gap-3">{settings.plans.map((p) => <Card key={p.id} className={cx('relative overflow-hidden', p.name === 'Growth' && 'ring-2 ring-brand-500')}><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-extrabold">{p.name}</p><p className="mt-1 text-sm font-bold text-amber-700">Price open (CFG-02) Â· sample values</p></div>{p.name === 'Growth' && <Badge tone="teal">Popular</Badge>}</div><p className="mt-3 text-sm text-ink-500">{p.listings} listings Â· {p.leads} enquiries/month</p><Button full className="mt-4" variant={v.plan === p.name ? 'secondary' : 'primary'} disabled={v.plan === p.name} onClick={() => nav.go('v_checkout', { plan: p.name })}>{v.plan === p.name ? 'Current plan' : `Choose ${p.name}`}</Button></Card>)}</div></Section>
      {paying && <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/60 p-4"><Card className="w-full max-w-sm !p-0 overflow-hidden"><div className="p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-brand-700">Secure checkout demo</p><p className="mt-1 text-xl font-black">{paying.name} plan</p></div><button aria-label="Close payment" onClick={() => setPaying(null)}><X /></button></div><div className="my-5 rounded-2xl bg-gradient-to-br from-violet-700 to-indigo-600 p-5 text-white"><p className="text-sm text-white/70">VendorVerse subscription</p><p className="mt-2 text-3xl font-black">â‚¹{paying.price}<span className="text-sm font-semibold text-white/70"> / month</span></p><p className="mt-4 text-xs text-white/70">Demo payment Â· no real money is charged</p></div><Button full disabled={paying.loading} onClick={() => { setPaying({ ...paying, loading: true }); setTimeout(() => { setPaidPlan(paying); setPaying(null) }, 1600) }}>{paying.loading ? <><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Processing paymentâ€¦</> : <><Wallet size={17} /> Pay securely with PhonePe</>}</Button><p className="mt-3 text-center text-[11px] text-ink-400">UPI Â· Cards Â· Net banking</p></div></Card></div>}
      </div>
      {paidPlan && <div className="fixed inset-0 z-[51] grid place-items-center bg-ink-950/60 p-4"><Card className="w-full max-w-sm text-center"><div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={40} strokeWidth={3} /></div><p className="mt-5 text-2xl font-black">Payment successful</p><p className="mt-2 text-sm text-ink-500">Your {paidPlan.name} subscription is active.</p><p className="mt-5 rounded-xl bg-ink-50 p-3 text-sm font-bold">â‚¹{paidPlan.price} Â· Demo transaction</p><Button full className="mt-5" onClick={() => setPaidPlan(null)}>Done</Button></Card></div>}
    </Screen>
    </VendorWorkspace>
  )
}

/* ================= LISTINGS ================= */
export function VendorListings() {
  const nav = useNav()
  const { me, listings } = useApp()
  const [tab, setTab] = useState('all')
  const mine = listings.filter((l) => l.vendorId === me.vendorId)
  const list = mine.filter((l) => tab === 'all' || (tab === 'live' ? l.status === 'approved' : tab === 'pending' ? l.status === 'pending' : ['rejected', 'suspended'].includes(l.status)))
  const cnt = (f) => mine.filter(f).length
  return (
    <VendorWorkspace>
    <Screen title="My listings" back={false} right={<Button size="sm" icon={Plus} className="mr-2" onClick={() => nav.go('v_listing_edit')}>Add</Button>}>
      <UsageMeter compact />
      <Segmented value={tab} onChange={setTab} options={[{ id: 'all', label: 'All', count: mine.length }, { id: 'live', label: 'Live', count: cnt((l) => l.status === 'approved') }, { id: 'pending', label: 'Review', count: cnt((l) => l.status === 'pending') }, { id: 'issues', label: 'Issues', count: cnt((l) => ['rejected', 'suspended'].includes(l.status)) }]} />
      <div className="vv-vendor-listing-grid space-y-2.5">
        {list.map((l) => (
          <Card key={l.id} onClick={() => nav.go('v_listing_edit', { id: l.id })} className="!p-3">
            <div className="flex gap-3">
              <Thumb tone={l.tone} icon={cat(l.cat).icon} size={68} round="rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-sm font-bold leading-snug">{l.title}</p><StatusBadge s={l.status} /></div>
                <p className="mt-1 text-sm font-extrabold">{fmt(l.price)}<span className="text-xs font-normal text-ink-400">/{l.unit}</span></p>
                <div className="mt-1 flex items-center gap-2 text-xs text-ink-500">{l.type === 'product' ? <span>Lead time {l.lead}d</span> : <span>{l.duration} min service</span>}{l.rating > 0 && <Rating value={l.rating} />}</div>
              </div>
            </div>
            {l.reason && <p className="mt-2.5 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">{l.reason}</p>}
          </Card>
        ))}
        {!list.length && <EmptyState icon={Package} title="No listings here" body="Create a listing to start receiving orders and bookings." action={<Button size="sm" onClick={() => nav.go('v_listing_edit')}>Add listing</Button>} />}
      </div>
    </Screen>
    </VendorWorkspace>
  )
}

export function ListingEdit({ params = {} }) {
  const nav = useNav()
  const { me, listings, setListings, patchListing, notify, toast, vendors } = useApp()
  const ex = params.id ? listings.find((l) => l.id === params.id) : null
  const [f, setF] = useState(ex ? { ...ex, price: String(ex.price), mrp: ex.mrp ? String(ex.mrp) : '', stock: String(ex.stock ?? ''), moq: String(ex.moq ?? 1), lead: String(ex.lead ?? 1), duration: String(ex.duration ?? 60), imgs: 2, specVals: Object.fromEntries((ex.specs || []).map(([k, v]) => [k, v === 'â€”' ? '' : v])) } : { type: 'product', cat: vendors.find((v) => v.id === me.vendorId)?.cat || 'elec', sub: '', title: '', desc: '', price: '', mrp: '', unit: 'piece', stock: '', moq: '1', lead: '1', duration: '60', variants: [], imgs: 0, specVals: {} })
  const [vi, setVi] = useState('')
  const [errs, setErrs] = useState({})
  const [del, setDel] = useState(false)
  const c = cat(f.cat)
  const set = (k) => (e) => { setF({ ...f, [k]: e?.target ? e.target.value : e }); setErrs({ ...errs, [k]: '' }) }
  const save = (submit) => {
    const e = {}
    if (f.title.trim().length < 5) e.title = 'Title must be at least 5 characters'
    if (f.desc.trim().length < 20) e.desc = 'Add a description (min 20 characters)'
    if (!(+f.price > 0)) e.price = 'Enter a price greater than 0'
    if (f.mrp && +f.mrp < +f.price) e.mrp = 'MRP cannot be lower than the selling price'
    if (f.imgs < 1) e.imgs = 'Add at least one image'
    setErrs(e)
    if (Object.keys(e).length) return toast('Please fix the highlighted fields', 'warn')
    const body = { type: f.type, cat: f.cat, sub: f.sub || c.subs[0], title: f.title.trim(), desc: f.desc.trim(), price: +f.price, mrp: f.mrp ? +f.mrp : undefined, unit: f.unit, tone: c.tone, specs: c.fields.map((k) => [k, f.specVals[k] || 'â€”']), ...(f.type === 'product' ? { stock: +f.stock, moq: +f.moq, lead: +f.lead, variants: f.variants } : { duration: +f.duration }) }
    if (ex) {
      patchListing(ex.id, { ...body, status: ex.status === 'rejected' ? 'pending' : ex.status, reason: undefined })
      toast(ex.status === 'rejected' ? 'Resubmitted for approval' : 'Listing updated')
    } else {
      setListings((l) => [{ id: 'l' + Date.now(), vendorId: me.vendorId, rating: 0, reviews: 0, status: submit ? 'pending' : 'draft', ...body }, ...l])
      if (submit) notify('admin', 'Listing pending moderation', body.title, 'listing')
      toast(submit ? 'Submitted for approval' : 'Saved as draft')
    }
    nav.back()
  }
  return (
    <Screen
      title={ex ? 'Edit listing' : 'New listing'}
      right={ex && <IconBtn label="Delete" onClick={() => setDel(true)}><Trash2 size={19} className="text-red-500" /></IconBtn>}
      overlay={<Dialog open={del} onClose={() => setDel(false)} title="Remove this listing?" actions={<><Button variant="secondary" className="flex-1" onClick={() => setDel(false)}>Keep</Button><Button variant="danger" className="flex-1" onClick={() => { setListings((l) => l.filter((x) => x.id !== ex.id)); toast('Listing removed'); nav.back() }}>Remove</Button></>}><p>It will no longer appear to customers. Open orders are not affected.</p></Dialog>}
      footer={<div className="flex gap-2">{!ex && <Button variant="secondary" onClick={() => save(false)}>Save draft</Button>}<Button className="flex-1" size="lg" onClick={() => save(true)}>{ex ? (ex.status === 'rejected' ? 'Resubmit' : 'Save changes') : 'Submit for approval'}</Button></div>}
    >
      {ex && <div className="flex items-center justify-between rounded-2xl bg-white p-3.5 ring-1 ring-ink-100"><span className="text-sm font-semibold">Moderation status</span><StatusBadge s={ex.status} /></div>}
      {ex?.reason && <Banner tone="red" title="Rejected by admin">{ex.reason}</Banner>}
      {!ex && <Segmented value={f.type} onChange={(t) => setF({ ...f, type: t, unit: t === 'service' ? 'visit' : 'piece' })} options={[{ id: 'product', label: 'Product' }, { id: 'service', label: 'Service' }]} />}
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-700">Images <span className="text-red-500">*</span></p>
        <div className="flex gap-2">{Array.from({ length: f.imgs }).map((_, i) => <div key={i} className="relative grid size-[72px] place-items-center rounded-xl bg-gradient-to-br from-ink-200 to-ink-300 text-ink-500"><ImagePlus size={20} /><button aria-label="Remove image" onClick={() => setF({ ...f, imgs: f.imgs - 1 })} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink-900 text-white"><X size={11} /></button></div>)}{f.imgs < 5 && <button onClick={() => { setF({ ...f, imgs: f.imgs + 1 }); setErrs({ ...errs, imgs: '' }) }} className="grid size-[72px] place-items-center rounded-xl border-2 border-dashed border-ink-300 text-ink-400"><Plus size={20} /></button>}</div>
        {errs.imgs && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.imgs}</p>}
      </div>
      <Input label="Title" required value={f.title} onChange={set('title')} error={errs.title} placeholder="e.g. Havells 1.5 sq mm wire â€“ 90 m" />
      <div className="flex gap-3">
        <Select label="Category" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value, sub: '', specVals: {} })} options={CATS.filter((x) => x.type === f.type).map((x) => ({ value: x.id, label: x.name }))} />
        <Select label="Subcategory" value={f.sub || c.subs[0]} onChange={set('sub')} options={c.subs} />
      </div>
      <Input label="Description" required textarea rows={4} value={f.desc} onChange={set('desc')} error={errs.desc} />
      <div className="flex gap-3"><Input label="Price (â‚¹)" required prefix="â‚¹" inputMode="numeric" value={f.price} onChange={(e) => set('price')(e.target.value.replace(/\D/g, ''))} error={errs.price} /><Input label="MRP (â‚¹)" prefix="â‚¹" inputMode="numeric" value={f.mrp} onChange={(e) => set('mrp')(e.target.value.replace(/\D/g, ''))} error={errs.mrp} /></div>
      <Select label="Unit" value={f.unit} onChange={set('unit')} options={f.type === 'product' ? ['piece', 'set', 'pack', 'bag', 'coil', 'tonne', 'box'] : ['visit', 'job', 'hour', 'plate', 'sofa']} />
      {f.type === 'product' ? (
        <>
          <Input label="Typical lead time (days)" inputMode="numeric" value={f.lead} onChange={(e) => set('lead')(e.target.value.replace(/\D/g, ''))} hint="Shown to customers as an estimate" />
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-700">Variants</p>
            <div className="mb-2 flex flex-wrap gap-2">{(f.variants || []).map((v) => <span key={v} className="flex items-center gap-1.5 rounded-full bg-ink-900 py-1.5 pl-3 pr-2 text-xs font-semibold text-white">{v}<button aria-label={`Remove ${v}`} onClick={() => setF({ ...f, variants: f.variants.filter((x) => x !== v) })}><X size={13} /></button></span>)}</div>
            <div className="flex gap-2"><input value={vi} onChange={(e) => setVi(e.target.value)} placeholder="e.g. Red, 12 mm" className="h-11 flex-1 rounded-xl bg-white px-3.5 text-sm outline-none ring-1 ring-inset ring-ink-200 focus:ring-2 focus:ring-brand-500" /><Button variant="soft" onClick={() => { if (vi.trim()) { setF({ ...f, variants: [...(f.variants || []), vi.trim()] }); setVi('') } }}>Add</Button></div>
          </div>
        </>
      ) : (
        <Select label="Service duration" value={f.duration} onChange={set('duration')} options={[{ value: '30', label: '30 minutes' }, { value: '60', label: '1 hour' }, { value: '90', label: '1.5 hours' }, { value: '180', label: '3 hours' }, { value: '240', label: '4 hours' }, { value: '480', label: 'Full day' }]} hint="Availability is managed under More â†’ Availability" />
      )}
      <Section title={`${c.name} details`}>
        <div className="space-y-3">{c.fields.map((k) => <Input key={k} label={k} value={f.specVals[k] || ''} onChange={(e) => setF({ ...f, specVals: { ...f.specVals, [k]: e.target.value } })} />)}</div>
        <p className="mt-2 text-xs text-ink-500">Required fields are defined per category by the Super Admin.</p>
      </Section>
    </Screen>
  )
}

/* ================= WORK (orders / bookings / RFQs) ================= */

const NEXT_ORDER = { placed: ['confirmed', 'Confirm order'], confirmed: ['packed', 'Mark as packed'], packed: ['shipped', 'Mark as shipped'], shipped: ['delivered', 'Mark as delivered'] }
const ORDER_STEPS = [['placed', 'Order placed'], ['confirmed', 'Confirmed'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['delivered', 'Delivered']]


export function VendorRfq({ params }) {
  const nav = useNav()
  const { rfqs, patchRfq, me, notify, toast, vendor } = useApp()
  const r = rfqs.find((x) => x.id === (params.id || 'RFQ-315'))
  const mine = r.quotes.find((q) => q.vendorId === me.vendorId)
  const [f, setF] = useState({ amount: mine ? String(mine.amount) : '', lead: mine ? String(mine.lead) : '', validity: mine?.validity ? new Date(mine.validity).toISOString().slice(0, 10) : (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) })(), notes: mine?.notes || '' })
  const [errs, setErrs] = useState({})
  const locked = r.status === 'accepted' || r.status === 'closed'
  const submit = () => {
    const e = {}
    if (!(+f.amount > 0)) e.amount = 'Enter your quoted amount'
    if (!(+f.lead > 0)) e.lead = 'Enter delivery time in days'
    if (!f.validity || f.validity < new Date().toISOString().slice(0, 10)) e.validity = 'Choose a current or future validity date'
    if (f.notes.trim().length < 5) e.notes = 'Add a short note for the customer'
    setErrs(e)
    if (Object.keys(e).length) return
    const [y, m, d] = f.validity.split('-'); const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]
    patchRfq(r.id, (x) => {
      const q = x.quotes.find((k) => k.vendorId === me.vendorId)
      const entry = { amount: +f.amount, at: 'Just now' }
      const quotes = q ? x.quotes.map((k) => (k.vendorId === me.vendorId ? { ...k, amount: +f.amount, lead: +f.lead, validity: `${d} ${mon} ${y}`, notes: f.notes, status: 'submitted', history: [...k.history, entry] } : k)) : [...x.quotes, { id: 'q' + Date.now(), vendorId: me.vendorId, amount: +f.amount, lead: +f.lead, validity: `${d} ${mon} ${y}`, notes: f.notes, status: 'submitted', history: [entry] }]
      return { status: 'quoted', quotes, history: [...x.history, { s: 'quoted', at: 'Just now', note: `${vendor(me.vendorId)?.name} ${q ? 'revised' : 'submitted'} a quotation` }] }
    })
    if (r.mine && r.buyerType === 'vendor') notify('vendor', mine ? 'Supplier quotation revised' : 'Supplier quotation received', `${vendor(me.vendorId)?.name} quoted ${fmt(+f.amount)} for ${r.id}.`, 'rfq')
    else if (r.mine) notify('customer', mine ? 'Quotation revised' : 'New quotation received', `${vendor(me.vendorId)?.name} quoted ${fmt(+f.amount)} for ${r.id}.`, 'rfq')
    toast(mine ? 'Quotation revised' : 'Quotation submitted')
  }
  return (
    <Screen title={r.id} subtitle={r.customer} right={<StatusBadge s={r.status} className="mr-2" />} footer={!locked && <Button full size="lg" onClick={submit}>{mine ? 'Revise quotation' : 'Submit quotation'}</Button>}>
      <Card><p className="text-base font-bold">{r.title}</p><p className="mt-2 text-sm text-ink-600">{r.desc}</p><div className="mt-3 grid grid-cols-2 gap-2.5"><Meta icon={Package}>{r.qty}</Meta><Meta icon={IndianRupee}>{r.budget}</Meta><Meta icon={Clock}>Due {r.deadline}</Meta><Meta icon={MapPin}>{r.location}</Meta></div></Card>
      {r.files.length > 0 && <div className="space-y-2">{r.files.map((x) => <div key={x} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-inset ring-ink-200"><FileText size={18} className="text-brand-600" /><span className="flex-1 truncate text-sm font-medium">{x}</span><Download size={16} className="text-ink-400" /></div>)}</div>}
      {mine?.status === 'accepted' && <Banner tone="green" title="You won this RFQ ðŸŽ‰">Your quotation was accepted. Prepare to fulfil as agreed.</Banner>}
      {locked && mine && mine.status !== 'accepted' && <Banner tone="gray" title="Not selected">The customer chose another vendor.</Banner>}
      {r.chat.filter((c) => c.from === 'me').length > 0 && r.mine && <Banner tone="blue" title="Customer question">{r.chat.filter((c) => c.from === 'me').slice(-1)[0].text}</Banner>}
      {!locked && (
        <Section title={mine ? 'Your quotation' : 'Submit quotation'}>
          <div className="space-y-4">
            <div className="flex gap-3"><Input label="Total amount (â‚¹)" required prefix="â‚¹" inputMode="numeric" value={f.amount} onChange={(e) => { setF({ ...f, amount: e.target.value.replace(/\D/g, '') }); setErrs({ ...errs, amount: '' }) }} error={errs.amount} /><Input label="Delivery (days)" required inputMode="numeric" value={f.lead} onChange={(e) => { setF({ ...f, lead: e.target.value.replace(/\D/g, '') }); setErrs({ ...errs, lead: '' }) }} error={errs.lead} /></div>
            <Input label="Quote valid until" type="date" min={new Date().toISOString().slice(0, 10)} value={f.validity} onChange={(e) => { setF({ ...f, validity: e.target.value }); setErrs({ ...errs, validity: '' }) }} error={errs.validity} />
            <Input label="Notes to customer" required textarea rows={3} value={f.notes} onChange={(e) => { setF({ ...f, notes: e.target.value }); setErrs({ ...errs, notes: '' }) }} error={errs.notes} placeholder="Brand, warranty, inclusions, payment termsâ€¦" />
          </div>
        </Section>
      )}
      {mine && <Section title="Quotation history"><Card><Timeline steps={[...mine.history].reverse().map((h, i) => ({ label: fmt(h.amount), at: h.at, note: i === 0 ? 'Current' : 'Superseded', done: true }))} /></Card></Section>}
    </Screen>
  )
}

export function VendorOrders() {
  const nav = useNav()
  const { me, orders, listings, patchOrder, notify, toast, stamp } = useApp()
  const mine = orders.filter((o) => o.vendorId === me.vendorId)
  const next = { placed: ['confirmed', 'Accept order'], confirmed: ['packed', 'Start processing'], packed: ['shipped', 'Mark shipped'], shipped: ['delivered', 'Mark delivered'] }
  const advance = (o) => { const n = next[o.status]; if (!n) return; patchOrder(o.id, (x) => ({ ...x, status: n[0], history: [...(x.history || []), { s: n[0], at: stamp(), note: n[1] }] })); notify('customer', `Order ${n[0]}`, `${o.id} Â· ${n[1]}`, 'order'); toast(`${o.id} updated`) }
  const reject = (o) => { patchOrder(o.id, (x) => ({ ...x, status: 'rejected', history: [...(x.history || []), { s: 'rejected', at: stamp(), note: 'Supplier declined the order' }] })); notify('customer', 'Order rejected', `${o.id} Â· Supplier declined the order`, 'order'); toast(`${o.id} rejected`, 'warn') }
  return <VendorWorkspace><Screen title="Purchase orders" back={false}>
    <Banner tone="blue">Supplier orders from direct catalogue purchases and accepted quotations appear here. Progress updates are visible to the buyer.</Banner>
    <div className="space-y-2.5">{mine.map((o) => { const l = listings.find((x) => x.id === o.listingId); return <Card key={o.id} className="!p-3.5"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-bold text-ink-500">{o.id} Â· {o.customer}</p><p className="mt-1 text-sm font-bold">{l?.title || 'Supplier order'}</p><p className="mt-1 text-xs text-ink-500">{o.qty} {l?.unit || 'units'} Â· {fmt(o.total || 0)} Â· {o.address}</p></div><StatusBadge s={o.status} /></div>{o.status === 'placed' && <Button size="sm" variant="dangerSoft" className="mt-3 mr-2" onClick={() => reject(o)}>Reject order</Button>}{next[o.status] && <Button size="sm" className="mt-3" onClick={() => advance(o)}>{next[o.status][1]}</Button>}<button className="ml-2 mt-3 text-xs font-bold text-brand-700" onClick={() => nav.go('c_order', { id: o.id })}>View tracking</button></Card> })}{!mine.length && <EmptyState icon={Package} title="No purchase orders yet" body="Orders created by buyers will appear here." />}</div>
  </Screen></VendorWorkspace>
}

/* ================= AVAILABILITY ================= */

/* ================= INVENTORY ================= */

/* ================= EARNINGS ================= */

/* ================= PERFORMANCE ================= */
export function Performance() {
  const { toast, me, listings } = useApp()
  const nav = useNav()
  const [range, setRange] = useState('30')
  const chartData = {
    '7': [{ label: 'M', value: 12 }, { label: 'T', value: 18 }, { label: 'W', value: 15 }, { label: 'T', value: 22 }, { label: 'F', value: 27 }, { label: 'S', value: 25 }, { label: 'S', value: 31 }],
    '30': [{ label: 'W1', value: 18 }, { label: 'W2', value: 24 }, { label: 'W3', value: 20 }, { label: 'W4', value: 33 }, { label: 'W5', value: 29 }, { label: 'W6', value: 41 }],
    '90': [{ label: 'Jan', value: 40 }, { label: 'Feb', value: 36 }, { label: 'Mar', value: 52 }, { label: 'Apr', value: 48 }, { label: 'May', value: 64 }, { label: 'Jun', value: 58 }],
  }[range]
  const statValues = { 7: [14, '92%', '9', '1.5 hrs'], 30: [61, '94%', '34', '1.2 hrs'], 90: [172, '95%', '97', '1.1 hrs'] }[range]
  const top = CATS.map((category) => ({
    ...category,
    count: listings.filter((listing) => listing.vendorId === me.vendorId && listing.status === 'approved' && listing.cat === category.id).length,
  })).filter((category) => category.count > 0).sort((a, b) => b.count - a.count).slice(0, 5)
  const chartMax = Math.max(...chartData.map((point) => point.value), 1)
  const path = chartData.map((point, index) => {
    const x = 36 + index * ((560 - 36) / Math.max(1, chartData.length - 1))
    const y = 170 - (point.value / chartMax) * 118
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')
  const area = `${path} L ${36 + (chartData.length - 1) * ((560 - 36) / Math.max(1, chartData.length - 1))} 190 L 36 190 Z`
  const conversionRows = [
    { label: 'Quotes sent', value: 34, max: 34, tone: 'mint' },
    { label: 'Shortlisted', value: 19, max: 34, tone: 'sky' },
    { label: 'Won', value: 9, max: 34, tone: 'violet' },
  ]
  return (
    <VendorWorkspace>
    <Screen title="Performance">
      <div className="vx-perf-shell">
        <div className="vx-perf-header">
          <div>
            <p className="vx-perf-kicker">Analytics</p>
            <h2>Sales performance</h2>
            <p className="vx-perf-subtitle">Track your business growth and key metrics</p>
          </div>
          <div className="vx-perf-actions">
            <div className="vx-seg vx-perf-period" aria-label="Performance date range">
              {['7', '30', '90'].map((item) => <button type="button" key={item} className={range === item ? 'on' : ''} aria-pressed={range === item} onClick={() => setRange(item)}>{item === '7' ? '7 days' : `${item} days`}</button>)}
              <button type="button" disabled title="Annual analytics are not available in this demo">1 year</button>
            </div>
            <span className="vx-perf-pill"><TrendingUp size={14} /> +12.4%</span>
            <Button size="sm" icon={Download} onClick={() => toast('Report exported (CSV)')}>Export report</Button>
          </div>
        </div>

        <div className="vx-perf-grid stats-grid">
          {[{ label: 'Enquiries', value: statValues[0], tone: 'mint', icon: UsersRound, delta: '+8%' }, { label: 'Reply rate', value: statValues[1], tone: 'violet', icon: TrendingUp, delta: '+2%' }, { label: 'Quotes sent', value: statValues[2], tone: 'sky', icon: FileText, delta: '+3%' }, { label: 'Avg. reply time', value: statValues[3], tone: 'cyan', icon: Clock, delta: '-10%' }].map(({ label, value, tone, icon: Icon, delta }) => (
            <div key={label} className="vx-card vx-perf-stat">
              <div className={`vx-perf-ic ${tone}`}><Icon size={18} /></div>
              <div className="vx-perf-stat-text">
                <b>{value}</b>
                <span>{label}</span>
              </div>
              <small>{delta}</small>
            </div>
          ))}
        </div>

        <div className="vx-perf-grid wide-grid">
          <section className="vx-card vx-perf-card">
            <div className="vx-top-row">
              <div>
                <h3>Enquiries trend</h3>
                <p className="s">Enquiry activity over time</p>
              </div>
              <span className="vx-perf-chart-chip">Enquiries <span>Quotes</span></span>
            </div>
            <svg className="vx-analytics-line" viewBox="0 0 560 220" role="img" aria-label="Enquiries trend chart">
              <defs>
                <linearGradient id="vxAnalyticsFill" x1="0" x1="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--vv-analytics-blue, #1e40af)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--vv-analytics-blue, #1e40af)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((line) => {
                const y = 35 + line * 42
                return <g key={line}><line x1="36" x2="528" y1={y} y2={y} className="vx-analytics-grid" /><text x="4" y={y + 3} className="vx-analytics-axis-label">{Math.round(chartMax * (3 - line) / 3)}</text></g>
              })}
              <path d={area} className="vx-analytics-area" />
              <path d={path} className="vx-analytics-curve" />
              {chartData.map((point, index) => {
                const x = 36 + index * ((560 - 36) / Math.max(1, chartData.length - 1))
                const y = 170 - (point.value / chartMax) * 118
                return (
                  <g key={point.label} className="vx-chart-point">
                    <circle className="vx-point-hit" cx={x} cy={y} r="13" />
                    <circle className="vx-point-dot" cx={x} cy={y} r="5" />
                    <title>{point.label}: {point.value} enquiries</title>
                    <text x={x} y="206" textAnchor="middle">{point.label}</text>
                  </g>
                )
              })}
            </svg>
          </section>

          <section className="vx-card vx-perf-card">
            <div className="vx-top-row">
              <div>
                <h3>Conversion</h3>
                <p className="s">Qualified buyers pipeline</p>
              </div>
              <button type="button" className="vx-text-link" onClick={() => nav.go('v_work')}>View details <ChevronRight size={14} /></button>
            </div>
            <div className="vx-conversion-list">
              {conversionRows.map((row) => (
                <div key={row.label} className="vx-conversion-row">
                  <div className="vx-conversion-meta">
                    <span>{row.label}</span>
                    <b>{row.value}</b>
                  </div>
                  <div className="vx-conversion-bar">
                    <i className={row.tone} style={{ width: `${(row.value / row.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="vx-perf-grid lower-grid">
          <section className="vx-card vx-perf-card">
            <div className="vx-top-row">
              <div>
                <h3>Top categories</h3>
                <p className="s">Approved listings in your catalogue</p>
              </div>
              <button type="button" className="vx-text-link" onClick={() => nav.go('v_listings')}>View all <ChevronRight size={14} /></button>
            </div>
            <div className="vx-perf-categories">
              {top.map((category, index) => { const Icon = category.icon; return <button type="button" key={category.id} className={`vx-perf-category tone-${index % 5}`} onClick={() => nav.go('v_listings')}><span><Icon size={19} /></span><b>{category.name}</b><small>{category.count} approved {category.count === 1 ? 'listing' : 'listings'}</small></button> })}
              {!top.length && <EmptyState icon={Store} title="No approved listings yet" body="Approved products and services will appear by category here." action={<Button size="sm" onClick={() => nav.go('v_listing_edit')}>Add listing</Button>} />}
            </div>
          </section>

          <section className="vx-card vx-perf-card">
            <div className="vx-top-row">
              <div>
                <h3>Response quality</h3>
                <p className="s">Customer satisfaction trend</p>
              </div>
            </div>
            <div className="vx-perf-quick">
              {[[Plus, 'Add listing', 'v_listing_edit'], [MessageSquare, 'Respond to RFQ', 'v_work'], [PackageCheck, 'View orders', 'v_orders'], [UserRound, 'Update profile', 'v_profile']].map(([Icon, label, id]) => <button type="button" key={label} onClick={() => nav.go(id)}><span><Icon size={18} /></span>{label}</button>)}
            </div>          </section>
        </div>
      </div>
    </Screen>
    </VendorWorkspace>
  )
}

export function VendorReviews() {
  const { me, reviews, setReviews, toast } = useApp()
  const mine = reviews.filter((r) => r.target === me.vendorId)
  const [reply, setReply] = useState(null)
  const [txt, setTxt] = useState('')
  const avg = mine.length ? (mine.reduce((s, r) => s + r.rating, 0) / mine.length).toFixed(1) : 'â€”'
  return (
    <VendorWorkspace>
    <Screen title="Reviews" overlay={<Sheet open={!!reply} onClose={() => setReply(null)} title="Reply publicly" footer={<Button full disabled={!txt.trim()} onClick={() => { setReviews((rs) => rs.map((r) => (r.id === reply.id ? { ...r, reply: txt } : r))); setReply(null); setTxt(''); toast('Reply posted') }}>Post reply</Button>}>{reply && <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-600">â€œ{reply.text}â€</p>}<Input textarea rows={3} placeholder="Thank the customer or address their concern" value={txt} onChange={(e) => setTxt(e.target.value)} /></Sheet>}>
      <div className="vv-vendor-reviews-body">
      <Card className="flex items-center gap-5"><div className="text-center"><p className="text-4xl font-extrabold">{avg}</p><Rating value={+avg || 0} /></div><div className="flex-1 space-y-1.5">{[5, 4, 3].map((s) => <HBar key={s} label={`${s}â˜…`} value={mine.filter((r) => r.rating === s).length} max={mine.length || 1} color="bg-amber-400" />)}</div></Card>
      {mine.map((r) => (
        <Card key={r.id}><div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><Avatar name={r.by} size={34} /><div><p className="text-sm font-bold">{r.by}</p><p className="text-[11px] text-ink-400">{r.at}</p></div></div><Rating value={r.rating} /></div><p className="mt-2 text-[13px] text-ink-600">{r.text}</p>{r.reply ? <p className="mt-2 rounded-lg bg-brand-50 p-2.5 text-xs text-brand-900"><b>Your reply:</b> {r.reply}</p> : <button onClick={() => setReply(r)} className="mt-2 text-xs font-bold text-brand-700">Reply</button>}</Card>
      ))}
      {!mine.length && <EmptyState icon={Star} title="No reviews yet" body="Reviews appear after customers complete a transaction." />}
      </div>
    </Screen>
    </VendorWorkspace>
  )
}

/* ================= MORE / PROFILE ================= */

export function VendorProfile() {
  const nav = useNav()
  const v = useMyVendor()
  const { me, setMe, patchVendor, toast, settings } = useApp()
  const [f, setF] = useState({ name: v?.name || '', phone: v?.phone || '', email: v?.email || '', about: 'Trusted supplier of electrical and hardware products since 2019. Genuine brands, fast delivery.', areas: v?.areas || [] })
  const [errs, setErrs] = useState({})
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [paymentDone, setPaymentDone] = useState(null)
  const [businessOpen, setBusinessOpen] = useState(false)
  const [businessName, setBusinessName] = useState(me.businessName || v?.name || '')
  const [deleteOpen, setDeleteOpen] = useState(false)
  if (!v) return <VendorWorkspace><Screen title="Business profile"><EmptyState icon={Store} title="No business profile yet" body="Complete vendor registration to set up your profile." action={<Button onClick={() => nav.go('v_register')}>Start registration</Button>} /></Screen></VendorWorkspace>
  const save = () => {
    const e = {}
    if (f.name.trim().length < 3) e.name = 'Business name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email'
    if (!f.areas.length) e.areas = 'Select at least one area'
    setErrs(e)
    if (Object.keys(e).length) return
    patchVendor(v.id, { name: f.name, phone: f.phone, email: f.email, areas: f.areas }); toast('Business profile saved'); nav.back()
  }
  const createBusinessWorkspace = () => {
    const name = businessName.trim()
    if (name.length < 3) return toast('Enter a business/company name', 'warn')
    setMe({ ...me, role: 'business', businessWorkspace: true, businessName: name, vendorOwnerName: me.name, name, buyerMode: false })
    toast('Business workspace created')
    setBusinessOpen(false)
    nav.reset('v_dash')
  }
  const deleteAccount = () => {
    if (me.role === 'business' && me.businessWorkspace) {
      setMe({ ...me, role: 'vendor', businessWorkspace: false, businessName: undefined, businessSetup: undefined, name: me.vendorOwnerName || me.vendorName || v?.name || me.name, buyerMode: false })
      toast('Business workspace deleted')
      setDeleteOpen(false)
      nav.reset('v_dash')
      return
    }
    setMe({ role: null, loggedIn: false, guest: false, vendorId: 'v-me', name: '', accountState: 'deleted' })
    toast('Vendor account deletion recorded')
    setDeleteOpen(false)
    nav.reset('welcome')
  }
  return (
    <VendorWorkspace>
    <Screen title="Business profile" footer={<Button full size="lg" onClick={save}>Save changes</Button>}>
      <DemoPhonePePayment open={!!selectedPlan} amount={selectedPlan?.price} title={`${selectedPlan?.name || ''} subscription`} onClose={() => setSelectedPlan(null)} onSuccess={() => { patchVendor(v.id, { plan: selectedPlan.name }); setPaymentDone(selectedPlan); setSelectedPlan(null) }} />
      <div className="vv-vendor-profile-body">
      <Section title="Business workspace"><Card className="!border-violet-200 !bg-violet-50/60 !p-4"><div className="flex items-start gap-3"><Thumb tone="violet" icon={Briefcase} size={46} round="rounded-xl" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{me.businessWorkspace ? 'Business workspace active' : 'Create business workspace'}</p><p className="mt-1 text-xs leading-relaxed text-ink-600">{me.businessWorkspace ? `Open ${me.businessName || 'your company'} supplier dashboard and manage vendor RFQs.` : 'Create a supplier workspace for your company. Vendors can send bulk RFQs and purchase requirements to you.'}</p><Button size="sm" className="mt-3" variant={me.businessWorkspace ? 'secondary' : 'primary'} onClick={() => { if (me.businessWorkspace) { setMe({ ...me, role: 'business', name: me.businessName || me.name, buyerMode: false }); nav.reset('b_home') } else nav.go('b_eligibility') }}>{me.businessWorkspace ? 'Open workspace' : 'Create workspace'}</Button></div></div></Card></Section>
      <Dialog open={businessOpen} onClose={() => setBusinessOpen(false)} title="Create business workspace" actions={<><Button variant="secondary" className="flex-1" onClick={() => setBusinessOpen(false)}>Cancel</Button><Button className="flex-1" onClick={createBusinessWorkspace}>Create & open</Button></>}><p className="text-sm leading-relaxed text-ink-600">This workspace uses your verified vendor account as the supplier identity. Vendors will be able to send bulk RFQs, compare terms and place purchase orders with you.</p><div className="mt-4"><Input label="Business / company name" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div></Dialog>
      <Section title="Danger zone"><Card className="!border-red-200 !bg-red-50/60 !p-4"><p className="text-sm font-bold text-red-900">{me.role === 'business' ? 'Delete business workspace' : 'Delete vendor account'}</p><p className="mt-1 text-xs leading-relaxed text-red-800/75">{me.role === 'business' ? 'Remove this supplier workspace and return to your vendor account.' : 'Sign out and record deletion of this vendor account in the demo.'}</p><Button variant="dangerSoft" className="mt-3" onClick={() => setDeleteOpen(true)}>Delete account</Button></Card></Section>
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title={me.role === 'business' ? 'Delete business workspace?' : 'Delete vendor account?'} actions={<><Button variant="secondary" className="flex-1" onClick={() => setDeleteOpen(false)}>Keep account</Button><Button variant="danger" className="flex-1" onClick={deleteAccount}>Confirm delete</Button></>}><p className="text-sm leading-relaxed text-ink-600">{me.role === 'business' ? 'Your vendor workspace and marketplace listings will remain available. Only the Business Supplier workspace will be removed.' : 'This demo will close the vendor session and record the account as deleted. Production deletion would require backend data-retention and verification rules.'}</p></Dialog>
      <div className="flex justify-center"><Thumb tone={v.tone} icon={Store} size={84} /></div>
      <Input label="Business name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={errs.name} />
      <Input label="GSTIN" value={v.gstin} readOnly hint="Verified by admin â€” contact support to change" />
      <Input label="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <Input label="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={errs.email} />
      <Input label="About your business" textarea rows={3} value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} />
      <div><p className="mb-2 text-[13px] font-semibold text-ink-700">Service areas</p><Chips scroll={false} multi value={f.areas} onChange={(a) => setF({ ...f, areas: a })} options={['Jaipur', 'Delhi NCR', 'Ajmer', 'Sikar', 'Jodhpur', 'Kota']} />{errs.areas && <p className="mt-1.5 text-xs font-medium text-red-600">{errs.areas}</p>}</div>
      <Section title="Your plan"><Card><div className="flex items-center justify-between"><div><p className="text-sm font-bold">{v.plan || 'No active plan'}</p><p className="text-xs text-ink-500">{v.plan ? `Commission ${settings.plans.find((p) => p.name === v.plan)?.commission ?? settings.vendorCommissionPct}% Â· ${settings.plans.find((p) => p.name === v.plan)?.listings} listings` : 'Choose a subscription below to unlock marketplace growth tools.'}</p></div><Badge tone={v.plan ? 'teal' : 'amber'}>{v.plan ? <><Crown size={11} />Active</> : 'Unsubscribed'}</Badge></div><p className="mt-2 text-xs text-ink-500">Paid plans and subscriptions are managed by VendorVerse admin.</p></Card></Section>
      <Section title="Compare and upgrade"><div className="grid gap-3">{settings.plans.map((p) => <Card key={p.id} className={cx('relative', p.name === 'Growth' && 'ring-2 ring-brand-500')}><div className="flex items-start justify-between"><div><p className="text-lg font-extrabold">{p.name}</p><p className="text-sm font-bold text-amber-700">Price open (CFG-02) Â· sample values</p></div>{p.name === 'Growth' && <Badge tone="teal">Popular</Badge>}</div><p className="mt-2 text-sm text-ink-500">{p.listings} listings Â· {p.leads} enquiries/month</p><Button full className="mt-3" disabled={v.plan === p.name} onClick={() => nav.go('v_checkout', { plan: p.name })}>{v.plan === p.name ? 'Current plan' : `Add / upgrade to ${p.name}`}</Button></Card>)}</div></Section>
      {selectedPlan && <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/60 p-4"><Card className="w-full max-w-sm"><button className="float-right" aria-label="Close payment" onClick={() => setSelectedPlan(null)}><X /></button><p className="text-xs font-bold uppercase tracking-wider text-brand-700">Subscription payment demo</p><h2 className="mt-1 text-xl font-black">{selectedPlan.name} plan</h2><div className="my-5 rounded-2xl bg-gradient-to-br from-violet-700 to-indigo-600 p-5 text-white"><p className="text-3xl font-black">â‚¹{selectedPlan.price}<span className="text-sm text-white/70"> / month</span></p><p className="mt-3 text-xs text-white/70">Demo checkout Â· no real money is charged</p></div><Button full disabled={selectedPlan.loading} onClick={() => { setSelectedPlan({ ...selectedPlan, loading: true }); setTimeout(() => { patchVendor(v.id, { plan: selectedPlan.name }); setPaymentDone(selectedPlan); setSelectedPlan(null) }, 1600) }}>{selectedPlan.loading ? <><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Processing paymentâ€¦</> : <><Wallet size={17} /> Pay securely with PhonePe</>}</Button><p className="mt-3 text-center text-[11px] text-ink-400">UPI Â· Cards Â· Net banking</p></Card></div>}
      {paymentDone && <div className="fixed inset-0 z-[51] grid place-items-center bg-ink-950/60 p-4"><Card className="w-full max-w-sm text-center"><div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={40} strokeWidth={3} /></div><h2 className="mt-5 text-2xl font-black">Payment successful</h2><p className="mt-2 text-sm text-ink-500">{paymentDone.name} is now active on your vendor profile.</p><p className="mt-5 rounded-xl bg-ink-50 p-3 text-sm font-bold">â‚¹{paymentDone.price} Â· Demo transaction</p><Button full className="mt-5" onClick={() => setPaymentDone(null)}>Done</Button></Card></div>}
      </div>
    </Screen>
    </VendorWorkspace>
  )
}

/* ================= DASHBOARD ================= */
export function VendorDashboard() {
  const nav = useNav()
  const { me, rfqs, listings, threads, bookings } = useApp()
  const [range, setRange] = useState('6 weeks')
  const v = useMyVendor()
  const vid = me.vendorId
  const th = threads.vendor
  const unread = th.reduce((s, t) => s + t.unread, 0)
  const bookingRequests = bookings.filter((booking) => booking.vendorId === vid && ['requested', 'change_requested'].includes(booking.status)).length
  const matchingRfqs = rfqs.filter((r) => v && (me.role === 'business' || r.cat === v.cat) && !r.mine)
  const toQuote = matchingRfqs.filter((r) => r.status !== 'accepted' && !r.quotes.find((q) => q.vendorId === vid))
  const mine = listings.filter((l) => l.vendorId === vid)
  const live = mine.filter((l) => l.status === 'approved').length
  const fix = mine.filter((l) => ['rejected', 'suspended'].includes(l.status))
  const todo = unread + toQuote.length + fix.length
  const firstName = me.name?.split(/\s+/)[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  if (!v) return <Screen title="Vendor" back={false}><EmptyState icon={Store} title="Complete your registration" action={<Button onClick={() => nav.go('v_register')}>Start</Button>} /></Screen>
  const waveData = [{ label: 'W1', value: 12 }, { label: 'W2', value: 18 }, { label: 'W3', value: 15 }, { label: 'W4', value: 24 }, { label: 'W5', value: 22 }, { label: 'W6', value: 31 }]
  const trendData = {
    '6 weeks': waveData,
    '30 days': [{ label: 'W1', value: 18 }, { label: 'W2', value: 24 }, { label: 'W3', value: 20 }, { label: 'W4', value: 33 }, { label: 'W5', value: 29 }, { label: 'W6', value: 41 }],
    '90 days': [{ label: 'Jan', value: 40 }, { label: 'Feb', value: 36 }, { label: 'Mar', value: 52 }, { label: 'Apr', value: 48 }, { label: 'May', value: 64 }, { label: 'Jun', value: 58 }],
  }[range]
  const topCategories = CATS.map((category) => ({
    ...category,
    count: mine.filter((listing) => listing.status === 'approved' && listing.cat === category.id).length,
  })).filter((category) => category.count > 0).sort((a, b) => b.count - a.count).slice(0, 5)
  const quoteCount = matchingRfqs.filter((request) => request.quotes.some((quote) => quote.vendorId === vid)).length
  const acceptedCount = matchingRfqs.filter((request) => request.status === 'accepted' && request.quotes.some((quote) => quote.vendorId === vid && quote.status === 'accepted')).length
  const funnelMax = Math.max(matchingRfqs.length, quoteCount, acceptedCount, 1)
  const banner = {
    submitted: <Banner tone="blue" title="Verification under review" action={<Button size="sm" variant="secondary" onClick={() => nav.go('v_verify')}>View status</Button>}>Our team is reviewing your documents. Listings go live once you are verified.</Banner>,
    info: <Banner tone="amber" title="More information needed" action={<Button size="sm" onClick={() => nav.go('v_verify')}>Update documents</Button>}>Super Admin needs a few corrections before approval.</Banner>,
    rejected: <Banner tone="red" title="Verification rejected" action={<Button size="sm" onClick={() => nav.go('v_verify')}>Correct & resubmit</Button>}>{v.history[v.history.length - 1]?.note}</Banner>,
  }[v.status]
  const stats = [
    { label: 'Unread messages', value: unread, icon: MessageCircle, tone: 'violet', caption: 'Needs a reply', route: 'messages' },
    { label: me.role === 'business' ? 'Vendor RFQs' : 'Quote requests', value: toQuote.length, icon: FileText, tone: 'sky', caption: 'Ready for your quotation', route: 'v_work' },
    { label: 'Live listings', value: live, icon: Package, tone: 'mint', caption: `${mine.length} total listings`, route: 'v_listings' },
    { label: 'Booking requests', value: bookingRequests, icon: CalendarCheck, tone: 'cyan', caption: 'Awaiting your response', route: 'v_booking' },
  ]
  const funnelRows = [
    { label: 'Requests', value: matchingRfqs.length, tone: 'mint' },
    { label: 'Quotes sent', value: quoteCount, tone: 'sky' },
    { label: 'Accepted', value: acceptedCount, tone: 'violet' },
  ]
  return <VendorWorkspace><div className="vx-perf-shell vx-vendor-dash">
      <header className="vx-perf-header">
        <div>
          <p className="vx-perf-kicker">Workspace overview · {today}</p>
          <h2>{greeting}, {firstName}</h2>
          <p className="vx-perf-subtitle">{v.name} · Your business activity at a glance</p>
        </div>
        <div className="vx-perf-actions">
          {v.status === 'approved' && <span className="vx-perf-pill"><ShieldCheck size={14} /> Verified business</span>}
          <Button size="sm" variant="secondary" icon={BarChart3} onClick={() => nav.go('v_perf')}>Performance</Button>
          <Button size="sm" icon={Plus} onClick={() => nav.go('v_listing_edit')}>Add listing</Button>
        </div>
      </header>
      {banner}

      <div className="vx-perf-grid stats-grid">
        {stats.map(({ label, value, icon: Icon, tone, caption, route }) => (
          <button type="button" key={label} className="vx-card vx-perf-stat" onClick={() => nav.go(route)}>
            <span className={`vx-perf-ic ${tone}`}><Icon size={18} /></span>
            <span className="vx-perf-stat-text"><b>{value}</b><span>{label}</span></span>
            <small>View</small>
            <span className="vx-dash-stat-caption">{caption}</span>
          </button>
        ))}
      </div>

      <div className="vx-perf-grid wide-grid">
        <section className="vx-card vx-perf-card">
          <div className="vx-top-row">
            <div><h3>Customer enquiries</h3><p className="s">Enquiry activity over time</p></div>
            <div className="vx-seg vx-perf-period" aria-label="Chart time range">
              {['6 weeks', '30 days', '90 days'].map((item) => <button type="button" key={item} className={range === item ? 'on' : ''} aria-pressed={range === item} onClick={() => setRange(item)}>{item}</button>)}
            </div>
          </div>
          <VendorTrendChart data={trendData} />
        </section>

        <section className="vx-card vx-perf-card">
          <div className="vx-top-row">
            <div><h3>Quote conversion</h3><p className="s">Your RFQ pipeline</p></div>
            <button type="button" className="vx-text-link" onClick={() => nav.go('v_work')}>View requests <ChevronRight size={14} /></button>
          </div>
          <div className="vx-conversion-list">
            {funnelRows.map((row) => (
              <div key={row.label} className="vx-conversion-row">
                <div className="vx-conversion-meta"><span>{row.label}</span><b>{row.value}</b></div>
                <div className="vx-conversion-bar"><i className={row.tone} style={{ width: `${(row.value / funnelMax) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="vx-perf-grid lower-grid">
        <section className="vx-card vx-perf-card">
          <div className="vx-top-row">
            <div><h3>Top categories</h3><p className="s">Approved listings in your catalogue</p></div>
            <button type="button" className="vx-text-link" onClick={() => nav.go('v_listings')}>View all <ChevronRight size={14} /></button>
          </div>
          <div className="vx-perf-categories">
            {topCategories.map((category, index) => {
              const Icon = category.icon
              return <button type="button" key={category.id} className={`vx-perf-category tone-${index % 5}`} onClick={() => nav.go('v_listings')}><span><Icon size={19} /></span><b>{category.name}</b><small>{category.count} approved {category.count === 1 ? 'listing' : 'listings'}</small></button>
            })}
            {!topCategories.length && <EmptyState icon={Store} title="No approved listings yet" body="Approved products and services will appear by category here." action={<Button size="sm" onClick={() => nav.go('v_listing_edit')}>Add listing</Button>} />}
          </div>
        </section>

        <section className="vx-card vx-perf-card">
          <div className="vx-top-row"><div><h3>Quick actions</h3><p className="s">Common workspace tasks</p></div></div>
          <div className="vx-perf-quick">
            {[[Plus, 'Add listing', 'v_listing_edit'], [MessageSquare, 'Messages', 'messages'], [FileText, 'Respond to RFQ', 'v_work'], [BarChart3, 'Performance', 'v_perf']].map(([Icon, label, route]) => <button type="button" key={label} onClick={() => nav.go(route)}><span><Icon size={18} /></span>{label}</button>)}
          </div>
        </section>
      </div>

      <section className="vx-card vx-perf-card vx-attention vx-dash-attention">
        <div className="vx-top-row">
          <div><h3>Needs your attention {todo > 0 && <span className="vx-count">{todo}</span>}</h3><p className="s">Items that may need a response</p></div>
          <button type="button" className="vx-text-link" onClick={() => nav.go('v_work')}>View work <ChevronRight size={14} /></button>
        </div>
        <div className="vx-rows">
          {th.filter((thread) => thread.unread > 0).map((thread) => <button type="button" className="vx-row" key={thread.id} onClick={() => nav.go('chat', { id: thread.id })}><span className="ri violet"><MessageCircle size={17} /></span><span className="rt"><b>{thread.unread} new from {thread.name}</b><small>{thread.msgs[thread.msgs.length - 1]?.t}</small></span><ChevronRight size={16} /></button>)}
          {toQuote.map((request) => <button type="button" className="vx-row" key={request.id} onClick={() => nav.go('v_rfq', { id: request.id })}><span className="ri amber"><FileText size={17} /></span><span className="rt"><b>Quote {request.id}</b><small>{request.title}</small></span><ChevronRight size={16} /></button>)}
          {fix.map((item) => <button type="button" className="vx-row" key={item.id} onClick={() => nav.go('v_listing_edit', { id: item.id })}><span className="ri rose"><AlertTriangle size={17} /></span><span className="rt"><b>Listing {item.status}</b><small>{item.title}</small></span><ChevronRight size={16} /></button>)}
          {todo === 0 && <div className="vx-empty"><Check size={19} /><span>You are all caught up.</span></div>}
        </div>
      </section>
    </div></VendorWorkspace>
}

/* ================= QUOTE REQUESTS ================= */
export function VendorQuotes() {
  const nav = useNav()
  const { me, rfqs, bookings, listings } = useApp()
  const v = useMyVendor()
  const [fl, setFl] = useState('todo')
  const [kind, setKind] = useState('rfqs')
  const mr = rfqs.filter((r) => v && (me.role === 'business' || r.cat === v.cat) && (!r.mine || r.buyerType === 'vendor') && r.buyerVendorId !== me.vendorId && (!r.targetVendorId || r.targetVendorId === me.vendorId))
  const mine = (x) => x.quotes.find((q) => q.vendorId === me.vendorId)
  const list = mr.filter((x) => (fl === 'todo' ? !mine(x) && x.status !== 'accepted' : fl === 'active' ? mine(x) && x.status !== 'accepted' : x.status === 'accepted'))
  const myBookings = bookings.filter((b) => b.vendorId === me.vendorId)
  const bookingList = myBookings.filter((b) => fl === 'todo' ? ['requested', 'change_requested'].includes(b.status) : fl === 'active' ? ['accepted', 'in_progress'].includes(b.status) : ['completed', 'closed', 'declined', 'cancelled'].includes(b.status))
  return (
    <VendorWorkspace>
    <Screen title="Quote requests" back={false}>
      <Segmented value={kind} onChange={(v) => { setKind(v); setFl('todo') }} options={[{ id: 'rfqs', label: 'Quote requests' }, { id: 'bookings', label: `Service bookings (${myBookings.length})` }]} />
      <Banner tone="blue">{kind === 'rfqs' ? (me.role === 'business' ? 'Vendors submit bulk requirements here. Respond with your supplier quotation, MOQ, lead time and terms.' : 'Customers post requirements here. Send your quotation, then continue the conversation in Messages.') : 'Review customer booking requests, confirm availability, and track service progress. Payment stays directly between you and the customer.'}</Banner>
      <Chips scroll={false} value={fl} onChange={setFl} options={kind === 'rfqs' ? [{ id: 'todo', label: `To quote (${mr.filter((x) => !mine(x) && x.status !== 'accepted').length})` }, { id: 'active', label: 'Quoted' }, { id: 'done', label: 'Closed' }] : [{ id: 'todo', label: `Needs reply (${myBookings.filter((b) => ['requested', 'change_requested'].includes(b.status)).length})` }, { id: 'active', label: 'Upcoming' }, { id: 'done', label: 'Past' }]} />
      {kind === 'rfqs' ? <>
      <div className="vv-vendor-quote-grid space-y-2.5">
        {list.map((x) => {
          const q = mine(x)
          return (
            <Card key={x.id} onClick={() => nav.go('v_rfq', { id: x.id })} className="!p-3.5">
              <div className="flex items-center justify-between"><span className="text-xs font-bold text-ink-500">{x.id} Â· {x.customer}</span>{q ? <StatusBadge s={x.status === 'accepted' ? (q.status === 'accepted' ? 'accepted' : 'closed') : q.history.length > 1 ? 'revised' : 'submitted'} /> : <StatusBadge s="open" />}</div>
              <p className="mt-1 text-sm font-bold">{x.title}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-ink-500"><span>{x.qty}</span>Â·<span>{x.budget}</span>{q && <><span>Â·</span><b className="text-ink-800">Your quote {fmt(q.amount)}</b></>}</p>
            </Card>
          )
        })}
        {!list.length && <EmptyState icon={FileText} title="Nothing here" body="New quote requests matching your category will appear here." />}
      </div>
      </> : <div className="vv-vendor-quote-grid space-y-2.5">{bookingList.map((b) => { const l = listings.find((x) => x.id === b.listingId); return <Card key={b.id} onClick={() => nav.go('c_booking', { id: b.id })} className="!p-3.5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-ink-500">{b.id} Â· {b.customer}</span><StatusBadge s={b.status} /></div><p className="mt-1 text-sm font-bold">{l?.title || 'Service booking'}</p><p className="mt-1 text-xs text-ink-500">{b.date} at {b.slot} Â· {b.address}</p><p className="mt-1 text-xs text-ink-500">Indicative amount {fmt(b.total || 0)} Â· payment agreed directly</p></Card> })}{!bookingList.length && <EmptyState icon={CalendarCheck} title="No service bookings here" body="Customer requests for your service listings will appear here." />}</div>}
    </Screen>
    </VendorWorkspace>
  )
}

/* ================= MORE / PROFILE ================= */
export function VendorMore() {
  const nav = useNav()
  const { setMe, me } = useApp()
  const v = useMyVendor()
  const [businessOpen, setBusinessOpen] = useState(false)
  const [businessName, setBusinessName] = useState(me.businessName || v?.name || '')
  const createBusinessWorkspace = () => {
    const name = businessName.trim()
    if (name.length < 3) return
    setMe({ ...me, role: 'business', businessWorkspace: true, businessName: name, vendorOwnerName: me.vendorOwnerName || me.name, name, buyerMode: false })
    nav.reset('v_dash')
  }
  return (
    <VendorWorkspace>
    <Screen title="More" back={false} pad={false}>
      <div className="vv-vendor-more-body space-y-4 p-4">
        <Card onClick={() => nav.go('v_profile')} className="!p-4"><div className="flex items-center gap-3.5"><Thumb tone={v?.tone || 'teal'} icon={Store} size={56} /><div className="min-w-0 flex-1"><p className="truncate text-base font-extrabold">{v?.name || 'Your business'}</p><p className="text-sm text-ink-500">{me.name}</p><div className="mt-1.5">{v?.status === 'approved' ? <Badge tone="green"><ShieldCheck size={11} />Verified</Badge> : <StatusBadge s={v?.status || 'draft'} />}</div></div><ChevronRight size={18} className="text-ink-300" /></div></Card>
        <Group>
          {me.role === 'business' && me.businessWorkspace && <ListRow icon={Store} tone="sky" title="Open vendor workspace" subtitle="Return to your vendor listings and customer work" onClick={() => { setMe({ ...me, role: 'vendor', name: me.vendorOwnerName || me.vendorName || me.name, buyerMode: false }); nav.reset('v_dash') }} />}
          <ListRow icon={Briefcase} tone="teal" title={me.businessWorkspace ? 'Open business workspace' : 'Become a supplier / business'} subtitle={me.businessWorkspace ? `Manage ${me.businessName || 'your supplier account'} and vendor RFQs` : 'Create a supplier account and receive vendor bulk RFQs'} onClick={() => { if (me.businessWorkspace) { setMe({ ...me, role: 'business', name: me.businessName || me.name, buyerMode: false }); nav.reset('v_dash') } else nav.go('v_business_onboard') }} />
          <ListRow icon={Package} tone="violet" title="Buy as a business" subtitle="Open supplier-only marketplace" onClick={() => { setMe({ ...me, buyerMode: true }); nav.go('vb_home') }} />
          <ListRow icon={ShieldCheck} tone="emerald" title="Verification" subtitle="Documents & status" onClick={() => nav.go('v_verify')} />
          <ListRow icon={Package} tone="sky" title="Purchase orders" subtitle="Supplier fulfilment & tracking" onClick={() => nav.go('v_orders')} />
          <ListRow icon={Star} tone="amber" title="Customer reviews" onClick={() => nav.go('v_reviews')} />
          <ListRow icon={BarChart3} tone="violet" title="Performance reports" subtitle="Enquiries, replies, quotes" onClick={() => nav.go('v_perf')} />
          <ListRow icon={Crown} tone="rose" title="Subscription plan" subtitle={`${v?.plan || 'Free'} plan`} onClick={() => nav.go('v_sub')} />
          <ListRow icon={ShieldCheck} tone="emerald" title="Publication checklist" subtitle="Six gates" onClick={() => nav.go('v_listing_gate')} />
          <ListRow icon={Store} tone="sky" title="Public profile & trust" onClick={() => nav.go('v_public')} />
          <ListRow icon={Settings} tone="slate" title="Service areas & availability" onClick={() => nav.go('v_areas')} />
          <ListRow icon={Settings} tone="slate" title="Contracts" onClick={() => nav.go('v_contract')} />
          <ListRow icon={Star} tone="amber" title="Cases & appeals" onClick={() => nav.go('v_cases')} />
          <ListRow icon={Package} tone="violet" title="Sponsored visibility" onClick={() => nav.go('v_sponsor')} />
          <ListRow icon={Info} tone="slate" title="Business network" onClick={() => nav.go('v_biz_network')} />
          <ListRow icon={Settings} tone="slate" title="Booking requests" onClick={() => nav.go('v_booking')} />
          <ListRow icon={Info} tone="slate" title="Leads" onClick={() => nav.go('v_leads')} />
          <ListRow icon={Package} tone="violet" title="Suggest a category" onClick={() => nav.go('c_cat_suggest')} last />
        </Group>
        <Group>
          <ListRow icon={Settings} tone="slate" title="Notifications & privacy" onClick={() => nav.go('c_notif_prefs')} />
          <ListRow icon={Settings} tone="slate" title="Sessions & devices" onClick={() => nav.go('c_sessions')} />
          <ListRow icon={Info} tone="slate" title="Fees explained" onClick={() => nav.go('fees')} />
          <ListRow icon={Info} tone="slate" title="Help & support" onClick={() => nav.go('c_report')} last />
        </Group>
        <Button full variant="dangerSoft" icon={LogOut} onClick={() => { setMe({ role: null, loggedIn: false, guest: false, vendorId: 'v-me', name: '' }); nav.reset('c_home') }}>Log out</Button>
      </div>
      <Dialog open={businessOpen} onClose={() => setBusinessOpen(false)} title="Become a supplier / business" actions={<><Button variant="secondary" className="flex-1" onClick={() => setBusinessOpen(false)}>Cancel</Button><Button className="flex-1" onClick={() => { createBusinessWorkspace(); setBusinessOpen(false) }}>Create & open</Button></>}><p className="text-sm leading-relaxed text-ink-600">Use your existing vendor identity as a Business / Company supplier. Vendors can send bulk RFQs, review quotations and place purchase orders with you.</p><div className="mt-4"><Input label="Business / company name" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div></Dialog>
    </Screen>
    </VendorWorkspace>
  )
}
