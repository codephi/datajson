var fs = require('fs'),
    path = require('path'),
    dateFormat = require('dateformat'),
    mkdirp = require('mkdirp'),
    merge = require('merge'),
    exists = require('file-exists-sync').default,
    readdir = require('recursive-readdir');

module.exports = function(options) {
    var now = function() {
            return dateFormat(new Date(), "yyyy-mm-ddThh:MM:ss")
        },

        defaultPath = options.path || __dirname,

        errorLog = options.log || false,

        logError = function(error) {
            if (errorLog) {
                console.error(error)
            }
        },

        fixPath = function(file, ext) {
            return path.resolve(defaultPath, file);
        },

        createTable = function(data) {
            var newData = [{
                'lastid': 1
            }];

            if (data)
                newData.push(data);

            return newData
        },

        lastId = function(file, callback) {
            var table = read(file);
            return table ? table[0].lastid : null;
        },

        count = function(file, callback) {
            read(file, function(table) {
                if (callback) {
                    if (!table)
                        callback(0);
                    else
                        callback(table.length);
                }
            })
        },

        write = function(file, modeOrData, data) {
            var mode = typeof modeOrData == 'int' ? modeOrData : '0777';
            var data = typeof modeOrData == 'object' ? modeOrData : typeof dataOrCallbacl == 'object' ? dataOrCallbacl : {};
            //fix path and file
            var filePath = fixPath(path.dirname(file));
            file = fixPath(file, true);

            var execWrite = function(file, data) {
                fs.writeFileSync(file, JSON.stringify(data, null, options.indenting));
                return true
            }

            if (filePath && !exists(filePath)) {
                var finish = false
                mkdirp(filePath, function(err) {
                    if (err) {
                        logError(err);
                    } else {
                        fs.chmod(filePath, mode, function() {
                            finish = execWrite(file, data);
                        })
                    }
                });

                while (!finish);

                return finish;
            } else {
                return execWrite(file, data);
            }

        },

        read = function(file) {
            file = fixPath(file, true);

            if (!exists(file)) {
                logError("File not found");
                return null;
            }

            var content = exists(file) ? fs.readFileSync(file) : null;

            return content ? JSON.parse(content) : null;
        },

        prepare = function(result) {
            return result.filter(function(value){
              return (value.id)
            })
        },

        insert = function(file, row, callback) {
            var last = lastId(file)
            var id = (last) ? last + 1 : 1;
            var table = read(file);

            row.created = now();
            row.modified = null;
            row.id = id;

            if (!table) {
                table = createTable(row);
            } else {
                table[table.length] = row;
                table[0].lastid = ++table[0].lastid;
            }

            return write(file, table) ? clear(row) : null;
        },

        update = function(file, query, data) {
            var table = read(file)

            if (query.id) {
                var key = getKey(table, query.id);

                if (!key) {
                    return null;
                }

                data.modified = now();
                table[key] = merge.recursive(true, table[key], data);

                return write(file, table) ? clear(table[key]) : null;
            } else {
                var result = find(file, query).map(function(value) {
                    var key = getKey(table, value.id);

                    value.modified = now();
                    table[key] = merge.recursive(true, table[key], data);

                    write(file, table);

                    return table[key];
                })

                return clear(result);
            }
        },

        clear = function(data) {
            return JSON.parse(JSON.stringify(data))
        },

        deleteRow = function(file, id) {
            var table = read(file),
                result = false,
                newTable = [];

            for (var key in table) {

                if (table[key].id && table[key].id == id) {
                    result = true;
                    continue;
                }

                newTable.push(table[key])
            }

            if (result) {
                return write(file, newTable);
            }

            return false;
        },

        getKey = function(table, id) {
            if (table) {
                for (var key in table) {
                    if (table[key].id && table[key].id == id) {
                        return key;
                    }
                }
            }

            return null;
        },

        converTerm = function(terms) {
            var newTerms = {};

            if (!terms['$and'] && !terms['$or']) {
                return {
                    '$and': Array.isArray(terms) ? terms : [terms],
                    '$or': []
                };
            } else if (!terms['$and']) {
                terms['$and'] = [];
            } else if (!terms['$or']) {
                terms['$or'] = [];
            }

            if (!Array.isArray(terms['$and'])) {
                terms['$and'] = [terms['$and']]
            }

            if (!Array.isArray(terms['$or'])) {
                terms['$or'] = [terms['$or']]
            }

            return terms;
        },

        operators = {
            // Igual
            "$eq": function(target, value) {
                if (typeof value == 'string' || (value instanceof RegExp)) {
                    if (target.search(value) > -1) {
                        return true;
                    }
                } else {
                    if (target == value) {
                        return true;
                    }
                }

                return false;
            },
            // Diferente
            "$not": function(target, value) {
                return (target !== value);
            },
            // Maior que
            "$gt": function(target, value) {
                return (typeof value == 'number' && target > value);
            },
            // Menor que
            "$lt": function(target, value) {
                return (typeof value == 'number' && target < value);
            },
            //Maior igual a
            "$gte": function(target, value) {
                return (typeof value == 'number' && target >= value);
            },
            //Menor igual a
            "$lte": function(target, value) {
                return (typeof value == 'number' && target <= value);
            },
            // Corresponde a qualquer valor de uma matriz
            "$em": function(target, value) {
                return (typeof value == 'object' && value.indexOf(target) > -1);
            },
            // Não corresponde nenhum valor de uma matriz
            "$nin": function(target, value) {
                return (typeof value == 'object' && value.indexOf(target) == -1);
            }
        },

        findItemInLine = function(line, item, and = false) {
            var count = 0;
            var loops = 0;

            for (var term in item) {
                var value = item[term];
                loops++;

                if (!(value instanceof RegExp) && typeof value == 'object') {
                    var objKey = Object.keys(value)[0];
                    console.log(line, value, term)
                    if (operators[objKey](line[term], value[objKey])) {
                        count++
                    }
                } else {
                    if (operators['$eq'](line[term], value)) {
                        count++
                    }
                }

                if (and && count < loops) {
                    return false;
                }
            }

            return count;
        },

        find = function(file, terms, relative) {
            var table = read(file),
                results = [],
                terms = converTerm(terms),
                loops = 0;

            for (var key = 1; key < table.length; key++) {
                var count = 0,
                    line = table[key];

                if (terms['$and'][0]) {
                    for (var i in terms['$and']) {
                        var item = terms['$and'][i];

                        if (findItemInLine(line, item, true)) {
                            count++;
                        } else {
                            count = 0;
                            break
                        }
                    }

                    if (count == 0) {
                        continue;
                    }
                }

                if (terms['$or'][0]) {
                    count = 0;

                    terms['$or'].map(function(item) {
                        count += findItemInLine(line, item)
                    });
                }

                if (count > 0) {
                    results.push(table[key])
                }
            }

            return prepare(results) || [];
        },

        getRow = function(file, id, callback) {
            var table = read(file);
            var key = getKey(table, id);

            return key ? clear(table[key]) : null
        },

        getAll = function(file){
          var table = read(file)
          console.log(file)
          return prepare(table);
        }



    this.now = now;

    this.getAll = getAll;

    this.delete = deleteRow;

    this.insert = insert;

    this.update = update;

    this.find = find;

    this.count = count;

    this.getRow = getRow;

    return this;

}
