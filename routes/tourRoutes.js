const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
//const reviewController = require('./../controllers/reviewController');
const reviewRouter = require('./../routes/reviewRoutes');
const router = express.Router();
// param middleware function gde dobijamo id iz urla
//router.param('id', tourController.checkID);
//create a checkBody middleware
//check if body contains name and price property
//if not return 404
//add to post stack middleware
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);
router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );
//geospatial queries
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// /tours-within?distance=233,center=-40,45&unit=mi
// /tours-within/233/center/-40,45/unit/mi

//get tour distances

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

//get all tours
router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

//Nested router

//POST /tour/123fasf/reviews
//GET /tour/123fasf/reviews
//GET /tour/123fasf/reviews/34234

/* router
  .route('/:tourId/reviews')
  .post(
    authController.protect,
    authController.restrictTo('user'),
    reviewController.createReview
  ); */
// mounting a router
router.use('/:tourId/reviews', reviewRouter);

module.exports = router;
