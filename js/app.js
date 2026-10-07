// UI + router + hành động (event delegation: data-go / data-tab / data-act). Chỉ gọi API.*
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RL={SUPER_ADMIN:'Quản trị tối cao',HR_MANAGER:'Quản lý nhân sự',EMPLOYEE:'Nhân viên'},ST={ACTIVE:'Hoạt động',LOCKED:'Đã khóa',DELETED:'Đã xóa'};
const FAM_HIDE=['citizenID','address','email','phone'];
const GENDER=[['Nam','Nam'],['Nữ','Nữ'],['Khác','Khác']],IMG='image/jpeg,image/png,image/webp',DOC=IMG+',application/pdf';
const CHILD={
  positions:{t:'Chức vụ',f:[{k:'position',l:'Chức vụ',r:1},{k:'fromDate',l:'Từ ngày',t:'date',r:1},{k:'isCurrent',l:'Đang giữ',t:'select',o:[['true','Có'],['false','Không']]}],c:['position','fromDate','isCurrent']},
  work:{t:'Quá trình công tác',f:[{k:'company',l:'Công ty',r:1},{k:'department',l:'Phòng ban'},{k:'position',l:'Chức vụ',r:1},{k:'fromDate',l:'Từ ngày',t:'date',r:1},{k:'toDate',l:'Đến ngày',t:'date'},{k:'description',l:'Mô tả',t:'textarea'}],c:['company','department','position','fromDate','toDate']},
  degrees:{t:'Bằng cấp',f:[{k:'name',l:'Tên bằng',r:1},{k:'major',l:'Chuyên ngành'},{k:'school',l:'Trường'},{k:'issuedDate',l:'Ngày cấp',t:'date'},{k:'file',l:'File (JPG/PNG/WebP/PDF ≤5MB)',t:'file',a:DOC}],c:['name','major','school','issuedDate']},
  certificates:{t:'Chứng chỉ',f:[{k:'name',l:'Tên chứng chỉ',r:1},{k:'issuer',l:'Nơi cấp'},{k:'certificateNumber',l:'Số hiệu'},{k:'issuedDate',l:'Ngày cấp',t:'date'},{k:'expiredDate',l:'Hết hạn',t:'date'},{k:'file',l:'File (JPG/PNG/WebP/PDF ≤5MB)',t:'file',a:DOC}],c:['name','issuer','certificateNumber','issuedDate','expiredDate']}};
const FAM_F=[{k:'relation',l:'Mối quan hệ',r:1,dl:['Cha','Mẹ','Vợ','Chồng','Con','Anh','Chị','Em','Ông','Bà','Cháu','Chú','Bác','Cô','Dì','Cậu','Người thân']},{k:'fullName',l:'Họ tên',r:1},{k:'dateOfBirth',l:'Ngày sinh',t:'date'},{k:'gender',l:'Giới tính',t:'select',o:[['','—'],...GENDER]},{k:'nationality',l:'Quốc tịch'},{k:'citizenID',l:'CCCD',n:1},{k:'address',l:'Địa chỉ',full:1},{k:'email',l:'Email',t:'email'},{k:'phone',l:'Điện thoại',n:1}];
const PROFILE_F=[{k:'fullName',l:'Họ tên',r:1},{k:'gender',l:'Giới tính',t:'select',o:GENDER},{k:'nationality',l:'Quốc tịch',r:1},{k:'dateOfBirth',l:'Ngày sinh',t:'date',r:1},{k:'citizenID',l:'CCCD',r:1,n:1},{k:'phone',l:'Điện thoại',r:1,n:1},{k:'email',l:'Email',t:'email',r:1},{k:'address',l:'Địa chỉ',full:1}];
const CONTACT_F=PROFILE_F.filter(f=>['phone','email','address'].includes(f.k));
let ME=null,TAB='profile',FILTER={q:'',role:'',status:'',page:1,sort:'role',dir:'asc'},AF={q:'',action:'',from:'',to:'',page:1};
const pager=(r,w)=>`<div class="bar pager"><span style="color:var(--mut)">Hiển thị dòng ${r.items.length?(r.page-1)*r.pageSize+1:0} - ${(r.page-1)*r.pageSize+r.items.length} · Trang <input class="pgin" type="number" min="1" value="${r.page}" data-pgin="${w}" title="Nhập số trang rồi nhấn Enter"></span><div class="sp"></div>${[['« Đầu',1],['Trước',r.page-1],['Sau',r.page+1],['Cuối »',r.pages]].map(([l,n],i)=>`<button class="sm" data-act="pg" data-w="${w}" data-p="${n}" ${(i<2?r.page<=1:r.page>=r.pages)?'disabled':''}>${l}</button>`).join('')}</div>`;

function toast(m,k='ok'){const t=$('#toast');t.className=k;t.innerHTML=`<i class="fa-solid ${{ok:'fa-circle-check',err:'fa-circle-exclamation',warn:'fa-triangle-exclamation'}[k]||'fa-circle-info'}"></i><span>${esc(m)}</span>`;t.style.display='flex';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',k==='err'?6000:3500)}
const fld=(f,vals,pre='')=>`<label${f.full?' class="full"':''}>${esc(f.l)}${f.r?' *':''}${f.t==='select'?`<select name="${pre}${f.k}">${f.o.map(([v,t])=>`<option value="${esc(v)}" ${String(vals[f.k])===v?'selected':''}>${esc(t)}</option>`).join('')}</select>`:f.t==='textarea'?`<textarea name="${pre}${f.k}">${esc(vals[f.k])}</textarea>`:`<input name="${pre}${f.k}" type="${f.t||'text'}" ${f.r?'required':''} ${f.a?`accept="${f.a}"`:''} ${f.n?'inputmode="numeric" pattern="[0-9]+" title="Chỉ nhập chữ số"':''} ${f.t==='date'&&API.maxDate(f.k)?`max="${API.maxDate(f.k)}"`:''} ${f.t==='file'?'':`value="${esc(vals[f.k])}"`}${f.dl?` list="dl-${pre}${f.k}"`:''}>${f.dl?`<datalist id="dl-${pre}${f.k}">${f.dl.map(x=>`<option value="${x}">`).join('')}</datalist>`:''}`}</label>`;
function form(title,fields,vals,submit,ok='Lưu',hook){
    const d=document.createElement('dialog'),grid=fields.length>4,body=fields.map(f=>(f.sec?`<div class="fsec">${esc(f.sec)}</div>`:'')+fld(f,vals)).join('');
  d.className=grid?'wide':'';
  d.innerHTML=`<form><h3>${esc(title)}</h3>${hook&&hook.top||''}<div class="${grid?'fgrid':''}">${body}</div>${hook&&hook.html||''}<div class="err"></div><div class="row"><button type="button" data-x>Hủy</button><button class="pri">${ok}</button></div></form>`;
  document.body.append(d);d.showModal();d.querySelector('[data-x]').onclick=()=>d.close();d.onclose=()=>d.remove();if(hook)hook.init(d);
  d.querySelector('form').onsubmit=async e=>{e.preventDefault();const data={};for(const f of fields){const el=e.target.elements[f.k];data[f.k]=f.t==='file'?el.files[0]:el.value}
    if(hook)hook.collect(e.target,data);
    try{await submit(data);d.close()}catch(x){d.querySelector('.err').textContent=x.message}}}
// Khối "thêm chức vụ / công tác / bằng cấp / chứng chỉ" trong form tạo người dùng
function kidsHook(){let n=0;return{
  html:`<div class="fsec">Thông tin bổ sung (tuỳ chọn)</div><div class="kids"><div class="bar">${Object.entries(CHILD).map(([k,c])=>`<button type="button" class="sm" data-addkid="${k}">+ ${c.t}</button>`).join('')}</div><div class="kidlist"></div></div>`,
  init(d){d.querySelector('.kids').onclick=e=>{const b=e.target.closest('[data-addkid]');
    if(e.target.closest('[data-rmkid]'))e.target.closest('fieldset').remove();
    if(b){const k=b.dataset.addkid,c=CHILD[k],fs=document.createElement('fieldset'),i=n++;fs.dataset.kind=k;fs.dataset.i=i;
      fs.innerHTML=`<legend>${c.t}</legend>${c.f.map(f=>fld(f,{isCurrent:'true'},`k${i}_`)).join('')}<button type="button" class="sm bad" data-rmkid>Bỏ mục này</button>`;d.querySelector('.kidlist').append(fs)}}},
  collect(frm,data){data.kids={};frm.querySelectorAll('fieldset[data-kind]').forEach(fs=>{const k=fs.dataset.kind,row={data:{}};
    CHILD[k].f.forEach(f=>{const el=fs.querySelector(`[name="k${fs.dataset.i}_${f.k}"]`);if(f.t==='file')row.file=el.files[0];else row.data[f.k]=el.value});
    (data.kids[k]=data.kids[k]||[]).push(row)})}}}
const ask=(title,msg,{ok='Xác nhận',danger=false}={})=>new Promise(res=>{
  const d=document.createElement('dialog'),box=document.body;let v=false;d.className='confirm';
  d.innerHTML=`<div class="cf-ico ${danger?'bad':''}"><i class="fa-solid ${danger?'fa-triangle-exclamation':'fa-circle-question'}"></i></div><div><h3>${esc(title)}</h3><p>${esc(msg)}</p></div><div class="row"><button type="button" data-x>Hủy</button><button type="button" class="pri${danger?' danger':''}" data-ok>${esc(ok)}</button></div>`;
  box.append(d);d.showModal();
  d.querySelector('[data-x]').onclick=()=>d.close();
  d.querySelector('[data-ok]').onclick=()=>{v=true;d.close()};
  d.onclose=()=>{d.remove();res(v)};
  d.querySelector(danger?'[data-x]':'[data-ok]').focus()});

const home=()=>{TAB='profile';history.replaceState(null,'',location.pathname+location.search)};
let busy=0;
const loading=on=>{let b=$('#prog');if(!b){b=document.createElement('div');b.id='prog';document.body.append(b)}busy=Math.max(0,busy+(on?1:-1));b.classList.toggle('on',busy>0)};
const run=async f=>{loading(true);try{await f()}catch(x){toast(x.message,'err')}finally{loading(false)}};
const SKEL=`<div class="skel skel-title"></div><div class="card">${'<div class="skel skel-row"></div>'.repeat(6)}</div>`;
const CI={positions:'fa-briefcase',work:'fa-building',degrees:'fa-graduation-cap',certificates:'fa-certificate'};
const empty=(icon,title,sub,btn='')=>`<div class="empty"><div class="empty-ico"><i class="fa-solid ${icon}"></i></div><h4>${esc(title)}</h4><p>${esc(sub)}</p>${btn}</div>`;
const actCls=a=>/DELETE|REMOVE|HARD/.test(a)?'red':/^(ADD|CREATE|RESTORE)/.test(a)?'green':/^(UPDATE|EDIT|CHANGE|SAVE)/.test(a)?'blue':/LOCK|RESET|ROLE|PROMOTE/.test(a)?'orange':'slate';
const dtc=s=>{const d=new Date(s);return`<div>${d.toLocaleDateString('vi-VN')}</div><div class="cell-sub">${d.toLocaleTimeString('vi-VN')}</div>`};

const AVA={}; // cache blob URL theo fileId để không đọc lại file mỗi lần vẽ sidebar
async function myAvatar(){const el=$('#meAva');if(!el)return;
  try{const fid=(await API.getUser(ME.id)).profile.profilePictureFileId;if(!fid)return;
    const url=AVA[fid]||(AVA[fid]=await API.fileUrl(fid));
    if(el.isConnected)el.innerHTML=`<img src="${esc(url)}" alt="" onerror="this.parentNode.textContent=this.parentNode.dataset.ini">`}catch{}}

const ini=n=>String(n||'').trim().split(/\s+/).slice(-2).map(w=>w[0]||'').join('').toUpperCase();
const avaBox=(fid,name,cls='')=>`<span class="ava-box ${cls}">${fid?`<img data-fid="${esc(fid)}" alt="" onerror="this.remove()">`:''}<b>${esc(ini(name))}</b></span>`;

async function famAvatars(){
  await Promise.all([...document.querySelectorAll('.fcard[data-uid]')].map(async c=>{const box=c.querySelector('.ava-box');if(!box||box.querySelector('img'))return;
    try{const fid=(await API.getUser(c.dataset.uid)).profile.profilePictureFileId;if(!fid)return;
      const url=AVA[fid]||(AVA[fid]=await API.fileUrl(fid));
      if(box.isConnected)box.insertAdjacentHTML('afterbegin',`<img src="${esc(url)}" alt="" onerror="this.remove()">`)}catch{}}))}
function shell(html){
  document.body.classList.remove('nav-open');
  const nav=[['profile','Hồ sơ cá nhân','fa-id-card',1],['users','Nhân sự','fa-users',ME.role!=='EMPLOYEE'],['audit','Nhật ký','fa-clock-rotate-left',ME.role==='SUPER_ADMIN']].filter(n=>n[3]);
  const cur=location.hash.split('/')[1]||'profile',title=(nav.find(n=>n[0]===cur)||nav[0])[1];
  $('#app').innerHTML=`<div class="shell"><nav><div class="brand"><span class="brand-logo"><i class="fa-solid fa-users"></i></span><div><div class="brand-name">HRM</div><div class="brand-sub">Quản lý nhân sự</div></div></div><div class="nav-group">Menu</div>${nav.map(([k,l,ic])=>`<a data-go="${k}" class="${cur===k?'on':''}"><i class="fa-solid ${ic}"></i>${l}</a>`).join('')}<div class="sp"></div><div class="nav-group">Hệ thống</div><a data-act="dir"><i class="fa-regular fa-folder-open"></i>Thư mục uploads</a><a data-act="pw"><i class="fa-solid fa-key"></i>Đổi mật khẩu</a><div class="side-user"><span class="avatar" id="meAva" data-ini="${esc(ME.username.slice(0,2).toUpperCase())}">${esc(ME.username.slice(0,2).toUpperCase())}</span><div><div class="side-user-name">${esc(ME.username)}</div><div class="side-user-role">${RL[ME.role]}</div></div></div><a data-act="logout"><i class="fa-solid fa-right-from-bracket"></i>Đăng xuất</a></nav><div class="scrim" data-act="menu"></div><main><div class="topbar"><button class="hamburger" data-act="menu" aria-label="Mở menu"><i class="fa-solid fa-bars"></i></button><span class="crumb-title">${title}</span><div class="sp"></div><span class="chip"><i class="fa-solid fa-database"></i>Dữ liệu: ${Store.mode==='kio'?'KIO':'Local'}</span></div><div class="view">${html}</div></main></div>`;
  document.querySelectorAll('[data-fid]').forEach(async i=>{try{i.src=await API.fileUrl(i.dataset.fid)}catch{}});
  myAvatar()}

function loginView(){$('#app').innerHTML=`<div class="card login"><div class="brand-logo lg"><i class="fa-solid fa-users"></i></div><h2>Đăng nhập</h2><p class="sub">Hệ thống quản lý nhân sự</p><form id="lf"><label>Tên đăng nhập<input name="u" required autofocus></label><label>Mật khẩu<input name="p" type="password" required></label><div class="err" id="le"></div><button class="pri" style="width:100%">Đăng nhập</button></form></div>`;
  $('#lf').onsubmit=async e=>{e.preventDefault();try{await API.login(e.target.u.value,e.target.p.value);home();boot()}catch(x){$('#le').textContent=x.message}}}
function forceChange(){$('#app').innerHTML='<div class="card login"><h2>Đổi mật khẩu</h2><p>Bạn cần đặt mật khẩu mới trước khi tiếp tục.</p><button class="pri" data-act="pw">Đặt mật khẩu mới</button></div>';A.pw()}

const kv=(p,keys)=>`<div class="kv">${keys.map(([k,l])=>`<span>${l}</span><span>${esc(p[k])||'—'}</span>`).join('')}</div>`;
const facts=a=>`<div class="facts">${a.map(([l,v])=>`<div class="fact"><small>${l}</small><b>${v}</b></div>`).join('')}</div>`;
// Tóm tắt đầu hồ sơ: chức vụ hiện tại, thời gian công tác (gộp các khoảng chồng nhau), số bằng cấp, chứng chỉ kèm cảnh báo hết hạn (≤30 ngày)
const DAY=864e5,ymd=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');return m?Date.UTC(+m[1],m[2]-1,+m[3]):NaN},
  todayS=()=>{const t=new Date();return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')};
function tenure(work){const T=ymd(todayS()),iv=(work||[]).map(w=>[ymd(w.fromDate),ymd(w.toDate)||T]).filter(([a,b])=>!isNaN(a)&&b>=a).sort((x,y)=>x[0]-y[0]);
  if(!iv.length)return'—';let ms=0,cur=null;
  for(const[a,b]of iv){if(cur&&a<=cur[1])cur[1]=Math.max(cur[1],b);else{if(cur)ms+=cur[1]-cur[0];cur=[a,b]}}ms+=cur[1]-cur[0];
  const m=Math.round(ms/DAY/30.4375);if(m<1)return'Dưới 1 tháng';const y=Math.floor(m/12),r=m%12;return[y?y+' năm':'',r?r+' tháng':''].filter(Boolean).join(' ')}
function certInfo(cs){const t=ymd(todayS());let ex=0,sn=0;for(const c of cs||[]){const e=ymd(c.expiredDate);if(isNaN(e))continue;if(e<t)ex++;else if(e<=t+30*DAY)sn++}return{ex,sn}}
function summary(d){const cp=(d.positions||[]).filter(r=>String(r.isCurrent)==='true').sort((a,b)=>String(b.fromDate).localeCompare(String(a.fromDate)))[0],{sn}=certInfo(d.certificates);
  return[['Chức vụ hiện tại',esc(cp&&cp.position)||'—'],['Thời gian công tác',tenure(d.work)],['Bằng cấp',String((d.degrees||[]).length)],
    ['Chứng chỉ',(d.certificates||[]).length+(sn?` <span class="tag orange">${sn} sắp hết hạn</span>`:'')]]}
// ----- Chức vụ / Công tác: dòng thời gian. Bằng cấp / Chứng chỉ: bảng trong cùng một tab -----
const rowActs=(k,id,rid)=>`<button class="sm" data-act="editc" data-id="${id}" data-kind="${k}" data-rid="${rid}">Sửa</button> <button class="sm bad" data-act="delc" data-id="${id}" data-kind="${k}" data-rid="${rid}">Xóa</button>`;
const addBtn=(k,id,first)=>`<button class="pri" data-act="add" data-id="${id}" data-kind="${k}"><i class="fa-solid fa-plus"></i>Thêm ${CHILD[k].t.toLowerCase()}${first?' đầu tiên':''}</button>`;
const monthYear=d=>{const m=/^(\d{4})-(\d{2})/.exec(d||'');return m?m[2]+'/'+m[1]:'—'}; // 2024-03-15 → 03/2024
function tlItem(k,r,id,ed){const cur=k==='positions'?String(r.isCurrent)==='true':!r.toDate,dur=k==='work'?tenure([r]):'—',
    sub=k==='work'?[r.company,r.department].filter(Boolean).map(esc).join(' · '):'',
    when=k==='positions'?'Từ '+esc(r.fromDate):`${esc(r.fromDate)} → ${r.toDate?esc(r.toDate):'nay'}${dur!=='—'?' · '+dur:''}`;
  return`<li class="tl-item${cur?' cur':''}"><div class="tl-date">${monthYear(r.fromDate)}</div><div class="tl-rail"><span class="tl-dot"></span></div><div class="tl-card"><div class="tl-top"><b>${esc(r.position)||'—'}</b>${cur?`<span class="tag ACTIVE">${k==='positions'?'Đang giữ':'Hiện tại'}</span>`:''}</div>${sub?`<div class="tl-sub">${sub}</div>`:''}<div class="tl-when">${when}</div>${k==='work'&&r.description?`<p class="tl-desc">${esc(r.description)}</p>`:''}${ed?`<div class="tl-acts">${rowActs(k,id,r.id)}</div>`:''}</div></li>`}
// Dòng thời gian nằm ngang, cũ → mới từ trái sang phải; ít mục thì thẻ giãn kín chiều rộng, nhiều mục thì cuộn ngang
const timeline=(k,rows,id,ed)=>`<ul class="tl" id="tl-${k}" tabindex="0" aria-label="Dòng thời gian: ${CHILD[k].t}">${[...rows].sort((a,b)=>String(a.fromDate).localeCompare(String(b.fromDate))).map(r=>tlItem(k,r,id,ed)).join('')}</ul>`;
const tlNav=k=>`<span class="tl-nav" data-nav="tl-${k}" hidden><button class="sm" data-act="tlgo" data-t="tl-${k}" data-d="-1" aria-label="Cuộn sang trái"><i class="fa-solid fa-chevron-left"></i></button><button class="sm" data-act="tlgo" data-t="tl-${k}" data-d="1" aria-label="Cuộn sang phải"><i class="fa-solid fa-chevron-right"></i></button></span>`;
function tlInit(){document.querySelectorAll('.tl').forEach(el=>{el.scrollLeft=el.scrollWidth;const n=document.querySelector(`[data-nav="${el.id}"]`);if(n)n.hidden=el.scrollWidth<=el.clientWidth+1})}
const tlBody=(k,rows,id,ed)=>!(rows||[]).length?empty(CI[k],`Chưa có ${CHILD[k].t.toLowerCase()}`,ed?'Thêm bản ghi đầu tiên để hoàn thiện hồ sơ.':'Chưa có thông tin nào được cập nhật.',ed?addBtn(k,id,1):''):`<div class="bar"><div class="sp"></div>${tlNav(k)}${ed?addBtn(k,id):''}</div>${timeline(k,rows,id,ed)}`;
const tlCard=(k,rows,id)=>(rows||[]).length?`<div class="card"><div class="sechd"><h3><i class="fa-solid ${CI[k]}"></i>${CHILD[k].t}</h3><div class="sp"></div>${tlNav(k)}</div>${timeline(k,rows,id,false)}</div>`:'';
const qCell=(f,r)=>{const v=r[f.k];if(f.k==='expiredDate'&&v){const t=ymd(todayS()),e=ymd(v);return esc(v)+(e<t?' <span class="tag red">Hết hạn</span>':e<=t+30*DAY?' <span class="tag orange">Sắp hết hạn</span>':'')}return esc(v)||'—'};
function qTable(k,rows,id,ed){const c=CHILD[k],cols=c.f.filter(f=>f.t!=='file'&&c.c.includes(f.k));
  return`<div class="tbl-wrap"><table><tr>${cols.map(f=>`<th>${f.l}</th>`).join('')}<th></th></tr>${rows.map(r=>`<tr>${cols.map(f=>`<td data-l="${esc(f.l)}">${qCell(f,r)}</td>`).join('')}<td class="acts">${r.fileId?`<button class="sm" data-act="open" data-id="${r.fileId}">Xem file</button> `:''}${ed?rowActs(k,id,r.id):''}</td></tr>`).join('')}</table></div>`}
function qualCard(k,rows,id,ed,ro){rows=rows||[];if(ro&&!rows.length)return'';
  return`<div class="card"><div class="sechd"><h3><i class="fa-solid ${CI[k]}"></i>${CHILD[k].t}</h3><div class="sp"></div>${ed?addBtn(k,id):''}</div>${rows.length?qTable(k,rows,id,ed):`<p class="none">${ed?'Chưa có. Bấm "Thêm" để bổ sung.':'Chưa có thông tin nào được cập nhật.'}</p>`}</div>`}
async function profileView(id){
  const d=await API.getUser(id),u=d.user,p=d.profile,mng=API.canManage(ME,u),self=ME.id===id,editC=k=>k==='positions'||k==='work'?mng:(mng||self);
  if(d.limited){VIEW={d}; // cấp trên: chỉ xem; thẻ đầu + các mục có dữ liệu (không file, không mô tả công tác)
    shell(`<div class="card phead lim">${avaBox(p.profilePictureFileId,p.fullName,'xl')}<div class="phead-info"><h2>${esc(p.fullName)}</h2><div class="phead-sub">${esc(d.position)||''}</div><div class="phead-tags"><span class="tag ${u.role}">${RL[u.role]}</span><span class="tag slate">Chỉ xem</span></div></div>${facts([['Ngày sinh',esc(p.dateOfBirth)||'—'],['Giới tính',esc(p.gender)||'—'],['Quốc tịch',esc(p.nationality)||'—'],['Thời gian công tác',tenure(d.work)]])}</div>${tlCard('positions',d.positions,id)}${tlCard('work',d.work,id)}${qualCard('degrees',d.degrees,id,false,true)}${qualCard('certificates',d.certificates,id,false,true)}`);tlInit();return}
  const tabs=[['profile','Hồ sơ'],['positions','Chức vụ'],['work','Quá trình công tác'],['quals','Bằng cấp & chứng chỉ'],['family','Gia phả']];if(!tabs.some(t=>t[0]===TAB))TAB='profile';
  let body,bare=false; // bare: nội dung tự có thẻ riêng
  const head=`<div class="card phead">${avaBox(p.profilePictureFileId,p.fullName||u.username,'xl')}<div class="phead-info"><h2>${esc(p.fullName||u.username)}</h2><div class="phead-sub">@${esc(u.username)}</div><div class="phead-tags"><span class="tag ${u.role}">${RL[u.role]}</span><span class="tag ${u.status}">${ST[u.status]}</span></div></div>${mng||self?`<button data-act="editp" data-id="${id}"><i class="fa-solid fa-pen"></i>Sửa hồ sơ</button>`:''}${facts(summary(d))}</div>`;
  if(TAB==='profile'){const g=ks=>kv(p,PROFILE_F.filter(f=>ks.includes(f.k)).map(f=>[f.k,f.l]));
    body=`<div class="pgrid"><div class="card"><h3><i class="fa-regular fa-id-card"></i>Thông tin cá nhân</h3>${g(['fullName','gender','nationality','dateOfBirth','citizenID'])}</div><div class="card"><h3><i class="fa-regular fa-address-book"></i>Liên hệ</h3>${g(['phone','email','address'])}</div></div>`;bare=true}
  else if(TAB==='family')body=famBody(d,id,editC('family'));
  else if(TAB==='quals'){bare=true;body=['degrees','certificates'].map(k=>qualCard(k,d[k],id,editC(k))).join('')}
  else body=tlBody(TAB,d[TAB],id,editC(TAB));
  VIEW={d};shell(`${head}<div class="tabs">${tabs.map(([k,l])=>`<a data-tab="${k}" data-id="${id}" class="${TAB===k?'on':''}">${l}</a>`).join('')}</div>${bare?body:`<div class="card">${body}</div>`}`);tlInit()}
let VIEW={};
const famCard=(r,id,canEdit)=>`<div class="fcard"><div class="fcard-top">${avaBox(r.linked?r.profilePictureFileId:'',r.fullName)}<div class="fcard-name"><b>${esc(r.fullName)}</b><div class="fcard-tags"><span class="tag">${esc(r.relation)}</span>${r.linked?'<span class="tag slate">Nhân sự</span>':''}</div></div>${famMenu(r,id,canEdit)}</div><div class="fcard-meta"><span><i class="fa-regular fa-calendar"></i>${esc(r.dateOfBirth)||'—'}</span><span><i class="fa-solid fa-venus-mars"></i>${esc(r.gender)||'—'}</span></div><button class="sm" data-act="viewf" data-rid="${r.id}">Xem chi tiết</button></div>`;
const famBody=(d,id,canEdit)=>!d.family.length?empty('fa-users','Chưa có người thân',canEdit?'Thêm người thân đầu tiên để hoàn thiện hồ sơ.':'Chưa có thông tin nào được cập nhật.',canEdit?`<button class="pri" data-act="addf" data-id="${id}"><i class="fa-solid fa-plus"></i>Thêm người thân đầu tiên</button>`:''):`${canEdit?`<div class="bar"><div class="sp"></div><button class="pri" data-act="addf" data-id="${id}">Thêm người thân</button></div>`:''}<div class="fam-grid">${d.family.map(r=>famCard(r,id,canEdit)).join('')}</div>`;
function famMenu(r,id,canEdit){const it=[];
  if(r.canOpen)it.push(`<button data-go="users/${r.linkedUserId}"><i class="fa-solid fa-id-card"></i>Xem hồ sơ</button>`);
  if(canEdit)it.push(`<button data-act="editf" data-id="${id}" data-rid="${r.id}"><i class="fa-solid fa-pen"></i>Sửa</button>`,'<hr>',`<button class="bad" data-act="delf" data-id="${id}" data-rid="${r.id}"><i class="fa-solid fa-trash"></i>Xóa</button>`);
  return it.length?`<details class="more"><summary class="btn-ico" title="Thao tác"><i class="fa-solid fa-ellipsis"></i></summary><div class="menu">${it.join('')}</div></details>`:''}
// Khối tìm nhân sự để điền sẵn khi thêm người thân
function famHook(ownerId){let linkId=null;const HIDE=()=>FAM_HIDE;return{
  top:`<div class="card" style="padding:10px"><p style="margin:0 0 8px;color:var(--mut)">Nếu chọn một nhân sự, hệ thống tự thêm bản ghi đối ứng vào gia phả của họ (ví dụ bạn chọn họ là Cha thì bên họ ghi bạn là Con).</p><label>Tìm nhân sự để điền sẵn (đúng họ tên đầy đủ hoặc số CCCD)<div class="bar" style="margin:3px 0 0"><input id="fq" placeholder="Nhập họ tên đầy đủ hoặc CCCD"><button type="button" id="fgo">Tìm</button></div></label><div id="fres"></div></div>`,
  init(d){const frm=d.querySelector('form'),res=d.querySelector('#fres'),set=(k,v,dis)=>{const el=frm.elements[k];if(!el)return;el.value=v||'';el.disabled=!!dis;el.placeholder=dis?'Ẩn (chỉ quản lý được xem)':''};
    const unpick=()=>{linkId=null;FAM_F.forEach(f=>{if(f.k!=='relation')set(f.k,'',false)});res.innerHTML=''};
    const search=async()=>{try{const L=await API.searchPeople(frm.elements.fq.value,ownerId);
      res.innerHTML=L.length?L.map((r,i)=>`<div class="bar" style="margin:6px 0 0"><span>${esc(r.fullName)}${r.dateOfBirth?' · '+esc(r.dateOfBirth):''}${r.citizenID?' · '+esc(r.citizenID):''}</span><div class="sp"></div><button type="button" class="sm" data-pick="${i}">Chọn</button></div>`).join(''):'<p style="color:var(--mut)">Không có nhân sự khớp. Bạn có thể tự điền tay bên dưới.</p>';
      res.onclick=e=>{const b=e.target.closest('[data-pick]');if(b){const r=L[+b.dataset.pick];linkId=r.userId;
        FAM_F.forEach(f=>{if(f.k!=='relation')set(f.k,r[f.k],r.restricted&&FAM_HIDE.includes(f.k))});
        res.innerHTML=`<p>Đã chọn: <b>${esc(r.fullName)}</b>. Sửa thông tin khác ngoài Mối quan hệ sẽ chuyển thành bản nhập tay. <button type="button" class="sm" data-unpick>Bỏ chọn</button></p>`;
        res.onclick=e=>{if(e.target.closest('[data-unpick]'))unpick()}}}}catch(x){res.innerHTML=`<div class="err">${esc(x.message)}</div>`}};
    d.querySelector('#fgo').onclick=search;frm.elements.fq.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();search()}}},
  collect(frm,data){data.linkId=linkId}}}

function userMenu(r,m,self,sa){const live=r.status!=='DELETED',it=[],b=(act,ic,l,x='',c='')=>`<button class="${c}" data-act="${act}" data-id="${r.id}"${x}><i class="fa-solid ${ic}"></i>${l}</button>`;
  if(m&&!self&&live){const lk=r.status==='LOCKED';it.push(b('lock',lk?'fa-lock-open':'fa-lock',lk?'Mở khóa':'Khóa tài khoản',` data-s="${lk?'ACTIVE':'LOCKED'}"`),b('reset','fa-key','Đặt lại mật khẩu'))}
  if(sa&&!self&&live)it.push(b('role','fa-user-shield','Đổi vai trò',` data-r="${r.role}"`));
  if(!sa&&r.role==='EMPLOYEE'&&live)it.push(b('promote','fa-arrow-up','Nâng lên QLNS'));
  if(m&&!self&&live)it.push('<hr>',b('del','fa-trash','Xóa tài khoản','','bad'));
  if(sa&&!live)it.push(b('restore','fa-rotate-left','Khôi phục'),'<hr>',b('hard','fa-trash','Xóa cứng','','bad'));
  return it.length?`<details class="more"><summary class="btn-ico" title="Thao tác"><i class="fa-solid fa-ellipsis"></i></summary><div class="menu">${it.join('')}</div></details>`:''}

const sortTh=(k,l)=>{const on=FILTER.sort===k,d=FILTER.dir==='desc';return`<th aria-sort="${on?(d?'descending':'ascending'):'none'}"><button type="button" class="thsort${on?' on':''}" data-act="sort" data-k="${k}" title="Sắp xếp theo ${l.toLowerCase()}">${l}<i class="fa-solid ${on?(d?'fa-sort-down':'fa-sort-up'):'fa-sort'}"></i></button></th>`};
async function usersView(){
  const res=await API.listUsers({...FILTER,fresh:FILTER.fresh}),rows=res.items,sa=ME.role==='SUPER_ADMIN';delete FILTER.fresh;
  shell(`<h2>Nhân sự</h2><div class="bar"><input id="q" placeholder="Tìm họ tên, tài khoản, email, SĐT, CCCD" value="${esc(FILTER.q)}"><select id="fr"><option value="">Mọi vai trò</option>${Object.entries(RL).map(([k,v])=>`<option value="${k}" ${FILTER.role===k?'selected':''}>${v}</option>`).join('')}</select><select id="fs"><option value="">Mọi trạng thái</option>${Object.entries(ST).map(([k,v])=>`<option value="${k}" ${FILTER.status===k?'selected':''}>${v}</option>`).join('')}</select><div class="sp"></div><button class="pri" data-act="newu">Thêm người dùng</button></div>
  <div class="card"><div class="tbl-wrap"><table><tr>${[['name','Nhân sự'],['role','Vai trò'],['status','Trạng thái'],['contact','Liên hệ']].map(([k,l])=>sortTh(k,l)).join('')}<th></th></tr>${rows.map(r=>{const m=API.canManage(ME,r),self=r.id===ME.id,lim=r.limited;return`<tr><td class="cell-head"><div class="usercell">${avaBox(r.profilePictureFileId,r.fullName||r.username)}<div><div class="cell-main">${esc(r.fullName)}${lim?' <span class="tag slate">Chỉ xem</span>':''}</div>${lim?'':`<div class="cell-sub">@${esc(r.username)}</div>`}</div></div></td><td data-l="Vai trò"><span class="tag ${r.role}">${RL[r.role]}</span></td><td data-l="Trạng thái">${lim?'—':`<span class="tag ${r.status}">${ST[r.status]}</span>`}</td><td data-l="Liên hệ">${lim?'—':`<div>${esc(r.phone)||'—'}</div><div class="cell-sub">${esc(r.email)}</div>`}</td><td class="acts"><button class="sm" data-go="users/${r.id}">Xem</button>${lim?'':userMenu(r,m,self,sa)}</td></tr>`}).join('')||'<tr><td colspan="5">Không có kết quả.</td></tr>'}</table></div>${pager(res,'users')}</div>`);FILTER.page=res.page;
  const re=()=>{FILTER={q:$('#q').value,role:$('#fr').value,status:$('#fs').value,page:1,sort:FILTER.sort,dir:FILTER.dir};usersView().then(()=>{const q=$('#q');q.focus();q.setSelectionRange(99,99)}).catch(x=>toast(x.message,'err'))};
  $('#q').oninput=()=>{clearTimeout(re.h);re.h=setTimeout(re,250)};$('#fr').onchange=re;$('#fs').onchange=re}
async function auditView(){
  const r=await API.audit(AF),mx=API.maxDate('fromDate');AF.page=r.page;
  shell(`<h2>Nhật ký thao tác</h2><div class="bar"><input id="aq" placeholder="Tìm trong mô tả" value="${esc(AF.q)}"><select id="aa"><option value="">Mọi hành động</option>${r.actions.map(a=>`<option ${AF.action===a?'selected':''}>${esc(a)}</option>`).join('')}</select><label>Từ <input id="af" type="date" ${mx?`max="${mx}"`:''} value="${esc(AF.from)}"></label><label>đến <input id="at" type="date" ${mx?`max="${mx}"`:''} value="${esc(AF.to)}"></label><button id="ar">Xóa lọc</button></div><div class="card"><div class="tbl-wrap"><table><tr><th>Thời gian</th><th>Hành động</th><th>Mô tả</th></tr>${r.items.map(a=>`<tr><td data-l="Thời gian">${dtc(a.createdAt)}</td><td data-l="Hành động"><span class="tag act ${actCls(a.action)}">${esc(a.action)}</span></td><td data-l="Mô tả">${esc(a.description)}</td></tr>`).join('')||'<tr><td colspan="3">Không có kết quả.</td></tr>'}</table></div>${pager(r,'audit')}</div>`);
  const re=fq=>{const n={q:$('#aq').value,action:$('#aa').value,from:$('#af').value,to:$('#at').value};
    if(n.from&&n.to&&n.from>n.to)return toast('Từ ngày phải trước hoặc bằng Đến ngày','warn');
    AF={...n,page:1};auditView().then(()=>{if(fq){const q=$('#aq');q.focus();q.setSelectionRange(99,99)}}).catch(x=>toast(x.message,'err'))};
  $('#aq').oninput=()=>{clearTimeout(re.h);re.h=setTimeout(()=>re(true),250)};['#aa','#af','#at'].forEach(k=>$(k).onchange=()=>re());
  $('#ar').onclick=()=>{AF={q:'',action:'',from:'',to:'',page:1};route()}}

const reload=()=>route();
const A={
  async dir(){
    const h=await Store.curDir(),d=document.createElement('dialog');
    d.innerHTML=`<h3>Thư mục uploads</h3><p>Hiện tại: <b>${h?esc(h.name):'chưa chọn'}</b></p><p style="color:var(--mut)">Chọn đúng thư mục <code>uploads/</code> của dự án. Nếu đổi sang thư mục khác, file đã lưu ở thư mục cũ sẽ không đọc được cho tới khi bạn chép sang thư mục mới.</p><div class="err"></div><div class="row"><button type="button" data-x>Đóng</button><button class="pri" data-pick>${h?'Chọn thư mục khác':'Chọn thư mục'}</button></div>`;
    document.body.append(d);d.showModal();d.onclose=()=>d.remove();d.querySelector('[data-x]').onclick=()=>d.close();
    d.querySelector('[data-pick]').onclick=async()=>{try{const n=await Store.pickDir();toast(n.name==='uploads'?'Đã chọn thư mục uploads':'Đã chọn "'+n.name+'" (lưu ý: thường nên là thư mục tên uploads)');d.close()}catch(x){if(x.name!=='AbortError')d.querySelector('.err').textContent=x.message}}},
  pg(e){(e.w==='users'?FILTER:AF).page=+e.p;route()},
  tlgo(e){const el=document.getElementById(e.t);if(el)el.scrollBy({left:+e.d*el.clientWidth*.8,behavior:'smooth'})},
  sort(e){if(FILTER.sort===e.k)FILTER.dir=FILTER.dir==='asc'?'desc':'asc';else{FILTER.sort=e.k;FILTER.dir='asc'}FILTER.page=1;FILTER.fresh=true;route()},
  logout(){API.logout();ME=null;home();boot()},
  menu(){document.body.classList.toggle('nav-open')},
  pw(){form('Đổi mật khẩu',[{k:'o',l:'Mật khẩu hiện tại',t:'password',r:1},{k:'n',l:'Mật khẩu mới (≥ 8 ký tự)',t:'password',r:1}],{},async d=>{await API.changePassword(d.o,d.n);toast('Đã đổi mật khẩu');ME=await API.me();route()},'Đổi mật khẩu')},
  newu(){const f=[{k:'username',l:'Tên đăng nhập',r:1,sec:'Tài khoản'},{k:'password',l:'Mật khẩu tạm (≥ 8 ký tự)',t:'password',r:1},{k:'role',l:'Vai trò',t:'select',o:Object.entries(RL).filter(([k])=>ME.role==='SUPER_ADMIN'||k!=='SUPER_ADMIN')},...PROFILE_F.map((x,i)=>i?x:{...x,sec:'Thông tin cá nhân'}),{k:'avatar',l:'Chọn ảnh (JPG/PNG/WebP ≤2MB)',t:'file',a:IMG,r:1,full:1,sec:'Ảnh đại diện'}];;
    form('Thêm người dùng',f,{gender:'Nam',nationality:'Việt Nam'},async d=>{const{avatar,kids,...x}=d;await API.createUser(x,avatar,kids);toast('Đã tạo. Người dùng phải đổi mật khẩu khi đăng nhập lần đầu.');route()},'Tạo',kidsHook())},
  editp(e){const mng=API.canManage(ME,VIEW.d.user);form('Sửa hồ sơ',[...(mng?PROFILE_F:CONTACT_F),{k:'avatar',l:'Ảnh đại diện mới (tuỳ chọn)',t:'file',a:IMG}],VIEW.d.profile,async d=>{const{avatar,...x}=d;await API.saveProfile(e.id,x,avatar);route()})},
  add(e){const c=CHILD[e.kind];form('Thêm '+c.t.toLowerCase(),c.f,{isCurrent:'true'},async d=>{const{file,...x}=d;await API.addChild(e.id,e.kind,x,file);route()},'Thêm')},
  view(e){const r=VIEW.d[e.kind].find(x=>x.id===e.id),c=CHILD[e.kind],d=document.createElement('dialog');
    d.innerHTML=`<h3>Chi tiết ${c.t.toLowerCase()}</h3>${kv(r,c.f.filter(f=>f.t!=='file').map(f=>[f.k,f.l]))}<div class="row"><button>Đóng</button></div>`;document.body.append(d);d.showModal();d.onclose=()=>d.remove();d.querySelector('button').onclick=()=>d.close()},
  editc(e){const c=CHILD[e.kind],r=VIEW.d[e.kind].find(x=>x.id===e.rid);
    form('Sửa '+c.t.toLowerCase(),c.f.map(f=>f.t==='file'?{...f,l:f.l.replace(/^File/,'File mới, để trống để giữ file cũ')}:f),r,async d=>{const{file,...x}=d;await API.updateChild(e.id,e.kind,e.rid,x,file);route()})},
  addf(e){form('Thêm người thân',FAM_F,{},async d=>{const{linkId,...x}=d;await API.addFamily(e.id,x,linkId);route()},'Thêm',famHook(e.id))},
  editf(e){const r=VIEW.d.family.find(x=>x.id===e.rid),hide=r.linked&&r.restricted;
    form('Sửa người thân',FAM_F.filter(f=>!(hide&&FAM_HIDE.includes(f.k))),r,async d=>{await API.updateFamily(e.id,e.rid,d);route()},'Lưu',r.linked?{top:'<p style="color:var(--mut)">Người thân là nhân sự trong hệ thống. Sửa thông tin khác ngoài "Mối quan hệ" sẽ chuyển thành bản nhập tay (không còn đồng bộ với hồ sơ nhân sự).</p>',init(){},collect(){}}:undefined)},
  viewf(e){const r=VIEW.d.family.find(x=>x.id===e.rid),d=document.createElement('dialog');
    d.innerHTML=`<h3>Chi tiết người thân</h3><div class="kv"><span>Mối quan hệ</span><span>${esc(r.relation)}</span>${FAM_F.filter(f=>f.k!=='relation').map(f=>`<span>${f.l}</span><span>${r.linked&&r.restricted&&FAM_HIDE.includes(f.k)?'<i style="color:var(--mut)">Ẩn (chỉ quản lý được xem)</i>':esc(r[f.k])||'—'}</span>`).join('')}${r.linked&&r.position!==undefined?`<span>Chức vụ</span><span>${esc(r.position)||'—'}</span>`:''}</div>${r.linked?`<p style="color:var(--mut)">Thông tin lấy từ hồ sơ nhân sự và tự cập nhật khi hồ sơ thay đổi.</p>`:''}<div class="row"><button>Đóng</button></div>`;
    document.body.append(d);d.showModal();d.onclose=()=>d.remove();d.querySelector('button').onclick=()=>d.close()},
  async delf(e){if(await ask('Xóa người thân','Xóa người thân này?',{ok:'Xóa'})){await API.delFamily(e.id,e.rid);route()}},
  async delc(e){if(await ask('Xóa bản ghi','Xóa bản ghi này?',{ok:'Xóa'})){await API.delChild(e.id,e.kind,e.rid);route()}},
  async open(e){window.open(await API.fileUrl(e.id),'_blank')},
  async lock(e){await API.setStatus(e.id,e.s);route()},
  reset(e){form('Đặt lại mật khẩu',[{k:'pw',l:'Mật khẩu mới (≥ 8 ký tự)',t:'text',r:1}],{},async d=>{await API.resetPassword(e.id,d.pw);toast('Đã đặt lại mật khẩu. Người dùng phải đổi khi đăng nhập lần tới.')},'Đặt lại')},
  async promote(e){if(await ask('Nâng lên Quản lý nhân sự','Nâng người này lên Quản lý nhân sự? Sau đó bạn không thể hạ lại hay xóa họ.',{ok:'Nâng lên'})){await API.setRole(e.id,'HR_MANAGER');route()}},
  async del(e){if(await ask('Xóa tài khoản','Xóa mềm tài khoản này?',{ok:'Xóa'})){await API.remove(e.id,false);route()}},
  async hard(e){if(await ask('Xóa cứng tài khoản','XÓA CỨNG sẽ xóa vĩnh viễn hồ sơ và file. Tiếp tục?',{ok:'Xóa vĩnh viễn',danger:true})){await API.remove(e.id,true);route()}},
  async restore(e){await API.restore(e.id);route()},
  role(e){form('Đổi vai trò',[{k:'role',l:'Vai trò',t:'select',o:Object.entries(RL)}],{role:e.r},async d=>{await API.setRole(e.id,d.role);route()})}};

document.addEventListener('keydown',e=>{const i=e.target.closest&&e.target.closest('[data-pgin]');if(!i||e.key!=='Enter')return;
  const n=parseInt(i.value,10);if(!isNaN(n))(i.dataset.pgin==='users'?FILTER:AF).page=n; // API tự kẹp về trang cuối nếu vượt quá
  route()});
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]'),t=e.target.closest('[data-tab]'),a=e.target.closest('[data-act]');
  if(e.target.closest('nav a'))document.body.classList.remove('nav-open');
  if(g){location.hash='/'+g.dataset.go;return}
  if(t){TAB=t.dataset.tab;route();return}
  if(a&&A[a.dataset.act])run(()=>A[a.dataset.act]({...a.dataset}))});
document.addEventListener('click',e=>{const s=e.target.closest('details.more>summary');
  document.querySelectorAll('details.more[open]').forEach(d=>{if(!d.contains(e.target)||e.target.closest('[data-act]'))d.open=false});
  if(s){const r=s.getBoundingClientRect(),m=s.nextElementSibling,w=Math.min(220,innerWidth-16);
    m.style.right='auto';m.style.left=Math.max(8,Math.min(r.right-w,innerWidth-w-8))+'px';m.style.top=r.bottom+4+'px';
    requestAnimationFrame(()=>{const h=m.offsetHeight;if(r.bottom+4+h>innerHeight-8&&r.top-4-h>8)m.style.top=r.top-4-h+'px'})}});
window.addEventListener('scroll',()=>document.querySelectorAll('details.more[open]').forEach(d=>d.open=false),true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('nav-open')});
async function route(){
  if(!ME)return loginView();if(ME.mustChangePassword)return forceChange();
  const[,page,id]=location.hash.split('/'),sk=setTimeout(()=>{const v=$('.view');if(v)v.innerHTML=SKEL},150);
  try{await run(async()=>{if(page==='users'&&id)await profileView(id);else if(page==='users')await usersView();else if(page==='audit')await auditView();else await profileView(ME.id)})}finally{clearTimeout(sk)}}
window.addEventListener('hashchange',()=>{TAB='profile';route()});
async function boot(){
  try{await API.seed();ME=await API.me();route()}
  catch(x){$('#app').innerHTML=`<div class="card login"><h2>Không kết nối được dữ liệu</h2><p>${esc(x.message)}</p><button class="pri" onclick="location.reload()">Thử lại</button></div>`}}
boot();
