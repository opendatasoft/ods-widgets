describe('capitalize filter', function() {
    var capitalize;

    beforeEach(module('ods-widgets'));

    beforeEach(inject(function(_$filter_){
      capitalize = _$filter_('capitalize');
    }));

    it('returns a capitalized string', function() {
      expect(capitalize("i'm a string")).toEqual("I'm a string");
    });

    it('returns an empty string string', function() {
      expect(capitalize("")).toEqual("");
    });

    it('returns undefined unchanged', function() {
      expect(typeof capitalize()).toEqual("undefined");
    });

    it('returns array unchanged', function() {
      expect(capitalize([])).toEqual([]);
    });

    it('returns number unchanged', function() {
      expect(capitalize(1234)).toEqual(1234);
    });
});
