describe('isFn', function ()
{
    var isFn = _.isFn;

    it('function is function, object is not', function ()
    {
        expect(isFn(function () {})).to.be.true;
        expect(isFn({})).to.be.false;
    });
});