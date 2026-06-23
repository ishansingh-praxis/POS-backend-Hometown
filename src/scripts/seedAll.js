require("dotenv").config();
const fs = require("fs"); const path = require("path"); const connectDB = require("../config/db");
const userService = require("../modules/users/user.service");
const read = (name) => { const p=path.join(__dirname,"../../data",name); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,"utf-8")) : []; };
const stripId = (x) => { const y={...x}; delete y._id; return y; };
async function insert(Model, records, label){ if(!records.length) return; await Model.deleteMany({}); await Model.insertMany(records.map(stripId)); console.log(`${label} seeded: ${records.length}`); }
(async()=>{ await connectDB();
const users=[...read('admin.seed.json').map(x=>({...stripId(x), role:'ADMIN', posRole:'ADMIN'})), ...read('managers.seed.json').map(x=>({...stripId(x), role:'MANAGER', posRole:'MANAGER'})), ...read('cashiers.seed.json').map(x=>({...stripId(x), role:'CASHIER', posRole:'CASHIER'}))];
for(const u of users) await userService.createOrUpdate(u); console.log(`Users seeded: ${users.length}`);
await insert(require('../modules/stores/store.model'), read('stores.seed.json'), 'Stores');
await insert(require('../modules/categories/model'), read('categories.seed.json'), 'Categories');
await insert(require('../modules/products/model'), read('products.seed.json'), 'Products');
await insert(require('../modules/inventories/model'), read('inventories.seed.json'), 'Inventories');
process.exit(0); })().catch(e=>{ console.error(e); process.exit(1); });
