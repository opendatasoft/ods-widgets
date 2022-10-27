(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.service('odsHttpErrorMessages', ['translate',  function(translate) {
        this.getForStatus = function(httpStatus) {
            switch (httpStatus) {
            case 400:
                return translate('Bad request: please retry the request later or contact the administrator.');
            case 401:
                return translate('Request unauthorized: authentication is required.');
            case 403:
                return translate('Request forbidden: you may not have the necessary permissions for the requested ' +
                    'resource.');
            case 404:
                return translate('Resource not found: if you have followed a valid link, ' +
                    'please contact the administrator.');
            case 408:
                return translate('Request timeout: please retry the request later or contact the administrator.');
            case 429:
                return translate('Too many requests or API calls quota has been exceeded: ' +
                    'please retry the request later or contact the administrator.');
            case 503:
            case 504:
                return translate('The service is unavailable: please retry the request later or contact the ' +
                    'administrator.');
            default:
                return translate('The server encountered an internal error. Please retry the request or contact the ' +
                    'administrator.');
            }
        };
    }]);

    mod.service('odsNetworkErrorMessages', ['translate',  function(translate) {
        this.getForXHRStatus = function(xhrStatus) {
            switch (xhrStatus) {
            case 'offline':
                return translate('It seems you are not connected to internet.');
            case 'error':
                return translate('The server could not be reached, it may be a temporary network error.');
            case 'timeout':
                return translate('The server did not answer in a timely manner.');
            default:
                return translate('A network error happened during the call.');
            }
        };
    }]);
})();
