describe('services', function () {
    describe('api-params-v1-to-v2', function () {
        beforeEach(module('ods-widgets'));

        it('should convert API V1 params to V2', inject(function (APIParamsV1ToV2) {
            var params = {
                'q': 'my query',
                'q.named': 'field:"value"',
                'refine.myfield': ['myvalue', 'myValue2'],
                'exclude.myfield': 'myvalue3',

            };
            expect(APIParamsV1ToV2(params)).toEqual({
                refine: [
                    'myfield:myvalue',
                    'myfield:myValue2'
                ],
                exclude: [
                    'myfield:myvalue3'
                ],
                qv1: '(my query) AND (field:"value")'
            });

        }));
    });
});
