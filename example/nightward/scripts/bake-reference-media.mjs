import { spawn, spawnSync } from 'node:child_process'
import { createWriteStream, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'

export async function bakeReferenceMedia({ root, output, code, helpersCode, uiOnly = false }) {
  const temporary = await mkdtemp(join(tmpdir(), 'nightward-media-'))
  const chrome = process.env.NIGHTWARD_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const encoder = process.env.NIGHTWARD_FFMPEG || 'ffmpeg'
  let finish, reject
  const completed = new Promise((resolve, fail) => { finish = resolve; reject = fail })
  const uiCues = { Tick: 'tick', Stamp: 'stamp', Swoosh: 'swoosh' }
  const cueFiles = uiOnly ? uiCues : { ...uiCues, Cursor: 'select', Confirm: 'confirm', Cancel: 'back', Hit: 'hit', Pickup: 'gem', Level: 'levelUp', Chest: 'chest', Hurt: 'hurt', Lightning: 'storm', Flask: 'flask', Reaper: 'roar', Relic: 'boom', Lash: 'lash', Wand: 'wand', Tomes: 'tomes', Ward: 'ward', Title: 'title', Warn: 'warn', Victory: 'victory', Defeat: 'death' }
  const script = `
const helpers = ${helpersCode};
const {y5,x5,w5,d_,f_,Ts,hn,Mx} = helpers;
class Fe { constructor(options){ Object.assign(this,options); } update(){} }
class kt { constructor(x,y,width,height){ Object.assign(this,{x,y,width,height}); } }
class U { constructor(options){ Object.assign(this,options); this.frame??=new kt(0,0,this.source.resource.width,this.source.resource.height); this.orig=this.frame; } }
class ts {constructor(options){Object.assign(this,options)}}
const fp=()=>{};
${code}
const post=(name,body)=>fetch('/file/'+name,{method:'POST',body}).then(response=>{if(!response.ok)throw new Error(name+': '+response.status)});
const frame=texture=>({x:texture.frame.x,y:texture.frame.y,width:texture.frame.width,height:texture.frame.height});
async function png(name,canvas){ const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));await post(name+'.png',blob); }
async function main(){
  const ui = new Y();
  await png('ui-pixels',ui._canvas);await png('ui-soft',ui._softCanvas);await png('moon',gR().source.resource);
  const glyphs=w5().map((glyph,index)=>({char:glyph.char,advance:ui.advance[index],frames:ui.glyphs.map(style=>frame(style[index])),bigFrames:ui.bigGlyphs.map(style=>frame(style[index]))}));
  const parts=Object.fromEntries(['white','panel','panelHot','barFrame','thinFrame','xpFill','hpFill','slot','pipOn','pipOff','cursor','diamond','sparkle','ring','knob','pauseBars','speakerOn','speakerOff','fullscreenEnter','fullscreenExit','keycap','dmgFill'].map(name=>[name,frame(ui[name])]));
  await post('ui.json',JSON.stringify({glyphs,parts,space:y5,cap:x5}));
  function wav(buffer,startFrame=0,frameCount=buffer.length-startFrame){
    const bytes=new ArrayBuffer(44+frameCount*4),view=new DataView(bytes);
    const text=(at,value)=>{for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i))};
    text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,frameCount*4,true);
    const left=buffer.getChannelData(0),right=buffer.getChannelData(1);
    for(let i=0;i<frameCount;i++){view.setInt16(44+i*4,Math.max(-32768,Math.min(32767,left[startFrame+i]*32767)),true);view.setInt16(46+i*4,Math.max(-32768,Math.min(32767,right[startFrame+i]*32767)),true)}
    return bytes;
  }
  async function render(name,kind,cue){
    const loop=kind==='music'?BP[cue].beat*BP[cue].beats:0,duration=loop?loop*2:12;
    const ctx=new OfflineAudioContext(2,Math.ceil(duration*44100),44100);
    ctx.suspend=()=>Promise.resolve();
    globalThis.AudioContext=class{constructor(){return ctx}};
    const audio=new pz(),graph=audio._built;
    if(loop){audio._startTrack(graph,0,cue);audio._tracks[cue].start=0;audio._schedule(graph,cue,0,duration)}
    else {if(!qP[cue])throw new Error('Missing reference cue '+cue);qP[cue](graph.synth,graph.cue,.05,0,0,1)}
    const result=await ctx.startRendering();
    const start=loop?Math.round(loop*44100):0;
    let count=loop?Math.floor(loop*44100):result.length;
    if(!loop){const left=result.getChannelData(0),right=result.getChannelData(1);while(count>1&&Math.abs(left[count-1])+Math.abs(right[count-1])<.00002)count--;count=Math.min(result.length,count+2205)}
    await post(name+'.wav',wav(result,start,count));
  }
  if(!${uiOnly}){await render('Nightward','music','game');await render('Reaper','music','boss');}
  for(const [name,cue] of Object.entries(${JSON.stringify(cueFiles)}))await render(name,'cue',cue);
  await fetch('/done',{method:'POST'});
}
main().catch(error=>fetch('/error',{method:'POST',body:error.stack||String(error)}));
`
  const server = createServer(async (request, response) => {
    try {
      if (request.url === '/') { response.setHeader('Content-Type', 'text/html'); response.end(`<html><body><script>${script.replaceAll('</script', '<\\/script')}</script></body></html>`); return }
      if (request.url === '/done') { response.end('done'); finish(); return }
      if (request.url === '/error') { let message = ''; for await (const part of request) message += part; response.end(); reject(new Error(message)); return }
      const filename = request.url?.slice('/file/'.length)
      if (!request.url?.startsWith('/file/') || !/^[\w-]+\.(png|json|wav)$/.test(filename)) { response.statusCode = 404; response.end(); return }
      const destination = filename.endsWith('.wav') ? join(temporary, filename) : join(output, filename)
      await pipeline(request, createWriteStream(destination))
      response.end('ok')
    }
    catch (error) { response.statusCode = 500; response.end(String(error)); reject(error) }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${join(temporary, 'chrome')}`, `http://127.0.0.1:${server.address().port}/`], { stdio: ['ignore', 'ignore', 'pipe'] })
  const exited = new Promise(resolve => browser.once('exit', resolve))
  let errors = ''
  browser.stderr.on('data', part => { errors = (errors + part).slice(-4000) })
  browser.on('error', reject)
  browser.on('exit', (code, signal) => { if (code !== 0 || signal) reject(new Error(`Media renderer exited ${code ?? signal}: ${errors}`)) })
  try {
    await completed
    for (const name of [...uiOnly ? [] : ['Nightward', 'Reaper'], ...Object.keys(cueFiles)]) {
      const folder = name === 'Nightward' || name === 'Reaper' ? 'bgm' : name === 'Victory' || name === 'Defeat' ? 'me' : 'se'
      const encoding = spawnSync(encoder, ['-hide_banner', '-loglevel', 'error', '-y', '-i', join(temporary, `${name}.wav`), '-c:a', 'libvorbis', '-q:a', '5', `${root}audio/${folder}/${name}.ogg`], { stdio: 'inherit' })
      if (encoding.status !== 0) throw new Error(`Encoding failed: ${name}`)
    }
    if (!uiOnly) writeFileSync(`${root}audio/bgm/Dawn.ogg`, readFileSync(`${root}audio/bgm/Nightward.ogg`))
    console.log(uiOnly ? 'Baked the reference UI, both glyph sizes, and UI sound cues.' : 'Baked the reference UI atlas, glyphs, moon, two music scores, and all sound cues.')
  }
  finally {
    if (browser.pid) { browser.kill(); await exited }
    await new Promise(resolve => server.close(resolve))
    rmSync(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}
