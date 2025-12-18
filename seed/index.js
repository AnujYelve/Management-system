// Load environment variables from .env.local or .env
require('dotenv').config({ path: '.env.local' });
// Fallback to .env if .env.local doesn't exist
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: '.env' });
}

const mongoose = require('mongoose');
const User = require('../models/User');
const Store = require('../models/Store');
const Book = require('../models/Book');
const { hashPassword } = require('../lib/auth');

// Get MongoDB URI from environment - NO hardcoded fallback
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('\n❌ ERROR: MONGODB_URI is not set in environment variables!');
  console.error('\nPlease create a .env.local or .env file with:');
  console.error('MONGODB_URI=your-mongodb-connection-string');
  console.error('\nFor MongoDB Atlas:');
  console.error('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/library-management');
  console.error('\nFor local MongoDB:');
  console.error('MONGODB_URI=mongodb://localhost:27017/library-management');
  process.exit(1);
}

console.log('📋 Using MongoDB URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials in logs

async function seed() {
  try {
    // Connect to MongoDB
    console.log('\n🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
    });
    console.log('✅ Connected to MongoDB successfully!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await User.deleteMany({});
    // await Store.deleteMany({});
    // await Book.deleteMany({});

    // Create Admin User
    const adminPassword = await hashPassword('admin123');
    const admin = await User.findOneAndUpdate(
      { email: 'admin@library.com' },
      {
        name: 'Admin User',
        username: 'admin',
        email: 'admin@library.com',
        password: adminPassword,
        role: 'ADMIN',
        isBlocked: false
      },
      { upsert: true, new: true }
    );
    console.log('Admin user created:', admin.email);

    // Create Store Owner 1
    const storeOwner1Password = await hashPassword('store123');
    const storeOwner1 = await User.findOneAndUpdate(
      { email: 'store1@library.com' },
      {
        name: 'John Store Owner',
        username: 'storeowner1',
        email: 'store1@library.com',
        password: storeOwner1Password,
        role: 'STORE',
        isBlocked: false
      },
      { upsert: true, new: true }
    );
    console.log('Store owner 1 created:', storeOwner1.email);

    // Create Store 1
    const store1 = await Store.findOneAndUpdate(
      { ownerId: storeOwner1._id },
      {
        ownerId: storeOwner1._id,
        storeName: 'Central Library',
        address: '123 Main Street',
        city: 'New York',
        timings: '9:00 AM - 6:00 PM',
        isOpenToday: true
      },
      { upsert: true, new: true }
    );
    console.log('Store 1 created:', store1.storeName);

    // Create Books for Store 1
    const books1 = [
      {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        category: 'Fiction',
        ISBN: '978-0-7432-7356-5',
        storeId: store1._id,
        totalCopies: 5,
        availableCopies: 5,
        description: 'A classic American novel'
      },
      {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        category: 'Fiction',
        ISBN: '978-0-06-112008-4',
        storeId: store1._id,
        totalCopies: 3,
        availableCopies: 3,
        description: 'A gripping tale of racial injustice'
      },
      {
        title: '1984',
        author: 'George Orwell',
        category: 'Dystopian',
        ISBN: '978-0-452-28423-4',
        storeId: store1._id,
        totalCopies: 4,
        availableCopies: 4,
        description: 'A dystopian social science fiction novel'
      },
      {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        category: 'Romance',
        ISBN: '978-0-14-143951-8',
        storeId: store1._id,
        totalCopies: 6,
        availableCopies: 6,
        description: 'A romantic novel of manners'
      }
    ];

    for (const bookData of books1) {
      await Book.findOneAndUpdate(
        { ISBN: bookData.ISBN },
        bookData,
        { upsert: true, new: true }
      );
    }
    console.log('Books for Store 1 created');

    // Create Store Owner 2
    const storeOwner2Password = await hashPassword('store123');
    const storeOwner2 = await User.findOneAndUpdate(
      { email: 'store2@library.com' },
      {
        name: 'Jane Bookstore Owner',
        username: 'storeowner2',
        email: 'store2@library.com',
        password: storeOwner2Password,
        role: 'STORE',
        isBlocked: false
      },
      { upsert: true, new: true }
    );
    console.log('Store owner 2 created:', storeOwner2.email);

    // Create Store 2
    const store2 = await Store.findOneAndUpdate(
      { ownerId: storeOwner2._id },
      {
        ownerId: storeOwner2._id,
        storeName: 'City Books',
        address: '456 Oak Avenue',
        city: 'Los Angeles',
        timings: '10:00 AM - 8:00 PM',
        isOpenToday: true
      },
      { upsert: true, new: true }
    );
    console.log('Store 2 created:', store2.storeName);

    // Create Books for Store 2
    const books2 = [
      {
        title: 'The Catcher in the Rye',
        author: 'J.D. Salinger',
        category: 'Fiction',
        ISBN: '978-0-316-76948-0',
        storeId: store2._id,
        totalCopies: 4,
        availableCopies: 4,
        description: 'A controversial novel about teenage rebellion'
      },
      {
        title: 'Lord of the Flies',
        author: 'William Golding',
        category: 'Fiction',
        ISBN: '978-0-571-05686-9',
        storeId: store2._id,
        totalCopies: 3,
        availableCopies: 3,
        description: 'A story about a group of boys stranded on an island'
      },
      {
        title: 'The Hobbit',
        author: 'J.R.R. Tolkien',
        category: 'Fantasy',
        ISBN: '978-0-544-17678-7',
        storeId: store2._id,
        totalCopies: 5,
        availableCopies: 5,
        description: 'A fantasy novel and children\'s book'
      },
      {
        title: 'Brave New World',
        author: 'Aldous Huxley',
        category: 'Dystopian',
        ISBN: '978-0-06-085052-4',
        storeId: store2._id,
        totalCopies: 3,
        availableCopies: 3,
        description: 'A dystopian novel'
      }
    ];

    for (const bookData of books2) {
      await Book.findOneAndUpdate(
        { ISBN: bookData.ISBN },
        bookData,
        { upsert: true, new: true }
      );
    }
    console.log('Books for Store 2 created');

    // Create a test user
    const userPassword = await hashPassword('user123');
    const testUser = await User.findOneAndUpdate(
      { email: 'user@library.com' },
      {
        name: 'Test User',
        username: 'testuser',
        email: 'user@library.com',
        password: userPassword,
        role: 'USER',
        isBlocked: false
      },
      { upsert: true, new: true }
    );
    console.log('Test user created:', testUser.email);

    console.log('\n✅ Seeding completed successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin - Email: admin@library.com, Username: admin, Password: admin123');
    console.log('Store 1 - Email: store1@library.com, Username: storeowner1, Password: store123');
    console.log('Store 2 - Email: store2@library.com, Username: storeowner2, Password: store123');
    console.log('User - Email: user@library.com, Username: testuser, Password: user123');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seed();


