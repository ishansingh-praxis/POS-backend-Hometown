require("dotenv").config();
const connectDB = require("../config/db"); const userService = require("../modules/users/user.service");
const fs = require("fs"); const path = require("path");
const read = (name) => { const p=path.join(__dirname,'../../data',name); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf-8')) : []; };
const strip = (x) => { const y={...x}; delete y._id; return y; };
(async()=>{ await connectDB(); const admins=read('admin.seed.json').map(x=>({...strip(x), role:'ADMIN', posRole:'ADMIN'})); const mgrs=read('managers.seed.json').map(x=>({...strip(x), role:'MANAGER', posRole:'MANAGER'})); const cash=read('cashiers.seed.json').map(x=>({...strip(x), role:'CASHIER', posRole:'CASHIER'})); const all=[...admins,...mgrs,...cash]; for(const u of all){ await userService.createOrUpdate(u); } console.log(`Users seeded: ${all.length}`); process.exit(0); })().catch(e=>{console.error(e); process.exit(1);});
