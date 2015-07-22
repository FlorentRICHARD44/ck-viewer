/**
 * @class Ck
 *
 * The Ck namespace (global object) encapsulates all classes, singletons, and
 * utility methods provided by Chinook's libraries 
 *
 * @singleton
 */
Ext.ns('Ck');

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
	
	
	getInfos: function() {
		return Ext.manifest.packages['ck-viewer'];
	},
	getVersion: function() {
		return this.getInfos().version;
	},
	getEnvironment: function() {
		return this.getInfos().environment;
	},
	getEnv: function() {
		return this.getEnvironment();
	}
});

/**
 * Load Ck classes
 * @ignore
 */
Ext.require([
	'Ck.Controller',
	'Ck.Ajax',
	
	'Ck.Map',
	'Ck.Legend',
	'Ck.Toolbar'
]);

/**
 * Init global variable on page load
 * @ignore 
 */
Ext.onReady(function(){
	Ck.params = Ext.Object.fromQueryString(location.search);
});