const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
//promisify util funkcija za pravljenje promisa
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');
// kreiramo jwt token =payload + secret
const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
// kreiranje cookia

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() +
        parseInt(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  // saljemo cookie
  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  // send welcome emails to new user
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();
  // payload for creating token
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  // pravimo destruktuiranje, tako da ne mozemo ovako
  //const email = req.body.email
  //posto nam je ime konstante email i password ista kao email i password u req.body, mozmeo samo {email, password}
  const { email, password } = req.body;

  // 1)Check if email and pasword exist
  if (!email || !password) {
    // posle izvrsenja login middlewarea zelimo da izadjemo zi funkcije

    return next(new AppError('Please provide email and password', 400));
  }
  //2)Check if user exists and password is coorect
  // trazimo usera u db pomocu maila i selektujemo password sa + zato sto po defaultu nije selektovan
  // user je user dokument jer je rezultat querija modela
  const user = await User.findOne({ email: email }).select('+password');
  //correct je instanca modela koja je dostupna svim dokumentima
  // moramo da stavimo await dole u if jer ako nema usera nece da se pokrene if
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  //3) If everything is ok, send token to client
  createSendToken(user, 200, res);
});

// Logout funkcija koja salje siguran cookiee

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    //nemamo sensitive data pa ne moramo da dodajemo secure parametre
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

// protect route middleware
exports.protect = catchAsync(async (req, res, next) => {
  // let je block scoped zato mora da bude izvan if da bi imao pristup
  let token;

  //1) Get token and check if it is there
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } // check if there is jwt cookie from frontend
  else if (req.cookies.jwt) {
    token = req.cookies.jwt;
    //console.log(token);
    // vracamo gresku unautherized ako nema tokena
    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }
  }

  //2)Verification token, check if someone manipulated data or if token has expired
  // pravimo promise uz promisify da nebismo srusili koncept sa kojim smo radili do sada
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user does not longer exist', 401));
  }
  //4) Check if user changed password after the JWT was issued
  // pravimo instancu metode modela koja ce biti dostupna ostalim dokumentima
  //proveravamo da li je sifra promenjena
  // vraca true ako je user promenio password
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError() * 'User recently changed password! Please login again',
      401
    );
  }

  //Grant access to protected routes
  //pit entire user data in req
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages, no errors

exports.isLoggedIn = async (req, res, next) => {
  // kod je sa komentara nije kao u lekciji, pogledati komentare u lekciji 192
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      // pug template will be placed in locals
      res.locals.user = currentUser;
      //console.log(currentUser);
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
// posto ne mozemo da prosledimo argumente middlewaru, pravimo funkciju koja ce vratiti nas middleware
// stvaramo proizvoljan broj argumenata sa rest operaterom

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles je array[adin, user], i nas middleware ima pristup arrayu zbog closure
    //ako role, na primer user nije u nasem arrayu koji smo odredili da bude restricted, onda nema pristup
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You dont have permission to perform this action', 403)
      );
    }
    // ako je user u nasem arrayu idemo na nezt a to je route
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }
  //2) Generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3)Send it to user's email

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    /* await sendEmail({
      email: user.email,
      subject: 'your password reset token(valid for 10 minutes)',
      message,
    }); */
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    console.log(err);
    // ako ima greska hocemo da resetujemo token i expires date i damo ga u undefined
    user.passwordresetToken = undefined;
    user.passwordresetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email.Try again later', 500)
    );
  }
});
// reset password
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1)get user based on the token
  // encript token and compare it with encrypted in DB
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  // find user who sent the token by url and check if expires date is in the future that means token has not expired
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    //proveravmo da li token nije istekao
    passwordResetExpires: { $gt: Date.now() },
  });

  //2)If token has not expired and there is a user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  // delete token and expiery date
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  //  moramo da sejvujemo jer samo modifikujemo dokument a ne updatujemo
  // hocemo da validajtujemo tako da ne stavljamo validator:false
  await user.save();
  //3)Update changedPassword property for the current user

  //4)Log in user, send JWT to client

  createSendToken(user, 200, res);
});

//update password

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1)Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  //2)Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Password incorrect', 401));
  }
  //3)Update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  // ne palimo validaciju
  await user.save();
  //User.findByIAndUpdateWillNotWork - validator uz modela nece da radi jer
  //this.password iz validate bice undefined posle update-a
  //presave middlewari nece da rade posle update, tj nece biti enkripovan password i nece raditi timestamp middleware

  //4)Log user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
