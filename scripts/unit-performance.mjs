import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require=createRequire(import.meta.url)
let ts
try { ts=require('typescript') } catch { ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript') }

function loadTs(file, mocks={}){
  const src=fs.readFileSync(file,'utf8')
  const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const module={exports:{}}
  const localRequire=(id)=> id in mocks ? mocks[id] : require(id)
  const fn=vm.runInThisContext(`(function(require,module,exports){${js}\n})`,{filename:file})
  fn(localRequire,module,module.exports)
  return module.exports
}

const dateMod=loadTs('./lib/date.ts')
const perfMod=loadTs('./lib/performance.ts',{'@/lib/date':dateMod})
const today=dateMod.localDateISO()
const past='2026-01-10'

class Query{
  constructor(rows){this.rows=rows;this.filters=[]}
  select(){return this}
  eq(k,v){this.filters.push(r=>r[k]===v);return this}
  in(k,vals){this.filters.push(r=>vals.includes(r[k]));return this}
  gte(k,v){this.filters.push(r=>r[k]!=null&&r[k]>=v);return this}
  lte(k,v){this.filters.push(r=>r[k]!=null&&r[k]<=v);return this}
  maybeSingle(){const data=this.value()[0]??null;return Promise.resolve({data})}
  value(){return this.rows.filter(r=>this.filters.every(f=>f(r)))}
  then(resolve,reject){return Promise.resolve({data:this.value()}).then(resolve,reject)}
}

const tables={
  teacher_assignments:[{id:'a1',teacher_id:'t1',school_year_id:'y1',teachers:{profiles:{full_name:'Mme Test'}}}],
  v_session_details:[
    {assignment_id:'a1',teacher_id:'t1',status:'done',planned_minutes:120,actual_minutes:120,scheduled_date:past,planned_end:'10:00:00'},
    {assignment_id:'a1',teacher_id:'t1',status:'missed',planned_minutes:120,actual_minutes:0,scheduled_date:'2026-01-11',planned_end:'12:00:00'},
    {assignment_id:'a1',teacher_id:'t1',status:'cancelled_school',planned_minutes:120,actual_minutes:0,scheduled_date:'2026-01-12',planned_end:'12:00:00'},
    {assignment_id:'a1',teacher_id:'t1',status:'planned',planned_minutes:120,actual_minutes:0,scheduled_date:today,planned_end:'23:59:59'},
  ],
  absences:[{teacher_id:'t1',absence_date:'2026-01-11'}],
  v_assignment_program_coverage:[{assignment_id:'a1',teacher_id:'t1',lessons_total:10,lessons_completed:6}],
  v_assignment_program_lessons:[
    {assignment_id:'a1',teacher_id:'t1',lesson_id:'l1',expected_date:'2026-01-05'},
    {assignment_id:'a1',teacher_id:'t1',lesson_id:'l2',expected_date:'2026-01-10'},
    {assignment_id:'a1',teacher_id:'t1',lesson_id:'l3',expected_date:'2026-01-15'},
  ],
  lesson_progress:[
    {assignment_id:'a1',lesson_id:'l1',status:'completed',completed_on:'2026-01-06'},
    {assignment_id:'a1',lesson_id:'l2',status:'completed',completed_on:'2026-01-10'},
  ],
}
const supabase={from(name){return new Query(tables[name]??[])}}
const {rows,department}=await perfMod.getPerformanceData({supabase,profileId:'p1',canViewAll:true,schoolYearId:'y1',from:'2026-01-01',to:today})
const row=rows[0]
const expected={plannedMinutes:240,actualMinutes:120,sessionsExpected:2,sessionsTaught:1,sessionsMissed:1,absences:1,lessonsTotal:10,lessonsCompleted:6,lessonsPlannedPeriod:3,lessonsDonePeriod:2,hourlyCoverage:50,attendance:50,programCoverage:60}
for(const [key,value] of Object.entries(expected)){
  if(row?.[key]!==value){console.error(`ÉCHEC ${key}: attendu ${value}, reçu ${row?.[key]}`);process.exit(1)}
}
if(department?.hourlyCoverage!==50||department?.attendance!==50||department?.programCoverage!==60){console.error('ÉCHEC agrégat département');process.exit(1)}
console.log('Unit performance OK — annulation et séance future exclues, ratios et leçons conformes.')
