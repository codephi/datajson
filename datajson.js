var DataJson = function () {
    'use strict';
    const fs = require('fs'),
        path = require('path'),
        dateFormat = require('dateformat'),
        mkdirp = require('mkdirp'),
        merge = require('merge'),
        readdir = require('recursive-readdir');


    var now = function () {
            return dateFormat(new Date(), "yyyy-mm-ddThh:MM:ss")
        },

        defaultPath = __dirname,

        errorLog = true,

        logError = function(error){
            if(errorLog){
                console.error(error)
            }
        },

        fixPath = function (file, ext) {
            if (ext && !path.parse(file).ext)
                file += '.json';

            return path.resolve(defaultPath, file);
        },

        createTable = function (data) {
            var newData = [
                {
                    'lastid': 1
                }
            ];

            if (data)
                newData.push(data);

            return newData
        },

        lastId = function (file, _callback) {
            read(file, function (table) {
                _callback(table ? table[0].lastid : null);
            })
        },

        count = function (file, _callback) {
            read(file, function (table) {
                if (!table)
                    _callback(0);
                else
                    _callback(table.length);
            })
        },

        write = function (file, modeOrData, dataOrCallbacl, _callback) {
            var mode = typeof modeOrData == 'int' ? modeOrData : '0777';
            var data = typeof modeOrData == 'object' ? modeOrData : typeof dataOrCallbacl == 'object' ? dataOrCallbacl : {};
            var _callback = typeof dataOrCallbacl == 'function' ? dataOrCallbacl : _callback;

            //fix path and file
            var filePath = fixPath(path.dirname(file));
            file = fixPath(file, true);

            var execWrite = function (file, data, _callback) {
                fs.writeFile(
                    file,
                    JSON.stringify(data),
                    function (err) {
                        if (err) {
                            logError(err);
                            return ( _callback ) ? _callback(false) : '';
                        }

                        if (_callback)
                            _callback(true);
                    }
                );
            }

            //path exists?
            if (filePath && !fs.existsSync(filePath)) {
                mkdirp(filePath, function (err) {
                    if (err) {
                        logError(err);
                    }
                    else {
                        fs.chmod(filePath, mode, function () {
                            execWrite(file, data, _callback);
                        })
                    }
                });
            }
            else {
                execWrite(file, data, _callback);
            }

        },

        read = function (file, _callback) {
            file = fixPath(file, true);

            if (!fs.existsSync(file)) {
                logError("File not found");
                return _callback(null)
            }

            fs.readFile(file, function (err, data) {
                if (err) {
                    logError(err);

                    if (_callback)
                        _callback(null);
                }

                if (_callback)
                    _callback(JSON.parse(data));
            });
        },

        listAll = function (_callback) {
            readdir(defaultPath, function (err, table) {
                if (err) {
                    logError(err)
                    _callback(null)
                } else
                    _callback(returnTable(table))
            })
        },

        insert = function (file, row, _callback) {
            lastId(file, function (last) {
                var id = ( last ) ? last + 1 : 1;

                read(file, function (table) {
                    row.created = now();
                    row.modified = null;
                    row.id = id;

                    if (!table)
                        table = createTable(row);
                    else {
                        table[table.length] = row;
                        table[0].lastid = ++table[0].lastid;
                    }

                    write(file, table, function (success) {
                        if (_callback)
                            if (success)
                                _callback(row);
                            else
                                _callback(false);
                    });
                })
            })

        },

        update = function (file, id, data, _callback) {
            read(file, function (table) {
                var key = getKey(table, id);

                if (!key)
                    return _callback(null);

                data.modified = now();
                table[key] = merge.recursive(true, table[key], data);

                write(file, table, function (success) {
                    if (success)
                        _callback(table[key])
                    else
                        _callback(null)
                });
            })
        },

        deleteFile = function (file, _callback) {
            file = fixPath(file, true);

            if (fs.existsSync(file))
                fs.unlink(file, function (err) {
                    if (err)
                        logError(err);

                    if (_callback)
                        _callback(err ? false : true);
                });
            else if (_callback)
                _callback(true);
        },

        deleteRow = function (file, id, _callback) {
            read(file, function (table) {
                var find = false
                var newTable = [];

                for (var key in table) {
                    if (table[key].id == id) {
                        find = true;
                        continue;
                    }

                    newTable.push(table[key])
                }

                if (find)
                    write(file, newTable, _callback);
                else
                    _callback(true)
            })
        },

        select = function (file, id, colOrCallback, _callback) {
            read(file, function (table) {
                if (!id)
                    return _callback(returnTable(table));

                var key = getKey(table, id);

                if (table[key] === undefined)
                    return _callback(null);

                if (typeof colOrCallback == 'function')
                    return colOrCallback(table[key]);

                _callback(table[id][colOrCallback]);
            })
        },

        getKey = function (data, id) {
            for (var key in data)
                if (data[key].id == id)
                    return key;

            return null;
        },

        find = function (file, terms, relative, _callback) {
            read(file, function (data) {
                var results = [];

                for (var key in data) {
                    var resultsByData = 0,
                        countTerms = 0;

                    for (var _term in terms) {

                        if (data[key][_term] == undefined)
                            continue;

                        var re = relative ? new RegExp(terms[_term], "i") : terms[_term];

                        if (data[key][_term].search(re) >= 0)
                            resultsByData++;

                        countTerms++;
                    }

                    if (resultsByData == countTerms) {
                        results.push(data[key]);
                    }
                }

                _callback(returnTable(results))
            })
        },

        findOr = function (file, terms, relative, _callback) {
            read(file, function (table) {
                var results = [];
                for (var key in table) {
                    var resultsByData = 0;

                    for (var _term in terms) {
                        if (table[key][_term] == undefined)
                            continue;

                        var re = relative ? new RegExp(terms[_term], "i") : terms[_term];

                        if (table[key][_term].search(re) >= 0)
                            resultsByData++;
                    }

                    if (resultsByData > 0) {
                        results.push(table[key]);
                    }
                }


                _callback(returnTable(results))
            })
        },

        getTable = function (table, _callback) {
            read(table, function (table) {
                _callback(returnTable(table))
            })
        },

        returnTable = function (table) {
            var newTable = []


            if (!table || !table[0])
                return null;

            if (!table[0].lastid)
                return table;

            delete table[0];

            for (var key in table)
                newTable.push(table[key])

            return newTable;
        },

        getRow = function (file, id, _callback) {
            read(file, function (table) {
                var key = getKey(table, id);

                _callback(key ? table[key] : null);
            })
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

    this.findOr = findOr;

    this.like = findOr;

    this.count = count;

    this.row = getRow;

    this.table = getTable;

    this.setErrorLog = function (error) {
        errorLog = error;
        return this;
    };

    this.path = function (_defaultPath) {
        defaultPath = _defaultPath + path.sep;
        return this;
    };

    this.init = function (path) {
        return this.path(path);
    };

    return this;

}

module.exports = new DataJson();
