/*jslint browser: true, eqeqeq: true, bitwise: true, newcap: true, immed: true, regexp: false */

/**
LazyLoad makes it easy and painless to lazily load one or more external
JavaScript or CSS files on demand either during or after the rendering of a web
page.

Supported browsers include Firefox 2+, IE6+, Safari 3+ (including Mobile
Safari), Google Chrome, and Opera 9+. Other browsers may or may not work and
are not officially supported.

Visit https://github.com/rgrove/lazyload/ for more info.

Copyright (c) 2011 Ryan Grove <ryan@wonko.com>
All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

@module lazyload
@class LazyLoad
@static
*/

LazyLoad = (function (doc) {
  // -- Private Variables ------------------------------------------------------

  // User agent and feature test information.
  var env,

  // Reference to the <head> element (populated lazily).
  head,

  // Requests currently in progress, if any.
  pending = {},

  // Number of times we've polled to check whether a pending stylesheet has
  // finished loading. If this gets too high, we're probably stalled.
  pollCount = 0,

  // Queued requests.
  queue = {css: [], js: []},

  // Reference to the browser's list of stylesheets.
  styleSheets = doc.styleSheets;

  // -- Private Methods --------------------------------------------------------

  /**
  Creates and returns an HTML element with the specified name and attributes.

  @method createNode
  @param {String} name element name
  @param {Object} attrs name/value mapping of element attributes
  @return {HTMLElement}
  @private
  */
  function createNode(name, attrs) {
    var node = doc.createElement(name), attr;

    for (attr in attrs) {
      if (attrs.hasOwnProperty(attr)) {
        node.setAttribute(attr, attrs[attr]);
      }
    }

    return node;
  }

  /**
  Called when the current pending resource of the specified type has finished
  loading. Executes the associated callback (if any) and loads the next
  resource in the queue.

  @method finish
  @param {String} type resource type ('css' or 'js')
  @private
  */
  function finish(type) {
    var p = pending[type],
        callback,
        urls;

    if (p) {
      callback = p.callback;
      urls     = p.urls;

      urls.shift();
      pollCount = 0;

      // If this is the last of the pending URLs, execute the callback and
      // start the next request in the queue (if any).
      if (!urls.length) {
        callback && callback.call(p.context, p.obj);
        pending[type] = null;
        queue[type].length && load(type);
      }
    }
  }

  /**
  Populates the <code>env</code> variable with user agent and feature test
  information.

  @method getEnv
  @private
  */
  function getEnv() {
    var ua = navigator.userAgent;

    env = {
      // True if this browser supports disabling async mode on dynamically
      // created script nodes. See
      // http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order
      async: doc.createElement('script').async === true
    };

    (env.webkit = /AppleWebKit\//.test(ua))
      || (env.ie = /MSIE|Trident/.test(ua))
      || (env.opera = /Opera/.test(ua))
      || (env.gecko = /Gecko\//.test(ua))
      || (env.unknown = true);
  }

  /**
  Loads the specified resources, or the next resource of the specified type
  in the queue if no resources are specified. If a resource of the specified
  type is already being loaded, the new request will be queued until the
  first request has been finished.

  When an array of resource URLs is specified, those URLs will be loaded in
  parallel if it is possible to do so while preserving execution order. All
  browsers support parallel loading of CSS, but only Firefox and Opera
  support parallel loading of scripts. In other browsers, scripts will be
  queued and loaded one at a time to ensure correct execution order.

  @method load
  @param {String} type resource type ('css' or 'js')
  @param {String|Array} urls (optional) URL or array of URLs to load
  @param {Function} callback (optional) callback function to execute when the
    resource is loaded
  @param {Object} obj (optional) object to pass to the callback function
  @param {Object} context (optional) if provided, the callback function will
    be executed in this object's context
  @private
  */
  function load(type, urls, callback, obj, context) {
    var _finish = function () { finish(type); },
        isCSS   = type === 'css',
        nodes   = [],
        i, len, node, p, pendingUrls, url;

    env || getEnv();

    if (urls) {
      // If urls is a string, wrap it in an array. Otherwise assume it's an
      // array and create a copy of it so modifications won't be made to the
      // original.
      urls = typeof urls === 'string' ? [urls] : urls.concat();

      // Create a request object for each URL. If multiple URLs are specified,
      // the callback will only be executed after all URLs have been loaded.
      //
      // Sadly, Firefox and Opera are the only browsers capable of loading
      // scripts in parallel while preserving execution order. In all other
      // browsers, scripts must be loaded sequentially.
      //
      // All browsers respect CSS specificity based on the order of the link
      // elements in the DOM, regardless of the order in which the stylesheets
      // are actually downloaded.
      if (isCSS || env.async || env.gecko || env.opera) {
        // Load in parallel.
        queue[type].push({
          urls    : urls,
          callback: callback,
          obj     : obj,
          context : context
        });
      } else {
        // Load sequentially.
        for (i = 0, len = urls.length; i < len; ++i) {
          queue[type].push({
            urls    : [urls[i]],
            callback: i === len - 1 ? callback : null, // callback is only added to the last URL
            obj     : obj,
            context : context
          });
        }
      }
    }

    // If a previous load request of this type is currently in progress, we'll
    // wait our turn. Otherwise, grab the next item in the queue.
    if (pending[type] || !(p = pending[type] = queue[type].shift())) {
      return;
    }

    head || (head = doc.head || doc.getElementsByTagName('head')[0]);
    pendingUrls = p.urls.concat();

    for (i = 0, len = pendingUrls.length; i < len; ++i) {
      url = pendingUrls[i];

      if (isCSS) {
          node = env.gecko ? createNode('style') : createNode('link', {
            href: url,
            rel : 'stylesheet'
          });
      } else {
        node = createNode('script', {src: url});
        node.async = false;
      }

      node.className = 'lazyload';
      node.setAttribute('charset', 'utf-8');

      if (env.ie && !isCSS && 'onreadystatechange' in node && !('draggable' in node)) {
        node.onreadystatechange = function () {
          if (/loaded|complete/.test(node.readyState)) {
            node.onreadystatechange = null;
            _finish();
          }
        };
      } else if (isCSS && (env.gecko || env.webkit)) {
        // Gecko and WebKit don't support the onload event on link nodes.
        if (env.webkit) {
          // In WebKit, we can poll for changes to document.styleSheets to
          // figure out when stylesheets have loaded.
          p.urls[i] = node.href; // resolve relative URLs (or polling won't work)
          pollWebKit();
        } else {
          // In Gecko, we can import the requested URL into a <style> node and
          // poll for the existence of node.sheet.cssRules. Props to Zach
          // Leatherman for calling my attention to this technique.
          node.innerHTML = '@import "' + url + '";';
          pollGecko(node);
        }
      } else {
        node.onload = node.onerror = _finish;
      }

      nodes.push(node);
    }

    for (i = 0, len = nodes.length; i < len; ++i) {
      head.appendChild(nodes[i]);
    }
  }

  /**
  Begins polling to determine when the specified stylesheet has finished loading
  in Gecko. Polling stops when all pending stylesheets have loaded or after 10
  seconds (to prevent stalls).

  Thanks to Zach Leatherman for calling my attention to the @import-based
  cross-domain technique used here, and to Oleg Slobodskoi for an earlier
  same-domain implementation. See Zach's blog for more details:
  http://www.zachleat.com/web/2010/07/29/load-css-dynamically/

  @method pollGecko
  @param {HTMLElement} node Style node to poll.
  @private
  */
  function pollGecko(node) {
    var hasRules;

    try {
      // We don't really need to store this value or ever refer to it again, but
      // if we don't store it, Closure Compiler assumes the code is useless and
      // removes it.
      hasRules = !!node.sheet.cssRules;
    } catch (ex) {
      // An exception means the stylesheet is still loading.
      pollCount += 1;

      if (pollCount < 200) {
        setTimeout(function () { pollGecko(node); }, 50);
      } else {
        // We've been polling for 10 seconds and nothing's happened. Stop
        // polling and finish the pending requests to avoid blocking further
        // requests.
        hasRules && finish('css');
      }

      return;
    }

    // If we get here, the stylesheet has loaded.
    finish('css');
  }

  /**
  Begins polling to determine when pending stylesheets have finished loading
  in WebKit. Polling stops when all pending stylesheets have loaded or after 10
  seconds (to prevent stalls).

  @method pollWebKit
  @private
  */
  function pollWebKit() {
    var css = pending.css, i;

    if (css) {
      i = styleSheets.length;

      // Look for a stylesheet matching the pending URL.
      while (--i >= 0) {
        if (styleSheets[i].href === css.urls[0]) {
          finish('css');
          break;
        }
      }

      pollCount += 1;

      if (css) {
        if (pollCount < 200) {
          setTimeout(pollWebKit, 50);
        } else {
          // We've been polling for 10 seconds and nothing's happened, which may
          // indicate that the stylesheet has been removed from the document
          // before it had a chance to load. Stop polling and finish the pending
          // request to prevent blocking further requests.
          finish('css');
        }
      }
    }
  }

  return {

    /**
    Requests the specified CSS URL or URLs and executes the specified
    callback (if any) when they have finished loading. If an array of URLs is
    specified, the stylesheets will be loaded in parallel and the callback
    will be executed after all stylesheets have finished loading.

    @method css
    @param {String|Array} urls CSS URL or array of CSS URLs to load
    @param {Function} callback (optional) callback function to execute when
      the specified stylesheets are loaded
    @param {Object} obj (optional) object to pass to the callback function
    @param {Object} context (optional) if provided, the callback function
      will be executed in this object's context
    @static
    */
    css: function (urls, callback, obj, context) {
      load('css', urls, callback, obj, context);
    },

    /**
    Requests the specified JavaScript URL or URLs and executes the specified
    callback (if any) when they have finished loading. If an array of URLs is
    specified and the browser supports it, the scripts will be loaded in
    parallel and the callback will be executed after all scripts have
    finished loading.

    Currently, only Firefox and Opera support parallel loading of scripts while
    preserving execution order. In other browsers, scripts will be
    queued and loaded one at a time to ensure correct execution order.

    @method js
    @param {String|Array} urls JS URL or array of JS URLs to load
    @param {Function} callback (optional) callback function to execute when
      the specified scripts are loaded
    @param {Object} obj (optional) object to pass to the callback function
    @param {Object} context (optional) if provided, the callback function
      will be executed in this object's context
    @static
    */
    js: function (urls, callback, obj, context) {
      load('js', urls, callback, obj, context);
    }

  };
})(this.document);;/* Modernizr 2.7.1 (Custom Build) | MIT & BSD
 * Build: http://modernizr.com/download/#-geolocation-inlinesvg-svg-shiv-cssclasses-load
 */
;



window.Modernizr = (function( window, document, undefined ) {

    var version = '2.7.1',

    Modernizr = {},

    enableClasses = true,

    docElement = document.documentElement,

    mod = 'modernizr',
    modElem = document.createElement(mod),
    mStyle = modElem.style,

    inputElem  ,


    toString = {}.toString,



    ns = {'svg': 'http://www.w3.org/2000/svg'},

    tests = {},
    inputs = {},
    attrs = {},

    classes = [],

    slice = classes.slice,

    featureName,



    _hasOwnProperty = ({}).hasOwnProperty, hasOwnProp;

    if ( !is(_hasOwnProperty, 'undefined') && !is(_hasOwnProperty.call, 'undefined') ) {
      hasOwnProp = function (object, property) {
        return _hasOwnProperty.call(object, property);
      };
    }
    else {
      hasOwnProp = function (object, property) { 
        return ((property in object) && is(object.constructor.prototype[property], 'undefined'));
      };
    }


    if (!Function.prototype.bind) {
      Function.prototype.bind = function bind(that) {

        var target = this;

        if (typeof target != "function") {
            throw new TypeError();
        }

        var args = slice.call(arguments, 1),
            bound = function () {

            if (this instanceof bound) {

              var F = function(){};
              F.prototype = target.prototype;
              var self = new F();

              var result = target.apply(
                  self,
                  args.concat(slice.call(arguments))
              );
              if (Object(result) === result) {
                  return result;
              }
              return self;

            } else {

              return target.apply(
                  that,
                  args.concat(slice.call(arguments))
              );

            }

        };

        return bound;
      };
    }

    function setCss( str ) {
        mStyle.cssText = str;
    }

    function setCssAll( str1, str2 ) {
        return setCss(prefixes.join(str1 + ';') + ( str2 || '' ));
    }

    function is( obj, type ) {
        return typeof obj === type;
    }

    function contains( str, substr ) {
        return !!~('' + str).indexOf(substr);
    }


    function testDOMProps( props, obj, elem ) {
        for ( var i in props ) {
            var item = obj[props[i]];
            if ( item !== undefined) {

                            if (elem === false) return props[i];

                            if (is(item, 'function')){
                                return item.bind(elem || obj);
                }

                            return item;
            }
        }
        return false;
    }



    tests['geolocation'] = function() {
        return 'geolocation' in navigator;
    };


    tests['svg'] = function() {
        return !!document.createElementNS && !!document.createElementNS(ns.svg, 'svg').createSVGRect;
    };

    tests['inlinesvg'] = function() {
      var div = document.createElement('div');
      div.innerHTML = '<svg/>';
      return (div.firstChild && div.firstChild.namespaceURI) == ns.svg;
    };    for ( var feature in tests ) {
        if ( hasOwnProp(tests, feature) ) {
                                    featureName  = feature.toLowerCase();
            Modernizr[featureName] = tests[feature]();

            classes.push((Modernizr[featureName] ? '' : 'no-') + featureName);
        }
    }



     Modernizr.addTest = function ( feature, test ) {
       if ( typeof feature == 'object' ) {
         for ( var key in feature ) {
           if ( hasOwnProp( feature, key ) ) {
             Modernizr.addTest( key, feature[ key ] );
           }
         }
       } else {

         feature = feature.toLowerCase();

         if ( Modernizr[feature] !== undefined ) {
                                              return Modernizr;
         }

         test = typeof test == 'function' ? test() : test;

         if (typeof enableClasses !== "undefined" && enableClasses) {
           docElement.className += ' ' + (test ? '' : 'no-') + feature;
         }
         Modernizr[feature] = test;

       }

       return Modernizr; 
     };


    setCss('');
    modElem = inputElem = null;

    ;(function(window, document) {
                var version = '3.7.0';

            var options = window.html5 || {};

            var reSkip = /^<|^(?:button|map|select|textarea|object|iframe|option|optgroup)$/i;

            var saveClones = /^(?:a|b|code|div|fieldset|h1|h2|h3|h4|h5|h6|i|label|li|ol|p|q|span|strong|style|table|tbody|td|th|tr|ul)$/i;

            var supportsHtml5Styles;

            var expando = '_html5shiv';

            var expanID = 0;

            var expandoData = {};

            var supportsUnknownElements;

        (function() {
          try {
            var a = document.createElement('a');
            a.innerHTML = '<xyz></xyz>';
                    supportsHtml5Styles = ('hidden' in a);

            supportsUnknownElements = a.childNodes.length == 1 || (function() {
                        (document.createElement)('a');
              var frag = document.createDocumentFragment();
              return (
                typeof frag.cloneNode == 'undefined' ||
                typeof frag.createDocumentFragment == 'undefined' ||
                typeof frag.createElement == 'undefined'
              );
            }());
          } catch(e) {
                    supportsHtml5Styles = true;
            supportsUnknownElements = true;
          }

        }());

            function addStyleSheet(ownerDocument, cssText) {
          var p = ownerDocument.createElement('p'),
          parent = ownerDocument.getElementsByTagName('head')[0] || ownerDocument.documentElement;

          p.innerHTML = 'x<style>' + cssText + '</style>';
          return parent.insertBefore(p.lastChild, parent.firstChild);
        }

            function getElements() {
          var elements = html5.elements;
          return typeof elements == 'string' ? elements.split(' ') : elements;
        }

            function getExpandoData(ownerDocument) {
          var data = expandoData[ownerDocument[expando]];
          if (!data) {
            data = {};
            expanID++;
            ownerDocument[expando] = expanID;
            expandoData[expanID] = data;
          }
          return data;
        }

            function createElement(nodeName, ownerDocument, data){
          if (!ownerDocument) {
            ownerDocument = document;
          }
          if(supportsUnknownElements){
            return ownerDocument.createElement(nodeName);
          }
          if (!data) {
            data = getExpandoData(ownerDocument);
          }
          var node;

          if (data.cache[nodeName]) {
            node = data.cache[nodeName].cloneNode();
          } else if (saveClones.test(nodeName)) {
            node = (data.cache[nodeName] = data.createElem(nodeName)).cloneNode();
          } else {
            node = data.createElem(nodeName);
          }

                                                    return node.canHaveChildren && !reSkip.test(nodeName) && !node.tagUrn ? data.frag.appendChild(node) : node;
        }

            function createDocumentFragment(ownerDocument, data){
          if (!ownerDocument) {
            ownerDocument = document;
          }
          if(supportsUnknownElements){
            return ownerDocument.createDocumentFragment();
          }
          data = data || getExpandoData(ownerDocument);
          var clone = data.frag.cloneNode(),
          i = 0,
          elems = getElements(),
          l = elems.length;
          for(;i<l;i++){
            clone.createElement(elems[i]);
          }
          return clone;
        }

            function shivMethods(ownerDocument, data) {
          if (!data.cache) {
            data.cache = {};
            data.createElem = ownerDocument.createElement;
            data.createFrag = ownerDocument.createDocumentFragment;
            data.frag = data.createFrag();
          }


          ownerDocument.createElement = function(nodeName) {
                    if (!html5.shivMethods) {
              return data.createElem(nodeName);
            }
            return createElement(nodeName, ownerDocument, data);
          };

          ownerDocument.createDocumentFragment = Function('h,f', 'return function(){' +
                                                          'var n=f.cloneNode(),c=n.createElement;' +
                                                          'h.shivMethods&&(' +
                                                                                                                getElements().join().replace(/[\w\-]+/g, function(nodeName) {
            data.createElem(nodeName);
            data.frag.createElement(nodeName);
            return 'c("' + nodeName + '")';
          }) +
            ');return n}'
                                                         )(html5, data.frag);
        }

            function shivDocument(ownerDocument) {
          if (!ownerDocument) {
            ownerDocument = document;
          }
          var data = getExpandoData(ownerDocument);

          if (html5.shivCSS && !supportsHtml5Styles && !data.hasCSS) {
            data.hasCSS = !!addStyleSheet(ownerDocument,
                                                                                'article,aside,dialog,figcaption,figure,footer,header,hgroup,main,nav,section{display:block}' +
                                                                                    'mark{background:#FF0;color:#000}' +
                                                                                    'template{display:none}'
                                         );
          }
          if (!supportsUnknownElements) {
            shivMethods(ownerDocument, data);
          }
          return ownerDocument;
        }

            var html5 = {

                'elements': options.elements || 'abbr article aside audio bdi canvas data datalist details dialog figcaption figure footer header hgroup main mark meter nav output progress section summary template time video',

                'version': version,

                'shivCSS': (options.shivCSS !== false),

                'supportsUnknownElements': supportsUnknownElements,

                'shivMethods': (options.shivMethods !== false),

                'type': 'default',

                'shivDocument': shivDocument,

                createElement: createElement,

                createDocumentFragment: createDocumentFragment
        };

            window.html5 = html5;

            shivDocument(document);

    }(this, document));

    Modernizr._version      = version;

    docElement.className = docElement.className.replace(/(^|\s)no-js(\s|$)/, '$1$2') +

                                                    (enableClasses ? ' js ' + classes.join(' ') : '');

    return Modernizr;

})(this, this.document);
/*yepnope1.5.4|WTFPL*/
(function(a,b,c){function d(a){return"[object Function]"==o.call(a)}function e(a){return"string"==typeof a}function f(){}function g(a){return!a||"loaded"==a||"complete"==a||"uninitialized"==a}function h(){var a=p.shift();q=1,a?a.t?m(function(){("c"==a.t?B.injectCss:B.injectJs)(a.s,0,a.a,a.x,a.e,1)},0):(a(),h()):q=0}function i(a,c,d,e,f,i,j){function k(b){if(!o&&g(l.readyState)&&(u.r=o=1,!q&&h(),l.onload=l.onreadystatechange=null,b)){"img"!=a&&m(function(){t.removeChild(l)},50);for(var d in y[c])y[c].hasOwnProperty(d)&&y[c][d].onload()}}var j=j||B.errorTimeout,l=b.createElement(a),o=0,r=0,u={t:d,s:c,e:f,a:i,x:j};1===y[c]&&(r=1,y[c]=[]),"object"==a?l.data=c:(l.src=c,l.type=a),l.width=l.height="0",l.onerror=l.onload=l.onreadystatechange=function(){k.call(this,r)},p.splice(e,0,u),"img"!=a&&(r||2===y[c]?(t.insertBefore(l,s?null:n),m(k,j)):y[c].push(l))}function j(a,b,c,d,f){return q=0,b=b||"j",e(a)?i("c"==b?v:u,a,b,this.i++,c,d,f):(p.splice(this.i++,0,a),1==p.length&&h()),this}function k(){var a=B;return a.loader={load:j,i:0},a}var l=b.documentElement,m=a.setTimeout,n=b.getElementsByTagName("script")[0],o={}.toString,p=[],q=0,r="MozAppearance"in l.style,s=r&&!!b.createRange().compareNode,t=s?l:n.parentNode,l=a.opera&&"[object Opera]"==o.call(a.opera),l=!!b.attachEvent&&!l,u=r?"object":l?"script":"img",v=l?"script":u,w=Array.isArray||function(a){return"[object Array]"==o.call(a)},x=[],y={},z={timeout:function(a,b){return b.length&&(a.timeout=b[0]),a}},A,B;B=function(a){function b(a){var a=a.split("!"),b=x.length,c=a.pop(),d=a.length,c={url:c,origUrl:c,prefixes:a},e,f,g;for(f=0;f<d;f++)g=a[f].split("="),(e=z[g.shift()])&&(c=e(c,g));for(f=0;f<b;f++)c=x[f](c);return c}function g(a,e,f,g,h){var i=b(a),j=i.autoCallback;i.url.split(".").pop().split("?").shift(),i.bypass||(e&&(e=d(e)?e:e[a]||e[g]||e[a.split("/").pop().split("?")[0]]),i.instead?i.instead(a,e,f,g,h):(y[i.url]?i.noexec=!0:y[i.url]=1,f.load(i.url,i.forceCSS||!i.forceJS&&"css"==i.url.split(".").pop().split("?").shift()?"c":c,i.noexec,i.attrs,i.timeout),(d(e)||d(j))&&f.load(function(){k(),e&&e(i.origUrl,h,g),j&&j(i.origUrl,h,g),y[i.url]=2})))}function h(a,b){function c(a,c){if(a){if(e(a))c||(j=function(){var a=[].slice.call(arguments);k.apply(this,a),l()}),g(a,j,b,0,h);else if(Object(a)===a)for(n in m=function(){var b=0,c;for(c in a)a.hasOwnProperty(c)&&b++;return b}(),a)a.hasOwnProperty(n)&&(!c&&!--m&&(d(j)?j=function(){var a=[].slice.call(arguments);k.apply(this,a),l()}:j[n]=function(a){return function(){var b=[].slice.call(arguments);a&&a.apply(this,b),l()}}(k[n])),g(a[n],j,b,n,h))}else!c&&l()}var h=!!a.test,i=a.load||a.both,j=a.callback||f,k=j,l=a.complete||f,m,n;c(h?a.yep:a.nope,!!i),i&&c(i)}var i,j,l=this.yepnope.loader;if(e(a))g(a,0,l,0);else if(w(a))for(i=0;i<a.length;i++)j=a[i],e(j)?g(j,0,l,0):w(j)?B(j):Object(j)===j&&h(j,l);else Object(a)===a&&h(a,l)},B.addPrefix=function(a,b){z[a]=b},B.addFilter=function(a){x.push(a)},B.errorTimeout=1e4,null==b.readyState&&b.addEventListener&&(b.readyState="loading",b.addEventListener("DOMContentLoaded",A=function(){b.removeEventListener("DOMContentLoaded",A,0),b.readyState="complete"},0)),a.yepnope=k(),a.yepnope.executeStack=h,a.yepnope.injectJs=function(a,c,d,e,i,j){var k=b.createElement("script"),l,o,e=e||B.errorTimeout;k.src=a;for(o in d)k.setAttribute(o,d[o]);c=j?h:c||f,k.onreadystatechange=k.onload=function(){!l&&g(k.readyState)&&(l=1,c(),k.onload=k.onreadystatechange=null)},m(function(){l||(l=1,c(1))},e),i?k.onload():n.parentNode.insertBefore(k,n)},a.yepnope.injectCss=function(a,c,d,e,g,i){var e=b.createElement("link"),j,c=i?h:c||f;e.href=a,e.rel="stylesheet",e.type="text/css";for(j in d)e.setAttribute(j,d[j]);g||(n.parentNode.insertBefore(e,n),m(c,0))}})(this,document);
Modernizr.load=function(){yepnope.apply(window,[].slice.call(arguments,0));};
;;//! moment.js
//! version : 2.7.0
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

(function (undefined) {

    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = "2.7.0",
        // the global-scope this is NOT the global object in Node.js
        globalScope = typeof global !== 'undefined' ? global : this,
        oldGlobalMoment,
        round = Math.round,
        i,

        YEAR = 0,
        MONTH = 1,
        DATE = 2,
        HOUR = 3,
        MINUTE = 4,
        SECOND = 5,
        MILLISECOND = 6,

        // internal storage for language config files
        languages = {},

        // moment internal properties
        momentProperties = {
            _isAMomentObject: null,
            _i : null,
            _f : null,
            _l : null,
            _strict : null,
            _tzm : null,
            _isUTC : null,
            _offset : null,  // optional. Combine with _isUTC
            _pf : null,
            _lang : null  // optional
        },

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module.exports),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        aspNetTimeSpanJsonRegex = /(\-)?(?:(\d*)\.)?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?)?/,

        // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
        // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
        isoDurationRegex = /^(-)?P(?:(?:([0-9,.]*)Y)?(?:([0-9,.]*)M)?(?:([0-9,.]*)D)?(?:T(?:([0-9,.]*)H)?(?:([0-9,.]*)M)?(?:([0-9,.]*)S)?)?|([0-9,.]*)W)$/,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Q|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|mm?|ss?|S{1,4}|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenOneToFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenOneToSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenDigits = /\d+/, // nonzero number of digits
        parseTokenWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i, // any word (or two) characters or numbers including two/three word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/gi, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO separator)
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123
        parseTokenOrdinal = /\d{1,2}/,

        //strict parsing regexes
        parseTokenOneDigit = /\d/, // 0 - 9
        parseTokenTwoDigits = /\d\d/, // 00 - 99
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{4}/, // 0000 - 9999
        parseTokenSixDigits = /[+-]?\d{6}/, // -999,999 - 999,999
        parseTokenSignedNumber = /[+-]?\d+/, // -inf - inf

        // iso 8601 regex
        // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
        isoRegex = /^\s*(?:[+-]\d{6}|\d{4})-(?:(\d\d-\d\d)|(W\d\d$)|(W\d\d-\d)|(\d\d\d))((T| )(\d\d(:\d\d(:\d\d(\.\d+)?)?)?)?([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,

        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        isoDates = [
            ['YYYYYY-MM-DD', /[+-]\d{6}-\d{2}-\d{2}/],
            ['YYYY-MM-DD', /\d{4}-\d{2}-\d{2}/],
            ['GGGG-[W]WW-E', /\d{4}-W\d{2}-\d/],
            ['GGGG-[W]WW', /\d{4}-W\d{2}/],
            ['YYYY-DDD', /\d{4}-\d{3}/]
        ],

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.SSSS', /(T| )\d\d:\d\d:\d\d\.\d+/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker "+10:00" > ["10", "00"] or "-1530" > ["-15", "30"]
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        unitAliases = {
            ms : 'millisecond',
            s : 'second',
            m : 'minute',
            h : 'hour',
            d : 'day',
            D : 'date',
            w : 'week',
            W : 'isoWeek',
            M : 'month',
            Q : 'quarter',
            y : 'year',
            DDD : 'dayOfYear',
            e : 'weekday',
            E : 'isoWeekday',
            gg: 'weekYear',
            GG: 'isoWeekYear'
        },

        camelFunctions = {
            dayofyear : 'dayOfYear',
            isoweekday : 'isoWeekday',
            isoweek : 'isoWeek',
            weekyear : 'weekYear',
            isoweekyear : 'isoWeekYear'
        },

        // format function strings
        formatFunctions = {},

        // default relative time thresholds
        relativeTimeThresholds = {
            s: 45,  // seconds to minute
            m: 45,  // minutes to hour
            h: 22,  // hours to day
            d: 26,  // days to month
            M: 11   // months to year
        },

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.lang().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.lang().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.lang().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.lang().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.lang().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            YYYYYY : function () {
                var y = this.year(), sign = y >= 0 ? '+' : '-';
                return sign + leftZeroFill(Math.abs(y), 6);
            },
            gg   : function () {
                return leftZeroFill(this.weekYear() % 100, 2);
            },
            gggg : function () {
                return leftZeroFill(this.weekYear(), 4);
            },
            ggggg : function () {
                return leftZeroFill(this.weekYear(), 5);
            },
            GG   : function () {
                return leftZeroFill(this.isoWeekYear() % 100, 2);
            },
            GGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 4);
            },
            GGGGG : function () {
                return leftZeroFill(this.isoWeekYear(), 5);
            },
            e : function () {
                return this.weekday();
            },
            E : function () {
                return this.isoWeekday();
            },
            a    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return toInt(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(toInt(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            SSSS : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(toInt(a / 60), 2) + ":" + leftZeroFill(toInt(a) % 60, 2);
            },
            ZZ   : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(toInt(a / 60), 2) + leftZeroFill(toInt(a) % 60, 2);
            },
            z : function () {
                return this.zoneAbbr();
            },
            zz : function () {
                return this.zoneName();
            },
            X    : function () {
                return this.unix();
            },
            Q : function () {
                return this.quarter();
            }
        },

        lists = ['months', 'monthsShort', 'weekdays', 'weekdaysShort', 'weekdaysMin'];

    // Pick the first defined of two or three arguments. dfl comes from
    // default.
    function dfl(a, b, c) {
        switch (arguments.length) {
            case 2: return a != null ? a : b;
            case 3: return a != null ? a : b != null ? b : c;
            default: throw new Error("Implement me");
        }
    }

    function defaultParsingFlags() {
        // We need to deep clone this object, and es5 standard is not very
        // helpful.
        return {
            empty : false,
            unusedTokens : [],
            unusedInput : [],
            overflow : -2,
            charsLeftOver : 0,
            nullInput : false,
            invalidMonth : null,
            invalidFormat : false,
            userInvalidated : false,
            iso: false
        };
    }

    function deprecate(msg, fn) {
        var firstTime = true;
        function printMsg() {
            if (moment.suppressDeprecationWarnings === false &&
                    typeof console !== 'undefined' && console.warn) {
                console.warn("Deprecation warning: " + msg);
            }
        }
        return extend(function () {
            if (firstTime) {
                printMsg();
                firstTime = false;
            }
            return fn.apply(this, arguments);
        }, fn);
    }

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func, period) {
        return function (a) {
            return this.lang().ordinal(func.call(this, a), period);
        };
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i], i);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    /************************************
        Constructors
    ************************************/

    function Language() {

    }

    // Moment prototype object
    function Moment(config) {
        checkOverflow(config);
        extend(this, config);
    }

    // Duration Constructor
    function Duration(duration) {
        var normalizedInput = normalizeObjectUnits(duration),
            years = normalizedInput.year || 0,
            quarters = normalizedInput.quarter || 0,
            months = normalizedInput.month || 0,
            weeks = normalizedInput.week || 0,
            days = normalizedInput.day || 0,
            hours = normalizedInput.hour || 0,
            minutes = normalizedInput.minute || 0,
            seconds = normalizedInput.second || 0,
            milliseconds = normalizedInput.millisecond || 0;

        // representation for dateAddRemove
        this._milliseconds = +milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = +days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = +months +
            quarters * 3 +
            years * 12;

        this._data = {};

        this._bubble();
    }

    /************************************
        Helpers
    ************************************/


    function extend(a, b) {
        for (var i in b) {
            if (b.hasOwnProperty(i)) {
                a[i] = b[i];
            }
        }

        if (b.hasOwnProperty("toString")) {
            a.toString = b.toString;
        }

        if (b.hasOwnProperty("valueOf")) {
            a.valueOf = b.valueOf;
        }

        return a;
    }

    function cloneMoment(m) {
        var result = {}, i;
        for (i in m) {
            if (m.hasOwnProperty(i) && momentProperties.hasOwnProperty(i)) {
                result[i] = m[i];
            }
        }

        return result;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength, forceSign) {
        var output = '' + Math.abs(number),
            sign = number >= 0;

        while (output.length < targetLength) {
            output = '0' + output;
        }
        return (sign ? (forceSign ? '+' : '') : '-') + output;
    }

    function positiveMomentsDifference(base, other) {
        var res = {milliseconds: 0, months: 0};

        res.months = other.month() - base.month() +
            (other.year() - base.year()) * 12;
        if (base.clone().add(res.months, 'M').isAfter(other)) {
            --res.months;
        }

        res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

        return res;
    }

    function momentsDifference(base, other) {
        var res;
        other = makeAs(other, base);
        if (base.isBefore(other)) {
            res = positiveMomentsDifference(base, other);
        } else {
            res = positiveMomentsDifference(other, base);
            res.milliseconds = -res.milliseconds;
            res.months = -res.months;
        }

        return res;
    }

    // helper function for _.addTime and _.subtractTime
    function addOrSubtractDurationFromMoment(mom, duration, isAdding, updateOffset) {
        var milliseconds = duration._milliseconds,
            days = duration._days,
            months = duration._months;
        updateOffset = updateOffset == null ? true : updateOffset;

        if (milliseconds) {
            mom._d.setTime(+mom._d + milliseconds * isAdding);
        }
        if (days) {
            rawSetter(mom, 'Date', rawGetter(mom, 'Date') + days * isAdding);
        }
        if (months) {
            rawMonthSetter(mom, rawGetter(mom, 'Month') + months * isAdding);
        }
        if (updateOffset) {
            moment.updateOffset(mom, days || months);
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    function isDate(input) {
        return Object.prototype.toString.call(input) === '[object Date]' ||
            input instanceof Date;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if ((dontConvert && array1[i] !== array2[i]) ||
                (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }

    function normalizeUnits(units) {
        if (units) {
            var lowered = units.toLowerCase().replace(/(.)s$/, '$1');
            units = unitAliases[units] || camelFunctions[lowered] || lowered;
        }
        return units;
    }

    function normalizeObjectUnits(inputObject) {
        var normalizedInput = {},
            normalizedProp,
            prop;

        for (prop in inputObject) {
            if (inputObject.hasOwnProperty(prop)) {
                normalizedProp = normalizeUnits(prop);
                if (normalizedProp) {
                    normalizedInput[normalizedProp] = inputObject[prop];
                }
            }
        }

        return normalizedInput;
    }

    function makeList(field) {
        var count, setter;

        if (field.indexOf('week') === 0) {
            count = 7;
            setter = 'day';
        }
        else if (field.indexOf('month') === 0) {
            count = 12;
            setter = 'month';
        }
        else {
            return;
        }

        moment[field] = function (format, index) {
            var i, getter,
                method = moment.fn._lang[field],
                results = [];

            if (typeof format === 'number') {
                index = format;
                format = undefined;
            }

            getter = function (i) {
                var m = moment().utc().set(setter, i);
                return method.call(moment.fn._lang, m, format || '');
            };

            if (index != null) {
                return getter(index);
            }
            else {
                for (i = 0; i < count; i++) {
                    results.push(getter(i));
                }
                return results;
            }
        };
    }

    function toInt(argumentForCoercion) {
        var coercedNumber = +argumentForCoercion,
            value = 0;

        if (coercedNumber !== 0 && isFinite(coercedNumber)) {
            if (coercedNumber >= 0) {
                value = Math.floor(coercedNumber);
            } else {
                value = Math.ceil(coercedNumber);
            }
        }

        return value;
    }

    function daysInMonth(year, month) {
        return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    function weeksInYear(year, dow, doy) {
        return weekOfYear(moment([year, 11, 31 + dow - doy]), dow, doy).week;
    }

    function daysInYear(year) {
        return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    function checkOverflow(m) {
        var overflow;
        if (m._a && m._pf.overflow === -2) {
            overflow =
                m._a[MONTH] < 0 || m._a[MONTH] > 11 ? MONTH :
                m._a[DATE] < 1 || m._a[DATE] > daysInMonth(m._a[YEAR], m._a[MONTH]) ? DATE :
                m._a[HOUR] < 0 || m._a[HOUR] > 23 ? HOUR :
                m._a[MINUTE] < 0 || m._a[MINUTE] > 59 ? MINUTE :
                m._a[SECOND] < 0 || m._a[SECOND] > 59 ? SECOND :
                m._a[MILLISECOND] < 0 || m._a[MILLISECOND] > 999 ? MILLISECOND :
                -1;

            if (m._pf._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
                overflow = DATE;
            }

            m._pf.overflow = overflow;
        }
    }

    function isValid(m) {
        if (m._isValid == null) {
            m._isValid = !isNaN(m._d.getTime()) &&
                m._pf.overflow < 0 &&
                !m._pf.empty &&
                !m._pf.invalidMonth &&
                !m._pf.nullInput &&
                !m._pf.invalidFormat &&
                !m._pf.userInvalidated;

            if (m._strict) {
                m._isValid = m._isValid &&
                    m._pf.charsLeftOver === 0 &&
                    m._pf.unusedTokens.length === 0;
            }
        }
        return m._isValid;
    }

    function normalizeLanguage(key) {
        return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function makeAs(input, model) {
        return model._isUTC ? moment(input).zone(model._offset || 0) :
            moment(input).local();
    }

    /************************************
        Languages
    ************************************/


    extend(Language.prototype, {

        set : function (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (typeof prop === 'function') {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
        },

        _months : "January_February_March_April_May_June_July_August_September_October_November_December".split("_"),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName) {
            var i, mom, regex;

            if (!this._monthsParse) {
                this._monthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                if (!this._monthsParse[i]) {
                    mom = moment.utc([2000, i]);
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        },

        _weekdays : "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : "Su_Mo_Tu_We_Th_Fr_Sa".split("_"),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        weekdaysParse : function (weekdayName) {
            var i, mom, regex;

            if (!this._weekdaysParse) {
                this._weekdaysParse = [];
            }

            for (i = 0; i < 7; i++) {
                // make the regex if we don't have it already
                if (!this._weekdaysParse[i]) {
                    mom = moment([2000, 1]).day(i);
                    regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
                    this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._weekdaysParse[i].test(weekdayName)) {
                    return i;
                }
            }
        },

        _longDateFormat : {
            LT : "h:mm A",
            L : "MM/DD/YYYY",
            LL : "MMMM D YYYY",
            LLL : "MMMM D YYYY LT",
            LLLL : "dddd, MMMM D YYYY LT"
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        isPM : function (input) {
            // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
            // Using charAt should be more compatible.
            return ((input + '').toLowerCase().charAt(0) === 'p');
        },

        _meridiemParse : /[ap]\.?m?\.?/i,
        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },

        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[Last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom) : output;
        },

        _relativeTime : {
            future : "in %s",
            past : "%s ago",
            s : "a few seconds",
            m : "a minute",
            mm : "%d minutes",
            h : "an hour",
            hh : "%d hours",
            d : "a day",
            dd : "%d days",
            M : "a month",
            MM : "%d months",
            y : "a year",
            yy : "%d years"
        },

        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },

        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace("%d", number);
        },
        _ordinal : "%d",

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy).week;
        },

        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        },

        _invalidDate: 'Invalid date',
        invalidDate: function () {
            return this._invalidDate;
        }
    });

    // Loads a language definition into the `languages` cache.  The function
    // takes a key and optionally values.  If not in the browser and no values
    // are provided, it will load the language file module.  As a convenience,
    // this function also returns the language values.
    function loadLang(key, values) {
        values.abbr = key;
        if (!languages[key]) {
            languages[key] = new Language();
        }
        languages[key].set(values);
        return languages[key];
    }

    // Remove a language from the `languages` cache. Mostly useful in tests.
    function unloadLang(key) {
        delete languages[key];
    }

    // Determines which language definition to use and returns it.
    //
    // With no parameters, it will return the global language.  If you
    // pass in a language key, such as 'en', it will return the
    // definition for 'en', so long as 'en' has already been loaded using
    // moment.lang.
    function getLangDefinition(key) {
        var i = 0, j, lang, next, split,
            get = function (k) {
                if (!languages[k] && hasModule) {
                    try {
                        require('./lang/' + k);
                    } catch (e) { }
                }
                return languages[k];
            };

        if (!key) {
            return moment.fn._lang;
        }

        if (!isArray(key)) {
            //short-circuit everything else
            lang = get(key);
            if (lang) {
                return lang;
            }
            key = [key];
        }

        //pick the language from the array
        //try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
        //substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
        while (i < key.length) {
            split = normalizeLanguage(key[i]).split('-');
            j = split.length;
            next = normalizeLanguage(key[i + 1]);
            next = next ? next.split('-') : null;
            while (j > 0) {
                lang = get(split.slice(0, j).join('-'));
                if (lang) {
                    return lang;
                }
                if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
                    //the next array item is better than a shallower substring of this one
                    break;
                }
                j--;
            }
            i++;
        }
        return moment.fn._lang;
    }

    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[[\s\S]/)) {
            return input.replace(/^\[|\]$/g, "");
        }
        return input.replace(/\\/g, "");
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = "";
            for (i = 0; i < length; i++) {
                output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {

        if (!m.isValid()) {
            return m.lang().invalidDate();
        }

        format = expandFormat(format, m.lang());

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }

    function expandFormat(format, lang) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return lang.longDateFormat(input) || input;
        }

        localFormattingTokens.lastIndex = 0;
        while (i >= 0 && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
            localFormattingTokens.lastIndex = 0;
            i -= 1;
        }

        return format;
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token, config) {
        var a, strict = config._strict;
        switch (token) {
        case 'Q':
            return parseTokenOneDigit;
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
        case 'GGGG':
        case 'gggg':
            return strict ? parseTokenFourDigits : parseTokenOneToFourDigits;
        case 'Y':
        case 'G':
        case 'g':
            return parseTokenSignedNumber;
        case 'YYYYYY':
        case 'YYYYY':
        case 'GGGGG':
        case 'ggggg':
            return strict ? parseTokenSixDigits : parseTokenOneToSixDigits;
        case 'S':
            if (strict) {
                return parseTokenOneDigit;
            }
            /* falls through */
        case 'SS':
            if (strict) {
                return parseTokenTwoDigits;
            }
            /* falls through */
        case 'SSS':
            if (strict) {
                return parseTokenThreeDigits;
            }
            /* falls through */
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
            return parseTokenWord;
        case 'a':
        case 'A':
            return getLangDefinition(config._l)._meridiemParse;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'SSSS':
            return parseTokenDigits;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'GG':
        case 'gg':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'ww':
        case 'WW':
            return strict ? parseTokenTwoDigits : parseTokenOneOrTwoDigits;
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
        case 'w':
        case 'W':
        case 'e':
        case 'E':
            return parseTokenOneOrTwoDigits;
        case 'Do':
            return parseTokenOrdinal;
        default :
            a = new RegExp(regexpEscape(unescapeFormat(token.replace('\\', '')), "i"));
            return a;
        }
    }

    function timezoneMinutesFromString(string) {
        string = string || "";
        var possibleTzMatches = (string.match(parseTokenTimezone) || []),
            tzChunk = possibleTzMatches[possibleTzMatches.length - 1] || [],
            parts = (tzChunk + '').match(parseTimezoneChunker) || ['-', 0, 0],
            minutes = +(parts[1] * 60) + toInt(parts[2]);

        return parts[0] === '+' ? -minutes : minutes;
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, datePartArray = config._a;

        switch (token) {
        // QUARTER
        case 'Q':
            if (input != null) {
                datePartArray[MONTH] = (toInt(input) - 1) * 3;
            }
            break;
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            if (input != null) {
                datePartArray[MONTH] = toInt(input) - 1;
            }
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = getLangDefinition(config._l).monthsParse(input);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[MONTH] = a;
            } else {
                config._pf.invalidMonth = input;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DD
        case 'DD' :
            if (input != null) {
                datePartArray[DATE] = toInt(input);
            }
            break;
        case 'Do' :
            if (input != null) {
                datePartArray[DATE] = toInt(parseInt(input, 10));
            }
            break;
        // DAY OF YEAR
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                config._dayOfYear = toInt(input);
            }

            break;
        // YEAR
        case 'YY' :
            datePartArray[YEAR] = moment.parseTwoDigitYear(input);
            break;
        case 'YYYY' :
        case 'YYYYY' :
        case 'YYYYYY' :
            datePartArray[YEAR] = toInt(input);
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._isPm = getLangDefinition(config._l).isPM(input);
            break;
        // 24 HOUR
        case 'H' : // fall through to hh
        case 'HH' : // fall through to hh
        case 'h' : // fall through to hh
        case 'hh' :
            datePartArray[HOUR] = toInt(input);
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[MINUTE] = toInt(input);
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[SECOND] = toInt(input);
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
        case 'SSSS' :
            datePartArray[MILLISECOND] = toInt(('0.' + input) * 1000);
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            config._tzm = timezoneMinutesFromString(input);
            break;
        // WEEKDAY - human
        case 'dd':
        case 'ddd':
        case 'dddd':
            a = getLangDefinition(config._l).weekdaysParse(input);
            // if we didn't get a weekday name, mark the date as invalid
            if (a != null) {
                config._w = config._w || {};
                config._w['d'] = a;
            } else {
                config._pf.invalidWeekday = input;
            }
            break;
        // WEEK, WEEK DAY - numeric
        case 'w':
        case 'ww':
        case 'W':
        case 'WW':
        case 'd':
        case 'e':
        case 'E':
            token = token.substr(0, 1);
            /* falls through */
        case 'gggg':
        case 'GGGG':
        case 'GGGGG':
            token = token.substr(0, 2);
            if (input) {
                config._w = config._w || {};
                config._w[token] = toInt(input);
            }
            break;
        case 'gg':
        case 'GG':
            config._w = config._w || {};
            config._w[token] = moment.parseTwoDigitYear(input);
        }
    }

    function dayOfYearFromWeekInfo(config) {
        var w, weekYear, week, weekday, dow, doy, temp, lang;

        w = config._w;
        if (w.GG != null || w.W != null || w.E != null) {
            dow = 1;
            doy = 4;

            // TODO: We need to take the current isoWeekYear, but that depends on
            // how we interpret now (local, utc, fixed offset). So create
            // a now version of current config (take local/utc/offset flags, and
            // create now).
            weekYear = dfl(w.GG, config._a[YEAR], weekOfYear(moment(), 1, 4).year);
            week = dfl(w.W, 1);
            weekday = dfl(w.E, 1);
        } else {
            lang = getLangDefinition(config._l);
            dow = lang._week.dow;
            doy = lang._week.doy;

            weekYear = dfl(w.gg, config._a[YEAR], weekOfYear(moment(), dow, doy).year);
            week = dfl(w.w, 1);

            if (w.d != null) {
                // weekday -- low day numbers are considered next week
                weekday = w.d;
                if (weekday < dow) {
                    ++week;
                }
            } else if (w.e != null) {
                // local weekday -- counting starts from begining of week
                weekday = w.e + dow;
            } else {
                // default to begining of week
                weekday = dow;
            }
        }
        temp = dayOfYearFromWeeks(weekYear, week, weekday, doy, dow);

        config._a[YEAR] = temp.year;
        config._dayOfYear = temp.dayOfYear;
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromConfig(config) {
        var i, date, input = [], currentDate, yearToUse;

        if (config._d) {
            return;
        }

        currentDate = currentDateArray(config);

        //compute day of the year from weeks and weekdays
        if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
            dayOfYearFromWeekInfo(config);
        }

        //if the day of the year is set, figure out what it is
        if (config._dayOfYear) {
            yearToUse = dfl(config._a[YEAR], currentDate[YEAR]);

            if (config._dayOfYear > daysInYear(yearToUse)) {
                config._pf._overflowDayOfYear = true;
            }

            date = makeUTCDate(yearToUse, 0, config._dayOfYear);
            config._a[MONTH] = date.getUTCMonth();
            config._a[DATE] = date.getUTCDate();
        }

        // Default to current date.
        // * if no year, month, day of month are given, default to today
        // * if day of month is given, default month and year
        // * if month is given, default only year
        // * if year is given, don't default anything
        for (i = 0; i < 3 && config._a[i] == null; ++i) {
            config._a[i] = input[i] = currentDate[i];
        }

        // Zero out whatever was not defaulted, including time
        for (; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        config._d = (config._useUTC ? makeUTCDate : makeDate).apply(null, input);
        // Apply timezone offset from input. The actual zone can be changed
        // with parseZone.
        if (config._tzm != null) {
            config._d.setUTCMinutes(config._d.getUTCMinutes() + config._tzm);
        }
    }

    function dateFromObject(config) {
        var normalizedInput;

        if (config._d) {
            return;
        }

        normalizedInput = normalizeObjectUnits(config._i);
        config._a = [
            normalizedInput.year,
            normalizedInput.month,
            normalizedInput.day,
            normalizedInput.hour,
            normalizedInput.minute,
            normalizedInput.second,
            normalizedInput.millisecond
        ];

        dateFromConfig(config);
    }

    function currentDateArray(config) {
        var now = new Date();
        if (config._useUTC) {
            return [
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ];
        } else {
            return [now.getFullYear(), now.getMonth(), now.getDate()];
        }
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {

        if (config._f === moment.ISO_8601) {
            parseISO(config);
            return;
        }

        config._a = [];
        config._pf.empty = true;

        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var lang = getLangDefinition(config._l),
            string = '' + config._i,
            i, parsedInput, tokens, token, skipped,
            stringLength = string.length,
            totalParsedInputLength = 0;

        tokens = expandFormat(config._f, lang).match(formattingTokens) || [];

        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
            if (parsedInput) {
                skipped = string.substr(0, string.indexOf(parsedInput));
                if (skipped.length > 0) {
                    config._pf.unusedInput.push(skipped);
                }
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
                totalParsedInputLength += parsedInput.length;
            }
            // don't parse if it's not a known token
            if (formatTokenFunctions[token]) {
                if (parsedInput) {
                    config._pf.empty = false;
                }
                else {
                    config._pf.unusedTokens.push(token);
                }
                addTimeToArrayFromToken(token, parsedInput, config);
            }
            else if (config._strict && !parsedInput) {
                config._pf.unusedTokens.push(token);
            }
        }

        // add remaining unparsed input length to the string
        config._pf.charsLeftOver = stringLength - totalParsedInputLength;
        if (string.length > 0) {
            config._pf.unusedInput.push(string);
        }

        // handle am pm
        if (config._isPm && config._a[HOUR] < 12) {
            config._a[HOUR] += 12;
        }
        // if is 12 am, change hours to 0
        if (config._isPm === false && config._a[HOUR] === 12) {
            config._a[HOUR] = 0;
        }

        dateFromConfig(config);
        checkOverflow(config);
    }

    function unescapeFormat(s) {
        return s.replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
            return p1 || p2 || p3 || p4;
        });
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function regexpEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            bestMoment,

            scoreToBeat,
            i,
            currentScore;

        if (config._f.length === 0) {
            config._pf.invalidFormat = true;
            config._d = new Date(NaN);
            return;
        }

        for (i = 0; i < config._f.length; i++) {
            currentScore = 0;
            tempConfig = extend({}, config);
            tempConfig._pf = defaultParsingFlags();
            tempConfig._f = config._f[i];
            makeDateFromStringAndFormat(tempConfig);

            if (!isValid(tempConfig)) {
                continue;
            }

            // if there is any input that was not parsed add a penalty for that format
            currentScore += tempConfig._pf.charsLeftOver;

            //or tokens
            currentScore += tempConfig._pf.unusedTokens.length * 10;

            tempConfig._pf.score = currentScore;

            if (scoreToBeat == null || currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempConfig;
            }
        }

        extend(config, bestMoment || tempConfig);
    }

    // date from iso format
    function parseISO(config) {
        var i, l,
            string = config._i,
            match = isoRegex.exec(string);

        if (match) {
            config._pf.iso = true;
            for (i = 0, l = isoDates.length; i < l; i++) {
                if (isoDates[i][1].exec(string)) {
                    // match[5] should be "T" or undefined
                    config._f = isoDates[i][0] + (match[6] || " ");
                    break;
                }
            }
            for (i = 0, l = isoTimes.length; i < l; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (string.match(parseTokenTimezone)) {
                config._f += "Z";
            }
            makeDateFromStringAndFormat(config);
        } else {
            config._isValid = false;
        }
    }

    // date from iso format or fallback
    function makeDateFromString(config) {
        parseISO(config);
        if (config._isValid === false) {
            delete config._isValid;
            moment.createFromInputFallback(config);
        }
    }

    function makeDateFromInput(config) {
        var input = config._i, matched;
        if (input === undefined) {
            config._d = new Date();
        } else if (isDate(input)) {
            config._d = new Date(+input);
        } else if ( (matched = aspNetJsonRegex.exec(input)) !== null ) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = input.slice(0);
            dateFromConfig(config);
        } else if (typeof(input) === 'object') {
            dateFromObject(config);
        } else if (typeof(input) === 'number') {
            // from milliseconds
            config._d = new Date(input);
        } else {
            moment.createFromInputFallback(config);
        }
    }

    function makeDate(y, m, d, h, M, s, ms) {
        //can't just apply() to create a date:
        //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
        var date = new Date(y, m, d, h, M, s, ms);

        //the date constructor doesn't accept years < 1970
        if (y < 1970) {
            date.setFullYear(y);
        }
        return date;
    }

    function makeUTCDate(y) {
        var date = new Date(Date.UTC.apply(null, arguments));
        if (y < 1970) {
            date.setUTCFullYear(y);
        }
        return date;
    }

    function parseWeekday(input, language) {
        if (typeof input === 'string') {
            if (!isNaN(input)) {
                input = parseInt(input, 10);
            }
            else {
                input = language.weekdaysParse(input);
                if (typeof input !== 'number') {
                    return null;
                }
            }
        }
        return input;
    }

    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, lang) {
        return lang.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(posNegDuration, withoutSuffix, lang) {
        var duration = moment.duration(posNegDuration).abs(),
            seconds = round(duration.as('s')),
            minutes = round(duration.as('m')),
            hours = round(duration.as('h')),
            days = round(duration.as('d')),
            months = round(duration.as('M')),
            years = round(duration.as('y')),

            args = seconds < relativeTimeThresholds.s && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < relativeTimeThresholds.m && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < relativeTimeThresholds.h && ['hh', hours] ||
                days === 1 && ['d'] ||
                days < relativeTimeThresholds.d && ['dd', days] ||
                months === 1 && ['M'] ||
                months < relativeTimeThresholds.M && ['MM', months] ||
                years === 1 && ['y'] || ['yy', years];

        args[2] = withoutSuffix;
        args[3] = +posNegDuration > 0;
        args[4] = lang;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day(),
            adjustedMoment;


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        adjustedMoment = moment(mom).add('d', daysToDayOfWeek);
        return {
            week: Math.ceil(adjustedMoment.dayOfYear() / 7),
            year: adjustedMoment.year()
        };
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, firstDayOfWeekOfYear, firstDayOfWeek) {
        var d = makeUTCDate(year, 0, 1).getUTCDay(), daysToAdd, dayOfYear;

        d = d === 0 ? 7 : d;
        weekday = weekday != null ? weekday : firstDayOfWeek;
        daysToAdd = firstDayOfWeek - d + (d > firstDayOfWeekOfYear ? 7 : 0) - (d < firstDayOfWeek ? 7 : 0);
        dayOfYear = 7 * (week - 1) + (weekday - firstDayOfWeek) + daysToAdd + 1;

        return {
            year: dayOfYear > 0 ? year : year - 1,
            dayOfYear: dayOfYear > 0 ?  dayOfYear : daysInYear(year - 1) + dayOfYear
        };
    }

    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f;

        if (input === null || (format === undefined && input === '')) {
            return moment.invalid({nullInput: true});
        }

        if (typeof input === 'string') {
            config._i = input = getLangDefinition().preparse(input);
        }

        if (moment.isMoment(input)) {
            config = cloneMoment(input);

            config._d = new Date(+input._d);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        return new Moment(config);
    }

    moment = function (input, format, lang, strict) {
        var c;

        if (typeof(lang) === "boolean") {
            strict = lang;
            lang = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._i = input;
        c._f = format;
        c._l = lang;
        c._strict = strict;
        c._isUTC = false;
        c._pf = defaultParsingFlags();

        return makeMoment(c);
    };

    moment.suppressDeprecationWarnings = false;

    moment.createFromInputFallback = deprecate(
        "moment construction falls back to js Date. This is " +
        "discouraged and will be removed in upcoming major " +
        "release. Please refer to " +
        "https://github.com/moment/moment/issues/1407 for more info.",
        function (config) {
            config._d = new Date(config._i);
        }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
        var res, i;
        if (moments.length === 1 && isArray(moments[0])) {
            moments = moments[0];
        }
        if (!moments.length) {
            return moment();
        }
        res = moments[0];
        for (i = 1; i < moments.length; ++i) {
            if (moments[i][fn](res)) {
                res = moments[i];
            }
        }
        return res;
    }

    moment.min = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isBefore', args);
    };

    moment.max = function () {
        var args = [].slice.call(arguments, 0);

        return pickBy('isAfter', args);
    };

    // creating with utc
    moment.utc = function (input, format, lang, strict) {
        var c;

        if (typeof(lang) === "boolean") {
            strict = lang;
            lang = undefined;
        }
        // object construction must be done this way.
        // https://github.com/moment/moment/issues/1423
        c = {};
        c._isAMomentObject = true;
        c._useUTC = true;
        c._isUTC = true;
        c._l = lang;
        c._i = input;
        c._f = format;
        c._strict = strict;
        c._pf = defaultParsingFlags();

        return makeMoment(c).utc();
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var duration = input,
            // matching against regexp is expensive, do it on demand
            match = null,
            sign,
            ret,
            parseIso,
            diffRes;

        if (moment.isDuration(input)) {
            duration = {
                ms: input._milliseconds,
                d: input._days,
                M: input._months
            };
        } else if (typeof input === 'number') {
            duration = {};
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        } else if (!!(match = aspNetTimeSpanJsonRegex.exec(input))) {
            sign = (match[1] === "-") ? -1 : 1;
            duration = {
                y: 0,
                d: toInt(match[DATE]) * sign,
                h: toInt(match[HOUR]) * sign,
                m: toInt(match[MINUTE]) * sign,
                s: toInt(match[SECOND]) * sign,
                ms: toInt(match[MILLISECOND]) * sign
            };
        } else if (!!(match = isoDurationRegex.exec(input))) {
            sign = (match[1] === "-") ? -1 : 1;
            parseIso = function (inp) {
                // We'd normally use ~~inp for this, but unfortunately it also
                // converts floats to ints.
                // inp may be undefined, so careful calling replace on it.
                var res = inp && parseFloat(inp.replace(',', '.'));
                // apply sign while we're at it
                return (isNaN(res) ? 0 : res) * sign;
            };
            duration = {
                y: parseIso(match[2]),
                M: parseIso(match[3]),
                d: parseIso(match[4]),
                h: parseIso(match[5]),
                m: parseIso(match[6]),
                s: parseIso(match[7]),
                w: parseIso(match[8])
            };
        } else if (typeof duration === "object" &&
                ("from" in duration || "to" in duration)) {
            diffRes = momentsDifference(moment(duration.from), moment(duration.to));

            duration = {};
            duration.ms = diffRes.milliseconds;
            duration.M = diffRes.months;
        }

        ret = new Duration(duration);

        if (moment.isDuration(input) && input.hasOwnProperty('_lang')) {
            ret._lang = input._lang;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // constant that refers to the ISO standard
    moment.ISO_8601 = function () {};

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    moment.momentProperties = momentProperties;

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    moment.updateOffset = function () {};

    // This function allows you to set a threshold for relative time strings
    moment.relativeTimeThreshold = function (threshold, limit) {
        if (relativeTimeThresholds[threshold] === undefined) {
            return false;
        }
        if (limit === undefined) {
            return relativeTimeThresholds[threshold];
        }
        relativeTimeThresholds[threshold] = limit;
        return true;
    };

    // This function will load languages and then set the global language.  If
    // no arguments are passed in, it will simply return the current global
    // language key.
    moment.lang = function (key, values) {
        var r;
        if (!key) {
            return moment.fn._lang._abbr;
        }
        if (values) {
            loadLang(normalizeLanguage(key), values);
        } else if (values === null) {
            unloadLang(key);
            key = 'en';
        } else if (!languages[key]) {
            getLangDefinition(key);
        }
        r = moment.duration.fn._lang = moment.fn._lang = getLangDefinition(key);
        return r._abbr;
    };

    // returns language data
    moment.langData = function (key) {
        if (key && key._lang && key._lang._abbr) {
            key = key._lang._abbr;
        }
        return getLangDefinition(key);
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment ||
            (obj != null &&  obj.hasOwnProperty('_isAMomentObject'));
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };

    for (i = lists.length - 1; i >= 0; --i) {
        makeList(lists[i]);
    }

    moment.normalizeUnits = function (units) {
        return normalizeUnits(units);
    };

    moment.invalid = function (flags) {
        var m = moment.utc(NaN);
        if (flags != null) {
            extend(m._pf, flags);
        }
        else {
            m._pf.userInvalidated = true;
        }

        return m;
    };

    moment.parseZone = function () {
        return moment.apply(null, arguments).parseZone();
    };

    moment.parseTwoDigitYear = function (input) {
        return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    /************************************
        Moment Prototype
    ************************************/


    extend(moment.fn = Moment.prototype, {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d + ((this._offset || 0) * 60000);
        },

        unix : function () {
            return Math.floor(+this / 1000);
        },

        toString : function () {
            return this.clone().lang('en').format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
        },

        toDate : function () {
            return this._offset ? new Date(+this) : this._d;
        },

        toISOString : function () {
            var m = moment(this).utc();
            if (0 < m.year() && m.year() <= 9999) {
                return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            } else {
                return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
            }
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            return isValid(this);
        },

        isDSTShifted : function () {

            if (this._a) {
                return this.isValid() && compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray()) > 0;
            }

            return false;
        },

        parsingFlags : function () {
            return extend({}, this._pf);
        },

        invalidAt: function () {
            return this._pf.overflow;
        },

        utc : function (keepLocalTime) {
            return this.zone(0, keepLocalTime);
        },

        local : function (keepLocalTime) {
            if (this._isUTC) {
                this.zone(0, keepLocalTime);
                this._isUTC = false;

                if (keepLocalTime) {
                    this.add(this._d.getTimezoneOffset(), 'm');
                }
            }
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.lang().postformat(output);
        },

        add : function (input, val) {
            var dur;
            // switch args to support add('s', 1) and add(1, 's')
            if (typeof input === 'string' && typeof val === 'string') {
                dur = moment.duration(isNaN(+val) ? +input : +val, isNaN(+val) ? val : input);
            } else if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, 1);
            return this;
        },

        subtract : function (input, val) {
            var dur;
            // switch args to support subtract('s', 1) and subtract(1, 's')
            if (typeof input === 'string' && typeof val === 'string') {
                dur = moment.duration(isNaN(+val) ? +input : +val, isNaN(+val) ? val : input);
            } else if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, -1);
            return this;
        },

        diff : function (input, units, asFloat) {
            var that = makeAs(input, this),
                zoneDiff = (this.zone() - that.zone()) * 6e4,
                diff, output;

            units = normalizeUnits(units);

            if (units === 'year' || units === 'month') {
                // average number of days in the months in the given dates
                diff = (this.daysInMonth() + that.daysInMonth()) * 432e5; // 24 * 60 * 60 * 1000 / 2
                // difference in months
                output = ((this.year() - that.year()) * 12) + (this.month() - that.month());
                // adjust by taking difference in days, average number of days
                // and dst in the given months.
                output += ((this - moment(this).startOf('month')) -
                        (that - moment(that).startOf('month'))) / diff;
                // same as above but with zones, to negate all dst
                output -= ((this.zone() - moment(this).startOf('month').zone()) -
                        (that.zone() - moment(that).startOf('month').zone())) * 6e4 / diff;
                if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = (this - that);
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? (diff - zoneDiff) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                    units === 'week' ? (diff - zoneDiff) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration({to: this, from: time}).lang(this.lang()._abbr).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function (time) {
            // We want to compare the start of today, vs this.
            // Getting start-of-today depends on whether we're zone'd or not.
            var now = time || moment(),
                sod = makeAs(now, this).startOf('day'),
                diff = this.diff(sod, 'days', true),
                format = diff < -6 ? 'sameElse' :
                    diff < -1 ? 'lastWeek' :
                    diff < 0 ? 'lastDay' :
                    diff < 1 ? 'sameDay' :
                    diff < 2 ? 'nextDay' :
                    diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.lang().calendar(format, this));
        },

        isLeapYear : function () {
            return isLeapYear(this.year());
        },

        isDST : function () {
            return (this.zone() < this.clone().month(0).zone() ||
                this.zone() < this.clone().month(5).zone());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            if (input != null) {
                input = parseWeekday(input, this.lang());
                return this.add(input - day, 'days');
            } else {
                return day;
            }
        },

        month : makeAccessor('Month', true),

        startOf: function (units) {
            units = normalizeUnits(units);
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (units) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'quarter':
            case 'month':
                this.date(1);
                /* falls through */
            case 'week':
            case 'isoWeek':
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.weekday(0);
            } else if (units === 'isoWeek') {
                this.isoWeekday(1);
            }

            // quarters are also special
            if (units === 'quarter') {
                this.month(Math.floor(this.month() / 3) * 3);
            }

            return this;
        },

        endOf: function (units) {
            units = normalizeUnits(units);
            return this.startOf(units).add((units === 'isoWeek' ? 'week' : units), 1).subtract('ms', 1);
        },

        isAfter: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) > +moment(input).startOf(units);
        },

        isBefore: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) < +moment(input).startOf(units);
        },

        isSame: function (input, units) {
            units = units || 'ms';
            return +this.clone().startOf(units) === +makeAs(input, this).startOf(units);
        },

        min: deprecate(
                 "moment().min is deprecated, use moment.min instead. https://github.com/moment/moment/issues/1548",
                 function (other) {
                     other = moment.apply(null, arguments);
                     return other < this ? this : other;
                 }
         ),

        max: deprecate(
                "moment().max is deprecated, use moment.max instead. https://github.com/moment/moment/issues/1548",
                function (other) {
                    other = moment.apply(null, arguments);
                    return other > this ? this : other;
                }
        ),

        // keepLocalTime = true means only change the timezone, without
        // affecting the local hour. So 5:31:26 +0300 --[zone(2, true)]-->
        // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist int zone
        // +0200, so we adjust the time as needed, to be valid.
        //
        // Keeping the time actually adds/subtracts (one hour)
        // from the actual represented time. That is why we call updateOffset
        // a second time. In case it wants us to change the offset again
        // _changeInProgress == true case, then we have to adjust, because
        // there is no such time in the given timezone.
        zone : function (input, keepLocalTime) {
            var offset = this._offset || 0,
                localAdjust;
            if (input != null) {
                if (typeof input === "string") {
                    input = timezoneMinutesFromString(input);
                }
                if (Math.abs(input) < 16) {
                    input = input * 60;
                }
                if (!this._isUTC && keepLocalTime) {
                    localAdjust = this._d.getTimezoneOffset();
                }
                this._offset = input;
                this._isUTC = true;
                if (localAdjust != null) {
                    this.subtract(localAdjust, 'm');
                }
                if (offset !== input) {
                    if (!keepLocalTime || this._changeInProgress) {
                        addOrSubtractDurationFromMoment(this,
                                moment.duration(offset - input, 'm'), 1, false);
                    } else if (!this._changeInProgress) {
                        this._changeInProgress = true;
                        moment.updateOffset(this, true);
                        this._changeInProgress = null;
                    }
                }
            } else {
                return this._isUTC ? offset : this._d.getTimezoneOffset();
            }
            return this;
        },

        zoneAbbr : function () {
            return this._isUTC ? "UTC" : "";
        },

        zoneName : function () {
            return this._isUTC ? "Coordinated Universal Time" : "";
        },

        parseZone : function () {
            if (this._tzm) {
                this.zone(this._tzm);
            } else if (typeof this._i === 'string') {
                this.zone(this._i);
            }
            return this;
        },

        hasAlignedHourOffset : function (input) {
            if (!input) {
                input = 0;
            }
            else {
                input = moment(input).zone();
            }

            return (this.zone() - input) % 60 === 0;
        },

        daysInMonth : function () {
            return daysInMonth(this.year(), this.month());
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add("d", (input - dayOfYear));
        },

        quarter : function (input) {
            return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
        },

        weekYear : function (input) {
            var year = weekOfYear(this, this.lang()._week.dow, this.lang()._week.doy).year;
            return input == null ? year : this.add("y", (input - year));
        },

        isoWeekYear : function (input) {
            var year = weekOfYear(this, 1, 4).year;
            return input == null ? year : this.add("y", (input - year));
        },

        week : function (input) {
            var week = this.lang().week(this);
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4).week;
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        weekday : function (input) {
            var weekday = (this.day() + 7 - this.lang()._week.dow) % 7;
            return input == null ? weekday : this.add("d", input - weekday);
        },

        isoWeekday : function (input) {
            // behaves the same as moment#day except
            // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
            // as a setter, sunday should belong to the previous week.
            return input == null ? this.day() || 7 : this.day(this.day() % 7 ? input : input - 7);
        },

        isoWeeksInYear : function () {
            return weeksInYear(this.year(), 1, 4);
        },

        weeksInYear : function () {
            var weekInfo = this._lang._week;
            return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units]();
        },

        set : function (units, value) {
            units = normalizeUnits(units);
            if (typeof this[units] === 'function') {
                this[units](value);
            }
            return this;
        },

        // If passed a language key, it will set the language for this
        // instance.  Otherwise, it will return the language configuration
        // variables for this instance.
        lang : function (key) {
            if (key === undefined) {
                return this._lang;
            } else {
                this._lang = getLangDefinition(key);
                return this;
            }
        }
    });

    function rawMonthSetter(mom, value) {
        var dayOfMonth;

        // TODO: Move this out of here!
        if (typeof value === 'string') {
            value = mom.lang().monthsParse(value);
            // TODO: Another silent failure?
            if (typeof value !== 'number') {
                return mom;
            }
        }

        dayOfMonth = Math.min(mom.date(),
                daysInMonth(mom.year(), value));
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
        return mom;
    }

    function rawGetter(mom, unit) {
        return mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]();
    }

    function rawSetter(mom, unit, value) {
        if (unit === 'Month') {
            return rawMonthSetter(mom, value);
        } else {
            return mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
        }
    }

    function makeAccessor(unit, keepTime) {
        return function (value) {
            if (value != null) {
                rawSetter(this, unit, value);
                moment.updateOffset(this, keepTime);
                return this;
            } else {
                return rawGetter(this, unit);
            }
        };
    }

    moment.fn.millisecond = moment.fn.milliseconds = makeAccessor('Milliseconds', false);
    moment.fn.second = moment.fn.seconds = makeAccessor('Seconds', false);
    moment.fn.minute = moment.fn.minutes = makeAccessor('Minutes', false);
    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    moment.fn.hour = moment.fn.hours = makeAccessor('Hours', true);
    // moment.fn.month is defined separately
    moment.fn.date = makeAccessor('Date', true);
    moment.fn.dates = deprecate("dates accessor is deprecated. Use date instead.", makeAccessor('Date', true));
    moment.fn.year = makeAccessor('FullYear', true);
    moment.fn.years = deprecate("years accessor is deprecated. Use year instead.", makeAccessor('FullYear', true));

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.months = moment.fn.month;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;
    moment.fn.quarters = moment.fn.quarter;

    // add aliased format methods
    moment.fn.toJSON = moment.fn.toISOString;

    /************************************
        Duration Prototype
    ************************************/


    function daysToYears (days) {
        // 400 years have 146097 days (taking into account leap year rules)
        return days * 400 / 146097;
    }

    function yearsToDays (years) {
        // years * 365 + absRound(years / 4) -
        //     absRound(years / 100) + absRound(years / 400);
        return years * 146097 / 400;
    }

    extend(moment.duration.fn = Duration.prototype, {

        _bubble : function () {
            var milliseconds = this._milliseconds,
                days = this._days,
                months = this._months,
                data = this._data,
                seconds, minutes, hours, years = 0;

            // The following code bubbles up values, see the tests for
            // examples of what that means.
            data.milliseconds = milliseconds % 1000;

            seconds = absRound(milliseconds / 1000);
            data.seconds = seconds % 60;

            minutes = absRound(seconds / 60);
            data.minutes = minutes % 60;

            hours = absRound(minutes / 60);
            data.hours = hours % 24;

            days += absRound(hours / 24);

            // Accurately convert days to years, assume start from year 0.
            years = absRound(daysToYears(days));
            days -= absRound(yearsToDays(years));

            // 30 days to a month
            // TODO (iskren): Use anchor date (like 1st Jan) to compute this.
            months += absRound(days / 30);
            days %= 30;

            // 12 months -> 1 year
            years += absRound(months / 12);
            months %= 12;

            data.days = days;
            data.months = months;
            data.years = years;
        },

        abs : function () {
            this._milliseconds = Math.abs(this._milliseconds);
            this._days = Math.abs(this._days);
            this._months = Math.abs(this._months);

            this._data.milliseconds = Math.abs(this._data.milliseconds);
            this._data.seconds = Math.abs(this._data.seconds);
            this._data.minutes = Math.abs(this._data.minutes);
            this._data.hours = Math.abs(this._data.hours);
            this._data.months = Math.abs(this._data.months);
            this._data.years = Math.abs(this._data.years);

            return this;
        },

        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              (this._months % 12) * 2592e6 +
              toInt(this._months / 12) * 31536e6;
        },

        humanize : function (withSuffix) {
            var output = relativeTime(this, !withSuffix, this.lang());

            if (withSuffix) {
                output = this.lang().pastFuture(+this, output);
            }

            return this.lang().postformat(output);
        },

        add : function (input, val) {
            // supports only 2.0-style add(1, 's') or add(moment)
            var dur = moment.duration(input, val);

            this._milliseconds += dur._milliseconds;
            this._days += dur._days;
            this._months += dur._months;

            this._bubble();

            return this;
        },

        subtract : function (input, val) {
            var dur = moment.duration(input, val);

            this._milliseconds -= dur._milliseconds;
            this._days -= dur._days;
            this._months -= dur._months;

            this._bubble();

            return this;
        },

        get : function (units) {
            units = normalizeUnits(units);
            return this[units.toLowerCase() + 's']();
        },

        as : function (units) {
            var days, months;
            units = normalizeUnits(units);

            days = this._days + this._milliseconds / 864e5;
            if (units === 'month' || units === 'year') {
                months = this._months + daysToYears(days) * 12;
                return units === 'month' ? months : months / 12;
            } else {
                days += yearsToDays(this._months / 12);
                switch (units) {
                    case 'week': return days / 7;
                    case 'day': return days;
                    case 'hour': return days * 24;
                    case 'minute': return days * 24 * 60;
                    case 'second': return days * 24 * 60 * 60;
                    case 'millisecond': return days * 24 * 60 * 60 * 1000;
                    default: throw new Error("Unknown unit " + units);
                }
            }
        },

        lang : moment.fn.lang,

        toIsoString : function () {
            // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
            var years = Math.abs(this.years()),
                months = Math.abs(this.months()),
                days = Math.abs(this.days()),
                hours = Math.abs(this.hours()),
                minutes = Math.abs(this.minutes()),
                seconds = Math.abs(this.seconds() + this.milliseconds() / 1000);

            if (!this.asSeconds()) {
                // this is the same as C#'s (Noda) and python (isodate)...
                // but not other JS (goog.date)
                return 'P0D';
            }

            return (this.asSeconds() < 0 ? '-' : '') +
                'P' +
                (years ? years + 'Y' : '') +
                (months ? months + 'M' : '') +
                (days ? days + 'D' : '') +
                ((hours || minutes || seconds) ? 'T' : '') +
                (hours ? hours + 'H' : '') +
                (minutes ? minutes + 'M' : '') +
                (seconds ? seconds + 'S' : '');
        }
    });

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    for (i in unitMillisecondFactors) {
        if (unitMillisecondFactors.hasOwnProperty(i)) {
            makeDurationGetter(i.toLowerCase());
        }
    }

    moment.duration.fn.asMilliseconds = function () {
        return this.as('ms');
    };
    moment.duration.fn.asSeconds = function () {
        return this.as('s');
    };
    moment.duration.fn.asMinutes = function () {
        return this.as('m');
    };
    moment.duration.fn.asHours = function () {
        return this.as('h');
    };
    moment.duration.fn.asDays = function () {
        return this.as('d');
    };
    moment.duration.fn.asWeeks = function () {
        return this.as('weeks');
    };
    moment.duration.fn.asMonths = function () {
        return this.as('M');
    };
    moment.duration.fn.asYears = function () {
        return this.as('y');
    };

    /************************************
        Default Lang
    ************************************/


    // Set default language, other languages will inherit from English.
    moment.lang('en', {
        ordinal : function (number) {
            var b = number % 10,
                output = (toInt(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });

    /* EMBED_LANGUAGES */

    /************************************
        Exposing Moment
    ************************************/

    function makeGlobal(shouldDeprecate) {
        /*global ender:false */
        if (typeof ender !== 'undefined') {
            return;
        }
        oldGlobalMoment = globalScope.moment;
        if (shouldDeprecate) {
            globalScope.moment = deprecate(
                    "Accessing Moment through the global scope is " +
                    "deprecated, and will be removed in an upcoming " +
                    "release.",
                    moment);
        } else {
            globalScope.moment = moment;
        }
    }

    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    } else if (typeof define === "function" && define.amd) {
        define("moment", function (require, exports, module) {
            if (module.config && module.config() && module.config().noGlobal === true) {
                // release the global variable
                globalScope.moment = oldGlobalMoment;
            }

            return moment;
        });
        makeGlobal(true);
    } else {
        makeGlobal();
    }
}).call(this);;/* ng-infinite-scroll - v1.0.3 - 2013-10-07 */
// https://raw.github.com/platypus-creation/ngInfiniteScroll/

var mod = angular.module('infinite-scroll', []);

mod.directive('infiniteScroll', [
  '$rootScope', '$window', '$timeout', function($rootScope, $window, $timeout) {
    return {
      link: function(scope, elem, attrs) {
        var $scrollParent, checkWhenEnabled, elementTop, handler, scrollDistance, scrollEnabled;
        $window = angular.element($window);
        $scrollParent = elem.parents().filter(function() {
          return /(auto|scroll)/.test(($.css(this, 'overflow')) + ($.css(this, 'overflow-y')));
        }).eq(0);
        if ($scrollParent.length === 0) {
          $scrollParent = $window;
        }

        if (attrs.infiniteScrollSelf != null) {
            $scrollParent = elem;
        }

        scrollDistance = 0;
        if (attrs.infiniteScrollDistance != null) {
          scope.$watch(attrs.infiniteScrollDistance, function(value) {
            return scrollDistance = parseFloat(value, 10);
          });
        }
        scrollEnabled = true;
        checkWhenEnabled = false;
        if (attrs.infiniteScrollDisabled != null) {
          scope.$watch(attrs.infiniteScrollDisabled, function(value) {
            scrollEnabled = !value;
            if (scrollEnabled && checkWhenEnabled) {
              checkWhenEnabled = false;
              return handler();
            }
          });
        }
        elementTop = elem.position().top;
        handler = function() {
          var elementBottom, remaining, scrollBottom, shouldScroll;

          if(elem == $scrollParent) {
              remaining = elem[0].scrollHeight - elem.scrollTop() - elem.height();
              shouldScroll = remaining <= (elem[0].scrollHeight * scrollDistance);
          } else {
              elementBottom = elementTop + elem.height();
              scrollBottom = $scrollParent.height() + $scrollParent.scrollTop();
              remaining = elementBottom - scrollBottom;
              shouldScroll = remaining <= ($scrollParent.height() * scrollDistance);
          }
          if (shouldScroll && scrollEnabled) {
            if ($rootScope.$$phase) {
              return scope.$eval(attrs.infiniteScroll);
            } else {
              return scope.$apply(attrs.infiniteScroll);
            }
          } else if (shouldScroll) {
            return checkWhenEnabled = true;
          }
        };

        // if there isn't enough content to show a scrollbar
        // var interval = setInterval(function(){
        //     if($scrollParent[0].offsetHeight === $scrollParent[0].scrollHeight) {
        //         // load more
        //         scope.$apply(attrs.infiniteScroll)
        //     }
        // }, 1000)

        $scrollParent.on('scroll', handler);
        handler();
        scope.$on('$destroy', function() {
            // clearInterval(interval);
            return $scrollParent.off('scroll', handler);
        });
        return $timeout((function() {
          if (attrs.infiniteScrollImmediateCheck) {
            if (scope.$eval(attrs.infiniteScrollImmediateCheck)) {
              return handler();
            }
          } else {
            return handler();
          }
        }), 0);
      }
    };
  }
]);;/**
 * Translation module for angularjs.
 * @version v0.0.2 - 2014-06-25
 * @author Stephan Hoyer
 * @link https://github.com/StephanHoyer/ng-translate
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
/**
 *
 */

(function (ng) {
    'use strict';


//   copied from angular
    var SPECIAL_CHARS_REGEXP = /([\:\-\_]+(.))/g;
    var MOZ_HACK_REGEXP = /^moz([A-Z])/;

    function camelCase(name) {
        return name.
            replace(SPECIAL_CHARS_REGEXP, function(_, separator, letter, offset) {
                return offset ? letter.toUpperCase() : letter;
            }).
            replace(MOZ_HACK_REGEXP, 'Moz$1');
    }



    /* Services */
    ng.module('translate', [], ['$provide', function ($provide) {
        $provide.factory('translate', ['$log', function($log) {
            var localizedStrings = {};
            var log = false;
            var translate = function translate(sourceString, language) {
                if (!sourceString) {
                    return '';
                }
                sourceString = $.trim(sourceString);
                // Angular will add these comments to fix IE8 behavior
                sourceString = sourceString.replace(/<!--IE fix-->/g, '');
                // Angular will add the ng-binding class to some elements at runtime
                sourceString = sourceString.replace(/ class="ng-binding"/g, '');
                if (localizedStrings[language || 'default'][sourceString]) {
                    return localizedStrings[language || 'default'][sourceString];
                } else {
                    if (log) $log.warn('Missing localisation for "' + sourceString + '"');
                    return sourceString;
                }
            };
            translate.add = function (translations, language) {
                if (ng.isUndefined(localizedStrings[language || 'default'])) {
                    localizedStrings[language || 'default'] = {};
                }
                ng.extend(localizedStrings[language || 'default'], translations);
            };
            translate.remove = function(key, language) {
                if (localizedStrings[language || 'default'][key]) {
                    delete localizedStrings[language || 'default'][key];
                    return true;
                }
                return false;
            };
            translate.set = function(translations, language) {
                localizedStrings[language || 'default'] = translations;
            };
            translate.logMissedHits = function(boolLog) {
                log = boolLog;
            };
            return translate;
        }]);
    }]);

    /* Directives */
    ng.module('translate.directives', ['translate'], ['$compileProvider', function ($compileProvider) {
        $compileProvider.directive('translate', ['$compile', 'translate', function ($compile, translate) {
            return {
                priority: 10, //Should be evaluated befor e. G. pluralize
                restrict: 'ECMA',
                compile: function compile(el, attrs) {
                    var translateInnerHtml = false;
                    if (attrs.translate) {
                        var attrsToTranslate = attrs.translate.split(' ');
                        ng.forEach(attrsToTranslate , function(attrName) {
                            el.attr(attrName, translate(attrs[camelCase(attrName)]));
                        });
                        translateInnerHtml = attrsToTranslate.indexOf('innerHTML') >= 0;
                    } else {
                        translateInnerHtml = true;
                    }
                    return function preLink(scope, el, attrs) {
                        if (translateInnerHtml) {
                            el.html(translate(el.html()));
                        }
                        try{
                            $compile(el.contents())(scope);
                        }catch(e){
                        }
                    };
                }
            };
        }]);
    }]);

    ng.module('translate.filters', ['translate'])
        .filter('translate', ['translate', function(translate) {
            return function(input) {
                return translate(input);
            };
        }]);
}(angular));
;// TinyColor v0.11.2
// https://github.com/bgrins/TinyColor
// 2014-06-13, Brian Grinstead, MIT License

(function() {

var trimLeft = /^[\s,#]+/,
    trimRight = /\s+$/,
    tinyCounter = 0,
    math = Math,
    mathRound = math.round,
    mathMin = math.min,
    mathMax = math.max,
    mathRandom = math.random;

var tinycolor = function tinycolor (color, opts) {

    color = (color) ? color : '';
    opts = opts || { };

    // If input is already a tinycolor, return itself
    if (color instanceof tinycolor) {
       return color;
    }
    // If we are called as a function, call using new instead
    if (!(this instanceof tinycolor)) {
        return new tinycolor(color, opts);
    }

    var rgb = inputToRGB(color);
    this._r = rgb.r,
    this._g = rgb.g,
    this._b = rgb.b,
    this._a = rgb.a,
    this._roundA = mathRound(100*this._a) / 100,
    this._format = opts.format || rgb.format;
    this._gradientType = opts.gradientType;

    // Don't let the range of [0,255] come back in [0,1].
    // Potentially lose a little bit of precision here, but will fix issues where
    // .5 gets interpreted as half of the total, instead of half of 1
    // If it was supposed to be 128, this was already taken care of by `inputToRgb`
    if (this._r < 1) { this._r = mathRound(this._r); }
    if (this._g < 1) { this._g = mathRound(this._g); }
    if (this._b < 1) { this._b = mathRound(this._b); }

    this._ok = rgb.ok;
    this._tc_id = tinyCounter++;
};

tinycolor.prototype = {
    isDark: function() {
        return this.getBrightness() < 128;
    },
    isLight: function() {
        return !this.isDark();
    },
    isValid: function() {
        return this._ok;
    },
    getFormat: function() {
        return this._format;
    },
    getAlpha: function() {
        return this._a;
    },
    getBrightness: function() {
        var rgb = this.toRgb();
        return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    },
    setAlpha: function(value) {
        this._a = boundAlpha(value);
        this._roundA = mathRound(100*this._a) / 100;
        return this;
    },
    toHsv: function() {
        var hsv = rgbToHsv(this._r, this._g, this._b);
        return { h: hsv.h * 360, s: hsv.s, v: hsv.v, a: this._a };
    },
    toHsvString: function() {
        var hsv = rgbToHsv(this._r, this._g, this._b);
        var h = mathRound(hsv.h * 360), s = mathRound(hsv.s * 100), v = mathRound(hsv.v * 100);
        return (this._a == 1) ?
          "hsv("  + h + ", " + s + "%, " + v + "%)" :
          "hsva(" + h + ", " + s + "%, " + v + "%, "+ this._roundA + ")";
    },
    toHsl: function() {
        var hsl = rgbToHsl(this._r, this._g, this._b);
        return { h: hsl.h * 360, s: hsl.s, l: hsl.l, a: this._a };
    },
    toHslString: function() {
        var hsl = rgbToHsl(this._r, this._g, this._b);
        var h = mathRound(hsl.h * 360), s = mathRound(hsl.s * 100), l = mathRound(hsl.l * 100);
        return (this._a == 1) ?
          "hsl("  + h + ", " + s + "%, " + l + "%)" :
          "hsla(" + h + ", " + s + "%, " + l + "%, "+ this._roundA + ")";
    },
    toHex: function(allow3Char) {
        return rgbToHex(this._r, this._g, this._b, allow3Char);
    },
    toHexString: function(allow3Char) {
        return '#' + this.toHex(allow3Char);
    },
    toHex8: function() {
        return rgbaToHex(this._r, this._g, this._b, this._a);
    },
    toHex8String: function() {
        return '#' + this.toHex8();
    },
    toRgb: function() {
        return { r: mathRound(this._r), g: mathRound(this._g), b: mathRound(this._b), a: this._a };
    },
    toRgbString: function() {
        return (this._a == 1) ?
          "rgb("  + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ")" :
          "rgba(" + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ", " + this._roundA + ")";
    },
    toPercentageRgb: function() {
        return { r: mathRound(bound01(this._r, 255) * 100) + "%", g: mathRound(bound01(this._g, 255) * 100) + "%", b: mathRound(bound01(this._b, 255) * 100) + "%", a: this._a };
    },
    toPercentageRgbString: function() {
        return (this._a == 1) ?
          "rgb("  + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%)" :
          "rgba(" + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%, " + this._roundA + ")";
    },
    toName: function() {
        if (this._a === 0) {
            return "transparent";
        }

        if (this._a < 1) {
            return false;
        }

        return hexNames[rgbToHex(this._r, this._g, this._b, true)] || false;
    },
    toFilter: function(secondColor) {
        var hex8String = '#' + rgbaToHex(this._r, this._g, this._b, this._a);
        var secondHex8String = hex8String;
        var gradientType = this._gradientType ? "GradientType = 1, " : "";

        if (secondColor) {
            var s = tinycolor(secondColor);
            secondHex8String = s.toHex8String();
        }

        return "progid:DXImageTransform.Microsoft.gradient("+gradientType+"startColorstr="+hex8String+",endColorstr="+secondHex8String+")";
    },
    toString: function(format) {
        var formatSet = !!format;
        format = format || this._format;

        var formattedString = false;
        var hasAlpha = this._a < 1 && this._a >= 0;
        var needsAlphaFormat = !formatSet && hasAlpha && (format === "hex" || format === "hex6" || format === "hex3" || format === "name");

        if (needsAlphaFormat) {
            // Special case for "transparent", all other non-alpha formats
            // will return rgba when there is transparency.
            if (format === "name" && this._a === 0) {
                return this.toName();
            }
            return this.toRgbString();
        }
        if (format === "rgb") {
            formattedString = this.toRgbString();
        }
        if (format === "prgb") {
            formattedString = this.toPercentageRgbString();
        }
        if (format === "hex" || format === "hex6") {
            formattedString = this.toHexString();
        }
        if (format === "hex3") {
            formattedString = this.toHexString(true);
        }
        if (format === "hex8") {
            formattedString = this.toHex8String();
        }
        if (format === "name") {
            formattedString = this.toName();
        }
        if (format === "hsl") {
            formattedString = this.toHslString();
        }
        if (format === "hsv") {
            formattedString = this.toHsvString();
        }

        return formattedString || this.toHexString();
    }
};

// If input is an object, force 1 into "1.0" to handle ratios properly
// String input requires "1.0" as input, so 1 will be treated as 1
tinycolor.fromRatio = function(color, opts) {
    if (typeof color == "object") {
        var newColor = {};
        for (var i in color) {
            if (color.hasOwnProperty(i)) {
                if (i === "a") {
                    newColor[i] = color[i];
                }
                else {
                    newColor[i] = convertToPercentage(color[i]);
                }
            }
        }
        color = newColor;
    }

    return tinycolor(color, opts);
};

// Given a string or object, convert that input to RGB
// Possible string inputs:
//
//     "red"
//     "#f00" or "f00"
//     "#ff0000" or "ff0000"
//     "#ff000000" or "ff000000"
//     "rgb 255 0 0" or "rgb (255, 0, 0)"
//     "rgb 1.0 0 0" or "rgb (1, 0, 0)"
//     "rgba (255, 0, 0, 1)" or "rgba 255, 0, 0, 1"
//     "rgba (1.0, 0, 0, 1)" or "rgba 1.0, 0, 0, 1"
//     "hsl(0, 100%, 50%)" or "hsl 0 100% 50%"
//     "hsla(0, 100%, 50%, 1)" or "hsla 0 100% 50%, 1"
//     "hsv(0, 100%, 100%)" or "hsv 0 100% 100%"
//
function inputToRGB(color) {

    var rgb = { r: 0, g: 0, b: 0 };
    var a = 1;
    var ok = false;
    var format = false;

    if (typeof color == "string") {
        color = stringInputToObject(color);
    }

    if (typeof color == "object") {
        if (color.hasOwnProperty("r") && color.hasOwnProperty("g") && color.hasOwnProperty("b")) {
            rgb = rgbToRgb(color.r, color.g, color.b);
            ok = true;
            format = String(color.r).substr(-1) === "%" ? "prgb" : "rgb";
        }
        else if (color.hasOwnProperty("h") && color.hasOwnProperty("s") && color.hasOwnProperty("v")) {
            color.s = convertToPercentage(color.s);
            color.v = convertToPercentage(color.v);
            rgb = hsvToRgb(color.h, color.s, color.v);
            ok = true;
            format = "hsv";
        }
        else if (color.hasOwnProperty("h") && color.hasOwnProperty("s") && color.hasOwnProperty("l")) {
            color.s = convertToPercentage(color.s);
            color.l = convertToPercentage(color.l);
            rgb = hslToRgb(color.h, color.s, color.l);
            ok = true;
            format = "hsl";
        }

        if (color.hasOwnProperty("a")) {
            a = color.a;
        }
    }

    a = boundAlpha(a);

    return {
        ok: ok,
        format: color.format || format,
        r: mathMin(255, mathMax(rgb.r, 0)),
        g: mathMin(255, mathMax(rgb.g, 0)),
        b: mathMin(255, mathMax(rgb.b, 0)),
        a: a
    };
}


// Conversion Functions
// --------------------

// `rgbToHsl`, `rgbToHsv`, `hslToRgb`, `hsvToRgb` modified from:
// <http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript>

// `rgbToRgb`
// Handle bounds / percentage checking to conform to CSS color spec
// <http://www.w3.org/TR/css3-color/>
// *Assumes:* r, g, b in [0, 255] or [0, 1]
// *Returns:* { r, g, b } in [0, 255]
function rgbToRgb(r, g, b){
    return {
        r: bound01(r, 255) * 255,
        g: bound01(g, 255) * 255,
        b: bound01(b, 255) * 255
    };
}

// `rgbToHsl`
// Converts an RGB color value to HSL.
// *Assumes:* r, g, and b are contained in [0, 255] or [0, 1]
// *Returns:* { h, s, l } in [0,1]
function rgbToHsl(r, g, b) {

    r = bound01(r, 255);
    g = bound01(g, 255);
    b = bound01(b, 255);

    var max = mathMax(r, g, b), min = mathMin(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min) {
        h = s = 0; // achromatic
    }
    else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }

    return { h: h, s: s, l: l };
}

// `hslToRgb`
// Converts an HSL color value to RGB.
// *Assumes:* h is contained in [0, 1] or [0, 360] and s and l are contained [0, 1] or [0, 100]
// *Returns:* { r, g, b } in the set [0, 255]
function hslToRgb(h, s, l) {
    var r, g, b;

    h = bound01(h, 360);
    s = bound01(s, 100);
    l = bound01(l, 100);

    function hue2rgb(p, q, t) {
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1/6) return p + (q - p) * 6 * t;
        if(t < 1/2) return q;
        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }

    if(s === 0) {
        r = g = b = l; // achromatic
    }
    else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return { r: r * 255, g: g * 255, b: b * 255 };
}

// `rgbToHsv`
// Converts an RGB color value to HSV
// *Assumes:* r, g, and b are contained in the set [0, 255] or [0, 1]
// *Returns:* { h, s, v } in [0,1]
function rgbToHsv(r, g, b) {

    r = bound01(r, 255);
    g = bound01(g, 255);
    b = bound01(b, 255);

    var max = mathMax(r, g, b), min = mathMin(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max === 0 ? 0 : d / max;

    if(max == min) {
        h = 0; // achromatic
    }
    else {
        switch(max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h, s: s, v: v };
}

// `hsvToRgb`
// Converts an HSV color value to RGB.
// *Assumes:* h is contained in [0, 1] or [0, 360] and s and v are contained in [0, 1] or [0, 100]
// *Returns:* { r, g, b } in the set [0, 255]
 function hsvToRgb(h, s, v) {

    h = bound01(h, 360) * 6;
    s = bound01(s, 100);
    v = bound01(v, 100);

    var i = math.floor(h),
        f = h - i,
        p = v * (1 - s),
        q = v * (1 - f * s),
        t = v * (1 - (1 - f) * s),
        mod = i % 6,
        r = [v, q, p, p, t, v][mod],
        g = [t, v, v, q, p, p][mod],
        b = [p, p, t, v, v, q][mod];

    return { r: r * 255, g: g * 255, b: b * 255 };
}

// `rgbToHex`
// Converts an RGB color to hex
// Assumes r, g, and b are contained in the set [0, 255]
// Returns a 3 or 6 character hex
function rgbToHex(r, g, b, allow3Char) {

    var hex = [
        pad2(mathRound(r).toString(16)),
        pad2(mathRound(g).toString(16)),
        pad2(mathRound(b).toString(16))
    ];

    // Return a 3 character hex if possible
    if (allow3Char && hex[0].charAt(0) == hex[0].charAt(1) && hex[1].charAt(0) == hex[1].charAt(1) && hex[2].charAt(0) == hex[2].charAt(1)) {
        return hex[0].charAt(0) + hex[1].charAt(0) + hex[2].charAt(0);
    }

    return hex.join("");
}
    // `rgbaToHex`
    // Converts an RGBA color plus alpha transparency to hex
    // Assumes r, g, b and a are contained in the set [0, 255]
    // Returns an 8 character hex
    function rgbaToHex(r, g, b, a) {

        var hex = [
            pad2(convertDecimalToHex(a)),
            pad2(mathRound(r).toString(16)),
            pad2(mathRound(g).toString(16)),
            pad2(mathRound(b).toString(16))
        ];

        return hex.join("");
    }

// `equals`
// Can be called with any tinycolor input
tinycolor.equals = function (color1, color2) {
    if (!color1 || !color2) { return false; }
    return tinycolor(color1).toRgbString() == tinycolor(color2).toRgbString();
};
tinycolor.random = function() {
    return tinycolor.fromRatio({
        r: mathRandom(),
        g: mathRandom(),
        b: mathRandom()
    });
};


// Modification Functions
// ----------------------
// Thanks to less.js for some of the basics here
// <https://github.com/cloudhead/less.js/blob/master/lib/less/functions.js>

tinycolor.desaturate = function (color, amount) {
    amount = (amount === 0) ? 0 : (amount || 10);
    var hsl = tinycolor(color).toHsl();
    hsl.s -= amount / 100;
    hsl.s = clamp01(hsl.s);
    return tinycolor(hsl);
};
tinycolor.saturate = function (color, amount) {
    amount = (amount === 0) ? 0 : (amount || 10);
    var hsl = tinycolor(color).toHsl();
    hsl.s += amount / 100;
    hsl.s = clamp01(hsl.s);
    return tinycolor(hsl);
};
tinycolor.greyscale = function(color) {
    return tinycolor.desaturate(color, 100);
};
tinycolor.lighten = function(color, amount) {
    amount = (amount === 0) ? 0 : (amount || 10);
    var hsl = tinycolor(color).toHsl();
    hsl.l += amount / 100;
    hsl.l = clamp01(hsl.l);
    return tinycolor(hsl);
};
tinycolor.brighten = function(color, amount) {
    amount = (amount === 0) ? 0 : (amount || 10);
    var rgb = tinycolor(color).toRgb();
    rgb.r = mathMax(0, mathMin(255, rgb.r - mathRound(255 * - (amount / 100))));
    rgb.g = mathMax(0, mathMin(255, rgb.g - mathRound(255 * - (amount / 100))));
    rgb.b = mathMax(0, mathMin(255, rgb.b - mathRound(255 * - (amount / 100))));
    return tinycolor(rgb);
};
tinycolor.darken = function (color, amount) {
    amount = (amount === 0) ? 0 : (amount || 10);
    var hsl = tinycolor(color).toHsl();
    hsl.l -= amount / 100;
    hsl.l = clamp01(hsl.l);
    return tinycolor(hsl);
};
tinycolor.complement = function(color) {
    var hsl = tinycolor(color).toHsl();
    hsl.h = (hsl.h + 180) % 360;
    return tinycolor(hsl);
};
// Spin takes a positive or negative amount within [-360, 360] indicating the change of hue.
// Values outside of this range will be wrapped into this range.
tinycolor.spin = function(color, amount) {
    var hsl = tinycolor(color).toHsl();
    var hue = (mathRound(hsl.h) + amount) % 360;
    hsl.h = hue < 0 ? 360 + hue : hue;
    return tinycolor(hsl);
};
tinycolor.mix = function(color1, color2, amount) {
    amount = (amount === 0) ? 0 : (amount || 50);

    var rgb1 = tinycolor(color1).toRgb();
    var rgb2 = tinycolor(color2).toRgb();

    var p = amount / 100;
    var w = p * 2 - 1;
    var a = rgb2.a - rgb1.a;

    var w1;

    if (w * a == -1) {
        w1 = w;
    } else {
        w1 = (w + a) / (1 + w * a);
    }

    w1 = (w1 + 1) / 2;

    var w2 = 1 - w1;

    var rgba = {
        r: rgb2.r * w1 + rgb1.r * w2,
        g: rgb2.g * w1 + rgb1.g * w2,
        b: rgb2.b * w1 + rgb1.b * w2,
        a: rgb2.a * p  + rgb1.a * (1 - p)
    };

    return tinycolor(rgba);
};

// Combination Functions
// ---------------------
// Thanks to jQuery xColor for some of the ideas behind these
// <https://github.com/infusion/jQuery-xcolor/blob/master/jquery.xcolor.js>

tinycolor.triad = function(color) {
    var hsl = tinycolor(color).toHsl();
    var h = hsl.h;
    return [
        tinycolor(color),
        tinycolor({ h: (h + 120) % 360, s: hsl.s, l: hsl.l }),
        tinycolor({ h: (h + 240) % 360, s: hsl.s, l: hsl.l })
    ];
};
tinycolor.tetrad = function(color) {
    var hsl = tinycolor(color).toHsl();
    var h = hsl.h;
    return [
        tinycolor(color),
        tinycolor({ h: (h + 90) % 360, s: hsl.s, l: hsl.l }),
        tinycolor({ h: (h + 180) % 360, s: hsl.s, l: hsl.l }),
        tinycolor({ h: (h + 270) % 360, s: hsl.s, l: hsl.l })
    ];
};
tinycolor.splitcomplement = function(color) {
    var hsl = tinycolor(color).toHsl();
    var h = hsl.h;
    return [
        tinycolor(color),
        tinycolor({ h: (h + 72) % 360, s: hsl.s, l: hsl.l}),
        tinycolor({ h: (h + 216) % 360, s: hsl.s, l: hsl.l})
    ];
};
tinycolor.analogous = function(color, results, slices) {
    results = results || 6;
    slices = slices || 30;

    var hsl = tinycolor(color).toHsl();
    var part = 360 / slices;
    var ret = [tinycolor(color)];

    for (hsl.h = ((hsl.h - (part * results >> 1)) + 720) % 360; --results; ) {
        hsl.h = (hsl.h + part) % 360;
        ret.push(tinycolor(hsl));
    }
    return ret;
};
tinycolor.monochromatic = function(color, results) {
    results = results || 6;
    var hsv = tinycolor(color).toHsv();
    var h = hsv.h, s = hsv.s, v = hsv.v;
    var ret = [];
    var modification = 1 / results;

    while (results--) {
        ret.push(tinycolor({ h: h, s: s, v: v}));
        v = (v + modification) % 1;
    }

    return ret;
};


// Readability Functions
// ---------------------
// <http://www.w3.org/TR/AERT#color-contrast>

// `readability`
// Analyze the 2 colors and returns an object with the following properties:
//    `brightness`: difference in brightness between the two colors
//    `color`: difference in color/hue between the two colors
tinycolor.readability = function(color1, color2) {
    var c1 = tinycolor(color1);
    var c2 = tinycolor(color2);
    var rgb1 = c1.toRgb();
    var rgb2 = c2.toRgb();
    var brightnessA = c1.getBrightness();
    var brightnessB = c2.getBrightness();
    var colorDiff = (
        Math.max(rgb1.r, rgb2.r) - Math.min(rgb1.r, rgb2.r) +
        Math.max(rgb1.g, rgb2.g) - Math.min(rgb1.g, rgb2.g) +
        Math.max(rgb1.b, rgb2.b) - Math.min(rgb1.b, rgb2.b)
    );

    return {
        brightness: Math.abs(brightnessA - brightnessB),
        color: colorDiff
    };
};

// `readable`
// http://www.w3.org/TR/AERT#color-contrast
// Ensure that foreground and background color combinations provide sufficient contrast.
// *Example*
//    tinycolor.readable("#000", "#111") => false
tinycolor.readable = function(color1, color2) {
    var readability = tinycolor.readability(color1, color2);
    return readability.brightness > 125 && readability.color > 500;
};

// `mostReadable`
// Given a base color and a list of possible foreground or background
// colors for that base, returns the most readable color.
// *Example*
//    tinycolor.mostReadable("#123", ["#fff", "#000"]) => "#000"
tinycolor.mostReadable = function(baseColor, colorList) {
    var bestColor = null;
    var bestScore = 0;
    var bestIsReadable = false;
    for (var i=0; i < colorList.length; i++) {

        // We normalize both around the "acceptable" breaking point,
        // but rank brightness constrast higher than hue.

        var readability = tinycolor.readability(baseColor, colorList[i]);
        var readable = readability.brightness > 125 && readability.color > 500;
        var score = 3 * (readability.brightness / 125) + (readability.color / 500);

        if ((readable && ! bestIsReadable) ||
            (readable && bestIsReadable && score > bestScore) ||
            ((! readable) && (! bestIsReadable) && score > bestScore)) {
            bestIsReadable = readable;
            bestScore = score;
            bestColor = tinycolor(colorList[i]);
        }
    }
    return bestColor;
};


// Big List of Colors
// ------------------
// <http://www.w3.org/TR/css3-color/#svg-color>
var names = tinycolor.names = {
    aliceblue: "f0f8ff",
    antiquewhite: "faebd7",
    aqua: "0ff",
    aquamarine: "7fffd4",
    azure: "f0ffff",
    beige: "f5f5dc",
    bisque: "ffe4c4",
    black: "000",
    blanchedalmond: "ffebcd",
    blue: "00f",
    blueviolet: "8a2be2",
    brown: "a52a2a",
    burlywood: "deb887",
    burntsienna: "ea7e5d",
    cadetblue: "5f9ea0",
    chartreuse: "7fff00",
    chocolate: "d2691e",
    coral: "ff7f50",
    cornflowerblue: "6495ed",
    cornsilk: "fff8dc",
    crimson: "dc143c",
    cyan: "0ff",
    darkblue: "00008b",
    darkcyan: "008b8b",
    darkgoldenrod: "b8860b",
    darkgray: "a9a9a9",
    darkgreen: "006400",
    darkgrey: "a9a9a9",
    darkkhaki: "bdb76b",
    darkmagenta: "8b008b",
    darkolivegreen: "556b2f",
    darkorange: "ff8c00",
    darkorchid: "9932cc",
    darkred: "8b0000",
    darksalmon: "e9967a",
    darkseagreen: "8fbc8f",
    darkslateblue: "483d8b",
    darkslategray: "2f4f4f",
    darkslategrey: "2f4f4f",
    darkturquoise: "00ced1",
    darkviolet: "9400d3",
    deeppink: "ff1493",
    deepskyblue: "00bfff",
    dimgray: "696969",
    dimgrey: "696969",
    dodgerblue: "1e90ff",
    firebrick: "b22222",
    floralwhite: "fffaf0",
    forestgreen: "228b22",
    fuchsia: "f0f",
    gainsboro: "dcdcdc",
    ghostwhite: "f8f8ff",
    gold: "ffd700",
    goldenrod: "daa520",
    gray: "808080",
    green: "008000",
    greenyellow: "adff2f",
    grey: "808080",
    honeydew: "f0fff0",
    hotpink: "ff69b4",
    indianred: "cd5c5c",
    indigo: "4b0082",
    ivory: "fffff0",
    khaki: "f0e68c",
    lavender: "e6e6fa",
    lavenderblush: "fff0f5",
    lawngreen: "7cfc00",
    lemonchiffon: "fffacd",
    lightblue: "add8e6",
    lightcoral: "f08080",
    lightcyan: "e0ffff",
    lightgoldenrodyellow: "fafad2",
    lightgray: "d3d3d3",
    lightgreen: "90ee90",
    lightgrey: "d3d3d3",
    lightpink: "ffb6c1",
    lightsalmon: "ffa07a",
    lightseagreen: "20b2aa",
    lightskyblue: "87cefa",
    lightslategray: "789",
    lightslategrey: "789",
    lightsteelblue: "b0c4de",
    lightyellow: "ffffe0",
    lime: "0f0",
    limegreen: "32cd32",
    linen: "faf0e6",
    magenta: "f0f",
    maroon: "800000",
    mediumaquamarine: "66cdaa",
    mediumblue: "0000cd",
    mediumorchid: "ba55d3",
    mediumpurple: "9370db",
    mediumseagreen: "3cb371",
    mediumslateblue: "7b68ee",
    mediumspringgreen: "00fa9a",
    mediumturquoise: "48d1cc",
    mediumvioletred: "c71585",
    midnightblue: "191970",
    mintcream: "f5fffa",
    mistyrose: "ffe4e1",
    moccasin: "ffe4b5",
    navajowhite: "ffdead",
    navy: "000080",
    oldlace: "fdf5e6",
    olive: "808000",
    olivedrab: "6b8e23",
    orange: "ffa500",
    orangered: "ff4500",
    orchid: "da70d6",
    palegoldenrod: "eee8aa",
    palegreen: "98fb98",
    paleturquoise: "afeeee",
    palevioletred: "db7093",
    papayawhip: "ffefd5",
    peachpuff: "ffdab9",
    peru: "cd853f",
    pink: "ffc0cb",
    plum: "dda0dd",
    powderblue: "b0e0e6",
    purple: "800080",
    red: "f00",
    rosybrown: "bc8f8f",
    royalblue: "4169e1",
    saddlebrown: "8b4513",
    salmon: "fa8072",
    sandybrown: "f4a460",
    seagreen: "2e8b57",
    seashell: "fff5ee",
    sienna: "a0522d",
    silver: "c0c0c0",
    skyblue: "87ceeb",
    slateblue: "6a5acd",
    slategray: "708090",
    slategrey: "708090",
    snow: "fffafa",
    springgreen: "00ff7f",
    steelblue: "4682b4",
    tan: "d2b48c",
    teal: "008080",
    thistle: "d8bfd8",
    tomato: "ff6347",
    turquoise: "40e0d0",
    violet: "ee82ee",
    wheat: "f5deb3",
    white: "fff",
    whitesmoke: "f5f5f5",
    yellow: "ff0",
    yellowgreen: "9acd32"
};

// Make it easy to access colors via `hexNames[hex]`
var hexNames = tinycolor.hexNames = flip(names);


// Utilities
// ---------

// `{ 'name1': 'val1' }` becomes `{ 'val1': 'name1' }`
function flip(o) {
    var flipped = { };
    for (var i in o) {
        if (o.hasOwnProperty(i)) {
            flipped[o[i]] = i;
        }
    }
    return flipped;
}

// Return a valid alpha value [0,1] with all invalid values being set to 1
function boundAlpha(a) {
    a = parseFloat(a);

    if (isNaN(a) || a < 0 || a > 1) {
        a = 1;
    }

    return a;
}

// Take input from [0, n] and return it as [0, 1]
function bound01(n, max) {
    if (isOnePointZero(n)) { n = "100%"; }

    var processPercent = isPercentage(n);
    n = mathMin(max, mathMax(0, parseFloat(n)));

    // Automatically convert percentage into number
    if (processPercent) {
        n = parseInt(n * max, 10) / 100;
    }

    // Handle floating point rounding errors
    if ((math.abs(n - max) < 0.000001)) {
        return 1;
    }

    // Convert into [0, 1] range if it isn't already
    return (n % max) / parseFloat(max);
}

// Force a number between 0 and 1
function clamp01(val) {
    return mathMin(1, mathMax(0, val));
}

// Parse a base-16 hex value into a base-10 integer
function parseIntFromHex(val) {
    return parseInt(val, 16);
}

// Need to handle 1.0 as 100%, since once it is a number, there is no difference between it and 1
// <http://stackoverflow.com/questions/7422072/javascript-how-to-detect-number-as-a-decimal-including-1-0>
function isOnePointZero(n) {
    return typeof n == "string" && n.indexOf('.') != -1 && parseFloat(n) === 1;
}

// Check to see if string passed in is a percentage
function isPercentage(n) {
    return typeof n === "string" && n.indexOf('%') != -1;
}

// Force a hex value to have 2 characters
function pad2(c) {
    return c.length == 1 ? '0' + c : '' + c;
}

// Replace a decimal with it's percentage value
function convertToPercentage(n) {
    if (n <= 1) {
        n = (n * 100) + "%";
    }

    return n;
}

// Converts a decimal to a hex value
function convertDecimalToHex(d) {
    return Math.round(parseFloat(d) * 255).toString(16);
}
// Converts a hex value to a decimal
function convertHexToDecimal(h) {
    return (parseIntFromHex(h) / 255);
}

var matchers = (function() {

    // <http://www.w3.org/TR/css3-values/#integers>
    var CSS_INTEGER = "[-\\+]?\\d+%?";

    // <http://www.w3.org/TR/css3-values/#number-value>
    var CSS_NUMBER = "[-\\+]?\\d*\\.\\d+%?";

    // Allow positive/negative integer/number.  Don't capture the either/or, just the entire outcome.
    var CSS_UNIT = "(?:" + CSS_NUMBER + ")|(?:" + CSS_INTEGER + ")";

    // Actual matching.
    // Parentheses and commas are optional, but not required.
    // Whitespace can take the place of commas or opening paren
    var PERMISSIVE_MATCH3 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";
    var PERMISSIVE_MATCH4 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";

    return {
        rgb: new RegExp("rgb" + PERMISSIVE_MATCH3),
        rgba: new RegExp("rgba" + PERMISSIVE_MATCH4),
        hsl: new RegExp("hsl" + PERMISSIVE_MATCH3),
        hsla: new RegExp("hsla" + PERMISSIVE_MATCH4),
        hsv: new RegExp("hsv" + PERMISSIVE_MATCH3),
        hex3: /^([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
        hex6: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
        hex8: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
    };
})();

// `stringInputToObject`
// Permissive string parsing.  Take in a number of formats, and output an object
// based on detected format.  Returns `{ r, g, b }` or `{ h, s, l }` or `{ h, s, v}`
function stringInputToObject(color) {

    color = color.replace(trimLeft,'').replace(trimRight, '').toLowerCase();
    var named = false;
    if (names[color]) {
        color = names[color];
        named = true;
    }
    else if (color == 'transparent') {
        return { r: 0, g: 0, b: 0, a: 0, format: "name" };
    }

    // Try to match string input using regular expressions.
    // Keep most of the number bounding out of this function - don't worry about [0,1] or [0,100] or [0,360]
    // Just return an object and let the conversion functions handle that.
    // This way the result will be the same whether the tinycolor is initialized with string or object.
    var match;
    if ((match = matchers.rgb.exec(color))) {
        return { r: match[1], g: match[2], b: match[3] };
    }
    if ((match = matchers.rgba.exec(color))) {
        return { r: match[1], g: match[2], b: match[3], a: match[4] };
    }
    if ((match = matchers.hsl.exec(color))) {
        return { h: match[1], s: match[2], l: match[3] };
    }
    if ((match = matchers.hsla.exec(color))) {
        return { h: match[1], s: match[2], l: match[3], a: match[4] };
    }
    if ((match = matchers.hsv.exec(color))) {
        return { h: match[1], s: match[2], v: match[3] };
    }
    if ((match = matchers.hex8.exec(color))) {
        return {
            a: convertHexToDecimal(match[1]),
            r: parseIntFromHex(match[2]),
            g: parseIntFromHex(match[3]),
            b: parseIntFromHex(match[4]),
            format: named ? "name" : "hex8"
        };
    }
    if ((match = matchers.hex6.exec(color))) {
        return {
            r: parseIntFromHex(match[1]),
            g: parseIntFromHex(match[2]),
            b: parseIntFromHex(match[3]),
            format: named ? "name" : "hex"
        };
    }
    if ((match = matchers.hex3.exec(color))) {
        return {
            r: parseIntFromHex(match[1] + '' + match[1]),
            g: parseIntFromHex(match[2] + '' + match[2]),
            b: parseIntFromHex(match[3] + '' + match[3]),
            format: named ? "name" : "hex"
        };
    }

    return false;
}

// Node: Export function
if (typeof module !== "undefined" && module.exports) {
    module.exports = tinycolor;
}
// AMD/requirejs: Define the module
else if (typeof define === 'function' && define.amd) {
    define(function () {return tinycolor;});
}
// Browser: Expose to window
else {
    window.tinycolor = tinycolor;
}

})();;(function() {
    'use strict';

    var mod = angular.module('ods-widgets', ['infinite-scroll', 'ngSanitize', 'translate', 'translate.directives', 'translate.filters']);
    /**
     *  CONFIGURATION
     *
     *   var app = angular.module('myapp').config(function(ODSWidgetsConfigProvider) {
     *       ODSWidgetsConfig.setConfig({
     *           defaultDomain: '/myapi'
     *       });
     *   });
     * */
    mod.provider('ODSWidgetsConfig', function() {
        /**
         * @ngdoc object
         * @name ods-widgets.ODSWidgetsConfigProvider
         * @description
         * Use `ODSWidgetsConfigProvider` to set configuration values used by various directives.
         * The available settings are:
         *
         * - **`defaultDomain`** - {@type string} - Value used as `domain` parameter for {@link ods-widgets.directive:odsCatalogContext Catalog Contexts}
         * and {@link ods-widgets.directive:odsDatasetContext Dataset Contexts} when none is specified. Defaults is '' (empty string), which means a local API (root is /).
         * - **`basemaps`** - {@type Array} A list of `basemap` objects.
         * - **`chartColors`** - {@type Array} A list of colors to use for charts. In each chart widget, the first chart will use the first color, the second chart
         * will use the second color, and so on until the end of the list is reached, and we start from the beginning of the list again. If not set, default colors will be used,
         * depending on the widgets themselves.
         * - **`disqusShortname`** - {@type string} - Shortname used by default for all {@link ods-widgets.directive:odsDisqus} widgets.
         * - **`themes`** - {@type Object} - Configuration of themes and their colors and/or picto
         */
        /**
         * @ngdoc service
         * @name ods-widgets.ODSWidgetsConfig
         * @description
         * A service containing all the configuration values available. Available configuration values are described
         * in the {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfigProvider} documentation.
         */
        this.defaultConfig = {
            defaultDomain: '', // Defaults to local API
            language: null,
            disqusShortname: null,
            customAPIHeaders: null,
            basemaps: [
                {
                    "provider": "mapquest",
                    "label": "MapQuest"
                }
            ],
            mapGeobox: false,
            chartColors: null,
            mapPrependAttribution: null,
            basePath: null,
            themes: {}
        };

        this.customConfig = {};

        this.setConfig = function(customConfig) {
            /**
             * @ngdoc method
             * @name ods-widgets.ODSWidgetsConfigProvider#setConfig
             * @methodOf ods-widgets.ODSWidgetsConfigProvider
             *
             * @description Sets configuration values by overriding existing values with the values from a new configuration
             * object. Existing values that are not present in the new object are left untouched.
             *
             * @param {Object=} customConfig An object containing the configuration values to override.
             */
            angular.extend(this.customConfig, customConfig);
        };

        this.$get = function() {
            return angular.extend({}, this.defaultConfig, this.customConfig);
        };
    });

    /** SERVICES */

    mod.service('ODSAPI', ['$http', 'ODSWidgetsConfig', function($http, ODSWidgetsConfig) {
        /**
         * This service exposes OpenDataSoft APIs.
         *
         * Each method take a context, and specific parameters to append to this request (without modifying the context).
         * A context is an object usually created by a directive such as dataset-context or catalog-context.
         */
        var request = function(context, path, params, timeout) {
            var url = context.domainUrl;
            url += path;
            params = params || {};
            if (context.apikey) {
                params.apikey = context.apikey;
            }
            var options = {
                params: params
            };
            if (timeout) {
                options.timeout = timeout;
            }
            if (ODSWidgetsConfig.customAPIHeaders) {
                options.headers = ODSWidgetsConfig.customAPIHeaders;
            }
            return $http.get(url, options);
        };
        return {
            'getDomainURL': function(domain) {
                var root = null;
                if (angular.isUndefined(domain) || domain === null) {
                    root = ODSWidgetsConfig.defaultDomain;
                } else {
                    if (domain.substr(0, 1) !== '/' && domain.indexOf('.') === -1) {
                        root = domain+'.opendatasoft.com';
                    } else {
                        root = domain;
                    }
                    if (root.substr(0, 1) !== '/' && root.indexOf('http://') === -1 && root.indexOf('https://') === -1) {
                        root = 'https://' + root;
                    }
                }

                if (root.substr(-1) === '/') {
                    // Remove trailing slash
                    root = root.substr(0, root.length-1);
                }

                return root;
            },
            'datasets': {
                'get': function(context, datasetID, parameters) {
                    return request(context, '/api/datasets/1.0/'+datasetID+'/', parameters);
                },
                'search': function(context, parameters) {
                    var queryParameters = angular.extend({}, context.parameters, parameters);
                    return request(context, '/api/datasets/1.0/search/', queryParameters);
                },
                'facets': function(context, facetName) {
                    return this.search(context, {'rows': 0, 'facet': facetName});
                }
            },
            'records': {
                'analyze': function(context, parameters) {
//                    return request(context, '/api/datasets/1.0/'+context.dataset.datasetid+'/records/analyze/', parameters);
                    return request(context, '/api/records/1.0/analyze/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}));
                },
                'search': function(context, parameters) {
                    return request(context, '/api/records/1.0/search/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}));
                },
                'download': function(context, parameters) {
                    return request(context, '/api/records/1.0/download/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}));
                },
                'geo': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/geocluster/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                },
                'geopreview': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/geopreview/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                },
                'boundingbox': function(context, parameters, timeout) {
                    return request(context, '/api/records/1.0/boundingbox/', angular.extend({}, parameters, {dataset: context.dataset.datasetid}), timeout);
                }
            },
            'reuses': function(context, parameters) {
                return request(context, '/explore/reuses/', parameters);
            }
        };
    }]);

    mod.provider('ModuleLazyLoader', function() {
        // TODO: Don't load if the global object is already available
        var lazyloading = {
            'highcharts': {
                'css': [],
                'js': [
                    ["//code.highcharts.com/3.0.7/highcharts.js"],
                    ["//code.highcharts.com/3.0.7/highcharts-more.js"]
                ]
            },
            'leaflet': {
                'css': [
                    "//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.css",
                    "//api.tiles.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v0.0.3/leaflet.fullscreen.css",
                    "//api.tiles.mapbox.com/mapbox.js/plugins/leaflet-locatecontrol/v0.24.0/L.Control.Locate.css",
                    "/static/ods-geobox/geobox.css",
                    "/static/ods-vectormarker/vectormarker.css",
                    "/static/ods-clustermarker/clustermarker.css"
                ],
                'js': [
                    ["L@//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.js"],
                    [
                        "L.Control.FullScreen@//api.tiles.mapbox.com/mapbox.js/plugins/leaflet-fullscreen/v0.0.3/Leaflet.fullscreen.min.js",
                        "L.Control.Locate@//api.tiles.mapbox.com/mapbox.js/plugins/leaflet-locatecontrol/v0.24.0/L.Control.Locate.js",
                        "L.ODSMap@/static/ods-map/ods-map.js",
                        "L.ODSTileLayer@/static/ods-map/ods-tilelayer.js",
                        "L.Control.GeoBox@/static/ods-geobox/geobox.js",
                        "L.VectorMarker@/static/ods-vectormarker/vectormarker.js",
                        "L.ClusterMarker@/static/ods-clustermarker/clustermarker.js"
                    ]
                ]
            }
        };

        this.getConfig = function() {
            return lazyloading;
        };

        var objectIsDefined = function(scope, name) {
            var nameParts = name.split('.');
            if (scope.hasOwnProperty(nameParts[0]) && angular.isDefined(scope[nameParts[0]])) {
                if (nameParts.length === 1) {
                    return true;
                } else {
                    var newScope = scope[nameParts[0]];
                    nameParts.shift();
                    return objectIsDefined(newScope, nameParts.join('.'));
                }
            } else {
                return false;
            }
        };

        var isAlreadyAvailable = function(objectName) {
            return objectIsDefined(window, objectName);
        };

        this.$get = ['$q', function($q) {
            var loading = {};
            var loaded = [];

            var lazyload = function(type, url) {
                if (angular.isDefined(loading[url])) {
                    return loading[url];
                } else {
                    var deferred = $q.defer();
                    LazyLoad[type](url, function() {
    //                    console.log('Loaded:', url);
                        loaded.push(url);
                        deferred.resolve();
                    });
                    loading[url] = deferred;
                    return deferred;
                }
            };

            return function(name) {
                var module = lazyloading[name];
                var promises = [];

                for (var i=0; i<module.css.length; i++) {
                    if (loaded.indexOf(module.css[i]) === -1) {
                        promises.push(lazyload('css', module.css[i]).promise);
                    }
                }

                var jsDeferred = $q.defer();
                var deferredSteps = null;
                for (var j=0; j<module.js.length; j++) {
                    // Each item is a step in a sequence
                    var step = module.js[j];
                    if (!angular.isArray(step)) {
                        step = [step];
                    }

                    var stepPromises = [];
                    for (var k=0; k<step.length; k++) {
                        var parts = step[k].split('@');
                        var url;
                        if (parts.length > 1) {
                            // There is an object name whose existence we can check
                            if (isAlreadyAvailable(parts[0])) {
//                                console.log('Object ' + parts[0] + ' is already available.');
                                continue;
                            }
                            url = parts[1];
                        } else {
                            url = parts[0];
                        }
                        if (loaded.indexOf(url) === -1) {
                            stepPromises.push(lazyload('js', url).promise);
                        }
                    }
                    if (!deferredSteps) {
                        deferredSteps = $q.all(stepPromises);
                    } else {
                        deferredSteps = deferredSteps.then(function() {
                            return $q.all(stepPromises);
                        });
                    }
                }
                deferredSteps.then(function() { jsDeferred.resolve(); });
                promises.push(jsDeferred.promise);
                return $q.all(promises);
            };
        }];
    });

    mod.factory("DebugLogger", ['$window', function($window) {
        // TODO: Don't duplicate our own DebugLogger
        return {
            log: function() {
                if ($window.location.hash == '#debug' || $window.location.hash.indexOf('debug=') >= 0 || $(document.body).hasClass('showDebug')) {
                    console.log.apply(console, arguments);
                }
            }
        };
    }]);

    mod.config(['ODSWidgetsConfigProvider', function(ODSWidgetsConfigProvider) {
        // if no basepath, try to set a detected one
        // see how leaflet does it:

        /*
        L.Icon.Default.imagePath = (function () {
            var scripts = document.getElementsByTagName('script'),
                leafletRe = /[\/^]leaflet[\-\._]?([\w\-\._]*)\.js\??/;

            var i, len, src, matches, path;

            for (i = 0, len = scripts.length; i < len; i++) {
                src = scripts[i].src;
                matches = src.match(leafletRe);

                if (matches) {
                    path = src.split(leafletRe)[0];
                    return (path ? path + '/' : '') + 'images';
                }
            }
        }());
         */
    }]);

    mod.run(['translate', 'ODSWidgetsConfig', function(translate, ODSWidgetsConfig) {
        // Initialize with an empty config so that at least it doesn't crash if
        // nobody bothers to add a translation dictionary.
        translate.add({});

        if (!ODSWidgetsConfig.basePath) {
            // Try to detect the path where ODS-Widgets is loaded from
            // Kudos to Leaflet for the idea
            var scriptTags = document.getElementsByTagName('script');

            var odswidgetsRE = /[\/^]ods-widgets(\.min)?\.js\??/;

            var i, src, matches, path;
            for (i=0; i<scriptTags.length; i++) {
                src = scriptTags[i].src;
                matches = src.match(odswidgetsRE);

                if (matches) {
                    path = src.split(odswidgetsRE)[0];
                    if (!path) {
                        // Path is '/'
                        ODSWidgetsConfig.basePath = '/';
                    } else if (path.substring(path.length-3) === '.js') {
                        // This is loaded from the same folder
                        ODSWidgetsConfig.basePath = '';
                    } else {
                        ODSWidgetsConfig.basePath = path + '/';
                    }
                }
            }
        }
    }]);
}());
;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.filter('nofollow', function() {
        return function(value) {
            if (angular.isString(value)) {
                return value.replace(/<a href="/g, '<a target="_blank" rel="nofollow" href="');
            } else {
                return value;
            }
        };
    });

    mod.filter('prettyText', ['$filter', function($filter) {
        /**
         * Prepares a text value to be displayed
         */
        var re = /[<>]+/;
        // I stole this part from angular-sanitize
        var NON_ALPHANUMERIC_REGEXP = /([^\#-~| |!])/g;
        function encodeEntities(value) {
          return value.
            replace(/&/g, '&amp;').
            replace(NON_ALPHANUMERIC_REGEXP, function(value){
              return '&#' + value.charCodeAt(0) + ';';
            }).
            replace(/</g, '&lt;').
            replace(/>/g, '&gt;');
        }

        return function(value) {
            if (!value || !angular.isString(value)) {
                return value;
            }
            if (re.test(value)) {
                return encodeEntities(value);
            } else {
                return $filter('linky')(value, '_blank');
            }
        };
    }]);

    mod.filter('imagify', ['$sce', function($sce) {
        var re = /^(http(?:s?):\/\/[^;,]*(?:jpg|jpeg|png|gif))(?:$|\?.*|;|,|&)/i;
        return function(value) {
            if (angular.isString(value)) {
                value = value.trim();
                var match = re.exec(value);
                if (match !== null) {
                    // It looks like an image
                    return $sce.trustAsHtml('<img class="imagify" src="' + match[1] + '" />');
                }
            }
            return value;
        };
    }]);

    mod.filter('isDefined', function() {
        return function(value) {
            return angular.isDefined(value);
        };
    });

    mod.filter('displayImageValue', function($sce) {
        return function(value, datasetid) {
            if (!value) {
                return value;
            }
            var url = '/explore/dataset/'+datasetid+'/images/'+value.id+'/300/';

            return $sce.trustAsHtml('<img class="imagify" src="' + url + '" />');
        };
    });

    mod.filter('fieldsForVisualization', function() {
        var blacklist = {
            'table': ['image'],
            'map': ['geo_point_2d', 'geo_shape'],
            'images': ['image']
        };
        return function(fields, viz) {
            if (angular.isUndefined(fields)) { return fields; }
            if (angular.isUndefined(blacklist[viz])) {
                throw 'Unknown visualization type "' + viz + "'";
            }
            return fields.filter(function(field) { return blacklist[viz].indexOf(field.type) === -1; });
        };
    });

    mod.filter('formatFieldValue', ['$filter', function($filter) {
        var getPrecision = function(field) {
            if (field.annotations) {
                var annos = field.annotations.filter(function(anno) { return anno.name === 'timeserie_precision'; });
                if (annos.length > 0) {
                    return annos[0].args[0];
                }
            }
            return null;
        };

        return function(record, field) {

            var value = record[field.name];
            if (value === null || value === undefined) {
                return '';
            }
            if (field.type === 'int' || field.type === 'double') {
                var unit = '';
                if (field.annotations) {
                    for (var a=0; a<field.annotations.length; a++) {
                        if (field.annotations[a].name === 'unit') {
                            unit = ' ' + field.annotations[a].args[0];
                        }
                    }
                }
                return $filter('number')(value) + unit;
            } else if (field.type === 'geo_point_2d') {
                return value[0] + ', ' + value[1];
            } else if (field.type === 'geo_shape') {
                return angular.toJson(value);
            } else if (field.type === 'date') {
                var precision = getPrecision(field);
                if (precision === 'year') {
                    return $filter('moment')(value, 'YYYY');
                } else if (precision === 'month') {
                    return $filter('capitalize')($filter('moment')(value, 'MMMM YYYY'));
                }
                return $filter('moment')(value, 'LL');
            } else if (field.type === 'datetime') {
                if (value.length === 19) {
                    // Fix for legacy timestamps that don't have a timezone
                    value += 'Z';
                }
                return $filter('moment')(value, 'LLL');
            } else {
                return ''+value;
            }
        };
    }]);

    mod.filter('truncate', function() {
        return function(text, length) {
            if (!text || !angular.isString(text)) {
                return text;
            }
            if (!length) {
                length = 200;
            }
            return text.substring(0, length);
        };
    });

    mod.filter('fieldsFilter', function(){
        return function(fields, config){
            if (!fields) {
                return fields;
            }
            if(angular.isArray(config) && config.length) {
                var output = [];
                angular.forEach(config, function(fieldName){
                    var field = $.grep(fields, function(field){ return field.name === fieldName; })[0];
                    if (angular.isDefined(field)) {
                        output.push(field);
                    }
                });
                return output;
            }
            return fields;
        };
    });

    mod.filter('moment', [function() {
        return function(isoDate, format) {
            if (isoDate)
                return moment(isoDate).format(format);
        };
    }]);

    mod.filter('timesince', [function() {
        return function(isoDate) {
            if (isoDate)
                return moment(isoDate).fromNow();
        };
    }]);


    mod.filter('themeSlug', ['$filter', function($filter) {
        /*
        From a theme or a list of themes, computes the slug of the theme
         */
        return function(value) {
            if (!value || angular.isArray(value) && value.length === 0) {
                return value;
            }
            if (angular.isArray(value)) {
                value = value[0];
            }
            return $filter('slugify')($filter('normalize')(value));
        };
    }]);

    mod.filter('slugify', function(){
        return function(text){
            if (!text) {
                return text;
            }
            return ODS.StringUtils.slugify(text);
        };
    });

    mod.filter('normalize', [function() {
        // http://stackoverflow.com/questions/990904/javascript-remove-accents-in-strings
        var defaultDiacriticsRemovalMap = [
            {'base':'A', 'letters':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
            {'base':'AA','letters':/[\uA732]/g},
            {'base':'AE','letters':/[\u00C6\u01FC\u01E2]/g},
            {'base':'AO','letters':/[\uA734]/g},
            {'base':'AU','letters':/[\uA736]/g},
            {'base':'AV','letters':/[\uA738\uA73A]/g},
            {'base':'AY','letters':/[\uA73C]/g},
            {'base':'B', 'letters':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
            {'base':'C', 'letters':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
            {'base':'D', 'letters':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
            {'base':'DZ','letters':/[\u01F1\u01C4]/g},
            {'base':'Dz','letters':/[\u01F2\u01C5]/g},
            {'base':'E', 'letters':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
            {'base':'F', 'letters':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
            {'base':'G', 'letters':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
            {'base':'H', 'letters':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
            {'base':'I', 'letters':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
            {'base':'J', 'letters':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
            {'base':'K', 'letters':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
            {'base':'L', 'letters':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
            {'base':'LJ','letters':/[\u01C7]/g},
            {'base':'Lj','letters':/[\u01C8]/g},
            {'base':'M', 'letters':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
            {'base':'N', 'letters':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
            {'base':'NJ','letters':/[\u01CA]/g},
            {'base':'Nj','letters':/[\u01CB]/g},
            {'base':'O', 'letters':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
            {'base':'OI','letters':/[\u01A2]/g},
            {'base':'OO','letters':/[\uA74E]/g},
            {'base':'OU','letters':/[\u0222]/g},
            {'base':'P', 'letters':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
            {'base':'Q', 'letters':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
            {'base':'R', 'letters':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
            {'base':'S', 'letters':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
            {'base':'T', 'letters':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
            {'base':'TZ','letters':/[\uA728]/g},
            {'base':'U', 'letters':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
            {'base':'V', 'letters':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
            {'base':'VY','letters':/[\uA760]/g},
            {'base':'W', 'letters':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
            {'base':'X', 'letters':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
            {'base':'Y', 'letters':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
            {'base':'Z', 'letters':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
            {'base':'a', 'letters':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
            {'base':'aa','letters':/[\uA733]/g},
            {'base':'ae','letters':/[\u00E6\u01FD\u01E3]/g},
            {'base':'ao','letters':/[\uA735]/g},
            {'base':'au','letters':/[\uA737]/g},
            {'base':'av','letters':/[\uA739\uA73B]/g},
            {'base':'ay','letters':/[\uA73D]/g},
            {'base':'b', 'letters':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
            {'base':'c', 'letters':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
            {'base':'d', 'letters':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g},
            {'base':'dz','letters':/[\u01F3\u01C6]/g},
            {'base':'e', 'letters':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
            {'base':'f', 'letters':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
            {'base':'g', 'letters':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
            {'base':'h', 'letters':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
            {'base':'hv','letters':/[\u0195]/g},
            {'base':'i', 'letters':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
            {'base':'j', 'letters':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
            {'base':'k', 'letters':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
            {'base':'l', 'letters':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
            {'base':'lj','letters':/[\u01C9]/g},
            {'base':'m', 'letters':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
            {'base':'n', 'letters':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
            {'base':'nj','letters':/[\u01CC]/g},
            {'base':'o', 'letters':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
            {'base':'oi','letters':/[\u01A3]/g},
            {'base':'ou','letters':/[\u0223]/g},
            {'base':'oo','letters':/[\uA74F]/g},
            {'base':'p','letters':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
            {'base':'q','letters':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
            {'base':'r','letters':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
            {'base':'s','letters':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
            {'base':'t','letters':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
            {'base':'tz','letters':/[\uA729]/g},
            {'base':'u','letters':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
            {'base':'v','letters':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
            {'base':'vy','letters':/[\uA761]/g},
            {'base':'w','letters':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
            {'base':'x','letters':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
            {'base':'y','letters':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
            {'base':'z','letters':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
        ];
        return function(input) {
            if (!input) {
                return input;
            }
            for(var i=0; i<defaultDiacriticsRemovalMap.length; i++) {
                input = input.replace(defaultDiacriticsRemovalMap[i].letters, defaultDiacriticsRemovalMap[i].base);
            }
            return input;
        };
    }]);


}());;(function(target) {
    var ODS = {
        GeoFilter: {
            /*
            Types of parameters:
                Bbox: Lat-SW,Lng-SW,Lat-NE,Lng-NE
                    e.g.: "43.14,12.62642,41.32,14.63"
                Polygon: a string of a list of lat,lng fit for geofilter.polygon
                    e.g.: "(48.92994318778139,2.1636199951171875),(48.92994318778139,2.5100326538085938),(48.79125929678568,2.5100326538085938),(48.79125929678568,2.1636199951171875)"
                Bounds: an object fit for leaflet's LatLngBounds objects, typically an array of arrays
                    e.g.: [ [43.14, 12.62642], [41.32, 14.63] ]
            */
            getBboxParameterAsBounds: function(bounds) {
                /*  Input: a Bbox
                    Output: a Bounds
                 */
                var members = bounds.split(',');
                return [
                    [ members[0], members[1] ],
                    [ members[2], members[3] ]
                ];
            },
            getBoundsAsBboxParameter: function(bounds) {
                /*  Input: a Bounds
                    Output: a Bbox
                */
                if (angular.isArray(bounds)) {
                    return [ bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1] ].join(',');
                } else {
                    return [ bounds.getSouthWest().lat, bounds.getSouthWest().lng, bounds.getNorthEast().lat, bounds.getNorthEast().lng ].join(',');
                }
            },
            getBoundsAsPolygonParameter: function(bounds) {
                /*  Input: a Bounds
                    Output: a Polygon
                */
                var leafletBounds;
                if (angular.isArray(bounds)) {
                    leafletBounds = new L.LatLngBounds(bounds);
                } else {
                    leafletBounds = bounds;
                }
                var polygon = [
                    [ leafletBounds.getNorthWest().lat, leafletBounds.getNorthWest().lng ],
                    [ leafletBounds.getNorthEast().lat, leafletBounds.getNorthEast().lng ],
                    [ leafletBounds.getSouthEast().lat, leafletBounds.getSouthEast().lng ],
                    [ leafletBounds.getSouthWest().lat, leafletBounds.getSouthWest().lng ]
                ];
                var polygonBounds = [];
                for (var i=0; i<polygon.length; i++) {
                    var bound = polygon[i];
                    polygonBounds.push(bound.join(','));
                }
                var param = '('+polygonBounds.join('),(')+')';
                return param;
            },
            getPolygonParameterAsBounds: function(parameter) {
                /*  Input: a Polygon
                    Output: a Bounds
                */
                var members = parameter.replace(/[()]/g, '').split(',');
                var minlat, minlng, maxlat, maxlng;
                for (var i=0; i<members.length; i+=2) {
                    var lat = members[i];
                    var lng = members[i+1];

                    if (!minlat || minlat > lat) { minlat = lat; }
                    if (!minlng || minlng > lng) { minlng = lng; }
                    if (!maxlat || maxlat < lat) { maxlat = lat; }
                    if (!maxlng || maxlng < lng) { maxlng = lng; }
                }
                return [
                    [ minlat, minlng ],
                    [ maxlat, maxlng ]
                ];
            },
            getBboxParameterAsPolygonParameter: function(bbox) {
                /*  Input: a Bbox
                    Output: a Polygon
                */
                return this.getBoundsAsPolygonParameter(this.getBboxParameterAsBounds(bbox));
            },
            getGeoJSONPolygonAsPolygonParameter: function(geoJsonPolygon) {
                /*  Input: a GeoJSON object of type Polygon
                    Output: a Polygon
                 */
                var coordinates = geoJsonPolygon.coordinates[0];
                var polygonBounds = [];
                for (var i=0; i<coordinates.length; i++) {
                    var bound = angular.copy(coordinates[i]);
                    if (bound.length > 2) {
                        // Discard the z
                        bound.splice(2, 1);
                    }
                    bound.reverse(); // GeoJSON has reverse coordinates from the rest of us
                    polygonBounds.push(bound.join(','));
                }
                return '('+polygonBounds.join('),(')+')';
            }
        },
        StringUtils: {
            slugify: function(string) {
                if (!string) {
                    return string;
                }
                return string
                    .toLowerCase()
                    .replace(/\s+/g,'-')
                    .replace(/[^\w-]+/g,'')
                    .replace(/-+/g,'-');
            }
        },
        DatasetUtils: {
            isFieldSortable: function(field) {
                // This is in a separate function because it can be used independently from the dataset
                var supportedSortTypes = ['int', 'double', 'date', 'datetime'];
                if (supportedSortTypes.indexOf(field.type) >= 0) {
                    // These types are always sortable
                    return true;
                }
                if (field.type === 'text' && field.annotations) {
                    for (var a=0; a<field.annotations.length; a++) {
                        var anno = field.annotations[a];
                        if (anno.name === 'sortable') {
                            return true;
                        }
                    }
                }
                return false;
            }
        }
    };

    target.ODS = ODS;
})(window);;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsCatalogContext', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsCatalogContext
         * @scope
         * @restrict AE
         */

        // TODO: Ability to preset parameters, either by a JS object, or by individual parameters (e.g. context-refine=)
        return {
            restrict: 'AE',
            scope: true,
            replace: true,
            link: function(scope, element, attrs) {
                var contextNames = attrs.context.split(',');
                for (var i=0; i<contextNames.length; i++) {
                    var contextName = contextNames[i].trim();

                    // Do we have a domain ID?
                    var domain = attrs[contextName+'Domain'];

                    scope[contextName] = {
                        'name': contextName,
                        'type': 'catalog',
                        'domain': domain,
                        'domainUrl': ODSAPI.getDomainURL(domain),
                        'apikey': attrs[contextName+'Apikey'],
                        'parameters': scope.$eval(attrs[contextName+'Parameters']) || {}
                    };
                }
            }
        };
    }]);
}());;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsDatasetContext', ['ODSAPI', function(ODSAPI) {
        /**
         *
         *  @ngdoc directive
         *  @name ods-widgets.directive:odsDatasetContext
         *  @scope
         *  @restrict AE
         *  @param {string} context A name (or list of names separated by commas) of contexts to declare. The contexts are further
         *  configured using specific attributes, as described below.
         *  @description
         *  A "dataset context" represents a dataset, and a set of parameters used to query its data. A context can be used
         *  by one or more directives, so that they can share information (generally the query parameters). For example, a directive
         *  that displays a time filter can be "plugged" on the same context as a table view directive, so that the user
         *  can filter the data displayed in the table.
         *
         *  The `odsDatasetContext` creates a new child scope, and exposes its contexts into it. In other words, the contexts
         *  will be available to any directive that is inside the `odsDatasetContext` element. You can nest `odsDatasetContext` directives inside each others.
         *
         *  A single `odsDatasetContext` can declare one or more context at once. To initialize contexts, you declare
         *  them in the **context** attribute. Then, you can configure them further using attributes prefixed by the context
         *  name (**CONTEXTNAME-SETTING**, e.g. mycontext-domain). The available settings are:
         *
         *  * **`domain`** - {@type string} - (optional) Indicate the "domain" (used to construct an URL to an API root) where to find the dataset.
         * Domain value can be:
         *
         *      * a simple alphanum string (e.g. *mydomain*): it will assume it is an OpenDataSoft domain (so in this example *mydomain.opendatasoft.com*)
         *
         *      * a hostname (e.g. *data.mydomain.com*)
         *
         *      * an absolute path (e.g. _/monitoring_), it will be absolute to the hostname of the current page
         *
         *      * a hostname and a path (e.g. *data.mydomain.com/monitoring*)
         *
         *      * nothing: in that case, {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig.defaultDomain} is used
         *
         *  * **`dataset`** - {@type string} Identifier of the dataset
         *
         *  * **`apikey`** {@type string} (optional) API Key to use in every API call for this context
         *
         *  * **`parameters`** {@type Object} (optional) An object holding parameters to apply to the context when it is created.
         *
         *  * **`parametersFromContext`** {@type string} (optional) The name of a context to replicate the parameters from. Any change of the parameters
         *  in this context or the original context will be applied to both.
         *
         *  # Example
         *
         *  <pre>
         *  <ods-dataset-context context="trees" trees-dataset="trees-in-paris"></ods-dataset-context>
         *  </pre>
         *
         *  <pre>
         *  <ods-catalog-context context="trees,hydrants"
         *                       trees-dataset="trees-in-paris"
         *                       trees-domain="opendata.paris.fr"
         *                       hydrants-dataset="hydrants"
         *                       hydrants-domain="public">
         *      <!-- Shows a list of the trees -->
         *      <ods-table context="trees"></ods-table>
         *      <!-- Shows a map of hydrants -->
         *      <ods-map context="hydrants"></ods-map>
         *  </ods-catalog-context>
         *  </pre>
         */
        // TODO: Ability to preset parameters, either by a JS object, or by individual parameters (e.g. context-refine=)
        var exposeContext = function(domain, datasetID, scope, contextName, apikey, parameters, parametersFromContext) {
            var contextParams;
            if (parameters) {
                contextParams = parameters;
            } else if (parametersFromContext) {
                var unwatch = scope.$watch(parametersFromContext, function(nv, ov) {
                    if (nv) {
                        scope[contextName].parameters = nv.parameters;
                        unwatch();
                    }
                });
                contextParams = null;
            } else {
                contextParams = {};
            }
            scope[contextName] = {
                'name': contextName,
                'type': 'dataset',
                'domain': domain,
                'domainUrl': ODSAPI.getDomainURL(domain),
                'apikey': apikey,
                'dataset': null,
                'parameters': contextParams
            };
            ODSAPI.datasets.get(scope[contextName], datasetID, {extrametas: true}).
                success(function(data) {
                    scope[contextName].dataset = data;
                });
        };

        return {
            restrict: 'AE',
            scope: true,
            replace: true,
            link: function(scope, element, attrs) {
                var contextNames = attrs.context.split(',');
                for (var i=0; i<contextNames.length; i++) {
                    var contextName = contextNames[i].trim();

                    // We need a dataset ID
                    var datasetID = attrs[contextName+'Dataset'];

                    // Do we have a domain ID?
                    var domain = attrs[contextName+'Domain'];

                    if (!domain) {
                        console.log('ERROR : Context ' + contextName + ' : Missing domain parameter');
                    }
                    if (!datasetID) {
                        console.log('ERROR : Context ' + contextName + ' : Missing dataset parameter');
                    }

                    var apikey = attrs[contextName+'Apikey'];
                    var parameters = scope.$eval(attrs[contextName+'Parameters']);
                    var parametersFromContext = attrs[contextName+'ParametersFromContext'];

                    exposeContext(domain, datasetID, scope, contextName, apikey, parameters, parametersFromContext);
                }
            }
        };
    }]);

}());
;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsDisqus', ['ODSWidgetsConfig', '$location', '$window', function(ODSWidgetsConfig, $location, $window) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsDisqus
         * @restrict E
         * @scope
         * @param {string} shortname Disqus shortname for your account. If not specified, {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig.disqusShortname} will be used.
         * @param {string} [identifier=none] By default, the discussion is tied to the URL of the page. If you want to be independant from the URL, or share the discussion between two or more pages, you can define an identifier in this parameter; it is recommended by Disqus to always do it from the start.
         * @description
         * This widget shows a Disqus panel where users can comment the page.
         *
         */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                'shortname': '@',
                'identifier': '@'
            },
            template: '<div id="disqus_thread"></div>',
            link: function (scope) {
                $window.disqus_shortname = scope.shortname || ODSWidgetsConfig.disqusShortname;
                if (scope.identifier) {
                    $window.disqus_identifier = scope.identifier;
                }
                $window.disqus_url = $location.absUrl();
                $window.disqus_config = function() {
                    this.language = ODSWidgetsConfig.language;
                };

                var dsq = document.createElement('script');

                dsq.type  = 'text/javascript';
                dsq.async = true;
                dsq.src   = '//' + $window.disqus_shortname + '.disqus.com/embed.js';

                (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);

            }
        };
    }]);

}());;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsFacetEnumerator', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsFacetEnumerator
         * @scope
         * @restrict E
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} facetName Name of the facet to enumerate
         * @description
         * This widget enumerates the values ("categories") of a facet and repeats the template (the content of the directive element) for each of them. For each facet category, the following AngularJS variables are available:
         *
         *  * item.name : the label of the category
         *  * item.path : the path to use to refine on this category
         *  * item.state : "displayed" or "refined"
         *  * item.count : the number of records in this category
         *
         * # Example
         *  <pre>
         *  <ods-facet-enumerator context="bla" facet="themes">
         *      <div style="display: inline-block; width: 64px; height: 64px;">
         *          {{ facet.name }} ({{ facet.count }}
         *      </div>
         *  </ods-facet-enumerator>
         *  </pre>
         */
        /**
        <ods-facet-enumerator context="bla" facet="themes">
            <div style="display: inline-block; width: 64px; height: 64px;">
                {{ facet.name }} ({{ facet.count }}
            </div>
        </ods-facet-enumerator>
         */

        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            scope: {
                context: '=',
                facetName: '@'
            },
            template: '<div class="odswidget-facet-enumerator">' +
                '<div ng-repeat="item in items" ng-transclude class="item"></div>' +
                '</div>',
            controller: function($scope) {
                var init = $scope.$watch('context', function(nv) {
                    if (nv.type === 'catalog') {
                        ODSAPI.datasets.facets(nv, $scope.facetName).success(function(data) {
                            if (data.facet_groups) {
                                $scope.items = data.facet_groups[0].facets;
                            } else {
                                $scope.items = [];
                            }
                        });
                    }
                    init();
                });
            }
        };
    }]);

}());
;(function() {
    'use strict';

    angular.module('ods-widgets')
        .directive('odsGeotooltip', ['$timeout', 'ModuleLazyLoader', function ($timeout, ModuleLazyLoader) {
            /**
             * @ngdoc directive
             * @name ods-widgets.directive:odsGeotooltip
             * @scope
             * @restrict E
             * @param {Array|string} coords Coordinates of a point to display in the tooltip; either an array of two numbers as [latitude, longitude], or a string under the form of "latitude,longitude".
             * If you use a string, surround it with simple quotes to ensure Angular treats it as a string.
             * @param {Object} geojson GeoJSON object of a shape to display in the tooltip.
             * @param {number} [width=200] Width of the tooltip, in pixels.
             * @param {number} [height=200] Height of the tooltip, in pixels.
             * @param {number} [delay=500] Delay before the tooltip appears on hover, in milliseconds.
             *
             * @description
             * This directive, when used to surround a text, displays a tooltip showing a point and/or a shape in a map.
             *
             * # Example
             * <pre>
             * <ods-geotooltip coords="'48,2'">my location</ods-geotooltip>
             * <ods-geotooltip coords="[48.04,2.12434]">my other location</ods-geotooltip>
             * </pre>
             */
            // The container is shared between directives to avoid performance issues
            var container = angular.element('<div id="geotooltip" style="opacity: 0; transition: opacity 200ms ease-out; position: fixed; z-index: 40000; visibility: hidden;"></div>');
            var map = null;
            var layerGroup = null;

            var displayTooltip = function(tippedElement, width, height, coords, geoJson) {
                // Make the container the right size
                var resized = false;
                if (width !== container.css('width') || height !== container.css('height')) {
                    resized = true;
                }
                container.css('width', width);
                container.css('height', height);

                // Position it at the right place
                var availableBottomSpace = jQuery(window).height()-(tippedElement.offset().top-jQuery(document).scrollTop());
                if (container.height() < availableBottomSpace) {
                    // There is enough space below: let's place the tooltip right below the element
                    container.css('top', tippedElement.height()+tippedElement.offset().top-jQuery(document).scrollTop()+5+'px');
                } else {
                    container.css('top', tippedElement.offset().top-jQuery(document).scrollTop()-5-container.height()+'px');
                }
                var availableRightSpace = jQuery(window).width()-(tippedElement.offset().left-jQuery(document).scrollLeft());
                if (container.width() < availableRightSpace) {
                    container.css('left', tippedElement.offset().left-jQuery(document).scrollLeft()+'px');
                } else {
                    container.css('left', tippedElement.offset().left-jQuery(document).scrollLeft()-container.width()+'px');
                }
                tippedElement.after(container);

                if (map === null) {
                    map = new L.map(container[0], {zoomControl: false});
                    var tileLayer = new L.TileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.png', {
                        minZoom: 1,
                        maxZoom: 16,
                        attribution: 'Tiles <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png"> - Map data © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a>',
                        subdomains: '1234'
                    });
                    map.addLayer(tileLayer);
                } else if (resized) {
                    map.invalidateSize();
                }

                if (layerGroup !== null) {
                    map.removeLayer(layerGroup);
                }
                layerGroup = L.layerGroup();
                var bounds = new L.LatLngBounds();

                if (coords) {
                    if (angular.isString(coords)) {
                        coords = coords.split(',');
                    }
                    var point = new L.LatLng(coords[0], coords[1]);
                    var pointLayer = L.marker(point);
                    layerGroup.addLayer(pointLayer);
                    bounds.extend(point);
                }

                if (geoJson) {
                    if (angular.isString(geoJson)) {
                        geoJson = angular.fromJson(geoJson);
                    }
                    var geoJsonLayer = L.geoJson(geoJson);
                    layerGroup.addLayer(geoJsonLayer);
                    bounds.extend(geoJsonLayer.getBounds());
                }

                layerGroup.addTo(map);
                map.fitBounds(bounds, {reset: true});
                container.css('opacity', '1');
                container.css('visibility', 'visible');
            };

            var hideTooltip = function() {
                container.css('opacity', '0');
                $timeout(function() {
                    container.css('visibility', 'hidden');
                }, 200);
            };

            return {
                template: '<span ng-transclude style="border-bottom: 1px dotted #000000; cursor: help;" class="geotooltip"></span>',
                replace: true,
                restrict: 'E',
                transclude: true,
                scope: {
                    'coords': '=',
                    'width': '@',
                    'height': '@',
                    'delay': '@',
                    'geojson': '='
                },
                link: function(scope, element, attrs) {
                    ModuleLazyLoader('leaflet').then(function() {
                        var tooltipWidth = (attrs.width || 200) + 'px';
                        var tooltipHeight = (attrs.height || 200) + 'px';
                        var tooltipPop = null;
                        var delay = attrs.delay || 500;

                        // Events
                        element.bind('mouseenter', function() {
                            if (delay === 0) {
                                displayTooltip(element, tooltipWidth, tooltipHeight, scope.coords, scope.geojson);
                            } else {
                                tooltipPop = $timeout(function() {
                                    displayTooltip(element, tooltipWidth, tooltipHeight, scope.coords, scope.geojson);
                                    tooltipPop = null;
                                }, delay);
                            }
                        });
                        element.bind('click', function() {
                            displayTooltip(element, tooltipWidth, tooltipHeight, scope.coords, scope.geojson);
                            if (tooltipPop !== null) {
                                // Chances are we triggered the original timer
                                $timeout.cancel(tooltipPop);
                                tooltipPop = null;
                            }
                        });
                        element.bind('mouseleave', function() {
                            hideTooltip();
                            if (tooltipPop !== null) {
                                // We are currently counting down until the tooltip appearance, let's forget it
                                $timeout.cancel(tooltipPop);
                                tooltipPop = null;
                            }

                        });
                    });
                }
            };
        }]);
}());;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive("odsChart", ['ODSAPI', '$q', 'translate', 'ModuleLazyLoader', function(ODSAPI, $q, translate, ModuleLazyLoader) {
        // parameters : {
        //     timescale: year, month, week, day, hour, month year, day year, day month, day week
        //     xLabel:
        //     singleAxis:
        //     singleAxisScale:
        //     singleAxisLabel:
        //     queries : [
        //         {
        //             config: {
        //                 dataset:
        //                 options:
        //             },
        //             xAxis:
        //             timescale:
        //             sort:
        //             maxpoints:
        //             charts: [
        //                 {
        //                     type:
        //                     [charts:]
        //                     yAxis:
        //                     yLabel:
        //                     func:
        //                     [subsets:]
        //                     scale:
        //                     color:
        //                     extras:
        //                     cumulative:
        //                 },
        //                 ...
        //             ]
        //         },
        //         ...
        //     ]
        // }
        return {
            restrict: 'A',
            // scope: true,
            replace: true,
            scope: {
                parameters: '=odsChart',
                domain: '=',
                apikey: '='
            },
            template: '<div class="ods-chart"><div class="chartplaceholder"></div><debug data="chartoptions"></debug></div>',
            link: function(scope, element, attrs) {
                var chartplaceholder = element.find('.chartplaceholder');
                ModuleLazyLoader('highcharts').then(function() {
                    Highcharts.setOptions({
                        global: {useUTC: false},
                        plotOptions: {
                            pie: {
                                tooltip: {
                                    pointFormat: '{series.name}: <b>{point.y} ({point.percentage:.1f}%)</b>'
                                }
                            }
                        }
                    });
                    function formatRowX(value){
                        if (periodic) {
                            console.warn('formatRowX on periodic value should not be used anymore');
                            switch(periodic){
                                // FIXME should compute a proper date
                                case 'month':
                                    return [
                                    translate('Jan'),
                                    translate('Feb'),
                                    translate('Mar'),
                                    translate('Apr'),
                                    translate('May'),
                                    translate('Jun'),
                                    translate('Jul'),
                                    translate('Aug'),
                                    translate('Sep'),
                                    translate('Oct'),
                                    translate('Nov'),
                                    translate('Dec')][value.month - 1];
                                case 'weekday':
                                    return [
                                    translate('Monday'),
                                    translate('Tuesday'),
                                    translate('Wednesday'),
                                    translate('Thursday'),
                                    translate('Friday'),
                                    translate('Saturday'),
                                    translate('Sunday')][value.weekday];
                                case 'day':
                                    return value.day;
                                default:
                                    return value;
                            }
                        } else {
                            return value;
                        }
                    }

                    var timeSerieMode, precision, periodic;
                    // scope.parameters = scope.$eval(attrs.chart);
                    scope.$watch('parameters',function(nv, ov){
                        timeSerieMode = undefined;
                        precision = undefined;
                        periodic = undefined;
                        if(nv && nv.queries && nv.queries.length){
                            var options = {
                                chart: {},
                                title: {text: ''},
                                // legend: {enabled: false},
                                credits: {enabled: false},
                                colors: [],
                                series: [],
                                xAxis: {
                                    title: {
                                        text: scope.parameters.xLabel || scope.parameters.queries[0].xAxis // all charts must use the same xAxis
                                    },
                                    labels: {
                                        rotation: -45,
                                        align: 'right'
                                    },
                                    minPadding: 0,
                                    maxPadding: 0
                                    // startOnTick: true,
                                    // endOnTick: true,
                                },
                                yAxis: [],
                                plotOptions: {
                                    columnrange: {
                                        pointPadding: 0,
                                        groupPadding: 0,
                                        borderWidth: 0
                                    }
                                },
                                tooltip: {
                                    valueDecimals: 2,
                                    formatter: function (tooltip) {
                                        var items = this.points || angular.isArray(this) ? this : [this],
                                            series = items[0].series,
                                            s;

                                        // build the header
                                        s = [series.tooltipHeaderFormatter(items[0])];

                                        // build the values
                                        angular.forEach(items, function (item) {
                                            series = item.series;
                                            var value = (series.tooltipFormatter && series.tooltipFormatter(item)) || item.point.tooltipFormatter(series.tooltipOptions.pointFormat);
                                            value = value.replace(/(\.|,)00</, '<');
                                            s.push(value);
                                        });
                                        // footer
                                        s.push(tooltip.options.footerFormat || '');

                                        return s.join('');
                                    }
                                }
                            };
                            scope.chartoptions = options;

                            // is it a timeSerie ? with default sort
                            if(scope.parameters.timescale && $.grep(scope.parameters.queries, function(query){return query.sort;}).length === 0){
                                 timeSerieMode = scope.parameters.timescale;
                                 var tokens = timeSerieMode.split(' ');
                                 precision = tokens[0];
                                 periodic = tokens.length == 2 ? tokens[1] : '';
                            }

                            if (precision) {
                                options.xAxis.type = 'datetime';
                                options.xAxis.maxZoom = 3600000; // fourteen days
                                options.chart.zoomType = 'xy';
                            } else {
                                options.xAxis.categories = [];
                            }

                            var yAxisesIndexes = {};

                            // fetch all data with search options
                            var search_promises = [];

                            if(scope.parameters.singleAxis) {
                                options.yAxis.push({
                                    title: {
                                        text: scope.parameters.singleAxisLabel || ""
                                    },
                                    type: scope.parameters.singleAxisScale || "linear"
                                });
                            }
                            angular.forEach(scope.parameters.queries, function(query){
                                var search_options = {
                                    dataset: query.config.dataset,
                                    x: query.xAxis,
                                    sort: query.sort || '',
                                    maxpoints: query.maxpoints || ''
                                };
                                if (timeSerieMode){
                                    search_options.precision = precision;
                                    search_options.periodic = periodic;
                                }

                                // is there a timescale override ?
                                if(query.timescale){
                                     var tokens = query.timescale.split(' ');
                                     search_options.precision = tokens[0];
                                     search_options.periodic = tokens.length == 2 ? tokens[1] : '';
                                }

                                yAxisesIndexes[query.config.dataset] = {};

                                angular.forEach(query.charts, function(chart, index){
                                    if(['arearange', 'areasplinerange', 'columnrange'].indexOf(chart.type) >= 0){
                                        chart.func = 'COUNT';
                                        if(!chart.charts){
                                            chart.charts = [
                                                {
                                                    func: 'MIN',
                                                    expr: chart.yAxis
                                                },
                                                {
                                                    func: 'MAX',
                                                    expr: chart.yAxis
                                                }
                                            ];
                                        }
                                        if(chart.charts[0].func === 'QUANTILES' && !chart.charts[0].subsets){
                                            chart.charts[0].subsets = 5;
                                        }
                                        if(chart.charts[1].func === 'QUANTILES' && !chart.charts[1].subsets){
                                            chart.charts[1].subsets = 95;
                                        }
                                        $.each(chart.charts[0], function(key, value){
                                            search_options['y.serie' + (index+1) + 'min.'+key] = value;
                                        });
                                        $.each(chart.charts[1], function(key, value){
                                            search_options['y.serie' + (index+1) + 'max.'+key] = value;
                                        });

                                        if(query.sort ===  'serie' + (index+1)) {
                                            // cannot sort on range
                                            search_options.sort = '';
                                        }
                                    } else {
                                        if(chart.charts){
                                            delete chart.charts;
                                        }
                                        search_options['y.serie' + (index+1) + '.expr'] = chart.yAxis;
                                        search_options['y.serie' + (index+1) + '.func'] = chart.func;
                                        search_options['y.serie' + (index+1) + '.cumulative'] = chart.cumulative || false;
                                        if(chart.func === 'QUANTILES'){
                                            if (!chart.subsets){
                                                chart.subsets = 50;
                                            }
                                            search_options['y.serie' + (index+1) + '.subsets'] = chart.subsets;
                                        }
                                    }

                                    if(!scope.parameters.singleAxis && angular.isUndefined(yAxisesIndexes[query.config.dataset][chart.yAxis])){
                                        // we dont yet have an axis for this column :
                                        // Create axis and register it in yAxisesIndexes
                                        yAxisesIndexes[query.config.dataset][chart.yAxis] = options.yAxis.push({
                                           // labels:
                                           title: {
                                               text: chart.yLabel,
                                               style: {
                                                   color: chart.color
                                               }
                                           },
                                           labels: {
                                               style: {
                                                   color: chart.color
                                               }
                                           },
                                           type: chart.scale || 'linear',
                                           opposite: !!(options.yAxis.length)  //boolean casting
                                        }) - 1;
                                    }

                                    // instantiate series
                                    options.series.push($.extend({}, {
                                        name: chart.yLabel,
                                        color: chart.color,
                                        type: chart.type,
                                        yAxis: scope.parameters.singleAxis ? 0 : yAxisesIndexes[query.config.dataset][chart.yAxis],
                                        marker: { enabled: false },
                                        shadow: false,
                                        tooltip: {},
                                        data: []
                                    }, chart.extras));

                                    if( chart.type == 'bar') {
                                        // bar chart invert axis, thus we have to cancel the label rotation
                                        options.xAxis.labels.rotation = 0;
                                    }
                                    options.colors.push(chart.color);
                                });

                                // Analyse request
                                // We have to build virtual contexts from parameters because we can source charts from multiple
                                // datasets.
                                var virtualContext = {
                                    domain: scope.domain,
                                    domainUrl: ODSAPI.getDomainURL(scope.domain),
                                    dataset: {'datasetid': search_options.dataset},
                                    apikey: scope.apikey,
                                    parameters: {}
                                };

                                search_promises.push(ODSAPI.records.analyze(virtualContext, angular.extend({}, query.config.options, search_options)));
                            });

                            // wait for all datas to come back
                            $q.all(search_promises).then(function(http_calls){
                                // compute
                                var series_index = 0;

                                // If there is both periodic & datetime timescale, we need to find the min date to properly offset the periodic data
                                var minDate;
                                if (precision) {
                                    angular.forEach(http_calls, function(http_call, index){
                                        var nb_series = scope.parameters.queries[index].charts.length;
                                        for (var i=0; i < http_call.data.length; i++) {
                                            var row = http_call.data[i];

                                            if(row.x.year){
                                                var date = new Date(row.x.year, row.x.month-1 || 0, row.x.day || 1, row.x.hour || 0, row.x.minute || 0);
                                                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#Two digit years
                                                date.setFullYear(row.x.year);
                                                if(minDate === undefined || date < minDate) {
                                                    minDate = date;
                                                }
                                            }
                                        }
                                    });
                                }

                                function getValue(value, chart){
                                    if(chart.subsets) {
                                        return value[chart.subsets];
                                    } else {
                                        return value;
                                    }
                                }

                                angular.forEach(http_calls, function(http_call, index){
                                    // transform data format to a format understood by the chart plugin
                                    var nb_series = scope.parameters.queries[index].charts.length;

                                    for (var i=0; i < http_call.data.length; i++) {
                                        var row = http_call.data[i];
                                        for (var j=0; j < nb_series; j++) {
                                            var chart = scope.parameters.queries[index].charts[j];
                                            if (precision) {
                                                // options.series[series_index + j].pointPlacement = 'between';
                                                options.series[series_index + j].pointPadding = 0;
                                                options.series[series_index + j].groupPadding = 0;
                                                options.series[series_index + j].borderWidth = 0;

                                                // TimeSerie structure is different
                                                // push row data into proper serie data array
                                                var date;
                                                // default to 2000 because it's a leap year
                                                date = new Date(row.x.year || 2000, row.x.month-1 || 0, row.x.day || 1, row.x.hour || 0, row.x.minute || 0);
                                                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#Two digit years
                                                date.setFullYear(row.x.year || 2000);
                                                if(! ('year' in row.x)){
                                                    if(minDate){
                                                        date.setYear(minDate.getFullYear());
                                                    }
                                                    if('month' in row.x){
                                                        options.series[series_index + j].tooltip.xDateFormat = '%B';
                                                    }
                                                    if('day' in row.x){
                                                        if('month' in row.x){
                                                            options.series[series_index + j].tooltip.xDateFormat = '%e %B';
                                                        } else {
                                                            options.series[series_index + j].tooltip.xDateFormat = '%e';
                                                        }
                                                    }
                                                    if('weekday' in row.x){
                                                        date.setDate(date.getDate() - (date.getDay() - 1) + row.x.weekday); // a bit ugly
                                                        // need to set a date that starts with a monday, then add the weekday offset ?
                                                        options.series[series_index + j].tooltip.xDateFormat = '%a';
                                                    }
                                                    if('hour' in row.x){
                                                         options.series[series_index + j].tooltip.xDateFormat = '%Hh';
                                                    }
                                                } else {
                                                    var pattern = '';
                                                    if('day' in row.x){
                                                        pattern += ' %e';
                                                    }
                                                    if('month' in row.x){
                                                        pattern += ' %B';
                                                    }
                                                    pattern += ' %Y';

                                                    if('hour' in row.x){
                                                        if('minute' in row.x){
                                                             pattern += ' %Hh%M';
                                                        } else {
                                                            pattern +=' %Hh';
                                                        }
                                                    }
                                                    options.series[series_index + j].tooltip.xDateFormat = pattern;
                                                }

                                                if('month' in row.x){
                                                    options.series[series_index + j].pointRange = 30.5*24*3600*1000;
                                                }
                                                if('day' in row.x){
                                                    // handle bisextil years
                                                    if(row.x.day == 29 && row.x.month == 2) {
                                                        date.setDate(28);
                                                        date.setMonth(1);
                                                    }
                                                    options.series[series_index + j].pointRange = 24*3600*1000;
                                                } else {
                                                    if('month' in row.x){
                                                        date.setDate(16);
                                                    }
                                                }
                                                if('weekday' in row.x){
                                                    options.series[series_index + j].pointRange = 24*3600*1000;
                                                }
                                                if('hour' in row.x){
                                                     options.series[series_index + j].pointRange = 3600*1000;
                                                }

                                                if(['arearange', 'areasplinerange', 'columnrange'].indexOf(options.series[series_index + j].type) >= 0){
                                                    options.series[series_index + j].data.push([date.getTime(), getValue(row["serie"+(j+1)+"min"], chart.charts[0]), getValue(row["serie"+(j+1)+"max"], chart.charts[1])]);
                                                } else {
                                                    options.series[series_index + j].data.push([date.getTime(), getValue(row["serie"+(j+1)], chart)]);
                                                }
                                            } else {
                                                // push row data into proper serie data array
                                                if(options.series[series_index + j].type == 'pie') {
                                                    options.series[series_index + j].data.push([formatRowX(row.x) , getValue(row["serie"+(j+1)], chart)]);
                                                } else {
                                                    if(['arearange', 'areasplinerange', 'columnrange'].indexOf(options.series[series_index + j].type) >= 0){
                                                        options.series[series_index + j].data.push([getValue(row["serie"+(j+1)+"min"], chart.charts[0]), getValue(row["serie"+(j+1)+"max"], chart.charts[1])]);
                                                    } else {
                                                        options.series[series_index + j].data.push(getValue(row["serie"+(j+1)], chart));
                                                    }
                                                }
                                            }
                                        }
                                        if(!precision){
                                            options.xAxis.categories.push(formatRowX(row.x));
                                        }
                                    }
                                    series_index += nb_series;
                                });

                                // render the charts
                                try {
                                    chartplaceholder.css('height', chartplaceholder.height());
                                    scope.chart = chartplaceholder.highcharts(options);
                                    chartplaceholder.css('height', '');
                                } catch (errorMsg) {
                                    if(errorMsg.indexOf('Highcharts error #19') === 0){
                                        // too many ticks
                                        angular.forEach(scope.parameters.queries, function(query){
                                            query.maxpoints = 20;
                                        });
                                    }
                                }
                            });
                        }
                    }, true);
                });
            }
        };
    }]);


    mod.directive('odsHighcharts', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsHighcharts
         * @restrict E
         * @scope
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} fieldX Name of the field used for the X axis
         * @param {string} expressionY Expression for the Y axis, typically a field name. Optional if the function (function-y) is 'COUNT'.
         * @param {string} functionY Function applied to the expression for the Y axis: AVG, COUNT, MIN, MAX, STDDEV, SUM
         * @param {string} timescale If the X axis is time-based, then you can specify the timescale (year, month, week, day, hour)
         * @param {string} chartType One of the following chart types: line, spline, area, areaspline, column, bar, pie
         * @param {string} color The color (or comma-separated list of colors in case of a pie chart) to draw the chart in. Colors are in hex color code (e.g. *#2f7ed8*).
         * If not specified, the colors from {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig.chartColors} will be used if they are configured, else Highcharts default colors.
         * @param {string} [sort=none] How to sort the data in the chart: *x* or *-x* to sort or reverse sort on the X axis; *y* or *-y* to sort or reverse sort on the Y axis.
         * @param {number} [maxpoints=50] Maximum number of points to chart.
         * @param {string|Object} [chartConfig=none] a complete configuration, as a object or as a base64 string. The parameter directly expects an angular expression, so a base64 string needs to be quoted. If this parameter is present, all the other parameters are ignored, and the chart will not change if the context changes.
         *
         * @description
         * This widget can be used to integrate a visualization based on Highcharts.
         *
         * # Example
         * <pre>
         * <ods-highcharts chart-type="column" context="monitoring" expression-y="size_res" field-x="request_time" function-y="AVG" timescale="day"></ods-highcharts>
         * </pre>
         */
        var defaultColors = [
            '#2f7ed8',
            '#0d233a',
            '#8bbc21',
            '#910000',
            '#1aadce',
            '#492970',
            '#f28f43',
            '#77a1e5',
            '#c42525',
            '#a6c96a'
        ];

        return {
            restrict: 'E',
            scope: {
                context: '=',
                fieldX: '@',
                expressionY: '@',
                functionY: '@',
                timescale: '@',
                chartType: '@',
                color: '@',
                chartConfig: '=',
                labelX: '@',
                labelY: '@',
                sort: '@',
                maxpoints: '@'
            },
            replace: true,
            template: '<div class="odswidget-highcharts"><div ods-chart="chart" domain="context.domain" apikey="context.apikey"></div></div>',
            controller: ['$scope', 'ODSWidgetsConfig', function($scope, ODSWidgetsConfig) {
                var color = ODSWidgetsConfig.chartColors || defaultColors;
                if ($scope.color) {
                    color = $scope.color.split(',').map(function(item) { return item.trim(); });
                }
                var unwatch = $scope.$watch('context.dataset', function(nv) {
                    if (nv) {
                        if ($scope.context.type !== 'dataset') {
                            console.error('ods-highcharts requires a Dataset Context');
                        }
                        if (angular.isUndefined($scope.chartConfig)) {
                            var extras = {};
                            if ($scope.chartType === 'pie') {
                                extras = {colors: color};
                            }
                            // Sort: x, -x, y, -y
                            var sort = '';
                            if ($scope.sort === 'y') {
                                sort = 'serie1';
                            } else if ($scope.sort === '-y') {
                                sort = '-serie1';
                            } else {
                                sort = $scope.sort;
                            }
                            $scope.chart = {
                                timescale: $scope.timescale,
                                xLabel: $scope.labelX,
                                queries : [
                                    {
                                        config: {
                                            dataset: $scope.context.dataset.datasetid,
                                            options: $scope.context.parameters
                                        },
                                        xAxis: $scope.fieldX,
                                        sort: sort,
                                        maxpoints: $scope.maxpoints || 50,
                                        charts: [
                                            {
                                                yAxis: $scope.expressionY,
                                                yLabel: $scope.labelY,
                                                func: $scope.functionY,
                                                color: color[0],
                                                type: $scope.chartType,
                                                extras: extras
                                            }
                                        ]
                                    }
                                ]
                            };
                        } else {
                            if (angular.isString($scope.chartConfig)) {
                                $scope.chart = JSON.parse(atob($scope.chartConfig));
                            } else {
                                $scope.chart = $scope.chartConfig;
                            }
                        }
                        unwatch();
                    }
                });
            }]
        };
    });

    mod.directive('odsMultiHighcharts', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsMultiHighcharts
         * @restrict E
         * @scope
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @param {string|Object} [chartConfig=none] A complete configuration, as a object or as a base64 string. The parameter directly expects an angular expression, so a base64 string needs to be quoted.
         * @description
         * This widget can display a multiple chart generated using the "Charts" interface of OpenDataSoft.
         *
         */
        return {
            restrict: 'E',
            scope: {
                context: '=',
                chartConfig: '='
            },
            replace: true,
            template: '<div class="odswidget-multihighcharts"><div ods-chart="chart" domain="context.domain" apikey="context.apikey"></div></div>',
            controller: ['$scope', function($scope) {
                var unwatch = $scope.$watch('context', function(nv) {
                    if (!nv) return;
                    if (nv.type !== 'catalog') {
                        console.error('ods-multi-highcharts requires a Catalog Context');
                    }
                    if (angular.isString($scope.chartConfig)) {
                        $scope.chart = JSON.parse(atob($scope.chartConfig));
                    } else {
                        $scope.chart = $scope.chartConfig;
                    }
                    unwatch();
                });
            }]
        };
    });

}());
;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsLastDatasetsFeed', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsLastDatasetsFeed
         * @scope
         * @restrict E
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @description
         * This widget displays the last 5 datasets of a catalog, based on the *modified* metadata.
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget-last-datasets-feed">' +
                '<ul>' +
                '   <li class="no-data" ng-hide="datasets" translate>No data available yet</li>' +
                '   <li ng-repeat="dataset in datasets" ng-if="datasets">' +
                '       <ods-theme-picto theme="{{dataset.metas.theme}}"></ods-theme-picto>' +
                '       <div class="dataset-details">' +
                '           <div class="title"><a ng-href="/explore/dataset/{{dataset.datasetid}}/" target="_self">{{ dataset.metas.title }}</a></div>' +
                '           <div class="modified"><span title="{{ dataset.metas.modified|moment:\'LLL\' }}"><i class="icon-calendar"></i> <translate>Modified</translate> {{ dataset.metas.modified|timesince }}</span></div>' +
                '       </div>' +
                '   </li>' +
                '</ul>' +
                '</div>',
            scope: {
                context: '='
            },
            controller: ['$scope', function($scope) {
                var refresh = function() {
                    ODSAPI.datasets.search($scope.context, {'rows': 5, 'sort': 'modified'}).
                        success(function(data) {
                            $scope.datasets = data.datasets;
                        });
                };
                $scope.$watch('context', function() {
                    refresh();
                });
            }]
        };
    }]);

}());;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsLastReusesFeed', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsLastReusesFeed
         * @scope
         * @restrict E
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @description
         * This widget displays the last 5 reuses published on a domain.
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget-last-reuses-feed">' +
                '<ul>' +
                '   <li class="no-data" ng-hide="reuses" translate>No data available yet</li>' +
                '   <li ng-repeat="reuse in reuses" ng-if="reuses">' +
                '       <div class="reuse-thumbnail">' +
                '           <span style="display: inline-block; height: 100%; vertical-align: middle;"></span>' +
                '           <a ng-href="/explore/dataset/{{reuse.dataset.id}}/" target="_self"><img ng-if="reuse.thumbnail" ng-src="{{ reuse.thumbnail }}"></a>' +
                '       </div>' +
                '       <div class="reuse-details">' +
                '           <div class="title"><a ng-href="/explore/dataset/{{reuse.dataset.id}}/" target="_self">{{ reuse.title }}</a></div>' +
                '           <div class="dataset"><a ng-href="/explore/dataset/{{reuse.dataset.id}}/" target="_self">{{ reuse.dataset.title }}</a></div>' +
                '           <div class="modified"><span title="{{ reuse.created_at|moment:\'LLL\' }}"><i class="icon-calendar"></i> {{ reuse.created_at|timesince }}</span></div>' +
                '       </div>' +
                '   </li>' +
                '</ul>' +
                '</div>',
            scope: {
                context: '='
            },
            controller: ['$scope', function($scope) {
                var refresh = function() {
                    // TODO: If the context is a dataset-context
                    ODSAPI.reuses($scope.context, {'rows': 5, 'sort': 'modified'}).
                        success(function(data) {
                            $scope.reuses = data;
                        });
                };
                $scope.$watch('context', function() {
                    refresh();
                });
            }]
        };
    }]);

}());;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMap', ['ModuleLazyLoader', function(ModuleLazyLoader) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsMap
         * @restrict E
         * @scope
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {boolean} [autoResize=false] If true, the map will attempt to resize itself to always take up all the space to the bottom of the viewport.
         * It is only useful in very specific cases, when the map is the main focus of the page and should take all the window real estate available.
         * @param {string} [location=none] Initial location of the map, under the format "zoom,latitude,longitude" (e.g. *12,48.85887,2.3292*)
         * @param {string} [basemap=default basemap] Identifier of the basemap to apply. Basemaps are configured using {@link ods-widgets.ODSWidgetsConfigProvider ODSWidgetsConfig.basemaps}.
         * @param {boolean} [isStatic=false] If true, the map can't be panned or zoomed; in other words the map is static and can only show the initial view. Interaction with the data is still active,
         * for example you can still click on a marker to have a tooltip.
         * @param {boolean} [showFilters=false] If true, displays additional tools to use the map to filter the data in the context. For example if you use a table and a map on the same context,
         * this makes you able to use the map to refine the data displayed in the table.
         * @param {Object} [mapContext=none] An object that you can use to share the map state (location and basemap) between two or more table widgets when they are not in the same context.
         *
         */
        return {
            restrict: 'E',
            scope: {
                context: '=',
                embedMode: '@', // FIXME: This concept is not useful, we could remove it and use the more explicit settings to achieve the same effects
                autoResize: '@',
                mapContext: '=?',
                location: '@',
                basemap: '@',
                isStatic: '@',
                showFilters: '@'
            },
            replace: true,
            transclude: true,
            template: '<div class="odswidget-map">' +
                        '<div class="map"></div>' +
                        '<div class="overlay map opaque-overlay" ng-show="pendingRequests.length && initialLoading"><spinner class="spinner"></spinner></div>' +
                    '</div>',
            link: function(scope, element) {
                if (angular.isUndefined(scope.mapContext)) {
                    scope.mapContext = {};
                    if (scope.location) {
                        scope.mapContext.location = scope.location;
                    }
                    if (scope.basemap) {
                        scope.mapContext.basemap = scope.basemap;
                    }
                }

                function resizeMap(){
                    if ($('.odswidget-map > .map').length > 0) {
                        // Only do this if visible
                        $('.odswidget-map > .map').height(Math.max(300, $(window).height() - $('.odswidget-map > .map').offset().top));
                    }
                }
                if (scope.autoResize === 'true') {
                    $(window).on('resize', resizeMap);
                    resizeMap();
                }
                ModuleLazyLoader('leaflet').then(function() {
                    // Define the "Filter By Map View" button
                    L.Control.FilterByView = L.Control.extend({
                        options: {
                            position: 'topright'
                        },

                        onAdd: function (map) {
                            var className = 'leaflet-control-filterview',
                                classNames = className + ' leaflet-bar leaflet-control',
                                container = L.DomUtil.create('div', classNames);

                            var link = L.DomUtil.create('a', 'leaflet-bar-part', container);
                            link.href = '#';
                            //link.title = 'Filter the data to what you see on the map';

                            if (scope.mapViewFilter) {
                                container.className = classNames + ' active';
                            }

                            L.DomEvent
                                .on(link, 'click', L.DomEvent.stopPropagation)
                                .on(link, 'click', L.DomEvent.preventDefault)
                                .on(link, 'click', function() {
                                    // Toggle the active filter view
                                    scope.$apply(function(scope) {
                                        scope.mapViewFilter = !scope.mapViewFilter;
                                    });
                                    if (scope.mapViewFilter) {
                                        container.className = classNames + ' active';
                                    } else {
                                        container.className = classNames;
                                    }
                                    return false;
                                })
                                .on(link, 'dblclick', L.DomEvent.stopPropagation);

                            scope.$watch('mapViewFilter', function(newValue, oldValue) {
                                // Change the button style if the filter is deactivated from outside
                                if (newValue === oldValue) return;
                                if (newValue) {
                                    container.className = classNames + ' active';
                                } else {
                                    container.className = classNames;
                                }
                            });
                            // FIXME: Plug it to a working ods-tooltip
//                            if ($) {
//                                $(link).tooltip({
//                                    placement: 'left',
//                                    title: '<div style="white-space: nowrap; width: auto;" translate>Filter the data to what you see on the map</div>',
//                                    html: true
//                                });
//                            }

                            return container;
                        }

                    });

                    scope.initMap = function(dataset, embedMode, basemapsList, translate, geobox, basemap, staticMap, prependAttribution) {

                        var mapOptions = {
                            basemapsList: basemapsList,
                            worldCopyJump: true,
                            minZoom: 2,
                            basemap: basemap,
                            dragging: !staticMap,
                            zoomControl: !staticMap,
                            prependAttribution: prependAttribution
                        };

                        if (staticMap) {
                            mapOptions.doubleClickZoom = false;
                            mapOptions.scrollWheelZoom = false;
                        }
                        var map = new L.ODSMap(element.children()[0], mapOptions);

    //                    map.setView(new L.LatLng(48.8567, 2.3508),13);
                        map.addControl(new L.Control.Scale());
                        if (embedMode !== 'true') {
                            if (scope.showFilters === 'true') {
                                map.addControl(new L.Control.FilterByView());
                            }
                            map.addControl(new L.Control.Fullscreen());
                        }

                        // Because of the weird CSS method we use to stay within Leaflet's control system, we need to add it
                        // last
                        if (geobox && !staticMap) {
                            map.addControl(new L.Control.GeoBox({placeholder: translate('Find a place...')}));
                        }
                        if (!staticMap) {
                            map.addControl(new L.Control.Locate({maxZoom: 18}));
                        }

                        map.on('popupclose', function(e) {
                            jQuery(e.popup.getContent()).trigger('popupclose');
                        });

                        scope.map = map;
                    };
                });
            },
            controller: ['$scope', '$http', '$compile', '$q', '$filter', '$transclude', 'translate', 'ODSAPI', 'DebugLogger', 'ODSWidgetsConfig', function($scope, $http, $compile, $q, $filter, $transclude, translate, ODSAPI, DebugLogger, ODSWidgetsConfig) {
                DebugLogger.log('init map');

                $scope.pendingRequests = $http.pendingRequests;
                $scope.initialLoading = true;

        //        var refreshRecords;
                var shapeField = null;
                var createMarker = null;

                var locationParameterFunctions = {
                    delimiter: ',',
                    accuracy: 5,
                    formatLatLng: function(latLng) {
                        var lat = L.Util.formatNum(latLng.lat, this.accuracy);
                        var lng = L.Util.formatNum(latLng.lng, this.accuracy);
                        return new L.latLng(lat, lng);
                    },
                    getLocationParameterAsArray: function(location) {
                        return location.split(this.delimiter);
                    },
                    getLocationParameterFromMap: function(map) {
                        var center = this.formatLatLng(map.getCenter());
                        return map.getZoom() + this.delimiter + center.lat + this.delimiter + center.lng;
                    },
                    getCenterFromLocationParameter: function(location) {
                        var a = this.getLocationParameterAsArray(location);
                        return new L.latLng(a[1], a[2]);
                    },
                    getZoomFromLocationParameter: function(location) {
                        return this.getLocationParameterAsArray(location)[0];
                    }
                };

                var openRecordPopup = function(latLng, shape, recordid) {
                    var newScope = $scope.$new(false);
                    if (recordid) {
                        newScope.recordid = recordid;
                    } else {
                        newScope.shape = shape;
                    }
                    var popupOptions = {
                        offset: [0, -30],
                        maxWidth: 250,
                        minWidth: 250,
                        autoPanPaddingTopLeft: [50, 305],
                        autoPan: !$scope.mapViewFilter && !$scope.staticMap
                    };
                    var html = null;
                    $transclude(function(clone) {
                        html = jQuery('<div></div>').append(clone).html().trim();
                    });
                    if (html.trim() === '') {
                        newScope.template = $scope.context.dataset.extra_metas && $scope.context.dataset.extra_metas.visualization && $scope.context.dataset.extra_metas.visualization.map_tooltip_template || "/static/explore/html/map_tooltip.html";
                    }
                    var popup = new L.Popup(popupOptions).setLatLng(latLng)
                        .setContent($compile('<geo-scroller shape="shape" context="context" recordid="recordid" map="map" template="{{ template }}">'+html+'</geo-scroller>')(newScope)[0]);
                    popup.openOn($scope.map);
                };

                var numberFormatting = function(number) {
                    /* Passed as a callback for the cluster markers, to allow them to format their displayed value */
                    // Limiting the digits
                    number = Math.round(number*100)/100;
                    // Formatting the digits
                    number = $filter('number')(number);
                    return number;
                };

                var addClusterToLayerGroup = function(layerGroup) {
                    return function(cluster, maximum) {
                        if (cluster.count > 1) {
                            var clusterMarker = new L.ClusterMarker(cluster.cluster_center, {
                                geojson: cluster.cluster,
                                value: cluster.count,
                                total: maximum,
                                numberFormattingFunction: numberFormatting,
                                color: $scope.markerColor
                            });

                            if (!$scope.staticMap) {
                                clusterMarker.on('click', function (e) {
                                    if ($scope.map.getZoom() === $scope.map.getMaxZoom()) {
                                        openRecordPopup(marker.getLatLng(), cluster.cluster);
                                    } else {
                                        // Get the boundingbox for the content
                                        $scope.$apply(function () {
                                            var options = {};
                                            // The geofilter.polygon has to be added last because if we are in mapViewFilter mode,
                                            // the searchOptions already contains a geofilter
                                            jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters, {
                                                'geofilter.polygon': ODS.GeoFilter.getGeoJSONPolygonAsPolygonParameter(cluster.cluster)
                                            });
                                            ODSAPI.records.boundingbox($scope.context, options).success(function (data) {
                                                $scope.map.fitBounds([
                                                    [data.bbox[1], data.bbox[0]],
                                                    [data.bbox[3], data.bbox[2]]
                                                ]);
                                            });
                                        });
                                    }
                                });
                            }

                            layerGroup.addLayer(clusterMarker);
                        } else {
                            var singleMarker = createMarker(cluster.cluster_center);
                            singleMarker.on('click', function(e) {
                                openRecordPopup(e.target.getLatLng(), cluster.cluster);
                            });
                            layerGroup.addLayer(singleMarker);
                        }
                    };
                };

                var refreshClusteredGeo = function() {
                    var options = {
                        'geofilter.polygon': ODS.GeoFilter.getBoundsAsPolygonParameter($scope.map.getBounds()),
                        'clusterprecision': $scope.map.getZoom()
                    };
                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                    if ($scope.currentClusterRequestCanceler) {
                        $scope.currentClusterRequestCanceler.resolve();
                    }
                    $scope.currentClusterRequestCanceler = $q.defer();
                    ODSAPI.records.geo($scope.context, options, $scope.currentClusterRequestCanceler.promise).success(function(data) {
                        var clusters = data.clusters;
                        $scope.records = clusters.length;
                        var layerGroup = new L.LayerGroup();
        //                var bounds = new L.LatLngBounds();
                        var clusterStacker = addClusterToLayerGroup(layerGroup);
                        for (var i=0; i<clusters.length; i++) {
                            var cluster = clusters[i];
                            clusterStacker(cluster, data.count.max);
                        }

                        // Switch the layers
                        layerGroup.addTo($scope.map);
                        if ($scope.layerGroup) {
                            $scope.map.removeLayer($scope.layerGroup);
                        }

                        $scope.layerGroup = layerGroup;

                        $scope.initialLoading = false;

                        $scope.currentClusterRequestCanceler = null;
                    });
                };

                var refreshShapePreview = function() {
                    var options = {
                        'geofilter.polygon': ODS.GeoFilter.getBoundsAsPolygonParameter($scope.map.getBounds()),
                        'clusterprecision': $scope.map.getZoom()
                    };
                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                    options.rows = 1000;
                    if ($scope.currentClusterRequestCanceler) {
                        $scope.currentClusterRequestCanceler.resolve();
                    }
                    $scope.currentClusterRequestCanceler = $q.defer();
                    ODSAPI.records.geopreview($scope.context, options, $scope.currentClusterRequestCanceler.promise).success(function(data) {

                        var layerGroup = new L.LayerGroup();
                        for (var i = 0; i < data.length; i++) {
                            drawShapePreview(layerGroup, data[i]);
                        }

                        // Switch the layers
                        layerGroup.addTo($scope.map);
                        if ($scope.layerGroup) {
                            $scope.map.removeLayer($scope.layerGroup);
                        }

                        $scope.layerGroup = layerGroup;
                        $scope.initialLoading = false;
                        $scope.currentClusterRequestCanceler = null;
                    });
                };

                var drawShapePreview = function(layerGroup, shape) {
                    var geojsonMarkerOptions = {
                        radius: 3,
                        fillColor: "#0033ff",
                        color: "#0000ff",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.5
                    };

                    var shapeLayer = new L.GeoJSON(shape.geometry, {
                        pointToLayer: function (feature, latlng) {
                            return L.circleMarker(latlng, geojsonMarkerOptions);
                        }
                    });

                    layerGroup.addLayer(shapeLayer);
                    shapeLayer.on('click', function(e) {
                        openRecordPopup(e.latlng, null, shape.id);
                    });
                };

                var refreshRawGeo = function() {
                    var options = {};
                    options['geofilter.polygon'] = ODS.GeoFilter.getBoundsAsPolygonParameter($scope.map.getBounds());
                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                    DebugLogger.log('map -> download');
                    ODSAPI.records.download($scope.context, options).
                        success(function(data, status, headers, config) {
                            $scope.records = data;
                            $scope.error = '';
                            $scope.nhits = data.length;

                            var layerGroup = new L.LayerGroup();
                            var bounds = new L.LatLngBounds();
                            var markers = new L.FeatureGroup();

                            for (var i=0; i<data.length; i++) {
                                var record = data[i];
                                drawGeoJSON(record, layerGroup, bounds, markers);
                            }

                            if ($scope.layerGroup)
                                $scope.map.removeLayer($scope.layerGroup);
                            layerGroup.addLayer(markers);
                            layerGroup.addTo($scope.map);
                            $scope.layerGroup = layerGroup;

                            $scope.initialLoading = false;
                        }).
                        error(function(data, status, headers, config) {
                            $scope.error = data.error;
                            $scope.initialLoading = false;
                        });
                };

                var drawGeoJSON = function(record, layerGroup, bounds, markers) {
                    var geoJSON;
                    if (shapeField) {
                        if (record.fields[shapeField]) {
                            geoJSON = record.fields[shapeField];
                            if (geoJSON.type === 'Point' && angular.isDefined(record.geometry)) {
                                // Due to a problem with how we handke precisions, we query a point with a lower precision than
                                // the geoJSON, so we need to use the geometry field instead.
                                geoJSON = record.geometry;
                            }
                        } else {
                            // The designated shapefield has no value, skip
                            return;
                        }
                    } else if (record.geometry) {
                        geoJSON = record.geometry;
                    } else {
                        return;
                    }

                    if (geoJSON.type == 'Point') {
                        // We regroup all the markers in one layer so that we can clusterize them
                        var point = new L.LatLng(geoJSON.coordinates[1], geoJSON.coordinates[0]);
                        var marker = createMarker(point);
                        marker.on('click', function(e) {
                            openRecordPopup(e.target.getLatLng(), geoJSON);
                        });
                        markers.addLayer(marker);
                        bounds.extend(point);
                    } else {
                        var layer = new L.GeoJSON(geoJSON);
                        layer.on('click', function(e) {
                            // For geometries, we bind the popup query to the center
                            openRecordPopup(L.latLng(record.geometry.coordinates[1], record.geometry.coordinates[0]), record.geometry);
                        });
                        layerGroup.addLayer(layer);
                        bounds.extend(layer.getBounds());
                    }
                };

                $scope.$watch('context.parameters', function(newValue, oldValue) {
                    // Don't fire at initialization time
                    if (newValue === oldValue) return;
                    if ($scope.initialLoading) return;
                    DebugLogger.log('map -> searchOptions watch -> refresh records');

                    // If the polygon parameter didn't change, we can fit bounds. Else, it means the user dragged the map, and we
                    // don't want to fit again.

                    if (!newValue['geofilter.polygon'] && oldValue['geofilter.polygon']) {
                        // Someone removed the geofilter parameter, we need to disable the map view filter
                        $scope.mapViewFilter = false;
                        // No reason to go further: the map shouldn't move just because someone removed the filter
                        return;
                    } else if (!oldValue['geofilter.polygon'] && newValue['geofilter.polygon']) {
                        $scope.mapViewFilter = true;
                        // Adding the geofilter parameter shouldn't trigger a refresh
                        return;
                    }

                    if ($scope.mapViewFilter) {
                        refreshRecords(false);
                    } else {
                        // This is not a viewport change: this comes from a filter modification, so we want to refit
                        refreshRecords(true);
                    }
                }, true);

                $scope.$watch('mapContext.location', function() {
                    if ($scope.map) {
                        refreshRecords(false);
                    }
                }, true);

                var refreshRecords = function(globalSearch) {
                    var DOWNLOAD_CAP = 200;
                    var SHAPEPREVIEW_HIGHCAP = 500000;
                    var options = {};
                    if (!globalSearch) {
                        // Stay within the viewport
                        options['geofilter.polygon'] = ODS.GeoFilter.getBoundsAsPolygonParameter($scope.map.getBounds());
                    }
                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                    ODSAPI.records.boundingbox($scope.context, options).success(function(data) {
                        if (globalSearch) {
                            // We manually move the map and trigger the refreshes on the new viewport
                            $scope.map.fitBounds([[data.bbox[1], data.bbox[0]], [data.bbox[3], data.bbox[2]]]);
                        } else {
                            if (data.count < DOWNLOAD_CAP || $scope.map.getZoom() === $scope.map.getMaxZoom()) {
                                // Low enough: always download
                                refreshRawGeo(true);
                            } else if (data.count < SHAPEPREVIEW_HIGHCAP) {
                                // We take our decision depending on the content of the envelope
                                if (data.geometries.Point && data.geometries.Point > data.count/2) {
                                    refreshClusteredGeo();
                                } else {
                                    refreshShapePreview();
                                }

                            } else {
                                // Cluster no matter what
                                refreshClusteredGeo();
                            }
                        }
                    });
                };

                var onViewportMove = function(map) {
                    var size = map.getSize();
                    if (size.x > 0 && size.y > 0) {
                        // Don't attempt to do anything if the map is not displayed... we can't capture useful bounds
        //                var param = ODS.GeoFilter.getBoundsAsPolygonParameter(map.getBounds());
                        $scope.mapContext.location = locationParameterFunctions.getLocationParameterFromMap(map);
                        if ($scope.mapViewFilter) {
                            // Generate a polygon from the bounds
                            $scope.context.parameters['geofilter.polygon'] = ODS.GeoFilter.getBoundsAsPolygonParameter(map.getBounds());
                        }
                    }
                };

                var unwatchSchema = $scope.$watch('context.dataset', function(newValue, oldValue) {
                    if (!newValue || !newValue.datasetid) return;

                    // For now the only way to have the geofilter parameter is to enable the map view filter
                    if ($scope.context.parameters['geofilter.polygon']) {
                        $scope.mapViewFilter = true;
                    } else {
                        $scope.mapViewFilter = false;
                    }

                    $scope.staticMap = $scope.isStatic === 'true' || $scope.context.parameters.static === 'true';

                    // Wait for initMap to be ready (lazy loading)
                    var unwatchInit = $scope.$watch('initMap', function() {
                        if ($scope.initMap) {
                            unwatchInit();
                            $scope.initMap(newValue, $scope.embedMode, ODSWidgetsConfig.basemaps, translate, ODSWidgetsConfig.mapGeobox, $scope.mapContext.basemap, $scope.staticMap, ODSWidgetsConfig.mapPrependAttribution);
                        }
                    });
                    unwatchSchema();
                    $scope.staticSearchOptions = {
                        rows: $scope.recordLimit,
                        dataset: $scope.context.dataset.datasetid,
                        format: 'json'
                    };
                    for (var i=0; i<newValue.fields.length; i++) {
                        var field = newValue.fields[i];
                        if (field.type === 'geo_shape') {
                            shapeField = field.name;
                            // The first one is enough
                            break;
                        }
                    }

                    // Display settings
                    var visualization = {};
                    if (newValue.extra_metas && newValue.extra_metas.visualization) {
                        visualization = newValue.extra_metas.visualization;
                    }
                    $scope.markerColor = visualization.map_marker_color || '#29398C';
                    createMarker = function(latLng) {
                        return new L.VectorMarker(latLng, {
                            color: $scope.markerColor,
                            icon: visualization.map_marker_picto || 'icon-circle',
                            marker: !visualization.map_marker_hidemarkershape
                        });
                    };

                    DebugLogger.log('map -> dataset watch -> refresh records');

                    var mapInitWatcher = $scope.$watch('map', function(nv, ov){
                        if (nv) {
                            $scope.$watch('mapViewFilter', function(newValue, oldValue) {
                                // Don't fire at initialization time
                                if (newValue === oldValue) return;
                                if (newValue) {
                                    $scope.context.parameters['geofilter.polygon'] = ODS.GeoFilter.getBoundsAsPolygonParameter($scope.map.getBounds());
                                } else {
                                    if ($scope.context.parameters['geofilter.polygon'])
                                        delete $scope.context.parameters['geofilter.polygon'];
                                }
                            });
                            var boundsRetrieval = function(dataset) {
                                var deferred = $q.defer();

                                if ($scope.context.parameters.mapviewport) {

                                    if ($scope.context.parameters.mapviewport.substring(0, 1) === '(') {
                                        // Legacy support
                                        $scope.context.parameters.mapviewport = ODS.GeoFilter.getBoundsAsBboxParameter(ODS.GeoFilter.getPolygonParameterAsBounds($scope.context.parameters.mapviewport));
                                    }
                                    deferred.resolve(ODS.GeoFilter.getBboxParameterAsBounds($scope.context.parameters.mapviewport));
                                } else if ($scope.context.parameters["geofilter.polygon"]) {
                                    deferred.resolve(ODS.GeoFilter.getPolygonParameterAsBounds($scope.context.parameters["geofilter.polygon"]));
                                } else {
                                    // Get the boundingbox from the API
                                    var options = {};
                                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters);
                                    ODSAPI.records.boundingbox($scope.context, options).success(function(data) {
                                        if (data.count > 0) {
                                            deferred.resolve([[data.bbox[1], data.bbox[0]], [data.bbox[3], data.bbox[2]]]);
                                        } else {
                                            // Fallback to... the world
                                            deferred.resolve([[-60, -180], [80, 180]]);
                                        }
                                    });
                                }

                                return deferred.promise;
                            };

                            var setMapView = function() {
                                var deferred = $q.defer();

                                if ($scope.mapContext.location) {
                                    DebugLogger.log('Location found');
                                    var center = locationParameterFunctions.getCenterFromLocationParameter($scope.mapContext.location);
                                    var zoom = locationParameterFunctions.getZoomFromLocationParameter($scope.mapContext.location);
                                    DebugLogger.log(center, zoom);
                                    nv.setView(center, zoom);

                                    deferred.resolve();
                                } else {
                                    DebugLogger.log('Use boundsRetrieval');
                                    boundsRetrieval($scope.context.dataset).then(function(bounds) {
                                        if ($scope.context.parameters.mapviewport) {
                                            DebugLogger.log('Deleted mapviewport');
                                            delete $scope.context.parameters.mapviewport;
                                        }

                                        // Fit to dataset boundingbox if there is no viewport or geofilter
                                        DebugLogger.log(bounds);
                                        nv.fitBounds(bounds);

                                        deferred.resolve();
                                    });
                                }

                                return deferred.promise;
                            };

                            setMapView().then(function() {
                                DebugLogger.log('First onViewportMove');
                                onViewportMove($scope.map);

                                refreshRecords(false);

                                $scope.map.on('moveend', function(e) {
                                    // Whenever the map moves, we update the displayed data
                                    onViewportMove(e.target);
                                    if(!$scope.$$phase && !$scope.$root.$$phase) {
                                        // Don't trigger a digest if it is already running (for example if a fitBounds is
                                        // triggered from within a apply)
                                        $scope.$apply();
                                    }
                                });
                            });

                            if (ODSWidgetsConfig.basemaps.length > 1) {
                                $scope.map.on('baselayerchange', function (e) {
                                    $scope.mapContext.basemap = e.layer.basemapId;
                                    if(!$scope.$$phase && !$scope.$root.$$phase) {
                                        // Don't trigger a digest if it is already running (for example if a fitBounds is
                                        // triggered from within a apply)
                                        $scope.$apply();
                                    }
                                });
                            }

                            mapInitWatcher();
                        }
                    });

                }, true);

            }]

        };
    }]);

    mod.directive('geoScroller', function() {
        // FIXME: remove the ugly div from the DL tag, once we migrate to Angular 1.2+
        return {
            restrict: 'E',
            transclude: true,
            template: '<div class="geo-scroller">' +
                    '<spinner ng-hide="records"></spinner>' +
                    '<h2 ng-show="records.length > 1" class="scroller-control ng-leaflet-tooltip-cloak">' +
                        '<i class="icon-chevron-left" ng-click="moveIndex(-1)"></i>' +
                        '<span ng-bind="(selectedIndex+1)+\'/\'+records.length" ng-click="moveIndex(1)"></span>' +
                        '<i class="icon-chevron-right" ng-click="moveIndex(1)"></i>' +
                    '</h2>' +
                    '<div class="ng-leaflet-tooltip-cloak limited-results" ng-show="records && records.length == RECORD_LIMIT" translate>(limited to the first {{RECORD_LIMIT}} records)</div>' +
                    '<div ng-if="template" ng-include src="template"></div>' +
                    '<div ng-transclude></div>' +
                '</div>',
            scope: {
                shape: '=',
                context: '=',
                recordid: '=',
                map: '=',
                template: '@'
            },
            replace: true,
            link: function(scope, element) {
                element.bind('popupclose', function() {
                    scope.$destroy();
                });
                scope.unCloak = function() {
                    jQuery('.ng-leaflet-tooltip-cloak', element).removeClass('ng-leaflet-tooltip-cloak');
                };
            },
            controller: ['$scope', '$filter', 'ODSAPI', function($scope, $filter, ODSAPI) {
                $scope.RECORD_LIMIT = 100;
                $scope.records = [];
                $scope.selectedIndex = 0;
                $scope.moveIndex = function(amount) {
                    var newIndex = ($scope.selectedIndex + amount) % $scope.records.length;
                    if (newIndex < 0) {
                        newIndex = $scope.records.length + newIndex;
                    }
                    $scope.selectedIndex = newIndex;
                };

                // Prepare the geofilter parameter
                var options = {
                    format: 'json',
                    rows: $scope.RECORD_LIMIT
                };
                if ($scope.recordid) {
                    options.q = "recordid:'"+$scope.recordid+"'";
                } else if (angular.isArray($scope.shape)) {
                    // 2D coordinates (lat, lng)
                    options["geofilter.distance"] = $scope.shape[0]+','+$scope.shape[1];
                } else if ($scope.shape.type === 'Point') {
                    options["geofilter.distance"] = $scope.shape.coordinates[1]+','+$scope.shape.coordinates[0];
                } else {
                    var polygon = $scope.shape.coordinates[0];
                    var polygonBounds = [];
                    for (var i=0; i<polygon.length; i++) {
                        var bound = angular.copy(polygon[i]);
                        if (bound.length > 2) {
                            // Discard the z
                            bound.splice(2, 1);
                        }
                        bound.reverse(); // GeoJSON has reverse coordinates from the rest of us
                        polygonBounds.push(bound.join(','));
                    }
                    var param = '('+polygonBounds.join('),(')+')';
                    options["geofilter.polygon"] = param;
                }
                var refresh = function() {
                    var queryOptions = {};
                    angular.extend(queryOptions, $scope.context.parameters, options);
                    ODSAPI.records.download($scope.context, queryOptions).success(function(data, status, headers, config) {
                        if (data.length > 0) {
                            $scope.selectedIndex = 0;
                            $scope.records = data;
                            $scope.unCloak();
                        } else {
                            $scope.map.closePopup();
                        }
                    });
                };
                $scope.$watch('searchOptions', function(nv, ov) {
                    refresh();
                });
                $scope.$apply();

                /* *** HELPER METHODS FOR THE TEMPLATES *** */
                $scope.getTitle = function(record) {
                    if ($scope.context.dataset.extra_metas && $scope.context.dataset.extra_metas.visualization && $scope.context.dataset.extra_metas.visualization.map_tooltip_title) {
                        var titleField = $scope.context.dataset.extra_metas.visualization.map_tooltip_title;
                        if (angular.isDefined(record.fields[titleField]) && record.fields[titleField] !== '') {
                            return record.fields[titleField];
                        }
                    }
                    return null;
                };
            }]
        };
    });

}());;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsMostPopularDatasets', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsMostPopularDatasets
         * @scope
         * @restrict E
         * @param {CatalogContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} to use
         * @description
         * This widget displays the top 5 datasets of a catalog, based on the number of downloads.
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget-most-popular-datasets">' +
                '<ul>' +
                '   <li class="no-data" ng-hide="datasets" translate>No data available yet</li>' +
                '   <li ng-repeat="dataset in datasets" ng-if="datasets">' +
                '       <ods-theme-picto theme="{{dataset.metas.theme}}"></ods-theme-picto>' +
                '       <div class="dataset-details">' +
                '           <div class="title"><a ng-href="/explore/dataset/{{dataset.datasetid}}/" target="_self">{{ dataset.metas.title }}</a></div>' +
                '           <div class="count"><i class="icon-download-alt"></i> {{ dataset.extra_metas.explore.download_count }} <translate>downloads</translate></div>' +
                '       </div>' +
                '   </li>' +
                '</ul>' +
                '</div>',
            scope: {
                context: '='
            },
            controller: ['$scope', function($scope) {
                var refresh = function() {
                    ODSAPI.datasets.search($scope.context, {'rows': 5, 'sort': 'explore.download_count', 'extrametas': true}).
                        success(function(data) {
                            $scope.datasets = data.datasets;
                        });
                };
                $scope.$watch('context', function() {
                    refresh();
                });
            }]
        };
    }]);

}());;(function() {
    'use strict';
    var mod = angular.module('ods-widgets');

    mod.directive('odsSearchbox', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsSearchbox
         * @scope
         * @restrict E
         * @param {string} placeholder the text to display as a placeholder when the searchbox is empty
         * @description
         * This widget displays a wide searchbox that redirects the search on the Explore homepage of the domain.
         *
         */
        // FIXME: Take a catalog context so that the searchbox redirects to the absolute URL of the domain
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget-searchbox">' +
                    '<form method="GET" action="/explore/">' +
                    '<input class="searchbox" name="q" type="text" placeholder="{{placeholder}}">' +
                    '</form>' +
                '</div>',
            scope: {
                placeholder: '@'
            }
        };
    });

}());;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsTable', ['ODSWidgetsConfig', function(ODSWidgetsConfig) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTable
         * @restrict E
         * @scope
         * @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} [displayedFields=all] A comma-separated list of fields to display. By default all the available fields are displayed.
         * @param {string} [sort=none] Sort expression to apply initially (*field* or *-field*)
         * @param {Object} [tableContext=none] An object that you can use to share the sort state between two or more table widgets when they are not in the same context.
         * Beware that if you have two tables on two different datasets, they need to have the same sortable fields, else an user may try to sort on a field that doesn't exist in the other table, and
         * an error will occur.
         *
         */
        return {
            restrict: 'E',
            scope: {
                context: '=',
                displayedFields: '@',
                tableContext: '=?',
                sort: '@'
            },
            replace: true,
            templateUrl: ODSWidgetsConfig.basePath + 'templates/table.html',
            controller: ['$scope', '$element', '$timeout', '$document', '$window', 'ODSAPI', 'DebugLogger', '$filter', '$http', '$compile', function($scope, $element, $timeout, $document, $window, ODSAPI, DebugLogger, $filter, $http, $compile) {
                if (angular.isUndefined($scope.tableContext)) {
                    $scope.tableContext = {};
                }
                if ($scope.sort) {
                    $scope.tableContext.tablesort = $scope.sort;
                }
                $scope.displayedFieldsArray = null;

                // Infinite scroll parameters
                $scope.page = 0;
                $scope.resultsPerPage = 40;
                $scope.fetching = false;
                // New records are appended to the end of this array
                $scope.records = [];
                $scope.working = true;

                // Use to store the columns width to apply to the table.
                // Due to the fix header, we need to apply this to the fake header and the table body.
                $scope.layout = [];

                // End of the infinite scroll
                $scope.done = false;

                // Needed to construct the table
                var datasetFields, recordsHeader = $element.find('.records-header'), recordsBody = $element.find('.records-body tbody');

                var initScrollLeft = recordsHeader.offset().left;
                var prevScrollLeft = 0; // Use to know if it is a horizontal or vertical scroll
                var lastScrollLeft = 0; // To keep the horizontal scrollbar position when refining or sorting
                var forceScrollLeft = false; // Only reset the horizontal scrollbar position when refining or sorting

                // Use to keep track of the records currently visible for the users
                var lastStartIndex = 0, lastEndIndex = 0;

                var extraRecords = 100; // Number of extraneous records before & after
                var startIndex = 0, endIndex = 0; // Records between startIndex and endIndex are in the DOM

                var id = Math.random().toString(36).substring(7);
                var tableId = 'table-' + id;
                var styleSheetId = 'stylesheet-' + id;

                var refreshRecords = function(init) {
                    $scope.fetching = true;
                    var options = {}, start;

                    if (init) {
                        $scope.done = false;
                        $scope.page = 0;
                        $scope.records = [];
                        start = 0;
                    } else {
                        $scope.page++;
                        start = $scope.page * $scope.resultsPerPage;
                    }
                    jQuery.extend(options, $scope.staticSearchOptions, $scope.context.parameters, {start: start});

                    if ($scope.tableContext.tablesort) {
                        options.sort = $scope.tableContext.tablesort;
                    }

                    ODSAPI.records.search($scope.context, options).
                        success(function(data, status, headers, config) {
                            if (!data.records.length) {
                                $scope.working = false;
                            }

                            $scope.records = init ? data.records : $scope.records.concat(data.records);
                            $scope.nhits = data.nhits;

                            $scope.error = '';
                            $scope.fetching = false;
                            $scope.done = ($scope.page+1) * $scope.resultsPerPage >= data.nhits;
                        }).
                        error(function(data, status, headers, config) {
                            $scope.error = data.error;
                            $scope.fetching = false;
                        });
                };

                // Automatically called by ng-infinite-scroll
                $scope.loadMore = function() {
                    if (!$scope.fetching && !$scope.done && $scope.staticSearchOptions) {
                        refreshRecords(false);
                    }
                };

                $scope.isFieldSortable = function(field) {
                    return ODS.DatasetUtils.isFieldSortable(field);
                };

                $scope.toggleSort = function(field){
                    // Not all the sorts are supported yet
                    if($scope.isFieldSortable(field)){
                        if($scope.tableContext.tablesort == field.name){
                            $scope.tableContext.tablesort = '-' + field.name;
                            return;
                        }
                        if($scope.tableContext.tablesort == '-' + field.name){
                            $scope.tableContext.tablesort = field.name;
                            return;
                        }
                        $scope.tableContext.tablesort = '-'+field.name;
                    } else {
                        delete $scope.tableContext.tablesort;
                    }
                };

                var renderOneRecord = function(index, records, position) {
                    /*
                     <tr ng-repeat="record in records">
                         <td bindonce="field" ng-repeat="field in dataset.fields|fieldsForVisualization:'table'|fieldsFilter:dataset.extra_metas.visualization.table_fields" ng-switch="field.type">
                             <div>
                                 <span ng-switch-when="geo_point_2d">
                                     <geotooltip width="300" height="300" coords="record.fields[field.name]">{{ record.fields|formatFieldValue:field }}</geotooltip>
                                 </span>
                                 <span ng-switch-when="geo_shape">
                                    <geotooltip width="300" height="300" geojson="record.fields[field.name]">{{ record.fields|formatFieldValue:field|truncate }}</geotooltip>
                                 </span>
                                 <span ng-switch-default bo-title="record.fields|formatFieldValue:field" bo-html="record.fields|formatFieldValue:field|linky|nofollow"></span>
                             </div>
                         </td>
                     </tr>
                     */

                    // The following code does almost the same as above.
                    // Originally, it was in the angular template "records-table.html" but for performance issue
                    // all the work is done here without using angular.


                    var tr, td, record = records[index];

                    tr = document.createElement('tr');
                    tr.className = 'record-'+index;

                    // TODO: Don't use jQuery if there is performance issue.
                    if (position === 'end') {
                        var beforePlaceholder = $element.find('.placeholderBot')[0];
                        beforePlaceholder.parentNode.insertBefore(tr, beforePlaceholder);
                    } else {
                        var afterPlaceholder = $element.find('.placeholderTop')[0];
                        afterPlaceholder.parentNode.insertBefore(tr, afterPlaceholder.nextSibling);
                    }

                    // Insert the record number
                    td = document.createElement('td');
                    var div = document.createElement('div');
                    div.appendChild(document.createTextNode(index+1));
                    td.appendChild(div);
                    tr.appendChild(td);

                    for (var j=0; j<datasetFields.length; j++) {
                        var field = datasetFields[j];
                        var fieldValue = $filter('formatFieldValue')(record.fields, field);

                        td = document.createElement('td');
                        tr.appendChild(td);

                        var div = document.createElement('div');
                        td.appendChild(div);

                        var newScope = $scope.$new(false);
                        newScope.recordFields = record.fields[field.name];

                        if (field && field.type === 'geo_point_2d') {
                            newScope.fieldValue = fieldValue;
                            if (!window.ie8) {
                                node = $compile('<ods-geotooltip width="300" height="300" coords="recordFields">' + fieldValue + '</ods-geotooltip>')(newScope)[0];
                            } else {
                                node = document.createElement('span');
                                node.title = fieldValue;
                                node.innerHTML = fieldValue;
                            }
                        } else if (field && field.type === 'geo_shape') {
                            newScope.fieldValue = $filter('truncate')(fieldValue);
                            if (!window.ie8) {
                                node = $compile('<ods-geotooltip width="300" height="300" geojson="recordFields">' + fieldValue + '</ods-geotooltip>')(newScope)[0];
                            } else {
                                node = document.createElement('span');
                                node.title = fieldValue;
                                node.innerHTML = fieldValue;
                            }
                        } else {
                            var node = document.createElement('span');
                            node.title = fieldValue;
                            node.innerHTML = $filter('nofollow')($filter('prettyText')(fieldValue));
                        }

                        div.appendChild(node);
                    }

                    return tr;
                };

                var deleteOneRecord = function(index) {
                    var record = $element[0].getElementsByClassName('record-'+index)[0];
                    if (record) {
                        record.parentNode.removeChild(record);
                    }
                };

                var displayRecords = function() {
                    var offsetHeight = $element.find('.records-body')[0].offsetHeight;
                    var scrollTop = $element.find('.records-body')[0].scrollTop;
                    var recordHeight = recordsBody.find('tr').eq(1).height(); // First row is the placeholder

                    // Compute the index of the records that will be visible = that we have in the DOM
                    // TODO: Don't use jQuery if there is performance issue.
                    var placeholderTop = $element.find('.placeholderTop')[0];
                    var placeholderBot = $element.find('.placeholderBot')[0];

                    if(recordHeight) {
                        startIndex = Math.max(Math.floor((scrollTop - (extraRecords * recordHeight)) / recordHeight), 0);
                        endIndex = Math.min(Math.ceil((scrollTop + offsetHeight + (extraRecords * recordHeight)) / recordHeight), $scope.records.length);
                    } else {
                        startIndex = 0;
                        endIndex = $scope.records.length;
                    }
                    startIndex = startIndex && startIndex%2 ? startIndex+1 : startIndex;

                    var scrollDown = startIndex - lastStartIndex > 0 || endIndex - lastEndIndex > 0;

                    // Skip if it is already done
                    if (startIndex === lastStartIndex && endIndex === lastEndIndex) {
                        return;
                    }

                    // Hide the element to prevent intermediary renderings
                    // $element.hide();

                    // Insert placeholder tr
                    var tr;

                    if (!placeholderTop) {
                        tr = document.createElement('tr');
                        tr.className = 'placeholderTop';
                        tr.style.height = '0px';
                        recordsBody[0].appendChild(tr);
                        placeholderTop = $element.find('.placeholderTop')[0];
                    }

                    if (!placeholderBot) {
                        tr = document.createElement('tr');
                        tr.className = 'placeholderBot';
                        tr.style.height = '0px';
                        recordsBody[0].appendChild(tr);
                        placeholderBot = $element.find('.placeholderBot')[0];
                    }

                    if (!$scope.layout.length && $scope.records.length) {
                        var numberRecordsToRender = Math.min($scope.records.length, $scope.resultsPerPage);

                        for (var i=0; i<numberRecordsToRender; i++) {
                            renderOneRecord(i, $scope.records, 'end');
                        }
                    }
                    else {
                        if (scrollDown) {
                            for (var i=0; i<startIndex; i++) {
                                deleteOneRecord(i);
                            }

                            placeholderTop.style.height = startIndex*recordHeight + 'px';

                            var trInDom = $element[0].getElementsByTagName('tbody')[0].getElementsByTagName('tr');
                            var visible = trInDom.length > 2;
                            var lastRecordNumber = visible ? parseInt(trInDom[trInDom.length-2].className.substr(7), 10) : startIndex;

                            var count = 0;
                            for (var i=lastRecordNumber+1; i<endIndex; i++) {
                                renderOneRecord(i, $scope.records, 'end');
                                count++;
                            }

                            var newHeight = visible ? $(placeholderBot).height() - count*recordHeight : ($scope.records.length-endIndex)*recordHeight;
                            newHeight = newHeight > 0 ? newHeight : 0;
                            placeholderBot.style.height = newHeight + 'px';
                        } else {
                            var count = 0;
                            for (var i=endIndex+1; i<$scope.records.length; i++) {
                                deleteOneRecord(i);
                                count++;
                            }

                            var deltaRecords = ($scope.records.length - (endIndex+1));
                            deltaRecords = deltaRecords >= 0 ? deltaRecords : 0;
                            placeholderBot.style.height = deltaRecords*recordHeight + 'px';

                            var trInDom = $element[0].getElementsByTagName('tbody')[0].getElementsByTagName('tr');
                            var visible = trInDom.length > 2;
                            var firstRecordNumber = visible ? parseInt(trInDom[1].className.substr(7), 10) : endIndex;

                            var count = 0;
                            for (var i=firstRecordNumber-1; i>=startIndex; i--) {
                                renderOneRecord(i, $scope.records, 'begin');
                                count++;
                            }

                            var newHeight = visible ? $(placeholderTop).height() - count*recordHeight : startIndex*recordHeight;

                            newHeight = newHeight > 0 ? newHeight : 0;
                            placeholderTop.style.height = newHeight + 'px';
                        }
                    }

                    // $element.show();

                    lastStartIndex = startIndex;
                    lastEndIndex = endIndex;
                };


                $scope.$watch('records', function(newValue, oldValue) {
                    if (newValue !== oldValue) {
                        displayRecords();
                        $scope.computeLayout();
                    }
                });

                var unwatchSchema = $scope.$watch('context.dataset', function(newValue, oldValue) {
                    //if (newValue === oldValue) return;
                    if (!newValue || !newValue.datasetid) return;
                    unwatchSchema();

                    // No default sorting
                    // $scope.searchOptions.sort = $scope.dataset.fields[0].name

                    if ($scope.displayedFields) {
                        $scope.displayedFieldsArray = $scope.displayedFields.split(',').map(function(item) {return item.trim();});
                    } else {
                        if ($scope.context.dataset.extra_metas &&
                            $scope.context.dataset.extra_metas.visualization &&
                            angular.isArray($scope.context.dataset.extra_metas.visualization.table_fields) &&
                            $scope.context.dataset.extra_metas.visualization.table_fields.length > 0) {
                            $scope.displayedFieldsArray = $scope.context.dataset.extra_metas.visualization.table_fields;
                        } else {
                            $scope.displayedFieldsArray = null;
                        }
                    }

                    if (!$scope.tableContext.tablesort && $scope.context.dataset.extra_metas && $scope.context.dataset.extra_metas.visualization && $scope.context.dataset.extra_metas.visualization.table_default_sort_field) {
                        var sortField = $scope.context.dataset.extra_metas.visualization.table_default_sort_field;
                        if ($scope.context.dataset.extra_metas.visualization.table_default_sort_direction === '-') {
                            sortField = '-' + sortField;
                        }
                        $scope.tableContext.tablesort = sortField;
                    }

                    $scope.staticSearchOptions = {
                        rows: $scope.resultsPerPage
                    };

                    DebugLogger.log('table -> dataset watch -> refresh records');

                    var fieldsForVisualization = $filter('fieldsForVisualization')($scope.context.dataset.fields, 'table');
                    datasetFields = $filter('fieldsFilter')(fieldsForVisualization, $scope.displayedFieldsArray);

                    refreshRecords(true);
                }, true);

                $scope.$watch('[context.parameters, tableContext.tablesort]', function(newValue, oldValue) {
                    // Don't fire at initialization time
                    if (newValue === oldValue) return;

                    DebugLogger.log('table -> searchOptions watch -> refresh records');

                    // Reset all variables for next time
                    $scope.layout = []; // Reset layout (layout depends on records data)
                    $scope.working = true;
                    lastScrollLeft = $element.find('.records-body')[0].scrollLeft; // Keep scrollbar position
                    forceScrollLeft = true;

                    recordsBody.empty();

                    refreshRecords(true);
                }, true);

                var resetScroll = function() {
                    $element.find('.records-body').scrollLeft(0);
                    recordsHeader.css({left: 'auto'});
                    initScrollLeft = $element.find('.records-header').offset().left;
                };

                $(window).on('resize', function() {
                    $timeout(function() {
                        resetScroll();
                        $scope.layout = [];
                        $scope.computeLayout();
                    }, 0);
                });

                var lastRecordDisplayed = 0;
                $element.find('.records-body').on('scroll', function() {
                    if (this.scrollLeft !== prevScrollLeft) {
                        // Horizontal scroll
                        recordsHeader.offset({left: initScrollLeft - this.scrollLeft});
                        prevScrollLeft = this.scrollLeft;
                    } else {
                        // Vertical scroll
                        forceScrollLeft = false;
                        var recordDisplayed = Math.max(Math.floor(($element.find('.records-body')[0].scrollTop) / recordsBody.find('tr').eq(1).height()), 0);

                        if (Math.abs(recordDisplayed-lastRecordDisplayed) < extraRecords && recordDisplayed > startIndex) {
                            return;
                        }

                        lastRecordDisplayed = recordDisplayed;
                        displayRecords();
                    }
                });

                var computeStyle = function(tableId, disableMaxWidth) {
                    var styles = '';
                    for (var i=0; i<$scope.layout.length; i++) {
                        var j = i+1;
                        var maxWidth = disableMaxWidth ? 'max-width: none; ' : ''; // Table with few columns
                        styles += '#' + tableId + ' .records-header tr th:nth-child(' + j + ') > div, '
                                + '#' + tableId + ' .records-body tr td:nth-child(' + j + ') > div '
                                + '{ width: ' + $scope.layout[i] + 'px; ' + maxWidth + '} ';

                    }
                    return styles;
                };

                $scope.computeLayout = function() {
                    var rows = $element.find('.records-body tbody tr');

                    var padding = 22; // 22 = 2*paddingDiv + 2*paddingTh = 2*10 + 2*1

                    if (!$scope.layout.length && $scope.records.length) {
                        if (!$element.attr('id')) {
                            $element.attr('id', tableId);
                        }

                        if ($('.embedded').length) {
                            var elementHeight = $(window).height();
                            $element.height(elementHeight);
                        } else {
                            var elementHeight = $element.height();
                        }
                        $element.find('.records-body').height(elementHeight - 25); // Horizontal scrollbar height

                        var recordHeight = recordsBody.find('tr').eq(1).height();
                        var bodyHeight = (rows.length-2)*recordHeight; // Don't take in account placeholders

                        // Remove previous style
                        var node = document.getElementById(styleSheetId);
                        if (node && node.parentNode) {
                            node.parentNode.removeChild(node);
                        }

                        // Switch between the fake header and the default header
                        $element.find('.records-header thead').hide();
                        $element.find('.records-body thead').show();

                        var totalWidth = 0;
                        angular.forEach($element.find('.records-body thead th > div'), function (thDiv, i) {
                            $scope.layout[i] = $(thDiv).width() + 6; // For sortable icons
                            totalWidth += $scope.layout[i];
                        });
                        $scope.layout[0] = 30; // First column is the record number

                        var tableWidth = $element.find('.records-body table').width();
                        var tableFewColumns = (totalWidth + padding * $scope.layout.length) < $element.width();

                        if (tableFewColumns) {
                            var toAdd = Math.floor(tableWidth / $scope.layout.length);
                            var remaining = tableWidth - toAdd * $scope.layout.length;

                            // Dispatch the table width between the other columns
                            for (var i = 1; i < $scope.layout.length; i++) {
                                $scope.layout[i] = toAdd - padding;
                            }
                            $scope.layout[$scope.layout.length - 1] += remaining;

                            // Scrollbar is here: too many records
                            if (bodyHeight > 500) {
                                $element.find('.records-header table').width(tableWidth);
                            } else {
                                $element.find('.records-header table').width('');
                            }
                        }

                        // Append new style
                        var css = document.createElement('style');
                        var styles = computeStyle(tableId, tableFewColumns);

                        css.id = styleSheetId;
                        css.type = 'text/css';

                        css.styleSheet ?
                            css.styleSheet.cssText = styles :
                            css.appendChild(document.createTextNode(styles));

                        $element[0].appendChild(css);

                        // Switch between the default header and the fake header
                        $element.find('.records-body thead').hide();
                        $element.find('.records-header thead').show();

                        if (!forceScrollLeft) {
                            $timeout(function () {
                                resetScroll();
                            }, 0);
                        }
                    }

                    // Restore previous horizontal scrollbar position
                    if (forceScrollLeft) {
                        if (!lastScrollLeft) {
                            recordsHeader.css({left: 'auto'});
                        }
                        $element.find('.records-body')[0].scrollLeft = lastScrollLeft;
                    }

                    if ($scope.layout.length) {
                        $scope.working = false;
                    }
                };

            }]
        };
    }]);

}());;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsTagCloud', ['ODSAPI', function(ODSAPI) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTagCloud
         * @scope
         * @restrict E
         * @param {CatalogContext|DatasetContext} context {@link ods-widgets.directive:odsCatalogContext Catalog Context} or {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
         * @param {string} facetName Name of the facet to build the tag cloud from.
         * @param {number} max Maximum number of tags to show in the cloud.
         * @description
         * This widget displays a "tag cloud" of the values available in a facet (either the facet of a dataset, or a facet from the dataset catalog). The "weight" (size) of a tag depends on the number
         * of occurences ("count") for this tag.
         */
        function median(facets) {
            var half = Math.floor(facets.length/2);
            if (facets.length % 2) return facets[half].count;
            else return (facets[half-1].count + facets[half].count) / 2.0;
        }
        function aggregateArrays(facets, median) {
            var array1 = $.grep(facets, function(value) {
                return value.count >= median;
            });
            var array2 = $.grep(facets, function(value) {
                return value.count <= median;
            });
            var obj = [
                {count: array1.length, min: array1[array1.length-1].count, max: array1[0].count},
                {count: array2.length, min: array2[array2.length-1].count, max: array2[0].count}
            ];
            obj[0].delta = obj[0].max - obj[0].min;
            obj[1].delta = obj[1].max - obj[1].min;
            return obj;
        }
        function getFacet(facet, median, aggregateArrays, domainUrl) {
            var delta = (facet.count >= median ? aggregateArrays[0].delta : aggregateArrays[1].delta) / 2;
            var weight;

            if (facet.count >= 2*delta) {
                weight = 1;
            } else if (facet.count >= delta && facet.count < 2*delta) {
                weight = 2;
            } else {
                weight = 3;
            }
            weight = facet.count >= median ? weight : weight+3;

            facet = {
                count: facet.count,
                name: facet.name,
                opacity: ((((7-weight)+4)/10)+0.05).toFixed(2),
                size: ((7-weight)/3).toFixed(1),
                weight: weight
            };
            facet.size = weight !== 6 ? facet.size : parseFloat(facet.size)+0.3;
            return facet;
        }
        function shuffle(array) {
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
            return array;
        }
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="odswidget-tag-cloud">' +
                    '<ul>' +
                    '<li ng-repeat="tag in tags" class="tag tag{{ tag.weight }}" style="font-size: {{ tag.size }}em; opacity: {{ tag.opacity }}"><a ng-href="{{ context.domainUrl }}{{url }}/?refine.{{ facetName }}={{ tag.name }}">{{ tag.name }}</a></li>' +
                    '</ul>' +
                '</div>',
            scope: {
                context: '=',
                facetName: '@',
                max: '@?'
            },
            controller: function($scope) {
                var refresh = function() {
                    var query;
                    if ($scope.context.type === 'catalog') {
                        query = ODSAPI.datasets.search($scope.context, {'rows': 0, 'facet': $scope.facetName});
                    } else {
                        query = ODSAPI.records.search($scope.context, {'rows': 0, 'facet': $scope.facetName});
                    }
                    query.success(function(data) {
                            $scope.tags = data.facet_groups[0].facets;
                            if ($scope.max) {
                                $scope.tags = $scope.tags.slice(0, $scope.max);
                            }
                            var m = median($scope.tags);
                            for (var i=0; i<$scope.tags.length; i++) {
                                $scope.tags[i] = getFacet($scope.tags[i], m, aggregateArrays($scope.tags, m), $scope.context.domainUrl);
                            }
                            $scope.tags = shuffle($scope.tags);
                        });
                };
                $scope.$watch('context', function (nv, ov) {
                    if ($scope.context.type === 'catalog' || $scope.context.type === 'dataset' && $scope.context.dataset) {
                        $scope.url = $scope.context.type === 'catalog' ? '/explore' : '/explore/dataset/' + $scope.context.dataset.datasetid;
                        refresh();
                    }
                }, true);
            }
        };
    }]);

}());;(function() {
    'use strict';
    // TODO: There are hard dependencies in explore.less, this should not be here...
    // It is linked to our own code via the theme system. We can't really expose it without a dependency to that code.
    var mod = angular.module('ods-widgets');

    mod.directive('odsThemeBoxes', function() {
        return {
            restrict: 'E',
            replace: false,
            template: '<div class="odswidget-theme-boxes">' +
                '<ods-facet-enumerator context="context" facet="theme">' +
                    '<a ng-href="{{context.domainUrl}}/explore/?refine.theme={{item.path}}" target="_self" ods-tooltip="{{item.name}} ({{item.count}} jeux de données)" ods-tooltip-direction="bottom" style="display: block;">' +
                        '<ods-theme-picto theme="{{item.name}}"></ods-theme-picto>' +
                    '</a>' +
                '</div>' +
                '</ods-facet-enumerator>' +
                '</div>',
            scope: {
                context: '='
            }
        };
    });

}());;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsThemePicto', ['ODSWidgetsConfig', '$http', function(ODSWidgetsConfig, $http) {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsThemePicto
         * @scope
         * @restrict E
         * @param {string} theme The label of the theme to display the picto of.
         * @description
         * This widget displays the "picto" of a theme, based on the theme configuration. This element can be styled (height, width...),
         * especially if the picto is vectorial (SVG).
         *
         */
        var inlineImages = {};
        return {
            restrict: 'E',
            replace: true,
            scope: {
                theme: '@'
            },
            template: '<div class="odswidget-theme-picto theme-{{getTheme()|themeSlug}}"></div>',
            link: function(scope, element) {
                // TODO: IE8 fallback
                // TODO: png fallback
                var themeConfig = null;
                var defaultPicto = false;
                if (ODSWidgetsConfig.themes[scope.theme]) {
                    themeConfig = ODSWidgetsConfig.themes[scope.theme];
                } else {
                    themeConfig = ODSWidgetsConfig.themes['default'];
                    defaultPicto = true;
                }

                scope.getTheme = function() {
                    if (defaultPicto) {
                        return 'default';
                    } else {
                        return scope.theme;
                    }
                };

                var loadImageInline = function(code) {
                    var svg = angular.element(code);
                    if (themeConfig.color) {
                        svg.css('fill', themeConfig.color);
                    } else {
                        element.addClass('colorless');
                    }
                    element.append(svg);
                };

                var url = themeConfig.img;

                if (url.indexOf('.svg') === -1) {
                    // Normal image
                    element.append(angular.element('<img src="'+url+'"/>'));
                } else {
                    // SVG
                    if (inlineImages[scope.theme]) {
                        if (inlineImages[scope.theme].code) {
                            loadImageInline(inlineImages[scope.theme].code);
                        } else {
                            inlineImages[scope.theme].promise.success(function(data) {
                                loadImageInline(data);
                            });
                        }

                    } else {
                        var promise = $http.get(url);
                        inlineImages[scope.theme] = {promise: promise};
                        promise.success(function(data) {
                            inlineImages[scope.theme].code = data;
                            loadImageInline(data);
                        });
                    }
                }

            }
        };
    }]);
}());;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsTimescale', function() {
        /**
        *  @ngdoc directive
        *  @name ods-widgets.directive:odsTimescale
        *  @restrict E
        *  @scope
        *  @description
        * Displays a control to select either:
        * - last day
        * - last week
        * - last month
        * - last year
        *
        *  @param {DatasetContext} context {@link ods-widgets.directive:odsDatasetContext Dataset Context} to use
        *  @param {string} timeField Name of the field (date or datetime) to filter on
        */
        return {
            restrict: 'E',
            replace: true,
            scope: {
                context: '=',
                timeField: '@'
            },
            template: '<div class="odswidget-timescale">' +
                '<ul>' +
                    '<li ng-class="{\'active\': scale == \'everything\' || !scale}"><a href="#" ng-click="selectScale(\'everything\'); $event.preventDefault();" translate>Everything</a></li>' +
                    '<li ng-class="{\'active\': scale == \'year\'}"><a href="#" ng-click="selectScale(\'year\'); $event.preventDefault();" translate>Last 12 months</a></li>' +
                    '<li ng-class="{\'active\': scale == \'month\'}"><a href="#" ng-click="selectScale(\'month\'); $event.preventDefault();" translate>Last 4 weeks</a></li>' +
                    '<li ng-class="{\'active\': scale == \'week\'}"><a href="#" ng-click="selectScale(\'week\'); $event.preventDefault();" translate>Last 7 days</a></li>' +
                    '<li ng-class="{\'active\': scale == \'day\'}"><a href="#" ng-click="selectScale(\'day\'); $event.preventDefault();" translate>Last 24 hours</a></li>' +
                '</ul>' +
                '</div>',
            controller: ['$scope', function($scope) {
                var contexts = {};
                if (angular.isUndefined($scope.timeField)) {
                    // Try to guess the time field
                    var init = $scope.$watch('context', function(nv) {
                        if (nv) {
                            if (angular.isArray($scope.context)) {
                                angular.forEach($scope.context, function(item) { contexts[item.name] = {'context': item}; });
                            } else {
                                contexts[$scope.context.name] = {'context': $scope.context};
                            }

                            angular.forEach(contexts, function(ctx) {
                                var unwatch = $scope.$watch(function() { return ctx.context.dataset; }, function(nv) {
                                    if (nv) {
                                        var timeFields = nv.fields.filter(function(item) { return item.type === 'date' || item.type === 'datetime'; });
                                        if (timeFields.length > 1) {
                                            console.log('Error: the dataset "'+nv.datasetid+'" has more than one date or datetime field, the Timescale requires the name of the field to use.');
                                        }
                                        if (timeFields.length === 0) {
                                            console.log('Error: the dataset "'+nv.datasetid+'" doesn\'t have any date or datetime field, which is required for the Timescale widget.');
                                        }
                                        ctx.timeField = timeFields[0].name;

                                        unwatch();
                                    }
                                });
                            });
                            init();
                        }
                    });

                }
                $scope.selectScale = function(scale) {
                    $scope.scale = scale;
                    if (scale === 'everything') {
                        angular.forEach(contexts, function(ctx) {
                            delete ctx.context.parameters.q;
                        });
                        return;
                    }
                    var q = null;
                    var now = new Date();
                    if (scale === 'day') {
                        now.setDate(now.getDate()-1);
                    } else if (scale === 'week') {
                        now.setDate(now.getDate()-7);
                    } else if (scale === 'month') {
                        now.setMonth(now.getMonth()-1);
                    } else if (scale === 'year') {
                        now.setFullYear(now.getFullYear()-1);
                    }
                    q = now.toISOString();
                    angular.forEach(contexts, function(ctx) {
                        if (ctx.timeField) {
                            ctx.context.parameters.q = ctx.timeField + '>="' + q + '"';
                        }
                    });
                };
            }]
        };
    });

}());
;(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.directive('odsTwitterTimeline', function() {
        /**
         * @ngdoc directive
         * @name ods-widgets.directive:odsTwitterTimeline
         * @restrict E
         * @scope
         * @param {string} widgetId The identifier of the Twitter widget you want to integrate. See https://twitter.com/settings/widgets for more information.
         * @description
         * Integrates a Twitter "widget" using the widget ID provided by Twitter.
         *
         * This directive is useful if you want to avoid having `<script>` tags in your page, for example to allow your users to enter HTML text without cross-scripting risks.
         *
         */
        return {
            restrict: 'E',
            replace: true,
            template: '<div></div>',
            scope: {
                'widgetId': '@'
            },
            link: function(scope, element, attrs) {
                var html = '' +
                    '<a class="twitter-timeline" href="https://twitter.com/twitterapi" data-widget-id="'+attrs.widgetId+'">Tweets</a>' +
                    '<script>!function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src="//platform.twitter.com/widgets.js";fjs.parentNode.insertBefore(js,fjs);}}(document,"script","twitter-wjs");</script>';
                element.append(html);
            }
        };
    });
}());