// Taken from Leaflet.UTFGrid plugin (L.Util.ajax), but modified to return a callback to cancel the request, and to
// handle another callback for errors
L.Util.sendXHR = function (url, cb, errorCb) {
	// the following is from JavaScript: The Definitive Guide
	// and https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest/Using_XMLHttpRequest_in_IE6
	if (window.XMLHttpRequest === undefined) {
		window.XMLHttpRequest = function () {
			/*global ActiveXObject:true */
			try {
				return new ActiveXObject("Microsoft.XMLHTTP");
			}
			catch  (e) {
				throw new Error("XMLHttpRequest is not supported");
			}
		};
	}
	var response, request = new XMLHttpRequest();
	request.open("GET", url);
	request.onreadystatechange = function () {
		/*jshint evil: true */
		if (request.readyState === 4 && request.status === 200) {
			if (window.JSON) {
				response = JSON.parse(request.responseText);
			} else {
				response = eval("(" + request.responseText + ")");
			}
			cb(response);
		} else if (request.readyState === 4) {
            if (request.status !== 0) {
                // Status 0 means aborted request
                errorCb(request.status, request.responseText);
            }
        }
	};
	request.send();
    return function() {
        request.abort();
    };
};

/*
If McGyver had a baby with himself, he would probably code that plugin.

The idea of the BundleTileLayer is to handle UTFGrid and image tiles in a single call for a single tilepoint.
How do we achieve this?
We disable the "moveend" event of the UtfGrid layer, so that it doesn't refresh by itself when the map moves.
We override the loading tile internal method of TileLayer; instead of setting the tile URL in the <img> src attribute,
we start a query to retrieve the JSON "bundle" that contains the UTFGrid and the base64 representation of the image. Once
we get the result, we set the base64 image in the <img> src attribute to display it, then we add the Grid JSON in the
UtfGrid layer internal cache, and we tell it to update; the layer finds the info in its cache and therefore doesn't
need to make a new query.
 */

L.BundleTileLayer = L.LayerGroup.extend({
    initialize: function(url, options) {
        L.LayerGroup.prototype.initialize.call(this, []);
        this.options = options;
        this.options.gridLayer.events = this.options.gridLayer.events || {};
        this.gridOpts = L.Util.extend({}, this.options.gridLayer.options, {minZoom: this.options.minZoom, maxZoom: this.options.maxZoom, tileSize: this.options.tileSize || 256});
        this.gridLayer = this._generateGridLayer();
        this.addLayer(this.gridLayer);
        var bundleLayer = this;
        this._url = url;

        if (!Modernizr.cors) {
            // Logic taken from leaflet.utfgrid
            //Find a unique id in window we can use for our callbacks
            //Required for jsonP
            var i = 0;
            while (window['bundle' + i]) {
                i++;
            }
            this._windowKey = 'bundle' + i;
            window[this._windowKey] = {};
        }

        var tileCache = {};
        var runningXHRs = {};

        this.imageLayer = new (L.TileLayer.extend({
            initialize: function() {
                L.TileLayer.prototype.initialize.call(this, url, {zIndex: 10, minZoom: bundleLayer.options.minZoom, maxZoom: bundleLayer.options.maxZoom, tileSize: bundleLayer.options.tileSize || 256});
                this.on('tileunload', function(e) {
                    // Cancel currently running XHR to the obsolete tile
                    if (runningXHRs[e.tile._tilekey]) {
                        // Run the callback to cancel the request
                        runningXHRs[e.tile._tilekey]();
                        delete runningXHRs[e.tile._tilekey];
                    }
                });
            },
            _loadTile: function (tile, tilePoint) {
                if (this._url) {
                    tile._layer = this;
                    this._adjustTilePoint(tilePoint);

                    var url = L.TileLayer.prototype.getTileUrl.call(this, tilePoint);
                    var key = tilePoint.z + '_' + tilePoint.x + '_' + tilePoint.y;

                    tile._tilekey = key;

                    var handleBundle = function (bundle) {
                        // Image tile
                        if (!bundle.img) {
                            tile.src = '';
                            // We need to hide the tile, because an empty <img> tag shows a border
                            tile.style.visibility = 'hidden';
                        } else {
                            tile.src = 'data:image/png;base64,' + bundle.img;
                            tile.style.visibility = 'visible';
                        }
                        L.DomUtil.addClass(tile, 'leaflet-tile-loaded');
                        tile._layer._tileLoaded();

                        // Grid tile
                        bundleLayer.gridLayer._cache[key] = bundle.grid;
                        bundleLayer.gridLayer._update();
                        if (!tileCache[url]) {
                            tileCache[url] = bundle;
                        }

                        // Removing from the list of current XHRs
                        delete runningXHRs[tile._tilekey];
                    };

                    var handleError = function(code, message) {
                        tile._layer._tileLoaded();
                        delete runningXHRs[tile._tilekey];
                        tile._layer.fire('tileerror', {'code': code, 'message': message});
                    };

                    if (!tileCache[url]) {
                        if (Modernizr.cors) {
                            runningXHRs[tile._tilekey] = L.Util.sendXHR(url, handleBundle, handleError);
                        } else {
                            bundleLayer._jsonP(key, url, handleBundle);
                        }
                    } else {
                        // The tile is in cache
                        handleBundle(tileCache[url]);
                    }

                }
            }
        }))(url);
        this.addLayer(this.imageLayer);
    },
    setUrl: function(url) {
        // Directly set URL of the image layer
        this._url = url;
        this.imageLayer.setUrl(url);

        // We empty the cache so that the layer doesn't react to mouse events until it is ready again
        this.gridLayer._cache = {};
    },
    on: function(event, cb) {
        if (event === 'click') {
            // Mouse events are forwarded to UTFGrid
            this.options.gridLayer.events[event] = cb;
            return this.gridLayer.on(event, cb);
        }
        return this.imageLayer.on(event, cb);
    },
    setMinZoom: function(zoom) {
        this.imageLayer.options.minZoom = zoom;
        this.gridLayer.options.minZoom = zoom;
    },
    setMaxZoom: function(zoom) {
        this.imageLayer.options.maxZoom = zoom;
        this.gridLayer.options.maxZoom = zoom;
    },
    _jsonP: function(key, url, cb) {
        var head = document.getElementsByTagName('head')[0],
            functionName = 'bundle_' + key,
            wk = this._windowKey;

        if (url.indexOf('?') === -1) {
            url += '?callback='+wk+'.'+functionName;
        } else {
            url += '&callback='+wk+'.'+functionName;
        }

		var script = document.createElement('script');
		script.setAttribute("type", "text/javascript");
		script.setAttribute("src", url);

		window[wk][functionName] = function (data) {
			delete window[wk][functionName];
			head.removeChild(script);
            cb(data);
		};

        head.appendChild(script);
    },
    _generateGridLayer: function() {
        var newLayer = new L.UtfGrid('', this.gridOpts);
        newLayer.off('moveend');
        var events = Object.keys(this.options.gridLayer.events);
        var i, eventName;
        for (i=0; i<events.length; i++) {
            eventName = events[i];
            newLayer.on(eventName, this.options.gridLayer.events[eventName]);
        }
        return newLayer;
    }
});