const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function runtime(extra={}){
 let sequence=0;const context=vm.createContext({TextEncoder,crypto:{randomUUID:()=>`test_${++sequence}`},...extra});
 for(const file of ['learning-comparison.js','learning-preferences.js','learning-memory.js','project-codec.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);
 return context;
}
const plain=v=>JSON.parse(JSON.stringify(v));
const output=()=>({id:'square',w:1080,h:1080,composition:'Stack',layers:[{id:'e1',role:'text',type:'text',text:'PRIVATE TEXT',name:'PRIVATE NAME',color:'#000000',x:.1,y:.1,w:.8,h:.2,fontSize:42,align:'left',weight:700},{id:'e2',type:'image',role:'image',asset:'PRIVATE IMAGE',x:.1,y:.4,w:.8,h:.4,aspect:2}]});
const project=()=>({kind:'split-project',version:6,campaign:'Test',assets:[],formats:[{id:'square',name:'Square',w:1080,h:1080}],checked:['square'],sources:[],outputs:[],baseBackground:'#ffffff',selectedIds:[],view:'grid',blueprint:null});

test('new sessions have separate project identities and revisions',()=>{
 const {SplitMemory:m}=runtime(),first=m.snapshot();m.restore(null);const next=m.snapshot();
 assert.notEqual(first.projectId,next.projectId);assert.notEqual(first.revisionId,next.revisionId);assert.equal(next.records.length,0);
});
test('generations capture normalized geometry and structural context without text or assets',()=>{
 const {SplitMemory:m}=runtime(),id=m.snapshot().projectId;
 assert.equal(m.record('generation',[output()],{planned:true}),true);const state=plain(m.snapshot()),record=state.records[0];
 assert.equal(state.projectId,id);assert.equal(record.revisionId,state.revisionId);assert.equal(record.kind,'generation');
 assert.equal(record.outputs[0].layers[0].textLength,12);assert.equal(record.outputs[0].layers[1].aspect,2);assert.equal(record.outputs[0].planned,true);
 assert.equal(record.outputs[0].layers[0].x,.1);assert.equal(record.algorithmVersion,m.ALGORITHM_VERSION);
 assert(!JSON.stringify(state).includes('PRIVATE'));assert.equal(record.outputs[0].layers[0].color,undefined);
 const snapshot=m.snapshot();snapshot.records.length=0;assert.equal(m.snapshot().records.length,1);
});
test('save and export deduplicate exact versions, while generations remain distinct attempts',()=>{
 const {SplitMemory:m}=runtime();m.record('generation',[output()]);m.record('save',[output()]);const revision=m.snapshot().revisionId;
 assert.equal(m.record('save',[output()]),false);assert.equal(m.snapshot().revisionId,revision);
 m.record('export',[output()]);assert.equal(m.record('export',[output()]),false);
 m.record('generation',[output()]);assert.equal(m.snapshot().records.length,4);
 const edited=output();edited.layers[0].x=.2;m.record('save',[edited]);assert.equal(m.snapshot().records.length,5);
});
test('restore supports undo and redo without new identities or duplicated records',()=>{
 const {SplitMemory:m}=runtime(),initial=m.snapshot();m.record('generation',[output()]);const generated=m.snapshot();
 m.restore(initial);assert.deepEqual(plain(m.snapshot()),plain(initial));m.restore(generated);m.record('save',[output()]);const saved=m.snapshot();
 m.restore(saved);assert.equal(m.record('save',[output()]),false);assert.deepEqual(plain(m.snapshot()),plain(saved));
});
test('versions 1 through 6 migrate to version 7 and retain identity after round trip',async()=>{
 const {SplitProject:p}=runtime();
 for(let version=1;version<=6;version++){
  const migrated=p.validate({...project(),version});assert.equal(migrated.version,7);assert.equal(migrated.learning.records.length,0);
  const encoded=await p.encode(migrated,[]),decoded=await p.decode(JSON.stringify(encoded));
  assert.deepEqual(plain(decoded.project.learning),plain(migrated.learning));
 }
});
test('portable project round trip preserves generation and save records',async()=>{
 const {SplitMemory:m,SplitProject:p}=runtime();m.record('generation',[output()]);m.record('save',[output()]);
 const encoded=await p.encode({...project(),learning:m.snapshot()},[]),decoded=await p.decode(JSON.stringify(encoded));
 assert.deepEqual(plain(decoded.project.learning),plain(m.snapshot()));assert.equal(decoded.project.version,7);
});
test('malformed or future memory is discarded without preventing a valid project from opening',()=>{
 const {SplitMemory:m,SplitProject:p}=runtime();m.record('generation',[output()]);const valid=plain(m.snapshot());
 const badCases=[{...valid,version:999},{...valid,records:[{...valid.records[0],kind:'approve'}]},{...valid,records:[valid.records[0],valid.records[0]]}];
 const geometry=plain(valid);geometry.records[0].outputs[0].layers[0].x=Infinity;badCases.push(geometry);
 const duplicate=plain(valid);duplicate.records[0].outputs.push(duplicate.records[0].outputs[0]);badCases.push(duplicate);
 for(const learning of badCases){const result=p.validate({...project(),learning});assert.equal(result.learning.projectId,valid.projectId);assert.equal(result.learning.records.length,0);}
 assert.throws(()=>p.validate({...project(),version:999}));assert.throws(()=>p.validate({...project(),formats:[{id:'square',name:'Bad',w:1,h:1}]}));
});
test('unknown memory fields are stripped, including private payloads',()=>{
 const {SplitMemory:m}=runtime();m.record('generation',[output()]);const value=plain(m.snapshot());
 value.extra='PRIVATE';value.records[0].prompt='PRIVATE';value.records[0].outputs[0].layers[0].asset='PRIVATE';
 assert(!JSON.stringify(m.normalize(value)).includes('PRIVATE'));
});
test('records are capped and oldest attempts are removed',()=>{
 const {SplitMemory:m}=runtime();m.record('generation',[output()]);const oldest=m.snapshot().records[0].id;
 for(let i=0;i<m.MAX_RECORDS+3;i++)m.record('generation',[output()]);
 assert.equal(m.snapshot().records.length,m.MAX_RECORDS);assert(!m.snapshot().records.some(r=>r.id===oldest));
});
test('byte budget bounds memory even for large batches',()=>{
 const {SplitMemory:m}=runtime(),batch=Array.from({length:25},(_,i)=>({...output(),id:`format_${i}`,layers:Array.from({length:80},(_,j)=>({...output().layers[0],id:`e${j}`}))}));
 for(let i=0;i<3;i++)m.record('generation',batch);
 assert(new TextEncoder().encode(JSON.stringify(m.snapshot())).length<=m.MAX_BYTES);assert(m.snapshot().records.length<3);
});
test('invalid observations never interrupt callers or modify the history',()=>{
 const {SplitMemory:m}=runtime(),initial=m.snapshot();
 const bad=output();bad.layers[0].x=NaN;assert.equal(m.record('generation',[bad]),false);
 assert.equal(m.record('generation',[output(),output()]),false);assert.equal(m.record('unknown',[output()]),false);
 assert.deepEqual(plain(m.snapshot()),plain(initial));
});
test('unavailable local storage leaves portable memory operational without rejection',async()=>{
 const {SplitMemory:m}=runtime();m.record('generation',[output()]);assert.equal(await m.settled(),false);
 assert.equal(await m.readLocal(m.snapshot().projectId),null);assert.equal(m.snapshot().records.length,1);
});
test('synchronous IndexedDB failure is isolated and retries remain safe',async()=>{
 const {SplitMemory:m}=runtime({indexedDB:{open(){throw Error('denied');}}});
 m.record('generation',[output()]);assert.equal(await m.settled(),false);m.record('save',[output()]);
 assert.equal(await m.settled(),false);assert.equal(m.snapshot().records.length,2);
});
