const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  (exports.createTour = catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  }));

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    //console.log(req.params);
    // stavarmo novi array iz arraya koji ispunjava uslov(trazimo id u bazi koji se poklapa sa idjem iz params id-ja)
    //const id = parseInt(req.params.id);
    //const tour = tours.find((el) => el.id === id);
    // zelimo da popunimo polje guides samo u queriiju a ne u db
    const doc = await query; /* .populate({
      path: 'guides',
      // biramo sta ne zelimo da prikazemo u queriju sa "-""
      // populate kreira novi query, tako da moze da utice na performans
      select: '-__v -passwordChangedAt',
    }); */
    // moze i ovako- Model.findOne({_id:req.params.id})
    // moramo return da ne bi se izvrsila sledeca linija koda, vec otisao kod na next middleware
    if (!doc) {
      return next(new AppError('No tour found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    //To allow for nested GET reviews on tour(hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // stavljamo await posle filteracije

    const doc = await features.query;
    // metoda koja nam pokazuje osnovnu analitiku u kompasu, na primer kojiko je skenirano dokumenata,
    //indeksi itd...
    //const doc = await features.query.explain();
    //SEND RESPONSE
    res.status(200).json({
      requestedAt: req.requestTime,
      status: 'success',
      results: doc.length,
      data: {
        // kada kliknemo na get link, dobijamo tours.json a on sadrzi tours data
        data: doc,
      },
    });
  });
