// review / rating / createdAt / ref to Tour / ref to User

const mongoose = require('mongoose');
const Tour = require('./tourModel');
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'review can not be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  // zelimo da se virtual property prikaze u outputu, nece biti sejvovan u db a moze da koristi podatke za kalkulaciju iz db
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//pravimo jednistveni id za kombinaciju user-review da jedan user ne bi mogao da pravi vise reviewa na jednu turu
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  //populate ce popuniti ono sto mu stavimo u path, a ppounice ono na sta je referenciran u ref polju
  //mongoose ce gledati u dokument koji je stavljen u ref i tamo ce traziti ID koji mu damo
  /*   this.populate({
    path: 'tour',
    select: 'name',
  })
  */
  this.populate({
    path: 'user',
    // saljemo samo name i photo
    select: 'name photo',
  });
  next();
});
//static methods za average ratings
//tour je tourId koji ce biti koriscen u funkciji
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  //aggregation pipeline koriscen za statistiku direktno na modelu
  //this pokazuje na trenutni model, prosledjujemo array svih stejdzeva

  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  //console.log(stats);
  //izvrsavamo kod samo ako imamo stats
  if (stats.length > 0) {
    // updajtujemo turu sa reviews
    await Tour.findByIdAndUpdate(tourId, {
      // uzimamo podatke iz arraya stats iz modela
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // updajtujemo turu sa reviews sa default parametrima
    await Tour.findByIdAndUpdate(tourId, {
      // uzimamo podatke iz arraya stats iz modela
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};
//stavljamo post jer su tada vec svi reviews vec ucitani u dv i mozemo da racunamo sa njima
reviewSchema.post('save', function (next) {
  //this points to current review
  // pravimo trik sa this.constructior jer Review jos nije deklarisan
  //constructor je model koji je kreirao this dokument, u ovom skucaju bice tour
  this.constructor.calcAverageRatings(this.tour);
  // post middleeware nema pristup next() zato izostavljamo
  //next();
});
// findOneAndUpdate
//findOneAndDelete
/*   za update i delete ne mozemo da pristupimo kao gore save, jer
     moramo da koristimo query middleware koji nemaju pristup direktno dokumentu,
     a treba nam pristup da bismo uzeli id, zbog toga koristimo hack sa regex da bi nam 
     nasao sve middleware hooks metode koje pocinju sa findOneAnd
 */
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //sa find one metodom dobijamo pristup dokumentu
  // ne mozemo da promenimo pre u post kao  u proslom slucaju jer onda nemamo pristup queriju jer je vec izvrsen
  // resenje je da napravimo novu post metodu posle ove pre
  // tourId prebacjuemo iz pre middleware u post middleware preko this.r
  this.review = await this.clone().findOne();

  //console.log(this.review);
});
// moramo post metodu da pravimo jer pre middleware nema pristup queriju jer je vec izvrsen
reviewSchema.post(/^findOneAnd/, async function () {
  await this.review.constructor.calcAverageRatings(this.review.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
