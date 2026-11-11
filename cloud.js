/* Mochi Survivor · optional Firebase Auth + public Firestore leaderboard.
 * Default is offline play until firebase-config.js contains a real web app config.
 * Never place service-account/private credentials in public GitHub files.
 */
const $ = id => document.getElementById(id);
const status = $('cloudStatus'), authButton = $('authButton');
const nickButton = $('nicknameButton');
const cfg = window.MOCHI_FIREBASE_CONFIG || {};
let auth, db, google, firestore, authLib;
let saveTimer = null, syncing = false;
const ui = message => { if (status) status.textContent = message; };
const notify = message => window.MochiGame?.notice?.(message);
const profileKey = 'mochi_survivor_nickname';
const safeNickname = value => String(value || '').replace(/[<>\r\n\t]/g, '').trim().slice(0,18);
const myName = user => safeNickname(localStorage.getItem(profileKey)) || ('冒險者' + user.uid.slice(0,5));
const isGoogleAccount = user => !!user?.providerData?.some(p => p.providerId === 'google.com');
const savePayload = data => ({
  skills: Array.from({length:5},(_,i)=>Math.min(5,Math.max(0,Math.floor(Number(data.skills?.[i])||0)))),
  coins: Math.max(0,Math.min(100000000,Math.floor(Number(data.coins)||0))),
  best: Math.max(0,Math.min(5000,Math.floor(Number(data.best)||0))),
  selected: Math.max(0,Math.min(2,Math.floor(Number(data.selected)||0))),
  totalRuns: Math.max(0,Math.min(1000000,Math.floor(Number(data.totalRuns)||0))),
  updatedAt: firestore.serverTimestamp()
});
const cloud = {
  scheduleSave(){
    if (!auth?.currentUser || syncing) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const user = auth?.currentUser;
      if(!user) return;
      try{
        const data=savePayload(window.MochiGame.getSave());
        await firestore.setDoc(firestore.doc(db,'userProgress',user.uid), data);
      }catch(error){console.warn('Cloud progress sync failed:',error);ui('☁ 同步失敗，進度仍儲存在本機')}
    },2200);
  },
  async submitScore(rec){
    const user=auth?.currentUser;
    if(!user || !isGoogleAccount(user)){notify('請使用 Google 登入，才能登上世界排行');return}
    try{
      const wave=Math.max(1,Math.min(5000,Math.floor(rec.wave)||1));
      const kills=Math.max(0,Math.min(999999,Math.floor(rec.kills)||0));
      const score=wave*1000000+kills;
      const docRef=firestore.doc(db,'leaderboard',user.uid);
      await firestore.runTransaction(db,async trx=>{
        const previous=await trx.get(docRef);
        if(previous.exists() && Number(previous.data().score)>score)return;
        trx.set(docRef,{
          uid:user.uid,displayName:myName(user),
          character:String(rec.character||'吉伊卡哇').slice(0,12),
          wave,stage:String(rec.stage||'1-1').slice(0,12),
          kills,level:Math.min(9999,Math.max(1,Math.floor(rec.level)||1)),
          seconds:Math.min(9999999,Math.max(0,Math.floor(rec.seconds)||0)),
          score,updatedAt:firestore.serverTimestamp()
        });
      });
      notify('🏆 最高成績已同步到世界排行榜');
    }catch(error){console.warn('Leaderboard submit failed:',error);notify('排行榜送出失敗，單機紀錄已保存')}
  },
  async renderLeaderboard(target){
    if(!target)return;
    target.textContent = db ? '讀取全球排名中…' : 'Firebase 尚未連接；請完成專案設定後重試。';
    if(!db)return;
    try{
      const q=firestore.query(firestore.collection(db,'leaderboard'),firestore.orderBy('score','desc'),firestore.limit(100));
      const result=await firestore.getDocs(q);
      target.replaceChildren();
      if(result.empty){target.textContent='目前還沒有全球成績。成為第一位上榜的冒險者吧！';return}
      for(const [i,docSnap] of result.docs.entries()){
        const item=docSnap.data(),row=document.createElement('div');
        row.className='ranking-row';
        const rank=document.createElement('b'),name=document.createElement('span'),stage=document.createElement('span'),kills=document.createElement('span');
        rank.textContent=i<3?['🥇','🥈','🥉'][i]:String(i+1).padStart(2,'0');
        name.textContent=String(item.displayName||'匿名冒險者').slice(0,18)+(docSnap.id===auth?.currentUser?.uid?'（我）':'');
        stage.textContent=String(item.stage||'—')+' 關 · '+String(item.character||'');
        kills.textContent=String(item.kills||0)+' 擊倒';
        row.append(rank,name,stage,kills);
        target.append(row);
      }
    }catch(error){console.warn('Leaderboard query failed:',error);target.textContent='讀取排行榜失敗。請確認 Firestore 規則、網路連線和專案設定。'}
  }
};
window.MochiCloud=cloud;
async function init(){
  const version='12.19.0',base='https://www.gstatic.com/firebasejs/'+version+'/';
  const [a,b,c]=await Promise.all([
    import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')
  ]);
  authLib=b;firestore=c;
  const app=a.initializeApp(cfg);
  auth=b.getAuth(app);db=c.getFirestore(app);google=new b.GoogleAuthProvider();
  google.setCustomParameters({prompt:'select_account'});
  if(authButton)authButton.addEventListener('click', async()=>{
    const signedIn=auth.currentUser;
    authButton.disabled=true;
    try{
      if(signedIn)await b.signOut(auth);
      else await b.signInWithPopup(auth,google);
    }catch(error){console.warn('Auth failed:',error);notify('登入失敗：請允許彈出視窗並確認授權網域')}
    finally{authButton.disabled=false}
  });
  if(nickButton)nickButton.addEventListener('click',async()=>{
    if(!auth.currentUser)return;
    const before=myName(auth.currentUser);
    const entered=window.prompt('排行榜公開顯示的冒險者暱稱（最多 18 個字）',before);
    if(entered===null)return;
    const name=safeNickname(entered);
    if(!name){notify('請輸入暱稱');return}
    localStorage.setItem(profileKey,name);
    notify('排行榜暱稱已更新；下一次結算成績時同步');
    ui('☁ '+name+' · 已登入');
  });
  b.onAuthStateChanged(auth,async user=>{
    clearTimeout(saveTimer);
    if(!user){ui('☁ 訪客模式 · 進度保存在本機');if(authButton)authButton.textContent='Google 登入';if(nickButton)nickButton.hidden=true;return}
    ui('☁ '+myName(user)+' · 同步進度中…');if(authButton)authButton.textContent='登出';if(nickButton)nickButton.hidden=false;
    syncing=true;
    try{
      const snap=await c.getDoc(c.doc(db,'userProgress',user.uid));
      if(snap.exists())window.MochiGame?.mergeSave?.(snap.data());
    }catch(error){console.warn('Load cloud save failed:',error);notify('無法載入雲端進度，使用本機存檔')}
    syncing=false;
    ui('☁ '+myName(user)+' · 已登入（跨裝置同步）');
    cloud.scheduleSave();
  });
}
if(cfg.apiKey && cfg.projectId && cfg.appId && cfg.authDomain){
  ui('☁ Firebase 正在連線…');
  init().catch(error=>{console.warn('Firebase init failed:',error);ui('☁ Firebase 連線失敗，仍可離線遊玩')});
}else{
  if(authButton)authButton.addEventListener('click',()=>notify('請先設定 firebase-config.js 並啟用 Firebase Authentication'));
  if(nickButton)nickButton.hidden=true;
  ui('☁ 單機模式 · Firebase 尚未設定');
}
