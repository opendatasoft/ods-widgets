# Change Log
All notable changes to this project will be documented in this file.
This log tries to follow the good principles of [Keep a CHANGELOG](http://keepachangelog.com/).

## 2.1.2 - 2025-07-21

### Changed
- `odsSelect`: Closing and opening the select now resets the value filter, if it was used before closing.
- Inside the widgets' documentation, links to the Opendatasoft user guide have been updated to follow the doc migration.
- Inside the Opendatasoft platform, some field settings have been updated to be stored in dataset metadata, such as
  the list of filters, their settings, and the definition of which fields are displayed for each language. This was
  previously stored in field annotations. Many widgets have been updated accordingly to fetch these settings from their
  dataset metadata.

## 2.1.1 - 2024-11-05

### Added
- `odsPicto`: New `local-id` parameter that is used to clone a reference SVG prexisting in the page,
  to avoid having to fetch the SVG remotely.
- `odsSocialButtons`: Twitter logo has been replaced with the new X logo.
- `odsTable`: Every text field is now sortable.

## 2.1.0 - 2023-10-03
This version notably adds the support of jQuery 3, while keeping compatibility with jQuery 2 as well.

### Fixed
- `odsMap` now supports multivalued fields when coloring by category (the color is based on the first value).
- `odsMap` now properly displays all the points in a `MultiPoint` geometry with their intended color and style.

### Changed
- `odsAdvAnalysis` and `odsAdvResults` now rely on Explore API v2.1.

### Removed
- `odsVegaLiteChart` has been removed due to major security issues.
- `odsMap` location search no longer supports Algolia Places (the service is no longer available).

## 2.0.1 - 2021-04-14
This version includes a large update of the documentation, with many parameters having their default behavior more
explicitly defined, and improved examples.

### Added
- `odsChart`: `min`, `max` and `labelX` are now dynamic and can be changed after the chart has been drawn.
- `odsChartSerie`: `chartType`, `innersize`, `functionY`, `expressionY`, `labelY`, `min`, `max`, `step`, `multiplier`,
  `color`, `colorThresholds` are now dynamic and can be changed after the chart has been drawn.
- `odsPaginationBlock`: When using `containerIdentifier`, if the container doesn't have a scrollbar, the page itself
  will be scrolled up to the container's top when clicking on a page.

### Fixed
- `odsAdvAnalysis`: Fixed an issue where the user's timezone was not used for time queries and displays
- `odsAdvAnalysis`: Fixed an issue where disjunctive filters (multiple selection) didn't work
- `odsChart`: Fixed a performance issue in some situations with large time-based datasets
- `odsDateRangeSlider`: Fixed an accessibility issue where a hidden technical field appeared to screen readers
- `odsGeotooltip`: Fixed the position of the tooltip on small screens, when too close to the left side of the screen
- `odsPaginationBlock`: Fixed an issue where you could be select a page beyond the 10000 first records limit
- `odsTimerange`: Fixed missing accessibility attributes on start and end date inputs
- `odsTimerange`: Fixed timezone calculation issues when used on `date` fields

### Removed
- `odsDatasetJsonSchema` has been removed from ODS-Widgets (it doesn't work outside of the Opendatasoft platform)

## 2.0.0 - 2020-10-30
This version is the first one based on AngularJS 1.8.0, which is the last major version that will be released, and is
currently in Long Term Support ([more information](https://docs.angularjs.org/misc/version-support-status)).

Starting from this version, ODS-Widgets will only officially support AngularJS 1.8, and we encourage you to upgrade your own
application to this version. However, our tests show that most widgets still work with AngularJS 1.4.x to this day,
with two known exceptions: `ods-range-input` and `ods-gist`.

### Fixed
- `odsSelect`: Fix a crash when `options` was based on a static value instead of a variable.
- `odsSelect`: In non-multiple mode, you can now unselect your previous selection again by clicking it.
- `odsLegend`: Fix blank legend in some situations when the minimum value was 0.

## 1.4.12 - 2020-10-23
### Added
- `odsAdvAnalysis`: A new widget that can be used to query an
[API v2 `aggregates` endpoint](https://help.opendatasoft.com/apis/ods-search-v2/#aggregating-records) and expose the
results in a variable, which can then be used by other widgets.
- `odsAdvTable`: A new widget to display as a table the content of a variable (typically taken from the `odsAdvAnalysis`
variable).
- `odsSelect`: New `isLoading` parameter to trigger in advance the loading spinner. For example, it can be used to start
the spinner at the very beginning of an `odsResults` query that will populate the `odsSelect` options, so that users
get an explicit loading message the entire time.

### Changed
- `odsMap`: The Mapbox basemap support has been updated to remove deprecated "Studio Classic styles", and add support
for Mapbox Styles and Tilesets.
- `odsMap`: The Jawg basemaps are now displayed in Retina on displays that support it (e.g. smartphones, tablets,
high-density screens).

### Fixed
- Fixed on issue on our minified build (`ods-widgets.min.js`) where several widgets were unusable.
- `odsMap`, `odsSearchbox`: Fixed a number of accessibility issues
- `odsSelect`: Various performance improvements when dealing with a large set of options.

## 1.4.11 - 2020-08-07
### Fixed
- `odsColorGradient`: Replaced `odsColorGradientLogarithmicScaleFactor` parameter with a new `odsColorGradientPowExponent`
parameter, to provide the ability to generate a logarithmic scale (value below 1), or an exponential scale (value above 1).

## 1.4.10 - 2020-07-21
### Fixed
- `odsMap`: Fixed an issue where pictos wouldn't load in the legend and the display control, when used outside an
Opendatasoft platform.
- `odsMap`: Fixed an issue where a map wouldn't properly initialize due to a race condition in very rare situations.
- `odsMap`, `odsVegaLite`: Fixed an issue in third-party dependency loading, which would prevent the widgets from
running properly more than once in complex dashboards.

### Removed
- `odsPlumeAirQuality`: Removed because the service has been discontinued by its author

## 1.4.9 - 2020-07-09
This release includes a large rewrite of the documentation for many widgets.

### Fixed
- `odsChart`: Special characters are now properly handled in tooltip headers.

## 1.4.8 - 2020-06-30
### Changed
- `odsSelect`: `selectedValues` will always be an array, to ensure the behavior is consistent both in single and
multiple modes.
- `odsSelect`: `onChange` callback will be run after the changes triggered by the user's selection have been propagated.
### Fixed
- `odsChart`: Special characters are now properly handled in axes' labels.
- `odsSelect`: Fixed various issues that prevented the active selection to be kept when the options were updated.

## 1.4.7 - 2020-06-17
### Added
- `odsSelect`: This is a new widget built to offer a selection (single or multiple) between a list of options, with many
formatting options. For example it can be used as an alternative to the usual filters so that users may choose a number
of values.
- `odsSimpleTabs`: This new widget lets you easily build a tab system for your content within your page.

## 1.4.6 - 2020-06-05
### Added
- `uriEncode` and `uriComponentEncode`: two new filters to help building links directly in the template.
  They respectively apply the javascript functions `encodeURI` and `encodeURIComponent` to the filtered string.
- `odsFacets` and `odsTable`: the two widgets now support selection of fields for a specific language.
- `odsGeoNavigation`: it nows displays more familiar country shapes instead of exhaustive one.
- `odsGeoNavigation`: add a new `ascendingFilter` parameter that activate the
  "Display all datasets that include current selection" by default

### Changed
- `odsPicto`: the `colorByName` attribute has been replaced by `colorByAttribute`. It now applies the given colors
  to svg element using their id.

## 1.4.5 - 2020-03-25
### Added
- `odsPicto`: A new `colorByName` parameter can be used, to apply different colors to different areas of a SVG file
  based on their `name` attribute. The parameter can be changed on the fly, to allow for dynamic coloring.
- `odsResultEnumerator`: The `max` parameter can now be changed on the fly.
- `odsResults`: The `odsResultsMax` parameter can now be changed on the fly.

### Fixed
- `odsMap`: A number of texts in the Search box where not properly translated
- `odsMap`: The field used to display results when using the Search box is now the field used as the tooltip title
  (if configured), as intended
- `odsMediaGallery`: Fixed broken image when using TIFF (now displaying a placeholder since most browsers don't support it)
- `odsVegaLite`: Fixed potential infinite loop when working with dynamic data

## 1.4.4 - 2020-03-25
### Added
- `odsChartQuery`: all parameters are now dynamic, meaning that if they are set to a variable, and the variable
  changes, the chart will refresh accordingly.

## 1.4.3 - 2020-02-27
### Added
- A new `fromjson` filter, to parse a text containing JSON and obtain the object

## 1.4.2 - 2020-02-17
### Fixed
- `odsCrossTable`: Fixed an issue with the width of each cells after applying a filter on the data
- `odsGeoNavigation`: Fixed multiple similar API calls when using another filter on the same context
- `odsMap`: Support Jawg as a provider for the geocoding search on the map itself (requires `jawgGeocodingAPIKey` in
  your `ODSWidgetsConfig`), default is Mapbox as previously

## 1.4.1 - 2020-01-23

### Added
- `odsColorGradient`: new widget that can be used to build a set of colors from the results of an aggregation
- `odsLegend`: together with `odsColorGradient`, can be used to build a dynamic map legend
- `odsGeoNavigation`: a new filter, specifically for geographic-based metadata such as "Geographic coverage"
- `odsMostPopularDatasets`: new `orderBy` parameter, can be used to display the most popular datasets based on their
  popularity score (`popularity`) instead of the default based on the number of downloads (`downloads`)
- `math` filter: new `pow` function to compute power

## 1.2.1 - 2018-03-21

### Added
- `odsMap`: added support for min & max zoom levels in Custom WMS basemaps

### Fixed
- `odsHighchart`: made color series management local to each chart
- `odsDatasetContext`: fixed `getDownloadUrl()` method issue with null/undefined values
- `odsMap`: fixed whitespace in tooltips and fullscreen mode
- `odsTimerange`: fixed reset button position/style

## 1.2.0 - 2018-03-07

### Added
- `odsDatasetContext`: new `refresh-delay` parameter to automatically refresh the context's data at a fixed interval
- new `odsPageRefresh` directive trigering a full refresh of the page at a given interval
- added notifications when XHR requests fail

### Fixed
- `odsHighcharts`: fixed dependency on undocumented `config` object, now relying on `ODSWidgetsConfig`
- `odsMap`: pan map so that tooltip fits in

### Removed
- `odsRedirectIfNotLoggedIn` having no use outside of dashboards hosted on Opendatasoft, it's been moved out of this library

## 1.1.0 - 2018-02-23
### Added
- Better support for right to left languages support
- `clearAllFilters`: accept an exception list to avoid clearing some specific parameters
- `odsFilterSummary`: accept an exception list that will not be displayed
- `odsFacets`: date facets can now display a date range picker for selection
- `odsMap`: display an information message when the data displayed is not complete
- `odsMediaGallery`: expose the `odsContext` to the tooltip as `ctx`
- `odsSlideshow`: navigation with keyboard
- `odsTextSearch`: added a `suffix` parameter to allow use of multiple `odsTextSearch` on the same context
- `odsTimeRange`: added a `suffix` parameter to allow use of multiple `odsTimeRange` on the same context

### Fixed
- Documentation should now be working correctly and the documentation has been updated
- JS lint all the code
- `odsDatasetContext`: Correctly initialize parameters for each context
- `odsFilterSummary`: Fixed XSS security issue when displaying filters
- `odsRedirectIfNotLoggedIn`: Now works as excepted
- `odsInfiniteScrollResults`: the `scroll-top-when-refresh` option now works as excepted
- `odsMap`: fullscreen is fixed
- `odsMediaGallery`: correctly work with custom tooltips
- `odsMediaGallery`: use the context to guess the image url instead of

### Rewritten
- `odsRangeInput`

### Removed
- the unmaintained breezometer widget has been removed


## 1.0.11 - 2017-08-21
### Added
- `odsMap`: better support for thunderforest basemaps (now accepts API keys in conf) and support for tile format option for WMS basemaps
- `odsTimerange`: better style
- `odsCrossTable`: improved documentation
- `odsHighcharts`: funnel and polar charts now support color ranges, improved documentation
- `odsRangeInput`: added validation
- new `filesize` filter that transforms an integer into a file size (in kB, MB etc.)
- Lots of accessibility improvements
- Switched to system fonts for lighter pages and better integration with the OS

### Fixed
- `odsAggregation`: fix example and crash when aggregation yields no result
- `odsCrossTable`: fix refresh condition
- `odsFacets`: fix race condition with filtered contexts
- `odsRangeInput`: fix bad display on init
- `odsSlideshow`: fix numerous errors that used to show up in the console
- `odsMap`: bug fixes and many improvement following the release of the new mapbuilder
- Added back lots of missing ";"

## 1.0.10 - 2017-05-18
### Added
- `odsFilterSummary`: now lists `odsTimerange`, `odsTimescale` and `odsMap` filters as well
- `odsGeoSearch`: now uses the default map location set through ODSWidgetsConfig
- `odsInfiniteScrollResults`: now lists dataset's interop metas as well
- `odsLastReusesFeed`: new option to link either to the reuse or to the dataset
- `odsMapDisplayControls`: if no group title or description is set, default to the title or description of the first
layer of the group before resorting to the this layer's dataset title and description.
- `odsMapLegend`: support for choropleth and heatmap legends, and lots of visual improvements
- `odsMapSearchBox`: visual improvements
- `odsRefineOnClick`: new replace-refine option
- `odsResultEnumerator`: new class to make customization easy and better scroll-to-top integration with `odsPaginationBlock`
- `odsMap` lots of visual improvements and bug fixes
- `odsDatasetContext`: now caching schema requests, resulting in a lot less requests (less quota usage and performance improvement)
- `odsGist`: new directive to embed a GitHub Gist into any dashboard

### Fixed
- `odsAnalysis`: documentation's example
- `odsCrossTable`: non-repeating row headers now working properly
- `odsHighcharts`: only set HighCharts' UTC option for timeserie analysis
- `odsMapSearchBox`: Algolia Places API key now correctly set
- `odsMediaGallery`: fix bug with refined context where the selected picture was replaced by the first picture at selection
- `odsPaginationBlock`: documentation update and trigger scroll-to-top only on page change and not at init
- `odsSearchBox`: do not display search box if there is no context + support for autofocus
- `odsTimerange`: fix default values that were always empty

## 1.0.9 - 2017-02-08
### Added
- `odsCharts`: support for boxplot charts
- `odsMap`: new showZoomMin and showZoomMax parameters on layers, to configure the zoom levels where the layer is visible
- `odsMap`: new parameters to configure clusters' min and max sizes, and markers' size

### Fixed
- `odsFacets`: fixed behavior on multi-valued facets if the separator is not "/"
- `odsSlideshow`: various visual improvements, especially with empty or very long descriptions
- `odsCrosstable`: fixed various bugs when used on a date or datetime field
- `odsMap`: when drawing a filter zone, tooltips are now displayed when drawing or editing, and labels are more intuitive
- `odsMap`: fixed missing icons in the search box

## 1.0.8 - 2016-12-19
### Added
- `odsCrossTable`: new visualisation that allows a representation of datasets data in a pivot table like formatting
- `odsMap`: new choropleth mode for map rendering

### Fixed
- `odsTwitterTimeline`: deprecate the old Twitter widget system and promote the new Twitter widgets
- `odsTable`: display sort icons even with long field names
- `odsMap`: various fixes
- some JS linting

## 1.0.7 - 2016-11-29
### Added
- `odsFilterSummary`: proper support for drawn areas on maps
- `odsCharts`: support for multiple colors in treemaps
- `ods-widgets.css`: now includes vendor prefixes

### Fixed
- `odsSlideshow` documentation's example
- `odsCharts`: bug with legend referencing dates
- Fixed icons that were not displayed in this documentation

## 1.0.6 - 2016-11-21
### Added
- **New odsSlideShow widget:** Browse the content of an image-based dataset using a slideshow display.
- `odsMap`: New legend display on analytic display modes.
- `odsMap`: Updated clusters display to make sure the cluster's radius accurately represents the associated ratio.
- `odsChart`: Migrated to Highcharts 5 for a cleaner look and better performance.
- `odsChart`: Added three new chart types: `polar`, `funnel`, `spiderweb`.

### Fixed
- Fixed an issue with `odsFacets` when used in disjunctive mode: in Firefox and Internet Explorer, it used to have a
weird centering effect when hovered.


## 1.0.5 - 2016-09-09
### Added
- **New odsGauge widget:** Display a gauge indicator in your dashboards.
- `odsChart`: A new `scientificDisplay` option to toggle the display of Y axis values in a scientific notation.
- `odsChart`: A new `step` parameter to configure the step of the Y axis.
- `odsLastDatasetsFeed` and `odsMostPopularDatasets`: new `max` parameter to set the number of displayed items.
- Support for TMS service base maps. Set `strictTMS` to `true` in the basemap configuration object.
- Better accessibility markup for all widgets

### Fixed
- Fixed an issue with `odsInfiniteScrollResults`: it now uses the context parameters when used with a dataset context,
as you would expect.
- Fixed an issue with `odsFacets`, where the "more"/"less" toggle to display more than the 5 first results would appear based
on the number of items regardless of `visibleIf` that makes some of them not appear in the list.
- Fixed an issue where lines in `odsTable` were sometimes not displayed in the right order, despite being supposedly sorted.
- Fixed an issue on `odsMap` when you had two layers that were using the same context, and you were displaying either one or
the other at once using `showIf`: the layers are now correctly switched, where previously the change was not detected by the map.


## 1.0.4 - 2016-07-07
### Added
- The widgets now use Jawg.io basemaps by default, instead of MapQuest, due to the discontinuation of MapQuest's free service.
Widgets previously configured to use MapQuest will fallback to Jawg instead.
- In `odsTable`, numerical values are now aligned to the right.
- New filters have been added: `toObject`, `momentdiff`.
- New `autoGeolocation` parameter in `odsMap`, to automatically trigger the user's geolocation on a map.
- In `odsMap`, you can now use `colorFunction` to configure the way the color scales are computed (only logarithmic for now).

### Fixed
- Fixed an issue in `odsRecordImage` where sometimes, when used in a map tooltip, it would display a broken image.
- Fixed performance with `odsMediaGallery` and datasets with big geo shapes.


## 1.0.3 - 2016-05-04

### Added
- New translations module (`gettext`) with an updated `translate` directive that supports plural forms natively.
- Support for multi-x charts in `odsChart`.
- New `ODSCurrentDomain` provider for the setup of `odsCatalogContext`.
- Lots of documentation for available filters.
- Support for custom HTML tooltips in `odsCalendar`.
- Added multi-context support in `odsClearAllFilters`, `odsFilterSummary`, `odsFacet`, `odsGeoSearch`, `odsTextSearch`.
- New Hubspot integration: `odsHubspotForm`.


### Fixed
- Fixed disappearing map markers on Safari.
- Fixed `odsCalendar` tooltip reload issue (styles were not applied to the tooltip).
- Fixed `odsCalendar` full day events issue with single-day events.

## 1.0.2 - 2016-04-11
This release includes two additional widgets, one for image galleries and the other for geographic searches through
dataset catalogs.

### Added
- New `odsMediaGallery` widget to build image galleries from datasets containing images.
- New `odsGeoSearch` widget to make geographic searches within dataset catalogs. These searches relies on the
  `geographic_area` metadata set on datasets.

### Fixed
- Fixed `odsClearAllButton` dependency issue that made the directive crash with the minified version of the library.

## 1.0.1 - 2016-03-11
This release is pretty minor from a pure widget standpoint, but includes many improvements in the documentation, including
more details about usage of aggregation functions in the `odsMap` widget.

### Added
- New `odsRecordImage` widget to simply display an image from a record. No more fiddling and creating an URL by hand!

### Fixed
- Fixed `odsFacets` documentation to mention the new custom display's syntax since ODS-Widgets v1.0.0.
- Fixed an issue that triggered some API calls twice upon widget initialization for many visualization widgets.
- Fixed an `odsMap` problem that would sometimes block the map's loading when there were more than one `odsMap` on the page.
- Fixed `odsDomainStatictics` to make the smallest possible API call by default, to improve performance.

## 1.0.0 - 2015-12-14
This release is the one that finally jumps to the 1.x.x major version number! Many changes in the structure and styles, most of
them being breaking changes, so it warranted a major version; and at the same time we are now confident that it is going
to stay stable for a long time, so the jump to 1.x seemed warranted.

There are two (big) breaking changes:
- **Internet Explorer 8 is no longer supported.** This seems harsh, but this enabled us to upgrade Angular version to 1.4,
and allowed a lot of improvements under the hood. In other words, everything is a bit better and faster, at the expense
of IE8.
- **Every CSS class name and widget style have changed.** Previously, styles and classes were done without much consistency,
and it made it harder to override the style of some widgets. Everything has been rewritten to be easier to alter the style
of every widget to match the style of your own website, without having to use 8-levels-deep-nested styles (or even worse, `!important`).
But unfortunately, this means that any current customization is likely to be entirely broken.

### Added
- New `odsInfiniteScrollResults` widget
- New `odsPlumeAirQuality`: displays the status of the air quality in a specific city
- New `odsClearAllFilters`: a simple link to reset all filters on a context.
- New `odsDatetime`: can be used to inject the current date/time as a variable in the page.
- New `odsRedirectIfNotLoggedIn` (Opendatasoft customers): redirects the users to the login page if they are not logged in.
Can be used on a public page that uses private datasets, to ensure the user doesn't stop at an empty dashboard. Only works
on the Opendatasoft platform.
- New `availableCalendarViews` parameter on `odsCalendar`, allowing you to restrict the available views in the calendar.
- New `minZoom` and `maxZoom` parameters on `odsMap`, to restrict the available zoom levels.
- New `scrollWheelZoom` parameter on `odsMap` to prevent the mousewheel to zoom/unzoom. Can be useful on a scrollable
page with a large map, to avoid frustrating behavior where you want to scroll the page but your mousewheel gets stopped
by a map right in the middle.
- `odsTwitterTimeline` now supports `width` and `height` parameters to configure the dimensions of the widget.

### Fixed
- When using two or more layers with the `showIf` parameter, sometimes the map wouldn't detect the changes and wouldn't
refresh. This is now fixed. There can still be issues if these layers are using the same context, which will be fixed
in the close future.

## 0.1.8 - 2015-09-01
### Added
- New `odsCalendar` widget! Displays a calendar view of your data. Live example: http://data.issy.com/explore/dataset/agendav2/?tab=calendar
- In `odsDatasetContext`, you can now set `mycontextname-urlsync="true"` to synchronize this context's parameter with
the page's URL, so that the URL changes when the parameters change. Also, if you arrive on the page with parameters in
the URL, the context will directly initialize with these parameters. You can use this to make dynamic pages with URL
parameters (for examples mypage?refine.city=Paris).
- In `odsReuses`, you can now pass a template to configure how to display each reuse. More information is available
in the widget's documentation.
- In `odsfilterSummary`, there is now an option to not display the "clear all" button below the active filters.
- In `odsTagCloud`, you can now use the widget as a way to refine your context. See the widget's documentation for more
information.

### Fixed
- In `odsThemeBoxes`, fixed a bug where the boxes would not appear at all. Also fixed an alignment bug with Internet
Explorer.
- In `odsLastDatasetsFeed` and `odsMostPopularDatasets`, fixed a bug where the theme picto would not be displayed if
the dataset had more than one theme.
- In `odsMap`, the border color and opacity options now apply to every visualization mode that displays shapes (previously
only appeared on the "aggregation" visualization mode).


## 0.1.7 - 2015-05-29
### Added
- New `odsFacetResults` widget, which can be used to iterate the values of a facet and build HTML from it (simple list, select, radio buttons...).
- In `odsChart`, you can now trigger a refine on a context from a click on a bar chart or pie chart using a new `refineOnClickContext` parameter.
- In `odsChart` you can configure the unit (°C, ...) of displayed values using a new `displayUnits`
- In `odsMap` you can configure the border color and opacity of shapes using new `borderColor` and `opacity` parameters on the `odsMapLayer` tag.
- In `odsMap`, if a field contains only a link to a Youtube, Vimeo or Dailymotion video, the video player is directly embedded in the tooltip.

### Removed
- The `odsFacetEnumerator` is gone (for now), replaced by the slightly lower-level `odsFacetResults` which can be used in more cases.

### Fixed
- Various fixes for glitches in label display in `odsChart`
- When an `odsMap` is configured as "static", the user is no longer able to navigate using the keyboard.


## 0.1.6 - 2015-03-27
### Added
- All templates are now inlined instead of external; this means that you won't have any more issue with CORS and widgets such as `odsTable` and `odsMap`.
Also, all examples in the documentation should now work, and testing in Plunkr should be easier!
- When using `odsFacets` with the searchbox, the current search is now reset when you select a category.
- You can now prevent specific parameters to be displayed within `odsFilterSummary`.
- You can now use a function on `odsDatasetContext` objects to get a link that can be used to download the current data, based on active filters.

### Fixed
- Fixed a problem where the `odsTimescale` widget may crash if initialized directly upon context initialization.
- Fixed a problem where `odsFacets`, `odsDomainStatistics`, `odsFilterSummary` and `odsTagCloud` wouldn't work
with the minified version of ods-widgets.
- All the directives templates are now defined inside the directives code: this ensures that there is no request needed
to fetch the templates, which caused CORS issues for developers with no ability to enable CORS on their server (e.g. no access
to the configuration), and issues on the documentation.
- Fixed potential race conditions in `odsChart` and `odsTable` when filters where changed too quickly.
- Fixed layout issues when an `odsMap` was contained inside an `odsDatasetCard`.
- You can now use `odsTimescale`, `odsTimerange`, and/or `odsTextSearch` without each one overriding the other.
- Limiting the size of the real text content within `odsTable` cells, to prevent browsers crashes.
- Fixed some map pictos from not being displayed under Firefox 36, due to a browser bug.
- Fixed some cases where a reverse sort on Y axis in `odsChart` would be ignored.
- Various IE8 fixes.


## 0.1.5 - 2015-02-20
### Added
- The `odsMap` has been modified to be much more powerful and support multiple layers, visualization modes, and contexts.
It can be used to build interactive maps from various dynamic data sources. More information is available in the documentation,
and two new tutorial pages are dedicated to it. Note: if you have issue with your existing `<ods-map>` usage, especially
if you are using advanced options like aggregation colors, you can use `<ods-map-legacy>` instead which is the former tag
under another name.
- The `odsTimerange` widget now supports specific dates to be passed as default values, instead of just "yesterday" and
"now".
- The `odsFacets` widget now supports parameters to enable disjunctive refinement, and a searchbox within the values. See the documentation
for more information.
- New `odsAggregation` widget to expose the result of an aggregation function on a dataset into a variable.
- New `odsFilterSummary` to display a view of the filters that are currently active on a context.

### Fixed
- In `odsMap`, some pictos may have been aligned to the left instead of properly centered; this should no longer happen.
- The `odsHighcharts` widget now properly uses API keys configured in its context.
- The `odsSearchbox` widget's placeholder is now properly translated.


## 0.1.4 - 2015-01-28
### Added
- New `odsPaginationBlock` widget, especially used in `odsResultEnumerator` where you can use a new `showPagination` attribute
to display a pagination control below your results.
- `odsFacets` now support the configuration of a specific order for facet values. It can be used for example to ensure
 "Monday", "Tuesday", "Wednesday", "Thursday"... are displayed in the right order.
 See documentation of the `sort` parameter for more information.
- In `odsMap` default tooltips, if a field contains a link to a YouTube video, a mini video player is displayed.
- Clicking on a reuse's source will now open in a new tab by default.
- When `odsTextSearch` initialized, it now takes the `q=` parameter of its context as a default value.

### Fixed
- The `imagify` filter no longer cuts URL parameters from detected image links; this means you'll no longer see this problem
in `odsMap` tooltips for example.
- Linebreaks between start and end of the `odsTable` tag no longer triggers an empty custom template for cells.
- Clicking on a reuse (from `odsReuses` or `odsLastReusesFeed`) will bring you to the dataset's information tab where all
the reuses are listed, instead of a default visualization.
- `odsSearchBox` now works in every case; previously, depending on how it was initialized, it may have been not working when submitting a search.


## 0.1.3 - 2014-12-04
### Added
- New widget: `odsToggleModel`. It can be used on a checkbox, to add/remove a parameter depending on the state of the checkbox.
- It is now possible to customize the template of reuses in the `odsLastReusesFeed` widget. See the widget's documentation for more information.
- `odsLastReusesFeed` now has a `max` parameter to set a maximum number of reuses to display.
- `odsMap` custom tooltips have been simplified and do not require including some code for scrolling between multiple records anymore. Documentation is coming soon!
- `odsResults` widget, when used with an `odsCatalogContext`, now retrieves every metadata, including DCAT and others, so that you can use them in results display.
- Facet values are now also displayed as a tooltip on mouse hover (title), making it possible to read long values that have been truncated.

### Fixed
- The sort icons on the `odsTable` widget now show the proper direction, and sorting on an alphanumeric field now sorts
in the right direction the first time.
- `odsMap` now handles massive amounts of data much faster than before.


## 0.1.2 - 2014-10-15
### Added
- New widget: `odsFacets`. This widget allows you to insert and finely configure filters for your data, including customizing the way each available
value is displayed. You can find more information in the documentation.
- New widget: `odsReuses`. This widget displays an infinite list of reuses for a domain, displayed in large boxes.
- The user's timezones is now taken into account in filters and facets.

### Fixed
- Internet Explorer 8 and 9 can now interact with non-local APIs: the widgets now use JSONP to circumvent these browsers'
limitations with cross-domain requests.


## 0.1.1 - 2014-09-17
### Added
- We now have a changelog!
- New widget: `odsTimerange`. This widget displays a calendar to select a range
of date or datetime to refine on.
- New widget: `odsResults`. This widget exposes the result of a search query as a variable in your scope. It can be
easily combined with AngularJS's ngRepeat to display a custom list of results.
- `odsGeotooltip` can now be directly passed a record to display its geographical
information, instead of having to explicitely pass the field name.
- `odsMap` now supports a new mechanism to refine another context when the user
clicks on a marker or shape. See the `itemClickContext` in the documentation.
- `odsResultEnumerator` now support a `showHitsCounter` parameter to display
a simple counter of the number of hits.
- If there is no data to display, the `odsHighcharts` widget now displays an
explicit message instead of an empty space.
- The HTTP requests sent to APIs now include an `ODS-Widgets-Version` header to indicate
the version of the ODS-Widgets library.
- To improve support for Internet Explorer 8, you can now load a `ieshiv.js` file (or its minified version also included)
before AngularJS is loaded in your page.

### Removed
- `odsTable` no longer has a `tableContext` parameter; instead, the active sort is
now directly shared in the context itself, like the other parameters.

### Fixed
- On Internet Explorer 8, Vector markers (typically containing a pictogram) were sometimes subject to
bad positioning and appeared far from their original location.


## 0.1.0 - 2014-08-22
*Initial release of the project*
