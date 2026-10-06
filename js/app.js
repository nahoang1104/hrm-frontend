// UI + router + hành động (event delegation: data-go / data-tab / data-act). Chỉ gọi API.*
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RL={SUPER_ADMIN:'Quản trị tối cao',HR_MANAGER:'Quản lý nhân sự',EMPLOYEE:'Nhân viên'},ST={ACTIVE:'Hoạt động',LOCKED:'Đã khóa',DELETED:'Đã xóa'};
const GENDER=[['Nam','Nam'],['Nữ','Nữ'],['Khác','Khác']],IMG='image/jpeg,image/png,image/webp',DOC=IMG+',application/pdf';
const CHILD={
  positions:{t:'Chức vụ',f:[{k:'position',l:'Chức vụ',r:1},{k:'fromDate',l:'Từ ngày',t:'date',r:1},{k:'isCurrent',l:'Đang giữ',t:'select',o:[['true','Có'],['false','Không']]}],c:['position','fromDate','isCurrent']},
  work:{t:'Quá trình công tác',f:[{k:'company',l:'Công ty',r:1},{k:'department',l:'Phòng ban'},{k:'position',l:'Chức vụ',r:1},{k:'fromDate',l:'Từ ngày',t:'date',r:1},{k:'toDate',l:'Đến ngày',t:'date'},{k:'description',l:'Mô tả',t:'textarea'}],c:['company','department','position','fromDate','toDate']},
  degrees:{t:'Bằng cấp',f:[{k:'name',l:'Tên bằng',r:1},{k:'major',l:'Chuyên ngành'},{k:'school',l:'Trường'},{k:'issuedDate',l:'Ngày cấp',t:'date'},{k:'file',l:'File (JPG/PNG/WebP/PDF ≤5MB)',t:'file',a:DOC}],c:['name','major','school','issuedDate']},
  certificates:{t:'Chứng chỉ',f:[{k:'name',l:'Tên chứng chỉ',r:1},{k:'issuer',l:'Nơi cấp'},{k:'certificateNumber',l:'Số hiệu'},{k:'issuedDate',l:'Ngày cấp',t:'date'},{k:'expiredDate',l:'Hết hạn',t:'date'},{k:'file',l:'File (JPG/PNG/WebP/PDF ≤5MB)',t:'file',a:DOC}],c:['name','issuer','certificateNumber','issuedDate','expiredDate']}};
const PROFILE_F=[{k:'fullName',l:'Họ tên',r:1},{k:'gender',l:'Giới tính',t:'select',o:GENDER},{k:'nationality',l:'Quốc tịch',r:1},{k:'dateOfBirth',l:'Ngày sinh',t:'date',r:1},{k:'citizenID',l:'CCCD',r:1,n:1},{k:'phone',l:'Điện thoại',r:1,n:1},{k:'email',l:'Email',t:'email',r:1},{k:'address',l:'Địa chỉ'}];
const CONTACT_F=PROFILE_F.filter(f=>['phone','email','address'].includes(f.k));
let ME=null,TAB='profile',FILTER={q:'',role:'',status:'',page:1},AF={q:'',action:'',from:'',to:'',page:1};
const pager=(r,w)=>`<div class="bar"><span style="color:var(--mut)">Hiển thị dòng ${r.items.length?(r.page-1)*r.pageSize+1:0} - ${(r.page-1)*r.pageSize+r.items.length} · Trang <input class="pgin" type="number" min="1" value="${r.page}" data-pgin="${w}" title="Nhập số trang rồi nhấn Enter"></span><div class="sp"></div>${[['« Đầu',1],['Trước',r.page-1],['Sau',r.page+1],['Cuối »',r.pages]].map(([l,n],i)=>`<button class="sm" data-act="pg" data-w="${w}" data-p="${n}" ${(i<2?r.page<=1:r.page>=r.pages)?'disabled':''}>${l}</button>`).join('')}</div>`;

function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',3500)}
const fld=(f,vals,pre='')=>`<label>${esc(f.l)}${f.r?' *':''}${f.t==='select'?`<select name="${pre}${f.k}">${f.o.map(([v,t])=>`<option value="${esc(v)}" ${String(vals[f.k])===v?'selected':''}>${esc(t)}</option>`).join('')}</select>`:f.t==='textarea'?`<textarea name="${pre}${f.k}">${esc(vals[f.k])}</textarea>`:`<input name="${pre}${f.k}" type="${f.t||'text'}" ${f.r?'required':''} ${f.a?`accept="${f.a}"`:''} ${f.n?'inputmode="numeric" pattern="[0-9]+" title="Chỉ nhập chữ số"':''} ${f.t==='date'&&API.maxDate(f.k)?`max="${API.maxDate(f.k)}"`:''} ${f.t==='file'?'':`value="${esc(vals[f.k])}"`}>`}</label>`;
function form(title,fields,vals,submit,ok='Lưu',hook){
  const d=document.createElement('dialog');
  d.innerHTML=`<form><h3>${esc(title)}</h3>${fields.map(f=>fld(f,vals)).join('')}${hook?hook.html:''}<div class="err"></div><div class="row"><button type="button" data-x>Hủy</button><button class="pri">${ok}</button></div></form>`;
  document.body.append(d);d.showModal();d.querySelector('[data-x]').onclick=()=>d.close();d.onclose=()=>d.remove();if(hook)hook.init(d);
  d.querySelector('form').onsubmit=async e=>{e.preventDefault();const data={};for(const f of fields){const el=e.target.elements[f.k];data[f.k]=f.t==='file'?el.files[0]:el.value}
    if(hook)hook.collect(e.target,data);
    try{await submit(data);d.close()}catch(x){d.querySelector('.err').textContent=x.message}}}
// Khối "thêm chức vụ / công tác / bằng cấp / chứng chỉ" trong form tạo người dùng
function kidsHook(){let n=0;return{
  html:`<div class="kids"><div class="bar">${Object.entries(CHILD).map(([k,c])=>`<button type="button" class="sm" data-addkid="${k}">+ ${c.t}</button>`).join('')}</div><div class="kidlist"></div></div>`,
  init(d){d.querySelector('.kids').onclick=e=>{const b=e.target.closest('[data-addkid]');
    if(e.target.closest('[data-rmkid]'))e.target.closest('fieldset').remove();
    if(b){const k=b.dataset.addkid,c=CHILD[k],fs=document.createElement('fieldset'),i=n++;fs.dataset.kind=k;fs.dataset.i=i;
      fs.innerHTML=`<legend>${c.t}</legend>${c.f.map(f=>fld(f,{isCurrent:'true'},`k${i}_`)).join('')}<button type="button" class="sm bad" data-rmkid>Bỏ mục này</button>`;d.querySelector('.kidlist').append(fs)}}},
  collect(frm,data){data.kids={};frm.querySelectorAll('fieldset[data-kind]').forEach(fs=>{const k=fs.dataset.kind,row={data:{}};
    CHILD[k].f.forEach(f=>{const el=fs.querySelector(`[name="k${fs.dataset.i}_${f.k}"]`);if(f.t==='file')row.file=el.files[0];else row.data[f.k]=el.value});
    (data.kids[k]=data.kids[k]||[]).push(row)})}}}
const run=async f=>{try{await f()}catch(x){toast(x.message)}};

function shell(html){
  const nav=[['profile','Hồ sơ cá nhân',1],['users','Nhân sự',ME.role!=='EMPLOYEE'],['audit','Nhật ký',ME.role==='SUPER_ADMIN']].filter(n=>n[2]);
  const cur=location.hash.split('/')[1]||'profile';
  $('#app').innerHTML=`<div class="shell"><nav><b>HRM</b>${nav.map(([k,l])=>`<a data-go="${k}" class="${cur===k?'on':''}">${l}</a>`).join('')}<div class="sp"></div><a data-act="dir">Thư mục uploads</a><a data-act="pw">Đổi mật khẩu</a><a data-act="logout">Đăng xuất (${esc(ME.username)})</a></nav><main>${html}</main></div>`;
  document.querySelectorAll('[data-fid]').forEach(async i=>{try{i.src=await API.fileUrl(i.dataset.fid)}catch{}})}

function loginView(){$('#app').innerHTML=`<div class="card login"><h2>Đăng nhập</h2><form id="lf"><label>Tên đăng nhập<input name="u" required autofocus></label><label>Mật khẩu<input name="p" type="password" required></label><div class="err" id="le"></div><button class="pri" style="width:100%">Đăng nhập</button></form></div>`;
  $('#lf').onsubmit=async e=>{e.preventDefault();try{await API.login(e.target.u.value,e.target.p.value);boot()}catch(x){$('#le').textContent=x.message}}}
function forceChange(){$('#app').innerHTML='<div class="card login"><h2>Đổi mật khẩu</h2><p>Bạn cần đặt mật khẩu mới trước khi tiếp tục.</p><button class="pri" data-act="pw">Đặt mật khẩu mới</button></div>';A.pw()}

const kv=(p,keys)=>`<div class="kv">${keys.map(([k,l])=>`<span>${l}</span><span>${esc(p[k])||'—'}</span>`).join('')}</div>`;
async function profileView(id){
  const d=await API.getUser(id),u=d.user,p=d.profile,mng=API.canManage(ME,u),self=ME.id===id,editC=k=>k==='positions'||k==='work'?mng:(mng||self);
  const tabs=[['profile','Hồ sơ'],...Object.entries(CHILD).map(([k,c])=>[k,c.t])];if(!tabs.some(t=>t[0]===TAB))TAB='profile';
  let body;
  if(TAB==='profile')body=`<img class="ava" data-fid="${esc(p.profilePictureFileId)}" alt="">${kv(p,PROFILE_F.map(f=>[f.k,f.l]))}<div class="kv"><span>Tên đăng nhập</span><span>${esc(u.username)}</span><span>Vai trò</span><span>${RL[u.role]}</span><span>Trạng thái</span><span><span class="tag ${u.status}">${ST[u.status]}</span></span></div><div class="row" style="justify-content:flex-start">${mng||self?`<button data-act="editp" data-id="${id}">Sửa hồ sơ</button>`:''}</div>`;
  else{const c=CHILD[TAB],rows=d[TAB];body=`${editC(TAB)?`<div class="bar"><div class="sp"></div><button class="pri" data-act="add" data-id="${id}" data-kind="${TAB}">Thêm ${c.t.toLowerCase()}</button></div>`:''}<table><tr>${c.f.filter(f=>f.t!=='file'&&c.c.includes(f.k)).map(f=>`<th>${f.l}</th>`).join('')}<th></th></tr>${rows.map(r=>`<tr>${c.f.filter(f=>f.t!=='file'&&c.c.includes(f.k)).map(f=>`<td>${esc(f.k==='isCurrent'?(String(r[f.k])==='true'?'Có':'Không'):r[f.k])}</td>`).join('')}<td>${r.fileId?`<button class="sm" data-act="open" data-id="${r.fileId}">Xem file</button> `:''}${TAB==='work'?`<button class="sm" data-act="view" data-id="${r.id}" data-kind="${TAB}" data-uid="${id}">Chi tiết</button> `:''}${editC(TAB)?`<button class="sm" data-act="editc" data-id="${id}" data-kind="${TAB}" data-rid="${r.id}">Sửa</button> <button class="sm bad" data-act="delc" data-id="${id}" data-kind="${TAB}" data-rid="${r.id}">Xóa</button>`:''}</td></tr>`).join('')||`<tr><td colspan="9">Chưa có dữ liệu.</td></tr>`}</table>`}
  VIEW={d};shell(`<h2>${esc(p.fullName||u.username)}</h2><div class="tabs">${tabs.map(([k,l])=>`<a data-tab="${k}" data-id="${id}" class="${TAB===k?'on':''}">${l}</a>`).join('')}</div><div class="card">${body}</div>`)}
let VIEW={};

async function usersView(){
  const res=await API.listUsers(FILTER),rows=res.items,sa=ME.role==='SUPER_ADMIN';
  shell(`<h2>Nhân sự</h2><div class="bar"><input id="q" placeholder="Tìm họ tên, tài khoản, email, SĐT, CCCD" value="${esc(FILTER.q)}"><select id="fr"><option value="">Mọi vai trò</option>${Object.entries(RL).map(([k,v])=>`<option value="${k}" ${FILTER.role===k?'selected':''}>${v}</option>`).join('')}</select><select id="fs"><option value="">Mọi trạng thái</option>${Object.entries(ST).map(([k,v])=>`<option value="${k}" ${FILTER.status===k?'selected':''}>${v}</option>`).join('')}</select><div class="sp"></div><button class="pri" data-act="newu">Thêm người dùng</button></div>
  <div class="card"><table><tr><th>Họ tên</th><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Liên hệ</th><th></th></tr>${rows.map(r=>{const m=API.canManage(ME,r),self=r.id===ME.id;return`<tr><td>${esc(r.fullName)}</td><td>${esc(r.username)}</td><td>${RL[r.role]}</td><td><span class="tag ${r.status}">${ST[r.status]}</span></td><td>${esc(r.phone)}<br>${esc(r.email)}</td><td><button class="sm" data-go="users/${r.id}">Xem</button>${m&&!self&&r.status!=='DELETED'?` <button class="sm" data-act="lock" data-id="${r.id}" data-s="${r.status==='LOCKED'?'ACTIVE':'LOCKED'}">${r.status==='LOCKED'?'Mở khóa':'Khóa'}</button> <button class="sm" data-act="reset" data-id="${r.id}">Reset MK</button> <button class="sm bad" data-act="del" data-id="${r.id}">Xóa</button>`:''}${sa&&!self&&r.status!=='DELETED'?` <button class="sm" data-act="role" data-id="${r.id}" data-r="${r.role}">Đổi role</button>`:''}${!sa&&r.role==='EMPLOYEE'&&r.status!=='DELETED'?` <button class="sm" data-act="promote" data-id="${r.id}">Nâng lên QLNS</button>`:''}${sa&&r.status==='DELETED'?` <button class="sm" data-act="restore" data-id="${r.id}">Khôi phục</button> <button class="sm bad" data-act="hard" data-id="${r.id}">Xóa cứng</button>`:''}</td></tr>`}).join('')||'<tr><td colspan="6">Không có kết quả.</td></tr>'}</table>${pager(res,'users')}</div>`);FILTER.page=res.page;
  const re=()=>{FILTER={q:$('#q').value,role:$('#fr').value,status:$('#fs').value,page:1};usersView().then(()=>{const q=$('#q');q.focus();q.setSelectionRange(99,99)}).catch(x=>toast(x.message))};
  $('#q').oninput=()=>{clearTimeout(re.h);re.h=setTimeout(re,250)};$('#fr').onchange=re;$('#fs').onchange=re}
async function auditView(){
  const r=await API.audit(AF),mx=API.maxDate('fromDate');AF.page=r.page;
  shell(`<h2>Nhật ký thao tác</h2><div class="bar"><input id="aq" placeholder="Tìm trong mô tả" value="${esc(AF.q)}"><select id="aa"><option value="">Mọi hành động</option>${r.actions.map(a=>`<option ${AF.action===a?'selected':''}>${esc(a)}</option>`).join('')}</select><label>Từ <input id="af" type="date" ${mx?`max="${mx}"`:''} value="${esc(AF.from)}"></label><label>đến <input id="at" type="date" ${mx?`max="${mx}"`:''} value="${esc(AF.to)}"></label><button id="ar">Xóa lọc</button></div><div class="card"><table><tr><th>Thời gian</th><th>Hành động</th><th>Mô tả</th></tr>${r.items.map(a=>`<tr><td>${new Date(a.createdAt).toLocaleString('vi-VN')}</td><td>${esc(a.action)}</td><td>${esc(a.description)}</td></tr>`).join('')||'<tr><td colspan="3">Không có kết quả.</td></tr>'}</table>${pager(r,'audit')}</div>`);
  const re=fq=>{const n={q:$('#aq').value,action:$('#aa').value,from:$('#af').value,to:$('#at').value};
    if(n.from&&n.to&&n.from>n.to)return toast('Từ ngày phải trước hoặc bằng Đến ngày');
    AF={...n,page:1};auditView().then(()=>{if(fq){const q=$('#aq');q.focus();q.setSelectionRange(99,99)}}).catch(x=>toast(x.message))};
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
  logout(){API.logout();ME=null;boot()},
  pw(){form('Đổi mật khẩu',[{k:'o',l:'Mật khẩu hiện tại',t:'password',r:1},{k:'n',l:'Mật khẩu mới (≥ 8 ký tự)',t:'password',r:1}],{},async d=>{await API.changePassword(d.o,d.n);toast('Đã đổi mật khẩu');ME=await API.me();route()},'Đổi mật khẩu')},
  newu(){const f=[{k:'username',l:'Tên đăng nhập',r:1},{k:'password',l:'Mật khẩu tạm (≥ 8 ký tự)',t:'password',r:1},{k:'role',l:'Vai trò',t:'select',o:Object.entries(RL).filter(([k])=>ME.role==='SUPER_ADMIN'||k!=='SUPER_ADMIN')},...PROFILE_F,{k:'avatar',l:'Ảnh đại diện (JPG/PNG/WebP ≤2MB)',t:'file',a:IMG,r:1}];
    form('Thêm người dùng',f,{gender:'Nam',nationality:'Việt Nam'},async d=>{const{avatar,kids,...x}=d;await API.createUser(x,avatar,kids);toast('Đã tạo. Người dùng phải đổi mật khẩu khi đăng nhập lần đầu.');route()},'Tạo',kidsHook())},
  editp(e){const mng=API.canManage(ME,VIEW.d.user);form('Sửa hồ sơ',[...(mng?PROFILE_F:CONTACT_F),{k:'avatar',l:'Ảnh đại diện mới (tuỳ chọn)',t:'file',a:IMG}],VIEW.d.profile,async d=>{const{avatar,...x}=d;await API.saveProfile(e.id,x,avatar);route()})},
  add(e){const c=CHILD[e.kind];form('Thêm '+c.t.toLowerCase(),c.f,{isCurrent:'true'},async d=>{const{file,...x}=d;await API.addChild(e.id,e.kind,x,file);route()},'Thêm')},
  view(e){const r=VIEW.d[e.kind].find(x=>x.id===e.id),c=CHILD[e.kind],d=document.createElement('dialog');
    d.innerHTML=`<h3>Chi tiết ${c.t.toLowerCase()}</h3>${kv(r,c.f.filter(f=>f.t!=='file').map(f=>[f.k,f.l]))}<div class="row"><button>Đóng</button></div>`;document.body.append(d);d.showModal();d.onclose=()=>d.remove();d.querySelector('button').onclick=()=>d.close()},
  editc(e){const c=CHILD[e.kind],r=VIEW.d[e.kind].find(x=>x.id===e.rid);
    form('Sửa '+c.t.toLowerCase(),c.f.map(f=>f.t==='file'?{...f,l:f.l.replace(/^File/,'File mới, để trống để giữ file cũ')}:f),r,async d=>{const{file,...x}=d;await API.updateChild(e.id,e.kind,e.rid,x,file);route()})},
  async delc(e){if(confirm('Xóa bản ghi này?')){await API.delChild(e.id,e.kind,e.rid);route()}},
  async open(e){window.open(await API.fileUrl(e.id),'_blank')},
  async lock(e){await API.setStatus(e.id,e.s);route()},
  reset(e){form('Đặt lại mật khẩu',[{k:'pw',l:'Mật khẩu mới (≥ 8 ký tự)',t:'text',r:1}],{},async d=>{await API.resetPassword(e.id,d.pw);toast('Đã đặt lại mật khẩu. Người dùng phải đổi khi đăng nhập lần tới.')},'Đặt lại')},
  async promote(e){if(confirm('Nâng người này lên Quản lý nhân sự? Sau đó bạn không thể hạ lại hay xóa họ.')){await API.setRole(e.id,'HR_MANAGER');route()}},
  async del(e){if(confirm('Xóa mềm tài khoản này?')){await API.remove(e.id,false);route()}},
  async hard(e){if(confirm('XÓA CỨNG sẽ xóa vĩnh viễn hồ sơ và file. Tiếp tục?')){await API.remove(e.id,true);route()}},
  async restore(e){await API.restore(e.id);route()},
  role(e){form('Đổi vai trò',[{k:'role',l:'Vai trò',t:'select',o:Object.entries(RL)}],{role:e.r},async d=>{await API.setRole(e.id,d.role);route()})}};

document.addEventListener('keydown',e=>{const i=e.target.closest&&e.target.closest('[data-pgin]');if(!i||e.key!=='Enter')return;
  const n=parseInt(i.value,10);if(!isNaN(n))(i.dataset.pgin==='users'?FILTER:AF).page=n; // API tự kẹp về trang cuối nếu vượt quá
  route()});
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]'),t=e.target.closest('[data-tab]'),a=e.target.closest('[data-act]');
  if(g){location.hash='/'+g.dataset.go;return}
  if(t){TAB=t.dataset.tab;route();return}
  if(a&&A[a.dataset.act])run(()=>A[a.dataset.act]({...a.dataset}))});
async function route(){
  if(!ME)return loginView();if(ME.mustChangePassword)return forceChange();
  const[,page,id]=location.hash.split('/');
  await run(async()=>{if(page==='users'&&id)await profileView(id);else if(page==='users')await usersView();else if(page==='audit')await auditView();else await profileView(ME.id)})}
window.addEventListener('hashchange',()=>{TAB='profile';route()});
async function boot(){await API.seed();ME=await API.me();route()}
boot();
