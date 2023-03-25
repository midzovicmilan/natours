const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
//sve rute posle ove linije koda ce imati middleware protect, jer middleware radi po sekvencama
//sve rute koje idu posle ove, "/updateMyPassword itd" ce koristiti protect
router.use(authController.protect);

router.patch(
  '/updateMyPassword',

  authController.updatePassword
);
router.get(
  '/me',
  authController.protect,
  userController.getMe,
  userController.getUser
);
//router.use(authController.restrictTo('admin'));
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
// upload je iz multera gde cemo uploadovati jedan fajl
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
//necemo usera da brisemo iz DB
router.delete('/deleteMe', userController.deleteMe);
router
  .route('/:id')
  .get(userController.getUser)
  .post(userController.createUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
