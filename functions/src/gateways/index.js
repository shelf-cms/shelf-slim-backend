import express from 'express'
const router = express.Router()
import { Firestore } from 'firebase-admin/firestore'

router.get(
  '/:gateway_id/status/:order_id',
  async (req, res) => {
    try {
      
      const { gateway_id, order_id } = req.params
      /**@type{{ db: Firestore }} */
      const { db } = req.app.locals.shelf

      const snaps = await db.getAll(
        db.collection('orders').doc(order_id),
        db.collection('payment_gateways').doc(gateway_id),
      )

      const { status } = await import(`./${gateway_id}/index.js`)
      const result = await status(
        snaps[0].data(), snaps[1].data()
      )

      res.json(result)
    } catch (e) {
      console.log(e)
      res.status(501).json({
        error: e
      })
    }

  }

)

router.post(
  '/:gateway_id/capture/:order_id',
  async (req, res) => {
    try {
      
      const { gateway_id, order_id } = req.params
      /**@type{{ db: Firestore }} */
      const { db } = req.app.locals.shelf

      const snaps = await db.getAll(
        db.collection('orders').doc(order_id),
        db.collection('payment_gateways').doc(gateway_id),
      )

      const { capture } = await import(`./${gateway_id}/index.js`)
      const result = await capture(
        snaps[0].data(), snaps[1].data()
      )

      res.json(result)
    } catch (e) {
      console.log(e)
      res.status(501).json({
        error: e
      })
    }

  }

)

router.post(
  '/:gateway_id/void/:order_id',
  async (req, res) => {
    try {
      
      const { gateway_id, order_id } = req.params
      /**@type{{ db: Firestore }} */
      const { db } = req.app.locals.shelf

      const snaps = await db.getAll(
        db.collection('orders').doc(order_id),
        db.collection('payment_gateways').doc(gateway_id),
      )

      const { void_authorized } = await import(`./${gateway_id}/index.js`)
      const result = await void_authorized(
        snaps[0].data(), snaps[1].data()
      )

      res.json(result)
    } catch (e) {
      console.log(e)
      res.status(501).json({
        error: e
      })
    }

  }

)

router.post(
  '/:gateway_id/refund/:order_id',
  async (req, res) => {
    try {
      
      const { gateway_id, order_id } = req.params
      /**@type{{ db: Firestore }} */
      const { db } = req.app.locals.shelf

      const snaps = await db.getAll(
        db.collection('orders').doc(order_id),
        db.collection('payment_gateways').doc(gateway_id),
      )

      const { refund } = await import(`./${gateway_id}/index.js`)
      const result = await refund(
        snaps[0].data(), snaps[1].data()
      )

      res.json(result)
    } catch (e) {
      console.log(e)
      res.status(501).json({
        error: e
      })
    }

  }

)

export default router

/*
import discovery from './discovery.json' assert { type: 'json' }
router.get(
  '/list',
  async (req, res) => {
    try {
      let apps = discovery.apps.map(
        async app => {
          const { id } = app
          const { info } = await import(`./${id}/index.js`)
          return await info()
        }
      )  

      apps = await Promise.all(apps )

      res.json(apps)
    } catch (e) {
      res.json({
        error: e
      }).status(501)
    }

  }

)
*/