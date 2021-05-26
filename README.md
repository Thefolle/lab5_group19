# Examples on usage of the application

Here is a mutation to create a Comment; the signature
of createComment has to match the signature of the same
method defined in the graphQL schema:
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