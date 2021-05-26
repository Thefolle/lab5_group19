"use strict"

import express from 'express'
import graphql_tools from 'graphql-tools'
import {graphqlHTTP} from "express-graphql"
import mongoose from 'mongoose'

const port = 3000
const dbPort = 27017
const dbName = 'Catalogue'
const graphIQLPath = '/graphql'



/* Connect to the db */

try {
    await mongoose.connect(`mongodb://localhost:${dbPort}/${dbName}`, { useNewUrlParser: true, useUnifiedTopology: true})

    mongoose.connection.on('error', error => {
        throw new Error(`Database connection lost.\n${error}`)
    })
} catch (error) {
    throw new Error(`Failed to connect to the database.\n${error}`)
}



/* Schemas for MongoDB */

let CommentSchema = new mongoose.Schema({
    title: String,
    body: String,
    stars: Number,
    date: Number
})
let Comment = new mongoose.model('Comment', CommentSchema)



/* GraphQL: schema and resolvers */

const graphQLSchema = graphql_tools.makeExecutableSchema({
    typeDefs: `
        input CommentCreateInput {
            title: String!,
            body: String,
            stars: Int!
        },
        type Comment {
            _id: ID,
            title: String!,
            body: String,
            stars: Int!,
            date: Int
        },
        type Mutation {
            createComment(comment: CommentCreateInput): ID
        },
        type Query {
            dummy: String
        }
    `,
    resolvers: {
        Mutation: {
            createComment: (parent, args, context, info) => {
                let commentInput = args.comment
                commentInput.date = Date.now()
                let comment = new Comment(commentInput)
                return comment.save().then(savedComment => savedComment.id)
            }
        }
    }
})


/* Logging extension */

const extensions = ({document, variables, operationName, result, context}) => {
    let now = new Date()
    let log = `LOG ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}  `
    log += document.definitions[0].operation
    for (let field in result.data) log += ` ${field} ${result.data[field]}`

    console.log(log)
}



/* Run the web server */

let server = express()
server.use(graphIQLPath, graphqlHTTP({schema: graphQLSchema, graphiql: true, extensions}))

server.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})


