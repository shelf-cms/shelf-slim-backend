import express from 'express'
const router = express.Router()
import { create_checkout } from './create-checkout/index.js'
import { OrderData } from '../js-docs-types.js'
import { complete_checkout } from './complete-checkout/index.js'
import { assert } from '../utils.js'

router.post('/create', 
  async (req, res) => {
    try {

      /**@type {OrderData} */
      const checkout_req = req.body

      assert(checkout_req, 'checkout-body-not-found')

      try {

        const checkout = await create_checkout(
          req.app.locals.shelf.db, checkout_req
        )

        res.status(201).json(checkout)
      } catch (e) {
        console.error(e)
        throw Error('internal-checkout-error')
      }

    } catch (err) {
      console.error(err)
      res.status(400).send(
        { error: { message: err?.message ?? err} }
      )
    }
  }
)

/**
 * @typedef {any} CheckoutCompleteRequestBody
 */

// todo: chane name to confirm
router.post('/:checkoutId/complete', 
  async (req, res) => {
    try {

      /**@type {CheckoutCompleteRequestBody} */
      const body = req.body
      const { checkoutId } = req.params

      // assert(checkoutId, 'pay-body-not-found')

      try {

        const order = await complete_checkout(
          req.app.locals.shelf.db, checkoutId, body
        )

        // console.log('order ', order)
        res.status(201).json(order)

      } catch (e) {
        console.error(e)
        throw Error('internal-payment-error')
      }

    } catch (err) {
      console.error(err)
      res.status(400).send(
        { error: { message: err?.message ?? err} }
      )
    }
  }
)

export default router

// e.post('/pricing', 
//   async (req, res) => {
//     try {

//       /**@type {OrderData} */
//       const checkout_req = req.body

//       assert(checkout_req, 'checkout-body-not-found')

//       const { 
//         line_items, 
//         delivery, 
//         contact: {
//           uid
//         },
//         coupons
//       } = checkout_req
      
//       try {

//         const pricing = await eval_pricing(
//           db, line_items, delivery, coupons, uid
//         )
//         res.status(201).json(pricing)
//       } catch (e) {
//         console.error(e)
//         throw Error('internal-checkout-error')
//       }

//     } catch (err) {
//       console.error(err)
//       res.status(401).send(
//         { error: { message: err?.message ?? err} }
//       )
//     }
//   }
// )

