L.VectorMarker = L.Marker.extend({
    options: {
        color: '#FF0000',
        icon: null,
        marker: true,
        opacity: 1,
        size: 5 // From 1 to 10, default 5
    },
    initialize: function(latlng, options) {
        L.Util.setOptions(this, options);
        // Create divicon
        if (Modernizr.inlinesvg) {
            this.options.icon = this._getVectorIcon(this.options.color, this.options.icon, this.options.marker, this.options.opacity);
        } else {
            this.options.icon = new L.Icon.Default();
        }
        L.Marker.prototype.initialize.call(this, latlng, this.options);
    },
    _isSVGIcon: function() {
        return !(typeof this.options.icon == 'string' || this.options.icon instanceof String);
    },
    _getStylesAttribute: function(styles) {
        if (styles.length === 0) {
            return '';
        } else {

            return ' style="'+styles.join('; ')+'"';
        }
    },
    _getVectorIcon: function(color, icon, marker, opacity) {
        var sizeMultiplier = this.options.size + 1;
        var baseWidth = 5;
        var baseHeight = 9;
        var realWidth;
        var realHeight;

        // Safari has a weird bug where any SVG with a "filter" CSS property somehow makes the SVG disappear.
        var isSafari = (window.navigator.userAgent.indexOf('Safari/') > -1);

        var html = '';
        var styles = [];
        if (opacity !== 1) {
            styles.push('opacity: ' + opacity);
        }
        if (!marker) {
            // Just the icon
            realWidth = baseWidth * sizeMultiplier;
            realHeight = realWidth;

            if (isSafari) {
                icon.find('svg').css('filter', 'none');
            }
            icon.children('svg')
                .css('width', realWidth+'px')
                .css('height', realHeight+'px');
            html = '<div class="leaflet-vectormarker-singleicon"' + this._getStylesAttribute(styles) + '>' + icon.html() + '</div>';
        } else {
            realWidth = baseWidth * sizeMultiplier;
            realHeight = baseHeight * sizeMultiplier;
            // Compute the icon size
            var iconSize = realWidth - 2 * sizeMultiplier;
            var iconOffset = sizeMultiplier;

            color = chroma(color);
            var borderColor = chroma(color).alpha(0.5);
            html = '<svg id="svg-vectormarker-marker" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 32 56"';
            if (isSafari) {
                html += ' style="filter: none;"';
            }
            html += '>' +
                      '<g id="svg-vectormarker">' +
                        '<path id="svg_2" fill="' + color.css() + '" stroke="'+borderColor.css('rgba')+'" d="m15.64842,0c-8.58535,0 -15.64842,7.20061 -15.64842,16.11997c0,4.84818 1.00644,8.42613 2.6007,11.99846l13.04772,27.75208l13.04758,-27.75208c1.5941,-3.57232 2.60059,-7.15027 2.60059,-11.99846c0,-8.91936 -7.06302,-16.11997 -15.64818,-16.11997z"/>';
            html += '</g>' +
                    '</svg>';
            if (icon) {
                icon.children('svg')
                    .css('width', iconSize+'px')
                    .css('height', iconSize+'px');
                styles.push('top: '+iconOffset+'px');
                html += '<div class="leaflet-vectormarker-iconoverlay"' + this._getStylesAttribute(styles) + '>'+icon.html()+'</div>';
            }
        }
        var iconAnchor;
        if (marker) {
            // The anchor is the bottom center
            iconAnchor = L.point([realWidth / 2, realHeight]);
        } else {
            // The anchor is the middle center (i.e. the center of the icon)
            iconAnchor = L.point([realWidth / 2, realHeight / 2]);
        }
        return L.divIcon({
            className: 'leaflet-vectormarker',
            iconSize: L.point([realWidth, realHeight]),
            iconAnchor: iconAnchor,
            html: html
        });
    }
});