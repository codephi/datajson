var path = require('path')
var model = require('../src/datajson')({
    'path': path.resolve(__dirname, 'data'),
    'indenting': 4,
    'ext': '.json',
    'modelPath': path.resolve(__dirname, 'model')
}).model

var profile = model.profile;

profile.drop((result) => {
    var assis = profile.add({
        name: 'Philippe Assis',
        birth: '1989-05-05',
        active: true,
        age: (new Date()).getFullYear() - 1989
    }).save()

    var martin = profile.add({
        name: "Martin",
        birth: "1995-01-18",
        age: (new Date()).getFullYear() - 1995
    }).save()

    var redbull = profile.add({
        name: 'Red Bull',
        birth: '1990-10-01',
        age: (new Date()).getFullYear() - 1990
    }).save();

    var users = profile.find({
        $or: [{
            age: {
                $gt: 26
            }
        }, {
            age: {
                $lte: 21
            },
            name: /red/gi
        }]
    }).exec()

    console.log(users)
})
