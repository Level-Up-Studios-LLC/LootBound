import { useState, useEffect, useRef } from "react";
import { storageGet, storageSet, storageDelete } from "./storage.js";

var CFG_KEY = "qb-cfg-v5";
function childKey(id){return "qb-child-"+id+"-v5";}

var DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
var DAYS_SHORT=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
var DEF_TIER_PTS={1:5,2:10,3:20,4:30};
var BEDTIME=21*60;
var COOLDOWN=60;
var AVATARS=["🎮","🌟","⚽","🎨","🦁","🐱","🚀","🌈","🎵","🦄","🐶","🏀","📚","🌺","🦋","🐸"];
var COLORS=["#3b82f6","#ec4899","#22c55e","#f97316","#a855f7","#14b8a6","#eab308","#ef4444"];

var DEF_CHILDREN=[
  {id:"donovan",name:"Donovan",age:12,avatar:"🎮",color:"#3b82f6",pin:null},
  {id:"imani",name:"Imani",age:6,avatar:"🌟",color:"#ec4899",pin:null},
];

var DEF_TASKS={
  donovan:[
    {id:"d1",name:"Make bed",tier:2,windowStart:"07:00",windowEnd:"09:00",daily:true,dueDay:null},
    {id:"d2",name:"Brush teeth (AM)",tier:1,windowStart:"06:30",windowEnd:"08:00",daily:true,dueDay:null},
    {id:"d3",name:"Brush teeth (PM)",tier:1,windowStart:"20:00",windowEnd:"21:00",daily:true,dueDay:null},
    {id:"d4",name:"Homework",tier:3,windowStart:"16:00",windowEnd:"18:00",daily:true,dueDay:null},
    {id:"d5",name:"Clear plate after dinner",tier:1,windowStart:"18:00",windowEnd:"20:00",daily:true,dueDay:null},
    {id:"d6",name:"Take out trash",tier:2,windowStart:"18:00",windowEnd:"20:00",daily:true,dueDay:null},
    {id:"d7",name:"Put away laundry",tier:2,windowStart:"17:00",windowEnd:"19:00",daily:true,dueDay:null},
    {id:"d8",name:"Read for 20 min",tier:2,windowStart:"19:00",windowEnd:"21:00",daily:true,dueDay:null},
    {id:"d9",name:"Shower",tier:2,windowStart:"19:00",windowEnd:"21:00",daily:true,dueDay:null},
    {id:"d10",name:"Clean room",tier:3,windowStart:"10:00",windowEnd:"12:00",daily:false,dueDay:6},
  ],
  imani:[
    {id:"i1",name:"Make bed",tier:1,windowStart:"07:00",windowEnd:"09:00",daily:true,dueDay:null},
    {id:"i2",name:"Brush teeth (AM)",tier:1,windowStart:"07:00",windowEnd:"08:30",daily:true,dueDay:null},
    {id:"i3",name:"Brush teeth (PM)",tier:1,windowStart:"19:30",windowEnd:"20:30",daily:true,dueDay:null},
    {id:"i4",name:"Pick up toys",tier:2,windowStart:"18:00",windowEnd:"19:30",daily:true,dueDay:null},
    {id:"i5",name:"Put shoes away",tier:1,windowStart:"15:00",windowEnd:"17:00",daily:true,dueDay:null},
    {id:"i6",name:"Clear plate",tier:1,windowStart:"18:00",windowEnd:"19:30",daily:true,dueDay:null},
    {id:"i7",name:"Clothes in hamper",tier:1,windowStart:"19:00",windowEnd:"20:30",daily:true,dueDay:null},
    {id:"i8",name:"Practice reading",tier:2,windowStart:"16:00",windowEnd:"17:30",daily:true,dueDay:null},
  ],
};

var DEF_REWARDS=[
  {id:"r1",name:"15 min extra screen time",cost:50,icon:"📱",active:true,limitType:"daily",limitMax:2,requireApproval:false},
  {id:"r2",name:"Pick what's for dinner",cost:100,icon:"🍕",active:true,limitType:"daily",limitMax:1,requireApproval:false},
  {id:"r3",name:"Small toy or treat ($5)",cost:150,icon:"🎁",active:true,limitType:"weekly",limitMax:2,requireApproval:false},
  {id:"r4",name:"Movie night pick",cost:200,icon:"🎬",active:true,limitType:"weekly",limitMax:1,requireApproval:false},
  {id:"r5",name:"Stay up 30 min late",cost:250,icon:"🌙",active:true,limitType:"daily",limitMax:1,requireApproval:false},
  {id:"r6",name:"Friend sleepover",cost:300,icon:"🏠",active:true,limitType:"weekly",limitMax:1,requireApproval:false},
  {id:"r7",name:"Big reward ($20 item)",cost:500,icon:"🏆",active:true,limitType:"none",limitMax:0,requireApproval:true},
];

function freshUser(){return{points:0,streak:0,bestStreak:0,lastPerfectDate:null,taskLog:{},redemptions:[],pendingRedemptions:[],lastTaskTime:0};}
function getToday(){return new Date().toISOString().split("T")[0];}
function getWeekStart(){var d=new Date();var diff=d.getDate()-d.getDay();var s=new Date(d);s.setDate(diff);return s.toISOString().split("T")[0];}
function todayDow(){return new Date().getDay();}
function timeToMin(t){var p=t.split(":");return Number(p[0])*60+Number(p[1]);}
function nowMin(){var n=new Date();return n.getHours()*60+n.getMinutes();}
function nowSec(){return Math.floor(Date.now()/1000);}
function fmtTime(t){var p=t.split(":").map(Number);return(p[0]%12||12)+":"+String(p[1]).padStart(2,"0")+" "+(p[0]>=12?"PM":"AM");}
function prevDate(d){var dt=new Date(d+"T12:00:00");dt.setDate(dt.getDate()-1);return dt.toISOString().split("T")[0];}
function isPastBedtime(){return nowMin()>=BEDTIME;}
function isTaskActiveToday(task){if(task.daily)return true;if(task.dueDay!=null)return todayDow()===task.dueDay;return true;}
function slugify(s){return s.toLowerCase().replace(/[^a-z0-9]/g,"")+"_"+Date.now().toString(36);}

function getTaskStatus(task,completedAt){
  var now=nowMin();var s=timeToMin(task.windowStart);var e=timeToMin(task.windowEnd);
  if(completedAt!=null){if(completedAt<s)return"early";if(completedAt<=e)return"ontime";return"late";}
  if(now>=BEDTIME)return"missed";
  if(now<s)return"upcoming";if(now<=e)return"active";return"overdue";
}
function calcPts(bp,st){if(st==="early")return Math.round(bp*1.25);if(st==="ontime")return bp;if(st==="late")return Math.round(bp*0.5);if(st==="missed")return-bp;return 0;}

var SL={
  early:{text:"EARLY",color:"#a855f7",bg:"rgba(168,85,247,0.15)"},
  ontime:{text:"ON TIME",color:"#22c55e",bg:"rgba(34,197,94,0.15)"},
  late:{text:"LATE",color:"#f97316",bg:"rgba(249,115,22,0.15)"},
  missed:{text:"MISSED",color:"#ef4444",bg:"rgba(239,68,68,0.15)"},
  active:{text:"DO NOW",color:"#fbbf24",bg:"rgba(251,191,36,0.15)"},
  upcoming:{text:"UPCOMING",color:"#64748b",bg:"rgba(100,116,139,0.1)"},
  overdue:{text:"OVERDUE",color:"#ef4444",bg:"rgba(239,68,68,0.15)"},
  rejected:{text:"REDO",color:"#f43f5e",bg:"rgba(244,63,94,0.15)"},
};

async function sGet(k){try{var r=await storageGet(k);return r?JSON.parse(r.value):null;}catch(e){return null;}}
async function sSet(k,v){try{await storageSet(k,JSON.stringify(v));}catch(e){console.error(e);}}
async function sDel(k){try{await storageDelete(k);}catch(e){console.error(e);}}

function resizeImg(file,maxW){
  return new Promise(function(resolve){
    var reader=new FileReader();
    reader.onload=function(e){
      var img=new Image();img.onload=function(){
        var w=img.width,h=img.height;if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
        var c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);
        resolve(c.toDataURL("image/jpeg",0.7));
      };img.src=e.target.result;
    };reader.readAsDataURL(file);
  });
}

function countRedeems(redemptions,rid,lt){
  if(!redemptions||!redemptions.length)return 0;
  var today=getToday();var ws=getWeekStart();
  return redemptions.filter(function(r){if(r.rewardId!==rid)return false;if(lt==="daily")return r.date===today;if(lt==="weekly")return r.date>=ws;return true;}).length;
}

var FONT="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700&display=swap";

export default function App(){
  var _screen=useState("login"),screen=_screen[0],setScreen=_screen[1];
  var _curUser=useState(null),curUser=_curUser[0],setCurUser=_curUser[1];
  var _cfg=useState(null),cfg=_cfg[0],setCfg=_cfg[1];
  var _allU=useState({}),allU=_allU[0],setAllU=_allU[1];
  var _load=useState(true),loading=_load[0],setLoading=_load[1];
  var _ppin=useState(""),ppin=_ppin[0],setPpin=_ppin[1];
  var _kpin=useState(""),kpin=_kpin[0],setKpin=_kpin[1];
  var _pinErr=useState(""),pinErr=_pinErr[0],setPinErr=_pinErr[1];
  var _pinTarget=useState(null),pinTarget=_pinTarget[0],setPinTarget=_pinTarget[1];
  var _atab=useState("overview"),atab=_atab[0],setAtab=_atab[1];
  var _editTask=useState(null),editTask=_editTask[0],setEditTask=_editTask[1];
  var _addTask=useState(null),addTask=_addTask[0],setAddTask=_addTask[1];
  var _addReward=useState(null),addReward=_addReward[0],setAddReward=_addReward[1];
  var _editReward=useState(null),editReward=_editReward[0],setEditReward=_editReward[1];
  var _confirmR=useState(null),confirmR=_confirmR[0],setConfirmR=_confirmR[1];
  var _notif=useState(null),notif=_notif[0],setNotif=_notif[1];
  var _newPin=useState(""),newPin=_newPin[0],setNewPin=_newPin[1];
  var _tick=useState(0),setTick=_tick[1];
  var _cap=useState(null),capturing=_cap[0],setCapturing=_cap[1];
  var _vp=useState(null),viewPhoto=_vp[0],setViewPhoto=_vp[1];
  var _rt=useState(null),reviewTask=_rt[0],setReviewTask=_rt[1];
  var _kpe=useState({uid:null,val:""}),kidPinEdit=_kpe[0],setKidPinEdit=_kpe[1];
  var _addChild=useState(null),addChildForm=_addChild[0],setAddChildForm=_addChild[1];
  var _removeChild=useState(null),removeChild=_removeChild[0],setRemoveChild=_removeChild[1];
  var nRef=useRef(null);var fileRef=useRef(null);

  function notify(msg,type){if(nRef.current)clearTimeout(nRef.current);setNotif({msg:msg,type:type||"success"});nRef.current=setTimeout(function(){setNotif(null);},2500);}

  function getChild(id){if(!cfg||!cfg.children)return null;return cfg.children.find(function(c){return c.id===id;})||null;}

  useEffect(function(){
    var dead=false;
    (async function(){
      var c=await sGet(CFG_KEY);
      if(!c){
        c={children:DEF_CHILDREN,tasks:DEF_TASKS,rewards:DEF_REWARDS,parentPin:"1234",tierPoints:Object.assign({},DEF_TIER_PTS),approvalThreshold:300,lastWeeklyReset:getWeekStart()};
        await sSet(CFG_KEY,c);
      }
      if(!c.children)c.children=DEF_CHILDREN;
      if(!c.tierPoints)c.tierPoints=Object.assign({},DEF_TIER_PTS);
      if(c.approvalThreshold==null)c.approvalThreshold=300;
      if(!c.lastWeeklyReset)c.lastWeeklyReset="";

      var users={};
      var ws=getWeekStart();
      var needsReset=c.lastWeeklyReset<ws;
      for(var i=0;i<c.children.length;i++){
        var ch=c.children[i];
        var ud=(await sGet(childKey(ch.id)))||freshUser();
        if(needsReset){ud.taskLog={};await sSet(childKey(ch.id),ud);}
        users[ch.id]=ud;
      }
      if(needsReset){c.lastWeeklyReset=ws;await sSet(CFG_KEY,c);}
      if(!dead){setCfg(c);setAllU(users);setLoading(false);}
    })();
    return function(){dead=true;};
  },[]);

  useEffect(function(){var id=setInterval(function(){setTick(function(t){return t+1;});},30000);return function(){clearInterval(id);};},[]);

  // Bedtime cutoff
  useEffect(function(){
    if(!cfg||loading)return;
    (async function(){
      for(var i=0;i<cfg.children.length;i++){
        var ch=cfg.children[i];var ud=allU[ch.id];if(!ud)continue;
        if(!isPastBedtime())continue;
        var d=getToday();var log=ud.taskLog&&ud.taskLog[d]?ud.taskLog[d]:{};
        if(log._bedtimeApplied)continue;
        var updated=JSON.parse(JSON.stringify(ud));
        if(!updated.taskLog)updated.taskLog={};if(!updated.taskLog[d])updated.taskLog[d]={};
        var tasks=(cfg.tasks[ch.id]||[]).filter(isTaskActiveToday);
        var changed=false;
        tasks.forEach(function(t){
          var entry=updated.taskLog[d][t.id];
          if(!entry||entry.rejected){
            var bp=cfg.tierPoints[t.tier]||0;
            updated.taskLog[d][t.id]={completedAt:null,status:"missed",points:-bp,photo:null,rejected:false,autoCutoff:true};
            updated.points=(updated.points||0)-bp;changed=true;
          }
        });
        if(changed){updated.taskLog[d]._bedtimeApplied=true;updated.streak=0;await saveUsr(ch.id,updated);}
      }
    })();
  });

  function tp(tier){return cfg&&cfg.tierPoints?(cfg.tierPoints[tier]||0):(DEF_TIER_PTS[tier]||0);}
  async function saveCfg(c){setCfg(c);await sSet(CFG_KEY,c);}
  async function saveUsr(uid,data){setAllU(function(p){var o={};for(var k in p)o[k]=p[k];o[uid]=data;return o;});await sSet(childKey(uid),data);}

  // Add child
  async function doAddChild(form){
    var id=slugify(form.name);
    var newChild={id:id,name:form.name,age:Number(form.age)||1,avatar:form.avatar,color:form.color,pin:null};
    var newCfg=Object.assign({},cfg);
    newCfg.children=(newCfg.children||[]).concat([newChild]);
    if(!newCfg.tasks)newCfg.tasks={};
    newCfg.tasks[id]=[];
    await saveCfg(newCfg);
    await saveUsr(id,freshUser());
    setAddChildForm(null);
    notify(form.name+" added!");
  }

  // Remove child
  async function doRemoveChild(id){
    var newCfg=Object.assign({},cfg);
    newCfg.children=(newCfg.children||[]).filter(function(c){return c.id!==id;});
    var newTasks=Object.assign({},newCfg.tasks);delete newTasks[id];newCfg.tasks=newTasks;
    await saveCfg(newCfg);
    try{await sDel(childKey(id));}catch(e){}
    setAllU(function(p){var o={};for(var k in p)if(k!==id)o[k]=p[k];return o;});
    setRemoveChild(null);
    notify("Child removed");
  }

  function doKidLogin(uid){
    var ch=getChild(uid);if(!ch)return;
    if(ch.pin){setPinTarget(uid);setKpin("");setPinErr("");}
    else{setCurUser(uid);setScreen("dashboard");}
  }
  function submitKidPin(){
    var ch=getChild(pinTarget);if(!ch)return;
    if(kpin===ch.pin){setCurUser(pinTarget);setScreen("dashboard");setPinTarget(null);setKpin("");setPinErr("");}
    else{setPinErr("Wrong PIN");}
  }
  function doParentLogin(){
    if(ppin===(cfg?cfg.parentPin:"1234")){setCurUser("parent");setScreen("admin");setPinErr("");setPpin("");}
    else{setPinErr("Wrong PIN");}
  }

  function startCapture(taskId){
    if(isPastBedtime()){notify("Past bedtime. Tasks locked.","error");return;}
    var ud=allU[curUser];var now=nowSec();
    if(ud&&ud.lastTaskTime&&(now-ud.lastTaskTime)<COOLDOWN){notify("Wait "+(COOLDOWN-(now-ud.lastTaskTime))+"s","error");return;}
    setCapturing(taskId);if(fileRef.current){fileRef.current.value="";fileRef.current.click();}
  }

  async function handlePhoto(e){
    var file=e.target.files&&e.target.files[0];
    if(!file||!capturing){setCapturing(null);return;}
    var photo=await resizeImg(file,800);
    await doComplete(capturing,photo);setCapturing(null);if(fileRef.current)fileRef.current.value="";
  }

  async function doComplete(taskId,photo){
    var uid=curUser;if(!uid||uid==="parent"||!cfg)return;
    if(isPastBedtime()){notify("Past bedtime.","error");return;}
    var ud=JSON.parse(JSON.stringify(allU[uid]||freshUser()));
    var d=getToday();if(!ud.taskLog)ud.taskLog={};if(!ud.taskLog[d])ud.taskLog[d]={};
    var task=(cfg.tasks[uid]||[]).find(function(t){return t.id===taskId;});if(!task)return;
    var ex=ud.taskLog[d][taskId];if(ex&&!ex.rejected)return;
    var now=nowMin();var status;
    if(now<timeToMin(task.windowStart))status="early";
    else if(now<=Math.min(timeToMin(task.windowEnd),BEDTIME))status="ontime";
    else status="late";
    var bp=tp(task.tier);var pts=calcPts(bp,status);
    ud.taskLog[d][taskId]={completedAt:now,status:status,points:pts,photo:photo||null,rejected:false};
    ud.points=(ud.points||0)+pts;ud.lastTaskTime=nowSec();
    var todayActive=(cfg.tasks[uid]||[]).filter(isTaskActiveToday);
    var allDone=todayActive.every(function(t){var l=ud.taskLog[d]&&ud.taskLog[d][t.id];return l&&!l.rejected;});
    var noneMissed=todayActive.every(function(t){var l=ud.taskLog[d]&&ud.taskLog[d][t.id];return l&&l.status!=="missed"&&!l.rejected;});
    if(allDone&&noneMissed){
      if(ud.lastPerfectDate===prevDate(d)){ud.streak=(ud.streak||0)+1;}else if(ud.lastPerfectDate!==d){ud.streak=1;}
      ud.lastPerfectDate=d;if(ud.streak>(ud.bestStreak||0))ud.bestStreak=ud.streak;
      if(ud.streak===3){ud.points+=20;notify("+20: 3-day streak!");}
      else if(ud.streak===7){ud.points+=75;notify("+75: 7-day streak!");}
      else if(ud.streak===30){ud.points+=300;notify("+300: 30-day streak!");}
    }
    await saveUsr(uid,ud);var sl=SL[status]||{};notify((sl.text||"")+": "+(pts>0?"+":"")+pts+" pts");
  }

  async function rejectTask(uid,taskId){
    var ud=JSON.parse(JSON.stringify(allU[uid]||freshUser()));var d=getToday();
    if(!ud.taskLog||!ud.taskLog[d]||!ud.taskLog[d][taskId])return;
    var entry=ud.taskLog[d][taskId];if(entry.rejected)return;
    ud.points=(ud.points||0)-(entry.points||0);entry.rejected=true;entry.photo=null;
    await saveUsr(uid,ud);setReviewTask(null);notify("Task sent back to "+(getChild(uid)||{}).name);
  }

  function canRedeem(uid,reward){
    var ud=allU[uid]||freshUser();
    if((ud.points||0)<reward.cost)return{ok:false,reason:"Not enough points"};
    if(reward.limitType&&reward.limitType!=="none"&&reward.limitMax>0){
      var c=countRedeems(ud.redemptions,reward.id,reward.limitType);
      if(c>=reward.limitMax)return{ok:false,reason:"Limit reached ("+reward.limitMax+"/"+(reward.limitType==="daily"?"day":"wk")+")"};
    }
    return{ok:true,reason:null};
  }
  function needsApproval(reward){return reward.requireApproval||reward.cost>=(cfg?cfg.approvalThreshold:300);}

  async function requestRedemption(reward){
    var uid=curUser;if(!uid||uid==="parent")return;
    var check=canRedeem(uid,reward);if(!check.ok){notify(check.reason,"error");setConfirmR(null);return;}
    if(needsApproval(reward)){
      var ud=JSON.parse(JSON.stringify(allU[uid]||freshUser()));
      if(!ud.pendingRedemptions)ud.pendingRedemptions=[];
      ud.pendingRedemptions.push({rewardId:reward.id,name:reward.name,cost:reward.cost,icon:reward.icon,date:getToday(),requestedAt:Date.now()});
      await saveUsr(uid,ud);setConfirmR(null);notify("Sent for approval");return;
    }
    await execRedeem(uid,reward);
  }
  async function execRedeem(uid,reward){
    var ud=JSON.parse(JSON.stringify(allU[uid]||freshUser()));
    if((ud.points||0)<reward.cost)return;ud.points-=reward.cost;
    if(!ud.redemptions)ud.redemptions=[];
    ud.redemptions.push({rewardId:reward.id,name:reward.name,cost:reward.cost,date:getToday()});
    await saveUsr(uid,ud);setConfirmR(null);notify("Redeemed: "+reward.name);
  }
  async function approvePending(uid,idx){
    var ud=JSON.parse(JSON.stringify(allU[uid]||freshUser()));
    if(!ud.pendingRedemptions||!ud.pendingRedemptions[idx])return;
    var p=ud.pendingRedemptions[idx];if((ud.points||0)<p.cost){notify("Not enough points","error");return;}
    ud.points-=p.cost;if(!ud.redemptions)ud.redemptions=[];
    ud.redemptions.push({rewardId:p.rewardId,name:p.name,cost:p.cost,date:getToday()});
    ud.pendingRedemptions.splice(idx,1);await saveUsr(uid,ud);notify("Approved: "+p.name);
  }
  async function denyPending(uid,idx){
    var ud=JSON.parse(JSON.stringify(allU[uid]||freshUser()));
    if(!ud.pendingRedemptions)return;ud.pendingRedemptions.splice(idx,1);
    await saveUsr(uid,ud);notify("Denied");
  }
  async function addBonus(uid,pts){
    var ud=JSON.parse(JSON.stringify(allU[uid]||freshUser()));ud.points=(ud.points||0)+pts;
    await saveUsr(uid,ud);notify((pts>0?"+":"")+pts+" pts for "+(getChild(uid)||{}).name);
  }
  async function resetAll(){
    var children=cfg?cfg.children:[];
    for(var i=0;i<children.length;i++){await saveUsr(children[i].id,freshUser());}
    notify("All data reset");
  }

  if(loading)return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0f172a"}}><link href={FONT} rel="stylesheet"/><div style={{fontFamily:"'Fredoka', sans-serif",fontSize:22,color:"#fbbf24"}}>Loading Quest Board...</div></div>);

  var children=cfg?cfg.children:[];
  var ch=curUser&&curUser!=="parent"?getChild(curUser):null;
  var ud=curUser&&curUser!=="parent"?allU[curUser]:null;
  var uTasks=curUser&&curUser!=="parent"&&cfg?(cfg.tasks[curUser]||[]):[];
  var todayTasks=uTasks.filter(isTaskActiveToday);
  var d=getToday();
  var tLog=ud&&ud.taskLog&&ud.taskLog[d]?ud.taskLog[d]:{};
  var bedLock=isPastBedtime();

  var kidNav=[{id:"dashboard",icon:"🏠",label:"Home"},{id:"tasks",icon:"📋",label:"Tasks"},{id:"scores",icon:"🏆",label:"Scores"},{id:"store",icon:"🛒",label:"Store"}];

  function Badge(p){var sl=SL[p.status]||{text:"",color:"#64748b",bg:"transparent"};return <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:6,letterSpacing:0.5,color:sl.color,background:sl.bg}}>{sl.text}</span>;}
  function BNav(p){return(<div style={ns.nav}>{p.tabs.map(function(t){return <button key={t.id} onClick={function(){setScreen(t.id);}} style={Object.assign({},ns.navBtn,{color:screen===t.id?"#fbbf24":"#64748b"})}><span style={{fontSize:18}}>{t.icon}</span><span style={{fontSize:10,fontWeight:600}}>{t.label}</span></button>;})}<button onClick={function(){setCurUser(null);setScreen("login");}} style={ns.navBtn}><span style={{fontSize:18}}>🚪</span><span style={{fontSize:10,fontWeight:600}}>Exit</span></button></div>);}

  var pendingCount=0;children.forEach(function(c){var u=allU[c.id];if(u&&u.pendingRedemptions)pendingCount+=u.pendingRedemptions.length;});

  return(
    <div style={{fontFamily:"'Nunito', sans-serif",background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)",color:"#e2e8f0",minHeight:"100vh",maxWidth:480,margin:"0 auto",position:"relative"}}>
      <link href={FONT} rel="stylesheet"/>
      <style>{"* {box-sizing:border-box;margin:0;padding:0;} input:focus,button:focus,select:focus{outline:none;} ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px;}"}</style>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto}/>
      {notif&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",padding:"10px 24px",borderRadius:12,color:"#fff",fontWeight:700,fontSize:14,zIndex:1000,background:notif.type==="success"?"#22c55e":"#ef4444"}}>{notif.msg}</div>}
      {viewPhoto&&<div style={ns.overlay} onClick={function(){setViewPhoto(null);}}><div style={{maxWidth:360,width:"100%"}} onClick={function(e){e.stopPropagation();}}><img src={viewPhoto} alt="proof" style={{width:"100%",borderRadius:12}}/><button onClick={function(){setViewPhoto(null);}} style={Object.assign({},ns.btn,{width:"100%",marginTop:8,background:"#334155"})}>Close</button></div></div>}

      {/* LOGIN */}
      {screen==="login"&&(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:24}}>
        <div style={ns.bigTitle}>QUEST BOARD</div>
        <div style={{fontSize:16,color:"#94a3b8",marginBottom:32}}>Choose your profile</div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center",marginBottom:32}}>
          {children.map(function(c){return(
            <button key={c.id} onClick={function(){doKidLogin(c.id);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"24px 28px",background:"rgba(30,27,75,0.6)",borderRadius:16,border:"2px solid "+c.color,cursor:"pointer",minWidth:120,fontFamily:"'Nunito', sans-serif",color:"#e2e8f0"}}>
              <div style={{fontSize:40}}>{c.avatar}</div>
              <div style={{fontFamily:"'Fredoka', sans-serif",fontSize:18,fontWeight:600}}>{c.name}</div>
              <div style={{fontSize:13,color:"#fbbf24"}}>{((allU[c.id]||{}).points||0).toLocaleString()} pts</div>
              {c.pin&&<div style={{fontSize:10,color:"#64748b"}}>PIN protected</div>}
            </button>);
          })}
        </div>
        {children.length===0&&<div style={{color:"#64748b",marginBottom:24}}>No children added. Log in as parent to add.</div>}
        {pinTarget&&(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginBottom:24,background:"rgba(30,41,59,0.6)",padding:20,borderRadius:12}}>
          <div style={{fontSize:14,color:"#94a3b8"}}>Enter PIN for {(getChild(pinTarget)||{}).name}</div>
          <div style={{display:"flex",gap:8}}><input type="password" maxLength={4} value={kpin} onChange={function(e){setKpin(e.target.value);setPinErr("");}} onKeyDown={function(e){if(e.key==="Enter")submitKidPin();}} style={Object.assign({},ns.input,{width:100,textAlign:"center"})}/><button onClick={submitKidPin} style={ns.btn}>Go</button></div>
          {pinErr&&<div style={{color:"#ef4444",fontSize:13}}>{pinErr}</div>}
          <button onClick={function(){setPinTarget(null);}} style={{fontSize:12,color:"#64748b",background:"transparent",border:"none",cursor:"pointer",fontFamily:"'Nunito', sans-serif"}}>Cancel</button>
        </div>)}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
          <div style={{fontSize:14,color:"#64748b"}}>Parent Mode</div>
          <div style={{display:"flex",gap:8}}><input type="password" maxLength={6} placeholder="PIN" value={ppin} onChange={function(e){setPpin(e.target.value);setPinErr("");}} onKeyDown={function(e){if(e.key==="Enter")doParentLogin();}} style={Object.assign({},ns.input,{width:100,textAlign:"center"})}/><button onClick={doParentLogin} style={ns.btn}>Enter</button></div>
          {!pinTarget&&pinErr&&<div style={{color:"#ef4444",fontSize:13}}>{pinErr}</div>}
        </div>
      </div>)}

      {/* DASHBOARD */}
      {screen==="dashboard"&&ch&&ud&&(function(){
        var done=todayTasks.filter(function(t){var l=tLog[t.id];return l&&!l.rejected&&l.status!=="missed";}).length;
        var total=todayTasks.length;var pct=total>0?Math.round(done/total*100):0;
        return(<div style={ns.page}>
          {bedLock&&<div style={ns.bedBanner}>Past 9 PM bedtime. Tasks are locked for today.</div>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
            <div><div style={{fontFamily:"'Fredoka', sans-serif",fontSize:26,fontWeight:700}}>Hey {ch.name} {ch.avatar}</div><div style={{fontSize:13,color:"#94a3b8"}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div></div>
            <div style={ns.ptsBadge}><div style={{fontFamily:"'Fredoka', sans-serif",fontSize:24,fontWeight:700,color:"#fbbf24"}}>{(ud.points||0).toLocaleString()}</div><div style={{fontSize:11,color:"#fbbf24",fontWeight:700,letterSpacing:1}}>PTS</div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:24}}>
            <div style={{background:"rgba(30,41,59,0.7)",borderRadius:12,padding:12,borderLeft:"3px solid #fbbf24"}}><div style={ns.statV}>{pct}%</div><div style={ns.statL}>Today</div><div style={{height:4,background:"#1e293b",borderRadius:2,marginTop:6}}><div style={{height:"100%",borderRadius:2,width:pct+"%",background:pct===100?"#22c55e":"#fbbf24",transition:"width 0.5s"}}/></div></div>
            <div style={{background:"rgba(30,41,59,0.7)",borderRadius:12,padding:12,borderLeft:"3px solid #3b82f6"}}><div style={ns.statV}>{ud.streak||0}</div><div style={ns.statL}>Streak</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>Best: {ud.bestStreak||0}</div></div>
            <div style={{background:"rgba(30,41,59,0.7)",borderRadius:12,padding:12,borderLeft:"3px solid #a855f7"}}><div style={ns.statV}>{done}/{total}</div><div style={ns.statL}>Done</div></div>
          </div>
          <div style={ns.secHd}>Up Next</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {todayTasks.filter(function(t){var l=tLog[t.id];return!l||l.rejected;}).sort(function(a,b){return timeToMin(a.windowStart)-timeToMin(b.windowStart);}).slice(0,4).map(function(t){
              var entry=tLog[t.id];var isRej=entry&&entry.rejected;var status=isRej?"rejected":getTaskStatus(t,null);
              return(<div key={t.id} style={{display:"flex",alignItems:"center",gap:10,background:"rgba(30,41,59,0.5)",borderRadius:10,padding:"10px 12px"}}>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{t.name}</div><div style={{fontSize:11,color:"#64748b"}}>{fmtTime(t.windowStart)} - {fmtTime(t.windowEnd)}</div>{isRej&&<div style={{fontSize:11,color:"#f43f5e"}}>Parent requested redo</div>}</div>
                <Badge status={status}/>{status!=="missed"&&<button onClick={function(){startCapture(t.id);}} style={Object.assign({},ns.btn,{background:isRej?"#f43f5e":"#22c55e",fontSize:12,padding:"6px 12px"})}>{isRej?"Redo":"Done"}</button>}
              </div>);
            })}
            {todayTasks.filter(function(t){var l=tLog[t.id];return!l||l.rejected;}).length===0&&<div style={{textAlign:"center",padding:20,color:"#22c55e",fontWeight:600}}>All done for today!</div>}
          </div>
          <BNav tabs={kidNav}/>
        </div>);
      })()}

      {/* TASKS */}
      {screen==="tasks"&&ch&&ud&&(function(){
        var sorted=todayTasks.slice().sort(function(a,b){var al=tLog[a.id],bl=tLog[b.id];var ac=al&&!al.rejected&&al.status!=="missed",bc=bl&&!bl.rejected&&bl.status!=="missed";if(ac!==bc)return ac?1:-1;return timeToMin(a.windowStart)-timeToMin(b.windowStart);});
        return(<div style={ns.page}>
          <div style={ns.pgTitle}>Today's Quests</div>
          {bedLock&&<div style={ns.bedBanner}>Bedtime cutoff passed. Incomplete tasks marked as missed.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {sorted.map(function(t){
              var entry=tLog[t.id];var isRej=entry&&entry.rejected;var isDone=entry&&!entry.rejected&&entry.status!=="missed";var isMissed=entry&&entry.status==="missed"&&!entry.rejected;
              var status=isDone?entry.status:(isMissed?"missed":(isRej?"rejected":getTaskStatus(t,null)));var sl=SL[status]||{text:"",color:"#64748b",bg:"transparent"};var pts=isDone?entry.points:(isMissed?entry.points:tp(t.tier));
              return(<div key={t.id} style={{background:"rgba(30,41,59,0.6)",borderRadius:12,padding:14,borderLeft:"3px solid "+sl.color,opacity:isDone||isMissed?0.6:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div><div style={{fontSize:14,fontWeight:600,textDecoration:isDone?"line-through":"none"}}>{t.name}</div><div style={{fontSize:11,color:"#64748b"}}>{fmtTime(t.windowStart)} - {fmtTime(t.windowEnd)}{!t.daily&&t.dueDay!=null?" | "+DAYS_SHORT[t.dueDay]:""}</div>{isRej&&<div style={{fontSize:11,color:"#f43f5e",marginTop:2}}>Parent requested redo</div>}</div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><Badge status={status}/><div style={{fontSize:14,fontWeight:700,fontFamily:"'Fredoka', sans-serif",color:isDone||isMissed?sl.color:"#fbbf24"}}>{isDone||isMissed?(pts>0?"+"+pts:pts):tp(t.tier)} pts</div></div>
                </div>
                {isDone&&entry.photo&&<button onClick={function(){setViewPhoto(entry.photo);}} style={{fontSize:11,color:"#3b82f6",background:"transparent",border:"none",cursor:"pointer",fontFamily:"'Nunito', sans-serif",marginTop:4}}>View photo proof</button>}
                {!isDone&&!isMissed&&status!=="missed"&&<button onClick={function(){startCapture(t.id);}} style={{width:"100%",color:"#fff",borderRadius:8,padding:"8px",fontSize:13,fontWeight:700,marginTop:10,border:"none",cursor:"pointer",fontFamily:"'Nunito', sans-serif",background:isRej?"#f43f5e":status==="active"?"#22c55e":status==="upcoming"?"#3b82f6":"#f97316"}}>{isRej?"Redo + Photo":status==="upcoming"?"Early (+25%) + Photo":status==="overdue"?"Late (50%) + Photo":"Complete + Photo"}</button>}
                {isDone&&<div style={{fontSize:12,marginTop:6,color:sl.color}}>{status==="early"?"Early! Bonus points.":status==="ontime"?"On time. Full points.":"Late. Half points."}</div>}
                {isMissed&&<div style={{fontSize:12,marginTop:6,color:"#ef4444"}}>Missed. Points deducted.</div>}
              </div>);
            })}
          </div>
          <BNav tabs={kidNav}/>
        </div>);
      })()}

      {/* SCORES */}
      {screen==="scores"&&ch&&ud&&(function(){
        var sorted=children.slice().sort(function(a,b){return((allU[b.id]||{}).points||0)-((allU[a.id]||{}).points||0);});
        return(<div style={ns.page}>
          <div style={ns.pgTitle}>Scoreboard</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {sorted.map(function(c,idx){
              var udata=allU[c.id]||freshUser();var tasks=(cfg.tasks[c.id]||[]).filter(isTaskActiveToday);
              var log=udata.taskLog&&udata.taskLog[d]?udata.taskLog[d]:{};
              var done=tasks.filter(function(t){var l=log[t.id];return l&&!l.rejected&&l.status!=="missed";}).length;var isMe=c.id===curUser;
              return(<div key={c.id} style={{background:isMe?"rgba(251,191,36,0.08)":"rgba(30,41,59,0.5)",border:isMe?"1px solid rgba(251,191,36,0.3)":"1px solid transparent",borderRadius:14,padding:16,borderLeft:"4px solid "+c.color}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontSize:28}}>{idx===0?"👑":""}{c.avatar}</div>
                    <div><div style={{fontFamily:"'Fredoka', sans-serif",fontSize:18,fontWeight:700}}>{c.name}{isMe?" (You)":""}</div><div style={{fontSize:12,color:"#94a3b8"}}>Age {c.age}</div></div>
                  </div>
                  <div style={{textAlign:"right"}}><div style={{fontFamily:"'Fredoka', sans-serif",fontSize:26,fontWeight:700,color:"#fbbf24"}}>{(udata.points||0).toLocaleString()}</div><div style={{fontSize:11,color:"#fbbf24",fontWeight:700}}>PTS</div></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[[done+"/"+tasks.length,"Today"],[udata.streak||0,"Streak"],[udata.bestStreak||0,"Best"]].map(function(s){return <div key={s[1]} style={{background:"rgba(15,23,42,0.4)",borderRadius:8,padding:8,textAlign:"center"}}><div style={{fontFamily:"'Fredoka', sans-serif",fontSize:18,fontWeight:700}}>{s[0]}</div><div style={{fontSize:10,color:"#94a3b8"}}>{s[1]}</div></div>;})}
                </div>
              </div>);
            })}
          </div>
          <BNav tabs={kidNav}/>
        </div>);
      })()}

      {/* STORE */}
      {screen==="store"&&ch&&ud&&(function(){
        var rewards=(cfg.rewards||[]).filter(function(r){return r.active;});var pendingR=ud.pendingRedemptions||[];
        return(<div style={ns.page}>
          <div style={ns.pgTitle}>Reward Store</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:12,padding:"12px 16px",marginBottom:16}}><span>Balance:</span><span style={{fontFamily:"'Fredoka', sans-serif",fontSize:22,fontWeight:700,color:"#fbbf24"}}>{(ud.points||0).toLocaleString()} pts</span></div>
          {pendingR.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:14,fontWeight:700,color:"#fbbf24",marginBottom:8}}>Pending Approval</div>{pendingR.map(function(p,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",background:"rgba(251,191,36,0.08)",borderRadius:8,padding:"8px 12px",marginBottom:4,fontSize:13}}><span>{p.icon} {p.name}</span><span style={{color:"#fbbf24"}}>{p.cost} pts</span><span style={{fontSize:11,color:"#64748b"}}>Waiting...</span></div>;})}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {rewards.map(function(r){
              var check=canRedeem(curUser,r);var can=check.ok;var na=needsApproval(r);
              var li="";if(r.limitType&&r.limitType!=="none"&&r.limitMax>0){li=countRedeems(ud.redemptions,r.id,r.limitType)+"/"+r.limitMax+" "+(r.limitType==="daily"?"today":"wk");}
              return(<div key={r.id} style={{background:"rgba(30,41,59,0.6)",borderRadius:12,padding:14,display:"flex",flexDirection:"column",alignItems:"center",gap:6,textAlign:"center",opacity:can?1:0.5}}>
                <div style={{fontSize:32}}>{r.icon}</div><div style={{fontSize:13,fontWeight:600,lineHeight:1.3}}>{r.name}</div>
                <div style={{fontFamily:"'Fredoka', sans-serif",fontWeight:700,color:"#fbbf24"}}>{r.cost} pts</div>
                {li&&<div style={{fontSize:10,color:"#64748b"}}>{li}</div>}
                {na&&<div style={{fontSize:10,color:"#f97316"}}>Needs parent OK</div>}
                <button disabled={!can} onClick={function(){if(can)setConfirmR(r);}} style={{width:"100%",borderRadius:8,padding:"7px",fontSize:12,fontWeight:700,border:"none",fontFamily:"'Nunito', sans-serif",background:can?"#fbbf24":"#334155",color:can?"#0f172a":"#64748b",cursor:can?"pointer":"not-allowed"}}>{can?(na?"Request":"Redeem"):(check.reason||"Need more pts")}</button>
              </div>);
            })}
          </div>
          {ud.redemptions&&ud.redemptions.length>0&&<div><div style={Object.assign({},ns.secHd,{marginTop:20})}>Recent</div>{ud.redemptions.slice(-5).reverse().map(function(r,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",background:"rgba(30,41,59,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:6,fontSize:13}}><span>{r.name}</span><span style={{color:"#ef4444"}}>-{r.cost}</span><span style={{color:"#64748b",fontSize:12}}>{r.date}</span></div>;})}</div>}
          {confirmR&&<div style={ns.overlay}><div style={ns.modal}><div style={ns.modalHd}>{needsApproval(confirmR)?"Request Approval?":"Redeem?"}</div><div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginBottom:20}}><div style={{fontSize:32}}>{confirmR.icon}</div><div style={{fontSize:16,fontWeight:600}}>{confirmR.name}</div><div style={{color:"#fbbf24",fontSize:18,fontWeight:700}}>{confirmR.cost} pts</div>{needsApproval(confirmR)&&<div style={{fontSize:12,color:"#f97316"}}>Requires parent approval.</div>}</div><div style={ns.modalActs}><button onClick={function(){setConfirmR(null);}} style={ns.cancelBtn}>Cancel</button><button onClick={function(){requestRedemption(confirmR);}} style={ns.confirmBtn}>{needsApproval(confirmR)?"Request":"Confirm"}</button></div></div></div>}
          <BNav tabs={kidNav}/>
        </div>);
      })()}

      {/* ADMIN */}
      {screen==="admin"&&(function(){
        return(<div style={ns.page}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={ns.pgTitle}>Parent Dashboard</div><button onClick={function(){setCurUser(null);setScreen("login");}} style={ns.btn}>Exit</button></div>
          <div style={{display:"flex",gap:4,marginBottom:20,overflowX:"auto"}}>
            {[["overview","Overview"],["approvals","Approvals"+(pendingCount>0?" ("+pendingCount+")":"")],["review","Review"],["tasks","Tasks"],["rewards","Rewards"],["children","Children"],["settings","Settings"]].map(function(t){
              return <button key={t[0]} onClick={function(){setAtab(t[0]);}} style={{background:atab===t[0]?"rgba(251,191,36,0.15)":"transparent",color:atab===t[0]?"#fbbf24":"#64748b",borderRadius:8,padding:"8px 10px",fontSize:12,fontWeight:600,border:"none",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'Nunito', sans-serif"}}>{t[1]}</button>;
            })}
          </div>

          {/* OVERVIEW */}
          {atab==="overview"&&children.map(function(c){
            var udata=allU[c.id]||freshUser();var tasks=(cfg.tasks[c.id]||[]).filter(isTaskActiveToday);
            var log=udata.taskLog&&udata.taskLog[d]?udata.taskLog[d]:{};
            var done=tasks.filter(function(t){var l=log[t.id];return l&&!l.rejected&&l.status!=="missed";}).length;
            return(<div key={c.id} style={{background:"rgba(30,41,59,0.6)",borderRadius:12,padding:14,marginBottom:12,borderLeft:"3px solid "+c.color}}>
              <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,marginBottom:6}}><span>{c.avatar} {c.name} (age {c.age})</span><span style={{color:"#fbbf24",fontFamily:"'Fredoka', sans-serif"}}>{(udata.points||0).toLocaleString()} pts</span></div>
              <div style={{display:"flex",gap:16,fontSize:13,color:"#94a3b8",marginBottom:8}}><span>Today: {done}/{tasks.length}</span><span>Streak: {udata.streak||0}</span></div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><span style={{fontSize:12,color:"#94a3b8"}}>Adjust:</span>
                {[10,25,50,-10,-25].map(function(p){return <button key={p} onClick={function(){addBonus(c.id,p);}} style={{borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Nunito', sans-serif",background:p>0?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)",color:p>0?"#22c55e":"#ef4444"}}>{p>0?"+":""}{p}</button>;})}
              </div>
            </div>);
          })}

          {/* APPROVALS */}
          {atab==="approvals"&&(function(){
            var items=[];children.forEach(function(c){var udata=allU[c.id]||freshUser();(udata.pendingRedemptions||[]).forEach(function(p,i){items.push({uid:c.id,child:c,pending:p,idx:i});});});
            return(<div>
              <div style={{fontSize:13,color:"#94a3b8",marginBottom:12}}>Approve or deny reward requests.</div>
              {items.length===0&&<div style={{textAlign:"center",padding:20,color:"#64748b"}}>No pending approvals.</div>}
              {items.map(function(item,i){return(<div key={i} style={{background:"rgba(30,41,59,0.5)",borderRadius:10,padding:12,marginBottom:8,borderLeft:"3px solid "+item.child.color}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontWeight:600}}>{item.child.avatar} {item.child.name}</div><div style={{fontSize:14}}>{item.pending.icon} {item.pending.name} <span style={{color:"#fbbf24"}}>{item.pending.cost} pts</span></div></div>
                <div style={{display:"flex",gap:6}}><button onClick={function(){approvePending(item.uid,item.idx);}} style={Object.assign({},ns.addBtn,{fontSize:12})}>Approve</button><button onClick={function(){denyPending(item.uid,item.idx);}} style={Object.assign({},ns.delBtn,{fontSize:12})}>Deny</button></div></div>
              </div>);})}
            </div>);
          })()}

          {/* REVIEW */}
          {atab==="review"&&(function(){
            var items=[];children.forEach(function(c){var udata=allU[c.id]||freshUser();var log=udata.taskLog&&udata.taskLog[d]?udata.taskLog[d]:{};
              (cfg.tasks[c.id]||[]).forEach(function(t){var entry=log[t.id];if(entry&&!entry.rejected&&entry.status!=="missed")items.push({uid:c.id,child:c,task:t,entry:entry});});
            });
            return(<div>
              <div style={{fontSize:13,color:"#94a3b8",marginBottom:12}}>Review tasks and photos. Reject any that need redoing.</div>
              {items.length===0&&<div style={{textAlign:"center",padding:20,color:"#64748b"}}>No tasks to review today.</div>}
              {items.map(function(item){return(<div key={item.uid+"-"+item.task.id} style={{background:"rgba(30,41,59,0.5)",borderRadius:10,padding:12,marginBottom:8,borderLeft:"3px solid "+item.child.color}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontWeight:600}}>{item.child.avatar} {item.child.name}: {item.task.name}</div><div style={{fontSize:12,color:"#64748b"}}>{(SL[item.entry.status]||{}).text} | {item.entry.points>0?"+":""}{item.entry.points} pts</div></div><Badge status={item.entry.status}/></div>
                <div style={{display:"flex",gap:8,marginTop:8}}>{item.entry.photo&&<button onClick={function(){setViewPhoto(item.entry.photo);}} style={Object.assign({},ns.btn,{background:"#334155",fontSize:12,padding:"5px 12px"})}>View Photo</button>}<button onClick={function(){setReviewTask(item);}} style={Object.assign({},ns.btn,{background:"rgba(239,68,68,0.15)",color:"#ef4444",fontSize:12,padding:"5px 12px"})}>Reject</button></div>
              </div>);})}
            </div>);
          })()}
          {reviewTask&&<div style={ns.overlay}><div style={ns.modal}><div style={ns.modalHd}>Reject Task?</div><div style={{marginBottom:16}}><div style={{fontWeight:600}}>{reviewTask.child.name}: {reviewTask.task.name}</div><div style={{fontSize:13,color:"#94a3b8",marginTop:4}}>Points removed. Sent back for redo.</div></div>{reviewTask.entry.photo&&<img src={reviewTask.entry.photo} alt="proof" style={{width:"100%",borderRadius:8,marginBottom:12}}/>}<div style={ns.modalActs}><button onClick={function(){setReviewTask(null);}} style={ns.cancelBtn}>Cancel</button><button onClick={function(){rejectTask(reviewTask.uid,reviewTask.task.id);}} style={Object.assign({},ns.confirmBtn,{background:"#ef4444",color:"#fff"})}>Reject</button></div></div></div>}

          {/* TASKS */}
          {atab==="tasks"&&(<div>
            {children.map(function(c){
              var tasks=cfg.tasks[c.id]||[];
              return(<div key={c.id}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,marginTop:16}}><span style={{fontWeight:700}}>{c.avatar} {c.name}'s Tasks</span><button onClick={function(){setAddTask({uid:c.id,name:"",tier:1,windowStart:"08:00",windowEnd:"10:00",daily:true,dueDay:null});}} style={ns.addBtn}>+ Add</button></div>
                {tasks.map(function(t){return(<div key={t.id} style={ns.adminRow}><div><div style={{fontWeight:600}}>{t.name}</div><div style={{fontSize:12,color:"#64748b"}}>Tier {t.tier} ({tp(t.tier)} pts) | {fmtTime(t.windowStart)}-{fmtTime(t.windowEnd)} | {t.daily?"Daily":("Weekly: "+DAYS_SHORT[t.dueDay])}</div></div>
                  <div style={{display:"flex",gap:6}}><button onClick={function(){setEditTask(Object.assign({},t,{uid:c.id}));}} style={ns.editBtn}>Edit</button><button onClick={function(){var nt=Object.assign({},cfg.tasks);nt[c.id]=nt[c.id].filter(function(x){return x.id!==t.id;});saveCfg(Object.assign({},cfg,{tasks:nt}));}} style={ns.delBtn}>X</button></div></div>);})}
              </div>);
            })}
            {(editTask||addTask)&&<div style={ns.overlay}><div style={ns.modal}><div style={ns.modalHd}>{editTask?"Edit Task":"Add Task"}</div><TaskForm task={editTask||addTask} tierPts={cfg.tierPoints||DEF_TIER_PTS} onSave={function(t){var uid=t.uid;var nt=Object.assign({},cfg.tasks);if(editTask){nt[uid]=nt[uid].map(function(x){return x.id===t.id?{id:t.id,name:t.name,tier:t.tier,windowStart:t.windowStart,windowEnd:t.windowEnd,daily:t.daily,dueDay:t.daily?null:t.dueDay}:x;});}else{nt[uid]=(nt[uid]||[]).concat([{id:uid.substring(0,3)+Date.now(),name:t.name,tier:t.tier,windowStart:t.windowStart,windowEnd:t.windowEnd,daily:t.daily,dueDay:t.daily?null:t.dueDay}]);}saveCfg(Object.assign({},cfg,{tasks:nt}));setEditTask(null);setAddTask(null);}} onCancel={function(){setEditTask(null);setAddTask(null);}}/></div></div>}
          </div>)}

          {/* REWARDS */}
          {atab==="rewards"&&(function(){
            var rewards=cfg.rewards||[];
            return(<div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontWeight:700}}>Reward Catalog</span><button onClick={function(){setAddReward({name:"",cost:50,icon:"🎁",active:true,limitType:"none",limitMax:0,requireApproval:false});}} style={ns.addBtn}>+ Add</button></div>
              {rewards.map(function(r){var ll=r.limitType==="daily"?r.limitMax+"/day":r.limitType==="weekly"?r.limitMax+"/wk":"No limit";
                return(<div key={r.id} style={ns.adminRow}><div><span style={{fontSize:18}}>{r.icon}</span><span style={{fontWeight:600,marginLeft:8}}>{r.name}</span><div style={{fontSize:11,color:"#64748b"}}>{r.cost} pts | {ll}{r.requireApproval?" | Approval req.":""}</div></div>
                  <div style={{display:"flex",gap:6}}><button onClick={function(){setEditReward(Object.assign({},r));}} style={ns.editBtn}>Edit</button><button onClick={function(){saveCfg(Object.assign({},cfg,{rewards:rewards.map(function(x){return x.id===r.id?Object.assign({},x,{active:!x.active}):x;})}));}} style={Object.assign({},ns.editBtn,{background:r.active?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)",color:r.active?"#22c55e":"#ef4444"})}>{r.active?"On":"Off"}</button><button onClick={function(){saveCfg(Object.assign({},cfg,{rewards:rewards.filter(function(x){return x.id!==r.id;})}));}} style={ns.delBtn}>X</button></div></div>);
              })}
              {(addReward||editReward)&&<div style={ns.overlay}><div style={ns.modal}><div style={ns.modalHd}>{editReward?"Edit Reward":"Add Reward"}</div><RewardForm reward={editReward||addReward} onSave={function(r){if(editReward){saveCfg(Object.assign({},cfg,{rewards:(cfg.rewards||[]).map(function(x){return x.id===r.id?r:x;})}));}else{saveCfg(Object.assign({},cfg,{rewards:(cfg.rewards||[]).concat([Object.assign({},r,{id:"r"+Date.now(),active:true})])}));}setAddReward(null);setEditReward(null);}} onCancel={function(){setAddReward(null);setEditReward(null);}}/></div></div>}
            </div>);
          })()}

          {/* CHILDREN */}
          {atab==="children"&&(<div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><span style={{fontWeight:700}}>Manage Children</span><button onClick={function(){setAddChildForm({name:"",age:"",avatar:AVATARS[0],color:COLORS[0]});}} style={ns.addBtn}>+ Add Child</button></div>
            {children.map(function(c){
              return(<div key={c.id} style={{background:"rgba(30,41,59,0.5)",borderRadius:12,padding:14,marginBottom:10,borderLeft:"3px solid "+c.color}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontSize:32}}>{c.avatar}</div>
                    <div><div style={{fontWeight:700,fontSize:16}}>{c.name}</div><div style={{fontSize:12,color:"#94a3b8"}}>Age {c.age} | {(allU[c.id]||{}).points||0} pts | {c.pin?"PIN set":"No PIN"}</div></div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {/* PIN management */}
                    {kidPinEdit.uid===c.id?(
                      <div style={{display:"flex",gap:4}}>
                        <input type="password" maxLength={4} placeholder="PIN" value={kidPinEdit.val} onChange={function(e){setKidPinEdit({uid:c.id,val:e.target.value});}} style={Object.assign({},ns.input,{width:60,textAlign:"center",padding:"4px 6px",fontSize:12})}/>
                        <button onClick={function(){if(kidPinEdit.val.length===4){var nc=cfg.children.map(function(x){return x.id===c.id?Object.assign({},x,{pin:kidPinEdit.val}):x;});saveCfg(Object.assign({},cfg,{children:nc}));setKidPinEdit({uid:null,val:""});notify("PIN saved");}}} style={Object.assign({},ns.confirmBtn,{fontSize:11,padding:"3px 8px"})}>OK</button>
                        <button onClick={function(){setKidPinEdit({uid:null,val:""});}} style={Object.assign({},ns.cancelBtn,{fontSize:11,padding:"3px 6px"})}>X</button>
                      </div>
                    ):(
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={function(){setKidPinEdit({uid:c.id,val:""});}} style={Object.assign({},ns.editBtn,{fontSize:11,padding:"3px 8px"})}>{c.pin?"PIN":"Set PIN"}</button>
                        {c.pin&&<button onClick={function(){var nc=cfg.children.map(function(x){return x.id===c.id?Object.assign({},x,{pin:null}):x;});saveCfg(Object.assign({},cfg,{children:nc}));notify("PIN removed");}} style={Object.assign({},ns.delBtn,{fontSize:11,padding:"3px 8px"})}>Clear</button>}
                      </div>
                    )}
                    <button onClick={function(){setRemoveChild(c);}} style={Object.assign({},ns.delBtn,{fontSize:11,padding:"3px 8px"})}>Remove</button>
                  </div>
                </div>
              </div>);
            })}
            {children.length===0&&<div style={{textAlign:"center",padding:20,color:"#64748b"}}>No children. Add one to get started.</div>}

            {/* ADD CHILD FORM */}
            {addChildForm&&<div style={ns.overlay}><div style={ns.modal}>
              <div style={ns.modalHd}>Add Child</div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div><label style={ns.lbl}>Name</label><input value={addChildForm.name} onChange={function(e){setAddChildForm(Object.assign({},addChildForm,{name:e.target.value}));}} style={ns.input} placeholder="Child's name"/></div>
                <div><label style={ns.lbl}>Age</label><input type="number" value={addChildForm.age} onChange={function(e){setAddChildForm(Object.assign({},addChildForm,{age:e.target.value}));}} style={ns.input} placeholder="Age" min={1} max={18}/></div>
                <div><label style={ns.lbl}>Avatar</label>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{AVATARS.map(function(a){return <button key={a} onClick={function(){setAddChildForm(Object.assign({},addChildForm,{avatar:a}));}} style={{fontSize:24,borderRadius:8,padding:"4px 6px",border:addChildForm.avatar===a?"2px solid #fbbf24":"2px solid transparent",cursor:"pointer",background:addChildForm.avatar===a?"rgba(251,191,36,0.15)":"transparent"}}>{a}</button>;})}</div>
                </div>
                <div><label style={ns.lbl}>Color</label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{COLORS.map(function(c){return <button key={c} onClick={function(){setAddChildForm(Object.assign({},addChildForm,{color:c}));}} style={{width:28,height:28,borderRadius:"50%",background:c,border:addChildForm.color===c?"3px solid #fff":"3px solid transparent",cursor:"pointer"}}/>; })}</div>
                </div>
                <div style={ns.modalActs}>
                  <button onClick={function(){setAddChildForm(null);}} style={ns.cancelBtn}>Cancel</button>
                  <button onClick={function(){if(addChildForm.name&&addChildForm.age)doAddChild(addChildForm);}} style={ns.confirmBtn}>Add</button>
                </div>
              </div>
            </div></div>}

            {/* REMOVE CONFIRM */}
            {removeChild&&<div style={ns.overlay}><div style={ns.modal}>
              <div style={ns.modalHd}>Remove {removeChild.name}?</div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:14,color:"#94a3b8"}}>This permanently removes {removeChild.name} from Quest Board, including all their points, tasks, streaks, and history.</div>
                <div style={{fontSize:13,color:"#ef4444",marginTop:8}}>This action cannot be undone.</div>
              </div>
              <div style={ns.modalActs}>
                <button onClick={function(){setRemoveChild(null);}} style={ns.cancelBtn}>Cancel</button>
                <button onClick={function(){doRemoveChild(removeChild.id);}} style={Object.assign({},ns.confirmBtn,{background:"#ef4444",color:"#fff"})}>Remove</button>
              </div>
            </div></div>}
          </div>)}

          {/* SETTINGS */}
          {atab==="settings"&&(<div>
            <div style={ns.setBox}><div style={{fontWeight:700,marginBottom:8}}>Tier Point Values</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[1,2,3,4].map(function(tier){return(<div key={tier} style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,color:"#94a3b8",minWidth:50}}>Tier {tier}</span><input type="number" value={tp(tier)} onChange={function(e){var n=Object.assign({},cfg.tierPoints||DEF_TIER_PTS);n[tier]=Number(e.target.value)||0;saveCfg(Object.assign({},cfg,{tierPoints:n}));}} style={Object.assign({},ns.input,{width:70,textAlign:"center"})}/><span style={{fontSize:12,color:"#64748b"}}>pts</span></div>);})}</div></div>
            <div style={ns.setBox}><div style={{fontWeight:700,marginBottom:8}}>Approval Threshold</div><div style={{fontSize:13,color:"#94a3b8",marginBottom:8}}>Rewards costing this or more need approval.</div><div style={{display:"flex",gap:8,alignItems:"center"}}><input type="number" value={cfg.approvalThreshold||300} onChange={function(e){saveCfg(Object.assign({},cfg,{approvalThreshold:Number(e.target.value)||0}));}} style={Object.assign({},ns.input,{width:100,textAlign:"center"})}/><span style={{fontSize:13,color:"#64748b"}}>pts</span></div></div>
            <div style={ns.setBox}><div style={{fontWeight:700,marginBottom:8}}>Parent PIN</div><div style={{display:"flex",gap:8}}><input type="password" maxLength={6} placeholder="New PIN" value={newPin} onChange={function(e){setNewPin(e.target.value);}} style={Object.assign({},ns.input,{width:120,textAlign:"center"})}/><button onClick={function(){if(newPin.length>=4){saveCfg(Object.assign({},cfg,{parentPin:newPin}));setNewPin("");notify("PIN updated");}}} style={ns.btn}>Save</button></div></div>
            <div style={ns.setBox}><div style={{fontWeight:700,marginBottom:4}}>System Info</div><div style={{fontSize:12,color:"#64748b"}}>Bedtime cutoff: 9:00 PM | Weekly reset: Sunday | Cooldown: 60s</div><div style={{fontSize:12,color:"#64748b"}}>Tasks are recurring. Daily repeats every day, weekly on assigned day.</div></div>
            <div style={ns.setBox}><div style={{fontWeight:700,marginBottom:8}}>Reset All Data</div><div style={{fontSize:13,color:"#94a3b8",marginBottom:8}}>Clears all points, streaks, and history for all children.</div><button onClick={resetAll} style={{background:"rgba(239,68,68,0.2)",color:"#ef4444",borderRadius:8,padding:"8px 20px",fontWeight:700,border:"1px solid rgba(239,68,68,0.3)",cursor:"pointer",fontFamily:"'Nunito', sans-serif"}}>Reset Everything</button></div>
          </div>)}
        </div>);
      })()}
    </div>
  );
}

function TaskForm(props){
  var _s=useState(props.task),f=_s[0],setF=_s[1];var tp=props.tierPts;
  function u(k,v){setF(Object.assign({},f,{[k]:v}));}
  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <input placeholder="Task name" value={f.name} onChange={function(e){u("name",e.target.value);}} style={ns.input}/>
    <div><label style={ns.lbl}>Tier</label><select value={f.tier} onChange={function(e){u("tier",Number(e.target.value));}} style={ns.input}><option value={1}>Tier 1 ({tp[1]||5} pts)</option><option value={2}>Tier 2 ({tp[2]||10} pts)</option><option value={3}>Tier 3 ({tp[3]||20} pts)</option><option value={4}>Tier 4 ({tp[4]||30} pts)</option></select></div>
    <div style={{display:"flex",gap:8}}><div style={{flex:1}}><label style={ns.lbl}>Start</label><input type="time" value={f.windowStart} onChange={function(e){u("windowStart",e.target.value);}} style={ns.input}/></div><div style={{flex:1}}><label style={ns.lbl}>End</label><input type="time" value={f.windowEnd} onChange={function(e){u("windowEnd",e.target.value);}} style={ns.input}/></div></div>
    <div><label style={ns.lbl}>Frequency</label><div style={{display:"flex",gap:8}}><button onClick={function(){u("daily",true);}} style={Object.assign({},ns.btn,{flex:1,background:f.daily?"#3b82f6":"#334155",fontSize:13})}>Daily</button><button onClick={function(){u("daily",false);}} style={Object.assign({},ns.btn,{flex:1,background:!f.daily?"#3b82f6":"#334155",fontSize:13})}>Weekly</button></div></div>
    {!f.daily&&<div><label style={ns.lbl}>Due Day</label><select value={f.dueDay!=null?f.dueDay:""} onChange={function(e){u("dueDay",e.target.value!==""?Number(e.target.value):null);}} style={ns.input}><option value="">Select day...</option>{DAYS.map(function(day,i){return <option key={i} value={i}>{day}</option>;})}</select></div>}
    <div style={{fontSize:11,color:"#64748b"}}>{f.daily?"Repeats every day.":"Repeats weekly on selected day."}</div>
    <div style={ns.modalActs}><button onClick={props.onCancel} style={ns.cancelBtn}>Cancel</button><button onClick={function(){if(f.name&&(f.daily||f.dueDay!=null))props.onSave(f);}} style={ns.confirmBtn}>Save</button></div>
  </div>);
}

function RewardForm(props){
  var _s=useState(props.reward),f=_s[0],setF=_s[1];
  function u(k,v){setF(Object.assign({},f,{[k]:v}));}
  var emojis=["🎮","📱","🍕","🎁","🎬","🌙","🏠","🏆","🎨","⚽","🍦","📚"];
  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>
    <input placeholder="Reward name" value={f.name} onChange={function(e){u("name",e.target.value);}} style={ns.input}/>
    <div><label style={ns.lbl}>Icon</label><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{emojis.map(function(e){return <button key={e} onClick={function(){u("icon",e);}} style={{fontSize:20,borderRadius:6,padding:"4px 6px",border:"1px solid #334155",cursor:"pointer",background:f.icon===e?"#334155":"transparent"}}>{e}</button>;})}</div></div>
    <div><label style={ns.lbl}>Cost (points)</label><input type="number" value={f.cost} onChange={function(e){u("cost",Number(e.target.value));}} style={ns.input}/></div>
    <div><label style={ns.lbl}>Limit</label><select value={f.limitType||"none"} onChange={function(e){u("limitType",e.target.value);}} style={ns.input}><option value="none">No limit</option><option value="daily">Per day</option><option value="weekly">Per week</option></select></div>
    {f.limitType&&f.limitType!=="none"&&<div><label style={ns.lbl}>Max ({f.limitType==="daily"?"per day":"per week"})</label><input type="number" value={f.limitMax||1} min={1} onChange={function(e){u("limitMax",Number(e.target.value)||1);}} style={ns.input}/></div>}
    <label style={{fontSize:13,color:"#94a3b8",display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={!!f.requireApproval} onChange={function(e){u("requireApproval",e.target.checked);}}/> Require parent approval</label>
    <div style={ns.modalActs}><button onClick={props.onCancel} style={ns.cancelBtn}>Cancel</button><button onClick={function(){if(f.name)props.onSave(f);}} style={ns.confirmBtn}>Save</button></div>
  </div>);
}

var ns={
  page:{padding:"16px 16px 80px 16px"},
  bigTitle:{fontFamily:"'Fredoka', sans-serif",fontSize:42,fontWeight:700,color:"#fbbf24",letterSpacing:2,marginBottom:4},
  pgTitle:{fontFamily:"'Fredoka', sans-serif",fontSize:24,fontWeight:700,marginBottom:16},
  secHd:{fontFamily:"'Fredoka', sans-serif",fontSize:18,fontWeight:600,marginBottom:10,marginTop:20},
  statV:{fontFamily:"'Fredoka', sans-serif",fontSize:22,fontWeight:700},
  statL:{fontSize:12,color:"#94a3b8"},
  ptsBadge:{display:"flex",flexDirection:"column",alignItems:"center",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:12,padding:"8px 16px"},
  bedBanner:{background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"8px 14px",marginBottom:12,fontSize:13,color:"#ef4444",textAlign:"center"},
  nav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,display:"flex",justifyContent:"space-around",background:"rgba(15,23,42,0.95)",borderTop:"1px solid #1e293b",padding:"8px 0"},
  navBtn:{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"transparent",color:"#64748b",padding:"4px 8px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"'Nunito', sans-serif"},
  overlay:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20},
  modal:{background:"#1e293b",borderRadius:16,padding:24,width:"100%",maxWidth:380,maxHeight:"85vh",overflowY:"auto"},
  modalHd:{fontFamily:"'Fredoka', sans-serif",fontSize:20,fontWeight:700,marginBottom:16},
  modalActs:{display:"flex",gap:10,justifyContent:"flex-end"},
  input:{width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:8,color:"#e2e8f0",padding:"8px 12px",fontSize:14,fontFamily:"'Nunito', sans-serif"},
  lbl:{fontSize:12,color:"#94a3b8",marginBottom:4,display:"block"},
  btn:{background:"#334155",color:"#e2e8f0",borderRadius:8,padding:"8px 16px",fontWeight:600,border:"none",cursor:"pointer",fontFamily:"'Nunito', sans-serif"},
  cancelBtn:{background:"#334155",color:"#94a3b8",borderRadius:8,padding:"8px 20px",fontWeight:600,border:"none",cursor:"pointer",fontFamily:"'Nunito', sans-serif"},
  confirmBtn:{background:"#fbbf24",color:"#0f172a",borderRadius:8,padding:"8px 20px",fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Nunito', sans-serif"},
  addBtn:{background:"rgba(34,197,94,0.15)",color:"#22c55e",borderRadius:8,padding:"6px 14px",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Nunito', sans-serif"},
  editBtn:{background:"rgba(59,130,246,0.15)",color:"#3b82f6",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:600,border:"none",cursor:"pointer",fontFamily:"'Nunito', sans-serif"},
  delBtn:{background:"rgba(239,68,68,0.15)",color:"#ef4444",borderRadius:6,padding:"4px 10px",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"'Nunito', sans-serif"},
  adminRow:{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(30,41,59,0.5)",borderRadius:8,padding:"10px 12px",marginBottom:6},
  setBox:{background:"rgba(30,41,59,0.5)",borderRadius:12,padding:16,marginBottom:12},
};
