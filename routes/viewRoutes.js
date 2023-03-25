const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();
//renderovanje template-a
// stavljamo authContoller.isLoggedIn u pojedinacne rute da ne bismo ponavljali query, jer
//ako stavimo app.use(isloggedIn), query   ce biti koriscen na sve rute, a lad stavimo jos
//authController.protect posebno u rutu, prvo ce se izvrsiti authController.isLoggedin pa onda protect, sto je dvostruki query
router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewsController.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/me', authController.protect, viewsController.getAccount);
router.get('/my-tours', authController.protect, viewsController.getMyTours);
router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);
module.exports = router;
