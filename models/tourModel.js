const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// User model nam treba samo koad hocemo da embedujemo SUera u dokument, a kad zelimo referncu onda ne treba
//const User = require('./userModel');
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour name must be defined'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal then 40 characters'],
      minlength: [10, 'A tour name must have more or equal then 10 characters'],
      // validator plugin
      //validate: [validator.isAlpha, 'Name must be only with caracters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour mut have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1'],
      max: [5, 'rating must be maimum of 5'],
      //setter za zaokrugljivanje brojeva na dve decimale
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // validator radi samo za create ali ne na update, tj this prikazuje na trenutni dokument samo za save i create a ne za update

          return val < this.price; // 100 < 200 true
        },
        message: 'Dicount price({VALUE}) should be lower than regular price',
      },
    },
    summary: {
      type: String,
      trim: true, // deletes white spaces
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      defult: false,
    },
    startLocation: {
      //GeoJSON format za Geo special data
      type: {
        type: String,
        default: 'Point',
        //postavljamo sve opcije koje mozemo da prihvatimo
        enum: ['Point'],
      },
      coordinates: [Number],
      addres: String,
      description: String,
    },
    //kad stavimo array , onda pravimo novi dokument u tour dokumentu kao roditelju
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      // schema type koji ce biti mongoose id
      { type: mongoose.Schema.ObjectId, ref: 'User' },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
//indexi nam pomazu da poboljsamo performans u mongo db tako sto ce pregledati
//samo onoliko dokumenata koliko je potrebno, a nece ici kroz sve dokumente
// u parametrima opcija 1 znaci da sotritamo uzlazno, a -1 silazno
// proveravamo tako sto u mongo analitici pregledamo polje totalDocsExamined polje
// mongo analitika se aktivira sa examine() metodom u handlerFactory.js fajlu u getAll metodi
//tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
//
tourSchema.index({ slug: 1 });
//2d sferu koristimo kad imamo realne dijametre zemlje
tourSchema.index({ startLocation: '2dsphere' });
// virtual funkcija koja ubacuje elemente koji se ne cuvaju u db al ise prikazuju
tourSchema.virtual('durationweeks').get(function () {
  return this.duration / 7;
});
//virtual populate koji na mprikazuje reviewse u tours
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

//Document middleware that runs before save() and .create() but not on .insertMany()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});
//presave middleware kojm embedujemo vodice is user modela u tours
//ne zelimo da embedujemo jer moze neki vodic da menja sliku ili mail pa onda moramo sve da menjamo
/* tourSchema.pre('save', async function (next) {
  //kad stavimo ovako, dobijamo array pun promisesa, pa moramo da ih pokrenemo u isto vreme sa Promise.all
  const guidesPromises = this.guides.map(async (id) => await User.findById(id));
  this.guides = await Promise.all(guidesPromises);
  next();
}); */

/* tourSchema.pre('save', function (next) {
  console.log('Will save document...');
  next();
}); */
// post middleware vrsi se kad su svi pre middlweri izvrseni
tourSchema.post('save', function (doc, next) {
  next();
});

//Query Middleware - hook- procesujemo query a ne dokument, pravimo tajni query
tourSchema.pre(/^find/, function (next) {
  // ukljucuje sve metodae sa find, kao findOne, findoneandDelete ...
  this.find({ secretTour: { $ne: true } }); // not eaqual to true
  this.start = Date.now();
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  //console.log(`Query took ${Date.now() - this.start} miliseconds`);
  // console.log(docs);
  next();
});
//query middleware koji ce se pokrenuti svaki put kad ima query
tourSchema.pre(/^find/, function (next) {
  //u query middlewaru this uvek ukazuje na trenutni query
  //sa ovim populate ce se popuniti svi guides sa referenciranim Userom
  this.populate({
    path: 'guides',
    // biramo sta ne zelimo da prikazemo u queriju sa "-""
    // populate kreira novi query, tako da moze da utice na performans
    select: '-__v -passwordChangedAt',
  });
  next();
});
// Aggregation middleware
/* tourSchema.pre('aggregate', function (next) {
  // skidamo turu secret iz svih requestova
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  // console.log(this.pipeline());
  next();
}); */

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
