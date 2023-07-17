import * as functions from 'firebase-functions'
const console = functions.logger

import admin from 'firebase-admin'
import { v4 as uuid } from 'uuid'
import {
  DiscountData, DiscountApplicationEnum,
  OrderData,
  FulfillOptionsEnum,
  PaymentOptionsEnum,
  PaymentGatewayData,
  CheckoutStatusEnum} from '../../js-docs-types.js'
// import { reserve_products } from '../../reserve-products/index.js'
import { calculate_pricing } from '../../calculate-pricing/index.js'
import { Firestore } from '@google-cloud/firestore'
import { validate_checkout } from '../validate-checkout/index.js'
import { create_search_index } from '../utils.js'
// import { ReserveResult } from './reserve-products.js'
// import { createOrder } from './gateways/paypal-standard-checkout.js'

/**
 * calculate pricing
 * @param {Firestore} db 
 * @param {OrderData} order 
 * @returns {Promise<OrderData}>}
 */
export const eval_pricing = 
  async (db, order) => {

  const snaps = await db.collection('discounts')
                        .where('enabled', '==', true)
                        .get()

  /**@type {DiscountData[]} */                          
  const discounts = snaps.docs.map(
    /**@type {admin.firestore.QueryDocumentSnapshot<DiscountData>} */
    snap => snap.data()
  )

  const auto_discounts = discounts.filter(
    it => it.application.id===DiscountApplicationEnum.Auto.id
    )
  const manual_discounts = discounts.filter(
    it => it.application.id===DiscountApplicationEnum.Manual.id
    ).filter(
      d => order.coupons.find(c => c.code===d.code)!==undefined
    )

  const pricing = calculate_pricing(
    order.line_items, 
    auto_discounts, 
    manual_discounts, 
    order.delivery, 
    order?.contact?.uid
  )

   return {
    ...order,
    pricing
   }
 }


/**
 * @param {Firestore} db
 * @param {OrderData} checkout_req
 * @returns {Promise<OrderData>}
 */
export const create_checkout = 
  async (db, checkout_req) => {

  let order = checkout_req

  // fetch correct data from backend. we dont trust client
  let t = Date.now()
  order = await validate_checkout(
    db, order
  )

  // eval pricing with discounts
  order = await eval_pricing(
    db, order
  )

  /**@type {OrderData} */
  order = {
    ...order,
    id: order.id ?? uuid(),
    status : {
      fulfillment: FulfillOptionsEnum.draft,
      payment: PaymentOptionsEnum.unpaid
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  
  const has_pending_errors = order.validation.length > 0
  // we had reserve errors, so publish it with pricing etc..
  if(has_pending_errors) {
    return order
  }

  // payment gateway config, maybe cache it for 1 hour
  const gateway_id = order.payment_gateway.gateway_id
  /**@type {admin.firestore.DocumentSnapshot<PaymentGatewayData>} */
  const pg_config = await db.collection('payment_gateways').doc(gateway_id).get()

  const payment_gateway_handler = await import(
    `../../gateways/${gateway_id}/index.js`
  )
  const { onCheckoutCreate } = payment_gateway_handler

  order.payment_gateway.on_checkout_create = await onCheckoutCreate(
    order, pg_config.data()
  )
  order.status.checkout = CheckoutStatusEnum.created
  order.search = create_search_index(order)

  await db.collection('orders').doc(order.id).set(order)

  return order
}