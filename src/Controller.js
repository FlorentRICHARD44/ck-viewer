/** 
 * Base controller for all ck.*.controller.
 * 
 * Add the {@link ckReady} and {@link ckLoaded} functions called on ckmap ready and loaded event.
 *
 */
Ext.define('Ck.Controller', {
	extend: 'Ext.app.ViewController',

	listen: {
		controller: {
			'ckmap': {
				// Called when map is ready
				ready: 'onMapReady',
				// Called when layers are added from context
				loaded: 'onMapLoaded'
			}
		}
	},
	
	config: {
		map		: null,
		olMap	: null,
		olView	: null
	},
		
	/**
	 * Called when the map is ready.
	 * @param {Ck.map.Controller} mapController The map controller
	 */
	ckReady: Ext.emptyFn,
	
	/**
	 * Called when the layers are ready from context.
	 * @param {Ck.map.Controller} mapController The map controller
	 */
	ckLoaded: Ext.emptyFn,
	
	/**
	 * Optionnaly called by child class. Init map and olMap component
	 * @param {Ext.Component}
	 */
	init: function(view) {
		var map = this.getMap();
		
		if(!Ext.isObject(map)) {
			map = Ck.getMap();
		}
		
		if(Ext.isObject(map)) {
			this.setMap(map);
		}
	},
	
	/**
	 * Called by 'ready' event of ckmap controller
	 * @protected
	 */
	onMapReady: function(mapController) {
		this.setMap(mapController);
		this.ckReady(mapController);
	},
	
	/**
	 * Called by 'loaded' event of ckmap controller
	 * @protected
	 */
	onMapLoaded: function(mapController) {
		this.setMap(mapController);
		this.ckLoaded(mapController);
	},
	
	setMap: function(ckMap) {
		this._map = ckMap;
		this._olMap = ckMap.getOlMap();
		this._olView = ckMap.getOlView();
	},

	/**
	 * Get the full URL of resource.
	 *
	 * - ck-name : static resource in ck-viewer package
	 * - /name : static resource in application
	 * - name : resource from service REST API
	 *
	 * @param {string} name of the resource
	 * @return {string} the full Url
	 */
	getFullUrl: function (name) {
		var url = '';
		
		if(Ext.String.startsWith(name, 'http')) {
			return name;
		}
		
		var tpl = {st: "", ws: ""};
		if(Ext.isFunction(this.getView().getUrlTemplate)){
			tpl = this.getView().getUrlTemplate();
		}

		// Static resource in ck-viewer package
		if(Ext.String.startsWith(name, 'ck-')) {
			url = Ext.String.format(tpl.st, Ck.getPath(), name);
		}

		// Static resource in application
		else if(Ext.String.startsWith(name, '/')) {
			url = Ext.String.format(tpl.st, 'resources', name);
			url = url.replace('//', '/');
		}

		// Resource from Web Service (API Call)
		else {
			url = Ext.String.format(tpl.ws, Ck.getApi(), name);
		}

		// Security for url path
		url = url.replace(/\.\./g, '');

		return url;
	}
});
