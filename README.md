ODS Widgets
===========
**ODS-Widgets** is a library of web components that can be used to build rich and
interactive pages of datavisualization, live from data available on a remote API.

In more concrete terms, it is a set of AngularJS directives that can be directly
plugged on a remote data API (currently Opendatasoft only); those directives
can interact with each others using shared contexts (for example a "calendar"
directive could refine the data displayed by a "table" directive). It is
designed to work without the need for a local backend, and to be efficient to
build data visualization pages and dashboards by just manipulating HTML markup (AngularJS
directive tags). Since it is regular HTML, it can be integrated in your current
pages, supports CSS styling, and generally works in a way that will feel familiar
if you know HTML. **It does not require knowing AngularJS to be used.**

This library is used in production as a part of the Opendatasoft platform, a
Software-as-a-Service data portal. It is essentially the current core of our
front-end data visualization features.

Here are a few ideas of things you could do with all this:
- integrate a simple visualization (or a more complete visualization tool using
more widgets) from a public dataset into a blog article (it is worth noting that,
as more and more search engines are understanding JS applications like Google is,
your integrated visualizations will be referenced, which can be very beneficial to your SEO)
- within your application, allow your users to design and build complex and interactive dashboard or visualization pages
on your data, using simple HTML tags (that's what we are doing, for example)
- build a website on top of your data (or public data) without having to worry about consuming and
exposing your data to end-users in a scalable and compelling way
- fork and enrich this toolset with your own widgets, or even adapt it to your
own needs and backend services: the project is licensed under the MIT license

### Quick example
Let's show a map of the restaurants near our former office in Paris. The data
can be browsed on https://public.opendatasoft.com/explore/dataset/restaurants_a_proximite_de_pepiniere_27/
```html
<!-- Expose a "dataset context" from the data -->
<ods-dataset-context context="restaurants" restaurants-domain="public.opendatasoft.com" restaurants-dataset="restaurants_a_proximite_de_pepiniere_27">
  <!-- Display a map from the data exposed from this context -->
  <ods-map context="restaurants"></ods-map>
</ods-dataset-context>
```

### Documentation
You'll find a tutorial on how to use widgets, built using public data and live example.
#### [> Tutorial](https://help.opendatasoft.com/widgets/#/getting-started/)

There is a complete reference documentation of all the available directives and all
the parameters they support. It also contains more literature on the technical
details of the library.
#### [> Reference Documentation](https://help.opendatasoft.com/widgets/#/getting-started/01widgetdoc)

### Compatibility
Known to work on: (may not be exhaustive)
- Edge (last versions)
- Safari (last versions)
- Chrome (last versions)
- Firefox (last versions, and current ESR version)

### Download
You can [download the latest ODS Widgets release here](https://github.com/opendatasoft/ods-widgets/releases/latest). This is a ZIP file of a folder that you can then
copy into your project.

### Setup
The following libraries are required as dependencies in your pages for ODS-Widgets to work:
- **jQuery** 2.1+ (compatible with jQuery 3)
- **AngularJS** 1.8.0 and the **angular-sanitize** module (note: AngularJS 1.4 and above should be working as well,
with known incompatibility on `ods-range-input` and `ods-gist`)
- Some widgets are using icons from **[FontAwesome 4.4.0](http://fontawesome.io/icons/)**

To load ODS-Widgets, you can then simply load `ods-widgets.js` and `ods-widgets.css`, or their minified version also included
in the distribution.

Note: When including the scripts in your page, you need to include jQuery, then AngularJS, then angular-sanitize, then ODS-Widgets;
in that specific order.

ODS-Widgets require an AngularJS app to run, which can for example be done with a simple `ng-app="ods-widgets"`:
```html
<body>
  <div ng-app="ods-widgets">
    <!-- Within this div, we are in an Angular app where ODS-Widgets tags will run -->
    {{ "hello" + "from" + "angular!"}}
  </div>
</body>
```

Some specific widgets can rely on specific "heavy" libraries (such as Highcharts, Leaflet...);
in that case, they are lazily-loaded from a CDN when the widget initializes itself, with no necessary work on your part.

The bare minimum for an HTML page is this template:
```html
<!DOCTYPE html>
<html>
    <head>
        <title>ODS Widgets Sandbox</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
        <link rel="stylesheet" href="//static.opendatasoft.com/ods-widgets/latest-v2/ods-widgets.min.css">
    </head>
    <body>

        <div ng-cloak ng-app="ods-widgets">

            <!-- YOUR CODE HERE -->

        </div>

        <script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.7.0/jquery.min.js"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/angular.js/1.8.2/angular.min.js"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/angular-sanitize/1.8.2/angular-sanitize.min.js"></script>
        <script type="text/javascript" src="//static.opendatasoft.com/ods-widgets/latest-v2/ods-widgets.min.js"></script>
    </body>
</html>
```
Some features like URL synchronization and translations will require additional configuration. [You'll find more information
in our Cookbook.](https://github.com/opendatasoft/ods-cookbook/tree/master/widgets/external-use)

### Available API and data sources
Currently, ODS-Widgets only works with an API from an Opendatasoft domain, or any API
that exposes the same interface and returns the same JSON result.

This project originates from Opendatasoft codebase, and as such obviously works
closely with our own interfaces; however, we are looking to make this framework work
with more APIs and services (and thankfully, AngularJS can make it easier), for example by
implementing more AngularJS services as sources, beside our ODSAPI service.
If you have an API that exposes structured data in a way that looks
like our widgets could display it, and you want to try to make it work with it,
you can contact us.

### License
This software library is licensed under the MIT license.

### Contact
If you have questions, you can contact us on Twitter (@opendatasoft) or simply open a GitHub issue.
