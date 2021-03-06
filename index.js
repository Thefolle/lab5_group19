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
            product: (parent, args, context, info) => {
                return Product.findById(args.id);
            },
            products: async (parent, args, context, info) =>{
                let cat
                let minP
                let maxP
                let minS
                let sort_value
                let sort_order
                //Check if some filter is missing and set a default value
                if (!args.filter) args.filter = {}
                if (!args.sort) args.sort = {value: 'createdAt', order: 'asc'}

                //categories
                if (args.filter.categories == null)
                    cat = ['FOOD', 'SPORT', 'TECH', 'STYLE']
                else
                    cat = args.filter.categories
                //minStars
                if (args.filter.minStars == null)
                    minS = 0
                else
                    minS = args.filter.minStars
                //minPrice
                if (args.filter.minPrice == null)
                    minP = 0
                else
                    minP = args.filter.minPrice
                //maxPrice
                if (args.filter.maxPrice == null)
                    maxP = Number.MAX_VALUE
                else
                    maxP = args.filter.maxPrice

                return Product.find({category: {"$in": cat},
                                          stars: {"$gte": minS},
                                          price: {"$gte": minP, "$lte": maxP}}).sort({[args.sort.value]: args.sort.order,})

            }
        },
        Mutation: {
            createComment: async (parent, args, context, info) => {
                if (args.comment.stars < 1 || args.comment.stars > 5) {
                    console.log("Error: Stars must be from 1 to 5!")
                    return
                }

                let commentInput = args.comment
                commentInput.date = Date.now()
                let comment = new Comment(commentInput)
                //save new comment
                const res = await comment.save()

                const id = args.productId
                var stars = comment.stars

                //find all the comments for that product and compute the avg of the stars
                let product =  await Product.findById(id)
                let commentID;

                let comments = await Comment.find({"_id": {"$in": product.comments}})
                let comments_stars = comments.map((it)=> {return it.stars})
                for (let i = 0; i<comments_stars.length; i++){
                    stars += comments_stars[i]
                }
                stars = stars/(comments_stars.length + 1)

                //update Product adding the new comment and updating value of stars
                await Product.findOneAndUpdate({
                    _id: id
                }, {
                    $push : {comments: comment},
                    stars: stars
                })

                return res
            },
            createProduct: async (parent, args, context, info) => {
                let productInput = args.product
                productInput.createdAt = Date.now()
                let product = new Product(productInput)
                product.stars = 0
                return await product.save()
            }
        }
    }
})


/* Run the web server */

let server = express()

server.use(graphIQLPath, graphqlHTTP({schema: graphQLSchema, graphiql: true}))

server.listen(port, () => {
    console.log(`Server listening on port ${port}, graphQL client available at ${graphIQLPath}`)
})


