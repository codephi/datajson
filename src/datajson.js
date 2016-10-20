var Model = require('./model'),
    merge = require('merge'),
    fs = require('fs'),
    path = require('path'),
    defaultConfig = {
        'path': __dirname,
        'indenting': null,
        'modelPath': null,
        'ext': '.json'
    }

module.exports = function(custom) {
    var config = merge(true, defaultConfig, custom);


    this.model = {};

    this.Model = function(schema) {
        return (new Model(schema)).init(config)
    }

    this.load = function(modelPath) {
        var files = fs.readdirSync(modelPath);
        this.files = files;
        var models = {}

        /*
          Bug 1 https://github.com/PhilippeAssis/datajson#bug1
        */

        files.map(function(file) {
            var model = require(path.resolve(modelPath, file))(Model).init(merge(true, defaultConfig, custom))
            models[model.name] = model;
        })

        this.model = models;
    }

    if (config.modelPath) {
        this.load(config.modelPath)
    }

    return this;
}
