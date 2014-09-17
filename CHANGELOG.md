# Change Log
All notable changes to this project will be documented in this file.
This log tries to follow the good principles of [Keep a CHANGELOG](http://keepachangelog.com/).

## Unreleased (as 0.1.1-dev)
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
