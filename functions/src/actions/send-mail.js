import { Firestore } from "firebase-admin/firestore";
import { OrderData, UserData } from "../js-docs-types.js";
import Mailgen from 'mailgen'
import nodemailer from "nodemailer"

const STORE_NAME = 'YOUR_STORE_NAME'
const STORE_WEBSITE = 'website.com'
const YOUR_MAIL = 'support@your-domain.com'
const SEND_GRID_SECRET = 'SEND_GRID_SECRET'

const send = async (subject, html, text, to) => {
  let transporter = nodemailer.createTransport({
    host: "smtp.sendgrid.net",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'apikey', // generated ethereal user
      pass: SEND_GRID_SECRET, // generated ethereal password
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: `shelf 👻" <${YOUR_MAIL}>`, // sender address
    to: to, // list of receivers
    subject: subject, // Subject line
    text: text, // plain text body
    html: html, // html body
  });

}

/**
 * @param {Firestore} db 
 * @param {OrderData} order 
 */
export const send_checkout_mail = async (db, order) => {
  var mailGenerator = new Mailgen({
    theme: 'default',
    product: {
        // Appears in header & footer of e-mails
        name: STORE_NAME,
        link: STORE_WEBSITE
        // Optional product logo
        // logo: 'https://mailgen.js/img/logo.png'
    }
  });  

  var email = {
    body: {
        name: order.address.firstname,
        intro: [
          `Your order ${order.id} was recieved.`,
          'You will be billed after we prepare to send your order.'
        ],
        action: {
            instructions: 'To view your order, please click here:',
            button: {
                color: '#973cff', // Optional action button color
                text: 'View Order',
                link: `${STORE_WEBSITE}/orders?order=${order.id}`
            }
        },
        outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
    }
  };

  // Generate an HTML email with the provided contents
  var html = mailGenerator.generate(email);
  var text = mailGenerator.generatePlaintext(email);
  var subject = `${STORE_NAME} Order received`;

  await send(subject, html, text, order.contact.email)
}

/**
 * @param {Firestore} db 
 * @param {OrderData} order 
 */
export const send_cancel_mail = async (db, order) => {
  var mailGenerator = new Mailgen({
    theme: 'default',
    product: {
        // Appears in header & footer of e-mails
        name: STORE_NAME,
        link: STORE_WEBSITE,
        // Optional product logo
        // logo: 'https://mailgen.js/img/logo.png'
    }
  });  

  var email = {
    body: {
        name: order.address.firstname,
        intro: [
          `Your order ${order.id} was cancelled.`
        ],
        action: {
            instructions: 'To view your cancelled order, please click here:',
            button: {
                color: '#973cff', // Optional action button color
                text: 'View Cancelled Order',
                link: `${STORE_WEBSITE}/orders?order=${order.id}`
            }
        },
        outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
    }
  };

  // Generate an HTML email with the provided contents
  var html = mailGenerator.generate(email);
  var text = mailGenerator.generatePlaintext(email);
  var subject = `${STORE_NAME} order cancelled`;

  await send(subject, html, text, order.contact.email)
}

/**
 * @param {Firestore} db 
 * @param {OrderData} order 
 */
export const send_shipping_mail = async (db, order) => {
  var mailGenerator = new Mailgen({
    theme: 'default',
    product: {
        // Appears in header & footer of e-mails
        name: STORE_NAME,
        link: STORE_WEBSITE,
        // Optional product logo
        // logo: 'https://mailgen.js/img/logo.png'
    }
  });  

  var email = {
    body: {
        name: order.address.firstname,
        intro: [
          `Your order ${order.id} was shipped.`,
          order.notes ?? ''
        ],
        action: {
            instructions: 'To view your order, please click here:',
            button: {
                color: '#973cff', // Optional action button color
                text: 'View Order',
                link: `${STORE_WEBSITE}/orders?order=${order.id}`
            }
        },
        outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
    }
  };

  // Generate an HTML email with the provided contents
  var html = mailGenerator.generate(email);
  var text = mailGenerator.generatePlaintext(email);
  var subject = `order shipping`;

  await send(subject, html, text, order.contact.email)
}

/**
 * 
 * @param {Firestore} db 
 * @param {UserData} user 
 */
export const send_welcome_mail = async (db, user) => {
  var mailGenerator = new Mailgen({
    theme: 'default',
    product: {
        // Appears in header & footer of e-mails
        name: STORE_NAME,
        link: STORE_WEBSITE,
        // Optional product logo
        // logo: 'https://mailgen.js/img/logo.png'
    }
  });  

  var email = {
    body: {
      name: user.firstname,
      intro: [
        `Welcome to ${STORE_NAME}.`
      ],
      action: {
        instructions: 'To login your account, please click here:',
        button: {
            color: '#973cff', // Optional action button color
            text: 'Login',
            link: `${STORE_WEBSITE}/account`
        }
      },
      outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
    }
  };

  // Generate an HTML email with the provided contents
  var html = mailGenerator.generate(email);
  var text = mailGenerator.generatePlaintext(email);
  var subject = `Welcome to ${STORE_NAME}`;

  await send(subject, html, text, user.email)
}
