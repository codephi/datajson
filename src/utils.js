var path = require('path')

module.exports = {
    utils: function() {
        return dateFormat(new Date(), "yyyy-mm-ddThh:MM:ss")
    },
    error: function(active) {
        this.log = function() {
            if (active) {
                console.error(error)
            }
        }

        return this;
    },
    fixPath = function(base, file, ext) {
        if (ext) {
            file += '.json';
        }

        return path.resolve(defaultPath, file);
    }
}
