# Datajson

Datajson is a data handler type bson that offers ODM environment giving all a simple and solid structure for processing.

Its structure is inspired by the Mongoose ODM. Using similar resources to handle and manipulate files type json

## Init

```javascript
  var datajson = require('datajson')({
    'path' : '/path/app/data',
    'modelPath' : '/path/app/model'
  });

  var model = datajson.model; // all model load
```

The setting options are Datajson:

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

## Methods
These are the methods of model

 - **add** : Inserts a new line.
 - **update** : Updates values of one or more lines
 - **remove** : Removes a specific line
 - **find** : Search and returns values
 - **findOne** : Search and returns the first value found
 - **findOne** : Search and returns the first value found
 - **findById** : Search for a specific id
 - **query** : Defines a query
 - **date** : Sets past values for a line
 - **drop** : Completely removes a file
 - **save** : Concludes the methods add, update and remove returns a registered entity and ready for use
 - **exec** : Executes methods find's, return entity or object list
 - **then** : Used to set a callback to treatment result of the action.

## Query
### Logical operators

And, Or and Not

### Comparison

- **$eq** : Matches values that are equal to a specified value.
- **$gt** : Matches values that are greater than a specified value.
- **$gte** : Matches values that are greater than or equal to a specified value.
- **$lt** : Matches values that are less than a specified value.
- **$lte** : Matches values that are less than or equal to a specified value.
- **$in** : Matches any of the values specified in an array.
- **$nin** : Matches none of the values specified in an array.

## Using queries

The query can be applied in the search methods, or by adding query method.

```javascript
model.profile.find({"age" : { "$gt" : 18 } })
```

In this example we get the data from all major profiles 18 years of age.
If we want to get over 18 or disabled the profile would be like this:

```javascript
model.profile.find({
  "$or" : { "age" : { "$gt" : 18 }, "active" : false }
})
```

### A more complex search:
Let's find users with the name Philippe or Martin, age less than or equal to 20 years and above 15 years. For this we will use the names regex

```javascript
model.profile.find({
  "$or" : [
    {"name" : /philippe/gi},
    {"name" : /martin/gi}
  ],
  "$and" : [
    {"age" : { "$eq": 15 }},
    {"age" : { "$lte": 20 }}
  ]
})
```

## Known bugs

### Bug 1
In line 32 of /src/datajson.js you will find this:

```javascript
      var model = require(path.resolve(modelPath, file))(Model).init(merge(true, defaultConfig, config))
})
```
But it should be like this:
```javascript
      var model = require(path.resolve(modelPath, file))(Model).init(config)
})
```

It happens that when passing the value to the variable 'config' for some reason for me unknown variable is populated by several values which are the Model properties.
The only solution I found was to pass again the merge function, so the config is not changed.
Surely this is happening for some stupid of me. So if you know a solution, be sure to contribute
