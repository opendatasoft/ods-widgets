(function() {
    'use strict';

    var customTags = [
        "ngInclude",
        "ngPluralize",
        "ngView",
        "ngSwitch",
        'odsCatalogContext',
        'odsDatasetCard',
        'odsDatasetContext',
        'odsDisqus',
        'odsDomainStatistics',
        'odsFacetEnumerator',
        'odsGeotooltip',
        'odsHighcharts',
        'odsLastDatasetsFeed',
        'odsLastReusesFeed',
        'odsMap',
        'odsLayer',
        'odsLayerGroup',
        'odsMostPopularDatasets',
        'odsMostUsedThemes',
        'odsResultEnumerator',
        'odsResults',
        'odsReuses',
        'odsSearchBox',
        'odsTable',
        'odsTagCloud',
        'odsTextSearch',
        'odsThemeBoxes',
        'odsThemePicto',
        'odsTimerange',
        'odsTimescale',
        'odsTopPublishers',
        'odsTwitterTimeline',
        'odsFacet',
        'odsFacets',
        'odsFacetCategoryList',
        'odsFacetCategory'
    ];
    for (var i=0; i<customTags.length; i++) {
        var elementName = customTags[i];
        var elementTagName = elementName.replace(/([A-Z])/g, function (match) {
          return "-" + match.toLowerCase();
        });
        document.createElement(elementTagName);
    }
}());
