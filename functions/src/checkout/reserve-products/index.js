import { FulfillOptionsEnum, PaymentOptionsEnum, 
  ProductData, LineItem, ShippingData, UserData,
  OrderData } from '../js-docs-types.js'
import { Transaction } from 'firebase-admin/firestore'
import { DocumentSnapshot, Firestore } from '@google-cloud/firestore'

/**
 * 
 * @typedef {object} ReservesData
 * @property {object[]} items
 * @property {string} items.reserved_for
 * @property {string} items.id
 * @property {number} items.qty
 * @property {number} items.until
 * 
 * @typedef {object} ADD_ReservesData
 * @property {ReservesData} reserves 
 * 
 * @typedef {ProductData & ADD_ReservesData} ProductWithReserves
 * 
 * 
 */
export const ProductWithReserves = {}
export const ReservesData = {}


/**
 * @typedef {object} ReserveResult
 * @property {number?} reserved_until
 * @property {string} checkoutId
 * @property {LineItem[]} line_items
 * @property {ReserveReport} report
 */
export const ReserveResult = {}

/**
 * @typedef {object} ReportEntry
 * @property {string} id
 * @property {string} title
 * @property {'out-of-stock' | 'not-enough-stock' | 'some-stock-is-on-hold'} message
 * @property {number?} client_side_price
 * @property {number?} backend_side_price
 * 
 * @typedef {ReportEntry[]} ReserveReport
 */
export const CheckoutReport = {}
export const ReportEntry = {}

/**
 * iterate over all reserves and compute available total by time
 * @param {ProductData} pd 
 * @param {string} key 
 */
export const compute_reserved_quantity_for_product = (pd, key) => {
  return pd?.reserves?.items?.reduce(
    (p, c) => {
      return p + ((Date.now() < c.until) && c.reserved_for!==key) ? c.qty : 0
    }, 0
  ) ?? 0
}

/**
 * Given backend products and corresponding front end line items,
 * Iterate every line-item and create a report:
 * 1. if stock quantity cannot be garanteed ''
 * @param {LineItem[]} line_items fresh list of corresponding backend products
 * @param {string} checkoutId
 * @returns {ReserveReport}
 */
export const compute_report = 
  (line_items, checkoutId) => {

  return line_items.reduce(
    (p, li, idx) => {
      const pd = li.data
      const base_error = {
        id: li.id, 
        title: li.data?.title
      }

      let message = undefined
      if(pd.qty==0)
        message = 'out-of-stock'
      else {
        // we have some stock
        const reserved_count = compute_reserved_quantity_for_product(
          pd, checkoutId
        )
        const available_count = pd.qty - reserved_count
        if(li.qty > pd.qty) {
          message = 'not-enough-stock'
        } else if (li.qty > available_count) {
          message = 'some-stock-is-on-hold'
        }
      }

      if(message!==undefined)
        p.push(
          {
            ...base_error,
            message
          }
        )

      return p
    }, []
  )
}

/**
 * @param {Firestore} db
 * @param {LineItem[]} line_items
 * @param {string} checkoutId
 * @returns {Promise<ReserveResult>}
 */
export const reserve_products = 
  async (db, line_items, checkoutId) => {

  /**@type {import('@google-cloud/firestore').ReadWriteTransactionOptions} */
  const options = {
    readOnly: false, 
    maxAttempts: 5
  }
  const refs_products = line_items.map(
    li => db.collection('products').doc(li.id)
  )

  return db.runTransaction(
    async (t) => {
      /**@type {DocumentSnapshot<ProductWithReserves>[]} */
      let pd_snaps = await t.getAll(...refs_products)

      // - filter non-existant products (that were probably deleted)
      line_items = line_items.filter(
        (li, ix) => pd_snaps[ix].exists
      )
      pd_snaps = pd_snaps.filter(
        snap => snap.exists
      )

      // - map the correct price and data
      line_items = line_items.map(
        (li, ix) => ({
          ...li, 
          price: pd_snaps[ix].data().price,
          data: pd_snaps[ix].data()
        })
      )

      const report = compute_report(line_items, checkoutId)

      /**@type {ReserveResult} */
      const base = {
        checkoutId,
        report,
        line_items,
      }
    
      if(report.length)
        return base
    
      // let's add a record
      const until = Date.now() + 1000 * 60 * 10
    
      // let's reserve temporal stocks (not reduce yet)
      pd_snaps.forEach(
        (snap, ix) => {
          // for each product, filter out outdated reserves
          // and add a new one for us
          /**@type {ReservesData} */
          const reserves = {}
          const li = line_items[ix]
          /**@type {ProductWithReserves} */
          const pd = li.data
          reserves.items = pd?.reserves?.items?.filter(
            ei => ei.until > Date.now() && ei.reserved_for!==checkoutId
          ) ?? []
          const can_reserve = li.qty <= pd.qty - 
                compute_reserved_quantity_for_product(pd, checkoutId)
    
          can_reserve && reserves.items.push(
            {
              id: li.id,
              qty: li.qty,
              reserved_for: checkoutId,
              until // 10 minutes from now
            }
          )
          
          t.update(snap.ref, {
            reserves
          })
        }
      )
    
      // console.log('snaps  ', snaps)
      return {
        ...base, 
        reserved_until: until,
      }
    
    }, options
  )

}

