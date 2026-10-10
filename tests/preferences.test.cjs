const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const plain=v=>JSON.parse(JSON.stringify(v));
function runtime(){let id=0;const c=vm.createContext({TextEncoder,crypto:{randomUUID:()=>`id_${++id}`}});for(const file of ['learning-comparison.js','learning-preferences.js','learning-memory.js','project-codec.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),c);return c;}
const output=(id='square')=>({id,w:1080,h:1080,bg:'#ffffff',composition:'Stack',layers:[{id:'offer',role:'offer',type:'offer',text:'PRIVATE COPY',fontSize:40,weight:700,color:'#000000',align:'left',x:.1,y:.1,w:.6,h:.2}]});
function learn(m,count,{delta=.05,kind='export',edit,baseline=output()}={}){for(let i=0;i<count;i++){m.record('generation',[plain(baseline)]);const final=plain(baseline);final.layers[0].manualLayout=true;final.layers[0].x+=typeof delta==='function'?delta(i):delta;if(edit)edit(final,i);m.record(kind,[final]);}return m.snapshot();}
const entry=(model,metric='x')=>model.entries.find(e=>e.metric===metric);

test('generations and pending edits never count as confirmed preferences',()=>{
 const {SplitMemory:m}=runtime(),baseline=output();m.record('generation',[baseline]);const final=plain(baseline);final.layers[0].x=.2;m.trackEdits([final]);
 assert.equal(m.snapshot().evidence.length,0);assert.equal(m.snapshot().preferences.entries.length,0);
});
test('one confirmation is provisional and repeated independent generations increase confidence gradually',()=>{
 const {SplitMemory:m}=runtime();learn(m,1);const first=entry(m.snapshot().preferences);assert.equal(first.support,1);assert.equal(first.ready,false);
 learn(m,2);const next=entry(m.snapshot().preferences);assert.equal(next.support,3);assert(next.confidence>first.confidence);assert.equal(next.ready,true);assert.equal(next.value,.05);
 learn(m,8);assert(entry(m.snapshot().preferences).confidence<=.75);
});
test('exports carry more evidence than saves without implying approval',()=>{
 const a=runtime().SplitMemory,b=runtime().SplitMemory;learn(a,3,{kind:'save'});learn(b,3,{kind:'export'});
 assert(entry(a.snapshot().preferences).confidence<entry(b.snapshot().preferences).confidence);assert.equal(entry(a.snapshot().preferences).ready,false);assert.equal(entry(b.snapshot().preferences).ready,true);
});
test('save/export cycles of the same generation are one example and use the latest confirmed piece',()=>{
 const {SplitMemory:m}=runtime(),baseline=output(),final=plain(baseline);final.layers[0].x=.15;m.record('generation',[baseline]);m.record('save',[final]);m.record('export',[final]);
 for(let i=0;i<10;i++){m.record('save',[final]);m.record('export',[final]);}
 assert.equal(entry(m.snapshot().preferences).support,1);assert.equal(entry(m.snapshot().preferences).evidence,.6);
 final.layers[0].x=.2;m.record('save',[final]);assert.equal(entry(m.snapshot().preferences).value,.1);assert.equal(entry(m.snapshot().preferences).support,1);
});
test('confirming a reverted piece supersedes previous corrections rather than reviving old evidence',()=>{
 const {SplitMemory:m}=runtime(),baseline=output(),final=plain(baseline);final.layers[0].x=.2;m.record('generation',[baseline]);m.record('save',[baseline]);m.record('save',[final]);
 assert.equal(entry(m.snapshot().preferences).active,true);assert.equal(m.record('save',[baseline]),true);
 assert.equal(entry(m.snapshot().preferences).value,0);assert.equal(entry(m.snapshot().preferences).active,false);assert.equal(entry(m.snapshot().preferences).support,1);
});
test('a later context change invalidates earlier preference evidence from that origin',()=>{
 const {SplitMemory:m}=runtime(),baseline=output(),final=plain(baseline);final.layers[0].x=.15;m.record('generation',[baseline]);m.record('export',[final]);
 final.layers[0].text='DIFFERENT';m.record('save',[final]);assert.equal(m.snapshot().preferences.entries.length,0);assert.equal(m.snapshot().evidence.length,1);assert.equal(m.snapshot().evidence[0].samples.length,0);
});
test('many identical formats in one generation do not multiply independent support',()=>{
 const {SplitMemory:m}=runtime(),baseline=Array.from({length:20},(_,i)=>output(`format_${i}`)),final=plain(baseline);for(const out of final)out.layers[0].x=.15;
 m.record('generation',baseline);m.record('export',final);const e=entry(m.snapshot().preferences);assert.equal(e.support,1);assert.equal(e.evidence,.6);assert.equal(e.ready,false);
});
test('contradictory corrections and unchanged confirmations lower confidence',()=>{
 const a=runtime().SplitMemory,b=runtime().SplitMemory;learn(a,4);learn(b,4,{delta:i=>i%2?.05:-.05});assert.equal(entry(b.snapshot().preferences).value,0);assert.equal(entry(b.snapshot().preferences).ready,false);
 const before=entry(a.snapshot().preferences).confidence;learn(a,4,{delta:0});assert(entry(a.snapshot().preferences).confidence<before);assert.equal(entry(a.snapshot().preferences).ready,false);
});
test('alignment preferences require repeated consistent evidence',()=>{
 const {SplitMemory:m}=runtime();learn(m,3,{delta:0,edit:out=>{out.layers[0].align='center';}});const e=entry(m.snapshot().preferences,'align');assert.equal(e.value,'center');assert.equal(e.ready,true);
});
test('sizes and fonts are learned as relative changes, independent of pixel resolution',()=>{
 const {SplitMemory:m}=runtime();learn(m,1,{delta:0,edit:out=>{out.layers[0].w*=1.2;out.layers[0].fontSize*=1.25;}});
 const larger=output();larger.w=2160;larger.h=2160;larger.layers[0].fontSize=80;learn(m,2,{delta:0,baseline:larger,edit:out=>{out.layers[0].w*=1.2;out.layers[0].fontSize*=1.25;}});
 assert.equal(entry(m.snapshot().preferences,'widthScale').value,.2);assert.equal(entry(m.snapshot().preferences,'fontScale').value,.25);assert.equal(entry(m.snapshot().preferences,'fontScale').support,3);
});
test('context isolates proportions, roles, counts, content length and planning',()=>{
 const {SplitMemory:m}=runtime();learn(m,3);const vertical=output();vertical.h=1920;learn(m,1,{baseline:vertical});
 const logo=output();logo.layers[0].role='logo';learn(m,1,{baseline:logo});
 const long=output();long.layers[0].text='a'.repeat(150);learn(m,1,{baseline:long});
 const extra=output();extra.layers.push({...extra.layers[0],id:'title',role:'text',y:.5});learn(m,1,{baseline:extra});
 const xs=m.snapshot().preferences.entries.filter(e=>e.metric==='x'&&e.active);assert.equal(xs.length,5);assert.equal(xs.filter(e=>e.ready).length,1);
 const {SplitPreferences:p}=runtime();const plan=p.context({...output(),formatId:'square',planned:true},output().layers[0],'layout-1');const auto=p.context({...output(),formatId:'square',planned:false},output().layers[0],'layout-1');assert.notEqual(p.contextKey(plan),p.contextKey(auto));
});
test('invalid and inherited geometry is excluded before preferences are consolidated',()=>{
 for(const [baseline,edit] of [
  [output(),out=>{out.layers[0].x=1.1;}],
  [{...output(),layers:[{...output().layers[0],manualLayout:true}]},out=>{out.layers[0].x=.2;}]
 ]){const {SplitMemory:m}=runtime();learn(m,3,{baseline,delta:0,edit});assert.equal(m.snapshot().preferences.entries.length,0);}
});
test('bounded evidence survives pruning of raw confirmation records and portable normalization',()=>{
 const {SplitMemory:m}=runtime();learn(m,45);const state=m.snapshot();assert.equal(state.records.length,m.MAX_RECORDS);assert.equal(entry(state.preferences).support,45);assert(state.records.filter(r=>r.kind==='export').length<45);
 m.restore(state);assert.deepEqual(plain(m.snapshot()),plain(state));assert.equal(entry(m.snapshot().preferences).support,45);
});
test('undo and redo restore consolidated evidence and confidence exactly',()=>{
 const {SplitMemory:m}=runtime();learn(m,2);const before=m.snapshot();learn(m,1);const after=m.snapshot();m.restore(before);assert.deepEqual(plain(m.snapshot()),plain(before));assert.equal(entry(m.snapshot().preferences).ready,false);
 m.restore(after);assert.deepEqual(plain(m.snapshot()),plain(after));assert.equal(entry(m.snapshot().preferences).ready,true);
});
test('portable project preferences round-trip and derived scores cannot be injected',async()=>{
 const {SplitMemory:m,SplitProject:p}=runtime();learn(m,3);const memory=m.snapshot(),project={kind:'split-project',version:7,campaign:'Test',assets:[],formats:[{id:'square',name:'Square',w:1080,h:1080}],checked:['square'],sources:[],outputs:[],baseBackground:'#ffffff',selectedIds:[],view:'grid',learning:memory};
 const encoded=await p.encode(project,[]),decoded=await p.decode(JSON.stringify(encoded));assert.deepEqual(plain(decoded.project.learning),plain(memory));
 encoded.learning.preferences.entries[0].confidence=999;encoded.learning.preferences.entries[0].support=999999;const sanitized=p.validate(encoded);assert.deepEqual(plain(sanitized.learning.preferences),plain(memory.preferences));assert(!JSON.stringify(memory).includes('PRIVATE COPY'));
});
test('phase 2 memory migrates by recomputing existing verified confirmations',()=>{
 const {SplitMemory:m}=runtime();learn(m,3);const old=plain(m.snapshot());old.version=2;delete old.evidence;delete old.preferences;delete old.eventSequence;for(const r of old.records)delete r.ordinal;
 m.restore(old);assert.equal(m.snapshot().version,3);assert.equal(m.snapshot().projectId,old.projectId);assert.equal(entry(m.snapshot().preferences).support,3);
});
test('imported history is not a local contribution until its current version is explicitly confirmed',()=>{
 const {SplitMemory:m,SplitPreferences:p}=runtime();learn(m,3);const state=m.snapshot();assert.equal(p.project(state,{certificates:[]}).entries.length,0);
 const latest=state.evidence.at(-1),certificates=p.certify(state,[{recordId:latest.recordId,formatId:latest.formatId,kind:'save'}]);const model=p.project(state,{certificates});assert.equal(entry(model).support,1);assert.equal(entry(model).evidence,.4);
 const changed=plain(state);changed.evidence.at(-1).samples[0].values.x=.2;assert.equal(p.project(changed,{certificates}).entries.length,0);
});
test('general confidence needs independent projects and each project contributes at most one unit',()=>{
 const {SplitPreferences:p}=runtime(),contributions=[];
 for(let i=0;i<3;i++){const m=runtime().SplitMemory;learn(m,10);contributions.push({projectId:`project_${i}`,preferences:m.snapshot().preferences});}
 const two=p.general(contributions.slice(0,2)),three=p.general(contributions);assert.equal(entry(two).ready,false);assert.equal(entry(three).ready,true);assert.equal(entry(three).projectCount,3);assert.equal(entry(three).evidence,3);
 const duplicate=p.general([...contributions,contributions[0],contributions[0]]);assert.deepEqual(plain(duplicate),plain(three));
});
test('unchanged independent projects count as contradictory evidence against a general adjustment',()=>{
 const {SplitPreferences:p}=runtime(),contributions=[];
 for(let i=0;i<4;i++){const m=runtime().SplitMemory;learn(m,4,{delta:i===0?.05:0});contributions.push({projectId:`project_${i}`,preferences:m.snapshot().preferences});}
 const general=p.general(contributions);assert.equal(entry(general).ready,false);assert(entry(general).confidence<.5);
});
test('evidence and preferences stay within the memory budget',()=>{
 const {SplitMemory:m,SplitPreferences:p}=runtime();learn(m,1);const seed=plain(m.snapshot());seed.evidence=Array.from({length:p.MAX_EVIDENCE},(_,i)=>({...seed.evidence[0],originId:`archived_${i}`,recordId:`confirmed_${i}`,ordinal:i+10}));seed.eventSequence=p.MAX_EVIDENCE+20;m.restore(seed);learn(m,1);const state=m.snapshot();assert(state.evidence.length<=p.MAX_EVIDENCE);assert(state.preferences.entries.length<=p.MAX_PROJECT_ENTRIES);assert(new TextEncoder().encode(JSON.stringify(state)).length<=m.MAX_BYTES);assert(new TextEncoder().encode(JSON.stringify(state.evidence)).length<=p.MAX_EVIDENCE_BYTES);
});
