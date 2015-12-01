/**
 *
 */
Ext.define('Ck.legend.plugin.action.Edit', {
	extend: 'Ck.legend.plugin.Action',
	alias: 'plugin.legendlayeredit',

	iconCls: 'fa fa-pencil fa-lg ck-plugin',
	tooltip: 'Edit layer',

	setAction: function() {
		var action = {
			tooltip: this.tooltip,
			handler: this.handlerAction,
			isDisabled: function(v, r, c, i, rec) {
				var lyr = rec.get('layer');
				if(Ext.isEmpty(lyr)) {
					return true
				} else {
					return !(lyr instanceof ol.layer.Vector);
				}
			},
			getClass: function(v, meta, rec) {
				var lyr = rec.get('layer');
				if(Ext.isEmpty(lyr)) {
					return "";
				} else {
					return (lyr instanceof ol.layer.Vector)? this.iconCls : this.disableClass;
				}
				
			},
			scope: this
		}
		
		this.actionColumn.items.push(action);
		this.actionColumn.width = this.actionColumn.items.length * 20;
	},
	
	doAction: function(layer) {
		if(this.win) {
			this.win.destroy();
		}
		this.win = Ext.create('Ext.window.Window', {
			title: "Edit layer " + layer.get('title'),
			width: 410,
			height: 300,
			layout: 'fit',
			collapsible: true,
			closable: false,
			items: {
				xtype: 'ckedit',
				layer: layer
			}
		});

		this.win.show();
	},
	
	close: function() {
		this.win.close();
	}
});
