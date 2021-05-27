"use strict"

import express from 'express'
import {makeExecutableSchema} from 'graphql-tools'
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
    date: Date
})
let Comment = new mongoose.model('Comment', CommentSchema)

let ProductSchema = new mongoose.Schema({
    name: String,
    createdAt: Date,
    description: String,
    price: Number,
    comments : [{type: mongoose.Schema.Types.ObjectId, ref: "Comment"}],
    category: String,
    stars: Number
})
let Product = new mongoose.model('Product', ProductSchema)



/* GraphQL: schema and resolvers */

const graphQLSchema = makeExecutableSchema({
    typeDefs: `
        scalar DateTime,
        enum ProductCategory {
            STYLE
            FOOD
            TECH
            SPORT
        },
        enum SortingValue {
            createdAt
            price
        },
        enum SortingOrder {
            asc
            desc
        },
        input ProductCreateInput {
            name : String!,
            description : String,
            price : Float!,
            category: ProductCategory!
        },
        input CommentCreateInput {
            title: String!,
            body: String,
            stars: Int!
        }
        type Comment {
            _id: ID!,
            title: String!,
            body: String,
            stars: Int!,
            date: DateTime!
        },
        type Product {
            _id: ID!,
            name: String!,
            createdAt: DateTime!,
            description: String,
            price: Float!,
            comments (numberOfLastRecentComments: Int) : [Comment],
            category: ProductCategory!,
            stars: Float
        },
        input ProductFilterInput {
            categories: [ProductCategory],
            minStars: Int,
            minPrice: Float,
            maxPrice: Float
        },
        input ProductSortInput {
            value: SortingValue!,
            order: SortingOrder!
        },
        type Query {
            products (filter: ProductFilterInput, sort: ProductSortInput) : [Product],
            product (id: ID!) : Product,
        },
        type Mutation {
            createProduct (product: ProductCreateInput!) : Product,
            createComment (
                comment: CommentCreateInput!,
                productId: ID!
            ) : Comment
        }
    `,
    resolvers: {
        Query: {
            product: async (parent, args, context, info) => {
                return Product.findById(args.id)
            }
        },
        Mutation: {
            createComment: async (parent, args, context, info) => {
                let commentInput = args.comment
                commentInput.date = Date.now()
                let comment = new Comment(commentInput)
                const res = await comment.save()

                const id = args.productId

                await Product.findOneAndUpdate({
                    _id: id
                }, {
                    $push : {comments: comment}
                })

                return res
            },
            createProduct: async (parent, args, context, info) => {
                let productInput = args.product
                productInput.createdAt = Date.now()
                let product = new Product(productInput)
                return await product.save()
            }
        }
    }
})


/* Logging extension */

// const extensions = ({document, variables, operationName, result, context}) => {
//     let now = new Date()
//     let log = `LOG ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}  `
//     log += document.definitions[0].operation
//     for (let field in result.data) log += ` ${field} ${result.data[field]}`
//
//     console.log(log)
// }



/* Run the web server */

let server = express()
// server.use(graphIQLPath, graphqlHTTP({schema: graphQLSchema, graphiql: true, extensions}))

server.use(graphIQLPath, graphqlHTTP({schema: graphQLSchema, graphiql: true}))

server.listen(port, () => {
    console.log(`Server listening on port ${port}, graphQL client available at ${graphIQLPath}`)
})


