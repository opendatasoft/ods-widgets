// This code is quick and dirty hack of the original Leaflet Fullscreen control
// https://github.com/Leaflet/Leaflet.fullscreen

L.Control.ODSMapFullscreen = L.Control.extend({
    options: {
        position: 'topleft',
        title: {
            false: 'View Fullscreen',
            true: 'Exit Fullscreen'
        }
    },

    onAdd: function () {
        var container = L.DomUtil.create('div', 'leaflet-control-fullscreen leaflet-bar leaflet-control');

        this.link = L.DomUtil.create('a', 'leaflet-control-fullscreen-button leaflet-bar-part', container);
        this.link.href = '#';

        this._toggleTitle();

        var that = this;
        $(document).on('fullscreenchange mozfullscreenchange webkitfullscreenchange msfullscreenchange', function() {
            if (that.isFullscreen()) {
                that.setFullscreen(false);
            } else {
                that.setFullscreen(true);
            }
            that._toggleTitle();
        });

        L.DomEvent.on(this.link, 'click', this._click, this);

        return container;
    },

    _click: function (e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        this.toggleFullscreen();
    },

    _toggleTitle: function() {
        this.link.title = this.options.title[this.isFullscreen()];
    },

    toggleFullscreen: function () {
        var container = this._map.getContainer();
        var odsMapContainer = container.parentElement.parentElement;

        if (this.isFullscreen()) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else {
                this.setFullscreen(false);
                L.DomUtil.removeClass(odsMapContainer, 'odswidget-map__pseudo-fullscreen');
            }
        } else {
            if (odsMapContainer.requestFullscreen) {
                odsMapContainer.requestFullscreen();
            } else if (odsMapContainer.mozRequestFullScreen) {
                odsMapContainer.mozRequestFullScreen();
            } else if (odsMapContainer.webkitRequestFullscreen) {
                odsMapContainer.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            } else if (odsMapContainer.msRequestFullscreen) {
                odsMapContainer.msRequestFullscreen();
            } else {
                this.setFullscreen(true);
                L.DomUtil.addClass(odsMapContainer, 'odswidget-map__pseudo-fullscreen');
            }
        }
    },
    isFullscreen: function() {
        return this._isFullscreen || false;
    },
    setFullscreen: function(fullscreen) {
        this._isFullscreen = fullscreen;
    }
});

L.control.fullscreen = function (options) {
    return new L.Control.ODSMapFullscreen(options);
};
