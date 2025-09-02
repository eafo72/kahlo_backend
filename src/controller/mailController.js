const nodemailer = require("nodemailer");
require('dotenv').config()

const transporter = nodemailer.createTransport({
  host: 'email-smtp.us-east-2.amazonaws.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SES_USER,
    pass: process.env.SES_PASSWORD
  }
});

module.exports = transporter;