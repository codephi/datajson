var path = require('path')
var model = require('../src/datajson')({
    'path': path.resolve(__dirname, 'data'),
    'indenting': 4,
    'ext': '.json',
    'modelPath': path.resolve(__dirname, 'model')
}).model


model.profile.drop((result) => {
    /**
     * Insert
     */
    var assis = profile.add({
        name: 'Philippe Assis',
        birth: '1989-05-05',
        active: true,
        age: (new Date()).getFullYear() - 1989
    }).save()

    //Inset callback
    var martin = profile.add({
        name: "Martin",
        birth: "2015-01-18"
    }).save(() => {
        assis.update({
            'age': 1
        }).save().then((data) => {
            assis.update({
                dog: data.id
            }).save()
        })
    })

    profile.add({
        name: 'Red Bull',
        birth: '1990-10-01',
        age: (new Date()).getFullYear() - 1990
    }).save();

    find = profile.find({
        active: false
    }).exec();


var itens = profile.update({
        age: 30
    }).query({
        age: {
            $lt: 27
        }
    }).save()


noActive = profile.find({
    $and: [{
        age: {
            $gt: 27
        }
    }]
}).exec();



noActive.map((value) => {
        console.log(value.name)
    })
    })
