L.VectorMarker = L.Marker.extend({
    options: {
        color: '#FF0000',
        icon: null,
        marker: true,
        opacity: 1,
        size: 5, // From 1 to 10, default 5
        extraClasses: '',
    },
    initialize: function(latlng, options) {
        L.Util.setOptions(this, options);
        // Create divicon
        this.options.icon = this._getVectorIcon(this.options.color, this.options.icon, this.options.marker, this.options.opacity, this.options.extraClasses);

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
    _getVectorIcon: function(color, icon, marker, opacity, extraClasses) {
        var sizeMultiplier = this.options.size + 1;
        var baseWidth = 5;
        var baseHeight = 9;
        var realWidth;
        var realHeight;

        var html = '';
        var styles = [];
        if (opacity !== 1) {
            styles.push('opacity: ' + opacity);
        }
        if (!marker) {
            // Just the icon
            realWidth = baseWidth * sizeMultiplier;
            realHeight = realWidth;

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

            var fillColor = chroma(color).css();
            var borderColor;
            if (chroma(color).luminance() > 0.3) {
                borderColor = chroma(color).darken(30).css();
            } else {
                borderColor = chroma(color).brighten(40).css();
            }

            html = '<svg id="svg-vectormarker-marker" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 32 56">' +
                        '<g id="svg-vectormarker" fill-rule="nonzero" fill="none">' +
                            '<path id="svg_2" fill="'+ fillColor +'" fill-rule="evenodd" d="M16 0C7.222 0 0 7.217 0 16.157c0 4.86 1.03 8.446 2.66 12.027L16 56l13.34-27.816c1.63-3.58 2.66-7.167 2.66-12.027C32 7.217 24.778 0 16 0z"/>' +
                            '<path stroke="' + borderColor + '" d="M16 54.844l12.886-26.868c1.79-3.933 2.614-7.42 2.614-11.82C31.5 7.52 24.527.5 16 .5 7.473.5.5 7.52.5 16.157c0 4.4.824 7.886 2.61 11.81L16 54.844z"/>' +
                        '</g>' +
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
            className: 'leaflet-vectormarker' + ' ' + extraClasses,
            iconSize: L.point([realWidth, realHeight]),
            iconAnchor: iconAnchor,
            html: html
        });
    }
});
