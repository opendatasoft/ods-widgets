/**
 * This code is quick and dirty hack of the original Leaflet Fullscreen control
 * https://github.com/Leaflet/Leaflet.fullscreen
 *
 * It provides a pseudo fullscreen fallback for browsers who don't support the fullscreen API (iOS Safari and IE)
 * In order to keep the same behavior for both normal and fallback fullscreen, the fallback emits an event much like
 * the API would. On receiving this event, we update the DOM accordingly. The fallback also supports hitting ESC to
 * quit the fullscreen mode.
 */

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

        this._updateTitle();

        var that = this;
        jQuery(document).on('fullscreenchange mozfullscreenchange webkitfullscreenchange msfullscreenchange MSFullscreenChange odsfullscreenchange', function (event) {
            that.updateInternalFullscreenStatus(event);
            that.updateKeypressEventListener(event);
            that.updateDOM();
        });

        L.DomEvent.on(this.link, 'click', this._click, this);

        return container;
    },

    _click: function (e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        this.toggleFullscreen();
    },

    _getContainer: function () {
        return this._map.getContainer().parentElement;
    },

    _updateTitle: function () {
        this.link.title = this.options.title[this.isFullscreen()];
    },

    _updateContainerClasses: function () {
        var container = this._getContainer();
        if (this.isFullscreen()) {
            L.DomUtil.addClass(container, 'odswidget-map--fullscreen');
        } else {
            L.DomUtil.removeClass(container, 'odswidget-map--fullscreen');
        }
    },

    _triggerLeafletUpdate: function () {
        // IE doesn't support the native dispatch
        // jQuery's trigger method doesn't work on iOS
        try {
            window.dispatchEvent(new Event('resize'))
        } catch(error) {
            jQuery(window).trigger('resize');
        }
    },

    updateDOM: function () {
        this._updateContainerClasses();
        this._updateTitle();
        this._triggerLeafletUpdate();
    },

    _dispatchODSFullscreenEvent: function (fullscreen) {
        document.dispatchEvent(new CustomEvent('odsfullscreenchange', {detail: {fullscreen: fullscreen}}));
    },

    _requestFullscreen: function () {
        var container = this._getContainer();
        if (container.requestFullscreen) {
            container.requestFullscreen();
        } else if (container.mozRequestFullScreen) {
            container.mozRequestFullScreen();
        } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        } else if (container.msRequestFullscreen) {
            container.msRequestFullscreen();
        } else {
            this._dispatchODSFullscreenEvent(true);
        }
    },

    _exitFullscreen: function () {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else {
            this._dispatchODSFullscreenEvent(false);
        }
    },

    toggleFullscreen: function () {
        if (this.isFullscreen()) {
            this._exitFullscreen();
        } else {
            this._requestFullscreen();
        }
    },

    isFullscreen: function () {
        return this._isFullscreen || false;
    },

    updateInternalFullscreenStatus: function (event) {
        var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
        var detail = event && event.originalEvent && event.originalEvent.detail && event.originalEvent.detail.fullscreen;
        this._isFullscreen = detail || !!fullscreenElement;
    },

    _addKeypressEventListener: function () {
        var that = this;
        this._eventListener = function (event) {
            if (event.keyCode === 27) {
                that._dispatchODSFullscreenEvent(false);
            }
        };
        window.addEventListener('keypress', this._eventListener);
    },

    _removeKeypressEventListener: function () {
        window.removeEventListener('keypress', this._eventListener);
        this._eventListener = undefined;
    },

    updateKeypressEventListener: function (event) {
        if (event.type !== 'odsfullscreenchange') {
            return;
        }
        if (this.isFullscreen() && !this._eventListener) {
            this._addKeypressEventListener();
        } else if (!this.isFullscreen() && this._eventListener) {
            this._removeKeypressEventListener();
        }
    }
});

L.control.fullscreen = function (options) {
    return new L.Control.ODSMapFullscreen(options);
};
