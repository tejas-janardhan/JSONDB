Philosophy -

External API must have flexible inputs, and varied functions that manipulate the internal API
Internal API must have hard inputs.

About Project -

Create a fast as possible noSQL mongo-like db using only json files.

Internal Notes:

Date objects get converted to string in the collection. and retrieved as strings

Nature of exceptions vs returning nothing [] , null or undefined

Engine.internalFilter is the general purpose filter method.
engine.filter will always real with arrays for returned docs.

TODO
Write test suite to keep it in check.

Each Database/db Engine relies is represented by the data directory.
