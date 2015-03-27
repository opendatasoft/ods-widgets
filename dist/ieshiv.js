(function(exports) {
    'use strict';

    var customTags = [
        'odsHighchartsChart',
        'odsAggregation',
        'odsAnalysis',
        'odsCatalogContext',
        'odsDatasetCard',
        'odsMultidatasetsCard',
        'odsDatasetContext',
        'odsDisqus',
        'odsDomainStatistics',
        'odsFacetEnumerator',
        'odsFacets',
        'odsFacet',
        'odsFacetCategoryList',
        'odsFacetCategory',
        'odsFilterSummary',
        'odsGeotooltip',
        'odsHighcharts',
        'odsMultiHighcharts',
        'odsChart',
        'odsChartQuery',
        'odsChartSerie',
        'odsLastDatasetsFeed',
        'odsLastReusesFeed',
        'odsMapLegacy',
        'odsMap',
        'odsMapLayerGroup',
        'odsMapLayer',
        'geoScroller',
        'odsMostPopularDatasets',
        'odsMostUsedThemes',
        'odsPaginationBlock',
        'odsPicto',
        'odsThemePicto',
        'odsMapPicto',
        'odsResultEnumerator',
        'odsResults',
        'odsReuses',
        'odsSearchbox',
        'odsTable',
        'odsTagCloud',
        'odsTextSearch',
        'odsThemeBoxes',
        'odsTileMap',
        'odsTimerange',
        'odsTimescale',
        'odsToggleModel',
        'odsTopPublishers',
        'odsTwitterTimeline',
        'inject',
        'fullClick'
    ];
    for (var i=0; i<customTags.length; i++) {
        var elementName = customTags[i];
        var elementTagName = elementName.replace(/([A-Z])/g, function (match) {
          return "-" + match.toLowerCase();
        });
        document.createElement(elementTagName);
    }
}(window));