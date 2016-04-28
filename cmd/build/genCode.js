var async = require('async'),
    fs = require('fs'),
    path = require('path'),
    downloadMod = require('../../lib/downloadMod'),
    _ = require('../../lib/util');

var regDependency = /\s*\b_\(['"]([\w\s\$]+)['"]\);?/;

module.exports = function (modName, codeTpl, options, cb)
{
    var percentage = _.has(options.shareData.fnPercentage, modName);

    percentage = percentage ? ' (' + percentage + ')' : '';

    _.log({}, 'Generate code {{#cyan}}"' + modName + '"' + percentage + '{{/cyan}}');

    var result = {},
        hasTryDownload = false,
        paths = [];

    _.each(options.libPaths, function (libPath)
    {
        _.each(options.extension, function (extension)
        {
            paths.push(path.resolve(libPath, modName + '.' + extension));
        });
    });

    function detectAndGenCode()
    {
        async.detect(paths, fs.exists, function (filePath)
        {
            if (_.isUndef(filePath))
            {
                if (!hasTryDownload)
                {
                    hasTryDownload = true;

                    _.log('Install ' + modName + '.');

                    var dest = path.resolve(options.dirname, 'src', modName + '.js');

                    return downloadMod(modName, dest, function (err)
                    {
                        if (err) return cb(err);

                        _.log.ok(modName + ' installed.');

                        detectAndGenCode();
                    });
                }

                return cb('Not found: ' + modName);
            }

            fs.readFile(filePath, options.encoding, function (err, data)
            {
                if (err) return cb(err);

                data = transData(filePath, data, modName, options);

                var dependencies = regDependency.exec(data);
                dependencies = dependencies ? _.trim(dependencies[1]).split(/\s/) : [];

                data = _.indent(data.replace(regDependency, ''));
                data = codeTpl({
                    name: modName,
                    code: _.trim(data),
                    exports: /\bexports\b/.test(data)
                });

                result.dependencies = dependencies;
                result.name = modName;
                result.code = data;

                cb(null, result);
            });
        });
    }

    detectAndGenCode();
};

function transData(filePath, src, modName, options)
{
    var transpiler = options.transpiler;

    _.each(transpiler, function (item)
    {
        if (item.exclude && item.exclude.test(filePath)) return;

        if (item.test.test(filePath))
        {
            _.each(item.handler, function (handler)
            {
                src = handler.call(item, src, modName);
            });
        }
    });

    return src;
}
