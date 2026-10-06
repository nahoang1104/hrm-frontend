// Nghiệp vụ + kiểm quyền. Lưu ý: chạy trong trình duyệt nên quyền chỉ là rào cản UI, không phải bảo mật thật.
const API=(()=>{
  const S=Store,C=window.HRM_CONFIG||{};
  const T={u:'users',p:'profiles',f:'files',a:'audit_logs',fam:'family_members'};
  const KIND={positions:'current_positions',work:'work_history',degrees:'degrees',certificates:'certificates'};
  const REQ={positions:['position','fromDate'],work:['company','position','fromDate'],degrees:['name'],certificates:['name']};
  const E=m=>{throw new Error(m)},uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,8),now=()=>new Date().toISOString();
  const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))),unb=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  async function hash(pw,salt=crypto.getRandomValues(new Uint8Array(16))){
    const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
    return b64(salt)+'$'+b64(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:150000},k,256))}
  const check=async(pw,s)=>{try{return(await hash(pw,unb(String(s).split('$')[0])))===s}catch(_){return false}}; // hash lạ (vd. Argon2 từ bản cũ) => sai mật khẩu, không văng lỗi
  const pub=({passwordHash,...u})=>u;
  const log=(userId,action,targetUserId,description)=>S.append(T.a,{id:uid('al_'),userId,action,targetUserId,description,createdAt:now()});
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d');

  async function seed(){
    if((await S.list(T.u)).length)return;
    const id=uid('u_'),t=now();
    await S.sync(T.u,[{id,username:C.seedUser||'admin',passwordHash:await hash(C.seedPassword||'Admin@12345'),role:'SUPER_ADMIN',status:'ACTIVE',mustChangePassword:true,createdAt:t,updatedAt:t,lastLoginAt:null}]);
    await S.sync(T.p,[{id:'pf_'+id,userId:id,fullName:'Quản trị hệ thống'}])}
  async function me(){const id=sessionStorage.uid;if(!id)return null;const u=(await S.list(T.u)).find(x=>x.id===id);return u&&u.status==='ACTIVE'?u:null}
  async function need(){const m=await me();if(!m)E('Chưa đăng nhập');if(m.mustChangePassword)E('Cần đổi mật khẩu trước');return m}
  const canManage=(m,t)=>m.role==='SUPER_ADMIN'||(m.role==='HR_MANAGER'&&t.role==='EMPLOYEE');
  const canView=(m,t)=>m.id===t.id||m.role==='SUPER_ADMIN'||(m.role==='HR_MANAGER'&&t.role!=='SUPER_ADMIN'&&t.status!=='DELETED');
  async function target(id,mode){ // mode: view | manage | self (quản lý hoặc chính mình)
    const m=await need(),t=(await S.list(T.u)).find(x=>x.id===id);if(!t)E('Không tìm thấy người dùng');
    const ok=mode==='view'?canView(m,t):mode==='manage'?canManage(m,t):(canManage(m,t)||m.id===t.id);
    if(!ok)E('Bạn không có quyền thực hiện thao tác này');return{m,t}}
  async function guardLastSA(t,what){
    if(t.role==='SUPER_ADMIN'&&t.status==='ACTIVE'&&(await S.list(T.u)).filter(u=>u.role==='SUPER_ADMIN'&&u.status==='ACTIVE').length<=1)E('Không thể '+what+' SUPER_ADMIN cuối cùng')}
  const notSelf=(m,t,w)=>{if(m.id===t.id)E('Không thể tự '+w+' chính mình')};

  async function checkFile(file,type){
    const img=['image/jpeg','image/png','image/webp'],lim=(type==='profile'?2:5)*1048576;
    if(!file||!file.size)E('Thiếu file');
    if(!(type==='profile'?img:[...img,'application/pdf']).includes(file.type))E('Định dạng file không hợp lệ (ảnh JPG/PNG/WebP'+(type==='profile'?'':' hoặc PDF')+')');
    if(!/\.(jpe?g|png|webp|pdf)$/i.test(file.name))E('Đuôi file không hợp lệ');
    const hex=[...new Uint8Array(await file.slice(0,12).arrayBuffer())].map(x=>x.toString(16).padStart(2,'0')).join('');
    const mime=hex.startsWith('89504e47')?'image/png':hex.startsWith('ffd8ff')?'image/jpeg':hex.startsWith('52494646')&&hex.slice(16,24)==='57454250'?'image/webp':hex.startsWith('25504446')?'application/pdf':'';
    if(mime!==file.type)E('Nội dung file không khớp định dạng');
    if(file.size>lim)E('File vượt quá '+lim/1048576+'MB');
    return mime}
  async function saveFile(file,owner,type){
    const mime=await checkFile(file,type);
    const id=uid('fl_'),ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','application/pdf':'pdf'}[mime],
      storedName=`${Date.now()}-${Math.random().toString(36).slice(2,10)}.${ext}`,path=`uploads/${owner}/${type}/${storedName}`;
    await S.putFile(path,file); // ghi vào thư mục uploads của source
    try{await S.sync(T.f,[{id,ownerId:owner,type,originalName:file.name,storedName,mimeType:file.type,size:file.size,path,uploadedAt:now()}])}
    catch(e){await S.delFile(path);throw e}return id}
  const dropFile=async id=>{if(!id)return;const f=(await S.list(T.f)).find(x=>x.id===id);if(f)await S.delFile(f.path);await S.del(T.f,[id])};
  const LB={relation:'Mối quan hệ',fullName:'Họ tên',gender:'Giới tính',nationality:'Quốc tịch',dateOfBirth:'Ngày sinh',citizenID:'CCCD',phone:'Điện thoại',email:'Email',position:'Chức vụ',fromDate:'Từ ngày',company:'Công ty',name:'Tên'};
  const need_=(d,keys)=>{for(const k of keys)if(!String(d[k]||'').trim())E('Thiếu trường bắt buộc: '+(LB[k]||k))};
  const FUTURE_OK=[]; // khóa ngày được phép ở tương lai, ví dụ ['expiredDate']
  const DL={dateOfBirth:'Ngày sinh',fromDate:'Từ ngày',toDate:'Đến ngày',issuedDate:'Ngày cấp',expiredDate:'Ngày hết hạn'};
  const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
  function chkDates(d){
    for(const k in DL){const v=d[k];if(!v)continue;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||isNaN(Date.parse(v)))E(DL[k]+' không hợp lệ (YYYY-MM-DD)');
      if(v>today()&&!FUTURE_OK.includes(k))E(DL[k]+' phải ở quá khứ (không sau hôm nay)')}
    for(const[x,y]of[['fromDate','toDate'],['issuedDate','expiredDate']])if(d[x]&&d[y]&&!(d[x]<d[y]))E(DL[x]+' phải trước '+DL[y].toLowerCase())}
  const ld=s=>{const d=new Date(s);return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)}; // ngày theo giờ máy
  const PAGE=25;
  const paged=(all,page)=>{const pages=Math.max(1,Math.ceil(all.length/PAGE)),p=Math.min(Math.max(1,+page||1),pages);return{items:all.slice((p-1)*PAGE,p*PAGE),total:all.length,page:p,pages,pageSize:PAGE}};
  // CCCD là duy nhất toàn hệ thống. Bảng KIO chỉ có id + payload nên không đặt được unique index => chặn ở tầng ứng dụng (đọc mới nhất từ server, không dùng cache).
  const cid=v=>String(v??'').trim();
  const dupCCCD=async(v,exceptUser)=>{v=cid(v);return v&&(await S.list(T.p,{force:true})).some(p=>p.userId!==exceptUser&&cid(p.citizenID)===v)};
  const DUP_MSG='CCCD đã tồn tại trong hệ thống (mỗi CCCD chỉ thuộc một nhân sự)';
  const chkNum=d=>{for(const[k,l]of[['phone','Điện thoại'],['citizenID','CCCD']])if(d[k]&&!/^\d+$/.test(String(d[k]).trim()))E(l+' chỉ được gồm chữ số (có thể bắt đầu bằng 0)')};
  // ---- Gia phả ----
  const FAM=['fullName','dateOfBirth','gender','nationality','citizenID','address','email','phone'];
  const FAM_HIDE=['citizenID','address','email','phone']; // người thân là nhân sự: chỉ quản lý trở lên được xem
  const isMgr=m=>m.role!=='EMPLOYEE';
  const pick=(o,ks)=>Object.fromEntries(ks.map(k=>[k,String(o[k]??'').trim()]));
  // Bản ghi liên kết chỉ lưu {relation, linkedUserId}; thông tin lấy trực tiếp từ hồ sơ nhân sự nên luôn là bản mới nhất.
  function famView(m,r,users,ps){
    const t=r.linkedUserId&&users.find(u=>u.id===r.linkedUserId);
    if(!t)return{...r,linked:false};
    const full=isMgr(m)&&canView(m,t),p=ps.find(x=>x.userId===t.id)||{};
    return{id:r.id,userId:r.userId,relation:r.relation,linked:true,restricted:!full,canOpen:full,...(full?{linkedUserId:t.id}:{}),
      ...Object.fromEntries(FAM.map(k=>[k,full||!FAM_HIDE.includes(k)?String(p[k]??'').trim():'']))}}
  async function famTarget(m,owner,linkId,existing){
    const t=(await S.list(T.u)).find(u=>u.id===linkId);if(!t)E('Không tìm thấy nhân sự được chọn');
    if(!existing&&(t.id===owner||t.status==='DELETED'||(t.role==='SUPER_ADMIN'&&m.role!=='SUPER_ADMIN')))E('Không thể chọn nhân sự này làm người thân');
    return{p:(await S.list(T.p)).find(p=>p.userId===t.id)||{},full:isMgr(m)&&canView(m,t)}}
  // Còn liên kết chỉ khi mọi thông tin người dùng nhìn thấy giữ nguyên như hồ sơ nhân sự (trừ Quan hệ); sửa gì khác => thành bản nhập tay.
  async function famBuild(m,owner,d,linkId,existing){
    need_(d,['relation']);
    if(linkId){const{p,full}=await famTarget(m,owner,linkId,existing),shown=FAM.filter(k=>full||!FAM_HIDE.includes(k));
      const same=shown.every(k=>String(d[k]??'').trim()===String(p[k]??'').trim())&&FAM.filter(k=>!shown.includes(k)).every(k=>!String(d[k]??'').trim());
      if(same)return{relation:d.relation.trim(),linkedUserId:linkId}}
    need_(d,['fullName']);chkDates(d);chkNum(d);
    return{relation:d.relation.trim(),linkedUserId:null,...pick(d,FAM)}}
  // Mối quan hệ phía đối ứng: A ghi B là X => B ghi A là inverseRel(X, giới tính của A). Không rõ => "Người thân".
  function inverseRel(rel,gender){
    const k=norm(rel).replace(/ (trai|gai)$/,''),g=norm(gender),byG=(nam,nu)=>g==='nam'?nam:g==='nu'?nu:'Người thân';
    switch(k){
      case'cha':case'bo':case'me':return'Con';
      case'con':return byG('Cha','Mẹ');
      case'vo':return'Chồng';case'chong':return'Vợ';
      case'anh':case'chi':return'Em';
      case'em':return byG('Anh','Chị');
      case'ong':case'ba':case'chu':case'bac':case'co':case'di':case'cau':return'Cháu';
      default:return'Người thân'}}
  const ownerGender=async id=>((await S.list(T.p)).find(p=>p.userId===id)||{}).gender;
  const findMirror=async(ownerId,row)=>(await S.list(T.fam)).find(r=>r.userId===row.linkedUserId&&r.linkedUserId===ownerId); // bản của người kia trỏ về chủ hồ sơ
  async function mirrorAdd(ownerId,row){ // trả true nếu đã tạo bản đối ứng
    if(await findMirror(ownerId,row))return false;
    await S.sync(T.fam,[{id:uid('fm_'),userId:row.linkedUserId,relation:inverseRel(row.relation,await ownerGender(ownerId)),linkedUserId:ownerId,auto:true}]);return true}
  const famName=async r=>r.linkedUserId?((await S.list(T.p)).find(p=>p.userId===r.linkedUserId)||{}).fullName||'':r.fullName;
  const PF=['fullName','gender','nationality','dateOfBirth','citizenID','phone','email'],ID=['fullName','gender','nationality','dateOfBirth','citizenID'];

  return{
    maxDate:k=>FUTURE_OK.includes(k)?'':today(),seed,pub,canManage,canView,me:async()=>{const m=await me();return m&&pub(m)},
    async login(name,pw){
      await seed();const k=name.trim().toLowerCase(),f=API._f[k]||{n:0,until:0};
      if(f.until>Date.now())E('Tạm khóa 15 phút do nhập sai quá 5 lần');
      const u=(await S.list(T.u,{force:true})).find(x=>x.username.toLowerCase()===k); // đọc mới nhất từ server khi đăng nhập
      if(!u||u.status!=='ACTIVE'||!(await check(pw,u.passwordHash))){if(++f.n>=5){f.until=Date.now()+9e5;f.n=0}API._f[k]=f;E('Sai tên đăng nhập hoặc mật khẩu, hoặc tài khoản không hoạt động')}
      delete API._f[k];sessionStorage.uid=u.id;u.lastLoginAt=now();await S.sync(T.u,[u]);await log(u.id,'LOGIN',u.id,'Đăng nhập: '+u.username);return pub(u)},
    logout(){sessionStorage.removeItem('uid')},
    async changePassword(oldPw,newPw){
      const m=await me();if(!m)E('Chưa đăng nhập');if(!(await check(oldPw,m.passwordHash)))E('Mật khẩu hiện tại không đúng');
      if(newPw.length<8)E('Mật khẩu mới tối thiểu 8 ký tự');if(newPw===oldPw)E('Mật khẩu mới phải khác mật khẩu cũ');
      Object.assign(m,{passwordHash:await hash(newPw),mustChangePassword:false,updatedAt:now()});await S.sync(T.u,[m]);await log(m.id,'CHANGE_PASSWORD',m.id,'Đổi mật khẩu: '+m.username)},
    async listUsers({q='',role='',status='',page=1}={}){
      const m=await need();if(m.role==='EMPLOYEE')E('Bạn không có quyền xem danh sách');
      const ps=await S.list(T.p),Q=norm(q);
      return paged((await S.list(T.u)).filter(u=>canView(m,u)&&(!role||u.role===role)&&(!status||u.status===status)).map(u=>({...pub(u),...(ps.find(p=>p.userId===u.id)||{}),id:u.id}))
        .filter(r=>!Q||norm([r.fullName,r.username,r.email,r.phone,r.citizenID].join(' ')).includes(Q)),page)},
    async getUser(id){
      const{m,t}=await target(id,'view'),us=await S.list(T.u),ps=await S.list(T.p),by=async k=>(await S.list(KIND[k])).filter(x=>x.userId===id);
      return{user:pub(t),profile:(await S.list(T.p)).find(p=>p.userId===id)||{},positions:await by('positions'),work:await by('work'),degrees:await by('degrees'),certificates:await by('certificates'),family:(await S.list(T.fam)).filter(x=>x.userId===id).map(r=>famView(m,r,us,ps))}},
    async createUser(d,avatar,kids={}){
      const m=await need();if(m.role==='EMPLOYEE')E('Bạn không có quyền tạo người dùng');
      if(m.role==='HR_MANAGER'&&d.role==='SUPER_ADMIN')E('Quản lý nhân sự không được tạo SUPER_ADMIN');
      if(!['SUPER_ADMIN','HR_MANAGER','EMPLOYEE'].includes(d.role))E('Role không hợp lệ');
      if(!/^[a-z0-9._-]{3,}$/i.test(d.username||''))E('Tên đăng nhập tối thiểu 3 ký tự (chữ, số, . _ -)');
      if((d.password||'').length<8)E('Mật khẩu tối thiểu 8 ký tự');need_(d,PF);chkNum(d);chkDates(d);if(await dupCCCD(d.citizenID,null))E(DUP_MSG);
      if((await S.list(T.u)).some(u=>u.username.toLowerCase()===d.username.toLowerCase()))E('Tên đăng nhập đã tồn tại');
      await checkFile(avatar,'profile');
      const list=[]; // kiểm TOÀN BỘ bản ghi con trước khi ghi
      for(const k of Object.keys(KIND))for(const it of kids[k]||[]){need_(it.data,REQ[k]);chkDates(it.data);if(it.file)await checkFile(it.file,k);list.push({k,...it})}
      const id=uid('u_'),t=now(),files=[],rows=[];
      try{
        const fid=await saveFile(avatar,id,'profile');files.push(fid);
        await S.sync(T.u,[{id,username:d.username,passwordHash:await hash(d.password),role:d.role,status:'ACTIVE',mustChangePassword:true,createdAt:t,updatedAt:t,lastLoginAt:null}]);
        await S.sync(T.p,[{id:'pf_'+id,userId:id,...Object.fromEntries([...PF,'address'].map(k=>[k,(d[k]||'').trim()])),profilePictureFileId:fid}]);
        // Hai người tạo cùng CCCD gần như cùng lúc: kiểm lại sau khi ghi, bên có userId lớn hơn hoàn tác (cả hai bên cùng áp quy tắc nên chỉ một bên thua)
        if((await S.list(T.p,{force:true})).some(p=>p.userId!==id&&cid(p.citizenID)===cid(d.citizenID)&&p.userId<id))E(DUP_MSG);
        for(const it of list){const row={...it.data,id:uid(it.k[0]+'_'),userId:id};
          if(it.file){row.fileId=await saveFile(it.file,id,it.k);files.push(row.fileId)}
          await S.sync(KIND[it.k],[row]);rows.push([it.k,row.id])}
        await log(m.id,'CREATE_USER',id,`${m.username} tạo tài khoản ${d.username} (${d.fullName}, ${d.role}) kèm ${list.length} bản ghi con`);
      }catch(e){ // rollback bù
        for(const f of files)await dropFile(f);for(const[k,r]of rows)await S.del(KIND[k],[r]);
        await S.del(T.u,[id]);await S.del(T.p,['pf_'+id]);throw e}
      return id},
    async saveProfile(id,d,avatar){
      const{m,t}=await target(id,'self'),p=(await S.list(T.p)).find(x=>x.userId===id)||{id:'pf_'+id,userId:id};
      if(!canManage(m,t)&&ID.some(k=>d[k]!==undefined&&d[k]!==(p[k]||'')))E('Bạn không được sửa họ tên, giới tính, quốc tịch, ngày sinh, CCCD');
      const n={...p,...d};need_(n,t.role==='SUPER_ADMIN'&&!p.citizenID?['fullName']:PF);chkNum(n);chkDates(n);if(cid(n.citizenID)!==cid(p.citizenID)&&await dupCCCD(n.citizenID,id))E(DUP_MSG); // chỉ kiểm khi CCCD thay đổi
      if(avatar){const old=p.profilePictureFileId;n.profilePictureFileId=await saveFile(avatar,id,'profile');await S.sync(T.p,[n]);await dropFile(old)}else await S.sync(T.p,[n]);
      await log(m.id,'UPDATE_PROFILE',id,`${m.username} cập nhật hồ sơ của ${n.fullName}`)},
    async setStatus(id,status){const{m,t}=await target(id,'manage');notSelf(m,t,'khóa');if(t.status==='DELETED')E('Tài khoản đã bị xóa');
      if(status==='LOCKED')await guardLastSA(t,'khóa');Object.assign(t,{status,updatedAt:now()});await S.sync(T.u,[t]);await log(m.id,'UPDATE_USER',id,`${m.username} ${status==='LOCKED'?'khóa':'mở khóa'} tài khoản ${t.username}`)},
    async setRole(id,role){const{m,t}=await target(id,'manage');
      if(!['SUPER_ADMIN','HR_MANAGER','EMPLOYEE'].includes(role))E('Role không hợp lệ');if(role===t.role)E('Người dùng đã có role này');
      if(m.role==='HR_MANAGER'&&!(t.role==='EMPLOYEE'&&role==='HR_MANAGER'))E('Quản lý nhân sự chỉ được nâng EMPLOYEE lên Quản lý nhân sự');
      notSelf(m,t,'đổi role');if(role!=='SUPER_ADMIN')await guardLastSA(t,'hạ quyền');
      Object.assign(t,{role,updatedAt:now()});await S.sync(T.u,[t]);await log(m.id,'UPDATE_USER',id,`${m.username} đổi role ${t.username} thành ${role}`)},
    async resetPassword(id,newPw){const{m,t}=await target(id,'manage');
      if(String(newPw||'').length<8)E('Mật khẩu tối thiểu 8 ký tự');
      Object.assign(t,{passwordHash:await hash(newPw),mustChangePassword:true,updatedAt:now()});await S.sync(T.u,[t]);await log(m.id,'RESET_PASSWORD',id,`${m.username} đặt lại mật khẩu của ${t.username}`)},
    async remove(id,hard){
      const{m,t}=await target(id,'manage');notSelf(m,t,'xóa');await guardLastSA(t,'xóa');
      const name=((await S.list(T.p)).find(p=>p.userId===id)||{}).fullName||t.username;
      if(!hard){await log(m.id,'SOFT_DELETE_USER',id,`${m.username} xóa mềm ${name} (${t.username})`);Object.assign(t,{status:'DELETED',deletedBy:m.id,deletedAt:now(),updatedAt:now()});return S.sync(T.u,[t])}
      if(m.role!=='SUPER_ADMIN')E('Chỉ SUPER_ADMIN được xóa cứng');
      await log(m.id,'DELETE_USER',id,`${m.username} xóa cứng ${name} (${t.username})`); // ghi audit trước khi xóa
      for(const f of(await S.list(T.f)).filter(f=>f.ownerId===id))await dropFile(f.id);
      for(const k of Object.keys(KIND)){const ids=(await S.list(KIND[k])).filter(x=>x.userId===id).map(x=>x.id);if(ids.length)await S.del(KIND[k],ids)}
      const fam=await S.list(T.fam),p0=(await S.list(T.p)).find(p=>p.userId===id)||{},lk=fam.filter(r=>r.linkedUserId===id);
      if(lk.length)await S.sync(T.fam,lk.map(({auto,...r})=>({...r,linkedUserId:null,...pick(p0,FAM)}))); // người thân bị xóa cứng: chốt thông tin cuối cùng thành bản nhập tay
      const own=fam.filter(r=>r.userId===id).map(r=>r.id);if(own.length)await S.del(T.fam,own);
      await S.del(T.p,['pf_'+id]);await S.del(T.u,[id])},
    async restore(id){const{m,t}=await target(id,'manage');if(m.role!=='SUPER_ADMIN')E('Chỉ SUPER_ADMIN được khôi phục');if(t.status!=='DELETED')E('Tài khoản chưa bị xóa');
      Object.assign(t,{status:'ACTIVE',deletedBy:null,deletedAt:null,updatedAt:now()});await S.sync(T.u,[t]);await log(m.id,'UPDATE_USER',id,`${m.username} khôi phục tài khoản ${t.username}`)},
    async addChild(id,kind,d,file){
      if(!KIND[kind])E('Loại bản ghi không hợp lệ');
      const{m,t}=await target(id,kind==='positions'||kind==='work'?'manage':'self');need_(d,REQ[kind]);chkDates(d);
      const row={...d,id:uid(kind[0]+'_'),userId:id};
      if(file)row.fileId=await saveFile(file,id,kind);
      await S.sync(KIND[kind],[row]);await log(m.id,'ADD_'+kind.toUpperCase(),id,`${m.username} thêm ${kind} (${d.name||d.position||d.company}) cho ${t.username}`)},
    async updateChild(id,kind,rid,d,file){
      if(!KIND[kind])E('Loại bản ghi không hợp lệ');
      const{m,t}=await target(id,kind==='positions'||kind==='work'?'manage':'self'),old=(await S.list(KIND[kind])).find(x=>x.id===rid&&x.userId===id);
      if(!old)E('Không tìm thấy bản ghi');need_(d,REQ[kind]);chkDates(d);
      const row={...old,...d,id:rid,userId:id};
      if(file)row.fileId=await saveFile(file,id,kind);
      try{await S.sync(KIND[kind],[row])}catch(e){if(file)await dropFile(row.fileId);throw e}
      if(file&&old.fileId)await dropFile(old.fileId); // thay file thì xóa file cũ
      await log(m.id,'UPDATE_'+kind.toUpperCase(),id,`${m.username} sửa ${kind} (${row.name||row.position||row.company}) của ${t.username}`)},
    async searchPeople(q,ownerId){ // khớp đúng họ tên đầy đủ (không phân biệt hoa/thường/dấu) hoặc đúng số CCCD
      const m=await need(),s=String(q||'').trim();if(!s)return[];
      const ps=await S.list(T.p),Q=norm(s),num=/^\d+$/.test(s);
      return(await S.list(T.u)).filter(u=>u.id!==ownerId&&u.status!=='DELETED'&&(m.role==='SUPER_ADMIN'||u.role!=='SUPER_ADMIN'))
        .map(u=>({u,p:ps.find(p=>p.userId===u.id)||{}})).filter(({p})=>num?String(p.citizenID||'').trim()===s:norm(p.fullName)===Q).slice(0,10)
        .map(({u,p})=>{const full=isMgr(m)&&canView(m,u);return{userId:u.id,restricted:!full,...pick(p,FAM.filter(k=>full||!FAM_HIDE.includes(k)))}})},
    async addFamily(id,d,linkId){const{m,t}=await target(id,'self'),row=await famBuild(m,id,d,linkId||null,false);
      Object.assign(row,{id:uid('fm_'),userId:id});await S.sync(T.fam,[row]);
      const mir=row.linkedUserId?await mirrorAdd(id,row):false;
      await log(m.id,'ADD_FAMILY',id,`${m.username} thêm người thân (${row.relation}: ${await famName(row)}) cho ${t.username}${mir?' và tự thêm bản đối ứng bên người thân':''}`)},
    async updateFamily(id,rid,d){const{m,t}=await target(id,'self'),old=(await S.list(T.fam)).find(x=>x.id===rid&&x.userId===id);if(!old)E('Không tìm thấy bản ghi');
      const row={...await famBuild(m,id,d,old.linkedUserId||null,true),id:rid,userId:id};
      if(old.auto&&row.linkedUserId&&row.relation===old.relation)row.auto=true; // tự sửa mối quan hệ => không còn là bản tự sinh
      await S.sync(T.fam,[row]);
      if(!old.auto&&old.linkedUserId){ // đồng bộ bản đối ứng tự sinh
        const mir=await findMirror(id,old);
        if(mir&&mir.auto){if(!row.linkedUserId)await S.del(T.fam,[mir.id]);else if(row.relation!==old.relation)await S.sync(T.fam,[{...mir,relation:inverseRel(row.relation,await ownerGender(id))}])}}
      await log(m.id,'UPDATE_FAMILY',id,`${m.username} sửa người thân (${row.relation}: ${await famName(row)}) của ${t.username}`)},
    async delFamily(id,rid){const{m,t}=await target(id,'self'),row=(await S.list(T.fam)).find(x=>x.id===rid&&x.userId===id);if(!row)E('Không tìm thấy bản ghi');
      await log(m.id,'DELETE_FAMILY',id,`${m.username} xóa người thân (${row.relation}: ${await famName(row)}) của ${t.username}`);await S.del(T.fam,[rid]);
      if(!row.auto&&row.linkedUserId){const mir=await findMirror(id,row);if(mir&&mir.auto)await S.del(T.fam,[mir.id])}},
    async delChild(id,kind,rid){
      const{m,t}=await target(id,kind==='positions'||kind==='work'?'manage':'self'),row=(await S.list(KIND[kind])).find(x=>x.id===rid&&x.userId===id);if(!row)E('Không tìm thấy bản ghi');
      await log(m.id,'DELETE_'+kind.toUpperCase(),id,`${m.username} xóa ${kind} (${row.name||row.position||row.company}) của ${t.username}`);
      await dropFile(row.fileId);await S.del(KIND[kind],[rid])},
    async fileUrl(fid){
      const m=await need(),f=(await S.list(T.f)).find(x=>x.id===fid);if(!f)E('Không tìm thấy file');
      const o=(await S.list(T.u)).find(u=>u.id===f.ownerId);if(!o||!canView(m,o))E('Bạn không có quyền xem file');
      const b=await S.getFile(f.path).catch(()=>null);if(!b)E('Không đọc được file '+f.path+' (chọn lại thư mục uploads)');return URL.createObjectURL(b)},
    async audit({q='',action='',from='',to='',page=1}={}){
      const m=await need();if(m.role!=='SUPER_ADMIN')E('Chỉ SUPER_ADMIN xem được nhật ký');
      if(from&&to&&from>to)E('Từ ngày phải trước hoặc bằng Đến ngày');
      const all=(await S.list(T.a)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),Q=norm(q);
      const items=all.filter(a=>(!action||a.action===action)&&(!from||ld(a.createdAt)>=from)&&(!to||ld(a.createdAt)<=to)&&(!Q||norm(a.description+' '+a.action).includes(Q)));
      return{...paged(items,page),actions:[...new Set(all.map(a=>a.action))].sort()}},
    _f:{}
  }})();
