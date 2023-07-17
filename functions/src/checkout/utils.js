import { OrderData } from '../js-docs-types.js'

export const toUTCDateString = (utcMillis) => {
  const date = new Date(utcMillis);
  const d = date.getUTCDate();
  const m = date.getUTCMonth()+1;
  const y = date.getUTCFullYear().toString().slice(2)
  return [d, m, y].join('/')
}

/**
 * @param {OrderData} data
 * @returns {string[]}
 */
export const create_search_index = (data) => {

  const { firstname, lastname } = data.contact
  const { uid, email } = data.contact
  const contact_vs = []
  if(firstname) contact_vs.push(String(firstname).toLowerCase())
  if(lastname) contact_vs.push(String(lastname).toLowerCase())
  if(uid) {
    contact_vs.push(`uid:${uid}`)
    contact_vs.push(uid)
  }
  if(email) contact_vs.push(email)

  const readable_date = data?.updatedAt ? 
              [toUTCDateString(data.updatedAt)] : []
              
  const status_payment = data?.status?.payment?.name ? 
          [ 
            String(data.status.payment.name).toLowerCase(), 
            String(data.status.payment.name), 
            `payment:${String(data.status.payment.name).toLowerCase()}`,
            `payment:${String(data.status.payment.id)}`
          ] : []
  const status_fulfill = data?.status?.fulfillment?.name ? 
          [ 
            String(data.status.fulfillment.name).toLowerCase(), 
            String(data.status.fulfillment.name), 
            `fulfill:${String(data.status.fulfillment.name).toLowerCase()}`,
            `fulfill:${String(data.status.fulfillment.id)}`,
          ] : []
  
  const coupons = data.coupons ?
      [
        ...data.coupons.map(d => `coupon:${d.code}`),
      ] : []

  const price = data?.pricing?.total ? [ String(data?.pricing?.total) ] : []

  const terms = [
    data.id, 
    data.id.split('-')[0],
    ...contact_vs, 
    ...readable_date, 
    ...status_payment, 
    ...status_fulfill,
    ...price,
    ...coupons
  ]

  return terms
}
  