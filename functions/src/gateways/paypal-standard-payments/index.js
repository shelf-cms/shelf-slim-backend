import fetch from 'node-fetch'
import { 
  CheckoutStatusEnum, OrderData, 
  PaymentGatewayData, PaymentOptionsEnum,
  BackendPaymentGatewayStatus } from '../../js-docs-types.js'

/**
 * @typedef {object} Config
 * @property {string} client_id
 * @property {string} secret_prod
 * @property {string} secret_test
 * @property {string} env
 * 
 * @typedef {object} PayPalOAuthRsponse
 * @property {string[]} scope
 * @property {string} access_token
 * @property {string} token_type
 * @property {string} app_id
 * @property {string} nonce
 * @property {number} expires_in
 * 
 * 
 * @typedef {object} Auth
 * @property {PayPalOAuthRsponse} latest_auth_response
 * @property {number} expires_at
 */



/**
 * checkout is created hook
 * 
 * @param {OrderData} order the order or checkout
 * @param {PaymentGatewayData} payment_gateway_config the config
 * @param {object} client_payload anything from the client
 * @returns 
 */
export const onCheckoutCreate = async (order, payment_gateway_config, client_payload) => {
  const accessToken = await getAccessToken(payment_gateway_config)
  const { 
    ENDPOINT, 
    config: { 
      currency_code='USD' 
    } 
  } = parseConfig(payment_gateway_config)

  const response = await fetch(
    `${ENDPOINT}/v2/checkout/orders`, 
    {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(
        {
          intent: 'AUTHORIZE',
          purchase_units: [
            {
              custom_id: order.id,
              amount: {
                currency_code: currency_code,
                value: order.pricing.total,
              },
              invoice_id: `${order.id}_${Date.now()}`
            },
          ],
        }
      ),
    }
  )

  if (!response.ok)
    throw new Error(await response.text())

  return await response.json()
}

/**
 * checkout is confirmed hook
 * 
 * @param {OrderData} order the order or checkout
 * @param {PaymentGatewayData} payment_gateway_config the config
 * @param {object} client_payload anything from the client
 * @returns 
 */
export const onCheckoutComplete = async (order, payment_gateway_config, client_payload) => {
  const accessToken = await getAccessToken(payment_gateway_config)
  const { 
    ENDPOINT, 
  } = parseConfig(payment_gateway_config)

  const response = await fetch(
    `${ENDPOINT}/v2/checkout/orders/${order.payment_gateway.on_checkout_create.id}/authorize`, 
    {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )
    if(!response.ok) {
      const errorMessage = await response.text()
      throw new Error(errorMessage)
    }
    
    const payload = await response.json()

    switch(payload.status) {
      case 'COMPLETED':
        order.status.payment = PaymentOptionsEnum.authorized
        order.status.checkout = CheckoutStatusEnum.complete
        break;
      case 'PAYER_ACTION_REQUIRED':
        order.status.checkout = CheckoutStatusEnum.requires_action
        break;
      default:
        order.checkout.status = CheckoutStatusEnum.failed
    }

    return payload
}

/**
 * @param {object} o paypal order api response
 * @returns {BackendPaymentGatewayStatus}
 */
const status_of_paypal_order = async (o) => {

  const result = {
    messages: []
  }
  const purchase_unit = o.purchase_units?.[0]
  const authorizations = purchase_unit?.payments?.authorizations?.[0]
  const captures = purchase_unit?.payments?.captures?.[0]
  const refunds = purchase_unit?.payments?.refunds?.[0]
  if(refunds) {
    const currency_code = refunds.amount.currency_code
    const price = refunds.amount.value
    const reason = refunds?.status_details?.reason
    const create_time = new Date(captures?.create_time).toUTCString()
    const update_time = new Date(captures?.update_time).toUTCString()
    result.messages.push(`**${price}${currency_code}** were tried to be \`REFUNDED\` at \`${create_time}\``)
    result.messages.push(`The status is \`${refunds.status}\`, updated at \`${update_time}\``)
    if(reason) {
      result.messages.push(`The reason for this status is \`${reason}\``)
    }
    result.messages.push(`Refund ID is \`${refunds?.id}\`.`)

  }
  else if(captures) {
    const currency_code = captures.amount.currency_code
    const price = captures.amount.value
    const reason = captures?.status_details?.reason
    const create_time = new Date(captures?.create_time).toUTCString()
    const update_time = new Date(captures?.update_time).toUTCString()
    result.messages.push(`**${price}${currency_code}** were tried to be \`CAPTURED\` at \`${create_time}\``)
    result.messages.push(`The status is \`${captures.status}\`, updated at \`${update_time}\``)
    if(reason) {
      result.messages.push(`The reason for this status is \`${reason}\``)
    }
    result.messages.push(`Capture ID is \`${captures?.id}\`.`)

  } else if (authorizations) {
    const currency_code = authorizations.amount.currency_code
    const price = authorizations.amount.value
    const reason = authorizations?.status_details?.reason
    const create_time = new Date(authorizations?.create_time).toUTCString()
    const update_time = new Date(authorizations?.update_time).toUTCString()
    const expiration_time = new Date(authorizations?.expiration_time).toUTCString()
    result.messages.push(`**${price}${currency_code}** were tried to be \`AUTHORIZED\` at \`${create_time}\``)
    result.messages.push(`The status is \`${authorizations.status}\`, updated at \`${update_time}\``)
    result.messages.push(`The authorization will expire at \`${expiration_time}\``)
    if(reason) {
      result.messages.push(`The reason for this status is \`${reason}\``)
    }
    result.messages.push(`Authorization ID is \`${authorizations?.id}\`.`)

  } else {
    const currency_code = purchase_unit.amount.currency_code
    const price = purchase_unit.amount.value
    result.messages.push(`An intent to **${o.intent}** of **${price}${currency_code}** was initiated`)
    result.messages.push(`The status is \`${o.status}\``)
  }
  
  return result
}

/**
 * retrieve PayPal order
 * 
 * @param {OrderData} order the order or checkout
 * @param {PaymentGatewayData} payment_gateway_config the config
 * @returns {any}
 */
const retrieve = async (order, payment_gateway_config) => {
  const accessToken = await getAccessToken(payment_gateway_config)
  const { 
    ENDPOINT, 
  } = parseConfig(payment_gateway_config)
  const url = `${ENDPOINT}/v2/checkout/orders/${order.payment_gateway.on_checkout_create.id}`

  const response = await fetch(
    url, 
    {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok)
    throw new Error(await response.text())

  const jsonData = await response.json()
  return jsonData
}

/**
 * checkout is confirmed hook
 * 
 * @param {OrderData} order the order or checkout
 * @param {PaymentGatewayData} payment_gateway_config the config
 * @returns {Promise<BackendPaymentGatewayStatus>}
 */
export const status = async (order, payment_gateway_config) => {
  const retrieved = await retrieve(order, payment_gateway_config)
  return status_of_paypal_order(retrieved)
}

/**
 * checkout is confirmed hook
 * 
 * @param {OrderData} order the order or checkout
 * @param {PaymentGatewayData} payment_gateway_config the config
 * @returns 
 */
export const capture = async (order, payment_gateway_config) => {
  const retrieved = await retrieve(order, payment_gateway_config)
  const accessToken = await getAccessToken(payment_gateway_config)
  const { 
    ENDPOINT, 
  } = parseConfig(payment_gateway_config)
  // console.log(retrieved)
  const authorization_id = retrieved?.purchase_units?.[0]?.payments?.authorizations?.[0]?.id
  const url = `${ENDPOINT}/v2/payments/authorizations/${authorization_id}/capture`

  const response = await fetch(
    url, 
    {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok)
    throw new Error(await response.text())

  const jsonData = await response.json()
  const stat = await status(order, payment_gateway_config)
  return stat
}

/**
 * checkout is confirmed hook
 * 
 * @param {OrderData} order the order or checkout
 * @param {PaymentGatewayData} payment_gateway_config the config
 * @returns 
 */
export const void_authorized = async (order, payment_gateway_config) => {
  const retrieved = await retrieve(order, payment_gateway_config)
  const accessToken = await getAccessToken(payment_gateway_config)
  const { 
    ENDPOINT, 
  } = parseConfig(payment_gateway_config)
  const authorization_id = retrieved?.purchase_units?.[0]?.payments?.authorizations?.[0]?.id
  const url = `${ENDPOINT}/v2/payments/authorizations/${authorization_id}/void`

  const response = await fetch(
    url, 
    {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok)
    throw new Error(await response.text())

  const stat = await status(order, payment_gateway_config)
  return stat
}

/**
 * checkout is confirmed hook
 * 
 * @param {OrderData} order the order or checkout
 * @param {PaymentGatewayData} payment_gateway_config the config
 * @returns 
 */
export const refund = async (order, payment_gateway_config) => {
  const retrieved = await retrieve(order, payment_gateway_config)
  const accessToken = await getAccessToken(payment_gateway_config)
  const { 
    ENDPOINT, 
  } = parseConfig(payment_gateway_config)
  const capture_id = retrieved?.purchase_units?.[0]?.payments?.captures?.[0]?.id
  const url = `${ENDPOINT}/v2/payments/captures/${capture_id}/refund`

  const response = await fetch(
    url, 
    {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok)
    throw new Error(await response.text())

  const stat = await status(order, payment_gateway_config)
  return stat
}

/**
 * @type {Auth}
 */
let current_auth = {
  latest_auth_response: {
  },
  expires_at: 0
}

/**
 * 
 * @param {PaymentGatewayData} $config 
 */
const parseConfig = ($config) => {
  /**@type {Config} */
  const config = $config.attributes.reduce(
    (p, attr) => {
      p[attr.key] = attr.val
      return p
    }, {}
  )
  const CLIENT_ID = config?.[`client_id_${config.env}`]
  const SECRET = config?.[`secret_${config.env}`]
  const ENDPOINT = config?.[`endpoint_${config.env}`]

  return {
    CLIENT_ID, SECRET,
    ENDPOINT, config
  }
}

/**
 * get access token if it has expired
 * 
 * @param {PaymentGatewayData} $config 
 * @returns 
 */
export const getAccessToken = async ($config) => {
  const {
    CLIENT_ID, SECRET, ENDPOINT
  } = parseConfig($config)
  const auth = Buffer.from(CLIENT_ID + ':' + SECRET).toString('base64')
  const expired = current_auth.expires_at - Date.now() <= 10*1000

  if(!expired)
    return current_auth.latest_auth_response.access_token

  const response = await fetch(
    `${ENDPOINT}/v1/oauth2/token`, 
    {
      method: 'post',
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  )

  if (!response.ok)
    throw new Error(await response.text())

  const jsonData = await response.json()
  current_auth.latest_auth_response = jsonData
  return jsonData.access_token;
}

