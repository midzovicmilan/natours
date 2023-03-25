const express = require('express');

const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

const router = express.Router({ mergeParams: true });
//bez obzira kakvu rutu od ove dve imamo, uvek ce zavrsiti sa reviewController.createReviewHandlerom zahvlajujuci mergeParams true
//bice prusmerena na reviewRouter u app.js, a tamo ce da se poklopiti sa rutom "/" a tamo ce imat pristup ID koji dolazi iz prve rute
//POST /tour/123fasf/reviews
//POST/review

router.use(authController.protect);
router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );
//delete review
router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );
module.exports = router;
