var bcrypt = require('bcryptjs');
var mongoose = require('mongoose');


var userSchema;
userSchema = new mongoose.Schema({
    email: {type: String, unique: true, lowercase: true},
    password: {type: String, select: false},
    displayName: String,
    picture: String,
    facebook: String,
    google: String,
    twitter: String,
    providers: [],
    resetPasswordToken: String,
    resetPasswordTokenExpiration: Date,
    hobbies:[String],
    fb_gender:String,
    fb_relationshipStatus:String,
    birthDate:String, // date of the month is not always available, so better to store as string than an incorrect date
    education:String,
    workHistory:String
});

userSchema.pre('save', function(next) {
    console.log(this);
  var user = this;
  if (!user.isModified('password')) {
    return next();
  }
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(user.password, salt, function(err, hash) {
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function(password, done) {
  bcrypt.compare(password, this.password, function(err, isMatch) {
    done(err, isMatch);
  });
};

module.exports = mongoose.model('User', userSchema);
