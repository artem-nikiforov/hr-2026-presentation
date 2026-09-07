(function (root) {
  'use strict';
  class Timeline {
    constructor(scenes, onChange = () => {}) {
      this.scenes=scenes; this.onChange=onChange; this.index=0; this.beat=0;
      this.phase='ready'; this.auto=false; this.token=0; this.elapsed=0;
      this.beatElapsed=0; this.starts=[0]; this.voiceDone=false; this.voiceEndedAt=0;
    }
    get scene(){return this.scenes[this.index];}
    get current(){return this.scene.beats[this.beat];}
    get playing(){return this.phase==='playing';}
    emit(type){this.onChange(type,this);}
    go(index, beat=0) {
      if(index<0 || index>=this.scenes.length) return false;
      this.index=index; this.beat=Math.max(0,Math.min(beat,this.scene.beats.length-1));
      this.starts=[]; this.elapsed=0;
      for(let j=0;j<=this.beat;j++){this.starts.push(this.elapsed);if(j<this.beat)this.elapsed+=this.scene.beats[j].seconds;}
      this.beatElapsed=0;this.voiceDone=false;this.voiceEndedAt=0;this.readySent=false;
      this.phase='playing';this.token++;this.emit('beat');return true;
    }
    finishVoice(token){if(token!==this.token)return;this.voiceDone=true;this.voiceEndedAt=this.beatElapsed;}
    next(){
      if(this.phase==='ready')return this.go(0);
      if(this.beat<this.scene.beats.length-1)return this.go(this.index,this.beat+1);
      if(this.index<this.scenes.length-1)return this.go(this.index+1);
      return this.go(0);
    }
    previous(){
      if(this.beat>0)return this.go(this.index,this.beat-1);
      if(this.index===0)return this.go(0,0);
      const prev=this.index-1;return this.go(prev,this.scenes[prev].beats.length-1);
    }
    pause(){if(this.playing){this.phase='paused';this.emit('pause');}}
    resume(){if(this.phase==='paused'){this.phase='playing';this.emit('resume');}else if(this.phase==='ready')this.go(0);else if(this.phase==='complete')this.go(this.index);}
    toggle(){this.playing?this.pause():this.resume();}
    setAuto(on){this.auto=on;this.emit('auto');if(on&&this.phase==='complete'&&this.index<this.scenes.length-1)this.go(this.index+1);}
    replay(){return this.go(this.index,0);}
    get done(){return this.phase==='complete';}
    tick(dt){
      if(!this.playing)return;
      this.elapsed+=dt;this.beatElapsed+=dt;
      if(!this.voiceDone||this.beatElapsed<this.current.seconds||this.beatElapsed-this.voiceEndedAt<.15)return;
      if(!this.auto){
        if(this.beat===this.scene.beats.length-1){this.phase='complete';this.emit('complete');}
        else if(!this.readySent){this.readySent=true;this.emit('ready');}
        return;
      }
      if(this.beat<this.scene.beats.length-1){
        this.beat++;this.starts.push(this.elapsed);this.beatElapsed=0;this.voiceDone=false;
        this.voiceEndedAt=0;this.readySent=false;this.token++;this.emit('beat');
      }else{
        this.phase='complete';this.emit('complete');
        if(this.auto&&this.index<this.scenes.length-1)this.go(this.index+1);
      }
    }
  }
  root.KUTimeline=Timeline;
  if(typeof module!=='undefined')module.exports=Timeline;
})(typeof globalThis!=='undefined'?globalThis:this);
