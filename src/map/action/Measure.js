/**
 * 
 */
// From : http://openlayers.org/en/master/examples/measure.html?q=measure
Ext.define('Ck.map.action.Measure', {
	extend: 'Ck.Action',
	alias: 'widget.ckmapMeasure',
	
	itemId: 'measure',
	text: '',
	iconCls: 'fa fa-gear',
	tooltip: '',
	
	toggleGroup: 'ckmapAction',
	
	/**
	 * length or area
	 */
	type: 'length',
	
	/**
	 * Currently drawn feature.
	 * @type {ol.Feature}
	 */
	sketch: null,


	/**
	 * The measure tooltip element.
	 * @type {Element}
	 */
	measureTooltipElement: null,


	/**
	 * Overlay to show the measurement.
	 * @type {ol.Overlay}
	 */
	measureTooltip: null,


	/**
	 * Message to show when the user start measure.
	 * @type {string}
	 */
	startMsg : 'Click to start measuring',
	
	/**
	 * Message to show when the user is drawing a polygon.
	 * @type {string}
	 */
	continueMsg: 'Click to continue measuring',


	geodesic: true,
	
	draw: null,
	
	/**
	 *
	 */
	ckLayersInit: function(map) {
		// this.callParent([config]);
		
		this.olMap = ckmap.getOlMap();
		
		var source = new ol.source.Vector();
		var vector = new ol.layer.Vector({
			source: source,
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 255, 255, 0.2)'
				}),
				stroke: new ol.style.Stroke({
					color: '#ffcc33',
					width: 2
				}),
				image: new ol.style.Circle({
					radius: 7,
					fill: new ol.style.Fill({
						color: '#ffcc33'
					})
				})
			})
		});
		this.olMap.addLayer(vector);
		
		this.type = this.initialConfig.type || this.type;
		var gtype = (this.type == 'area' ? 'Polygon' : 'LineString');

		this.draw = new ol.interaction.Draw({
			source: source,
			type: gtype,
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 255, 255, 0.2)'
				}),
				stroke: new ol.style.Stroke({
					color: 'rgba(0, 0, 0, 0.5)',
					lineDash: [10, 10],
					width: 2
				}),
				image: new ol.style.Circle({
					radius: 5,
					stroke: new ol.style.Stroke({
						color: 'rgba(0, 0, 0, 0.7)'
					}),
					fill: new ol.style.Fill({
						color: 'rgba(255, 255, 255, 0.2)'
					})
				})
			})
		});
		this.olMap.addInteraction(this.draw);
		this.draw.setActive(false);
		
		this.createMeasureTooltip();
		this.createHelpTooltip();

		// this.draw.on('change:active', function(evt) {
			// var active = evt.target.get('active');
		// }, this);
		
		this.draw.on('drawstart', function(evt) {
			// set sketch
			this.sketch = evt.feature;
		}, this);

		this.draw.on('drawend', function(evt) {
			this.measureTooltipElement.className = 'tooltip tooltip-static';
			this.measureTooltip.setOffset([0, -7]);
			// unset sketch
			this.sketch = null;
			// unset tooltip so that a new one can be created
			this.measureTooltipElement = null;
			this.createMeasureTooltip();
		}, this);
		
		this.wgs84Sphere = new ol.Sphere(6378137);
	},
	
	/**
	 * 
	 */
	toggleAction: function(btn, pressed) {
		this.draw.setActive(pressed);
		if(pressed) {
			this.olMap.on('pointermove', this.pointerMoveHandler, this);
		} else {
			this.olMap.un('pointermove', this.pointerMoveHandler, this);
		}
	},
	
	/**
	 * Handle pointer move.
	 * @param {ol.MapBrowserEvent} evt
	 */
	pointerMoveHandler: function(evt) {
		if (evt.dragging) {
			return;
		}
		
		var tooltipCoord = evt.coordinate;

		if (this.sketch) {
			var output;
			var geom = (this.sketch.getGeometry());
			if (geom instanceof ol.geom.Polygon) {
				output = this.formatArea(geom);
				tooltipCoord = geom.getInteriorPoint().getCoordinates();
			} else if (geom instanceof ol.geom.LineString) {
				output = this.formatLength(geom);
				tooltipCoord = geom.getLastCoordinate();
			}
			this.measureTooltipElement.innerHTML = output;
			this.measureTooltip.setPosition(tooltipCoord);
		}
	},
	
	/**
	 * Creates a new help tooltip
	 */
	createHelpTooltip: function() {
		Ext.create('Ext.tip.ToolTip', {
			target: this.olMap.getViewport(),
			trackMouse: true,
			dismissDelay: 0,
			renderTo: Ext.getBody(),
			onDocMouseDown: function() {
				// prevent hide tooltip on click
				Ext.defer(function(){
					this.fireEvent('beforeshow', this);
				}, 200, this);
			}, 
			listeners: {
				beforeshow: function(tip) {
					if(!this.draw.get('active')) return false;
					
					var helpMsg = this.startMsg;
					if (this.sketch) helpMsg = this.continueMsg;
					tip.update(helpMsg);
				},
				scope: this
			}
		});
	},


	/**
	 * Creates a new measure tooltip
	 */
	createMeasureTooltip: function() {
		if (this.measureTooltipElement) {
			this.measureTooltipElement.parentNode.removeChild(this.measureTooltipElement);
		}
		this.measureTooltipElement = document.createElement('div');
		this.measureTooltipElement.className = 'tooltip tooltip-measure';
		this.measureTooltip = new ol.Overlay({
			element: this.measureTooltipElement,
			offset: [0, -15],
			positioning: 'bottom-center'
		});
		this.olMap.addOverlay(this.measureTooltip);
	},


	/**
	 * format length output
	 * @param {ol.geom.LineString} line
	 * @return {string}
	 */
	formatLength: function(line) {
		var length;
		if (this.geodesic) {
			var coordinates = line.getCoordinates();
			length = 0;
			var sourceProj = this.olMap.getView().getProjection();
			for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
				var c1 = ol.proj.transform(coordinates[i], sourceProj, 'EPSG:4326');
				var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, 'EPSG:4326');
				length += this.wgs84Sphere.haversineDistance(c1, c2);
			}
		} else {
			length = Math.round(line.getLength() * 100) / 100;
		}
		var output;
		if (length > 100) {
			output = (Math.round(length / 1000 * 100) / 100) +
					' ' + 'km';
		} else {
			output = (Math.round(length * 100) / 100) +
					' ' + 'm';
		}
		return output;
	},


	/**
	 * format length output
	 * @param {ol.geom.Polygon} polygon
	 * @return {string}
	 */
	formatArea: function(polygon) {
		var area;
		if (this.geodesic) {
			var sourceProj = this.olMap.getView().getProjection();
			var geom = polygon.clone().transform(sourceProj, 'EPSG:4326');
			var coordinates = geom.getLinearRing(0).getCoordinates();
			area = Math.abs(this.wgs84Sphere.geodesicArea(coordinates));
		} else {
			area = polygon.getArea();
		}
		var output;
		if (area > 10000) {
			output = (Math.round(area / 1000000 * 100) / 100) +
					' ' + 'km<sup>2</sup>';
		} else {
			output = (Math.round(area * 100) / 100) +
					' ' + 'm<sup>2</sup>';
		}
		return output;
	}
});
