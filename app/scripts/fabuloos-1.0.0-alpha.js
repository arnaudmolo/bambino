/*!
 * fabuloos v1.0.0-alpha
 * http://fabuloos.org
 *
 * Copyright 2014 eGeny, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function(window, undefined) {
	// Use JavaScript script mode
	"use strict";

var
/**
 * The fabuloos function
 * Use it to create a new fabuloos player or to get an existing one from the instances' cache.
 *
 * @param {string} id The ID attribute of the element to enhance (might be `<audio>`, `<video>` or any element).
 * @return {fabuloos} Return a new fabuloos instance or an instance from the instances' cache.
 *
 * @param {Element} element The element to enhance (might be `<audio>`, `<video>` or any element).
 * @return {fabuloos} Return a new fabuloos instance or an instance from the instances' cache.
 *
 * @param {object} config The configuration to apply.
 *   If the configuration contains an `element` property the player will be based on this element.
 *   You can specify a string or an Element, just as the previous signatures.
 * @return {fabuloos} Return a new fabuloos instance or an instance from the instances' cache.
 *
 * @param {undefined}
 * @return {fabuloos} Return a new fabuloos instance.
 */
	fab = function fabuloos(config) {
		// Check if we're trying to create an instance of fab
		if (this instanceof fab) {
			// Then, initialize it
			return this.init(config);
		}

		var
			// First, find the element (might be { element: "div" } or "div")
			element = config ? config.element || config : {},

			// Then find the id
			// It might be a string (simply use it after removing the debuting hash)
			// Or an Element, simply try to retrieve its id
			id = element.replace ? element.replace("#", "") : element.id,

			// Loop specific
			i = 0, instance;

		// Search for an instance in the cache having this id
		while (id && (instance = fab.instances[i++])) {
			if (instance._id === id) {
				return instance;
			}
		}

		// No instance found, create a new one
		return new fab(config);
	}, // end of fabuloos()

	/**
	 * The properties we can get
	 * @type {string}
	 */
	getterProperties = "error networkState readyState width height videoWidth videoHeight src currentSrc preload buffered currentTime duration defaultPlaybackRate playbackRate seeking seekable paused played ended poster autoplay controls loop volume muted",

	/**
	 * When setting an hash of properties we may have to ignore some irrelevant properties
	 * @type {string}
	 */
	ignoreProperties = "type",

	/**
	 * The properties we can set
	 * @type {string}
	 */
	setterProperties = "width height src preload currentTime defaultPlaybackRate playbackRate poster autoplay controls loop volume muted",

	/**
	 * Some properties have to be priorized while setting using an hash
	 * @type {object}
	 */
	setterPriorities = {
		first: "on element",
		last:  "src"
	},

	/**
	 * The properties we can toggle
	 * @type {string}
	 */
	togglerProperties = "autoplay controls loop muted",

	/*!
	 * A RegExp used to test if an element is <audio> or <video>
	 * @type {RegExp}
	 */
	rMedia = /audio|video/i,

	/*!
	 * A RegExp used to capture the private properties
	 * @type {RegExp}
	 */
	rPrivate = /^_/,

	/*!
	 * A RegExp used to detect the presence of "_super" in a function's content
	 * This RegExp will be used to check if we have to create a facade for a method when inheriting
	 * @type {RegExp}
	 */
	rSuper = /xyz/.test(function() { "xyz"; }) ? /\b_super\b/ : /.*/;


/*!
 * Create a facade function to simulate inheritance
 * This closure will create this._super and call the wanted method.
 *
 * @param {function} fn The new function to call
 * @param {*} _super The super value (might be of any type)
 * @return {function} Return a facade function for a specific function
 */
function createFacade(fn, _super) {
	return function facade() {
		// Define the _super property (allow this._super inside the method)
		this._super = _super;

		// Launch the method passing the right this and the arguments, store the result for returning
		var result = fn.apply(this, arguments);

		// Delete the _super since we don't need it anymore
		delete this._super;

		// Return the method's result
		return result;
	};
} // end of createFacade()


/*!
 * Measure the width or height of an element
 *
 * @param {element} element The element to measure.
 * @param {string} property The property to measure.
 * @return {number|null} Return the measured size or null if there is no element.
 */
function measure(element, property) {
	// If there is no element, return null (0 is still a size)
	if (!element) { return null; }

	var value = window.getComputedStyle ?
	// Pass a second argument (null) to getComputedStyle for compatibility reasons
	// @see https://developer.mozilla.org/en-US/docs/DOM/window.getComputedStyle
	window.getComputedStyle(element, null).getPropertyValue(property) :
	// Use the scrollWidth/scrollHeight property since it is calculated in a different way in IE
	element["scroll" + property.charAt(0).toUpperCase() + property.slice(1)];

	return parseInt(value, 10) || 0;
} // end of measure()


/**
 * Extend some objects or the fabuloos' prototype
 * It will simulate inheritance by giving access to this._super.
 * Be careful when passing more than two arguments since this method
 * add some properties from the last argument, to the first : obj1 <- obj2 <- obj3.
 *
 * @param {object} obj The object to merge to the prototype.
 * @return {undefined} Return nothing.
 *
 * @param {object} ... The objects to merge together.
 * @return {undefined} Return nothing.
 *
 * @example
 *   // Extend the fabuloos' prototype (adding the play method if it doesn't exists)
 *   fab.extend({
 *     play: function() { console.log("First play"); }
 *   });
 *
 *   // Still extending the fabuloos' prototype (replacing the play method with this one)
 *   fab.extend({
 *     play: function() {
 *       console.log("Second play");
 *       this._super();
 *     }
 *   });
 *
 *   fab().play(); // "Second play" then "First play"
 *
 *   // Extending the fabuloos "class"
 *   fab.extend(fab, {
 *     clear: function() {
 *       console.log("Clear");
 *     }
 *   });
 *
 *   fab.clear(); // "Clear"
 */
fab.extend = function extend() {
	var
		args = Array.prototype.slice.call(arguments), // Cast arguments to array
		i, source, target, prop; // Loop specific

	// If we have only one argument we want to augment the prototype
	if (args.length === 1) {
		args.unshift(this.prototype);
	}

	// Loop through arguments from the end
	for (i = args.length - 1; i > 0; i--) {
		source = args[i]; // More convenient
		target = args[i - 1]; // More convenient

		// Loop through each property to extend
		for (prop in source) {
			// Override the target's value with the new value or a facade function if necessary
			target[prop] = (typeof source[prop] === "function" && rSuper.test(source[prop])) ? createFacade(source[prop], target[prop]) : source[prop];
		}
	}
}; // end of fab.extend()


// Extend the fabuloos' "class" with static members
fab.extend(fab, {
	/**
	 * A cache for all fabuloos' instances
	 * @type {array}
	 */
	instances: [],


	/**
	 * Create a closure calling a method on the renderer
	 *
	 * @param {string} method The method name to call.
	 * @return {function} A closure calling the method.
	 */
	shorthand: function shorthand(method) {
		return function() {
			// Call the method only if available
			if (this._renderer && typeof this._renderer[method] === "function") {
				this._renderer[method]();
			}

			return this; // Chaining
		};
	}, // end of shorthand()


	/**
	 * A simple useful wrapper to cast to array
	 * Useful when you need to cast a list (arguments, NodeList) to an array
	 *
	 * @param {*} obj The object to cast to array.
	 * @return {array} Return the object casted.
	 */
	toArray: function toArray(obj) {
		return Array.prototype.slice.call(obj);
	}, // end of toArray()


	/**
	 * A simple instance counter
	 * Used to make sure we generate an unique default ID when needed
	 * @type {number}
	 */
	UID: 0,


	/**
	 * The current script's version (http://semver.org)
	 * @type {string}
	 */
	version: "1.0.0-alpha"
}); // end of fab.extend(fab)


// Extend the fabuloos' prototype
fab.extend({
	/**
	 * Initialize an instance
	 * This method exists so you can extend it and handle specific cases in your plugin.
	 * Calling this method on an existing instance will reset it.
	 *
	 * @see #fab() for signatures
	 */
	init: function init(config) {
		// We're trying to initialize an existing instance, destroy it first
		if (this._id) {
			this.destroy();

			// Since we're re-initializing this instance, delete _element in order to correctly get a new one
			delete this._element;
		}

		var _config = {}, prop;

		// Create a local copy of config
		if (config && config.constructor === Object) {
			for (prop in config) {
				if (config.hasOwnProperty(prop)) {
					_config[prop] = config[prop];
				}
			}
		}

		/*!
		 * Try to retrieve an element to base on
		 * If none, we're creating a new player (the element should be defined later)
		 * By setting _config.element we force at least one call to element() who will generate an ID
		 */
		_config.element = _config.element || config || null;

		// Add this instance to the instances' cache
		fab.instances.push(this);

		// Create a closure so the renderers will be able to trigger events on the right instance
		this._triggerer = this.closure("trigger");

		// Define an UID for this instance (used to define a default ID when needed)
		this._uid = "fabuloos-" + (++fab.UID);

		// Set the configuration
		this.config(_config);

		return this; // Chaining
	}, // end of init()


	/**
	 * Attach all listeners to the renderer
	 *
	 * @param {undefined}
	 * @return {fabuloos} Return the current instance to allow chaining.
	 */
	attach: function attach() {
		var
			cache = fab.event.cache(this), // Get the events cache
			type; // Loop specific

		if (this._renderer) {
			// Tell the renderer to listen for all the types
			for (type in cache.handlers) {
				this._renderer.bind(type);
			}
		}

		return this; // Chaining
	}, // end of attach()


	/**
	 * Create a closure to launch a method
	 *
	 * @param {string} method The method to launch.
	 * @param {*} [...] The other arguments to pass to the method.
	 * @return {function} Return a closure which will call the method.
	 *
	 * @example
	 *   var player = fab();
	 *   player.on("ended", player.closure("src", "http://fabuloos.org/video.mp4")); // Automatically change the source when the first is finished
	 *   player.on("ended", player.closure("currentTime", 0)); // Rewind when the media end
	 *   fab.bind(btn, "click", player.closure("play")); // Bind a button to launch a method
	 */
	closure: function closure(method) {
		var
			that = this, // Save a reference to this instance
			args = fab.toArray(arguments); // Convert arguments to a real array

		// Remove the first argument (the method name)
		args.shift();

		return function closure() {
			// Call the method (if it exists), pass the arguments (args and these arguments)
			return that[method] ? that[method].apply(that, args.concat(fab.toArray(arguments))) : undefined;
		};
	}, // end of closure()


	/**
	 * Launch a method on the instance
	 *
	 * @param {string} method The method to launch.
	 * @param {*} [...] The other arguments to pass to the method.
	 * @return {*} Return the result of the method or undefined if the method doesn't exists.
	 *
	 * @example
	 *   var player = fab("media");
	 *   player.cmd("pause"); // Return player to allow chaining
	 *   player.cmd("paused"); // Return true or false
	 *   player.cmd("src", "http://fabuloos.org/video.mp4"); // Return player to allow chaining
	 *   player.cmd("foo"); // Return undefined
	 */
	cmd: function cmd(method) {
		var args = fab.toArray(arguments); // Convert arguments to a real array
		args.shift(); // Remove the first argument (the method name)

		return this[method] ? this[method].apply(this, args) : undefined;
	}, // end of cmd()


	/**
	 * An alias for the #set() method
	 */
	config: function config() {
		return arguments.length ? this.set.apply(this, arguments) : this._config;
	}, // end of config()


	/**
	 * Destroy the instance
	 * Will restore the initial element and remove the instance from the cache.
	 *
	 * @param {undefined}
	 * @return {null} Return `null` to stop chaining.
	 */
	destroy: function destroy() {
		var i = 0, count = fab.instances.length, prop; // Loop specific

		// Restore the old element (if any)
		this.restore();

		// Loop through all instances and remove this instance when found
		for (; i < count; i++) {
			if (fab.instances[i] === this) {
				fab.instances.splice(i, 1);
				break;
			}
		}

		// Delete all private properties
		for (prop in this) {
			if (rPrivate.test(prop)) {
				delete this[prop];
			}
		}

		// It is more convenient to return null (end chaining)
		return null;
	}, // end of destroy()


	/**
	 * Detach all listeners from the renderer
	 *
	 * @param {undefined}
	 * @returns {fabuloos} Return the current instance to allow chaining.
	 */
	detach: function detach() {
		var
			cache = fab.event.cache(this), // Get the events cache
			type; // Loop specific

		if (this._renderer) {
			// Tell the renderer to stop listening for all the types
			for (type in cache.handlers) {
				this._renderer.unbind(type);
			}
		}

		return this; // Chaining
	}, // end of detach()


	/**
	 * Getter and setter for the current element
	 * Get the element reflecting the player (depend on the renderer in use).
	 * Set the element to replace with a player.
	 *
	 * @param {string} id The ID attribute of the element to enhance (might be `<audio>`, `<video>` or any element).
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {Element} element The element to enhance (might be `<audio>`, `<video>` or any element).
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {undefined}
	 * @return {Element|null} Return the current element reflecting the player.
	 */
	element: function element(config) {
		// Act as getter if there is no arguments and if there is an element (might be null)
		if (config === undefined && "_element" in this) {
			return this._element;
		}

		var
			// @see #fab()
			elt = config || {},
			id  = elt.replace ? elt.replace("#", "") : elt.id,
			attributes, attribute, // Loop specific
			sources, source; // Loop specific

		// If we are changing the element, restore the old one
		if (this._old) {
			this.restore();
		}

		this._id     = id || this._uid; // Set the new id or use the default setted by #restore()
		this._old    = this._element = elt.nodeName ? elt : document.getElementById(id); // Set the current element
		this._config = {}; // Define an hash for the renderers' configuration (reflecting the element)

		/*!
		 * If this._element is an <audio> or <video> tag, read its attributes and <source>
		 * We cannot use this._element instanceof HTMLMediaElement or this._element.canPlayType
		 * since we have to read the attributes despite the fact the browser support HTMLMediaElement.
		 * Simply fallback to testing the nodeName against a RegExp
		 *
		 * The sources will only be searched if there is no current sources
		 */
		if (this._element && rMedia.test(this._element.nodeName)) {
			attributes = fab.toArray(this._element.attributes);

			// Watch for attributes
			while ((attribute = attributes.shift())) {
				/*!
				 * Store the attribute's name and value in _config
				 * It will be used by renderers to create the right markup
				 * If the value is falsy, set it to true since an attribute without a value is often considered as true
				 */
				this._config[attribute.name] = attribute.value || true;
			}

			// Check if there was a "src" attribute.
			// Otherwise look for <source> tags.
			if (!this._config.src) {
				this._config.src = []; // Prepare the sources stack
				sources = fab.toArray(this._element.getElementsByTagName("source")); // Get the tags

				// Loop through each tags
				while ((source = sources.shift())) {
					attributes = fab.toArray(source.attributes);
					source     = {};

					// Loop through each tag's attribute
					while ((attribute = attributes.shift())) {
						// Store the attribute's name and value in an hash
						source[attribute.name] = attribute.value || true;
					}

					// Add this source to the sources stack
					this._config.src.push(source);
				} // end of while
			} // end of if

			// Analyze the available sources
			this.src(this._config.src);
		} // end of if

		return this; // Chaining
	}, // end of element()


	/**
	 * Get a player's property
	 * Warning: breaks the chaining.
	 *
	 * @param {string} property The property's value to get.
	 * @return {*} Return the property's value.
	 */
	get: function get(property) {
		return this._renderer ? this._renderer.get(property) : undefined;
	}, // end of get()


	/**
	 * Get or set the height of the player
	 *
	 * @param {number} value The new height to apply.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {undefined}
	 * @return {number} Return the height of the player.
	 */
	height: function height(value) {
		return this.size("height", value);
	}, // end of height()


	/**
	 * Load the current source
	 *
	 * @param {undefined}
	 * @return {fabuloos} Return the current instance to allow chaining.
	 */
	load:  fab.shorthand("load"),


	/**
	 * Unregister an handler for a given event
	 *
	 * @param {string} types The event type(s) to stop listening.
	 * @param {function} handler The handler previously attached.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {string} types The event type(s) to stop listening.
	 * @param {null} handler Passing `null` will remove all handlers associated to this/these type(s).
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {null} types Passing `null` will remove the given handler for all types.
	 * @param {function} handler The handler previously attached.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {object} obj An hash of types and handlers to remove.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {undefined}
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @example
	 *   fabuloos(…)
	 *    .off() // Will remove all listeners
	 *    .off("", handle) // Will remove "handle" for each types
	 *    .off("pause") // Will remove all listeners for the "pause" event type
	 *    .off("pause", handle) // Will remove "handle" for the "pause" event type
	 *    .off("play pause") // Will remove all listeners for the "play" and "pause" event types
	 *    .off("play pause", handle); // Will remove "handle" for the "play" and "pause" event types
	 */
	off: function off(types, handler) {
		var
			cache      = fab.event.cache(this), // Get the events cache
			previously = [], // The list of currently listening event types
			type; // Loop specific

		// Support receiving object literals
		if (arguments[0] && arguments[0].constructor === Object) {
			// Simply loop through the hash and call itself
			for (type in arguments[0]) {
				this.off(type, arguments[0][type]);
			}

			return this; // Chaining
		}

		// Generate the list of event types we are currently listening
		for (type in cache.handlers) {
			previously.push(type);
		}

		// Unregister this handler for this/these type(s)
		fab.event.off(this, types, handler);

		// If we have a renderer, tell him to stop listening if there is no more handler for this/these type(s)
		if (this._renderer) {
			// Loop through the event types we were listening before removing some
			while ((type = previously.shift())) {
				// Check if the event type still exists
				if (!cache.handlers[type]) {
					// If not, tell the renderer to stop listening
					this._renderer.unbind(type);
				}
			}
		}

		return this; // Chaining
	}, // end of off()


	/**
	 * Register an handler for a given event
	 *
	 * @param {string} types The event type(s) to listen.
	 *   You may provide multiple event types by separating them with a space.
	 * @param {function} handler The function to call when the event type is fired.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {object} obj An hash of types and handlers.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @example
	 *   fab(…)
	 *    .on("play", function() { console.log("play event"); })
	 *    .on("pause", handlePause);
	 *
	 *   // We can also register multiple events for the same handler:
	 *   fab(…).on("play pause", handleTogglePlay);
	 */
	on: function on(types, handler) {
		// Support receiving object literals
		if (arguments.length === 1) {
			// Simply loop through the hash and call itself
			for (var type in arguments[0]) {
				this.on(type, arguments[0][type]);
			}

			return this; // Chaining
		}

		// Prevent bad arguments
		if (typeof types !== "string" || typeof handler !== "function") {
			return this; // Chaining
		}

		// Register this handler for this/these type(s)
		fab.event.on(this, types, handler);

		// If we have a renderer, tell him to listen for this/these type(s)
		// If there is no renderer (first, we cannot receive events) the types will be set using attach
		if (this._renderer) {
			this._renderer.bind(types);
		}

		return this; // Chaining
	}, // end of on()


	/**
	 * Pause the playback
	 *
	 * @param {undefined}
	 * @return {fabuloos} Return the current instance to allow chaining.
	 */
	pause: fab.shorthand("pause"),


	/**
	 * Launch the playback
	 *
	 * @param {undefined}
	 * @return {fabuloos} Return the current instance to allow chaining.
	 */
	play:  fab.shorthand("play"),


	/**
	 * Change or get the renderer
	 *
	 * @param {Renderer} renderer The new renderer to use.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {undefined}
	 * @return {Renderer|undefined} Return the current renderer.
	 */
	renderer: function renderer(_renderer) {
		var that = this;

		// No renderer received, acting like a getter
		if (!_renderer) {
			return this._renderer;
		}

		// Check if we correctly received a renderer
		if (!_renderer.canPlay) {
			throw "This renderer isn't valid.";
		}

		// Check if the renderer is supported before creating it
		if (!_renderer.isSupported) {
			return this.trigger("renderer.unsupported");
		}

		// Dispatch a "renderer.changing" event
		this.trigger("renderer.changing");

		// Makes sure the renderer will receive an ID and a size (mandatory for most of the renderers)
		this._config.id     = this._id;
		this._config.width  = this._config.width  || 0;
		this._config.height = this._config.height || 0;

		// Detach all listeners
		this.detach();

		// Destroy the current renderer
		if (this._renderer) {
			this._renderer.destroy();
		}

		// Create the new renderer
		this._renderer = new _renderer(this._config);

		// Define the triggerer
		this._renderer.triggerer = this._triggerer;

		// Replace the old renderer markup
		this._renderer.replace(this._element);

		// Wait for the renderer to be ready
		this._renderer.ready(function() {
			// Keep a reference to the element
			that._element = this.element;

			// Attach all listeners
			that.attach();

			// Dispatch a "rendererready" event
			that.trigger("renderer.ready");
		});

		return this; // Chaining
	}, // end of renderer()


	/**
	 * Define the list of supported renderers
	 *
	 * @params {array} renderers The renderers to define as available.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {Renderer} renderer The only renderer to define as available.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {undefined}
	 * @return {array|undefined} Return the available renderers.
	 */
	renderers: function renderers(_renderers) {
		// Act as a getter if there is no arguments
		if (!_renderers) {
			return this._renderers;
		}

		// Don't bother checking supported renderers if we received the default supported renderers
		if (_renderers === Renderer.supported) {
			this._renderers = Renderer.supported;
			return this; // Chaining
		}

		var
			// List of supported renderers (copying the received arguments)
			supported = _renderers.push ? _renderers.slice(0) : [_renderers],
			i = 0, renderer; // Loop specific

		// Loop through each renderers to test them
		while ((renderer = supported[i])) {
			// Test the renderer and remove it if unsupported
			i += "isSupported" in renderer && renderer.isSupported ? 1 : (supported.splice(i, 1)).length - 1;
		}

		// Save the supported renderers list in the config
		this._renderers = supported;

		return this; // Chaining
	}, // end of renderers()


	/**
	 * Restore the initial element
	 *
	 * @param {undefined}
	 * @return {fabuloos} Return the current instance to allow chaining.
	 */
	restore: function restore() {
		// Replace the element with the old one if necessary
		if (this._element && this._old && this._element !== this._old) {
			this._element.parentNode.replaceChild(this._old, this._element);
		}

		// Set a default id since this instance isn't related to any element
		this._id  = this._uid;
		this._old = this._element = null;

		return this; // Chaining
	}, // end of restore()


	/**
	 * Set a player's property
	 * You can pass a key/value pair or an hash to set multiple properties.
	 *
	 * @param {string} property The property to set.
	 * @param {*} value The new property's value.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {object} obj An object literal of properties and their values.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @example
	 * <code>
	 *   fab().set("autoplay", true); // Setting the "autoplay" property to "true"
	 *   fab().set({
	 *     width: 720,
	 *     autoplay: true
	 *   });
	 * </code>
	 */
	set: function set(property, value) {
		// Support receiving object literals
		if (arguments.length === 1) {
			var
				prop, position, // Loop specific
				copy   = {}, // A copy of the received hash
				values = {}, // The prioritized hash
				first  = fab.toArray(setterPriorities.first.split(" ")), // The list of properties to set first
				last   = fab.toArray(setterPriorities.last.split(" ")), // The list of properties to set last
				order  = ["first", "middle", "last"]; // The order of the priorities

			// Copy the properties/values since we have to prioritize
			for (prop in arguments[0]) {
				copy[prop] = arguments[0][prop];
			}

			// Loop through the properties to set first
			while ((prop = first.shift())) {
				// Makes sure we have this property to set
				if (prop in copy) {
					// Makes sure we have a "first" hash where to store the properties/values
					values.first = values.first || {};

					// Store the property/value
					values.first[prop] = copy[prop];

					// Delete the property from the hash since we just prioritized it
					delete copy[prop];
				}
			} // end of while ((prop = first.shift()))

			// Loop through the properties to set last
			while ((prop = last.shift())) {
				// Makes sure we have this property to set
				if (prop in copy) {
					// Makes sure we have a "last" hash where to store the properties/values
					values.last = values.last || {};

					// Store the property/value
					values.last[prop] = copy[prop];

					// Delete the property from the hash since we just prioritized it
					delete copy[prop];
				}
			}

			// Define the properties/values to set in the middle (no particuliar priority)
			values.middle = copy;

			// Loop through orders to set sequentially
			while ((position = order.shift())) {
				// Get the group of properties/values to set for this position
				for (prop in values[position]) {
					value = values[position][prop];

					// Small exception for "src"
					// Sometimes it is better to send the whole configuration
					if (prop === "src") {
						value = value && value.substr ? arguments[0] : value;
					}

					// Set the property using the other signature
					this.set(prop, value);
				}
			}

			return this; // Chaining
		} // end of if (arguments.length === 1)

		// We can ignore some properties
		// The "type" property is useless until related to an "src" property
		if (new RegExp(property).test(ignoreProperties)) {
			return this; // Chaining
		}

		// Prefer specialized method having the property's name
		// Prevent calling automatically created accessor's method (will cause infinite calls)
		if (typeof this[property] === "function" && !this[property].accessor) {
			this[property](value);
		} else if (new RegExp(property).test(setterProperties)) {
			// If we're allowed to set this property define the property and value in the _config hash
			// Store the value corrected by the renderer (if any)
			this._config[property] = this._renderer ? this._renderer.set(property, value) : value;
		} else {
			// In the other cases store the value in the instance, prefixed with an underscore
			this["_" + property] = value;
		}

		return this; // Chaining
	}, // end of set()


	/**
	 * Measure or set the size of the player
	 *
	 * @param {string} property The property to get (`width` or `height`).
	 * @return {number} Return the width or the height of the player.
	 *
	 * @param {string} property The property to set (`width` or `height`).
	 * @param {number} value The value to apply for the property.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {object} properties The properties to set (`width` and/or `height`).
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {undefined}
	 * @return {object} Return the width and height of the player.
	 */
	size: function size(property, value) {
		// Support receiving object literals
		if (arguments[0] && arguments[0].constructor === Object) {
			// Loop through the received properties
			for (var prop in arguments[0]) {
				// Call itself
				this.size(prop, arguments[0][prop]);
			}

			return this; // Chaining
		}

		// No arguments means get the width and height
		if (!arguments.length) {
			return {
				width:  measure(this._element, "width"),
				height: measure(this._element, "height")
			};
		}

		// Support only "width" and "height"
		if (property === "width" || property === "height") {
			// If there is no value, act as a getter
			if (value === undefined) {
				// Return the desire size
				return measure(this._element, property);
			} else {
				// Otherwise, act as a setter and set the size if there is an element
				if (this._element) {
					this._element[property] = parseInt(value, 10) || 0;
				}
			}
		}

		return this; // Chaining
	}, // end of size()


	/**
	 * Analyze the sources against the renderers
	 * This method will NOT change the current source, it will only analyze them.
	 *
	 * @param {string} value The URL to analyze.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {object} value An object literal representing the source (might have additional properties).
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {array} value A list of source to analyze (items can be string or object as described above).
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {undefined}
	 * @return {array} Return the analyzed sources.
	 */
	sources: function sources(value) {
		// Act as a getter if there is no arguments
		if (value === undefined) {
			return this._sources;
		}

		// The supported renderer may not be initialized yet
		if (this._renderers === undefined) {
			this.renderers(Renderer.supported);
		}

		// Reset the sources stack if there is no sources to test
		if (value === null || value.length === 0) {
			this._sources = [];
			return this; // Chaining
		}

		var
			// An array is more convenient (remember to clone existing one in order to keep the original clean)
			_sources = value.push ? value.slice(0) : [value],
			_source, source, renderers, renderer; // Loop specific

		// Initialize the sources stack
		this._sources = [];

		// Loop through sources
		while ((source = _sources.shift())) {
			_source = {};

			// Makes sure we have what we need
			_source.src       = source.src  || (source.substr ? source : null); // Search for the URL
			_source.type      = source.type || Renderer.guessType(_source.src); // Use or guess the type
			_source.solutions = {}; // Prepare the solutions hash

			// Copy the renderers
			renderers = this._renderers.slice(0);

			// Loop through renderers
			while ((renderer = renderers.shift())) {
				// Ask the renderer if it can play this source and store the result
				_source.solutions[renderer.name] = renderer.canPlay(_source.src, _source.type);
			}

			// Push this source to the stack
			this._sources.push(_source);
		}

		return this; // Chaining
	}, // end of sources()


	/**
	 * Get the source or set a new source
	 * This will change the renderer (if necessary) and define the source to play.
	 * #sources() will only find the solutions available for the given source.
	 * #src() will call #sources() internally if necessary and define the source.
	 *
	 * @param {string} value The URL of the new source.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {object} value An object literal representing the new source (might have additional properties).
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {array} value A list of possible sources (items can be string or object as described above).
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {undefined}
	 * @return {string} Return the current source.
	 *
	 * @example
	 *   fab().src("http://fabuloos.org/video.mp4"); // Will find a renderer for this source, create it and define the source
	 *
	 *   // You can help the algorith by defining the MIME type (sometime there is no extension on the URL)
	 *   fab().src({
	 *     src: "http://fabuloos.org/video.mp4"
	 *     type: "video/mp4"
	 *   });
	 *
	 *   // Define the list of possible sources (give more chance to be cross-platform)
	 *   fab().src([
	 *     "http://fabuloos.org/video.mp4",
	 *     "http://fabuloos.org/video.ogv"
	 *   ]);
	 *
	 *   // Define the list of possible sources, give some hints for the algorithm
	 *   fab().src([
	 *     { src: "http://fabuloos.org/video.mp4", type: "video/mp4" },
	 *     { src: "http://fabuloos.org/video.ogv", type: "video/ogv" }
	 *   ]);
	 */
	src: function src(value) {
		// Acting as a getter
		if (value === undefined) {
			return this.get("src");
		}

		// Expand the sources if necessary
		if (value !== this._sources) {
			this.sources(value); // Will find the source's type and ask the renderers if they can play it
		}

		var
			i = 0, source, // Loop specific
			j = 0, renderer; // Loop specific

		// Loop through each sources to find a playable one
		while ((source = this._sources[i++])) {
			// Test if the current renderer (if any) can handle this source
			if (this._renderer && source.solutions[this._renderer.constructor.name]) {
				this._renderer.set("src", source.src); // Simply ask him to change the source
				return this; // Chaining
			}

			// Loop through each active renderer
			while ((renderer = this._renderers[j++])) {
				// Skip the current renderer since it was tested first
				if (this._renderer && this._renderer.constructor === renderer) { continue; }

				// The renderers list may have been changed since the sources solutions have been found
				if (source.solutions[renderer.name] === undefined) {
					source.solutions[renderer.name] = renderer.canPlay(source.src, source.type);
				}

				// This renderer seems to be able to play this source
				if (source.solutions[renderer.name]) {
					this._config.src = source.src; // FIXME
					return this.renderer(renderer); // Change the renderer for this one
				}
			} // end of while
		} // end of while

		// If we reached this point it means no renderer could be found
		this.trigger("no.renderer");

		return this; // Chaining
	}, // end of src()


	/**
	 * Toggle a player's property's value
	 *
	 * @param {string} property The property to toggle.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @example
	 *  <code>
	 *    var player = fab("media");
	 *    player.toggle("autoplay");
	 *  </code>
	 */
	toggle: function toggle(property) {
		if (new RegExp(property).test(togglerProperties) && this._renderer) {
			// Set the property by toggleing its value
			this.set(property, !this.get(property));
		}

		return this; // Chaining
	}, // end of toggle()


	/**
	 * Trigger the listeners for a type
	 * You can trigger some types at once by separating them with a space.
	 *
	 * @param {string} type The type(s) of event to trigger.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 */
	trigger: function trigger(type) {
		// Trigger!
		fab.event.trigger(this, type);

		return this; // Chaining
	}, // end of trigger()


	/**
	 * Get or set the width or the player
	 *
	 * @param {number} value The new width to apply.
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {undefined}
	 * @return {number} Return the width of the player.
	 */
	width: function width(value) {
		return this.size("width", value);
	} // end of width()
}); // end of fab.extend()


// Create getters and setters
(function() {
	var
		properties = getterProperties.split(" "), // All of the properties
		property, // Loop specific
		obj = {}; // Will be used to extend fabuloos' prototype

	// Create a closure for getter/setter on a property
	function accessor(property) {
		var fn = function() {
			return this[arguments.length ? "set" : "get"](property, arguments[0]);
		};

		// Set a flag to later prevent set() to call fn() indefinitely
		fn.accessor = true;
		return fn;
	}

	// Loop through all properties
	while ((property = properties.shift())) {
		// Create an accessor only if not already created manually
		if (!fab.prototype[property]) {
			obj[property] = accessor(property);
		}
	} // end of while

	// Extend fabuloos' prototype with these methods!
	fab.extend(obj);
}());


// Expose
window.fabuloos = window.fab = fab;
var
	/**
	 * The list of accepted properties for an event
	 * @type {array}
	 */
	properties = "bubbles cancelable currentTarget eventPhase relatedTarget target timeStamp".split(" "),

	/**
	 * A collection of RegExp used to split and trim
	 * @type {RegExp}
	 */
	rSplit = /\s+/,
	rTrim  = /^\s+|\s+$/g;


/*!
 * Fix a given event to fit to the W3C standard in each browsers (abstraction)
 *
 * @param {string|event} event The event to fix.
 * @return {fab.Event} The fixed event.
 */
function fix(event) {
	// This event is already fixed, don't bother
	if (event[fab.event.expando]) {
		return event;
	}

	var
		original = event,
		property, i = properties.length; // Loop specific

	// Create a new Event based on the original, gives the ability to define read-only properties
	event = new fab.Event(original);

	// Copy the accepted original's properties in the event
	// We don't have to copy if the original was a string
	while (!original.substr && i--) {
		property = properties[i];

		// Copy only if the property was set
		if (property in original) {
			event[property] = original[property];
		}
	}

	return event;
} // end of fix()


/*!
 * Launch the registered handlers for the triggered event
 *
 * @param {string|event} event The event triggered.
 * @return Return the value of the last handler executed or true if there were no handlers.
 */
function handle(event) {
	// Fix the event
	event = fix(event);
	event.currentTarget = this;

	var
		cache    = fab.event.cache(this), // Retrieve the element's cache
		result   = true, // We have to remember the result of each handler
		handlers = [], // Prepare the stack of handlers to launch (see below)
		handler; // Loop specific;

	// Concatenate the handlers for all events (debug purpose) and the handlers for this type
	handlers = handlers.concat(cache.handlers["*"] || [], cache.handlers[event.type] || []);

	// Loop through the handlers
	while ((handler = handlers.shift())) {
		// Execute the handler and get the return value
		result = handler.call(this, event);

		// Handle the case of handlers returning false
		if (result === false) {
			event.preventDefault();
			event.stopPropagation();
		}

		// Stop this loop if immediate propagation is stopped
		if (event.isImmediatePropagationStopped()) { break; }
	} // end of while

	return result;
} // end of handle()


/*!
 * A generic function that return false, used for callbacks
 *
 * @param {undefined}
 * @return {boolean} Return false.
 */
function returnFalse() { return false; }


/*!
 * A generic function that return true, used for callbacks
 *
 * @param {undefined}
 * @returns {boolean} Return true.
 */
function returnTrue() { return true; }


// Create an "event" namespace into the framework (is independant)
fab.event = {
	/**
	 * The events handlers cache
	 * @type {object}
	 */
	_cache: {},


	/**
	 * Retrieve the handlers cache for an element or an object
	 * Will create a cache if the element doesn't have one yet.
	 *
	 * @param {element|object} element The element or object.
	 * @return Return the cache for the element.
	 */
	cache: function cache(element) {
		var id = element[fab.event.expando]; // Try to retrieve the uid with the expando

		// The element is not expanded yet
		if (!id) {
			// Use an UID to ad id
			id = element[fab.event.expando] = ++fab.event.uid;

			// Prepare the cache
			fab.event._cache[id] = {
				// Prepare the event types and handlers cache
				handlers: {},

				// Prepare the manager to makes sure we always have the right "this" keyword
				manager: function manager(event) {
					return handle.call(element, event);
				}
			};
		}

		return fab.event._cache[id];
	}, // end of cache()


	/**
	 * An unique identifier
	 * Used to link a DOM element to a JS object.
	 * @type {string}
	 */
	expando: "_fab-" + (+new Date()),


	/**
	 * Prepare the basic interface for event listening
	 * Simply add these methods to a prototype to have an object with event capabilities
	 * @type {object}
	 */
	api: {
		/**
		 * Remove an handler for the given types on the given element
		 *
		 * @see #off() for signatures.
		 * @return {*} Return the current instance to allow chaining.
		 */
		off: function off(types, handlers) {
			fab.event.off(this, types, handlers);
			return this;
		},


		/**
		 * Add an handler for the given event types on the given element
		 *
		 * @see #on() for signatures.
		 * @return {*} Return the current instance to allow chaining.
		 */
		on: function on(types, handlers) {
			fab.event.on(this, types, handlers);
			return this;
		},


		/**
		 * Trigger an event type on the given element
		 *
		 * @see #trigger() for signatures.
		 * @return {*} Return the current instance to allow chaining.
		 */
		trigger: function trigger(type) {
			fab.event.trigger(this, type);
			return this;
		}
	}, // end of fab.event.interface


	/**
	 * Remove an handler for the given types on the given element
	 *
	 * @param {element|object} element The element where the event type is currently listening (can be an element or an object).
	 * @param {string} types The event types (can be multiple, separated by a space) to stop listening.
	 *   If a falsy value is passed, the handler will be removed for all types.
	 * @param {function} handler The function attached to be removed, remove all handlers if not provided.
	 * @return {undefined} Return nothing.
	 */
	off: function off(element, types, handler) {
		var
			cache = fab.event.cache(element),
			type, handlers, i; // Loop specific

		// No types provided, remove for all types
		if (!types) {
			types = "";
			for (type in cache.handlers) {
				types += type + " ";
			}
		}

		// Allow multiple events types separated by a space
		types = types ? types.replace(rTrim, "").split(rSplit) : []; // Trim first to avoid bad splitting

		// Loop through each event types
		while ((type = types.shift())) {
			handlers = cache.handlers[type];

			// Don't bother if there is no handlers for this type
			if (!handlers) { continue; }

			// If there is no specific handler to remove, remove them all
			if (!handler) {
				handlers.length = 0;
			}

			i = handlers.length;
			// Loop through the handlers to find the one to remove
			while (i--) {
				if (handlers[i] === handler) {
					handlers.splice(i, 1); // Dump the handler
					// Don't break since we may have more than once the handler in the cache
				}
			}

			// Do we have to clean the handlers cache for this type?
			if (!handlers.length) {
				// Delete this cache entry
				delete cache.handlers[type];

				// Remove the handle manager for this type
				if (element.removeEventListener) {
					element.removeEventListener(type, cache.manager, false);
				} else if (element.detachEvent) {
					// Microsoft's old events implementation
					element.detachEvent("on" + type, cache.manager);
				}
			} // end of if (!handlers.length)
		} // end of while
	}, // end of off()


	/**
	 * Add an handler for the given event types on the given element
	 *
	 * @param {element|object} element The element on which to listen event (can be an element or an object).
	 * @param {string} types The event types (can be multiple, separated by a space) to listen.
	 * @param {function} handler The function to launch when the event types are trigerred.
	 * @return {undefined} Return nothing.
	 */
	on: function on(element, types, handler) {
		var
			cache = fab.event.cache(element),
			type; // Loop specific

		// Allow multiple events types separated by a space
		types = types ? types.replace(rTrim, "").split(rSplit) : []; // Trim first to avoid bad splitting

		// Loop through each event types
		while ((type = types.shift())) {
			// Is there handlers for this type?
			if (!cache.handlers[type]) {
				// No, initialize
				cache.handlers[type] = [];

				/*!
				 * We add only one listener for each types. We also have to use a closure (@see getCache)
				 * to correct the "this" keywork for IE. The private handle method will launch each listener
				 */

				// if DOM level 2 is supported, then use it
				if (element.addEventListener) {
					element.addEventListener(type, cache.manager, false);
				} else if (element.attachEvent) {
					// Microsoft's old events implementation
					element.attachEvent("on" + type, cache.manager);
				}
			}

			// Cache the handler for this type
			cache.handlers[type].push(handler);
		} // end of while
	}, // end of on()


	/**
	 * Trigger an event type on the given element
	 *
	 * @param {element|object} element The element triggering the event (can be a node or an object).
	 * @param {string} type The event type to trigger.
	 * @return {*} Return the value of the last handler executed or true if there were no handlers.
	 */
	trigger: function trigger(element, type) {
		return handle.call(element, type);
	}, // end of trigger()


	/**
	 * An UID to mark that an element have handlers in the cache
	 * @type {number}
	 */
	uid: 0
}; // end of fab.event


// Bind static references
fab.on      = fab.event.on;
fab.off     = fab.event.off;
fab.trigger = fab.event.trigger;


// Abstract an event with a custom Event class.
// This is a copy/paste of the jQuery's implementation (don't remake the awesome).
// @see <a href="https://github.com/jquery/jquery/blob/master/src/event.js">jQuery's event source</a>
fab.Event = function(src) {
	// Allow instantiation without the 'new' keyword
	if (!(this instanceof fab.Event)) {
		return new fab.Event(src);
	}

	// src is an Event object
	if (src && src.type) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = (src.defaultPrevented || src.defaultPrevented === undefined && src.getPreventDefault && src.getPreventDefault()) ? returnTrue : returnFalse;
	} else {
		// src is just a string, create a blank event
		this.type = src;
	}

	// Create a timestamp if incoming event doesn't have one
	// Don't use Date.now() because of IE
	this.timeStamp = src && src.timeStamp || +new Date();

	// Mark the event as fixed
	this[fab.event.expando] = true;
}; // end of fab.Event()


// This is the exact copy of the awesome jQuery.Event DOM 3 Events implementation
// @see <a href="https://github.com/jquery/jquery/blob/master/src/event.js">jQuery's event source</a>
// @see <a href="http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html">DOM Level 3 Events ECMAScript Binding</a>
fab.Event.prototype = {
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		// if preventDefault exists run it on the original event
		if (e && e.preventDefault) {
			e.preventDefault();
		}
	},

	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		// if stopPropagation exists run it on the original event
		if (e && e.stopPropagation) {
			e.stopPropagation();
		}
	},

	stopImmediatePropagation: function() {
		this.isImmediatePropagationStopped = returnTrue;
		this.stopPropagation();
	}
}; // end of fab.Event.prototype
/* global ActiveXObject */

/**
 * The base Renderer class
 * @abstract @constructor
 */
function Renderer() {}


/**
 * An hash of MIME types associated to extensions
 * @type {object}
 */
Renderer.mimes = {
	application: {
		m3u8: "vnd.apple.mpegurl",
		f4m: "f4m+xml",
		"smil, csmil": ["smil+xml", "smil"]
	},
	video: {
		"3gp": "3gpp",
		"3g2": "3gpp2",
		flv: "x-flv",
		m4v: ["x-m4v", "m4v"],
		ogv: "ogg",
		"mp4, f4v, f4p": "mp4",
		"mov, qt": "quicktime",
		webm: "webm",
		wmv: "x-ms-wmv"
	},
	audio: {
		f4a: "mp4",
		mp3: "mpeg",
		m4a: "x-m4a",
		"ogg, oga": "ogg",
		wav: ["wav", "wave", "x-wav"],
		weba: "webm",
		wma: "x-ms-wma"
	}
};


var
	/*!
	 * A RegExp used to append type on multiple MIME types
	 * @type {RegExp}
	 */
	rAppendType = /([^,]+)/g,

	/*!
	 * A RegExp used to extract the file extension from an URL
	 * @type {RegExp}
	 */
	rExt = /\.([\w\d])+(?=\/|\?|#|$)/g,

	/*!
	 * A RegExp to retrieve a function's name
	 * @type {RegExp}
	 */
	rFunction = /function (\w+)/,

	/**
	 * A collection of RegExp used to split and trim
	 * @type {RegExp}
	 */
	rSplit = /\s+/,
	rTrim  = /^\s+|\s+$/g,

	/**
	 * A RegExp to retrieve version's numbers
	 * @type {RegExp}
	 */
	rVersion = /\d+/g;


/**
 * Extend some objects or the this' prototype
 * Be careful when passing more than two arguments since this method
 * add some properties from the last argument, to the first : obj1 <- obj2 <- obj3.
 *
 * @param {object} obj The object to merge to the prototype.
 * @return {undefined} Return nothing.
 *
 * @param {object} ... The objects to merge together.
 * @return {undefined} Return nothing.
 */
Renderer.extend = function extend() {
	var
		args = Array.prototype.slice.call(arguments), // Cast arguments to array
		i, source, target, prop; // Loop specific

	// If we have only one argument we want to augment the prototype
	if (args.length === 1) {
		args.unshift(this.prototype);
	}

	// Loop through arguments from the end
	for (i = args.length - 1; i > 0; i--) {
		source = args[i]; // More convenient
		target = args[i - 1]; // More convenient

		// Loop through each property to extend
		for (prop in source) {
			// Override the target's value with the new value or a facade function if necessary
			target[prop] = source[prop];
		}
	}
}; // end of Renderer.extend()


// Extend the Renderer's "class" with static members
Renderer.extend(Renderer, {
	/**
	 * Check if a given URL is readable by this renderer
	 *
	 * @param {string} url The url to check
	 * @param {string|array} type The MIME type(s) associated to this URL
	 * @return {string} Return "probably" or "maybe" if the MIME type is supported, "" (empty string) otherwise
	 */
	canPlay: function canPlay(url, type) {
		var
			// Get or guess the MIME type (we can receive "undefined", treat it like a MIME)
			mime = arguments.length === 2 ? type : Renderer.guessType(url),
			i = 0, count, // Loop specific
			result, canPlayType = ""; // Prepare the result (default to "" if we doesn't have any MIME type)

		// Work only with array, more convenient
		mime = mime || []; // Don't bother to loop if we doesn't have a MIME type
		mime = mime.push ? mime : [mime]; // "cast" regular MIME type to array

		// Loop through MIME types (for some extensions we can have multiple MIME types)
		for (count = mime.length; i < count; i++) {
			// Test the MIME type
			result = this.canPlayType(mime[i]);

			// Ouh, nice result, exit
			if (result === "probably") {
				return result;
			}

			// Meh. Continue in case we found a probably
			canPlayType = canPlayType || result;
		}

		// Return the result (may be "", "maybe" or "probably")
		return canPlayType;
	}, // end of Renderer.canPlay()


	/**
	 * Check if a given MIME type is readable by this renderer
	 *
	 * @param {string} type The MIME type to check
	 * @return {string} Returns "maybe" or "probably" is the MIME type is supported, "" otherwise
	 */
	canPlayType: function canPlayType(type) {
		return this.types[type] || "";
	}, // end of Renderer.canPlayType()


	/**
	 * Try to guess the MIME type based on an extension or an URL
	 *
	 * @param {string} ext The extension or URL to use to guess MIME type
	 * @return {string|array|false} Returns a string or an array of MIME types. undefined if the extension is unknown.
	 */
	guessType: function guessType(ext) {
		var type, key;

		// Treat ext as full URL if its length is more than 5 characters
		if (ext && ext.length > 5) {
			ext = ext.match(rExt); // Get the probable extensions
			ext = ext ? ext[ext.length - 1].substring(1) : ""; // Keep the last one
		}

		// Exit if we don't have an extension to test
		if (!ext) { return; }

		// Transforming the extension to a RegExp, easier to find in Renderer.mimes' keys
		ext = new RegExp(ext, "i");

		for (type in Renderer.mimes) {
			for (key in Renderer.mimes[type]) {
				// Check if this key is the extension we're looking for
				if (ext.test(key)) {
					// Check if the MIME is an array
					if (Renderer.mimes[type][key].push) {
						// Before returning, append the type in front of MIMEs
						return Renderer.mimes[type][key].join().replace(rAppendType, type + "/$1").split(",");
					} else {
						return type + "/" + Renderer.mimes[type][key];
					}
				}
			} // end of for (ext in Renderer.mimes[type])
		} // end of for (type in Renderer.mimes)

		// Return undefined if extension is unknown
		return;
	}, // end of Renderer.guessType()


	/**
	 * Inherit from a class
	 * This function seems strange because it is.
	 * It is only a sugar to ease developper's pain.
	 *
	 * @param {function} base The base class to inherit to.
	 * @return {undefined} Return nothing.
	 *
	 * @example
	 *   function LambdaRenderer() {} // Create a new "class"
	 *   LambdaRenderer.inherit = Renderer.inherit; // LambdaRenderer now know to inherit
	 *   LambdaRenderer.inherit(Renderer); // Inherit from Renderer
	 */
	inherit: function inherit(base) {
		// Set the constructor's name if it doesn't exists (IE)
		// Beware to only set it if undefined, this property is read-only in strict mode
		if (!this.name) {
			var name = rFunction.exec(this.toString()); // Search for the function name
			this.name = name ? name[1] : "unknown"; // Define the name or define to "unknown"
		}

		this.prototype = new base(); // Inherit from the base
		this.prototype.constructor = this; // Correct the constructor
	}, // end of Renderer.inherit()


	/**
	 * Utility function to check if a plugin is supported
	 *
	 * @param {object} info The plugin info (minVersion, plugin name and activeX name)
	 * @return {boolean} Is this plugin supported?
	 */
	isPluginSupported: function isPluginSupported(info) {
		var
			version, // The plugin version
			minVersion = info.minVersion, // The min plugin version
			ax, // ActiveX
			diff, // The difference between two version, used to check versions
			i = 0, count; // Loop specific

		// Check if the plugin exists on good browsers
		if (navigator.plugins && navigator.plugins[info.plugin]) {
			// It seems. Get the description (include the version)
			version = navigator.plugins[info.plugin].description;
		} else if (window.ActiveXObject) {
			// Bad browsers use ActiveX, use a try/catch to avoid error when plugin doesn't exists
			try {
				ax = new ActiveXObject(info.activex);

				// Check if this ActiveX has a IsVersionSupported
				try {
					// IsVersionSupported seems to be an ActiveX function
					if (typeof ax.IsVersionSupported(minVersion) === "boolean") {
						return ax.IsVersionSupported(minVersion);
					}
				} catch (e2) {}

				// Otherwise try to retrieve the version
				version = ax.getVariable("$version");
			} catch (e1) {}
		}

		// A version was found
		if (version) {
			// Split the versions
			version    = version.match(rVersion);
			minVersion = minVersion.match(rVersion);

			// Loop through the minVersion to check with the current installed
			for (count = minVersion.length; i < count; i++) {
				// Calculate the difference between installed and target version
				diff = (parseInt(version[i], 10) || 0) - (parseInt(minVersion[i], 10) || 0);

				// The installed match the target version, continue to next version number
				if (diff === 0) { continue; }

				// The installed doesn't match, so it can be greater or lower, just return this result
				return (diff > 0);
			}

			return true; // The minVersion === version
		}

		return false; // No version found or plugin not installed
	}, // end of Renderer.isPluginSupported()


	/**
	 * Add a renderer to the list of supported renderers
	 *
	 * @param {Renderer} renderer The renderer to register.
	 * @return {undefined} Return nothing.
	 */
	register: function register(renderer) {
		if (renderer.isSupported) {
			// Add this renderer to the stack of supported renderers
			this.supported.push(renderer);

			// Keep a static reference to the renderer's class
			// This allow calling LambdaRenderer using Renderer.LambdaRenderer
			// Only Renderer need to be exposed
			Renderer[renderer.name] = renderer;
		}
	}, // end of Renderer.register()


	/**
	 * An instance cache, used to retrieve an instance from a plugin
	 * @type {object}
	 */
	instances: {},


	/**
	 * Create a closure calling a method on the API
	 *
	 * @param {string} method The method name to call
	 * @return {function} A closure calling the method
	 */
	shorthand: function shorthand(method) {
		return function() {
			return (this.api && typeof this.api[method] === "function") ? this.api[method].apply(this.api, arguments) : undefined;
		};
	}, // end of shorthand()


	/**
	 * A list of currently supported renderers
	 * @type {array}
	 */
	supported: []
}); // end of Renderer.extend(Renderer)


// Extend the HTMLRenderer's prototype
Renderer.extend({
	/**
	 * Renderer initialization
	 *
	 * @param {object} config The configuration of the renderer.
	 *   @param {string} id The id the renderer's markup will have.
	 *   @param {number} height The renderer's height (might be 0).
	 *   @param {number} width The renderer's width (might be 0).
	 * @return {Renderer} Return the current instance to allow chaining.
	 */
	init: function init(config) {
		var
			renderer  = this.constructor, // Retrieve the renderer's "class"
			instances = Renderer.instances[renderer.name]; // Retrieve the instances cache for this kind of renderers

		// Prepare the instance
		this.callbacks = []; // The callbacks to launch when the renderer is ready
		this.config    = config; // Save a reference to the configuration (do NOT modify this hash)
		this.events    = {}; // A cache to remember which event type the renderer is already listening

		// This renderer was never instanciated, initialize a cache
		if (!instances) {
			/*!
			 * Use an hash as fake array for cache.
			 * Some renderers will call a method on window. We need a way to point to the right instance.
			 * So we expose something like Renderer.instances.LambdaRenderer.myPlayer = this.
			 * Save also this cache reference to the renderer.
			 */
			Renderer.instances[renderer.name] = renderer.instances = instances = {};
		}

		// Store this instance in the cache (even if it already exists)
		instances[config.id] = this;

		return this; // Chaining
	}, // end of init()


	/**
	 * Ask the element to listen for an event type
	 *
	 * @param {string} types The event type(s) to listen.
	 *   You may provide multiple event types by separating them with a space.
	 * @return {Renderer} Return the current instance to allow chaining.
	 */
	bind: function bind(types) {
		var type; // Loop specific

		// Allow multiple events types separated by a space
		types = types ? types.replace(rTrim, "").split(rSplit) : []; // Trim first to avoid bad splitting

		// Loop through each event types
		while ((type = types.shift())) {
			// Is this renderer already listening for this type?
			// Is there an API to call?
			// Is there an unbind method in the API?
			if (!this.events[type] && this.api && typeof this.api.bind === "function") {
				// Ask the renderer to actually bind this type
				this.api.bind(type);

				// Mark this type as "currently listening"
				this.events[type] = true;
			}
		} // end of while

		return this; // Chaining
	}, // end of bind()


	/**
	 * Create a closure to launch a method on the current instance
	 *
	 * @param {string} method The method to launch.
	 * @param {*} [...] The other arguments to pass to the method.
	 * @return {function} Return a closure which will call the method.
	 */
	closure: function closure(method) {
		var
			that = this, // Save a reference to this instance
			args = Array.prototype.slice.call(arguments); // Convert arguments to a real array

		// Remove the first argument (the method name)
		args.shift();

		return function closure() {
			// Call the method (if it exists), pass the arguments (args and these arguments)
			return that[method] ? that[method].apply(that, args.concat(Array.prototype.slice.call(arguments))) : undefined;
		};
	}, // end of closure()


	/**
	 * Destroy the instance
	 * Will simply remove itself from the cache.
	 *
	 * @param {undefined}
	 * @return {null} Return `null` to stop chaining.
	 */
	destroy: function destroy() {
		var cache = Renderer.instances[this.constructor.name];
		if (cache[this.config.id]) {
			delete cache[this.config.id];
		}

		// It is more convenient to return null (end chaining)
		return null;
	}, // end of destroy()


	/**
	 * A flag to check if this renderer is ready (wait for plugin initialization)
	 * @type {boolean}
	 */
	isReady: false,


	// API shorthands
	load:  Renderer.shorthand("load"),
	pause: Renderer.shorthand("pause"),
	play:  Renderer.shorthand("play"),


	/**
	 * Get a property's value
	 *
	 * @param {string} property The property's value to get.
	 * @return {*|undefined} Return the property's value or undefined if the renderer isn't ready.
	 */
	get: function get(property) {
		// Let the time to the renderer to finish initializing
		if (this.isReady) {
			return (typeof this.api.get === "function") ? this.api.get(property) : this.api[property];
		}
	}, // end of get()


	/**
	 * Add a callback to launch when ready or set this renderer as ready
	 *
	 * @param {function} callback The callcack to add to the stack of callbacks to launch when ready.
	 * @return {boolean|undefined} When adding a callback, return `true` if the callback is correctly registered, `false` if it is not a function.
	 *   Otherwise, return `undefined`.
	 */
	ready: function ready(callback) {
		// If the renderer is already ready, simply launch the callback
		if (this.isReady) {
			return (typeof callback === "function") ? callback.call(this) && undefined : undefined;
		}

		// If we are receiving a callback, simply push it to the stack
		if (callback) {
			return (typeof callback === "function") ? !!this.callbacks.push(callback) : false;
		}

		// Loop through the callbacks and launch them
		while (this.callbacks && (callback = this.callbacks.shift())) {
			callback.call(this);
		}

		// We don't need the callbacks stack anymore
		delete this.callbacks;

		// This renderer is now ready
		this.isReady = true;
	}, // end of ready()


	/**
	 * Set a property's value
	 *
	 * @param {string} property The property to change.
	 * @param {*} value The new property's value.
	 * @return {*|undefined} Return the value corrected by the renderer or undefined if the renderer isn't ready.
	 */
	set: function set(property, value) {
		// Don't bother if the renderer isn't ready
		if (!this.isReady) { return; }

		// Use the set method of the element (plugins) if exists
		if (typeof this.api.set === "function") {
			return this.api.set(property, value);
		} else {
			// Otherwise try to set the property in the api
			// This may fail sometimes depending on the properties (ex: setting currentTime too soon)
			try {
				this.api[property] = value;
			} catch (e) {}

			// Return the corrected value
			return this.api[property];
		}
	}, // end of set()


	/**
	 * Trigger an event
	 * Beware to return nothing since this method can be called from ExternalInterface
	 * and returning the whole instance will slow down *a lot* flash
	 *
	 * @param {string} type The event type to dispatch
	 * @return {undefined} Return nothing.
	 */
	trigger: function trigger(type) {
		// Check if we have a triggerer (we never know)
		if (this.triggerer) {
			this.triggerer(type);
		}
	}, // end of trigger()


	/**
	 * Stop listening for an event type
	 *
	 * @param {string} types The event type(s) to listen.
	 *   You may provide multiple event types by separating them with a space.
	 * @return {Renderer} Return the current instance to allow chaining.
	 */
	unbind: function unbind(types) {
		var type; // Loop specific

		// Allow multiple events types separated by a space
		types = types ? types.replace(rTrim, "").split(rSplit) : []; // Trim first to avoid bad splitting

		// Loop through each event types
		while ((type = types.shift())) {
			// Is this renderer listening for this type?
			// Is there an API to call?
			// Is there an unbind method in the API?
			if (this.events[type] && this.api && typeof this.api.unbind === "function") {
				// Ask the renderer to actually unbind this type
				this.api.unbind(type);

				// Clean the cache for this event type
				delete this.events[type];
			}
		} // end of while

		return this; // Chaining
	} // end of unbind()
}); // end of Renderer.extend()

// Expose
window.Renderer = Renderer;
/**
 * The base FlashRenderer class
 * @abstract @constructor
 */
function FlashRenderer() {}


/**
 * The params to use to the SWF markup
 * @type {object}
 */
FlashRenderer.params = {
	allowscriptaccess: "always",
	wmode: "transparent"
};

/**
 * Some plugin info to use for plugin detection
 * @type {object}
 */
FlashRenderer.plugin = {
	minVersion: "10.1",
	plugin:  "Shockwave Flash",
	activex: "ShockwaveFlash.ShockwaveFlash"
};


// FlashRenderer can extend and will extend itself (statically)
FlashRenderer.extend = Renderer.extend;
FlashRenderer.extend(FlashRenderer, {
	/**
	 * Test if the browser is an old IE (6, 7, 8)
	 * Used to change the HTML markup
	 * @type {boolean}
	 */
	isOldIE: (function() {
		// The hack !+"\v1" is not used here since it is badly minified using UglifyJS
		// Instead, we use browser sniffing (pretty bad but it remains a working solution)
		var match = navigator.userAgent.match(/MSIE (\d+)/);
		return match ? match[1] < 9 : false;
	}()),


	/**
	 * Is Flash supported on this browser?
	 * @type {boolean}
	 */
	isSupported: Renderer.isPluginSupported(FlashRenderer.plugin),


	/**
	 * Replace an element with a markup loading an SWF
	 *
	 * @param {Element} The element to replace.
	 * @return {Renderer} Return the current instance to allow chaining.
	 */
	replace: function replace(element) {
		var
			// Prepare the <object>'s attributes
			attributes = {
				id:     this.config.id, // We need an id
				name:   this.config.id, // ExternalInterface sometimes require a name
				width:  this.config.width, // Set a width, even if it is 0
				height: this.config.height, // Set an heigh, even if it is 0
				type:   "application/x-shockwave-flash", // Flash's MIME type
				data:   this.constructor.swf // The URL of the SWF
			},
			flashvars = [], // The flashvars, used to transmit the rest of the config
			params    = {}, // The <param>s to create
			object    = document.createElement("object"), // The <object> !
			attribute, property, name, param; // Loop specific

		// Copy FlashRenderer.params, we might want to add a param later
		Renderer.extend(params, FlashRenderer.params);

		// Change the attributes for bad browsers
		if (FlashRenderer.isOldIE) {
			attributes.classid = "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000";
			params.movie       = attributes.data;
			delete attributes.type;
			delete attributes.data;
		}

		// Set the attributes
		for (attribute in attributes) {
			object[attribute] = attributes[attribute];
		}

		// Set the flashvars
		for (property in this.config) {
			// Ignore properties we already defined in the attributes
			if (property in attributes) { continue; }

			flashvars.push(property + "=" + this.config[property]);
		}

		// Add a param if we have some flashvars
		if (flashvars.length) {
			params.flashvars = flashvars.join("&");
		}

		// Create the <param>s and append them
		for (name in params) {
			param = document.createElement("param");
			param.name  = name;
			param.value = params[name];

			object.appendChild(param);
		}

		// Save the references for the <object> and define the endpoint for the API
		this.element = this.api = object;

		// Element might be null (the player will exists only on memory)
		if (element) {
			// Replace the element with the new one
			element.parentNode.replaceChild(this.element, element);
		}

		return this; // Chaining
	} // end of replace()
});
/**
 * The HTMLRenderer class
 * @constructor
 *
 * @see #Renderer.init() for signatures
 */
function HTMLRenderer(config) {
	// Do the basic renderers' needed stuff
	this.init(config);
} // end of HTMLRenderer()


/*!
 * Create a `<video>` in order to test browser's support
 * @type {Element}
 */
HTMLRenderer.tester = document.createElement("video");

// HTMLRenderer can inherit and will inherit from Renderer
HTMLRenderer.inherit = Renderer.inherit;
HTMLRenderer.inherit(Renderer);

// HTMLRenderer can extend and will extend itself (statically)
HTMLRenderer.extend = Renderer.extend;
HTMLRenderer.extend(HTMLRenderer, {
	/**
	 * Static reference to Renderer.canPlay
	 * @see #Renderer.canPlay()
	 */
	canPlay: Renderer.canPlay,


	/**
	 * Check if a given MIME type is readable by this renderer
	 * @see #Renderer.canPlay()
	 */
	canPlayType: function canPlayType(type) {
		return HTMLRenderer.isSupported ? HTMLRenderer.tester.canPlayType(type) : "";
	}, // end of HTMLRenderer.canPlayType()


	/**
	 * Will this renderer be supported on this browser?
	 * @type {boolean}
	 */
	isSupported: !!HTMLRenderer.tester.canPlayType,


	/*!
	 * A RegExp used to test if an element is <audio> or <video>
	 * @type {RegExp}
	 */
	rMedia: /audio|video/i,


	support: {
		autoplay: false
	}
}); // end of HTMLRenderer.extend(HTMLRenderer)

window.setTimeout(function() {
	var a = new Audio("data:audio/mpeg;base64,/+MYxAAAAANIAUAAAASEEB/jwOFM/0MM/90b/+RhST//w4NFwOjf///PZu////9lns5GFDv//l9GlUIEEIAAAgIg8Ir/JGq3/+MYxDsLIj5QMYcoAP0dv9HIjUcH//yYSg+CIbkGP//8w0bLVjUP///3Z0x5QCAv/yLjwtGKTEFNRTMuOTeqqqqqqqqqqqqq/+MYxEkNmdJkUYc4AKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
	a.autoplay = true;
	a.addEventListener("play", function() {
		HTMLRenderer.support.autoplay = true;
	});
}, 0);

// Extend the HTMLRenderer's prototype
HTMLRenderer.extend({
	/**
	 * Fix some browser inconsistencies and bugs
	 *
	 * @params {undefined}
	 * @return {HTMLRenderer} Return the current instance to allow chaining.
	 */
	fix: function fix() {
		// Don't bother if there is no element or if it is already fixed
		if (!this.element || this.element.fixed) {
			return this; // Chaining
		}

		/*!
		 * Browser sniffing is very bad, but in this case it is the only way to detect this bug
		 * It affects only WebKit version prior to 535
		 */

		var
			version = /AppleWebKit\/([\d]+)/.exec(navigator.userAgent);
			version = version ? parseInt(version[1], 10) : null;

		if (version && version < 535) {
			/**
			 * Fix for an old webkit bug affecting "ended" event
			 * @see https://bugs.webkit.org/show_bug.cgi?id=61336
			 */
			this.element.addEventListener("loadeddata", function() {
				// Using a try/catch to avoid webkit (mobile version) to yield about negative DOM value
				try {
					/**
					 * 0 will not work since we must trigger a seek
					 * We have to seek to a value near 0, 1e-5 (0.00001) seems good
					 */
					this.currentTime = 1e-5;
				} catch (e) {}
			}, false);
		} // end of if (version && version < 535)

		// This element is now fixed
		this.element.fixed = true;

		return this; // Chaining
	}, // end of fix()


	/**
	 * Replace an element with the renderer's markup
	 * @see #Renderer.replace()
	 */
	replace: function replace(element) {
		var
			triggerer = this.triggerer, // A reference to the fabuloos' instance triggerer
			prop; // Loop specific

		// Check if we are extending an existing <audio> or <video>
		if (element && HTMLRenderer.rMedia.test(element.nodeName)) {
			// Simply use the element
			this.element = element;
		} else {
			// Otherwise, create a blank element
			this.element = document.createElement("video");

			// Set the element's attributes according to configuration
			for (prop in this.config) {
				try {
					// Some properties might not be settable (currentTime)
					this.element[prop] = this.config[prop];
				} catch (e) {}
			}
		}

		// With <audio> or <video> the API is the element itself
		this.api = this.element;

		// Map the bind method to addEventListener
		this.api.bind = function(type) {
			this.addEventListener(type, triggerer, false);
		};

		// Map the bind method to addEventListener
		this.api.unbind = function(type) {
			this.removeEventListener(type, triggerer, false);
		};

		// Fix implementation problems
		this.fix();

		// Element might be null (the player will exists only on memory)
		if (element) {
			// Replace the element with the new one
			element.parentNode.replaceChild(this.element, element);
		}

		// The renderer is now ready
		this.ready();

		return this; // Chaining
	} // end of replace()
}); // end of HTMLRenderer.extend()


// Register this renderer
Renderer.register(HTMLRenderer);
/* global FlashRenderer */

/**
 * The FabuloosFlashRenderer class
 * @constructor
 *
 * @see #Renderer.init() for signatures
 */
function FabuloosFlashRenderer(config) {
	// Do the basic renderers' needed stuff
	this.init(config);
} // end of FabuloosFlashRenderer()


/**
 * The URL of the SWF file
 * @type {string}
 */
FabuloosFlashRenderer.swf = "FabuloosFlashRenderer.swf";

/**
 * Supported MIME types
 * @type {object}
 */
FabuloosFlashRenderer.types = {
	// Application (manifest)
	"application/f4m+xml":  "probably",
	"application/smil+xml": "probably",

	// Video
	"video/mp4":   "maybe",
	"video/x-m4v": "maybe",
	"video/x-flv": "maybe",
	"video/3gpp":  "maybe",
	"video/quicktime": "maybe",

	// Audio
	"audio/mp3": "maybe"
};

// FabuloosFlashRenderer can inherit and will inherit from Renderer
FabuloosFlashRenderer.inherit = Renderer.inherit;
FabuloosFlashRenderer.inherit(Renderer);

// FabuloosFlashRenderer can extend and will extend itself (statically)
FabuloosFlashRenderer.extend = Renderer.extend;
FabuloosFlashRenderer.extend(FabuloosFlashRenderer, {
	/**
	 * Check if a given URL is readable by this renderer
	 * @see #Renderer.canPlay()
	 */
	canPlay: function canPlay() {
		// Test for RTMP or use the basic Renderer's canPlay
		return FabuloosFlashRenderer.rRTMP.test(arguments[0]) ? "probably" : Renderer.canPlay.apply(this, arguments);
	}, // end of Renderer.canPlay()


	/**
	 * Static reference to Renderer.canPlayType
	 * @see #Renderer.canPlayType()
	 */
	canPlayType: Renderer.canPlayType,


	/**
	 * Will this renderer be supported on this browser?
	 * @type {boolean}
	 */
	isSupported: FlashRenderer.isSupported,


	/*!
	 * A RegExp used to check if an URL is an RTMP stream URL
	 * @type {RegExp}
	 */
	rRTMP: /^rtmp/i
});


// Extend the FabuloosFlashRenderer's prototype
FabuloosFlashRenderer.extend({
	play: Renderer.shorthand("_play"), // element.play() is reserved by ActiveX, use _play


	/**
	 * Static reference to FlashRenderer.replace
	 * @see #FlashRenderer.replace()
	 */
	replace: FlashRenderer.replace
}); // end of FabuloosFlashRenderer.extend()


// Register this renderer
Renderer.register(FabuloosFlashRenderer);
/* global FlashRenderer, YT */

/**
 * The YoutubeRenderer class
 * @constructor
 *
 * @see #Renderer.init() for signatures
 */
function YoutubeRenderer(config) {
	var script, first;

	// Do the basic renderers' needed stuff
	this.init(config);

	// On iframe mode, load the iframe's API script
	if (YoutubeRenderer.mode === "iframe" && !window.YT) {
		script     = document.createElement("script");
		script.src = "//www.youtube.com/iframe_api";

		// Handle a loading error
		script.onerror = function() {
			YoutubeRenderer.script = false;
		};

		first = document.getElementsByTagName("script")[0];
		first.parentNode.insertBefore(script, first);
	}
} // end of YoutubeRenderer()


/**
 * Detect the API mode (iframe or flash)
 * It have to be done right after the constructor since even the inheritance depend on this
 * @type {string}
 */
YoutubeRenderer.mode = !!window.postMessage ? "iframe" : (FlashRenderer.isSupported ? "flash" : "");

/**
 * The URL of the SWF file (Chromeless player)
 * @type {string}
 */
YoutubeRenderer.swf = "http://www.youtube.com/v/{id}?version=3";

// YoutubeRenderer can inherit and will inherit from Renderer
YoutubeRenderer.inherit = Renderer.inherit;
YoutubeRenderer.inherit(Renderer);

// YoutubeRenderer can extend and will extend itself (statically)
YoutubeRenderer.extend = Renderer.extend;
YoutubeRenderer.extend(YoutubeRenderer, {
	/**
	 * Check if a given URL is readable by this renderer
	 * @see #Renderer.canPlay()
	 */
	canPlay: function canPlay(url, type) {
		if (type) {
			return this.canPlayType(type);
		} else {
			return YoutubeRenderer.rYoutube.test(url) ? "probably" : "";
		}
	}, // end of canPlay()


	/**
	 * Check if a given MIME type is readable by this renderer
	 * @see #Renderer.canPlayType()
	 */
	canPlayType: function canPlayType(type) {
		return type === "video/youtube" ? "probably" : "";
	}, // end of YoutubeRenderer.canPlayType()


	/**
	 * Will this renderer be supported on this browser?
	 * @type {boolean}
	 */
	isSupported: !!YoutubeRenderer.mode,


	/*!
	 * A RegExp used to test a youtube URL and/or retrieve the video ID
	 * @type {RegExp}
	 */
	rYoutube: /.*youtu\.?be(?:\.com)?[\/|:](?:.+)?([\w\d\-]{11})/,


	/**
	 * The delay between each timeupdate event
	 * @type {Number}
	 */
	timeupdateDelay: 250
}); // end of YoutubeRenderer.extend(YoutubeRenderer)


// Extend the YoutubeRenderer's prototype
YoutubeRenderer.extend({
	/**
	 * Get a property's value
	 * @see #Renderer.get()
	 */
	get: function get(property) {
		// Don't bother if the renderer isn't ready
		if (!this.isReady) { return; }

		// TODO: implement the other getters
		switch (property) {
			case "autoplay":
			case "buffered":
			case "controls":
			case "currentSrc":
			break;

			case "currentTime":
				return this.api.getCurrentTime();

			case "defaultPlaybackRate":
			break;

			case "duration":
				return this.api.getDuration();

			case "ended":
			case "error":
			case "loop":
			break;

			case "muted":
				return this.api.isMuted();

			case "networkState":
			case "loop":
			break;

			case "paused":
				return this.api.getPlayerState() === 2;

			case "preload":
			case "playbackRate":
			case "played":
			case "poster":
			case "readyState":
			case "seekable":
			case "seeking":
			case "src":
			case "videoHeight":
			case "videoWidth":
			break;

			case "volume":
				return this.api.getVolume() / 100;
		} // end of switch (property)
	}, // end of get()


	/**
	 * Handle the Youtube's StateChange event
	 *
	 * @param {number} state The new state.
	 * @return {undefined} Return nothing.
	 */
	handleStateChange: function handleStateChange(state) {
		state = state.data || state; // iframe and flash events are differents

		// TODO: implement the required events
		switch (state) {
			case -1: // Unstarted
				this.dispatch("durationchange");
			break;

			case 0: // Ended
				this.trigger("ended");
			break;

			case 1: // Playing
				this.trigger("playing");

				// Manually set a timer to dispatch a "timeupdate" event
				this.timer = window.setInterval(this.closure("trigger", "timeupdate"), YoutubeRenderer.timeupdateDelay);
			break;

			case 2: // Paused
				this.trigger("pause");

				// Clear the timer
				window.clearInterval(this.timer);
			break;

			case 3: // Buffering
				// Clear the timer
				window.clearInterval(this.timer);
			break;
		} // end of switch (state)
	}, // end of handleStateChange()


	// API shorthands
	pause: Renderer.shorthand("pauseVideo"),
	play:  Renderer.shorthand("playVideo"),


	/**
	 * Replace an element with the renderer's markup
	 * @see #FlashRenderer.replace()
	 */
	replace: function replace(element) {
		var
			// Try to extract the videoId from the source
			id = this.config.src.replace(YoutubeRenderer.rYoutube, "$1"),

			// @see https://developers.google.com/youtube/player_parameters#Parameters
			parameters = {
				autoplay: this.config.autoplay ? 1 : 0, // Boolean doesn't seems to work
				controls: this.config.controls ? 1 : 0,
				disablekb: 1, // Prefer allowing the developper to use their owns
				enablejsapi: 1, // Always enable the JS API
				iv_load_policy: 3, // Disable annotations
				loop: this.config.loop ? 1 : 0,
				rel: 0, // Do not show related videos
				showinfo: 0 // Do not show video's title
			},

			parameter; // Loop specific

		// Use FlashRenderer's replace method when mode is flash
		if (YoutubeRenderer.mode === "flash") {
			var
				old = YoutubeRenderer.swf, // Remember the base SWF URL, we have to change it and revert it back
				swf = YoutubeRenderer.swf; // We have to change the SWF's URL to add some parameters

			// Prepare the SWF URL
			swf  = swf.replace("{id}", id); // Replace a token for the videoId ({id}) with the actual id
			swf += "&playerapiid=" + this.config.id; // Append the "playerapiid" to the SWF's URL to correctly dispatch events

			// Add the rest of the parameters
			for (parameter in parameters) {
				swf += "&" + parameter + "=" + parameters[parameter];
			}

			// FlashRenderer.replace use this.swf as source for the <object>, change it now and restore later
			YoutubeRenderer.swf = swf;

			// Replace the element
			FlashRenderer.replace.call(this, element);

			// Restore the base SWF URL
			YoutubeRenderer.swf = old;

			return this; // Chaining
		}

		// If the Youtube's script isn't ready, recall this method in 10ms
		if (!YoutubeRenderer.script) {
			// Recall only if the "script" property doesn't exists ("script" may be false if the loading fail)
			if (YoutubeRenderer.script === undefined) {
				window.setTimeout(this.closure("replace", element), 10);
			}

			return this; // Chaining
		}

		// Create the player
		this.api = new YT.Player(element, {
			width:      this.config.width,
			height:     this.config.height,
			videoId:    id,
			playerVars: parameters,
			events: {
				onReady:       this.closure("ready", null), // onReady will pass an event, prevent ready() to think it is a callback
				onStateChange: this.closure("handleStateChange")
			}
		}); // end of YT.Player()


		// It seems to be the only way to keep a reference to the element
		this.element = this.api.a;

		return this; // Chaining
	}, // end of replace()


	/**
	 * Set a property's value
	 * @see #Renderer.set()
	 */
	set: function set(property, value) {
		// Don't bother if the renderer isn't ready
		if (!this.isReady) { return; }

		// TODO: implement all setters
		switch (property) {
			case "autoplay":
			case "controls":
			break;

			case "currentTime":
				this.api.seekTo(value);
			break;

			case "defaultPlaybackRate":
			break;

			case "loop":
				this.api.setLoop(value);
			break;

			case "muted":
				this.api[value ? "mute" : "unMute"]();
				this.trigger("volumechange");
			break;

			case "playbackRate":
			case "poster":
			case "preload":
			break;

			case "src":
				this.api.loadVideoById(value.replace(YoutubeRenderer.rYoutube, "$1"));
			break;

			case "volume":
				this.api.setVolume(value * 100);
				this.trigger("volumechange");
			break;
		} // end of switch (property)

		// Return the new value
		return this.get(property);
	} // end of set()
}); // end of YoutubeRenderer.extend()


// We have some special things to do for iframe mode
if (YoutubeRenderer.mode === "iframe") {
	// Remember when the API is ready
	window.onYouTubeIframeAPIReady = function() {
		YoutubeRenderer.script = true;
	};
}


// We have some special things to do for flash mode
if (YoutubeRenderer.mode === "flash") {
	// Listen for the Youtube's flash API to be ready
	window.onYouTubePlayerReady = function(id) {
		// Retrieve the instance
		var instance = YoutubeRenderer.instances[id];

		// Abort if we couldn't find the instance
		if (!instance) { return; }

		/*!
		 * Since Youtube's addEventListener method call on window.something
		 * We have to retrieve the right YoutubeRenderer instance.
		 * Using YoutubeRenderer.instances["id"] doesn't work
		 * (the Youtube player cannot call on an array).
		 * We have to create something like YoutubeRenderer.handlers("id")
		 * To retrieve the right instance, then call the corresponding method 
		 */
		YoutubeRenderer.handlers = YoutubeRenderer.handlers || {};
		YoutubeRenderer.handlers[instance.config.id] = instance.closure("handleStateChange");

		// Register the event on the player
		// We have to listen only for onStateChange so the structure of handlers is simple
		instance.api.addEventListener("onStateChange", "Renderer.YoutubeRenderer.handlers." + instance.config.id);

		// The renderer is now ready
		instance.ready();
	}; // end of onYouTubePlayerReady()
}


// Register this renderer
Renderer.register(YoutubeRenderer);
/**
 * The base List class
 * @abstract @constructor
 */
function List() {}


// List can extend and will extend itself (statically)
List.extend = fab.extend;
List.extend(List, {
	/**
	 * Create a closure filtering the list with the given filter
	 *
	 * @param {object} filter The filter to pass to #get().
	 * @return {function} Return a closure calling #get() passing the filter.
	 */
	filter: function filter(_filter) {
		return function filter() {
			return this.get(_filter);
		};
	}, // end of filter()


	/**
	 * Create some filters methods in the prototype
	 *
	 * @param {object} filters The filters to create.
	 * @return {undefined} Return nothing.
	 */
	filters: function filters(_filters) {
		for (var method in _filters) {
			this.prototype[method] = this.filter(_filters[method]);
		}
	}, // end of filters()


	/**
	 * Create a closure calling the asked method on items
	 * The number of item will depend on the argument passed to the closure
	 * @see #get() for closure's signature
	 *
	 * @param {string} method The method name to launch on items.
	 * @return {function} Return a closure calling the method on the items of the list.
	 */
	shorthand: function shorthand(method) {
		return function shorthand(filter) {
			// Don't bother if we're trying to call an unknown method on the items
			if (!this.constructor.item.prototype[method]) { return; }

			var
				items = this.get(filter), // Get the items (may be all, none or just one)
				item, i = 0; // Loop specific

			// Do we have a list to iterate?
			if (items.length) {
				// Loop through
				while ((item = items.get(i++))) {
					item[method]();
				}
			} else if (item !== undefined) {
				// We found just one item so launch the method on it
				item[method]();
			}
		};
	}, // end of shorthand()


	/**
	 * Create some shorthands methods in the prototype
	 *
	 * @param {array} methods The methods to create.
	 * @return {undefined} Return nothing.
	 */
	shorthands: function shorthands(methods) {
		var method, i = 0; // Loop specific

		// Loop through received methods
		while ((method = methods[i++])) {
			this.prototype[method] = this.shorthand(method);
		}
	} // end of shorthands()
}); // end of List.extend(List)


// Extend the List's prototype
List.extend({
	/**
	 * Add an item to the list
	 *
	 * @param {Item} ... The item(s) to add.
	 * @return {List} Return the current instance to allow chaining.
	 */
	add: function add() {
		var
			list = this.list = this.list || [], // Makes sure we have an internal list
			i = 0, count = arguments.length; // Loop specific

		// Loop through items
		for (; i < count; i++) {
			// Only allow adding supported items
			if (arguments[i] instanceof this.constructor.item) {
				list.push(arguments[i]);
			}
		} // end of for

		return this; // Chaining
	}, // end of add()


	/**
	 * Delete one or more items
	 *
	 * @param {Item} item The item to delete.
	 * @return {List} Return the current instance to allow chaining.
	 *
	 * @param {number} index The item's index to delete.
	 * @return {List} Return the current instance to allow chaining.
	 *
	 * @param {undefined}
	 * @return {List} Return the current instance to allow chaining.
	 */
	del: function del(item) {
		var
			list = this.list = this.list || [], // Makes sure we have an internal list
			i = list.length; // Loop specific

		if (item === undefined) {
			// No argument, we will reset all the list
			list.length = 0;
		} else if (typeof item === "number") {
			// The argument is a number, simply drop the index
			list.splice(item, 1);
		} else if (item instanceof this.constructor.item) {
			// The argument is an Item instance, look for it and removes it
			// Loop through the list to find the ones to remove
			while (i--) {
				if (list[i] === item) {
					list.splice(i, 1); // Dump the item
					// Don't break since we may have more than one item occurence
				}
			} // end of while
		}

		return this; // Chaining
	}, // end of del()


	/**
	 * Get a list of items or a single item, depending on the filter
	 *
	 * @param {object} filter The filter to apply.
	 * @return {List} Return the list of item found.
	 *
	 * @param {number} index The item's index to look for.
	 * @return {Item|undefined} Return the item or `undefined` if there is no item for this index.
	 *
	 * @param {undefined}
	 * @return {List} Return the current list.
	 *
	 * @example
	 *   list.get() // Will return the whole list
	 *   list.get(0) // Will return the first item (or undefined if the list is empty)
	 *   list.get({ foo: "bar" }) // Will return the list of items having a property "foo" having "bar" as value
	 */
	get: function get(filter) {
		var
			list = this.list = this.list || [], // Makes sure we have an internal list
			i = 0, count = list.length, result, match, prop, value; // Loop specific

		// No filter means act like a getter
		if (filter === undefined) {
			return this; // Return the whole List instance
		} else if (typeof filter === "number") {
			// If the filter is a number, return the item of the list associated to the index
			return list[filter];
		} else if (filter && filter.constructor === Object) {
			// If the filter is an object, prepare to filter according to this object
			result = new this.constructor(); // Prepare the return value (always a List)

			// Loop throught the items to find the one matching
			for (; i < count; i++) {
				match = false; // Initialize the match flash

				// Loop through the filter's properties
				for (prop in filter) {
					// Retrieve the item's value (may have to call a function)
					value = typeof list[i][prop] === "function" ? list[i][prop]() : list[i][prop];
					match = filter[prop] === value; // Try to match the value against the filter's value

					// If this property doesn't match, don't bother trying the others
					if (!match) { break; }
				} // end of for

				// If we have a match, save this item reference to the result list
				if (match) {
					result.add(list[i]);
				}
			} // end of for

			return result;
		}
	}, // end of get()


	/**
	 * Retrieve the index of an item
	 *
	 * @param {Item} The item to look for.
	 * @return {number} Return the index of the item or -1 if item cannot be found.
	 */
	index: function index(item) {
		var
			list = this.list = this.list || [], // Makes sure we have an internal list
			i = list.length; // Loop specific

		// Don't bother if the item isn't a valid item
		if (!(item instanceof this.constructor.item)) { return -1; }

		// Look for the index
		// The "continue" is useless but needed for lint
		for (; i > -1 && list[i] !== item; i--) { continue; }

		return i;
	}, // end of index()


	/**
	 * Get or set the number of item in the list
	 *
	 * @param {undefined}
	 * @return {number} Return the number of item in the list.
	 *
	 * @param {number} length The number of item to keep.
	 * @return {number} Return the number of item in the list.
	 */
	length: function length(_length) {
		var list = this.list = this.list || []; // Makes sure we have an internal list
		return typeof _length === "number" ? (list.length = _length) : list.length;
	}, // end of length()


	/**
	 * Replace an item
	 *
	 * @param {number} index The index of the item to replace.
	 * @param {Item} item The new item.
	 * @return {List} Return the current instance to allow chaining.
	 */
	set: function set(index, item) {
		var list = this.list = this.list || []; // Makes sure we have an internal list
		if (typeof index === "number" && item instanceof this.constructor.item) {
			list[index] = item;
		}
	} // end of set()
}); // end of List.extend()


/**
 * The Track class
 * @constructor
 *
 * @param {string} kind The kind of track to create.
 * @param {string} label="" The label of the track.
 * @param {string} lang="" The language of the track.
 * @return {Track} A new Track instance.
 */
function Track(kind, label, lang) {
	if (!kind) {
		throw "A track must have a kind";
	}

	this.kind  = kind;
	this.label = label || "";
	this.lang  = lang  || "";
	this.cues       = new TrackCueList();
	this.activeCues = new TrackCueList(); // TODO: change name
} // end of Track()


// Track can extend and will extend itself (statically)
Track.extend = fab.extend;
Track.extend(Track, {
	/**
	 * The different modes supported
	 * @type {number}
	 */
	DISABLED: 0,
	HIDDEN:   1,
	SHOWING:  2
}); // end of Track.extend(Track)


// Extend Track's prototype
Track.extend({
	/**
	 * Check if the track is currently active
	 *
	 * @param {undefined}
	 * @return {boolean} Return false if the track is disabled (mode to Track.DISABLED).
	 */
	active: function active() {
		return this.mode !== Track.DISABLED;
	}, // end of active()


	/**
	 * Add a cue to the list of cues.
	 *
	 * @param {TrackCue} ... The cues to add.
	 * @return {Track} Return the current instance to allow chaining.
	 */
	add: function add() {
		var
			cues = fab.toArray(arguments), // Copy the received cues
			cue; // Loop specific

		// Loop through received cues
		while ((cue = cues.shift())) {
			// Ignore bad arguments
			if (!(cue instanceof TrackCue)) { continue; }

			// If this cue is already in the list, removed it
			this.cues.del(cue);

			// This cue now belongs to this track
			cue.track = this;

			// Add the cue to the list
			this.cues.add(cue);
		} // end while

		return this; // Chaining
	}, // end of add()


	/**
	 * Delete a cue to the list of cues.
	 *
	 * @param {TrackCue} cue The cue to delete.
	 * @return {Track} Return the current instance to allow chaining.
	 */
	del: function del(cue) {
		this.cues.del(cue);
		return this; // Chaining
	}, // end of del()


	/**
	 * Disable the track (set its mode to Track.DISABLED)
	 *
	 * @param {undefined}
	 * @return {Track} Return the current instance to allow chaining.
	 */
	disable: function disable() {
		this.mode = Track.DISABLED;
		return this; // Chaining
	}, // end of disable()


	/**
	 * Check if the track is currently disabled
	 *
	 * @param {undefined}
	 * @return {boolean} Return true if the track is disabled (mode to Track.DISABLED).
	 */
	disabled: function disabled() {
		return this.mode === Track.DISABLED;
	}, // end of disabled()


	/**
	 * Hide the track (set its mode to Track.HIDDEN)
	 *
	 * @param {undefined}
	 * @return {Track} Return the current instance to allow chaining.
	 */
	hide: function hide() {
		this.mode = Track.HIDDEN;
		return this; // Chaining
	}, // end of hide()


	/**
	 * Check if the track if currently hidden
	 *
	 * @param {undefined}
	 * @return {boolean} Return true if the track is hidden (mode to Track.HIDDEN).
	 */
	hidden: function hidden() {
		return this.mode === Track.HIDDEN;
	}, // end of hidden()


	/**
	 * The default mode for each tracks
	 * @type {number}
	 */
	mode: Track.HIDDEN,


	/**
	 * Show the track (set its mode to Track.SHOWING)
	 *
	 * @param {undefined}
	 * @return {Track} Return the current instance to allow chaining.
	 */
	show: function show() {
		this.mode = Track.SHOWING;
		return this; // Chaining
	}, // end of show()


	/**
	 * Check if the track is currently showing
	 *
	 * @param {undefined}
	 * @return {boolean} Return true if the track is showing (mode to Track.SHOWING).
	 */
	showing: function showing() {
		return this.mode === Track.SHOWING;
	} // end of showing()
}); //end of Track.extend()


/**
 * The Track class
 * @constructor
 */
function TrackList() {}


// The only allowed item in this list is Track
TrackList.item = Track;

TrackList.extend = fab.extend; // TrackList can extend itself and/or its prototype
TrackList.extend(TrackList, List); // Copy List's static methods in TrackList
TrackList.extend(List.prototype); // Copy List's prototype's methods in TrackList's prototype

// Create some filters in the prototype
TrackList.filters({
	active:   { active:   true },
	disabled: { disabled: true },
	hidden:   { hidden:   true },
	showing:  { showing:  true },

	subtitles:    { kind: "subtitles" },
	captions:     { kind: "captions" },
	descriptions: { kind: "descriptions" },
	chapters:     { kind: "chapters" },
	metadata:     { kind: "metadata" }
});

// Create some shorthands methods
TrackList.shorthands(["disable", "hide", "show"]);


/**
 * The TrackCue class
 * @constructor
 */
function TrackCue(start, end, text) {
	this.track       = null;

	this.id          = "";
	this.start       = start;
	this.end         = end;
	this.pauseOnExit = false;
	this.vertical    = TrackCue.DIRECTION.HORIZONTAL;
	this.snapToLines = true;
	this.line        = -1;
	this.position    = 50;
	this.size        = 100;
	this.align       = TrackCue.ALIGN.MIDDLE;
	this.text        = text || "";
} // end of TrackCue()


// TrackCue can extend and will extend itself (statically)
TrackCue.extend = fab.extend;
TrackCue.extend(TrackCue, {
	/**
	 * An hash of possible alignments
	 * @type {object}
	 */
	ALIGN: {
		START:  "start",
		MIDDLE: "middle",
		END:    "end",
		LEFT:   "left",
		RIGHT:  "right"
	},

	/**
	 * An hash of possible directions
	 * @type {object}
	 */
	DIRECTION: {
		HORIZONTAL:    "",
		VERTICALLEFT:  "rl",
		VERTICALRIGHT: "lr"
	}
}); // end of TrackCue.extend(TrackCue)


// Extend the TrackCue's prototype
TrackCue.extend(fab.event.api); // Add the event listener interface (on(), off() and trigger())
TrackCue.extend({
	/**
	 * Return a document fragment containing the cue's text.
	 * Still WIP since it must implement WebVTT's DOM construction (see http://dev.w3.org/html5/webvtt/#dfn-webvtt-cue-text-dom-construction-rules)
	 *
	 * @param {undefined}
	 * @return {DocumentFragment} Return a document fragment containing the cue's text.
	 */
	getCueAsHTML: function getCueAsHTML() {
		var
			fragment  = document.createDocumentFragment(),
			container = document.createElement("p");

		container.innerHTML = this.text;
		fragment.appendChild(container);

		return fragment;
	} // end of getCueAsHTML()
});


/**
 * The TrackCueList class
 * @constructor
 */
function TrackCueList() {}


// The only allowed item in this list is Track
TrackCueList.item = TrackCue;

TrackCueList.extend = fab.extend; // TrackCueList can extend itself and/or its prototype
TrackCueList.extend(TrackList, List); // Copy List's static methods in TrackCueList
TrackCueList.extend(List.prototype); // Copy List's prototype's methods in TrackCueList's prototype

// Extend TrackCueList's prototype
TrackCueList.extend({
	/**
	 * Search for a TrackCue having a given id
	 * This is basically the same as calling get({id: "foo"})
	 *
	 * @param {string} id The id to look for.
	 * @return {TrackCue|null} Return the `TrackCue` found or `null`.
	 */
	getCueById: function getCueById(id) {
		return this.get({ id: id }).get(0) || null;
	} // end of getCueById()
}); //end of TrackCueList.extend()


// Expose
fab.List         = List;
fab.Track        = Track;
fab.TrackList    = TrackList;
fab.TrackCue     = TrackCue;
fab.TrackCueList = TrackCueList;
/* global List */

/**
 * The Playlist class
 * @constructor
 */
function Playlist() {}


// The only allowed item in this list is Object (well, basically accept anything)
Playlist.item = Object;

Playlist.extend = fab.extend; // Playlist can extend itself and/or its prototype
Playlist.extend(Playlist, List); // Copy List's static methods in Playlist
Playlist.extend(List.prototype); // Copy List's prototype's methods in Playlist's prototype

// Extend the Playlist's prototype
Playlist.extend({
	/**
	 * Add an item to the list
	 * Surcharged to avoid adding bad items.
	 * @see #List.prototype.add() for other signatures.
	 */
	add: function add() {
		var i = 0, count = arguments.length, item; // Loop specific

		// Loop through each item to add
		for (; i < count; i++) {
			item = arguments[i]; // More convenient

			// Ignore falsy items (undefined, null or "")
			if (!item) { continue; }

			// Handling string would be too complex, simple convert to an object
			if (typeof item === "string") {
				item = { src: item };
			}

			// Add the item (other types will be ignored)
			this._super(item);
		}

		return this; // Chaining
	}, // end of add()


	/**
	 * The current item
	 * @type {number}
	 */
	current: 0,


	/**
	 * Get a list of items or a single item, depending on the filter
	 *
	 * @param {string} filter A filter keyword.
	 *   Possible values are: "first", "prev", "previous", "current", "next" and "last"
	 * @return {Object|undefined} Return a configuration object or `undefined` if the asked filter doesn't exists.
	 *
	 * @see #List.prototype.get() for other signatures.
	 */
	get: function get(filter) {
		// If the filter isn't a keyword calm down and carry on.
		if (typeof filter !== "string") {
			return this._super(filter);
		}

		// Prepare the index we're looking for
		var index = -1; // -1 means if we received an unknown filter we'll return undefined

		// This part doesn't need to be commented, otherwise you should consider changing your job.
		switch (filter) {
			case "first":
				index = 0;
			break;

			case "prev":
			case "previous":
				index = this.current - 1;
			break;

			case "current":
				index = this.current;
			break;

			case "next":
				index = this.current + 1;
			break;

			case "last":
				index = this.length() - 1;
			break;
		}

		// Return the item (or not, that is the question)
		return this._super(index);
	} // end of get()
}); // end of Playlist.extend()


/*!
 * Change the playlist's current item for a new one
 *
 * @param {string|object|number} filter The filter to use to find the new item.
 * @return {fabuloos} Return the current instance to allow chaining.
 */
function change(filter) {
	var
			playlist = this.playlist(), // Get the playlist (or create a new one)
			item     = playlist.get(filter); // Try to retrieve the asked item

		// If there is an item, set it as current and pass it to config()
		if (item) {
			playlist.current = playlist.index(item);
			this.config(item);
		}

		return this; // Chaining
} // end of change()


// Extend the fabuloos' prototype
fab.extend({
	/**
	 * Pass to #config() the first item of the playlist
	 *
	 * @param {undefined}
	 * @return {fabuloos} Return the current instance to allow chaining.
	 */
	first: function first() {
		return change.call(this, 0);
	}, // end of first()


	/**
	 * Pass to #config() the previous item of the playlist
	 *
	 * @param {undefined}
	 * @return {fabuloos} Return the current instance to allow chaining.
	 */
	previous: function previous() {
		return change.call(this, "previous");
	}, // end of previous()


	/**
	 * Pass to #config() the next item of the playlist
	 *
	 * @param {undefined}
	 * @return {fabuloos} Return the current instance to allow chaining.
	 */
	next: function next() {
		return change.call(this, "next");
	}, // end of next()


	/**
	 * Pass to #config() the last item of the playlist
	 *
	 * @param {undefined}
	 * @return {fabuloos} Return the current instance to allow chaining.
	 */
	last: function last() {
		return change.call(this, "last");
	}, // end of last()


	/**
	 * Get or set the playlist of media to play
	 *
	 * @param {array} config The items to play.
	 *   Each item may be a simple string (the source URL to play) or an object to apply using #config().
	 * @return {fabuloos} Return the current instance to allow chaining.
	 *
	 * @param {undefined}
	 * @return {Playlist} Return the current playlist.
	 */
	playlist: function playlist(config) {
		var
			_playlist = this._playlist = this._playlist || new Playlist(), // Makes sure we always have an internal playlist
			_config   = config ? (config.push ? config.slice(0) : [config]) : []; // Makes sure we always have an array

		// No config, act as a getter
		if (config === undefined) {
			return this._playlist;
		}

		// Add the items to the playlist
		_playlist.add.apply(_playlist, _config);

		// Set the first item
		this.first();

		// When a source is complete, pass to the next one
		this.on("ended", this.closure("next"));

		return this; // Chaining
	} // end of playlist()
}); // end of fab.extend()

}(window));