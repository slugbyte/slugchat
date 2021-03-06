'use strict'

// DEPENDENCIES
import {Server} from 'http'
import cors from 'cors'
import morgan from 'morgan'
import express from 'express'
import io from './io.js'
import * as mongo from './mongo.js'
import subscribers from '../subscribe/index.js'
import enforceHTTPS from '../middleware/enforce-https.js'

import authRouter from '../router/auth.js'
import fourOhFour from '../middleware/four-oh-four.js'
import errorHandler from '../middleware/error-middleware.js'

// STATE
const app = express()

// global middleware
app.use(enforceHTTPS)
app.use(morgan('dev'))
app.use(cors({
  origin: process.env.CORS_ORIGINS.split(' '),
  credentials: true, 
}))


// routers
app.use(authRouter)

// handle errors
app.use(fourOhFour)
app.use(errorHandler)

const state = {
  isOn: false, 
  http: null,
}

// INTERFACE 
export const start = () => {
  return new Promise((resolve, reject) => {
    if (state.isOn) 
      return reject(new Error('USAGE ERROR: the state is on'))
    state.isOn = true
    mongo.start()
    .then(() => {
      state.http = Server(app)
      io(state.http, subscribers)
      state.http.listen(process.env.PORT, () => {
        console.log('__SERVER_UP__', process.env.PORT)
        resolve()
      })
    })
    .catch(reject)
  })
}

export const stop = () => {
  return new Promise((resolve, reject) => {
    if(!state.isOn)
      return reject(new Error('USAGE ERROR: the state is off'))
    return mongo.stop()
    .then(() => {
      state.http.close(() => {
        console.log('__SERVER_DOWN__')
        state.isOn = false
        state.http = null
        resolve()
      })
    })
    .catch(reject)
  })
}
