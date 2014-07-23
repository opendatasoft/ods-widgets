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
    _getVectorIcon: function(color, icon, marker) {

        var html = '';
        if (!marker) {
            // Just the icon
            html = '<div class="leaflet-vectormarker-singleicon" style="color: '+color+'"><i class="' + icon + '"></i></div>';
        } else {
            var colorRgb = tinycolor(color).toRgb();
            var borderColor = 'rgba('+colorRgb.r+','+colorRgb.g+','+colorRgb.a+',0.5)';
            html = '<svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 32 56">' +
                      '<g id="svg-vectormarker">' +
                        '<path id="svg_2" fill="' + color + '" stroke="'+borderColor+'" d="m15.64842,0c-8.58535,0 -15.64842,7.20061 -15.64842,16.11997c0,4.84818 1.00644,8.42613 2.6007,11.99846l13.04772,27.75208l13.04758,-27.75208c1.5941,-3.57232 2.60059,-7.15027 2.60059,-11.99846c0,-8.91936 -7.06302,-16.11997 -15.64818,-16.11997z"/>';
            if (icon) {
                html += '<div class="leaflet-vectormarker-iconoverlay" style="color: #fff"><i class="' + icon + '"></i></div>';
            }
            html += '</g>' +
                    '</svg>';
            }
        return L.divIcon({
            className: 'leaflet-vectormarker',
            html: html
        });
    }
});