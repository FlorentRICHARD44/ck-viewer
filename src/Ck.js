/**
 * @class Ck
 *
 * The Ck namespace (global object) encapsulates all classes, singletons, and
 * utility methods provided by Chinook's libraries 
 *
 * ## Application start 
 *
 * The main applications is initiated with Ext.application which is called once the DOM is ready.
 * Then call the main view {app}.view.main.Main which extend Ck.View the entry point of the 'ck-viewer' package.
 *
 * For example:
 *
 *     Ext.define('AppDemo.view.main.Main', {
 *         extend: 'Ck.View',
 *         xtype: 'app-main',
 *     	
 *     	requires: [
 *     		'AppDemo.view.main.MainController'
 *     	],
 *     	
 *     	controller: 'main'
 *     });
 *
 * ## URL Parameters
 *
 * The application can use URL Parameters to configure differents view.
 *
 *     - Ck.view.Controller
 *         - app : name of the layout to load
 *     - Ck.map.Controller
 *         - context : name of the context to load
 *     - Ck.Ajax
 *         - nocache : allow to reload the app and context from server (ignore LocalStorage)
 *
 * ## Next...
 * 
 * For a Web GIS package the most important view is Ck.Map and Ck.Legend.
 *
 * The Ck.Controller is also very important as a basis of all other controllers of the package.
 *
 * @singleton
 */
var Ck = Ck || {};

// @define Ck
Ext.apply(Ck, {
	
	/**
	 * @property params
	 * @type Object
	 * @readonly
	 * Global variable Ext.params of the current URL parameters
	 */
	params: {},
	
	/**
	 * @property actions
	 * @type Array
	 * @readonly
	 * Global array of avaible Ck.Action.
	 */
	actions: [],
	
	/**
	 * Called on app start.
	 * 
	 * Populate the Ck.params parameter.
	 */
	init: function() {
		Ck.params = Ext.Object.fromQueryString(location.search);
	},
	
	/**
	 * Adds a listener to be notified when the map is ready (before context and layers are loaded).
	 *
     * @param {Function} fn The method to call.
     * @param {Object} [scope] The scope (`this` reference) in which the handler function
     * executes. Defaults to the browser window.
     * @param {Object} [options] An object with extra options.
     * @param {Number} [options.delay=0] A number of milliseconds to delay.
     * @param {Number} [options.priority=0] Relative priority of this callback. A larger
     * number will result in the callback being sorted before the others.  Priorities
     * 1000 or greater and -1000 or lesser are reserved for internal framework use only.
	 */
	onReady: function(fn, scope, options) {
		Ext.on('ckmapReady', fn, scope, options);
	},
	
	/**
	 * Get all the maps avaible.
	 * @return {Ck.map.Controller[]} An array of map controllers
	 */
	getMaps: function() {
		// Return all maps components by CSS Selector
		var maps = Ext.query('.ck-map');
		for(m=0; m<maps.length; m++) {
			maps[m] = Ext.getCmp(maps[m].id).getController();
		}
		return maps;
	},
	
	/**
	 * Get the first map or a map by id.
	 * @param {string} [idMap] id of the map
	 * @return {Ck.map.Controller} the map controllers
	 */
	getMap: function(idMap) {
		var map;
		
		if(!idMap) {
			// Return the first map component by CSS Selector
			map = Ck.getMaps().shift();
			if(!map) return false;
		} else {
			// Return the map component by ID
			map = Ext.getCmp(idMap);
			if(!map) return false;
			map = map.getController();
		}
		
		return map;
	},
	
	
	/**
	 * Get informations of the package (from Ext.manifest).
	 *
	 *  - creator
	 *  - version
	 *  - environment
	 *
	 * @return {Object} The informations
	 */
	getInfos: function() {
		if(!Ext.manifest.packages) return {};
		return Ext.manifest.packages['ck-viewer'];
	},
	
	/**
	 * Get version of the package (from Ext.manifest).
	 * Also avaible with Ext.versions
	 *
	 * @return {String} The version number as string
	 */
	getVersion: function() {
		return this.getInfos().version;
	},
	
	/**
	 * Get execution environment (from Ext.manifest).
	 *
	 *  - production
	 *  - testing
	 *  - development
	 *
	 * @return {String} The environment
	 */
	getEnvironment: function() {
		return this.getInfos().environment;
	},
	
	/**
	 * Short alias of Ck.getEnvironment, get execution environment (from Ext.manifest).
	 *
	 *  - production
	 *  - testing
	 *  - development
	 *
	 * @return {String} The environment
	 */	
	getEnv: function() {
		return this.getEnvironment();
	},
	
	
	/**
	 * @inheritdoc Ext#log
	 */
	log: function(opt) {
		Ext.log(opt);
	},
	
	/**
	 * Alias for Ck.log({level:'error', ...}). Log a message with error level.
	 *
	 * Note : only accept a string (the error message). To use all the log options see Ck.log.
	 *
	 * This method does nothing in a release build.
	 *
     * @param {String} msg The error message to log.
	 */
	error: function(msg) {
		Ext.log({
			level: 'error',
			msg: msg
		});
	},
	
	/**
	 * Create an object from a config object
	 * @param {String/Object}		Class name or config object. Config object must have "xtype" and "config" member
	 * @param {Object/undefined}	Config object if first param is a string
	 * @return {Object/False}		An instance of desired class or false if an error occurred
	 */
	create: function(cls, config) {
		if(typeof cls == "object") {
			cls = cls.xtype;
			config = cls.config || {}
		} else if(typeof cls == "string") {
			config = config || {};
		} else {
			Ck.error("Function signature not respected -> Ck.create({String/Object}, {Object})");
			return false;
		}
		
		var constructor = Ck.getClass(cls);
		
		if(typeof constructor == "function") {
			var lib = this.getOwnerLibrary(cls);
			switch(lib) {
				case "Ext":
					var obj = Ext.create(cls, config);
					break;
				default:
					var obj = new constructor(config);
			}
		} else {
			Ck.error("The class \"" + cls + "\" does not exists.");
			return false;
		}
		
		if(obj instanceof constructor) {				
			return obj;
		} else {
			Ck.error("Instanciation of the " + cls + " object failed.");
			return false;
		}
	},
	
	/**
	 * Return the owner library of a class
	 * @param {String}
	 * @return {String}
	 */
	getOwnerLibrary: function(className) {
		var namespaces = className.split(".");
		return namespaces[0];
	},
	
	/**
	 * Return the constructor of a class from a string or undefined if class does not exists
	 * @param {String} Name of the desired class
	 * @return {Function} Constructor of the desired class
	 **/
	getClass: function(className) {
		var namespaces = className.split(".");
		var windowSpace = window;
		for(var i=0; i<namespaces.length; i++) {
			if(typeof windowSpace[namespaces[i]] == "undefined") {
				return undefined;
			}
			windowSpace = windowSpace[namespaces[i]];
		}
		return windowSpace;
	}	
}).init();
