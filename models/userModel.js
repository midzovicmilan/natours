const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

//Schem name, email, photo-string, password, passwordConfirm

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name must be defined'],
    // trim uklanja space izmedju navodnika ako ih user stavi
    trim: true,
    maxlength: [20, 'Name must have less or equal then 20 characters'],
    minlength: [1, 'Name must have more or equal then 1 character'],
  },
  email: {
    type: String,
    required: [true, ''],
    unique: true,
    //transferuje email u lowercase
    lowercase: true,
    // validator plugin property isEmail proverava validnost emaila
    validate: [validator.isEmail, 'Please provide valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Account must have a password'],

    minlength: [8, 'Password must have more or equal then 8 character'],
    select: false, // sa select biramo da li da sepokaze polje password u get requestu ili ne
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Pleace confirm password'],
    validate: {
      // koristimo function a ne arrow jer nam treba this, radi samo na save i create
      validator: function (el) {
        return el === this.password; //abc === abc -> true, no error, if not then returns error
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    //hocemo da sakrijemo ovaj active od usera
    select: false,
  },
});
//bcrypt presave middleware za enkripciju sifre

userSchema.pre('save', async function (next) {
  // proveravamo da li je modifikovan password, ako nije izlazimo iz funkcije iz ovemo next
  if (!this.isModified('password')) return next();
  //bcrypt plugin funkcija za enkripciju passworda
  //dodajemo kao drugi argument koliko zelimo cpu intensive da bude enkripcija, koristimo async verziju ali postoji i sync
  this.password = await bcrypt.hash(this.password, 12);
  // ne zelimo password confirm kada sajve novi dokument, a on je required pa moramo undefined
  this.passwordConfirm = undefined;
});
//presave middleware koji proverava da li je sifra modifikovana i da li je nova, dobijamo iz dokumentacije
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  //izracunavamo datum promene sifre, oduzimamo za sekundu jer nekad treba vremena da se token posalje
  this.passwordChangedAt = Date.now() - 1000;
  next();
});
//pre middleware kojinam trazi samo aktivne korisnike
//regexp trazimo rec koja pocinje sa find
userSchema.pre(/^find/, function (next) {
  //this ponts to current query find()
  //trazimo sve usere kojima active nije jednadk false, sto je drugacije od active:true
  this.find({ active: { $ne: false } });
  next();
});
// kreiramo metodu instance koja ce biti dostupna u svim dokumentima kolekcije
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  //poredimo originalnu sifru unetu od usera i hashovanu sifru u db
  return await bcrypt.compare(candidatePassword, userPassword);
};
// konstruisanje modela iz scheme
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // proveravamo da li je user promenio passowrd. Ako postoji vreme menjanja, znaci da je menjao
  //ako ne postoji samo vracamo false jer nema potrebe da se proverava nista
  if (this.passwordChangedAt) {
    //konvertujemo password changed time u time stamp, pretvaramo milisekunde u sekunde
    // u instance metodi this uvek pokazuje na trenutni dokument
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp; // vracamo true ako je password JWT promenjen posle JWTTimestamp
  } //false means not changed
  return false;
};

// kreiramo sifru za resetovanje tokena
userSchema.methods.createPasswordResetToken = function () {
  // crypto modul koji generise token
  const resetToken = crypto.randomBytes(32).toString('hex');
  // kriptujemo token
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  //token ce nam trajati 10 minuta pa pretvaramo u milisekunde
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
