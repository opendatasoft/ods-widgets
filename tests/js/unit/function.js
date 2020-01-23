describe('functions', function () {
    it('tests the datePatternBuilder function', function () {
        /**
         * This methods make sure that the rewrite of highchartsPatternBuilder is ISO.
         *
         * In order to be absolutely sure, we generated all combination of xObject keys that the method is able to
         * handle, ran it through the old code and stored the result for comparison.
         */

        var expectedResults = JSON.parse('[{"xObject":{"yearday":""},"pattern":"%j"},{"xObject":{"year":""},"pattern":" %Y"},{"xObject":{"month":""},"pattern":"%B"},{"xObject":{"day":""},"pattern":"%e"},{"xObject":{"hour":""},"pattern":"%H:00"},{"xObject":{"minute":""},"pattern":""},{"xObject":{"weekday":""},"pattern":"%a"},{"xObject":{"year":"","month":""},"pattern":" %B %Y"},{"xObject":{"year":"","day":""},"pattern":" %e %Y"},{"xObject":{"year":"","hour":""},"pattern":" %Y %H:00"},{"xObject":{"year":"","minute":""},"pattern":" %Y"},{"xObject":{"year":"","weekday":""},"pattern":" %Y"},{"xObject":{"month":"","day":""},"pattern":"%e %B"},{"xObject":{"month":"","hour":""},"pattern":"%H:00"},{"xObject":{"month":"","minute":""},"pattern":"%B"},{"xObject":{"month":"","weekday":""},"pattern":"%a"},{"xObject":{"day":"","hour":""},"pattern":"%H:00"},{"xObject":{"day":"","minute":""},"pattern":"%e"},{"xObject":{"day":"","weekday":""},"pattern":"%a"},{"xObject":{"hour":"","minute":""},"pattern":"%H:00"},{"xObject":{"hour":"","weekday":""},"pattern":"%a %H:00"},{"xObject":{"minute":"","weekday":""},"pattern":"%a"},{"xObject":{"year":"","month":"","day":""},"pattern":" %e %B %Y"},{"xObject":{"year":"","month":"","hour":""},"pattern":" %B %Y %H:00"},{"xObject":{"year":"","month":"","minute":""},"pattern":" %B %Y"},{"xObject":{"year":"","month":"","weekday":""},"pattern":" %B %Y"},{"xObject":{"year":"","day":""},"pattern":" %e %Y"},{"xObject":{"year":"","day":"","hour":""},"pattern":" %e %Y %H:00"},{"xObject":{"year":"","day":"","minute":""},"pattern":" %e %Y"},{"xObject":{"year":"","day":"","weekday":""},"pattern":" %e %Y"},{"xObject":{"year":"","hour":"","minute":""},"pattern":" %Y %H:%M"},{"xObject":{"year":"","hour":"","weekday":""},"pattern":" %Y %H:00"},{"xObject":{"month":"","day":"","hour":""},"pattern":"%H:00"},{"xObject":{"month":"","day":"","minute":""},"pattern":"%e %B"},{"xObject":{"month":"","day":"","weekday":""},"pattern":"%a"},{"xObject":{"month":"","hour":"","minute":""},"pattern":"%H:00"},{"xObject":{"month":"","hour":"","weekday":""},"pattern":"%a %H:00"},{"xObject":{"month":"","minute":"","weekday":""},"pattern":"%a"},{"xObject":{"day":"","hour":"","minute":""},"pattern":"%H:00"},{"xObject":{"day":"","hour":"","weekday":""},"pattern":"%a %H:00"},{"xObject":{"day":"","minute":"","weekday":""},"pattern":"%a"},{"xObject":{"hour":"","minute":"","weekday":""},"pattern":"%a %H:00"},{"xObject":{"year":"","month":"","day":"","hour":""},"pattern":" %e %B %Y %H:00"},{"xObject":{"year":"","month":"","day":"","minute":""},"pattern":" %e %B %Y"},{"xObject":{"year":"","month":"","day":"","weekday":""},"pattern":" %e %B %Y"},{"xObject":{"year":"","month":"","hour":"","minute":""},"pattern":" %B %Y %H:%M"},{"xObject":{"year":"","month":"","hour":"","weekday":""},"pattern":" %B %Y %H:00"},{"xObject":{"year":"","month":"","minute":"","weekday":""},"pattern":" %B %Y"},{"xObject":{"year":"","day":"","hour":"","minute":""},"pattern":" %e %Y %H:%M"},{"xObject":{"year":"","day":"","hour":"","weekday":""},"pattern":" %e %Y %H:00"},{"xObject":{"year":"","day":"","minute":"","weekday":""},"pattern":" %e %Y"},{"xObject":{"year":"","hour":"","minute":"","weekday":""},"pattern":" %Y %H:%M"},{"xObject":{"month":"","day":"","hour":"","minute":""},"pattern":"%H:00"},{"xObject":{"month":"","day":"","hour":"","weekday":""},"pattern":"%a %H:00"},{"xObject":{"month":"","day":"","minute":"","weekday":""},"pattern":"%a"},{"xObject":{"month":"","hour":"","minute":"","weekday":""},"pattern":"%a %H:00"},{"xObject":{"day":"","hour":"","minute":"","weekday":""},"pattern":"%a %H:00"},{"xObject":{"year":"","month":"","day":"","hour":"","minute":""},"pattern":" %e %B %Y %H:%M"},{"xObject":{"year":"","month":"","day":"","hour":"","weekday":""},"pattern":" %e %B %Y %H:00"},{"xObject":{"year":"","month":"","day":"","minute":"","weekday":""},"pattern":" %e %B %Y"},{"xObject":{"year":"","month":"","hour":"","minute":"","weekday":""},"pattern":" %B %Y %H:%M"},{"xObject":{"year":"","day":"","hour":"","minute":"","weekday":""},"pattern":" %e %Y %H:%M"},{"xObject":{"month":"","day":"","hour":"","minute":"","weekday":""},"pattern":"%a %H:00"},{"xObject":{"year":"","month":"","day":"","hour":"","minute":"","weekday":""},"pattern":" %e %B %Y %H:%M"}]');

        var highchartsPatternBuilder = ODS.DateFieldUtils.datePatternBuilder('highcharts');

        for (var i = 0; i < expectedResults.length; i++) {
            var expectedResult = expectedResults[i];
            expect(highchartsPatternBuilder(expectedResult.xObject)).toBe(expectedResult.pattern);
        }
    });
});

describe('timeParsers', function () {
    beforeEach(module('ods-widgets'));

    it('tests the timerange parser', inject(function (odsTimerangeParser) {
        // valid values (both encoded and decoded)
        expect(odsTimerangeParser('myfield:[date1 TO date2]')).toEqual({
            field: 'myfield',
            from: 'date1',
            to: 'date2'
        });
        expect(odsTimerangeParser('myfield%3A%5Bdate1%20TO%20date2%5D')).toEqual({
            field: 'myfield',
            from: 'date1',
            to: 'date2'
        });

        // invalid values
        expect(odsTimerangeParser('[A TO B]')).toEqual({});
        expect(odsTimerangeParser('myfield:[TO B]')).toEqual({});
    }));

    it('tests the timescale parser', inject(function (odsTimescaleParser) {
        // valid values
        var timescale = odsTimescaleParser('myfield>=#now(days=-1)"');
        expect(timescale.field).toBe('myfield');

        expect(odsTimescaleParser('myfield>=#now(days=-1)').scaleLabel).toBe('Last 24 hours');
        expect(odsTimescaleParser('myfield>=#now(weeks=-1)').scaleLabel).toBe('Last 7 days');
        expect(odsTimescaleParser('myfield>=#now(weeks=-4)').scaleLabel).toBe('Last 4 weeks');
        expect(odsTimescaleParser('myfield>=#now(years=-1)').scaleLabel).toBe('Last 12 months');

        // invalid values
        expect(odsTimescaleParser('toto').scaleLabel).toBe(undefined);
    }));
});
