// Persistence. Cùng giao diện cho 2 chế độ: 'local' (IndexedDB trong trình duyệt) và 'kio' (KioStore của công ty).
// Chỉ file này biết nơi lưu; phần còn lại gọi Store.list/sync/append/del/putFile/getFile/delFile.
const Store=(()=>{
  const C=window.HRM_CONFIG||{},P=C.prefix||'hrm_',kio=C.mode==='kio';
  let dbp;const open=()=>dbp||(dbp=new Promise((ok,no)=>{const r=indexedDB.open('hrm',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}));
  const kv=async(mode,f)=>{const d=await open();return new Promise((ok,no)=>{const t=d.transaction('kv',mode),q=f(t.objectStore('kv'));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error)})};
  // KioStore là adapter công ty (js/api/kio-api.js, KHÔNG sửa), cần list.js + krud.js của kio.dvqt.vn nạp trước.
  const K=()=>{if(typeof KioStore==='undefined')throw new Error('Chưa nạp js/api/kio-api.js');return KioStore};
  // Bảng KIO chưa có sẽ được tạo ở lần insert đầu tiên; đọc bảng chưa có = rỗng (giống kio-bridge của vattu)
  const miss=e=>/doesn'?t exist|does not exist|no such table|unknown table|not found|42S02|1146|không tồn tại|không tìm thấy/i.test(String(e?.message||e));
  return{
    mode:kio?'kio':'local',
    async list(t,o){
      if(kio){try{return await K().listCollection(P+t,o)}catch(e){if(miss(e))return[];throw e}}
      return(await kv('readonly',s=>s.get('t:'+t)))||[]},
    async sync(t,rows){ // thêm/thay theo id, không tự xóa
      if(kio){try{return await K().syncCollection(P+t,rows)}catch(e){if(!miss(e))throw e;return K().appendCollection(P+t,rows)}}
      const cur=await this.list(t);rows.forEach(r=>{const i=cur.findIndex(x=>x.id===r.id);i<0?cur.push(r):cur[i]=r});
      return kv('readwrite',s=>s.put(cur,'t:'+t))},
    async append(t,row){return kio?K().appendCollection(P+t,[row]):this.sync(t,[row])},
    async del(t,ids){
      if(kio){try{return await K().deleteKeys(P+t,ids)}catch(e){if(!miss(e))throw e;return}}
      const cur=(await this.list(t)).filter(x=>!ids.includes(x.id));return kv('readwrite',s=>s.put(cur,'t:'+t))},
    // File nằm trong thư mục uploads/ của source (File System Access API); DB chỉ giữ đường dẫn "uploads/{ownerId}/{type}/{storedName}"
    async dir(ask){
      let h=await kv('readonly',s=>s.get('dir'));
      if(h&&(await h.queryPermission({mode:'readwrite'}))==='granted')return h;
      if(h&&ask&&(await h.requestPermission({mode:'readwrite'}))==='granted')return h;
      if(!ask)throw new Error('Chưa cấp quyền thư mục uploads. Bấm "Thư mục uploads" ở menu để chọn lại.');
      return this.pickDir()},
    curDir:()=>kv('readonly',s=>s.get('dir')),
    async pickDir(){ // luôn mở hộp chọn thư mục, dùng cả cho chọn lại
      if(!window.showDirectoryPicker)throw new Error('Trình duyệt không hỗ trợ ghi thư mục (dùng Chrome/Edge, qua http://localhost hoặc https).');
      const h=await window.showDirectoryPicker({id:'hrm-uploads',mode:'readwrite'});
      await kv('readwrite',s=>s.put(h,'dir'));return h},
    async _walk(path,create){const parts=path.split('/').filter(Boolean);if(parts[0]==='uploads')parts.shift();
      const name=parts.pop();let d=await this.dir(create);for(const p of parts)d=await d.getDirectoryHandle(p,{create});return{d,name}},
    async putFile(path,blob){const{d,name}=await this._walk(path,true),w=await(await d.getFileHandle(name,{create:true})).createWritable();await w.write(blob);await w.close()},
    async getFile(path){try{const{d,name}=await this._walk(path,false);return await(await d.getFileHandle(name)).getFile()}
      catch(e){const r=await fetch(path).catch(()=>null);if(r&&r.ok)return r.blob();throw e}},
    async delFile(path){try{const{d,name}=await this._walk(path,false);await d.removeEntry(name)}catch(e){}}
  }})();
