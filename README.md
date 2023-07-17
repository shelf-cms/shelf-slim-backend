# Shelf Slim Backend

<div style='display: flex; justify-content: center; margin: 20px'>
  <img src='public/logo.png' style='height:140px; width:140px; margin-left: auto; margin-right: auto'/>
</div>

> 🥳 [SHELF](https://shelf-cms.io) turns your **Firebase** project into a **HEADLESS** CMS

# What is this ?
This repository is a complementary simple backend for achieving extra capabilities with `SHELF` under **170kb**:
- Creating Checkouts from Web or Mobile
- Capture / Void / Refund Payments 💳 (Currently PayPal, but more are coming and you can add your own)
- Marketing emails (User signup, Payments)

## I want it, how to use it ?
Clone this repository and follow instructions

# Instructions
### 1. Create Firebase project
Simply, follow our guide [HERE 📖](https://shelf-cms.io/docs/setup/project)

> Write `projectId` and your Auth `uid` (when you created yourself as user)

### 2. Clone this repository
```bash
git clone https://github.com/shelf-cms/shelf-slim-backend.git
```

### 3. Install `firebase CLI` globally
```bash
npm install -g firebase-tools
```

### 4. Kick some things
cd into the repo directory
```bash
firebase login
```

### 5. Edit `.firebaserc`
Open `.firebaserc` and paste your `projectId` into `YOUR_PROJECT_ID_HERE`

### 6. Edit `firestore.rules`
Open `firestore.rules` and paste your `uid` into `YOUR_UID_HERE`

### 7. Edit `storage.rules` (Optional, if you prefere other storage services)
Open `storage.rules` and paste your `uid` into `YOUR_UID_HERE`

### 8. That's it
You can now tinker with it:

```
// For local dev
firebase serve 

// or, for production
firebase deploy
```

### 9. Update your backend @ `shelf`
- Login to [SHELF](https://shelf-cms.io)
- **Settings** > Update `Backend URL`

### 10. Tinker with the backend
💡 Few suggestions:
- Edit `functions/src/actions/send-mail.js` with your own:
  - `STORE_NAME`
  - `STORE_WEBSITE`
  - `YOUR_MAIL`
  - `SEND_GRID_SECRET` (Be sure to open an account with sendgrid)
- Modify the logic of events at `functions/index.js`
- Add a new payment gateway by inspecting `functions/gateways` folder and reading [The SHELF Gateways Docs 📖](https://www.shelf-cms.io/docs/backend/payments)

