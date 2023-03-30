const express = require('express');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');
//start express app with express()
const app = express();

//set template engine za rendering, ne treba require, express interno importije template
//app trust proxy for deployment, read https
app.enable('trust proxy');
app.set('view engine', 'pug');
// spajamo dirname root folder sa views pomocu path modula
// stavljamo path.join jer ne znamo da li imamo / ili ne, express automatski prepozna
app.set('views', path.join(__dirname, 'views'));

//serviranje statickih stranica, 2 nacina
//app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));
require('dotenv').config();

//Implement CORS
app.use(cors());
// Access-Control-Allow-Origin, frontend natours.com eample
/* ap.use(cors({
  origin:"https://www.natours.com"
}))
 */
//http method options for preflight phase
//Complet request cors set example "/api/v1/tours/:id"
app.options('*', cors());
//app.options(""/api/v1/tours/:id", cors())
//1) GLOBAL MIDLEWARES
//Set Security HTTP headers
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//Funkcija koja dozvoljava 100 requestova za 1 sat
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour',
});
// sve rute koje ocinju sa /api ce imati ovaj middleware limiter
app.use('/api', limiter);
//Body parser, reading data from body into req.body
// ovaj middleware nam omogucava da citamo podatke iz forme i zove se urlencoded jer su podaci iz forme takodje urlencoded
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// cookie parser
app.use(cookieParser());
//middleware koj nam treba da bismo dobili podatke iz post route, bez toga dobijamo undefined
app.use(
  express.json({
    // kad imamo body veci od 10kb, nece biti prihvacen
    limit: '10kb',
  })
);

//Data sanatization against noSQL query injection
//looks at reqests and req.params and filters all $ sings, so these operators wont work
app.use(mongoSanitize());

//Data sanatization against Cross site scripting attacks XSS
//ako napadac napada sa html kodom koji ima js prikacen, ovaj middleware ce konvertovati  sve html tagove u simbole, nna primer <html> ce biti $gthtml$lt
app.use(xss());

//Prevent paramater pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);
//kompresovanje tektsa koji se salje klijentu kroz request
app.use(compression());

//Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  //console.log(req.cookies);
  // console.log(req.headers);
  next();
});

/* 
 // test
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hello from the  server', app: `Natours` });
});
app.post('/', (req, res) => {s
  res.send('You can post');
}); */

//app.delete('/api/v1/tours/:id', deleteTour);
//routes

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
//sve http medode hvatamo sa all, a sa zvezdiceom hvatamo sve rute koje su nedefinisane
//originalUrl je zadati url
// moramo da stavimo na kraj ispod svih ruta jer ce inace uvek da nam izbacuje gresku
app.all('*', (req, res, next) => {
  /*  res.status(404).json({
    status: 'fail',
    message: `Cant find ${req.originalUrl} on this server`,
  }); */
  // pravimo error konstruktor iz middlewera
  /*    const err = new Error(`Cant find ${req.originalUrl} on this server`);
  err.status = 'fail';
  err.statusCode = 404;  */
  // sa next(err) idemo na sledeci app.use error middleware
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// error handling iz error controllera
app.use(globalErrorHandler);

module.exports = app;
