"use strict"

import express from 'express'
import mongoose from 'mongoose'

let server = express()

try {
    await mongoose.connect('mongodb://localhost:27017/Catalogue', { useNewUrlParser: true, useUnifiedTopology: true})

    mongoose.connection.on('error', err => {
        console.error(`Database connection lost. ${err}`)
    })
} catch (error) {

    console.error(`Failed to connect to the database. ${error}`)
}

