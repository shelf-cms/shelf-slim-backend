import express from 'express'
import cors from 'cors'
import { OrderData, SettingsData } from './js-docs-types.js'
import { assert } from './utils.js'
import checkout_router from './checkout/index.js'
import gateway_router from './gateways/index.js'
import { Firestore } from 'firebase-admin/firestore'
import { jwtVerify } from 'jose'
import { TextEncoder } from 'util'
// import { logger } from 'firebase-functions'
// let console = logger

/**
   * 
   * @param {import('express').Request} req 
   * @param {import('express').Response} res 
   * @param {*} next 
   */
const withAuthorization = async (req, res, next) => {
  const apiKey = req?.query?.apiKey
  const auth_header = req?.headers?.authorization
  /**@type {Firestore} */
  const db = req.app.locals.shelf.db
  const settings_main_snap = await db.collection('settings').doc('main').get()
  /**@type {SettingsData} */
  const settings_main = settings_main_snap.data()
  const be_apiKey = settings_main?.backend?.apiKey
  const be_secret = settings_main?.backend?.secret

  try {
    // if we have a secret, then we must have a JWT
    if(be_secret) {
      const encoded_be_secret = new TextEncoder().encode(be_secret)
      const jwt = auth_header?.split(' ').pop().trim()
      // console.log('req?.headers', req?.headers);
      // console.log('auth_header', auth_header);
      // console.log('jwt', jwt);
      try {
        await jwtVerify(jwt, encoded_be_secret)
      } catch(e) {
        console.log(e)
        throw new Error('auth/bad-jwt')
      }
    } else if (apiKey) {
      // otherwise, test api key
      assert(
        apiKey===be_apiKey,
        'auth/bad-apikey'
      )
    }
  } catch (e) {
    console.log(e)
    res.status(401).send({
      message: 'unauthorized'
    })
    return
  }
  next()
}

/**
 * @typedef {object} ShelfContext
 * @property {Firestore} db
 * 
 * @param {ShelfContext} shelf 
 */
export const create_backend = (shelf) => {
  const e = express()
  .use(express.json())
  .use(cors({ origin: '*' }));

  e.locals.shelf = shelf

  e.get('/get', 
    async (req, res) => {
      res.status(200).send('test get');
    }
  )

  e.get('/test/:col/:doc', 
    async (req, res) => {
      try {
        const { col, doc } = req.params
        console.log(`test doc: ${col}/${doc}`)
        /**@type {Firestore} */
        const db = req.app.locals.shelf.db
        await db.collection(col).doc(doc).update({
          _a: 'a'
        })
        res.status(200).send('test get');

      } catch(e) {
        res.status(501).send(e)
      }

    }
  )

  e.use(
    '/checkouts', 
    checkout_router
  )

  e.use(
    '/payments-gateways',
    withAuthorization,
    gateway_router
  )

  return e
} 

