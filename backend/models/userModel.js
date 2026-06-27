import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const shippingAddressSchema = mongoose.Schema(
  {
    address: { type: String },
    city: { type: String },
    postalCode: { type: String },
    country: { type: String },
  },
  { _id: false }
);

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // Role-based access: 'customer' for shoppers, 'admin' for store managers
    isAdmin: { type: Boolean, required: true, default: false },
    // Saved address speeds up repeat checkouts
    shippingAddress: shippingAddressSchema,
  },
  { timestamps: true }
);

// Compares a plaintext password against the stored hash during login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Hash the password automatically whenever it is created or changed
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

export default User;
