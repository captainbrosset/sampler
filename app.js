// TODO
// config screen to set url, start, repeat, key
// also to set icon for button and/or color
// 2 fingers tap to lock play
// main configure screen to select nb of pads
// record/replay
// drag/n/drop local audio files
// mobile viewport (no zoom)

"use strict";

function loadSoundURL(url, context, cb) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';
  request.onload = function() {
    context.decodeAudioData(request.response, function(buffer) {
      cb(buffer);
    }, function() {
      cb(null);
    });
  }
  request.send();
}

// Represents a single button on the pad.
// Can be bound to a given audio source.
// Can be assigned a key and some styling.
// The audio in the bound audio source can be played and stopped.
function SampleButton(el, sampler) {
  this.el = el;
  this.sampler = sampler;

  this.el.classList.add("disabled");

  this.onKeyDown = this.onKeyDown.bind(this);
  this.onKeyUp = this.onKeyUp.bind(this);
  this.onMouseDown = this.onMouseDown.bind(this);
  this.onMouseUp = this.onMouseUp.bind(this);
  this.onTouchStart = this.onTouchStart.bind(this);
  this.onTouchEnd = this.onTouchEnd.bind(this);

  document.addEventListener("keydown", this.onKeyDown);
  document.addEventListener("keyup", this.onKeyUp);

  this.el.addEventListener("mousedown", this.onMouseDown);
  this.el.addEventListener("mouseup", this.onMouseUp);

  this.el.addEventListener("touchstart", this.onTouchStart);
  this.el.addEventListener("touchend", this.onTouchEnd);

  this.startTime = 0;

  this.config = this.el.querySelector(".config");
  this.config.addE
}

SampleButton.prototype = {
  setSoundURL: function(url) {
    this.url = url;

    this.el.classList.remove("disabled");
    this.el.classList.add("loading");

    loadSoundURL(url, this.sampler.getContext(), function(buffer) {
      this.el.classList.remove("loading");
      if (!buffer) {
        this.el.classList.add("disabled");
        return;
      }
      this.buffer = buffer;
    }.bind(this));
  },

  setStartTime: function(time) {
    this.startTime = time;
  },

  setRepeat: function(isRepeat) {
    this.isRepeat = isRepeat;
  },

  setKeyCode: function(keyCode) {
    this.keyCode = keyCode;
  },

  onKeyDown: function(e) {
    if (this.keyCode && e.keyCode === this.keyCode) {
      this.play();
    }
  },

  onKeyUp: function(e) {
    if (this.keyCode && e.keyCode === this.keyCode) {
      this.stop();
    }
  },

  onMouseDown: function(e) {
    this.play();
  },

  onMouseUp: function(e) {
    this.stop();
  },

  onTouchStart: function(e) {
    // manage double tap
    this.play();
  },

  onTouchEnd: function(e) {
    this.stop();
  },

  play: function() {
    if (this._isPlaying || !this.buffer) {
      return;
    }

    this._isPlaying = true;
    this.el.classList.add("active");

    var context = this.sampler.getContext();
    this.audioNode = context.createBufferSource();
    this.audioNode.loop = !!this.isRepeat;
    this.audioNode.connect(context.destination); 
    this.audioNode.buffer = this.buffer;
    this.audioNode.start(0, this.startTime);
  },

  stop: function() {
    if (!this._isPlaying || !this.buffer) {
      return;
    }

    this._isPlaying = false;
    this.el.classList.remove("active");
    this.audioNode.stop();
  }
};

function ConfigScreen(el) {
  this.el = el;

  this.saveEl = this.el.querySelector("#save");
  this.cancelEl = this.el.querySelector("#cancel");

  this.saveEl.addEventListener("click", this.onSaveClick.bind(this));
  this.cancelEl.addEventListener("click", this.onCancelClick.bind(this));
}

ConfigScreen.prototype = {
  show: function() {
    this.el.classList.add("display");
  },

  hide: function() {
    this.el.classList.remove("display");
  },

  configFor: function(sampleButton) {
    this.el.querySelector("#url").value = sampleButton.url;
    this.el.querySelector("#keyCode").value = String.fromCharCode(sampleButton.keyCode);
    this.el.querySelector("#startTime").value = sampleButton.startTime;
    this.el.querySelector("#repeat").checked = sampleButton.isRepeat;

    this.show();
  },

  onSaveClick: function() {
    this.hide();
  },

  onCancelClick: function() {
    this.hide();
  }
};

// Main sampler API. Provide an element that contains .sample-button elements.
// For each of these, a SampleButton instance will be created and can then be
// accessed via getButton.
function Sampler(el) {
  this.el = el;

  this.configScreen = new ConfigScreen(this.el.querySelector(".config-screen"));

  this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  var els = [].slice.call(this.el.querySelectorAll(".sample-button"));
  this.sampleButtons = [];
  for (var i = 0; i < els.length; i ++) {
    var sampleButton = new SampleButton(els[i], this);
    this.sampleButtons.push({
      el: els[i],
      button: sampleButton
    });
    els[i].querySelector(".config").addEventListener("mousedown", (function(btn) {
      return function(e) {
        e.stopPropagation();
        this.configScreen.configFor(btn);
      }.bind(this);
    }.bind(this))(sampleButton));
  }
}

Sampler.prototype = {
  // Pass either the index of the button in the sampler or the button element
  // itself.
  getButton: function(indexOrEl) {
    if (typeof indexOrEl === "number") {
      indexOrEl = this.el.querySelectorAll(".sample-button")[indexOrEl];
    }
    for (var i = 0; i < this.sampleButtons.length; i ++) {
      if (this.sampleButtons[i].el === indexOrEl) {
        return this.sampleButtons[i].button;
      }
    }
    return null;
  },

  getContext: function() {
    return this.audioContext;
  }
};

// Let's get started!
var sampler;
window.addEventListener("DOMContentLoaded", function() {

  sampler = new Sampler(document.querySelector(".sampler"));

  var sample = sampler.getButton(0);
  sample.setSoundURL("sounds/BD0000.mp3");
  sample.setKeyCode(81);

  var sample = sampler.getButton(1);
  sample.setSoundURL("sounds/CB.mp3");
  sample.setKeyCode(87);

  var sample = sampler.getButton(2);
  sample.setSoundURL("sounds/CH.mp3");
  sample.setKeyCode(69);

  var sample = sampler.getButton(3);
  sample.setSoundURL("sounds/CL.mp3");
  sample.setKeyCode(65);

  var sample = sampler.getButton(4);
  sample.setSoundURL("sounds/memoryloss.mp3");
  sample.setKeyCode(83);
  sample.setRepeat(true);

  var sample = sampler.getButton(5);
  sample.setSoundURL("sounds/scifi5.mp3");
  sample.setKeyCode(68);
  sample.setRepeat(true);

  var sample = sampler.getButton(6);
  sample.setSoundURL("sounds/SD0010.mp3");
  sample.setKeyCode(90);

  var sample = sampler.getButton(7);
  sample.setSoundURL("sounds/SD0050.mp3");
  sample.setKeyCode(88);

  var sample = sampler.getButton(8);
  sample.setSoundURL("sounds/system_shutdown.mp3");
  sample.setKeyCode(67);
  sample.setRepeat(true);

});
