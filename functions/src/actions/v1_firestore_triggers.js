

export const onordermodifiedV1 = functionsv1.region('us-central1').firestore.document(
  'orders/{orderId}'
).onWrite(
  async (change, context) => {
    console.log('onordermodifiedV1')
    /**@type {OrderData} */
    const order_after = change.after.data()
    /**@type {OrderData} */
    const order_before = change.before.data()

    const has_checkout_complete = (
      order_after.status.checkout.id===CheckoutStatusEnum.complete.id &&
      order_before?.status?.checkout?.id!==order_after.status.checkout.id
    )

    if(has_checkout_complete) {
      // send mail
      await send_checkout_mail(db, order_after)
      return
    }
    
    const is_order_cancelled = (
      order_after.status.fulfillment.id===FulfillOptionsEnum.cancelled.id &&
      order_before?.status?.fulfillment?.id!==order_after.status.fulfillment.id
    )

    if(is_order_cancelled) {
      await send_cancel_mail(db, order_after)
      return
    }

    const is_order_shipped = (
      order_after.status.fulfillment.id===FulfillOptionsEnum.shipped.id &&
      order_before?.status?.fulfillment?.id!==order_after.status.fulfillment.id
    )

    if(is_order_shipped) {
      await send_shipping_mail(db, order_after)
      return
    }

  }
)


export const onusercreatedV1 = functionsv1.region('us-central1').firestore.document(
  'users/{userId}'
).onCreate(
  async (snapshot, context) => {
    console.log('onusercreatedV1')
    /**@type {UserData} */
    const user = snapshot.data()

    await send_welcome_mail(db, user)
  }
)
