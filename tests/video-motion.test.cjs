/* Exercise the actual timeline with real GSAP and plain transform targets. */
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {gsap}=require('../dist/vendor/gsap.min.js');
const {animation,choices}=require('../dist/video-composition.js');
const code=fs.readFileSync(require.resolve('../dist/video-animation.js'),'utf8');
const keys=['x','y','scaleX','scaleY','rotation','opacity'];
const values=target=>keys.map(key=>target[key]);
for(const enter of choices.enter)for(const exit of choices.exit){
  const a=animation({start:.5,animation:{enter,exit,end:4.5,entryDuration:.8,exitDuration:.6}},6);
  const target={x:0,y:0,scaleX:1,scaleY:1,rotation:0,opacity:0,dataset:{start:'.5',animation:JSON.stringify(a)},decode:async()=>{}};
  const root={dataset:{duration:'6',height:'300',width:'400'},querySelectorAll:()=>[target]};
  const window={};vm.runInNewContext(code,{gsap,window,document:{querySelector:()=>root,images:[target]},Promise});
  const tl=window.SplitVideoTimeline;
  tl.seek(.7,true);const forward=values(target);assert(forward.every(Number.isFinite));
  if(enter==='spin')assert(Math.abs(target.rotation)>1);
  if(enter==='swing')assert.notEqual(target.rotation,0);
  if(['stretch','expand'].includes(enter))assert.notEqual(target.scaleX,target.scaleY);
  tl.seek(2,true);assert.deepEqual(values(target),[0,0,1,1,0,1]);
  tl.seek(4.2,true);assert(values(target).every(Number.isFinite));
  if(exit==='spin')assert(target.rotation>1);
  if(['stretch','expand'].includes(exit))assert.notEqual(target.scaleX,target.scaleY);
  tl.seek(5,true);assert.equal(target.opacity,0);
  tl.seek(.7,true);assert.deepEqual(values(target),forward);
  window.SplitVideoRebuild().seek(.7,true);assert.deepEqual(values(target),forward);
  window.SplitVideoTimeline.kill();
}
gsap.ticker.sleep();
console.log(`PASS: ${choices.enter.length*choices.exit.length} entrance/exit combinations, resting transforms, full rotation, swing, stretching, expansion, backward seek and rebuild.`);
