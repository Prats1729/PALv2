require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  anilistToken: { type: String, default: null }
});

const User = mongoose.model('User', userSchema);

async function test() {
  try {
    console.log("MONGODB_URI is:", process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected");
    const user = new User({ username: "test" + Date.now(), password: "123" });
    await user.save();
    console.log("Saved");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}
test();
