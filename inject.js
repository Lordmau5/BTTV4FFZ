// Version naming: (Main-version).(Sub-version)
// Version: 1.0.7.2

/*
    This file is being updated on my server (cdn.lordmau5.com) first before changes to the GitHub repo happen.
    It will not be embedded in the addon anymore.
    This makes it easier for me to do updates when necessary (sudden FFZ-API changes, for example)
*/

(function(){

// Global Storage / Settings

var api,
    ffz,
    enable_global_emotes,
    enable_gif_emotes,
    enable_override_emotes;

var global_emotes_loaded = false,
    gif_emotes_loaded = false;

var override_emotes = [ ":'(", "D:" ];
var isOverrideEmote = function(emote_regex) {
    if (enable_override_emotes)
      return false;

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
        api = ffz.api("BetterTTV", "https://cdn.betterttv.net/tags/developer.png");

        api.log("Injected successfully.");

        // Create emote URLs.
        api.emote_url_generator = function(set_id, emote_id) {
            return "https://manage.betterttv.net/emotes/" + emote_id;
        };

        // Start loading stuff.
        doSettings();
        setupChannelLoading();

        if (enable_global_emotes)
            implementBTTVGlobals();

    }
    else {
        attempts = (attempts || 0) + 1;
        if (attempts < 60)
            return setTimeout(check_existance.bind(this, attempts), 1000);

        console.log("BTTV4FFZ: Could not find FFZ. Injection unsuccessful.");
    }
};


var doSettings = function() {

    // TODO: Add version list-option
    /*FrankerFaceZ.settings_info.bttv_version = {
        category: "BTTV4FFZ",
        name: "Current Version: 1.0.7.1"
    };*/

    //enable_override_emotes = ffz.settings.get("bttv_enable_override_emotes");

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

                if(enable_gif_emotes && gif_emotes_loaded)
                    api.register_global_set(2);
            }
            else {
                api.unregister_global_set(1);

                if(enable_gif_emotes && gif_emotes_loaded)
                    api.unregister_global_set(2);
            }
        }
    };

    enable_global_emotes = ffz.settings.get("bttv_global_emotes");


    FrankerFaceZ.settings_info.bttv_allow_gif_emotes = {
        type: "boolean",
        value: false,
        category: "BTTV4FFZ",
        name: "GIF Emoticons <span>(Refresh required!)</span>",
        help: "Enable this to show those shitty things."
    };

    enable_gif_emotes = ffz.settings.get("bttv_allow_gif_emotes");

    FrankerFaceZ.settings_info.bttv_enable_override_emotes = {
        type: "boolean",
        value: true,
        category: "BTTV4FFZ",
        name: "Enable Override Emotes <span>(Refresh required!)</span>",
        help: "Enable this to show override emotes (like D:)."
    };

    enable_override_emotes = ffz.settings.get("bttv_enable_override_emotes");
};


var setupChannelLoading = function() {
    api.register_on_room_callback(channelCallback);
};


var channelCallback = function(room_id, reg_function, attempts) {
    $.getJSON("https://api.betterttv.net/2/channels/" + room_id)
        .done(function(data) {
            var channelBTTV = new Array(),
                emotes = data["emotes"];

            for(var i = 0; i < emotes.length; i++) {
            	var req_spaces = /[^A-Za-z0-9]/.test(emotes[i]["code"]);

                var emote = emotes[i],
                    id = emote["id"],

                    xMote = {
                        urls: {
                            1: "//cdn.betterttv.net/emote/" + id + "/1x",
                            2: "//cdn.betterttv.net/emote/" + id + "/2x",
                            4: "//cdn.betterttv.net/emote/" + id + "/3x"
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

                if (emote["imageType"] === "png" || (emote["imageType"] === "gif" && enable_gif_emotes))
                    channelBTTV.push(xMote);
            }

            if (!channelBTTV.length)
                return;

            var set = {
                emoticons: channelBTTV
            };

            reg_function(room_id, set);

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

                emotes = data["emotes"];

            for(var i = 0; i < emotes.length; i++) {
            	var req_spaces = /[^A-Za-z0-9]/.test(emotes[i]["regex"]);

                var emote = emotes[i],
                    match = /cdn.betterttv.net\/emote\/(\w+)/.exec(emote["url"]),
                    id = match && match[1];

                if (emote["channel"] || isOverrideEmote(emote["regex"]))
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
                        1: "//cdn.betterttv.net/emote/" + id + "/1x",
                        2: "//cdn.betterttv.net/emote/" + id + "/2x",
                        4: "//cdn.betterttv.net/emote/" + id + "/3x"
                    };
                }

                // TODO: Dynamically rework for event emoticons
                // if(emote["regex"] === "halloHat" || emote["regex"] === "halloPirate" || emote["regex"] === "halloEars" || emote["regex"] === "halloHorns")
                //     xMote["margins"] = "-8px 8px 0px -30px";

                emote["imageType"] === "gif" ? globalBTTV_GIF.push(xMote) : globalBTTV.push(xMote);
            }

            var set = {
                emoticons: globalBTTV
            };

            api.register_global_set(1, set);

            if (enable_gif_emotes) {
                set = {
                    emoticons: globalBTTV_GIF,
                    title: "Global Emoticons (GIF)"
                };
                api.register_global_set(2, set);
                gif_emotes_loaded = true;
            }

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


// Finally, load.
check_existance();
})();
