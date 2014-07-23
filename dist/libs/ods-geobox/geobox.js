L.Control.GeoBox = L.Control.extend({
    /*
    /!\ Only works when positioned 'topleft', because we position it (using regular flow) next to the regular controls
    while still using the controls built-in system of Leaflet. If positioned right, we can't rely on the normal flow.
     */
    /*
    TODO:
        - Find a mechanism to restrict the geocoding to the dataset's bbox
     */
    options: {
        position: 'topleft',
        inputTabIndex: '1',
        placeholder: 'Find a place...'
    },
    initialize: function(options) {
        L.Util.setOptions(this, options);
        this._highlight = null;
    },
    onAdd: function (map) {
        this._map = map;

        var className = 'leaflet-control-geobox';

        this._container = L.DomUtil.create('div', className);
        this._form = L.DomUtil.create('form', className + '-form', this._container);
        this._input = L.DomUtil.create('input', className + '-input leaflet-bar', this._form);
        this._spinner = L.DomUtil.create('i', 'icon icon-spinner icon-spin', this._form);
        this._input.type = 'text';
        this._input.placeholder = this.options.placeholder;
        if (this.options.inputTabIndex) {
            this._input.setAttribute('tabindex', this.options.inputTabIndex);
        }

        L.DomEvent.disableClickPropagation(this._container);

        L.DomEvent.addListener(this._form, 'submit', this._search, this);

        L.DomEvent.addListener(this._input, 'keydown', function(e) {
            L.DomUtil.removeClass(e.target, 'notfound');
        });

        return this._container;
    },
    _search: function(e) {
        L.DomEvent.preventDefault(e);
        if (this._input.value === '') {
            return false;
        }

        L.DomUtil.setOpacity(this._spinner, 1);

        var geobox = this;
        jQuery.ajax({
            url: 'http://api.geonames.org/searchJSON',
            dataType: 'json',
            data: {
                maxRows: 1,
                username: 'opendatasoft',
                style: 'full',
                q: this._input.value
            },
            success: function(data, textStatus, jqXHR) {
                L.DomUtil.setOpacity(geobox._spinner, 0);
                if (data.geonames.length > 0) {
                    // Fit the map to result
                    var geonamesBbox = data.geonames[0].bbox;
                    var bounds = [
                        [geonamesBbox.north, geonamesBbox.west],
                        [geonamesBbox.south, geonamesBbox.east]
                    ];

                    geobox._map.fitBounds(bounds);
                    if (geobox._highlight) {
                        geobox._map.removeLayer(geobox._highlight);
                    }
                    geobox._highlight = L.rectangle(bounds, {color: "#3182bd", weight: 1});
                    geobox._map.addLayer(geobox._highlight);

                } else {
                    L.DomUtil.addClass(geobox._input, 'notfound');
                }

            }
        });

        return false;
    }
});