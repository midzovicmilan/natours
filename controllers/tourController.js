// const fs = require('fs');
const sharp = require('sharp');
const multer = require('multer');
const Tour = require('./../models/tourModel');
const APIFeatures = require('./../utils/apiFeatures');
// funkcija za top 5 tura, u kojoj popunjavamo query string manualno umesto usera
const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const { compareSync } = require('bcrypt');

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
//uploadujemo vise slika
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);
//upload.single("image") req.file
//upload.array("images",5) req.files

//middleware za procesiranje slika
exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  //1)Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  //2) images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);
      req.body.images.push(filename);
    })
  );

  next();
});

/* 
upload.single("image")
upload.array("images",5) */
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};
// konvertujemo json u js
/* const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
); */

//provera ID-ja
/* exports.checkID = (req, res, next, val) => {
  // console.log(`tour id is : ${val}`);
  if (req.params.id * 1 > tours.length) {
    // mora return da ne bi 2 puta slao request
    return res.status(404).json({
      status: 'fail1',
      message: 'Invalid Id',
    });
  } 
  next();
}; */

//provera body-ja

exports.checkBody = (req, res, next) => {
  if (!req.body.name || !req.body.price) {
    return res.status(400).json({
      status: 'fail',
      message: 'Missing name or price',
    });
  }
  next();
};
exports.getAllTours = factory.getAll(Tour);

/* exports.getAllTours = catchAsync(async (req, res) => {
  //console.log(req.requestTime);

  //BUILD QUERY

  // destruktuiranjem pravimo novi objekat da ne bismo menjali original objekat

  // 1) Filtering

  /* const queryObj = { ...req.query };
    // iskljucujemo pojmove iz querija
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => {
      delete queryObj[el];
    }); */
//console.log(req.query, queryObj);

// 1a)Advanced filtering

//const tours = await Tour.find(queryObj);
//ne mozemo da stavimo await tours jer onda ne mozemo da radimo filtere i paginaciju

//primer querija u mongo db{difficulty:"easy",duration:{$gte:5}}
// primer querija u konzoli kada napravimo request{difficulty:"easy",duration:{gte:5}}
// menjamo u js objekat bez $ sa onim koji ima $ i zamenjujemo operatere gte, gt, lte, lt
//let queryStr = JSON.stringify(queryObj);
//regExp gde menjamo operatere bez $ i stavljamo $ ispred
//queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
//console.log(JSON.parse(queryStr));

// let query = Tour.find(JSON.parse(queryStr));

// 2)SORTING

/* if (req.query.sort) {
      // zamenjujemo zarez iz postmana u queriju sa spejsom
      const sortBy = req.query.sort.split(',').join(' ');
      console.log(sortBy);
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    } */

// 3) Field limiting

/* if (req.query.fields) {
      // uzimamo polja iz querija u requestu
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      // iskljucujemo sa "-" polje __v
      query = query.select('-__v');
    } */

// 4) Pagination
// page=2&limit=10, 1-10 for page1, 11-20 for page 2. 21-30 for page3
// skip 10 results to get to page 2, skip 20 results for page 3 etc
/* const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    if (req.query.page) {
      const numTours = await Tour.countDocuments();
      if (skip >= numTours) throw new Error('This page does not exist');
    } 

  //EXECUTE QUERY
  // pravimo novu instancu api Feaures
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  // stavljamo await posle filteracije

  const tours = await features.query;
  //SEND RESPONSE
  res.status(200).json({
    requestedAt: req.requestTime,
    status: 'success',
    results: tours.length,
    data: {
      // kada kliknemo na get link, dobijamo tours.json a on sadrzi tours data
      tours: tours,
    },
  });

  //vraca array objekata
}); */
// get tours
//app.get('/api/v1/tours', getAllTours);
// get tour

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

/* exports.getTour = catchAsync(async (req, res, next) => {
  //console.log(req.params);
  // stavarmo novi array iz arraya koji ispunjava uslov(trazimo id u bazi koji se poklapa sa idjem iz params id-ja)
  //const id = parseInt(req.params.id);
  //const tour = tours.find((el) => el.id === id);
  // zelimo da popunimo polje guides samo u queriiju a ne u db
  const tour = await Tour.findById(req.params.id).populate(
    'reviews'
  ); /* .populate({
    path: 'guides',
    // biramo sta ne zelimo da prikazemo u queriju sa "-""
    // populate kreira novi query, tako da moze da utice na performans
    select: '-__v -passwordChangedAt',
  }); 
  // moze i ovako- Tour.findOne({_id:req.params.id})
  // moramo return da ne bi se izvrsila sledeca linija koda, vec otisao kod na next middleware
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      tours: tour,
    },
  });
}); */
//app.get('/api/v1/tours/:id', getTour);
// new tour api
exports.createTour = factory.createOne(Tour);
/* exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body);

  //onsole.log(req.body);
  //const newId = tours[tours.length - 1].id + 1;
  // pravimo novi objekat spajanjem dva objekta, jedan sa starim i jedan sa novim id-jem
  // const newTour = Object.assign({ id: newId }, req.body);
  // guramo novu turu u array
  //tours.push(newTour);

  // fs.writeFile(
  // `${__dirname}/dev-data/data/tours-simple.json`,
  //JSON.stringify(tours),
  //   (err) => {
  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour,
    },
  });
  /*  try {
    
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  } 


}); */

//}
// );

//app.post('/api/v1/tours', createTour);

//patch
/* exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      tour: tour,
    },
  });
});



*/

exports.updateTour = factory.updateOne(Tour);

/*  if (req.params.id * 1 > tours.length) {
    return res.status(404).json({
      status: 'fail1',
      message: 'Invalid Id',
    });
  } */
//app.patch('/api/v1/tours/:id', updateTour);

// delete
/* exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);
  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }
  res.status(204).json({
    status: 'success',
    data: null,
  });
}); */

exports.deleteTour = factory.deleteOne(Tour);

// aggregation pipeline
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    /* {
        $match: { _id: { $ne: 'EASY' } },
      }, */
  ]);

  res.status(200).json({
    status: 'success',
    data: stats,
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = parseInt(req.params.year);
  const plan = await Tour.aggregate([
    {
      // prikazuje sve ture pojedinacno za svaki startDate, umesto 9 imamo 27 rezultata
      $unwind: '$startDates',
    },
    {
      // sleektujemo dokument sa match koji su izmedju 1.1. i 31.10.
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    // grupisemo koliko je bilo tura u svakom mesecu u godini
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        // stavljamo polje name u array sa komandom push
        tours: { $push: '$name' },
      },
    },
    {
      //dodajemo polja
      $addFields: { month: '$_id' },
    },
    {
      // uklanjamo id sa 0, stavljamo 1 ako hocemo da se pokaze
      $project: { _id: 0 },
    },
    {
      // sortiramo po broju tura u mesecu
      $sort: {
        numTourStarts: -1,
      },
    },
    /*  {
        $limit: 6,
      },  */
  ]);
  res.status(200).json({
    status: 'success',
    data: plan,
  });
});

//geospecial queries

//'/tours-within/:distance/center/:latlng/unit/:unit',
// /tours-within/233/center/-40.335,45.1154/unit/mi

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  //destructuring
  const [lat, lng] = latlng.split(',');
  // izracunavamo radijus sfere u radijantima koji dobijamo kad distancu podelimo sa radiusom zemlje u miljama ili u km
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lang, lng',
        400
      )
    );
  }
  //console.log(distance, lat, lng, unit);
  //geoWithin mongoose specijalni geospecial operator
  const tours = await Tour.find({
    // moramo u tour modelu da dodamo indeks za pocetnu lokaciju
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});
// geospecial aggregation, calculating distances
exports.getDistances = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  //destructuring
  const [lat, lng] = latlng.split(',');
  // pretvaramo multiplier u metre iz milja, km ili mi dobijamo iz url params
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  // izracunavamo radijus sfere u radijantima koji dobijamo kad distancu podelimo sa radiusom zemlje u miljama ili u km
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lang, lng',
        400
      )
    );
  }
  // geoNear je jedini korak u pipelajnu i mora da ima jedno polje sa indeksom, da bi koristio kalkulaciju
  //ukoliko imamo vise polja, treba nam keys da koristimo kalkulaciju
  //koristimo near point koji stavljamo kao geo json
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
