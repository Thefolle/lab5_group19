# Hints

Here is a mutation to create a Comment:
```
mutation {
    createComment(
        comment: {
            title: "myTitle"
            stars: 4
        }
    )
}
```
the signature of createComment has to match the signature of the same
method defined inside the mutator object in the graphQL
schema; this last one has an implementation that is
a resolver.

There are two separate data schemas in the application: 
one for MongoDB and the other for GraphQL.