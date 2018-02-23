/**
 * Source repository: https://github.com/othree/jquery.rtl-scroll-type
 * Current version: commit 1c6d684 from 2017-04-26
 */

/*MIT License */
/*global jQuery */
(function ($) {
    'use strict';
    var definer = $('<div dir="rtl" style="font-size: 14px; width: 4px; height: 1px; position: absolute; top: -1000px; overflow: scroll">ABCD</div>'),
        type = 'reverse';


    definer.appendTo('body');

    if (definer.scrollLeft > 0) {
        type = 'default';
    } else {
        definer.scrollLeft = 1;
        if (definer.scrollLeft === 0) {
            type = 'negative';
        }
    }

    $(definer).remove();
    $.support.rtlScrollType = type;
}(jQuery));
