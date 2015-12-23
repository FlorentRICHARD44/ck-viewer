/**
 * Controller of the edit panel. An edit panel consists of :
 *
 * - Edit action add, delete, attribute...
 * - History grid to log modification (optionnal)
 * - Vertex grid to modify geometry accurately (optionnal)
 */
Ext.define('Ck.edit.Controller', {
	extend: 'Ck.Controller',
	alias: 'controller.ckedit',
	
	editPanelVisible: true,
	
	/**
	 * Indicate if the edited layer is a multi-feature layer (like MultiLineString)
	 */
	multi: false,
	
	/**
	 * If the edited layer is a WMS layer
	 */
	isWMS: false,
	
	/**
	 * Format to use for getFeature and writeTransaction. Only set when isWMS is true
	 * @var {ol.format.WFS}
	 */
	format: null,
	 
	
	/**
	 * @event featurecreate
	 * Fires when a feature was created
	 * @param {ol.Feature}
	 */
	 
	/**
	 * @event featuregeometry
	 * Fires when a feature geometry was modified
	 * @param {ol.Feature}
	 */
	 
	/**
	 * @event featureattribute
	 * Fires when a feature attribute was modified
	 * @param {ol.Feature}
	 */
	 
	/**
	 * @event featureremove
	 * Fires when a feature was removed
	 * @param {ol.Feature}
	 */
	
	/**
	 * @event featurecrop
	 * Fires when a feature was croped
	 * @param {ol.Feature}
	 */
	 
	/**
	 * @event featureunion
	 * Fires when a feature was gathered
	 * @param {ol.Feature}
	 */
	 
	/**
	 * @event sessionstart
	 * Fires when feature or vertex session began
	 */
	 
	/**
	 * @event sessioncomplete
	 * Fires when feature or vertex session is complete
	 */
	
	/**
	 * @protected
	 */
	init: function(view) {
		this.layer = view.layer;
		this.map = Ck.getMap();
		this.olMap = this.map.getOlMap();
		this.multi = (this.layer.getExtension("geometryType").indexOf("Multi") != -1);
		
		this.control({
			"ckedit button#cancel": {
				click: this.cancel,
				scope: this
			},"ckedit button#save": {
				click: this.save,
				scope: this
			}
		});
		
		// Check if the layer is a WMS or WFS
		if(!(this.layer.getSource() instanceof ol.source.Vector)) {
			source = this.layer.get("sources");
			if(source["wfs"]) {
				source = source["wfs"][0];
				this.isWMS = true;
				this.format = Ck.create("ol.format.WFS");
			} else {
				Ck.error("Layer \"" + this.layer.get("title") + "\" doesn't have WFS parameters");
				return false;
			}
		}
		
		// Create a vector layer to host features of WMS layer
		if(!this.wfsLayer) {
			this.wfsLayer = Ck.create("ol.layer.Vector", {
				id: this.layer.getProperties().id + "vector-features",
				source: new ol.source.Vector(),
				style: Ck.map.Style.orangeStroke,
				zIndex: Ck.map.Style.zIndex.featureOverlay
			});
			this.wfsFeatures = [];
			this.wfsSource = this.wfsLayer.getSource();
			this.wfsLayer.setMap(this.olMap);
		}
		
		var conf = view.editConfig;
		conf.editController = this;
		conf.layer = view.layer;
		conf.multi = this.multi;
		
		// When user edit a multi-feature layer we have to prepare sub-feature and hide advance operation menu
		if(this.multi) {
			var featureContainer = Ext.getCmp("edit-featurepanel");
			featureContainer = (Ext.isEmpty(featureContainer))? view : featureContainer;
		
			this.featurePanel = Ext.create("widget.ckedit-feature", conf);
			featureContainer.add(this.featurePanel);
		
			// Add listeners
			this.feature = this.featurePanel.getController();
			Ext.apply(this.feature, conf);
			this.relayEvents(this.feature, ["sessionstart"], "feature");
			this.feature.addListener("validate", this.saveFeatureChange, this);
			this.feature.addListener("cancel", this.cancelFeatureChange, this);
			
			
			
			// Hide feature splitting button
			var tbar = this.getView().items.getAt(0).getDockedItems()[0];
			tbar.items.getAt(4).getMenu().items.getAt(0).setVisible(false);
		}
		
		// Display vertex panel for line and polygon
		if(view.layer.getExtension("geometryType") != "Point") {
			var vertexContainer = Ext.getCmp("edit-vertexpanel");
			vertexContainer = (Ext.isEmpty(vertexContainer))? view : vertexContainer;
		
			this.vertexPanel = Ext.create("widget.ckedit-vertex", conf);
			vertexContainer.add(this.vertexPanel);
		
			// Add listeners
			this.vertex = this.vertexPanel.getController();
			Ext.apply(this.vertex, conf);
			
			var receiver = (this.multi)? this.feature : this;
			this.relayEvents(this.vertex, ["sessionstart"], "vertex");
			this.vertex.addListener("validate", receiver.saveVertexChange, receiver);
			this.vertex.addListener("cancel", receiver.cancelVertexChange, receiver);
		}
		
		
		this.historyPanel = Ext.getCmp("edit-historypanel");
		if(this.historyPanel) {
			this.historyView = Ext.create("widget.ckedit-history", conf);
			this.historyPanel.add(this.historyView);
			this.history = this.historyView.getController();
			Ext.apply(this.history, conf);
			this.history.createListeners(this);
		}
		
		this.on("featurecreate", this.onCreate, this);
	},
	
	/**
	 * When user has create a geom.
	 * Have to cast into multi-geom if necessary
	 * @param {ol.Feature}
	 */
	onCreate: function(feature) {
		feature.setStyle(Ck.map.Style.greenStroke);
		var source = this.getSource();
		if(this.multi) {
			var type = "Multi" + feature.getGeometry().getType();
			feature = Ck.create("ol.Feature", {
				geometry: Ck.create("ol.geom." + type, [feature.getGeometry().getCoordinates()])
			});
		}
		source.addFeature(feature);
	},
	
	/**************************************************************************************/
	/******************************** Click on edit button ********************************/
	/**************************************************************************************/	
	/**
	 * Start a geometry edition session.
	 * If the layer is a multi-features layer, subfeatures panel is displayed, vertex panel otherwise.
	 * Called by the action Ck.edit.action.Geometry.
	 * @param {ol.Feature}
	 */
	startGeometryEdition: function(feature) {
		// Add the feature, if not already added, to the collection
		if(this.isWMS) {
			var ft = this.wfsSource.getFeatureById(feature.getId());
			
			if(Ext.isEmpty(ft)) {
				this.wfsSource.addFeature(feature);
			} else {
				feature.setGeometry(ft.getGeometry());
			}
		}
		if(this.multi) {
			this.startFeatureEdition(feature);
		} else {
			this.startVertexEdition(feature);
		}
	},
	
	/**
	 * 
	 */
	deleteFeature: function(feature) {
		this.wfsSource.addFeature(feature);
		feature.setStyle(Ck.map.Style.redStroke);
		if(!this.isWMS) {
			var src = this.layer.getSource();
			src.removeFeature(feature);
		}
		this.fireEvent("featureremove", feature);
	},
	
	/**************************************************************************************/
	/********************************** Geometry edition **********************************/
	/**************************************************************************************/	
	/**
	 * When the edited layer is a multi-feature layer.
	 * Open sub-features selection panel
	 * @param {ol.Feature}
	 */
	startFeatureEdition: function(feature) {
		this.feature.loadFeature(feature);
		this.switchPanel(this.featurePanel);
	},
	
	/**
	 * Edit a simple geometry (polygon, line or point)
	 * @param {ol.geom.SimpleGeometry}
	 */
	startVertexEdition: function(feature) {
		if(feature.getGeometry().getType() == "Point") {
			if(this.moveInteraction) {
				this.olMap.removeInteraction(this.moveInteraction);
			}
			this.moveInteraction = new ol.interaction.Translate({
				features: new ol.Collection([feature])
			});
			this.moveInteraction.on("translateend", this.pointTranslateEnd, this);
			this.olMap.addInteraction(this.moveInteraction);
			
			// delete this.moveInteraction.previousCursor_;
			this.moveInteraction.setActive(true);
		} else {
			this.vertex.loadFeature(feature);
			this.switchPanel(this.vertexPanel);
		}
	},
	
	pointTranslateEnd: function(a,b,c,d) {
		this.fireEvent("featuregeometry", a.features.item(0));
	},
	
	/**************************************************************************************/
	/********************************* Sub-feature events *********************************/
	/**************************************************************************************/	
	/**
	 * For feature panel validating
	 * @param {ol.Feature}
	 * @param {Boolean}
	 */
	saveFeatureChange: function(feature, changed) {
		this.switchPanel(this.historyPanel);
		if(changed) {
			this.fireEvent("featuregeometry", feature);
		}
		this.fireEvent("sessioncomplete", feature);;
	},
	
	/**
	 * When user cancel modification
	 * @param {ol.Feature}
	 */
	cancelFeatureChange: function(feature) {
		this.switchPanel(this.historyPanel);
		this.fireEvent("sessioncomplete", feature);
	},

	/**************************************************************************************/
	/*********************************** Vertex events ************************************/
	/**************************************************************************************/
	/**
	 * For vertex panel validating
	 * @param {ol.Feature}
	 * @param {Boolean}
	 */
	saveVertexChange: function(feature, changed) {
		this.switchPanel(this.historyPanel);
		if(changed) {
			this.fireEvent("featuregeometry", feature);
		}
		this.fireEvent("sessioncomplete", feature);
	},
	
	/**
	 * When the user cancel his changes
	 * @param {ol.Feature}
	 */
	cancelVertexChange: function(feature) {
		this.switchPanel(this.historyPanel);
		this.fireEvent("sessioncomplete", feature);
	},
	
	/**************************************************************************************/
	/*************************************** Utils ****************************************/
	/**************************************************************************************/
	/**
	 * Return the source of the current layer
	 * @return {ol.source}
	 */
	getSource: function() {
		if(this.isWMS && this.wfsLayer) {
			return this.wfsSource;
		} else {
			return this.layer.getSource();
		}
	},
	
	/**
	 * Display the specified panel
	 * @param {Ext.panel.Panel} The panel to display
	 */
	switchPanel: function(panel) {
		if(this.historyPanel) {
			this.historyPanel.setVisible(this.historyPanel == panel);
		}
		if(this.vertexPanel) {
			this.vertexPanel.setVisible(this.vertexPanel == panel);
		}
		if(this.featurePanel) {
			this.featurePanel.setVisible(this.featurePanel == panel);
		}
	},
	
	close: function() {
		if(this.vertex) {
			this.vertex.close.bind(this.vertex)();
		}
		if(this.history) {
			this.history.close.bind(this.history)();
		}
		if(this.feature) {
			this.feature.close.bind(this.feature)();
		}
		var win = this.view.up('window');
		if (win) {
			win.close();
		}
	},
	
	/**
	 * Save the changes. If it concerne
	 */
	save: function() {
		if(this.isWMS) {
			var data, ft, inserts = [], updates = [], deletes = [], off = this.layer.ckLayer.getOffering("wfs");
			var geometryName = this.layer.getExtension("geometryColumn");
			
			var currSrs = this.map.getProjection().getCode();
			var lyrSrs = off.getSrs();
			
			var f = Ck.create("ol.format.WFS", {
				featureNS: "http://mapserver.gis.umn.edu/mapserver",
				gmlFormat: Ck.create("ol.format.GML2"),
				featureType: off.getLayers()
			});
			
			// Loop on history store items
			for(var i = 0; i < this.history.store.getCount(); i++) {				
				data = this.history.store.getAt(i).data;
				ft = data.feature
				
				if(currSrs != lyrSrs) {
					ft.getGeometry().transform(currSrs, lyrSrs);
				}
				
				if(!Ext.isEmpty(geometryName) && geometryName != ft.getGeometryName()) {
					ft.set(geometryName, ft.getGeometry());
					ft.unset("geometry");
					ft.setGeometryName(geometryName);
					
				}
				
				switch(data.actionId) {
					case 0:
						// Create
						inserts.push(ft);
						break;
					case 1:
					case 2:
					case 4:
					case 5:
						// Geometry or attributes, crop or union
						updates.push(ft);
						break;
					case 3:
						// Remove
						deletes.push(ft);
						break;
				}
			}
			
			var transac = f.writeTransaction(inserts, updates, deletes, {
				featureNS		: "feature",
				featurePrefix	: "test",
				srsName			: currSrs,
				featureType		: off.getLayers(),
				gmlOptions: {
					schemaLocation: "wfs"
				}
			});
			
			// Temporary parent to get the whole innerHTML
			var pTemp = document.createElement("dvi");
			pTemp.appendChild(transac);
			
			// Do the getFeature query
			Ck.Ajax.post({
				scope: this,
				url: off.getOperation(0).getHref(1),
				rawData: pTemp.innerHTML,
				success: function(response) {
					var ins, upd, del;
					ins = response.responseXML.getElementsByTagName("totalInserted")[0];
					upd = response.responseXML.getElementsByTagName("totalUpdated")[0];
					del = response.responseXML.getElementsByTagName("totalDeleted")[0];
					
					if(ins || upd || del) {					
						var msg = "Registration successfully : <br/>";
						if(ins && ins.innerHTML != "0") {
							msg += "Inserted : " + ins.innerHTML + "<br/>";
						}
						if(upd && upd.innerHTML != "0") {
							msg += "Updated : " + upd.innerHTML + "<br/>";
						}
						if(del && del.innerHTML != "0") {
							msg += "Deleted : " + del.innerHTML;
						}
						
						Ext.Msg.show({
							title: "Edition",
							message: msg,
							buttons: Ext.Msg.OK,
							icon: Ext.Msg.INFO
						});
						this.reset();
					}
				},
				failure: function(response) {
					var exception = response.responseXML.getElementsByTagName("ServiceException")[0];
					var msg = "Layer edition failed";
					if(exception) {
						var pre = document.createElement('pre');
						var text = document.createTextNode(exception.innerHTML);
						pre.appendChild(text);
						msg += ". Error message : <br/>" + pre.innerHTML;
					}
					
					Ext.Msg.show({
						title: "Edition",
						message: msg,
						buttons: Ext.Msg.OK,
						icon: Ext.Msg.ERROR
					});
				}
			});
		}
	},
	
	reset: function() {
		if(this.history) {
			this.history.reset.bind(this.history)();
		}
		
		if(this.isWMS) {
			this.wfsSource.clear();
			
			// Redraw
			src = this.layer.getSource();
			var params = src.getParams();
			params.t = new Date().getMilliseconds();
			src.updateParams(params);
		}
		
	},
});
