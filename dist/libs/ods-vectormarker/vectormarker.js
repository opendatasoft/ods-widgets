L.VectorMarker = L.Marker.extend({
    options: {
        color: '#FF0000',
        icon: null,
        marker: true
    },
    initialize: function(latlng, options) {
        L.Util.setOptions(this, options);
        // Create divicon
        if (Modernizr.inlinesvg) {
            this.options.icon = this._getVectorIcon(this.options.color, this.options.icon, this.options.marker);
        } else {
            this.options.icon = new L.Icon.Default();
        }
        L.Marker.prototype.initialize.call(this, latlng, this.options);
    },
    _isSVGIcon: function() {
        return !(typeof this.options.icon == 'string' || this.options.icon instanceof String);
    },
    _getVectorIcon: function(color, icon, marker) {
        // Safari has a weird bug where any SVG with a "filter" CSS property somehow makes the SVG disappear.
        var isSafari = (window.navigator.userAgent.indexOf('Safari/') > -1);

        var html = '';
        if (!marker) {
            // Just the icon
            if (this._isSVGIcon()) {
                if (isSafari) {
                    icon.find('svg').css('filter', 'none');
                }
                html = '<div class="leaflet-vectormarker-singleicon">' + icon.html() + '</div>';
            } else {
                html = '<div class="leaflet-vectormarker-singleicon" style="color: ' + color + '"><i class="' + icon + '"></i></div>';
            }
        } else {
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
                if (this._isSVGIcon()) {
                    html += '<div class="leaflet-vectormarker-iconoverlay">'+icon.html()+'</div>';
                } else {
                    html += '<div class="leaflet-vectormarker-iconoverlay" style="color: #fff"><i class="' + icon + '"></i></div>';
                }
            }
        }
        return L.divIcon({
            className: 'leaflet-vectormarker',
            iconSize: L.point([25, 43]),
            iconAnchor: L.point([12.5, 43.5]),
            html: html
        });
    }
});