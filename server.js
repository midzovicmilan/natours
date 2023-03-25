const mongoose = require('mongoose');
const dotenv = require('dotenv');

// uncaught exception treba staviti gore na vrh da bi uhvatio kod posle ove funkcije
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('Uncaught exception, shutting down');

  process.exit(1);
});
dotenv.config({ path: './config.env' });
const app = require('./app');

//mongo driver mongoose
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(DB);
  //console.log(mongoose.connection);
  console.log('DB connected');
}

// pravimo model na osnovu sheme
// pravimo dokuemnt na osnovu modela
/* const testTour = new Tour({
  name: 'the Forest Hiker',
  rating: 4.7,
  price: 497,
});

testTour
  .save()
  .then((doc) => {
    console.log(doc);
  })
  .catch((err) => {
    console.log('Error', err);
  }); */
const port = process.env.PORT;

const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
// unhandled rejection
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled rejection, shutting down');
  process.exit;
});
