const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const plain=v=>JSON.parse(JSON.stringify(v));
function runtime(){let id=0;const context=vm.createContext({TextEncoder,crypto:{randomUUID:()=>`id_${++id}`}});for(const file of ['learning-comparison.js','learning-preferences.js','learning-memory.js','project-codec.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',file),'utf8'),context);return context;}
const output=(id='square')=>({id,w:1080,h:1080,bg:'#ffffff',composition:'Stack',layers:[{id:'title',role:'text',type:'text',text:'SALE',x:.1,y:.1,w:.8,h:.2,fontSize:40,rotation:0,align:'left',weight:700,color:'#000000'},{id:'product',type:'image',role:'image',asset:'asset',x:.1,y:.4,w:.8,h:.4,aspect:2}]});
function fixture(){const runtimeValue=runtime(),m=runtimeValue.SplitMemory,images=new Map([['asset',{width:400,height:200}]]),options={images},baseline=output();m.record('generation',[baseline],options);return{...runtimeValue,m,images,options,baseline};}
const last=m=>plain(m.snapshot().records.at(-1));

test('manual geometry changes produce normalized deltas against the original generation',()=>{
 const {m,baseline,options}=fixture(),final=plain(baseline);Object.assign(final.layers[0],{x:.15,y:.12,w:.7,h:.25,fontSize:48,rotation:10,align:'center',manualLayout:true});
 m.record('save',[final],options);const report=last(m).comparisons[0];assert.equal(report.status,'adjusted');assert.equal(report.eligibleCount,1);
 assert.deepEqual(report.changes[0].delta,{x:.05,y:.02,w:-.1,h:.05,fontSize:8,rotation:10,align:{from:'left',to:'center'}});
 assert.equal(report.baselineId,m.snapshot().records[0].id);assert.equal(report.changes[0].kind,'layout');
});
test('same-length text replacement is content change and suppresses collateral layout corrections',()=>{
 const {m,baseline,options}=fixture(),final=plain(baseline);final.layers[0].text='DEAL';final.layers[0].w=.7;final.layers[1].x=.2;
 m.record('save',[final],options);const report=last(m).comparisons[0];assert.equal(report.eligibleCount,0);assert(report.reasons.includes('content'));
 assert.equal(report.changes.find(c=>c.id==='title').kind,'content');assert.equal(report.changes.find(c=>c.id==='product').kind,'layout');
 assert(!JSON.stringify(m.snapshot()).includes('SALE'));assert(!JSON.stringify(m.snapshot()).includes('DEAL'));
});
test('image replacements with identical dimensions are detected by stable asset identity',()=>{
 const {m,baseline,images,options}=fixture(),final=plain(baseline);images.set('replacement',{width:400,height:200});final.layers[1].asset='replacement';final.layers[1].w=.6;
 m.record('export',[final],options);const report=last(m).comparisons[0];assert.equal(report.eligibleCount,0);assert.equal(report.changes[0].kind,'content');
});
test('asset remapping on reopen preserves content identity',()=>{
 const {m,baseline,images,options}=fixture(),originalKey=m.imageKey(images.get('asset')),next={width:400,height:200};m.registerImage(next,originalKey);images.set('remapped',next);
 const final=plain(baseline);final.layers[1].asset='remapped';final.layers[1].x=.15;m.record('save',[final],options);
 const report=last(m).comparisons[0];assert.equal(report.eligibleCount,1);assert.equal(report.changes[0].kind,'layout');
});
test('added and removed layers are structural changes rather than corrections',()=>{
 const {m,baseline,options}=fixture(),final=plain(baseline);final.layers.shift();final.layers.push({...baseline.layers[0],id:'newTitle'});final.layers[0].x=.2;
 m.record('save',[final],options);const report=last(m).comparisons[0];assert.equal(report.eligibleCount,0);assert.equal(report.changes.filter(c=>c.kind==='structure').length,2);
});
test('style, rules, background and dimensions conservatively suppress preference candidates',()=>{
 for(const [reason,edit] of [
  ['style',out=>{out.layers[0].weight=900;}],['constraints',out=>{out.layers[0].rules={margin:8};}],
  ['background',out=>{out.bg='#eeeeee';}],['dimensions',out=>{out.w=1200;}],['state',out=>{out.layers[0].locked=true;}]
 ]){const {m,baseline,options}=fixture(),final=plain(baseline);edit(final);final.layers[1].x=.2;m.record('save',[final],options);const report=last(m).comparisons[0];assert(report.reasons.includes(reason));assert.equal(report.eligibleCount,0);}
});
test('changes to planning areas count as context changes',()=>{
 const ctx=runtime(),m=ctx.SplitMemory,baseline=output(),images=new Map([['asset',{width:400,height:200}]]);let plan={image:{x:.1,y:.4,w:.8,h:.4}};
 ctx.SplitBlueprint={template:()=>plan};m.record('generation',[baseline],{images,planned:true});plan={image:{x:.2,y:.4,w:.7,h:.4}};
 const final=plain(baseline);final.layers[1].x=.2;m.record('save',[final],{images,planned:true});assert(last(m).comparisons[0].reasons.includes('planning'));assert.equal(last(m).comparisons[0].eligibleCount,0);
});
test('inherited manual geometry and grouped layers never become eligible corrections',()=>{
 for(const inherited of [{manualLayout:true},{groupId:'group'},{hidden:true},{locked:true}]){
  const {m,baseline,options}=fixture();Object.assign(baseline.layers[0],inherited);m.record('generation',[baseline],options);
  const final=plain(baseline);final.layers[0].x=.2;m.record('save',[final],options);const change=last(m).comparisons[0].changes[0];assert.equal(change.reason,'inherited-layout');assert.equal(change.eligible,false);
 }
});
test('latest generation baseline is chosen separately for each format',()=>{
 const {m,baseline,options}=fixture(),portrait=output('portrait');portrait.h=1350;m.record('generation',[portrait],options);const first=m.snapshot().records[0].id,second=m.snapshot().records[1].id;
 const finalSquare=plain(baseline),finalPortrait=plain(portrait);finalSquare.layers[0].x=.2;finalPortrait.layers[0].y=.2;
 m.record('save',[finalSquare,finalPortrait],options);const reports=last(m).comparisons;assert.equal(reports[0].baselineId,first);assert.equal(reports[1].baselineId,second);
});
test('saving the same piece after a new generation yields a new baseline-linked observation',()=>{
 const {m,baseline,options}=fixture();m.record('save',[baseline],options);m.record('generation',[baseline],options);
 assert.equal(m.record('save',[baseline],options),true);assert.equal(last(m).comparisons[0].baselineId,m.snapshot().records.at(-2).id);
});
test('draft comparisons replace intermediate adjustments and disappear when reverted',()=>{
 const {m,baseline,options}=fixture(),final=plain(baseline),initial=m.snapshot();final.layers[0].x=.2;m.trackEdits([final],options);
 assert.equal(m.snapshot().drafts.length,1);const revision=m.snapshot().revisionId;assert.equal(m.trackEdits([final],options),false);assert.equal(m.snapshot().revisionId,revision);
 final.layers[0].x=.3;m.trackEdits([final],options);assert.equal(m.snapshot().drafts[0].changes[0].delta.x,.2);assert.equal(m.snapshot().records.length,1);
 m.trackEdits([baseline],options);assert.equal(m.snapshot().drafts.length,0);m.restore(initial);assert.deepEqual(plain(m.snapshot()),plain(initial));
});
test('generation resets drafts only for the regenerated formats',()=>{
 const {m,baseline,options}=fixture(),portrait=output('portrait');m.record('generation',[portrait],options);const a=plain(baseline),b=plain(portrait);a.layers[0].x=.2;b.layers[0].y=.2;m.trackEdits([a,b],options);
 assert.equal(m.snapshot().drafts.length,2);m.record('generation',[a],options);assert.equal(m.snapshot().drafts.length,1);assert.equal(m.snapshot().drafts[0].formatId,'portrait');
});
test('asynchronous exports compare against the generation captured when export started',()=>{
 const {m,baseline,options}=fixture(),final=plain(baseline);final.layers[0].x=.2;const prepared=m.prepare([final],options),original=m.snapshot().records[0].id;
 m.record('generation',[final],options);m.record('export',[final],{prepared});assert.equal(last(m).comparisons[0].baselineId,original);assert.equal(last(m).comparisons[0].changes[0].delta.x,.1);
 const saved=m.snapshot();m.restore(null);assert.equal(m.record('export',[final],{prepared}),false);assert.notEqual(m.snapshot().projectId,saved.projectId);
});
test('legacy memory migrates without inventing reliable content comparisons',()=>{
 const {m,baseline,options}=fixture(),legacy=plain(m.snapshot());legacy.version=1;delete legacy.drafts;
 for(const o of legacy.records[0].outputs){delete o.planKey;delete o.backgroundKey;for(const l of o.layers){delete l.contentKey;delete l.styleKey;delete l.constraintsKey;}}
 m.restore(legacy);assert.equal(m.snapshot().version,3);assert.equal(m.snapshot().projectId,legacy.projectId);
 const final=plain(baseline);final.layers[0].x=.2;m.record('save',[final],options);assert.equal(last(m).comparisons[0].eligibleCount,0);
 m.record('generation',[baseline],options);m.record('save',[final],options);assert.equal(last(m).comparisons[0].eligibleCount,1);
});
test('missing baselines and numeric noise do not create correction candidates',()=>{
 const {m,baseline,options}=fixture(),final=plain(baseline);final.layers[0].x+=1e-8;final.layers[0].fontSize+=.001;m.record('save',[final],options);
 assert.equal(last(m).comparisons[0].status,'unchanged');assert.equal(last(m).comparisons[0].eligibleCount,0);
 m.restore(null);m.record('save',[baseline],options);assert.equal(last(m).comparisons[0].status,'no-baseline');assert.equal(last(m).comparisons[0].eligibleCount,0);
});
test('retention prioritizes active generation baselines over saved versions',()=>{
 const {m,baseline,options}=fixture(),generation=m.snapshot().records[0].id;
 for(let i=0;i<m.MAX_RECORDS+8;i++){const final=plain(baseline);final.layers[0].x=.2+i*.001;m.record('save',[final],options);}
 assert.equal(m.snapshot().records.length,m.MAX_RECORDS);assert.equal(m.snapshot().records[0].id,generation);assert.equal(last(m).comparisons[0].baselineId,generation);
});
test('comparison data and drafts survive project encoding and corrupted metadata stays isolated',async()=>{
 const {m,SplitProject:p,baseline,options}=fixture(),final=plain(baseline);final.layers[0].x=.2;m.trackEdits([final],options);m.record('save',[final],options);
 const project={kind:'split-project',version:7,campaign:'Test',assets:[],formats:[{id:'square',name:'Square',w:1080,h:1080}],checked:['square'],sources:[],outputs:[],baseBackground:'#ffffff',selectedIds:[],view:'grid',learning:m.snapshot()};
 const encoded=await p.encode(project,[]),decoded=await p.decode(JSON.stringify(encoded));assert.deepEqual(plain(decoded.project.learning),plain(m.snapshot()));
 const corrupted=plain(encoded);corrupted.learning.drafts[0].changes[0].delta.x=Infinity;assert.equal(p.validate(corrupted).learning.records.length,0);
});

test('implicit and explicit default rules describe the same constraints',()=>{
 const {m,baseline,options}=fixture(),final=plain(baseline);final.layers[0].rules={position:'auto',align:'auto',margin:5,minWidth:0,maxWidth:0,priority:3,overflow:false};final.layers[0].x=.2;
 m.record('save',[final],options);assert.equal(last(m).comparisons[0].eligibleCount,1);assert.equal(last(m).comparisons[0].status,'adjusted');
});
test('equivalent legacy and normalized planning areas retain their comparison identity',()=>{
 const {baseline,options}=fixture();
 const context=runtime();vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/blueprint-model.js'),'utf8'),context);
 const memory=context.SplitMemory;let template={text:{x:.1,y:.1,w:.8,h:.2},image:{x:.1,y:.4,w:.8,h:.4}};context.SplitBlueprint={template:()=>template};
 memory.record('generation',[baseline],{...options,planned:true});template={text:{x:.1,y:.1,w:.8,h:.2,sourceId:'title'},image:{x:.1,y:.4,w:.8,h:.4,sourceId:'product'}};
 const final=plain(baseline);final.layers[0].x=.2;memory.record('save',[final],{...options,planned:true});assert.equal(last(memory).comparisons[0].eligibleCount,1);
});
test('removing a format clears its pending comparison and no-baseline reports remain noneligible',()=>{
 const {m,baseline,options,SplitComparison:c}=fixture(),final=plain(baseline);final.layers[0].x=.2;m.trackEdits([final],options);m.trackEdits([],options);assert.equal(m.snapshot().drafts.length,0);
 const report=c.clean({formatId:'square',baselineId:null,status:'no-baseline',reasons:[],changes:[{id:'title',role:'text',kind:'layout',eligible:true,delta:{x:.1}}]});assert.equal(report.eligibleCount,0);
});
