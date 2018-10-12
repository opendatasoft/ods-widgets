describe('odsAggregation widget', function() {
    var $compile,
        $rootScope;

    // Load the myApp module, which contains the directive
    beforeEach(module('ods-widgets'));

    // Store references to $rootScope and $compile
    // so they are available to all tests in this describe block
    beforeEach(inject(function(_$compile_, _$rootScope_, _$httpBackend_, _$timeout_, _MockContextHelper_){
        // The injector unwraps the underscores (_) from around the parameter names when matching
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $httpBackend = _$httpBackend_;
        $timeout = _$timeout_;
        ContextHelper = _MockContextHelper_;

        $httpBackend.when('GET', /\/api\/records\/1\.0\/analyze\/\?y\.serie1\.func=COUNT&dataset=arbresremarquablesparis2011&timezone=.*/)
            .respond([{"serie1": 183}]);

        $httpBackend.when('GET', /\/api\/records\/1\.0\/analyze\/\?y\.serie1\.expr=circonferenceencm&y\.serie1\.func=MIN&dataset=arbresremarquablesparis2011&timezone=.*/)
            .respond([{"serie1": 30.0}]);

        $httpBackend.when('GET', /\/api\/records\/1\.0\/analyze\/\?y\.serie1\.expr=circonferenceencm&y\.serie1\.func=MAX&dataset=arbresremarquablesparis2011&timezone=.*/)
            .respond([{"serie1": 695.0}]);
    }));

    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    it('renders correctly', function() {
        $rootScope.tree = ContextHelper.getDatasetContext('tree', '', 'arbresremarquablesparis2011', {}, null, '', {
                datasetid: 'arbresremarquablesparis2011',
                metas: {},
                fields: []
            });

        // $httpBackend.expectGET('https://parisdata.opendatasoft.com/api/datasets/1.0/arbresremarquablesparis2011/?extrametas=true&interopmetas=true&source=&timezone=Europe%2FBerlin');
        // Compile a piece of HTML containing the directive
        var element = $compile('' +
            '                       <div ods-aggregation="total, mingirth, maxgirth"\n' +
            '                            ods-aggregation-context="tree"\n' +
            '                            ods-aggregation-total-function="COUNT"\n' +
            '                            ods-aggregation-maxgirth-expression="circonferenceencm"\n' +
            '                            ods-aggregation-maxgirth-function="MAX"\n' +
            '                            ods-aggregation-mingirth-expression="circonferenceencm"\n' +
            '                            ods-aggregation-mingirth-function="MIN">\n' +
            '                            There are {{ total }} remarkable trees in paris, with girth ranging from {{ mingirth }} to {{ maxgirth }} cm.\n' +
            '                       </div>\n' +
            '                   ')($rootScope);
        $rootScope.$digest();

        $httpBackend.flush();
        expect(element.html()).toContain("There are 183 remarkable trees in paris, with girth ranging from 30 to 695 cm.");
    });
});


