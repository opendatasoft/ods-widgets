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
    },
    _escapeAttributionPart: function(html) {
        if (!html) {
            return html;
        }
        return html
            .replace(/&(?!#?\w+;)/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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
    _mapboxTilesetUrl: function(mapId, accessToken) {
        // Tiles served by the Raster Tiles API, from Tilesets
        var url = '//api.mapbox.com/v4/' + mapId + '/{z}/{x}/{y}';
        if (L.Browser.retina) {
            url += '@2x';
        }
        url += '.png';
        url += '?access_token=' + accessToken;
        return url;
    },
    _mapboxStylesUrl: function(mapId, accessToken) {
        // Tiles served by the Static Tiles API, from Mapbox styles
        var url = '//api.mapbox.com/styles/v1/' + mapId + '/tiles/{z}/{x}/{y}';
        if (L.Browser.retina) {
            url += '@2x';
        }
        url += '?access_token=' + accessToken;

        return url;
    },
    _initLayer: function(basemap, disableAttribution, prependAttribution, appendAttribution) {
        var layerOptions = {};
        var attrib = this._addAttributionPart('', prependAttribution);

        if (basemap.provider === 'opencycle' || basemap.provider === 'osmtransport') {
            attrib = this._addAttributionPart(attrib, 'Tiles Courtesy of <a href="http://www.thunderforest.com" target="_blank">Thunderforest</a> - Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors');
            attrib = this._addAttributionPart(attrib, appendAttribution);
            var thunderforestUrl = 'http://{s}.tile.thunderforest.com/' + (basemap.provider === 'osmtransport' ? 'transport' : 'cycle') + '/{z}/{x}/{y}.png';
            if (basemap.thunderforest_api_key) {
                thunderforestUrl += '?apikey=' + basemap.thunderforest_api_key;
            }
            L.TileLayer.prototype.initialize.call(this, thunderforestUrl,
                {
                    minZoom: 2,
                    maxNativeZoom: 18,
                    maxZoom: 19,
                    attribution: !disableAttribution ? attrib : '',
                    subdomains: "abc"
                });
        } else if (basemap.provider === 'mapbox_style' || basemap.provider.indexOf('mapbox.') === 0) {
            var mapId;
            if (basemap.provider.indexOf('mapbox.') === 0) {
                // Standard mapbox styles, with the former dot-based notation

                // Mapping short style names to the full ones (https://docs.mapbox.com/api/maps/#mapbox-styles)
                var fullStyles = {
                    'streets': 'streets-v11',
                    'outdoors': 'outdoors-v11',
                    'light': 'light-v10',
                    'dark': 'dark-v10',
                    'satellite': 'satellite-v9',
                    'streets-satellite': 'satellite-streets-v11'
                };

                var mapStyle = basemap.provider.substring(7);
                mapId = 'mapbox/' + fullStyles[mapStyle];
            } else {
                // Custom style
                mapId = basemap.mapid
            }

            attrib = this._addAttributionPart(attrib, 'Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors');
            attrib = this._addAttributionPart(attrib, appendAttribution);
            layerOptions = {
                minZoom: 2,
                maxZoom: 21,
                attribution: !disableAttribution ? attrib : '',
                subdomains: "abcd",
                tileSize: 512,
                zoomOffset: -1
            };
            if (basemap.minZoom) {
                layerOptions.minZoom = basemap.minZoom;
            }
            if (basemap.maxZoom) {
                layerOptions.maxZoom = basemap.maxZoom;
            }
            L.TileLayer.prototype.initialize.call(this, this._mapboxStylesUrl(mapId, basemap.mapbox_access_token), layerOptions);
        } else if (basemap.provider === 'mapbox') {
            attrib = this._addAttributionPart(attrib, 'Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors');
            attrib = this._addAttributionPart(attrib, appendAttribution);
            layerOptions = {
                minZoom: 2,
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
            L.TileLayer.prototype.initialize.call(this, this._mapboxTilesetUrl(basemap.mapid, basemap.mapbox_access_token), layerOptions);
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
                minZoom: 2,
                maxNativeZoom: 18,
                maxZoom: 19,
                attribution: !disableAttribution ? attrib : '',
                subdomains: "abcd"
            };
            L.TileLayer.prototype.initialize.call(this, stamenUrl, layerOptions);
        } else if (basemap.provider.startsWith('jawg.') || basemap.provider === 'mapquest') {
            var jawgMaps = {
                'streets': '71ba5a33-9529-48cb-8dbe-b6b9c33a3391',
                'light': '35c38ea4-f4e0-4af5-8fc8-a11a04285356',
                'dark': 'aa1f80a0-bc95-461d-867a-cb50a814a2d2',
                'sunny': 'd4246bc4-e98a-4976-b621-681f3f3f4230',
                'matrix': '26e378b1-bfeb-48b2-8b32-69f484522bb8',
                'transports': 'jawg-transports'
            };
            var jawgUrl = 'https://tiles.jawg.io/';
            var jawgMap;

            if (basemap.provider !== 'mapquest') {
                jawgMap = jawgMaps[basemap.provider.substring(5)];
            } else {
                jawgMap = jawgMaps.streets;
            }

            jawgUrl += jawgMap + '/';

            jawgUrl += '{z}/{x}/{y}';
            if (L.Browser.retina) {
                jawgUrl += '@2x';
            }
            jawgUrl += '.png';
            if (basemap.jawg_apikey) {
                jawgUrl += '?api-key=' + basemap.jawg_apikey;
                if (basemap.jawg_odsdomain) {
                    jawgUrl += '&odsdomain=' + basemap.jawg_odsdomain;
                }
            }

            if (basemap.shortAttribution) {
                attrib = this._addAttributionPart(attrib, '<a href="https://www.jawg.io" target="_blank">jawg</a> <img src="https://www.jawg.io/images/favicon.png" width="16" height="16" alt="Jawg"> - Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a>');
            } else {
                attrib = this._addAttributionPart(attrib, 'Tiles Courtesy of <a href="https://www.jawg.io" target="_blank">jawg</a> <img src="https://www.jawg.io/images/favicon.png" width="16" height="16" alt="Jawg"> - Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> contributors');
            }
            attrib = this._addAttributionPart(attrib, appendAttribution);

            layerOptions = {
                minZoom: 2,
                maxZoom: 22,
                attribution: !disableAttribution ? attrib : '',
            };
            L.TileLayer.prototype.initialize.call(this, jawgUrl, layerOptions);
        } else if (basemap.provider.startsWith('ign.')) {
            var ignMaps = {
                'planv2': {
                    ignLayer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
                    service: 'pratique',
                    minZoom: 1,
                    maxZoom: 19
                },
                'orthophotos': {
                    ignLayer: 'ORTHOIMAGERY.ORTHOPHOTOS',
                    imageFormat: 'image/jpeg',
                    service: 'pratique',
                    minZoom: 1,
                    maxZoom: 19
                },
                'parcellaire-express': {
                    ignLayer: 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS',
                    service: 'parcellaire',
                    minZoom: 2,
                    maxZoom: 19
                },
                'limites-admin-express': {
                    ignLayer: 'LIMITES_ADMINISTRATIVES_EXPRESS.LATEST',
                    service: 'administratif',
                    minZoom: 6,
                    maxZoom: 16
                }
            };

            var basemapName = basemap.provider.substring(4);

            attrib = this._addAttributionPart(attrib, 'Map data © <a href="https://geoservices.ign.fr/" target="_blank">IGN</a>');
            attrib = this._addAttributionPart(attrib, appendAttribution);

            layerOptions = {
                imageFormat: 'image/png',
                attribution: attrib
            };

            angular.extend(layerOptions, ignMaps[basemapName]);

            var ignUrl = 'https://wxs.ign.fr/{service}/geoportail/wmts?&REQUEST=GetTile' +
                '&SERVICE=WMTS&VERSION=1.0.0&TILEMATRIXSET=PM'+
                '&LAYER={ignLayer}&STYLE=normal&FORMAT={imageFormat}'+
                '&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}';
            L.TileLayer.prototype.initialize.call(this, ignUrl, layerOptions);
        } else if (basemap.provider === 'custom') {
            if (basemap.subdomains) {
                layerOptions.subdomains = basemap.subdomains;
            }
            layerOptions.minZoom = basemap.minZoom || 2;
            if (basemap.maxZoom) {
                layerOptions.maxZoom = basemap.maxZoom;
            }
            if (basemap.strictTMS) {
                layerOptions.tms = true;
            }

            attrib = this._addAttributionPart(attrib, this._escapeAttributionPart(basemap.attribution));
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
        if (basemap.tile_format){
            layerOptions.format = basemap.tile_format;
        }
        layerOptions.minZoom = basemap.minZoom || 2;
        if (basemap.maxZoom) {
            layerOptions.maxZoom = basemap.maxZoom;
        }

        attrib = this._addAttributionPart(attrib, this._escapeAttributionPart(basemap.attribution));
        attrib = this._addAttributionPart(attrib, appendAttribution);

        layerOptions.attribution = !disableAttribution ? attrib : '';
        L.TileLayer.WMS.prototype.initialize.call(this, basemap.url, layerOptions);
    }
});
