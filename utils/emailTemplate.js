const verificationEmailTemplate = (name, token) => {
  return `
   <!DOCTYPE html>
   <html>
   <head>
     <style>
       body {
         font-family: Arial, sans-serif;
         backgroud-color: #f4f6f8;
         padding: 20px
       }
       .container {
         max-width: 600px;
         margin: auto;
         background: #ffffff;
         padding: 30px;
         border-radius: 10px;
         text-align: center       
        }
        .code {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 5px;
          color: #4caf50;
          margin: 20px 0;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #888
        }

     </style>
   </head>
   <body>
     <div class="container">
       <h2>Hello ${name}</h2>
       <p>Use the verification code below to complete your registration:</p>
       <div class="code">${token}</div>
       <p>This code will expire in 10 minutes.</p>
       <p>If you didn't create an account, ignore this email.</p>
       <div class="footer">
         <p> ${new Date().getFullYear()} Social API</p>
       </div>
     </div>
   </body>
   </html>
  `;
};

const passwordResetEmailTemplate = (name, token) => {
  return `
   <!DOCTYPE html>
   <html>
   <head>
     <style>
       body {
         font-family: Arial, sans-serif;
         background-color: #f4f6f8;
         padding: 20px
       }
       .container {
         max-width: 600px;
         margin: auto;
         background: #ffffff;
         padding: 30px;
         border-radius: 10px;
         text-align: center       
        }
        .code {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 5px;
          color: #4caf50;
          margin: 20px 0;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #888
        }

     </style>
   </head>
   <body>
     <div class="container">
       <h2>Hello ${name}</h2>
       <p>Use the reset code below to reset your password:</p>
       <div class="code">${token}</div>
       <p>This code will expire in 1 hour.</p>
       <p>If you didn't request a password reset, ignore this email.</p>
       <div class="footer">
         <p> ${new Date().getFullYear()} Social API</p>
       </div>
     </div>
   </body>
   </html>
  `;
};


module.exports = {
  verificationEmailTemplate,
  passwordResetEmailTemplate
};