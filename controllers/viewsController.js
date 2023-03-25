const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (req, res, next) => {
  //1) Get tour data from collection
  const tours = await Tour.find();

  //2) Build template
  //3)Render that template using tour data from step 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours: tours,
  });
});
// uvek kad imamo catchAsync funkciju treba nam next
exports.getTour = catchAsync(async (req, res, next) => {
  //1) get data for requested tour(including reviews and tour guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  //error frontend
  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }
  //2) Build template

  //3) Render template using data from step 1)

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour: tour,
  });
});
//login user
exports.getLoginForm = catchAsync(async (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account',
  });
});
// get account page, samo treba da uradimo render jer je vec user queriovan u protect middlewaresu
exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};
exports.getMyTours = catchAsync(async (req, res, next) => {
  //1)Find all bookings
  //vraca user ids
  const bookings = await Booking.find({ user: req.user.id });

  //2)Find tours with the returned IDs
  //pravimo novi array, loops kroz booing array i vraca element.tour
  const tourIDs = bookings.map((el) => el.tour);
  //selects all tours which have ID which is in tourIds array
  const tours = await Tour.find({ _id: { $in: tourIDs } });
  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});
exports.updateUserData = catchAsync(async (req, res, next) => {
  // Moramo da dodamo middleware da bismo prsovali data iz forme
  // hocemo samo da updejtujemo data kad smo login inace svako moze da menja data
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      //imena i mail dobijamo iz html forme
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  // kad posaljemo data iz forme, zelimo da se vratimo na stranicu sa updejtovanom data
  //treba samo  da renderujemo stranicu ponovo, ali sad treba da posaljemo i updejtovanog usera, inace ce nam doci user iz protect middlewarea koji nije updejtovan
  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
});
