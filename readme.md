# Datajson

Datajson is a data handler type bson that offers ODM environment giving all a simple and solid structure for processing.

Its structure is inspired by the Mongoose ODM. Using similar resources to handle and manipulate files type json

## Init

```javascript
  var datajson = require('datajson')({
    'path' : 'data'
  });
```

The setting options are Json Date:

- **path** : Path where the files will be saved, default: dirname
- **indenting** : If not required indentation for the writing of files, null, otherwise set to decimal values or '\t'. These data will be passed as the third parameter of [JSON.stringify()](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- **ext** : json file extension, default: .json
- **modelPath** : the model file path

## Create a model

You can deploy directly from the file templates that are working. But for better organization suggest that write in a separate folder, with this example.

File: /model/profile.js

```javascript
module.exports = function(Model){
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
        age: Number
    }
  })
}
```

From the model you can manipulate your bank as an MDG
