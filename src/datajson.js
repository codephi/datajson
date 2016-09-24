var Model = require('./model'),
    merge = require('merge'),
    fs = require('fs'),
    path = require('path')

module.exports = function(config) {
    var config = merge(true, {
        'path': __dirname,
        'indenting': null,
        'modelPath': null,
        'ext': '.json'
    }, config);

    this.model = {};

    this.Model = function(schema) {
        return (new Model(schema)).init(config)
    }

    this.load = function(modelPath) {
        var files = fs.readdirSync(modelPath);
        this.files = files;
        var models = {}

        files.map(function(file) {
            var model = require(path.resolve(modelPath, file))(Model).init(config)
            models[model.name] = model;
        })

        this.model = models;
    }

    if (config.modelPath) {
        this.load(config.modelPath)
    }

    return this;
}
