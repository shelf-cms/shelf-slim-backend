import { onRequest } from 'firebase-functions/v2/https'
// import * as functionsv1 from 'firebase-functions'
import {
  onDocumentWritten,
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted,
  Change,
} from 'firebase-functions/v2/firestore';

import admin from 'firebase-admin'
import { Firestore } from 'firebase-admin/firestore'
import { create_backend } from './src/index.js'
import { 
  CheckoutStatusEnum, FulfillOptionsEnum, 
  NotificationAction, 
  NotificationData, 
  OrderData, UserData } from './src/js-docs-types.js'
import { 
  send_cancel_mail, send_checkout_mail, 
  send_shipping_mail, send_welcome_mail } from './src/actions/send-mail.js'

const firebase = admin.initializeApp()
const db = firebase.firestore()
db.settings(
  {
    preferRest: true,
    ignoreUndefinedProperties: true
  }
)

/**@type {import('./src/index.js').ShelfContext} */
const shelf = {
  db
}

export const app = onRequest(
  create_backend(shelf)
)

/**
 * 
 * @param {string} message 
 * @param {*} search 
 * @param {*} author 
 * @param {NotificationAction} action 
 */
const notify = (message, search=[], author='unknown', action) => {
  /**@type {NotificationData} */
  const noti = {
    message,
    search,
    author: 'shelf-activity-bot 🤖',
    updatedAt: Date.now()
  }
}

// send checkout mails
export const onOrderModified = onDocumentWritten(
  {
    document: 'orders/{orderId}',
    region: 'us-central1',
  }, 
  async event => {
    /**@type {OrderData} */
    const order_after = event.data.after.data()
    /**@type {OrderData} */
    const order_before = event.data.before.data()

    /**@type {NotificationData} */
    const noti = {
      search: ['checkout', 'orders'],
      author: 'shelf-backend-bot 🤖',
      updatedAt: Date.now(),
      actions: [
        {
          name: '',
          type: 'route',
          params: {
            collection: 'orders',
            document: order_after?.id,
          }
        }
      ]
    }    
    console.log('orders/{orderId}')

    const has_checkout_complete = (
      order_after.status.checkout.id===CheckoutStatusEnum.complete.id &&
      order_before?.status?.checkout?.id!==order_after.status.checkout.id
    )

    if(has_checkout_complete) {
      try {
        await send_checkout_mail(db, order_after)
      } catch(e) {
        console.log(e)
      }
      
      // send mail
      // `\n* 🚀 **${count}** \`${c}\` were updated`
      const o = order_after
      const message = `
💰 **Checkout update**\n 
* \`${o?.address?.firstname ?? ''}\` has completed checkout. 
* 💳 Order total is \`${o?.pricing?.total ?? '-'}\`.
* 📧 Email was sent to ${o?.contact?.email ?? 'no-email'}
`
      await db.collection('notifications').add(
        {
          ...noti,
          message
        }
      );
    }
    
    const is_order_cancelled = (
      order_after.status.fulfillment.id===FulfillOptionsEnum.cancelled.id &&
      order_before?.status?.fulfillment?.id!==order_after.status.fulfillment.id
    )

    if(is_order_cancelled) {
      await send_cancel_mail(db, order_after)
    }

    const is_order_shipped = (
      order_after.status.fulfillment.id===FulfillOptionsEnum.shipped.id &&
      order_before?.status?.fulfillment?.id!==order_after.status.fulfillment.id
    )

    if(is_order_shipped) {
      try {
        await send_shipping_mail(db, order_after);
      } catch (e) {
        console.log(e)
      }
      //📦
      const o = order_after
      const message = `
💰 **Order update**\n 
* 📦 Shipping email update was sent to \`${o?.address?.firstname ?? ''}\`. 
* For order **${o?.pricing?.total ?? '-'}** 💳
`
      await db.collection('notifications').add(
        {
          ...noti,
          message
        }
      );

    }

  }
)

// send welcome mail

export const onUserCreated = onDocumentCreated(
  'users/{userId}', 
  async event => {
    /**@type {UserData} */
    const user = event.data.data()

    await send_welcome_mail(db, user)
  }
)

