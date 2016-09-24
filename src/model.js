var fs = require('fs'),
    path = require('path'),
    dateFormat = require('dateformat'),
    mkdirp = require('mkdirp'),
    merge = require('merge'),
    readdir = require('recursive-readdir'),
    exists = require('file-exists-sync').default,
    worker = require('./worker');


var Model = function(model) {
    var cache, config;

    this.init = function(_config) {
        config = _config
        cache = config
        cache.table = model.name + config.ext
        cache.file = path.resolve(config.path, config.table)
        cache.data = null;
        cache.result = null;
        cache.id = null;
        cache.entity = config.entity || null;

        if (!config.entity) {
            for (var key in model.schema) {
                if (typeof model.schema[key] != 'object') {
                    model.schema[key] = {
                        required: false,
                        default: undefined,
                        type: model.schema[key]
                    }
                } else {
                    model.schema[key].type = model.schema[key].type ? model.schema[key].type : String
                }

            }
        } else {
            cache.id = config.entity.id;
        }

        return this;
    }

    function cleanCache(data) {
        cache.data = null;
        cache.result = null;
        cache.id = null;
        cache.action = null;
        cache.query = null;

        if (data) {
            cache = merge(true, cache, data)
        }
    }

    this.get = function(key) {
        var data = cache.result || cache.entity;

        if (key) {
            if (data && data[key]) {
                return data[key];
            }

            return undefined;
        }

        return data;
    }

    this.schema = model.schema;

    this.name = model.name;

    this.data = function(data) {
        if (data !== undefined) {
            cache.data = data;
        }

        return this;
    }

    this.action = function(action) {
        cache.action = action;
        return this;
    }

    /**
     * Retorna as chaves e valores validados, caso requiridos e 'não definidos', returna 'nulo'
     */
    this.filter = function(data) {
        var dataReturn = {},
            requireds = [];

        if (!data) {
            data = cache.data;
        }

        var based = (cache.action == 'insert') ? model.schema : data;

        if (cache.action == 'insert' && data.id) {
            delete data.id;
        }

        for (var key in based) {
            if (key == 'id') {
                continue;
            }

            if (data[key] == undefined) {
                if (model.schema[key].default != undefined) {
                    dataReturn[key] = new model.schema[key].type(model.schema[key].default);
                } else if (model.schema[key].required) {
                    requireds.push(key);
                    continue;
                } else {
                    dataReturn[key] = null;
                    continue;
                }
            } else {
                dataReturn[key] = new model.schema[key].type(data[key]);
            }

            if (dataReturn[key].toString() == "NaN") {
                console.error('INFO:', 'wrong type in model', "'" + model.name + "',", 'key', "'" + key + "'")

                if (model.schema[key].required) {
                    requireds.push(key)
                }

                dataReturn[key] = null;
            }

        }

        if (requireds.length > 0) {
            for (var i = 0; i < requireds.length; i++) {
                console.error('ERROR:', "'" + requireds[i] + "'", 'is required in model', "'" + model.name + "'")
            }

            dataReturn = null
        } else if (data && data.id && Number.isInteger(data.id)) {
            dataReturn.id = data.id;
        }

        this.data(dataReturn)
        return this;
    }

    /**
     * Remove a o arquivo de dados por completo
     */
    this.drop = function(callback) {
        if (exists(cache.file)) {
            fs.unlink(cache.file, function() {
                callback(!exists(cache.file));
            })
        } else {
            callback(false)
        }
    }

    this.add = function(data) {
        this.action('insert');
        this.data(data);
        return this;
    }

    this.update = function(data) {
        this.action('update');
        this.data(data);
        return this;
    }

    this.updateById = function(id, data) {
        this.action('update');
        this.query({
            id
        })
        if (data) {
            this.data(data);
        }

        return this;
    }

    this.query = function(query) {
        cache.query = merge(true, cache.query, query);
        return this;
    }

    this.delete = function(id) {
        this.action('delete');
        this.query({
            id
        });
        return this;
    }

    this.all = function() {
        var db = new worker(cache)
        return db.getAll(cache.file)
    }

    this.find = function(query) {
        this.action('find');
        this.query(query)
        return this;
    }

    this.findOne = function(query) {
        this.action('findOne');
        this.query(query)
        return this;
    }

    this.findById = function(id) {
        this.action('findById');
        this.query({
            id
        })
        return this;
    }

    function Entity(data) {
        var entity = (new Model(model)).init(merge(true, config, {
            entity: data
        }))

        if (data.id) {
            var id = data.id;
            delete data.id;

            entity.query({
                id
            });
        }

        return entity;
    }

    this.exec = function() {
        var db = new worker(cache)
        if (cache.action == 'findById') {
            var result = db.getRow(cache.file, cache.query.id);

            cleanCache({
                result: result,
                id: cache.query.id,
            });

            return new Entity(result);
        } else if (cache.action == 'find' || cache.action == 'findOne') {
            var result = db.find(cache.file, cache.query);

            if (cache.action == 'findOne') {
                result = result[0] || null;
            }

            cleanCache({
                result: result
            });

            return (cache.action == 'findOne') ? new Entity(result) : result;
        }
    }

    this.then = function(callback) {
        callback(this.get())
    }

    this.entity = function(entity) {
        return new Entity(entity);
    }

    /**
     * Only Update, Insert, Delete;
     */
    this.save = function() {
        var db = new worker(cache)

        if (cache.action == "delete") {
            var result = db.delete(cache.file, cache.query.id)
            cleanCache({
                result: result
            });

            return result;
        }

        this.filter();

        if (cache.data) {
            if (cache.action == 'update' && cache.query != null) {
                var result = db.update(cache.file, cache.query, cache.data)
                cleanCache({
                    result: result
                });

                return new Entity(result)
            } else if (!config.entity && cache.action == 'insert') {
                if (result = db.insert(cache.file, cache.data)) {
                    cleanCache({
                        result: result
                    });

                    return new Entity(result)
                }
            }
        }
    }
}

module.exports = Model;
