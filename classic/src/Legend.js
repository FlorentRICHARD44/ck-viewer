/**
 * 
 */

Ext.define("ck.Legend", {
	extend: "Ext.tree.Panel",
	alias: "widget.cklegend",
	
	requires: [
		'ck.legend.*'
	],

	controller: "cklegend",
	
	viewModel: {
		type: "cklegend"
	},

	plugins: ['treechecker'],
	
	viewConfig: {
		plugins: { 
			ptype: 'treeviewdragdrop' 
		}
	},
	
	// listeners: {
		// checkchange: 'onCheckChange'
	// },
	
	config: {
		map: null
	},
	
	useArrows: true,
	rootVisible: false,
	hideHeaders: true,
	
	cls: 'ck-legend',
	
	columns: [{
		xtype: 'treecolumn',
		text: 'Layers',
		dataIndex: 'text',
		flex: 1
	},{
		xtype: 'actioncolumn',
		width: 50,
		items: [{
			iconCls: 'fa fa-paint-brush fa-lg',
			tooltip: 'Edit style'
		},{
			iconCls: 'fa fa-search fa-lg fa-flip-horizontal',
			tooltip: 'Zoom on layer',
			handler: 'actionLegendLayerZoom'
		}]
	}]
});