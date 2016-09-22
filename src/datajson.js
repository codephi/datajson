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

            //path exists?
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

        read = function(file, callback) {
            file = fixPath(file, true);

            if (!exists(file)) {
                logError("File not found");
                if (callback)
                    return callback(null)
            }

            var content = exists(file) ? fs.readFileSync(file) : null;

            if (callback) {
                if (content) {
                    callback(JSON.parse(content));
                } else {
                    callback(null);
                }
            } else {
                return content ? JSON.parse(content) : null;
            }
        },

        listAll = function(callback) {
            readdir(defaultPath, function(err, table) {
                if (err) {
                    logError(err)
                    callback(null)
                } else
                    callback(returnTable(table))
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

        deleteFile = function(file, callback) {
            file = fixPath(file, true);

            if (exists(file))
                fs.unlink(file, function(err) {
                    if (err)
                        logError(err);

                    if (callback)
                        callback(err ? false : true);
                });
            else if (callback)
                callback(true);
        },

        deleteRow = function(file, id, callback) {
            read(file, function(table) {
                var find_ = false
                var newTable = [];

                for (var key in table) {
                    if (table[key].id == id) {
                        find_ = true;
                        continue;
                    }

                    newTable.push(table[key])
                }

                if (find_)
                    write(file, newTable, callback);
                else if (callback)
                    callback(true)
            })
        },

        select = function(file, id, colOrCallback, callback) {
            read(file, function(table) {
                if (!id)
                    return callback(returnTable(table));

                var key = getKey(table, id);

                if (table[key] === undefined)
                    return callback(null);

                if (typeof colOrCallback == 'function')
                    return colOrCallback(table[key]);

                if (callback)
                    callback(table[id][colOrCallback]);
            })
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
                if (typeof value == 'string') {
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

                if (typeof value == 'object') {
                    var objKey = Object.keys(value)[0];
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

            return returnTable(results) || [];
        },

        getTable = function(table, callback) {
            read(table, function(table) {
                if (callback)
                    callback(returnTable(table))
            })
        },

        returnTable = function(table) {
            var newTable = [];

            if (!table || !table[0])
                return null;

            if (!table[0].lastid)
                return table;

            delete table[0];

            for (var key in table)
                newTable.push(table[key])

            return newTable;
        },

        getRow = function(file, id, callback) {
            var table = read(file);
            var key = getKey(table, id);

            return key ? clear(table[key]) : null
        }

    this.now = now;

    this.write = write;

    this.read = read;

    this.listAll = listAll;

    this.deleteFile = deleteFile;

    this.delete = deleteRow;

    this.insert = insert;

    this.update = update;

    this.select = select;

    this.find = find;

    this.count = count;

    this.row = getRow;

    this.table = getTable;

    return this;

}
