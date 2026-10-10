const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function runtime(){let id=0;const c=vm.createContext({TextEncoder,crypto:{randomUUID:()=>`evaluation_${++id}`}});for(const f of ['blueprint-model.js','learning-comparison.js','learning-preferences.js','learning-memory.js','learning-layout.js','layout.js','project-codec.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist',f),'utf8'),c);vm.runInContext(fs.readFileSync(path.join(__dirname,'fixtures/learning-evaluation.js'),'utf8'),c);c.SplitBlueprint={enabled:()=>false};return c;}
const plain=v=>JSON.parse(JSON.stringify(v));
test('held-out synthetic projects need fewer corrections without depending on the internal score',()=>{
 const c=runtime(),report=plain(c.SplitEvaluation.evaluate());assert.equal(report.trainingProjects,3);assert.equal(report.holdoutCases,24);assert.equal(report.unsafeCases,0);assert.equal(report.worseCases,0);assert(report.correctionReduction>=.45);
 assert(report.cases.every(row=>!report.trainingIds.includes(row.id)));assert(report.cases.every(row=>row.after<row.before));assert(report.fallbacks.every(row=>row.identical));assert(report.requiredCorrectionsAfter<report.requiredCorrectionsBefore);
 fs.mkdirSync(path.join(__dirname,'results'),{recursive:true});fs.writeFileSync(path.join(__dirname,'results/phase-5-quality-node.json'),JSON.stringify({...report,environment:'Node, approximate text measurement'},null,2)+'\n');
});
test('project schema versions 1 through 7 and memory versions 1 through 3 remain compatible',async()=>{
 const {SplitProject:p,SplitMemory:m}=runtime();const project={kind:'split-project',version:7,campaign:'Evaluation',assets:[],formats:[{id:'square',name:'Square',w:1080,h:1080}],checked:['square'],sources:[],outputs:[],baseBackground:'#ffffff',selectedIds:[],view:'grid'};
 for(let version=1;version<=7;version++){const checked=p.validate({...project,version});assert.equal(checked.version,7);assert.equal(checked.learning.version,3);const result=await p.decode(JSON.stringify(checked));assert.equal(result.project.learning.projectId,checked.learning.projectId);}
 for(let version=1;version<=3;version++){const input={...m.snapshot(),version};const migrated=m.normalize(input);assert.equal(migrated.version,3);assert.equal(migrated.projectId,input.projectId);}
});
test('corrupt optional applied metadata and future models cannot interrupt project decoding',()=>{
 const c=runtime(),m=c.SplitMemory,f=c.SplitEvaluation.fixture(c.SplitEvaluation.specs[0],'holdout',1),result=c.SplitLayout.compose(f,f.items);const out={...f,composition:result.template,layers:result.layers},images=new Map([[f.items[0].asset,{width:200,height:100}]]);m.record('generation',[out],{images});const memory=plain(m.snapshot());memory.records[0].outputs[0].applied=[{id:f.items[0].id,metrics:['rotation'],original:{rotation:Infinity}}];assert.equal(m.normalize(memory).records.length,0);const ordinary=plain(c.SplitLayout.compose(f,f.items));assert.deepEqual(plain(c.SplitLayout.compose(f,f.items,undefined,{learning:{project:{version:999,entries:[]},general:null}})),ordinary);
});
