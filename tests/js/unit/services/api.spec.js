describe('ODSAPI', function() {

    beforeEach(module('ods-widgets'));

    beforeEach(inject(function(_ODSAPI_, _$httpBackend_, _$http_){
        ODSAPI = _ODSAPI_;
        $httpBackend = _$httpBackend_;
        $http = _$http_;
    }));

    describe('uniqueCall', function() {
        var func;
        beforeEach(function() {
            func = ODSAPI.uniqueCall($http.get);
        });

        //
        // angular-mock does not allow http request cancellation...
        //
        xit('function is only called once after fast changes', function() {
            $httpBackend.expectGET('/1').respond(419, '');
            $httpBackend.expectGET('/2').respond(200, '');
            func('/1');
            func('/2');
            $httpBackend.flush();
        });

        it('function is called each time after slow changes', function() {
            $httpBackend.expectGET('/1').respond(200, '');
            func('/1');
            $httpBackend.flush();

            $httpBackend.expectGET('/2').respond(200, '');
            func('/2');
            $httpBackend.flush();
        });
    });
});
