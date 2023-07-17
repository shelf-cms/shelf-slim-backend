import { ProductData, OrderData, ValidationEntry } from '../../js-docs-types.js'
import { Firestore } from '@google-cloud/firestore'

/**
 * @param {Firestore} db
 * @param {OrderData} checkout
 * @returns {Promise<OrderData>}
 */
export const validate_checkout = 
  async (db, checkout) => {

  const refs_products = checkout.line_items.map(
    li => db.collection('products').doc(li.id)
  )
  const ref_shipping = db.collection('shipping_methods').doc(checkout.delivery.id)

  const all_snaps = await db.getAll(...refs_products, ref_shipping)
  const snap_shipping = all_snaps.pop()
  const snaps_products = all_snaps

  /**@type {ValidationEntry[]} */
  const errors = []

  const errorWith = (id, message) => {
    errors.push(
      { id, message}
    )
  }

  // assert shipping is valid
  if(!snap_shipping.exists)
    errorWith(snap_shipping.id, 'shipping-method-not-found')
  else { // else patch the latest
    checkout.delivery = snap_shipping.data()
  }

  // assert stock
  snaps_products.forEach(
    (it, ix) => {
      if(!it.exists) {
        errorWith(it.id, 'product-not-exists')
      } else {
        /**@type {ProductData} */
        const pd = it.data()
        const li = checkout.line_items[ix]

        if(pd.qty==0)
          errorWith(it.id, 'product-out-of-stock')
        else if(li.qty>pd.qty)
          errorWith(it.id, 'product-not-enough-stock')

        // patch line items inline
        li.data = pd
        li.price = pd.price
        li.stock_reserved = 0
      }
    }
  )

  return {
    ...checkout, 
    validation: errors 
  }

}

