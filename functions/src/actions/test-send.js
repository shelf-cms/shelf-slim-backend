import order from './order.json' assert { type: 'json' }
import { send_checkout_mail, send_cancel_mail } from './send-mail.js'

const test = async () => {
 await send_cancel_mail({}, order)
}

await test()