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
        L.Util.setOptions(this, options);
        this._initLayer(
            this.options.basemap,
            this.options.disableAttribution,
            this.options.prependAttribution,
            this.options.appendAttribution);
    },
    _mapboxUrl: function(mapId, accessToken) {
        var url = '//{s}.tiles.mapbox.com/v4/' + mapId + '/{z}/{x}/{y}';
        if (L.Browser.retina) {
            url += '@2x';
        }
        url += '.png';
        url += '?access_token=' + accessToken;
        return url;
    },
    _initLayer: function(basemap, disableAttribution, prependAttribution, appendAttribution) {
        var layerOptions = {};
        var attrib = this._addAttributionPart('', prependAttribution);
        //if (basemap.provider === 'mapquest') {
        //    // OSM MapQuest
        //    attrib = this._addAttributionPart(attrib, 'Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png"> - Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors');
        //    attrib = this._addAttributionPart(attrib, appendAttribution);
        //    L.TileLayer.prototype.initialize.call(this, 'http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png',
        //        {
        //            minZoom: 1,
        //            maxNativeZoom: 17,
        //            maxZoom: 18,
        //            attribution: !disableAttribution ? attrib : '',
        //            subdomains: "1234"
        //        });
        //} else
        if (basemap.provider === 'opencycle') {
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
        } else if (basemap.provider.indexOf('mapbox.') === 0) {
            attrib = this._addAttributionPart(attrib, 'Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors');
            attrib = this._addAttributionPart(attrib, appendAttribution);
            layerOptions = {
                minZoom: 1,
                maxZoom: 21,
                attribution: !disableAttribution ? attrib : '',
                subdomains: "abcd"
            };
            L.TileLayer.prototype.initialize.call(this, this._mapboxUrl(basemap.provider, basemap.mapbox_access_token), layerOptions);
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
            L.TileLayer.prototype.initialize.call(this, this._mapboxUrl(basemap.mapid, basemap.mapbox_access_token), layerOptions);
        } else if (basemap.provider.indexOf('stamen.') === 0) {
            var stamenMap = basemap.provider.substring(7);
            var stamenUrl = '//stamen-tiles-{s}.a.ssl.fastly.net/' + stamenMap + '/{z}/{x}/{y}.png';

            if (stamenMap === 'toner') {
                attrib = this._addAttributionPart(attrib, 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.');
            } else {
                attrib = this._addAttributionPart(attrib, 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.');
            }
            attrib = this._addAttributionPart(attrib, appendAttribution);
            layerOptions = {
                minZoom: 1,
                maxNativeZoom: 18,
                maxZoom: 19,
                attribution: !disableAttribution ? attrib : '',
                subdomains: "abcd"
            };
            L.TileLayer.prototype.initialize.call(this, stamenUrl, layerOptions);
        } else if (basemap.provider.startsWith('jawg.') || basemap.provider === 'mapquest') {
            var jawgUrl = 'https://tile.jawg.io/';

            if (basemap.provider !== 'mapquest') {
                var jawgMap = basemap.provider.substring(5);
                if (jawgMap !== 'streets') {
                    jawgUrl += jawgMap + '/';
                }
            }

            jawgUrl += '{z}/{x}/{y}';
            //if (L.Browser.retina) {
            //    jawgUrl += '@2x';
            //}
            jawgUrl += '.png';
            if (basemap.jawg_apikey) {
               jawgUrl += '?api-key=' + basemap.jawg_apikey;
                if (basemap.jawg_odsdomain) {
                    jawgUrl += '&odsdomain=' + basemap.jawg_odsdomain;
                }
            }


            layerOptions = {
                minZoom: 1,
                maxZoom: 22,
                attribution: !disableAttribution ? 'Tiles Courtesy of <a href="https://www.jawg.io" target="_blank">jawg</a> <img src="https://www.jawg.io/assets/images/favicon.png" width="16" height="16"> - Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors' : ''
            };
            L.TileLayer.prototype.initialize.call(this, jawgUrl, layerOptions);
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
        L.Util.setOptions(this, options);
        this._initLayer(
            this.options.basemap,
            this.options.disableAttribution,
            this.options.prependAttribution,
            this.options.appendAttribution);
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
