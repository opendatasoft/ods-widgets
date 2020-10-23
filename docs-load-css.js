// We need to dynamically load on demand the CSS because when the doc opens examples in Plunkr, it doesn't copy the
// external files over.
jQuery(document).ready(function() {
    var styles = jQuery(document).find('link[rel="stylesheet"]');
    var loaded = false;
    styles.each(function() {
        var url = this.href;
        var file = url.split('/')[url.split('/').length-1];
        if (file === 'ods-widgets.css' || file === 'ods-widgets.min.css') {
            loaded = true;
            return;
        }
    });

    if (!loaded) {
        // Assume it is in the same place as ods-widgets.js
        var scripts = jQuery(document).find('script');
        scripts.each(function() {
            var url = this.src;
            var file = url.split('/')[url.split('/').length-1];
            if (file === 'ods-widgets.js' || file === 'ods-widgets.min.js') {
                var root = url.substring(0, url.length - file.length);
                if (root.endsWith('/grunt-scripts/')) {
                    // In the doc builds, the styles are not in the same folder
                    root = root.replace(/\/grunt-scripts\/$/, '/css/');
                }
                jQuery('head').append('<link rel="stylesheet" href="' + root + 'ods-widgets.min.css"></link>');
            }
        });
    }
});
