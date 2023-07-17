import { DocumentSnapshot, Firestore } from '@google-cloud/firestore'
import { FieldValue } from 'firebase-admin/firestore'
import { FulfillOptionsEnum, OrderData, PaymentOptionsEnum } from '../../js-docs-types.js'
import { v4 as uuid } from 'uuid'
import { assert } from '../../utils.js'
import { create_search_index } from '../utils.js'

/**
 * 
 * @param {Firestore} db 
 * @param {string} checkoutId 
 * @param {object} client_payload 
 */
export const complete_checkout = 
  async (db, checkoutId, client_payload) => {
  
  const ref_order = db.collection('orders').doc(checkoutId)

  /**@type {DocumentSnapshot<OrderData>} */
  const snap = await ref_order.get()
  const order = snap.data()

  assert(snap.exists, 'checkout-not-found')

  const gateway_id = order.payment_gateway.gateway_id
  const pg_config = await db.collection('payment_gateways').doc(gateway_id).get()
  const gateway_handler = await import(`../../gateways/${gateway_id}/index.js`)
  const onCheckoutComplete = gateway_handler.onCheckoutComplete
  const complete = await onCheckoutComplete(
    order, pg_config.data(), 
    client_payload
  )

  order.payment_gateway.on_checkout_complete = complete
  order.updatedAt = Date.now()
  order.search = create_search_index(order)

  await db.collection('orders').doc(order.id).set(order)

  return order
}


