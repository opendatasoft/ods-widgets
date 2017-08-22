(function() {
    'use strict';

    var mod = angular.module('ods-widgets');

    mod.factory("colorScale", ['ODSWidgetsConfig', function(ODSWidgetsConfig) {

        var orderedBrewer = [
                {label: 'Accent', colors: chroma.brewer.Accent},
                {label: 'Dark2', colors: chroma.brewer.Dark2},
                {label: 'Pastel2', colors: chroma.brewer.Pastel2},
                {label: 'Pastel1', colors: chroma.brewer.Pastel1},
                {label: 'Set2', colors: chroma.brewer.Set2},
                {label: 'Set1', colors: chroma.brewer.Set1},
                {label: 'Paired', colors: chroma.brewer.Paired},
                {label: 'Set3', colors: chroma.brewer.Set3},
                {label: 'OrRd', colors: chroma.brewer.OrRd.slice(1)},
                {label: 'PuBu', colors: chroma.brewer.PuBu.slice(1)},
                {label: 'BuPu', colors: chroma.brewer.BuPu.slice(1)},
                {label: 'Oranges', colors: chroma.brewer.Oranges.slice(1)},
                {label: 'YlOrBr', colors: chroma.brewer.YlOrBr.slice(1)},
                {label: 'YlGn', colors: chroma.brewer.YlGn.slice(1)},
                {label: 'Reds', colors: chroma.brewer.Reds.slice(1)},
                {label: 'RdPu', colors: chroma.brewer.RdPu.slice(1)},
                {label: 'Greens', colors: chroma.brewer.Greens.slice(1)},
                {label: 'YlGnBu', colors: chroma.brewer.YlGnBu.slice(1)},
                {label: 'Purples', colors: chroma.brewer.Purples.slice(1)},
                {label: 'GnBu', colors: chroma.brewer.GnBu.slice(1)},
                {label: 'Greys', colors: chroma.brewer.Greys.slice(1)},
                {label: 'YlOrRd', colors: chroma.brewer.YlOrRd.slice(1)},
                {label: 'PuRd', colors: chroma.brewer.PuRd.slice(1)},
                {label: 'Blues', colors: chroma.brewer.Blues.slice(1)},
                {label: 'PuBuGn', colors: chroma.brewer.PuBuGn.slice(1)},
                {label: 'Spectral', colors: chroma.brewer.Spectral},
                {label: 'RdYlGn', colors: chroma.brewer.RdYlGn},
                {label: 'RdBu', colors: chroma.brewer.RdBu},
                {label: 'PiYG', colors: chroma.brewer.PiYG},
                {label: 'PRGn', colors: chroma.brewer.PRGn},
                {label: 'RdYlBu', colors: chroma.brewer.RdYlBu},
                {label: 'BrBG', colors: chroma.brewer.BrBG},
                {label: 'RdGy', colors: chroma.brewer.RdGy},
                {label: 'PuOr', colors: chroma.brewer.PuOr}
            ],
            defaultColorSet = 'Set2',
            domainDefaultColorSet = '',
            colorIdx = 0;

        if (ODSWidgetsConfig.chartColors && ODSWidgetsConfig.chartColors.length > 0) {
            domainDefaultColorSet = 'custom';
            var localDomainColorSet = angular.copy(ODSWidgetsConfig.chartColors);
            if (!angular.isArray(localDomainColorSet)) {
                localDomainColorSet = [localDomainColorSet];
            }
            if (localDomainColorSet.length == 1) {
                localDomainColorSet.push(localDomainColorSet[0]);
            }
            orderedBrewer.unshift({
                label: 'custom',
                colors: localDomainColorSet
            });

            chroma.brewer['custom'] = localDomainColorSet;
        }
        function getBrewName(colorString) {
            var brewName;

            if (!colorString) {
                brewName = domainDefaultColorSet || defaultColorSet;
            } else {
                if (colorString.startsWith('custom-')) {
                    colorString = colorString.replace('custom-', '');
                }
                if (colorString.startsWith('range-')) {
                    colorString = colorString.replace('range-', '');
                } else if (colorString.startsWith('single-')) {
                    colorString = colorString.replace('single-', '');
                }
                if (chroma.brewer[colorString]) {
                    brewName = colorString;
                }
            }

            return brewName;
        }
        function getScaleFromString(colorString) {
            var brewName = getBrewName(colorString),
                colorScale;

            if (brewName) {
                colorScale = chroma.scale(brewName);
            } else {
                colorString = colorString.replace('custom-', '');
                colorString = colorString.replace('single-', '');
                colorScale = chroma.scale().range([colorString, colorString]);
            }

            return colorScale;
        }
        return {
            getScale: function(colorString, min, max) {
                var brewName, colorScale;

                min = typeof min !== "undefined" ? min : 0;
                max = typeof max !== "undefined" ? max : 1;

                return getScaleFromString(colorString).domain([min, max]);
            },
            getUniqueColor: function(colorString) {
                return getScaleFromString(colorString)(1).hex();
            },
            getColorAtIndex: function(colorString, index) {
                var brewName = getBrewName(colorString),
                    brew;
                if (brewName) {
                    brew = chroma.brewer[brewName];
                    return brew[index % brew.length];
                } else {
                    return colorString;
                }
            },
            getColors: function(colorString) {
                var brewName = getBrewName(colorString);
                if (brewName) {
                    return chroma.brewer[brewName];
                } else {
                    return [colorString, colorString];
                }
            },
            getColorSets: function() {
                return chroma.brewer;
            },
            getOrderedColorSets: function() {
                return orderedBrewer;
            },
            getDefaultColorSet: function() {
                return domainDefaultColorSet || defaultColorSet;
            },
            getDefaultColor: function(currentColor, allowedColors, index) {
                var defaultColors = this.getColorList(allowedColors),
                    color;

                if (typeof currentColor !== "undefined" && currentColor !== "") {
                    return currentColor;
                } else if (typeof backupColor !== "undefined" && backupColor !== "") {
                    // coming back from a pie chart, we don't want to increase the color counter
                    return backupColor;
                } else {
                    if (defaultColors[colorIdx].label.startsWith('custom-')) {
                        colorIdx = (colorIdx + 1) % defaultColors.length;
                    }
                    if (typeof index !== "undefined") {
                        color = defaultColors[index % defaultColors.length].label;
                    } else {
                        color = defaultColors[colorIdx].label;
                        colorIdx = (colorIdx + 1) % defaultColors.length;
                    }
                    return color;
                }
            },
            getColorList: function(allowedcolors, currentcolor) {
                var colorlist = [];
                if (allowedcolors.indexOf('single') !== -1) {
                    var colors = this.getColors(this.getDefaultColorSet());
                    angular.forEach(colors, function(color) {
                        colorlist.push({'label': color, 'color': color});
                    });
                }
                if (allowedcolors.indexOf('range') !== -1) {
                    angular.forEach(this.getOrderedColorSets(), function(colorrange) {
                        colorlist.push({'label': 'range-' + colorrange['label'], 'color': colorrange['colors']});
                    });
                }
                return colorlist;
            },
            isColorAllowed: function(checkedColor, colorlist, allowedcolors) {
                var found = false;

                if (!checkedColor) {
                    return false;
                }

                if (allowedcolors.indexOf('range') === -1) {
                    if (checkedColor.startsWith('range-') || checkedColor.startsWith('custom-range-')) {
                        return false;
                    } else {
                        return true;
                    }
                }

                if (allowedcolors.indexOf('range') !== -1) {
                    if (checkedColor.startsWith('custom-single-')) {
                        return false;
                    } else {
                        angular.forEach(colorlist, function(color) {
                            if (color.label === checkedColor) {
                                found = true;
                            }
                        });

                        return found;
                    }
                }
            }

        };
    }]);

}());