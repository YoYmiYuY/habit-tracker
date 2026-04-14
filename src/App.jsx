import { useState, useEffect, useCallback, useMemo } from "react";
import storage from './storage';
const H = 36;
const HOURS = Array.from({length:18}, (_,i) => i+7); // 7,8,...,24 → 7:00 to 次日01:00
const LATE = Array.from({length:6}, (_,i) => i+1); // 1,2,3,4,5,6
const MCOLS_L = ["#E8713A","#5B8DEF","#34B380","#D4527A","#9B6DD7","#E6A640"];
const MCOLS_D = ["#F0945E","#6FA0F5","#45D99A","#E8709A","#B088E8","#F0C050"];
const genId = () => Math.random().toString(36).slice(2,9);
const genCode = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length:6}, ()=>c[Math.floor(Math.random()*c.length)]).join("");
};
const dk = (d=new Date()) => d.toISOString().slice(0,10);
const dayLabel = s => ["日","一","二","三","四","五","六"][new Date(s+"T00:00:00").getDay()];
const fmtH = h => {
  if (h >= 24) return `次日 ${String(h - 24).padStart(2,"0")}:00`;
  return `${String(h).padStart(2,"0")}:00`;
};
const fmtT = t => {
  const h = Math.floor(t); const m = Math.round((t - h) * 60);
  if (h >= 24) return `次日 ${String(h-24).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
};
const parseTimeStr = s => {
  const clean = s.replace(/次日\s*/,"");
  const parts = clean.split(":"); if (parts.length !== 2) return null;
  let h = parseInt(parts[0],10), m = parseInt(parts[1],10);
  if (isNaN(h)||isNaN(m)||h<0||h>25||m<0||m>59) return null;
  if (s.includes("次日")) h += 24;
  return h + m / 60;
};
const TODAY = dk();

const SAMPLE_DATA = () => {
  const t = TODAY;
  return {
    [t]: {
      m1: {
        plans: [
          {id:"s1",start:7,end:9,content:"晨跑 + 早餐",done:true,actual:""},
          {id:"s2",start:9,end:12,content:"学习 React",done:false,actual:""},
          {id:"s3",start:13,end:15,content:"写项目方案",done:false,actual:""},
          {id:"s4",start:15,end:17,content:"团队会议",done:false,actual:""},
          {id:"s5",start:19,end:21,content:"阅读 + 冥想",done:false,actual:""},
          {id:"s6",start:21,end:23,content:"复盘整理",done:false,actual:""},
        ],
        reflection:{text:"",isPublic:true,sent:false}
      },
      m2: {
        plans: [
          {id:"s7",start:7,end:9,content:"瑜伽",done:true,actual:""},
          {id:"s8",start:9,end:13,content:"准备考试",done:false,actual:""},
          {id:"s9",start:14,end:16,content:"背单词",done:false,actual:""},
          {id:"s10",start:19,end:21,content:"弹吉他",done:false,actual:""},
        ],
        reflection:{text:"今天状态不错！",isPublic:true,sent:true}
      }
    }
  };
};

const LIGHT = {
  bg:"#F4F3F0",white:"#FFFFFF",card:"#FFFFFF",card2:"#FAFAF8",
  bdr:"#EBEBEA",bdr2:"#E0DFDC",
  txt:"#1A1A1A",txt2:"#666660",txt3:"#A0A098",
  acc:"#E8713A",acc2:"#F5945E",accBg:"rgba(232,113,58,.08)",accBdr:"rgba(232,113,58,.2)",
  ok:"#34B380",okBg:"rgba(52,179,128,.08)",okBdr:"rgba(52,179,128,.25)",
  warn:"#E6A640",warnBg:"rgba(230,166,64,.08)",
  danger:"#D4527A",
  shadow:"0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04)",
  shadow2:"0 4px 12px rgba(0,0,0,.08)",
  topbar:"var(--white)",modalbg:"rgba(0,0,0,.35)",
};
const DARK = {
  bg:"#111118",white:"#1A1A24",card:"#1E1E2A",card2:"#161620",
  bdr:"#2A2A38",bdr2:"#353548",
  txt:"#E8E8F0",txt2:"#9898AE",txt3:"#606078",
  acc:"#E8813E",acc2:"#F5A060",accBg:"rgba(232,129,62,.12)",accBdr:"rgba(232,129,62,.25)",
  ok:"#3DD995",okBg:"rgba(61,217,149,.1)",okBdr:"rgba(61,217,149,.2)",
  warn:"#F0C050",warnBg:"rgba(240,192,80,.1)",
  danger:"#E8709A",
  shadow:"0 1px 4px rgba(0,0,0,.2)",
  shadow2:"0 4px 16px rgba(0,0,0,.3)",
  topbar:"rgba(26,26,36,.9)",modalbg:"rgba(0,0,0,.6)",
};

const makeCSS = (t) => `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700;900&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
:root{
  --bg:${t.bg};--white:${t.white};--card:${t.card};--card2:${t.card2};
  --bdr:${t.bdr};--bdr2:${t.bdr2};
  --txt:${t.txt};--txt2:${t.txt2};--txt3:${t.txt3};
  --acc:${t.acc};--acc2:${t.acc2};--accBg:${t.accBg};--accBdr:${t.accBdr};
  --ok:${t.ok};--okBg:${t.okBg};--okBdr:${t.okBdr};
  --warn:${t.warn};--warnBg:${t.warnBg};
  --danger:${t.danger};
  --r:12px;--r2:16px;
  --font:'Noto Sans SC',system-ui,-apple-system,sans-serif;
  --mono:'JetBrains Mono',monospace;
  --shadow:${t.shadow};--shadow2:${t.shadow2};
  font-size:clamp(14px,3.6vw,16px)
}
html,body,#root{height:100%;margin:0}
body{font-family:var(--font);background:var(--bg);color:var(--txt)}
.app{height:100%;display:flex;flex-direction:column;background:var(--bg);position:relative;overflow:hidden}

.topbar{padding:.7rem 1rem;display:flex;align-items:center;gap:.5rem;background:${t.topbar};border-bottom:1px solid var(--bdr);flex-shrink:0;z-index:10;backdrop-filter:blur(12px)}
.topbar h1{font-size:1.05rem;font-weight:800;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:45%}
.topbar .code{font-family:var(--mono);font-size:.6rem;color:var(--txt3);background:var(--card2);padding:.15rem .4rem;border-radius:.3rem;letter-spacing:.06em;border:1px solid var(--bdr);flex-shrink:0}
.topbar .spacer{flex:1}
.icon-btn{width:2.1rem;height:2.1rem;border:1px solid var(--bdr);border-radius:.55rem;background:var(--white);color:var(--txt2);font-size:.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:var(--font);transition:all .15s;box-shadow:var(--shadow)}
.icon-btn:active{transform:scale(.92)}
.icon-btn.primary{background:var(--acc);border-color:var(--acc);color:#fff;box-shadow:0 2px 8px ${t.accBg}}

.date-nav{display:flex;align-items:center;gap:.3rem;padding:.45rem .7rem;background:var(--white);border-bottom:1px solid var(--bdr);flex-shrink:0;overflow-x:auto}
.date-nav::-webkit-scrollbar{display:none}
.day-btn{padding:.35rem .55rem;border:1px solid transparent;border-radius:.55rem;background:transparent;color:var(--txt3);font-size:.75rem;font-weight:500;cursor:pointer;white-space:nowrap;font-family:var(--font);transition:all .15s;flex-shrink:0;text-align:center}
.day-btn:active{transform:scale(.95)}
.day-btn.today{background:var(--acc);border-color:var(--acc);color:#fff;font-weight:700}
.day-btn.sel{background:var(--accBg);border-color:var(--accBdr);color:var(--acc)}
.day-btn .d{display:block;font-size:.58rem;opacity:.7;margin-top:.1rem}
.date-nav .arr{width:1.7rem;height:1.7rem;border:1px solid var(--bdr);border-radius:.45rem;background:var(--white);color:var(--txt2);font-size:.8rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:var(--font);box-shadow:var(--shadow)}

.member-tabs{display:flex;gap:.3rem;padding:.4rem .7rem;background:var(--card2);border-bottom:1px solid var(--bdr);flex-shrink:0;overflow-x:auto}
.member-tabs::-webkit-scrollbar{display:none}
.mtab{padding:.35rem .7rem;border:1px solid var(--bdr);border-radius:2rem;background:var(--white);color:var(--txt2);font-size:.75rem;font-weight:600;cursor:pointer;white-space:nowrap;font-family:var(--font);transition:all .15s;flex-shrink:0;box-shadow:var(--shadow)}
.mtab.on{color:#fff;border-color:transparent}

.tl-wrap{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding-bottom:5rem}
.tl-grid{display:flex;position:relative}
.tl-times{width:3.6rem;flex-shrink:0;position:relative;background:var(--card2)}
.tl-time{position:absolute;left:0;right:0;display:flex;align-items:flex-start;justify-content:flex-end;padding-right:.4rem;font-family:var(--mono);font-size:.58rem;font-weight:500;color:var(--txt3);transform:translateY(-50%);pointer-events:none;white-space:nowrap}
.tl-cols{flex:1;display:flex;position:relative;background:var(--white)}
.tl-col{flex:1;position:relative;min-width:0;border-right:1px solid var(--bdr)}
.tl-col:last-child{border-right:none}
.tl-col-header{position:sticky;top:0;z-index:5;padding:.35rem .3rem;text-align:center;font-size:.7rem;font-weight:700;background:var(--white);border-bottom:2px solid var(--bdr)}
.tl-col-body{position:relative}
.tl-gridline{position:absolute;left:0;right:0;border-top:1px solid var(--bdr);pointer-events:none}
.tl-gridline.minor{border-top-style:dashed;opacity:.5}

.now-line{position:absolute;left:0;right:0;height:2px;background:var(--danger);z-index:4;pointer-events:none}
.now-line::before{content:"";position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--danger)}

.plan-card{position:absolute;left:4px;right:4px;border-radius:.5rem;padding:.35rem .45rem;cursor:pointer;transition:all .15s;overflow:hidden;z-index:2;border-left:3.5px solid;display:flex;flex-direction:column;gap:.08rem;min-height:1.8rem;box-shadow:var(--shadow)}
.plan-card:active{transform:scale(.98);z-index:3}
.plan-card .pc-content{font-size:.72rem;font-weight:600;line-height:1.3;color:var(--txt);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.plan-card .pc-time{font-size:.55rem;font-family:var(--mono);color:var(--txt3)}
.plan-card .pc-actual{font-size:.62rem;color:var(--warn);margin-top:.05rem;font-weight:500}
.plan-card .pc-check{position:absolute;top:.3rem;right:.3rem;width:1.05rem;height:1.05rem;border-radius:.3rem;border:1.5px solid var(--bdr2);background:var(--white);display:flex;align-items:center;justify-content:center;font-size:.55rem;color:#fff;transition:all .2s}
.plan-card.done .pc-check{background:var(--ok);border-color:var(--ok)}
.plan-card.done{opacity:.6}

.tl-empty-slot{position:absolute;left:0;right:0;cursor:pointer;z-index:1}
.tl-empty-slot:hover{background:var(--accBg)}

.bottombar{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--white);border-top:1px solid var(--bdr);z-index:20;box-shadow:0 -2px 10px rgba(0,0,0,.05);padding-bottom:env(safe-area-inset-bottom,0)}
.bb-btn{flex:1;padding:.6rem 0 .5rem;border:none;background:transparent;color:var(--txt3);font-size:.73rem;font-weight:600;cursor:pointer;font-family:var(--font);display:flex;flex-direction:column;align-items:center;gap:.2rem;transition:all .15s}
.bb-btn .bb-icon{font-size:1.4rem;line-height:1}
.bb-btn.on{color:var(--acc)}
.bb-btn:active{transform:scale(.92)}

/* Modal */
.modal-bg{position:fixed;inset:0;background:${t.modalbg};backdrop-filter:blur(6px);z-index:50;display:flex;align-items:flex-end;justify-content:center}
@media(min-width:640px){.modal-bg{align-items:center}}
.modal{background:var(--card);border-radius:var(--r2) var(--r2) 0 0;padding:1.3rem;width:100%;max-width:420px;max-height:85vh;overflow-y:auto;box-shadow:var(--shadow2);animation:su .25s ease}
@media(min-width:640px){.modal{border-radius:var(--r2)}}
@keyframes su{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal h3{font-size:1.02rem;font-weight:700;margin-bottom:.7rem;color:var(--txt)}
.modal label{font-size:.76rem;color:var(--txt2);margin-bottom:.25rem;display:block;font-weight:500}
.modal .inp{width:100%;padding:.6rem .75rem;background:var(--bg);border:1px solid var(--bdr);border-radius:.6rem;color:var(--txt);font-size:.86rem;outline:none;font-family:var(--font);margin-bottom:.55rem;transition:border-color .15s}
.modal .inp:focus{border-color:var(--acc)}
.modal textarea.inp{min-height:3.5rem;resize:vertical;line-height:1.5}
.modal .time-row{display:flex;gap:.5rem;align-items:center;margin-bottom:.55rem}
.modal .time-row select{flex:1}
.modal .btn-row{display:flex;gap:.5rem;margin-top:.5rem}
.bp{padding:.65rem 1rem;border:none;border-radius:.6rem;font-size:.86rem;font-weight:700;cursor:pointer;font-family:var(--font);background:var(--acc);color:#fff;flex:1;transition:all .15s}
.bp:active{transform:scale(.97)}
.bs2{padding:.65rem 1rem;border:1px solid var(--bdr);border-radius:.6rem;font-size:.86rem;font-weight:600;cursor:pointer;font-family:var(--font);background:var(--white);color:var(--txt2);transition:all .15s}
.bs2:active{transform:scale(.97)}
.bdel{padding:.65rem 1rem;border:1px solid rgba(212,82,122,.2);border-radius:.6rem;font-size:.86rem;font-weight:600;cursor:pointer;font-family:var(--font);background:rgba(212,82,122,.06);color:var(--danger)}
.chk-row{display:flex;align-items:center;gap:.5rem;padding:.5rem 0;cursor:pointer;user-select:none}
.chk-box{width:1.2rem;height:1.2rem;border-radius:.35rem;border:2px solid var(--bdr2);background:var(--white);display:flex;align-items:center;justify-content:center;font-size:.65rem;color:#fff;flex-shrink:0;transition:all .2s}
.chk-box.on{background:var(--ok);border-color:var(--ok)}
.chk-label{font-size:.86rem;font-weight:500}

/* Reflection */
.refl-section{padding:1rem;background:var(--white);border-top:1px solid var(--bdr);margin-top:.4rem}
.refl-title{font-size:.85rem;font-weight:700;color:var(--txt);margin-bottom:.6rem;display:flex;align-items:center;gap:.35rem}
.refl-input-area{display:flex;gap:.4rem;align-items:flex-end}
.refl-ta{flex:1;padding:.55rem .65rem;background:var(--bg);border:1px solid var(--bdr);border-radius:.5rem;color:var(--txt);font-size:.82rem;outline:none;font-family:var(--font);resize:none;min-height:2.8rem;line-height:1.5;transition:border-color .15s}
.refl-ta:focus{border-color:var(--acc)}
.refl-send{width:2.6rem;height:2.6rem;border:none;border-radius:.5rem;background:var(--acc);color:#fff;font-size:1rem;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s}
.refl-send:active{transform:scale(.92)}
.refl-send:disabled{opacity:.35;cursor:default}
.refl-vis{display:flex;align-items:center;gap:.3rem;margin-bottom:.5rem}
.refl-vis-btn{font-size:.68rem;padding:.2rem .5rem;border-radius:1rem;cursor:pointer;border:1px solid var(--bdr);background:var(--bg);color:var(--txt3);font-family:var(--font);transition:all .15s}
.refl-vis-btn.on{background:var(--accBg);border-color:var(--accBdr);color:var(--acc)}
.refl-published{background:var(--bg);border-radius:.6rem;padding:.7rem;border-left:3px solid var(--acc);position:relative}
.refl-pub-text{font-size:.82rem;color:var(--txt);line-height:1.5;white-space:pre-wrap}
.refl-pub-meta{display:flex;align-items:center;gap:.4rem;margin-top:.4rem;font-size:.65rem;color:var(--txt3)}
.refl-edit-btn{font-size:.68rem;padding:.15rem .45rem;border-radius:1rem;border:1px solid var(--bdr);background:var(--white);color:var(--txt2);cursor:pointer;font-family:var(--font);margin-left:auto;transition:all .15s}
.refl-edit-btn:active{background:var(--bg)}
.refl-others{margin-top:.7rem}
.refl-other{padding:.55rem .7rem;background:var(--bg);border-radius:.5rem;margin-bottom:.4rem;font-size:.78rem;border-left:3px solid var(--danger)}
.refl-other .rn{font-weight:600;color:var(--danger);margin-bottom:.1rem;font-size:.7rem}

/* Settings */
.page{flex:1;overflow-y:auto;padding:1rem;padding-bottom:5rem;-webkit-overflow-scrolling:touch;background:var(--bg)}
.ss{margin-bottom:1.3rem}
.ss h3{font-size:.92rem;font-weight:700;margin-bottom:.6rem;display:flex;align-items:center;gap:.35rem;color:var(--txt)}
.sc{background:var(--card);border-radius:var(--r);padding:.9rem;box-shadow:var(--shadow);border:1px solid var(--bdr)}
.ml .mi{display:flex;align-items:center;gap:.55rem;padding:.55rem 0;border-bottom:1px solid var(--bdr)}
.ml .mi:last-child{border-bottom:none}
.mi .md{width:.6rem;height:.6rem;border-radius:50%;flex-shrink:0}
.mi .mn{font-size:.86rem;font-weight:600;flex:1}
.mi .my{font-size:.6rem;color:var(--acc);background:var(--accBg);padding:.12rem .35rem;border-radius:1rem;font-weight:600;border:1px solid var(--accBdr)}
.ar{display:flex;gap:.4rem;margin-top:.6rem}
.ar .ii{flex:1;padding:.55rem .65rem;background:var(--bg);border:1px solid var(--bdr);border-radius:.55rem;color:var(--txt);font-size:.84rem;outline:none;font-family:var(--font)}
.ar .ii:focus{border-color:var(--acc)}
.si{width:100%;padding:.6rem .7rem;background:var(--bg);border:1px solid var(--bdr);border-radius:.55rem;color:var(--txt);font-size:.86rem;outline:none;font-family:var(--font);margin-bottom:.4rem}
.si:focus{border-color:var(--acc)}

.copy-dates{max-height:40vh;overflow-y:auto}
.cdb{width:100%;padding:.6rem .75rem;text-align:left;background:var(--bg);border:1px solid var(--bdr);border-radius:.5rem;color:var(--txt);font-size:.84rem;cursor:pointer;font-family:var(--font);margin-bottom:.3rem;display:flex;align-items:center;justify-content:space-between;transition:all .15s}
.cdb:active{background:var(--bdr)}
.cdb .cc{font-size:.65rem;color:var(--txt3);background:var(--white);padding:.12rem .35rem;border-radius:1rem;border:1px solid var(--bdr)}

.er{display:flex;gap:.5rem;align-items:center;margin-bottom:.5rem}
.er label{margin-bottom:0;white-space:nowrap;font-size:.76rem;min-width:2.3rem}
.er .ei{flex:1;padding:.5rem .55rem;background:var(--bg);border:1px solid var(--bdr);border-radius:.5rem;color:var(--txt);font-size:.78rem;outline:none;font-family:var(--mono)}

.theme-toggle{display:flex;align-items:center;gap:.5rem;cursor:pointer;padding:.5rem 0}
.theme-track{width:2.6rem;height:1.4rem;border-radius:.7rem;background:var(--bdr);position:relative;transition:background .2s;flex-shrink:0}
.theme-track.on{background:var(--acc)}
.theme-knob{width:1.1rem;height:1.1rem;border-radius:50%;background:var(--white);position:absolute;top:.15rem;left:.15rem;transition:transform .2s;box-shadow:var(--shadow)}
.theme-track.on .theme-knob{transform:translateX(1.2rem)}
.theme-label{font-size:.84rem;font-weight:500}

.setup-bg{position:fixed;inset:0;background:var(--bg);z-index:100;display:flex;align-items:center;justify-content:center;padding:1.2rem}
.setup-card{background:var(--card);border-radius:var(--r2);padding:1.8rem;width:100%;max-width:380px;box-shadow:var(--shadow2);border:1px solid var(--bdr)}
.setup-card h2{font-size:1.4rem;font-weight:900;text-align:center;color:var(--txt);margin-bottom:.2rem}
.setup-card .sub{font-size:.68rem;color:var(--txt3);text-align:center;margin-bottom:1.6rem}
.setup-card label{font-size:.78rem;color:var(--txt2);margin-bottom:.25rem;display:block;font-weight:500}
.setup-card .inp{width:100%;padding:.65rem .75rem;background:var(--bg);border:1px solid var(--bdr);border-radius:.6rem;color:var(--txt);font-size:.88rem;outline:none;font-family:var(--font);margin-bottom:.6rem}
.setup-card .inp:focus{border-color:var(--acc)}
.setup-card .ci{font-family:var(--mono);letter-spacing:.2em;text-transform:uppercase;text-align:center;font-size:1.05rem;font-weight:600}
.stabs{display:flex;gap:0;margin-bottom:1.1rem;background:var(--bg);border-radius:.55rem;padding:.18rem;border:1px solid var(--bdr)}
.stab{flex:1;padding:.5rem;border:none;border-radius:.42rem;background:transparent;color:var(--txt3);font-size:.8rem;font-weight:600;cursor:pointer;font-family:var(--font);transition:all .15s}
.stab.on{background:var(--white);color:var(--txt);box-shadow:var(--shadow)}
.shint{font-size:.7rem;color:var(--txt3);margin-top:.6rem;text-align:center}

.qtags{display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.6rem}
.qtags-label{font-size:.68rem;color:var(--txt3);margin-bottom:.2rem;font-weight:500}
.qtag{padding:.3rem .65rem;border-radius:2rem;border:1px solid var(--bdr);background:var(--bg);color:var(--txt2);font-size:.75rem;font-weight:500;cursor:pointer;font-family:var(--font);transition:all .15s;white-space:nowrap}
.qtag:active{transform:scale(.95);background:var(--accBg);border-color:var(--accBdr);color:var(--acc)}

@media(min-width:640px){
  .member-tabs{display:none}
  .tl-col-header{display:block !important}
}
@media(max-width:639px){
  .tl-col{display:none}
  .tl-col.active{display:block}
  .tl-col-header{display:none !important}
}
`;

export default function HabitTracker() {
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState("setup");
  const [view, setView] = useState("timeline");
  const [setupTab, setSetupTab] = useState("create");
  const [dark, setDark] = useState(false);

  const [groupCode, setGroupCode] = useState("");
  const [groupName, setGroupName] = useState("时间轴打卡");
  const [members, setMembers] = useState([]);
  const [curUser, setCurUser] = useState("");
  const [setupName, setSetupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");

  const [selDate, setSelDate] = useState(TODAY);
  const [selMember, setSelMember] = useState("");
  const [data, setData] = useState({});
  const [showLate, setShowLate] = useState(false);

  const [planModal, setPlanModal] = useState(null);
  const [pmContent, setPmContent] = useState("");
  const [pmStart, setPmStart] = useState(7);
  const [pmEnd, setPmEnd] = useState(9);
  const [pmStartStr, setPmStartStr] = useState("07:00");
  const [pmEndStr, setPmEndStr] = useState("09:00");
  const [copyModal, setCopyModal] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [dmActual, setDmActual] = useState("");

  const [expStart, setExpStart] = useState(TODAY);
  const [expEnd, setExpEnd] = useState(TODAY);
  const [addName, setAddName] = useState("");
  const [editGroupName, setEditGroupName] = useState("");
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editingMemberName, setEditingMemberName] = useState("");

  // Reflection
  const [reflDraft, setReflDraft] = useState("");
  const [reflEditing, setReflEditing] = useState(false);
  const [reflPub, setReflPub] = useState(true);

  // Recent plan inputs
  const [recentInputs, setRecentInputs] = useState([]);

  const theme = dark ? DARK : LIGHT;
  const MCOLS = dark ? MCOLS_D : MCOLS_L;
  const sortedMembers = useMemo(() => {
    const me = members.filter(m => m.id === curUser);
    const others = members.filter(m => m.id !== curUser);
    return [...me, ...others];
  }, [members, curUser]);
  const visHours = useMemo(() => showLate ? [...LATE, ...HOURS] : HOURS, [showLate]);
  const firstH = visHours[0];
  const totalH = visHours.length;

  // URL param helpers
  const getUrlParams = () => {
    const p = new URLSearchParams(window.location.search);
    return { group: p.get("g"), user: p.get("u") };
  };
  const setUrlParams = (code, uid) => {
    const url = new URL(window.location.href);
    url.searchParams.set("g", code);
    url.searchParams.set("u", uid);
    window.history.replaceState({}, "", url.toString());
  };

  useEffect(() => {
    (async () => {
      // 1. Try URL params first (bookmark / home screen link)
      const urlP = getUrlParams();
      if (urlP.group && urlP.user) {
        try {
          const r = await storage.get("ht5-cfg");
          if (r?.value) {
            const c = JSON.parse(r.value);
            if (c.code === urlP.group) {
              setGroupCode(c.code); setMembers(c.members); setCurUser(urlP.user);
              setSelMember(urlP.user); setGroupName(c.groupName || "时间轴打卡");
              setEditGroupName(c.groupName || "时间轴打卡");
              if (c.dark !== undefined) setDark(c.dark);
              setPhase("app");
              // load data
              try {
                const rd = await storage.get("ht5-data", true);
                if (rd?.value) setData(JSON.parse(rd.value));
                else setData(SAMPLE_DATA());
              } catch { setData(SAMPLE_DATA()); }
              try {
                const rr = await storage.get("ht5-recent");
                if (rr?.value) setRecentInputs(JSON.parse(rr.value));
              } catch {}
              setLoaded(true);
              return;
            }
          }
        } catch {}
      }

      // 2. Fall back to stored config
      try {
        const r = await storage.get("ht5-cfg");
        if (r?.value) {
          const c = JSON.parse(r.value);
          setGroupCode(c.code); setMembers(c.members); setCurUser(c.curUser);
          setSelMember(c.curUser); setGroupName(c.groupName || "时间轴打卡");
          setEditGroupName(c.groupName || "时间轴打卡");
          if (c.dark !== undefined) setDark(c.dark);
          setUrlParams(c.code, c.curUser);
          setPhase("app");
        }
      } catch {}
      try {
        const r = await storage.get("ht5-data", true);
        if (r?.value) setData(JSON.parse(r.value));
        else setData(SAMPLE_DATA());
      } catch { setData(SAMPLE_DATA()); }
      try {
        const r = await storage.get("ht5-recent");
        if (r?.value) setRecentInputs(JSON.parse(r.value));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const saveData = useCallback(async d => { setData(d); try { await storage.set("ht5-data", JSON.stringify(d), true); } catch {} }, []);
  const saveCfg = useCallback(async (overrides = {}) => {
    const c = { code: groupCode, members, curUser, groupName, dark, ...overrides };
    try { await storage.set("ht5-cfg", JSON.stringify(c)); } catch {}
  }, [groupCode, members, curUser, groupName, dark]);

  const handleCreate = async () => {
    if (!setupName.trim()) return;
    const code = genCode(); const mid = "m1";
    const m = [{ id: mid, name: setupName.trim() }];
    setGroupCode(code); setMembers(m); setCurUser(mid); setSelMember(mid);
    setGroupName("时间轴打卡"); setEditGroupName("时间轴打卡");
    const cfg = { code, members: m, curUser: mid, groupName: "时间轴打卡", dark };
    try { await storage.set("ht5-cfg", JSON.stringify(cfg)); } catch {}
    await saveData(SAMPLE_DATA()); setUrlParams(code, mid); setPhase("app");
  };
  const handleJoin = async () => {
    if (!joinName.trim() || !joinCode.trim()) return;
    const mid = "m" + (members.length + 1);
    const nm = [...members, { id: mid, name: joinName.trim() }];
    const jc = joinCode.trim().toUpperCase();
    setGroupCode(jc); setMembers(nm); setCurUser(mid); setSelMember(mid);
    const cfg = { code: jc, members: nm, curUser: mid, groupName, dark };
    try { await storage.set("ht5-cfg", JSON.stringify(cfg)); } catch {}
    setUrlParams(jc, mid); setPhase("app");
  };
  const handleAddMember = async () => {
    if (!addName.trim()) return;
    const mid = "m" + (members.length + 1);
    const nm = [...members, { id: mid, name: addName.trim() }];
    setMembers(nm); setAddName("");
    await saveCfg({ members: nm });
  };
  const renameMember = async (mid, newName) => {
    if (!newName.trim()) return;
    const nm = members.map(m => m.id === mid ? { ...m, name: newName.trim() } : m);
    setMembers(nm); setEditingMemberId(null); setEditingMemberName("");
    await saveCfg({ members: nm });
  };

  const toggleDark = async () => {
    const nd = !dark; setDark(nd); await saveCfg({ dark: nd });
  };

  const getMemberDay = (date, mid) => data[date]?.[mid] || { plans: [], reflection: { text: "", isPublic: true, sent: false } };
  const setMemberDay = (date, mid, dayData) => { saveData({ ...data, [date]: { ...data[date], [mid]: dayData } }); };

  const openAddPlan = (mid, startH) => {
    setPmContent(""); setPmStart(startH); setPmEnd(Math.min(startH + 2, 25));
    setPmStartStr(fmtT(startH)); setPmEndStr(fmtT(Math.min(startH + 2, 25)));
    setPlanModal({ memberId: mid });
  };
  const savePlan = () => {
    if (!pmContent.trim() || !planModal) return;
    const { memberId, planId } = planModal; const md = getMemberDay(selDate, memberId);
    const content = pmContent.trim();
    let plans;
    if (planId) plans = md.plans.map(p => p.id === planId ? { ...p, start: pmStart, end: pmEnd, content } : p);
    else plans = [...md.plans, { id: genId(), start: pmStart, end: pmEnd, content, done: false, actual: "" }];
    setMemberDay(selDate, memberId, { ...md, plans }); setPlanModal(null);
    // Update recent inputs
    const updated = [content, ...recentInputs.filter(r => r !== content)].slice(0, 5);
    setRecentInputs(updated);
    try { storage.set("ht5-recent", JSON.stringify(updated)); } catch {}
  };
  const deletePlan = (mid, pid) => { const md = getMemberDay(selDate, mid); setMemberDay(selDate, mid, { ...md, plans: md.plans.filter(p => p.id !== pid) }); setDetailModal(null); };
  const toggleDone = (mid, pid) => { const md = getMemberDay(selDate, mid); setMemberDay(selDate, mid, { ...md, plans: md.plans.map(p => p.id === pid ? { ...p, done: !p.done } : p) }); };
  const saveActual = () => {
    if (!detailModal) return;
    const { memberId, plan } = detailModal; const md = getMemberDay(selDate, memberId);
    setMemberDay(selDate, memberId, { ...md, plans: md.plans.map(p => p.id === plan.id ? { ...p, actual: dmActual } : p) });
    setDetailModal(null);
  };

  const datesWithPlans = useMemo(() => Object.keys(data).filter(d => d !== selDate && data[d]?.[curUser]?.plans?.length > 0).sort().reverse(), [data, selDate, curUser]);
  const copyFromDate = (fromDate) => {
    const src = getMemberDay(fromDate, curUser); const dest = getMemberDay(selDate, curUser);
    const copied = src.plans.map(p => ({ ...p, id: genId(), done: false, actual: "" }));
    setMemberDay(selDate, curUser, { ...dest, plans: [...dest.plans, ...copied] }); setCopyModal(false);
  };

  // Reflection actions
  const myDay = useMemo(() => getMemberDay(selDate, curUser), [data, selDate, curUser]);
  const sendReflection = () => {
    if (!reflDraft.trim()) return;
    const md = getMemberDay(selDate, curUser);
    setMemberDay(selDate, curUser, { ...md, reflection: { text: reflDraft.trim(), isPublic: reflPub, sent: true } });
    setReflEditing(false);
  };
  const startEditReflection = () => {
    setReflDraft(myDay.reflection.text); setReflPub(myDay.reflection.isPublic); setReflEditing(true);
  };

  // When selDate or curUser changes, reset reflection editing state
  useEffect(() => {
    setReflEditing(false); setReflDraft("");
  }, [selDate, curUser]);

  const doExport = () => {
    let csv = "日期,时段,预期,完成,实际\n";
    const s = new Date(expStart + "T00:00:00"); const e = new Date(expEnd + "T00:00:00");
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const key = dk(d); const md = getMemberDay(key, curUser);
      if (md.plans.length === 0) { csv += `${key},无计划,,,\n`; continue; }
      md.plans.forEach(p => { csv += `${key},${fmtT(p.start)}-${fmtT(p.end)},${p.content},${p.done?"是":"否"},${p.actual||(p.done?p.content:"")}\n`; });
    }
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `打卡记录_${expStart}_${expEnd}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const navDates = useMemo(() => { const arr = []; for (let i = -3; i <= 3; i++) { const d = new Date(); d.setDate(d.getDate() + i); arr.push(dk(d)); } return arr; }, []);
  const now = new Date(); const nowH = now.getHours() + now.getMinutes() / 60;

  if (!loaded) return <div className="app"><style>{makeCSS(theme)}</style><div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"var(--txt3)"}}>加载中...</p></div></div>;

  if (phase === "setup") return (
    <div className="app"><style>{makeCSS(theme)}</style>
      <div className="setup-bg"><div className="setup-card">
        <h2>时间轴打卡</h2><p className="sub">和朋友一起规划每一天</p>
        <div className="stabs">
          <button className={`stab ${setupTab==="create"?"on":""}`} onClick={()=>setSetupTab("create")}>创建打卡组</button>
          <button className={`stab ${setupTab==="join"?"on":""}`} onClick={()=>setSetupTab("join")}>加入打卡组</button>
        </div>
        {setupTab === "create" ? (<>
          <label>你的昵称</label>
          <input className="inp" value={setupName} onChange={e=>setSetupName(e.target.value)} placeholder="输入你的昵称" />
          <button className="bp" style={{width:"100%"}} onClick={handleCreate}>创建打卡组 →</button>
          <p className="shint">创建后生成邀请码，发给朋友加入</p>
        </>) : (<>
          <label>邀请码</label>
          <input className="inp ci" value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="输入6位邀请码" maxLength={6} />
          <label>你的昵称</label>
          <input className="inp" value={joinName} onChange={e=>setJoinName(e.target.value)} placeholder="输入你的昵称" />
          <button className="bp" style={{width:"100%"}} onClick={handleJoin}>加入 →</button>
        </>)}
      </div></div>
    </div>
  );

  return (
    <div className="app"><style>{makeCSS(theme)}</style>

      <div className="topbar">
        <h1>{groupName}</h1>
        <span className="code">{groupCode}</span>
        <div className="spacer" />
        <button className="icon-btn" onClick={toggleDark} title="切换主题">{dark ? "☀️" : "🌙"}</button>
        <button className="icon-btn" onClick={()=>setCopyModal(true)} title="复制计划">📋</button>
        <button className="icon-btn primary" onClick={()=>openAddPlan(curUser, 9)} title="添加">＋</button>
      </div>

      <div className="date-nav">
        <button className="arr" onClick={()=>{const d=new Date(selDate);d.setDate(d.getDate()-1);setSelDate(dk(d))}}>‹</button>
        {navDates.map(d=>(
          <button key={d} className={`day-btn ${d===TODAY?"today":""} ${d===selDate&&d!==TODAY?"sel":""}`} onClick={()=>setSelDate(d)}>
            {d.slice(5)}<span className="d">周{dayLabel(d)}</span>
          </button>
        ))}
        <button className="arr" onClick={()=>{const d=new Date(selDate);d.setDate(d.getDate()+1);setSelDate(dk(d))}}>›</button>
        <input type="date" id="dp" value={selDate} onChange={e=>e.target.value&&setSelDate(e.target.value)} style={{width:0,height:0,opacity:0,position:"absolute"}} />
        <button className="arr" onClick={()=>document.getElementById("dp")?.showPicker?.()} title="更多">…</button>
        <button className="bs2" onClick={()=>setShowLate(!showLate)}
          style={{fontSize:".62rem",padding:".2rem .5rem",whiteSpace:"nowrap",flexShrink:0,marginLeft:".2rem",color:showLate?"var(--acc)":"var(--txt3)"}}>
          {showLate?"隐藏凌晨":"凌晨"}
        </button>
      </div>

      <div className="member-tabs">
        {sortedMembers.map((m,i)=>(
          <button key={m.id} className={`mtab ${selMember===m.id?"on":""}`}
            style={selMember===m.id?{background:MCOLS[i%MCOLS.length],borderColor:MCOLS[i%MCOLS.length]}:{}}
            onClick={()=>setSelMember(m.id)}>
            {m.name}{m.id===curUser?" (我)":""}
          </button>
        ))}
      </div>

      {view === "timeline" && (
        <div className="tl-wrap">
          <div style={{paddingTop:12,height:(totalH+1)*H*2+80}}>
            <div className="tl-grid" style={{height:(totalH+1)*H*2}}>
              <div className="tl-times">
                <div className="tl-col-header" style={{visibility:"hidden",borderBottom:"2px solid transparent"}}>&nbsp;</div>
                <div style={{position:"relative"}}>
                  {visHours.map((h,i)=><div key={h} className="tl-time" style={{top:i*H*2}}>{fmtH(h)}</div>)}
                  <div className="tl-time" style={{top:totalH*H*2}}>{fmtH(visHours[visHours.length-1]+1)}</div>
                </div>
              </div>
              <div className="tl-cols">
                {sortedMembers.map((m,mi)=>{
                  const md=getMemberDay(selDate,m.id); const col=MCOLS[mi%MCOLS.length];
                  return(
                    <div key={m.id} className={`tl-col ${selMember===m.id?"active":""}`}>
                      <div className="tl-col-header" style={{color:col,borderBottomColor:col}}>{m.name}{m.id===curUser?" (我)":""}</div>
                      <div className="tl-col-body" style={{height:(totalH+1)*H*2}}>
                        {visHours.map((h,i)=>(<div key={`g${h}`}><div className="tl-gridline" style={{top:i*H*2}} /><div className="tl-gridline minor" style={{top:i*H*2+H}} /></div>))}
                        <div className="tl-gridline" style={{top:totalH*H*2}} />
                        {visHours.map((h,i)=>(<div key={`e${h}`} className="tl-empty-slot" style={{top:i*H*2,height:H*2}} onClick={()=>m.id===curUser&&openAddPlan(m.id,h)} />))}
                        {(()=>{
                          // Calculate overlap columns for side-by-side layout
                          const plans = [...md.plans].sort((a,b)=>a.start-b.start||a.end-b.end);
                          const cols = []; // each plan gets {col, totalCols}
                          const active = []; // tracks which columns are occupied
                          const layout = {};
                          plans.forEach(p => {
                            // Free columns that ended
                            for (let c = active.length - 1; c >= 0; c--) {
                              if (active[c] && active[c].end <= p.start) active[c] = null;
                            }
                            // Find first free column
                            let placed = -1;
                            for (let c = 0; c < active.length; c++) {
                              if (!active[c]) { active[c] = p; placed = c; break; }
                            }
                            if (placed === -1) { placed = active.length; active.push(p); }
                            layout[p.id] = { col: placed };
                          });
                          // Determine total overlapping columns for each plan
                          plans.forEach(p => {
                            let maxCol = layout[p.id].col;
                            plans.forEach(q => {
                              if (p.id !== q.id && p.start < q.end && q.start < p.end) {
                                maxCol = Math.max(maxCol, layout[q.id].col);
                              }
                            });
                            layout[p.id].totalCols = maxCol + 1;
                          });
                          return plans.map(p => {
                            const top = (p.start - firstH) * H * 2;
                            const height = Math.max((p.end - p.start) * H * 2, H * 2);
                            const isDone = p.done; const hasActual = p.actual && !p.done;
                            const { col: pcol, totalCols } = layout[p.id];
                            const widthPct = 100 / totalCols;
                            const leftPct = pcol * widthPct;
                            return (
                              <div key={p.id} className={`plan-card ${isDone?"done":""} ${hasActual?"changed":""}`}
                                style={{
                                  top, height: height - 4,
                                  left: `calc(${leftPct}% + 3px)`,
                                  width: `calc(${widthPct}% - 6px)`,
                                  right: "auto",
                                  background: isDone ? "var(--okBg)" : hasActual ? "var(--warnBg)" : col + "14",
                                  borderLeftColor: isDone ? "var(--ok)" : col,
                                }}
                                onClick={e => { e.stopPropagation(); if (m.id === curUser) { setDetailModal({ memberId: m.id, plan: p }); setDmActual(p.actual || ""); } }}>
                                <div className="pc-time">{fmtT(p.start)}-{fmtT(p.end)}</div>
                                <div className="pc-content">{p.content}</div>
                                {hasActual && <div className="pc-actual">实际: {p.actual}</div>}
                                <div className={`pc-check ${isDone?"on":""}`}
                                  onClick={e => { e.stopPropagation(); if (m.id === curUser) toggleDone(m.id, p.id); }}>
                                  {isDone ? "✓" : ""}
                                </div>
                              </div>
                            );
                          });
                        })()}
                        {selDate===TODAY&&nowH>=firstH&&nowH<=firstH+totalH&&<div className="now-line" style={{top:(nowH-firstH)*H*2}} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reflection */}
          <div className="refl-section">
            <div className="refl-title">📝 今日总结</div>

            {myDay.reflection.sent && !reflEditing ? (
              <>
                <div className="refl-published">
                  <div className="refl-pub-text">{myDay.reflection.text}</div>
                  <div className="refl-pub-meta">
                    <span>{myDay.reflection.isPublic ? "🔓 公开" : "🔒 仅自己"}</span>
                    <button className="refl-edit-btn" onClick={startEditReflection}>编辑</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="refl-vis">
                  <button className={`refl-vis-btn ${reflPub?"on":""}`} onClick={()=>setReflPub(true)}>🔓 公开</button>
                  <button className={`refl-vis-btn ${!reflPub?"on":""}`} onClick={()=>setReflPub(false)}>🔒 仅自己</button>
                </div>
                <div className="refl-input-area">
                  <textarea className="refl-ta" value={reflDraft} onChange={e=>setReflDraft(e.target.value)}
                    placeholder="写下今天的心得总结..." />
                  <button className="refl-send" disabled={!reflDraft.trim()} onClick={sendReflection}>↑</button>
                </div>
                {reflEditing && <button className="bs2" style={{width:"100%",marginTop:".4rem",fontSize:".78rem"}} onClick={()=>setReflEditing(false)}>取消编辑</button>}
              </>
            )}

            {/* Others' reflections */}
            <div className="refl-others">
              {sortedMembers.filter(m=>m.id!==curUser).map(m=>{
                const md=getMemberDay(selDate,m.id);
                if(!md.reflection.sent || !md.reflection.isPublic || !md.reflection.text) return null;
                return <div key={m.id} className="refl-other"><div className="rn">{m.name}</div>{md.reflection.text}</div>;
              })}
            </div>
          </div>
        </div>
      )}

      {view === "settings" && (
        <div className="page">
          <div className="ss">
            <h3>✏️ 小组名称</h3>
            <div className="sc">
              <input className="si" value={editGroupName} onChange={e=>setEditGroupName(e.target.value)} placeholder="给你的打卡组起个名字" />
              <button className="bp" style={{width:"100%"}} onClick={async()=>{
                const n=editGroupName.trim()||"时间轴打卡"; setGroupName(n); setEditGroupName(n);
                await saveCfg({groupName:n});
              }}>保存组名</button>
            </div>
          </div>

          <div className="ss">
            <h3>🎨 外观</h3>
            <div className="sc">
              <div className="theme-toggle" onClick={toggleDark}>
                <div className={`theme-track ${dark?"on":""}`}><div className="theme-knob" /></div>
                <span className="theme-label">{dark?"暗色模式":"亮色模式"}</span>
              </div>
            </div>
          </div>

          <div className="ss">
            <h3>👥 成员</h3>
            <div className="sc">
              <div className="ml">
                {members.map((m,i)=>(
                  <div key={m.id} className="mi">
                    <div className="md" style={{background:MCOLS[i%MCOLS.length]}} />
                    {editingMemberId===m.id ? (
                      <div style={{flex:1,display:"flex",gap:".3rem",alignItems:"center"}}>
                        <input className="ii" style={{flex:1}} value={editingMemberName} onChange={e=>setEditingMemberName(e.target.value)}
                          placeholder="输入新昵称" autoFocus onKeyDown={e=>{if(e.key==="Enter")renameMember(m.id,editingMemberName)}} />
                        <button className="bp" style={{width:"auto",padding:".35rem .6rem",flex:"none",fontSize:".72rem"}} onClick={()=>renameMember(m.id,editingMemberName)}>保存</button>
                        <button className="bs2" style={{padding:".35rem .5rem",fontSize:".72rem"}} onClick={()=>setEditingMemberId(null)}>取消</button>
                      </div>
                    ) : (
                      <>
                        <div className="mn">{m.name}</div>
                        {m.id===curUser&&<span className="my">我</span>}
                        <button className="bs2" style={{padding:".25rem .45rem",fontSize:".65rem",marginLeft:".3rem"}}
                          onClick={()=>{setEditingMemberId(m.id);setEditingMemberName(m.name)}}>改名</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="ar">
                <input className="ii" value={addName} onChange={e=>setAddName(e.target.value)} placeholder="新成员昵称" />
                <button className="bp" style={{width:"auto",padding:".5rem .9rem",flex:"none"}} onClick={handleAddMember}>添加</button>
              </div>
            </div>
          </div>

          <div className="ss">
            <h3>🔑 邀请码</h3>
            <div className="sc">
              <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                <span style={{fontFamily:"var(--mono)",fontSize:"1.2rem",fontWeight:700,letterSpacing:".1em",color:"var(--acc)"}}>{groupCode}</span>
                <button className="bs2" style={{fontSize:".7rem",padding:".3rem .6rem"}} onClick={()=>navigator.clipboard?.writeText(groupCode)}>复制</button>
              </div>
              <p style={{fontSize:".7rem",color:"var(--txt3)",marginTop:".35rem"}}>分享邀请码给朋友即可加入</p>
            </div>
          </div>

          <div className="ss">
            <h3>🔗 我的专属链接</h3>
            <div className="sc">
              <p style={{fontSize:".75rem",color:"var(--txt2)",marginBottom:".4rem"}}>用这个链接添加到手机主屏幕，下次打开自动登录，无需重新输入邀请码</p>
              <div style={{padding:".5rem",background:"var(--bg)",borderRadius:".4rem",fontSize:".7rem",fontFamily:"var(--mono)",wordBreak:"break-all",color:"var(--txt3)",marginBottom:".4rem"}}>
                {typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}?g=${groupCode}&u=${curUser}` : ""}
              </div>
              <button className="bp" style={{width:"100%"}} onClick={()=>{
                const link = `${window.location.origin}${window.location.pathname}?g=${groupCode}&u=${curUser}`;
                navigator.clipboard?.writeText(link);
              }}>复制我的链接</button>
            </div>
          </div>

          <div className="ss">
            <h3>📤 导出</h3>
            <div className="sc">
              <div className="er"><label>起始</label><input type="date" className="ei" value={expStart} onChange={e=>setExpStart(e.target.value)} /></div>
              <div className="er"><label>结束</label><input type="date" className="ei" value={expEnd} onChange={e=>setExpEnd(e.target.value)} /></div>
              <button className="bp" style={{width:"100%",marginTop:".3rem"}} onClick={doExport}>导出 CSV</button>
              <p style={{fontSize:".7rem",color:"var(--txt3)",marginTop:".3rem"}}>导出你的个人记录</p>
            </div>
          </div>

          <div className="ss">
            <h3>🗑️ 数据</h3>
            <div className="sc">
              <button className="bdel" style={{width:"100%"}} onClick={async()=>{if(confirm("确定清除所有数据？")){setData({});setPhase("setup");try{await storage.delete("ht5-cfg");await storage.delete("ht5-data",true)}catch{}}}}>清除所有数据并重置</button>
            </div>
          </div>
        </div>
      )}

      <div className="bottombar">
        <button className={`bb-btn ${view==="timeline"?"on":""}`} onClick={()=>setView("timeline")}><span className="bb-icon">📅</span>时间轴</button>
        <button className={`bb-btn ${view==="settings"?"on":""}`} onClick={()=>setView("settings")}><span className="bb-icon">⚙️</span>设置</button>
      </div>

      {/* Modals */}
      {planModal&&<div className="modal-bg" onClick={()=>setPlanModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <h3>{planModal.planId?"编辑计划":"添加计划"}</h3>
        <label>时间段 <span style={{fontSize:".65rem",color:"var(--txt3)",fontWeight:400}}>可手动输入精确时间如 17:13</span></label>
        <div className="time-row">
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:".3rem"}}>
            <input className="inp" style={{marginBottom:0,fontFamily:"var(--mono)",textAlign:"center",fontSize:".9rem"}}
              value={pmStartStr} onChange={e=>{
                setPmStartStr(e.target.value);
                const v=parseTimeStr(e.target.value); if(v!==null) setPmStart(v);
              }} placeholder="07:00" />
            <div style={{display:"flex",flexWrap:"wrap",gap:".2rem"}}>
              {[7,9,11,13,15,17,19,21].map(h=>(
                <button key={h} className="qtag" style={{padding:".15rem .4rem",fontSize:".65rem"}}
                  onClick={()=>{setPmStart(h);setPmStartStr(fmtT(h))}}>{fmtH(h)}</button>
              ))}
            </div>
          </div>
          <span style={{color:"var(--txt3)",flexShrink:0,padding:"0 .2rem"}}>至</span>
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:".3rem"}}>
            <input className="inp" style={{marginBottom:0,fontFamily:"var(--mono)",textAlign:"center",fontSize:".9rem"}}
              value={pmEndStr} onChange={e=>{
                setPmEndStr(e.target.value);
                const v=parseTimeStr(e.target.value); if(v!==null) setPmEnd(v);
              }} placeholder="09:00" />
            <div style={{display:"flex",flexWrap:"wrap",gap:".2rem"}}>
              {[9,11,13,15,17,19,21,23].map(h=>(
                <button key={h} className="qtag" style={{padding:".15rem .4rem",fontSize:".65rem"}}
                  onClick={()=>{setPmEnd(h);setPmEndStr(fmtT(h))}}>{fmtH(h)}</button>
              ))}
            </div>
          </div>
        </div>
        <label>计划内容</label>
        {recentInputs.length > 0 && !planModal.planId && (
          <div>
            <div className="qtags-label">最近使用</div>
            <div className="qtags">
              {recentInputs.map((r, i) => (
                <button key={i} className="qtag" onClick={() => setPmContent(r)}>{r}</button>
              ))}
            </div>
          </div>
        )}
        <textarea className="inp" value={pmContent} onChange={e=>setPmContent(e.target.value)} placeholder="这个时段你打算做什么？" />
        <div className="btn-row"><button className="bs2" onClick={()=>setPlanModal(null)}>取消</button><button className="bp" onClick={savePlan}>保存</button></div>
      </div></div>}

      {detailModal&&<div className="modal-bg" onClick={()=>setDetailModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <h3>计划详情</h3>
        <div style={{padding:".65rem",background:"var(--bg)",borderRadius:".6rem",marginBottom:".6rem",borderLeft:"3.5px solid var(--acc)"}}>
          <div style={{fontSize:".7rem",color:"var(--txt3)",fontFamily:"var(--mono)"}}>{fmtT(detailModal.plan.start)} - {fmtT(detailModal.plan.end)}</div>
          <div style={{fontSize:".92rem",fontWeight:600,marginTop:".15rem"}}>预期：{detailModal.plan.content}</div>
        </div>
        <div className="chk-row" onClick={()=>{toggleDone(detailModal.memberId,detailModal.plan.id);setDetailModal({...detailModal,plan:{...detailModal.plan,done:!detailModal.plan.done}})}}>
          <div className={`chk-box ${detailModal.plan.done?"on":""}`}>{detailModal.plan.done?"✓":""}</div>
          <span className="chk-label">已按预期完成</span>
        </div>
        {!detailModal.plan.done&&<><label>实际做了什么（选填）</label><textarea className="inp" value={dmActual} onChange={e=>setDmActual(e.target.value)} placeholder="和预期不同则填写实际情况..." /></>}
        <div className="btn-row">
          <button className="bdel" onClick={()=>deletePlan(detailModal.memberId,detailModal.plan.id)}>删除</button>
          <button className="bs2" onClick={()=>{setPlanModal({memberId:detailModal.memberId,planId:detailModal.plan.id});setPmContent(detailModal.plan.content);setPmStart(detailModal.plan.start);setPmEnd(detailModal.plan.end);setPmStartStr(fmtT(detailModal.plan.start));setPmEndStr(fmtT(detailModal.plan.end));setDetailModal(null)}}>编辑</button>
          <button className="bp" onClick={saveActual}>保存</button>
        </div>
      </div></div>}

      {copyModal&&<div className="modal-bg" onClick={()=>setCopyModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
        <h3>📋 复制历史计划</h3>
        <p style={{fontSize:".78rem",color:"var(--txt2)",marginBottom:".6rem"}}>选择一天，复制到 {selDate}</p>
        {datesWithPlans.length===0?<p style={{color:"var(--txt3)",textAlign:"center",padding:"1.2rem"}}>暂无历史计划</p>:(
          <div className="copy-dates">{datesWithPlans.map(d=>(
            <button key={d} className="cdb" onClick={()=>copyFromDate(d)}>
              <span>{d} 周{dayLabel(d)}</span><span className="cc">{getMemberDay(d,curUser).plans.length} 项</span>
            </button>
          ))}</div>
        )}
        <div className="btn-row" style={{marginTop:".5rem"}}><button className="bs2" style={{flex:1}} onClick={()=>setCopyModal(false)}>关闭</button></div>
      </div></div>}
    </div>
  );
}
