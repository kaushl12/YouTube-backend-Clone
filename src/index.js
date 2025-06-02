import mongoose from 'mongoose'
import express from 'express'
import connectDB from './db/index.js'
import dotenv from "dotenv"
const app=express()

dotenv.config({
    path:'./env'
})

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running ar port : ${process.env.PORT}`);
    })
    app.on("error",(error)=>{
            console.log("Error",error)
        })
})
.catch((err)=>{
    console.log("MONGO Db connection failed!!",err);
    
})
/*
;(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("Error",error)
        })

        app.listen(process.env.PORT)
    } catch (error) {
        console.error("ERROR",error)
        throw err
    }
})()*/
