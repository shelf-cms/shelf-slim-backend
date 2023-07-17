import fetch from 'node-fetch'
import { OrderData } from '../../js-docs-types.js';

const { PAYPAL_ENDPOINT, PAYPAL_CLIENT_ID, PAYPAL_APP_SECRET } = process.env;
// const base = 'https://api-m.sandbox.paypal.com'
// const base = 'https://api-m.paypal.com'
 
export const create = async (amount, checkoutId) => {
  const accessToken = await generateAccessToken()
  const url = `${PAYPAL_ENDPOINT}/v2/checkout/orders`

  const response = await fetch(
    url, 
    {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: 'ILS',
                value: amount,
              },
              invoice_id: `${checkoutId}_${Date.now()}`
            },
          ],
        }
      ),
    }
  )

  return handleResponse(response)
}

/**
 * 
 * @param {OrderData} checkout 
 * @returns 
 */
export const capture = async (checkout) => {
  const accessToken = await generateAccessToken()
  const url = `${PAYPAL_ENDPOINT}/v2/checkout/orders/${checkout.payment_gateway.create.id}/capture`

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

  return handleResponse(response);
}

export const generateAccessToken = async () => {
  const auth = Buffer.from(PAYPAL_CLIENT_ID + ':' + PAYPAL_APP_SECRET).toString('base64')
  const response = await fetch(
    `${PAYPAL_ENDPOINT}/v1/oauth2/token`, 
    {
      method: 'post',
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  )

  const jsonData = await handleResponse(response)
  return jsonData.access_token;
}

async function handleResponse(response) {
  if (response.status === 200 || response.status === 201) {
    return response.json()
  }

  const errorMessage = await response.text()
  throw new Error(errorMessage)
}
