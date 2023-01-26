L.ODSMap = L.Map.extend({
    options: {
        basemapsList: [],
        appendAttribution: null,
        prependAttribution: null,
        basemap: null,
        disableAttribution: false,
        attributionSeparator: ' - '
    },
    initialize: function (id, options) {
        L.Map.prototype.initialize.call(this, id, options);
        if (options) {
            this._setTilesProvider(
                this.options.basemapsList,
                this.options.prependAttribution,
                this.options.appendAttribution,
                this.options.basemap,
                this.options.disableAttribution,
                this.options.attributionSeparator
            );
        }
    },
    _escapeHtmlLabel: function(html) {
        if (!html) {
            return html;
        }
        return html
            .replace(/&(?!#?\w+;)/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },
    _setTilesProvider: function(basemapsList, prependAttribution, appendAttribution, selectedBasemap, disableAttribution, attributionSeparator) {
        // OSM Free (don't use in production)
        //var tilesUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        //var attrib = 'Map data © OpenStreetMap contributors';
        //var tileLayer = new L.TileLayer(tilesUrl, {minZoom: 8, maxZoom: 18, attribution: attrib});
        var layers = [];
        var layer;
        for (var i=0; i<basemapsList.length; i++) {
            var basemap = basemapsList[i];
            if (basemap.provider === 'custom_wms') {
                layer = new L.ODSWMSTileLayer({
                    basemap: basemap,
                    prependAttribution: prependAttribution,
                    appendAttribution: appendAttribution,
                    disableAttribution: disableAttribution,
                    attributionSeparator: attributionSeparator
                });
            } else {
                layer = new L.ODSTileLayer({
                    basemap: basemap,
                    prependAttribution: prependAttribution,
                    appendAttribution: appendAttribution,
                    disableAttribution: disableAttribution,
                    attributionSeparator: attributionSeparator
                });
            }
            if (typeof layer.options.minZoom !== 'number') {
                layer.options.minZoom = 2;
            }
            layer.basemapLabel = basemap.label;
            layer.basemapId = basemap.id;

            // Re-implement the accessibility changes present in modern Leaflet versions
            // https://github.com/Leaflet/Leaflet/blob/v1.7.0/src/layer/tile/TileLayer.js#L146-L156
            layer.on('tileload', function(e) {
                e.tile.alt = "";
                e.tile.setAttribute('role', 'presentation');
            });

            layers.push(layer);
        }

        if (layers.length > 1) {
            // Creating the control
            var layersControl = new L.Control.Layers(null, null, {
                position: 'bottomleft'
            });
            for (var j=0; j<layers.length; j++) {
                layer = layers[j];
                layersControl.addBaseLayer(layer, this._escapeHtmlLabel(layer.basemapLabel));
            }
            this.addControl(layersControl);
        }

        // Adding the default basemap
        if (selectedBasemap) {
            var selectedLayer = layers.filter(function(layer) { return layer.basemapId === selectedBasemap; });
            if (selectedLayer.length > 0) {
                this.addLayer(selectedLayer[0]);
            } else {
                this.addLayer(layers[0]);
            }
        } else if (layers.length > 0) {
            this.addLayer(layers[0]);
        }

    }
});
