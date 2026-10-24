// Code Breaker: The Hacker Challenge
// Firebase setup is optional for local preview, required for real account + cross-device progress.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_FIREBASE_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  appId: "PASTE_YOUR_FIREBASE_APP_ID"
};
const firebaseReady = !Object.values(FIREBASE_CONFIG).some(v => v.startsWith("PASTE_"));
let auth=null, db=null;
if(firebaseReady){const app=initializeApp(FIREBASE_CONFIG);auth=getAuth(app);db=getFirestore(app);}

const $ = id => document.getElementById(id);
const state = { user:null, playerName:"Operative", maxLevel:1, xp:0, solved:0, mode:"signup", level:1, secret:"", attempts:[], maxAttempts:8, digits:3, reward:100, ended:false, demo:false };
const levels = Array.from({length:50},(_,i)=> {
  const n=i+1;
  let zone=n<=10?"EASY":n<=30?"MEDIUM":n<=49?"HARD":"NIGHTMARE";
  let digits=n<=10?3:n<=30?4:5;
  let attempts=n<=10?8:n<=30?9:n<=49?10:12;
  return {n,zone,digits,attempts,reward:100+(n-1)*35};
});
const tips = [
 "Start with varied digits. Use each clue to eliminate possibilities, not to guess randomly.",
 "A digit can be correct but in the wrong place. Track both kinds of information separately.",
 "Do not repeat a guess. Write down what each attempt proves, then narrow the options.",
 "On hard levels, consider the full pattern: a clue can rule out many possible codes at once.",
 "Level 50 is designed to punish random guessing. Build a deduction chain before you submit."
];
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),2800);}
function setAuthMode(mode){state.mode=mode;const signup=mode==="signup";$("auth-title").textContent=signup?"Enter the system":"Welcome back, operative";$("auth-subtitle").textContent=signup?"Create an account to save your progress across devices.":"Log in to continue from your last unlocked level."; $("name-label").classList.toggle("hidden",!signup);$("player-name").classList.toggle("hidden",!signup);$("player-name").required=signup;$("auth-submit").innerHTML=signup?'Create account <span>→</span>':'Log in securely <span>→</span>';$("switch-copy").textContent=signup?"Already registered?":"New to the system?";$("switch-auth").textContent=signup?"Log in":"Create account";}
$("switch-auth").addEventListener("click",()=>setAuthMode(state.mode==="signup"?"login":"signup"));
$("auth-form").addEventListener("submit",async e=>{e.preventDefault();const email=$("email").value.trim().toLowerCase(),password=$("password").value,name=$("player-name").value.trim()||email.split("@")[0];$("auth-submit").disabled=true;
 try{
  if(firebaseReady){
   if(state.mode==="signup"){const cred=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(cred.user,{displayName:name});state.user=cred.user;state.playerName=name;await loadProgress();}
   else{await signInWithEmailAndPassword(auth,email,password);}
  }else{
   // Local preview only. No real password authentication; progress is saved only in this browser.
   if(password.length<6)throw new Error("Password must contain at least 6 characters.");
   state.demo=true;state.user={uid:"demo-"+email,email,displayName:name};state.playerName=name;
   const local=JSON.parse(localStorage.getItem("cb-progress-"+email)||"null");
   if(state.mode==="signup" && localStorage.getItem("cb-account-"+email)){throw new Error("This demo account already exists in this browser. Log in instead.");}
   if(state.mode==="login" && !localStorage.getItem("cb-account-"+email)){throw new Error("No local demo account found. Create an account first in this browser.");}
   if(state.mode==="signup")localStorage.setItem("cb-account-"+email,JSON.stringify({name}));
   if(local){state.maxLevel=local.maxLevel||1;state.xp=local.xp||0;state.solved=local.solved||0;}
   showGame();
  }
 }catch(err){toast(errorText(err));}
 finally{$("auth-submit").disabled=false;}
});
function errorText(err){const code=err?.code||"";if(code.includes("email-already-in-use"))return"That email already has an account. Please log in.";if(code.includes("invalid-credential")||code.includes("wrong-password"))return"Email or password is incorrect.";if(code.includes("weak-password"))return"Choose a stronger password (at least 6 characters).";if(code.includes("invalid-email"))return"Please enter a valid email address.";return err?.message||"Something went wrong. Try again.";}
if(firebaseReady){onAuthStateChanged(auth,async user=>{if(user){state.user=user;state.playerName=user.displayName||user.email.split("@")[0];state.demo=false;try{await loadProgress();}catch(e){toast("Could not load cloud progress. Check Firestore rules.");showGame();}}else if(!state.demo){state.user=null;$("game-screen").classList.add("hidden");$("auth-screen").classList.remove("hidden");$("logout-btn").classList.add("hidden");setAuthMode("login");}});}
async function loadProgress(){if(!state.user)return;const snap=await getDoc(doc(db,"players",state.user.uid));if(snap.exists()){const p=snap.data();state.playerName=p.name||state.playerName;state.maxLevel=p.maxLevel||1;state.xp=p.xp||0;state.solved=p.solved||0;}else{await saveProgress();}showGame();}
async function saveProgress(){const data={name:state.playerName,maxLevel:state.maxLevel,xp:state.xp,solved:state.solved,updatedAt:new Date().toISOString()};if(firebaseReady&&state.user&&!state.demo){await setDoc(doc(db,"players",state.user.uid),data,{merge:true});$("save-status").textContent="CLOUD SYNC ON";}else if(state.user){localStorage.setItem("cb-progress-"+state.user.email,JSON.stringify(data));$("save-status").textContent="LOCAL SAVE ONLY";}}
function showGame(){$("auth-screen").classList.add("hidden");$("game-screen").classList.remove("hidden");$("logout-btn").classList.remove("hidden");$("auth-status").textContent=state.demo?"LOCAL DEMO":"AUTHENTICATED";$("player-display").textContent=state.playerName;$("player-email").textContent=state.user?.email||"offline demo";$("avatar").textContent=state.playerName.slice(0,2).toUpperCase();renderStats();buildLevelMap();startLevel(Math.min(state.maxLevel,50));}
function renderStats(){$("level-stat").innerHTML=String(Math.min(state.maxLevel,50)).padStart(2,"0")+' <em>/ 50</em>';$("level-progress").style.width=(Math.min(state.maxLevel,50)/50*100)+"%";$("xp-stat").textContent=state.xp.toLocaleString();$("solved-stat").textContent=state.solved;$("rank-stat").textContent=state.xp>=10000?"Cyber Legend":state.xp>=5000?"Elite Hacker":state.xp>=2000?"Code Phantom":state.xp>=700?"Analyst":"Recruit";$("rank-foot").textContent=state.xp>=5000?"Top-tier logic operative":"Earn XP to increase your rank";}
function makeSecret(digits){let pool="0123456789".split(""),out="";while(out.length<digits){const i=Math.floor(Math.random()*pool.length);out+=pool.splice(i,1)[0];}return out;}
function startLevel(n){state.level=n;const cfg=levels[n-1];state.digits=cfg.digits;state.maxAttempts=cfg.attempts;state.reward=cfg.reward;state.secret=makeSecret(cfg.digits);state.attempts=[];state.ended=false;$("mission-title").innerHTML=`Level ${String(n).padStart(2,"0")} <span class="tag ${cfg.zone.toLowerCase()}">${cfg.zone}</span>`;$("attempts-meta").textContent=cfg.attempts;$("digits-meta").textContent=cfg.digits;$("reward-meta").textContent=cfg.reward;$("guess-input").maxLength=cfg.digits;$("guess-input").value="";$("guess-input").placeholder="• ".repeat(cfg.digits).trim();$("input-hint").textContent=`Enter ${cfg.digits} unique digits. No repeated digits allowed.`;$("pin-slots").innerHTML=Array.from({length:cfg.digits},()=>"<span>_</span>").join("");$("guess-history").innerHTML='<div class="empty-history"><span>⌁</span><p>Your attempts will appear here.</p></div>';$("history-count").textContent=`0 / ${cfg.attempts}`;$("result-banner").className="result-banner hidden";$("submit-guess").disabled=false;$("guess-input").disabled=false;$("math-explainer").textContent=`${cfg.digits}-digit PIN, no repeated digits: 10 × 9 × 8… = ${permutations(10,cfg.digits).toLocaleString()} possible codes. Each clue narrows the search.`;$("tip-text").textContent=n===50?tips[4]:n>=31?tips[3]:n>=11?tips[2]:tips[(n-1)%2];buildLevelMap();}
function permutations(n,r){let x=1;for(let i=0;i<r;i++)x*=n-i;return x;}
function submitGuess(){if(state.ended)return;const guess=$("guess-input").value.trim();if(!new RegExp(`^\\d{${state.digits}}$`).test(guess)){toast(`Enter exactly ${state.digits} digits.`);return;}if(new Set(guess).size!==guess.length){toast("Repeated digits are not allowed. Think of a new combination.");return;}if(state.attempts.some(a=>a.guess===guess)){toast("You already tried that code. Use new information.");return;}
 const exact=[...guess].filter((d,i)=>d===state.secret[i]).length;let common=0;for(const d of guess)if(state.secret.includes(d))common++;const misplaced=common-exact;state.attempts.push({guess,exact,misplaced});renderHistory();$("history-count").textContent=`${state.attempts.length} / ${state.maxAttempts}`;$("pin-slots").innerHTML=[...guess].map(d=>`<span>${d}</span>`).join("");$("guess-input").value="";
 if(exact===state.digits){winLevel();return;}if(state.attempts.length>=state.maxAttempts){loseLevel();return;}
 $("input-hint").textContent=`${exact} exact · ${misplaced} misplaced · ${state.digits-exact-misplaced} absent`; }
$("submit-guess").addEventListener("click",submitGuess);$("guess-input").addEventListener("keydown",e=>{if(e.key==="Enter")submitGuess();});$("guess-input").addEventListener("input",e=>{e.target.value=e.target.value.replace(/\D/g,"").slice(0,state.digits);$("pin-slots").innerHTML=Array.from({length:state.digits},(_,i)=>`<span>${e.target.value[i]||"_"}</span>`).join("");});
$("keypad").addEventListener("click",e=>{const b=e.target.closest("button");if(!b||state.ended)return;const input=$("guess-input");if(b.dataset.digit!==undefined&&input.value.length<state.digits)input.value+=b.dataset.digit;else if(b.dataset.action==="clear")input.value="";else if(b.dataset.action==="back")input.value=input.value.slice(0,-1);input.dispatchEvent(new Event("input"));});
function renderHistory(){$("guess-history").innerHTML=state.attempts.map((a,i)=>{const dots=Array.from({length:state.digits},(_,j)=>`<i class="${j<a.exact?"exact":j<a.exact+a.misplaced?"misplaced":"absent"}"></i>`).join("");return `<div class="history-item"><div class="history-left"><span class="attempt-number">#${String(i+1).padStart(2,"0")}</span><div class="history-code">${[...a.guess].map(d=>`<i>${d}</i>`).join("")}</div></div><div class="feedback-dots" title="${a.exact} exact, ${a.misplaced} misplaced">${dots}</div></div>`;}).join("");}
async function winLevel(){state.ended=true;const used=state.attempts.length;const bonus=Math.max(0,(state.maxAttempts-used)*15);const earned=state.reward+bonus;state.xp+=earned;state.solved++;state.maxLevel=Math.max(state.maxLevel,Math.min(50,state.level+1));$("submit-guess").disabled=true;$("guess-input").disabled=true;$("result-banner").className="result-banner success";$("result-banner").textContent=`ACCESS GRANTED — PIN ${state.secret} cracked in ${used} attempt${used===1?"":"s"}. +${earned} XP`;renderStats();buildLevelMap();try{await saveProgress();}catch(e){toast("Solved! Cloud save failed; check Firebase rules.");}showModal(true,used,earned);}
function loseLevel(){state.ended=true;$("submit-guess").disabled=true;$("guess-input").disabled=true;$("result-banner").className="result-banner fail";$("result-banner").textContent=`ACCESS DENIED — Correct PIN: ${state.secret}. Study the clues and retry.`;showModal(false,state.attempts.length,0);}
function showModal(won,used,earned){$("modal-symbol").textContent=won?"✓":"×";$("modal-symbol").style.color=won?"var(--green)":"var(--red)";$("modal-symbol").style.background=won?"#173b35":"#41202c";$("modal-eyebrow").textContent=won?"MISSION COMPLETE":"SYSTEM LOCKOUT";$("modal-title").textContent=won?(state.level===50?"YOU BEAT THE SYSTEM":"Code cracked!"):"Not this time, operative";$("modal-copy").textContent=won?`Level ${state.level} cleared. Your logic is getting sharper. ${state.level===50?"You completed all 50 levels!":"Next level is now unlocked."}`:`The code was ${state.secret}. The best hackers learn from every failed attempt. Retry this level with a better deduction strategy.`;$("modal-stats").innerHTML=`<div><b>${used}</b><small>ATTEMPTS</small></div><div><b>+${earned}</b><small>XP EARNED</small></div><div><b>${state.level}/50</b><small>LEVEL</small></div>`;$("modal-action").textContent=won?(state.level===50?"Play level 50 again":"Next level →"):"Retry level ↻";$("modal-action").onclick=()=>{$("modal").classList.add("hidden");startLevel(won?Math.min(50,state.level+1):state.level);};$("modal-secondary").textContent=won?"Stay on this level":"Review clues";$("modal-secondary").onclick=()=>{$("modal").classList.add("hidden");};$("modal").classList.remove("hidden");}
$("logout-btn").addEventListener("click",async()=>{try{if(firebaseReady&&!state.demo)await signOut(auth);else{state.user=null;$("game-screen").classList.add("hidden");$("auth-screen").classList.remove("hidden");$("logout-btn").classList.add("hidden");setAuthMode("login");}}catch(e){toast(errorText(e));}});
$("levels-toggle").addEventListener("click",()=>{$("level-map").classList.toggle("hidden");$("level-map").scrollIntoView({behavior:"smooth",block:"start"});});$("levels-close").addEventListener("click",()=>$("level-map").classList.add("hidden"));
function buildLevelMap(){$("level-grid").innerHTML=levels.map(l=>{const done=l.n<state.maxLevel,unlocked=l.n<=state.maxLevel,current=l.n===state.level;return `<button class="level-cell ${done?"done":unlocked?"unlocked":""} ${current?"current":""}" ${unlocked?"":"disabled"} data-level="${l.n}" title="${l.zone}">${done?"✓":String(l.n).padStart(2,"0")}</button>`;}).join("");}
$("level-grid").addEventListener("click",e=>{const b=e.target.closest("[data-level]");if(!b||b.disabled)return;$("level-map").classList.add("hidden");startLevel(Number(b.dataset.level));window.scrollTo({top:0,behavior:"smooth"});});
setAuthMode("signup");
if(!firebaseReady){$("save-status").textContent="LOCAL DEMO MODE";$("auth-subtitle").textContent="Preview mode: progress saves only in this browser. Configure Firebase for real login and cloud sync.";}
