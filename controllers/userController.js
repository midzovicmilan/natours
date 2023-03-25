const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/userModel');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
// storrage fajla photo
/* const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    //prvi arg je err ako je ima, drugi je path
    cb(null, 'public/img/users');
  },
  filename: (req, file, cb) => {
    // user-id(1565151asdad)-asdad.jpeg
    const ext = file.mimetype.split('/')[1];
    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
  },
}); */

const multerStorage = multer.memoryStorage();

//filter u multeru
// ne zelimo da dozvlimo da se uploaduju fajlovi koji nisu img
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    //  app error
    cb(new AppError('Nota na image! Please upload only images', 404), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

//upload pgoto wth multer

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  if (!req.file) return next();
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);
  window.location.reload();

  next();
});

//funkcija filterObj u koju stavljamo 2 parametra- objekt, i rest parametar za sva dozvoljena polja, i imacemo array sa argumentima koje prenesemo, name i email
const filterObj = (obj, ...allowedFields) => {
  //loopujemo i proveravamo da li su dozvoljena polja, a potom returnujemo objekat sa tim poljima
  //object.keys vraca sva key poslja iz obj, i mozemo da loopujemo kroz njih
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    //proveravamo da li su polja u obj ista kao u allowedFilters, i ako jesu jednostavno dodeljujemo isto ime tom polju kao u originalnom objektu
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

/* exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  //SEND RESPONSE
  res.status(200).json({
    requestedAt: req.requestTime,
    status: 'success',
    results: users.length,
    data: {
      // kada kliknemo na get link, dobijamo tours.json a on sadrzi tours data
      users: users,
    },
  });
}); */

//adding _me endpoint, api gde user dobija soje podatke

exports.getMe = (req, res, next) => {
  // params id dodeljujemo vrednost ulogovanog korisnika
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //console.log(req.file);
  //console.log(req.body);
  // 1) Create error if user posts password data
  // ovo znaci da ako user pokusa da promeni sifru izbaci ce mu ovu gresku
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates.Please use /updateMyPassword',
        400
      )
    );
  }
  //2) Filter fields that tare not allowed to be updated and Update user document
  // save nece da radi jer tamo je protect middleware koji trazi password confirm zato koristimo findByIandUpdate
  //stavljamo filtere koji sve mogu parametri da se PromiseRejectionEvent,
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  // user.save() nece da radi zato sto
  //await user.save();
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

/* exports.getUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not yet defined',
  });
}; */
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not yet defined! Please use signup instead',
  });
};
exports.updateUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not yet defined',
  });
};
/* exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not yet defined',
  });
};
*/

//do not update passwords with this
exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
exports.deleteUser = factory.deleteOne(User);
exports.updateUser = factory.updateOne(User);
