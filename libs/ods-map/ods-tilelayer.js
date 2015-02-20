var ODSTileLayerMixin = {
    odsOptions: {
        basemap: null,
        appendAttribution: null,
        prependAttribution: null,
        disableAttribution: null,
        attributionSeparator: ' - '
    },
    _addAttributionPart: function(attribution, part) {
        if (part) {
            if (attribution) {
                attribution += this.options.attributionSeparator;
            }
            attribution += part;
        }
        return attribution;
    }
};

L.ODSTileLayer = L.TileLayer.extend({
    includes: ODSTileLayerMixin,
    initialize: function(options) {
        L.Util.setOptions(this, this.odsOptions);
        this._initLayer(options.basemap, options.disableAttribution, options.prependAttribution, options.appendAttribution);
    },
    _mapboxUrl: function(mapId) {
        var url = '//{s}.tiles.mapbox.com/v3/' + mapId + '/{z}/{x}/{y}';
        if (L.Browser.retina) {
            url += '@2x';
        }
        url += '.png';
        return url;
    },
    _initLayer: function(basemap, disableAttribution, prependAttribution, appendAttribution) {
        var layerOptions = {};
        var attrib = this._addAttributionPart('', prependAttribution);
        if (basemap.provider === 'mapquest') {
            // OSM MapQuest
            attrib = this._addAttributionPart(attrib, 'Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png"> - Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors');
            attrib = this._addAttributionPart(attrib, appendAttribution);
            L.TileLayer.prototype.initialize.call(this, 'http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png',
                {
                    minZoom: 1,
                    maxNativeZoom: 18,
                    maxZoom: 19,
                    attribution: !disableAttribution ? attrib : '',
                    subdomains: "1234"
                });
        } else if (basemap.provider === 'opencycle') {
            attrib = this._addAttributionPart(attrib, 'Tiles Courtesy of <a href="http://www.thunderforest.com" target="_blank">Thunderforest</a> - Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors');
            attrib = this._addAttributionPart(attrib, appendAttribution);
            L.TileLayer.prototype.initialize.call(this, 'http://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png',
                {
                    minZoom: 1,
                    maxNativeZoom: 18,
                    maxZoom: 19,
                    attribution: !disableAttribution ? attrib : '',
                    subdomains: "abc"
                });
        } else if (basemap.provider === 'osmtransport') {
            attrib = this._addAttributionPart(attrib, 'Tiles Courtesy of <a href="http://www.thunderforest.com" target="_blank">Thunderforest</a> - Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors');
            attrib = this._addAttributionPart(attrib, appendAttribution);
            L.TileLayer.prototype.initialize.call(this, 'http://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png',
                {
                    minZoom: 1,
                    maxNativeZoom: 18,
                    maxZoom: 19,
                    attribution: !disableAttribution ? attrib : '',
                    subdomains: "abc"
                });
        } else if (basemap.provider === 'mapbox') {
            attrib = this._addAttributionPart(attrib, 'Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors');
            attrib = this._addAttributionPart(attrib, appendAttribution);
            layerOptions = {
                minZoom: 1,
                maxZoom: 21,
                attribution: !disableAttribution ? attrib : '',
                subdomains: "abcd"
            };
            if (basemap.minZoom) {
                layerOptions.minZoom = basemap.minZoom;
            }
            if (basemap.maxZoom) {
                layerOptions.maxZoom = basemap.maxZoom;
            }
            L.TileLayer.prototype.initialize.call(this, this._mapboxUrl(basemap.mapid), layerOptions);
        } else if (basemap.provider === 'custom') {
            if (basemap.subdomains) {
                layerOptions.subdomains = basemap.subdomains;
            }
            if (basemap.minZoom) {
                layerOptions.minZoom = basemap.minZoom;
            }
            if (basemap.maxZoom) {
                layerOptions.maxZoom = basemap.maxZoom;
            }

            attrib = this._addAttributionPart(attrib, basemap.attribution);
            attrib = this._addAttributionPart(attrib, appendAttribution);

            layerOptions.attribution = !disableAttribution ? attrib : '';
            L.TileLayer.prototype.initialize.call(this, basemap.url, layerOptions);
        }
    }
});

L.ODSWMSTileLayer = L.TileLayer.WMS.extend({
    includes: ODSTileLayerMixin,
    initialize: function(options) {
        L.Util.setOptions(this, this.odsOptions);
        this._initLayer(options.basemap, options.disableAttribution, options.prependAttribution, options.appendAttribution);
    },
    _initLayer: function(basemap, disableAttribution, prependAttribution, appendAttribution) {
        var layerOptions = {};
        var attrib = this._addAttributionPart('', prependAttribution);

        layerOptions.layers = basemap.layers;
        if (basemap.styles) {
            layerOptions.styles = basemap.styles;
        }

        attrib = this._addAttributionPart(attrib, basemap.attribution);
        attrib = this._addAttributionPart(attrib, appendAttribution);

        layerOptions.attribution = !disableAttribution ? attrib : '';
        L.TileLayer.WMS.prototype.initialize.call(this, basemap.url, layerOptions);
    }
});
