/*
Draw the round marker, and the polygon on hover
 */
/*
new L.ClusterMarker(latlng, {
    color: null, // (optional) A color to drive the cluster drawing, else it can use all the color spectre to show density (from green to red)
    geojson: '', // GeoJSON shape of the cluster,
    value: '' // Cluster value (usually count),
    total: '' // Total number of entries, in order to calculate a ratio
});*/
L.ClusterMarker = L.FeatureGroup.extend({
    initialize: function(latlng, options) {
       L.FeatureGroup.prototype.initialize.call(this, []);
        var ratio;
        // FIXME: A ratio should only be between 1 and 0. Right now, the calculations go very wrong with negative numbers.
        // -> https://opendatasoft.clubhouse.io/story/370
        if (options.total === 0) {
            ratio = 1;
        } else {
            ratio = options.value / options.total;
        }
        if (ratio < 0) {
            // A ratio superior to 1 is a bad idea, but it's still a better idea than a negative ratio. To be fixed...
            ratio = ratio * -1;
        }
        var styles = this._getShapeStyle(options.color, ratio);

        if (options.geojson) {
            if (options.geojson.type !== 'Point') {
                this.addLayer(new L.GeoJSON(options.geojson, {style: styles['default']}));
                this._clusterShape = options.geojson;
            } else {
                this._clusterShape = [options.geojson.coordinates[1], options.geojson.coordinates[0]];
            }
        }

        this.addLayer(new L.Marker(latlng, {icon: this._getMarkerIcon(options.color, options.value, ratio, options.numberFormattingFunction)}));
        this._latlng = latlng;

        if (this._clusterShape) {
            // Handle the shape display on hovering
            this.on('mouseover', function(e) {
                if (e.originalEvent.which === 0) {
                    // Don't trigger this if there is a mouse button used (this is done to prevent triggering the style change
                    // during a map move, which triggers a cascade of moveend events)
                    e.target.setStyle(styles.highlight);
                }
            });
            this.on('mouseout', function(e) {
                if (e.originalEvent.which === 0) {
                    e.target.setStyle(styles['default']);
                }
            });
        }
    },
    getLatLng: function() {
        return this._latlng;
    },
    getClusterShape: function() {
        return this._clusterShape;
    },
    _getMarkerIcon: function(color, count, ratio, numberFormattingFunction) {
        var bgcolor, textcolor;
        if (!color) {
            if (ratio > 0.8) {
                color = "#FF4444";
            } else if (ratio > 0.6) {
                color = "orange";
            } else if (ratio > 0.4) {
                color = "#E5E533";
            } else {
                color = "#44BB44";
            }

            bgcolor = chroma(color);
            textcolor = chroma('#111111');
        } else {
            bgcolor = chroma(color).brighter((1-ratio)*20);
            textcolor = chroma(bgcolor).hsl()[2] > 0.7 ? chroma('#111111'): chroma('#EEEEEE');
        }

        var displayedNumber = count;
        if (numberFormattingFunction) {
            displayedNumber = numberFormattingFunction(count);
        }

//        var size = Math.max(((ratio * 0.5) + 0.5) * 60, 50) + 'px';
        var textsize = 14 * (1+ratio/3);
        var size = Math.max(displayedNumber.toString().length, 6) + 0 + 'ch';
        if (navigator.appVersion.indexOf("MSIE 8") > -1) {
            // Fallback for IE8 that doesn't handle the 'ch' unit
            size = Math.max(((ratio * 0.5) + 0.5) * 60, 50) + 'px';
        }
        // var rgbColor = chroma(bgcolor).rgb();
        // bgcolor = chroma(bgcolor).hex();
        var bordercolor = chroma(bgcolor).alpha(0.5);

        return L.divIcon({
            html: '<div class="cluster-marker-circle" style="width: ' + size + '; height: ' + size + '; background-color: ' + bgcolor.css() + '; border: solid 4px '+ bordercolor.css('rgba') +'; top: calc(-'+size+'/2); left: calc(-'+size+'/2); font-size: '+textsize+'px;">' +
                '<span style="color: ' + textcolor.css() + '; line-height: ' + size + ';">' + displayedNumber + '</span>' +
                '</div>',
            className: 'cluster-marker'
        });
    },
    _getShapeStyle: function(color, ratio) {
        if (!color) {
            color = "#000000";
        }
        var opacity = (ratio * 0.4) + 0.2;

        var highlightStyle = {
            color: color,
            fillOpacity: opacity,
            stroke: false
        };
        var defaultStyle = {
            color: color,
            fillOpacity: 0,
            stroke: false
        };
        return {
            "default": defaultStyle,
            "highlight": highlightStyle
        };
    }
});