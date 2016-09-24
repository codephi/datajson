module.exports = function(Model) {
    return new Model({
        name: 'profile',
        schema: {
            name: {
                required: true,
                type: String
            },
            description: String,
            active: {
                default: false,
                type: Boolean
            },
            categorie: {
                default: 'dev',
                type: String
            },
            birth: {
                required: true,
                type: Date
            },
            age: Number,
            dog: Number
        }
    })
}
