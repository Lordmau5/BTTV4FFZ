/*
    This file is being updated on my server (cdn.lordmau5.com) first before changes to the GitHub repo happen.
    It will not be embedded in the addon anymore.
    This makes it easier for me to do updates when necessary (sudden FFZ-API changes, for example)
*/

(function(){

// Global Storage / Settings

var version = "1.3.9";

var _initialized,

    api,
    ffz,
    last_emote_set_id = 9000,
    channels = {},
    enable_global_emotes,
    enable_gif_emotes,
    enable_override_emotes,
    enable_pro_emotes,

    socketClient;

var global_emotes_loaded = false,
    gif_emotes_loaded = false;

var override_emotes = [ ":'(", "D:" ];
var isOverrideEmote = function(emote_regex) {
    for(var i = 0; i < override_emotes.length; i++) {
        if(emote_regex === override_emotes[i])
            return true;
    }
    return false;
};

// Initialization

var check_existance = function(attempts) {
    if (window.FrankerFaceZ !== undefined && window.jQuery !== undefined && window.App !== undefined) {
        // Register with FFZ.
        ffz = FrankerFaceZ.get();

        // Check for BTTV
        if (ffz.has_bttv) {
            console.log("BTTV was found. BTTV4FFZ will not work in combination with it.");
            return;
        }
        api = ffz.api("BetterTTV", "https://cdn.betterttv.net/tags/developer.png", version);
        socketClient = new SocketClient();

        api.log("Injected successfully.");

        // Create emote URLs.
        api.emote_url_generator = function(set_id, emote_id) {
            return "https://manage.betterttv.net/emotes/" + emote_id;
        };

        doSettings();
        setupAPIHooks();

        implementBTTVBadges();
        if (enable_global_emotes)
            implementBTTVGlobals();

        if(enable_pro_emotes) {
            socketClient.connect();
        }
    }
    else {
        attempts = (attempts || 0) + 1;
        if (attempts < 60)
            return setTimeout(check_existance.bind(this, attempts), 1000);

        console.log("Could not find FFZ. Injection unsuccessful.");
    }
};


var doSettings = function() {
    FrankerFaceZ.settings_info.bttv_global_emotes = {
        type: "boolean",
        value: true,
        category: "BTTV4FFZ",
        name: "Global Emoticons",
        help: "Enable this to make the BTTV global emotes available.",
        on_update: function(enabled) {
            if (!global_emotes_loaded) {
                if (enabled)
                    implementBTTVGlobals();
                return;
            }

            if (enabled) {
                api.register_global_set(1);

                if(enable_gif_emotes)
                    api.register_global_set(2);

                if(enable_override_emotes)
                    api.register_global_set(3);
            }
            else {
                api.unregister_global_set(1);
                api.unregister_global_set(2);
                api.unregister_global_set(3);
            }

            enable_global_emotes = enabled;
        }
    };

    enable_global_emotes = ffz.settings.get("bttv_global_emotes");

    FrankerFaceZ.settings_info.bttv_allow_gif_emotes = {
        type: "boolean",
        value: false,
        category: "BTTV4FFZ",
        name: "GIF Emoticons",
        help: "Enable this to show GIF emotes.",
        on_update: function(enabled) {
            if (enabled) {
                if(enable_global_emotes)
                    api.register_global_set(2);

                var i = channels.length;
                while(i--) {
                    var name = channels[i];
                    api.register_room_set(name, channels[name]["gifemotes_setid"], channels[name]["gifemotes"]);
                }
            }
            else {
                api.unregister_global_set(2);

                var i = channels.length;
                while(i--) {
                    var name = channels[i];
                    if(channels[name]["gifemotes_still"])
                        api.register_room_set(name, channels[name]["gifemotes_setid"], channels[name]["gifemotes_still"]);
                    else
                        api.unload_set(channels[name]["gifemotes_setid"]);
                }
            }

            enable_gif_emotes = enabled;
        }
    };

    enable_gif_emotes = ffz.settings.get("bttv_allow_gif_emotes");

    FrankerFaceZ.settings_info.bttv_enable_override_emotes = {
        type: "boolean",
        value: false,
        category: "BTTV4FFZ",
        name: "Enable Override Emotes",
        help: "Enable this to show override emotes (like D:).",
        on_update: function(enabled) {
            if (enabled) {
                if(enable_global_emotes)
                    api.register_global_set(3);
            }
            else {
                api.unregister_global_set(3);
            }

            enable_override_emotes = enabled;
        }
    };

    enable_override_emotes = ffz.settings.get("bttv_enable_override_emotes");

    FrankerFaceZ.settings_info.bttv_enable_pro_emotes = {
        type: "boolean",
        value: true,
        category: "BTTV4FFZ",
        name: "Enable BTTV Pro Emotes",
        help: "Enable this to show Pro emotes from other users. (Requires refresh!)",
        on_update: function(enabled) {
            if(!enabled) {
                var i = bttv_pro_users.length;
                while(i--) {
                    var user = bttv_pro_users[i];
                    api.unload_set(user._id_emotes);
                }
            }

            enable_pro_emotes = enabled;
        }
    };

    enable_pro_emotes = ffz.settings.get("bttv_enable_pro_emotes");

    FrankerFaceZ.settings_info.bttv_show_emotes_in_menu = {
        type: "boolean",
        value: true,
        category: "BTTV4FFZ",
        name: "Show emotes in Emoticon Menu",
        help: "Enable this to show the emotes in the Emoticon Menu (you can still enter the emotes manually when this is disabled)",
        on_update: function(enabled) {
            api.emote_sets[1].hidden = !enabled;
            api.emote_sets[2].hidden = !enabled;
            api.emote_sets[3].hidden = !enabled;

            for(var name in channels) {
                api.log(name);
                api.emote_sets[channels[name]["emotes"]].hidden = !enabled;
                api.emote_sets[channels[name]["gifemotes_setid"]].hidden = !enabled;
            }
        }
    };

    show_emotes_in_menu = ffz.settings.get("bttv_show_emotes_in_menu");
};


var setupAPIHooks = function() {
    api.on('room-add', channelCallback);
    api.on('room-message', chatFilter);

    api.iterate_rooms();
};

var chatFilter = function(msg) {
    if(enable_pro_emotes && ffz.get_user() && msg.from === ffz.get_user().login) {
        socketClient.broadcastMe(msg.room);
    }
};

var hatEmotes = [
  "HalloHalo",
  "HalloFedora",
  "HalloHorns",
  "HalloWitch",
  "HalloKKona",
  "HalloPirate"
];

var channelCallback = function(room_id, reg_function, attempts) {
    if(enable_pro_emotes) {
        socketClient.joinChannel(room_id);
    }

    $.getJSON("https://api.betterttv.net/2/channels/" + room_id)
    .done(function(data) {
        var channelBTTV = new Array(),
            channelBTTV_GIF = new Array(),
            emotes = data["emotes"];

        var i = emotes.length;
        while(i--) {
        	var req_spaces = /[^A-Za-z0-9]/.test(emotes[i]["code"]);

            var emote = emotes[i],
                id = emote["id"],

            xMote = {
                urls: {
                    1: "https://cdn.betterttv.net/emote/" + id + "/1x",
                    2: "https://cdn.betterttv.net/emote/" + id + "/2x",
                    4: "https://cdn.betterttv.net/emote/" + id + "/3x"
                },
                id: id,
                name: emote["code"],
                width: 28,
                height: 28,
                owner: {
                    display_name: emote["channel"] || room_id,
                    name: emote["channel"]
                },
                require_spaces: req_spaces
            };

            if (emote["imageType"] === "png")
                channelBTTV.push(xMote);

            if (emote["imageType"] === "gif")
                channelBTTV_GIF.push(xMote);
        }

        if (!channelBTTV.length && !channelBTTV_GIF.length)
            return;

        channels[room_id] = {
            emotes: last_emote_set_id,
            gifemotes_setid: last_emote_set_id + 1
        };
        last_emote_set_id += 2;

        var set = {
            emoticons: channelBTTV,
            title: "Emoticons"
        };

        if(channelBTTV.length) {
            api.register_room_set(room_id, channels[room_id]["emotes"], set); // Load normal emotes
            api.emote_sets[channels[room_id]["emotes"]].hidden = !show_emotes_in_menu;
        }

        set = {
            emoticons: channelBTTV_GIF,
            title: "Emoticons (GIF)"
        };

        channels[room_id]["gifemotes"] = jQuery.extend(true, {}, set);
        var tempStillEmotes = jQuery.extend(true, {}, set);

        var stillEmotes = tempStillEmotes["emoticons"];

        i = stillEmotes.length;
        while(i--) {
            var element = stillEmotes[i];
            var j = element["urls"].length;
            while(j--) {
                var key = element["urls"][i];
                var img = new Image();

                img.onload = (function(array_index, size) {
                    var canvas = document.createElement("canvas");
                    var ctx = canvas.getContext("2d");

                    canvas.width = this.width;
                    canvas.height = this.height;

                    ctx.drawImage(this, 0, 0);

                    if(!channels[room_id]["gifemotes_still"]) {
                        channels[room_id]["gifemotes_still"] = tempStillEmotes;
                    }

                    stillEmotes[array_index]["urls"][size] = canvas.toDataURL();

                    api.register_room_set(room_id, channels[room_id]["gifemotes_setid"], channels[room_id]["gifemotes_still"]); // Load static GIF emotes
                    api.emote_sets[channels[room_id]["gifemotes_setid"]].hidden = !show_emotes_in_menu;
                }).bind(img, i, key);
                img.onerror = function(errorMsg, url, lineNumber, column, errorObj) {
                  console.log("Couldn't load.");
                };
                img.crossOrigin = "anonymous";
                img.src = element["urls"][key] + ".png";
            }
        }

        api.register_room_set(room_id, channels[room_id]["gifemotes_setid"], set); // Load GIF emotes
        api.emote_sets[channels[room_id]["gifemotes_setid"]].hidden = !show_emotes_in_menu;

        if(!enable_gif_emotes)
            api.unload_set(channels[room_id]["gifemotes_setid"]);
    }).fail(function(data) {
        if (data["status"] === 404) {
            return;
        }

        attempts = (attempts || 0) + 1;
        if (attempts < 12) {
            api.log("Failed to fetch BTTV channel emotes. Trying again in 5 seconds.");
            return setTimeout(channelCallback.bind(this, room_id, reg_function, attempts), 5000);
        }
    });
};

var implementBTTVGlobals = function(attempts) {
    $.getJSON("https://api.betterttv.net/emotes")
    .done(function(data) {
        var globalBTTV = new Array(),
            globalBTTV_GIF = new Array(),
            overrideEmotes = new Array(),

            emotes = data["emotes"];

        var i = emotes.length;
        while(i--) {
        	var req_spaces = /[^A-Za-z0-9]/.test(emotes[i]["regex"]);

            var emote = emotes[i],
                match = /cdn.betterttv.net\/emote\/(\w+)/.exec(emote["url"]),
                id = match && match[1];

            if (emote["channel"])
                continue;

            var xMote = {
                urls: { 1: emote["url"] },
                name: emote["regex"],
                width: emote["width"],
                height: emote["height"],
                require_spaces: req_spaces
            };

            if (id) {
                xMote["id"] = id;
                xMote["urls"] = {
                    1: "https://cdn.betterttv.net/emote/" + id + "/1x",
                    2: "https://cdn.betterttv.net/emote/" + id + "/2x",
                    4: "https://cdn.betterttv.net/emote/" + id + "/3x"
                };
            }

            if (hatEmotes.indexOf(emote["regex"]) != -1) {
                xMote["margins"] = "0px 0px 0px -28px";
                xMote["modifier"] = true;
            }

            if(isOverrideEmote(emote["regex"]))
                overrideEmotes.push(xMote);
            else {
              emote["imageType"] === "gif" ? globalBTTV_GIF.push(xMote) : globalBTTV.push(xMote);
            }
        }

        var set = {
            emoticons: globalBTTV
        };
        api.register_global_set(1, set);
        if(!enable_global_emotes)
            api.unregister_global_set(1);
        api.emote_sets[1].hidden = !show_emotes_in_menu;

        set = {
            emoticons: globalBTTV_GIF,
            title: "Global Emoticons (GIF)"
        };
        api.register_global_set(2, set);
        if(!enable_global_emotes || !enable_gif_emotes)
            api.unregister_global_set(2);
        api.emote_sets[2].hidden = !show_emotes_in_menu;

        set = {
            emoticons: overrideEmotes,
            title: "Global Emoticons (Override)"
        };
        api.register_global_set(3, set);
        if(!enable_global_emotes || !enable_override_emotes)
            api.unregister_global_set(3);
        api.emote_sets[3].hidden = !show_emotes_in_menu;

        global_emotes_loaded = true;

    }).fail(function(data) {
        if (data["status"] === 404)
            return;

        attempts = (attempts || 0) + 1;
        if (attempts < 12) {
            api.log("Failed to fetch BTTV global emotes. Trying again in 5 seconds.");
            return setTimeout(implementBTTVGlobals.bind(this, attempts), 5000);
        }
    });
};

var implementBTTVBadges = function(attempts) {
    api.add_badge("bttv4ffz", {
        name: "bttv4ffz",
        title: "BTTV4FFZ Developer",
        image: "https://cdn.lordmau5.com/Mau5Badge.png",
        alpha_image: "https://cdn.lordmau5.com/Mau5Badge_Alpha.png",
        color: "#49acff"
    });
    api.user_add_badge("lordmau5", 20, "bttv4ffz");

    $.getJSON("https://api.betterttv.net/2/badges")
    .done(function(data) {
        var types = new Array(),
            badges = new Array(),

            _types = data["types"],
            _users = data["badges"];

        var i = _types.length;
        while(i--) {
            var _type = _types[i];

            var type = {
                name: _type.name,
                title: _type.description,
                image: _type.svg,
                no_invert: true
            };

            types[type.name] = type;
            api.add_badge(type.name, type);
        }

        i = _users.length;
        while(i--) {
            var _user = _users[i];

            if(types[_user.type] !== undefined) {
                api.log("Adding badge '" + _user.type + "' for user '" + _user.name + "'.");
                api.user_add_badge(_user.name, 21, _user.type);
            }
        }
    }).fail(function(data) {
        if (data["status"] === 404)
            return;

        attempts = (attempts || 0) + 1;
        if (attempts < 12) {
            api.log("Failed to fetch BTTV badges emotes. Trying again in 5 seconds.");
            return setTimeout(implementBTTVBadges.bind(this, attempts), 5000);
        }
    });
};

/* Attempt on hooking into the BTTV WebSocket servers for BTTV-Pro emotes */
var bttv_pro_users = {};

BTTVProUser = function(username, emotes_array) {
    this.username = username;
    this.emotes_array = emotes_array;

    this.initialize();

    bttv_pro_users[this.username] = this;
};

BTTVProUser.prototype.loadEmotes = function() {
    this.emotes_array.forEach(function(emote, index, array) {
      var xMote = {
          urls: {
              1: "https://cdn.betterttv.net/emote/" + emote["id"] + "/1x",
              2: "https://cdn.betterttv.net/emote/" + emote["id"] + "/2x",
              4: "https://cdn.betterttv.net/emote/" + emote["id"] + "/3x"
          },
          id: emote["id"],
          name: emote["code"],
          width: 28,
          height: 28,
          owner: {
              display_name: emote["channel"] || "",
              name: emote["channel"]
          },
          require_spaces: true
      };

      if(emote["imageType"] === "png")
          this.emotes.push(xMote);

      if(emote["imageType"] === "gif")
          this.gif_emotes.push(xMote);
    }, this);

    var set = {
        emoticons: this.emotes,
        title: "Personal Emotes"
    };

    if(this.emotes.length) {
        api.load_set(this._id_emotes, set);
        api.user_add_set(this.username, this._id_emotes);
    }
};

BTTVProUser.prototype.initialize = function() {
    this._id_emotes = this.username + "_images";
    this.emotes = new Array();

    this.loadEmotes();
};

var bttv_pro_events = {};

// BetterTTV Pro
bttv_pro_events.lookup_user = function(subscription) {
    if (!subscription.pro || !enable_pro_emotes) return;

    if (subscription.pro && subscription.emotes) {
        if(subscription.name in bttv_pro_users) {
            bttv_pro_users[subscription.name].emotes_array = subscription.emotes;
            bttv_pro_users[subscription.name].loadEmotes();
        }
        else {
            new BTTVProUser(subscription.name, subscription.emotes);
        }
    }
};

SocketClient = function() {
    this.socket = false;
    this._lookedUpUsers = [];
    this._connected = false;
    this._connecting = false;
    this._connectAttempts = 1;
    this._joinedChannels = [];
    this._connectionBuffer = [];
    this._events = bttv_pro_events;
}

SocketClient.prototype.connect = function() {
    if (ffz.get_user() === undefined) return;
    if (this._connected || this._connecting) return;
    this._connecting = true;

    api.log('SocketClient: Connecting to Beta BetterTTV Socket Server');

    var _self = this;
    this.socket = new WebSocket('wss://sockets.betterttv.net/ws');

    this.socket.onopen = function() {
        api.log('SocketClient: Connected to Beta BetterTTV Socket Server');

        _self._connected = true;
        _self._connectAttempts = 1;

        if(_self._connectionBuffer.length > 0) {
          var i = _self._connectionBuffer.length;
          while(i--) {
            var channel = _self._connectionBuffer[i];
            _self.joinChannel(channel);
            _self.broadcastMe(channel);
          }
          _self._connectionBuffer = [];
        }
    };

    this.socket.onerror = function() {
        api.log('SocketClient: Error from Beta BetterTTV Socket Server');

        _self._connectAttempts++;
        _self.reconnect();
    };

    this.socket.onclose = function() {
        if (!_self._connected || !_self.socket) return;

        api.log('SocketClient: Disconnected from Beta BetterTTV Socket Server');

        _self._connectAttempts++;
        _self.reconnect();
    };

    this.socket.onmessage = function(message) {
        var evt;

        try {
            evt = JSON.parse(message.data);
        }
        catch (e) {
            debug.log('SocketClient: Error Parsing Message', e);
        }

        if (!evt || !(evt.name in _self._events)) return;

        api.log('SocketClient: Received Event');
        api.log(evt);

        _self._events[evt.name](evt.data);
    };
};

SocketClient.prototype.reconnect = function() {
    var _self = this;

    this.disconnect();

    if (this._connecting === false) return;
    this._connecting = false;

    setTimeout(function() {
        _self.connect();
    }, Math.random() * (Math.pow(2, this._connectAttempts) - 1) * 30000);
};

SocketClient.prototype.disconnect = function() {
    var _self = this;

    if (this.socket) {
        try {
            this.socket.close();
        }
        catch (e) {}
    }

    delete this.socket;

    this._connected = false;
};

SocketClient.prototype.emit = function(evt, data) {
    if (!this._connected || !this.socket) return;

    this.socket.send(JSON.stringify({
        name: evt,
        data: data
    }));
};

// Introduce myself
SocketClient.prototype.broadcastMe = function(channel) {
    if (!this._connected) return;
    if (!ffz.get_user()) return;

    this.emit('broadcast_me', { name: ffz.get_user().login, channel: channel });
};

SocketClient.prototype.joinChannel = function(channel) {
    if (!this._connected) {
      if (!this._connectionBuffer.includes(channel))
        this._connectionBuffer.push(channel);
      return;
    }

    if (!channel.length) return;

    if (this._joinedChannels[channel]) {
        this.emit('part_channel', { name: channel });
    }

    this.emit('join_channel', { name: channel });
    this._joinedChannels[channel] = true;
};

// Finally, load.
check_existance();
})();
