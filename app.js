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
  try {
    request.send();
  } catch (e) {
    cb(null);
  }
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
    if (typeof(time) !== "number" || isNaN(time)) {
      return;
    }
    this.startTime = time;
  },

  setRepeat: function(isRepeat) {
    this.isRepeat = !!isRepeat;
  },

  setKeyCode: function(keyCode) {
    this.keyCode = keyCode;
  },

  // Pass null to revert to the default color
  setColor: function(color) {
    this.el.style.color = color || "unset";
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

  play: function(noEmit) {
    if (this._isPlaying || !this.buffer) {
      return;
    }

    this._isPlaying = true;
    this.el.classList.add("active");

    this.audioNode = this.sampler.getContext().createBufferSource();
    this.audioNode.loop = !!this.isRepeat;
    this.audioNode.connect(this.sampler.getDestination());
    this.audioNode.buffer = this.buffer;
    this.audioNode.start(0, this.startTime);

    if (!noEmit) {
      events.emit(this, "play", this);
    }
  },

  stop: function(noEmit) {
    if (!this._isPlaying || !this.buffer) {
      return;
    }

    this._isPlaying = false;
    this.el.classList.remove("active");
    this.audioNode.stop();

    if (!noEmit) {
      events.emit(this, "stop", this);
    }
  }
};

function ConfigScreen(el) {
  this.el = el;

  this.saveEl = this.el.querySelector("#save");
  this.cancelEl = this.el.querySelector("#cancel");

  this.urlEl = this.el.querySelector("#url");
  this.keyCodeEl = this.el.querySelector("#keyCode");
  this.startTimeEl = this.el.querySelector("#startTime");
  this.repeatEl = this.el.querySelector("#repeat");
  this.colorEl = this.el.querySelector("#color");

  document.addEventListener("keydown", function(e) {
    if (this.isConfigInputEvent(e)) {
      // Prevent typing in input fields from playing sounds
      e.stopPropagation();

      // Sample handling for the keyCode input
      if (e.target === this.keyCodeEl) {
        this.configuredKeyCode = e.keyCode;
        this.keyCodeEl.value = String.fromCharCode(e.keyCode);
        this.keyCodeEl.blur();
      }
    }

    if (e.keyCode === 13 && this._isShown) {
      // on Enter
      this.save();
    } else if (e.keyCode === 27 && this._isShown) {
      // on Escape
      this.revert();
    }
  }.bind(this), true);

  // Empty keyCodeEl on focus
  this.keyCodeEl.addEventListener("focus", function() {
    this.keyCodeEl.value = "";
  }.bind(this));

  this.saveEl.addEventListener("click", this.onSaveClick.bind(this));
  this.cancelEl.addEventListener("click", this.onCancelClick.bind(this));
}

ConfigScreen.prototype = {
  isConfigInputEvent: function(e) {
    return e.target === this.urlEl ||
           e.target === this.keyCodeEl ||
           e.target === this.startTimeEl ||
           e.target === this.repeatEl ||
           e.target === this.colorEl ||
           e.target === this.saveEl ||
           e.target === this.cancelEl;
  },

  show: function() {
    this._isShown = true;
    this.el.classList.add("display");
  },

  hide: function() {
    this._isShown = false;
    this.el.classList.remove("display");
  },

  configFor: function(sampleButton) {
    this.urlEl.value = sampleButton.url;
    this.keyCodeEl.value = String.fromCharCode(sampleButton.keyCode);
    this.startTimeEl.value = sampleButton.startTime;
    this.repeatEl.checked = sampleButton.isRepeat;
    var colorValue = sampleButton.el.style.color;
    this.colorEl.value = colorValue === "unset" ? "" : colorValue;

    this.currentButton = sampleButton;

    this.show();
  },

  onSaveClick: function() {
    this.save();
  },

  onCancelClick: function() {
    this.revert();
  },

  save: function() {
    if (this.currentButton) {
      this.currentButton.setSoundURL(this.urlEl.value);
      if (this.configuredKeyCode) {
        this.currentButton.setKeyCode(this.configuredKeyCode);
        this.configuredKeyCode = null;
      }
      this.currentButton.setStartTime(parseFloat(this.startTimeEl.value));
      this.currentButton.setRepeat(this.repeatEl.checked);
      this.currentButton.setColor(this.colorEl.value);
    }

    this.hide();
  },

  revert: function() {
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

  this.gain = this.audioContext.createGain();
  this.gain.connect(this.audioContext.destination);
  
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

  getButtons: function() {
    return this.sampleButtons;
  },

  getContext: function() {
    return this.audioContext;
  },

  getDestination: function() {
    return this.gain;
  },

  setGain: function(gain) {
    this.gain.gain.value = gain;
  }
};
